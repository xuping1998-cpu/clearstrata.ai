# PR-005 — Meeting & Voting Integration (Phase 5)

## Project One · Project Record

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | PR-005 |
| **Document Title** | Meeting & Voting Integration — Phase 5 |
| **Document Type** | Project Record (PR) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [The ClearStrata Constitution](../00_ClearStrata_Constitution.md) (FD-001) |
| **Effective Date** | 2026-07-06 |
| **Classification** | Project Records |
| **Owner** | ClearStrata Project One |
| **Related Documents** | GP-004, PR-004, PR-003, PR-007, GP-002, PR-005 |
| **Repository Location** | `docs/projects/PR-005_Meeting_Voting_Integration_Phase_5.md` |

---

## Purpose

Phase 5 integrates **Community Resolution** with the existing **Meeting** and **Voting** modules. Meetings and votes gain transparent, traceable constitutional origin without redesigning meeting legality or vote logic.

---

## Core Principle

No Meeting exists without purpose. No Vote exists without context. Every Meeting shall originate from at least one Community Resolution.

---

## Implementation

| Component | Change |
|-----------|--------|
| `meeting_agenda_items.community_resolution_id` | Agenda ↔ resolution link |
| `owner_vote_resolutions.community_resolution_id` | Owner vote ↔ resolution link (when table present) |
| `MeetingDetail.tsx` | Origin resolution cards before owner voting / per agenda |
| `communityResolutionsApi.ts` | `linkAgendaItemToResolution`, meeting context fetch |
| Vote RPCs / ballot logic | **Unchanged** |

---

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Meeting references Resolution | ✓ |
| Resolution references Matter | ✓ |
| Voting context shows Resolution summary | ✓ |
| Constitutional Basis visible | ✓ |
| Discussion summary visible | ✓ |
| Existing voting logic unchanged | ✓ |
| Existing meeting legality unchanged | ✓ |

---

## Voting Golden Rule

### 投票黄金法则

Voting does not create understanding. **Voting confirms understanding.**

Community members should never encounter an issue for the first time inside the voting page.

Understanding must be established through **Community Deliberation**, **Community Resolution**, and **Meeting**.

Voting provides the community's legitimate authorization. It does not replace discussion.

---

投票，不负责产生理解。投票，负责确认理解。

任何社区成员，都不应该在投票页面第一次知道自己要决定什么。

真正的理解，应当在社区议事、社区决议、正式会议三个阶段已经形成。

投票，只是依法确认社区已经形成的理解，并赋予其正式授权。

---

## Meeting Constitutional Rule

### 会议宪章原则

Every Meeting shall have a **constitutional origin**.

Before entering Meeting, the following shall exist:

- ✓ Governance Matter
- ✓ Community Deliberation
- ✓ Community Resolution
- ✓ Constitutional Basis
- ✓ Discussion History
- ✓ Revision History
- ✓ Supporting Documents

The Meeting is not the beginning of governance. It is the constitutional bridge between community deliberation and community authorization.

---

每一场正式会议，都必须具有明确的宪章来源。

进入会议之前，应当已经具备：治理事项、社区议事、社区决议、宪章依据、讨论历史、修订历史、支持文件。

会议，不是治理的开始。会议，是社区充分讨论之后，依法进入正式授权程序的桥梁。

---

## Meeting Golden Rule

### 会议黄金法则

A Meeting is not where governance begins. **It is where governance becomes legitimate.**

---

会议，不是治理的开始。会议，是治理获得合法性的地方。

---

## Constitutional Interpretation

### 宪章解释

| Stage | Creates |
|-------|---------|
| Community Deliberation | Understanding |
| Community Resolution | Clarity |
| Meeting | Constitutional review |
| Voting | Legitimate authority |
| Execution | Accountability |
| Community Memory | Civilization |

---

社区议事，形成理解。  
社区决议，形成清晰。  
正式会议，形成依法审议。  
正式投票，形成合法授权。  
执行，形成责任。  
社区记忆，形成文明。

---

## Golden Rule (Meeting)

A Meeting should never ask *"What are we voting on?"*

It should ask *"Having understood everything, are we ready to decide?"*

---

## Permanent Inscription

### 永久铭文

Meetings should never ask, *"What are we voting on?"*

They should ask, *"Having understood everything, are we ready to decide together?"*

---

真正的会议，不应该问："我们今天要投什么？"

真正的会议，应该问："在充分理解之后，我们是否已经准备好，共同作出决定？"

---

**END OF PR-005**
