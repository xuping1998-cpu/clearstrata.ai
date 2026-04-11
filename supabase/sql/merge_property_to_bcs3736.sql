begin;

-- 旧 property
-- 181b2551-3203-48eb-a4ac-f4f3d49e53f6

-- 新 property（BCS3736）
-- 497a907d-8df2-4e62-8859-66de6449c5c2

update public.annual_budgets set property_id = '497a907d-8df2-4e62-8859-66de6449c5c2' where property_id = '181b2551-3203-48eb-a4ac-f4f3d49e53f6';
update public.budget_categories set property_id = '497a907d-8df2-4e62-8859-66de6449c5c2' where property_id = '181b2551-3203-48eb-a4ac-f4f3d49e53f6';
update public.budget_package set property_id = '497a907d-8df2-4e62-8859-66de6449c5c2' where property_id = '181b2551-3203-48eb-a4ac-f4f3d49e53f6';

update public.invoices set property_id = '497a907d-8df2-4e62-8859-66de6449c5c2' where property_id = '181b2551-3203-48eb-a4ac-f4f3d49e53f6';
update public.invoice_anomalies set property_id = '497a907d-8df2-4e62-8859-66de6449c5c2' where property_id = '181b2551-3203-48eb-a4ac-f4f3d49e53f6';
update public.invoice_audit_reports set property_id = '497a907d-8df2-4e62-8859-66de6449c5c2' where property_id = '181b2551-3203-48eb-a4ac-f4f3d49e53f6';

update public.procurement_jobs set property_id = '497a907d-8df2-4e62-8859-66de6449c5c2' where property_id = '181b2551-3203-48eb-a4ac-f4f3d49e53f6';
update public.procurement_quotes set property_id = '497a907d-8df2-4e62-8859-66de6449c5c2' where property_id = '181b2551-3203-48eb-a4ac-f4f3d49e53f6';

update public.manager_tasks set property_id = '497a907d-8df2-4e62-8859-66de6449c5c2' where property_id = '181b2551-3203-48eb-a4ac-f4f3d49e53f6';

update public.join_requests set property_id = '497a907d-8df2-4e62-8859-66de6449c5c2' where property_id = '181b2551-3203-48eb-a4ac-f4f3d49e53f6';

commit;

-- 删除重复 membership（避免 unique 冲突）
delete from public.property_members
where property_id = '181b2551-3203-48eb-a4ac-f4f3d49e53f6'
and user_id in (
  select user_id
  from public.property_members
  where property_id = '497a907d-8df2-4e62-8859-66de6449c5c2'
);

-- 再迁移剩余用户
update public.property_members
set property_id = '497a907d-8df2-4e62-8859-66de6449c5c2'
where property_id = '181b2551-3203-48eb-a4ac-f4f3d49e53f6';
