# Architecture Standards Index

**Repository layer:** 🏛 Layer 1 — Foundational Milestones · **Structure:** [RM-008](../Repository_Constitutional_Structure.md)

## Foundational Milestones (PERMANENT)

These are not project milestones. They define the constitutional architecture inherited by all future projects.

**Hall of record:** [Repository Hall of Milestones](../History/Milestones.md#layer-1--foundational-milestones) (RM-006)

**Governance Principles (GP):** [GP-005](../Principles/GP-005_Shared_Governance_Space.md) · [GP-006](../Principles/GP-006_Governance_Experience.md)

**Design System (CDS):** [CDS-001](../design-system/CDS-001_ClearStrata_Design_System.md) — visual, interaction, accessibility standards

---

### Architecture Constitution

> **These standards define the constitutional architecture of the ClearStrata platform.**
>
> All future governance modules, projects, AI capabilities, and architectural decisions **must remain consistent** with these standards.
>
> Future implementation **inherits these foundations** rather than replacing them.

| Document | ID | Role | Status |
|----------|-----|------|--------|
| [GPA-001_Governance_Pyramid_Architecture.md](GPA-001_Governance_Pyramid_Architecture.md) | GPA-001 | Pyramid layers — Matter → AI | FOUNDATION |
| [GPA-002_Single_Source_of_Governance_Truth.md](GPA-002_Single_Source_of_Governance_Truth.md) | GPA-002 | One truth; projections only | FOUNDATION |
| [GDS-001_Governance_Data_Standard.md](GDS-001_Governance_Data_Standard.md) | GDS-001 | Canonical entities and schema rules | FOUNDATION |
| [GRFC-001_Governance_Request_for_Change.md](GRFC-001_Governance_Request_for_Change.md) | GRFC-001 | Change governance — architecture before code | FOUNDATION |
| [CDS-001_ClearStrata_Design_System.md](../design-system/CDS-001_ClearStrata_Design_System.md) | CDS-001 | Experience — visual & interaction | FOUNDATION |

**Cross-reference:** GPA-001 ↔ GPA-002 ↔ GDS-001 ↔ GRFC-001 ↔ CDS-001

---

## Repository hierarchy

```
Foundational Milestones     ← you are here (PERMANENT)
        ↓
Project Milestones          (M-001 …)
        ↓
Feature Records             (PR-xxx)
        ↓
Bug Fix Records             (BF-xxx)
        ↓
UI Polish Records           (UIP-xxx)
```

---

## Golden Inscription

**Architecture outlives implementation.**

Good governance is built by making better decisions **before** writing better code.

**架构的生命，远长于实现。** 好的治理，不是靠写更多代码实现的；而是在写代码之前，先做出更好的决策。

---

## Change proposals

Future governance changes: [GRFC/](GRFC/) — numbered **GRFC-002+** per [GRFC-001](GRFC-001_Governance_Request_for_Change.md).

---

## Other architecture records

Existing ADRs: `docs/ADR/` (**AR** prefix). See [STRUCTURE.md](../STRUCTURE.md#architecture-docsarchitecture--target).
