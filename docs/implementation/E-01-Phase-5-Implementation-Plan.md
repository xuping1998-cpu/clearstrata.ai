# E-01 Phase 5 — Verification & Acceptance Implementation Plan

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Plan |
| **Phase** | E-01 Phase 5 — Verification & Acceptance |
| **Status** | **Approved** |
| **Revision** | v1.0 |
| **Authoritative Source** | [`E-01-Implementation-Plan.md`](E-01-Implementation-Plan.md) v1.0 |
| **Supersedes** | None |
| **Next Document** | [`E-01-IU-5.1-Engineering-Evidence-Verification.md`](E-01-IU-5.1-Engineering-Evidence-Verification.md) |
| **Production Effect** | **None** |
| **Task** | E-01 Snapshot Foundation |
| **Milestone** | M2-S3 — Snapshot Freeze |
| **Approved** | 2026-08-02 |

> **Scope lock:** Phase 5 completes engineering verification and acceptance only. No new engineering functionality, schema changes, migrations, repository modifications, UI, RPC, scheduler, freeze orchestration, voting, or business rule changes are authorized.

---

## 1. Purpose

Phase 5 completes **Engineering Verification** and **Acceptance** for the E-01 Snapshot Foundation.

This phase verifies that the implemented system matches the approved Blueprint, CITM, RC, CDR, CES standards, and Engineering Governance. No new engineering functionality is introduced.

Phase 5 expands the parent plan §Phase 5 ([`E-01-Implementation-Plan.md`](E-01-Implementation-Plan.md)) into executable Implementation Units with explicit deliverables, verification strategy, and exit criteria per [`EPS-001`](EPS-001-Engineering-Phase-Documentation-Standard.md).

---

## 2. Objectives

| # | Objective |
|---|-----------|
| 1 | Verify engineering implementation against the approved Blueprint |
| 2 | Verify complete CITM traceability |
| 3 | Verify constitutional invariants |
| 4 | Verify repository implementation |
| 5 | Collect engineering evidence |
| 6 | Produce formal **Acceptance Report** |
| 7 | Produce **Project Certification** |

---

## 3. Entry criteria

Phase 5 **shall not** begin until all items below are satisfied:

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Phase 1 Certified | ✓ Required | [`E-01-Phase-1-Certification.md`](E-01-Phase-1-Certification.md) |
| Phase 2 Certified | ✓ Required | [`E-01-Phase-2-Certification.md`](E-01-Phase-2-Certification.md) |
| Phase 3 Complete | ✓ Required | IU-3.1, IU-3.2 completion; schema deployed via RC-011 IU-5 |
| Phase 4 Certified | ✓ Required | [`E-01-Phase-4-Certification.md`](E-01-Phase-4-Certification.md) |
| RC-011 Complete | ✓ Required | [`RC-011-Completion.md`](RC-011-Completion.md) |
| Repository First Rule (CES-003 FE-9) | ✓ Required | [`E-01-IU-4.1-Completion.md`](E-01-IU-4.1-Completion.md) |
| EPS-001 Approved | ✓ Required | [`EPS-001-Engineering-Phase-Documentation-Standard.md`](EPS-001-Engineering-Phase-Documentation-Standard.md) |

**Note:** Phase 3 dedicated certification record may be produced during Phase 5 if not yet issued; Phase 3 engineering completion and linked DB deployment are mandatory regardless.

---

## 4. Implementation Units

Implementation Units **shall** execute in order **5.1 → 5.2 → 5.3 → 5.4**.

### IU-5.1 — Engineering Verification

| Field | Value |
|-------|-------|
| **Purpose** | Cross-check Blueprint, implementation, repository, schema, and verification evidence |
| **Production Effect** | **None** |
| **Deliverable** | [`E-01-IU-5.1-Engineering-Evidence-Verification.md`](E-01-IU-5.1-Engineering-Evidence-Verification.md) |
| **IU Completion** | `E-01-IU-5.1-Completion.md` (required on close per CES-010) |

**Verification scope:**

- Blueprint traceability (M2-S3 Snapshot Freeze Design)
- Phase 1–4 completion and certification records
- Database schema alignment (migrations `20261724120000`–`20261728120000` applied via RC-011 IU-5)
- Repository module (`src/lib/ownerVote/snapshotDomain/`) — read-only contract, legacy + event-linked paths
- Immutability evidence (IU-3.2, RC-011 IU-5 transactional tests)
- Repository integration verification (IU-4.2 scenarios A–G)

---

### IU-5.2 — Acceptance Validation

| Field | Value |
|-------|-------|
| **Purpose** | Verify Blueprint objectives, constitutional invariants, and engineering outcomes are satisfied |
| **Production Effect** | **None** |
| **Deliverable** | [`E-01-IU-5.2-Acceptance-Validation.md`](E-01-IU-5.2-Acceptance-Validation.md) |
| **IU Completion** | `E-01-IU-5.2-Completion.md` |

**Verification scope:**

- Work Breakdown §4 Task E-01 completion criteria
- Constitutional invariants (INV-1, INV-8, dual-snapshot identity foundations)
- Backward compatibility (legacy `meeting_id` path; `freeze_event_id IS NULL` rows)
- Repository First Rule compliance (no direct React table access introduced in E-01)
- Deferred scope explicitly documented (E-02 orchestration, E-03 voting, E-04 scheduler)

---

### IU-5.3 — CITM Evidence Closure

| Field | Value |
|-------|-------|
| **Purpose** | Close every E-01 CITM row with implementation evidence |
| **Production Effect** | **None** |
| **Deliverable** | [`E-01-IU-5.3-CITM-Evidence-Closure.md`](E-01-IU-5.3-CITM-Evidence-Closure.md) |
| **IU Completion** | `E-01-IU-5.3-Completion.md` |

**CITM rows in E-01 scope** (from Work Breakdown §4):

| CITM # | Item | Evidence source |
|--------|------|-----------------|
| **1** | Voter snapshot as sole legal roll | Phase 1 schema; IU-4.2 legacy path |
| **2** | Resolution snapshot / frozen instrument | Phase 3 schema; repository read path |
| **5** | Snapshot immutability post-freeze | Phase 1–3 hooks; IU-3.2 immutability tests |
| **11** | Vote binds to frozen instrument (identity) | Phase 3 ballot identity column; repository aggregate |

Each row **shall** record: implementation status (partial/foundation), evidence link, and owning downstream task for remaining scope.

---

### IU-5.4 — Final Acceptance

| Field | Value |
|-------|-------|
| **Purpose** | Determine whether E-01 Snapshot Foundation is ready for Certification |
| **Production Effect** | **None** |
| **Deliverable** | [`E-01-IU-5.4-Engineering-Acceptance-Decision.md`](E-01-IU-5.4-Engineering-Acceptance-Decision.md) |
| **IU Completion** | `E-01-IU-5.4-Completion.md` |

**Acceptance determination:**

- Consolidate IU-5.1–5.3 findings
- Confirm exit criteria met or document blockers
- Recommend **Accept** or **Reject** for E-01 Project Certification
- Produce E-01 → E-02 handoff section (objects E-02 must write; legacy paths until E-02/E-05)

---

## 5. Deliverables

### Per-IU deliverables

| IU | Primary deliverable | IU Completion record |
|----|---------------------|----------------------|
| **IU-5.1** | [`E-01-IU-5.1-Engineering-Evidence-Verification.md`](E-01-IU-5.1-Engineering-Evidence-Verification.md) | `E-01-IU-5.1-Completion.md` |
| **IU-5.2** | [`E-01-IU-5.2-Acceptance-Validation.md`](E-01-IU-5.2-Acceptance-Validation.md) | `E-01-IU-5.2-Completion.md` |
| **IU-5.3** | [`E-01-IU-5.3-CITM-Evidence-Closure.md`](E-01-IU-5.3-CITM-Evidence-Closure.md) | `E-01-IU-5.3-Completion.md` |
| **IU-5.4** | [`E-01-IU-5.4-Engineering-Acceptance-Decision.md`](E-01-IU-5.4-Engineering-Acceptance-Decision.md) | `E-01-IU-5.4-Completion.md` |

### End-of-phase deliverables

| Deliverable | Record | Purpose |
|-------------|--------|---------|
| **E-01 Acceptance Report** | [`E-01-Acceptance-Report.md`](E-01-Acceptance-Report.md) | Task-level verification and acceptance evidence (EPS-001) |
| **E-01 Certification** | [`E-01-Project-Certification.md`](E-01-Project-Certification.md) | Task closed within approved scope; E-01 Snapshot Foundation certified complete |
| **Phase Completion** | `E-01-Phase-5-Completion.md` | Phase technical single source |
| **Phase Certification** | `E-01-Phase-5-Certification.md` | Phase approval metadata |

---

## 6. Engineering dependencies

Phase 5 verification **shall** cite evidence from:

| Dependency | Record |
|------------|--------|
| Founding Constitution | [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md) |
| RC | [`RC010-B`](../rc/RC010-B-Production-Freeze-Contract-Recovery.md) |
| CDR | [`CDR-001`](../cdr/CDR-001-Voting-Eligibility-Decision.md) |
| CES-001 / CES-002 / CES-003 | Engineering, Database, Frontend standards |
| Engineering Governance | [`ENGINEERING-GOVERNANCE-v1.2.md`](ENGINEERING-GOVERNANCE-v1.2.md) |
| CES-010 | [`CES-010-Documentation-and-Knowledge-Engineering-Standard.md`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) |
| EPS-001 | [`EPS-001-Engineering-Phase-Documentation-Standard.md`](EPS-001-Engineering-Phase-Documentation-Standard.md) |
| Engineering Blueprint | [`M2-S3-Snapshot-Freeze-Design.md`](M2-S3-Snapshot-Freeze-Design.md) |
| Engineering Review | [`ER-001`](ER-001-M2-S3-Blueprint-Review.md) |
| Implementation Authorization | [`IA-001`](M2-S3-Implementation-Authorization.md) |
| Engineering Work Breakdown | [`M2-S3-Engineering-Work-Breakdown.md`](M2-S3-Engineering-Work-Breakdown.md) |
| RC-011 | [`RC-011-Completion.md`](RC-011-Completion.md) |
| Phase 1–4 Completion | [`E-01-Phase-1-Completion.md`](E-01-Phase-1-Completion.md) · [`E-01-Phase-2-Completion.md`](E-01-Phase-2-Completion.md) · [`E-01-Phase-4-Completion.md`](E-01-Phase-4-Completion.md) |
| Phase 1–4 Certification | Phase 1, 2, 4 certification records |

---

## 7. Verification strategy

| Verification class | IU | Method |
|--------------------|-----|--------|
| **Engineering Verification** | 5.1 | Cross-reference Blueprint §9, Implementation Plan phases, migration list, repository module |
| **Acceptance Validation** | 5.2 | Work Breakdown E-01 criteria checklist; invariant matrix |
| **Database Evidence** | 5.1, 5.3 | Linked DB schema queries; RC-011 IU-5 immutability test results |
| **Repository Evidence** | 5.1 | IU-4.2 verification report; build pass; typed error contract |
| **Blueprint Traceability** | 5.1, 5.2 | CITM ↔ Blueprint ↔ implementation mapping |
| **CITM Traceability** | 5.3 | Row-by-row evidence closure for rows 1, 2, 5, 11 |
| **Constitutional Invariants** | 5.2 | INV-1 (immutability hooks), INV-8 (freeze event identity), dual-snapshot correlation (foundation) |
| **Backward Compatibility** | 5.2 | Legacy meeting path; production voter rows (`freeze_event_id IS NULL`); no consumer wiring regression |
| **Repository First Rule Compliance** | 5.2 | CES-003 FE-9; no unauthorized direct table access in E-01 scope |

### Verification Status

Each IU Completion record **shall** use Governance v1.2 states only: **Passed**, **Pending**, **N/A** ([`ENGINEERING-GOVERNANCE-v1.2`](ENGINEERING-GOVERNANCE-v1.2.md)).

Documentation-only IUs (5.1–5.4): Build, Database apply, and Runtime gates are typically **N/A** unless evidence collection requires linked DB queries (Database **Passed** when queries executed).

---

## 8. Implementation order

```
IU-5.1  Engineering Verification
    ↓
IU-5.2  Acceptance Validation
    ↓
IU-5.3  CITM Evidence Closure
    ↓
IU-5.4  Final Acceptance
    ↓
E-01 Acceptance Report
    ↓
E-01 Project Certification
    ↓
Phase 5 Completion
    ↓
Phase 5 Certification
```

**Rule:** IUs **must not** be skipped or reordered. Each IU closes with its Completion record before the next begins.

---

## 9. Exit criteria

Phase 5 is **complete** only when:

| Criterion | Required |
|-----------|----------|
| IU-5.1 Complete | ✓ |
| IU-5.2 Complete | ✓ |
| IU-5.3 Complete | ✓ |
| IU-5.4 Complete | ✓ |
| Acceptance Report Approved | ✓ |
| E-01 Project Certification Approved | ✓ |
| Phase 5 Completion record issued | ✓ |
| Phase 5 Certification issued | ✓ |

**Downstream gate:** **E-02 must not start** until E-01 Project Certification is approved ([`E-01-Implementation-Plan.md`](E-01-Implementation-Plan.md) §9).

---

## 10. Out of scope

Phase 5 **SHALL NOT**:

| Prohibited action | Reason |
|-------------------|--------|
| Modify schema | Verification only |
| Modify migrations | RC-011 closed |
| Modify repository | Phase 4 certified; consumer adoption deferred |
| Modify UI | E-03 / separate authorized work |
| Modify RPC | E-02 / E-03 |
| Modify scheduler | E-04 |
| Modify freeze orchestration | E-02 |
| Modify voting | E-03 |
| Modify business rules | Out of E-01 scope |
| Introduce new engineering scope | Acceptance phase only |

Regression verification for production consumer paths remains **Pending** where repository is not wired (documented in Phase 4; closed or deferred in Acceptance Report with explicit rationale).

---

## 11. Phase output

Successful completion produces:

```
E-01 Acceptance Report
        ↓
E-01 Project Certification
        ↓
E-01 Snapshot Foundation — Certified Complete
        ↓
E-02 authorized to begin (subject to IA-001 and Work Breakdown)
```

---

## 12. Document chain

```
E-01-Phase-4-Certification.md
        ↓
E-01-Phase-5-Implementation-Plan.md          ← this document
        ↓
E-01-IU-5.1-Engineering-Evidence-Verification.md
        ↓
… IU-5.2 … IU-5.3 … IU-5.4 …
        ↓
E-01-Acceptance-Report.md
        ↓
E-01-Project-Certification.md
        ↓
E-01-Phase-5-Completion.md
        ↓
E-01-Phase-5-Certification.md
```

---

## Document control

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Plan |
| **Revision** | v1.0 |
| **Status** | Approved |
| **Authoritative Source** | [`E-01-Implementation-Plan.md`](E-01-Implementation-Plan.md) v1.0 |
| **Supersedes** | None |
| **Next Document** | [`E-01-IU-5.1-Engineering-Evidence-Verification.md`](E-01-IU-5.1-Engineering-Evidence-Verification.md) |
| **Production Effect** | None |
| **Modifies Blueprint / IA-001 / Governance** | **No** |
| **Standard** | [`EPS-001`](EPS-001-Engineering-Phase-Documentation-Standard.md) · [`CES-010`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) |

**Related:** [`E-01-Phase-4-Certification.md`](E-01-Phase-4-Certification.md) · [`M2-S3-Engineering-Work-Breakdown.md`](M2-S3-Engineering-Work-Breakdown.md) · [`RC-011-Completion.md`](RC-011-Completion.md)
