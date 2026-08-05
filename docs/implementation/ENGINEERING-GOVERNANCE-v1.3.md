# Engineering Governance v1.3

| Field | Value |
|-------|-------|
| **Version** | **v1.3** |
| **Type** | Engineering Governance Update |
| **Status** | **Approved** |
| **Approved** | 2026-08-03 |
| **Supersedes** | [`ENGINEERING-GOVERNANCE-v1.2.md`](ENGINEERING-GOVERNANCE-v1.2.md) — Deferred Ownership and Ownership Closure rules only |
| **Authority** | [`CES-010-Documentation-and-Knowledge-Engineering-Standard.md`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) · [`EPS-001-Engineering-Phase-Documentation-Standard.md`](EPS-001-Engineering-Phase-Documentation-Standard.md) · [`GMM-001-Governance-Maturity-Model.md`](GMM-001-Governance-Maturity-Model.md) |
| **Production effect** | **None** |

---

## Authoritative Source

| Field | Value |
|-------|-------|
| **Implementation Plan** | [`E-01-Implementation-Plan.md`](E-01-Implementation-Plan.md) |
| **Revision** | v1.0 |
| **Verified** | **YES** |

---

## 1. Summary

Engineering Governance **v1.3** introduces permanent governance rules **GR-7** (Deferred Ownership) and **GR-8** (Ownership Closure).

These rules codify the **Deferred → Owner** principle established during E-01 Phase 5 Acceptance Validation and the Engineering Evidence Ledger (IU-5.3).

Prior v1.2 requirements (Verification Status **Passed** / **Pending** / **N/A**; Authoritative Source; document priority; single-source Phase Completion) remain in force. This update does **not** modify Blueprint, IA-001, CDR, RC, application code, SQL, migrations, or production behavior.

---

## 2. GR-7 — Deferred Ownership Rule

### 2.1 Purpose

Every **Deferred** engineering item **shall** remain fully traceable throughout the Engineering Lifecycle.

| Deferred **shall** represent | Deferred **shall not** represent |
|------------------------------|----------------------------------|
| Authorized future responsibility | Unknown work |
| | Forgotten work |
| | Missing ownership |

### 2.2 Rule

Every Deferred item **shall** identify **exactly one** future **Owner**.

**Owner** may be:

| Owner type | Example |
|------------|---------|
| Engineering Task | **E-02**, **E-03**, **E-04** |
| Engineering Milestone | **M2-S3** *(when task not yet decomposed)* |
| Engineering Phase | **E-02 Phase 3** |
| Implementation Unit | **IU-3.1** *(when authorized in plan)* |
| Approved Engineering Program | **RC-012** |

### 2.3 Required fields

Every Deferred record **shall** include:

| Field | Requirement |
|-------|-------------|
| **Deferred Reason** | Why the item is outside current authorized scope |
| **Future Owner** | Exactly one owner identifier |
| **Authoritative Source** | Blueprint, Implementation Plan, Work Breakdown, or IA reference |

**Recommended:**

| Field | Purpose |
|-------|---------|
| **Expected Closure Phase** | Phase or IU where ownership is expected to close (e.g. E-02 Phase 5) |

### 2.4 Prohibited

The following constitute a **Governance Defect**:

| Prohibited pattern |
|--------------------|
| Deferred → **Unknown** |
| Deferred → **TBD** |
| Deferred → **(blank)** |
| Deferred → **Multiple Owners** |
| Deferred without ownership |

### 2.5 Acceptance

Deferred items **shall not** block **Acceptance** when:

| Condition | Met |
|-----------|-----|
| Item is outside authorized scope of the accepting milestone/task | Required |
| Ownership is assigned (exactly one owner) | Required |
| Traceability is preserved | Required |

### 2.6 Traceability chain

```
Blueprint
    ↓
CITM
    ↓
Engineering Task
    ↓
Evidence Ledger
    ↓
Deferred Owner
    ↓
Future Engineering Milestone
```

---

## 3. GR-8 — Ownership Closure Rule

### 3.1 Purpose

Engineering ownership **shall** remain active until formally closed through Engineering Evidence.

### 3.2 Rule

A **Deferred Owner** remains responsible until the corresponding Engineering Evidence records one of:

| Closure state | Meaning |
|---------------|---------|
| **Accepted** | Completed within the authorized scope of the owning milestone/task |
| **Partially Accepted** | Foundation completed under owner; any remainder assigned to a new single owner per GR-7 |

Until closure, the owner **shall** appear on traceability matrices, ledgers, and acceptance records.

### 3.3 Ownership transfer

Ownership **may** transfer **only** through:

| Authorized mechanism |
|---------------------|
| Approved Engineering Blueprint |
| Approved Implementation Plan |
| Approved Engineering Governance update |

**Ad hoc ownership transfer is prohibited.**

### 3.4 Closure evidence

Ownership closure **shall** reference at least one of:

| Evidence type | Example |
|---------------|---------|
| **Evidence Ledger** | [`E-01-IU-5.3-CITM-Evidence-Closure.md`](E-01-IU-5.3-CITM-Evidence-Closure.md) |
| **Acceptance Record** | Acceptance Validation / Acceptance Report |
| **Completion Record** | IU or Phase Completion |
| **Certification Record** | Phase or Project Certification |

### 3.5 Example lifecycle

```
LED-001  CITM Row 1 — Partially Accepted (E-01)
    ↓
Deferred remainder → Owner: E-02
    ↓
E-02 Engineering Evidence — Accepted (E-02 Phase 5)
    ↓
Ownership Closed
```

---

## 4. Status definitions (GR-7 / GR-8)

These statuses apply to CITM rows, Acceptance Matrix items, and Engineering Evidence Ledger entries:

| Status | Definition |
|--------|------------|
| **Accepted** | Completed within current authorized scope |
| **Partially Accepted** | Foundation completed; remaining responsibility assigned to exactly one future owner (GR-7) |
| **Deferred** | Outside current authorized scope; exactly one future owner assigned (GR-7) |
| **Pending** | Within current authorized scope; work not yet executed |

**Rule:** **Partially Accepted** and **Deferred** both require a **Future Owner** for any non-closed remainder. **Pending** does not assign a future owner until scope deferral is recorded.

---

## 5. Compatibility

GR-7 and GR-8 apply to:

| Artifact |
|----------|
| Engineering Blueprint (CITM §7) |
| Engineering Work Breakdown |
| CITM rows and mappings |
| Acceptance Matrix |
| Engineering Evidence Ledger |
| Implementation Units |
| Phase Completion |
| Phase Certification |
| Acceptance Report |
| Project Certification |

**Related standards:** [`EPS-001`](EPS-001-Engineering-Phase-Documentation-Standard.md) · [`CES-010`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) · [`CES-001` §2 CITM](CES-001-Engineering-Standard.md)

---

## 6. Reference implementation

**E-01 Phase 5 / IU-5.3** — Engineering Evidence Ledger is the first reference implementation of GR-7 and GR-8.

| Record | Demonstrates |
|--------|--------------|
| [`E-01-IU-5.3-CITM-Evidence-Closure.md`](E-01-IU-5.3-CITM-Evidence-Closure.md) | Partially Accepted rows with single owners (E-02, E-03); Deferred rows 3–15 with owners; LED-001–004 |
| [`E-01-IU-5.2-Acceptance-Validation.md`](E-01-IU-5.2-Acceptance-Validation.md) | Deferred items do not block E-01 foundation acceptance |

---

## 7. Permanent governance rules summary

| Rule | Title | Version |
|------|-------|---------|
| **GR-1** | Authoritative Source Rule | v1.1 |
| **GR-2** | Document Priority Rule | v1.1 |
| **GR-3** | Phase Completion Single Source Rule | v1.1.1 |
| **GR-4** | Phase Certification Separation Rule | v1.1.1 |
| **GR-5** | IU Completion Mandatory Rule | CES-010 v1.0 |
| **GR-6** | Verification Status Rule | v1.2 |
| **GR-7** | Deferred Ownership Rule | **v1.3** |
| **GR-8** | Ownership Closure Rule | **v1.3** |

**Full registry:** [`Engineering-Governance-Rule-Index.md`](Engineering-Governance-Rule-Index.md)

---

## 8. Governance Rule Index

The authoritative registry for all **GR-x** rules is [`Engineering-Governance-Rule-Index.md`](Engineering-Governance-Rule-Index.md).

| Rule ID | Rule Name | Status | Introduced |
|---------|-----------|--------|------------|
| **GR-1** | Authoritative Source Rule | Active | v1.1 |
| **GR-2** | Document Priority Rule | Active | v1.1 |
| **GR-3** | Phase Completion Single Source Rule | Active | v1.1.1 |
| **GR-4** | Phase Certification Separation Rule | Active | v1.1.1 |
| **GR-5** | IU Completion Mandatory Rule | Active | CES-010 v1.0 |
| **GR-6** | Verification Status Rule | Active | v1.2 |
| **GR-7** | Deferred Ownership Rule | Active | **v1.3** |
| **GR-8** | Ownership Closure Rule | Active | **v1.3** |
| **GR-9** | *(reserved)* | Reserved | — |
| **GR-10** | *(reserved)* | Reserved | — |
| **GR-11** | *(reserved)* | Reserved | — |

**Rule History:** See [`Engineering-Governance-Rule-Index.md` §5](Engineering-Governance-Rule-Index.md#5-rule-history-by-governance-version).

**Governance maturity:** Assigned **only** by [`GMM-001-Governance-Maturity-Model.md`](GMM-001-Governance-Maturity-Model.md). This index does **not** define maturity internally (GMM-001 GMM-2).

| Rule ID | Maturity (GMM-001 §5) |
|---------|------------------------|
| GR-1 – GR-4 | **GMM-4** Standard |
| GR-5 – GR-6 | **GMM-3** Adopted |
| GR-7 – GR-8 | **GMM-2** Pilot |

---

## 10. Governance Maturity Model

Engineering Governance maturity **shall** be assessed using [`GMM-001-Governance-Maturity-Model.md`](GMM-001-Governance-Maturity-Model.md).

| Field | Value |
|-------|-------|
| **Standard** | GMM-001 v1.0 |
| **Scope** | Governance artifacts only — not engineering implementation |
| **Rule** | Maturity **shall not** be defined in the Rule Index or individual GR sections |

---

## 11. Prior governance versions

| Version | Document | Scope |
|---------|----------|-------|
| v1.1 | [`ENGINEERING-GOVERNANCE-v1.1.md`](ENGINEERING-GOVERNANCE-v1.1.md) | Authoritative Source; document priority; single-source Phase Completion |
| v1.1.1 | CES-010 v1.1.1 | Phase certification forms (DOC-8, DOC-9) |
| v1.1.2 | CES-010 v1.1.2 | Verification Status gate table (DOC-10) |
| v1.2 | [`ENGINEERING-GOVERNANCE-v1.2.md`](ENGINEERING-GOVERNANCE-v1.2.md) | **N/A** verification state |
| **v1.3** | This document | **GR-7** Deferred Ownership · **GR-8** Ownership Closure |

---

## Document control

| Field | Value |
|-------|-------|
| **Modifies Blueprint / IA-001 / Governance** | **No** (adds governance rules only) |
| **Production changed by this document** | **No** |

**Standard:** [`CES-010-Documentation-and-Knowledge-Engineering-Standard.md`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md)
