# RC-011 IU-4 — Migration History Backfill Report

| Field | Value |
|-------|-------|
| **Program** | RC-011 Migration History Reconciliation |
| **Implementation Unit** | **IU-4** — Migration History Backfill |
| **Authoritative Source** | [`RC-011-Implementation-Plan.md`](RC-011-Implementation-Plan.md) **Revision v1.0** |
| **Primary Inputs** | [`RC-011-IU-4-Admission-Check.md`](RC-011-IU-4-Admission-Check.md), [`RC-011-IU-3-Repair-Report.md`](RC-011-IU-3-Repair-Report.md), [`RC-011-IU-2-Classification-and-Plan.md`](RC-011-IU-2-Classification-and-Plan.md) |
| **Linked project** | `wqohkxtqozscmwfrryfl` |
| **Execution date** | 2026-07-31 |
| **Repository lock** | IU-3 repair `36e3f7756afec048b006556315b8780099cfca29`; lock doc `4437846335bc32fd222cfe9d194f718e73900eff` |
| **Status** | **Complete — 9/9 BACKFILL_PASSED** |

---

## 1. Executive summary

IU-4 backfilled migration history for **nine** catalog-equivalent migrations using the official Supabase CLI repair mechanism. Only `supabase_migrations.schema_migrations` was mutated. No migration SQL was re-applied, no DDL executed, no catalog repair, no `db push`, and no IU-5 forward apply.

**Method:** `npx supabase migration repair --status applied <version> --linked --yes` (one version per invocation).

**Outcome:** Database history head (MAX version) is **`20261707120000`**. Seven IU-5 migrations remain absent from history. Supabase CLI `migration list` shows **`20261423120000`** as pending (Local present, Remote empty) despite numerically falling between applied versions — authoritative post-IU-4 state confirmed.

---

## 2. Pre-execution gate

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Linked project `wqohkxtqozscmwfrryfl` | ✓ PASS | CLI `--linked` connected |
| 2 | Repository contains `36e3f7756afec048b006556315b8780099cfca29` | ✓ PASS | `git cat-file -t 36e3f77` |
| 3 | Repository contains lock doc commit `4437846` | ✓ PASS | HEAD `4437846335bc32fd222cfe9d194f718e73900eff` |
| 4 | Working tree clean for RC-011 artifacts | ✓ PASS | `git status` clean at execution |
| 5 | Pre-backfill history head `20261326120000` | ✓ PASS | `SELECT MAX(version)` |
| 6 | Nine target versions absent pre-backfill | ✓ PASS | IN-query returned 0 rows |
| 7 | Pre-backfill history snapshot captured | ✓ PASS | §3 below |
| 8 | Rollback procedure documented | ✓ PASS | §4 below |

**Gate decision:** Proceed — all checks passed.

---

## 3. Pre / post history snapshots

### Pre-backfill (2026-07-31, before version 1)

| Metric | Value |
|--------|-------|
| **History head (MAX version)** | `20261326120000` |
| **Total history rows** | **190** |
| **IU-4 target rows present** | **0 / 9** |
| **IU-5 target rows present** | **0 / 7** |

**Tail context (last applied before IU-4):**

```
… → 20261325120000 → 20261326120000
```

Nine authorized versions (`20261327120000` … `20261707120000`) were **absent** from `schema_migrations`.

### Post-backfill (2026-07-31, after version 9)

| Metric | Value |
|--------|-------|
| **History head (MAX version)** | `20261707120000` |
| **Total history rows** | **199** (+9) |
| **IU-4 target rows present** | **9 / 9** |
| **IU-5 target rows present** | **0 / 7** |

**Backfilled sequence (ascending):**

```
20261327120000 → 20261328120000 → 20261329120000 → 20261330120000
→ 20261422120000 → 20261704120000 → 20261704130000 → 20261706120000
→ 20261707120000
```

**Ordering note:** `20261423120000` remains **unapplied** (IU-5) between `20261422120000` and `20261704120000` in numeric order but is correctly **absent** from history.

---

## 4. Rollback readiness

| Item | Detail |
|------|--------|
| **Pre-mutation snapshot** | §3 pre-backfill table; admission check [`RC-011-IU-4-Admission-Check.md`](RC-011-IU-4-Admission-Check.md) CHECK 3 |
| **Objects modified** | `supabase_migrations.schema_migrations` only — nine INSERT-equivalent repair rows |
| **Catalog / data impact of rollback** | **None** — removing history rows does not drop schema objects |
| **Per-version rollback command** | `npx supabase migration repair --status reverted <version> --linked --yes` |
| **Full IU-4 rollback order** | Revert versions **descending**: `20261707120000` → … → `20261327120000` |
| **Rollback authority** | Engineering lead + governance sign-off (Implementation Plan §8) |
| **Post-rollback smoke** | `npx supabase migration list --linked`; confirm nine versions show Remote empty; catalog stability queries unchanged |
| **Conditions requiring rollback** | Erroneous history row; unauthorized version inserted; verification failure before IU-5 |
| **Auto-rollback on partial failure** | **Not performed** — stop on failure; manual rollback per authority only |

---

## 5. History repair method

| Field | Value |
|-------|-------|
| **Mechanism** | Supabase CLI official migration history repair |
| **Command template** | `npx supabase migration repair --status applied <version> --linked --yes` |
| **Manual SQL insert** | **Not used** |
| **Migration SQL re-apply** | **Not used** |
| **Batch repair** | **Not used** — blocked by execution control; per-version only |

---

## 6. Per-version evidence

### Version 1 — `20261327120000`

| Field | Value |
|-------|-------|
| **Filename** | `20261327120000_council_action_manager_bridge.sql` |
| **Classification** | BACKFILL_OK ([`RC-011-IU-2-Classification-and-Plan.md`](RC-011-IU-2-Classification-and-Plan.md)) |
| **Command** | `npx supabase migration repair --status applied 20261327120000 --linked --yes` |
| **Timestamp** | 2026-07-31 18:51:06 -0700 |
| **Exit code** | **0** |
| **History row before** | Absent |
| **History row after** | Present (`20261327120000`) |
| **Catalog mutation check** | No change (history-only) |
| **Rollback** | `migration repair --status reverted 20261327120000 --linked --yes` |
| **Result** | **BACKFILL_PASSED** |

### Version 2 — `20261328120000`

| Field | Value |
|-------|-------|
| **Filename** | `20261328120000_manager_feedback_rollup.sql` |
| **Classification** | BACKFILL_OK |
| **Command** | `npx supabase migration repair --status applied 20261328120000 --linked --yes` |
| **Timestamp** | 2026-07-31 18:56:05 -0700 |
| **Exit code** | **0** |
| **History row before** | Absent |
| **History row after** | Present (`20261328120000`) |
| **Catalog mutation check** | No change |
| **Rollback** | `migration repair --status reverted 20261328120000 --linked --yes` |
| **Result** | **BACKFILL_PASSED** |

### Version 3 — `20261329120000`

| Field | Value |
|-------|-------|
| **Filename** | `20261329120000_council_review_queue.sql` |
| **Classification** | BACKFILL_OK |
| **Command** | `npx supabase migration repair --status applied 20261329120000 --linked --yes` |
| **Timestamp** | 2026-07-31 18:57:22 -0700 |
| **Exit code** | **0** |
| **History row before** | Absent |
| **History row after** | Present (`20261329120000`) |
| **Catalog mutation check** | No change |
| **Rollback** | `migration repair --status reverted 20261329120000 --linked --yes` |
| **Result** | **BACKFILL_PASSED** |

### Version 4 — `20261330120000`

| Field | Value |
|-------|-------|
| **Filename** | `20261330120000_council_actions_created_audit_trigger.sql` |
| **Classification** | BACKFILL_OK (IU-2 upgrade from REPAIR_REQUIRED) |
| **Command** | `npx supabase migration repair --status applied 20261330120000 --linked --yes` |
| **Timestamp** | 2026-07-31 18:57:24 -0700 |
| **Exit code** | **0** |
| **History row before** | Absent |
| **History row after** | Present (`20261330120000`) |
| **Catalog mutation check** | No change |
| **Rollback** | `migration repair --status reverted 20261330120000 --linked --yes` |
| **Result** | **BACKFILL_PASSED** |

### Version 5 — `20261422120000`

| Field | Value |
|-------|-------|
| **Filename** | `20261422120000_sgm_pause_email_deliveries.sql` |
| **Classification** | REPAIR_REQUIRED → **ELIGIBLE_FOR_BACKFILL** (IU-3) |
| **Command** | `npx supabase migration repair --status applied 20261422120000 --linked --yes` |
| **Timestamp** | 2026-07-31 18:57:27 -0700 |
| **Exit code** | **0** |
| **History row before** | Absent |
| **History row after** | Present (`20261422120000`) |
| **Catalog mutation check** | No change |
| **Rollback** | `migration repair --status reverted 20261422120000 --linked --yes` |
| **Result** | **BACKFILL_PASSED** |

### Version 6 — `20261704120000`

| Field | Value |
|-------|-------|
| **Filename** | `20261704120000_governance_matters.sql` |
| **Classification** | REPAIR_REQUIRED → **ELIGIBLE_FOR_BACKFILL** (IU-3) |
| **Command** | `npx supabase migration repair --status applied 20261704120000 --linked --yes` |
| **Timestamp** | 2026-07-31 18:58:06 -0700 |
| **Exit code** | **0** |
| **History row before** | Absent |
| **History row after** | Present (`20261704120000`) |
| **Catalog mutation check** | No change |
| **Rollback** | `migration repair --status reverted 20261704120000 --linked --yes` |
| **Result** | **BACKFILL_PASSED** |

### Version 7 — `20261704130000`

| Field | Value |
|-------|-------|
| **Filename** | `20261704130000_governance_matter_cda.sql` |
| **Classification** | REPAIR_REQUIRED → **ELIGIBLE_FOR_BACKFILL** (IU-3) |
| **Command** | `npx supabase migration repair --status applied 20261704130000 --linked --yes` |
| **Timestamp** | 2026-07-31 18:58:15 -0700 |
| **Exit code** | **0** |
| **History row before** | Absent |
| **History row after** | Present (`20261704130000`) |
| **Catalog mutation check** | No change |
| **Rollback** | `migration repair --status reverted 20261704130000 --linked --yes` |
| **Result** | **BACKFILL_PASSED** |

### Version 8 — `20261706120000`

| Field | Value |
|-------|-------|
| **Filename** | `20261706120000_community_resolutions.sql` |
| **Classification** | REPAIR_REQUIRED → **ELIGIBLE_FOR_BACKFILL** (IU-3) |
| **Command** | `npx supabase migration repair --status applied 20261706120000 --linked --yes` |
| **Timestamp** | 2026-07-31 18:58:17 -0700 |
| **Exit code** | **0** |
| **History row before** | Absent |
| **History row after** | Present (`20261706120000`) |
| **Catalog mutation check** | No change |
| **Rollback** | `migration repair --status reverted 20261706120000 --linked --yes` |
| **Result** | **BACKFILL_PASSED** |

### Version 9 — `20261707120000`

| Field | Value |
|-------|-------|
| **Filename** | `20261707120000_governance_matter_subscriptions.sql` |
| **Classification** | REPAIR_REQUIRED → **ELIGIBLE_FOR_BACKFILL** (IU-3) |
| **Command** | `npx supabase migration repair --status applied 20261707120000 --linked --yes` |
| **Timestamp** | 2026-07-31 18:58:26 -0700 |
| **Exit code** | **0** |
| **History row before** | Absent |
| **History row after** | Present (`20261707120000`) |
| **Catalog mutation check** | No change |
| **Rollback** | `migration repair --status reverted 20261707120000 --linked --yes` |
| **Result** | **BACKFILL_PASSED** |

---

## 7. Post-backfill verification

### 7.1 History rows

| Check | Result |
|-------|--------|
| All nine authorized rows exist | ✓ PASS |
| Version order ascending correct | ✓ PASS |
| MAX(version) = `20261707120000` | ✓ PASS |
| Total rows = 199 (+9 from 190) | ✓ PASS |
| No unauthorized rows added | ✓ PASS (only authorized nine) |

### 7.2 Applied set (IU-4 backfill)

| Version | Filename | Remote (CLI) |
|---------|----------|--------------|
| `20261327120000` | `council_action_manager_bridge` | Applied |
| `20261328120000` | `manager_feedback_rollup` | Applied |
| `20261329120000` | `council_review_queue` | Applied |
| `20261330120000` | `council_actions_created_audit_trigger` | Applied |
| `20261422120000` | `sgm_pause_email_deliveries` | Applied |
| `20261704120000` | `governance_matters` | Applied |
| `20261704130000` | `governance_matter_cda` | Applied |
| `20261706120000` | `community_resolutions` | Applied |
| `20261707120000` | `governance_matter_subscriptions` | Applied |

### 7.3 Pending set (IU-5 — must remain unapplied)

| Version | Filename | Remote (CLI) | History query |
|---------|----------|--------------|---------------|
| `20261423120000` | `sgm_pause_delivery_sending_claim` | **Empty (pending)** | Absent ✓ |
| `20261723140000` | (IU-5) | **Empty (pending)** | Absent ✓ |
| `20261724120000` | E-01 IU-1.1 | **Empty (pending)** | Absent ✓ |
| `20261725120000` | E-01 | **Empty (pending)** | Absent ✓ |
| `20261726120000` | E-01 | **Empty (pending)** | Absent ✓ |
| `20261727120000` | E-01 | **Empty (pending)** | Absent ✓ |
| `20261728120000` | E-01 IU-3.2 | **Empty (pending)** | Absent ✓ |

**Next RC-011 pending migration (IU-5):** `20261423120000` — CLI confirms Local | Remote mismatch (pending). Additional repo-local-only migrations outside RC-011 scope also remain pending.

**Authoritative state:** Nine verified historical migrations marked applied + seven APPLY_REQUIRED migrations still pending.

---

## 8. Catalog stability (before / after full backfill)

Compared against post-IU-3 baseline ([`RC-011-IU-3-Repair-Report.md`](RC-011-IU-3-Repair-Report.md) §6).

| Indicator | Pre-IU-4 (post-IU-3) | Post-IU-4 (live) | Match |
|-----------|----------------------|------------------|-------|
| Total policies (9 scope tables) | **16** | **16** | ✓ |
| Duplicate policies (scope tables) | **0** | **0** | ✓ |
| Duplicate triggers (scope tables) | **0** | **0** | ✓ |
| `owner_vote_voter_snapshot` rows | **44** | **44** | ✓ |
| `claim_sgm_pause_email_delivery` | Absent | Absent | ✓ |
| E-01 Phase 2–3 objects | Absent | Absent | ✓ |
| Application schema object counts | Stable | Stable | ✓ |

**Note:** Unrelated legacy duplicate policy names exist on other tables (`Owners can create maintenance requests`, `Users can view invoices`) — pre-existing, outside IU-4 scope; unchanged by history mutation.

---

## 9. Constraints observed

| Constraint | Status |
|------------|--------|
| No DDL | ✓ |
| No catalog repair | ✓ |
| No migration SQL re-apply | ✓ |
| No `db push` | ✓ |
| No IU-5 forward apply | ✓ |
| No E-01 apply | ✓ |
| No application code / RPC / UI changes | ✓ |
| History mutation only (`schema_migrations`) | ✓ |

---

## 10. Deviations and blockers

| Item | Status |
|------|--------|
| **Blockers** | **None** |
| **Deviations** | Batch repair of multiple versions in one command was attempted and blocked by execution control; remediated by per-version repair (authorized method) |
| **Partial completion** | **No** — 9/9 passed |

---

## 11. Verification status

| Gate | Status | Evidence |
|------|--------|----------|
| **Design Review** | ✓ Passed | Scope aligned to Implementation Plan v1.0 §4, §6 |
| **Implementation Review** | ✓ Passed | Per-version commands, exit codes, and history verification documented |
| **Build Verification** | N/A | History-only mutation |
| **Database Verification** | ✓ Passed | Nine rows backfilled; catalog stability confirmed |
| **Runtime Verification** | N/A | Deferred to IU-5 |
| **Regression Verification** | N/A | History-only mutation |

---

## Document control

| Field | Value |
|-------|-------|
| **Unblocks** | RC-011 IU-5 — Forward Apply |
| **Companion** | [`RC-011-IU-4-Completion.md`](RC-011-IU-4-Completion.md) |
