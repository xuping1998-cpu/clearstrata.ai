-- =========================
-- 1. 本月异常发票数量
-- =========================

create or replace function public.dashboard_monthly_abnormal_distinct_count(
  p_property_id uuid,
  p_year int
)
returns int
language sql
as $$
  select count(distinct id)
  from public.invoices
  where property_id = p_property_id
  and extract(year from created_at) = p_year
  and is_abnormal = true;
$$;

-- =========================
-- 2. 最近异常发票
-- =========================

create or replace function public.dashboard_recent_abnormal_invoices(
  p_limit int,
  p_property_id uuid,
  p_year int
)
returns json
language sql
as $$
  select coalesce(json_agg(t), '[]'::json)
  from (
    select
      id,
      vendor_name,
      amount,
      created_at
    from public.invoices
    where property_id = p_property_id
    and extract(year from created_at) = p_year
    and is_abnormal = true
    order by created_at desc
    limit p_limit
  ) t;
$$;
