# GDS-001 — Governance Data Standard

## Architecture Standard · Canonical Governance Data Model

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | GDS-001 |
| **Document Title** | Governance Data Standard |
| **Document Type** | Architecture Standard (GDS) |
| **Status** | FOUNDATION |
| **Version** | 1.0 |
| **Authority** | [GP-005](../Principles/GP-005_Shared_Governance_Space.md), [GP-006](../Principles/GP-006_Governance_Experience.md), [GPA-001](GPA-001_Governance_Pyramid_Architecture.md), [GPA-002](GPA-002_Single_Source_of_Governance_Truth.md) |
| **Effective Date** | 2026-07-12 |
| **Classification** | Architecture Standard |
| **Owner** | ClearStrata Project One |
| **Supersedes** | None |
| **Superseded By** | None |
| **Related Documents** | GP-005, GP-006, GPA-001, GPA-002, [GRFC-001](GRFC-001_Governance_Request_for_Change.md), [CDS-001](../design-system/CDS-001_ClearStrata_Design_System.md) |
| **Repository Location** | `docs/Architecture/GDS-001_Governance_Data_Standard.md` |

---

## Purpose

Governance Data Standard (GDS) defines the **canonical data model** used across the entire ClearStrata platform.

Every governance module — Meetings, Voting, Finance, Procurement, Complaints, Maintenance, Documents, Legal — **must follow GDS**.

GDS defines:

- What entities exist
- How they relate
- How state changes
- How history is preserved

---

## Design Philosophy

| Principle | Meaning |
|-----------|---------|
| **Store facts** | Persist authoritative governance actions |
| **Compute views** | UI, dashboards, AI read from facts |
| **Never duplicate truth** | One record per fact ([GPA-002](GPA-002_Single_Source_of_Governance_Truth.md)) |
| **Everything else is projection** | Timeline tab, cockpit, reports are derived |

---

## Canonical Entity Hierarchy

Implements [GPA-001](GPA-001_Governance_Pyramid_Architecture.md):

```
Property
  ↓
Governance Matter
  ↓
Workflow
  ↓
Timeline Event
  ↓
Evidence
  ↓
Knowledge
  ↓
AI
```

**No module may bypass this hierarchy.**

---

## Core Entity Rules

| Entity | Rule |
|--------|------|
| **Property** | Owns Matters |
| **Matter** | Owns Workflow |
| **Workflow** | Creates Timeline Events |
| **Timeline** | References Evidence |
| **Knowledge** | Is computed |
| **AI** | Reads Knowledge (and underlying facts) |

---

## Matter Standard

Every governance matter **must** contain:

| Field | Required | Notes |
|-------|----------|-------|
| `id` | ✓ | UUID primary key |
| `property_id` | ✓ | Tenant isolation |
| `title` | ✓ | Human-readable label |
| `category` | ✓ | Governance classification |
| `created_by` | ✓ | Actor UUID |
| `created_at` | ✓ | Immutable creation time |
| `status` | ✓ | Current workflow state (`workflow_stage` in GDS vocabulary) |
| `workflow_stage` | ✓ | Maps to constitutional lifecycle phase |
| `visibility` | ✓ | Role-based access (matter-level or derived from RLS) |

No module may invent **alternative matter identifiers**.

### ClearStrata implementation

| GDS field | PostgreSQL / TypeScript |
|-----------|-------------------------|
| Matter | `governance_matters` / `GovernanceMatterRow` |
| `workflow_stage` | `status` (`GovernanceMatterStatus`) |
| `visibility` | RLS + role guards; comment `visibility` for participation |

---

## Workflow Standard

| Rule | Meaning |
|------|---------|
| Workflow represents **current state only** | Mutable row on matter |
| Workflow is **mutable** | `UPDATE governance_matters` |
| Timeline is **immutable** | Append-only revision log |

### ClearStrata implementation

| Layer | Table / field |
|-------|---------------|
| Workflow state | `governance_matters.status`, `meeting_id`, `voting_id`, `resolution_id`, deadlines |
| State change trigger | `governance_matter_log_revision_update()` → new revision row |

---

## Timeline Standard

Timeline stores:

| Field | GDS | ClearStrata (`governance_matter_revisions`) |
|-------|-----|-----------------------------------------------|
| `event_id` | ✓ | `id` |
| `matter_id` | ✓ | `matter_id` |
| `event_type` | ✓ | `change_kind` |
| `actor_id` | ✓ | `changed_by` |
| `timestamp` | ✓ | `created_at` |
| `metadata` | ✓ | `snapshot` (jsonb), status snapshot fields |

**Timeline is append-only.** No `UPDATE` or `DELETE` on revision rows.

Additional timeline facts (comments, CDA, resolutions) are **projected** into timeline events by `governanceTimelineModel.ts` — they remain authoritative in their source tables.

---

## Evidence Standard

Evidence belongs to **Timeline Events**.

Examples: SPA, Bylaw, Meeting Notice, Minutes, Contract, Invoice, Photo, PDF, Video.

| Rule | Meaning |
|------|---------|
| Evidence may **never** exist without a parent event | Attach via timeline projection or revision linkage |
| Evidence explains **why** | Workflow context, not standalone truth |

### ClearStrata implementation

| Evidence type | Authoritative source |
|---------------|---------------------|
| Resolution PDF | `community_resolutions` |
| Meeting notice / agenda | `meetings` |
| Voting result | Meeting + voting linkage |
| CDA report | `governance_matter_cda_reports` |
| Owner comment | `governance_matter_comments` (fact + timeline projection) |

---

## Knowledge Standard

| Rule | Meaning |
|------|---------|
| Knowledge is **derived** | Computed from lower layers |
| **Never manually edited** | No knowledge authoring UI |
| **Always rebuildable** | Safe to drop and recompute |
| Sources | Timeline, Evidence, Workflow, Matter |

Knowledge has **no status**. Knowledge is **never authoritative**.

---

## Relationship Rules

```
One Property     → many Matters
One Matter       → one Workflow (current state row)
One Workflow     → many Timeline Events (revision log)
One Timeline Event → many Evidence items (optional)
Knowledge        → references multiple Timeline Events
```

All relationships use **UUID foreign keys** with `property_id` for multi-property isolation.

---

## Identity Rules

| Rule | Requirement |
|------|-------------|
| Every entity | UUID primary key |
| Never natural keys | No slug-only identifiers for governance records |
| Never duplicate identifiers | One `matter_id` per governance thread |

---

## Status Rules

| Entity | Has status? |
|--------|-------------|
| **Workflow** | ✓ — `status` on matter, resolution council status |
| **Timeline** | Events only (`event_type`, not lifecycle status) |
| **Evidence** | Types only (document kind, not workflow status) |
| **Knowledge** | No status |

---

## Audit Rules

Every mutation records:

| Field | Source |
|-------|--------|
| **who** | `changed_by` / `created_by` / `author_id` |
| **when** | `created_at` |
| **what** | `change_kind`, `snapshot` |
| **why** | `snapshot.previous`, workflow-derived reason in timeline projection |

**No destructive updates** to governance history. Soft delete via `deleted_at` only where explicitly allowed; timeline remains append-only.

---

## Projection Rules

These surfaces **must project** from the same canonical data:

Dashboard · Timeline · Reports · Search · Cockpit · Notifications · Owner View · Council View · AI

| Surface | Canonical sources |
|---------|-------------------|
| Governance Hub | `governance_matters` |
| Timeline tab (UIP-013) | `governance_matter_revisions` + comments + CDA + resolutions |
| Council Cockpit (UIP-011) | Matters + loaded flags |
| Governance Intelligence (UIP-012) | Derived from matter workflow state |

---

## Naming Rules

| Layer | Convention |
|-------|------------|
| PostgreSQL tables | Singular `snake_case` (`governance_matters`, `governance_matter_revisions`) |
| TypeScript types | `camelCase` properties on `PascalCase` row types |
| Foreign keys | UUID (`property_id`, `matter_id`, …) |
| Timestamps | `created_at`, `updated_at`, `deleted_at` (soft delete only) |

---

## Migration Rules

Before adding a new table, verify whether **Matter**, **Workflow**, **Timeline**, or **Evidence** already satisfy the requirement.

| Rule | Requirement |
|------|-------------|
| Never create parallel entities | No `governance_matters_v2` |
| Prefer extending canonical entities | Add columns or linked tables with `matter_id` |
| One Supabase instance | Multi-property isolation by `property_id` only |

---

## Future Modules

Must comply with GDS:

Meeting Engine · Voting Engine · Finance Engine · Procurement Engine · Complaint Engine · Document Engine · Legal Engine · AI Engine

Each engine writes facts at **Workflow** or **Timeline** layer and projects elsewhere.

---

## Acceptance

Every new feature must map cleanly into:

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

…without introducing **parallel truth**.

---

## GDS Entity Map (Project One — current)

| GDS entity | Authoritative table(s) | Projection layer |
|------------|------------------------|------------------|
| Property | `properties` | Property context |
| Matter | `governance_matters` | Hub cards, detail header |
| Workflow | `governance_matters` (mutable fields) | Status badges, cockpit queue |
| Timeline Event | `governance_matter_revisions` | `GovernanceMatterTimelineTab` |
| Evidence | `community_resolutions`, `meetings`, `governance_matter_cda_reports`, documents | Timeline `documents[]` |
| Knowledge | *(computed)* | Future Knowledge Intelligence |
| AI | *(computed)* | UIP-012 intelligence bundle |

---

## Document Stack

| Document | Role |
|----------|------|
| **GPA-001** | Pyramid layers — what exists |
| **GPA-002** | Single source — no parallel truth |
| **GDS-001** | Data model — how entities are stored and related |

---

## Related Standards

Architecture Constitution — cross-reference:

| Standard | Document | Role |
|----------|----------|------|
| **GPA-001** | [Governance Pyramid Architecture](GPA-001_Governance_Pyramid_Architecture.md) | Pyramid layers — what exists |
| **GPA-002** | [Single Source of Governance Truth](GPA-002_Single_Source_of_Governance_Truth.md) | No parallel truth |
| **GRFC-001** | [Governance Request for Change](GRFC-001_Governance_Request_for_Change.md) | Change governance — architecture before code |
| **CDS-001** | [ClearStrata Design System](../design-system/CDS-001_ClearStrata_Design_System.md) | Experience and UI standards |

*Foundational Milestone:* [Repository Hall of Milestones](../History/Milestones.md#foundational-milestones) (RM-006)

---

## Closing Principle

**Store facts. Compute views. One hierarchy. UUID identity. Append-only history.**

---

**END OF GDS-001**

| | |
|---|---|
| **Status** | FOUNDATION |
| **Document Number** | GDS-001 |
| **Version** | 1.0 |
| **Authority** | GP-005, GP-006, GPA-001, GPA-002 |
