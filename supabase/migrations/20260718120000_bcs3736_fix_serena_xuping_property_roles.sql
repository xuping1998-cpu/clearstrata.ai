/*
  # BCS3736 — fixed property_members roles for Serena + xuping1998

  property_id = 497a907d-8df2-4e62-8859-66de6449c5c2

  * serena@clearstrata.ai → admin (explicit; overwrites that row only)
  * xuping1998@gmail.com → council (explicit; overwrites that row only)
  * No bulk changes to other members.

  If a profile exists but has no property_members row yet, INSERT … ON CONFLICT DO UPDATE
  applies only to these two emails.
*/

DO $$
DECLARE
  v_property uuid := '497a907d-8df2-4e62-8859-66de6449c5c2'::uuid;
  n1 int := 0;
  n2 int := 0;
BEGIN
  INSERT INTO public.property_members (property_id, user_id, role, status)
  SELECT v_property, p.id, 'admin'::public.user_role, 'active'::public.member_status
  FROM public.profiles p
  WHERE lower(trim(p.email::text)) = lower(trim('serena@clearstrata.ai'))
  ON CONFLICT (property_id, user_id) DO UPDATE
  SET
    role = 'admin'::public.user_role,
    status = 'active'::public.member_status;

  GET DIAGNOSTICS n1 = ROW_COUNT;

  INSERT INTO public.property_members (property_id, user_id, role, status)
  SELECT v_property, p.id, 'council'::public.user_role, 'active'::public.member_status
  FROM public.profiles p
  WHERE lower(trim(p.email::text)) = lower(trim('xuping1998@gmail.com'))
  ON CONFLICT (property_id, user_id) DO UPDATE
  SET
    role = 'council'::public.user_role,
    status = 'active'::public.member_status;

  GET DIAGNOSTICS n2 = ROW_COUNT;

  RAISE NOTICE '[bcs3736 roles] upserts for serena@clearstrata.ai (admin): %, xuping1998@gmail.com (council): %', n1, n2;
END;
$$;
