# RC-006 — Interaction Audit

## Project One Release Candidate · Foundation Layer

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | RC-006 |
| **Document Title** | Interaction Audit |
| **Document Type** | Release Candidate Record (RC) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [CDS-001](../design-system/CDS-001_ClearStrata_Design_System.md), RC-001 … RC-005 |
| **Effective Date** | 2026-07-14 |
| **Classification** | Project One RC — Foundation |
| **Owner** | ClearStrata Project One |
| **Related Documents** | RC-002, RC-004, CDS-001 §15 |
| **Repository Location** | `docs/projects/RC-006_Interaction_Audit.md` |

---

## Purpose

Standardize **interaction behavior** on Project One governance routes. No workflow, API, schema, or permission changes. Every important action must answer: Did my click work? Is something happening? Can I click again? What changed? Can I recover?

---

## Interaction inventory (pilot)

| Surface | Interactions audited |
|---------|---------------------|
| `/community-deliberation/new` | Create matter, validation, loading, success toast via navigation state |
| `/community-deliberation/:matterId` | Comment, council revision, CDA, prepare resolution |
| `/community-deliberation` | Hub links, filters (optimistic), participation retry (existing RC-004) |
| `/` | Dashboard card links (unchanged data flow) |
| `/council/workspace` | Pipeline select, stage filters, queue actions, revision, CDA, resolution, archive |

---

## Shared primitives

| Module | Role |
|--------|------|
| `src/lib/ui/interactionClasses.ts` | Hover/focus/press timing (150ms), `INTERACTION_TAB`, `INTERACTION_SELECTABLE`, `INTERACTION_LINK` |
| `src/lib/ui/governanceFeedbackMessages.ts` | Canonical bilingual toast keys |
| `src/hooks/useGovernanceFeedback.ts` | Push / dismiss toast stack |
| `src/components/ui/feedback/GovernanceFeedbackHost.tsx` | Fixed stack, `aria-live`, auto-dismiss |
| `src/lib/ui/confirmDestructiveAction.ts` | Archive confirmation (RC-006G) |
| `src/components/ui/Button.tsx` | RC-002 loading, `aria-busy`, focus-visible, pressed opacity |

---

## Interaction checklist (Project One)

1. **Hover** — 150ms transitions on tabs, pipeline cards, links; no scale animations.
2. **Focus** — `focus-visible` ring on tabs, cards, buttons; form fields keep ring on invalid focus.
3. **Pressed** — Button `active:opacity-95`; loading spinner replaces label affordance.
4. **Loading** — `loading` disables control + `aria-busy`; conservative actions block duplicate submit.
5. **Success** — Toast via `GovernanceFeedbackHost` (not silent success).
6. **Error** — Inline `ErrorState` / field error + error toast; values preserved.
7. **Confirmation** — Archive only (`ARCHIVE_CONFIRM`); open/view/filter need none.
8. **Duplicate submit** — Split `commentSubmitting` / `revisionSubmitting` / `cdaGenerating` / `resolutionSubmitting` / `queueLoadingKey`.
9. **Optimistic** — Tabs, pipeline filters, expand/collapse `<details>`.
10. **Conservative** — Publish/create, comment, CDA, resolution, archive wait for server before UI success toast.
11. **Accessibility** — Keyboard tab order, `aria-live` toasts, `aria-current` on selected pipeline card, reduced motion on transitions.

---

## Pilot routes

| Route | RC-006 changes |
|-------|------------------|
| `/community-deliberation/new` | Title validation + focus; `Button` loading; success toast on detail via `location.state` |
| `/community-deliberation/:matterId` | Feedback host; split loading; Button migration in tabs + CDA |
| `/council/workspace` | Feedback host; archive confirm; queue `busyQueueKey`; split loading; pipeline/card focus |

---

## Future migration (not this pass)

Finance, Procurement, standalone Meetings/Voting, Owner Information, Authentication, email.

---

## Permanent Principle

每一次交互，系统都应立即告诉用户：我已理解你的操作；我正在处理；这是处理结果。

---

**END OF RC-006**
