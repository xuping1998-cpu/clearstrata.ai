import { supabase } from './supabase';
import { DEFAULT_STRATA_ID } from './strataConfig';

export type NotificationPriority = 'normal' | 'important' | 'urgent';

export interface StrataNotificationFeedRow {
  id: string;
  title: string;
  content: string;
  priority: NotificationPriority;
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  strata_id: string;
  creator?: { full_name_en: string; full_name_zh: string | null } | null;
}

const STRATA_NOTIFICATIONS_SELECT = `
  id, title, content, priority, is_pinned, created_by, created_at, strata_id,
  creator:profiles!strata_notifications_created_by_fkey(full_name_en, full_name_zh)
`;

export async function fetchStrataNotifications(strataId: string = DEFAULT_STRATA_ID) {
  const { data, error } = await supabase
    .from('strata_notifications')
    .select(STRATA_NOTIFICATIONS_SELECT)
    .eq('strata_id', strataId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as StrataNotificationFeedRow[];
}

export async function fetchLatestStrataNotifications(limit: number, strataId: string = DEFAULT_STRATA_ID) {
  const { data, error } = await supabase
    .from('strata_notifications')
    .select('id, title, priority, created_at, is_pinned')
    .eq('strata_id', strataId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function fetchMyNotificationReadIds(userId: string) {
  const { data, error } = await supabase.from('notification_reads').select('notification_id').eq('user_id', userId);

  if (error) throw error;
  return new Set((data || []).map((r) => r.notification_id as string));
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const { error } = await supabase.from('notification_reads').insert({
    notification_id: notificationId,
    user_id: userId,
    read_at: new Date().toISOString(),
  });
  if (error && (error as { code?: string }).code !== '23505') throw error;
}

export async function insertStrataNotification(payload: {
  title: string;
  content: string;
  priority: NotificationPriority;
  strata_id: string;
  created_by: string;
}) {
  const { data, error } = await supabase.from('strata_notifications').insert(payload).select('id').single();

  if (error) throw error;
  return data;
}

export async function toggleStrataNotificationPin(id: string, isPinned: boolean) {
  const { error } = await supabase.from('strata_notifications').update({ is_pinned: isPinned }).eq('id', id);
  if (error) throw error;
}

export function subscribeStrataNotificationInserts(
  strataId: string,
  onInsert: (row: { title?: string; created_by?: string }) => void,
) {
  const channel = supabase
    .channel('strata_notifications_feed')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'strata_notifications', filter: `strata_id=eq.${strataId}` },
      (payload) => {
        const row = payload.new as { title?: string; created_by?: string };
        onInsert(row);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
