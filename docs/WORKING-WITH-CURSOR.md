# Working with Cursor

| Field | Value |
|-------|-------|
| **Document** | WORKING-WITH-CURSOR |
| **Title** | AI Collaboration / Cursor Working Convention |
| **Type** | Working Convention |
| **Status** | **Approved** |
| **Authority** | ClearStrata Engineering Team |
| **Approved** | 2026-06-24 |
| **Production effect** | **None** |

**Governance framework:** [`DOCUMENT-GOVERNANCE.md`](DOCUMENT-GOVERNANCE.md) · [`GOVERNANCE-FREEZE-v1.0.md`](GOVERNANCE-FREEZE-v1.0.md)

> **Important:** This document is **NOT** part of the constitutional governance hierarchy. It is a **working convention** for engineering collaboration using Cursor and AI-assisted development.

---

## 1. Purpose

### Role of Cursor

Cursor is the primary AI-assisted development environment for ClearStrata engineering. It accelerates design, implementation, verification, and documentation **within** the established governance framework.

### Cursor follows governance

Cursor (and AI agents) **shall** follow:

- Approved **RC** and **CDR** — not production-as-is
- **CES** engineering standards
- **DOCUMENT-GOVERNANCE** hierarchy and authority order
- **CITM** traceability requirements
- **Implementation Authorization** gates before production-impacting changes

AI assists engineering. **Human approval** governs constitutional decisions.

---

## 2. Task classification

Identify the task **level** before beginning work. Do not mix levels in a single session without explicit acknowledgment.

### Level 1 — Governance Tasks

**Purpose:** Constitutional, requirement, decision, or framework documentation.

| Allowed | Forbidden |
|---------|-----------|
| Founding Constitution (baseline-locked — amend only via formal process) | SQL |
| RC | RPC |
| CDR | React |
| CES (new or reserved standards — via governance approval) | Edge Functions |
| DOCUMENT-GOVERNANCE | Production changes |
| Investigations, recovery records | Implementation code |
| Era records, governance freeze | Schema migrations |

**Mode:** Documentation only unless explicitly authorized otherwise.

---

### Level 2 — Engineering Design Tasks

**Purpose:** Slice-level design and planning — no production implementation.

| Allowed | Forbidden |
|---------|-----------|
| Slice Design documents | Production implementation |
| Implementation Authorization records | Deploying migrations |
| Architecture diagrams | Modifying live RPC/contracts |
| Migration planning (documented, not executed) | Changing production data |
| Verification planning | |
| CITM tables | |
| Use of Slice Design Template | |

**Requires:** Approved CDR (and recovery where applicable) for constitutional slices.

**Does not authorize:** Code, schema, or production changes.

---

### Level 3 — Implementation Tasks

**Purpose:** Build authorized changes.

**Allowed only after:** **Implementation Authorization** record exists for the slice.

| May modify |
|------------|
| SQL / migrations |
| RPC |
| React (pages, components, hooks) |
| Edge Functions |
| Triggers |
| Tests |

**Requires:** CES-001 (+ CES-002/003 as applicable) compliant Slice Design with CITM.

**Forbidden during implementation:**

- Redesigning approved RC or CDR
- Modifying production contracts beyond authorized scope
- Skipping CITM rows for new engineering items

---

### Level 4 — Verification Tasks

**Purpose:** Prove compliance and readiness for release.

| Allowed |
|---------|
| Regression testing |
| Audit review |
| QA (manual and automated) |
| Release verification |
| Constitutional compliance verification |
| SQL/UI validation against Slice Design |

Verification **does not** authorize new scope — only validates authorized work.

---

## 3. Working rules

| # | Rule |
|---|------|
| 1 | **Always identify the task level** before beginning work |
| 2 | **Do not mix governance with implementation** in one undisciplined pass |
| 3 | **Do not redesign** approved constitutional decisions during implementation |
| 4 | **Do not modify production contracts** without Implementation Authorization |
| 5 | **Maintain CITM traceability** — every new engineering item gets a row |
| 6 | **Production is evidence**, not constitutional authority |
| 7 | **Governance always takes precedence** over implementation convenience |
| 8 | **Do not rewrite** approved historical records to match later decisions |

---

## 4. Engineering workflow

```
Governance (RC · CDR · Milestone)
    ↓
Engineering Standards (CES)
    ↓
Slice Design (+ CITM)
    ↓
Implementation Authorization
    ↓
Engineering (Cursor / AI-assisted)
    ↓
Verification
    ↓
Release
```

When using Cursor, state the **current step** in prompts (e.g. "Level 2 — Slice Design only, no code").

---

## 5. AI collaboration principles

| Principle | Meaning |
|-----------|---------|
| **AI assists engineering** | Cursor accelerates work; it does not replace governance approval |
| **Human approval governs constitutional decisions** | CDR, Implementation Authorization, and release gates require human governance |
| **Cursor follows governance** | Agents must read and respect DOCUMENT-GOVERNANCE, CES, and active RC/CDR |
| **Governance over convenience** | Never skip authorization because AI can "just fix it in code" |
| **Documentation-first for Level 1–2** | Design and traceability before implementation |
| **Explicit scope in prompts** | Include task level, forbidden actions, and active slice identifier |

---

## 6. Recommended prompt conventions

When starting Cursor work, include:

1. **Task level** (1–4)
2. **Active slice** (e.g. M2-S3) if applicable
3. **Forbidden actions** (e.g. "no migrations", "documentation only")
4. **Authoritative records** (RC, CDR, CES links)
5. **Mode** (design vs implement vs verify)

**Example:** *"Level 2 — M2-S3 Slice Design. CES-001 + CES-002 + CES-003. CDR-001 Approved. No SQL, no React, no production changes."*

---

## 7. Related documents

| Document | Role |
|----------|------|
| [`DOCUMENT-GOVERNANCE.md`](DOCUMENT-GOVERNANCE.md) | Constitutional documentation hierarchy |
| [`GOVERNANCE-FREEZE-v1.0.md`](GOVERNANCE-FREEZE-v1.0.md) | Framework v1.0 stability |
| [`implementation/CES-001-Engineering-Standard.md`](implementation/CES-001-Engineering-Standard.md) | Engineering standard |
| [`implementation/templates/Slice-Design-Template.md`](implementation/templates/Slice-Design-Template.md) | Slice design structure |
| [`eras/Engineering-Implementation-Era-v1.0.md`](eras/Engineering-Implementation-Era-v1.0.md) | Current era |

---

**Not constitutional authority.** This working convention supports engineering; it does not override RC, CDR, or CES.
