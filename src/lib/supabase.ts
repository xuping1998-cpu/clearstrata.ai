import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bolt-native-database-64671878.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbHQtbmF0aXZlLWRhdGFiYXNlLTY0NjcxODc4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MTk0ODcsImV4cCI6MjA1OTA5NTQ4N30.hWqKwXq6JzH6F6mH4k8v7Lk1XqH4k8v7Lk1XqH4k8v7Lk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

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
