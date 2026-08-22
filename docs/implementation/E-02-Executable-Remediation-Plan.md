# E-02 — Executable Remediation Plan

| Field | Value |
|-------|-------|
| **Document Type** | Executable Remediation Plan |
| **Program** | E-02 — Freeze Engine |
| **Stage** | E-02 Executable Remediation Stage |
| **Status** | **Design Approved** |
| **Revision** | v1.0 |
| **Date** | 2026-08-21 |
| **Repository Path** | `docs/implementation/E-02-Executable-Remediation-Plan.md` |
| **Authoritative Source** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) · [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) v1.1 · [`E-02-Phase-5-Certification.md`](E-02-Phase-5-Certification.md) |
| **Production Effect** | **None** |
| **Verified** | **YES** |

> **REMEDIATION PLAN ≠ REMEDIATION IMPLEMENTATION**  
> **PLANNING ≠ EXECUTION AUTHORITY**  
> **IMPLEMENT CERTIFIED CONTRACTS. DO NOT REDEFINE THEM.**

```
E-02 EXECUTABLE REMEDIATION STAGE = ESTABLISHED IN PROGRAM AUTHORITY
EXECUTABLE REMEDIATION = NOT YET AUTHORIZED
THIS PLAN DOES NOT AUTHORIZE CODE / SQL / MIGRATION / RPC / TESTS
```

---

## 0. Path authority finding

| Check | Result |
|-------|--------|
| **PAD §7 step 3** | Create **E-02 Executable Remediation Plan** after Program Plan v1.1 + Phase 5 Plan v1.1 — **prerequisites MET** |
| **Program Plan v1.1 §16** | Deliverable type **Executable Remediation Plan** — filename deferred to amended governance chain — **resolved by this document** |
| **EPS-001 §3** | `{Task}-Implementation-Plan.md` precedent → `{Task}-Executable-Remediation-Plan.md` |
| **E-02 document precedent** | `E-02-Implementation-Plan.md` · `E-02-Program-Authority-Decision.md` · `E-02-Acceptance-Report.md` — same `{Task}-{Kebab-Descriptor}.md` namespace |
| **Conflicting exact path** | **None found** |

**Path decision:** **A — AUTHORITY-SAFE**

**Exact repository path:** `docs/implementation/E-02-Executable-Remediation-Plan.md`

---

## 1. Current locked state

| Item | Status |
|------|--------|
| **E-02** | **IN PROGRESS** |
| Phase 1–4 | **CERTIFIED COMPLETE** — historical bounded scopes (**immutable**) |
| Phase 5 | **CERTIFIED COMPLETE — SCOPED PROCESS CERTIFICATION** |
| Phase 5 Completion | **COMPLETED WITH FOLLOW-UP** / **ISSUED** |
| Phase 5 Certification | **ISSUED — SCOPED** |
| **E-02 Acceptance** | **ACCEPTANCE_BLOCKED** |
| Project Certification Evaluation | **PROJECT_CERTIFICATION_BLOCKED** / **AUTHORITY_GATED** |
| **E-02 Project Certification** | **NOT ISSUED** |
| **Runtime COMMITTED** | **NOT CERTIFIED** |
| **Executable Final COMMIT Path** | **BLOCKED** |
| **E-02 Executable Remediation Stage** | **ESTABLISHED IN PROGRAM AUTHORITY** |
| **Executable Remediation** | **NOT YET AUTHORIZED** |
| Program Authority Decision | **APPROVED** |
| **E-03** | **BLOCKED** |
| **E-04** | **NOT STARTED** |

### Inherited authority (locked)

| ID | Resolution |
|----|------------|
| **VAQ-010** | **YES** — Work Breakdown executable criteria mandatory for Project Certification |
| **VAQ-007** | **NO** — Project Certification must not issue while mandatory executable gates blocked |
| **VAQ-001** | **E-02 Executable Remediation Stage** established |
| **VAQ-003** | Locus resolved; detailed sequencing deferred to remediation design *(this Plan)* |
| **PCQ-002** | **YES WITH FOLLOW-UP** |
| **PCQ-003** | **YES SCOPED** |

---

## 2. Plan objective

Define the **bounded executable remediation program** required to transform mandatory E-02 certification blockers from **NOT IMPLEMENTED / BLOCKED / PENDING EVIDENCE** into **implemented + executably verified + eligible for Engineering Re-Verification**.

This Plan **answers:**

| # | Question |
|---|----------|
| 1 | What mandatory executable gaps must be remediated? |
| 2 | Which dependencies exist among them? |
| 3 | How should remediation be decomposed into Remediation Units (RU)? |
| 4 | What evidence must each RU produce? |
| 5 | What review chain applies? |
| 6 | What is explicitly outside remediation? |
| 7 | What gates must be satisfied before executable work begins? |
| 8 | What gates must be satisfied before Re-Verification begins? |

**This Plan does NOT implement anything.**

---

## 3. Authoritative inputs

| Input | Role |
|-------|------|
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) | Remediation stage · PAD-003 · subsequent chain |
| [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) v1.1 | Program exit · remediation lifecycle · §19 |
| [`E-02-Phase-5-Implementation-Plan.md`](E-02-Phase-5-Implementation-Plan.md) v1.1 | Re-verification authority · historical preservation |
| [`E-02-Phase-5-Completion.md`](E-02-Phase-5-Completion.md) | Phase 5 process close |
| [`E-02-Phase-5-Certification.md`](E-02-Phase-5-Certification.md) | Scoped process certification |
| [`E-02-Acceptance-Report.md`](E-02-Acceptance-Report.md) v1.0 | **ACCEPTANCE_BLOCKED** — immutable baseline |
| [`E-02-IU-5.1-Completion.md`](E-02-IU-5.1-Completion.md) | Engineering Verification Baseline — 84 EIR |
| [`E-02-IU-5.2-Completion.md`](E-02-IU-5.2-Completion.md) | Acceptance Validation Baseline |
| [`E-02-IU-5.4-Completion.md`](E-02-IU-5.4-Completion.md) | PCG/PCB/PCL evaluation baseline |
| [`M2-S3-Engineering-Work-Breakdown.md`](M2-S3-Engineering-Work-Breakdown.md) | E-02 completion / verification criteria |
| [`E-02-Architecture.md`](E-02-Architecture.md) v1.1 | Architecture Authority — **must not be redefined** |
| Phase 1–4 Certifications | Certified design/readiness baselines — **immutable** |

Historical EIR classifications, acceptance dispositions, and IU-5.1–5.4 records are **consumed as locked** — not re-adjudicated in this Plan.

---

## 4. Repository investigation (read-only — 2026-08-21)

Survey of migration head and application code. **No repository modifications performed.**

### 4.1 Schema — E-02 snapshot domain (present)

| Surface | Migration head | Notes |
|---------|----------------|-------|
| `owner_vote_meetings.snapshot_frozen_at` | `20261724120000` · `20261324120000` | Governance freeze marker; `set_owner_vote_snapshot_freeze_at` RPC exists — **not** E-02 atomic commit authority |
| `owner_vote_freeze_events` | `20261725120000` | PK `id`, `owner_vote_meeting_id`, `property_id`, `is_primary`, `frozen_at`; **one-primary-per-meeting** unique partial index |
| `owner_vote_voter_snapshot` | `20261724120000` | `freeze_event_id` FK; immutability trigger `20261726120000` |
| `owner_vote_resolution_snapshot` | `20261727120000` | One per freeze event unique index; immutability `20261728120000` |
| `owner_vote_frozen_motions` | `20261727120000` | `property_id`, `freeze_event_id`, `resolution_snapshot_id`; immutability `20261728120000` |

### 4.2 Schema — absent / gap

| Surface | Status |
|---------|--------|
| **Primary Audit physical persistence target** | **NOT PRESENT** in repo migrations — no `owner_vote_primary_audit` or equivalent |
| `owner_vote_audit_logs` | **NOT PRESENT** in repo — referenced in RC010-B production recovery only |
| **Ownership / attempt coordination table** | **NOT PRESENT** |
| **Reconciliation persistence** | **NOT PRESENT** for `COMMIT_OUTCOME_UNCERTAIN` |
| **COMMITTED durable evidence store** | **NOT PRESENT** beyond marker columns |
| **E-02 atomic commit RPC** | **NOT PRESENT** |

### 4.3 Application — read path (certified)

| Surface | Location | Status |
|---------|----------|--------|
| `FrozenMeetingBundleRepository` | `src/lib/ownerVote/snapshotDomain/frozenMeetingBundleRepository.ts` | **READ-ONLY** — dual-entry load by meeting / freeze event |
| Validators | `src/lib/ownerVote/snapshotDomain/validators.ts` | Correlation for `freeze_event_id`, meeting id, resolution id — **does NOT assert** `property_id` cross-equality (EIR-070–071 gap) |
| Direct table reads (bypass) | `MeetingDetail.tsx` L837 · `api.ts` L744 · `useImportantUpdatesBullets.ts` | **Legacy read paths** — not E-02 commit orchestration |

### 4.4 Application — write / freeze paths (legacy — not E-02 authority)

| Surface | Location | Assessment |
|---------|----------|------------|
| `freeze_owner_vote_snapshot` RPC call | `MeetingDetail.tsx` L1019 · L2023 | **Legacy production freeze** — not E-02 A–G atomic envelope |
| `set_owner_vote_snapshot_freeze_at` RPC | `api.ts` L2232 | Marker-only RPC — **not** COMMITTED authority |
| E-02 materialization write orchestration | — | **NOT IMPLEMENTED** in repo |

### 4.5 Server-side transaction patterns (investigation)

| Pattern | Finding |
|---------|---------|
| Supabase RPC with multi-statement PL/pgSQL | **Present** in domain RPCs (`submit_owner_vote`, election governance, etc.) — **candidate pattern** for atomic envelope |
| Browser sequential Supabase client writes | **Present** for legacy freeze — **insufficient** per Phase 4 certification |
| Existing freeze RPC in repo migrations | **`freeze_owner_vote_snapshot` not in migration head surveyed** — production-only / external to E-02 path |

### 4.6 Investigation conclusion

Repository confirms **certified read contracts** and **schema foundations** from E-01/E-02 Phases 1–4 design work. **Mandatory executable gaps** (Primary Audit persistence, atomic envelope, ownership, reconciliation, runtime orchestration, COMMITTED evidence, full property_id runtime correlation) remain **absent** — consistent with IU-5.1 baseline.

---

## 5. Remediation source inventory

Classification of obligations relevant to remediation. **Not all 84 EIR enter remediation.**

### 5.1 Classification taxonomy

| Code | Meaning |
|------|---------|
| **REMEDIATION REQUIRED** | Mandatory executable implementation gap — must close for re-verification |
| **DEPENDENCY-BLOCKED** | Blocked pending upstream remediation RU |
| **VERIFICATION ONLY** | Design/static PASS — re-verification confirms scope only |
| **PENDING EVIDENCE** | Requires executable fixtures/tests after implementation |
| **DEFERRED E-04** | Out of E-02 remediation scope |
| **NOT APPLICABLE** | No remediation action |
| **AUTHORITY DECISION REQUIRED** | Open PCQ — cannot plan as closed |

### 5.2 Acceptance Blocker register (AB-001 – AB-013)

| ID | EIR scope | Domain | Classification |
|----|-----------|--------|----------------|
| **AB-001** | EIR-001–020 | Primary Audit / COMMITTED | **REMEDIATION REQUIRED** |
| **AB-002** | EIR-021–028 | Atomic transaction | **REMEDIATION REQUIRED** |
| **AB-003** | EIR-029–032 | Ownership / concurrency | **REMEDIATION REQUIRED** |
| **AB-004** | EIR-033–037 | Reconciliation | **REMEDIATION REQUIRED** |
| **AB-005** | EIR-038–039 | Runtime COMMITTED | **REMEDIATION REQUIRED** |
| **AB-006** | EIR-070–071 | property_id correlation | **REMEDIATION REQUIRED** |
| **AB-007** | EIR-048 | Concurrency evidence | **PENDING EVIDENCE** |
| **AB-008** | EIR-054 | Cross-entry runtime evidence | **PENDING EVIDENCE** |
| **AB-009** | EIR-077–078 | E-04 boundary | **DEFERRED E-04** |
| **AB-010** | VAQ-007 | Authority | **NOT APPLICABLE** — resolved YES/NO in PAD |
| **AB-011** | VAQ-010 | Authority | **NOT APPLICABLE** — resolved in PAD |
| **AB-012** | VAQ-001/003 | Authority | **NOT APPLICABLE** — locus resolved; sequencing in this Plan |
| **AB-013** | EIR-079–080 | Materialization writes | **REMEDIATION REQUIRED** |

### 5.3 Project Certification Gate register (PCG — remediation-relevant)

| ID | Status | Remediation mapping |
|----|--------|---------------------|
| **PCG-008** | BLOCKED | Closes only after superseding acceptance — not direct remediation |
| **PCG-009** | BLOCKED | **RU-1.1** |
| **PCG-010** | BLOCKED | **RU-1.2** |
| **PCG-011** | BLOCKED | **RU-1.2** |
| **PCG-012** | BLOCKED | **RU-1.2** |
| **PCG-013** | BLOCKED | **RU-1.3** |
| **PCG-014** | BLOCKED | **RU-1.3** |
| **PCG-015** | PENDING EVIDENCE | **RU-1.4** |
| **PCG-016** | BLOCKED | **RU-1.4** + **AUTHORITY OPEN** (PCQ-011) |
| **PCG-017** | BLOCKED | Aggregate — closes via re-verification |
| **PCG-018–022** | AUTHORITY | **NOT APPLICABLE** — resolved or forward-only |

### 5.4 EIR summary by remediation class

| Class | Count | EIR ranges (representative) |
|-------|-------|---------------------------|
| **REMEDIATION REQUIRED** | **29** | EIR-001–039, 070–071, 079–080 (+ blocked children) |
| **DEPENDENCY-BLOCKED** | **26** | Blocked pending parent mechanisms above |
| **VERIFICATION ONLY** | **22** | Design/static PASS — confirm scope at re-verification |
| **PENDING EVIDENCE** | **2** | EIR-048, EIR-054 |
| **DEFERRED E-04** | **2** | EIR-077, EIR-078 |
| **NOT APPLICABLE** | **3** | Per IU-5.1 baseline |
| **FAIL** | **0** | — |

```
29 / 29 NOT IMPLEMENTED = BLOCKING ACCEPTANCE (preserved)
26 / 26 BLOCKED = PENDING DEPENDENCY (preserved)
22 PASS ≠ EXECUTABLE READINESS (preserved)
```

---

## 6. Architecture preservation (binding)

Remediation **SHALL** preserve all certified invariants:

| Invariant | Requirement |
|-----------|-------------|
| **NO PRIMARY AUDIT → NO COMMITTED FREEZE** | Audit persistence before COMMITTED authority |
| **Artifact F = VERIFY-ONLY** | No `owner_vote_meetings.status` change by freeze commit |
| **COMMIT_READY ≠ COMMIT_SET_VERIFIED ≠ COMMIT_PREPARED ≠ AUDIT_PREPARED ≠ COMMIT_AUTHORIZED ≠ COMMITTING ≠ COMMITTED** | Staging ladder preserved |
| **A–G COMPLETE ≠ COMMITTED** | Full set + audit + atomic commit required |
| **Client acknowledgement ≠ COMMITTED authority** | Durable server evidence only |
| **COMMIT_OUTCOME_UNCERTAIN → DURABLE RECONCILIATION FIRST** | Before retry / new attempt |
| **Rolled-back identities NEVER reused** | New freeze event identity after rollback |
| **UNIQUE INDEX ≠ OWNERSHIP ORCHESTRATION** | Primary index is not concurrency ownership |
| **NO LIVE RECONSTRUCTION** | Materialize; do not rebuild from live state |
| **ADOPT THE CERTIFIED REPOSITORY** | Extend `snapshotDomain`; do not rebuild read layer |
| **READ COMPLETENESS ≠ COMMITTED COMPLETENESS** | Read path PASS does not imply commit |

---

## 7. Prohibited redesign (certified domains)

Remediation **MUST NOT** unnecessarily redesign:

- FreezeContext
- Validation pipeline (Phase 1)
- Phase 2 snapshot materialization logical contract
- `FrozenMeetingBundleRepository` read semantics
- Dual-entry read semantics
- Artifact F semantics
- A–G logical contract
- Idempotency outcome model
- Acceptance taxonomy

**Remediation implements certified contracts — it does not redefine them.**

---

## 8. Mandatory remediation domains — planning requirements

### 8.1 Primary Audit (RU-1.1)

Consume IU-3.2 certified logical contract. Future implementation **SHALL** provide:

- Physical persistence target (exact table name — **Design Review**)
- Independent `primaryAuditId`
- Mandatory `freeze_event_id` correlation
- Exactly-one uniqueness per freeze event
- Mandatory evidence fields: counts, `freeze_boundary_at`, commit-set evidence
- Immutable committed audit row
- Participation in same atomic envelope as A–F writes (envelope in RU-1.2)

**DO NOT** choose final schema in this Plan — belongs to RU-1.1 Design Review.

### 8.2 Atomic server-side transaction envelope (RU-1.2)

- A–G final freeze write path **SHALL** share **one server-side atomic DB transaction**
- Browser sequential Supabase operations **insufficient** (Phase 4 certified)
- Server RPC **may be proposed** if repository evidence supports it — **no RPC created by this Plan**
- **SHALL NOT** define final signature unless required by existing authority

### 8.3 Durable ownership / concurrency (RU-1.2)

Future requirements:

- Single active attempt ownership
- No ownership stealing
- Competing caller → **RETRYABLE**
- Durable committed result → **IDEMPOTENT_RETURN**
- Rollback terminalization
- New identity after rollback
- No dual primary · no dual audit · no duplicate commit

**No schema invented in this Plan.**

### 8.4 Durable reconciliation (RU-1.2)

`COMMIT_OUTCOME_UNCERTAIN` → durable reconciliation first:

| Observed state | Outcome |
|----------------|---------|
| Committed | **IDEMPOTENT_RETURN** |
| Active owner | **RETRYABLE** |
| Rolled back / no owner | **NEW_ATTEMPT_REQUIRED** |

No timeout-based identity reuse. No client acknowledgement authority.

### 8.5 Runtime freeze orchestration & COMMITTED (RU-1.3)

- Wire authorized server-side commit path to approved invokers (E-04 deferred for consumer migration)
- Produce durable **COMMITTED** evidence
- Set `snapshot_frozen_at` **inside** atomic envelope — not via standalone marker RPC as authority
- Materialization writes EIR-079–080

### 8.6 property_id correlation — RA-4.2-001 (RU-1.3)

Executable closure requirements:

```
resolutionSnapshot.property_id = meeting.property_id = freezeEvent.property_id
each frozenMotion.property_id = meeting.property_id = freezeEvent.property_id
```

Enforcement layer deferred to RU-1.3 Design Review. **Do not silently modify E-01 repository read contracts.**

### 8.7 Pending external evidence (RU-1.4)

| EIR | Requirement |
|-----|-------------|
| **EIR-048** | Executable concurrency fixture / test evidence |
| **EIR-054** | Cross-entry runtime integration fixture |

| Classification | Status |
|----------------|--------|
| **EVIDENCE REQUIRED FOR RE-VERIFICATION** | Yes — after RU-1.3 implementation |
| **PROJECT CERTIFICATION MANDATORY STATUS** | **AUTHORITY OPEN** — PCQ-010 |

### 8.8 CITM mapping

| CITM | Current | Remediation evidence target |
|------|---------|------------------------------|
| **4** | BLOCKED | RU-1.2 atomic event + RU-1.4 verification |
| **12** | BLOCKED | RU-1.1 audit + RU-1.4 verification |
| **1** | PARTIALLY ACCEPTED | RU-1.3 materialization write evidence |
| **2** | PARTIALLY ACCEPTED | RU-1.3 materialization write evidence |
| **5** | PARTIALLY ACCEPTED | RU-1.3 post-freeze enforcement path |

**PCQ-011 OPEN** — exact final CITM acceptance threshold **not invented** in this Plan.

---

## 9. E-04 boundary

| Item | Status |
|------|--------|
| **EIR-077** | **DEFERRED TO E-04** |
| **EIR-078** | **DEFERRED TO E-04** |
| **E-04 program** | **NOT STARTED** |
| **PCQ-012** | **OPEN** |

**NOT in remediation scope unless new authority explicitly requires:**

- Legacy consumer migration
- Consumer repository adoption
- UI replacement of legacy `freeze_owner_vote_snapshot` call sites

Legacy RPC call sites (`MeetingDetail.tsx`) **documented** for future E-04 — **not remediated in RU scope**.

---

## 10. Proposed Remediation Unit decomposition

**Remediation Unit ID scheme:** `RU-{major}.{minor}`  
**Document pattern (established by this Plan):** `E-02-RU-{major}.{minor}-Implementation.md`  
*(Parallel to EPS-001 IU pattern; distinct namespace — not Phase 6)*

Decomposition minimizes cross-RU transaction fragmentation while preserving review boundaries.

### RU-1.1 — Primary Audit Physical Foundation

| Field | Value |
|-------|-------|
| **ID** | **RU-1.1** |
| **Title** | Primary Audit Physical Foundation |
| **Objective** | Establish physical persistence target and logical-to-physical mapping for Artifact G per IU-3.2 certified contract |
| **Source blockers** | AB-001 · EIR-001–020 · PCG-009 |
| **Dependencies** | None (first remediation RU) |
| **In scope** | Persistence target design · schema migration authority request · audit identity · freeze_event correlation · immutability rules · evidence column contract |
| **Out of scope** | Transaction envelope implementation · ownership · reconciliation · runtime orchestration · COMMITTED authority |
| **Expected surfaces** | New audit table (name TBD) · FK to `owner_vote_freeze_events` |
| **Expected evidence** | Migration in repo · schema review · immutability trigger design · correlation test plan |
| **Design Review gate** | Required before Implementation Review |
| **Implementation Review gate** | Required before executable authorization |
| **Completion gate** | `E-02-RU-1.1-Completion.md` |
| **Downstream consumer** | RU-1.2 |
| **Authorization** | **PLANNED / NOT YET AUTHORIZED FOR EXECUTION** |

### RU-1.2 — Server-Side Atomic Commit Envelope

| Field | Value |
|-------|-------|
| **ID** | **RU-1.2** |
| **Title** | Server-Side Atomic Commit Envelope |
| **Objective** | Implement single server-side atomic DB transaction for A–G writes including Primary Audit INSERT, ownership coordination, and reconciliation persistence |
| **Source blockers** | AB-002 · AB-003 · AB-004 · EIR-021–037 · PCG-010 · PCG-011 · PCG-012 |
| **Dependencies** | **RU-1.1** (audit target defined) |
| **In scope** | Server RPC or equivalent transaction holder · atomic A–G write path · ownership model · reconciliation model · idempotency outcome integration |
| **Out of scope** | UI/consumer wiring · E-04 migration · COMMITTED marker authority without full envelope · property_id cross-assertion (RU-1.3) |
| **Expected surfaces** | Supabase RPC migration(s) · ownership/reconciliation tables (TBD) · orchestration module |
| **Expected evidence** | RPC in repo · transaction integration tests · rollback tests · COMMIT_OUTCOME_UNCERTAIN simulation plan |
| **Design Review gate** | Required — **ERQ-002** transaction holder · **ERQ-003** ownership · **ERQ-004** reconciliation |
| **Implementation Review gate** | Required |
| **Completion gate** | `E-02-RU-1.2-Completion.md` |
| **Downstream consumer** | RU-1.3 · RU-1.4 |
| **Authorization** | **PLANNED / NOT YET AUTHORIZED FOR EXECUTION** |

### RU-1.3 — Runtime Orchestration, COMMITTED Authority & property_id Correlation

| Field | Value |
|-------|-------|
| **ID** | **RU-1.3** |
| **Title** | Runtime Orchestration, COMMITTED Authority & property_id Correlation |
| **Objective** | Wire freeze orchestration to atomic envelope; establish durable COMMITTED evidence; enforce RA-4.2-001 property_id correlation at commit time; complete materialization writes |
| **Source blockers** | AB-005 · AB-006 · AB-013 · EIR-038–039 · EIR-070–071 · EIR-079–080 · PCG-013 · PCG-014 |
| **Dependencies** | **RU-1.2** |
| **In scope** | Orchestration entry point · COMMITTED durable evidence · `snapshot_frozen_at` inside envelope · property_id validators at commit · materialization write path |
| **Out of scope** | Redesign of `FrozenMeetingBundleRepository` · legacy RPC removal · consumer UI migration (E-04) |
| **Expected surfaces** | Orchestration module · commit-path validators · meeting marker update inside RPC |
| **Expected evidence** | End-to-end commit test · property_id mismatch rejection · COMMITTED state proof |
| **Design Review gate** | Required — **ERQ-005** COMMITTED evidence · **ERQ-006** correlation layer |
| **Implementation Review gate** | Required |
| **Completion gate** | `E-02-RU-1.3-Completion.md` |
| **Downstream consumer** | RU-1.4 · Engineering Re-Verification |
| **Authorization** | **PLANNED / NOT YET AUTHORIZED FOR EXECUTION** |

### RU-1.4 — Executable Verification Evidence Package

| Field | Value |
|-------|-------|
| **ID** | **RU-1.4** |
| **Title** | Executable Verification Evidence Package |
| **Objective** | Produce executable fixtures and tests for EIR-048, EIR-054, and CITM rows 1/2/4/5/12 required for Engineering Re-Verification |
| **Source blockers** | AB-007 · AB-008 · PCG-015 · PCG-016 · CITM 1/2/4/5/12 |
| **Dependencies** | **RU-1.3** |
| **In scope** | Concurrency fixture (EIR-048) · cross-entry runtime fixture (EIR-054) · CITM evidence mapping · test harness documentation |
| **Out of scope** | Acceptance Re-Validation · Superseding Acceptance Report · Project Certification |
| **Expected surfaces** | Test/fixture files · evidence ledger entries |
| **Expected evidence** | Runnable tests · fixture documentation · CITM traceability matrix update |
| **Design Review gate** | Required — **ERQ-007** · **ERQ-008** fixtures |
| **Implementation Review gate** | Required |
| **Completion gate** | `E-02-RU-1.4-Completion.md` |
| **Downstream consumer** | Engineering Re-Verification |
| **Authorization** | **PLANNED / NOT YET AUTHORIZED FOR EXECUTION** |

### Dependency graph

```
RU-1.1 Primary Audit Foundation
    ↓
RU-1.2 Atomic Commit Envelope (+ ownership + reconciliation)
    ↓
RU-1.3 Orchestration + COMMITTED + property_id
    ↓
RU-1.4 Executable Evidence Package
    ↓
Engineering Re-Verification (forward — not authorized here)
```

---

## 11. IU authorization status

| Rule | Status |
|------|--------|
| This Plan **proposes** RU-1.1 – RU-1.4 | **PLANNED** |
| Automatic executable authorization | **NO** |
| Per-RU chain | Implementation → Design Review → Implementation Review → **explicit executable authorization** → Completion |
| Any RU marked started | **NO** |

```
REMEDIATION PLAN APPROVED ≠ EXECUTABLE REMEDIATION AUTHORIZED
```

---

## 12. Executable Remediation Start Gate

Before **any** code / SQL / migration / RPC changes:

| # | Gate | Required |
|---|------|----------|
| 1 | Remediation Plan approved | ✓ *(this document — Design Approved)* |
| 2 | RU decomposition approved | Pending governance acceptance of §10 |
| 3 | Architecture dependencies resolved | Per RU Design Reviews |
| 4 | Exact repository surfaces identified | Per RU-1.1+ Design Reviews |
| 5 | Migration authority established | Per RU Implementation Review |
| 6 | Rollback strategy established | Per RU-1.2 Design Review |
| 7 | Verification evidence defined | Per RU-1.4 + Re-Verification gate |
| 8 | No unresolved blocker requires architecture redefinition | Ongoing |
| 9 | Exact RU explicitly authorized | **NOT YET** |

**Until all gates pass for a specific RU:**

```
EXECUTABLE REMEDIATION = NOT AUTHORIZED
```

---

## 13. Engineering Re-Verification Entry Gate

**Engineering Re-Verification MAY BEGIN ONLY WHEN:**

| # | Requirement |
|---|-------------|
| 1 | All remediation RUs in mandatory scope (**RU-1.1 – RU-1.4**) **COMPLETED** |
| 2 | Executable build / test evidence exists |
| 3 | Schema migrations represented in repo |
| 4 | Runtime fixtures available where required (EIR-048 · EIR-054) |
| 5 | No known partial transaction path remains |
| 6 | Blocker evidence package complete |

```
NEW CODE ALONE ≠ NEW PASS
Re-Verification does not start merely because code compiles.
```

---

## 14. Acceptance Re-Validation Entry Gate

Acceptance Re-Validation **MAY BEGIN ONLY AFTER** authorized Engineering Re-Verification produces a **new result set**.

```
Remediation Completion → Acceptance PASS   ✗ PROHIBITED DIRECT PATH
Remediation → Re-Verification → Re-Validation → Superseding Report   ✓ REQUIRED CHAIN
```

---

## 15. Explicit exclusions (remediation scope)

This Plan **does NOT** authorize or include:

| # | Exclusion |
|---|-----------|
| 1 | E-04 consumer / legacy migration |
| 2 | Legacy `freeze_owner_vote_snapshot` removal |
| 3 | Direct-table read path refactoring (E-04) |
| 4 | E-03 work |
| 5 | Project Certification issuance |
| 6 | Superseding Acceptance Report |
| 7 | Engineering Baseline |
| 8 | Production deployment |
| 9 | Phase 1–4 certification rewrite |
| 10 | IU-5.1–5.4 record modification |

---

## 16. Risk register (R-180+)

Continues after **R-179** (IU-5.4). Remediation-specific risks:

| ID | Risk | Impact | Mitigation | Status |
|----|------|--------|------------|--------|
| **R-180** | Atomic envelope fragmented across RUs | Partial commit certified | RU-1.2 owns full envelope; RU-1.1 audit participates inside | **OPEN** |
| **R-181** | Audit schema implemented outside transaction | COMMITTED without audit | RU-1.2 Design Review — single-transaction mandate | **OPEN** |
| **R-182** | Ownership coordination mistaken for unique index | Race conditions | ERQ-003 · explicit ownership model in RU-1.2 | **OPEN** |
| **R-183** | Reconciliation not durable | COMMIT_OUTCOME_UNCERTAIN mishandled | ERQ-004 · RU-1.2 reconciliation persistence | **OPEN** |
| **R-184** | Client ack used as COMMITTED authority | False freeze confidence | Architecture §invariants · RU-1.3 durable evidence only | **OPEN** |
| **R-185** | Historical EIR retroactively rewritten | Governance breach | Immutable baselines · forward evidence only | **OPEN** |
| **R-186** | Remediation scope leaks into E-04 | Unauthorized consumer migration | §9 boundary · AB-009 preserved | **OPEN** |
| **R-187** | Legacy RPC accidentally used by E-02 path | Non-atomic freeze | RU-1.3 orchestration · E-04 defers consumer cutover | **OPEN** |
| **R-188** | Partial property_id correlation marked full | RA-4.2-001 false closure | RU-1.3 explicit cross-assertion evidence | **OPEN** |
| **R-189** | Runtime test marked PASS without fixture | EIR-048/054 false pass | RU-1.4 fixture mandate | **OPEN** |
| **R-190** | Remediation Completion mistaken for Project Certification | Premature E-03 | Re-verification chain · VAQ-007 preserved | **OPEN** |

---

## 17. Open questions — remediation register (ERQ)

Remediation-specific prefix **ERQ** — does not reuse VAQ/PCQ IDs.

| ID | Question | Disposition |
|----|----------|-----------|
| **ERQ-001** | Exact Primary Audit physical schema / table name | **DESIGN REVIEW** — RU-1.1 |
| **ERQ-002** | Exact transaction holder mechanism (RPC name, signature) | **DESIGN REVIEW** — RU-1.2 |
| **ERQ-003** | Ownership persistence mechanism | **DESIGN REVIEW** — RU-1.2 |
| **ERQ-004** | Reconciliation persistence mechanism | **DESIGN REVIEW** — RU-1.2 |
| **ERQ-005** | COMMITTED durable evidence mechanism | **DESIGN REVIEW** — RU-1.3 |
| **ERQ-006** | property_id correlation enforcement layer | **DESIGN REVIEW** — RU-1.3 |
| **ERQ-007** | EIR-048 concurrency fixture design | **DESIGN REVIEW** — RU-1.4 |
| **ERQ-008** | EIR-054 cross-entry runtime fixture design | **DESIGN REVIEW** — RU-1.4 |
| **ERQ-009** | CITM partial → full executable threshold | **AUTHORITY DECISION REQUIRED** — PCQ-011 |
| **ERQ-010** | EIR-048/054 pre-certification mandatory status | **AUTHORITY DECISION REQUIRED** — PCQ-010 |
| **ERQ-011** | Production deployment certification threshold | **AUTHORITY DECISION REQUIRED** |
| **ERQ-012** | E-04 deferred vs E-02 certification prerequisite | **AUTHORITY DECISION REQUIRED** — PCQ-012 |
| **ERQ-013** | Exact RU execution ordering within RU-1.2 (ownership vs reconciliation DDL) | **REPOSITORY INVESTIGATION** + Design Review |

**Preserved open PCQ:** PCQ-010 · PCQ-011 · PCQ-012

---

## 18. Success criteria

Plan success means:

| # | Criterion | Met |
|---|-----------|-----|
| 1 | Remediation scope fully traceable to AB/EIR/PCG | ✓ §5 |
| 2 | Certified contracts preserved | ✓ §6–7 |
| 3 | Mandatory blockers mapped | ✓ §5 · §8 |
| 4 | RU decomposition coherent | ✓ §10 |
| 5 | Execution gate explicit | ✓ §12 |
| 6 | Re-Verification gate explicit | ✓ §13 |
| 7 | Acceptance Re-Validation gate explicit | ✓ §14 |
| 8 | E-04 boundary preserved | ✓ §9 |
| 9 | No executable work done | ✓ |

**Plan success DOES NOT mean blockers resolved.**

---

## 19. Current status after Plan

| Item | Status |
|------|--------|
| E-02 Acceptance | **ACCEPTANCE_BLOCKED** |
| E-02 Project Certification | **NOT ISSUED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Executable Final COMMIT Path | **BLOCKED** |
| E-02 Executable Remediation Stage | **ESTABLISHED IN AUTHORITY** |
| **E-02 Executable Remediation Plan** | **Design Approved** — **ESTABLISHED** |
| **Executable Remediation** | **NOT YET AUTHORIZED** |
| E-03 | **BLOCKED** |
| E-04 | **NOT STARTED** |

---

## 20. Next authorized document

Per PAD §7 step 4 · proposed RU decomposition · document pattern established in §10:

| Field | Value |
|-------|-------|
| **Next authorized document** | [`E-02-RU-1.1-Implementation.md`](E-02-RU-1.1-Implementation.md) |
| **Scope** | RU-1.1 Primary Audit Physical Foundation — implementation design only |
| **Authorization** | **PLANNED** — **NOT YET AUTHORIZED FOR EXECUTION** |

**This Plan does NOT create RU-1.1 Implementation.**

Forward chain after RU completions:

```
RU-1.1 → RU-1.2 → RU-1.3 → RU-1.4
    ↓
Engineering Re-Verification
    ↓
Acceptance Re-Validation
    ↓
Superseding Acceptance Report
    ↓
Project Certification Re-Evaluation
```

---

## 21. Forward lifecycle (preserved)

```
Phase 5 Certification (scoped)                    ← COMPLETE
        ↓
E-02 Executable Remediation Plan                  ← THIS DOCUMENT
        ↓
RU Design / Review / authorized implementation
        ↓
Engineering Re-Verification
        ↓
Acceptance Re-Validation
        ↓
Superseding Acceptance Report
        ↓
Project Certification Re-Evaluation
        ↓
E-02 Project Certification (only if gates pass)
        ↓
E-03 consideration
```

Historical records **immutable**. Remediate forward. Re-verify with executable evidence.

---

## Document control

| Field | Value |
|-------|-------|
| **Document Type** | Executable Remediation Plan |
| **Program** | E-02 — Freeze Engine |
| **Status** | **Design Approved** |
| **Revision** | v1.0 |
| **Date** | 2026-08-21 |
| **Repository Path** | `docs/implementation/E-02-Executable-Remediation-Plan.md` |
| **Authoritative Source** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) · [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) v1.1 |
| **Previous Document** | [`E-02-Phase-5-Certification.md`](E-02-Phase-5-Certification.md) |
| **Next Document** | [`E-02-RU-1.1-Implementation.md`](E-02-RU-1.1-Implementation.md) *(planned — not created)* |
| **Production Effect** | None |
| **Standard** | [`EPS-001`](EPS-001-Engineering-Phase-Documentation-Standard.md) · [`CES-010`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) |

---

## Final status lock

```
E-02 EXECUTABLE REMEDIATION STAGE = ESTABLISHED IN PROGRAM AUTHORITY
E-02 EXECUTABLE REMEDIATION PLAN = ESTABLISHED (Design Approved)
EXACT PATH = docs/implementation/E-02-Executable-Remediation-Plan.md
EXECUTABLE REMEDIATION = NOT YET AUTHORIZED
E-02 ACCEPTANCE = ACCEPTANCE_BLOCKED
PROJECT CERTIFICATION = NOT ISSUED
RUNTIME COMMITTED = NOT CERTIFIED
EXECUTABLE FINAL COMMIT PATH = BLOCKED
E-03 = BLOCKED
REMEDIATION PLAN ≠ REMEDIATION IMPLEMENTATION
PLANNING ≠ EXECUTION AUTHORITY
IMPLEMENT CERTIFIED CONTRACTS. DO NOT REDEFINE THEM.
PRESERVE HISTORY. REMEDIATE FORWARD. RE-VERIFY WITH EXECUTABLE EVIDENCE.
NEXT AUTHORIZED DOCUMENT = E-02-RU-1.1-Implementation.md (planned, not created)
```
