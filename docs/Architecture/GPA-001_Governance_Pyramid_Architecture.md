# GPA-001 — Governance Pyramid Architecture

## Architecture Standard · Foundational Governance Information Model

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | GPA-001 |
| **Document Title** | Governance Pyramid Architecture |
| **Document Type** | Architecture Standard (GPA) |
| **Status** | FOUNDATION |
| **Version** | 1.0 |
| **Authority** | [GP-005](../Principles/GP-005_Shared_Governance_Space.md), [GP-006](../Principles/GP-006_Governance_Experience.md) |
| **Effective Date** | 2026-07-12 |
| **Classification** | Architecture Standard |
| **Owner** | ClearStrata Project One |
| **Supersedes** | None |
| **Superseded By** | None |
| **Related Documents** | GP-005, GP-006, UIP-011, UIP-012, UIP-013, [GPA-002](GPA-002_Single_Source_of_Governance_Truth.md), [GDS-001](GDS-001_Governance_Data_Standard.md), [GRFC-001](GRFC-001_Governance_Request_for_Change.md) |
| **Repository Location** | `docs/Architecture/GPA-001_Governance_Pyramid_Architecture.md` |

---

## Purpose

Governance Pyramid Architecture (GPA) defines the **foundational architecture** of ClearStrata.

It is **not** a UI specification.  
It is **not** a workflow specification.

GPA defines how governance information is **created**, **organized**, **accumulated**, and ultimately **used by AI**.

Every future governance feature **must align with GPA**.

---

## Core Philosophy

**AI should never become the source of governance.**

| Step | Principle |
|------|-----------|
| 1 | **Reality** creates governance |
| 2 | **Governance** creates evidence |
| 3 | **Evidence** creates knowledge |
| 4 | **Knowledge** empowers AI |

---

## Governance Pyramid

```
                AI Assistant
                     ▲
              Governance Knowledge
                     ▲
              Governance Evidence
                     ▲
              Governance Timeline
                     ▲
              Governance Workflow
                     ▲
              Governance Matter
```

Each layer **depends on** the layer below.  
No layer may invent facts that did not originate from a lower layer.

---

## Layer 1 — Governance Matter

Everything begins with a **governance matter**.

Examples: Insurance, Bylaw, Contract, Complaint, Maintenance, Election, Budget, Meeting.

A **Matter** is the unit of governance.

| ClearStrata implementation | Role |
|----------------------------|------|
| `governance_matters` | Authoritative matter record |
| `/community-deliberation/:matterId` | Matter entry surface |

---

## Layer 2 — Governance Workflow

A Matter moves through governance.

Examples: Discussion → Consultation → Resolution → Meeting → Voting → Execution → Archive.

| Rule | Meaning |
|------|---------|
| Workflow **changes state** | Status transitions drive lifecycle |
| Workflow **never invents facts** | Only records what governance actors did |

| ClearStrata implementation | Role |
|----------------------------|------|
| `governance_matter_revisions` | Append-only workflow change log |
| `governance_matters.status` | Current workflow state |
| Constitutional lifecycle model | Discussion → Archive mapping |

---

## Layer 3 — Governance Timeline

Every workflow event creates an **immutable timeline event**.

Timeline records: **who**, **what**, **when**, **where**.

| Rule | Meaning |
|------|---------|
| **Append-only** | No manual editing, no deletion |
| **Official history** | Timeline is the governance record of record |

| ClearStrata implementation | Role |
|----------------------------|------|
| [UIP-013](../projects/UIP-013_Governance_Timeline_Intelligence.md) | Timeline Intelligence UI |
| `governanceTimelineModel.ts` | Projects revisions, comments, CDA, resolutions into timeline events |
| `GovernanceMatterTimelineTab` | Canonical lifecycle view on matter detail |

---

## Layer 4 — Governance Evidence

Every important timeline event may attach **evidence**.

Examples: SPA, Bylaw, Legal opinion, Meeting notice, Minutes, Vote result, Invoice, Contract, Attachments.

Evidence explains **WHY** something happened.

| ClearStrata implementation | Role |
|----------------------------|------|
| Timeline event `documents[]` | Links to resolution, meeting, voting artifacts |
| Timeline event `reasonEn` / `reasonZh` | Workflow-derived decision evidence (not AI) |
| `community_resolutions`, meeting records | Authoritative document sources |

---

## Layer 5 — Governance Knowledge

Knowledge is generated from **accumulated governance history**.

Knowledge includes:

- Related Matters
- Historical Decisions
- Applicable SPA
- Applicable Bylaws
- Previous Resolutions
- Recurring Issues
- Community Memory

| Rule | Meaning |
|------|---------|
| **Searchable** | Knowledge must be queryable across matters |
| **Reusable** | Prior decisions inform future governance |

| ClearStrata implementation | Status |
|----------------------------|--------|
| Community Memory / constitutional basis | Partial — by category and resolution |
| Cross-matter knowledge graph | **Planned** — Evidence Intelligence, Knowledge Intelligence |

---

## Layer 6 — Governance AI

AI **never invents** governance.

AI only reasons from:

- Timeline
- Evidence
- Knowledge
- Current Workflow

| Rule | Meaning |
|------|---------|
| **Cite sources** | Every recommendation must trace to governance data |
| **Explainable** | Recommendations must be auditable |

| ClearStrata implementation | Role |
|----------------------------|------|
| [UIP-012](../projects/UIP-012_Governance_Intelligence.md) | Deterministic council intelligence (no LLM invention) |
| [UIP-011](../projects/UIP-011_Governance_Cockpit.md) | Workflow operating surface |
| Constitutional Deliberation Assistant (CDA) | Analysis from discussion evidence — council-only draft |

---

## Engineering Principles

| Principle | Requirement |
|-----------|-------------|
| Never duplicate history | One timeline projection from `governance_matter_revisions` |
| Never duplicate evidence | Attach to timeline events; link to authoritative documents |
| Reuse workflow events | No parallel audit logs |
| Project UI from authoritative data | UI reads matter, revisions, comments, resolutions — no parallel truth |
| No parallel truth | GPA layers must converge on a single source |

---

## Future Modules

All future modules **inherit GPA**:

| Module | GPA Layer |
|--------|-----------|
| Timeline Intelligence | Layer 3 — **ACTIVE** (UIP-013) |
| Evidence Intelligence | Layer 4 — Planned |
| Knowledge Intelligence | Layer 5 — Planned |
| Governance Reports | Layers 3–5 — Planned |
| Council Handover | Layers 3–5 — Planned |
| Legal Discovery | Layers 3–4 — Planned |
| Audit Export | Layers 3–4 — Planned |
| Owner History | Layer 3 — Planned |

---

## Traceability Acceptance

Every governance action must be traceable from **AI recommendation** back through:

```
Knowledge
    ↓
Evidence
    ↓
Timeline
    ↓
Workflow
    ↓
Original Matter
```

Nothing should exist without traceability.

---

## Pyramid Alignment Matrix

| Document | Layer | Alignment |
|----------|-------|-----------|
| **GP-005** | 1–2 | Shared governance space; one matter, one workflow |
| **GP-006** | 2–3 | Governance experience; lifecycle visibility |
| **UIP-011** | 2 | Council workflow operating cockpit |
| **UIP-012** | 6 | Deterministic intelligence from workflow state |
| **UIP-013** | 3–4 | Timeline + workflow evidence projection |

---

## Related Standards

Architecture Constitution — cross-reference:

| Standard | Document | Role |
|----------|----------|------|
| **GPA-002** | [Single Source of Governance Truth](GPA-002_Single_Source_of_Governance_Truth.md) | One authoritative truth; projections only |
| **GDS-001** | [Governance Data Standard](GDS-001_Governance_Data_Standard.md) | Canonical entities and schema |
| **GRFC-001** | [Governance Request for Change](GRFC-001_Governance_Request_for_Change.md) | Mandatory design review before major changes |

*Foundational Milestone:* [Repository Hall of Milestones](../History/Milestones.md#foundational-milestones) (RM-006)

---

## Closing Principle

**Reality creates governance. Governance creates evidence. Evidence creates knowledge. Knowledge empowers AI.**

AI assists. People decide. The Pyramid remembers.

---

**END OF GPA-001**

| | |
|---|---|
| **Status** | FOUNDATION |
| **Document Number** | GPA-001 |
| **Version** | 1.0 |
| **Authority** | GP-005, GP-006 |
