import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bolt-native-database-64671878.supabase.co';
const supabaseAnonKey = 'sb_publishable_2x4TkloQxM1TN_LuCjf5pQ_IgSz34jH';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'owner' | 'caretaker' | 'council' | 'manager' | 'admin';

export interface Profile {
  id: string;
  role: UserRole;
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
