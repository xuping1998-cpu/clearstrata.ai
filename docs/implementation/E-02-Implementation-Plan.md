# E-02 — Freeze Engine Implementation Plan

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Plan |
| **Program** | E-02 — Freeze Engine |
| **Status** | **Approved** |
| **Revision** | v1.0 |
| **Authoritative Source** | [`E-02-Architecture.md`](E-02-Architecture.md) (Architecture Authority v1.1) |
| **Verified** | **YES** |
| **Supersedes** | None |
| **Next Document** | [`E-02-Phase-1-Implementation-Plan.md`](E-02-Phase-1-Implementation-Plan.md) |
| **Task** | E-02 Freeze Engine |
| **Milestone** | M2-S3 — Snapshot Freeze |
| **Authority** | [`IA-001`](M2-S3-Implementation-Authorization.md) · [`M2-S3-Engineering-Work-Breakdown.md`](M2-S3-Engineering-Work-Breakdown.md) — Task E-02 |
| **Blueprint** | [`M2-S3-Snapshot-Freeze-Design.md`](M2-S3-Snapshot-Freeze-Design.md) §10 |
| **Production Effect** | **None** from this document — production changes only when phased implementation is deployed and verified |

> **Document class:** Engineering execution order only. Implements the approved Architecture Authority. Does **not** redesign architecture, modify the Blueprint, ER-001, IA-001, or the Work Breakdown, or contain implementation code.

---

## Authoritative Source

| Field | Value |
|-------|-------|
| **Implementation Plan** | [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) |
| **Architecture Authority** | [`E-02-Architecture.md`](E-02-Architecture.md) v1.1 |
| **Revision** | v1.0 |
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
```

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

**Purpose:** Engineering verification, acceptance validation, Acceptance Report, and E-02 Project Certification. **No new engineering functionality.**

| Field | Value |
|-------|-------|
| **Architecture basis** | Full Architecture Authority compliance check |
| **Blocked by** | Phase 4 certified |
| **Unblocks** | E-03 · E-04 (subject to their plans) |

**Deliverables:**

- Engineering evidence verification (IU-5.1)
- Acceptance validation against Work Breakdown E-02 criteria (IU-5.2)
- E-02 Acceptance Report (IU-5.3)
- E-02 Project Certification (IU-5.4)

**Verification:**

- Blueprint §10 sequence satisfied
- CITM rows 4, 12 updated; rows 1, 2, 5 freeze-path evidence recorded
- Architecture Authority normative sections traced to evidence
- EPS-001 document chain complete

**Completion criteria:**

- [ ] IU-5.1–5.4 Complete
- [ ] Acceptance Report approved
- [ ] E-02 Project Certification issued
- [ ] Phase 5 Completion + Certification issued

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
| **IU-5.4** | Project Certification | E-02 task closed within approved scope |

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

- [ ] Freeze transaction commits atomically per Blueprint §10 sequence
- [ ] Audit record generated exactly once per successful freeze
- [ ] Re-freeze cannot silently rebuild immutable snapshot
- [ ] CITM rows 4, 12 marked implemented; rows 1, 2, 5 updated with freeze-path evidence

---

## 11. Rollback strategy

Each phase is **independently reversible** without production impact until deployed and wired. Strategy is engineering-process only (no rollback SQL in this document).

| Phase | Stop safely | Revert |
|-------|-------------|--------|
| **1** | Do not begin Phase 2 until Phase 1 verification passes | Revert orchestration scaffolding; E-01 schema unchanged |
| **2** | Do not commit in production paths | Revert materialization logic; Phase 1 boundary remains or reverts as unit |
| **3** | Do not wire to production RPC until verified | Revert commit/audit/idempotency layer; no durable event-linked rows in production |
| **4** | Repository integration additive | Revert read wiring; committed snapshots remain |
| **5** | Documentation-only | Update CITM status if E-02 reopened |

Per Recovery Model (Architecture Authority §5): failure before commit → rollback; failure after commit → E-06 correction only — **no** E-02 silent rebuild.

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

Program exit requires:

| Criterion | Required |
|-----------|----------|
| Phase 1–4 Completion + Certification | ✓ |
| Phase 5 IU-5.1–5.4 Complete | ✓ |
| **Acceptance Report approved** | ✓ |
| **E-02 Project Certification issued** | ✓ |
| Phase 5 Completion + Certification | ✓ |
| Work Breakdown E-02 completion criteria met | ✓ |

**Downstream gate:** **E-03 must not start** until E-02 Project Certification is approved.

---

## 14. Boundary

| In scope (E-02) | Out of scope |
|-----------------|--------------|
| Freeze materialization orchestration | Architecture redesign |
| Atomic commit / rollback / audit | Consumer UI wiring |
| Idempotent retry at freeze boundary | Voting contract (E-03) |
| Repository read integration for materialized state | Scheduler / lifecycle triggers (E-04) |
| Verification and acceptance | Correction / reissue workflow (E-06) |
| CITM rows 4, 12, 5 freeze-path; rows 1, 2 materialization | Legacy compatibility matrix execution (E-05) |

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
| **Project Certification** | `E-02-Project-Certification.md` |
| **Engineering Baseline** | `E-02-Engineering-Baseline.md` *(post Project Certification)* |

Document chain per EPS-001:

```
IU Completion → Phase Completion → Phase Certification
        ↓
Acceptance Report → Project Certification → Engineering Baseline
```

---

## 17. Phase output chain

Successful program completion produces:

```
E-02 Phases 1–4 implemented and certified
        ↓
E-02 Phase 5 Verification & Acceptance
        ↓
E-02 Acceptance Report
        ↓
E-02 Project Certification
        ↓
E-02 Snapshot Freeze Engine — Certified Complete
        ↓
E-03 authorized to begin (subject to E-03 Implementation Plan)
```

---

## Document control

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Plan |
| **Program** | E-02 — Freeze Engine |
| **Status** | Approved |
| **Revision** | v1.0 |
| **Authoritative Source** | [`E-02-Architecture.md`](E-02-Architecture.md) v1.1 |
| **Verified** | YES |
| **Supersedes** | None |
| **Next Document** | [`E-02-Phase-1-Implementation-Plan.md`](E-02-Phase-1-Implementation-Plan.md) |
| **Production Effect** | None |

**Related:** [`E-01-Project-Certification.md`](E-01-Project-Certification.md) · [`M2-S3-Engineering-Work-Breakdown.md`](M2-S3-Engineering-Work-Breakdown.md) · [`ER-001`](ER-001-M2-S3-Blueprint-Review.md) · [`EPS-001`](EPS-001-Engineering-Phase-Documentation-Standard.md)
