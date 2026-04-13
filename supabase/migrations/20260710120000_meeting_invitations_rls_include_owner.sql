/*
  Allow property `owner` (and `viewer`) to insert/update meeting_invitations.
  Prior policies only allowed admin/council/manager/property_admin, so sole-member
  properties with role `owner` could not create invitation rows.
*/

DROP POLICY IF EXISTS minv_select ON public.meeting_invitations;
CREATE POLICY minv_select
  ON public.meeting_invitations FOR SELECT TO authenticated
  USING (
    recipient_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = meeting_invitations.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.role IN ('admin', 'council', 'manager', 'property_admin', 'owner', 'viewer')
    )
  );

DROP POLICY IF EXISTS minv_write_staff ON public.meeting_invitations;
CREATE POLICY minv_write_staff
  ON public.meeting_invitations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = meeting_invitations.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.role IN ('admin', 'council', 'manager', 'property_admin', 'owner')
    )
  );

DROP POLICY IF EXISTS minv_update_staff ON public.meeting_invitations;
CREATE POLICY minv_update_staff
  ON public.meeting_invitations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = meeting_invitations.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.role IN ('admin', 'council', 'manager', 'property_admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = meeting_invitations.property_id
        AND pm.user_id = (SELECT auth.uid())
        AND pm.role IN ('admin', 'council', 'manager', 'property_admin', 'owner')
    )
  );
