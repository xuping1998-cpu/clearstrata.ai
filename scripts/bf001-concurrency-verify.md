# BF-001 — Concurrency verification

Read-only / manual verification for SGM Pause delivery claim (BF-001).

## Prerequisites

- Migration `20261423120000_sgm_pause_delivery_sending_claim.sql` applied
- Vercel API deployed with `api/_lib/notificationDeliveryClaim.ts`
- Staff session token for test property

## Scenario 1 — Concurrent POST (production)

Use a **new test user** who has never received the paused SGM notice, or delete test rows first in a non-production environment only.

```powershell
$token = "<staff_access_token>"
$body = '{"property_id":"<property_uuid>","meeting_id":"652350ca-84c3-4580-9a86-c66182dc7e0f"}'
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

$jobs = 1..2 | ForEach-Object {
  Start-Job { param($h,$b) Invoke-RestMethod -Method POST -Uri "https://clearstrataaiserena.vercel.app/api/ensure-and-send-sgm-pause-notice" -Headers $h -Body $b } -ArgumentList $headers,$body
}
$jobs | Wait-Job | Receive-Job
```

**Expected**

- One response with `emailsSent: 1` (or `emailAttemptsCreated: 1` among recipients)
- Other response with `emailsSkippedAlreadySent` increased or `emailsSent: 0` for that user
- Logs: one `SGM_PAUSE_DELIVERY_CLAIMED`, one `SGM_PAUSE_DELIVERY_SKIPPED` (`already_claimed` or `already_sent`)

**SQL check** (replace `user_id`):

```sql
SELECT status, attempt_no, created_at
FROM public.sgm_pause_email_deliveries
WHERE meeting_id = '652350ca-84c3-4580-9a86-c66182dc7e0f'
  AND user_id = '<test_user_id>'
ORDER BY attempt_no;

SELECT count(*) FROM public.user_notifications
WHERE user_id = '<test_user_id>' AND type = 'sgm_pause'
  AND message ILIKE '%clearstrata-sgm-pause-meeting-id:652350ca-84c3-4580-9a86-c66182dc7e0f%';
```

Expected: **one** `sent` row at `attempt_no = 1`; **one** notification row.

## Scenario 2 — After sent

Re-run a single POST for the same meeting/property.

**Expected**

- `emailsSkippedAlreadySent` ≥ 1 for users with prior `sent`
- No new `user_notifications` for those users
- Logs: `SGM_PAUSE_DELIVERY_SKIPPED` with `reason: already_sent`

## Scenario 3 — Resend failure

Temporarily unset `RESEND_API_KEY` in a preview deployment, claim a new user.

**Expected**

- Ledger row: `status = failed`, `error_message` contains `RESEND_API_KEY not configured`
- No `sent` row for that attempt

## Scenario 4 — Retry after failed

Restore `RESEND_API_KEY`, POST again for same user.

**Expected**

- New row `attempt_no = 2`, `status = sending` then `sent`
- Exactly one additional Resend call

## Scenario 5 — New owner catch-up

Approve a new active owner who has no ledger row for the paused meeting.

**Expected**

- One claim, one notification, one `sent` row at `attempt_no = 1`

## RPC-only race check (database)

For a disposable test user UUID:

```sql
SELECT public.claim_sgm_pause_email_delivery(
  '652350ca-84c3-4580-9a86-c66182dc7e0f'::uuid,
  '497a907d-8df2-4e62-8859-66de6449c5c2'::uuid,
  '<test_user_id>'::uuid,
  'test@example.com',
  3
);
```

Run twice in parallel sessions; second call must return `{"claimed": false, "reason": "already_claimed"}` or `already_sent` after first completes.
