# RC-011-IU-3 — Completion Record

| Field | Value |
|-------|-------|
| **Program** | RC-011 Migration History Reconciliation |
| **Implementation Unit** | **IU-3** — Blocking Drift Repair |
| **Status** | **Completed** |
| **Completed** | 2026-07-30 |
| **Production effect** | Idempotent policy guards in migration files; controlled re-apply verification on linked DB — no history backfill |

---

## Authoritative Source

| Field | Value |
|-------|-------|
| **Implementation Plan** | [`RC-011-Implementation-Plan.md`](RC-011-Implementation-Plan.md) |
| **Revision** | **v1.0** |
| **Verified** | **YES** |

---

## 1. Implementation Unit

| Field | Value |
|-------|-------|
| **IU** | **IU-3** |
| **Title** | Blocking Drift Repair |
| **Mode** | Controlled database repair |

---

## 2. Status

**Completed**

---

## 3. Objective

Repair five REPAIR_REQUIRED migrations so live catalog is equivalent to repository intent and eligible for IU-4 history backfill. No history backfill, no E-01 apply, no unchecked db push.

---

## 4. Files created or modified

| File | Change |
|------|--------|
| `supabase/migrations/20261422120000_sgm_pause_email_deliveries.sql` | RC-011 IU-3 guarded policy |
| `supabase/migrations/20261704120000_governance_matters.sql` | RC-011 IU-3 guarded policies (×7) |
| `supabase/migrations/20261704130000_governance_matter_cda.sql` | RC-011 IU-3 guarded policy |
| `supabase/migrations/20261706120000_community_resolutions.sql` | RC-011 IU-3 guarded policies (×4) |
| `supabase/migrations/20261707120000_governance_matter_subscriptions.sql` | RC-011 IU-3 guarded policies (×3) |
| `docs/implementation/rc-011/evidence-locks/RC-011-IU-3-20261422120000-Evidence-Lock.md` | Added |
| `docs/implementation/rc-011/evidence-locks/RC-011-IU-3-20261704120000-Evidence-Lock.md` | Added |
| `docs/implementation/rc-011/evidence-locks/RC-011-IU-3-20261704130000-Evidence-Lock.md` | Added |
| `docs/implementation/rc-011/evidence-locks/RC-011-IU-3-20261706120000-Evidence-Lock.md` | Added |
| `docs/implementation/rc-011/evidence-locks/RC-011-IU-3-20261707120000-Evidence-Lock.md` | Added |
| `docs/implementation/RC-011-IU-3-Repair-Report.md` | Added |
| `docs/implementation/RC-011-IU-3-Completion.md` | Added |

No application code, RPC, or UI changes.

---

## 5. Completion rule checklist

| Criterion | Met |
|-----------|-----|
| All five Evidence Locks exist | ✓ |
| Rollback readiness for all five | ✓ (Evidence Locks §11 + Repair Report §3) |
| All approved repairs executed | ✓ |
| Post-repair verification complete | ✓ |
| Every migration ELIGIBLE_FOR_BACKFILL | ✓ (5/5) |
| No migration history rows inserted | ✓ (DB head remains `20261326120000`) |
| No IU-5 migrations applied | ✓ |

---

## 6. IU-4 eligibility table

| Migration | Eligibility |
|-----------|-------------|
| `20261422120000` | ELIGIBLE_FOR_BACKFILL |
| `20261704120000` | ELIGIBLE_FOR_BACKFILL |
| `20261704130000` | ELIGIBLE_FOR_BACKFILL |
| `20261706120000` | ELIGIBLE_FOR_BACKFILL |
| `20261707120000` | ELIGIBLE_FOR_BACKFILL |

---

## 7. Verification Status

| Gate | Status | Evidence |
|------|--------|----------|
| **Design Review** | ✓ **Passed** | Scope limited to five authorized REPAIR_REQUIRED migrations |
| **Implementation Review** | ✓ **Passed** | Repair artifacts committed; re-apply exit 0 for all five |
| **Build Verification** | **N/A** | No application files changed |
| **Database Verification** | ✓ **Passed** | All five families repaired and verified; [`RC-011-IU-3-Repair-Report.md`](RC-011-IU-3-Repair-Report.md) §6–§7 |
| **Runtime Verification** | □ **Pending** | Smoke checks deferred to IU-5 |
| **Regression Verification** | □ **Pending** | IU-5 / Phase 5 |

---

## 8. Constraints observed

- Linked project `wqohkxtqozscmwfrryfl` confirmed
- No `schema_migrations` inserts
- No `supabase db push`
- No E-01 migrations applied
- `owner_vote_voter_snapshot` data unchanged (44 rows)
- `claim_sgm_pause_email_delivery` not created (IU-5 scope)

---

## 9. Handoff to IU-4

IU-4 may backfill **nine** migrations in version order:

1. `20261327120000`–`20261330120000` (BACKFILL_OK)
2. `20261422120000`, `20261704120000`, `20261704130000`, `20261706120000`, `20261707120000` (repaired REPAIR_REQUIRED)

**Do not backfill:** `20261423120000`, `20261723140000`, E-01 chain — IU-5 only.

---

## Document control

| Field | Value |
|-------|-------|
| **Standard** | CES-010 |
| **Repair Report** | [`RC-011-IU-3-Repair-Report.md`](RC-011-IU-3-Repair-Report.md) |

**Unblocks:** RC-011 IU-4 entry
