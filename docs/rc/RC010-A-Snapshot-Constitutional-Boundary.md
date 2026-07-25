# RC010-A — Snapshot Constitutional Boundary

| Field | Value |
|-------|-------|
| **Title** | RC010-A — Snapshot Constitutional Boundary |
| **Type** | Architecture Clarification / Constitutional Boundary Record |
| **Parent** | RC010 — Meeting Owns Formal Resolutions |
| **Milestone** | M2 — Meeting Resolution Authoring |
| **Release** | FR2 — Governance Release |
| **Status** | **Approved** |
| **CGDP layer** | LEVEL 4 — RC clarification |
| **Implementation** | **Not authorized by this document alone** |

**Parent requirement:** [`RC010-Meeting-Owns-Formal-Resolutions.md`](RC010-Meeting-Owns-Formal-Resolutions.md)

**RC000 reference:** [`RC000-clearstrata-constitution.md`](RC000-clearstrata-constitution.md#rc010-alignment-decision)

**Traceability:** M2 Slice 3 investigation (2026) · FR2 · Constitutional Implementation Era

> **Scope lock:** This document records constitutional and architectural boundaries only. It does **not** authorize application code changes, database schema changes, migrations, or production behavior changes.

---

## 1. Record metadata

| Field | Value |
|-------|-------|
| **Title** | RC010-A — Snapshot Constitutional Boundary |
| **Type** | Architecture Clarification / Constitutional Boundary Record |
| **Parent** | RC010 — Meeting Owns Formal Resolutions |
| **Milestone** | M2 — Meeting Resolution Authoring |
| **Release** | FR2 — Governance Release |
| **Status** | **Approved** |
| **CGDP layer** | LEVEL 4 — RC clarification |
| **Implementation** | Not authorized by this document alone |

---

## 2. Executive decision

**Snapshot Freeze is the constitutional handoff point between Meeting and Voting.**

| Phase | Constitutional authority | Meaning |
|-------|-------------------------|---------|
| **Before Freeze** | **Meeting** | Meeting owns the formal resolution — text, order, voting method, and approval threshold may be authored and finalized under Meeting authority. |
| **After Freeze** | **Voting** | Voting receives an **immutable voting instrument**. Voting may submit ballots and count results; it must not edit Meeting-owned formal resolution content. |

The existing **voter-roll freeze** and the required **resolution-content freeze** are **related but distinct** constitutional functions:

| Question | Constitutional record | Implementation anchor (observed) |
|----------|----------------------|--------------------------------|
| **Who may vote?** | **Voter Snapshot** | `owner_vote_voter_snapshot` |
| **What is being voted on?** | **Resolution Snapshot** | Not yet confirmed as immutable in repo model |

**Both must be bound to the same constitutional freeze event**, unless a meeting workflow explicitly defines otherwise in an approved constitutional record.

**Observed current behavior (investigation):** Production freeze today primarily establishes voter eligibility via `owner_vote_voter_snapshot` and sets `owner_vote_meetings.snapshot_frozen_at`. Resolution content is **not** confirmed as immutably snapshotted in the current repository model. Voting currently reads **live** `owner_vote_resolutions` for title, threshold, and display order.

**Constitutional decision:** RC010-A closes this gap as a **design requirement** for M2 Slice 3 and beyond. It does not claim the gap is already satisfied.

---

## 3. Constitutional responsibility model

### Governance owns

- Issues
- Evidence
- Discussion
- Recommendations

Governance **must not** author formal resolutions for new flows (RC010 parent requirement).

### Meeting owns

- Agenda
- Formal Resolution Authoring
- Resolution text
- Resolution order
- Voting method (as configured on the formal motion)
- Approval threshold (as configured on the formal motion)
- Finalization **before Freeze**

### Voting owns

- Immutable voting instrument (post-Freeze)
- Ballot
- Vote submission
- Vote counting
- Result

### Execution owns

- Implementation of approved resolutions
- Progress
- Accountability
- Review

**Non-negotiable boundary:** Voting must **never** edit Meeting-owned formal resolutions.

---

## 4. Snapshot Freeze definition

**Snapshot Freeze** is a **constitutional event**, not merely a timestamp, UI label, or optional staff action.

It represents the formal transfer from:

**Meeting Authoring Authority** → **Voting Read-Only Authority**

At Freeze, the system **must** establish:

| Element | Requirement |
|---------|-------------|
| **A** | Who is eligible to vote |
| **B** | What exact resolution content is being voted on |
| **C** | The order in which resolutions appear |
| **D** | The voting method |
| **E** | The approval threshold |
| **F** | The source Meeting Resolution and version |
| **G** | The freeze time and authorized actor or automatic rule |
| **H** | An auditable, immutable record of the handoff |

**Observed current behavior:** Elements **A** and **G** (partial) are addressed by the existing voter-roll freeze path. Elements **B–F** and **H** for resolution content are **not** confirmed as satisfied in the current repository model.

---

## 5. Dual snapshot model

Snapshot Freeze comprises **two separate but related snapshot concepts**, serving one constitutional handoff.

### A. Voter Snapshot

| Field | Value |
|-------|-------|
| **Purpose** | Freeze **who may vote** |
| **Constitutional question** | Who may vote? |
| **Current implementation anchor (observed)** | `owner_vote_voter_snapshot` |
| **Lifecycle anchor (observed)** | `owner_vote_meetings.snapshot_frozen_at` |

**Required semantics:**

- eligible user
- unit
- property
- meeting (owner vote meeting context)
- eligibility at freeze
- immutable historical record

**Observed current behavior:** The application invokes RPC `freeze_owner_vote_snapshot`. The RPC `CREATE FUNCTION` definition is **not present in repository migrations**; production behavior must be treated as an existing live contract until recovered.

### B. Resolution Snapshot

| Field | Value |
|-------|-------|
| **Purpose** | Freeze **what is being voted on** |
| **Constitutional question** | What is being voted on? |
| **Current implementation anchor (observed)** | **None confirmed as immutable** in repo model |

**Required semantics:**

- formal resolution text
- title
- order
- voting method
- threshold
- source Meeting agenda item
- source version
- freeze time
- meeting relationship
- immutable historical record

**Deferred implementation choice:** RC010-A **does not** prescribe the final database table or column design. Storage design must be decided in the **implementation design** after:

1. Recovering the live `freeze_owner_vote_snapshot` contract
2. Verifying current production schema
3. Classifying `owner_vote_resolutions` constitutionally
4. Completing RC009 compatibility review

---

## 6. Authoritative source model

This section distinguishes **constitutional role** (decided here) from **observed current behavior** (investigation).

### `meeting_agenda_items`

| Classification | Value |
|----------------|-------|
| **Constitutional role** | **Canonical Meeting-owned source for formal resolutions before Freeze** |
| **Nature** | Authoring record |

Formal resolutions for new flows are represented by agenda rows where `requires_vote = true` (excluding election and removal-resolution special cases per RC010).

M2 Slice 2 adds authoring metadata (`formal_resolution_version`, `formal_resolution_state`, authoring audit) on this table when migrated — that metadata supports **pre-freeze authoring**, not post-freeze immutability by itself.

### `owner_vote_resolutions`

| Classification | **Deferred — must be chosen in implementation design** |

**Observed current reality:**

- Used by Voting as a **live resolution projection** and **ballot reference** (`owner_vote_ballots.resolution_id`)
- Populated and updated from Meeting agenda operations (title, threshold, `display_order`) without confirmed immutability after freeze
- Linked heuristically to agenda items (sort order / title match); stable `agenda_item_id` FK not confirmed in repo model

**Final constitutional classification must be exactly one of:**

1. **Voting projection** — live mirror of Meeting state until Freeze; superseded by frozen instrument at Freeze
2. **Frozen voting instrument** — becomes immutable resolution record at Freeze
3. **Hybrid legacy compatibility record** — transitional role for pre-RC010 records only

RC010-A **does not** select among these options. Implementation design must choose one classification and **eliminate ambiguity**.

### `owner_vote_voter_snapshot`

| Classification | Value |
|----------------|-------|
| **Constitutional role** | **Frozen voter eligibility snapshot** |
| **Observed behavior** | Populated at freeze (via live RPC); used for voting-notice recipient validation and UI eligibility display |

### `owner_vote_meetings`

| Classification | Value |
|----------------|-------|
| **Constitutional role** | **Voting-session lifecycle record and bridge between Meeting and Owner Voting** |

**Observed fields (in repo usage):** `snapshot_freeze_at` (planned freeze time), `snapshot_frozen_at` (completed handoff timestamp), `status`, voting window fields, council binding marker in `description`.

### `owner_vote_ballots`

| Classification | Value |
|----------------|-------|
| **Constitutional role** | **Vote records bound to the voting instrument** |

**Constitutional requirement:** Ballots must ultimately be **traceable to the immutable resolution content presented at Freeze**.

**Observed current behavior:** Ballots reference `owner_vote_resolutions.id`. Traceability to frozen resolution **content and version** is not confirmed when live resolution rows remain mutable after freeze.

---

## 7. Constitutional freeze timing

Freeze timing is **workflow-specific**. RC010-A does **not** impose one universal timing rule across all meeting types.

### A. Owner Requisitioned SGM

**Canonical intended sequence (constitutional — preserve unless explicitly changed by approved RC):**

```
Meeting starts
        ↓
7-day discussion / resolution authoring period
        ↓
Automatic Snapshot Freeze
        ↓
7-day formal voting period
        ↓
Voting closes
```

**Constitutional decision:** The automatic freeze must **preserve the existing RC009 workflow** unless a later approved RC changes it. RC010-A does **not** redesign this timing.

**Observed implementation notes (not redesign orders):**

- Remote-written V3 meetings use automatic freeze triggers tied to `snapshot_freeze_at` with fallback to `meetings.scheduled_at` in application code
- V3 participation window may use council `scheduled_at` .. +14 days for ballot submission (RC009 behavior)
- These observed rules must be mapped explicitly in the implementation timing matrix; they must not be silently conflated

### B. Other remote written meetings

Timing must be derived from the **applicable meeting-format state model** and **existing RC009 rules**.

Document in implementation design; do not impose a single global rule here.

### C. Legacy / manual workflows

Manual freeze may remain available where the applicable workflow permits it.

**Observed behavior:** Staff manual freeze via `OwnerVotingInlineControlBar` / `MeetingDetail.handleFreezeOwnerVoteSnapshot` on non-V3 lifecycle paths.

### D. Automatic freeze

Automatic freeze is a **valid constitutional authorization mechanism** when all of the following hold:

- the rule is defined in the meeting workflow
- the trigger time is **deterministic**
- the freeze is **auditable**
- the event is **idempotent**
- failure does **not** leave a partial handoff (constitutional target; verify against recovered RPC)

---

## 8. `scheduled_at` vs `snapshot_frozen_at`

RC010-A addresses observed ambiguity directly.

### Observed current behavior

| Signal | Observed use |
|--------|--------------|
| `meetings.scheduled_at` | Some V3 agenda editing locks when `now >= scheduled_at` (application guard) |
| `owner_vote_meetings.snapshot_freeze_at` | Planned voter-roll freeze time |
| `owner_vote_meetings.snapshot_frozen_at` | Completed freeze timestamp; gates staff “open voting” in application logic |

These are **not automatically the same concept**.

### Constitutional definitions

| Field | Constitutional meaning |
|-------|---------------------|
| **`scheduled_at`** | May define the **start of a meeting phase** (e.g., discussion / notice period) |
| **`snapshot_frozen_at`** | Defines **completion of the constitutional handoff** from Meeting authoring authority to Voting read-only authority |

### Owner Requisitioned SGM

- `scheduled_at` begins the **7-day discussion / authoring period**
- **Automatic Snapshot Freeze** occurs **seven days later** (not necessarily at `scheduled_at` itself)
- Therefore: **formal resolution immutability must not be assumed to begin at `scheduled_at` for this workflow**

Any existing UI lock at `scheduled_at` must be treated as a **separate workflow rule** and reviewed during implementation. RC010-A does **not** order code changes.

---

## 9. Immutability principle

After the **constitutional freeze**, the frozen voting instrument must **not** permit:

- text edits
- title edits
- order changes
- threshold changes
- voting method changes
- deletion
- replacement
- silent rebinding to another source version

**Observed current behavior:** Post-freeze mutation of Meeting agenda and live `owner_vote_resolutions` is **not** consistently blocked by `snapshot_frozen_at` in application code. This is a **known gap** relative to this principle.

If correction is required **after Freeze**, it must follow a **separately authorized** amendment, cancellation, adjournment, or reissue process.

Such a process is **outside RC010-A and M2** unless separately approved.

---

## 10. Atomicity and idempotency

The constitutional freeze event **must** be designed so that:

- voter snapshot and resolution snapshot are **internally consistent**
- repeated automatic calls do **not** create duplicate snapshots
- **partial completion is not accepted**
- failures are **auditable**
- retry is **safe**
- the Meeting-to-Voting handoff has **one authoritative completion state** (`snapshot_frozen_at`)

**Deferred implementation choice:** SQL transaction design, RPC structure, and rollback behavior are **not** specified in RC010-A. They depend on recovered `freeze_owner_vote_snapshot` semantics.

---

## 11. Live contract recovery requirement

**Mandatory implementation prerequisite:**

The production definition of:

```
freeze_owner_vote_snapshot
```

must be **recovered, reviewed, and committed to version control** before M2 Slice 3 implementation is **finalized**.

### Reason

| Fact | Implication |
|------|-------------|
| Application invokes the RPC | Contract is production-critical |
| `CREATE FUNCTION` not in repo migrations | Authoritative semantics unknown from repository alone |
| Until recovered | Transaction semantics, idempotency, eligibility rules, failure behavior **not fully verified** |

Until recovered, the RPC must be treated as an **existing production contract**, not as undocumented behavior that may be replaced without compatibility review.

---

## 12. RC009 compatibility boundaries

RC010-A **explicitly preserves** the following. Slice 3 implementation must **extend** freeze semantics without redesigning these contracts.

| Boundary | Preserve |
|----------|----------|
| Governance → Meeting bridge | P1-001 handoff and linking |
| Governance → Owner Voting synchronization | P1-002 `syncGovernanceOwnerVoteLinksFromMeetingState` |
| Council ↔ OV binding | `<!--clearstrata-council-meeting-binding-->` marker |
| MeetingDetail orchestration | Enable · freeze · open · close · results refresh |
| Automatic voter snapshot freeze | V3 auto-freeze effect; Owner Requisitioned SGM timing intent |
| Manual freeze | Where applicable workflow permits |
| Owner Requisitioned SGM timing | 7-day authoring → auto freeze → 7-day voting (canonical intent) |
| Remote written participation windows | RC009 V3 14-day window behavior |
| Ballot submission contract | `submit_owner_vote` RPC semantics |
| Election voting behavior | Election agendas and ballots unchanged by RC010-A |
| V3 compatibility behavior | V3 bypass of legacy OV open/freeze gates where RC009 defines |

RC010-A **must not** authorize a full Owner Voting redesign.

---

## 13. Architectural decisions

| ID | Decision |
|----|----------|
| **A** | Meeting owns the **authoritative pre-freeze** formal resolution. |
| **B** | Voting must **ultimately consume immutable resolution content** (constitutional target; not claimed as fully implemented today). |
| **C** | **Voter Snapshot** and **Resolution Snapshot** are distinct records serving **one constitutional handoff**. |
| **D** | **Automatic freeze** is constitutionally valid and **required** for workflows such as Owner Requisitioned SGM. |
| **E** | **Freeze timing is meeting-workflow-specific.** |
| **F** | **`snapshot_frozen_at` represents completion of the handoff.** |
| **G** | **`scheduled_at` does not universally represent resolution immutability.** |
| **H** | Final storage design for Resolution Snapshot is **deferred** until: live RPC recovery · schema verification · compatibility review · implementation design. |

---

## 14. Open implementation questions

RC010-A **preserves** these questions for evidence-based resolution in implementation design. **Do not answer here without evidence.**

1. Is `owner_vote_resolutions` best classified as a live projection or the frozen voting instrument?
2. Should immutable resolution content remain in `owner_vote_resolutions` after Freeze?
3. Is a separate resolution snapshot table required?
4. How are source agenda item IDs and source versions stored?
5. Should voter and resolution snapshots be created in one RPC transaction?
6. How should legacy voting records without source agenda IDs remain supported?
7. Which mutation paths require database-level protection?
8. How should automatic freeze failure be surfaced and retried?
9. Does `submit_owner_vote` need to validate frozen voter eligibility rather than live `property_members` membership?
10. Which meeting formats use automatic versus manual freeze?

---

## 15. Implementation gate

**RC010-A does not authorize code changes.**

M2 **Implementation Slice 3** may move from **investigation** to **design** only after:

- [ ] RC010-A is approved
- [ ] `freeze_owner_vote_snapshot` is recovered into version control
- [ ] Current production schema is verified
- [ ] `owner_vote_resolutions` is constitutionally classified (Decision H)
- [ ] The automatic timing matrix is documented per workflow
- [ ] The minimum safe migration plan is approved

M2 Slice 3 **implementation** (code, schema, migrations) remains **not authorized** until a subsequent implementation authorization record explicitly gates it.

---

## 16. Constitutional compliance checklist

- [ ] Meeting remains the sole formal resolution authoring layer
- [ ] Voting remains read-only
- [ ] Voter eligibility is frozen
- [ ] Resolution content is frozen
- [ ] Owner Requisitioned SGM automatic timing is preserved
- [ ] `scheduled_at` and `snapshot_frozen_at` are not incorrectly conflated
- [ ] RC009 bridges remain intact
- [ ] Frozen ballots remain traceable to immutable resolution content
- [ ] Live RPC contract is recovered before implementation
- [ ] No implementation is authorized solely by this architecture record

**Overall result:** Planning — compliant as architecture clarification; **not** compliant as completed M2 acceptance until checklist items are satisfied by implementation.

---

## 17. Traceability

| CGDP layer | Artifact |
|------------|----------|
| RC000 | Principle 4 — Snapshot Freeze |
| RC010 | Meeting Owns Formal Resolutions |
| **RC010-A** | Snapshot Constitutional Boundary (this document) |
| **RC010-B** | Production freeze contract recovery — **Completed** |
| **RC010-C** | Production eligibility investigation — **Completed** |
| **CDR-001** | Voting eligibility decision — **Approved** (**Clarifies** eligibility semantics beyond this boundary record) |
| Milestone | [`M2-Meeting-Resolution-Authoring.md`](../milestones/M2-Meeting-Resolution-Authoring.md) |
| Release | [`FR2-Governance-Release.md`](../releases/FR2-Governance-Release.md) |
| Era | [`Constitutional-Implementation-Era.md`](../eras/Constitutional-Implementation-Era.md) |

**Related investigation:** M2 Slice 3 read-only investigation (Snapshot Freeze architecture review, 2026).

**Clarified by:** [`CDR-001`](../cdr/CDR-001-Voting-Eligibility-Decision.md) — voting eligibility and Owner Requisitioned SGM timing (Approved 2026-06-24). This record's dual-snapshot boundary remains valid; CDR-001 sets the binding target contract for Slice 3 design.

---

## 18. Status

| Field | Value |
|-------|-------|
| **RC010-A status** | **Approved** |
| **Implementation authorized** | **No** (by this document alone) |
| **M2 Slice 3 Design** | **Authorized** (via Approved **CDR-001**) |
| **M2 Slice 3 Implementation** | **Not authorized** |

---

## 中文版摘要

**RC010-A** 正式定義 **Snapshot Freeze** 為 Meeting 與 Voting 之間的憲章交接點。凍結包含兩個相關但不同的功能：**Voter Snapshot（誰可以投票）** 與 **Resolution Snapshot（投票內容是什麼）**。現有系統已具備選民名冊凍結基礎；正式決議內容的不可變快照尚未在 repo 模型中確認。本文件不授權任何實作，Slice 3 須待 RPC 合約回收與分類決策後方可進入設計。
