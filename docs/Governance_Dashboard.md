# PR-001 — Governance Dashboard

## Project One · Dashboard Constitutional Layout

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | PR-001 |
| **Document Title** | Governance Dashboard |
| **Document Type** | Project Record (PR) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [The ClearStrata Constitution](00_ClearStrata_Constitution.md) (FD-001) |
| **Effective Date** | 2026-06-29 |
| **Classification** | Core Governance Experience |
| **Owner** | Founding Team |
| **Supersedes** | None |
| **Superseded By** | None |
| **Related Documents** | FD-001, GP-002, GP-003, PR-000, CS-001 |
| **Repository Location** | `docs/Governance_Dashboard.md` |

**Constitutional modules on the Dashboard:** Community Deliberation (GP-002), Community Resolution, Community Voting, Community Memory (Article VII).

---

## Purpose

Define the **constitutional layout** of the ClearStrata **Governance Dashboard** — the front page of community governance for **Project One**.

The Dashboard is **not** a feature launcher, menu, or generic application homepage. It is the **constitutional entrance** to community governance.

Every component shall strengthen **transparency**, **participation**, **accountability**, **community trust**, and **constitutional governance**.

---

## Scope

**In scope:**

- Official four-section Dashboard structure and governance flow
- Homepage principles, layout copy (English and Chinese)
- Traceability rules between Deliberation, Resolution, Voting, and Memory
- Repository rule: present governance, not software

**Out of scope:**

- Implementation of individual module features (see GP-002 and future module records)
- Admin, finance, or operational dashboards outside owner governance home
- Detailed component API and routing (subordinate ADRs and product specs)

---

## Design Principle

The Dashboard is **NOT**:

- a **feature launcher**
- a **menu**
- an **application homepage**

It is the **constitutional entrance** to community governance.

Every component should strengthen:

- Transparency
- Participation
- Accountability
- Community trust
- Constitutional governance

---

## Official Dashboard Structure

### ① Community Deliberation · 社区议事厅

| | |
|---|---|
| **Purpose** | Listen. Discuss. Understand. Build consensus. |

**Module record:** [GP-002 — Community Deliberation](Community_Deliberation.md)

---

### ② Community Resolution · 社区决议

| | |
|---|---|
| **Purpose** | Transform discussion into official proposals. |

**Traceability rule:** Every Resolution **must reference** its originating **Community Deliberation**.

---

### ③ Community Voting · 社区投票

| | |
|---|---|
| **Purpose** | Transform Resolution into legitimate community decisions. |

**Traceability rule:** Every Vote **must reference** its Resolution.

---

### ④ Community Memory · 社区记忆

| | |
|---|---|
| **Purpose** | Preserve every discussion, every Resolution, every Vote, every Decision, and every lesson. |

**Constitutional anchor:** Article VII — Community Memory.

---

## Governance Flow

```
Community Deliberation
    ↓
Community Resolution
    ↓
Community Voting
    ↓
Decision
    ↓
Execution
    ↓
Community Memory
```

This extends the lifecycle defined in [GP-002](Community_Deliberation.md) and **Article VI** — the Dashboard presents this flow as **one continuous journey**, not isolated modules.

---

## Homepage Principle

The Dashboard shall **always answer four questions**:

| Question | Section |
|----------|---------|
| **What are we discussing?** | Community Deliberation |
| **What are we deciding?** | Community Resolution |
| **What are we voting on?** | Community Voting |
| **What have we learned?** | Community Memory |

---

## Homepage Layout

Reference structure for the owner governance home:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Community Deliberation
社区议事厅
Every important decision begins with discussion.
良好的治理，始于认真倾听。
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Community Resolution
社区决议
Official proposals currently under review.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Community Voting
社区投票
Active voting and upcoming meetings.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Community Memory
社区记忆
History · Lessons · Institutional Memory
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Section order is **fixed**: Deliberation → Resolution → Voting → Memory.

Copy shall use **constitutional module names** only (see [GP-002](Community_Deliberation.md) forbidden-term list for Deliberation).

---

## Repository Rule

The Dashboard shall present:

- **Governance**, not software
- **Community workflows**, not isolated functions
- **Constitutional lifecycle**, not independent modules

No Dashboard section shall be named after internal feature flags, route paths, or generic SaaS patterns (e.g. “Feed”, “Activity”, “Shortcuts”) when a constitutional module name applies.

---

## Constitutional Statement

The Dashboard is the **front page** of community governance.

It represents the **Constitution through experience** — not merely through documentation.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [FD-001 — The ClearStrata Constitution](00_ClearStrata_Constitution.md) | Articles II, VI, VII, X |
| [GP-002 — Community Deliberation](Community_Deliberation.md) | Section ① — Core Governance Module |
| [GP-003 — The Four Pillars of Community Governance](Four_Pillars_of_Community_Governance.md) | Constitutional framework for all four sections |
| [02 — Governance Model](02_Governance_Model.md) | Lifecycle and Constitution Review |
| [05 — UI Design Principles](05_UI_Design_Principles.md) | Transparency and clarity in UI |
| [06 — Data Governance](06_Data_Governance.md) | Community Memory and archive |
| [PR-000 — Project Zero Chronicle](99_Project_Zero_Chronicle.md) | Predecessor project record |
| [CS-001 — Repository Document Numbering Standard](Repository_Document_Numbering_Standard.md) | PR-001 permanent identifier |

**Future module records (constitutional names reserved):** Community Resolution, Community Voting — to be assigned GP or PR numbers when adopted.

---

## Revision History

| Version | Date | Summary | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-29 | Initial adoption — Project One Dashboard constitutional layout | Founding Team |

---

## Closing Motto

**Governance is not a destination.**  
**It is a continuous journey taken together.**

---

**中文版**

治理，不是一个结果。  
而是一段共同前行的旅程。

---

**END OF PR-001 — GOVERNANCE DASHBOARD**

| | |
|---|---|
| **Status** | ACTIVE |
| **Document Number** | PR-001 |
| **Classification** | Core Governance Experience |
| **Authority** | The ClearStrata Constitution (FD-001) |
| **Effective Date** | 2026-06-29 |
