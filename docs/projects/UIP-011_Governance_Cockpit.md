# UIP-011 — Governance Cockpit

## UI Polish Record · Council Workspace

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | UIP-011 |
| **Document Title** | Governance Cockpit |
| **Document Type** | UI Polish Record (UIP) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [GP-005](../Principles/GP-005_Shared_Governance_Space.md), [GP-006](../Principles/GP-006_Governance_Experience.md) |
| **Effective Date** | 2026-07-10 |
| **Classification** | UI Polish |
| **Owner** | ClearStrata Project One |
| **Related Documents** | UIP-001, UIP-004, UIP-005, PR-009 |
| **Repository Location** | `docs/projects/UIP-011_Governance_Cockpit.md` |

---

## Objective

Transform `/council/workspace` from a three-column management page into a **Governance Cockpit** that answers within five seconds:

1. What is happening?
2. Which matters are urgent?
3. What must be done today?
4. What comes next?

**UI only** — no schema, API, RLS, permission, or legality changes.

---

## Layout

| Column | Role |
|--------|------|
| **Left** | Governance Pipeline — lifecycle filters with counts + matter cards |
| **Center** | Current Matter — lifecycle timeline + tabbed workspace (Details / Discussion / Resolution / CDA / History) |
| **Right** | Governance Cockpit — metrics + Today's Action Queue (specific matters) |

---

## Implementation

| Component | Path |
|-----------|------|
| Cockpit page | `src/pages/council/CouncilWorkspacePage.tsx` |
| Priority engine | `src/lib/community/governanceCockpitPriority.ts` |
| Cockpit panel | `src/components/community-deliberation/GovernanceCockpitPanel.tsx` |
| Pipeline cards | `src/components/community-deliberation/WorkspacePipelineMatterCard.tsx` |
| Advisory CDA timeline | `src/components/community-deliberation/CockpitLifecycleTimeline.tsx` |

---

## Priority Logic (front-end only)

1. Overdue / deadline approaching
2. Obvious pending action for current stage
3. Awaiting CDA
4. Awaiting Resolution
5. Awaiting Meeting
6. Awaiting Voting
7. Ready to archive

---

## Permanent Principle

A workspace waits for the user to find the work.  
A cockpit shows the user what must be done next.

工作台等待使用者寻找工作。  
驾驶舱主动告诉使用者，下一步必须完成什么。

---

**END OF UIP-011**
