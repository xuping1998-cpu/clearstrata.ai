# RC-011 IU-5 — Forward Apply Report

| Field | Value |
|-------|-------|
| **Program** | RC-011 Migration History Reconciliation |
| **Implementation Unit** | **IU-5** — Forward Apply & Verification |
| **Authoritative Source** | [`RC-011-Implementation-Plan.md`](RC-011-Implementation-Plan.md) **Revision v1.0** |
| **Primary Inputs** | [`RC-011-IU-4-Backfill-Report.md`](RC-011-IU-4-Backfill-Report.md), [`RC-011-IU-4-Completion.md`](RC-011-IU-4-Completion.md), [`E-01-IU-1.1C-Deployment-Readiness.md`](E-01-IU-1.1C-Deployment-Readiness.md) |
| **Linked project** | `wqohkxtqozscmwfrryfl` |
| **Repository SHA** | `4437846335bc32fd222cfe9d194f718e73900eff` |
| **Execution date** | 2026-07-31 |
| **Status** | **Complete — 7/7 APPLY_PASSED** |

---

## 1. Executive summary

IU-5 forward-applied **seven** APPLY_REQUIRED migrations using targeted per-version deployment. Each migration SQL file was applied with `supabase db query --linked --file`, then recorded in history with `supabase migration repair --status applied`. **`supabase db push` was not used** — it would have applied 90+ unauthorized local-only migrations outside RC-011 scope.

**Outcome:** Database history head is **`20261728120000`** (repo migration head). All sixteen RC-011 reconciliation migrations (`20261327120000` → `20261728120000`) are synchronized Local | Remote. E-01 schema deployed; immutability negative tests A–G passed in rolled-back fixtures; 44 production voter snapshot rows preserved with `freeze_event_id IS NULL`.

---

## 2. Pre-execution gate

| # | Check | Pre-IU-5 | Result |
|---|-------|----------|--------|
| 1 | Linked project `wqohkxtqozscmwfrryfl` | — | ✓ PASS |
| 2 | IU-4 targets applied | **9 / 9** | ✓ PASS |
| 3 | IU-5 targets applied | **0 / 7** | ✓ PASS |
| 4 | Policies (9 scope tables) | **16** | ✓ PASS |
| 5 | Duplicate policies (scope) | **0** | ✓ PASS |
| 6 | Duplicate triggers (scope) | **0** | ✓ PASS |
| 7 | `owner_vote_voter_snapshot` rows | **44** | ✓ PASS |
| 8 | Repository lock commits | `36e3f77`, `4437846` | ✓ PASS |
| 9 | Pre snapshots captured | §3 | ✓ PASS |

**Pre-IU-5 history head:** `20261707120000` (199 rows)

---

## 3. Pre / post snapshots

### Pre-IU-5

| Metric | Value |
|--------|-------|
| History head | `20261707120000` |
| Total history rows | 199 |
| IU-5 rows present | 0 / 7 |
| `claim_sgm_pause_email_delivery` | Absent |
| E-01 tables | Absent |

### Post-IU-5

| Metric | Value |
|--------|-------|
| History head | `20261728120000` |
| Total history rows | 206 (+7) |
| IU-5 rows present | 7 / 7 |
| RC-011 chain (16 migrations) | All Local \| Remote synced |
| `owner_vote_voter_snapshot` rows | 44 (unchanged) |
| All `freeze_event_id` on production rows | NULL (44/44) |

---

## 4. Apply method

| Step | Mechanism |
|------|-----------|
| **SQL apply** | `npx supabase db query --linked --file supabase/migrations/<file>.sql` |
| **History record** | `npx supabase migration repair --status applied <version> --linked --yes` |
| **Not used** | `supabase db push`, `--include-all`, batch apply |

**Rationale:** `db push --linked` would apply unauthorized local-only migrations predating RC-011 scope. Targeted apply preserves strict execution boundary.

---

## 5. Phase A — per-migration evidence

### 5.1 `20261423120000` — `sgm_pause_delivery_sending_claim`

| Field | Value |
|-------|-------|
| **Command (SQL)** | `npx supabase db query --linked --file supabase/migrations/20261423120000_sgm_pause_delivery_sending_claim.sql` |
| **Command (history)** | `npx supabase migration repair --status applied 20261423120000 --linked --yes` |
| **Exit codes** | SQL **0**, repair **0** |
| **History before** | Absent |
| **History after** | Present |
| **Schema changes** | Status CHECK adds `'sending'`; `claim_sgm_pause_email_delivery()` created |
| **Verification** | Function exists; CHECK includes `sending,sent,failed`; 20 SGM pause rows preserved |
| **Result** | **APPLY_PASSED** |

### 5.2 `20261723140000` — `meeting_formal_resolution_authoring`

| Field | Value |
|-------|-------|
| **Command (SQL)** | `npx supabase db query --linked --file supabase/migrations/20261723140000_meeting_formal_resolution_authoring.sql` |
| **Command (history)** | `npx supabase migration repair --status applied 20261723140000 --linked --yes` |
| **Exit codes** | SQL **0**, repair **0** (1 transient auth retry) |
| **History before** | Absent |
| **History after** | Present |
| **Schema changes** | Four `formal_resolution_*` columns on `meeting_agenda_items`; `meeting_formal_resolution_audit` table + 2 indexes + 2 policies |
| **Verification** | Columns exist; audit table/indexes/policies exist; 3 agenda rows preserved |
| **Result** | **APPLY_PASSED** |

**Phase A gate:** ✓ Passed — E-01 apply authorized.

---

## 6. E-01 pre-flight (Phase B entry)

Per [`E-01-IU-1.1C-Deployment-Readiness.md`](E-01-IU-1.1C-Deployment-Readiness.md):

| Check | Result | Evidence |
|-------|--------|----------|
| Orphan `meeting_id` | **0 rows** | ✓ PASS |
| Orphan `property_id` | **0 rows** | ✓ PASS |
| FK inventory on `owner_vote_voter_snapshot` | 3 FKs (meeting, property, user) | ✓ Recorded |
| Column contract | 9 columns match RC010-B | ✓ PASS |
| `snapshot_frozen_at` / `snapshot_freeze_at` | Both timestamptz nullable | ✓ PASS |
| RLS on `owner_vote_voter_snapshot` | Enabled; 2 policies unchanged | ✓ PASS |
| Obsolete `20260622190000` in history | Absent | ✓ PASS |
| Voter snapshot row count | **44** | ✓ PASS |

**Pre-flight decision:** Proceed to Phase B.

---

## 7. Phase B — per-migration evidence

### 7.1 `20261724120000` — `e01_iu11_snapshot_domain_schema`

| Field | Value |
|-------|-------|
| **Exit codes** | SQL **0**, repair **0** |
| **Schema changes** | `owner_vote_voter_snapshot` domain alignment; `snapshot_frozen_at` on meetings |
| **Verification** | `snapshot_frozen_at` column confirmed |
| **Result** | **APPLY_PASSED** |

### 7.2 `20261725120000` — `e01_iu21_freeze_event_identity`

| Field | Value |
|-------|-------|
| **Exit codes** | SQL **0**, repair **0** |
| **Schema changes** | `owner_vote_freeze_events` table; `freeze_event_id` on voter snapshot |
| **Verification** | Table + column confirmed |
| **Result** | **APPLY_PASSED** |

### 7.3 `20261726120000` — `e01_iu22_voter_snapshot_immutability`

| Field | Value |
|-------|-------|
| **Exit codes** | SQL **0**, repair **0** |
| **Schema changes** | `owner_vote_voter_snapshot_event_linked_immutable()` + trigger |
| **Verification** | Function + `trg_owner_vote_voter_snapshot_event_linked_immutable` confirmed |
| **Result** | **APPLY_PASSED** |

### 7.4 `20261727120000` — `e01_iu31_resolution_snapshot_foundation`

| Field | Value |
|-------|-------|
| **Exit codes** | SQL **0**, repair **0** |
| **Schema changes** | `owner_vote_resolution_snapshot`, `owner_vote_frozen_motions` + FKs/indexes/RLS |
| **Verification** | Both tables exist |
| **Result** | **APPLY_PASSED** |

### 7.5 `20261728120000` — `e01_iu32_resolution_snapshot_immutability`

| Field | Value |
|-------|-------|
| **Exit codes** | SQL **0**, repair **0** |
| **Schema changes** | Resolution/frozen-motion immutability functions + triggers |
| **Verification** | Both triggers confirmed |
| **Result** | **APPLY_PASSED** |

---

## 8. E-01 post-apply schema verification

| # | Criterion | Result |
|---|-----------|--------|
| 1 | `owner_vote_meetings.snapshot_frozen_at` exists | ✓ |
| 2 | `owner_vote_voter_snapshot` contract valid (9 columns) | ✓ |
| 3 | `owner_vote_freeze_events` exists | ✓ |
| 4 | `owner_vote_voter_snapshot.freeze_event_id` exists | ✓ |
| 5 | Voter snapshot immutability function + trigger | ✓ |
| 6 | `owner_vote_resolution_snapshot` exists | ✓ |
| 7 | `owner_vote_frozen_motions` exists | ✓ |
| 8 | Resolution/frozen-motion immutability functions + triggers | ✓ |
| 9 | Expected FKs and indexes (per migrations) | ✓ |
| 10 | No unintended RLS/policy change on voter snapshot | ✓ (2 policies unchanged) |
| 11 | 44 production rows present; all `freeze_event_id IS NULL` | ✓ |
| 12 | `freeze_owner_vote_snapshot` RPC exists | ✓ |

---

## 9. Immutability negative tests

**Script:** [`rc-011/iu-5-immutability-negative-tests.sql`](rc-011/iu-5-immutability-negative-tests.sql)  
**Method:** Transactional fixtures; **ROLLBACK** at end — no production data mutated.

| Test | Action | Expected | Result |
|------|--------|----------|--------|
| **A** | UPDATE event-linked voter snapshot | ERROR immutable | ✓ PASSED |
| **B** | DELETE event-linked voter snapshot | ERROR cannot delete | ✓ PASSED |
| **C** | DELETE legacy row (`freeze_event_id IS NULL`) | Success | ✓ PASSED |
| **D** | UPDATE resolution snapshot | ERROR immutable | ✓ PASSED |
| **E** | DELETE resolution snapshot | ERROR cannot delete | ✓ PASSED |
| **F** | UPDATE frozen motion | ERROR immutable | ✓ PASSED |
| **G** | DELETE frozen motion | ERROR cannot delete | ✓ PASSED |

**Exit code:** 0

---

## 10. Migration history verification

### RC-011 scope (16 migrations) — all synchronized

```
20261327120000 … 20261707120000 (IU-4 backfill)
20261423120000 … 20261728120000 (IU-5 apply)
```

CLI `migration list --linked` shows Local | Remote populated for all sixteen versions.

| Metric | Value |
|--------|-------|
| MAX(version) | `20261728120000` |
| Repo migration head | `20261728120000` |
| Unauthorized history rows | None |
| RC-011 pending migrations | **0** |

### Advisory — pre-existing drift outside RC-011 scope

Local-only migrations (e.g. `20260501150000`, `20260829120000`) remain pending — predates RC-011 and outside the sixteen-migration reconciliation set. **`db push --include-all` is not safe** without separate drift program. RC-011 repo head through `20261728120000` is fully reconciled.

---

## 11. Runtime smoke checks

| Area | Check | Result |
|------|-------|--------|
| SGM pause delivery | `claim_sgm_pause_email_delivery` exists; executes (FK guard on invalid UUIDs) | ✓ |
| Formal resolution authoring | Agenda columns + audit table queryable | ✓ |
| Voter snapshot reads | 44 rows SELECT | ✓ |
| Freeze RPC | `freeze_owner_vote_snapshot` exists | ✓ |
| Policies unchanged | 2 voter snapshot policies preserved | ✓ |

**Not executed:** Full browser meeting-page regression (out of IU-5 scope).

---

## 12. Rollback readiness

| Item | Detail |
|------|-------|
| **Pre-mutation snapshot** | §3 pre-IU-5 |
| **Rollback authority** | Engineering lead + governance sign-off |
| **Per-migration rollback** | CES-009 downgrade plan per applied migration; history repair `--status reverted` does not drop schema |
| **Data-loss assessment** | None observed — 44 voter snapshot rows unchanged |

---

## 13. Deviations

| Item | Detail |
|------|--------|
| Apply mechanism | Targeted `db query --file` + `migration repair` instead of `db push` (authorized — strict boundary) |
| History repair | Transient auth failure on `20261723140000` repair; succeeded on retry |
| Claim RPC smoke | Dummy UUID call rejected by FK — confirms function operational |

**Blockers:** None

---

## 14. Verification status

| Gate | Status |
|------|--------|
| Design Review | ✓ Passed |
| Implementation Review | ✓ Passed |
| Build Verification | ✓ Passed (`npm run build`) |
| Database Verification | ✓ Passed |
| Runtime Verification | ✓ Passed (SQL smoke; no browser regression) |
| Regression Verification | □ Pending |

---

## Document control

| Field | Value |
|-------|-------|
| **Companion** | [`RC-011-IU-5-Completion.md`](RC-011-IU-5-Completion.md) |
| **Program closure** | [`RC-011-Completion.md`](RC-011-Completion.md) |
