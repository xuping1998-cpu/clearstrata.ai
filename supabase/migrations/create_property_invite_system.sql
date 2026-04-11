create table if not exists public.property_invite_codes (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  code text unique not null,
  role text default 'owner',
  auto_approve boolean default true,
  max_uses int,
  used_count int default 0,
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table public.property_invite_codes enable row level security;

-- 给 BCS3736 创建默认邀请码
insert into public.property_invite_codes (property_id, code, role, auto_approve)
values (
  '497a907d-8df2-4e62-8859-66de6449c5c2',
  'BCS3736',
  'owner',
  true
)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- RPC: anonymous / auth lookup (no direct table SELECT for anon)
-- ---------------------------------------------------------------------------
create or replace function public.get_property_invite_by_code(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(t)
  from (
    select
      id,
      property_id,
      code,
      role,
      auto_approve,
      max_uses,
      used_count,
      expires_at,
      created_at
    from public.property_invite_codes
    where lower(trim(code)) = lower(trim(p_code))
    limit 1
  ) t;
$$;

revoke all on function public.get_property_invite_by_code(text) from public;
grant execute on function public.get_property_invite_by_code(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: logged-in user redeems invite from /p/:code
-- ---------------------------------------------------------------------------
create or replace function public.redeem_property_invite_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.property_invite_codes%rowtype;
  v_uid uuid := auth.uid();
  r public.user_role;
begin
  if v_uid is null then
    return null;
  end if;
  if p_code is null or length(trim(p_code)) = 0 then
    return null;
  end if;

  select * into inv
  from public.property_invite_codes
  where lower(trim(code)) = lower(trim(p_code))
  limit 1;

  if not found then
    return null;
  end if;

  if inv.expires_at is not null and inv.expires_at < now() then
    return null;
  end if;

  if inv.max_uses is not null and inv.used_count >= inv.max_uses then
    return null;
  end if;

  begin
    r := inv.role::public.user_role;
  exception
    when invalid_text_representation then
      r := 'owner'::public.user_role;
  end;

  if not exists (
    select 1
    from public.property_members pm
    where pm.user_id = v_uid and pm.property_id = inv.property_id
  ) then
    insert into public.property_members (user_id, property_id, role, status)
    values (v_uid, inv.property_id, r, 'active');

    update public.property_invite_codes
    set used_count = used_count + 1
    where id = inv.id;
  end if;

  return inv.property_id;
end;
$$;

revoke all on function public.redeem_property_invite_code(text) from public;
grant execute on function public.redeem_property_invite_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: after registration while browsing as guest (stored property id)
-- ---------------------------------------------------------------------------
create or replace function public.ensure_invite_owner_membership(p_property_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  r public.user_role;
  inv public.property_invite_codes%rowtype;
begin
  if v_uid is null or p_property_id is null then
    return null;
  end if;

  select * into inv
  from public.property_invite_codes
  where property_id = p_property_id
    and auto_approve = true
  limit 1;

  if not found then
    return null;
  end if;

  begin
    r := inv.role::public.user_role;
  exception
    when invalid_text_representation then
      r := 'owner'::public.user_role;
  end;

  if not exists (
    select 1 from public.property_members pm
    where pm.user_id = v_uid and pm.property_id = p_property_id
  ) then
    insert into public.property_members (user_id, property_id, role, status)
    values (v_uid, p_property_id, r, 'active');
  end if;

  return p_property_id;
end;
$$;

revoke all on function public.ensure_invite_owner_membership(uuid) from public;
grant execute on function public.ensure_invite_owner_membership(uuid) to authenticated;
