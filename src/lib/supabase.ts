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

/** Legacy building-wide bulletin table (still in DB; owner page uses `community_notifications`). */
export interface StrataNotification {
  id: string;
  title: string;
  content: string;
  author_name: string;
  author_role: string;
  created_at: string;
  /** Publisher profile id; set by DB trigger on insert. */
  created_by: string | null;
  file_url: string | null;
  file_name: string | null;
}

/** Owner info — community bulletin (`community_notifications`) and strata feed share these levels. */
export type StrataNotificationPriority = 'normal' | 'important' | 'urgent';

export interface CommunityNotification {
  id: string;
  title: string;
  content: string;
  priority: StrataNotificationPriority;
  created_at: string;
  created_by: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      notifications: {
        Row: StrataNotification;
        Insert: Pick<StrataNotification, 'title' | 'content' | 'file_url' | 'file_name'>;
        Update: Partial<Pick<StrataNotification, 'title' | 'content' | 'file_url' | 'file_name'>>;
      };
      community_notifications: {
        Row: CommunityNotification;
        Insert: Pick<CommunityNotification, 'title' | 'content' | 'priority' | 'created_by'>;
        Update: Partial<Pick<CommunityNotification, 'title' | 'content' | 'priority'>>;
      };
      strata_notifications: {
        Row: {
          id: string;
          title: string;
          content: string;
          priority: StrataNotificationPriority;
          is_pinned: boolean;
          created_by: string;
          created_at: string;
          strata_id: string;
        };
        Insert: {
          title: string;
          content: string;
          priority?: StrataNotificationPriority;
          is_pinned?: boolean;
          created_by: string;
          strata_id: string;
        };
        Update: Partial<{ title: string; content: string; priority: StrataNotificationPriority; is_pinned: boolean }>;
      };
      notification_reads: {
        Row: { id: string; notification_id: string; user_id: string; read_at: string };
        Insert: { notification_id: string; user_id: string; read_at?: string };
        Update: Partial<{ read_at: string }>;
      };
    };
  };
}
