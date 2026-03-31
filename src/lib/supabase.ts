import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'owner' | 'council' | 'admin' | 'manager';

/** Mirrors profiles.status — pending until admin activates resident signup. */
export type ProfileAccountStatus = 'pending' | 'active' | 'suspended';

export interface Profile {
  id: string;
  role: UserRole;
  /** Present after migration `profiles_account_status`; defaults to active when omitted. */
  status?: ProfileAccountStatus;
  full_name_en: string;
  full_name_zh?: string;
  email: string;
  phone?: string;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
