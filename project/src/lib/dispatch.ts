import { useCallback, useEffect, useRef, useState } from 'react';
import type { Order, Profile } from '@/types';

const DEFAULT_TIMEOUT_MS = 60_000;
const ZONE_RADIUS_KM = 30;

/* ===================== Zone & Category Matching ===================== */

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function zoneMatches(provider: Profile, order: Order): boolean {
  if (provider.latitude && provider.longitude && order.latitude && order.longitude) {
    return (
      haversineKm(provider.latitude, provider.longitude, order.latitude, order.longitude) <=
      ZONE_RADIUS_KM
    );
  }
  if (provider.address_text && order.address_text) {
    const pZone = provider.address_text.split(',').pop()?.trim().toLowerCase() ?? '';
    const oZone = order.address_text.split(',').pop()?.trim().toLowerCase() ?? '';
    return pZone !== '' && pZone === oZone;
  }
  return true;
}

function categoryMatches(provider: Profile, order: Order): boolean {
  if (!order.category_id) return true;
  if (!provider.provider_category_id) return false;
  return provider.provider_category_id === order.category_id;
}

/* ===================== Pure Dispatch Functions ===================== */

export function findNextProvider(order: Order, providers: Profile[]): Profile | null {
  const candidates = providers
    .filter((p) => p.role === 'provider')
    .filter((p) => p.status === 'active')
    .filter((p) => p.available)
    .filter((p) => !order.rejected_by.includes(p.id))
    .filter((p) => categoryMatches(p, order))
    .filter((p) => zoneMatches(p, order))
    .sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0));

  return candidates[0] ?? null;
}

export function dispatchOrder(
  order: Order,
  providers: Profile[]
): { order: Order; provider: Profile | null } {
  const provider = findNextProvider(order, providers);
  if (!provider) {
    return {
      order: { ...order, status: 'unassigned_requires_admin', current_provider_id: null },
      provider: null,
    };
  }
  return {
    order: {
      ...order,
      current_provider_id: provider.id,
      status: 'pending_provider_approval',
    },
    provider,
  };
}

export function rejectAndForward(
  order: Order,
  providers: Profile[]
): { order: Order; provider: Profile | null } {
  const currentId = order.current_provider_id;
  const rejected = currentId && !order.rejected_by.includes(currentId)
    ? [...order.rejected_by, currentId]
    : order.rejected_by;
  return dispatchOrder({ ...order, rejected_by: rejected }, providers);
}

/* ===================== 60-Second Auto-Forward Hook ===================== */

export function useOrderDispatch(
  initialOrder: Order | null,
  providers: Profile[],
  options?: { timeoutMs?: number }
): {
  order: Order | null;
  secondsLeft: number;
  accept: () => void;
  reject: () => void;
} {
  const [order, setOrder] = useState<Order | null>(initialOrder);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const providersRef = useRef(providers);
  providersRef.current = providers;
  const lastOrderId = useRef<string | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (initialOrder && initialOrder.id !== lastOrderId.current) {
      lastOrderId.current = initialOrder.id;
      setOrder(initialOrder);
    }
  }, [initialOrder]);

  useEffect(() => {
    if (order?.status !== 'pending_provider_approval') {
      clearTimer();
      setSecondsLeft(0);
      return;
    }

    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const expiry = Date.now() + timeoutMs;
    setSecondsLeft(Math.ceil(timeoutMs / 1000));

    timerRef.current = setInterval(() => {
      const remaining = Math.ceil((expiry - Date.now()) / 1000);
      if (remaining <= 0) {
        clearTimer();
        setOrder((prev) => {
          if (!prev) return prev;
          return rejectAndForward(prev, providersRef.current).order;
        });
      } else {
        setSecondsLeft(remaining);
      }
    }, 1000);

    return clearTimer;
  }, [order?.id, order?.status, order?.current_provider_id, clearTimer, options?.timeoutMs]);

  const accept = useCallback(() => {
    clearTimer();
    setSecondsLeft(0);
    setOrder((prev) => (prev ? { ...prev, status: 'accepted' } : prev));
  }, [clearTimer]);

  const reject = useCallback(() => {
    clearTimer();
    setOrder((prev) => {
      if (!prev) return prev;
      return rejectAndForward(prev, providersRef.current).order;
    });
  }, [clearTimer]);

  return { order, secondsLeft, accept, reject };
}
