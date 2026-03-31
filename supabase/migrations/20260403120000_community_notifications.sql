/*
  # Community bulletin board (社区公告)

  Replaces app usage of public.notifications for owner-facing announcements.
  Per-user inbox rows use type `community_announcement` and community_announcement_id.
*/

CREATE TABLE IF NOT EXISTS public.community_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_notifications_created_at
  ON public.community_notifications (created_at DESC);

ALTER TABLE public.community_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_notifications_select" ON public.community_notifications;
DROP POLICY IF EXISTS "community_notifications_insert" ON public.community_notifications;
DROP POLICY IF EXISTS "community_notifications_update" ON public.community_notifications;
DROP POLICY IF EXISTS "community_notifications_delete" ON public.community_notifications;

CREATE POLICY "community_notifications_select"
  ON public.community_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
    )
  );

CREATE POLICY "community_notifications_insert"
  ON public.community_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'manager', 'council')
    )
    AND created_by = (SELECT auth.uid())
  );

CREATE POLICY "community_notifications_update"
  ON public.community_notifications
  FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "community_notifications_delete"
  ON public.community_notifications
  FOR DELETE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_notifications TO authenticated;
GRANT ALL ON public.community_notifications TO service_role;

-- ---------------------------------------------------------------------------
-- Inbox fan-out (same pattern as fanout_owner_announcement_inbox)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.user_inbox_notifications') IS NOT NULL THEN
    ALTER TABLE public.user_inbox_notifications
      ADD COLUMN IF NOT EXISTS community_announcement_id uuid
        REFERENCES public.community_notifications(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fanout_community_announcement_inbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  skip_id uuid;
  snippet text;
BEGIN
  IF to_regclass('public.user_inbox_notifications') IS NULL THEN
    RETURN NEW;
  END IF;

  snippet := left(btrim(NEW.content), 500);
  IF snippet IS NULL OR snippet = '' THEN
    snippet := left(btrim(NEW.title), 500);
  END IF;

  IF TG_OP = 'INSERT' THEN
    skip_id := NEW.created_by;
    INSERT INTO public.user_inbox_notifications (
      user_id, type, title_en, title_zh, message_en, message_zh, read,
      announcement_id, community_announcement_id
    )
    SELECT
      p.id,
      'community_announcement',
      NEW.title,
      NEW.title,
      snippet,
      snippet,
      false,
      NULL,
      NEW.id
    FROM public.profiles p
    WHERE skip_id IS NULL OR p.id <> skip_id;

  ELSIF TG_OP = 'UPDATE' THEN
    skip_id := (SELECT auth.uid());
    INSERT INTO public.user_inbox_notifications (
      user_id, type, title_en, title_zh, message_en, message_zh, read,
      announcement_id, community_announcement_id
    )
    SELECT
      p.id,
      'community_announcement',
      NEW.title,
      NEW.title,
      snippet,
      snippet,
      false,
      NULL,
      NEW.id
    FROM public.profiles p
    WHERE skip_id IS NULL OR p.id <> skip_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_notifications_fanout_insert ON public.community_notifications;
CREATE TRIGGER trg_community_notifications_fanout_insert
  AFTER INSERT ON public.community_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.fanout_community_announcement_inbox();

DROP TRIGGER IF EXISTS trg_community_notifications_fanout_update ON public.community_notifications;
CREATE TRIGGER trg_community_notifications_fanout_update
  AFTER UPDATE OF title, content ON public.community_notifications
  FOR EACH ROW
  WHEN (OLD.title IS DISTINCT FROM NEW.title OR OLD.content IS DISTINCT FROM NEW.content)
  EXECUTE FUNCTION public.fanout_community_announcement_inbox();
