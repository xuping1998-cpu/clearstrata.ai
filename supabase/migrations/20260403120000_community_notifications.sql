/*
  # Community bulletin board (社区公告)

  Single announcement table for the owner portal — no per-user inbox fan-out.
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
