/*
  # Announcements: author tracking, author/admin edit RLS, inbox fan-out

  - notifications.created_by: publisher (set on insert by trigger)
  - UPDATE/DELETE RLS: author or admin only
  - After INSERT or (title/content) UPDATE: insert user_inbox_notifications rows
    (type = owner_announcement) for all users except the acting publisher/editor
  - user_inbox_notifications.announcement_id: FK to notifications, CASCADE delete
*/

-- ---------------------------------------------------------------------------
-- 1) notifications.created_by
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON public.notifications (created_by);

-- ---------------------------------------------------------------------------
-- 2) user_inbox_notifications.announcement_id
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.user_inbox_notifications') IS NOT NULL THEN
    ALTER TABLE public.user_inbox_notifications
      ADD COLUMN IF NOT EXISTS announcement_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.user_inbox_notifications') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_user_inbox_ann_user_type_read
      ON public.user_inbox_notifications (user_id, type, read)
      WHERE read = false;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Insert trigger: set created_by
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notifications_set_author_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r text;
  name_en text;
  name_zh text;
BEGIN
  SELECT p.role::text, p.full_name_en, COALESCE(p.full_name_zh, '')
  INTO r, name_en, name_zh
  FROM profiles p
  WHERE p.id = (SELECT auth.uid());

  IF r IS NULL OR r NOT IN ('council', 'manager') THEN
    RAISE EXCEPTION 'only council or manager can publish notifications';
  END IF;

  NEW.created_by := (SELECT auth.uid());

  NEW.author_name := CASE
    WHEN name_zh IS NOT NULL AND btrim(name_zh) <> '' THEN btrim(name_zh)
    ELSE name_en
  END;

  NEW.author_role := CASE r
    WHEN 'council' THEN '业委?
    WHEN 'manager' THEN '物业经理'
    ELSE r
  END;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4) Update trigger: preserve immutable fields
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notifications_preserve_author_on_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.author_name := OLD.author_name;
  NEW.author_role := OLD.author_role;
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) Fan-out to per-user inbox (SECURITY DEFINER bypasses RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fanout_owner_announcement_inbox()
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
      user_id, type, title_en, title_zh, message_en, message_zh, read, announcement_id
    )
    SELECT
      p.id,
      'owner_announcement',
      NEW.title,
      NEW.title,
      snippet,
      snippet,
      false,
      NEW.id
    FROM public.profiles p
    WHERE skip_id IS NULL OR p.id <> skip_id;

  ELSIF TG_OP = 'UPDATE' THEN
    skip_id := (SELECT auth.uid());
    INSERT INTO public.user_inbox_notifications (
      user_id, type, title_en, title_zh, message_en, message_zh, read, announcement_id
    )
    SELECT
      p.id,
      'owner_announcement',
      NEW.title,
      NEW.title,
      snippet,
      snippet,
      false,
      NEW.id
    FROM public.profiles p
    WHERE skip_id IS NULL OR p.id <> skip_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_fanout_insert ON public.notifications;
CREATE TRIGGER trg_notifications_fanout_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.fanout_owner_announcement_inbox();

DROP TRIGGER IF EXISTS trg_notifications_fanout_update ON public.notifications;
CREATE TRIGGER trg_notifications_fanout_update
  AFTER UPDATE OF title, content ON public.notifications
  FOR EACH ROW
  WHEN (OLD.title IS DISTINCT FROM NEW.title OR OLD.content IS DISTINCT FROM NEW.content)
  EXECUTE FUNCTION public.fanout_owner_announcement_inbox();

-- ---------------------------------------------------------------------------
-- 6) Replace UPDATE / DELETE RLS (author or admin)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Council or manager can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Author or admin can update notifications" ON public.notifications;
CREATE POLICY "Author or admin can update notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Council or manager can delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Author or admin can delete notifications" ON public.notifications;
CREATE POLICY "Author or admin can delete notifications"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );




