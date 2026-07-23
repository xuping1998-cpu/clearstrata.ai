# Milestone M2 — Meeting Resolution Authoring

| Field | Value |
|-------|-------|
| **Milestone** | M2 |
| **Title** | Meeting Resolution Authoring |
| **Official name** | Meeting Resolution Authoring Before Snapshot |
| **Version** | 1.0 |
| **Status** | **In Progress** |
| **Era** | Constitutional Implementation Era |
| **RC** | RC010 |
| **Release target** | FR2 — Governance Release |
| **Engineering model** | Constitutional Governance Engineering (CGE) |
| **Effective date** | 2026 |
| **Authority** | RC000 · MGS · CGE · CGDP |

---

## Milestone Status Update

| Field | Value |
|-------|-------|
| **Milestone** | M2 — Meeting Resolution Authoring |
| **Status** | **In Progress** |
| **Era** | Constitutional Implementation Era |
| **Release** | FR2 — Governance Release |
| **Engineering model** | Constitutional Governance Engineering (CGE) |
| **Effective date** | 2026 |

### Milestone authorization

With the completion of **Foundation Release (FR1)**, the **Founding Constitution**, **RC000**, **CGDP**, and the constitutional governance framework have been **Baseline Locked**.

**M2 is hereby authorized** as the first implementation milestone of the **Constitutional Implementation Era**.

Its objective is not merely to develop new functionality, but to **implement the constitutional principles** established during the Foundation Era.

### 里程碑啟動

隨著 **Foundation Release（FR1）** 正式完成，《Founding Constitution》、**RC000**、**CGDP**，以及整個憲章治理體系均已完成並 **Baseline Locked**。

**M2 正式啟動。** 它是 **Constitutional Implementation Era** 第一個正式實施里程碑。

M2 的目的，不是單純新增功能，而是將 **Foundation Era** 建立的憲章原則，真正落實到可運作的系統。

---

## 1. Milestone

| Field | Value |
|-------|-------|
| **Identifier** | M2 |
| **Title** | Meeting Resolution Authoring Before Snapshot |
| **Status** | **In Progress** |
| **Authorized** | 2026 |
| **Completion date** | (pending acceptance) |

---

## 2. Objective

**Why does this milestone exist?**

Move **formal resolution authoring** into the **Meeting** layer — the first **complete implementation** of the CDGL separation defined in RC000 and FR1.

**Meeting** becomes the constitutional owner of formal resolutions. **Governance** identifies issues only. **Voting** approves frozen motions. **Execution** follows in RC011+.

---

## 3. Constitutional basis

| Source | Application |
|--------|-------------|
| **RC000 Principle 2** | Formal resolutions belong to Meetings |
| **RC000 Principle 3** | Voting never edits resolution text |
| **RC000 Principle 4** | Snapshot Freeze = legal immutability |
| **RC010 Alignment Decision** | `meeting_agenda_items` canonical; Governance authoring retired |
| **North Star** | Transparent, trustworthy democratic governance |

This milestone **strengthens** the Constitution by making layer boundaries **operational**, not documentary.

---

## 4. CDGL layer

| Layer | M2 impact |
|-------|-----------|
| **Governance** | Matter/discussion only; remove motion authoring |
| **Meeting** | **Primary** — resolution CRUD before freeze |
| **Voting** | Boundary preserved; no text edit |
| **Execution** | Out of scope (RC011) |

Cross-layer: Governance → Meeting bridge simplified (no Matter-title-as-resolution).

---

## 5. Scope

### Included

- RC010 requirement implementation
- `MeetingDetail` resolution authoring UX
- Origin Matter read-only panel
- Governance Schedule Meeting without motion prefill from Matter title
- Snapshot-freeze edit boundary
- Legacy RC009 record compatibility

### Excluded

- Governance 决议 authoring tab
- Resolution version history (RC010-P2)
- Execution / Accountability (RC011 / RC012)
- Schema changes unless proven necessary in implementation plan

### Boundary

First governance-loop **implementation** milestone. Does not expand RC000 text.

---

## 6. Architecture changes

| Area | Decision |
|------|----------|
| **Canonical source** | `meeting_agenda_items` (`requires_vote`, `vote_rule`) |
| **Authoring UI** | `MeetingDetail` only |
| **Governance handoff** | Matter link; no auto motion from Matter title |
| **Legacy** | `community_resolutions` read-only |
| **Freeze boundary** | `owner_vote_meetings.snapshot_frozen_at` |
| **Retired** | Governance draft resolution editor |

**Requirement:** [`RC010-Meeting-Owns-Formal-Resolutions.md`](../rc/RC010-Meeting-Owns-Formal-Resolutions.md)

---

## 7. Artifacts

| Artifact | Path |
|----------|------|
| RC010 | [`docs/rc/RC010-Meeting-Owns-Formal-Resolutions.md`](../rc/RC010-Meeting-Owns-Formal-Resolutions.md) |
| M2 (this) | `docs/milestones/M2-Meeting-Resolution-Authoring.md` |
| FR2 (target) | [`docs/releases/FR2-Governance-Release.md`](../releases/FR2-Governance-Release.md) |
| Era | [`docs/eras/Constitutional-Implementation-Era.md`](../eras/Constitutional-Implementation-Era.md) |
| RC000 alignment | [`docs/rc/RC000-clearstrata-constitution.md`](../rc/RC000-clearstrata-constitution.md#rc010-alignment-decision) |

---

## 8. Implementation scope

| Area | Expected touch |
|------|----------------|
| Frontend | `MeetingDetail`, `GovernanceMatterPages`, `GovernanceMatterDetailTabs`, `governanceMeetingNavigation`, `MeetingEditor` |
| Backend/API | `communityResolutionsApi`, governance matter APIs, meeting agenda APIs |
| Database | Minimal or none (investigation: optional fields only if proven) |
| Documentation | This milestone + RC010 + FR2 |
| Cursor rules | No change unless CCR requires |

**Current phase:** **Implementation authorized** under CGE + MGS gates. Application changes proceed per RC010 and this milestone record.

---

## 9. Success criteria (constitutional)

M2 shall be considered **complete** only when:

- [ ] Meeting exclusively owns Formal Resolution Authoring
- [ ] Governance no longer authors formal resolutions
- [ ] Voting becomes read-only
- [ ] Snapshot Freeze becomes the constitutional boundary
- [ ] RC009 and RC010 responsibilities are fully implemented
- [ ] Constitutional Compliance Review (CCR) passes
- [ ] FR2 Release Gate is satisfied

---

## 10. Acceptance criteria

- [ ] Three distinct motions on one governance meeting (not Matter title)
- [ ] Add / edit / delete / reorder before Snapshot Freeze
- [ ] Locked after Snapshot Freeze
- [ ] One agenda item per motion; OV linkage per RC009
- [ ] Governance has no formal motion authoring UI
- [ ] Origin Matter read-only on Meeting
- [ ] Legacy single-resolution RC009 records work
- [ ] Ordinary meeting + election regression
- [ ] TypeScript + production build pass

---

## 11. Implementation commitment

Every implementation completed during M2 shall remain consistent with:

- Founding Constitution
- Founding Covenant
- North Star
- RC000
- CGDP
- RC010

**The Constitution is no longer being written. It is now being implemented.**

### 實施承諾

M2 的所有工程實施，均應符合：《Founding Constitution》《Founding Covenant》《North Star》**RC000** **CGDP** **RC010**。

憲章，不再只是理念。從今天開始，它正式成為 ClearStrata 的 **工程標準**。

---

## 12. Completion summary

**In Progress** — first implementation milestone of the Constitutional Implementation Era.

When complete, M2 will deliver the **first operational CDGL loop** where Meeting owns formal resolutions — transforming RC010 from constitutional text into working product behavior.

---

## 13. Constitutional compliance (CCR)

- ✓ RC000 Principles 2, 3, 4
- ✓ RC010 Alignment Decision
- ✓ MGS Appendix A (this document)
- ✓ CGDP traceability: RC → Milestone → Implementation

**Overall result:** Compliant (in progress — pending implementation acceptance)

---

## 14. Next milestone

**M3** (TBD) — likely RC011 Execution Center or RC010-P2 resolution version history, per product roadmap after M2 acceptance.

---

## 中文版摘要

**M2** 將正式決議編制責任歸屬於 **Meeting**。Governance 提出議題 · Meeting 形成正式決議 · Voting 完成表決 · Execution 後續由 RC011 負責。這是 **CDGL 第一次真正閉環** 的實踐里程碑。
