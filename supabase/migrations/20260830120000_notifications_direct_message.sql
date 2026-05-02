-- Add direct-message support columns to the shared `notifications` table.
-- These columns power the council→member single-user notification feature
-- sent from the MembersList management UI.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title      text,
  ADD COLUMN IF NOT EXISTS content    text,
  ADD COLUMN IF NOT EXISTS priority   text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'important', 'urgent')),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_property_type
  ON public.notifications (property_id, type, created_at DESC)
  WHERE property_id IS NOT NULL;

-- Allow council/admin/manager to insert direct_message notifications
-- for their own property.
DROP POLICY IF EXISTS "council_can_insert_direct_message" ON public.notifications;
CREATE POLICY "council_can_insert_direct_message"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    type = 'direct_message'
    AND property_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id  = auth.uid()
        AND pm.property_id = property_id
        AND pm.status   = 'active'
        AND pm.role     IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

-- Owners may SELECT their own direct_message notifications.
DROP POLICY IF EXISTS "users_can_view_own_direct_messages" ON public.notifications;
CREATE POLICY "users_can_view_own_direct_messages"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    type = 'direct_message'
    AND user_id = auth.uid()
  );

-- Council/admin/manager may SELECT all direct_message notifications for their property.
DROP POLICY IF EXISTS "council_can_view_property_direct_messages" ON public.notifications;
CREATE POLICY "council_can_view_property_direct_messages"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    type = 'direct_message'
    AND property_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id     = auth.uid()
        AND pm.property_id = property_id
        AND pm.status      = 'active'
        AND pm.role        IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

-- Allow owners to mark their own direct_messages as read.
DROP POLICY IF EXISTS "users_can_update_own_direct_messages" ON public.notifications;
CREATE POLICY "users_can_update_own_direct_messages"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (type = 'direct_message' AND user_id = auth.uid())
  WITH CHECK (type = 'direct_message' AND user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
