# M2-S3 — Engineering Work Breakdown

| Field | Value |
|-------|-------|
| **Document** | M2-S3-Engineering-Work-Breakdown |
| **Title** | M2-S3 CITM Engineering Task Decomposition |
| **Type** | Engineering Execution Plan |
| **Status** | **Approved** |
| **Milestone** | M2 — Slice S3 |
| **Authority** | [`IA-001`](M2-S3-Implementation-Authorization.md) · [`M2-S3-Snapshot-Freeze-Design.md`](M2-S3-Snapshot-Freeze-Design.md) |
| **Approved** | 2026-07-26 |
| **Production effect** | **None** |

**Related:** [`ER-001-M2-S3-Blueprint-Review.md`](ER-001-M2-S3-Blueprint-Review.md) · [`CES-001`](CES-001-Engineering-Standard.md) · [`WORKING-WITH-CURSOR.md`](../WORKING-WITH-CURSOR.md)

> **Document class:** Execution planning artifact only. Does **not** modify governance, Blueprint, ER-001, IA-001, or architecture. Organizes authorized implementation work for Cursor and engineering team.

---

## 1. Purpose

Convert the **15 approved CITM rows** (Blueprint §7) into **executable Engineering Tasks** before coding begins.

| Principle | Application |
|-----------|-------------|
| **Independent where practical** | Tasks have clear boundaries and deliverables |
| **Reviewable** | Each task suitable for PR / engineering review |
| **Verifiable** | Each task has verification and completion criteria |
| **Sequential** | Dependencies explicit; recommended order provided |
| **Cursor-suitable** | Single-objective tasks mappable to Level 3 implementation prompts |

**Not one task per CITM row** — related CITM rows are grouped into coherent implementation units.

---

## 2. CITM → Engineering Task mapping summary

| CITM # | Engineering item | Primary task | Also touched |
|--------|------------------|--------------|--------------|
| 1 | Voter snapshot as sole legal roll | E-01, E-03 | E-02 |
| 2 | Resolution snapshot / frozen instrument | E-01 | E-02, E-03 |
| 3 | Unified eligibility (resolution + election) | E-03 | E-05 |
| 4 | Freeze atomic event | E-02 | — |
| 5 | Snapshot immutability post-freeze | E-01, E-02 | E-06 |
| 6 | Owner Req. SGM 7+freeze+7 lifecycle | E-04 | E-03 |
| 7 | Server-primary automatic freeze Day 7 | E-04 | E-02 |
| 8 | Manual council early freeze | E-04 | E-02 |
| 9 | Resolution vote submit gate | E-03 | E-05 |
| 10 | Election vote submit alignment | E-03 | E-05 |
| 11 | Vote binds to frozen instrument | E-01, E-03 | — |
| 12 | Freeze audit record | E-02 | E-06 |
| 13 | UI eligibility display alignment | E-03, E-04 | — |
| 14 | Legacy meeting compatibility | E-05 | E-03, E-04 |
| 15 | Correction / reissue (partial) | E-06 | — |

**Coverage:** All 15 CITM rows mapped. No orphan rows. No tasks outside IA-001 scope.

---

## 3. Recommended implementation order

```
E-01 Snapshot Foundation
    ↓
E-02 Freeze Engine
    ↓
┌───────────────────┐
│ E-03 Voting       │     E-05 Migration & Compatibility (start after E-01; complete after E-03/E-04)
│     Contract      │              ↑
└─────────┬─────────┘              │
          ↓                          │
      E-04 Meeting Lifecycle ────────┘
          ↓
      E-06 Correction & Operational Guardrails
```

| Order | Task | Rationale |
|-------|------|-----------|
| **1** | **E-01** | Domain foundation — snapshot identity, entities, immutability contracts must exist before freeze or voting |
| **2** | **E-02** | Atomic freeze depends on E-01 snapshot model; produces frozen state voting requires |
| **3** | **E-03** | Voting contract enforcement depends on frozen snapshots from E-02 |
| **4** | **E-04** | Lifecycle windows and triggers orchestrate E-02/E-03; Owner Req. SGM 7+freeze+7 |
| **5** | **E-05** | Legacy coexistence and phased rollout validated after core contract works; may prepare flags early post-E-01 |
| **6** | **E-06** | Guardrails, correction boundaries, operational docs — finalize after behavior is implemented |

**Parallelization note:** E-05 **planning and legacy matrix documentation** (RC010-B) may begin after E-01. E-05 **execution** (compatibility paths, regression) follows E-03 and E-04.

---

## 4. Engineering tasks

---

### Task E-01 — Snapshot Foundation

| Field | Value |
|-------|-------|
| **Task ID** | E-01 |
| **Title** | Snapshot Foundation |

**Purpose:** Establish the snapshot domain — voter snapshot, resolution snapshot, freeze event identity, and immutability contracts — as the persistent foundation for freeze and voting.

**Authorized scope (IA-001):** Snapshot domain; CITM rows 1, 2, 5, 11 (data model / identity aspects).

**Related CITM rows:**

| # | Item |
|---|------|
| 1 | Voter snapshot as sole legal roll |
| 2 | Resolution snapshot / frozen instrument |
| 5 | Snapshot immutability post-freeze |
| 11 | Vote binds to frozen instrument (identity model) |

**Engineering deliverables:**

- Snapshot domain model aligned with Blueprint §9 (entities, relationships, lifecycle)
- Voter snapshot persistence and identity binding (meeting-scoped legal roll)
- Resolution snapshot / frozen instrument persistence (immutable motion set identity)
- Freeze event identity (globally unique per successful freeze — INV-8)
- Immutability enforcement hooks at persistence layer (no silent post-freeze mutation — INV-1)
- CITM status updates for rows 1, 2, 5, 11 (partial)

**Dependencies:** None (first task). M2 Slice 2 resolution authoring must remain functional (regression only).

**Verification criteria:**

- Engineering: Snapshot records cannot be updated after freeze flag set (negative tests)
- Engineering: Voter and resolution snapshots share freeze event correlation
- Regression: Pre-freeze Slice 2 authoring unchanged

**Completion criteria:**

- [ ] Voter snapshot and resolution snapshot models implemented and reviewable
- [ ] Freeze event identity assignable and unique per meeting freeze
- [ ] Immutability rules enforced at foundation layer
- [ ] CITM rows 1, 2, 5, 11 (identity) marked implemented with evidence

**Out of scope:**

- Freeze orchestration logic (E-02)
- Voting submit paths (E-03)
- Scheduler / lifecycle UI (E-04)
- Full correction workflow (E-06)

---

### Task E-02 — Freeze Engine

| Field | Value |
|-------|-------|
| **Task ID** | E-02 |
| **Title** | Freeze Engine |

**Purpose:** Implement the atomic freeze transaction — orchestration, snapshot materialization, timestamp/phase transition, and exactly-one freeze audit — as the constitutional boundary event.

**Authorized scope (IA-001):** Freeze transaction domain; CITM rows 4, 12; immutability at freeze (5); supports 7, 8.

**Related CITM rows:**

| # | Item |
|---|------|
| 4 | Freeze atomic event |
| 5 | Snapshot immutability post-freeze (enforce at freeze commit) |
| 12 | Freeze audit record |
| 1, 2 | Materialization of voter + resolution snapshots |

**Engineering deliverables:**

- Atomic freeze transaction (all-or-nothing — INV-4)
- Voter snapshot built from live membership **at freeze instant only**
- Resolution snapshot built from meeting-owned formal resolutions **at freeze instant**
- Meeting phase transition to frozen / voting-eligible
- `snapshot_frozen_at` (or equivalent) set only on successful commit
- Exactly **one** primary audit record per successful freeze (INV-5)
- Idempotent / conflict handling for concurrent freeze attempts
- Failure rollback — no partial snapshot on abort (Blueprint §10)
- Re-freeze blocked or restricted per immutability policy (INV-8; no silent rebuild)

**Dependencies:** **E-01** (snapshot foundation).

**Verification criteria:**

- Engineering: Forced mid-transaction failure leaves no partial state
- Engineering: Successful freeze produces audit + both snapshots + timestamp atomically
- Engineering: Repeat freeze attempt behavior matches idempotent/conflict design
- Audit: One audit row per successful freeze event

**Completion criteria:**

- [ ] Freeze transaction commits atomically per Blueprint §10 sequence
- [ ] Audit record generated exactly once per successful freeze
- [ ] Re-freeze cannot silently rebuild immutable snapshot
- [ ] CITM rows 4, 12 marked implemented; rows 1, 2, 5 updated with freeze-path evidence

**Out of scope:**

- Day-7 scheduler trigger (E-04)
- Manual council UI trigger wiring (E-04)
- Vote submission (E-03)
- Client-only auto-freeze as primary (must not be primary — E-04)

---

### Task E-03 — Voting Contract

| Field | Value |
|-------|-------|
| **Task ID** | E-03 |
| **Title** | Voting Contract |

**Purpose:** Unify resolution and election voting under one post-freeze eligibility and frozen-instrument contract — closing the production split documented in RC010-C.

**Authorized scope (IA-001):** Voting contract domain; CITM rows 3, 9, 10, 11, 13; enforcement of row 1.

**Related CITM rows:**

| # | Item |
|---|------|
| 1 | Voter snapshot as sole legal roll (enforcement) |
| 3 | Unified eligibility (resolution + election) |
| 9 | Resolution vote submit gate |
| 10 | Election vote submit alignment |
| 11 | Vote binds to frozen instrument |
| 13 | UI eligibility display alignment |

**Engineering deliverables:**

- Unified post-freeze eligibility check (snapshot row required — INV-2)
- Resolution vote path: require freeze complete + snapshot eligibility + formal window
- Election vote path: **same** eligibility semantics as resolution (CDR-001 §10)
- Ballot binding to **frozen instrument identity**, not mutable live resolution row alone
- Reject pre-freeze submits; fail closed on ambiguous eligibility (INV-9)
- UI gates, messaging, and disabled states aligned with server rejection (CES-003)
- Removal of live `property_members`-only resolution submit authority post-freeze

**Dependencies:** **E-01**, **E-02** (frozen snapshots and freeze timestamp must exist).

**Verification criteria:**

- Engineering: Resolution and election reject identical ineligible cases
- Engineering: Post-freeze membership change does not alter ballot eligibility
- Engineering: Direct API call cannot bypass UI gate
- UI: Eligibility display matches server outcome (same reason class)
- Regression: Election path remains functional

**Completion criteria:**

- [ ] `submit_owner_vote` equivalent enforces snapshot eligibility after freeze (CITM 9)
- [ ] Election path aligned to same gate semantics (CITM 10)
- [ ] Ballots reference frozen instrument identity (CITM 11)
- [ ] UI/RPC/database parity demonstrated (CITM 13, INV-9)
- [ ] CITM rows 1, 3, 9, 10, 11, 13 marked implemented

**Out of scope:**

- V3 14-day window replacement (E-04 lifecycle)
- Legacy meeting bypass paths (E-05)
- General UI redesign

---

### Task E-04 — Meeting Lifecycle

| Field | Value |
|-------|-------|
| **Task ID** | E-04 |
| **Title** | Meeting Lifecycle |

**Purpose:** Implement Owner Requisitioned SGM **7 + Freeze + 7** lifecycle, server-primary Day-7 automatic freeze, manual council early freeze, and demote client auto-freeze to fallback only.

**Authorized scope (IA-001):** Owner Requisitioned SGM lifecycle; CITM rows 6, 7, 8; lifecycle aspects of 13.

**Related CITM rows:**

| # | Item |
|---|------|
| 6 | Owner Req. SGM 7+freeze+7 lifecycle |
| 7 | Server-primary automatic freeze Day 7 |
| 8 | Manual council early freeze |
| 13 | UI lifecycle phase display and guards |

**Engineering deliverables:**

- Authoring phase window (up to 7 days from meeting start)
- Formal voting phase window (7 days after freeze)
- Server/database scheduler for Day-7 automatic freeze if not already frozen (INV-10)
- Manual early freeze action for council during authoring
- Client auto-freeze demoted to **fallback/recovery only** (CDR-001 §8)
- Phase state machine: Authoring → Frozen → Formal Voting → Closed (Blueprint §9)
- UI reflects phase, freeze status, and voting window per CES-003

**Dependencies:** **E-02** (freeze engine invocable); **E-03** (voting gates respect windows).

**Verification criteria:**

- Engineering: Day-7 freeze fires **without** client page visit
- Engineering: Manual early freeze succeeds during authoring; blocked after freeze
- Engineering: Formal voting rejected outside 7-day post-freeze window
- Engineering: Client fallback documented and tested as secondary only
- Regression: Non–Owner-Requisitioned paths unchanged until E-05 migration

**Completion criteria:**

- [ ] 7+freeze+7 lifecycle enforced for Owner Requisitioned SGM (CITM 6)
- [ ] Server-primary scheduler operational (CITM 7)
- [ ] Manual early freeze operational (CITM 8)
- [ ] Client trigger is fallback only, not primary
- [ ] CITM rows 6, 7, 8, 13 (lifecycle) marked implemented

**Out of scope:**

- Other meeting types' lifecycle changes (E-05 matrix)
- Meeting creation workflow
- Email notifications

---

### Task E-05 — Migration & Compatibility

| Field | Value |
|-------|-------|
| **Task ID** | E-05 |
| **Title** | Migration & Compatibility |

**Purpose:** Execute phased migration and legacy coexistence per Blueprint §12 and RC010-B meeting-type matrix — without breaking in-flight meetings or historical ballots.

**Authorized scope (IA-001):** Migration strategy; CITM row 14; compatibility for 3, 9, 10 during transition.

**Related CITM rows:**

| # | Item |
|---|------|
| 14 | Legacy meeting compatibility |
| 3, 9, 10 | Unified contract applied per meeting contract version |

**Engineering deliverables:**

- RC010-B meeting-type compatibility matrix documented in implementation notes (ER-001 MF-3)
- Contract version or feature flag: **legacy-contract** vs **CDR-001-contract** meetings
- Phased rollout: Owner Requisitioned SGM first; other types per matrix
- Dual-path coexistence during transition (Blueprint §12)
- Historical ballots preserved — no retroactive rebinding (INV-6)
- Rollback / forward-only recovery plan executable
- Regression suite for legacy OV open/window path and non-V3 meetings

**Dependencies:** **E-01** (foundation for flags); **E-03**, **E-04** (core contract to migrate toward). Execution **after** E-03/E-04 core paths work.

**Verification criteria:**

- Regression: Slice 2 authoring, entry/login/join flows unaffected
- Regression: Legacy meetings behave per documented matrix until migrated
- Engineering: No meeting enforces contradictory eligibility models simultaneously
- Acceptance: Known Constitutional Implementation Gaps closed for in-scope meeting types

**Completion criteria:**

- [ ] Legacy vs CDR-001 contract classification implemented and documented
- [ ] Phased deployment steps executed per Blueprint §12 order
- [ ] Historical ballots queryable unchanged
- [ ] CITM row 14 marked implemented
- [ ] Regression checklist from Blueprint §13 passed

**Out of scope:**

- Migrating all meeting types in single deploy (phased only)
- Data rewrite of historical votes
- M3+ milestones

---

### Task E-06 — Correction & Operational Guardrails

| Field | Value |
|-------|-------|
| **Task ID** | E-06 |
| **Title** | Correction & Operational Guardrails |

**Purpose:** Document and implement **operational guardrails** for correction/reissue boundaries — IA-001 **partial** authorization for CITM 15 only. No new architecture.

**Authorized scope (IA-001):** CITM row 15 **partial** — guards and documentation only; full correction workflow **not** authorized.

**Related CITM rows:**

| # | Item |
|---|------|
| 15 | Correction / reissue process (partial) |
| 5, 12 | Audit and immutability guidance |

**Engineering deliverables:**

- Documentation: correction requires separate authorized CDR — no ad-hoc re-freeze
- Runtime guards: block unauthorized snapshot rebuild / reissue attempts
- Operational runbook: missed freeze, scheduler failure, investigation-gated manual steps
- Audit guidance: correlation ids for support and compliance review
- ER-001 MF-4: Constitutional Compliance evidence table populated for verification phase

**Dependencies:** **E-02**, **E-04** (freeze and scheduler behavior defined). **Last** in sequence.

**Verification criteria:**

- Engineering: Unauthorized re-freeze/rebuild rejected with explicit error
- Documentation: Runbook reviewed by engineering lead
- Compliance: CDR-001 §5 correction path documented as future CDR, not implemented

**Completion criteria:**

- [ ] Guards prevent silent snapshot rebuild (supports INV-8)
- [ ] Operational documentation complete
- [ ] CITM row 15 marked **partial complete** (guards/docs only)
- [ ] No unauthorized correction workflow implemented

**Out of scope:**

- Full correction/reissue workflow (requires new CDR)
- Governance document changes
- Architecture redesign

---

## 5. Verification plan (by task)

| Task | Engineering verification | Regression verification | Acceptance criteria |
|------|-------------------------|-------------------------|---------------------|
| **E-01** | Immutability negative tests; identity uniqueness | Slice 2 authoring works | Snapshot foundation review approved |
| **E-02** | Atomic commit / rollback; audit once | No partial freeze state in DB | Freeze engine integration tests pass |
| **E-03** | Unified reject cases; frozen instrument binding; API bypass attempts fail | Election path works; UI/RPC parity | RC010-C gap closed for in-scope paths |
| **E-04** | Scheduler without client; manual early freeze; window enforcement | Client fallback secondary only | CDR-001 Option A lifecycle demonstrated |
| **E-05** | Contract version flags; matrix documented | Legacy paths per RC010-B; entry/join | Phased rollout complete; INV-6 preserved |
| **E-06** | Rebuild blocked; runbook exists | No regression from guards | CITM 15 partial; compliance table complete |

### End-to-end acceptance (all tasks complete)

| Gate | Source |
|------|--------|
| CDR-001 ten binding points evidenced | Blueprint §13, IA-001 §6 |
| All CITM rows implemented or partial (15) documented | CES-001 |
| INV-1 … INV-10 verified | Blueprint §8 |
| FR2 / M2 milestone acceptance | M2 record |
| Release readiness | IA-001 §6 |

---

## 6. Cursor implementation guidance

When executing tasks in Cursor, use **Level 3 — Implementation** prompts per [`WORKING-WITH-CURSOR.md`](../WORKING-WITH-CURSOR.md):

| Prompt element | Example |
|----------------|---------|
| Task ID | `E-02 Freeze Engine` |
| Authorization | `IA-001 authorized` |
| CITM rows | `4, 12, 5` |
| Dependencies | `E-01 complete` |
| Forbidden | `Out of scope items for this task` |

**One task per implementation session** where practical. Update CITM Implementation Status after each task verification.

---

## 7. Scope confirmation

| Check | Result |
|-------|--------|
| All tasks within IA-001 authorized CITM | **Yes** |
| No governance / Blueprint / ER / IA modification | **Yes** |
| No architecture redesign | **Yes** |
| CITM row 15 partial only in E-06 | **Yes** |
| Tasks map 1:1 to Blueprint domains | **Yes** |

---

## 8. Conclusion

This Engineering Work Breakdown decomposes **15 CITM rows** into **6 Engineering Tasks (E-01 … E-06)** for authorized M2-S3 implementation.

| Statement | Status |
|-----------|--------|
| Execution plan only | **Yes** |
| Implementation authorized by this document | **No** — IA-001 remains authority |
| Production changed | **No** |
| Engineering may proceed task-by-task | **Yes** — under IA-001 |

**Recommended first task:** **E-01 Snapshot Foundation**

---

**Authorization:** [`M2-S3-Implementation-Authorization.md`](M2-S3-Implementation-Authorization.md) · **Blueprint:** [`M2-S3-Snapshot-Freeze-Design.md`](M2-S3-Snapshot-Freeze-Design.md)
