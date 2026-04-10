/*
  # Strata feed notifications (separate from legacy owner bulletin table `notifications`)

  - strata_notifications: priority, pin, strata scope
  - notification_reads: per-user read state
  - Realtime enabled for INSERT
*/

-- ---------------------------------------------------------------------------
-- Enum + stratas (single default row for single-building deploys)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  CREATE TYPE notification_priority AS ENUM ('normal', 'important', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.stratas (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.stratas (id, name)
VALUES ('a0000000-0000-4000-8000-000000000001', 'Default community')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Feed table (name avoids collision with existing public.notifications bulletin)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.strata_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  priority public.notification_priority NOT NULL DEFAULT 'normal',
  is_pinned boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  strata_id uuid NOT NULL REFERENCES public.stratas (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_strata_notifications_strata_pinned_created
  ON public.strata_notifications (strata_id, is_pinned DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_strata_notifications_strata_id ON public.strata_notifications (strata_id);

-- ---------------------------------------------------------------------------
-- Read receipts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.strata_notifications (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON public.notification_reads (user_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.stratas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strata_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can read stratas" ON public.stratas;
CREATE POLICY "Anyone authenticated can read stratas"
  ON public.stratas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read strata_notifications" ON public.strata_notifications;
CREATE POLICY "Authenticated read strata_notifications"
  ON public.strata_notifications FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Council manager admin insert strata_notifications" ON public.strata_notifications;
CREATE POLICY "Council manager admin insert strata_notifications"
  ON public.strata_notifications FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'manager', 'council')
    )
  );

DROP POLICY IF EXISTS "Admin update strata_notifications" ON public.strata_notifications;
CREATE POLICY "Admin update strata_notifications"
  ON public.strata_notifications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users read own notification_reads" ON public.notification_reads;
CREATE POLICY "Users read own notification_reads"
  ON public.notification_reads FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users insert own notification_reads" ON public.notification_reads;
CREATE POLICY "Users insert own notification_reads"
  ON public.notification_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

GRANT ALL ON public.stratas TO authenticated;
GRANT ALL ON public.strata_notifications TO authenticated;
GRANT ALL ON public.notification_reads TO authenticated;
GRANT ALL ON public.stratas TO service_role;
GRANT ALL ON public.strata_notifications TO service_role;
GRANT ALL ON public.notification_reads TO service_role;

-- ---------------------------------------------------------------------------
-- Realtime (Supabase)
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.strata_notifications;




