/*
  # Bank transaction ↔ invoice suggested matching (Phase P2B-1 / P2B-2)

  Council manually confirms or rejects suggestions; no auto-confirm.
  P2B-2: amount + date window required; vendor similarity optional bonus; cheque bonus.
*/

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- bank_transactions match columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS matched_invoice_id uuid
    REFERENCES public.invoices(id) ON DELETE SET NULL;

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS match_status text DEFAULT 'unmatched';

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS match_confidence integer;

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS match_reason text;

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS matched_at timestamptz;

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS matched_by uuid
    REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_match_status
  ON public.bank_transactions(match_status);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_matched_invoice
  ON public.bank_transactions(matched_invoice_id)
  WHERE matched_invoice_id IS NOT NULL;

COMMENT ON COLUMN public.bank_transactions.match_status IS
  'unmatched | suggested | confirmed | rejected';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._bank_norm_vendor(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(
    regexp_replace(
      regexp_replace(
        upper(coalesce(p, '')),
        '\s+(LTD|LIMITED|INC|CORP|COMPANY|CO)\.?\s*',
        ' ',
        'gi'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public._assert_bank_invoice_match_reviewer(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_property_id IS NULL THEN
    RAISE EXCEPTION 'property_id required' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.property_members pm
    WHERE pm.user_id = (SELECT auth.uid())
      AND pm.property_id = p_property_id
      AND pm.status = 'active'
      AND pm.role IN ('council', 'admin', 'property_admin')
  ) THEN
    RAISE EXCEPTION 'Forbidden: council, admin, or property_admin required'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._assert_bank_invoice_match_reviewer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._assert_bank_invoice_match_reviewer(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- generate_bank_invoice_suggestions
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_bank_invoice_suggestions(p_property_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bt RECORD;
  v_inv RECORD;
  v_best_inv_id uuid;
  v_best_score int;
  v_best_reason text;
  v_amount_score int;
  v_date_score int;
  v_vendor_score int;
  v_cheque_bonus int;
  v_total_score int;
  v_days int;
  v_sim real;
  v_reason_parts text[];
  v_count int := 0;
BEGIN
  PERFORM public._assert_bank_invoice_match_reviewer(p_property_id);

  FOR v_bt IN
    SELECT bt.*
    FROM public.bank_transactions bt
    WHERE bt.property_id = p_property_id
      AND bt.match_status IN ('unmatched', 'suggested')
  LOOP
    v_best_inv_id := NULL;
    v_best_score := 0;
    v_best_reason := NULL;

    FOR v_inv IN
      SELECT i.*
      FROM public.invoices i
      WHERE i.property_id = p_property_id
        AND i.total_amount IS NOT NULL
        AND i.invoice_date IS NOT NULL
        AND i.id NOT IN (
          SELECT bt2.matched_invoice_id
          FROM public.bank_transactions bt2
          WHERE bt2.property_id = p_property_id
            AND bt2.match_status = 'confirmed'
            AND bt2.matched_invoice_id IS NOT NULL
            AND bt2.id <> v_bt.id
        )
    LOOP
      v_amount_score := 0;
      v_date_score := 0;
      v_vendor_score := 0;
      v_cheque_bonus := 0;
      v_reason_parts := ARRAY[]::text[];

      -- Required: amount match
      IF abs(abs(v_bt.amount) - abs(v_inv.total_amount)) > 0.01 THEN
        CONTINUE;
      END IF;
      v_amount_score := 50;
      v_reason_parts := array_append(v_reason_parts, '金额一致');

      -- Required: invoice date within 30 days of bank transaction
      v_days := abs(v_bt.transaction_date - v_inv.invoice_date::date);
      IF v_days > 30 THEN
        CONTINUE;
      END IF;

      IF v_days <= 7 THEN
        v_date_score := 30;
      ELSIF v_days <= 14 THEN
        v_date_score := 25;
      ELSE
        v_date_score := 15;
      END IF;
      v_reason_parts := array_append(v_reason_parts, format('日期相差 %s 天', v_days));

      -- Optional: vendor similarity bonus (not required for suggestion)
      v_sim := similarity(
        public._bank_norm_vendor(v_bt.description),
        public._bank_norm_vendor(v_inv.vendor_name)
      );
      IF v_sim > 0.60 THEN
        v_vendor_score := 20;
        v_reason_parts := array_append(v_reason_parts, '供应商相似');
      END IF;

      -- Optional: cheque payment description bonus
      IF v_bt.description ILIKE '%CHEQUE%' THEN
        v_cheque_bonus := 10;
        v_reason_parts := array_append(v_reason_parts, '银行描述为 cheque');
      END IF;

      v_total_score := v_amount_score + v_date_score + v_vendor_score + v_cheque_bonus;

      IF v_total_score >= 65 AND v_total_score > v_best_score THEN
        v_best_score := v_total_score;
        v_best_inv_id := v_inv.id;
        v_best_reason := array_to_string(v_reason_parts, '；');
      END IF;
    END LOOP;

    IF v_best_inv_id IS NOT NULL THEN
      UPDATE public.bank_transactions
      SET
        matched_invoice_id = v_best_inv_id,
        match_status = 'suggested',
        match_confidence = v_best_score,
        match_reason = v_best_reason,
        matched_at = NULL,
        matched_by = NULL,
        updated_at = now()
      WHERE id = v_bt.id;

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_bank_invoice_suggestions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_bank_invoice_suggestions(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- confirm_bank_invoice_match
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_bank_invoice_match(
  p_bank_transaction_id uuid,
  p_invoice_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bt public.bank_transactions%ROWTYPE;
  v_inv public.invoices%ROWTYPE;
BEGIN
  SELECT * INTO v_bt FROM public.bank_transactions WHERE id = p_bank_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank transaction not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public._assert_bank_invoice_match_reviewer(v_bt.property_id);

  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_inv.property_id <> v_bt.property_id THEN
    RAISE EXCEPTION 'Invoice and bank transaction property mismatch' USING ERRCODE = '22023';
  END IF;

  UPDATE public.bank_transactions
  SET
    matched_invoice_id = p_invoice_id,
    match_status = 'confirmed',
    matched_at = now(),
    matched_by = (SELECT auth.uid()),
    updated_at = now()
  WHERE id = p_bank_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_bank_invoice_match(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_bank_invoice_match(uuid, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- reject_bank_invoice_match
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_bank_invoice_match(p_bank_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bt public.bank_transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_bt FROM public.bank_transactions WHERE id = p_bank_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank transaction not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public._assert_bank_invoice_match_reviewer(v_bt.property_id);

  UPDATE public.bank_transactions
  SET
    matched_invoice_id = NULL,
    match_status = 'rejected',
    match_confidence = NULL,
    match_reason = NULL,
    matched_at = now(),
    matched_by = (SELECT auth.uid()),
    updated_at = now()
  WHERE id = p_bank_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_bank_invoice_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_bank_invoice_match(uuid) TO authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
