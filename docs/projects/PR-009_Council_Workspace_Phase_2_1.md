# PR-009 — Council Workspace (Phase 2.1)

## Project One · Project Record

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | PR-009 |
| **Document Title** | Council Workspace — Phase 2.1 |
| **Document Type** | Project Record (PR) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [The ClearStrata Constitution](../00_ClearStrata_Constitution.md) (FD-001) |
| **Effective Date** | 2026-07-06 |
| **Classification** | Project Records |
| **Owner** | ClearStrata Project One |
| **Related Documents** | GP-002, GP-004, GP-005, PR-003, PR-004, PR-005, PR-007 |
| **Repository Location** | `docs/projects/PR-009_Council_Workspace_Phase_2_1.md` |

---

## Purpose

Phase 2.1 introduces **Council Workspace** — the operational center for constitutional governance. Council members perform the complete governance workflow from a single workspace.

Per **GP-005**, Council Workspace is not an independent sidebar module. It is the detailed operating page opened from the **Governance Panel** inside Community Deliberation (`/community-deliberation`).

This is not an administration panel. It is the constitutional workplace of community governance.

---

## Implementation

| Component | Path |
|-----------|------|
| Workspace page | `src/pages/council/CouncilWorkspacePage.tsx` |
| Lifecycle model | `src/lib/community/governanceLifecycleModel.ts` |
| Council matter fetch | `fetchGovernanceMattersForCouncilWorkspace` |
| Route | `/council/workspace` |
| Navigation | Governance Panel in Community Deliberation (`/community-deliberation`); not a left-sidebar business module |
| Meeting prefill | `governance_resolution` source in `meetingEditorPrefill.ts` |

### Layout

| Column | Content |
|--------|---------|
| **Left** | Governance matters list + status filter |
| **Center** | Detail, discussion, revisions, CDA panel |
| **Right** | Council actions, constitutional basis, lifecycle, next step |

### Primary actions

Publish Matter · New Revision · Generate CDA · Create Resolution · Schedule Meeting · Open Voting · Archive

---

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Publish Matter button | ✓ |
| Council Workspace page | ✓ |
| Revision workflow | ✓ |
| CDA action panel | ✓ |
| Resolution action | ✓ |
| Meeting action | ✓ |
| Voting shortcut | ✓ |
| Archive action | ✓ |
| Lifecycle visible | ✓ |
| Constitutional Basis visible | ✓ |

---

## Golden Rule

Council does not govern through authority. Council governs through **transparent workflow**.

---

## 中文版

业委会工作台不是后台管理页面。它是社区治理真正开始的地方。

---

## Permanent Inscription

Good governance is not measured by how many decisions are made. It is measured by how clearly every decision was prepared.

良好的治理，不是看作出了多少决定。而是看每一个决定，是否都经过了充分、公开、透明、可追溯的准备过程。

---

**END OF PR-009**
