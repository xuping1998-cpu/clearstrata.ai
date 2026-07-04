# PR-002 — Community Deliberation Phase 1

## Project One · Project Record

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | PR-002 |
| **Document Title** | Community Deliberation — Phase 1 |
| **Document Type** | Project Record (PR) |
| **Status** | COMPLETED |
| **Version** | 1.0 |
| **Authority** | [The ClearStrata Constitution](00_ClearStrata_Constitution.md) (FD-001) |
| **Effective Date** | 2026-06-29 |
| **Classification** | Project Records |
| **Owner** | ClearStrata Project One |
| **Supersedes** | None |
| **Superseded By** | None |
| **Related Documents** | FD-001, GP-002, GP-003, PR-001, PR-000, CS-001 |
| **Repository Location** | `docs/projects/PR-002_Community_Deliberation_Phase_1.md` |

---

## Purpose

This document records the **completion** of **Project One — Phase 1**.

Phase 1 introduces **Community Deliberation** as the first constitutional governance module implemented on the Dashboard.

This phase focuses on **governance experience**, rather than new functionality.

---

## Scope

**In scope:**

- Phase 1 delivery record, acceptance criteria, and lessons learned
- UI evolution of the Dashboard top card (Important Updates → Community Deliberation)
- Constitutional presentation of three content types

**Out of scope:**

- Phase 2 data model, commenting, AI summaries, Resolution linkage (recorded under Next Phase only)

---

## Background

Before Phase 1, the Dashboard displayed **Important Updates** as a notification-oriented card.

Although useful, it did not reflect the constitutional governance model established during **Project Zero**.

Project One begins by transforming the Dashboard from a **software homepage** into the **entrance of community governance**.

---

## Objectives

| Objective | Requirement |
|-----------|-------------|
| Replace card | Important Updates → **Community Deliberation** |
| Constitutional motto | Header motto and subtitle |
| Content types | Discussion · Public Consultation · Official Notice |
| Preserve functionality | All existing workflows unchanged |
| Avoid backend change | No database, API, or workflow changes |

---

## Completed Work

### Dashboard top card

Renamed to **Community Deliberation / 社区议事厅**.

**Implementation:** `src/components/dashboard/ImportantUpdatesDashboardCard.tsx` → `CommunityDeliberationDashboardCard` (alias preserved).

### Header

Added:

- **Good governance begins with listening.**
- **良好的治理，始于认真倾听。**

### Subtitle

Added constitutional description:

- *Every important community decision begins with open discussion.*
- *每一项重要社区决策，都始于公开讨论。*

### Content types

| Type | 中文 | Phase 1 behavior |
|------|------|------------------|
| **Discussion** | 讨论中 | Visual row + demo when no real items |
| **Public Consultation** | 公开征求意见 | Visual row + demo when no real items |
| **Official Notice** | 正式通知 | Existing announcements (reclassified visually) |

### Compatibility

- Existing announcements continue using **`useImportantUpdatesBullets`** and current APIs/navigation
- No user workflow changed
- **`data-widget="community-deliberation"`** replaces `important-updates`

---

## Out of Scope

Phase 1 explicitly did **not** include:

- Commenting system
- Discussion database
- AI summaries
- Moderation tools
- Voting integration
- Resolution workflow
- Community Memory integration

These belong to **future phases**.

---

## Constitutional Meaning

Phase 1 **does not add** new governance. It **changes how governance is presented**.

For the first time, the Dashboard **begins with discussion**, instead of functionality.

This reflects the constitutional principle: **Discussion Before Decision** (Article II).

---

## Acceptance

| Criterion | Status |
|-----------|--------|
| Dashboard renamed | ✓ |
| Motto added | ✓ |
| Constitutional subtitle added | ✓ |
| Three governance content types | ✓ |
| Existing notices preserved | ✓ |
| No API changes | ✓ |
| No database migration | ✓ |
| Existing behavior unchanged | ✓ |

---

## Lessons Learned

Community governance should begin with **listening**, not voting.

The homepage should answer one question before all others:

**“What is our community discussing today?”**

---

## Next Phase

### Phase 2 — Community Deliberation Data Model

**Objectives:**

- Introduce **real governance matters**
- Support **structured discussions**
- Prepare **AI summaries**
- Connect **Discussion** to **Resolution**

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [FD-001 — The ClearStrata Constitution](../00_ClearStrata_Constitution.md) | Article II — Discussion Before Decision |
| [GP-002 — Community Deliberation](../Community_Deliberation.md) | Module specification |
| [GP-003 — Four Pillars](../Four_Pillars_of_Community_Governance.md) | Pillar I — Listen together |
| [PR-001 — Governance Dashboard](../Governance_Dashboard.md) | Dashboard constitutional layout |
| [PR-000 — Project Zero Chronicle](../99_Project_Zero_Chronicle.md) | Foundation project |
| [CS-001 — Repository Document Numbering Standard](../Repository_Document_Numbering_Standard.md) | PR-002 permanent identifier |

---

## Revision History

| Version | Date | Summary | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-29 | Phase 1 completed — Community Deliberation Dashboard landing | ClearStrata Project One |
| 1.1 | 2026-06-29 | **Milestone M-002** COMPLETED — registry, commit, tag | ClearStrata Project One |

---

## Milestone

| Field | Value |
|-------|-------|
| **Milestone** | **M-002** |
| **Project** | Project One |
| **Title** | Community Deliberation Phase 1 |
| **Status** | **COMPLETED** |
| **Project Record** | PR-002 |
| **Git Tag** | `project-one-m-002` |

**Delivery:** Dashboard top card → Community Deliberation (GP-002); UI-only; no schema/API changes.

---

## Closing Statement

Project One began **not by adding features**, but by **changing the community's first experience**.

The Dashboard is no longer simply a homepage. It has become the **constitutional entrance** to community governance.

---

**Project Status**

| | |
|---|---|
| **Project One Phase 1** | COMPLETED |
| **Foundation** | Project Zero (PR-000) |

---

**END OF PR-002**

| | |
|---|---|
| **Status** | COMPLETED |
| **Document Number** | PR-002 |
| **Classification** | Project Record |
| **Authority** | The ClearStrata Constitution (FD-001) |
| **Effective Date** | 2026-06-29 |
