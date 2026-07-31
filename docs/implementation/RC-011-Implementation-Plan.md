# RC-011 — Migration History Reconciliation Implementation Plan

| Field | Value |
|-------|-------|
| **Identifier** | RC-011 |
| **Title** | Migration History Reconciliation — Implementation Plan |
| **Type** | Engineering Implementation Plan |
| **Status** | **Approved** |
| **Strategy** | Controlled Reconciliation |
| **Architecture** | [`RC-011-Migration-History-Reconciliation-Architecture.md`](RC-011-Migration-History-Reconciliation-Architecture.md) |
| **Target environment** | Linked Supabase `wqohkxtqozscmwfrryfl` · `clearstrataaiserena.vercel.app` |
| **Plan revision** | **v1.0** |
| **Production effect** | **None** from this document — reconciliation changes only when IUs are executed and verified |

> **Document class:** Authoritative execution order for RC-011. Does **not** authorize DDL, history mutation, or reconciliation execution by itself. Does **not** modify Blueprint, IA-001, E-01 scope, or governance records.

---

## Authoritative Source

| Field | Value |
|-------|-------|
| **Implementation Plan** | [`RC-011-Implementation-Plan.md`](RC-011-Implementation-Plan.md) |
| **Revision** | **v1.0** |
| **Verified** | **YES** |

All subsequent RC-011 implementation work **shall** cite this plan (revision **v1.0**) as **Authoritative Source** in IU Completion records per CES-010.

---

## 1. Scope

RC-011 restores long-term consistency between:

1. **Repository migration files** (authoritative schema intent)
2. **`supabase_migrations.schema_migrations`** (deploy ledger)
3. **Live database schema** (runtime instance)

**In scope:** Five Implementation Units (IU-1 … IU-5); per-migration inventory, classification, repair, history backfill, forward apply, verification, rollback readiness, completion documentation.

**Blocked until RC-011 complete:** E-01 deployment (`20261724120000` → `20261728120000`); normal sequential `db push` on linked project.

**Not in scope:** E-02+ orchestration; application/RPC/UI changes; baseline squash; blanket history backfill; new Supabase project cutover.

---

## 2. Current state

| Item | State |
|------|-------|
| **Linked project** | `wqohkxtqozscmwfrryfl` (confirmed intended test/business target) |
| **DB migration head** | `20261326120000_nomination_eligibility_live_members` |
| **Repo migration head** | `20261728120000_e01_iu32_resolution_snapshot_immutability.sql` |
| **Pending repo migrations** | 16 (see §3 migration ownership) |
| **OOB schema** | Governance, community resolution, subscription, SGM pause, council audit objects present without history rows |
| **Blocking drift** | Duplicate policies/triggers on re-apply for 6+ migrations |
| **E-01 objects** | Not deployed on linked DB |
| **Production voter snapshot** | Exists (44 rows, 0 orphans); compatible with E-01 idempotent design |

---

## 3. Implementation Unit boundaries

| IU | Title | Mode | Mutates schema | Mutates history | Mutates repo |
|----|-------|------|----------------|-----------------|--------------|
| **IU-1** | Migration Drift Inventory | Read-only | **No** | **No** | Inventory doc only |
| **IU-2** | Drift Classification & Reconciliation Plan | Read-only | **No** | **No** | Classification doc only |
| **IU-3** | Blocking Drift Repair | Implementation | **Yes** (repair only) | **No** | Repair migration(s) / runbook |
| **IU-4** | Migration History Backfill | Implementation | **No** | **Yes** | Backfill log |
| **IU-5** | Forward Apply & Reconciliation Verification | Implementation | **Yes** (forward apply) | **Yes** (via apply) | Apply log; RC-011 closure |

**Hard boundary:** IU-1 and IU-2 **must not** execute DDL or insert history rows. IU-4 **must not** apply greenfield migrations (IU-5 only). IU-3 **must not** backfill history.

---

## 4. Migration ownership per IU

### 4.1 Reconciliation scope (DB head → repo head)

All migrations below are **owned by IU-1** (inventory) and **IU-2** (classification). Final verdict assigned in IU-2.

| Version | Migration name | Preliminary verdict | Owning mutation IU |
|---------|----------------|---------------------|-------------------|
| `20261327120000` | `council_action_manager_bridge` | BACKFILL_OK | IU-4 |
| `20261328120000` | `manager_feedback_rollup` | BACKFILL_OK | IU-4 |
| `20261329120000` | `council_review_queue` | BACKFILL_OK | IU-4 |
| `20261330120000` | `council_actions_created_audit_trigger` | REPAIR_REQUIRED | IU-3 → IU-4 |
| `20261422120000` | `sgm_pause_email_deliveries` | REPAIR_REQUIRED | IU-3 → IU-4 |
| `20261423120000` | `sgm_pause_delivery_sending_claim` | APPLY_REQUIRED (verify IU-1) | IU-5 |
| `20261704120000` | `governance_matters` | REPAIR_REQUIRED | IU-3 → IU-4 |
| `20261704130000` | `governance_matter_cda` | REPAIR_REQUIRED | IU-3 → IU-4 |
| `20261706120000` | `community_resolutions` | REPAIR_REQUIRED | IU-3 → IU-4 |
| `20261707120000` | `governance_matter_subscriptions` | REPAIR_REQUIRED | IU-3 → IU-4 |
| `20261723140000` | `meeting_formal_resolution_authoring` | APPLY_REQUIRED | IU-5 |
| `20261724120000` | `e01_iu11_snapshot_domain_schema` | APPLY_REQUIRED | IU-5 |
| `20261725120000` | `e01_iu21_freeze_event_identity` | APPLY_REQUIRED | IU-5 |
| `20261726120000` | `e01_iu22_voter_snapshot_immutability` | APPLY_REQUIRED | IU-5 |
| `20261727120000` | `e01_iu31_resolution_snapshot_foundation` | APPLY_REQUIRED | IU-5 |
| `20261728120000` | `e01_iu32_resolution_snapshot_immutability` | APPLY_REQUIRED | IU-5 |

*Preliminary verdicts are non-binding until IU-2 sign-off.*

### 4.2 IU-3 repair ownership

IU-3 owns **new repair artifacts** (repo migrations or authorized runbook) that make **REPAIR_REQUIRED** migrations safe to record in history. Repair artifacts **shall** be idempotent and scoped only to blocking objects identified in IU-1/IU-2.

### 4.3 IU-5 E-01 bundle

IU-5 owns forward apply of all **APPLY_REQUIRED** migrations, including the **E-01 chain** (`20261724120000`–`20261728120000`). E-01 remains governed by [`E-01-Implementation-Plan.md`](E-01-Implementation-Plan.md) for schema intent; RC-011 IU-5 owns **deploy execution** only.

---

## 5. Entry criteria

### 5.1 RC-011 program entry

- [ ] [`RC-011-Migration-History-Reconciliation-Architecture.md`](RC-011-Migration-History-Reconciliation-Architecture.md) approved
- [ ] This Implementation Plan approved (v1.0)
- [ ] Linked Supabase project confirmed (`wqohkxtqozscmwfrryfl`)
- [ ] Deployment Verification + Schema Drift Review evidence on record

### 5.2 Per-IU entry

| IU | Entry criteria |
|----|----------------|
| **IU-1** | RC-011 program entry satisfied |
| **IU-2** | IU-1 **Completed**; inventory matrix published |
| **IU-3** | IU-2 **Completed**; classification signed off; **rollback readiness documented** for IU-3 |
| **IU-4** | IU-3 **Completed** (or IU-3 **Completed with Follow-up** if zero REPAIR_REQUIRED); **rollback readiness documented** for IU-4 |
| **IU-5** | IU-4 **Completed**; all BACKFILL_OK + REPAIR_REQUIRED migrations recorded in history; **rollback readiness documented** for IU-5 |

---

## 6. Exit criteria

| IU | Exit criteria (Completed) |
|----|---------------------------|
| **IU-1** | Full inventory matrix for §4.1 migrations; OOB object register; peer review sign-off |
| **IU-2** | Every pending migration has final verdict; ordered IU-3/4/5 plan; zero unresolved **INVESTIGATE** |
| **IU-3** | All **REPAIR_REQUIRED** migrations repaired; re-apply simulation passes; repair evidence archived |
| **IU-4** | Each BACKFILL_OK / repaired migration has history row + paired IU-1 evidence; backfill log complete |
| **IU-5** | All **APPLY_REQUIRED** migrations applied; DB head = repo head; Architecture §6 acceptance criteria satisfied |

---

## 7. Verification requirements

### 7.1 Verification Status gates (CES-010 / Governance v1.2)

Each IU Completion record **shall** include **Verification Status** with only **Passed**, **Pending**, or **N/A** — marked **Passed** only with evidence.

| Gate | IU-1 | IU-2 | IU-3 | IU-4 | IU-5 |
|------|------|------|------|------|------|
| Design Review | ✓ | ✓ | ✓ | ✓ | ✓ |
| Implementation Review | N/A | N/A | Required | Required | Required |
| Build Verification | N/A | N/A | N/A | N/A | N/A |
| Database Verification | Read-only queries | N/A | Repair verify | History verify | Full reconcile |
| Runtime Verification | N/A | N/A | Smoke optional | N/A | Governance + voter snapshot smoke |
| Regression Verification | N/A | N/A | Pre/post repair | N/A | E-01 pre-flight + IU-3.2 immutability |

### 7.2 IU-specific verification

| IU | Required evidence |
|----|-------------------|
| **IU-1** | Per-migration catalog diff; blocking object list; read-only SQL query log |
| **IU-2** | Classification table; plan reviewed against Architecture §5 blocking list |
| **IU-3** | Re-apply / dry-run passes for repaired migrations; no duplicate policy/trigger errors |
| **IU-4** | `schema_migrations` query showing backfilled rows; zero ghost rows; each row linked to IU-1 diff |
| **IU-5** | Apply log; [`E-01-IU-1.1C-Deployment-Readiness.md`](E-01-IU-1.1C-Deployment-Readiness.md) pre-flight pass; [`E-01-IU-3.2`](E-01-IU-3.2-Completion.md) immutability SQL results; Architecture §6 checklist complete |

---

## 8. Rollback requirements

Rollback readiness **must be documented before** IU-3, IU-4, or IU-5 mutates database or history. Rollback **need not be executed** unless verification fails.

| IU | Pre-mutation snapshot | Rollback procedure | Post-rollback smoke |
|----|----------------------|--------------------|---------------------|
| **IU-1** | N/A | N/A | N/A |
| **IU-2** | N/A | N/A | N/A |
| **IU-3** | Catalog export: policies, triggers, functions in repair scope | Per repair artifact: restore pre-repair state | Governance routes load; council actions readable |
| **IU-4** | Full `schema_migrations` export | Remove erroneous history rows only (no schema drop) | `db push` dry-run consistent with live schema |
| **IU-5** | Full catalog export for apply scope | Per CES-009 downgrade plan per applied migration | Voter snapshot readable (44+ rows); zero new orphan FKs; E-01 objects state documented |

**Rollback authority:** Engineering lead + governance sign-off documented in IU readiness record.

**Rollback readiness gate:** IU-3/4/5 **Blocked** until rollback section completed in [`RC-011-IU-{n}-Deployment-Readiness.md`](templates/IU-Completion-Template.md) equivalent or IU Completion §7.1.

---

## 9. Dependencies

```
RC-011 Architecture (approved)
        ↓
RC-011 Implementation Plan v1.0 (this document)
        ↓
IU-1 → IU-2 → IU-3 → IU-4 → IU-5
        ↓
E-01 deployment unblocked (IU-5 exit)
        ↓
E-01 Database Verification may pass
        ↓
E-02+ (unchanged — still blocked on E-01 phase completion)
```

| Dependency | Relationship |
|------------|--------------|
| **E-01 Implementation Plan v1.0** | Schema intent for migrations applied in IU-5; E-01 does not bypass RC-011 |
| **E-01-IU-1.1C Deployment Readiness** | Pre-flight executed in IU-5 verification |
| **RC-009 P1-SUB-A** | OOB debt closed in IU-4 backfill for `20261707120000` |
| **CES-010 / CES-009 / Governance v1.2** | Completion docs, deployment gates, Verification Status |

**Parallelization:** None. IU-1 … IU-5 are strictly sequential.

---

## 10. Expected deliverables

| IU | Deliverables |
|----|--------------|
| **IU-1** | Migration Drift Inventory matrix; OOB object register; blocking object list |
| **IU-2** | Drift Classification table (final verdicts); Ordered Reconciliation Execution Plan |
| **IU-3** | Repair migration file(s) and/or runbook; repair verification log; pre/post catalog snapshots |
| **IU-4** | History backfill log; post-backfill `schema_migrations` query output |
| **IU-5** | Forward apply log; E-01 pre-flight results; IU-3.2 immutability test output; RC-011 Phase Completion record |

**Program deliverables (after IU-5):**

- Linked DB head = repo head `20261728120000`
- E-01 migrations deployed and verified
- Governance G-1–G-6 acknowledged in RC-011 closure

---

## 11. Completion documents

Each IU **shall** produce one IU Completion record per CES-010:

| IU | Completion record path |
|----|------------------------|
| **IU-1** | `docs/implementation/RC-011-IU-1-Completion.md` |
| **IU-2** | `docs/implementation/RC-011-IU-2-Completion.md` |
| **IU-3** | `docs/implementation/RC-011-IU-3-Completion.md` |
| **IU-4** | `docs/implementation/RC-011-IU-4-Completion.md` |
| **IU-5** | `docs/implementation/RC-011-IU-5-Completion.md` |

Each record **shall** include:

- **Authoritative Source:** this plan, revision **v1.0**, Verified **YES**
- **Verification Status** (§7.1)
- **Files Modified** (if any)
- **Deferred Work** (next IU)

Optional per IU-3/4/5: `RC-011-IU-{n}-Deployment-Readiness.md` for rollback procedures.

---

## 12. Phase completion requirements

RC-011 is a **single-phase program** (IU-1 … IU-5). Phase completion **shall** be recorded in:

| Document | When |
|----------|------|
| [`RC-011-Phase-Completion.md`](RC-011-Phase-Completion.md) | After IU-5 **Completed** |
| [`RC-011-Phase-Certification.md`](RC-011-Phase-Certification.md) | After phase completion review (metadata only per Governance v1.1.1) |

### 12.1 Phase completion checklist (Architecture §6)

- [ ] **§6.1** Migration history integrity — all repo migrations ≤ head recorded; no ghost rows
- [ ] **§6.2** Schema equivalence — backfilled migrations paired with IU-1 evidence
- [ ] **§6.3** Deploy path — sequential apply clean; E-01 pre-flight pass; IU-3.2 immutability tests pass
- [ ] **§6.4** Rollback readiness — documented for IU-3/4/5 (executed only if needed)
- [ ] **§6.5** Operational closure — RC-011 completion + governance G-1–G-6 active

### 12.2 Unblocks

Upon phase completion:

| Work | Status |
|------|--------|
| **E-01 Database Verification** | May be marked **Passed** (with IU-5 evidence) |
| **E-01 staging/production deploy certification** | Eligible for engineering review |
| **Normal sequential migration deploy** | Restored on linked project |
| **E-02** | Still blocked on E-01 program completion per E-01 Plan |

---

## 13. Out of scope

| Item | Owner |
|------|-------|
| E-02 freeze orchestration | E-02 |
| Application / RPC / UI changes | — |
| Baseline squash / new DB cutover | — |
| Blanket history backfill | Prohibited |
| Modifying E-01 migration SQL content | E-01 change control (separate authorization) |

---

## 14. Execution order summary

| Step | IU | Action |
|------|-----|--------|
| 1 | IU-1 | Read-only inventory |
| 2 | IU-2 | Classify + plan |
| 3 | IU-3 | Repair blocking drift |
| 4 | IU-4 | Backfill history (evidence-backed) |
| 5 | IU-5 | Forward apply + verify + close RC-011 |

**Stop condition:** Do not start IU-3 until IU-2 classification is signed off and IU-3 rollback readiness is documented.

---

## Document control

| Field | Value |
|-------|-------|
| **Created** | 2026-07-30 |
| **Approved** | 2026-07-30 |
| **Modifies Blueprint / IA-001 / E-01 Plan** | **No** |
| **Production effect** | **None** (planning document only) |
| **Standard** | [`CES-010-Documentation-and-Knowledge-Engineering-Standard.md`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) · [`CES-009-Deployment-and-Release-Engineering-Standard.md`](CES-009-Deployment-and-Release-Engineering-Standard.md) |

**Related:** [`RC-011-Migration-History-Reconciliation-Architecture.md`](RC-011-Migration-History-Reconciliation-Architecture.md) · [`E-01-Implementation-Plan.md`](E-01-Implementation-Plan.md) · [`E-01-IU-1.1C-Deployment-Readiness.md`](E-01-IU-1.1C-Deployment-Readiness.md)

**Ready for implementation:** IU-1 may be authorized when this plan is approved.
