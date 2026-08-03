# EPS-001 — Engineering Phase Documentation Standard

| Field | Value |
|-------|-------|
| **Identifier** | EPS-001 |
| **Title** | Engineering Phase Documentation Standard |
| **Type** | Engineering Process Standard |
| **Status** | **Approved** |
| **Version** | **v1.0** |
| **Approved** | 2026-08-02 |
| **Authority** | [`CES-010-Documentation-and-Knowledge-Engineering-Standard.md`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) · [`ENGINEERING-GOVERNANCE-v1.2.md`](ENGINEERING-GOVERNANCE-v1.2.md) |
| **Production Effect** | **None** |

**Applies to:** Every authorized **Engineering Task** (E-01, E-02, E-03, …) and every **Phase** within such tasks.

**Related:** [`CES-010`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) · [`ENGINEERING-GOVERNANCE-v1.2.md`](ENGINEERING-GOVERNANCE-v1.2.md) · [`templates/IU-Completion-Template.md`](templates/IU-Completion-Template.md) · [`templates/Phase-Completion-Template.md`](templates/Phase-Completion-Template.md) · [`templates/Phase-Certification-Template.md`](templates/Phase-Certification-Template.md)

> **Scope lock:** This standard governs engineering phase documentation structure and lifecycle only. It does **not** authorize implementation, modify Blueprint, IA, CDR, RC, application code, SQL, migrations, or production behavior.

---

## 1. Purpose

Standardize engineering phase documentation so every engineering phase follows the **same lifecycle** and **document chain**.

Engineering Governance v1.2 and CES-010 established Implementation Plans, Implementation Units, Completion Records, Engineering Reviews, Phase Completion, and Phase Certification as permanent parts of the Engineering Lifecycle. EPS-001 defines the **unified structure** those document types **shall** follow.

---

## 2. Engineering lifecycle

Every Engineering Phase **shall** follow this documentation workflow:

```
Implementation Plan
        ↓
Implementation Units (authorized scope)
        ↓
IU Completion (one record per IU)
        ↓
Phase Completion (one record per phase)
        ↓
Phase Certification (approval metadata)
        ↓
Next Phase
```

At **Engineering Task** close:

```
… (repeat per phase) …
        ↓
Acceptance Report
        ↓
Project Certification
```

**Rule:** No phase is governance-complete until its Phase Completion record exists and Phase Certification is recorded (embedded or dedicated per CES-010 DOC-9).

---

## 3. Document types

| Document type | Naming pattern | Purpose |
|---------------|----------------|---------|
| **Implementation Plan** | `{Task}-Implementation-Plan.md` | Authoritative execution order, phases, IUs, completion criteria, and boundaries for an Engineering Task. |
| **Implementation Unit** | Authorized in Implementation Plan | Smallest authorized unit of engineering work within a phase. Scope boundary for a single deliverable. |
| **IU Completion** | `{Task}-IU-{phase}.{unit}-Completion.md` | Audit record of what one IU implemented, verified, and deferred. One record per completed IU. |
| **Phase Completion** | `{Task}-Phase-{n}-Completion.md` | Single authoritative technical summary when all IUs in a phase are complete. Describes **what was completed**. |
| **Phase Certification** | `{Task}-Phase-{n}-Certification.md` (form B) or embedded section (form A) | Approval metadata declaring **what is officially certified** within phase scope. Must not duplicate Phase Completion technical content (CES-010 DOC-9). |
| **Acceptance Report** | `{Task}-Acceptance-Report.md` | Task-level verification and acceptance evidence when all phases are complete (CES-008 alignment). |
| **Project Certification** | `{Task}-Project-Certification.md` | Task-level certification that the Engineering Task is closed within approved scope and ready for downstream handoff or release gates. |

### 3.1 Implementation Plan

- Governs phase order, IU definitions, and completion criteria.
- **Shall** include **Authoritative Source** linkage to Blueprint, IA, and Engineering Review.
- Revision changes (e.g. v1.0 → v1.1) **shall** be reflected in dependent Completion and Certification documents on next edit or phase close.

### 3.2 Implementation Unit

- Defined in the Implementation Plan; authorized only under valid IA.
- Each IU **shall** produce exactly one IU Completion record (CES-010 DOC-1).

### 3.3 IU Completion

- Records files modified, database/application changes, verification, backward compatibility, deferred work, and **Authoritative Source**.
- **Shall** use Verification Status gates per [§9](#9-verification-status).

### 3.4 Phase Completion

- Consolidates IU completions; **does not** replace them.
- Exactly **one** authoritative record per phase (CES-010 DOC-8).
- **Shall** describe what was completed, boundary verification, and production effect.

### 3.5 Phase Certification

- Records certification gates, certified capabilities, and not-certified scope.
- **Shall** declare what is officially certified — not re-summarize IU deliverables.

### 3.6 Acceptance Report

- Produced at Engineering Task verification close (e.g. E-01 Phase 5).
- Cites objective evidence; satisfies acceptance criteria from Implementation Plan and Work Breakdown.

### 3.7 Project Certification

- Closes the Engineering Task at documentation level.
- Confirms all phases certified, acceptance report approved, and handoff conditions met.

---

## 4. Document chain

```
IU Completion
        ↓
Phase Completion          ← technical single source (what was done)
        ↓
Phase Certification       ← approval metadata (what is certified)
        ↓
Acceptance Report         ← task verification evidence
        ↓
Project Certification     ← task closed within scope
```

**Next Document** links **shall** connect adjacent steps:

| From | To |
|------|-----|
| Last IU Completion in phase | Phase Completion |
| Phase Completion | Phase Certification |
| Phase Certification | Next phase Implementation Plan section or next IU |
| Final Phase Certification | Acceptance Report |
| Acceptance Report | Project Certification |

---

## 5. Phase Completion — required structure

### 5.1 Mandatory metadata (header)

Every Phase Completion document **shall** include these fields in the document header table:

| Field | Requirement |
|-------|-------------|
| **Document Type** | `Phase Completion` |
| **Phase** | Task and phase identifier (e.g. `E-01 Phase 4`) |
| **Status** | `Completed` · `Completed with Follow-up` · `Blocked` · `Cancelled` |
| **Authoritative Source** | Implementation Plan path and revision (e.g. `E-01-Implementation-Plan.md` v1.0) |
| **Supersedes** | Prior completion record replaced, or `None` |
| **Next Document** | Link to Phase Certification (form B) or explicit next governance record |
| **Production Effect** | Declared effect on production ([§8](#8-production-effect)) |

Supplementary fields (Task, Milestone, Completed date) **may** be included but do not replace mandatory metadata.

### 5.2 Mandatory sections

| # | Section | Requirement |
|---|---------|-------------|
| 1 | **Phase Summary** | What the phase established; explicit scope lock statement |
| 2 | **Completed Units** | Table of IUs with links to IU Completion records |
| 3 | **Engineering Objectives** | Objectives from Implementation Plan with pass/fail result |
| 4 | **Boundary Verification** | What was **not** modified (React, RPC, schema, orchestration, consumers, …) |
| 5 | **Verification Summary** | Gate table using [§9](#9-verification-status) states |
| 6 | **Out of Scope** | Intentionally deferred items with owning Engineering Task |
| 7 | **Next Phase** | Authorized next phase and entry criteria |

**Additional sections** (deliverables, architecture status, CES compliance, legacy compatibility) **may** be included when applicable. They **shall not** replace mandatory sections.

**Template:** [`templates/Phase-Completion-Template.md`](templates/Phase-Completion-Template.md)

---

## 6. Phase Certification — required structure

### 6.1 Mandatory metadata (header)

| Field | Requirement |
|-------|-------------|
| **Document Type** | `Phase Certification` |
| **Certification Status** | `Certified Complete` · `Not Certified` · `Revoked` |
| **Scope** | Phase scope name (e.g. `Repository Layer`) |
| **Authority** | Implementation Plan path and revision |
| **Next Phase** | Authorized next phase title |

**Technical record** link to Phase Completion **shall** be included.

### 6.2 Mandatory sections

| # | Section | Requirement |
|---|---------|-------------|
| 1 | **Certification Basis** | Implementation Plan revision, blueprint/review status, completed IUs |
| 2 | **Certified Capabilities** | Explicit list of what is certified |
| 3 | **Not Certified** | Explicit list of what is outside scope |
| 4 | **Engineering Status** | Phase closed / certified state |
| 5 | **Authority Statement** | What this certification confirms and what it does not certify |

Dedicated certification files **shall** contain approval metadata only (CES-010 DOC-9).

**Template:** [`templates/Phase-Certification-Template.md`](templates/Phase-Certification-Template.md)

---

## 7. Authoritative Source

Every **Completion** or **Certification** document **shall** identify its **Authoritative Source**.

**Minimum requirement:**

| Field | Example |
|-------|---------|
| **Implementation Plan** | [`E-01-Implementation-Plan.md`](E-01-Implementation-Plan.md) |
| **Revision** | v1.0 |
| **Verified** | YES |

Phase Completion **may** express this as a single header field:

```markdown
| **Authoritative Source** | [`E-01-Implementation-Plan.md`](E-01-Implementation-Plan.md) v1.0 |
```

Phase Certification **may** express this as **Authority**:

```markdown
| **Authority** | [`E-01-Implementation-Plan.md`](E-01-Implementation-Plan.md) v1.0 |
```

Full **Authoritative Source** section **shall** appear in the document body when CES-010 §2 applies.

---

## 8. Boundary rule

| Document type | **Shall** |
|---------------|-----------|
| **Completion** | Describe **what was completed** — deliverables, verification, boundaries, production effect |
| **Certification** | Declare **what is officially certified** — gates, capabilities, authority, not-certified scope |

**The two document types SHALL NOT be merged.**

- Phase Completion is the **technical single source** (CES-010 DOC-8).
- Phase Certification is **approval metadata only** (CES-010 DOC-9).
- Certification **must not** duplicate technical summaries from Completion.

---

## 9. Production Effect

Every Completion, Certification, Acceptance, and Project Certification document **shall** declare **Production Effect**.

| Value | Meaning |
|-------|---------|
| **None** | No production runtime, schema, or deployment change |
| **Schema only** | Database schema changed; application behavior unchanged |
| **Runtime behavior unchanged** | Code or schema may exist; consumers not wired; observable behavior preserved |
| **Production enabled** | Authorized change deployed or wired to production consumers |

Production Effect **shall** appear in Phase Completion mandatory metadata. Certification and other records **should** restate or reference the same declaration when deployment certification is recorded.

---

## 10. Verification Status

Verification gates **shall** use the states defined in **Engineering Governance v1.2** and **CES-010 §11**. EPS-001 does **not** redefine verification states.

| State | Display | Use |
|-------|---------|-----|
| **Passed** | ✓ Passed | Verification performed; objective evidence exists |
| **Pending** | □ Pending | Required verification not yet performed |
| **Not Applicable** | **N/A** | Gate does not apply to scope |

**Rule:** **N/A** **must not** be used to bypass required verification.

**Authority:** [`ENGINEERING-GOVERNANCE-v1.2.md`](ENGINEERING-GOVERNANCE-v1.2.md) · [`CES-010` §11](CES-010-Documentation-and-Knowledge-Engineering-Standard.md#11-verification-status-v12)

---

## 11. Reusability

This standard applies to:

| Scope | Examples |
|-------|----------|
| Current Engineering Tasks | E-01, E-02, E-03 |
| Future milestones | M2, M3, M4, M5, … |
| Future engineering projects | Any task under IA with Implementation Plan + phased IUs |

New Engineering Tasks **shall** adopt EPS-001 metadata and section requirements from their first Phase Completion onward.

---

## 12. Reference implementation

**E-01 Phase 4** is the first reference implementation of EPS-001.

| Document | Record |
|----------|--------|
| Phase Completion | [`E-01-Phase-4-Completion.md`](E-01-Phase-4-Completion.md) |
| Phase Certification | [`E-01-Phase-4-Certification.md`](E-01-Phase-4-Certification.md) |
| IU Completion (4.1) | [`E-01-IU-4.1-Completion.md`](E-01-IU-4.1-Completion.md) |
| IU Completion (4.2) | [`E-01-IU-4.2-Completion.md`](E-01-IU-4.2-Completion.md) |
| Authoritative Source | [`E-01-Implementation-Plan.md`](E-01-Implementation-Plan.md) v1.0 |

E-01 Phase 4 demonstrates:

- Mandatory Phase Completion metadata (Document Type, Phase, Status, Authoritative Source, Supersedes, Next Document, Production Effect)
- Mandatory Phase Certification metadata (Document Type, Certification Status, Scope, Authority, Next Phase)
- Separated Completion (technical) vs Certification (approval) per boundary rule
- Document chain: IU-4.1 / IU-4.2 → Phase 4 Completion → Phase 4 Certification → Phase 5

---

## 13. Permanent rules (EPS-1 … EPS-6)

| # | Rule |
|---|------|
| **EPS-1** | Every completed phase **shall** produce one Phase Completion record with mandatory metadata and sections ([§5](#5-phase-completion--required-structure)) |
| **EPS-2** | Every closed phase **shall** record Phase Certification with mandatory metadata and sections ([§6](#6-phase-certification--required-structure)) |
| **EPS-3** | Completion and Certification **shall not** be merged ([§7](#7-boundary-rule)) |
| **EPS-4** | Every Completion and Certification document **shall** declare Authoritative Source ([§7](#7-authoritative-source)) |
| **EPS-5** | Every Completion and Certification document **shall** declare Production Effect ([§8](#8-production-effect)) |
| **EPS-6** | Verification Status **shall** reuse Governance v1.2 states only ([§9](#9-verification-status)) |

---

## Document control

| Field | Value |
|-------|-------|
| **Document Type** | Engineering Process Standard |
| **Version** | v1.0 |
| **Status** | Approved |
| **Supersedes** | Ad hoc phase documentation practice prior to EPS-001 |
| **Modifies Blueprint / IA-001 / Governance** | **No** |
| **Production changed by this document** | **No** |

**Related:** [`README.md`](README.md) · [`E-01-Phase-4-Completion.md`](E-01-Phase-4-Completion.md) · [`E-01-Phase-4-Certification.md`](E-01-Phase-4-Certification.md)
