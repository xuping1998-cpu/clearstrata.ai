create extension if not exists pgcrypto;

create table if not exists public.property_manager_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  unit_no text,
  title text not null,
  content text not null,
  contact text,
  attachment_urls jsonb not null default '[]'::jsonb,
  category text not null default 'owner_request',
  status text not null default 'pending',
  manager_email text not null default 'gani.xhepa@dwellproperty.ca',
  sent_to_manager_at timestamptz,
  manager_result text,
  manager_result_by uuid references auth.users(id) on delete set null,
  manager_result_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_manager_requests_category_check
    check (category in ('owner_request', 'repair', 'procurement', 'invoice_upload')),
  constraint property_manager_requests_status_check
    check (status in ('pending', 'sent', 'in_progress', 'resolved', 'rejected'))
);

create table if not exists public.property_manager_request_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.property_manager_requests(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewer_role text,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_manager_request_reviews_unique_reviewer
    unique (request_id, reviewer_id)
);

create index if not exists idx_property_manager_requests_property_id
  on public.property_manager_requests(property_id);

create index if not exists idx_property_manager_requests_created_at
  on public.property_manager_requests(created_at desc);

create index if not exists idx_property_manager_requests_status
  on public.property_manager_requests(status);

create index if not exists idx_property_manager_request_reviews_request_id
  on public.property_manager_request_reviews(request_id);

create index if not exists idx_property_manager_request_reviews_property_id
  on public.property_manager_request_reviews(property_id);

create or replace function public.set_property_manager_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_property_manager_requests_updated_at
  on public.property_manager_requests;

create trigger trg_property_manager_requests_updated_at
before update on public.property_manager_requests
for each row
execute function public.set_property_manager_updated_at();

drop trigger if exists trg_property_manager_request_reviews_updated_at
  on public.property_manager_request_reviews;

create trigger trg_property_manager_request_reviews_updated_at
before update on public.property_manager_request_reviews
for each row
execute function public.set_property_manager_updated_at();

alter table public.property_manager_requests enable row level security;
alter table public.property_manager_request_reviews enable row level security;

-- ── property_manager_requests policies ──────────────────────────────────────

drop policy if exists property_manager_requests_select_active_member
  on public.property_manager_requests;

create policy property_manager_requests_select_active_member
on public.property_manager_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.property_members pm
    where pm.property_id = property_manager_requests.property_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
  )
);

drop policy if exists property_manager_requests_insert_active_member
  on public.property_manager_requests;

create policy property_manager_requests_insert_active_member
on public.property_manager_requests
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.property_members pm
    where pm.property_id = property_manager_requests.property_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
  )
);

drop policy if exists property_manager_requests_update_staff
  on public.property_manager_requests;

create policy property_manager_requests_update_staff
on public.property_manager_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.property_members pm
    where pm.property_id = property_manager_requests.property_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
      and pm.role in ('council', 'admin', 'property_admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.property_members pm
    where pm.property_id = property_manager_requests.property_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
      and pm.role in ('council', 'admin', 'property_admin', 'manager')
  )
);

-- ── property_manager_request_reviews policies ────────────────────────────────

drop policy if exists property_manager_request_reviews_select_active_member
  on public.property_manager_request_reviews;

create policy property_manager_request_reviews_select_active_member
on public.property_manager_request_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.property_members pm
    where pm.property_id = property_manager_request_reviews.property_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
  )
);

drop policy if exists property_manager_request_reviews_insert_active_member
  on public.property_manager_request_reviews;

create policy property_manager_request_reviews_insert_active_member
on public.property_manager_request_reviews
for insert
to authenticated
with check (
  reviewer_id = auth.uid()
  and exists (
    select 1
    from public.property_members pm
    where pm.property_id = property_manager_request_reviews.property_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
  )
);

drop policy if exists property_manager_request_reviews_update_own
  on public.property_manager_request_reviews;

create policy property_manager_request_reviews_update_own
on public.property_manager_request_reviews
for update
to authenticated
using (
  reviewer_id = auth.uid()
)
with check (
  reviewer_id = auth.uid()
);
