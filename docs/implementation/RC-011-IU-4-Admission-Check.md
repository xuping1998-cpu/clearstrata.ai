# RC-011 IU-4 — Backfill Admission Check

| Field | Value |
|-------|-------|
| **Program** | RC-011 Migration History Reconciliation |
| **Gate** | IU-4 Backfill Admission (read-only) |
| **Authoritative Source** | [`RC-011-Implementation-Plan.md`](RC-011-Implementation-Plan.md) **Revision v1.0** |
| **Primary Inputs** | [`RC-011-IU-1-Inventory.md`](RC-011-IU-1-Inventory.md), [`RC-011-IU-2-Classification-and-Plan.md`](RC-011-IU-2-Classification-and-Plan.md), [`RC-011-IU-3-Repair-Report.md`](RC-011-IU-3-Repair-Report.md), [`RC-011-IU-3-Completion.md`](RC-011-IU-3-Completion.md) |
| **Linked project** | `wqohkxtqozscmwfrryfl` |
| **Admission check date** | 2026-07-30 |
| **Mode** | Read-only — no DDL, no history backfill, no db push |

---

## Admission decision

**AUTHORIZED_FOR_IU4**

All five admission checks **PASS**. No blocking conditions identified.

---

## IU-4 backfill scope (reference)

Nine migrations scheduled for IU-4 history insert (no schema execution):

| # | Version | IU-2 verdict |
|---|---------|--------------|
| 1 | `20261327120000` | BACKFILL_OK |
| 2 | `20261328120000` | BACKFILL_OK |
| 3 | `20261329120000` | BACKFILL_OK |
| 4 | `20261330120000` | BACKFILL_OK |
| 5 | `20261422120000` | REPAIR_REQUIRED (IU-3 repaired) |
| 6 | `20261704120000` | REPAIR_REQUIRED (IU-3 repaired) |
| 7 | `20261704130000` | REPAIR_REQUIRED (IU-3 repaired) |
| 8 | `20261706120000` | REPAIR_REQUIRED (IU-3 repaired) |
| 9 | `20261707120000` | REPAIR_REQUIRED (IU-3 repaired) |

---

## CHECK 1 — Evidence Completeness

| Requirement | Status | Evidence |
|-------------|--------|----------|
| All 5 Evidence Lock documents exist | ✓ | `docs/implementation/rc-011/evidence-locks/RC-011-IU-3-20261422120000-Evidence-Lock.md` through `…20261707120000-Evidence-Lock.md` |
| All 5 Rollback Readiness sections exist | ✓ | Evidence Lock §11 (or §11 pre-repair) in each file; program-level §3 in Repair Report |
| Repair Report contains Evidence Summary | ✓ | [`RC-011-IU-3-Repair-Report.md`](RC-011-IU-3-Repair-Report.md) §10 |
| Evidence gaps explicitly documented | ✓ | Repair Report §10.7 |

**Result: PASS**

---

## CHECK 2 — IU-4 Eligibility

| Migration | Eligibility | Evidence reference |
|-----------|-------------|-------------------|
| `20261422120000` | **ELIGIBLE_FOR_BACKFILL** | Repair Report §8, §10.1 Q4; Evidence Lock §12 |
| `20261704120000` | **ELIGIBLE_FOR_BACKFILL** | Repair Report §8, §10.2 Q4; Evidence Lock §12 |
| `20261704130000` | **ELIGIBLE_FOR_BACKFILL** | Repair Report §8, §10.3 Q4; Evidence Lock §12 |
| `20261706120000` | **ELIGIBLE_FOR_BACKFILL** | Repair Report §8, §10.4 Q4; Evidence Lock §12 |
| `20261707120000` | **ELIGIBLE_FOR_BACKFILL** | Repair Report §8, §10.5 Q4; Evidence Lock §12 |

All five REPAIR_REQUIRED migrations marked **ELIGIBLE_FOR_BACKFILL**. None marked NOT_ELIGIBLE_FOR_BACKFILL.

**Result: PASS**

---

## CHECK 3 — Migration History

| Item | Recorded value |
|------|----------------|
| **Current database head** | `20261326120000` |
| **IU-4 scope rows present** | **0 / 9** |
| **Unexpected rows** | None — query returned empty set for all nine versions |

**Query (read-only):** `SELECT version FROM supabase_migrations.schema_migrations WHERE version IN ('20261327120000', …, '20261707120000')` → **no rows**.

**Result: PASS**

---

## CHECK 4 — Repository Consistency

| Item | Recorded value |
|------|----------------|
| **Git repository HEAD** | `d871764789611085e38247db722505bef03ecbed` (commit `IU-3.2`, 2026-07-29) |
| **Repo migration head (filename)** | `20261728120000_e01_iu32_resolution_snapshot_immutability.sql` |
| **Last committed change to repair files** | `cb1bb27c0868dda2125f2626ec1589c16b7e1999` (2026-06-25) — predates RC-011 IU-3 |
| **Post-IU-3 commits to repair files** | **None** |
| **Working tree status (5 repair files)** | Modified (`M`) — RC-011 IU-3 guarded-policy amendments present, uncommitted |
| **Repair artifact markers in working tree** | All five files contain `RC-011 IU-3` guard comments and `IF NOT EXISTS (pg_policies)` blocks |

**Drift assessment:** Working-tree migration content matches Evidence Lock / Repair Report described repairs. No commits after IU-3 altered repair files. IU-3 repair artifacts are **uncommitted** in git; admission does not require commit but IU-4 operators should preserve working-tree artifacts before backfill.

**Result: PASS**

---

## CHECK 5 — Live Catalog Stability

Compared against post-IU-3 verification ([`RC-011-IU-3-Repair-Report.md`](RC-011-IU-3-Repair-Report.md) §6). Read-only queries on 2026-07-30.

| Indicator | Post-IU-3 (recorded) | Admission check (live) | Match |
|-----------|---------------------|------------------------|-------|
| Total policies (9 tables) | **16** | **16** (1+3+1+2+1+1+3+1+3) | ✓ |
| Duplicate policies | **0** | **0** | ✓ |
| Duplicate triggers (scope tables) | **0** | **0** | ✓ |
| `owner_vote_voter_snapshot` rows | **44** | **44** | ✓ |
| DB migration head | `20261326120000` | `20261326120000` | ✓ |

### Policy counts by table (live)

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

**Result: PASS**

---

## Summary table

| Check | Description | Result |
|-------|-------------|--------|
| **1** | Evidence Completeness | **PASS** |
| **2** | IU-4 Eligibility | **PASS** |
| **3** | Migration History | **PASS** |
| **4** | Repository Consistency | **PASS** |
| **5** | Live Catalog Stability | **PASS** |

---

## Blockers

**None.**

---

## Advisory notes (non-blocking)

| Note | Detail |
|------|--------|
| Uncommitted repair artifacts | Five IU-3 migration file edits remain in working tree; recommend git commit before IU-4 execution for audit trail |
| IU-3 evidence gaps | Per Repair Report §10.7 — guard-skip and per-migration timestamps not directly logged; does not block admission |
| Runtime smoke | Deferred to IU-5 per IU-3 Completion |

---

## Verification Status

| Gate | Status | Evidence |
|------|--------|----------|
| **Design Review** | ✓ **Passed** | Admission scope aligned to Implementation Plan v1.0 §4, §6 |
| **Implementation Review** | ✓ **Passed** | All checks documented with references |
| **Database Verification** | ✓ **Passed** | Read-only `schema_migrations`, policy, and row-count queries |
| **Runtime Verification** | **N/A** | Admission gate only |
| **Regression Verification** | **N/A** | Admission gate only |

---

## Constraints observed

- No SQL mutation performed
- No schema changes performed
- No `schema_migrations` history backfill performed
- No migration apply or `db push` performed
- Read-only verification only

---

## Repository Lock

Pre-execution repository lock recorded before IU-4 history backfill execution.

| Field | Value |
|-------|-------|
| **IU-3 repair commit SHA** | `36e3f7756afec048b006556315b8780099cfca29` |
| **Commit message (actual)** | `UI-3` |
| **Suggested message (reference)** | `RC-011 IU-3: guard policy collisions and lock repair evidence` |
| **Commit timestamp** | 2026-07-30 20:42:07 -0700 |
| **Branch** | `main` (up to date with `origin/main` at lock verification) |
| **Repository migration head** | `20261728120000_e01_iu32_resolution_snapshot_immutability.sql` |

### Files committed (IU-3 repair + evidence chain)

**Migration repair files (5):**

| File | Change scope |
|------|--------------|
| `supabase/migrations/20261422120000_sgm_pause_email_deliveries.sql` | RC-011 IU-3 guarded policy (`sgm_pause_email_deliveries_select_staff`) |
| `supabase/migrations/20261704120000_governance_matters.sql` | RC-011 IU-3 guarded policies (×7) |
| `supabase/migrations/20261704130000_governance_matter_cda.sql` | RC-011 IU-3 guarded policy (`gm_cda_select_tenant`) |
| `supabase/migrations/20261706120000_community_resolutions.sql` | RC-011 IU-3 guarded policies (×4) |
| `supabase/migrations/20261707120000_governance_matter_subscriptions.sql` | RC-011 IU-3 guarded policies (×3) |

**IU-3 evidence documents (7):**

- `docs/implementation/RC-011-IU-3-Repair-Report.md`
- `docs/implementation/RC-011-IU-3-Completion.md`
- `docs/implementation/rc-011/evidence-locks/RC-011-IU-3-20261422120000-Evidence-Lock.md`
- `docs/implementation/rc-011/evidence-locks/RC-011-IU-3-20261704120000-Evidence-Lock.md`
- `docs/implementation/rc-011/evidence-locks/RC-011-IU-3-20261704130000-Evidence-Lock.md`
- `docs/implementation/rc-011/evidence-locks/RC-011-IU-3-20261706120000-Evidence-Lock.md`
- `docs/implementation/rc-011/evidence-locks/RC-011-IU-3-20261707120000-Evidence-Lock.md`

**IU-4 admission document:**

- `docs/implementation/RC-011-IU-4-Admission-Check.md`

**Also in same commit (RC-011 program context, pre-existing admission scope):**

- `docs/implementation/RC-011-IU-1-Inventory.md`, `RC-011-IU-1-Completion.md`
- `docs/implementation/RC-011-IU-2-Classification-and-Plan.md`, `RC-011-IU-2-Completion.md`
- `docs/implementation/RC-011-Implementation-Plan.md`
- `docs/implementation/RC-011-Migration-History-Reconciliation-Architecture.md`

### Diff scope confirmation

Migration diffs in `36e3f77` replace bare `CREATE POLICY` with `DO $$ IF NOT EXISTS (pg_policies) … CREATE POLICY … END $$` blocks only. No new tables, columns, indexes, triggers, functions, grants, or application code in migration diffs. Stat: 5 files, +273 / −163 lines (guard wrapping).

### Post-commit working tree status (at lock verification)

| Check | Status |
|-------|--------|
| Working tree | **Clean** — no uncommitted RC-011 IU-3/IU-4 artifacts |
| RC-011 repair migrations | Committed in `36e3f77` |
| Admission decision | **Unchanged** — **AUTHORIZED_FOR_IU4** |

---

## Document control

| Field | Value |
|-------|-------|
| **Unblocks** | RC-011 IU-4 — Migration History Backfill (execution) |
| **Next action** | IU-4 per [`RC-011-IU-2-Classification-and-Plan.md`](RC-011-IU-2-Classification-and-Plan.md) §5 Phase C |
