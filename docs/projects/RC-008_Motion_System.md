# RC-008 — Motion System

## Project One Release Candidate · Foundation Layer

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | RC-008 |
| **Document Title** | Motion System |
| **Document Type** | Release Candidate Record (RC) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [CDS-001](../design-system/CDS-001_ClearStrata_Design_System.md), RC-001 … RC-007 |
| **Effective Date** | 2026-07-14 |
| **Classification** | Project One RC — Foundation |
| **Owner** | ClearStrata Project One |
| **Related Documents** | RC-002, RC-004, RC-005, RC-006, RC-007, UIP-011, UIP-013 |
| **Repository Location** | `docs/projects/RC-008_Motion_System.md` |

---

## Purpose

One restrained, accessible motion language for Project One governance surfaces. Motion explains state change — it does not decorate, delay work, or compete for attention.

---

## Canonical motion tokens

| Token | Duration | Tailwind class | Use |
|-------|----------|----------------|-----|
| instant | 75ms | `duration-motion-instant` | Near-immediate (reserved) |
| fast | 150ms | `duration-motion-fast` | Buttons, links, chips, tabs |
| standard | 200ms | `duration-motion-standard` | Tab panel opacity |
| panel | 240ms | `duration-motion-panel` | Dialogs, refreshing overlay |
| progress | 300ms | `duration-motion-progress` | Lifecycle pills, progress segments |
| feedback | 360ms | `duration-motion-feedback` | Toasts |

**Easing:** `ease-motion-enter` (in/respond), `ease-motion-exit` (out), `ease-motion-move` (spatial).

**Implementation:** `tailwind.config.js` extensions + CSS variables in `src/index.css` + `src/lib/ui/motionClasses.ts`.

---

## Reduced motion

All pilot motion classes include `motion-reduce:transition-none` and/or `motion-reduce:animate-none`. Skeleton pulse and spinners stop animating; opacity/color transitions become instant. Focus, loading meaning, pressed feedback, and live regions unchanged (RC-006/007).

Global: `animate-slide-up` disabled under `prefers-reduced-motion` in `index.css`.

---

## Pilot components migrated

| Component | Motion change |
|-----------|---------------|
| `Button.tsx` | `MOTION_INTERACTIVE`, `MOTION_SPINNER` |
| `interactionClasses.ts` | Delegates to `motionClasses` |
| `GovernanceFeedbackHost` | `MOTION_FEEDBACK` |
| `DestructiveConfirmDialog` | `MOTION_DIALOG` |
| `SkeletonBlocks` / `LoadingState` | `MOTION_SKELETON_PULSE`, `MOTION_SPINNER` |
| `RefreshingOverlay` | `MOTION_PANEL`, `MOTION_SPINNER` |
| `GovernanceMatterDetailTabs` | `MOTION_TAB_PANEL`, `MOTION_ACCORDION_ICON` |
| `GovernanceMatterFollowButton` | `MOTION_INTERACTIVE`, `MOTION_SPINNER` |
| `ImportantUpdatesDashboardCard` | Expand chevron → canonical fast transform |
| `governanceLifecyclePresentation` | `MOTION_PROGRESS` on lifecycle pills |
| `GovernanceMatterTimelineTab` | Progress segment color transition |

---

## Intentionally deferred

- Route-wide page transitions
- Finance, Procurement, Meetings, Voting, Auth, Owner Information
- Action queue item exit/reorder animation (instant update preserved)
- Timeline event insertion animation on re-render (no fake replay)
- New animation library

---

## Permanent Principle

动画应当帮助用户理解变化，而不是争夺用户的注意力。如果去掉一段动画并不会降低理解，那么这段动画可能并不必要。

---

**END OF RC-008**
