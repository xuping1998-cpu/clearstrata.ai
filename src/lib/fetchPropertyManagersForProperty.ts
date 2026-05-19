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

/**
 * property_managers has no property_id — scope via property_members (role = manager).
 */
export async function fetchPropertyManagersForProperty(propertyId: string): Promise<{
  data: PropertyManagerRow[];
  error: { message: string; code?: string } | null;
}> {
  const { data: memberRows, error: membersError } = await supabase
    .from('property_members')
    .select('user_id')
    .eq('property_id', propertyId)
    .eq('status', 'active')
    .eq('role', 'manager');

  if (membersError) {
    console.error('PROPERTY_MEMBERS_MANAGER_QUERY_ERROR', membersError);
    return { data: [], error: membersError };
  }

  const managerUserIds = (memberRows ?? [])
    .map((r) => r.user_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  console.log('PROPERTY_MANAGERS_QUERY', {
    propertyId,
    memberSource: 'property_members',
    memberFilters: { property_id: propertyId, role: 'manager', status: 'active' },
    managerUserIds,
    table: 'property_managers',
    select: PROPERTY_MANAGERS_SELECT,
    filters: { status: 'active', user_id: managerUserIds },
    order: 'full_name_en.asc',
  });

  if (managerUserIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from('property_managers')
    .select(PROPERTY_MANAGERS_SELECT)
    .in('user_id', managerUserIds)
    .eq('status', 'active')
    .order('full_name_en');

  if (error) {
    console.error('PROPERTY_MANAGERS_QUERY_ERROR', error);
    return { data: [], error };
  }

  return { data: (data ?? []) as PropertyManagerRow[], error: null };
}
