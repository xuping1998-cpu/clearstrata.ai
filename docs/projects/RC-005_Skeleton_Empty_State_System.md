# RC-005 — Skeleton & Empty State System

## Project One Release Candidate · Foundation Layer

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | RC-005 |
| **Document Title** | Skeleton & Empty State System |
| **Document Type** | Release Candidate Record (RC) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [CDS-001](../design-system/CDS-001_ClearStrata_Design_System.md), RC-001 … RC-004 |
| **Effective Date** | 2026-07-14 |
| **Classification** | Project One RC — Foundation |
| **Owner** | ClearStrata Project One |
| **Related Documents** | RC-004, BF-002, UIP-008, UIP-011, CDS-001 |
| **Repository Location** | `docs/projects/RC-005_Skeleton_Empty_State_System.md` |

---

## Purpose

Define **content-specific Skeleton and Empty State patterns** on top of RC-004's canonical state model. No competing state model. All projections reuse `src/components/ui/state/` and `src/lib/ui/pageStateModel.ts`.

---

## Skeleton patterns (LoadingState variants)

| Variant | Layout |
|---------|--------|
| `hub` | Feed stage headings + matter cards + side panel (desktop) |
| `page` | Matter detail: metadata, title, lifecycle strip, tabs, content blocks |
| `cockpit` | Pipeline filters/cards + matter header + action queue |
| `dashboardCard` | Card title, subtitle, 2 rows, CTA placeholder |
| `filteredFeed` | Compact 2-card feed (comments/following views) |
| `feed` / `pipeline` | List skeletons (existing) |

**Rules:** Initial load only. Refreshing preserves content + `RefreshingOverlay` (RC-004). No full-page spinners on pilot routes. `motion-reduce:animate-none` on pulse.

---

## Empty state taxonomy

Implemented via `src/lib/ui/emptyStateContent.ts` + `ContextualEmptyState` / `TabEmptyState`:

| Category | Key examples |
|----------|----------------|
| First-time empty | `governance.firstTimeEmptyCouncil` / `Owner` |
| Stage empty | Compact line per lifecycle section |
| Filter / personal empty | `governance.noComments`, `governance.noFollowing` |
| Cockpit empty | `governance.cockpitNoMatters`, `cockpitStageEmpty`, `cockpitNoActions` |
| Matter tab empty | Discussion, Resolution (owner), CDA |
| Dashboard empty | Council vs Owner CTAs; notices-only message |
| Not found | `governance.matterNotFound` |

---

## Pilot routes

| Route | RC-005 changes |
|-------|----------------|
| `/` | Dashboard card skeleton; honest empty; error vs empty; no demo matter filler |
| `/community-deliberation` | Hub skeleton; first-time empty; filtered feed skeleton; personal empty copy |
| `/community-deliberation/:matterId` | Matter detail skeleton; tab empties; CDA skeleton |
| `/council/workspace` | Cockpit skeleton; coordinated pipeline/select/queue empties |

---

## Future migration (not this pass)

Finance, Procurement, standalone Meetings/Voting, Owner Information, Authentication, Property Settings, email templates.

---

## Permanent Principle

An empty screen is not the absence of design. It is the moment when the system must explain itself most clearly.

空白页面并不是设计的缺席。恰恰在没有内容的时候，系统最需要清楚解释：为什么为空，以及用户下一步可以做什么。

---

**END OF RC-005**
