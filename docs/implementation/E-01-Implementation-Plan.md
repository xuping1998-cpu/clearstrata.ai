# E-01 — Snapshot Foundation Implementation Plan

| Field | Value |
|-------|-------|
| **Identifier** | E-01 |
| **Title** | Snapshot Foundation — Implementation Plan |
| **Type** | Engineering Implementation Plan |
| **Status** | **Approved** |
| **Task** | E-01 Snapshot Foundation |
| **Authority** | [`IA-001`](M2-S3-Implementation-Authorization.md) |
| **Blueprint** | [`M2-S3-Snapshot-Freeze-Design.md`](M2-S3-Snapshot-Freeze-Design.md) §9 |
| **Work Breakdown** | [`M2-S3-Engineering-Work-Breakdown.md`](M2-S3-Engineering-Work-Breakdown.md) — Task E-01 |
| **Investigation** | E-01 Read-only Investigation (2026-07-26) |
| **Plan revision** | **v1.0** |
| **Production effect** | **None** from this document — production changes only when phased implementation is deployed and verified |

> **Document class:** Engineering execution order only. Does **not** redesign architecture, modify governance, modify the Blueprint, ER-001, IA-001, or the Work Breakdown, or contain implementation code.

---

## Authoritative Source

| Field | Value |
|-------|-------|
| **Implementation Plan** | [`E-01-Implementation-Plan.md`](E-01-Implementation-Plan.md) |
| **Revision** | **v1.0** |
| **Verified** | **YES** |

---

## 1. Scope

E-01 establishes the **persistent snapshot domain foundation** required by Blueprint §9 and IA-001 Task E-01:

| CITM row | E-01 aspect (identity / data model only) |
|----------|---------------------------------------------|
| **1** | Voter snapshot as sole legal roll — persistence and meeting-scoped identity binding |
| **2** | Resolution snapshot / frozen instrument — persistence and immutable motion-set identity |
| **5** | Snapshot immutability post-freeze — enforcement hooks at persistence layer (INV-1) |
| **11** | Vote binds to frozen instrument — **identity model** (FK/column design; submit enforcement is E-03) |

**In scope:** Domain entities, persistence schema, freeze-event correlation, immutability hooks, typed read layer, verification evidence for CITM rows 1, 2, 5, 11 (partial).

**Not in scope:** See [§8 Out of Scope](#8-out-of-scope).

---

## 2. Current State

Implementation-relevant facts from the E-01 read-only investigation:

| Area | Current state |
|------|---------------|
| **Voter snapshot** | Production table `owner_vote_voter_snapshot` exists; materialized by `freeze_owner_vote_snapshot` (production RPC, not in repo migrations). Rows are **delete-and-reinsert** on re-freeze. |
| **Handoff marker** | `owner_vote_meetings.snapshot_frozen_at` marks voter-roll freeze completion; `snapshot_freeze_at` holds planned freeze time only. |
| **Resolution instrument** | Live mutable `owner_vote_resolutions`; ballots bind to live `resolution_id`. No resolution snapshot table. |
| **Freeze event** | No freeze-event entity; no globally unique per-freeze identity (INV-8). |
| **Eligibility split** | Election submit uses snapshot; resolution submit uses live `property_members` (latest repo migration). Not E-01 scope to fix. |
| **Domain layer** | No snapshot repository, service, or dedicated types — ad hoc Supabase calls in `api.ts`, `MeetingDetail.tsx`, Edge `send-meeting-invite`. |
| **Immutability** | No DB-level block on snapshot UPDATE/DELETE or post-freeze resolution mutation. |
| **Audit** | Production `owner_vote_audit_logs` (`snapshot_frozen`) on freeze; not in repo. Separate from M2 authoring audit (`meeting_formal_resolution_audit`). |
| **Authoring input** | M2 Slice 2 formal resolution authoring on `meeting_agenda_items` + sync to `owner_vote_resolutions` remains the pre-freeze source of truth. |

**Preservation rule for E-01:** Existing freeze RPC, voting submit paths, UI gates, and Slice 2 authoring **must remain functional** until each phase is verified. New foundation objects are **additive** until E-02 wires materialization.

---

## 3. Phase Breakdown

### Phase 1 — Snapshot Domain Foundation

**Purpose:** Persist Blueprint §9 snapshot domain primitives for the **voter roll** and align production objects under schema-as-code, without changing freeze orchestration or voting behavior.

#### Deliverables

- Repo migrations (schema-as-code) for `owner_vote_voter_snapshot` aligned with production column contract (RC010-B §7.7).
- Repo alignment for production-adjacent objects required by the voter snapshot (documented in migration comments; no behavior change to existing RPC callers).
- Persistence-layer **immutability hooks** for voter snapshot rows linked to a committed freeze event (INV-1 foundation): constraints, RLS, or triggers that block UPDATE/DELETE on immutable rows.
- Legacy coexistence rule documented in migration comments: rows **without** freeze-event linkage remain governed by current production behavior until E-02/E-05.
- Domain entity documentation in implementation notes (meeting ↔ voter snapshot ↔ voter entries relationship per Blueprint §9).

#### Dependencies

- None (first engineering phase).
- Input: RC010-B production column metadata; Blueprint §9 entities and relationships.

#### Verification

| Class | Check |
|-------|-------|
| Engineering | Migrations apply cleanly on empty and existing dev/staging databases. |
| Engineering | Immutability hook rejects UPDATE/DELETE on test rows flagged as frozen/immutable. |
| Engineering | Rows without freeze-event linkage still allow current production-equivalent operations (no regression on legacy path). |
| Regression | `freeze_owner_vote_snapshot` (production or dev equivalent) still succeeds; `snapshot_frozen_at` still set. |
| Regression | Slice 2 formal resolution authoring (create/edit/finalize on agenda) unchanged. |

#### Completion criteria

- [ ] Voter snapshot table contract is in repo migrations and matches production metadata.
- [ ] Immutability hooks exist at persistence layer for event-linked voter snapshot rows.
- [ ] No change to voting submit eligibility or freeze RPC orchestration.
- [ ] Phase verification evidence recorded (CES-008).

---

### Phase 2 — Freeze Event Identity

**Purpose:** Introduce the **Freeze Event** entity (Blueprint §9) with globally unique identity per successful freeze (INV-8), as the correlation anchor for dual snapshots.

#### Deliverables

- Freeze Event persistence (entity representing immutable marker that authoring ended and voting instrument is fixed).
- Foreign-key or equivalent correlation from voter snapshot entries → freeze event.
- Meeting-scoped uniqueness policy for active/successful freeze event (one primary event per meeting freeze boundary — per Blueprint §9 relationships).
- Correlation field design on `owner_vote_meetings` or freeze event table for audit linkage (E-02 will write audit; E-01 provides join target only).
- Reissue/correction identity boundary documented: new freeze event = new identity; no silent rebuild of immutable event-linked rows (INV-8; full correction workflow remains E-06).

#### Dependencies

- **Phase 1** complete (voter snapshot persistence and immutability hook pattern exists).

#### Verification

| Class | Check |
|-------|-------|
| Engineering | Freeze event id is UUID (or equivalent) and assignable before E-02 orchestration. |
| Engineering | Voter snapshot rows can reference exactly one freeze event id. |
| Engineering | Uniqueness constraint prevents duplicate primary freeze events for the same meeting boundary (per design). |
| Engineering | Attempt to assign a second primary event without authorized reissue path fails at persistence layer. |
| Regression | Existing meetings without freeze events continue to operate. |
| Regression | No new freeze executions triggered; `snapshot_frozen_at` behavior unchanged. |

#### Completion criteria

- [ ] Freeze Event entity is reviewable in schema and matches Blueprint §9 relationship diagram.
- [ ] INV-8 identity is assignable and unique per meeting freeze boundary.
- [ ] Voter snapshot entries correlate to freeze event id.
- [ ] Phase verification evidence recorded.

---

### Phase 3 — Resolution Snapshot Foundation

**Purpose:** Persist the **Resolution Snapshot** / frozen instrument (CITM 2) — immutable formal motion set at freeze — correlated to the same freeze event as the voter snapshot.

#### Deliverables

- Resolution Snapshot persistence (instrument header bound 1:1 to freeze event).
- Frozen formal motion persistence (content, order, method/threshold, stable frozen motion identity per motion).
- Source binding documentation: materialization reads from meeting-owned formal resolutions (`owner_vote_resolutions` + agenda linkage) at freeze instant — **E-02 performs materialization**; E-01 defines schema and identity only.
- Ballot identity preparation: column/FK design on `owner_vote_ballots` (or companion table) to reference **frozen motion identity** instead of live resolution row alone (CITM 11 identity model; enforcement deferred to E-03).
- Immutability hooks on resolution snapshot and frozen motion rows (INV-1), consistent with Phase 1 pattern.
- Handling note for unstable agenda↔resolution linkage (`ownerVotingCouncil.ts` TODO): frozen motion identity must not depend on live row mutation after freeze.

#### Dependencies

- **Phase 2** complete (freeze event identity and correlation pattern).

#### Verification

| Class | Check |
|-------|-------|
| Engineering | Resolution snapshot record correlates to same freeze event id as voter snapshot in test fixtures. |
| Engineering | Frozen motion rows are immutable after insert (UPDATE/DELETE rejected). |
| Engineering | Frozen motion identity is stable and distinct from live `owner_vote_resolutions.id` where required by design. |
| Engineering | Ballot identity FK/column exists but is nullable or unused until E-03 (no submit-path change). |
| Regression | Live `owner_vote_resolutions` authoring and `ensureOwnerVoteResolutionForMeeting` unchanged. |
| Regression | Existing ballots and results queries unchanged (no mandatory migration of historical rows in E-01). |

#### Completion criteria

- [ ] Resolution snapshot and frozen motion models implemented and reviewable.
- [ ] Dual snapshot correlation to one freeze event demonstrated in test data.
- [ ] CITM 2 persistence foundation complete; CITM 11 identity column/FK design present.
- [ ] Phase verification evidence recorded.

---

### Phase 4 — Typed Repository / Read Layer

**Purpose:** Replace ad hoc snapshot reads with a **typed, read-only access layer** for the snapshot domain — no orchestration, no voting contract changes.

#### Deliverables

- TypeScript domain types aligned with Blueprint §9 entities (Freeze Event, Voter Snapshot, Resolution Snapshot, Frozen Motion, Voter Entry).
- Read-only repository or API module (e.g. `snapshotDomain` / `ownerVoteSnapshot`) encapsulating:
  - Load freeze event by meeting or id
  - Load voter snapshot entries by freeze event
  - Load resolution snapshot and frozen motions by freeze event
  - Correlation helper: resolve dual snapshot for a meeting's active freeze event
- Refactor **read paths only** where low-risk (optional in this phase): consolidate duplicate snapshot reads identified in investigation (`api.ts`, `MeetingDetail.tsx`, `useImportantUpdatesBullets.ts`) — **must not** change gate semantics or eligibility logic.
- No new write paths except those required for schema verification seeds in non-production environments.

#### Dependencies

- **Phases 1–3** complete (all persistence objects exist).

#### Verification

| Class | Check |
|-------|-------|
| Engineering | Typed loaders return correct correlated dual snapshot for seeded test meeting. |
| Engineering | Read layer fails closed when freeze event or snapshot missing (typed errors, no silent fallback to live membership for legal roll). |
| Engineering | Unit/integration tests for read layer pass. |
| Regression | UI eligibility display and open-vote gates behave identically before/after read-layer refactor (snapshot count, `snapshot_frozen_at` checks). |
| Regression | Edge `send-meeting-invite` voting_notice authorization unchanged if not touched; if refactored to shared read helper, re-verify frozen-roll check. |

#### Completion criteria

- [ ] Typed read layer is reviewable and used by at least one existing read path or verified in isolation with test harness.
- [ ] No changes to `submit_owner_vote`, `submit_owner_election_ballot`, or `freeze_owner_vote_snapshot` behavior.
- [ ] Phase verification evidence recorded.

---

### Phase 5 — Regression Preparation

**Purpose:** Close E-01 with verification evidence, CITM status updates, and explicit handoff boundary to E-02 — without activating freeze orchestration or voting contract changes.

#### Deliverables

- E-01 verification report (engineering + regression) per CES-008.
- CITM status update for rows **1, 2, 5, 11 (partial)** with evidence links.
- Negative immutability test suite results (snapshot records cannot be updated after freeze flag / event linkage).
- Dual-snapshot correlation test results (voter + resolution share freeze event id).
- Explicit **E-01 → E-02 handoff note**: which objects E-02 must write to; which production paths remain legacy until E-02/E-05.
- Known gaps list (intentionally deferred): atomic freeze (E-02), audit once-per-freeze (E-02), unified eligibility (E-03), scheduler (E-04).

#### Dependencies

- **Phases 1–4** complete.

#### Verification

| Class | Check |
|-------|-------|
| Engineering | All Phase 1–4 completion criteria checked. |
| Engineering | Negative immutability tests pass for event-linked rows. |
| Engineering | Dual-snapshot correlation tests pass. |
| Regression | Slice 2 authoring smoke: create → edit → finalize formal resolution on agenda. |
| Regression | Existing owner-vote meeting with production-style freeze still loads and displays eligible count. |
| Regression | Entry/login/join flows untouched (domain-entry-flow lock). |
| Acceptance | E-01 completion criteria from Work Breakdown §4 Task E-01 satisfied. |

#### Completion criteria

- [ ] E-01 verification report approved.
- [ ] CITM rows 1, 2, 5, 11 (identity) marked implemented (partial) with evidence.
- [ ] E-02 handoff document section complete in verification report.
- [ ] Task E-01 marked complete in engineering tracking.

---

## 4. Engineering Order

Phases **must** execute in order **1 → 2 → 3 → 4 → 5**. Each phase is an independently reviewable commit boundary.

```
Phase 1  Snapshot Domain Foundation (voter roll + immutability pattern)
    ↓
Phase 2  Freeze Event Identity (correlation anchor — INV-8)
    ↓
Phase 3  Resolution Snapshot Foundation (dual snapshot — CITM 2, 11 identity)
    ↓
Phase 4  Typed Repository / Read Layer (consumers can read new domain safely)
    ↓
Phase 5  Regression Preparation (evidence + handoff to E-02)
```

### Blocking dependencies

| Phase | Blocked by | Reason |
|-------|------------|--------|
| 2 | 1 | Freeze event correlates to voter snapshot rows; immutability pattern must exist first. |
| 3 | 2 | Resolution snapshot binds 1:1 to freeze event (Blueprint §9); cannot define instrument without event identity. |
| 4 | 3 | Read layer must expose complete dual-snapshot model. |
| 5 | 4 | Final verification requires all persistence and read paths. |

### Parallelization

**Not recommended.** Phases 2 and 3 are tightly coupled through freeze event identity. Phase 4 must not begin until persistence is stable.

### Downstream unblock

E-01 completion **unblocks E-02** (Freeze Engine). E-03, E-04, and E-05 remain blocked on their respective Work Breakdown dependencies.

---

## 5. Verification Strategy

### Per-phase matrix

| Phase | Engineering verification | Regression verification | Acceptance criteria |
|-------|-------------------------|-------------------------|---------------------|
| **1** | Migration apply; immutability negative tests on linked rows; legacy row path unchanged | Production-equivalent freeze RPC still works; Slice 2 authoring smoke | Voter snapshot in repo; INV-1 hooks present for event-linked rows |
| **2** | Freeze event CRUD in test only; uniqueness enforced; FK from voter snapshot | No new freezes; existing meetings unaffected | INV-8 identity assignable and unique |
| **3** | Dual correlation in fixtures; frozen motion immutability; ballot identity column exists | Live resolutions and ballots unchanged | CITM 2 foundation reviewable; CITM 11 identity prepared |
| **4** | Typed loader tests; correlation helper tests | UI gates and counts unchanged; invite auth unchanged | Read layer reviewable |
| **5** | Full E-01 test suite; CITM evidence package | End-to-end smoke on existing meeting flows | Work Breakdown E-01 completion criteria met |

### E-01 task-level acceptance (from Work Breakdown)

- [ ] Voter snapshot and resolution snapshot models implemented and reviewable
- [ ] Freeze event identity assignable and unique per meeting freeze
- [ ] Immutability rules enforced at foundation layer
- [ ] CITM rows 1, 2, 5, 11 (identity) marked implemented with evidence

### Verification artifacts (CES-008)

Each phase produces:

1. Migration file list (Phase 1–3)
2. Test run output (immutability + correlation)
3. Regression checklist sign-off (Phase 5)
4. Short phase completion note appended to E-01 verification report

---

## 6. Rollback Strategy

Each phase is **independently reversible** without production impact until deployed. Strategy is engineering-process only (no rollback SQL in this document).

| Phase | Stop safely | Revert |
|-------|-------------|--------|
| **1** | Do not merge next phase until Phase 1 verification passes. | Revert migration commit; immutability hooks removed; app continues using production-equivalent ad hoc reads. Legacy freeze RPC unaffected if hooks scoped to event-linked rows only. |
| **2** | Do not populate freeze events in production paths. | Revert freeze-event migration; Phase 1 voter snapshot remains valid without FK population. |
| **3** | Do not materialize resolution snapshots in live freeze RPC. | Revert resolution snapshot schema; Phases 1–2 remain or revert as a unit. Ballot identity column nullable — revert migration drops column with no submit-path change if E-03 not started. |
| **4** | Read layer is additive; keep ad hoc reads if refactor causes regression. | Revert TypeScript module only; persistence unchanged. |
| **5** | Documentation-only; no rollback of schema required. | Update CITM status back to Pending if E-01 reopened. |

### General rollback principles

- **One phase per PR** where practical (Implementation Principles).
- **No mixed commits** spanning schema + freeze orchestration + voting gates.
- Deploy to non-production first; validate regression checklist before production.
- If a phase fails verification, **do not proceed** — fix or revert within the same phase boundary.
- E-02 must not begin until Phase 5 acceptance — prevents partial foundation from being wired into freeze RPC prematurely.

---

## 7. Deliverables

### Phase 1

| Output type | Expected output |
|-------------|-----------------|
| Implementation | Voter snapshot schema-as-code migration(s); immutability hooks; legacy coexistence comments |
| Verification | Migration apply log; immutability negative test results; authoring smoke pass |

### Phase 2

| Output type | Expected output |
|-------------|-----------------|
| Implementation | Freeze Event entity migration; voter snapshot correlation FK; uniqueness policy |
| Verification | Identity assignment test; duplicate-event rejection test; regression pass |

### Phase 3

| Output type | Expected output |
|-------------|-----------------|
| Implementation | Resolution snapshot + frozen motion schema; ballot identity column/FK (nullable); immutability hooks |
| Verification | Dual-snapshot correlation test; frozen motion immutability test; live resolution regression pass |

### Phase 4

| Output type | Expected output |
|-------------|-----------------|
| Implementation | TypeScript domain types; read-only repository module; optional read-path consolidation |
| Verification | Loader unit tests; UI gate parity check; invite auth parity if touched |

### Phase 5

| Output type | Expected output |
|-------------|-----------------|
| Implementation | E-01 verification report; CITM evidence update; E-02 handoff section |
| Verification | Full regression checklist; Work Breakdown completion sign-off |

---

## 8. Out of Scope

E-01 does **not** include:

| Item | Owner task |
|------|------------|
| Freeze transaction orchestration (atomic commit, rollback, materialization at freeze instant) | **E-02** |
| Changing `freeze_owner_vote_snapshot` behavior | **E-02** |
| Exactly-one freeze audit record per successful freeze | **E-02** |
| Voting eligibility changes (`submit_owner_vote`, `submit_owner_election_ballot`) | **E-03** |
| Voting contract (unified eligibility, pre-freeze reject, fail-closed) | **E-03** |
| Ballot submit enforcement on frozen instrument identity | **E-03** |
| Meeting lifecycle (7+freeze+7, phase transitions, open/close voting) | **E-04** |
| Server-primary Day-7 scheduler; client auto-freeze removal | **E-04** |
| Manual council early freeze UI wiring changes | **E-04** |
| Legacy meeting compatibility matrix execution | **E-05** |
| Correction / reissue workflow | **E-06** |
| Future milestones beyond M2-S3 | — |

E-01 prepares **identity and persistence** only. Production behavior for freeze, vote, and lifecycle **remains unchanged** until downstream tasks are verified and deployed.

---

## 9. Ready for Implementation

After approval of this plan:

- Each phase (**1 through 5**) may be implemented **independently** as a separate engineering session.
- Each phase should use a **Level 3 Cursor prompt** scoped to that phase's deliverables, dependencies, and verification criteria only.
- Implementation must follow [`IA-001`](M2-S3-Implementation-Authorization.md), [`CES-001`](CES-001-Engineering-Standard.md), [`CES-002`](CES-002-Database-Engineering-Standard.md), and [`CES-008`](CES-008-Testing-and-Verification-Engineering-Standard.md).
- **E-02 must not start** until Phase 5 acceptance and E-01 verification report sign-off.

**E-01 is ready for phased engineering implementation.**

---

## Document control

| Field | Value |
|-------|-------|
| **Created** | 2026-07-26 |
| **Approved** | 2026-07-26 |
| **Modifies Blueprint** | **No** |
| **Modifies Governance** | **No** |
| **Modifies IA-001 / ER-001 / Work Breakdown** | **No** |
| **Production effect** | **None** (planning document only) |

**Related:** [`M2-S3-Engineering-Work-Breakdown.md`](M2-S3-Engineering-Work-Breakdown.md) · [`M2-S3-Snapshot-Freeze-Design.md`](M2-S3-Snapshot-Freeze-Design.md) · [`RC010-B`](../rc/RC010-B-Production-Freeze-Contract-Recovery.md)
