/*
  Allow INSERT into public.notifications via Supabase service role (no auth.uid() in DB).

  When auth.uid() is NULL but NEW.created_by is set (trusted server insert), derive
  author_name / author_role from profiles for that user (council/manager only).
*/

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
  uid uuid;
BEGIN
  uid := (SELECT auth.uid());

  IF uid IS NOT NULL THEN
    SELECT p.role::text, p.full_name_en, COALESCE(p.full_name_zh, '')
    INTO r, name_en, name_zh
    FROM profiles p
    WHERE p.id = uid;

    IF r IS NULL OR r NOT IN ('council', 'manager') THEN
      RAISE EXCEPTION 'only council or manager can publish notifications';
    END IF;

    NEW.created_by := uid;

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
  END IF;

  IF NEW.created_by IS NULL THEN
    RAISE EXCEPTION 'only council or manager can publish notifications';
  END IF;

  SELECT p.role::text, p.full_name_en, COALESCE(p.full_name_zh, '')
  INTO r, name_en, name_zh
  FROM profiles p
  WHERE p.id = NEW.created_by;

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




