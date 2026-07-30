# CES-010 — Documentation & Knowledge Engineering Standard

| Field | Value |
|-------|-------|
| **Identifier** | CES-010 |
| **Title** | Documentation & Knowledge Engineering Standard |
| **Type** | Engineering Standard |
| **Status** | **Approved** |
| **Standard version** | **v1.2** |
| **Authority** | ClearStrata Constitutional Governance Committee |
| **Approved** | 2026-07-27 (v1.0) · **v1.1** 2026-07-27 · **v1.1.1** 2026-07-28 · **v1.1.2** 2026-07-29 · **v1.2** 2026-07-29 |
| **Parent** | [`CES-001-Engineering-Standard.md`](CES-001-Engineering-Standard.md) · [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md) |
| **Milestone** | All (M2, M3, M4, M5, …) |
| **Release** | FR2+ |
| **Implementation authority** | None (standard only) |
| **Production effect** | **None** |

**Applies to:** Every authorized **Implementation Unit (IU)** under an Engineering Task (e.g. E-01, E-02) and every **Phase** within such tasks.

**Related:** [`ENGINEERING-GOVERNANCE-v1.2.md`](ENGINEERING-GOVERNANCE-v1.2.md) · [`ENGINEERING-GOVERNANCE-v1.1.md`](ENGINEERING-GOVERNANCE-v1.1.md) · [`templates/IU-Completion-Template.md`](templates/IU-Completion-Template.md) · [`templates/Phase-Completion-Template.md`](templates/Phase-Completion-Template.md) · [`templates/Phase-Certification-Template.md`](templates/Phase-Certification-Template.md) · [`templates/Boundary-Check-Template.md`](templates/Boundary-Check-Template.md) · [`templates/Verification-Review-Template.md`](templates/Verification-Review-Template.md) · [`CES-001`](CES-001-Engineering-Standard.md) · [`CES-008`](CES-008-Testing-and-Verification-Engineering-Standard.md) · [`CES-009`](CES-009-Deployment-and-Release-Engineering-Standard.md)

> **Scope lock:** This standard governs engineering completion documentation only. It does **not** authorize implementation or modify Blueprint, IA, CDR, or governance records.

---

## 1. Purpose

Establish a permanent rule: **every completed Implementation Unit (IU) produces exactly one standardized Completion record.**

Completion records provide audit evidence for Verification and Release gates, preserve implementation history, and prevent undocumented drift between Engineering Tasks.

---

## 2. Authoritative Source (v1.1 — mandatory)

The following document types **shall** include an **Authoritative Source** section immediately after document metadata (title table) or in the document header:

| Document type | Example |
|---------------|---------|
| Implementation Plan | `E-01-Implementation-Plan.md` |
| IU Completion | `E-01-IU-2.1-Completion.md` |
| Phase Completion | `E-01-Phase-1-Completion.md` |
| Boundary Check | Phase / IU boundary status record |
| Verification Review | Read-only verification review record |

**Required fields:**

| Field | Requirement |
|-------|-------------|
| **Implementation Plan** | Link or path to the governing task Implementation Plan |
| **Revision** | Approved Implementation Plan revision (e.g. `v1.0`) |
| **Verified** | `YES` when checked against that revision; `NO` only with documented reason |

When a new Implementation Plan revision is approved, dependent documents **shall** update **Revision** on next edit or at phase close.

**Standard block (markdown):**

```markdown
## Authoritative Source

| Field | Value |
|-------|-------|
| **Implementation Plan** | [`E-01-Implementation-Plan.md`](E-01-Implementation-Plan.md) |
| **Revision** | v1.0 |
| **Verified** | **YES** |
```

---

## 3. Document priority when guidance conflicts (v1.1)

When conversation guidance conflicts with approved engineering documents, priority **shall** be:

| Priority | Source |
|----------|--------|
| **1** | Approved Engineering Blueprint |
| **2** | Approved Implementation Plan |
| **3** | Approved Engineering Review |
| **4** | Approved IU Scope (authorized IU boundary) |
| **5** | Conversation guidance |

Conversation guidance **must not** override items 1–4.

---

## 4. Naming convention

### 2.1 Implementation Unit completion

```
docs/implementation/{Task}-IU-{phase}.{unit}-Completion.md
```

| Component | Example |
|-----------|---------|
| Task | `E-01` |
| Phase.Unit | `1.1`, `1.1C`, `2.1`, `2.2` |

**Examples:**

- `E-01-IU-1.1-Completion.md`
- `E-01-IU-1.1C-Completion.md`
- `E-01-IU-2.1-Completion.md`

**Suffix variants:** Letter suffixes (e.g. `1.1C`) denote correction, readiness, or follow-up units within the same phase. Each suffix is a distinct IU and requires its own Completion record.

### 2.2 Phase completion

When **all** IUs in a phase are complete, create:

```
docs/implementation/{Task}-Phase-{n}-Completion.md
```

**Example:** `E-01-Phase-1-Completion.md`

Phase completion **summarizes** IU completions; it does **not** replace them.

**Single source rule:** Exactly **one** Phase Completion record is authoritative per phase. All technical summaries (deliverables, verification, architecture, deferred work, boundary findings) **shall** live in that record only.

### 2.3 Phase certification (approval metadata)

Phase certification **may** be recorded in one of two forms:

| Form | Rule |
|------|------|
| **A — Embedded** | Final section of the Phase Completion document (`## Engineering Certification`) |
| **B — Dedicated** | Separate file: `docs/implementation/{Task}-Phase-{n}-Certification.md` |

Dedicated certification files **shall** contain **approval metadata only** (certification date, gate results, deployment certification status, approved next step). They **must not** duplicate technical summaries already in the Phase Completion document.

**Example (dedicated):** `E-01-Phase-2-Certification.md`

### 2.4 Supporting documents

Deployment readiness, verification reviews, and investigation records may exist as separate documents but **do not** substitute for an IU Completion record when the IU modified repository artifacts or achieved an authorized engineering deliverable.

---

## 5. Required content — IU Completion

Every IU Completion document **shall** contain the following sections (see template for structure):

| # | Section | Requirement |
|---|---------|-------------|
| 1 | **Implementation Unit** | Task, phase, IU id, title |
| 2 | **Status** | `Completed` · `Completed with Follow-up` · `Blocked` · `Cancelled` |
| 3 | **Objective** | Brief statement of what this IU implemented |
| 4 | **Files Modified** | Every file changed (paths) |
| 5 | **Database Changes** | Migrations, schema, tables, indexes, constraints, RLS — or explicit **No database changes** |
| 6 | **Application Changes** | RPC, React, Edge, API — or explicit **No application behavior changed** |
| 7 | **Verification** | Build, typecheck, migration, regression, deployment readiness |
| 7.1 | **Verification Status** | Gate summary — Passed only when actually performed ([DOC-10](#10-permanent-documentation-rules-doc-1--doc-7)) |
| 8 | **Backward Compatibility** | Whether production behavior was preserved |
| 9 | **Known Limitations** | Intentionally deferred items only |
| 10 | **Deferred Work** | Next IU(s) |
| 11 | **Authority** | Blueprint, IA, Phase Plan, Engineering Review |
| 12 | **Authoritative Source** | Implementation Plan, Revision, Verified ([§2](#2-authoritative-source-v11--mandatory)) |

Phase completion and verification documents **shall** include **Authoritative Source** per [§2](#2-authoritative-source-v11--mandatory); IU Completion **shall** include it in metadata or as §12.

---

## 6. Required content — Phase completion

Phase completion documents **shall** summarize:

- **Authoritative Source** ([§2](#2-authoritative-source-v11--mandatory))
- All completed IUs (with links to IU Completion records)
- Consolidated deliverables
- Verification summary
- Deployment readiness (if applicable)
- Deferred work for subsequent phases
- Next phase / next IU

---

## 7. Status definitions

| Status | Use when |
|--------|----------|
| **Completed** | All IU objectives and verification criteria met; no mandatory follow-up IU |
| **Completed with Follow-up** | IU deliverable accepted; a documented follow-up IU (e.g. correction, readiness) is required or was completed separately |
| **Blocked** | IU stopped; blocker documented; no partial authorization to proceed |
| **Cancelled** | IU scope withdrawn under IA; no implementation merged |

---

## 8. Workflow placement

```
Implementation Authorization (IA)
    → Engineering Task Plan (e.g. E-01 Implementation Plan)
    → Implementation Unit (IU) execution
    → IU Completion record          ← this standard
    → (repeat per IU)
    → Phase Completion record       ← when phase IUs complete
    → Verification / Release gates
```

**Rule:** No IU is considered **complete** for governance purposes until its Completion record exists and status is `Completed` or `Completed with Follow-up`.

---

## 9. Templates

| Template | Path |
|----------|------|
| **IU Completion** | [`templates/IU-Completion-Template.md`](templates/IU-Completion-Template.md) |
| **Phase Completion** | [`templates/Phase-Completion-Template.md`](templates/Phase-Completion-Template.md) |
| **Phase Certification** | [`templates/Phase-Certification-Template.md`](templates/Phase-Certification-Template.md) |
| **Boundary Check** | [`templates/Boundary-Check-Template.md`](templates/Boundary-Check-Template.md) |
| **Verification Review** | [`templates/Verification-Review-Template.md`](templates/Verification-Review-Template.md) |

Engineering **shall** copy the template for each new IU Completion record.

---

## 10. Permanent documentation rules (DOC-1 … DOC-10)

| # | Rule |
|---|------|
| **DOC-1** | Every completed IU **shall** produce one IU Completion record |
| **DOC-2** | Every completed phase **shall** produce one Phase Completion record |
| **DOC-3** | Completion records **shall not** modify Blueprint, IA, CDR, or RC — they report what was done |
| **DOC-4** | Files Modified **shall** list all repository paths changed in the IU |
| **DOC-5** | Deferred Work **shall** identify the next authorized IU; out-of-scope items **shall** reference the owning Engineering Task (E-xx) |
| **DOC-6** | When guidance conflicts, priority is: Blueprint → Implementation Plan → Engineering Review → IU Scope → conversation ([§3](#3-document-priority-when-guidance-conflicts-v11)) |
| **DOC-7** | Documents listed in [§2](#2-authoritative-source-v11--mandatory) **shall** include **Authoritative Source** with Implementation Plan revision and Verified flag |
| **DOC-8** | Exactly **one** authoritative Phase Completion record **shall** exist per phase ([§4.2](#22-phase-completion)) |
| **DOC-9** | Phase certification **shall** be embedded in Phase Completion (form A) or a dedicated approval record with metadata only (form B). Certification **must not** duplicate technical content from Phase Completion ([§4.3](#23-phase-certification-approval-metadata)) |
| **DOC-10** | IU Completion records **shall** include **Verification Status** ([§11](#11-verification-status-v12)). Each gate **shall** use exactly one of: **Passed**, **Pending**, or **N/A**. Mark **Passed** only when verification was actually performed; **N/A** only when the gate does not apply to IU scope — **N/A must not bypass required verification** |

---

## 11. Verification Status (v1.2)

Every IU Completion record **shall** include a **Verification Status** section (template §7.1) recording the **current** state of each gate.

### 11.1 Allowed states

| State | Display | Meaning |
|-------|---------|---------|
| **Passed** | ✓ Passed | Verification performed; objective evidence exists |
| **Pending** | □ Pending | Verification required but not yet performed |
| **Not Applicable** | **N/A** | Verification does not apply to this IU scope |

**Rule:** Use **N/A** only when a gate is genuinely out of scope. **N/A must not** substitute for **Pending** on required verification.

### 11.2 Independent evaluation

Each gate **shall** be evaluated **independently** against IU scope.

| IU type | Typical gates |
|---------|----------------|
| Database-only migration | Build **N/A**; Database **Passed** or **Pending** |
| Documentation-only | Build, Database, Runtime **N/A** |
| React UI implementation | Database **N/A**; Build **Passed** or **Pending**; Runtime **Pending** until staging |

**Governance:** [`ENGINEERING-GOVERNANCE-v1.2.md`](ENGINEERING-GOVERNANCE-v1.2.md)

---

## 12. Related standards

| Standard | Relationship |
|----------|--------------|
| **CES-001** | Engineering discipline, CITM, slice structure |
| **CES-008** | Verification evidence cited in §7 Verification |
| **CES-009** | Deployment readiness cited when migrations are involved |

---

**Authorization:** Standard only — does not authorize code or schema changes.
