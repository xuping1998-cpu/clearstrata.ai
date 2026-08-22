# E-02 — Freeze Engine Implementation Plan

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Plan |
| **Program** | E-02 — Freeze Engine |
| **Status** | **Approved** |
| **Revision** | **v1.1** |
| **Program Authority Amendment** | **2026-08-20** — incorporates [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) |
| **Authoritative Source** | [`E-02-Architecture.md`](E-02-Architecture.md) (Architecture Authority v1.1) |
| **Verified** | **YES** |
| **Supersedes** | v1.0 (preserved — see Amendment Note §0) |
| **Next Document** | [`E-02-Phase-1-Implementation-Plan.md`](E-02-Phase-1-Implementation-Plan.md) |
| **Task** | E-02 Freeze Engine |
| **Milestone** | M2-S3 — Snapshot Freeze |
| **Authority** | [`IA-001`](M2-S3-Implementation-Authorization.md) · [`M2-S3-Engineering-Work-Breakdown.md`](M2-S3-Engineering-Work-Breakdown.md) — Task E-02 |
| **Blueprint** | [`M2-S3-Snapshot-Freeze-Design.md`](M2-S3-Snapshot-Freeze-Design.md) §10 |
| **Production Effect** | **None** from this document — production changes only when phased implementation is deployed and verified |

> **Document class:** Engineering execution order only. Implements the approved Architecture Authority. Does **not** redesign architecture, modify the Blueprint, ER-001, IA-001, or the Work Breakdown, or contain implementation code.

---

## 0. Amendment Note (v1.0 → v1.1)

| Field | Value |
|-------|-------|
| **Amendment type** | Program Authority Amendment |
| **Effective date** | 2026-08-20 |
| **Controlling authority** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) — **APPROVED** |

**v1.1** incorporates the approved Program Authority Decision governing the **blocked-acceptance remediation path**.

**v1.1 does NOT:**

- Invalidate Phase 1–4 Certifications
- Modify IU-5.1–IU-5.4 Completion records
- Rewrite [`E-02-Acceptance-Report.md`](E-02-Acceptance-Report.md) v1.0
- Authorize executable remediation implementation
- Issue Project Certification or unblock E-03

Where v1.0 wording conflicted with the approved Program Authority Decision, **v1.1 uses the Program Authority Decision as controlling E-02 authority**. Historical v1.0 intent is preserved in §0 and unchanged phase descriptions where not superseded.

```
PROGRAM PLAN v1.1 AMENDED
≠ EXECUTABLE REMEDIATION AUTHORIZED
```

---

## Authoritative Source

| Field | Value |
|-------|-------|
| **Implementation Plan** | [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) |
| **Architecture Authority** | [`E-02-Architecture.md`](E-02-Architecture.md) v1.1 |
| **Program Authority Decision** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) v1.0 — **APPROVED** |
| **Revision** | **v1.1** |
| **Verified** | **YES** |

---

## 1. Purpose

Define the **engineering execution plan** for **E-02 Freeze Engine**.

This document **shall implement** the approved [`E-02-Architecture.md`](E-02-Architecture.md) Architecture Authority. It **shall not redefine** architecture decisions contained therein.

E-02 materializes snapshot state on the certified **E-01 Snapshot Foundation** — creating Freeze Events, populating dual snapshots and frozen motions, committing atomically, and producing immutable event-linked state per the Freeze Contract (Architecture Authority §6).

---

## 2. Authoritative inputs

| Input | Role |
|-------|------|
| [`M2-S3-Snapshot-Freeze-Design.md`](M2-S3-Snapshot-Freeze-Design.md) | Parent Blueprint — §8 invariants · §9 domain · §10 freeze transaction |
| [`E-02-Architecture.md`](E-02-Architecture.md) v1.1 | **Architecture Authority** — normative contract |
| [`E-01-Project-Certification.md`](E-01-Project-Certification.md) | Certified persistence foundation |
| [`E-01-Engineering-Baseline.md`](E-01-Engineering-Baseline.md) | E-01 baseline artifacts · extension rule |
| [`RC-011-Completion.md`](RC-011-Completion.md) | E-01 schema deployed; DB head `20261728120000` |
| [`ENGINEERING-GOVERNANCE-v1.3.md`](ENGINEERING-GOVERNANCE-v1.3.md) | GR-7 · GR-8 · deferred ownership |
| [`EPS-001-Engineering-Phase-Documentation-Standard.md`](EPS-001-Engineering-Phase-Documentation-Standard.md) | Phase / IU / certification document chain |
| [`CES-003-Frontend-Engineering-Standard.md`](CES-003-Frontend-Engineering-Standard.md) | Repository First Rule (FE-9 · §15) |
| [`GMM-001-Governance-Maturity-Model.md`](GMM-001-Governance-Maturity-Model.md) | Governance maturity alignment |
| [`IA-001`](M2-S3-Implementation-Authorization.md) | Implementation authorization boundary |
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) | Remediation / certification authority resolution — **PAD-001 – PAD-010** |

---

## 3. Architecture reference

Normative architecture is defined **only** in [`E-02-Architecture.md`](E-02-Architecture.md).

Implementation Units **shall not redefine**:

| Architecture element | Authority section |
|---------------------|-------------------|
| Freeze Authority | §3 |
| Correlation Model | §4 |
| Recovery Model | §5 |
| Freeze Contract | §6 |
| Freeze state machine | §12 |
| Atomic transaction model | §13 |

IUs **may** specify deliverables, verification, and sequencing consistent with these sections. Architecture changes require formal revision to the Architecture Authority.

---

## 4. Program objective

Implement the **Freeze Engine** that:

| Objective | Architecture reference |
|-----------|------------------------|
| Creates **one** Freeze Event per successful freeze | Single Freeze Identity · INV-8 |
| Materializes **Voter Snapshot** from live membership at freeze instant | Freeze Contract inputs/outputs |
| Materializes **Resolution Snapshot** from formal resolutions at freeze instant | Freeze Contract · INV-7 |
| Materializes **Frozen Motions** bound to resolution snapshot | Correlation Model CM-3 |
| **Commits atomically** — all artifacts or none | INV-4 · Atomic freeze model §13 |
| Produces **immutable event-linked state** post-commit | INV-1 · Recovery Model §5 |
| Maintains **backward compatibility** with legacy snapshot path | §16 · INV-6 foundation |

**Authorized CITM scope (IA-001 / Work Breakdown):** Rows **4**, **12**, **5** (freeze-path enforcement); materialization evidence for rows **1**, **2**.

---

## 5. Implementation principles

All E-02 implementation **shall** follow:

| Principle | Source |
|-----------|--------|
| **Repository First** | CES-003 FE-9 · Architecture Authority §6 |
| **Fail Closed** | Architecture Authority §3 FA-4 · §6 |
| **Atomic Commit** | INV-4 · Architecture Authority §13 |
| **Idempotent Retry** | INV-8 · Architecture Authority §13 |
| **Single Freeze Identity** | Correlation Model · Freeze Contract |
| **Single Source of Truth** | Post-commit snapshot domain authoritative for downstream (E-03) |

---

## 6. Current state

E-01 established persistence; E-02 adds **materialization orchestration**:

| Area | Current state (post E-01 / RC-011) |
|------|-------------------------------------|
| **Schema** | Freeze Event, voter/resolution snapshots, frozen motions, immutability hooks — deployed (`20261724120000`–`20261728120000`) |
| **Repository** | Read-only `FrozenMeetingBundle` in `src/lib/ownerVote/snapshotDomain/` — **not wired** to freeze orchestration |
| **Production freeze RPC** | `freeze_owner_vote_snapshot` — legacy path; delete-and-reinsert voter roll; no event-linked dual snapshot |
| **Event-linked rows** | None in production paths — E-02 introduces materialization |
| **Legacy rows** | 44 voter snapshots with `freeze_event_id IS NULL` — must remain readable |
| **Authorization / triggers** | E-04 not started — E-02 exposes callable freeze boundary only |

**Preservation rule:** Legacy freeze RPC and voting paths **must remain functional** until each E-02 phase is verified and explicitly wired. New event-linked materialization is **additive** until authorized cutover.

---

## 7. Program phases

Phases **must** execute in order **1 → 2 → 3 → 4 → 5**. Each phase is an independently reviewable engineering boundary.

```
Phase 1  Freeze Transaction Foundation
    ↓
Phase 2  Snapshot Materialization
    ↓
Phase 3  Atomic Commit & Audit
    ↓
Phase 4  Repository Integration
    ↓
Phase 5  Verification & Acceptance
    ↓
E-02 Executable Remediation Stage   ← when ACCEPTANCE_BLOCKED (authority v1.1)
    ↓
Re-Verification / Re-Validation / Certification Re-Evaluation
```

Phases **1 → 5** executed as originally authorized. The **E-02 Executable Remediation Stage** is a **bounded program-level remediation locus** — not a numbered Phase 6 — entered only on the blocked-acceptance path (§19).

---

### Phase 1 — Freeze Transaction Foundation

**Purpose:** Establish freeze orchestration foundation — Freeze Event creation, architectural precondition validation, and atomic transaction boundary — without full snapshot materialization or production wiring.

| Field | Value |
|-------|-------|
| **Architecture basis** | Freeze Authority §3 · Atomic freeze model §13 (boundary only) |
| **Blocked by** | Program entry criteria (§12) |
| **Unblocks** | Phase 2 |

**Deliverables:**

- Freeze Event identity assignment at materialization start (IU-1.1)
- Architectural precondition validation — meeting phase, authorization presence, duplicate-freeze check (IU-1.2)
- Transaction boundary scaffolding — begin / commit / rollback semantics (IU-1.3)

**Verification:**

- Freeze Event identity assignable and unique per attempt
- Validation fails closed when preconditions not met
- Transaction boundary rejects partial staging outside commit

**Completion criteria:**

- [ ] IU-1.1, IU-1.2, IU-1.3 Complete
- [ ] Phase 1 Completion + Certification issued (EPS-001)

---

### Phase 2 — Snapshot Materialization

**Purpose:** Implement materialization of voter snapshot, resolution snapshot, and frozen motions from live state at freeze instant, staged within the Phase 1 transaction boundary.

| Field | Value |
|-------|-------|
| **Architecture basis** | Freeze Contract · Correlation Model §4 |
| **Blocked by** | Phase 1 certified |
| **Unblocks** | Phase 3 |

**Deliverables:**

- Voter snapshot materialization from live membership at freeze instant (IU-2.1)
- Resolution snapshot materialization from meeting-owned formal resolutions (IU-2.2)
- Frozen motion materialization — full instrument set bound to resolution snapshot (IU-2.3)

**Verification:**

- Materialized rows correlate to single Freeze Event (CM-1–CM-6)
- Full resolution instrument set materialized — no partial motions (INV-7)
- Staged rows not durable until Phase 3 commit

**Completion criteria:**

- [ ] IU-2.1, IU-2.2, IU-2.3 Complete
- [ ] Correlation pre-check passes for staged artifacts
- [ ] Phase 2 Completion + Certification issued

---

### Phase 3 — Atomic Commit & Audit

**Purpose:** Complete the freeze transaction — atomic commit, primary audit, idempotent retry — producing committed immutable event-linked state.

| Field | Value |
|-------|-------|
| **Architecture basis** | Atomic freeze model §13 · Recovery Model §5 · INV-4, INV-5, INV-8 |
| **Blocked by** | Phase 2 certified |
| **Unblocks** | Phase 4 |

**Deliverables:**

- Atomic commit of all staged artifacts + meeting freeze marker + phase transition (IU-3.1)
- Exactly one primary freeze audit per successful commit (IU-3.2)
- Idempotent retry and concurrent attempt handling (IU-3.3)

**Verification:**

- Forced mid-transaction failure leaves no partial durable state
- Successful commit produces audit + both snapshots + motions + timestamp atomically
- Repeat freeze after commit returns existing identity — no rebuild
- Rollback on failure — meeting remains authoring (RM-1)

**Completion criteria:**

- [ ] IU-3.1, IU-3.2, IU-3.3 Complete
- [ ] INV-4, INV-5, INV-8 verified at commit boundary
- [ ] Phase 3 Completion + Certification issued

---

### Phase 4 — Repository Integration

**Purpose:** Integrate materialized freeze output with E-01 typed repository; verify read path for event-linked bundles without consumer UI wiring.

| Field | Value |
|-------|-------|
| **Architecture basis** | Repository First · Correlation Model CM-7 |
| **Blocked by** | Phase 3 certified |
| **Unblocks** | Phase 5 |

**Deliverables:**

- Repository adoption for reading committed event-linked bundles (IU-4.1)
- Integration verification — correlation preserved end-to-end (IU-4.2)

**Verification:**

- `FrozenMeetingBundle` loads event-linked materialized state correctly
- Legacy path (`freeze_event_id IS NULL`) unchanged
- No direct Supabase table access from new freeze read helpers (CES-003 §15)

**Completion criteria:**

- [ ] IU-4.1, IU-4.2 Complete
- [ ] Integration verification report issued
- [ ] Phase 4 Completion + Certification issued

**Out of scope for Phase 4:** React page wiring, RPC consumer adoption, scheduler triggers (E-04).

---

### Phase 5 — Verification & Acceptance

**Purpose:** Engineering verification, acceptance validation, Acceptance Report issuance, and Project Certification **evaluation**. **No new engineering functionality** in original IU-5.1–IU-5.4 scope.

| Field | Value |
|-------|-------|
| **Architecture basis** | Full Architecture Authority compliance check |
| **Blocked by** | Phase 4 certified |
| **Unblocks** | E-03 · E-04 **only after E-02 Project Certification issued** (§13 · §20) |

**Deliverables:**

- Engineering evidence verification (IU-5.1)
- Acceptance validation against Work Breakdown E-02 criteria (IU-5.2)
- E-02 Acceptance Report (IU-5.3)
- Project Certification evaluation (IU-5.4) — **evaluation only; issuance conditional** (§21)

**Verification:**

- Blueprint §10 sequence satisfied at evidence level
- CITM rows 4, 12 updated; rows 1, 2, 5 freeze-path evidence recorded
- Architecture Authority normative sections traced to evidence
- EPS-001 document chain complete for Phase 5 scope

**Phase 5 documentation completion criteria** *(PCQ-002 — YES WITH FOLLOW-UP):*

- [x] IU-5.1–5.4 Complete *(as of 2026-08-20)*
- [x] Acceptance Report **issued** *(v1.0 — ACCEPTANCE_BLOCKED)*
- [ ] Phase 5 Completion issued — Status **`Completed with Follow-up`**
- [ ] Phase 5 Certification issued — **scoped** (§18 · PCQ-003)

**Phase 5 Completion ≠ E-02 program exit.** Phase 5 Completion records that verification / acceptance / certification-**evaluation** work completed. It **does not** mean E-02 accepted, executable implementation complete, Project Certification issued, or E-03 authorized.

**E-02 program exit criteria** remain in §13 and require Work Breakdown executable criteria, acceptable acceptance decision, and **E-02 Project Certification issued**.

---

## 8. Implementation Units

IUs **shall** execute in phase order. Within a phase, IUs **shall** complete in numbered order before the phase closes.

### Phase 1

| IU | Title | Purpose |
|----|-------|---------|
| **IU-1.1** | Freeze Event Creation | Materialize Freeze Event identity |
| **IU-1.2** | Freeze Validation | Validate architectural preconditions before transaction |
| **IU-1.3** | Freeze Transaction Boundary | Establish atomic transaction begin / commit / rollback boundary |

### Phase 2

| IU | Title | Purpose |
|----|-------|---------|
| **IU-2.1** | Voter Snapshot Materialization | Materialize legal roll from live membership at freeze instant |
| **IU-2.2** | Resolution Snapshot Materialization | Materialize immutable resolution instrument container |
| **IU-2.3** | Frozen Motion Materialization | Materialize N frozen motions bound to resolution snapshot |

### Phase 3

| IU | Title | Purpose |
|----|-------|---------|
| **IU-3.1** | Atomic Commit | Commit all staged artifacts, meeting freeze marker, and phase transition atomically |
| **IU-3.2** | Primary Audit | Write exactly one primary freeze audit per successful commit (INV-5) |
| **IU-3.3** | Idempotent Retry | Handle repeat and concurrent freeze attempts per INV-8 |

### Phase 4

| IU | Title | Purpose |
|----|-------|---------|
| **IU-4.1** | Repository Adoption | Wire freeze read path through E-01 typed repository |
| **IU-4.2** | Integration Verification | Verify correlation and bundle load end-to-end |

### Phase 5

| IU | Title | Purpose |
|----|-------|---------|
| **IU-5.1** | Engineering Verification | Cross-check Architecture Authority, phases, schema, and evidence |
| **IU-5.2** | Acceptance Validation | Work Breakdown E-02 completion criteria checklist |
| **IU-5.3** | Acceptance Report | Task-level verification and acceptance evidence (EPS-001) |
| **IU-5.4** | Project Certification | Project Certification **evaluation** — issuance only if authority criteria met (§21) |

**IU-5.4 distinction (v1.1):**

| Outcome | Meaning |
|---------|---------|
| **IU-5.4 COMPLETED** | Project Certification **evaluation** process complete |
| **E-02 Project Certification ISSUED** | Separate deliverable — `E-02-Project-Certification.md` — only when mandatory gates pass |

**IU Completion records:** Each IU **shall** produce `{Task}-IU-{phase.unit}-Completion.md` per CES-010 and EPS-001.

**Phase plans:** Each phase **may** expand into `E-02-Phase-{n}-Implementation-Plan.md` before IU execution begins.

---

## 9. Engineering order and blocking dependencies

| Phase | Blocked by | Reason |
|-------|------------|--------|
| **2** | 1 | Transaction boundary and validation must exist before materialization staging |
| **3** | 2 | Commit requires staged snapshots and motions |
| **4** | 3 | Repository reads committed event-linked state |
| **5** | 4 | Verification requires full implementation path |

**Parallelization:** **Not recommended.** Phases 2 and 3 are tightly coupled through the atomic transaction. Phase 4 must not begin until commit path is verified.

**Downstream unblock:** E-02 Project Certification **unblocks E-03** (Voting Contract) and **E-04** (Lifecycle triggers) subject to their Implementation Plans.

---

## 10. Verification strategy

Reuse **Governance v1.3**, **EPS-001**, and **CES-003** verification conventions.

| Phase | Engineering verification | Regression verification |
|-------|-------------------------|-------------------------|
| **1** | Event identity uniqueness; validation fail-closed; transaction boundary tests | Legacy freeze RPC unchanged |
| **2** | Materialization staging; correlation pre-check; INV-7 full instrument | Slice 2 authoring unchanged |
| **3** | Atomic commit / rollback; audit once; idempotency | No partial freeze in DB on forced failure |
| **4** | Repository bundle load; legacy path parity | No consumer UI wiring regression |
| **5** | Full E-02 evidence package; Architecture Authority traceability | Existing meeting flows smoke pass |

### E-02 task-level acceptance (from Work Breakdown)

**Authority (VAQ-010 = YES — PAD-001):** Work Breakdown Task E-02 **executable completion and verification criteria are mandatory prerequisites** for E-02 Project Certification. Phase 1–4 design/readiness certification **does not substitute**.

```
NO EXECUTABLE EVIDENCE → NO EXECUTABLE PASS → NO FULL ACCEPTANCE → NO PROJECT CERTIFICATION
```

- [ ] Freeze transaction commits atomically per Blueprint §10 sequence
- [ ] Audit record generated exactly once per successful freeze
- [ ] Re-freeze cannot silently rebuild immutable snapshot
- [ ] CITM rows 4, 12 marked implemented; rows 1, 2, 5 updated with freeze-path evidence

**VAQ-007 = NO (PAD-002):** E-02 Project Certification **MUST NOT** issue while mandatory executable requirements remain NOT IMPLEMENTED / BLOCKED / unresolved mandatory PENDING EVIDENCE, or while Executable Final COMMIT Path = **BLOCKED**. No waiver from phase completion, IU completion, static evidence, 22 PASS, zero FAIL, Acceptance Report issuance, or Project Certification Evaluation completion.

---

## 11. Rollback strategy

Each phase is **independently reversible** without production impact until deployed and wired. Strategy is engineering-process only (no rollback SQL in this document).

| Phase | Stop safely | Revert |
|-------|-------------|--------|
| **1** | Do not begin Phase 2 until Phase 1 verification passes | Revert orchestration scaffolding; E-01 schema unchanged |
| **2** | Do not commit in production paths | Revert materialization logic; Phase 1 boundary remains or reverts as unit |
| **3** | Do not wire to production RPC until verified | Revert commit/audit/idempotency layer; no durable event-linked rows in production |
| **4** | Repository integration additive | Revert read wiring; committed snapshots remain |
| **5** | Documentation-only | Historical records preserved; remediation per §19 |
| **Executable Remediation Stage** | Per approved Remediation Plan | Revert per remediation IU boundary — **not** retroactive rewrite of Phase 1–4 certifications |

Per Recovery Model (Architecture Authority §5): failure before commit → rollback; failure after commit → E-06 correction only — **no** E-02 silent rebuild.

**Blocked-acceptance path:** When verification identifies mandatory executable gaps, enter **E-02 Executable Remediation Stage** (§19) — **not** silent reopening of Phase 1–4 certification history.

---

## 12. Entry criteria

Program entry **shall not** proceed until:

| Criterion | Required | Evidence |
|-----------|----------|----------|
| **E-01 Project Certification** | ✓ | [`E-01-Project-Certification.md`](E-01-Project-Certification.md) |
| **E-01 Engineering Baseline** | ✓ | [`E-01-Engineering-Baseline.md`](E-01-Engineering-Baseline.md) |
| **Architecture Authority approved** | ✓ | [`E-02-Architecture.md`](E-02-Architecture.md) v1.1 |
| **RC-011 completed** | ✓ | [`RC-011-Completion.md`](RC-011-Completion.md) |
| **IA-001 authorized** | ✓ | Task E-02 within [`IA-001`](M2-S3-Implementation-Authorization.md) |
| **EPS-001 approved** | ✓ | Document chain standard |
| **Implementation Plan approved** | ✓ | This document |

**E-02 is ready for phased engineering implementation.**

---

## 13. Exit criteria

### 13.1 E-02 program exit (full certification path)

Program exit requires **all** of:

| Criterion | Required | Notes |
|-----------|----------|-------|
| Phase 1–4 Completion + Certification | ✓ | Design/readiness scope — **immutable** |
| Phase 5 IU-5.1–5.4 Complete | ✓ | Verification / evaluation scope |
| **Acceptable acceptance decision** | ✓ | **NOT** ACCEPTANCE_BLOCKED — may require superseding Acceptance Report (§22) |
| **Work Breakdown E-02 executable completion criteria met** | ✓ | **VAQ-010 = YES** — mandatory |
| **Work Breakdown E-02 verification criteria satisfied with executable evidence** | ✓ | Runtime / executable proof where required |
| **E-02 Project Certification issued** | ✓ | `E-02-Project-Certification.md` — gate currently **CLOSED** |
| Phase 5 Completion + Certification | ✓ | Phase 5 Completion may precede Project Certification — **PCQ-002** |
| Engineering Baseline | ✓ | Post Project Certification per §16 |

### 13.2 Phase 5 documentation exit (distinct from program exit)

| Criterion | Required | Status (2026-08-20) |
|-----------|----------|---------------------|
| IU-5.1–5.4 Complete | ✓ | **MET** |
| Acceptance Report issued | ✓ | **MET** — v1.0 ACCEPTANCE_BLOCKED |
| Phase 5 Completion | ✓ | **AUTHORITY-PERMITTED** — `Completed with Follow-up` — **NOT YET ISSUED** |
| Phase 5 Certification | ✓ | **AUTHORITY-PERMITTED** after Phase 5 Completion — **NOT YET ISSUED** |

```
PHASE 5 COMPLETION ≠ E-02 PROGRAM EXIT
PHASE 5 CERTIFICATION ≠ E-02 PROJECT CERTIFICATION
```

### 13.3 E-03 gate (PAD-010)

**E-03 must not start** until **E-02 Project Certification is formally issued**.

E-03 **MUST NOT** open from: Phase 5 Completion · Phase 5 Certification · remediation start · remediation implementation · re-verification alone · Acceptance PASS alone · Project Certification Evaluation alone.

---

## 14. Boundary

| In scope (E-02) | Out of scope |
|-----------------|--------------|
| Freeze materialization orchestration | Architecture redesign |
| Atomic commit / rollback / audit | Consumer UI wiring |
| Idempotent retry at freeze boundary | Voting contract (E-03) |
| Repository read integration for materialized state | Scheduler / lifecycle triggers (E-04) |
| Verification and acceptance | Correction / reissue workflow (E-06) |
| **E-02 Executable Remediation Stage** (when authorized) | Consumer UI wiring (E-04) |
| CITM rows 4, 12, 5 freeze-path; rows 1, 2 materialization | Legacy compatibility matrix execution (E-05) |
| Re-verification / re-validation after remediation | E-04 consumer / legacy migration (EIR-077 · EIR-078) |

**E-04 boundary (PAD-009):**

```
E-02 EXECUTABLE REMEDIATION ≠ E-04 CONSUMER / LEGACY MIGRATION
```

EIR-077 · EIR-078 remain **DEFERRED TO E-04** unless PCQ-012 is resolved by future authority.

Implementation **only**. Normative architecture remains in [`E-02-Architecture.md`](E-02-Architecture.md).

---

## 15. Dependencies

### Consumes

| Dependency | What E-02 uses |
|------------|----------------|
| **E-01 Snapshot Foundation** | Schema, entities, immutability hooks, typed repository contract |
| **E-01 Engineering Baseline** | DB head `20261728120000`; extension-not-rewrite rule |
| **Architecture Authority v1.1** | Normative freeze contract |
| **Blueprint §10** | Atomic freeze sequence |

### Produces

| Output | Consumer |
|--------|----------|
| **Materialized Freeze Engine** | Callable freeze boundary with event-linked snapshots |
| **Committed immutable state** | **E-03** Voting Contract |
| **Freeze correlation identity** | **E-04** Lifecycle · Audit |

### Consumed later by

```
E-02 Materialized Freeze Engine
        ↓
    E-03 Voting Contract
        ↓
    E-04 Meeting Lifecycle (invokes E-02)
```

---

## 16. Deliverables

| Deliverable | Record pattern |
|-------------|----------------|
| **Implementation Plan** | This document |
| **Phase Plans** | `E-02-Phase-{n}-Implementation-Plan.md` *(optional per phase)* |
| **IU reports / evidence** | `E-02-IU-{phase.unit}-*.md` |
| **IU Completion** | `E-02-IU-{phase.unit}-Completion.md` |
| **Phase Completion** | `E-02-Phase-{n}-Completion.md` |
| **Phase Certification** | `E-02-Phase-{n}-Certification.md` |
| **Acceptance Report** | `E-02-Acceptance-Report.md` |
| **Program Authority Decision** | `E-02-Program-Authority-Decision.md` |
| **Executable Remediation Plan** | Next remediation planning artifact — exact filename to be established under amended Phase 5 / Program governance chain |
| **Superseding Acceptance Report** | Explicitly versioned — supersedes prior report for **forward certification authority only** (§22) |
| **Project Certification** | `E-02-Project-Certification.md` |
| **Engineering Baseline** | `E-02-Engineering-Baseline.md` *(post Project Certification)* |

Document chain per EPS-001 (Phase 5 path):

```
IU Completion → Phase Completion → Phase Certification
        ↓
Acceptance Report → Project Certification → Engineering Baseline
```

**Blocked-acceptance chain (v1.1 — §19):** adds Executable Remediation Stage, Re-Verification, Re-Validation, Superseding Acceptance Report, and Project Certification Re-Evaluation before issuance.

---

## 17. Phase output chain

### 17.1 Normal successful path

```
E-02 Phases 1–4 design/readiness certified
        ↓
E-02 Phase 5 Verification & Acceptance
        ↓
Acceptance PASS
        ↓
Project Certification Evaluation
        ↓
E-02 Project Certification
        ↓
E-02 Engineering Baseline
        ↓
E-03 authorized (subject to E-03 Implementation Plan)
```

### 17.2 Blocked path (current — v1.1 authority)

```
E-02 Phases 1–4 design/readiness certified          ← immutable
        ↓
E-02 Phase 5 — IU-5.1–5.4 COMPLETED                 ← immutable
        ↓
Acceptance Report v1.0 = ACCEPTANCE_BLOCKED         ← immutable
        ↓
Project Certification Evaluation = BLOCKED          ← immutable
        ↓
Program Authority Decision = APPROVED
        ↓
Program Plan v1.1 = THIS AMENDMENT
        ↓
Phase 5 Plan authority amendment                    ← NEXT
        ↓
Phase 5 Completion / Certification (scoped)         ← permitted, not yet issued
        ↓
E-02 Executable Remediation Plan                    ← after Phase 5 Plan amendment
        ↓
Approved Executable Remediation IUs
        ↓
executable / runtime evidence
        ↓
Engineering Re-Verification → Acceptance Re-Validation
        ↓
Superseding Acceptance Report
        ↓
Project Certification Re-Evaluation
        ↓
E-02 Project Certification (only if mandatory gates pass)
        ↓
E-02 Engineering Baseline → E-03
```

If gates still fail: **return to Executable Remediation** OR **remain PROJECT_CERTIFICATION_BLOCKED**.

**Rules:** NO AUTOMATIC PASS · NO COMPLETION-BASED STATUS PROPAGATION · NO SCORE-BASED CERTIFICATION.

---

## 18. Program status model (v1.1)

The following states **shall** be distinguished:

| # | State | ≠ |
|---|-------|---|
| 1 | Phase/IU design-readiness completion | executable implementation |
| 2 | Engineering Verification | Acceptance PASS |
| 3 | Acceptance Validation | Project Certification |
| 4 | Acceptance Report issuance | Acceptance PASS |
| 5 | Project Certification Evaluation completed | Project Certification issued |
| 6 | Executable Remediation **established in authority** | Executable Remediation **authorized / implemented** |
| 7 | Engineering Re-Verification | retroactive IU-5.1 edit |
| 8 | Acceptance Re-Validation | retroactive IU-5.2 edit |
| 9 | Superseding Acceptance Report | deletion of v1.0 history |
| 10 | Project Certification Re-Evaluation | automatic change to IU-5.4 blocked determination |
| 11 | E-02 Project Certification issued | E-02 program exit alone |
| 12 | E-03 hand-off | Phase 5 Certification alone |

**Locked equivalences prohibited:**

```
PHASE COMPLETION ≠ PROJECT CERTIFICATION
PHASE CERTIFICATION ≠ PROJECT CERTIFICATION
ACCEPTANCE REPORT ISSUED ≠ ACCEPTANCE PASS
PROJECT CERTIFICATION EVALUATION COMPLETED ≠ PROJECT CERTIFICATION ISSUED
REMEDIATION IMPLEMENTED ≠ REMEDIATION VERIFIED
EXECUTABLE PASS requires executable evidence
```

---

## 19. E-02 Executable Remediation Stage

### 19.1 Authority name (exact)

```
E-02 Executable Remediation Stage
```

**Prohibited names at Program Plan level:** Phase 6 · Phase ER · E-03 · new E-number.

### 19.2 Definition

A **bounded E-02 program-level remediation locus** entered when Phase 5 verification / acceptance identifies **mandatory executable obligations** that prevent E-02 Project Certification under VAQ-010 and VAQ-007.

**Purpose:** Implement and verify executable mechanisms required to close mandatory E-02 certification blockers **without rewriting** historical design/readiness certifications.

### 19.3 Authorization boundary

| Status | Meaning |
|--------|---------|
| **Stage established in Program Authority** | **YES** — PAD-003 · this §19 |
| **Executable work authorized** | **NO** — requires subsequent chain |

Executable work remains **prohibited** until:

1. [`E-02-Phase-5-Implementation-Plan.md`](E-02-Phase-5-Implementation-Plan.md) authority amendment completed;
2. E-02 Executable Remediation Plan created and approved;
3. Applicable remediation IU design / review authority completed.

```
PROGRAM PLAN v1.1
≠ EXECUTABLE REMEDIATION AUTHORIZATION
```

### 19.4 Program-level scope (categories only)

The Stage **may** contain work necessary to close mandatory certification blockers including:

- Primary Audit physical persistence / runtime evidence
- atomic server-side transaction authority
- durable ownership / orchestration
- durable reconciliation
- full property_id correlation enforcement
- runtime freeze orchestration
- Runtime COMMITTED authority / evidence
- required executable CITM evidence
- mandatory pending external evidence **where later authority requires it**

**NOT defined at Program Plan level:** table schema · migration SQL · RPC signatures · transaction implementation · ownership schema · reconciliation schema · retry algorithms · exact IU count · exact IU ordering · file changes — **remediation planning / design only**.

### 19.5 VAQ-003 boundary (PAD-004)

**VAQ-003 = RESOLVED AT AUTHORITY LEVEL.** Detailed engineering sequencing **SHALL** be established by approved remediation design under Architecture Authority.

**Preserved architectural principles (binding — not a hard-coded IU sequence):**

```
NO PRIMARY AUDIT → NO COMMITTED FREEZE
COMMIT_OUTCOME_UNCERTAIN → DURABLE RECONCILIATION FIRST
UNIQUE INDEX ≠ OWNERSHIP ORCHESTRATION
```

---

## 20. Resolved authority questions (v1.1)

| ID | Disposition | Source |
|----|-------------|--------|
| **VAQ-010** | **YES** — Work Breakdown executable criteria mandatory for Project Certification | PAD-001 · §10 |
| **VAQ-007** | **NO** — Project Certification not permitted while mandatory executable gates blocked | PAD-002 · §10 |
| **VAQ-001** | **E-02 Executable Remediation Stage established** | PAD-003 · §19 |
| **VAQ-003** | **Authority locus resolved** — detailed sequencing deferred to remediation design | PAD-004 · §19.5 |
| **PCQ-002** | **YES WITH FOLLOW-UP** — Phase 5 Completion permitted; Status `Completed with Follow-up` | PAD-005 · Phase 5 § |
| **PCQ-003** | **YES SCOPED** — Phase 5 Certification ≠ E-02 Project Certification | PAD-006 · §18 |

---

## 21. Project Certification gate

### 21.1 Evaluation vs issuance

| Term | Current state (2026-08-20) |
|------|----------------------------|
| **Project Certification Evaluation** | **COMPLETED** — PROJECT_CERTIFICATION_BLOCKED |
| **E-02 Project Certification issuance** | **NOT ISSUED** — gate **CLOSED** |

### 21.2 Future issuance prerequisites

E-02 Project Certification **may** issue only when **all** mandatory requirements are met:

1. Mandatory executable requirements **implemented**
2. Required **executable evidence** obtained
3. Authorized **Engineering Re-Verification**
4. Authorized **Acceptance Re-Validation**
5. Acceptable **Superseding Acceptance Report**
6. **Project Certification Re-Evaluation**
7. All mandatory **certification gates** satisfied
8. All mandatory **authority decisions** resolved (including open PCQ where applicable)

---

## 22. Re-verification, re-validation, and superseding acceptance

### 22.1 Engineering Re-Verification

**Not** retroactive editing of IU-5.1. A **new forward verification cycle** after executable remediation.

| Rule | Requirement |
|------|-------------|
| Preserve original EIR history | **YES** — IU-5.1 record immutable |
| Consume new executable evidence | **YES** |
| Reclassify NI/BLOCKED/PENDING only with evidence | **YES** |
| Produce new traceable verification result set | **YES** |

```
OLD EIR STATUS + NEW CODE ≠ AUTOMATIC NEW PASS
NEW EXECUTABLE EVIDENCE + AUTHORIZED RE-VERIFICATION = possible forward reclassification
```

### 22.2 Acceptance Re-Validation

**Not** retroactive editing of IU-5.2. Consumes: original acceptance baseline · remediation evidence · Re-Verification results · still-open blockers · authority decisions.

If mandatory blockers remain: **ACCEPTANCE_BLOCKED** remains valid. If all mandatory gates satisfied: new acceptance decision **may** be issued — **no inference**.

### 22.3 Superseding Acceptance Report

| Requirement | Rule |
|-------------|------|
| Explicitly versioned | **YES** |
| States which report superseded for **forward certification** | **YES** |
| Preserves v1.0 as historical record | **YES** |
| Includes new verification evidence and remaining blockers | **YES** |

```
SUPERSEDE FOR FORWARD AUTHORITY ≠ DELETE OR REWRITE HISTORY
```

### 22.4 Project Certification Re-Evaluation

**New evaluation** after remediation and re-validation. **Does not** automatically change IU-5.4 historical blocked determination. Consumes: remediation completion · Re-Verification · Re-Validation · Superseding Report · remaining PCG/PCB/PCL/authority questions.

---

## 23. Historical record preservation

The following are **immutable historical records**:

| Record | Rule |
|--------|------|
| Phase 1–4 Certifications | Immutable |
| IU-5.1 · IU-5.2 · IU-5.3 · IU-5.4 Completions | Immutable |
| [`E-02-Acceptance-Report.md`](E-02-Acceptance-Report.md) v1.0 | Immutable — ACCEPTANCE_BLOCKED preserved |
| Original IU-5.1 EIR classifications | Immutable |
| Original IU-5.4 Project Certification Evaluation | Immutable — BLOCKED preserved |

Future changed status **must** be represented by: new evidence · new verification · new acceptance validation · superseding report · new certification evaluation.

```
NOT IMPLEMENTED → PASS   requires NEW EXECUTABLE EVIDENCE + AUTHORIZED RE-VERIFICATION
BLOCKED → PASS           requires NEW EXECUTABLE EVIDENCE + AUTHORIZED RE-VERIFICATION
```

---

## 24. Authority questions remaining open

| # | ID / Topic | Status |
|---|------------|--------|
| 1 | **PCQ-010** — EIR-048 / EIR-054 pre-certification evidence threshold | **OPEN** |
| 2 | **PCQ-011** — executable acceptance threshold for CITM partial rows 1 / 2 / 5 | **OPEN** |
| 3 | **PCQ-012** — E-04 deferred obligations vs E-02 certification prerequisite | **OPEN** |
| 4 | Production deployment certification threshold | **OPEN** |
| 5 | Exact remediation IU decomposition | **OPEN** |
| 6 | Detailed remediation engineering sequencing | **OPEN** |
| 7 | Schema / RPC / orchestration design | **OPEN** |

---

## 25. Current program status (as of 2026-08-20)

| Item | Status |
|------|--------|
| E-02 Phase 1–4 | **CERTIFIED COMPLETE** (design/readiness) |
| Phase 5 IU | **4 / 4 COMPLETED** |
| Acceptance Report v1.0 | **ISSUED** |
| E-02 Acceptance | **ACCEPTANCE_BLOCKED** |
| Project Certification Evaluation | **PROJECT_CERTIFICATION_BLOCKED** / **AUTHORITY_GATED** |
| Program Authority Decision | **APPROVED** |
| E-02 Executable Remediation Stage | **ESTABLISHED IN AUTHORITY** |
| Executable Remediation | **NOT YET AUTHORIZED** |
| Phase 5 Completion | **AUTHORITY-PERMITTED** / **NOT YET ISSUED** |
| Phase 5 Certification | **AUTHORITY-PERMITTED AFTER COMPLETION** / **NOT YET ISSUED** |
| E-02 Project Certification | **NOT ISSUED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Executable Final COMMIT Path | **BLOCKED** |
| E-03 | **BLOCKED** |
| E-04 | **NOT STARTED** |

---

## 26. Next governance sequence

```
E-02 Program Authority Decision = APPROVED
        ↓
E-02 Implementation Plan v1.1 = THIS AMENDMENT
        ↓
NEXT: E-02 Phase 5 Implementation Plan authority amendment
        ↓
THEN: Phase 5 Completion / Certification documentation (per PAD authority)
      AND/OR remediation planning per §17.2
        ↓
E-02 Executable Remediation Plan (exact filename per amended governance chain)
        ↓
Remediation Design / Review chain
        ↓
Executable work only after explicit IU authorization
```

**Do not treat Phase 5 Completion, remediation planning, or this amendment as Project Certification or E-03 unlock.**

---

## Document control

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Plan |
| **Program** | E-02 — Freeze Engine |
| **Status** | Approved |
| **Revision** | **v1.1** |
| **Program Authority Amendment** | 2026-08-20 — [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) |
| **Authoritative Source** | [`E-02-Architecture.md`](E-02-Architecture.md) v1.1 |
| **Verified** | YES |
| **Supersedes** | v1.0 (content preserved — see §0) |
| **Next Governance Action** | [`E-02-Phase-5-Implementation-Plan.md`](E-02-Phase-5-Implementation-Plan.md) authority amendment |
| **Production Effect** | None |

**Related:** [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) · [`E-01-Project-Certification.md`](E-01-Project-Certification.md) · [`M2-S3-Engineering-Work-Breakdown.md`](M2-S3-Engineering-Work-Breakdown.md) · [`ER-001`](ER-001-M2-S3-Blueprint-Review.md) · [`EPS-001`](EPS-001-Engineering-Phase-Documentation-Standard.md)
