/*
  Remove per-user inbox fan-out for community announcements (single bulletin system, no inbox).
*/

DROP TRIGGER IF EXISTS trg_community_notifications_fanout_insert ON public.community_notifications;
DROP TRIGGER IF EXISTS trg_community_notifications_fanout_update ON public.community_notifications;

DROP FUNCTION IF EXISTS public.fanout_community_announcement_inbox();
