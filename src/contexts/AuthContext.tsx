import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullNameEn: string, fullNameZh: string, role: string, unitNumber: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading profile:', error);
      return;
    }

    setProfile(data);
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(
        'https://bolt-native-database-64671878.supabase.co/auth/v1/token?grant_type=password',
        {
          method: 'POST',
          headers: {
            apikey: 'sb_publishable_2x4TkloQxM1TN_LuCjf5pQ_IgSz34jH',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        const msg =
          (typeof data.error === 'string' && data.error) ||
          (typeof data.error_description === 'string' && data.error_description) ||
          'Login failed';
        throw new Error(msg);
      }

      const access_token = data.access_token as string | undefined;
      const refresh_token = data.refresh_token as string | undefined;
      if (!access_token || !refresh_token) {
        throw new Error('Invalid login response');
      }

      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (error) throw error;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const signUp = async (email: string, password: string, fullNameEn: string, fullNameZh: string, role: string, unitNumber: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        full_name_en: fullNameEn,
        full_name_zh: fullNameZh,
        role: role as 'owner' | 'caretaker' | 'council',
        unit_number: unitNumber,
        preferred_language: 'en',
      });

      if (profileError) throw profileError;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
