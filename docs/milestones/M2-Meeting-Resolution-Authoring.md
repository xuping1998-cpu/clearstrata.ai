# Milestone M2 — Meeting Resolution Authoring

| Field | Value |
|-------|-------|
| **Milestone** | M2 |
| **Title** | Meeting Resolution Authoring |
| **Official name** | Meeting Resolution Authoring Before Snapshot |
| **Version** | 1.0 |
| **Status** | **In Progress** |
| **Era** | Constitutional Implementation Era |
| **RC** | RC010 · RC010-A · RC010-B · RC010-C · CDR-001 |
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
| **Freeze boundary** | `owner_vote_meetings.snapshot_frozen_at` — see [`RC010-A`](../rc/RC010-A-Snapshot-Constitutional-Boundary.md) |
| **Retired** | Governance draft resolution editor |

**Requirement:** [`RC010-Meeting-Owns-Formal-Resolutions.md`](../rc/RC010-Meeting-Owns-Formal-Resolutions.md)

**Architecture prerequisite (Slice 3):** [`RC010-A-Snapshot-Constitutional-Boundary.md`](../rc/RC010-A-Snapshot-Constitutional-Boundary.md)

**Production contract recovery (Slice 3):** [`RC010-B-Production-Freeze-Contract-Recovery.md`](../rc/RC010-B-Production-Freeze-Contract-Recovery.md)

**Constitutional decision (Slice 3 design):** [`CDR-001-Voting-Eligibility-Decision.md`](../cdr/CDR-001-Voting-Eligibility-Decision.md) — **Approved**

**Investigation:** [`RC010-C-Voting-Eligibility-Contract.md`](../investigations/RC010-C-Voting-Eligibility-Contract.md) — **Completed**

**Document governance:** [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md)

**Meeting workflows:** Freeze behavior is **workflow-specific** — Owner Requisitioned SGM automatic freeze is a known constitutional fact; other meeting types are documented separately in RC010-B.

---

## 6b. M2 Slice 3 — current status (2026-06-24)

| Artifact | Status |
|----------|--------|
| **RC010-A** | **Approved** |
| **RC010-B** | **Completed** — Production Freeze Contract Recovered |
| **RC010-C Investigation** | **Completed** — Production Voting Eligibility Contract Recovered |
| **CDR-001** | **Approved** |
| **M2 Slice 3 Design** | **Authorized** |
| **M2 Slice 3 Implementation** | **Not Authorized** |
| **Production** | **Unchanged** — currently **not fully compliant** with CDR-001 |

Slice 3 design work is filed under [`docs/implementation/`](../implementation/) when recorded. Implementation requires a **separate Implementation Authorization** record.

---

## 6c. Known Constitutional Implementation Gaps

**Label:** Known Constitutional Implementation Gap — **not** described as regression unless historical intent is independently proven.

Production facts (from RC010-B / RC010-C) vs **Approved CDR-001** target:

| Gap | Production today (fact) | Approved constitutional target (CDR-001) |
|-----|-------------------------|------------------------------------------|
| **Resolution vote eligibility** | `submit_owner_vote` uses **live** `property_members` | **`owner_vote_voter_snapshot`** after Freeze |
| **Freeze gate on submit** | Production does **not** require `snapshot_frozen_at` for resolution vote submission | Formal voting after completed Freeze |
| **Owner req. SGM window (V3 submit)** | Production V3 uses **14-day unified** submit window on council `scheduled_at` | **7d authoring → freeze → 7d formal voting** |
| **Resolution instrument** | Votes bind to **mutable** `owner_vote_resolutions` IDs | **Immutable frozen resolution instrument** |
| **Automatic freeze trigger** | Production automatic freeze is **client-triggered** (`MeetingDetail` useEffect) | **Server/database primary**; client fallback only |
| **Re-freeze behavior** | `freeze_owner_vote_snapshot` can **rebuild** existing snapshot | **Immutable at freeze** (idempotent / authorized reissue only) |

**Rule:** Do not describe production as constitutionally compliant. Close gaps only through **authorized implementation** and migration plan (Slice 3 design → Implementation Authorization).

**Clarified by:** CDR-001 · **Implementation gap identified by:** RC010-C

---

## 6a. Implementation slices

| Slice | Focus | Status | Authorization |
|-------|-------|--------|---------------|
| **Slice 1** | Governance authoring retirement · handoff | (planned / partial) | Per RC010 |
| **Slice 2** | Meeting formal resolution authoring (CRUD · order · version · state · audit) | In progress | M2 authorized |
| **Slice 3** | Snapshot Freeze — dual snapshot · immutability · eligibility alignment | **Design authorized** (CDR-001 Approved) | **Implementation not authorized** |

Slice 3 **design** is authorized under Approved **CDR-001**. Slice 3 **implementation** requires a separate **Implementation Authorization** record and approved migration plan. See §6b–6c.

---

## 7. Artifacts

| Artifact | Path |
|----------|------|
| RC010 | [`docs/rc/RC010-Meeting-Owns-Formal-Resolutions.md`](../rc/RC010-Meeting-Owns-Formal-Resolutions.md) |
| **RC010-A** | [`docs/rc/RC010-A-Snapshot-Constitutional-Boundary.md`](../rc/RC010-A-Snapshot-Constitutional-Boundary.md) |
| **RC010-B** | [`docs/rc/RC010-B-Production-Freeze-Contract-Recovery.md`](../rc/RC010-B-Production-Freeze-Contract-Recovery.md) |
| **RC010-C** | [`docs/investigations/RC010-C-Voting-Eligibility-Contract.md`](../investigations/RC010-C-Voting-Eligibility-Contract.md) |
| **CDR-001** | [`docs/cdr/CDR-001-Voting-Eligibility-Decision.md`](../cdr/CDR-001-Voting-Eligibility-Decision.md) |
| **Document governance** | [`docs/DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md) |
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
