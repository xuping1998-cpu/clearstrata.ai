-- 幂等：确保 invoices.quote_id 存在（若已在 20260605120000 中创建则跳过）
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.procurement_quotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_quote ON public.invoices(quote_id);

NOTIFY pgrst, 'reload schema';
