-- Minimal invite-funnel analytics: client-inserted events (opened, auth_ok, submitted, approved, auto_approved).

create table if not exists public.property_entry_events (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null,
  invite_code text null,
  source text null,
  event_type text not null,
  user_id uuid null,
  request_id uuid null,
  created_at timestamptz not null default now()
);

create index if not exists property_entry_events_property_id_created_at_idx
  on public.property_entry_events (property_id, created_at desc);

create index if not exists property_entry_events_property_id_invite_created_at_idx
  on public.property_entry_events (property_id, invite_code, created_at desc);

create index if not exists property_entry_events_event_type_created_at_idx
  on public.property_entry_events (event_type, created_at desc);

alter table public.property_entry_events enable row level security;

-- Pre-auth `/entry?propertyId=` needs `opened` before session exists.
drop policy if exists "property_entry_events_insert_anon" on public.property_entry_events;
create policy "property_entry_events_insert_anon"
  on public.property_entry_events
  for insert
  to anon
  with check (true);

drop policy if exists "property_entry_events_insert_authenticated" on public.property_entry_events;
create policy "property_entry_events_insert_authenticated"
  on public.property_entry_events
  for insert
  to authenticated
  with check (true);
