# CES-010 — Documentation & Knowledge Engineering Standard

| Field | Value |
|-------|-------|
| **Identifier** | CES-010 |
| **Title** | Documentation & Knowledge Engineering Standard |
| **Type** | Engineering Standard |
| **Status** | **Approved** |
| **Authority** | ClearStrata Constitutional Governance Committee |
| **Approved** | 2026-07-27 |
| **Parent** | [`CES-001-Engineering-Standard.md`](CES-001-Engineering-Standard.md) · [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md) |
| **Milestone** | All (M2, M3, M4, M5, …) |
| **Release** | FR2+ |
| **Implementation authority** | None (standard only) |
| **Production effect** | **None** |

**Applies to:** Every authorized **Implementation Unit (IU)** under an Engineering Task (e.g. E-01, E-02) and every **Phase** within such tasks.

**Related:** [`templates/IU-Completion-Template.md`](templates/IU-Completion-Template.md) · [`CES-001`](CES-001-Engineering-Standard.md) · [`CES-008`](CES-008-Testing-and-Verification-Engineering-Standard.md) · [`CES-009`](CES-009-Deployment-and-Release-Engineering-Standard.md)

> **Scope lock:** This standard governs engineering completion documentation only. It does **not** authorize implementation or modify Blueprint, IA, CDR, or governance records.

---

## 1. Purpose

Establish a permanent rule: **every completed Implementation Unit (IU) produces exactly one standardized Completion record.**

Completion records provide audit evidence for Verification and Release gates, preserve implementation history, and prevent undocumented drift between Engineering Tasks.

---

## 2. Naming convention

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

### 2.3 Supporting documents

Deployment readiness, verification reviews, and investigation records may exist as separate documents but **do not** substitute for an IU Completion record when the IU modified repository artifacts or achieved an authorized engineering deliverable.

---

## 3. Required content — IU Completion

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
| 8 | **Backward Compatibility** | Whether production behavior was preserved |
| 9 | **Known Limitations** | Intentionally deferred items only |
| 10 | **Deferred Work** | Next IU(s) |
| 11 | **Authority** | Blueprint, IA, Phase Plan, Engineering Review |

---

## 4. Required content — Phase completion

Phase completion documents **shall** summarize:

- All completed IUs (with links to IU Completion records)
- Consolidated deliverables
- Verification summary
- Deployment readiness (if applicable)
- Deferred work for subsequent phases
- Next phase / next IU

---

## 5. Status definitions

| Status | Use when |
|--------|----------|
| **Completed** | All IU objectives and verification criteria met; no mandatory follow-up IU |
| **Completed with Follow-up** | IU deliverable accepted; a documented follow-up IU (e.g. correction, readiness) is required or was completed separately |
| **Blocked** | IU stopped; blocker documented; no partial authorization to proceed |
| **Cancelled** | IU scope withdrawn under IA; no implementation merged |

---

## 6. Workflow placement

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

## 7. Template

| Template | Path |
|----------|------|
| **IU Completion Template** | [`templates/IU-Completion-Template.md`](templates/IU-Completion-Template.md) |

Engineering **shall** copy the template for each new IU Completion record.

---

## 8. Permanent documentation rules (DOC-1 … DOC-5)

| # | Rule |
|---|------|
| **DOC-1** | Every completed IU **shall** produce one IU Completion record |
| **DOC-2** | Every completed phase **shall** produce one Phase Completion record |
| **DOC-3** | Completion records **shall not** modify Blueprint, IA, CDR, or RC — they report what was done |
| **DOC-4** | Files Modified **shall** list all repository paths changed in the IU |
| **DOC-5** | Deferred Work **shall** identify the next authorized IU; out-of-scope items **shall** reference the owning Engineering Task (E-xx) |

---

## 9. Related standards

| Standard | Relationship |
|----------|--------------|
| **CES-001** | Engineering discipline, CITM, slice structure |
| **CES-008** | Verification evidence cited in §7 Verification |
| **CES-009** | Deployment readiness cited when migrations are involved |

---

**Authorization:** Standard only — does not authorize code or schema changes.
