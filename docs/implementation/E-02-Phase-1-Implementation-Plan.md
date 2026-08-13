# E-02 Phase 1 — Freeze Transaction Foundation Implementation Plan

| Field | Value |
|-------|-------|
| **Document Type** | Phase Implementation Plan |
| **Program** | E-02 — Freeze Engine |
| **Phase** | Phase 1 — Freeze Transaction Foundation |
| **Status** | **Approved** |
| **Revision** | v1.0 |
| **Authoritative Source** | [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) v1.0 |
| **Architecture Authority** | [`E-02-Architecture.md`](E-02-Architecture.md) v1.1 |
| **Verified** | **YES** |
| **Supersedes** | None |
| **Next Document** | [`E-02-IU-1.1-Implementation.md`](E-02-IU-1.1-Implementation.md) |
| **Task** | E-02 Freeze Engine |
| **Milestone** | M2-S3 — Snapshot Freeze |
| **Production Effect** | **None** |

> **Scope lock:** Phase 1 establishes freeze transaction foundation only — Freeze Event identity, precondition validation, and transaction boundary. **No snapshot persistence**, commit, primary audit, or production wiring is authorized in this phase.

---

## 1. Purpose

Define the **engineering execution plan** for **E-02 Phase 1 — Freeze Transaction Foundation**.

Phase 1 establishes the **transaction foundation** required before any snapshot materialization may occur. This document **shall implement** the approved Architecture Authority. It **shall not redefine** architecture decisions contained in [`E-02-Architecture.md`](E-02-Architecture.md).

Phase 1 expands parent plan §Phase 1 ([`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md)) into executable Implementation Units with explicit deliverables, verification, and exit criteria per [`EPS-001`](EPS-001-Engineering-Phase-Documentation-Standard.md).

---

## 2. Authoritative inputs

| Input | Role |
|-------|------|
| [`M2-S3-Snapshot-Freeze-Design.md`](M2-S3-Snapshot-Freeze-Design.md) | Blueprint §8 invariants · §9 domain · §10 transaction concept |
| [`E-02-Architecture.md`](E-02-Architecture.md) v1.1 | Architecture Authority — Freeze Authority · Correlation Model · Recovery Model · Freeze Contract · state machine · atomic model |
| [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) v1.0 | Parent program plan — phase sequence and IU registry |
| [`E-01-Project-Certification.md`](E-01-Project-Certification.md) | Certified persistence foundation |
| [`E-01-Engineering-Baseline.md`](E-01-Engineering-Baseline.md) | Schema head `20261728120000`; extension rule |
| [`ENGINEERING-GOVERNANCE-v1.3.md`](ENGINEERING-GOVERNANCE-v1.3.md) | GR-7 · GR-8 |
| [`EPS-001-Engineering-Phase-Documentation-Standard.md`](EPS-001-Engineering-Phase-Documentation-Standard.md) | IU / Phase Completion / Certification chain |
| [`CES-003-Frontend-Engineering-Standard.md`](CES-003-Frontend-Engineering-Standard.md) | Repository First (deferred to Phase 4) |

---

## 3. Phase objective

Establish the **transaction foundation** required for Freeze Engine execution.

| Deliverable | Phase 1 outcome |
|-------------|-----------------|
| **Freeze Event identity** | Assignable, unique correlation root per freeze attempt |
| **Freeze validation** | Architectural precondition pipeline before transaction open |
| **Atomic transaction boundary** | Open · rollback · commit hand-off scope defined and implemented |

**Explicit exclusion:** **No snapshot persistence** is performed in Phase 1. Voter snapshot, resolution snapshot, and frozen motion rows are **not** materialized or durably written. Commit and primary audit belong to Phase 3.

---

## 4. Phase boundary

### In scope

| Item | Architecture basis |
|------|-------------------|
| Freeze Event creation (identity lifecycle) | Correlation Model CM-4 · INV-8 foundation |
| Precondition validation | Freeze Authority §3 FA-3 · FA-4 |
| Transaction lifecycle (open / rollback / hand-off) | Atomic freeze model §13 · Recovery Model §5 |
| Transaction ownership | State machine §12 — Preparing → Materializing entry |
| Rollback boundary | Recovery Model RM-1 |
| Idempotent transaction entry | INV-8 · Idempotent Retry |

### Out of scope

| Item | Owner / phase |
|------|---------------|
| Snapshot materialization (voter / resolution / motions) | **Phase 2** |
| Atomic commit | **Phase 3** (IU-3.1) |
| Primary audit | **Phase 3** (IU-3.2) |
| Idempotent retry after commit | **Phase 3** (IU-3.3) |
| Repository adoption | **Phase 4** |
| Voting contract | **E-03** |
| Scheduler / lifecycle triggers | **E-04** |
| Consumer UI / RPC wiring to production paths | **E-04** + authorized work |
| Correction / reissue | **E-06** |

Verified that Phase 1 does **not** modify production freeze behavior, voting submit paths, or legacy snapshot rows until explicitly authorized in later phases.

---

## 5. Program invariants (Phase 1)

Phase 1 **shall preserve** the following program invariants:

| ID | Invariant | Requirement |
|----|-----------|-------------|
| **PI-1** | **Single Freeze Identity** | One correlation root (Freeze Event identity) per freeze attempt; no duplicate primary identity assignment |
| **PI-2** | **Single Transaction Boundary** | One orchestration-owned transaction scope per active freeze attempt |
| **PI-3** | **Fail Closed** | Missing authorization or failed preconditions → no transaction open; no durable freeze side effects |
| **PI-4** | **No Partial Freeze** | Rollback boundary enforced — no meeting freeze marker, no durable snapshot artifacts, no phase transition |
| **PI-5** | **No Snapshot Persistence** | Phase 1 **shall not** insert or commit voter, resolution, or frozen motion rows |

These invariants are **phase-scoped** enforcement of Architecture Authority §3–§6 and §13. They do **not** replace Blueprint INV-* definitions.

---

## 6. Program risks

| ID | Risk | Mitigation |
|----|------|------------|
| **R-001** | **Duplicate Freeze Request** | Idempotent entry at transaction boundary — detect existing committed freeze; reject or return existing identity per Architecture Authority §13 |
| **R-002** | **Invalid Meeting State** | Precondition validation pipeline (IU-1.2) — meeting phase, resolution readiness, eligibility gates before transaction open |
| **R-003** | **Concurrent Freeze** | Single transaction ownership per meeting — one winner; others receive conflict or idempotent outcome (IU-1.3) |
| **R-004** | **Rollback Failure** | Transaction boundary (IU-1.3) — explicit rollback rules; no commit hand-off until Phase 3; forced failure tests in verification |

---

## 7. Implementation Units

IUs **shall** execute in order **1.1 → 1.2 → 1.3**. Each IU closes with its Completion record before the next begins.

---

### IU-1.1 — Freeze Event Creation

| Field | Value |
|-------|-------|
| **Purpose** | Create and validate the unique **Freeze Event identity** as correlation root |
| **Production Effect** | **None** until deployed and verified |
| **Deliverable** | [`E-02-IU-1.1-Implementation.md`](E-02-IU-1.1-Implementation.md) |
| **IU Completion** | `E-02-IU-1.1-Completion.md` |

**Deliverables:**

| Deliverable | Description |
|-------------|-------------|
| **Freeze identity lifecycle** | Candidate identity assignment at freeze attempt start; terminal binding on later commit (Phase 3) |
| **Identity uniqueness** | Globally unique per successful freeze boundary (INV-8 foundation) |
| **Correlation root** | All subsequent Phase 2–3 artifacts **shall** reference this identity (Correlation Model CM-4) |

**Entry criteria:**

| Criterion | Required |
|-----------|----------|
| Phase 1 plan approved | ✓ |
| E-01 `owner_vote_freeze_events` entity available | ✓ ([`E-01-Engineering-Baseline.md`](E-01-Engineering-Baseline.md)) |
| Architecture Authority Freeze Contract reviewed | ✓ |

**Exit criteria:**

| Criterion | Required |
|-----------|----------|
| Freeze Event identity assignable in test/staging path | ✓ |
| Uniqueness policy enforced for primary event per meeting boundary | ✓ |
| No snapshot rows persisted in IU-1.1 scope | ✓ (PI-5) |
| IU Completion record issued | ✓ |

**Verification:**

| Check | Method |
|-------|--------|
| Identity assignment | Engineering test — candidate event id created for valid freeze attempt |
| Duplicate primary event rejected | Negative test — second identity assignment blocked when committed event exists |
| Correlation root documented | Implementation record cites CM-1, CM-4 |

---

### IU-1.2 — Freeze Validation

| Field | Value |
|-------|-------|
| **Purpose** | Validate all **architectural preconditions** before opening the transaction |
| **Production Effect** | **None** |
| **Deliverable** | `E-02-IU-1.2-Implementation.md` |
| **IU Completion** | `E-02-IU-1.2-Completion.md` |

**Validation scope:**

| Scope | Validates |
|-------|-----------|
| **Meeting state** | Meeting in authoring / freeze-eligible phase; not already committed frozen per boundary |
| **Authorization context** | Authorization supplied by upstream workflow — E-02 does **not** determine authorization (FA-1, FA-2) |
| **Snapshot eligibility** | Resolution set completeness pre-check; membership readable at freeze instant (read only — no persist) |
| **Conflict detection** | Concurrent attempt detection; existing committed freeze detection |

**Failure model:**

| Failure | Response |
|---------|----------|
| Authorization absent or invalid | Fail closed — no transaction open (FA-4) |
| Meeting not freeze-eligible | Fail closed — Failed state; diagnostic reason |
| Resolution incomplete | Fail closed — no transaction open |
| Committed freeze exists | Idempotent path or explicit conflict — no new primary identity |

**Entry criteria:**

| Criterion | Required |
|-----------|----------|
| IU-1.1 Complete | ✓ |

**Exit criteria:**

| Criterion | Required |
|-----------|----------|
| Validation pipeline executes before transaction open | ✓ |
| All failure classes fail closed (PI-3) | ✓ |
| No snapshot persistence on validation path | ✓ (PI-5) |
| IU Completion record issued | ✓ |

**Verification:**

| Check | Method |
|-------|--------|
| Valid preconditions pass | Positive test — validation succeeds for eligible meeting |
| Invalid meeting state rejected | Negative test — R-002 |
| Missing authorization rejected | Negative test — FA-4 |
| No durable side effects on failure | DB inspection — no freeze marker, no snapshot rows |

---

### IU-1.3 — Freeze Transaction Boundary

| Field | Value |
|-------|-------|
| **Purpose** | Define and implement the **transaction scope** — open, rollback, commit hand-off |
| **Production Effect** | **None** until deployed and verified |
| **Deliverable** | `E-02-IU-1.3-Implementation.md` |
| **IU Completion** | `E-02-IU-1.3-Completion.md` |

**Deliverables:**

| Deliverable | Description |
|-------------|-------------|
| **Transaction open** | Boundary opens after IU-1.2 validation succeeds; enters Materializing-ready state |
| **Rollback rules** | Mandatory rollback on any failure before commit hand-off (RM-1, PI-4) |
| **Commit hand-off** | Boundary defines what Phase 3 commit **shall** receive — staged context only; Phase 1 does **not** commit |
| **Failure handling** | Map failures to Failed state; preserve authoring meeting phase |
| **Retry entry** | New Pending attempt permitted after rollback if upstream authorizes (RM-2) |

**Entry criteria:**

| Criterion | Required |
|-----------|----------|
| IU-1.2 Complete | ✓ |

**Exit criteria:**

| Criterion | Required |
|-----------|----------|
| Transaction open / rollback semantics implemented | ✓ |
| Rollback boundary documented and tested | ✓ |
| Commit hand-off interface defined for Phase 2–3 | ✓ |
| Concurrent ownership policy implemented (R-003) | ✓ |
| No commit or audit in Phase 1 scope | ✓ |
| IU Completion record issued | ✓ |

**Verification:**

| Check | Method |
|-------|--------|
| Transaction opens only after validation | Integration test |
| Forced failure triggers full rollback | Negative test — R-004; PI-4 |
| No partial durable state after rollback | DB inspection |
| Idempotent entry on duplicate request | Test — R-001 |
| Legacy freeze RPC unchanged | Regression smoke |

---

## 8. Phase dependencies

### Consumes

| Dependency | Phase 1 use |
|------------|-------------|
| **Architecture Authority** | Normative Freeze Authority, Correlation Model, Recovery Model, Freeze Contract |
| **E-01 Foundation** | Freeze Event entity schema; no schema changes in Phase 1 unless separately authorized |
| **Program Implementation Plan** | Phase sequence and boundary |

### Produces

| Output | Consumer |
|--------|----------|
| **Ready-to-materialize transaction** | **Phase 2** — Snapshot Materialization (IU-2.1–2.3) |

```
Phase 1 (this phase)
    ↓
Validated freeze attempt + open transaction boundary + Freeze Event identity
    ↓
Phase 2 Materialization (staging within boundary)
    ↓
Phase 3 Commit & Audit
```

---

## 9. Success criteria

Phase 1 is **complete** when:

| Criterion | Status |
|-----------|--------|
| **Freeze Event identity** is defined and assignable | Required |
| **Validation pipeline** is complete and fail-closed | Required |
| **Transaction boundary** is established with open / rollback / commit hand-off | Required |
| **Rollback boundary** is documented and verified | Required |
| **Ready for Phase 2** Materialization | Required |
| PI-1 through PI-5 preserved | Required |
| Phase 1 Completion + Certification issued | Required |

---

## 10. Entry criteria

Phase 1 **shall not** begin until:

| Criterion | Evidence |
|-----------|----------|
| **Architecture Authority approved** | [`E-02-Architecture.md`](E-02-Architecture.md) v1.1 |
| **Program Implementation Plan approved** | [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) v1.0 |
| **E-01 Certified Complete** | [`E-01-Project-Certification.md`](E-01-Project-Certification.md) · [`E-01-Engineering-Baseline.md`](E-01-Engineering-Baseline.md) |
| **RC-011 completed** | [`RC-011-Completion.md`](RC-011-Completion.md) |
| **Phase 1 Implementation Plan approved** | This document |

---

## 11. Exit criteria

Phase 1 is **complete** only when:

| Criterion | Required |
|-----------|----------|
| **IU-1.1 Complete** | ✓ |
| **IU-1.2 Complete** | ✓ |
| **IU-1.3 Complete** | ✓ |
| **Phase 1 Completion** record issued | ✓ — `E-02-Phase-1-Completion.md` |
| **Phase 1 Certification** issued | ✓ — `E-02-Phase-1-Certification.md` |

**Downstream gate:** **Phase 2 must not start** until Phase 1 Certification is issued.

---

## 12. Deliverables

| Deliverable | Record |
|-------------|--------|
| **Phase Implementation Plan** | This document |
| **IU-1.1 Implementation + Completion** | `E-02-IU-1.1-Implementation.md` · `E-02-IU-1.1-Completion.md` |
| **IU-1.2 Implementation + Completion** | `E-02-IU-1.2-Implementation.md` · `E-02-IU-1.2-Completion.md` |
| **IU-1.3 Implementation + Completion** | `E-02-IU-1.3-Implementation.md` · `E-02-IU-1.3-Completion.md` |
| **Phase Completion** | `E-02-Phase-1-Completion.md` |
| **Phase Certification** | `E-02-Phase-1-Certification.md` |

---

## 13. Phase output chain

```
IU-1.1 Freeze Event Creation
        ↓
IU-1.2 Freeze Validation
        ↓
IU-1.3 Freeze Transaction Boundary
        ↓
E-02-Phase-1-Completion.md
        ↓
E-02-Phase-1-Certification.md
        ↓
E-02 Phase 2 — Snapshot Materialization
```

---

## Document control

| Field | Value |
|-------|-------|
| **Document Type** | Phase Implementation Plan |
| **Program** | E-02 Phase 1 |
| **Status** | Approved |
| **Revision** | v1.0 |
| **Authoritative Source** | [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) v1.0 |
| **Architecture Authority** | [`E-02-Architecture.md`](E-02-Architecture.md) v1.1 |
| **Verified** | YES |
| **Supersedes** | None |
| **Next Document** | [`E-02-IU-1.1-Implementation.md`](E-02-IU-1.1-Implementation.md) |
| **Production Effect** | None |

**Related:** [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) · [`E-01-Project-Certification.md`](E-01-Project-Certification.md) · [`EPS-001`](EPS-001-Engineering-Phase-Documentation-Standard.md)
