# RC-004 — Shared State System

## Project One Release Candidate · Foundation Layer

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | RC-004 |
| **Document Title** | Shared State System |
| **Document Type** | Release Candidate Record (RC) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [CDS-001](../design-system/CDS-001_ClearStrata_Design_System.md), RC-001, RC-002, RC-003 |
| **Effective Date** | 2026-07-13 |
| **Classification** | Project One RC — Foundation |
| **Owner** | ClearStrata Project One |
| **Related Documents** | RC-001, RC-002, RC-003, CDS-001, BF-002, UIP-008, UIP-011, UIP-013 |
| **Repository Location** | `docs/projects/RC-004_Shared_State_System.md` |

---

## Purpose

Establish **one canonical CDS page state model** and shared projection components. All UI surfaces must express what is happening, why, and what the user can do next.

This is the **second code adoption phase** of CDS-001 (after RC-002 / RC-003).

---

## Canonical States

| State | Meaning |
|-------|---------|
| **loading** | Initial load; no data yet |
| **refreshing** | Prior content visible; new data loading |
| **success** | Normal operation |
| **empty** | Query succeeded; zero records |
| **partial** | Some data loaded; some failed |
| **warning** | Completed; attention recommended |
| **error** | Operation failed; retry offered |
| **permission** | Authenticated; action not permitted |
| **offline** | Network unavailable |
| **archived** | Read-only historical information |

---

## Engineering Rules

- Loading must **never** display Empty
- Error must **never** display Empty
- Permission must **never** display Error
- Partial must **preserve** successful data
- Refreshing must **preserve** existing content

---

## Implementation

| Artifact | Path |
|----------|------|
| State model | `src/lib/ui/pageStateModel.ts` |
| Projection surface | `src/components/ui/state/PageStateSurface.tsx` |
| Loading (skeleton) | `src/components/ui/state/LoadingState.tsx` |
| Refreshing overlay | `src/components/ui/state/RefreshingOverlay.tsx` |
| Empty / Error / Warning / Permission / Offline / Archived | `src/components/ui/state/*.tsx` |
| Partial banner | `src/components/ui/state/PartialStateBanner.tsx` |
| Barrel export | `src/components/ui/state/index.ts` |

### Loading policy

- **Skeleton** for substantial page/feed/pipeline content
- **Spinner** only for inline/small actions (Button loading per RC-002)

---

## Pilot migration (Project One)

| Route | Changes |
|-------|---------|
| `/community-deliberation` | Filter views via `PageStateSurface`; partial banner for participation loads (BF-002); feed skeleton |
| `/community-deliberation/:matterId` | Page skeleton; empty/error distinction; archived banner; inline action errors |
| `/community-deliberation/new` | `PermissionState` for non-council |
| `/council/workspace` | `PermissionState`; pipeline skeleton/empty; refreshing overlay on matter switch; inline errors |

---

## Out of scope

Finance, Procurement, standalone Meetings/Voting, Owner Information, Property Settings, Authentication, email templates.

---

## Permanent Principle

Every screen must always tell the user what is happening, why, and what they can do next.

每一个页面，都必须清楚告诉用户：正在发生什么，为什么，以及下一步可以做什么。

---

**END OF RC-004**
