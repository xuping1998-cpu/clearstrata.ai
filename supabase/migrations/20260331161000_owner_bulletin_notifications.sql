/*
  # Owner bulletin board (业主通知公告)

  The legacy `notifications` table was per-user inbox (user_id, title_en, ?.
  It is renamed to `user_inbox_notifications` to free the name.

  New `notifications` table: building-wide announcements with RLS:
  - SELECT: all authenticated users
  - INSERT/UPDATE/DELETE: council or manager only
  - author_name / author_role set by trigger from profiles (防伪?
*/

-- ---------------------------------------------------------------------------
-- 1) Rename legacy per-user notifications if still present
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.notifications') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'user_id'
    ) THEN
      ALTER TABLE public.notifications RENAME TO user_inbox_notifications;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'idx_notifications_user_id'
  ) THEN
    ALTER INDEX public.idx_notifications_user_id RENAME TO idx_user_inbox_notifications_user_id;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) New strata announcements table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author_name text NOT NULL,
  author_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_author_role_display_check CHECK (author_role IN ('业委?, '物业经理'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3) Triggers: set / preserve author fields
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

CREATE OR REPLACE FUNCTION public.notifications_preserve_author_on_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.author_name := OLD.author_name;
  NEW.author_role := OLD.author_role;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_set_author ON public.notifications;
CREATE TRIGGER trg_notifications_set_author
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notifications_set_author_from_profile();

DROP TRIGGER IF EXISTS trg_notifications_preserve_author ON public.notifications;
CREATE TRIGGER trg_notifications_preserve_author
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notifications_preserve_author_on_update();

-- ---------------------------------------------------------------------------
-- 4) RLS policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read notifications" ON public.notifications;
CREATE POLICY "Authenticated users can read notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Council or manager can insert notifications" ON public.notifications;
CREATE POLICY "Council or manager can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('council', 'manager')
    )
  );

DROP POLICY IF EXISTS "Council or manager can update notifications" ON public.notifications;
CREATE POLICY "Council or manager can update notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('council', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('council', 'manager')
    )
  );

DROP POLICY IF EXISTS "Council or manager can delete notifications" ON public.notifications;
CREATE POLICY "Council or manager can delete notifications"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('council', 'manager')
    )
  );

GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;




