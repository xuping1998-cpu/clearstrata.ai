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
| **Related Documents** | GP-005, GP-006, PR-009, UIP-001 … UIP-010 |
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

---

## Verification Routes

| Route | Role | Validates |
|-------|------|-----------|
| `/` | All | Dashboard Governance Hub card + primary CTA |
| `/community-deliberation` | Owner / Council | Lifecycle feed + role panel |
| `/community-deliberation/:matterId` | All | Tabs + lifecycle timeline |
| `/council/workspace` | Council | Priorities + three-column workspace |

---

**END OF UIP INDEX**
