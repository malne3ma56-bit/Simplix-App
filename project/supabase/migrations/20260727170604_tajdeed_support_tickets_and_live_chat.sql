/*
# Tajdeed Support Tickets & Live Chat System

1. Overview
   Adds a hybrid AI/human support system with real-time chat:
   - `support_tickets`: each conversation between a customer and the support desk.
     Tracks whether the AI is handling it or it has been escalated to a human admin.
     Includes an AI-generated one-line summary for the admin's live desk.
   - `support_messages`: every chat message (from AI, customer, or admin), stored
     chronologically per ticket. Used for the real-time chat experience.

2. Ticket lifecycle
   - Customer opens the copilot and sends a message -> a ticket is auto-created
     with status='open' and ai_active=true (the AI is responding).
   - If the AI detects a sensitive/angry intent or the customer asks for a human,
     the ticket transitions to status='waiting_human' and ai_active=false. An
     alert appears on the admin Live Support Desk.
   - An admin picks up the ticket (status='in_chat'), chats in real time, and can
     perform actions (refund, cancel order, block provider) from within the chat.
   - When resolved, the admin closes the ticket (status='resolved').

3. New Tables
   - `support_tickets`
     id, customer_id (auth uid), subject (auto from first message), ai_summary
     (one-line AI summary for the admin), status (open|waiting_human|in_chat|
     resolved), ai_active (bool), priority (normal|urgent — set by AI on escalation),
     related_order_id (nullable, linked when the issue is about a specific order),
     last_message_at (updated on each message for sorting), created_at, updated_at.
   - `support_messages`
     id, ticket_id (fk), sender (customer|ai|admin), body (text),
     intent_detected (nullable — e.g. 'payment_issue', 'refund_request',
     'human_request', 'anger'), created_at.

4. Security (RLS)
   - support_tickets: customer reads/inserts only their own; admin reads/updates
     all via current_role()='admin'.
   - support_messages: customer reads messages on their own tickets; customer +
     admin insert messages; admin reads all messages on all tickets.
   - Uses the existing public.current_role() helper (JWT-based, no recursion).

5. Notes
   - All real-time updates are done via Supabase realtime subscriptions on
     support_messages (insert) and support_tickets (update) — no edge function
     needed for the chat itself.
   - The AI copilot runs entirely client-side (keyword + intent matching) and
     writes messages directly; escalation is a ticket status update.
*/

-- ===================== support_tickets =====================
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT '',
  ai_summary text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','waiting_human','in_chat','resolved')),
  ai_active boolean NOT NULL DEFAULT true,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','urgent')),
  related_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Customer: read own tickets
DROP POLICY IF EXISTS "customer_read_own_tickets" ON support_tickets;
CREATE POLICY "customer_read_own_tickets" ON support_tickets FOR SELECT
  TO authenticated USING (auth.uid() = customer_id);

-- Customer: insert own tickets
DROP POLICY IF EXISTS "customer_insert_own_tickets" ON support_tickets;
CREATE POLICY "customer_insert_own_tickets" ON support_tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = customer_id);

-- Customer: update own tickets (e.g. ai_active toggle, subject)
DROP POLICY IF EXISTS "customer_update_own_tickets" ON support_tickets;
CREATE POLICY "customer_update_own_tickets" ON support_tickets FOR UPDATE
  TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

-- Admin: read all tickets
DROP POLICY IF EXISTS "admin_read_all_tickets" ON support_tickets;
CREATE POLICY "admin_read_all_tickets" ON support_tickets FOR SELECT
  TO authenticated USING (public.current_role() = 'admin');

-- Admin: update all tickets (pick up, close, set priority)
DROP POLICY IF EXISTS "admin_update_all_tickets" ON support_tickets;
CREATE POLICY "admin_update_all_tickets" ON support_tickets FOR UPDATE
  TO authenticated USING (public.current_role() = 'admin')
  WITH CHECK (public.current_role() = 'admin');

-- ===================== support_messages =====================
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('customer','ai','admin')),
  body text NOT NULL DEFAULT '',
  intent_detected text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Customer: read messages on own tickets
DROP POLICY IF EXISTS "customer_read_own_messages" ON support_messages;
CREATE POLICY "customer_read_own_messages" ON support_messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = support_messages.ticket_id AND t.customer_id = auth.uid())
  );

-- Customer: insert messages on own tickets (as 'customer' sender only)
DROP POLICY IF EXISTS "customer_insert_own_messages" ON support_messages;
CREATE POLICY "customer_insert_own_messages" ON support_messages FOR INSERT
  TO authenticated WITH CHECK (
    sender = 'customer' AND
    EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = support_messages.ticket_id AND t.customer_id = auth.uid())
  );

-- AI: insert messages (as 'ai' sender) — the frontend copilot writes these
-- under the customer's session, so ownership check is the same as customer.
-- We allow 'ai' sender on the customer's own ticket:
DROP POLICY IF EXISTS "ai_insert_own_messages" ON support_messages;
CREATE POLICY "ai_insert_own_messages" ON support_messages FOR INSERT
  TO authenticated WITH CHECK (
    sender = 'ai' AND
    EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = support_messages.ticket_id AND t.customer_id = auth.uid())
  );

-- Admin: read all messages
DROP POLICY IF EXISTS "admin_read_all_messages" ON support_messages;
CREATE POLICY "admin_read_all_messages" ON support_messages FOR SELECT
  TO authenticated USING (public.current_role() = 'admin');

-- Admin: insert messages (as 'admin' sender)
DROP POLICY IF EXISTS "admin_insert_messages" ON support_messages;
CREATE POLICY "admin_insert_messages" ON support_messages FOR INSERT
  TO authenticated WITH CHECK (
    sender = 'admin' AND public.current_role() = 'admin'
  );

-- ===================== updated_at trigger =====================
CREATE OR REPLACE FUNCTION public.touch_ticket_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_touch_updated_at ON support_tickets;
CREATE TRIGGER tickets_touch_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_ticket_updated_at();

-- ===================== indexes =====================
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_last_msg ON support_tickets(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_ticket ON support_messages(ticket_id, created_at);
