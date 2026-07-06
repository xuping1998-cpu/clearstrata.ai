# PR-004 — Community Resolution (Phase 4)

## Project One · Project Record

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | PR-004 |
| **Document Title** | Community Resolution — Phase 4 |
| **Document Type** | Project Record (PR) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [The ClearStrata Constitution](../00_ClearStrata_Constitution.md) (FD-001) |
| **Effective Date** | 2026-07-06 |
| **Classification** | Project Records |
| **Owner** | ClearStrata Project One |
| **Related Documents** | GP-004, PR-003, PR-007, FD-001 |
| **Repository Location** | `docs/projects/PR-004_Community_Resolution_Phase_4.md` |

---

## Purpose

Phase 4 implements **Community Resolution** as the constitutional bridge between deliberation and formal decision-making (GP-004).

---

## Implementation

| Component | Path |
|-----------|------|
| Migration | `supabase/migrations/20261706120000_community_resolutions.sql` |
| Model | `src/lib/community/communityResolutionModel.ts` |
| API | `src/features/community-resolutions/communityResolutionsApi.ts` |
| Context card | `src/components/community-resolution/CommunityResolutionContextCard.tsx` |
| Detail page | `src/pages/community-resolution/CommunityResolutionPages.tsx` |
| Matter integration | `src/pages/community-deliberation/GovernanceMatterPages.tsx` |

**Tables:** `community_resolutions`, `community_resolution_revisions`; `governance_matters.resolution_id`

---

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Community Resolution model | ✓ |
| Revision history append-only | ✓ |
| Constitutional Basis on resolution | ✓ |
| Links to Governance Matter | ✓ |
| Council prepare from matter | ✓ |
| AI does not approve resolutions | ✓ |

---

**END OF PR-004**
