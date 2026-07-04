# PR-003 — Community Deliberation Phase 2

## Project One · Project Record

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | PR-003 |
| **Document Title** | Community Deliberation — Phase 2 |
| **Document Type** | Project Record (PR) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [The ClearStrata Constitution](../00_ClearStrata_Constitution.md) (FD-001) |
| **Effective Date** | 2026-07-04 |
| **Classification** | Project Records |
| **Owner** | ClearStrata Project One |
| **Supersedes** | None |
| **Superseded By** | None |
| **Related Documents** | FD-001, GP-002, PR-002, PR-001, Article II, Article X |
| **Repository Location** | `docs/projects/PR-003_Community_Deliberation_Phase_2.md` |

---

## Purpose

This document records **Project One — Phase 2**: the first real **Community Deliberation governance engine**.

Phase 2 introduces **Governance Matter** as the official discussion object, structured lifecycle, council revision history, immutable owner comments, and dashboard integration with real matters. This is constitutional governance — not a forum or social feed.

---

## Scope

**In scope:**

- Governance Matter data model and lifecycle
- Council revision history (append-only)
- Immutable owner comments with moderated hide/remove
- Dashboard displays real matters; Phase 1 demo removed when real matters exist
- Hub, detail, and council create pages

**Out of scope:**

- Likes, reactions, follower counts, popularity ranking, recommendation algorithms
- AI summarize / consensus / draft resolution (role defined; not implemented)
- Meeting and Voting module changes
- Community Memory archival automation

---

## Objectives

| Objective | Requirement |
|-----------|-------------|
| Governance Matter | Official discussion object; every discussion belongs to one Matter |
| Lifecycle | Draft → Discussion → … → Community Memory |
| Revision history | Council edits append revisions; nothing overwritten |
| Owner comments | Immutable; moderation actions recorded |
| Dashboard | Real matters on Community Deliberation card |
| Demo removal | Phase 1 demo rows suppressed when real matters exist |

---

## Core Object: Governance Matter

| Field | Description |
|-------|-------------|
| Matter ID | UUID primary key |
| Title | Matter title |
| Description | Matter body |
| Category | Property Management, Budget, Major Repair, … |
| Status | Lifecycle stage |
| Created By | Council creator |
| Created At | Creation timestamp |
| Last Revision | Last council revision timestamp |
| Discussion Deadline | Discussion / consultation end |
| Resolution Deadline | Optional |
| Meeting ID | Optional link |
| Voting ID | Optional link |
| Archived At | Archive timestamp |

---

## Implementation

### Database

Migration: `supabase/migrations/20261704120000_governance_matters.sql`

| Table | Role |
|-------|------|
| `governance_matters` | Core matter record and lifecycle |
| `governance_matter_revisions` | Append-only revision history |
| `governance_matter_comments` | Immutable owner comments |
| `governance_matter_comment_moderation` | Recorded moderation actions |

RPC: `moderate_governance_matter_comment` (hide / remove / flag with audit).

### Application

| Path | Role |
|------|------|
| `src/lib/community/governanceMatterModel.ts` | Categories, statuses, labels, URL helpers |
| `src/features/governance-matters/governanceMattersApi.ts` | CRUD, comments, moderation |
| `src/hooks/useGovernanceMatterDashboard.ts` | Dashboard bullet mapping |
| `src/pages/community-deliberation/GovernanceMatterPages.tsx` | Hub, detail, create |
| `src/components/dashboard/ImportantUpdatesDashboardCard.tsx` | Demo suppression when real matters exist |
| `src/pages/Dashboard.tsx` | Merges governance matters with notice bullets |

### Routes

| Route | Page |
|-------|------|
| `/community-deliberation` | Matters hub |
| `/community-deliberation/new` | Council create |
| `/community-deliberation/:matterId` | Matter detail |

---

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Governance Matter model exists | ✓ |
| Structured lifecycle implemented | ✓ |
| Council revision history implemented | ✓ |
| Immutable owner comments | ✓ |
| Revision History visible | ✓ |
| Dashboard displays real Matters | ✓ |
| Demo data removed when real matters exist | ✓ |
| Existing Meeting module unaffected | ✓ |
| Existing Voting module unaffected | ✓ |

---

## Constitutional Principle

Discussion must precede Resolution. Resolution must precede Meeting. Meeting must precede Voting. Voting must precede Execution. Execution must become Community Memory.

---

## Related Documents

| Document | Relationship |
|----------|--------------|
| [GP-002 — Community Deliberation](../Community_Deliberation.md) | Module specification |
| [PR-002 — Phase 1](PR-002_Community_Deliberation_Phase_1.md) | Prior dashboard UI phase |
| [PR-001 — Governance Dashboard](../Governance_Dashboard.md) | Dashboard layout |

---

## Revision History

| Version | Date | Summary | Author |
|---------|------|---------|--------|
| 1.0 | 2026-07-04 | Phase 2 governance engine — model, API, pages, dashboard | ClearStrata Project One |

---

## Milestone

| Field | Value |
|-------|-------|
| **Milestone** | **M-003** |
| **Project** | Project One |
| **Title** | Community Deliberation Phase 2 |
| **Status** | ACTIVE |
| **Project Record** | PR-003 |
| **Git Tag** | *(pending)* |

**Delivery:** Governance Matter engine; schema migration; hub/detail/create UI; dashboard integration.

---

## Closing Statement

Phase 1 changed the Dashboard. Phase 2 changes how communities govern together. Community Deliberation becomes the constitutional starting point of every significant decision.

---

**END OF PR-003**

| | |
|---|---|
| **Status** | ACTIVE |
| **Document Number** | PR-003 |
| **Classification** | Project Record |
| **Authority** | The ClearStrata Constitution (FD-001) |
| **Effective Date** | 2026-07-04 |
