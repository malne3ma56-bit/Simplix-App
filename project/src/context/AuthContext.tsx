import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, meta: Record<string, any>) => Promise<{ error: string | null }>;
  signUpProvider: (email: string, password: string, meta: Record<string, any>) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) {
      console.error('profile load error', error);
      return;
    }
    setProfile(data as Profile | null);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        (async () => {
          await loadProfile(sess.user.id);
        })();
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp: AuthContextValue['signUp'] = async (email, password, meta) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    });
    if (error) {
      if (error.message.includes('already')) return { error: 'auth.error.exists' };
      if (error.message.toLowerCase().includes('weak') || error.message.toLowerCase().includes('password'))
        return { error: 'auth.error.weakPassword' };
      return { error: error.message };
    }
    // Email confirmation enabled: user created but no session
    if (data.user && !data.session) {
      return { error: 'auth.error.confirmEmail' };
    }
    if (data.user) {
      await loadProfile(data.user.id);
    }
    return { error: null };
  };

  const signUpProvider: AuthContextValue['signUpProvider'] = async (email, password, meta) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...meta,
          role: 'provider',
          status: 'pending_approval',
        },
      },
    });
    if (error) {
      if (error.message.includes('already')) return { error: 'auth.error.exists' };
      if (error.message.toLowerCase().includes('weak') || error.message.toLowerCase().includes('password'))
        return { error: 'auth.error.weakPassword' };
      return { error: error.message };
    }
    if (data.user && !data.session) {
      return { error: 'auth.error.confirmEmail' };
    }
    if (data.user) {
      await loadProfile(data.user.id);
    }
    return { error: null };
  };

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: 'auth.error.invalid' };
    }
    if (data.user) {
      await loadProfile(data.user.id);
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signUp, signUpProvider, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
