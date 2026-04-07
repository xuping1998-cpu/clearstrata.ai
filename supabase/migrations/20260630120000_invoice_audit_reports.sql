/*
  异常发票审计报告归档：invoice_audit_reports + Storage 桶 invoice-audit-reports
  file_url 存桶内对象路径（非公开桶，前端用 createSignedUrl 下载）
*/

CREATE OR REPLACE FUNCTION public.invoice_audit_report_storage_property_id(object_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE m text[];
BEGIN
  m := regexp_match(object_name, '^([0-9a-f-]{36})/');
  IF m IS NULL OR m[1] IS NULL THEN RETURN NULL; END IF;
  RETURN m[1]::uuid;
END;
$$;

CREATE TABLE IF NOT EXISTS public.invoice_audit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  fiscal_year int NOT NULL,
  month int NOT NULL CHECK (month >= 1 AND month <= 12),
  generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_request_id text,
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.invoice_audit_reports IS '异常发票审计 PDF 归档（file_url 为 Storage 对象路径，桶 invoice-audit-reports）';
COMMENT ON COLUMN public.invoice_audit_reports.file_url IS 'Storage 对象路径（相对桶根），非完整 HTTP URL';
COMMENT ON COLUMN public.invoice_audit_reports.fiscal_year IS '报告生成时的公历年份（UTC）';
COMMENT ON COLUMN public.invoice_audit_reports.month IS '报告生成时的月份 1–12（UTC）';

CREATE UNIQUE INDEX IF NOT EXISTS invoice_audit_reports_client_request_id_key
  ON public.invoice_audit_reports (client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_audit_reports_property_created
  ON public.invoice_audit_reports (property_id, created_at DESC);

ALTER TABLE public.invoice_audit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iar_select_staff"
  ON public.invoice_audit_reports FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = invoice_audit_reports.property_id
        AND pm.status = 'active'::member_status
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

-- 仅服务端 service role 写入；客户端无 INSERT 策略

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoice-audit-reports',
  'invoice-audit-reports',
  false,
  26214400,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "invoice_audit_reports_storage_select_staff" ON storage.objects;
CREATE POLICY "invoice_audit_reports_storage_select_staff"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'invoice-audit-reports'
    AND public.invoice_audit_report_storage_property_id(name) IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = public.invoice_audit_report_storage_property_id(name)
        AND pm.status = 'active'::member_status
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );

-- 允许已登录物业员工删除自己物业下误传对象（可选；归档一般只增）
DROP POLICY IF EXISTS "invoice_audit_reports_storage_delete_staff" ON storage.objects;
CREATE POLICY "invoice_audit_reports_storage_delete_staff"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'invoice-audit-reports'
    AND public.invoice_audit_report_storage_property_id(name) IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = public.invoice_audit_report_storage_property_id(name)
        AND pm.status = 'active'::member_status
        AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
    )
  );
