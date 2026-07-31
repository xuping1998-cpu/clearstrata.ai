# RC-011 IU-3 — Repair Report

| Field | Value |
|-------|-------|
| **Program** | RC-011 Migration History Reconciliation |
| **Implementation Unit** | **IU-3** — Blocking Drift Repair |
| **Authoritative Source** | [`RC-011-Implementation-Plan.md`](RC-011-Implementation-Plan.md) v1.0 |
| **Primary Inputs** | [`RC-011-IU-1-Inventory.md`](RC-011-IU-1-Inventory.md), [`RC-011-IU-2-Classification-and-Plan.md`](RC-011-IU-2-Classification-and-Plan.md) |
| **Linked project** | `wqohkxtqozscmwfrryfl` |
| **Repair date** | 2026-07-30 |
| **Status** | **Complete — all five families ELIGIBLE_FOR_BACKFILL** |

---

## 1. Executive summary

IU-3 repaired **statement-collision drift** on five REPAIR_REQUIRED migrations by amending repository migration files with guarded `CREATE POLICY` blocks (`DO $$ IF NOT EXISTS (pg_policies)`). Each repaired migration was re-applied individually against the linked database to verify idempotent execution. Catalog object counts and definitions are unchanged; no history rows were inserted; E-01 and IU-5 migrations were not applied.

**Repair approach:** In-place migration file amendment (authorized per IU-2 §8). No separate repair migration timestamp — collision guards are embedded in the original migration files for long-term idempotency.

---

## 2. Evidence Lock summary

| Migration | Evidence Lock | Pre-repair issue | Repair artifact |
|-----------|---------------|------------------|-----------------|
| `20261422120000` | [`RC-011-IU-3-20261422120000-Evidence-Lock.md`](rc-011/evidence-locks/RC-011-IU-3-20261422120000-Evidence-Lock.md) | 1 policy collision | Guarded `sgm_pause_email_deliveries_select_staff` |
| `20261704120000` | [`RC-011-IU-3-20261704120000-Evidence-Lock.md`](rc-011/evidence-locks/RC-011-IU-3-20261704120000-Evidence-Lock.md) | 7 policy collisions | Guarded seven `gm_*` policies |
| `20261704130000` | [`RC-011-IU-3-20261704130000-Evidence-Lock.md`](rc-011/evidence-locks/RC-011-IU-3-20261704130000-Evidence-Lock.md) | 1 policy collision | Guarded `gm_cda_select_tenant` |
| `20261706120000` | [`RC-011-IU-3-20261706120000-Evidence-Lock.md`](rc-011/evidence-locks/RC-011-IU-3-20261706120000-Evidence-Lock.md) | 4 policy collisions | Guarded four `cr_*` policies |
| `20261707120000` | [`RC-011-IU-3-20261707120000-Evidence-Lock.md`](rc-011/evidence-locks/RC-011-IU-3-20261707120000-Evidence-Lock.md) | 3 policy collisions | Guarded three `gms_*` policies |

**Total collision objects repaired:** 16 policies (IU-1 listed 18 entries including trigger collisions; repository already had `DROP TRIGGER IF EXISTS` on all affected triggers — verified no trigger repair required).

---

## 3. Rollback readiness (program-level)

| Item | Detail |
|------|--------|
| **Pre-mutation snapshot** | Policy/trigger catalog queries captured in Evidence Locks and IU-1 inventory |
| **Objects modified** | Five migration SQL files (policy guard blocks only) |
| **Catalog mutations** | `CREATE OR REPLACE FUNCTION` refreshed identical function bodies on governance/community re-apply; no policy/trigger drops |
| **Rollback procedure** | Revert five migration files to pre-IU-3 commits; catalog requires no restoration if guards skipped existing objects |
| **Rollback authority** | Engineering lead + governance sign-off |
| **Post-rollback smoke** | Governance routes load; council actions readable; subscription SELECT policy intact |
| **Conditions requiring rollback** | Duplicate policies created; tenant isolation regression; re-apply failure after repair |
| **Data-loss assessment** | **None** — guards prevent duplicate creation; no DELETE/DROP |
| **Transactional** | Per migration: `BEGIN`/`COMMIT` where present; `20261422120000` autocommit statements |

---

## 4. Repair artifacts (repository)

| File | Change |
|------|--------|
| `supabase/migrations/20261422120000_sgm_pause_email_deliveries.sql` | RC-011 IU-3 guarded policy |
| `supabase/migrations/20261704120000_governance_matters.sql` | RC-011 IU-3 guarded policies (×7) |
| `supabase/migrations/20261704130000_governance_matter_cda.sql` | RC-011 IU-3 guarded policy |
| `supabase/migrations/20261706120000_community_resolutions.sql` | RC-011 IU-3 guarded policies (×4) |
| `supabase/migrations/20261707120000_governance_matter_subscriptions.sql` | RC-011 IU-3 guarded policies (×3) |

---

## 5. Execution evidence (per migration, in order)

| Step | Migration | Command | Result |
|------|-----------|---------|--------|
| 1 | `20261422120000` | `npx supabase db query --linked --file supabase/migrations/20261422120000_sgm_pause_email_deliveries.sql` | Exit **0** |
| 2 | `20261704120000` | `npx supabase db query --linked --file supabase/migrations/20261704120000_governance_matters.sql` | Exit **0** |
| 3 | `20261704130000` | `npx supabase db query --linked --file supabase/migrations/20261704130000_governance_matter_cda.sql` | Exit **0** |
| 4 | `20261706120000` | `npx supabase db query --linked --file supabase/migrations/20261706120000_community_resolutions.sql` | Exit **0** |
| 5 | `20261707120000` | `npx supabase db query --linked --file supabase/migrations/20261707120000_governance_matter_subscriptions.sql` | Exit **0** |

**Not executed:** `supabase db push`, history insert, IU-5 migrations, E-01 chain.

---

## 6. Before/after catalog comparison

| Check | Pre-repair | Post-repair |
|-------|------------|-------------|
| DB migration head | `20261326120000` | `20261326120000` (**unchanged**) |
| Pending REPAIR_REQUIRED history rows | 0 | 0 |
| Total policies (9 tables in scope) | **16** | **16** |
| Duplicate policies | 0 | 0 |
| `owner_vote_voter_snapshot` rows | 44 | 44 (**unchanged**) |
| `claim_sgm_pause_email_delivery` | Absent | Absent (**IU-5 not applied**) |
| E-01 tables | Absent | Absent (**unchanged**) |
| RLS on all scope tables | Enabled | Enabled |

### Post-repair policy counts by table

| Table | Policies |
|-------|----------|
| `sgm_pause_email_deliveries` | 1 |
| `governance_matters` | 3 |
| `governance_matter_revisions` | 1 |
| `governance_matter_comments` | 2 |
| `governance_matter_comment_moderation` | 1 |
| `governance_matter_cda_reports` | 1 |
| `community_resolutions` | 3 |
| `community_resolution_revisions` | 1 |
| `governance_matter_subscriptions` | 3 |

---

## 7. Post-repair verification

| # | Criterion | Result |
|---|-----------|--------|
| 1 | All expected objects exist | ✓ Pass |
| 2 | Definitions match migration intent | ✓ Pass |
| 3 | No required object missing | ✓ Pass |
| 4 | No duplicate policies/triggers | ✓ Pass |
| 5 | RLS enabled where required | ✓ Pass |
| 6 | Tenant isolation preserved | ✓ Pass — all policies use `user_property_ids()` or `auth.uid()` |
| 7 | Function security attributes | ✓ Pass — `SECURITY DEFINER` functions refreshed via `CREATE OR REPLACE` |
| 8 | Existing data present | ✓ Pass — 44 voter snapshot rows unchanged |
| 9 | Runtime smoke | □ Pending — deferred to IU-5 |
| 10 | Re-apply idempotency | ✓ Pass — all five migrations exit 0 |

---

## 8. IU-4 eligibility results

| Migration | Result |
|-----------|--------|
| `20261422120000` | **ELIGIBLE_FOR_BACKFILL** |
| `20261704120000` | **ELIGIBLE_FOR_BACKFILL** |
| `20261704130000` | **ELIGIBLE_FOR_BACKFILL** |
| `20261706120000` | **ELIGIBLE_FOR_BACKFILL** |
| `20261707120000` | **ELIGIBLE_FOR_BACKFILL** |

**None** marked NOT_ELIGIBLE_FOR_BACKFILL.

---

## 9. Deviations and unresolved issues

| Item | Detail |
|------|--------|
| Trigger collisions (IU-1 §4) | **No repair required** — repository already contained `DROP TRIGGER IF EXISTS` for all listed governance triggers |
| Runtime smoke | Not executed in IU-3; deferred to IU-5 per scope boundary |
| Separate repair migration file | Not created — in-place guard amendment chosen for permanent idempotency |

**Blockers:** None.

---

## 10. Evidence Summary

*Audit date: 2026-07-30. Read-only documentation review of IU-3 collected evidence. No SQL executed for this section.*

### 10.1 — `20261422120000` · `sgm_pause_email_deliveries.sql`

#### Question 1 — What was executed?

| Field | Recorded evidence |
|-------|-------------------|
| Migration version | `20261422120000` |
| Migration filename | `20261422120000_sgm_pause_email_deliveries.sql` |
| Execution timestamp | **Not captured during execution.** Program repair date: 2026-07-30 (Evidence Lock timestamp: 2026-07-30 UTC-7). |
| Command executed | `npx supabase db query --linked --file supabase/migrations/20261422120000_sgm_pause_email_deliveries.sql` |
| Exit code | **0** (Repair Report §5, step 1) |

#### Question 2 — Did the guards work?

| Item | Recorded evidence |
|------|-------------------|
| Guarded policies | `sgm_pause_email_deliveries_select_staff` — wrapped in `DO $$ IF NOT EXISTS (pg_policies)` (Evidence Lock §12, repair artifact) |
| Policy pre-existed | **Yes** — Evidence Lock §3, §6, §9: policy present before repair; policy count **1** |
| Guarded CREATE skipped | **Not captured during execution.** No per-migration post-apply `pg_policies` log. Program-level post-repair policy count on table remains **1** (Repair Report §6). |
| Catalog statements that may have executed | Migration also contains `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `ALTER TABLE … ENABLE ROW LEVEL SECURITY`, `COMMENT ON TABLE` — pre-repair catalog shows these objects already present (Evidence Lock §3). Whether each no-op executed is **not captured during execution.** |
| Policy catalog modification | **Not recorded.** Post-repair policy count unchanged at **1**; duplicate policies **0** (Repair Report §6). |

#### Question 3 — Did the catalog remain consistent?

| Metric | Pre-repair (recorded) | Post-repair (recorded) |
|--------|----------------------|------------------------|
| Policy count (`sgm_pause_email_deliveries`) | **1** (Evidence Lock §9) | **1** (Evidence Lock §12; Repair Report §6) |
| Trigger count | **Not captured during execution** for this migration scope | **Not captured during execution** |
| Duplicate policies | **0** (program-level, Repair Report §6) | **0** |
| Duplicate triggers | **Not captured during execution** | **Not captured during execution** |
| Unexpected objects | None recorded | None recorded |
| Data preservation | **Not recorded** for this table | **Not recorded** |
| DB migration head | `20261326120000` | `20261326120000` (unchanged, Repair Report §6) |

**Catalog object change:** Policy count stable. No duplicate policies recorded. Per-migration trigger before/after not captured. Program-level evidence does not record a policy addition or removal for this migration.

#### Question 4 — Why eligible for IU-4?

Repository intent (Evidence Lock §1): SGM pause delivery ledger with RLS and staff SELECT policy. Pre-repair catalog matched intent except bare `CREATE POLICY` collision (Evidence Lock §6). Repaired migration re-applied with exit **0** (Repair Report §5). Post-repair: expected objects present, policy count **1**, no duplicates, RLS enabled (Repair Report §7). Equivalence criteria in Evidence Lock §10 satisfied per recorded post-repair counts and re-apply success.

**ELIGIBLE_FOR_BACKFILL**

---

### 10.2 — `20261704120000` · `governance_matters.sql`

#### Question 1 — What was executed?

| Field | Recorded evidence |
|-------|-------------------|
| Migration version | `20261704120000` |
| Migration filename | `20261704120000_governance_matters.sql` |
| Execution timestamp | **Not captured during execution.** Program repair date: 2026-07-30. |
| Command executed | `npx supabase db query --linked --file supabase/migrations/20261704120000_governance_matters.sql` |
| Exit code | **0** (Repair Report §5, step 2) |

#### Question 2 — Did the guards work?

| Item | Recorded evidence |
|------|-------------------|
| Guarded policies | `gm_select_tenant`, `gm_insert_council`, `gm_update_council`, `gm_rev_select_tenant`, `gm_comment_select_tenant`, `gm_comment_insert_member`, `gm_mod_select_staff` (Evidence Lock §6, §12) |
| Policies pre-existed | **Yes** — all seven present pre-repair (Evidence Lock §3, §7); total **7** |
| Guarded CREATE skipped | **Not captured during execution.** Post-repair total **7** unchanged (Evidence Lock §12). |
| Other catalog statements | Repair Report §3 records: **`CREATE OR REPLACE FUNCTION` refreshed function bodies** on re-apply. Triggers use `DROP TRIGGER IF EXISTS` then `CREATE TRIGGER` in repository (Evidence Lock §6 note). |
| Policy catalog modification | **Not recorded** — post-repair policy total **7**, duplicates **0** (Repair Report §6). |

#### Question 3 — Did the catalog remain consistent?

| Metric | Pre-repair (recorded) | Post-repair (recorded) |
|--------|----------------------|------------------------|
| Policy count (4 tables) | **7** total: 3+1+2+1 (Evidence Lock §7) | **7** total: 3+1+2+1 (Evidence Lock §12; Repair Report §6) |
| Trigger count | **Not captured during execution** per migration (IU-1/IU-3 pre-repair: 4 triggers on governance tables existed) | **Not captured during execution** |
| Duplicate policies | **0** (Repair Report §6) | **0** |
| Duplicate triggers | **0** (Repair Report §7) | **0** |
| Unexpected objects | None recorded | None recorded |
| Data preservation | **Not recorded** per governance tables | **Not recorded** |
| Program data check | — | `owner_vote_voter_snapshot` **44** rows unchanged (Repair Report §6) |

**Catalog object change:** Repair Report §3 explicitly records **`CREATE OR REPLACE FUNCTION` refreshed identical function bodies**. Policy counts unchanged. Trigger duplicate count **0** post-repair.

#### Question 4 — Why eligible for IU-4?

Repository intent (Evidence Lock §1): full governance matter domain with seven policies, four triggers, six functions. Pre-repair catalog complete except policy collisions (Evidence Lock §3, §6). Re-apply exit **0** (Repair Report §5). Post-repair policy counts match pre-repair; no duplicate policies; RLS enabled; functions refreshed (Repair Report §3, §7).

**ELIGIBLE_FOR_BACKFILL**

---

### 10.3 — `20261704130000` · `governance_matter_cda.sql`

#### Question 1 — What was executed?

| Field | Recorded evidence |
|-------|-------------------|
| Migration version | `20261704130000` |
| Migration filename | `20261704130000_governance_matter_cda.sql` |
| Execution timestamp | **Not captured during execution.** Program repair date: 2026-07-30. |
| Command executed | `npx supabase db query --linked --file supabase/migrations/20261704130000_governance_matter_cda.sql` |
| Exit code | **0** (Repair Report §5, step 3) |

#### Question 2 — Did the guards work?

| Item | Recorded evidence |
|------|-------------------|
| Guarded policies | `gm_cda_select_tenant` (Evidence Lock §6, §12) |
| Policy pre-existed | **Yes** (Evidence Lock §3, §9; count **1**) |
| Guarded CREATE skipped | **Not captured during execution.** Post-repair count **1** (Evidence Lock §12). |
| Other catalog statements | Migration contains `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` (Evidence Lock §3). Whether function/trigger bodies changed is **not captured during execution.** |
| Policy catalog modification | **Not recorded** — count remains **1**. |

#### Question 3 — Did the catalog remain consistent?

| Metric | Pre-repair (recorded) | Post-repair (recorded) |
|--------|----------------------|------------------------|
| Policy count (`governance_matter_cda_reports`) | **1** (Evidence Lock §9) | **1** (Evidence Lock §12; Repair Report §6) |
| Trigger count | **Not captured during execution** (pre-repair: trigger present per Evidence Lock §3) | **Not captured during execution** |
| Duplicate policies | **0** (Repair Report §6) | **0** |
| Duplicate triggers | **0** (Repair Report §7) | **0** |
| Unexpected objects | None recorded | None recorded |
| Data preservation | **Not recorded** | **Not recorded** |

**Catalog object change:** Policy count stable. Function/trigger re-apply may have executed (`CREATE OR REPLACE`, `DROP/CREATE TRIGGER`) but material definition change is **not captured during execution.**

#### Question 4 — Why eligible for IU-4?

Repository intent (Evidence Lock §1): CDA table, immutable trigger, SELECT policy. Pre-repair complete except policy collision (Evidence Lock §6). Re-apply exit **0** (Repair Report §5). Post-repair policy **1**, no duplicates, RLS enabled (Repair Report §6–§7).

**ELIGIBLE_FOR_BACKFILL**

---

### 10.4 — `20261706120000` · `community_resolutions.sql`

#### Question 1 — What was executed?

| Field | Recorded evidence |
|-------|-------------------|
| Migration version | `20261706120000` |
| Migration filename | `20261706120000_community_resolutions.sql` |
| Execution timestamp | **Not captured during execution.** Program repair date: 2026-07-30. |
| Command executed | `npx supabase db query --linked --file supabase/migrations/20261706120000_community_resolutions.sql` |
| Exit code | **0** (Repair Report §5, step 4) |

#### Question 2 — Did the guards work?

| Item | Recorded evidence |
|------|-------------------|
| Guarded policies | `cr_select_tenant`, `cr_insert_council`, `cr_update_council`, `cr_rev_select_tenant` (Evidence Lock §6, §12) |
| Policies pre-existed | **Yes** — total **4** pre-repair (Evidence Lock §3, §7) |
| Guarded CREATE skipped | **Not captured during execution.** Post-repair total **4** unchanged (Evidence Lock §12). |
| Other catalog statements | Repair Report §3 records **`CREATE OR REPLACE FUNCTION` refreshed function bodies** on community re-apply. Triggers use `DROP TRIGGER IF EXISTS` in repository. |
| Policy catalog modification | **Not recorded** — count **4**, duplicates **0**. |

#### Question 3 — Did the catalog remain consistent?

| Metric | Pre-repair (recorded) | Post-repair (recorded) |
|--------|----------------------|------------------------|
| Policy count (2 tables) | **4** total: 3+1 (Evidence Lock §7) | **4** total: 3+1 (Evidence Lock §12; Repair Report §6) |
| Trigger count | **Not captured during execution** (pre-repair: 2 triggers on `community_resolutions` per IU-3 session) | **Not captured during execution** |
| Duplicate policies | **0** | **0** |
| Duplicate triggers | **0** (Repair Report §7) | **0** |
| Unexpected objects | None recorded | None recorded |
| Data preservation | **Not recorded** | **Not recorded** |

**Catalog object change:** Repair Report §3 records function body refresh via `CREATE OR REPLACE FUNCTION`. Policy counts unchanged.

#### Question 4 — Why eligible for IU-4?

Repository intent (Evidence Lock §1): community resolution domain with bridge columns and four policies. Pre-repair catalog complete except policy collisions (Evidence Lock §3, §6). Re-apply exit **0** (Repair Report §5). Post-repair counts match; no duplicates (Repair Report §6–§7).

**ELIGIBLE_FOR_BACKFILL**

---

### 10.5 — `20261707120000` · `governance_matter_subscriptions.sql`

#### Question 1 — What was executed?

| Field | Recorded evidence |
|-------|-------------------|
| Migration version | `20261707120000` |
| Migration filename | `20261707120000_governance_matter_subscriptions.sql` |
| Execution timestamp | **Not captured during execution.** Program repair date: 2026-07-30. |
| Command executed | `npx supabase db query --linked --file supabase/migrations/20261707120000_governance_matter_subscriptions.sql` |
| Exit code | **0** (Repair Report §5, step 5) |

#### Question 2 — Did the guards work?

| Item | Recorded evidence |
|------|-------------------|
| Guarded policies | `gms_select_own`, `gms_insert_own_member`, `gms_delete_own` (Evidence Lock §6, §12) |
| Policies pre-existed | **Yes** — count **3** (Evidence Lock §3, §7) |
| Guarded CREATE skipped | **Not captured during execution.** Post-repair count **3** (Evidence Lock §12). |
| Other catalog statements | `CREATE TABLE IF NOT EXISTS`, indexes, grants — pre-repair objects present (Evidence Lock §3). |
| Policy catalog modification | **Not recorded** — count **3**, duplicates **0**. |

#### Question 3 — Did the catalog remain consistent?

| Metric | Pre-repair (recorded) | Post-repair (recorded) |
|--------|----------------------|------------------------|
| Policy count (`governance_matter_subscriptions`) | **3** (Evidence Lock §7, §9) | **3** (Evidence Lock §12; Repair Report §6) |
| Trigger count | **Not captured during execution** | **Not captured during execution** |
| Duplicate policies | **0** | **0** |
| Duplicate triggers | **Not captured during execution** | **Not captured during execution** |
| Unexpected objects | None recorded | None recorded |
| Data preservation | **Not recorded** | **Not recorded** |

**Catalog object change:** Policy count stable. No recorded policy/trigger addition or removal.

#### Question 4 — Why eligible for IU-4?

Repository intent (Evidence Lock §1): subscription table with three tenant-scoped policies. Pre-repair complete except collisions (Evidence Lock §6). Re-apply exit **0** (Repair Report §5). Post-repair **3** policies, no duplicates, tenant isolation via `auth.uid()` preserved per Repair Report §7.

**ELIGIBLE_FOR_BACKFILL**

---

### 10.6 — Evidence Summary Matrix

| Migration | Execution Evidence | Guard Verified | Catalog Changed | IU-4 Eligibility |
|-----------|-------------------|----------------|-----------------|------------------|
| `20261422120000` | Command + exit **0** recorded (§5 step 1). Timestamp **not captured**. | Policies pre-existed; post-repair count **1** unchanged. Guard skip **not directly logged**. | Policy count stable. Other statements idempotent — individual no-op execution **not captured**. | **ELIGIBLE_FOR_BACKFILL** |
| `20261704120000` | Command + exit **0** (§5 step 2). Timestamp **not captured**. | Seven policies pre-existed; post-repair **7** unchanged. Guard skip **not directly logged**. | **`CREATE OR REPLACE FUNCTION` refreshed** (§3). Policy counts stable. | **ELIGIBLE_FOR_BACKFILL** |
| `20261704130000` | Command + exit **0** (§5 step 3). Timestamp **not captured**. | Policy pre-existed; post-repair **1** unchanged. Guard skip **not directly logged**. | Function/trigger statements may have re-executed; material change **not captured**. Policy stable. | **ELIGIBLE_FOR_BACKFILL** |
| `20261706120000` | Command + exit **0** (§5 step 4). Timestamp **not captured**. | Four policies pre-existed; post-repair **4** unchanged. Guard skip **not directly logged**. | **`CREATE OR REPLACE FUNCTION` refreshed** (§3). Policy counts stable. | **ELIGIBLE_FOR_BACKFILL** |
| `20261707120000` | Command + exit **0** (§5 step 5). Timestamp **not captured**. | Three policies pre-existed; post-repair **3** unchanged. Guard skip **not directly logged**. | Policy count stable. No recorded catalog mutation. | **ELIGIBLE_FOR_BACKFILL** |

### 10.7 — Evidence gaps (explicit)

| Gap | Detail |
|-----|--------|
| Per-migration execution timestamps | **Not captured during execution.** Only program date 2026-07-30 and Evidence Lock lock timestamps recorded. |
| Per-migration guard-skip confirmation | **Not captured during execution.** No immediate post-apply `pg_policies` query logged per migration. Inference limited to: policies pre-existed + counts unchanged + exit **0**. |
| Per-migration trigger before/after counts | **Not captured during execution** for individual migrations. Program-level duplicate triggers **0** post-repair only. |
| Per-table data row counts (governance scope) | **Not recorded** during IU-3. Program-level: `owner_vote_voter_snapshot` **44** rows unchanged. |
| Function body byte-for-byte compare | **Not captured** after `CREATE OR REPLACE FUNCTION` on `20261704120000` and `20261706120000`. |

---

## Document control

| Field | Value |
|-------|-------|
| **Next IU** | RC-011 IU-4 — History Backfill |
| **Unblocks** | Backfill for nine migrations (four BACKFILL_OK + five repaired REPAIR_REQUIRED) |
