-- Public marketing leads (contact / demo requests). Inserts allowed for anon + authenticated; no public reads.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  building text,
  units text,
  message text,
  created_at timestamptz not null default now()
);

comment on table public.leads is 'Inbound contact and demo requests from the marketing site.';

alter table public.leads enable row level security;

create policy "leads_insert_public"
  on public.leads
  for insert
  to anon, authenticated
  with check (true);
