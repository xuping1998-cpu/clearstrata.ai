/*
  # P2B-2 — bank invoice suggestion scoring (patch for deployed P2B-1)

  Re-apply generate_bank_invoice_suggestions: amount + 30-day date required;
  vendor similarity optional; cheque bonus; threshold 65.
*/

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

      IF abs(abs(v_bt.amount) - abs(v_inv.total_amount)) > 0.01 THEN
        CONTINUE;
      END IF;
      v_amount_score := 50;
      v_reason_parts := array_append(v_reason_parts, '金额一致');

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

      v_sim := similarity(
        public._bank_norm_vendor(v_bt.description),
        public._bank_norm_vendor(v_inv.vendor_name)
      );
      IF v_sim > 0.60 THEN
        v_vendor_score := 20;
        v_reason_parts := array_append(v_reason_parts, '供应商相似');
      END IF;

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

NOTIFY pgrst, 'reload schema';
