# RC-010 — Governance UX Architecture (GUXA)

## Project One Release Candidate · UX Architecture Standard

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | RC-010 |
| **Document Title** | Governance UX Architecture (GUXA) |
| **Document Type** | Release Architecture Standard (RC) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | CDS-001, GP-005, GP-006, GPA-001, GPA-002, GDS-001, GRFC-001, RC-001 … RC-009 |
| **Effective Date** | 2026-07-14 |
| **Classification** | Project One RC — Final UX Architecture |
| **Owner** | ClearStrata Project One |
| **Related Documents** | UIP-011, UIP-012, UIP-013 |
| **Repository Location** | `docs/projects/RC-010_Governance_UX_Architecture.md` |

---

## Purpose

GUXA defines how ClearStrata governance experiences are divided into distinct user spaces. Hub, Cockpit, and Execution share authoritative data and design foundations but must not collapse into one overloaded interface.

---

## Three spaces

| Space | Route | Audience | Core question |
|-------|-------|----------|---------------|
| **Governance Hub** | `/community-deliberation` | All permitted participants | What is happening, and where may I participate? |
| **Governance Cockpit** | `/council/workspace` | Council + permitted admin roles | What must Council understand, decide, or advance next? |
| **Governance Execution** | Operational modules (Finance, Procurement, Meetings, etc.) | Role-dependent | What approved work must be carried out and verified? |

**Hub Golden Rule:** 治理中心属于整个社区。业委会可以参与其中，但不能把它变成业委会的后台。

**Cockpit Golden Rule:** 治理驾驶舱应当帮助业委会推进工作，但绝不能取代业委会作出判断。

**Execution Golden Rule:** 执行空间负责落实治理决定。执行不能重新解释或改写治理决定。

---

## Canonical routes and components (investigated 2026-07-14)

| Surface | Route | Primary component |
|---------|-------|-------------------|
| Dashboard Hub card | `/` | `ImportantUpdatesDashboardCard.tsx` |
| Governance Hub | `/community-deliberation` | `GovernanceMatterPages.tsx` → `GovernanceMattersHubPage` |
| Matter Detail | `/community-deliberation/:matterId` | `GovernanceMatterDetailPage` |
| Create Matter | `/community-deliberation/new` | `GovernanceMatterCreatePage` |
| Hub filtered views | `?view=comments` \| `?view=subscribed` | Same hub page |
| Governance Cockpit | `/council/workspace` | `CouncilWorkspacePage.tsx` |
| Cockpit queue | — | `GovernanceCockpitPanel.tsx` |
| Matter tabs (Hub + Cockpit) | — | `GovernanceMatterDetailTabs.tsx` |
| Meeting handoff | `/meetings/new` | `CouncilWorkspacePage` → `MeetingEditor.tsx` (`meetingDraftPrefill`) |
| Voting handoff | `/meetings/:id#owner-voting` | `CouncilWorkspacePage.handleViewVoting` |
| Resolution detail | `/community-resolutions/:resolutionId` | `CommunityResolutionPages.tsx` |

**Canonical labels (enforced):**

| English | Chinese | Use |
|---------|---------|-----|
| Governance Hub | 治理中心 | Hub page h1, back links |
| Community Deliberation | 社区议事厅 | Hub subtitle |
| Governance Cockpit | 治理驾驶舱 | Cockpit page h1 |
| Open Governance Hub | 进入治理中心 | Dashboard / empty states |
| Open Governance Cockpit | 打开治理驾驶舱 | Hub → Cockpit handoff (replaces “Open Workspace”) |

Deprecated on Hub: “Open Workspace”, “业委会工作台” as Hub panel title, internal council metrics on Hub sidebar.

---

## UX responsibility matrix

| Feature | Hub | Cockpit | Execution |
|---------|-----|---------|-----------|
| Matter feed | Primary | Pipeline projection | Context |
| Owner comments | Primary | Evidence input | Read-only |
| Council revision | Published result | Primary | Reference |
| CDA | Public report | Generate/review | Reference |
| Community Resolution | Public artifact | Prepare/advance | Authority source |
| Meeting | Public link | Handoff | Meeting engine |
| Voting | Eligible link | Monitor handoff | Voting engine |
| Action queue | **Never** | Primary | Separate ops queues |
| Governance Timeline | Public events | Full permitted view | Traceability |

---

## Shared data / SSGT (GPA-002)

Matter status, comment counts, resolution linkage, meeting/voting IDs must project from one authoritative record. No UI maintains a hidden second lifecycle. Timeline is a projection (`governanceTimelineModel.ts`). Cockpit intelligence is deterministic projection (`governanceIntelligence.ts`), not truth.

---

## Navigation and handoff

| From | To | Preserve |
|------|-----|----------|
| Hub | Cockpit | `propertyId`, optional `matterId` |
| Cockpit | Hub | `propertyId` via `governanceMattersListUrl` |
| Cockpit | Meeting | `propertyId`, `governance_matter_id`, `community_resolution_id`, prefill `source` |
| Cockpit | Voting | `meetingId`, `#owner-voting` |
| Governance | Execution | `propertyId`, matterId, authorizing artifact |

Preferred Hub → Cockpit entry: **Open Governance Cockpit** in council handoff panel only (not sidebar peer to unrelated admin modules).

---

## Mobile priority order

**Hub:** title → feed → participation → notices → secondary nav.

**Cockpit:** Current Matter → stage → next action → queue summary → pipeline → tabs → metrics.

**Execution:** authority → assigned action → deadline → evidence → history.

Do not compress desktop three-column Cockpit; stack by priority.

---

## Integrated RC layers

| RC | GUXA integration |
|----|------------------|
| RC-004 | Space-specific empty/loading states |
| RC-006 | Hub optimistic vs Cockpit conservative actions |
| RC-007 | Landmarks; no cross-space hidden controls in tab order |
| RC-008 | Hub participation motion; Cockpit state-change motion |
| RC-009 | Journey QA validates handoffs; P1 integration gaps remain |

---

## UX anti-patterns (documented)

1. Public participation + Council controls on one undifferentiated screen  
2. Hub as administrative dashboard (internal metrics, action queue on Hub)  
3. Cockpit as public feed  
4. Execution rewriting governance authority  
5. Duplicate lifecycle state for visual convenience  
6. Second Meeting/Voting truth  
7. Council-only actions shown to Owners as disabled teasers  
8. Generic labels (Open / Continue / Proceed) when specific action exists  
9. Desktop three-column Cockpit forced onto mobile  
10. AI recommendations without evidence or human review  

---

## RC-010 code alignment (minimal)

| Change | Rationale |
|--------|-----------|
| `GovernanceHubPanel` — handoff-only for Council; remove internal metrics | Anti-pattern #2 |
| Rename “Open Workspace” → “Open Governance Cockpit” | Label consistency |
| Cockpit page subtitle aligned to GUXA | 治理驾驶舱 vs 业委会工作台 |
| Loading copy “governance cockpit” | Naming consistency |

**Not in scope:** Execution Workspace creation, route renames, workflow/schema/RLS changes, Hub full redesign.

---

## Release relationship

RC-010 is the final **UX architecture standard** for Project One. It does **not** declare v1.0 released. After RC-010:

1. Resolve RC-009 P0/P1 issues  
2. Confirm release gate  
3. Create Project One v1.0 release record (separate document)  

---

## Permanent Principle

治理平台不能把参与、决策与执行，混在一个没有边界的界面里。社区必须清楚在哪里参与；业委会必须清楚在哪里治理；负责执行的人，必须清楚自己正在落实哪一项授权。

---

**END OF RC-010**
