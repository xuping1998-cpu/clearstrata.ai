alter table public.properties
add column if not exists property_code text;

update public.properties
set property_code = 'BCS3736'
where id = '497a907d-8df2-4e62-8859-66de6449c5c2';

-- Client RLS blocks direct inserts on property_members; use SECURITY DEFINER for QR / ?propertyCode= deep links.
create or replace function public.claim_property_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prop uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return null;
  end if;
  if p_code is null or length(trim(p_code)) = 0 then
    return null;
  end if;
  select id into v_prop
  from public.properties
  where property_code is not null
    and lower(trim(property_code)) = lower(trim(p_code))
  limit 1;
  if v_prop is null then
    return null;
  end if;
  if not exists (
    select 1
    from public.property_members pm
    where pm.user_id = v_uid and pm.property_id = v_prop
  ) then
    insert into public.property_members (user_id, property_id, role, status)
    values (v_uid, v_prop, 'owner', 'active');
  end if;
  return v_prop;
end;
$$;

revoke all on function public.claim_property_by_code(text) from public;
grant execute on function public.claim_property_by_code(text) to authenticated;
