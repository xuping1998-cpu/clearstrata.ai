# RC-002 — Shared Button System

## Project One Release Candidate · Foundation Layer

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | RC-002 |
| **Document Title** | Shared Button System |
| **Document Type** | Release Candidate Record (RC) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [CDS-001](../design-system/CDS-001_ClearStrata_Design_System.md), RC-001 |
| **Effective Date** | 2026-07-13 |
| **Classification** | Project One RC — Foundation |
| **Owner** | ClearStrata Project One |
| **Related Documents** | RC-001, RC-003, CDS-001, UIP-011, UIP-012 |
| **Repository Location** | `docs/projects/RC-002_Shared_Button_System.md` |

---

## Objective

Introduce **one canonical Button primitive** for Project One RC pilot surfaces. No third-party UI library.

---

## Implementation

| Artifact | Path |
|----------|------|
| Button primitive | `src/components/ui/Button.tsx` |
| Class merge utility | `src/lib/cn.ts` |

### Variants

`primary` · `secondary` · `outline` · `ghost` · `danger` · `link`

### Sizes

`sm` · `md` · `lg` · `icon`

### States

default · hover · focus-visible · active · disabled · loading

### Exports

- `Button` — native `<button>` with `forwardRef`
- `ButtonLink` — React Router `<Link>` with button styling
- `ButtonAnchor` — external `<a>` with button styling
- `lifecycleOutlineButtonClass()` — stage-aware outline classes for advisory actions

### Loading behavior

- `aria-busy={true}` when loading
- Disables repeated submission (`disabled` + `cursor-wait`)
- Spinner preserves layout; does not change action meaning

### Semantic rules (CDS-aligned)

| Variant | Use |
|---------|-----|
| **primary** | Single dominant action in context (Publish Matter, queue primary step) |
| **secondary / outline** | View, expand, supporting documents |
| **ghost** | Low-emphasis inline actions |
| **danger** | Destructive actions with clear consequence |
| **link** | Textual navigation |

No multiple competing primary buttons in one compact area. Icon-only buttons require `aria-label`.

---

## Pilot migration (this pass)

| Component | Actions migrated |
|-----------|------------------|
| `ImportantUpdatesDashboardCard` | Open Governance Hub CTA, expand control |
| `GovernanceMatterPages` | Publish Governance Matter header CTA |
| `GovernanceHubPanel` | Publish + Open Workspace |
| `CouncilWorkspacePage` | Publish Governance Matter header CTA |
| `GovernanceCockpitPanel` | Action queue buttons with specific labels |
| `GovernanceMatterCard` | View matter, revise, CDA, resolution CTAs |
| `GovernanceMatterTimelineTab` | Supporting document links |

---

## Future migration candidates (not this pass)

Finance, Procurement, Meetings module pages, Voting flows, Owner Information, Property Settings, Authentication, email templates.

---

**END OF RC-002**
