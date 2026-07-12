# UIP — Project One UI Polish

## Governance Experience Implementation Index

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | UIP (Index) |
| **Document Title** | Project One — Governance UI Polish |
| **Document Type** | UI Polish Record (UIP) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [GP-006 — Governance Experience](../Principles/GP-006_Governance_Experience.md) |
| **Effective Date** | 2026-07-10 |
| **Classification** | UI Polish |
| **Owner** | ClearStrata Project One |
| **Related Documents** | GP-005, GP-006, PR-009, UIP-001 … UIP-011 |
| **Repository Location** | `docs/projects/UIP_Project_One_UI_Polish.md` |

---

## Mission

Transform the existing governance system into a clear, intuitive, role-aware governance experience.

**Primary goal:** A first-time user answers within five seconds:

1. What is happening?
2. Why is it happening?
3. What comes next?
4. What should I do?

**Constraints:** UI polish only — no database, API, RLS, permission, or legality changes.

---

## UIP Records

| Number | Title | Status | Implementation |
|--------|-------|--------|----------------|
| **UIP-001** | Governance Hub Layout | ACTIVE | Lifecycle-oriented feed with stage counts |
| **UIP-002** | Governance Matter Cards | ACTIVE | Rich matter cards with metadata and next step |
| **UIP-003** | Governance Matter Detail | ACTIVE | Tabbed detail (Discussion / Resolution / CDA / History) |
| **UIP-004** | Council Workspace | ACTIVE | Actionable council priorities panel |
| **UIP-005** | Governance Lifecycle Timeline | ACTIVE | Visual lifecycle on matter detail and workspace |
| **UIP-006** | Meeting Preparation Experience | PLANNED | Contextual prefill display (existing prefill retained) |
| **UIP-007** | Voting Experience | PLANNED | Pre-ballot constitutional context cards |
| **UIP-008** | Owner Experience | ACTIVE | Participation panel + attention hints |
| **UIP-009** | Mobile Governance Experience | PLANNED | Responsive stacked layout foundation |
| **UIP-010** | Five-Second Experience Validation | PLANNED | Role/locale validation checklist |
| **UIP-011** | Governance Cockpit | ACTIVE | Three-column cockpit: Pipeline · Current Matter · Action Queue |

---

## Final Pass — Visual Hierarchy

| Field | Value |
|-------|-------|
| **Pass** | Final Pass — Visual Hierarchy |
| **Status** | COMPLETED |
| **Authority** | GP-005, GP-006, UIP-011 |
| **Objective** | Reduce visual noise (~20%), strengthen hierarchy around Current Matter, lifecycle stage, next constitutional step, and today's highest-priority action |
| **Constraints** | UI only — no database, migrations, API, RLS, permissions, routes, or governance behavior changes |

### Scope

- **Pipeline cards** — title, stage badge, category, one activity indicator, next step, single view CTA; positive badges only
- **Center column** — larger matter title, progress-style lifecycle timeline, quieter tabs, council revision collapsed by default
- **Cockpit** — action queue before metrics; action-specific CTAs; zero-value metrics hidden; mobile compact summary
- **Lifecycle colors** — consistent semantic mapping (discussion green, consultation amber, CDA indigo advisory, etc.)

### Implementation (2026-07-11)

| Component / file | Change |
|------------------|--------|
| `WorkspacePipelineMatterCard.tsx` | Simplified card hierarchy; positive badges only |
| `GovernanceCockpitPanel.tsx` | Queue-first layout; deadline warnings; compact metrics |
| `CockpitLifecycleTimeline.tsx` | Progress indicator (✓ / ◇ / ○), not button row |
| `GovernanceMatterDetailTabs.tsx` | `compactLayout` — quiet tabs, collapsed revision |
| `CouncilWorkspacePage.tsx` | Center header typography; mobile order; stage colors |
| `governanceLifecycleColors.ts` | Shared stage badge and filter colors |
| `governanceCockpitPriority.ts` | Action-specific CTA labels; urgent flag |

### Verification

- `npx tsc --noEmit` — pass
- `npm run build` — pass
- Route: `/council/workspace`

---

## Implementation Notes (v1.0)

### UIP-001 — Governance Hub Layout

- `GovernanceLifecycleFeed` — stages: Discussion, Consultation, Resolution, Meeting, Voting, Archive + Official Notice
- Section headings include counts: `Discussion (3)`
- Empty stage copy does not imply empty hub
- Primary CTA remains in dashboard card header

### UIP-002 — Governance Matter Cards

- `GovernanceMatterCard` — title, stage, category, comments, deadline, next step, linked badges
- Council quick actions on cards when `canCouncil`

### UIP-003 — Governance Matter Detail

- `GovernanceMatterDetailTabs` — four tabs, constitutional basis in Discussion

### UIP-004 — Council Workspace

- `CouncilPrioritiesPanel` — actionable linked priorities replacing passive counts

### UIP-005 — Governance Lifecycle Timeline

- `GovernanceLifecycleTimeline` — current / complete / future stages

### UIP-008 — Owner Experience

| Field | Value |
|-------|-------|
| **Status** | ACTIVE (subscriptions phase) |
| **Authority** | GP-005, GP-006 |
| **Migration** | `20261707120000_governance_matter_subscriptions.sql` |

#### Previous misleading route

`OwnerParticipationPanel` linked **我的订阅 / My Subscriptions** to `/owner-info?tab=announcements` (property announcements). That label promised governance-matter subscriptions but opened Owner Information.

#### Subscription model (2026-07-11)

- Table: `public.governance_matter_subscriptions` — one row per `(property_id, matter_id, user_id)`
- RLS: users read/insert/delete **own** subscriptions only; active property membership required
- API: `subscribeToGovernanceMatter`, `unsubscribeFromGovernanceMatter`, `fetchSubscribedGovernanceMatterIds`, `isGovernanceMatterSubscribed`, `fetchGovernanceMatterIdsWithUserComments`
- Matter detail: `GovernanceMatterFollowButton` — **关注事项 / Follow Matter** · **已关注 / Following**

#### Terminology

| Concept | 中文 | English |
|---------|------|---------|
| Personal follow state | 关注事项 | Following |
| Toggle (not following) | 关注事项 | Follow Matter |
| Toggle (following) | 已关注 | Following |
| Property announcements | 通知 | Notices — remains `/owner-info?tab=announcements` |

**Subscribed Matter = Followed Matter** — one model; no separate subscription vs follow tables.

Removed duplicate panel rows (**My Subscriptions**, **Followed Matters**). Panel now: **我的评论**, **我的投票**, **关注事项**.

#### Filtered Governance Hub views

| Query | Behavior |
|-------|----------|
| `?propertyId=…&view=subscribed` | Matters the user follows |
| `?propertyId=…&view=comments` | Matters where user authored ≥1 visible comment |

Reuses `GovernanceLifecycleFeed` with filtered matter list; custom empty states per view.

#### Out of scope (this phase)

Email/push notification preferences, digest frequency, per-event settings, follower counts, popularity, likes/reactions, recommendation algorithms.

---

## Verification Routes

| Route | Role | Validates |
|-------|------|-----------|
| `/` | All | Dashboard Governance Hub card + primary CTA |
| `/community-deliberation` | Owner / Council | Lifecycle feed + role panel |
| `/community-deliberation?propertyId=…&view=subscribed` | Owner | Following filter |
| `/community-deliberation?propertyId=…&view=comments` | Owner | My comments filter |
| `/community-deliberation/:matterId` | All | Tabs + lifecycle timeline |
| `/council/workspace` | Council | Governance Cockpit — pipeline, current matter, action queue |

---

**END OF UIP INDEX**
