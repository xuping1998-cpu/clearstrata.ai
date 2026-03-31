import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type AnnouncementInboxContextValue = {
  hasUnreadAnnouncement: boolean;
  refreshAnnouncementInbox: () => Promise<void>;
};

const AnnouncementInboxContext = createContext<AnnouncementInboxContextValue | null>(null);

export function AnnouncementInboxProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [hasUnreadAnnouncement, setHasUnreadAnnouncement] = useState(false);

  const refreshAnnouncementInbox = useCallback(async () => {
    if (!profile?.id) {
      setHasUnreadAnnouncement(false);
      return;
    }
    const { count, error } = await supabase
      .from('user_inbox_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('type', 'owner_announcement')
      .eq('read', false);

    if (error) {
      console.error('announcement inbox count', error);
      setHasUnreadAnnouncement(false);
      return;
    }
    setHasUnreadAnnouncement((count ?? 0) > 0);
  }, [profile?.id]);

  useEffect(() => {
    void refreshAnnouncementInbox();
  }, [refreshAnnouncementInbox]);

  const value = useMemo(
    () => ({ hasUnreadAnnouncement, refreshAnnouncementInbox }),
    [hasUnreadAnnouncement, refreshAnnouncementInbox],
  );

  return <AnnouncementInboxContext.Provider value={value}>{children}</AnnouncementInboxContext.Provider>;
}

export function useAnnouncementInbox() {
  const ctx = useContext(AnnouncementInboxContext);
  if (!ctx) {
    throw new Error('useAnnouncementInbox must be used within AnnouncementInboxProvider');
  }
  return ctx;
}
