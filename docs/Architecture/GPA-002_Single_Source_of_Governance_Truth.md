# GPA-002 — Single Source of Governance Truth (SSGT)

## Architecture Standard · Authoritative Governance Data Model

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | GPA-002 |
| **Document Title** | Single Source of Governance Truth |
| **Document Type** | Architecture Standard (GPA) |
| **Status** | FOUNDATION |
| **Version** | 1.0 |
| **Authority** | [GPA-001](GPA-001_Governance_Pyramid_Architecture.md), [GP-005](../Principles/GP-005_Shared_Governance_Space.md), [GP-006](../Principles/GP-006_Governance_Experience.md) |
| **Effective Date** | 2026-07-12 |
| **Classification** | Architecture Standard |
| **Owner** | ClearStrata Project One |
| **Supersedes** | None |
| **Superseded By** | None |
| **Related Documents** | GPA-001, GP-005, GP-006, UIP-011, UIP-012, UIP-013, [GDS-001](GDS-001_Governance_Data_Standard.md), [GRFC-001](GRFC-001_Governance_Request_for_Change.md) |
| **Repository Location** | `docs/Architecture/GPA-002_Single_Source_of_Governance_Truth.md` |

---

## Purpose

ClearStrata must maintain **one and only one** authoritative source of governance truth.

Every UI, API, AI, report, dashboard, notification, timeline, or document must be a **projection** of authoritative governance data.

**Nothing may become a parallel source of truth.**

---

## Definition — Truth

**Truth** means an authoritative governance fact created by a **real governance action**.

| Example facts |
|---------------|
| Matter Created |
| Comment Posted |
| Consultation Opened |
| Resolution Approved |
| Meeting Scheduled |
| Vote Submitted |
| Vote Closed |
| Document Uploaded |
| Contract Signed |
| Execution Completed |

These are **facts**. They are recorded once, at the layer where the action occurred.

---

## Definition — Projection

Everything else is a **projection**.

| Example projections |
|---------------------|
| Dashboard |
| Governance Cockpit |
| Timeline |
| Reports |
| AI Summary |
| Notifications |
| Search Results |
| Owner Participation |
| Council Workspace |

Projections may **cache** or **aggregate** information, but must **never** become the authoritative record.

---

## Architecture

SSGT implements [GPA-001](GPA-001_Governance_Pyramid_Architecture.md):

```
Matter
  ↓
Workflow
  ↓
Timeline
  ↓
Evidence
  ↓
Knowledge
  ↓
AI
```

Each layer may only depend on the layer **immediately below** it.

**No shortcuts.**

---

## Rules by Layer

### AI Rules

| Allowed | Forbidden |
|---------|-----------|
| Summarize | Create governance facts |
| Recommend | Become the governance record |
| Classify | Answer "because I think so" |
| Prioritize | |
| Explain | |

Every AI answer must be **explainable**. AI recommendations should cite **Timeline**, **Evidence**, and **Knowledge**.

| ClearStrata implementation | SSGT role |
|----------------------------|-----------|
| [UIP-012](../projects/UIP-012_Governance_Intelligence.md) | Deterministic projection from `governance_matters` — no invented facts |
| Constitutional Deliberation Assistant | Analysis draft — council-only; not authoritative governance record |
| Future LLM features | Must cite timeline/evidence sources |

---

### Workflow Rules

| Rule | Meaning |
|------|---------|
| Workflow **changes state** | `governance_matters.status`, linked IDs |
| Timeline **records** state changes | `governance_matter_revisions` append-only log |
| Timeline **never changes** workflow | UI timeline is read-only projection |

| Authoritative source | Projection |
|---------------------|------------|
| `governance_matters` | Hub cards, cockpit queue |
| `governance_matter_revisions` | Timeline tab (UIP-013) |

---

### Timeline Rules

| Rule | Meaning |
|------|---------|
| **Append-only** | No manual edit, no delete |
| Corrections create **new events** | Never rewrite history |
| **History is never rewritten** | Immutable audit trail |

| ClearStrata implementation | SSGT role |
|----------------------------|-----------|
| `buildGovernanceTimelineEvents()` | Projects revisions + comments + CDA + resolutions — no parallel audit table |
| `GovernanceMatterTimelineTab` | Read-only lifecycle view |

---

### Evidence Rules

| Rule | Meaning |
|------|---------|
| Evidence is **attached** to timeline events | Document links on events |
| Evidence explains **why** | Workflow-derived `reason` fields — not AI invention |
| Evidence **never creates** governance actions | Upload does not bypass workflow |

| Authoritative source | Projection |
|---------------------|------------|
| `community_resolutions`, meeting records, uploaded documents | Timeline `documents[]` links |
| Revision `snapshot` | Decision evidence context |

---

### Knowledge Rules

| Rule | Meaning |
|------|---------|
| Knowledge is **computed** | Derived, not authored |
| Knowledge is **searchable** | Query layer |
| Knowledge is **disposable** | Safe to rebuild |
| Knowledge can always be rebuilt from **Timeline + Evidence** | No unique truth in knowledge cache |
| Knowledge is **never authoritative** | Not a source of record |

---

### Dashboard Rules

| Rule | Meaning |
|------|---------|
| Cards, counts, charts are **projections** | Aggregations over matters |
| Removing a dashboard **never loses** governance history | UI is ephemeral |

| ClearStrata implementation | SSGT role |
|----------------------------|-----------|
| Governance Hub feed | Projection of `governance_matters` |
| [UIP-011](../projects/UIP-011_Governance_Cockpit.md) cockpit metrics | Projection — not stored as facts |
| `governance_matter_subscriptions` | User preference — not governance truth |

---

### Notification Rules

| Rule | Meaning |
|------|---------|
| Notifications, emails, push, SMS, announcements are **delivery mechanisms** | Not governance history |
| Deleting a notification **never affects** governance records | Delivery ≠ truth |

---

## Engineering Rules

| Rule | Requirement |
|------|-------------|
| Never duplicate workflow state | One `governance_matters.status` |
| Never duplicate history | One revision log → one timeline projection |
| Never duplicate evidence | Link to authoritative documents |
| Never maintain parallel truth | No `submit_join_request_v2`-style parallel flows |
| Prefer **projection** over **replication** | Compute UI from source tables |

---

## Future Modules

All modules must comply with SSGT:

Finance · Procurement · Meetings · Voting · Complaints · Maintenance · Audits · Legal · Documents

Each module writes **facts** at the workflow layer and **projects** everywhere else.

---

## Acceptance Test

Every screen in ClearStrata must answer:

> **Where does this information come from?**

The answer must always resolve back to:

```
Matter
  ↓
Workflow
  ↓
Timeline
  ↓
Evidence
```

---

## SSGT Compliance Matrix

| Surface | Type | Authoritative source |
|---------|------|---------------------|
| Matter detail | Projection | `governance_matters` |
| Discussion tab | Mixed | Comments = truth (`governance_matter_comments`); UI = projection |
| Timeline tab (UIP-013) | Projection | `governance_matter_revisions` + linked records |
| Council Cockpit (UIP-011) | Projection | Matters + loaded CDA flags |
| Governance Intelligence (UIP-012) | Projection | Derived metrics — cites matter state |
| Owner Participation panel | Projection | Subscriptions + comment IDs |
| Notifications | Delivery | Not governance history |

---

## Relationship to GPA-001

| Document | Role |
|----------|------|
| **GPA-001** | Defines the pyramid layers and information flow |
| **GPA-002** | Enforces single authoritative source within each layer; forbids parallel truth |

GPA-001 asks *what layers exist*. GPA-002 asks *what may never be duplicated*.

---

## Related Standards

Architecture Constitution — cross-reference:

| Standard | Document | Role |
|----------|----------|------|
| **GPA-001** | [Governance Pyramid Architecture](GPA-001_Governance_Pyramid_Architecture.md) | Pyramid layers and information flow |
| **GDS-001** | [Governance Data Standard](GDS-001_Governance_Data_Standard.md) | Canonical entities and schema |
| **GRFC-001** | [Governance Request for Change](GRFC-001_Governance_Request_for_Change.md) | Mandatory design review before major changes |

*Foundational Milestone:* [Repository Hall of Milestones](../History/Milestones.md#foundational-milestones) (RM-006)

---

## Closing Principle

**One truth. Many projections. No parallel records.**

Reality creates facts. Everything else reads from them.

---

**END OF GPA-002**

| | |
|---|---|
| **Status** | FOUNDATION |
| **Document Number** | GPA-002 |
| **Version** | 1.0 |
| **Authority** | GPA-001, GP-005, GP-006 |
