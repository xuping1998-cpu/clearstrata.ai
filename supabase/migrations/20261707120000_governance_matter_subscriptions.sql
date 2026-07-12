-- Project One — Owner Governance Participation
-- Governance matter subscriptions (personal follow state per user × matter × property)

BEGIN;

CREATE TABLE IF NOT EXISTS public.governance_matter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES public.governance_matters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT governance_matter_subscriptions_unique UNIQUE (property_id, matter_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_governance_matter_subscriptions_matter_id
  ON public.governance_matter_subscriptions(matter_id);

CREATE INDEX IF NOT EXISTS idx_governance_matter_subscriptions_user_id
  ON public.governance_matter_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_governance_matter_subscriptions_property_id
  ON public.governance_matter_subscriptions(property_id);

COMMENT ON TABLE public.governance_matter_subscriptions IS
  'Personal follow/subscribe state for governance matters (GP-005 / UIP-008). One row per user per matter.';

ALTER TABLE public.governance_matter_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gms_select_own"
  ON public.governance_matter_subscriptions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "gms_insert_own_member"
  ON public.governance_matter_subscriptions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = governance_matter_subscriptions.property_id
        AND pm.status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM public.governance_matters gm
      WHERE gm.id = governance_matter_subscriptions.matter_id
        AND gm.property_id = governance_matter_subscriptions.property_id
    )
  );

CREATE POLICY "gms_delete_own"
  ON public.governance_matter_subscriptions FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.governance_matter_subscriptions TO authenticated;
GRANT ALL ON public.governance_matter_subscriptions TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
