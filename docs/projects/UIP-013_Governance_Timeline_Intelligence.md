# UIP-013 — Governance Timeline Intelligence

## UI Polish Record · Matter Lifecycle Timeline

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | UIP-013 |
| **Document Title** | Governance Timeline Intelligence |
| **Document Type** | UI Polish Record (UIP) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [GP-005](../Principles/GP-005_Shared_Governance_Space.md), [GP-006](../Principles/GP-006_Governance_Experience.md), [UIP-011](UIP-011_Governance_Cockpit.md), [UIP-012](UIP-012_Governance_Intelligence.md) |
| **Effective Date** | 2026-07-12 |
| **Classification** | UI Polish |
| **Owner** | ClearStrata Project One |
| **Related Documents** | UIP-011, UIP-012, GP-005, GP-006 |
| **Repository Location** | `docs/projects/UIP-013_Governance_Timeline_Intelligence.md` |

---

## Objective

Replace the **History** tab on `/community-deliberation/:matterId` with **Timeline** — the canonical, append-only governance lifecycle record.

**Constraints:** No database migration, no new tables, no AI-generated events. Reuse `governance_matter_revisions`, comments, CDA reports, and linked resolutions.

---

## Implementation Index

| ID | Feature | Implementation |
|----|---------|----------------|
| **GT-001** | Timeline Tab | `MatterDetailTab` `'timeline'` replaces `'history'` in `GovernanceMatterDetailTabs` |
| **GT-002** | Lifecycle Cards | `GovernanceMatterTimelineTab` — icon, time, actor, description, status per event |
| **GT-003** | Actor Attribution | `GovernanceTimelineActorRole` + labels (Council, Owner, System Automation, …) |
| **GT-004** | Constitution Mapping | `ConstitutionPhaseStrip` — Discussion → Archive with current highlighted |
| **GT-005** | Duration Display | `computeGovernanceStageDurations()` from revision status transitions |
| **GT-006** | Decision Evidence | `reasonEn` / `reasonZh` from workflow mapping (no AI) |
| **GT-007** | Documents | Event `documents[]` — resolution, meeting notice links |
| **GT-008** | Timeline Filters | Chips: All, Workflow, Documents, Comments, Votes, System |
| **GT-009** | Visual Timeline | Vertical timeline desktop; card stack mobile; newest first |
| **GT-010** | Current Stage Indicator | `CurrentStageIndicator` — segment progress bar |
| **GT-011** | Governance Audit | Each event: `at`, `actorLabel`, `eventType`, `entityId` |
| **GT-012** | Owner View | `filterTimelineEvents` hides `councilOnly` events |
| **GT-013** | Council View | Full timeline including CDA, internal workflow revisions |
| **GT-014** | Future Integration | `buildGovernanceTimelineEvents()` single source for downstream AI/audit |

---

## Event Mapping

| Source | `eventType` examples |
|--------|---------------------|
| `governance_matter_revisions` | `matter_created`, `consultation_opened`, `consultation_closed`, `resolution_prepared`, `meeting_scheduled`, `voting_opened`, `voting_closed`, `result_published`, `archived`, internal `title_updated` … |
| `governance_matter_cda_reports` | `cda_generated` (council-only) |
| `community_resolutions` | `resolution_created` |
| `governance_matter_comments` | `comment_posted` |

---

## Permission Matrix

| Event / data | Owner | Council |
|--------------|-------|---------|
| Status workflow transitions | ✓ | ✓ |
| Comments (visible) | ✓ | ✓ |
| Resolution / meeting documents | ✓ | ✓ |
| CDA generated + draft link | ✗ | ✓ |
| Internal metadata revisions | ✗ | ✓ |
| System automation events | ✓ | ✓ |

---

## Files

| File | Role |
|------|------|
| `src/lib/community/governanceTimelineModel.ts` | Event builder, durations, filters, actors |
| `src/components/community-deliberation/GovernanceMatterTimelineTab.tsx` | Timeline UI |
| `src/components/community-deliberation/GovernanceMatterDetailTabs.tsx` | Tab swap History → Timeline |

---

## Verification

- `npx tsc --noEmit` — pass
- `npm run build` — pass
- Route: `/community-deliberation/:matterId` → Timeline tab

Screenshots: `assets/uip-013-timeline-desktop.png`, `assets/uip-013-timeline-mobile.png`

---

**END OF UIP-013**
