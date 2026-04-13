/*
  # Backfill property_members from residents (BCS3736 property)

  Inserts one active owner membership per residents.user_id for the given property
  when no property_members row exists yet (NOT EXISTS).

  Target property_id corresponds to demo / BCS3736 slug in seed data.
*/

INSERT INTO public.property_members (property_id, user_id, role, status)
SELECT DISTINCT
  '497a907d-8df2-4e62-8859-66de6449c5c2'::uuid,
  r.user_id,
  'owner'::public.user_role,
  'active'::public.member_status
FROM public.residents r
WHERE r.property_id = '497a907d-8df2-4e62-8859-66de6449c5c2'::uuid
  AND NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.property_id = r.property_id
      AND pm.user_id = r.user_id
  );
