# RC-007 — Accessibility Audit

## Project One Release Candidate · Foundation Layer

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | RC-007 |
| **Document Title** | Accessibility Audit |
| **Document Type** | Release Candidate Record (RC) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [CDS-001](../design-system/CDS-001_ClearStrata_Design_System.md), RC-001 … RC-006 |
| **Effective Date** | 2026-07-14 |
| **Classification** | Project One RC — Foundation |
| **Owner** | ClearStrata Project One |
| **Related Documents** | RC-002, RC-004, RC-005, RC-006, UIP-008, UIP-011, UIP-013 |
| **Repository Location** | `docs/projects/RC-007_Accessibility_Audit.md` |

---

## Purpose

Focused accessibility audit for Project One governance surfaces: keyboard journeys, screen-reader structure, focus order, form labels, tabs, queue semantics, confirmations, toasts, and timeline — without workflow or visual redesign.

---

## Pilot routes audited

| Route | Primary components |
|-------|-------------------|
| `/` | `CommunityDeliberationDashboardCard` |
| `/community-deliberation` | `GovernanceMattersHubPage`, `GovernanceLifecycleFeed`, hub panels |
| `/community-deliberation?view=comments\|subscribed` | Filtered hub views |
| `/community-deliberation/new` | `GovernanceMatterCreatePage` |
| `/community-deliberation/:matterId` | `GovernanceMatterDetailPage`, tabs, follow, timeline |
| `/council/workspace` | `CouncilWorkspacePage`, pipeline, cockpit queue |

---

## Shared primitives (RC-007)

| Module | Role |
|--------|------|
| `src/lib/ui/governanceA11y.ts` | Bilingual contextual queue `aria-label` helpers |
| `src/components/ui/feedback/DestructiveConfirmDialog.tsx` | Native `<dialog>` archive confirmation (RC-007I) |
| `GovernanceMatterDetailTabs` | WAI-ARIA tabs: `aria-controls`, `tabpanel`, arrow keys, roving `tabIndex` |
| `GovernanceFeedbackHost` | Per-toast `aria-live` (assertive errors); no nested live region on stack |
| `interactionClasses.ts` + `Button` | Focus-visible rings (RC-006, verified RC-007C) |

---

## Accessibility checklist (Project One)

1. **Landmarks** — `<main>`, `<nav>`, `<aside>`, `section` / `aria-labelledby` on hub feed, cockpit pipeline, participation panel.
2. **Headings** — h1 per page; h2 for feed, current matter, pipeline, queue; avoid h1→h3 skip on hub feed.
3. **Tabs** — Full tablist/tab/tabpanel pattern; Left/Right/Home/End; automatic activation on arrow.
4. **Filters** — Pipeline + timeline chips use `aria-pressed` + labeled `role="group"`.
5. **Selectable cards** — Pipeline cards: `aria-current`, contextual `aria-label`.
6. **Queue** — Specific bilingual `aria-label` per action + matter title; urgent `sr-only` cue.
7. **Forms** — Visible `<label>` + `htmlFor`; create uses `<form>` submit; validation `aria-invalid` / `role="alert"`.
8. **Archive confirm** — Accessible `<dialog>` replaces `window.confirm` on cockpit.
9. **Toasts** — Item-level live regions; dismiss target ≥ 44px; no duplicate parent `aria-live`.
10. **Timeline** — Semantic `<ol>`; filter pressed state; progress `sr-only`; debug IDs `aria-hidden`.
11. **Follow** — `aria-busy`, error `role="alert"`, focus ring.
12. **Loading** — Skeletons `aria-hidden`; parent `role="status"` (RC-004/005, verified).
13. **Reduced motion** — Existing `motion-reduce` on transitions (RC-006).
14. **Council-only** — Council controls conditionally rendered; not visually hidden only.

---

## Deferred (outside Project One)

- Finance, Procurement, Meetings, Voting, Owner Information, Auth, Property Settings, email templates.
- Cockpit mobile CSS `order` vs DOM focus order (documented; full DOM reorder deferred).
- Global modal framework beyond narrow destructive confirm.
- Central lifecycle contrast token changes (audited; no failures requiring token edits in this pass).

---

## Permanent Principle

如果有人无法独立感知、理解或操作一个治理平台，那么这个平台就不能称为真正透明。

---

**END OF RC-007**
