# RC-011 — Migration History Reconciliation Architecture

| Field | Value |
|-------|-------|
| **Identifier** | RC-011 |
| **Title** | Migration History Reconciliation |
| **Type** | Engineering Architecture / Reconciliation Design |
| **Status** | **Approved — Ready for Implementation Planning** |
| **Approved strategy** | **Controlled Reconciliation** (Strategy C + selective repair) |
| **Target environment** | Linked Supabase `wqohkxtqozscmwfrryfl` · `clearstrataaiserena.vercel.app` |
| **Blocked downstream work** | E-01 migrations `20261724120000` → `20261728120000` (and normal sequential deploy) |
| **Mode** | Design finalization — **no implementation authorized by this document alone** |
| **Production effect** | **None** until RC-011 implementation IUs are authorized and executed |

---

## Authoritative Source

| Field | Value |
|-------|-------|
| **Design review** | RC-011 Design Review (2026-07-30) |
| **Repository** | Authoritative source of schema intent |
| **Database** | Runtime instance to reconcile **to** repository |
| **Verified** | **YES** — aligned to Deployment Verification + Schema Drift Review evidence |

---

## 1. Executive summary

Deployment verification and schema drift review confirmed that the linked Supabase project is the **correct deployment target**, but **repository migrations**, **`supabase_migrations.schema_migrations`**, and **live schema** are misaligned due to historical **Out-of-Band (OOB)** applies.

**Approved architecture:** **Controlled Reconciliation** — per-migration verification, selective history backfill where schema is proven equivalent, idempotent repair for blocking drift, then normal forward apply for greenfield migrations (including E-01).

**Rejected for primary path:** blanket history backfill, baseline squash, unchecked `db push`.

RC-011 is organized as **five Implementation Units (IU-1 … IU-5)**. E-01 deployment remains **blocked** until RC-011 acceptance criteria (including **Rollback Readiness**) are satisfied.

---

## 2. Problem statement

| Symptom | Evidence |
|---------|----------|
| Migration history lag | DB head `20261326120000`; repo head `20261728120000` |
| OOB schema without history | Governance, community resolution, subscription, SGM, council audit objects exist; history rows absent |
| Blocking sequential deploy | Duplicate `CREATE POLICY` / `CREATE TRIGGER` on re-apply |
| E-01 not reachable | Six intermediate migrations block path; E-01 objects absent |
| Approved OOB precedent | RC-009 P1-SUB-A — `20261707120000` applied OOB; history waived temporarily |

**Invariant to restore:** For every committed migration in the repository, either (a) equivalent schema exists and a history row is recorded, or (b) an approved RC documents intentional supersession.

---

## 3. Approved strategy — Controlled Reconciliation

### 3.1 Principles

1. **Repository remains authoritative** — reconcile database and history **to** repo intent (CES-002, IA-001).
2. **Per-migration verification** — no bulk history insert without evidence.
3. **Repair before backfill** for blocking drift — duplicate policies/triggers must not fail re-apply.
4. **Preserve production data** — no destructive reset of linked business DB as primary path.
5. **Evidence-driven closure** — each IU produces verification artifacts per CES-010.

### 3.2 Reconciliation verdicts (per migration)

| Verdict | Meaning | Action |
|---------|---------|--------|
| **BACKFILL_OK** | Live schema verified equivalent to migration intent | Record history row only |
| **REPAIR_REQUIRED** | Schema present but re-apply would fail, or partial drift | Idempotent repair (authorized IU-3), then backfill |
| **APPLY_REQUIRED** | Schema absent | Normal forward migration apply |
| **INVESTIGATE** | Unclear equivalence | Resolve in IU-2 before any mutation |

### 3.3 Preliminary migration classification (design estimate)

| Verdict | Migrations |
|---------|------------|
| **BACKFILL_OK** (pending IU-1 verify) | `20261327120000`, `20261328120000`, `20261329120000` |
| **REPAIR_REQUIRED** | `20261330120000`, `20261422120000`, `20261704120000`, `20261704130000`, `20261706120000`, `20261707120000` |
| **APPLY_REQUIRED** | `20261423120000` (verify in IU-1), `20261723140000`, E-01 `20261724120000`–`20261728120000` |

*Final classification is owned by IU-2; table above is non-binding until inventory completes.*

---

## 4. Implementation Units

RC-011 phases are formalized as **IU-1 … IU-5**. Each IU requires a completion record per CES-010 when implementation is authorized.

### IU-1 — Migration Drift Inventory

| Field | Value |
|-------|-------|
| **Objective** | Produce authoritative per-migration diff: repo SQL intent vs linked DB catalog |
| **Scope** | All repo migrations from DB head `20261326120000` through repo head `20261728120000` |
| **Deliverables** | Inventory matrix (tables, columns, indexes, FKs, policies, triggers, functions, grants); OOB object register |
| **Out of scope** | Any DDL, history mutation, repair |
| **Verification** | Read-only SQL + repo migration review; inventory peer-reviewed |
| **Rollback** | N/A (read-only) |

---

### IU-2 — Drift Classification & Reconciliation Plan

| Field | Value |
|-------|-------|
| **Objective** | Assign each pending migration a verdict (`BACKFILL_OK` \| `REPAIR_REQUIRED` \| `APPLY_REQUIRED` \| `INVESTIGATE`); publish ordered execution plan |
| **Depends on** | IU-1 complete |
| **Deliverables** | Classification table; ordered IU-3/IU-4/IU-5 execution sequence; risk notes per migration |
| **Out of scope** | Schema mutation |
| **Verification** | Plan reviewed against Design Review blocking-object list |
| **Rollback** | N/A (read-only) |

---

### IU-3 — Blocking Drift Repair

| Field | Value |
|-------|-------|
| **Objective** | Eliminate blocking drift so reconciled migrations can be recorded without duplicate-object failures |
| **Depends on** | IU-2 complete |
| **Scope** | Migrations classified **REPAIR_REQUIRED** only |
| **Deliverables** | Idempotent repair migrations and/or controlled runbook steps (implementation planning detail); repair verification evidence |
| **Out of scope** | History backfill (IU-4); E-01 apply (IU-5); unrelated schema changes |
| **Verification** | Re-apply simulation or equivalent confirms no duplicate policy/trigger errors for repaired migrations |
| **Rollback readiness** | Pre-repair catalog snapshot; documented reverse steps per repair artifact (see §6.4) |

---

### IU-4 — Migration History Backfill

| Field | Value |
|-------|-------|
| **Objective** | Insert `schema_migrations` rows for migrations verified **BACKFILL_OK** or **REPAIR_REQUIRED** post-IU-3 |
| **Depends on** | IU-3 complete (where repair required) |
| **Scope** | History rows only for migrations with signed equivalence evidence — **never bulk insert** |
| **Deliverables** | Backfill log (version, name, verifier, timestamp); post-backfill history query |
| **Out of scope** | Migrations classified **APPLY_REQUIRED** (deferred to IU-5) |
| **Verification** | Each backfilled row paired with IU-1 diff evidence; zero ghost rows |
| **Rollback readiness** | Pre-backfill history export; procedure to remove erroneous history rows without schema change (see §6.4) |

---

### IU-5 — Forward Apply & Reconciliation Verification

| Field | Value |
|-------|-------|
| **Objective** | Apply remaining migrations (`APPLY_REQUIRED`), including `20261723140000` and E-01 `20261724120000`–`20261728120000`; declare RC-011 reconciled |
| **Depends on** | IU-4 complete |
| **Deliverables** | Apply log; E-01 pre-flight results; IU-3.2 database immutability test evidence; RC-011 completion record |
| **Out of scope** | E-02 orchestration; application/RPC changes |
| **Verification** | Full acceptance criteria §6 satisfied |
| **Rollback readiness** | Pre-apply schema snapshot; migration downgrade plan documented per CES-009 (see §6.4) |

---

### IU dependency graph

```
IU-1  Inventory
  ↓
IU-2  Classification & Plan
  ↓
IU-3  Blocking Drift Repair
  ↓
IU-4  History Backfill
  ↓
IU-5  Forward Apply & Verification
  ↓
E-01 deployment unblocked
```

---

## 5. Drift classification reference

| Category | Description | RC-011 handling |
|----------|-------------|-----------------|
| History missing, schema exists | OOB apply | Verify → backfill or repair+backfill |
| History missing, schema missing | Not deployed | Forward apply (IU-5) |
| Schema differs from migration | Partial OOB / manual edit | INVESTIGATE → repair (IU-3) |
| Safe idempotent drift | Production objects; E-01 `IF NOT EXISTS` | Document; normal apply |
| Blocking drift | Duplicate policies/triggers | IU-3 repair required |

**Confirmed blocking objects (design review):** council audit triggers; SGM pause table/policy; governance/community/subscription policies and triggers.

---

## 6. Acceptance criteria

RC-011 is **reconciled** when all criteria below are met.

### 6.1 Migration history integrity

- [ ] Every repository migration ≤ repo head has a `schema_migrations` row **or** documented supersession in an approved RC.
- [ ] No ghost history rows (recorded migration with missing intended schema) without documented exception.
- [ ] Linked DB head matches repo head after IU-5.

### 6.2 Schema equivalence

- [ ] For each backfilled migration: IU-1 inventory shows equivalent or approved superset schema.
- [ ] Intentional deviations documented with engineering sign-off in RC-011 completion record.

### 6.3 Deploy path

- [ ] Sequential apply from reconciled head completes without error (or verified dry-run equivalent).
- [ ] E-01 pre-flight (`E-01-IU-1.1C-Deployment-Readiness.md`) passes post-IU-5.
- [ ] IU-3.2 immutability negative tests executed with evidence.

### 6.4 Rollback readiness

Rollback readiness is **declared**, not necessarily executed. Required before IU-3, IU-4, and IU-5 mutations:

| Requirement | Applies to |
|-------------|------------|
| **Pre-mutation snapshot** | Catalog export (tables, policies, triggers, functions relevant to scope) stored with IU completion evidence |
| **Pre-mutation history export** | Full `schema_migrations` row set before IU-4 backfill |
| **Repair rollback procedure** | Per IU-3 repair: documented steps to restore pre-repair policy/trigger state if verification fails |
| **History rollback procedure** | Documented removal of erroneous `schema_migrations` inserts without dropping live schema |
| **Forward-apply rollback procedure** | Per IU-5 applied migration: downgrade strategy documented per CES-009 (reverse migration or manual restore plan) |
| **Rollback decision authority** | Named approver for invoking rollback (engineering + governance) |
| **Rollback verification** | Post-rollback smoke: voter snapshot readable; governance routes functional; no orphaned FK violations introduced |

**Rollback readiness gate:** IU-3, IU-4, and IU-5 **must not start** until rollback procedures for that IU are documented in the IU completion or readiness record.

### 6.5 Operational closure

- [ ] RC-011 completion record published (CES-010).
- [ ] Governance anti-OOB rules (§7) acknowledged for ongoing enforcement.
- [ ] E-01 Database Verification may be marked **Passed** only after IU-5 evidence exists.

---

## 7. Governance — prevent future OOB drift

| Rule | Requirement |
|------|-------------|
| **G-1** | No manual DDL on linked business DB except under RC-011-style authorized exception |
| **G-2** | OOB exception requires RC ticket + mandatory RC-011 reconciliation IU within defined deadline |
| **G-3** | Schema apply and history record are a single operational unit — never one without the other |
| **G-4** | Pre-deploy drift check (history vs catalog) before any E-xx phase deploy |
| **G-5** | Long-term: dedicated staging Supabase with full repo replay |
| **G-6** | CES-009 deployment gate blocks phase certification when drift detected |

RC-009 P1-SUB-A (history waived) is **reconciliation debt** — closed by RC-011 IU-4, not permanent precedent.

---

## 8. Risk assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Bulk backfill without proof | Critical | Prohibited by architecture; per-migration evidence |
| Governance feature regression during repair | Medium | IU-3 scoped repair; staged verification; rollback readiness |
| Production voter snapshot impact | Low | E-01 idempotent; 0 orphan rows confirmed pre-reconcile |
| Recurrence of OOB drift | High without G-1–G-6 | Governance §7 |
| False "reconciled" declaration | Medium | §6 acceptance + independent inventory audit |

---

## 9. Out of scope

- E-02 freeze orchestration
- Application, RPC, React, Edge Function changes
- Baseline squash / new database cutover (Strategy B)
- Blanket history backfill without verification (Strategy A)
- Implementation SQL, migrations, or reconciliation execution (requires separate IU authorization)

---

## 10. Next steps (implementation planning)

1. Author **RC-011 Implementation Plan** referencing IU-1 … IU-5.
2. Execute **IU-1** (read-only inventory) — no schema mutation.
3. Gate IU-3+ on IU-2 classification sign-off and rollback readiness documentation.
4. Unblock **E-01** only after RC-011 §6 acceptance criteria satisfied.

---

## Document control

| Field | Value |
|-------|-------|
| **Supersedes** | RC-011 Design Review (conversation record, 2026-07-30) |
| **Standard** | [`CES-010-Documentation-and-Knowledge-Engineering-Standard.md`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) · [`CES-009-Deployment-and-Release-Engineering-Standard.md`](CES-009-Deployment-and-Release-Engineering-Standard.md) |
| **Related** | [`E-01-IU-1.1C-Deployment-Readiness.md`](E-01-IU-1.1C-Deployment-Readiness.md) · RC-009 Governance Journey QA |
| **Modifies Blueprint / IA-001** | **No** |

**Confirmation:** Architecture finalization only — no SQL, no migrations, no database mutation, no reconciliation performed.
