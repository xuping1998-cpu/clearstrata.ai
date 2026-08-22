# E-02 Program Authority Decision — Database Application Authority Mechanism

| Field | Value |
|-------|-------|
| **Document Type** | **Program Authority Decision (Supplement)** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Parent Authority** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) v1.0 (PAD-001 – PAD-010) |
| **Supplement ID** | **PAD-011 – PAD-025** |
| **Status** | **APPROVED WITH CONDITIONS** |
| **Authority Level** | Program Authority |
| **Effective Date** | 2026-08-21 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) |
| **Production Effect** | **None** |

> **Authority path finding:** Filename `E-02-Database-Application-Authority-Decision.md` is **authority-safe** when classified as a **Program Authority Decision supplement** continuing PAD-011 – PAD-025 under the existing [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) document class. It is **not** a new governance tier. Operational apply remains a separate **Database Application Authorization** record (same pattern as Implementation Authorization · not a third decision tier).

> **Scope lock:** Establishes **Database Application Authority mechanism** only. Does **not** apply migrations · does **not** authorize runtime execution · does **not** collect evidence · does **not** resolve TG-1/TG-2/TG-3 · does **not** reclassify EIR · does **not** authorize production · does **not** expand consumed [`E-02-RU-1.4-Implementation-Authorization.md`](E-02-RU-1.4-Implementation-Authorization.md) (E-02-RU-1.4-IA).

```
DATABASE APPLICATION AUTHORITY MECHANISM     = ESTABLISHED (THIS SUPPLEMENT)
DATABASE APPLICATION                       = NOT YET AUTHORIZED / NOT APPLIED
RU-1.4 RUNTIME EXECUTION                   = NOT AUTHORIZED
RU-1.4 EXECUTABLE EVIDENCE                 = NOT COLLECTED
HARNESS IA (CONSUMED)                      ≠ DATABASE APPLICATION AUTHORITY
DATABASE APPLICATION AUTHORITY             ≠ RUNTIME EXECUTION AUTHORITY
ENVIRONMENT GUARD PASS                     ≠ GOVERNANCE AUTHORIZATION
MIGRATION APPLIED                          ≠ BASELINE VERIFIED
LOCAL EVIDENCE                             ≠ PRODUCTION CERTIFICATION
THIS PAD                                   ≠ PRODUCTION DEPLOYMENT AUTHORIZATION
```

---

## 1. Purpose

Resolve **RA-RU-1.4-001** and **ERQ-1.4-002** by formally answering:

```
What is the authorized governance mechanism for applying
RU-1.1 and RU-1.2 database migrations
to an E-02 executable evidence environment?
```

This supplement **does not** itself authorize any database mutation.

---

## 2. Authoritative inputs consumed

| Input | Role |
|-------|------|
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) | PAD-003 · PAD-007 remediation loop |
| [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) v1.1 | §19 remediation stage |
| [`E-02-Executable-Remediation-Plan.md`](E-02-Executable-Remediation-Plan.md) | RU chain · RA-RU-1.4-001 |
| E-02-RU-1.1/1.2 Implementation Authorization | Explicit **DB apply exclusion** |
| E-02-RU-1.1/1.2/1.3 Completion | Separate DB gate · not established |
| [`E-02-RU-1.4-Design-Review.md`](E-02-RU-1.4-Design-Review.md) | ERQ-1.4-002 · two-gate model · RA-RU-1.4-007 |
| [`E-02-RU-1.4-Implementation-Review.md`](E-02-RU-1.4-Implementation-Review.md) | Execution blocked · manifest |
| [`E-02-RU-1.4-Implementation-Authorization.md`](E-02-RU-1.4-Implementation-Authorization.md) | Harness only · consumed |
| [`IA-001`](M2-S3-Implementation-Authorization.md) | IA precedent — code implementation ≠ deployment |
| [`EPS-001`](EPS-001-Engineering-Phase-Documentation-Standard.md) · [`CES-010`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) | Document lifecycle |
| E-01 deployment records | **Program-specific** — not auto-bound to E-02 |
| Repository grep | **No** existing E-02 Database Application Authorization |

**Migration targets (repository):**

- RU-1.1: `20261729120000_create_owner_vote_primary_freeze_audits.sql`
- RU-1.2: `20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql`
- RU-1.3: **no migration**
- RU-1.4: **harness only**

---

## 3. Primary mechanism finding (authority question)

| Option | Assessment |
|--------|------------|
| **A. Existing IA includes DB apply** | **REJECTED** — E-02-RU-1.1/1.2-IA explicitly exclude db push / mutation |
| **B. Separate Database Application Authorization required** | **SELECTED** |
| **C. PAD authorizes each DB apply directly** | **REJECTED** — PAD establishes mechanism; apply requires scoped Authorization |
| **D. Environment Deployment Authorization established** | **NOT FOUND** for E-02 (E-01 precedent not auto-bound) |
| **E. Existing mechanism under another name** | **NOT FOUND** in repository for E-02 RU migrations |
| **F. Further decision still required** | **PARTIAL** — mechanism established here; **specific apply** requires next Authorization |

**Formal answer:**

```
Primary mechanism = B
Separate Database Application Authorization record(s)
under Program Authority + Executable Remediation governance.
Program Authority Decision (this supplement) establishes the mechanism.
Program Authority Decision does NOT substitute for apply Authorization.
```

**Authority basis:** RU-1.1 Completion §30 · RU-1.2 Completion §45–§46 · RU-1.3 Completion §41 · RU-1.4 Design Review §6–§7 · ERQ-1.4-015 two-gate model · IA-001 deployment ≠ implementation.

---

## 4. Governance tier finding

| Concept | Tier? | Role |
|---------|-------|------|
| **Program Authority Decision** | Existing | Establishes mechanisms · resolves authority gaps (PAD-011 – PAD-025 here) |
| **Database Application Authorization** | **Not a new tier** | Operational gate document class — parallel to **Implementation Authorization** |
| **RU-1.4 Runtime Execution Authorization** | **Not a new tier** | Operational gate document class — parallel to IA for execution phase |
| **Database Application Authority** | **Mechanism name** — not a standalone tier above Program Authority |

```
Do not create a third decision hierarchy.
Mechanism (PAD) → Apply Authorization (DBA) → Execution Authorization (REA) → Evidence
```

---

## 5. RU-1.4 IA boundary (preserved)

| E-02-RU-1.4-IA authorized | E-02-RU-1.4-IA did NOT authorize |
|---------------------------|----------------------------------|
| Harness source · unit tests (L2) · integration **source** | DB apply · db reset · db push |
| devDependencies · scripts · guard · manifest tooling | Runtime integration/concurrency execution |
| | Evidence collection |

**This supplement does not retroactively expand RU-1.4-IA.**

---

## 6. Program Authority Decisions (PAD-011 – PAD-025)

### PAD-011 — DAA-001: Separately governed DB application

**RESOLVED: YES**

Database migration application to any E-02 evidence environment is a **separately governed action** from repository Implementation Authorization and from RU-1.4 harness IA.

---

### PAD-012 — DAA-002: Document class for apply authorization

**RESOLVED:**

| Field | Value |
|-------|-------|
| **Document class** | **Database Application Authorization** |
| **Naming pattern** | `E-02-Database-Application-Authorization.md` |
| **Scoped variant (when needed)** | `E-02-Database-Application-Authorization-{EnvironmentClass}.md` e.g. `-Local-Evidence` |
| **Authorization ID format** | `E-02-DBA-{ENV}-{SEQ}` — e.g. **`E-02-DBA-LOCAL-001`** |

First issued Authorization should target **local disposable evidence environment** for RU-1.4 initial executable evidence collection.

**Not authorized document classes:** Execution Authorization · Test Authorization · Evidence Authorization as separate tiers — use **Database Application Authorization** and **RU-1.4 Runtime Execution Authorization** only.

---

### PAD-013 — DAA-003: Authorization granularity

**RESOLVED: environment + migration-set scoped**

Each Database Application Authorization **must** specify:

- Environment class (`local` | `isolated-nonprod`)
- Target identifier (project ref / local instance identity)
- E-02 remediation migration set (minimum RU-1.1 + RU-1.2)
- Baseline reconstruction scope (full chain vs targeted — see PAD-016)
- Application method allowed
- Purpose (e.g. RU-1.4 initial executable evidence)
- Expiry or single-run disposition

**Prohibited:** project-wide perpetual blanket DB apply permission.

---

### PAD-014 — DAA-004: Initial evidence environment

**RESOLVED: YES — local disposable Supabase sufficient for initial RU-1.4 executable evidence collection**

| Environment | Initial RU-1.4 evidence |
|-------------|-------------------------|
| **Local disposable Supabase** | **AUTHORIZED CLASS** (subject to DBA record) |
| **Isolated non-production** | Acceptable alternative — requires **separate** DBA record |
| **Production** | **NOT AUTHORIZED** by this supplement |
| **Shared staging** | **NOT AUTOMATICALLY AUTHORIZED** |

**PCQ-010 remains OPEN.** Local executable evidence **does not** answer production certification threshold.

---

### PAD-015 — DAA-005: Local migration application regulation

**RESOLVED: YES — local `supabase db reset` requires explicit Database Application Authorization**

Previous RU documents correctly stated even local DB application was **not authorized** without authority. **Local is not unregulated.**

| Rule | Lock |
|------|------|
| Local disposable apply | Permitted **only** under narrowly scoped **E-02-DBA-LOCAL-*** Authorization |
| Same governance class | Local and remote both require DBA — scope differs |
| Convenience | **Not** a bypass |

---

### PAD-016 — Baseline chain vs E-02 remediation scope

**RESOLVED: distinguish A from B**

| Scope | Definition |
|-------|------------|
| **A — E-02 remediation migration set** | Minimum: `20261729120000` then `20261821120000` |
| **B — Environment baseline reconstruction** | Full repository migration chain required for fresh local DB |

For **`supabase db reset`** on disposable local instance, **B is technically required** and **permitted** when DBA explicitly authorizes baseline reconstruction purpose and records resulting migration head.

DBA must **not** claim only two files were applied when full chain ran.

---

### PAD-017 — DAA-005 (method): Local reset preferred mechanism

**RESOLVED: YES — `supabase db reset` is preferred authorized application method for local disposable evidence environment**

| Method | Local disposable | Remote shared |
|--------|------------------|---------------|
| **`supabase db reset`** | **Preferred** once DBA issued | **NOT generic default** |
| Targeted migration up | Acceptable with manifest | Requires scoped review |
| Blind **`supabase db push`** | **PROHIBITED** without manifest | **PROHIBITED** without manifest |

**Scope:** LOCAL DISPOSABLE EVIDENCE ENVIRONMENT ONLY unless separate DBA says otherwise.

---

### PAD-018 — Supabase start

**RESOLVED: environment preparation — authorized together with local DBA when issued**

`supabase start` (local Supabase instance bring-up) is **environment preparation**, not migration application. It may be authorized **within the same** local Database Application Authorization record as prerequisite to reset/apply.

**This supplement does not authorize `supabase start` now.**

---

### PAD-019 — DAA-006: Generic remote db push

**RESOLVED: NO**

Blind remote `supabase db push` is **PROHIBITED** unless Authorization manifest confirms **every** pending migration is in authorized scope (**RA-RU-1.4-007**).

---

### PAD-020 — DAA-007 / DAA-008: DB apply vs runtime execution

**RESOLVED: two independent gates preserved**

| Gate | Authorizes |
|------|------------|
| **Gate 1 — Database Application Authorization** | Apply migrations · environment prep · baseline verify **run** (when execution gate also open for verify commands) |
| **Gate 2 — RU-1.4 Runtime Execution Authorization** | DB-backed tests · destructive fixtures · concurrency · evidence collection |

**DAA-007 answer:** Database application **does NOT** authorize runtime tests.

**DAA-008 answer:** Separate document required:

| Document class | Path pattern |
|----------------|--------------|
| **RU-1.4 Runtime Execution Authorization** | `E-02-RU-1.4-Runtime-Execution-Authorization.md` |
| **Authorization ID** | `E-02-RU-1.4-REA` (or `E-02-RU-1.4-REA-001`) |

RU-1.4-IA **cannot** become execution-authorized after DB apply without **new** REA record.

**Executable entry chain:**

```
HARNESS IMPLEMENTED (RU-1.4-IA consumed)
+ DATABASE APPLICATION AUTHORIZED & APPLIED & BASELINE VERIFIED
+ RUNTIME EXECUTION AUTHORIZED (REA)
+ ENVIRONMENT GUARD PASS
= EVIDENCE EXECUTION MAY BEGIN
```

---

### PAD-021 — DAA-009: Production

**RESOLVED: NO — production not authorized**

| Action | Status |
|--------|--------|
| Production db push / migration apply | **NOT AUTHORIZED** |
| Production destructive fixtures | **NOT AUTHORIZED** |
| Production concurrency / corruption tests | **NOT AUTHORIZED** |

**PCQ-010:** **OPEN** — not resolved by this supplement.

---

### PAD-022 — Database Application Manifest (required)

Every Database Application Authorization **must** include or reference a **Database Application Manifest** with minimum fields:

| Field | Required |
|-------|----------|
| `authorizationId` | ✓ |
| `environmentClass` | ✓ |
| `targetIdentifier` | ✓ |
| `repositoryCommitOrRef` | ✓ if available |
| `currentMigrationHeadBefore` | ✓ |
| `authorizedMigrationFiles` | ✓ (minimum E-02 RU-1.1 + RU-1.2) |
| `baselineReconstructionScope` | ✓ (A only vs full chain B) |
| `expectedResultingHead` | ✓ |
| `applicationMethod` | ✓ |
| `unrelatedPendingMigrationCheck` | ✓ |
| `destructiveTestPermission` | ✓ (future REA may grant) |
| `runtimeExecutionPermission` | ✓ (default **false** in DBA) |
| `issuedAt` | ✓ |
| `scopeNotes` | ✓ |

**No secrets** in manifest.

---

### PAD-023 — DAA-010 / DAA-011 / DAA-012: Evidence and failure policy

**Database Application Evidence Record** (future, after apply):

| Field | Value |
|-------|-------|
| **Document class** | Database Application Evidence |
| **Path pattern** | `E-02-Database-Application-Evidence-{authorizationId}.md` |
| **Minimum content** | target class · target id · authorization ref · method · versions · timestamps · result · resulting head · baseline verify result · unrelated migration check · no-secret confirmation |

**DAA-011 — migration apply failure:** **STOP** · no manual hotfix · no SQL editor patch · no migration edit · defect finding → owning RU.

**DAA-012 — baseline verify failure after reported apply success:** **DATABASE APPLICATION ≠ VERIFIED** · **STOP** before runtime evidence · no tests.

**Runtime failure (RU-1.4):** existing failure policy preserved · no silent fix · no EIR reclassification by runner.

---

### PAD-024 — DAA-013 / DAA-014: IA interaction · environment guard

**DAA-013:** RU-1.4-IA authorized harness only · consumed · not expanded by this PAD.

**DAA-014:** Environment guard (`E02_ALLOW_DESTRUCTIVE_TESTS`, `E02_EVIDENCE_ENV`, etc.) is **technical fail-closed control** · **not** governance approval. Guard PASS **≠** authorization.

---

### PAD-025 — DAA-015: Next authorized document

**RESOLVED:**

| Priority | Next document |
|----------|---------------|
| **1** | [`E-02-Database-Application-Authorization.md`](E-02-Database-Application-Authorization.md) — **local disposable evidence environment** · Authorization ID **`E-02-DBA-LOCAL-001`** |
| **2** (after apply + baseline verify) | [`E-02-RU-1.4-Runtime-Execution-Authorization.md`](E-02-RU-1.4-Runtime-Execution-Authorization.md) |
| **Not next** | RU-1.4 Completion · Re-Verification · DB apply in this task |

---

## 7. DB baseline verification gate

After future authorized apply · **before** runtime evidence execution:

**Mandatory:** `verify:e02:baseline` (`scripts/verification/e02/verify-db-baseline.ts`)

Must confirm: 20-column G · no `committed_at` · constraints · FK RESTRICT · immutability · RLS · grants · RU-1.2 RPC signature · SECURITY DEFINER · search_path · execute grants · helper not exposed to authenticated.

```
MIGRATION APPLIED ≠ BASELINE VERIFIED
BASELINE VERIFIED ≠ EXECUTABLE EVIDENCE PASS
```

---

## 8. Runtime execution scope (future REA)

Future REA should enumerate allowed commands (from actual package.json):

- `verify:e02`
- `verify:e02:baseline`
- `verify:e02:concurrency`
- `test:e02:integration`
- `test:e02` (if integration included)

**No blanket “run anything.”**

Must explicitly permit: `ABNORMAL_PRIVILEGED_FIXTURE` · FK RESTRICT tests · marker race · manual advisory lock · partial/corruption fixtures · `service_role` setup · privileged `pg` — **disposable/isolated only**.

---

## 9. Preserved items (no PAD change)

| Item | Status |
|------|--------|
| **TG-1 / TG-2 / TG-3** | **OPEN** — not resolved by this PAD |
| **EIR-048** | Decomposed composite — Re-Verification adjudicates |
| **EIR-054** | Runtime evidence required — unchanged |
| **RA-4.2-001** | IMPLEMENTED IN REPOSITORY / PENDING RUNTIME VERIFICATION |
| **R-204** | Disposable/isolated FK DELETE RESTRICT only |
| **R-227** | Scoped to authorized environment |
| **PCQ-011** | **OPEN** |
| **PCQ-012** | **OPEN** — E-04 preserved |
| **EIR reclassification** | **NONE** by this PAD |

---

## 10. Local evidence environment lifecycle (authorized class only)

When **E-02-DBA-LOCAL-001** (or successor) is issued, permitted lifecycle **concept**:

1. `supabase start` (if authorized in DBA)
2. `supabase db reset` or authorized apply
3. `verify:e02:baseline`
4. REA issued
5. Runtime tests + evidence collection
6. Dispose / reset environment

**No step authorized by this PAD alone.**

---

## 11. Evidence preservation

| Asset | Rule |
|-------|------|
| Raw runtime evidence | `tests/e02/evidence/` — **gitignored** |
| Sanitized summaries | Governed docs / Re-Verification handoff |
| Disposable DB | May be destroyed; sanitized evidence must survive |

---

## 12. Remote non-production boundary

Isolated non-production may be authorized **later** with **target-specific** DBA. **No reuse** of local DBA for remote.

---

## 13. Production boundary (prominent)

```
THIS PROGRAM AUTHORITY DECISION SUPPLEMENT
DOES NOT AUTHORIZE PRODUCTION DEPLOYMENT
OR PRODUCTION DATABASE APPLICATION
OR PRODUCTION DESTRUCTIVE TESTING.

LOCAL EVIDENCE PASS ≠ PRODUCTION READY
LOCAL EVIDENCE ≠ PROJECT CERTIFICATION
```

---

## 14. DAA-001 – DAA-015 summary table

| ID | Question | Result |
|----|----------|--------|
| **DAA-001** | Separately governed? | **YES** |
| **DAA-002** | Document class? | **Database Application Authorization** · `E-02-Database-Application-Authorization.md` |
| **DAA-003** | Granularity? | **Environment + migration-set scoped** |
| **DAA-004** | Local disposable for initial evidence? | **YES** |
| **DAA-005** | Local db reset when authorized? | **YES — preferred local method** |
| **DAA-006** | Generic remote db push? | **NO** |
| **DAA-007** | DB apply authorizes runtime tests? | **NO** |
| **DAA-008** | Runtime execution authorizer? | **E-02-RU-1.4-Runtime-Execution-Authorization.md** |
| **DAA-009** | Production now? | **NO** |
| **DAA-010** | Apply record? | **E-02-Database-Application-Evidence-{authorizationId}.md** |
| **DAA-011** | Apply failure? | **STOP · defect · no silent fix** |
| **DAA-012** | Baseline failure? | **NOT VERIFIED · STOP before runtime** |
| **DAA-013** | RU-1.4 IA interaction? | **Harness only · not expanded** |
| **DAA-014** | Guard replaces authority? | **NO** |
| **DAA-015** | Next action? | **E-02-Database-Application-Authorization.md (local)** |

---

## 15. Current status effect

| Item | After this supplement |
|------|------------------------|
| **Database Application Authority Mechanism** | **ESTABLISHED** |
| **Database Application** | **NOT YET AUTHORIZED / NOT APPLIED** |
| **RU-1.4 Harness** | **IMPLEMENTED** (unchanged) |
| **RU-1.4 Runtime Execution** | **NOT AUTHORIZED** |
| **RU-1.4 Executable Evidence** | **NOT COLLECTED** |
| **RU-1.1/1.2 DB** | **NOT APPLIED** |
| **Runtime COMMITTED** | **NOT CERTIFIED** |
| **Acceptance / Certification / Final COMMIT** | **BLOCKED** |

---

## 16. Prohibited work confirmation

This supplement performed **no** package/harness/migration changes · **no** supabase start/reset/push · **no** database connection · **no** runtime tests · **no** evidence collection · **no** EIR change · **no** RU-1.4 Completion.

---

## 17. Lock statement

```
DATABASE APPLICATION AUTHORITY MECHANISM     = ESTABLISHED
DATABASE APPLICATION                       = NOT APPLIED
RU-1.4 HARNESS                             = IMPLEMENTED
RU-1.4 RUNTIME EXECUTION                   = NOT AUTHORIZED
RU-1.4 EXECUTABLE EVIDENCE                 = NOT COLLECTED
HARNESS IA                                 ≠ DATABASE APPLICATION AUTHORITY
DATABASE APPLICATION AUTHORITY             ≠ RUNTIME EXECUTION AUTHORITY
ENVIRONMENT GUARD PASS                     ≠ GOVERNANCE AUTHORIZATION
MIGRATION APPLIED                          ≠ BASELINE VERIFIED
NO GENERIC REMOTE DB PUSH
NO PRODUCTION DESTRUCTIVE TESTING
EIR PASS RECLASSIFICATION                  = NONE
NEXT                                       = E-02-DATABASE-APPLICATION-AUTHORIZATION.md
DO NOT APPLY DATABASE MIGRATIONS
DO NOT RUN DATABASE-BACKED TESTS
```

---

**End of document — PAD-011 – PAD-025 — v1.0 — 2026-08-21**
