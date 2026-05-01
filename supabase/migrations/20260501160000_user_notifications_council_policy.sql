-- Allow active council/admin/manager on a property to SELECT all direct_message
-- notifications for that property (sent via send_member_notification RPC).
-- Regular owners/tenants remain restricted to their own rows via the existing policy.

DROP POLICY IF EXISTS "user_notifications_select_council" ON public.user_notifications;

CREATE POLICY "user_notifications_select_council"
  ON public.user_notifications FOR SELECT TO authenticated
  USING (
    type = 'direct_message'
    AND related_property_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = user_notifications.related_property_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );
