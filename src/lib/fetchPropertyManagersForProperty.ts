import { supabase } from './supabase';

export type PropertyManagerRow = {
  id: string;
  user_id: string | null;
  full_name_en: string;
  full_name_zh: string;
  email: string;
  phone: string;
  status: string;
  hire_date?: string | null;
  avatar_url?: string | null;
  specialties?: string[] | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

const PROPERTY_MANAGERS_SELECT =
  'id,user_id,full_name_en,full_name_zh,email,phone,status,hire_date,avatar_url,specialties,notes,created_at,updated_at';

/** Scope managers by property_id (column restored on remote). */
export async function fetchPropertyManagersForProperty(propertyId: string): Promise<{
  data: PropertyManagerRow[];
  error: { message: string; code?: string } | null;
}> {
  const { data, error } = await supabase
    .from('property_managers')
    .select(PROPERTY_MANAGERS_SELECT)
    .eq('property_id', propertyId)
    .eq('status', 'active')
    .order('full_name_en');

  if (error) {
    console.error('PROPERTY_MANAGERS_QUERY_ERROR', error);
    return { data: [], error };
  }

  return { data: (data ?? []) as PropertyManagerRow[], error: null };
}
