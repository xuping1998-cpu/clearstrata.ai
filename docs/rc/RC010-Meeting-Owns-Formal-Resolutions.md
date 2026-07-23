# RC010 — Meeting Owns Formal Resolutions

| Field | Value |
|-------|-------|
| **Requirement** | RC010 |
| **Title** | Meeting Owns Formal Resolutions |
| **Official name** | RC010 — Meeting Resolution Authoring Before Snapshot |
| **Version** | 1.0 |
| **Status** | **In Progress** |
| **CGDP layer** | LEVEL 4 — Requirement Change (RC) |
| **CDGL layer** | **Meeting** (primary) · Governance · Voting (boundary only) |
| **Authority** | RC000 · RC010 Alignment Decision |

> **Constitutional alignment:** This RC **implements** RC000 and the RC010 Alignment Decision. It **does not redefine** RC000 or ADR.

**RC000 reference:** [`RC000-clearstrata-constitution.md`](RC000-clearstrata-constitution.md#rc010-alignment-decision)

---

## 1. Objective

Implement the constitutional separation between **Governance**, **Meeting**, **Voting**, and **Execution** by moving **formal resolution authoring** exclusively into the **Meeting** layer.

Resolve the product defect where **Matter title/discussion** is copied or presented as the formal **Meeting Resolution**.

---

## 2. Constitutional basis

| RC000 principle | RC010 response |
|-----------------|----------------|
| **Principle 2** — Formal Resolutions belong to Meetings | MeetingDetail / agenda = sole authoring surface |
| **Principle 3** — Voting never edits Resolutions | No voting UI text mutation |
| **Principle 4** — Snapshot Freeze = legal immutability | Edit lock at `snapshot_frozen_at`, not Matter copy |
| **Governance NEVER creates formal resolutions** | Retire Governance 决议 authoring; Matter = read-only origin |

---

## 3. Problem statement

**Current behavior (pre-RC010):**

- `createCommunityResolutionFromMatter()` copies `matter.title` → resolution title
- Schedule Meeting prefill copies one resolution title → one agenda item
- Governance 决议 tab presents a single auto-generated motion

**Required behavior (RC010):**

- Governance: Matter, discussion, evidence, CDA — **no formal motion authoring**
- Meeting: add / edit / delete / reorder resolution agenda items **before Snapshot Freeze**
- Voting: frozen motions only
- Origin Matter on Meeting: **read-only** reference

---

## 4. Scope

### Included

- Meeting-centric resolution authoring UX (`MeetingDetail`)
- Multiple formal resolutions per governance meeting (agenda rows)
- Vote rule / threshold on agenda items before freeze
- Governance → Meeting bridge **without** Matter-title-as-resolution prefill
- Read-only Origin Matter panel on governance-linked meetings
- Legacy `community_resolutions` read-only compatibility
- RC009 bridge preservation (Governance→Meeting, Meeting→Owner Voting)

### Excluded

- Governance 决议 / Resolution **authoring tab** (retired)
- Full resolution **version history** (RC010-P2)
- Execution / Accountability centers (RC011+)
- Automatic bulk migration of historical records

---

## 5. Architecture (implements ADR — does not redefine)

| Decision | Choice |
|----------|--------|
| **Canonical motion (new flows)** | `meeting_agenda_items` where `requires_vote = true` |
| **Authoring location** | `MeetingDetail` only |
| **Immutability boundary** | `owner_vote_meetings.snapshot_frozen_at` |
| **Legacy** | `community_resolutions` — historical read-only; not authoring source |
| **Owner vote linkage** | Existing RC009: agenda → `owner_vote_resolutions` via `ensureOwnerVoteResolutionForMeeting` + P1-002 sync |

**Investigation reference:** RC010-P1 investigation (Meeting-centric model adopted over Governance draft CR model)

---

## 6. Functional requirements

### FR-010-01 — Governance must not author formal resolutions

- Remove or disable Matter-title clone into `community_resolutions` for new flows
- Governance 决议 tab: status + link to Meeting only (no motion editor)

### FR-010-02 — Meeting owns resolution CRUD before freeze

Council on `MeetingDetail` may:

- Add resolution (agenda item, `requires_vote`)
- Edit title, description, vote rule
- Delete resolution (guards: no ballots / post-freeze)
- Reorder (`sort_order`)

Blocked after Snapshot Freeze.

### FR-010-03 — Multiple resolutions per governance matter meeting

- One agenda row per formal motion
- No default single agenda from Matter title on Schedule Meeting

### FR-010-04 — Origin Matter (read-only)

- Meeting displays linked Governance Matter: title, description, CDA summary, discussion context
- Meeting does **not** edit Matter

### FR-010-05 — Schedule Meeting handoff

- Governance → MeetingEditor: meeting metadata + `governance_matter_id` link
- **No** auto agenda from Matter title when authoring policy applies
- Optional: empty agenda; Council authors on MeetingDetail

### FR-010-06 — Snapshot freeze lock

- Resolution content editable until `snapshot_frozen_at`
- Align V3 remote-written agenda lock with governance resolution policy (investigation noted `scheduled_at` conflict — resolve in implementation)

### FR-010-07 — Legacy compatibility

- Existing Matter + one CR + one agenda + one OV record: unchanged behavior
- `community_resolutions` display only for historical rows

---

## 7. RC009 protection boundary

**Do not change** unless proven necessary:

| Component | Rule |
|-----------|------|
| `governanceMeetingNavigation` canonicalization | Preserve |
| P1-001 Governance → Meeting bridge | Extend for matter-only handoff |
| P1-002 `syncGovernanceOwnerVoteLinksFromMeetingState` | Preserve for legacy CR-linked agendas |
| `MeetingResolutionVotePanel` | **Untouched** — governance-agnostic |
| Manual freeze / open OV workflow | Preserve |
| Election / procurement / non-governance meetings | Regression-safe |

---

## 8. Acceptance criteria (objective)

- [ ] Council creates **3 distinct motions** on one governance meeting without Matter title copy
- [ ] Edit / delete / reorder works **before** Snapshot Freeze
- [ ] Blocked **after** Snapshot Freeze
- [ ] One `owner_vote_resolution` per resolution agenda (RC009 linkage)
- [ ] Governance Matter detail has **no** formal motion authoring
- [ ] Legacy RC009 single-resolution record still works
- [ ] Ordinary meeting + election regression pass
- [ ] `tsc` + production build pass

---

## 9. Traceability

| CGDP layer | Artifact |
|------------|----------|
| RC000 | Alignment Decision |
| Milestone | [`M2-Meeting-Resolution-Authoring.md`](../milestones/M2-Meeting-Resolution-Authoring.md) |
| Release | [`FR2-Governance-Release.md`](../releases/FR2-Governance-Release.md) |

---

## 10. Status

**Planning** — requirement specification complete; implementation not started in this document.

**Milestone gate:** Implementation requires M2 document per MGS before code (RC000 Appendix A).

---

## 11. Constitutional compliance (CCR)

- ✓ RC000 Principle 2, 3, 4
- ✓ RC010 Alignment Decision
- ✓ CGDP Rule 3 — traceable to RC000
- ✓ Does not redefine ADR or RC000

**Overall result:** Compliant (planning)
