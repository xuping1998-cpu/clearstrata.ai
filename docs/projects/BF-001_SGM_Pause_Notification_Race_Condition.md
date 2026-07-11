# BF-001 — SGM Pause Notification Race Condition

## Bug Fix Record

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | BF-001 |
| **Document Title** | SGM Pause Notification Race Condition |
| **Document Type** | Bug Fix Record (BF) |
| **Status** | COMPLETED |
| **Version** | 1.0 |
| **Authority** | ClearStrata Project One |
| **Effective Date** | 2026-07-11 |
| **Classification** | Production Bug Fix |
| **Owner** | ClearStrata Project One |
| **Related Documents** | UIP-011, GP-005, GP-006 |
| **Repository Location** | `docs/projects/BF-001_SGM_Pause_Notification_Race_Condition.md` |

---

## Production evidence

Test owner `justine2026test@2925.com` (`user_id` `1b0d9e2a-75b8-4883-9ea7-c781855216d6`):

- Paused SGM `652350ca-84c3-4580-9a86-c66182dc7e0f`
- Two identical emails at `2026-07-10 23:07:49 UTC`
- Two `user_notifications` rows ~204 ms apart
- Only **one** `sgm_pause_email_deliveries` row (`status=sent`, `attempt_no=1`)
- No second `join_requests` row

---

## Root cause

Non-atomic sequence in `api/ensure-and-send-sgm-pause-notice.ts`:

1. SELECT existing deliveries
2. INSERT `user_notifications`
3. Call Resend
4. INSERT ledger row

Concurrent Dashboard/API POSTs could both pass the SELECT, both insert notifications, both call Resend; only one ledger insert succeeded on `UNIQUE (meeting_id, user_id, attempt_no)`.

---

## Fix design — atomic claim

1. **Claim before any per-recipient side effect** via RPC `claim_sgm_pause_email_delivery`
2. INSERT ledger row with `status = sending` using `ON CONFLICT DO NOTHING RETURNING id`
3. Only the claim winner inserts `user_notifications` and calls Resend
4. Update same row to `sent` or `failed`

Statuses: `sending` → `sent` | `failed`

Skip when any row exists with `sent`, or while another row is `sending`, or when `max_attempts` reached.

---

## Files changed

| File | Change |
|------|--------|
| `supabase/migrations/20261423120000_sgm_pause_delivery_sending_claim.sql` | `sending` status + claim RPC |
| `api/_lib/notificationDeliveryClaim.ts` | Minimal reusable claim utility |
| `api/ensure-and-send-sgm-pause-notice.ts` | Claim-first recipient loop + structured logs |
| `scripts/bf001-concurrency-verify.md` | Manual concurrency verification |
| `docs/Registry/Document_Registry.md` | BF prefix registered |

---

## Migration

**Required:** `20261423120000_sgm_pause_delivery_sending_claim.sql`

- Extends `status` CHECK to include `sending`
- Adds `claim_sgm_pause_email_delivery` (service_role only)

---

## Shared utility interface

```typescript
claimSgmPauseDelivery(admin, { meetingId, propertyId, userId, email, maxAttempts? })
  → { claimed: true, deliveryId, attemptNo } | { claimed: false, reason }

markSgmPauseDeliverySent(admin, deliveryId)
markSgmPauseDeliveryFailed(admin, deliveryId, errorMessage)
```

Tied to `public.sgm_pause_email_deliveries` for BF-001 only.

---

## Before / after send sequence

**Before:** SELECT → notify → Resend → INSERT ledger

**After:** profile/email → **CLAIM (INSERT sending)** → if claimed: notify → Resend → UPDATE sent/failed

---

## In-app notification dedup

Only the **claim winner** may insert `user_notifications`. Concurrent losers skip all per-recipient side effects. Existing pre-load `alreadyNotified` set prevents duplicate insert on retry after failed email when notification was already created.

---

## Retry behavior

- `sent` → permanent skip (`already_sent`)
- `sending` in flight → skip (`already_claimed`)
- `failed` → next `attempt_no` if under max (3)
- Failed rows retained for audit

---

## Verification

See `scripts/bf001-concurrency-verify.md`.

TypeScript: `npx tsc --noEmit`  
Build: `npm run build`

---

## Future reuse note

`notificationDeliveryClaim.ts` may later wrap similar one-time notification ledgers. Migrating meeting invites, join emails, or direct member notifications is **explicitly out of scope** for BF-001.

---

**END OF BF-001**
