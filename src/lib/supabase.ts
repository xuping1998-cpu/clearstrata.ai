import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole =
  | 'owner'
  | 'tenant'
  | 'viewer'
  | 'council'
  | 'admin'
  | 'manager'
  | 'property_admin';

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

/** Priority levels for `community_notifications` (公告). */
export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export interface CommunityNotification {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  created_at: string;
  created_by: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  property_id?: string | null;
  building: string | null;
  units: string | null;
  message: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: Lead;
        Insert: Pick<Lead, 'name' | 'email'> &
          Partial<Pick<Lead, 'building' | 'units' | 'message' | 'phone' | 'property_id'>>;
        Update: never;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      community_notifications: {
        Row: CommunityNotification;
        Insert: Pick<CommunityNotification, 'title' | 'content' | 'priority' | 'created_by'>;
        Update: Partial<Pick<CommunityNotification, 'title' | 'content' | 'priority'>>;
      };
    };
  };
}
