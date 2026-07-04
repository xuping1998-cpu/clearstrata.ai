# GP-002 — Community Deliberation

## Constitutional Governance Module · 社区议事厅

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | GP-002 |
| **Document Title** | Community Deliberation (社区议事厅) |
| **Document Type** | Governance Module (GP) |
| **Status** | ACTIVE |
| **Version** | 1.1 |
| **Authority** | [The ClearStrata Constitution](00_ClearStrata_Constitution.md) (FD-001) |
| **Effective Date** | 2026-06-29 |
| **Classification** | Core Governance Module |
| **Owner** | Founding Team |
| **Supersedes** | None |
| **Superseded By** | None |
| **Related Documents** | FD-001, GP-001, PR-000, PR-001, GP-003, CS-001 |
| **Repository Location** | `docs/Community_Deliberation.md` |

---

## Purpose

**Community Deliberation** is the **only official public governance discussion module** of ClearStrata.

Every important community decision **begins with discussion**. Good governance **begins with listening**.

This module exists to ensure that every significant governance matter is:

- **Openly discussed**
- **Publicly understood**
- **Collectively improved**

— **before** any formal decision is made.

Community Deliberation is **not** to create conversations, but to **create better decisions**.  
**Not** to collect opinions, but to **build consensus**.  
**Not** to replace meetings, but to **prepare meaningful meetings**.

---

## Scope

**In scope:**

- Official module name (English and Chinese)
- Constitutional principles, lifecycle, and repository naming rules
- Role of AI within deliberation (Article III)
- Dashboard homepage position, section copy, and card patterns
- Mandatory workflow: deliberation before Resolution, Meeting, Voting, Decision, Execution, Community Memory

**Out of scope:**

- Community bulletin, owner notifications, social feeds, or general chat (distinct modules)
- Emergency workflows except where **explicitly authorized by law** (may bypass deliberation with documented authority)
- Detailed API schema and implementation (subordinate ADRs and product specs)

**Constitutional anchors:** Article II (Discussion Before Decision), Article III (AI Assists, People Decide), Article V (Public by Default), Article VI (Governance Lifecycle), Article VII (Community Memory), Article X (Legitimacy Before Intelligence).

---

## Official Name

| Language | Name |
|----------|------|
| **English** | Community Deliberation |
| **Chinese** | 社区议事厅 |

This is the **ONLY** official public governance discussion module of ClearStrata.

The module shall **always** be referred to as **Community Deliberation（社区议事厅）**.

### Forbidden terms

The following shall **not** be used to describe this module:

| English | Chinese (also forbidden for this module) |
|---------|------------------------------------------|
| Forum | 论坛 |
| Discussion Board | — |
| Community Feed | — |
| Bulletin Board | 公告栏 |
| Community Chat | 聊天室 |
| Message Board | 留言板 |
| Social Feed | — |
| Timeline | — |

Use **Community Deliberation / 社区议事厅** consistently in **UI**, **Database**, **API**, **AI**, **Documentation**, and **Repository**.

---

## Mission

Every important community decision **begins with discussion**.

Good governance **begins with listening**.

Community Deliberation exists to ensure that every significant governance matter is openly discussed, publicly understood, and collectively improved **before** any formal decision is made.

---

## Constitutional Principles

| Principle | Constitutional source |
|-----------|----------------------|
| **Discussion Before Decision** | Article II |
| **Transparency Before Authority** | Article V |
| **Participation Before Power** | Article II, Mission |
| **Legitimacy Before Intelligence** | Article X |
| **Community Before Convenience** | Mission, Rule 9 |

---

## What Community Deliberation Is Not

Community Deliberation is **NOT**:

- a **forum**
- a **social network**
- a **message board**
- a **chat room**

It is the **constitutional starting point** of community governance.

---

### 定义

**Community Deliberation（社区议事厅）** 是 ClearStrata **唯一正式的公共治理讨论空间**。

它不是论坛。不是聊天室。不是留言板。不是社交网络。

而是所有 **重大社区治理事项** 的 **正式起点**。

---

## Governance Lifecycle

Every significant matter follows this constitutional path:

```
Matter
    ↓
Community Deliberation
    ↓
AI Summary
    ↓
Draft Resolution
    ↓
Community Resolution
    ↓
Meeting
    ↓
Voting
    ↓
Decision
    ↓
Execution
    ↓
Community Memory
```

**Community Deliberation** is the platform name for the **Discuss** phase of significant governance matters (Article VI).

---

## Role of AI

Artificial Intelligence:

- **Does not** decide
- **Does not** vote
- **Does not** replace governance

Artificial Intelligence **helps**:

- Summarize discussion
- Identify consensus
- Surface different viewpoints
- Organize information
- Prepare draft resolutions

**Article III remains applicable:**

**AI Assists. People Decide.**

---

## Homepage Position

### Dashboard section

| Element | English | Chinese |
|---------|---------|---------|
| **Section title** | Community Deliberation | 社区议事厅 |
| **Header motto** | Good governance begins with listening. | 良好的治理，始于认真倾听。 |
| **Subtitle** | Every important community decision begins with open discussion. | 每一项重要社区决策，都始于公开讨论。 |

---

## Homepage Card Pattern

Reference layout for dashboard matter cards:

```
Community Deliberation
社区议事厅
━━━━━━━━━━━━━━━━━━━━━━
🟢 Property Management Renewal
   Discussion · 128 Comments · 12 Days Remaining
   [Join Discussion]
━━━━━━━━━━━━━━━━━━━━━━
🟡 2027 Budget Proposal
   Public Consultation · 42 Opinions
   [View]
━━━━━━━━━━━━━━━━━━━━━━
🔵 Roof Repair Project
   Preparing Resolution · AI Summary Available
   [Continue Discussion]
━━━━━━━━━━━━━━━━━━━━━━
🔴 Special General Meeting
   Owner Requisition · 56 / 91 Supporters
   [View Details]
━━━━━━━━━━━━━━━━━━━━━━
View All Community Matters
查看全部重大事项
```

Card states reflect lifecycle position (discussion → consultation → resolution prep → formal meeting track). Copy shall use **Community Deliberation**, not forbidden synonyms.

---

## Repository Rule

Every governance matter **shall begin** with **Community Deliberation** before entering:

Resolution → Meeting → Voting → Decision → Execution → Community Memory

**No governance workflow** should bypass Community Deliberation, except **emergency matters explicitly authorized by law**.

Bypass requires **documented justification** in Constitution Review (see [Governance Model](02_Governance_Model.md)).

---

## Constitutional Statement

**Community Deliberation** is where governance **begins**.

**Meetings** formalize decisions.  
**Voting** legitimizes decisions.  
**Community Memory** preserves decisions.

Together, they form the **constitutional lifecycle** of ClearStrata.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [FD-001 — The ClearStrata Constitution](00_ClearStrata_Constitution.md) | Articles II, III, V, VI, VII, X |
| [02 — Governance Model](02_Governance_Model.md) | Lifecycle implementation and Constitution Review |
| [06 — Data Governance](06_Data_Governance.md) | Community Memory, audit, archive |
| [GP-001 — The Beauty of Order](The_Beauty_of_Order.md) | Document traceability |
| [PR-000 — Project Zero Chronicle](99_Project_Zero_Chronicle.md) | Founding narrative |
| [GP-003 — The Four Pillars of Community Governance](Four_Pillars_of_Community_Governance.md) | Pillar I framework |
| [PR-001 — Governance Dashboard](Governance_Dashboard.md) | Dashboard section ① placement and homepage copy |
| [CS-001 — Repository Document Numbering Standard](Repository_Document_Numbering_Standard.md) | GP-002 permanent identifier |

---

## Revision History

| Version | Date | Summary | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-29 | Initial adoption — official governance term | Founding Team |
| 1.1 | 2026-06-29 | Expanded to full Constitutional Governance Module (homepage, AI role, lifecycle) | Founding Team |

---

## Closing Motto

Communities are not built by **speaking louder**.  
Communities are built by **listening better**.

---

**中文版**

社区，不是因为声音更大而变得更好。  
社区，是因为彼此更加认真倾听而共同成长。

---

**END OF GP-002 — COMMUNITY DELIBERATION**

| | |
|---|---|
| **Status** | ACTIVE |
| **Document Number** | GP-002 |
| **Classification** | Core Governance Module |
| **Authority** | The ClearStrata Constitution (FD-001) |
| **Effective Date** | 2026-06-29 |
