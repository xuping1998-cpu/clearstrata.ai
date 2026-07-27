# Implementation — Design, standards, and authorization

**Category:** `docs/implementation/`  
**Authority:** [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md) · [`CES-001-Engineering-Standard.md`](CES-001-Engineering-Standard.md) · [`CES-002-Database-Engineering-Standard.md`](CES-002-Database-Engineering-Standard.md) · [`CES-003-Frontend-Engineering-Standard.md`](CES-003-Frontend-Engineering-Standard.md)

This folder holds **Engineering Standards**, **Slice Design** records, **Implementation Authorization** records, and **templates**. It does **not** contain application source code or SQL migrations.

---

## Engineering Constitution

The Engineering Constitution defines the permanent engineering principles shared by all ClearStrata implementation work.

These documents establish engineering consistency, traceability and implementation discipline.

Engineering Constitution documents **DO NOT** authorize implementation.

Feature-specific implementation **SHALL** be defined through Slice Design documents and separately approved by an Implementation Authorization record.

The Engineering Constitution is intended to remain stable. New standards may be added, but existing approved standards should not be redefined without constitutional approval.

**Governance baseline:** [`GOVERNANCE-FREEZE-v1.0.md`](../GOVERNANCE-FREEZE-v1.0.md) — Governance Framework Version 1.0

Permanent engineering standards series (**CES-001 … CES-010**). Identifiers **CES-004 … CES-010** are **reserved placeholders** only — no engineering requirements approved.

```
Engineering Constitution
├── Core Standards
│   ├── CES-001 Engineering Standard          — Approved
│   ├── CES-002 Database Engineering Standard — Approved
│   └── CES-003 Frontend Engineering Standard — Approved
├── Platform Standards
│   ├── CES-004 API / RPC                     — Reserved
│   ├── CES-005 Security                      — Reserved
│   └── CES-006 AI                            — Reserved
├── Quality Standards
│   ├── CES-007 Audit & Compliance            — Reserved
│   ├── CES-008 Testing & Verification        — Reserved
│   └── CES-009 Deployment & Release          — Reserved
└── Governance Standards
    └── CES-010 Documentation & Knowledge     — Approved
```

### Core Standards

| CES | Title | Status | Record |
|-----|-------|--------|--------|
| **CES-001** | Engineering Standard | **Approved** | [`CES-001-Engineering-Standard.md`](CES-001-Engineering-Standard.md) |
| **CES-002** | Database Engineering Standard | **Approved** | [`CES-002-Database-Engineering-Standard.md`](CES-002-Database-Engineering-Standard.md) |
| **CES-003** | Frontend Engineering Standard | **Approved** | [`CES-003-Frontend-Engineering-Standard.md`](CES-003-Frontend-Engineering-Standard.md) |

### Platform Standards

| CES | Title | Status | Record |
|-----|-------|--------|--------|
| **CES-004** | API / RPC Engineering Standard | **Reserved** | [`CES-004-API-RPC-Engineering-Standard.md`](CES-004-API-RPC-Engineering-Standard.md) |
| **CES-005** | Security Engineering Standard | **Reserved** | [`CES-005-Security-Engineering-Standard.md`](CES-005-Security-Engineering-Standard.md) |
| **CES-006** | AI Engineering Standard | **Reserved** | [`CES-006-AI-Engineering-Standard.md`](CES-006-AI-Engineering-Standard.md) |

### Quality Standards

| CES | Title | Status | Record |
|-----|-------|--------|--------|
| **CES-007** | Audit & Compliance Engineering Standard | **Reserved** | [`CES-007-Audit-and-Compliance-Engineering-Standard.md`](CES-007-Audit-and-Compliance-Engineering-Standard.md) |
| **CES-008** | Testing & Verification Engineering Standard | **Reserved** | [`CES-008-Testing-and-Verification-Engineering-Standard.md`](CES-008-Testing-and-Verification-Engineering-Standard.md) |
| **CES-009** | Deployment & Release Engineering Standard | **Reserved** | [`CES-009-Deployment-and-Release-Engineering-Standard.md`](CES-009-Deployment-and-Release-Engineering-Standard.md) |

### Governance Standards

| CES | Title | Status | Record |
|-----|-------|--------|--------|
| **CES-010** | Documentation & Knowledge Engineering Standard | **Approved** | [`CES-010-Documentation-and-Knowledge-Engineering-Standard.md`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) |

---

## Approved standards (summary)

### CES-003 scope

Governs every future frontend artifact:

- React pages and components
- Hooks
- Routes and navigation
- Permissions and UI gates
- UI state and workflows
- Localization (Chinese + English)

**Philosophy:** Frontend reflects constitutional truth; it does not become the source of truth.

### CES-002 scope

Governs every future database artifact — tables, views, migrations, RPCs, triggers, audit tables, snapshot tables, schedulers.

**Philosophy:** The database implements the approved constitutional model.

### CITM — Constitutional Implementation Traceability Matrix

**Abbreviation:** CITM  
**Full name:** Constitutional Implementation Traceability Matrix

Every engineering item — database **and** frontend — **must** appear in the CITM table within a Slice Design.

**Rule:** No CITM row → implementation **not authorized**.

| Coverage | Standard |
|----------|----------|
| Database (tables, RPC, migrations, …) | [`CES-002` §9](CES-002-Database-Engineering-Standard.md#9-database-citm) |
| Frontend (pages, routes, components, permissions, workflows) | [`CES-003` §9](CES-003-Frontend-Engineering-Standard.md#9-ui-traceability-citm) |
| General | [`CES-001` §2](CES-001-Engineering-Standard.md#2-constitutional-implementation-traceability-matrix-citm) |

### Slice Design Template

| Template | Purpose |
|----------|---------|
| [`templates/Slice-Design-Template.md`](templates/Slice-Design-Template.md) | Required structure for **all** future slice designs |
| [`templates/IU-Completion-Template.md`](templates/IU-Completion-Template.md) | Required structure for **every** completed Implementation Unit ([`CES-010`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md)) |

Every slice **shall** contain: **Objective · Design · Migration · Verification · Constitutional Compliance**

- Database work **shall** comply with **CES-002**
- Frontend work **shall** comply with **CES-003**

---

## Engineering Process

Engineering quality-control standards. **Not** part of the constitutional governance hierarchy.

| Process | Status | Record |
|---------|--------|--------|
| **Engineering Review Checklist** | **Approved** | [`Engineering-Review-Checklist.md`](Engineering-Review-Checklist.md) |

**Rule:** Every **Engineering Blueprint** must pass Engineering Review before **Implementation Authorization**.

**Workflow:**

```
Engineering Blueprint → Engineering Review → Blueprint Approved → Implementation Authorization → Engineering → Verification → Release
```

**Architecture Review** is required **only** when approved architecture must change (Investigation → CDR → Approval).

| Blueprint | Status | Review |
|-----------|--------|--------|
| [`M2-S3-Snapshot-Freeze-Design.md`](M2-S3-Snapshot-Freeze-Design.md) | **Draft** (ER-001 approved) | [`ER-001`](ER-001-M2-S3-Blueprint-Review.md) — **Approved with Minor Comments** |

---

## Engineering Execution

Authorized implementation records. Engineering work **may begin** only when listed here as **Authorized**.

| Authorization | Milestone / Slice | Status | Record |
|---------------|-----------------|--------|--------|
| **IA-001** | M2-S3 Snapshot Freeze | **Authorized** | [`M2-S3-Implementation-Authorization.md`](M2-S3-Implementation-Authorization.md) |

**Chain:** Blueprint → ER-001 → **IA-001** → **Work Breakdown** → Engineering → Verification → Release

| Execution plan | Milestone / Slice | Status | Record |
|----------------|-----------------|--------|--------|
| **M2-S3 Work Breakdown** | M2-S3 | **Approved** | [`M2-S3-Engineering-Work-Breakdown.md`](M2-S3-Engineering-Work-Breakdown.md) |

### Implementation Unit completion ([`CES-010`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md))

Every completed **IU** **shall** produce `{Task}-IU-{phase.unit}-Completion.md`. When all IUs in a phase finish, produce `{Task}-Phase-{n}-Completion.md`.

| Record | Task / Phase | Status |
|--------|--------------|--------|
| [`E-01-IU-1.1-Completion.md`](E-01-IU-1.1-Completion.md) | E-01 IU-1.1 | Completed with Follow-up |
| [`E-01-IU-1.1C-Completion.md`](E-01-IU-1.1C-Completion.md) | E-01 IU-1.1C | Completed |
| [`E-01-Phase-1-Completion.md`](E-01-Phase-1-Completion.md) | E-01 Phase 1 | **Completed** |

---

## Implementation authority chain

```
RC → Recovery / Investigation → CDR → Engineering Blueprint → Engineering Review → Implementation Authorization → Engineering → Verification → Release
```

- **Approved CDR** does not authorize code changes.
- **Approved Slice Design** does not authorize code changes.
- **Implementation Authorized** is required before application, schema, or production contract changes.

---

## Current status (M2)

| Slice | Blueprint | Engineering Review | Implementation | CES compliance |
|-------|-----------|------------------|----------------|----------------|
| **M2 Slice 3** | [`M2-S3-Snapshot-Freeze-Design.md`](M2-S3-Snapshot-Freeze-Design.md) | [`ER-001`](ER-001-M2-S3-Blueprint-Review.md) — Approved with Minor Comments | **[`IA-001`](M2-S3-Implementation-Authorization.md) — Authorized** | CES-001 + CES-002 + CES-003 |

**M2 Slice 3:** Implementation **authorized** (IA-001, 2026-07-26). Engineering work may begin within Blueprint scope. Production deployment requires Verification and Release gates.

```
docs/implementation/M2-S3-Snapshot-Freeze-Design.md          — Blueprint (Draft, ER-001 approved)
docs/implementation/ER-001-M2-S3-Blueprint-Review.md         — Engineering Review (Completed)
docs/implementation/M2-S3-Implementation-Authorization.md    — IA-001 Authorized
docs/implementation/M2-S3-Engineering-Work-Breakdown.md     — E-01 … E-06 task decomposition
```

---

## Permanent engineering rules (summary)

| # | Rule |
|---|------|
| 1 | Every engineering item must appear in the **CITM** |
| 2 | Every Slice must contain: Objective · Design · Migration · Verification · Constitutional Compliance |
| 3 | No implementation without **Implementation Authorization** |
| 4 | No engineering decision may contradict an **Approved CDR** |
| 5 | Production behavior is **evidence**, not constitutional authority |
| 6 | Constitutional changes: Investigation → CDR → Approval → Updated Slice Design |
| 7 | Historical constitutional records shall **never** be rewritten |

**Database rules (CES-002):** DB-1 through DB-7 — [`CES-002` §11](CES-002-Database-Engineering-Standard.md#11-permanent-database-rules)

**Frontend rules (CES-003):** FE-1 through FE-8 — [`CES-003` §12](CES-003-Frontend-Engineering-Standard.md#12-permanent-frontend-rules)

Full rules: [`CES-001` §7](CES-001-Engineering-Standard.md#7-permanent-engineering-rules)

---

## Related

| Artifact | Path |
|----------|------|
| Document governance | [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md) |
| Design system | [`design-system/CDS-001_ClearStrata_Design_System.md`](../design-system/CDS-001_ClearStrata_Design_System.md) |
| Milestone M2 | [`milestones/M2-Meeting-Resolution-Authoring.md`](../milestones/M2-Meeting-Resolution-Authoring.md) |
| CDR-001 | [`cdr/CDR-001-Voting-Eligibility-Decision.md`](../cdr/CDR-001-Voting-Eligibility-Decision.md) |
| Known gaps | M2 § **Known Constitutional Implementation Gaps** |
