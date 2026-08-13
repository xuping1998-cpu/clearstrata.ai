# E-02 — Freeze Engine Architecture Authority

| Field | Value |
|-------|-------|
| **Document Type** | **Architecture Authority** |
| **Program** | E-02 — Freeze Engine |
| **Status** | **Approved — Architecture Authority** |
| **Revision** | v1.1 |
| **Authoritative Source** | [`M2-S3-Snapshot-Freeze-Design.md`](M2-S3-Snapshot-Freeze-Design.md) (Blueprint) · [`E-01-Project-Certification.md`](E-01-Project-Certification.md) |
| **Verified** | **YES** |
| **Supersedes** | E-02 Architecture v1.0 (overview) |
| **Next Document** | [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) · Phase 1 → [`E-02-Phase-1-Implementation-Plan.md`](E-02-Phase-1-Implementation-Plan.md) |
| **Task** | E-02 Freeze Engine |
| **Milestone** | M2-S3 — Snapshot Freeze |
| **Production Effect** | **None** |

> **Mode:** Architecture Authority · Documentation only · Read only. Normative architecture contract for E-02 Freeze Engine. No application code, SQL, migrations, RPC, UI, or production changes.

---

## 1. Purpose

Define the **architecture** of **E-02 Freeze Engine**.

E-02 **shall** implement **snapshot materialization** using the certified **E-01 Snapshot Foundation**. E-02 is the constitutional **boundary event** that transitions a meeting from authoring to frozen state by atomically creating a Freeze Event and populating all snapshot artifacts bound to that event.

This document defines **architecture only**. It does **not** define implementation units, SQL, repository code, RPC signatures, or UI behavior. Those belong to [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) and subsequent engineering records.

---

## 2. Architecture Authority

This document is the **single Architecture Authority** for **E-02 Freeze Engine**.

| Rule | Requirement |
|------|-------------|
| **Authority scope** | All normative architecture decisions for E-02 freeze materialization are defined herein and in cited Blueprint sections consumed by this document |
| **Implementation Plans** | **Shall not** redefine architecture decisions contained herein |
| **Implementation Units** | **Shall not** redefine architecture decisions contained herein |
| **Engineering Reviews** | **Shall not** redefine architecture decisions contained herein |
| **Acceptance** | **Shall not** redefine architecture decisions contained herein |
| **Architecture changes** | Require **formal architecture revision** to this document (new revision; supersession record) |

Implementation records **may** elaborate verification, sequencing, and deliverables — they **shall** remain consistent with this Architecture Authority.

---

## 3. Freeze Authority

**Purpose:** Define who authorizes Freeze.

### Normative statements

| # | Statement |
|---|-----------|
| FA-1 | The Freeze Engine **SHALL NOT** determine authorization. |
| FA-2 | Authorization **SHALL** be supplied by an **approved upstream workflow**. |
| FA-3 | The Freeze Engine **SHALL** validate **only architectural preconditions** (meeting phase, resolution completeness, correlation readiness, idempotency boundary). |
| FA-4 | The Freeze Engine **SHALL fail closed** when authorization is absent or invalid. |

### Examples *(informative)*

| Upstream workflow | Role |
|-------------------|------|
| **E-04 Lifecycle** | Primary authorized invoker — server-primary Day-7 freeze, manual council early freeze |
| **Administrative Recovery** | Permitted **only** if separately authorized by investigation-gated process |
| **Future approved workflow** | Any new invoker must supply authorization; E-02 semantics unchanged |

E-02 validates **that a freeze may proceed architecturally** once invoked. E-02 does **not** decide **whether the caller is permitted** to invoke freeze — that belongs to the upstream workflow and platform authorization model.

---

## 4. Correlation Model

**Purpose:** Define architectural correlation.

### Normative statements

| # | Statement |
|---|-----------|
| CM-1 | Every Freeze Event **SHALL** own exactly **one** Voter Snapshot. |
| CM-2 | Every Freeze Event **SHALL** own exactly **one** Resolution Snapshot. |
| CM-3 | Every Frozen Motion **SHALL** belong to exactly **one** Resolution Snapshot. |
| CM-4 | Every persisted artifact produced by a successful freeze **SHALL** reference exactly **one** Freeze Event. |
| CM-5 | **Cross-event correlation is prohibited** — artifacts from one Freeze Event **SHALL NOT** reference or bind to a different Freeze Event. |
| CM-6 | **Partial correlation is prohibited** — no artifact **SHALL** commit without full Freeze Event binding. |
| CM-7 | Repository implementations **SHALL** preserve correlation when reading materialized snapshot state. |

Correlation rules apply to **event-linked** freezes produced by E-02. Legacy rows without `freeze_event_id` remain governed by the E-01 legacy read path and are not subject to event correlation until separately migrated under authorized work.

---

## 5. Recovery Model

**Purpose:** Separate rollback from correction.

### Normative statements

| # | Statement |
|---|-----------|
| RM-1 | **Failure before Commit** → **Rollback** → Meeting remains **Authoring**. |
| RM-2 | After rollback, **Retry MAY occur** subject to upstream authorization and architectural preconditions. |
| RM-3 | **Failure after Commit** → **No automatic rebuild**. |
| RM-4 | **Correction belongs only to E-06** — authorized reissue, investigation-gated recovery, or formal correction workflow. |
| RM-5 | The Freeze Engine **SHALL NOT** repair committed snapshots. |

```
Failure before Commit
        ↓
    Rollback
        ↓
Meeting remains Authoring
        ↓
Retry MAY occur (authorized)

Failure after Commit
        ↓
No automatic rebuild
        ↓
Correction → E-06 only
```

Rollback and correction are **architecturally distinct**. Rollback is an E-02 pre-commit concern. Correction is never an E-02 silent rebuild of committed immutable state.

---

## 6. Freeze Contract

**Purpose:** Define the architecture contract between invoker and Freeze Engine.

### Inputs

| Input | Description |
|-------|-------------|
| **Meeting** | Target owner vote meeting in authoring phase |
| **Membership** | Live property membership read at freeze instant |
| **Resolutions** | Meeting-owned formal resolutions read at freeze instant |
| **Authorization** | Supplied by approved upstream workflow (§3) — not determined by E-02 |

### Outputs

| Output | Description |
|--------|-------------|
| **Freeze Event** | Primary correlation anchor (INV-8) |
| **Voter Snapshot** | Legal roll materialized at freeze instant |
| **Resolution Snapshot** | Immutable instrument container |
| **Frozen Motions** | N motions bound to resolution snapshot (INV-7) |
| **Meeting Freeze Marker** | Timestamp / phase signal set only on successful commit |
| **Primary Audit** | Exactly one audit record per successful freeze (INV-5) |

### Architectural guarantees

| Guarantee | Contract |
|-----------|----------|
| **Atomic** | All outputs commit together or not at all (INV-4) |
| **Immutable** | Post-commit snapshot state governed by E-01 immutability (INV-1) |
| **Correlated** | All outputs bind to one Freeze Event (§4) |
| **Idempotent** | Repeat invocation after commit returns existing identity — no rebuild (INV-8) |
| **Single Freeze Identity** | At most one primary successful Freeze Event per meeting freeze boundary |
| **Fail Closed** | Invalid preconditions or materialization failure → rollback; no partial outputs |
| **Repository First** | Read-side access via E-01 typed repository per CES-003 §15 |
| **Backward Compatible** | Legacy paths remain valid; event-linked freezes are additive (INV-6 foundation) |

---

## 7. Authoritative inputs

| Input | Role |
|-------|------|
| [`M2-S3-Snapshot-Freeze-Design.md`](M2-S3-Snapshot-Freeze-Design.md) | Blueprint §8 invariants · §9 snapshot domain · §10 freeze transaction |
| [`E-01-Project-Certification.md`](E-01-Project-Certification.md) | Certified persistence foundation E-02 consumes |
| [`E-01-Engineering-Baseline.md`](E-01-Engineering-Baseline.md) | Official E-01 baseline artifacts and extension rule |
| [`E-01-Acceptance-Report.md`](E-01-Acceptance-Report.md) | Verified deliverables and deferred ownership |
| [`RC-011-Completion.md`](RC-011-Completion.md) | E-01 schema deployed; DB head `20261728120000` |
| [`ENGINEERING-GOVERNANCE-v1.3.md`](ENGINEERING-GOVERNANCE-v1.3.md) | GR-7 deferred ownership · GR-8 traceability |
| [`EPS-001-Engineering-Phase-Documentation-Standard.md`](EPS-001-Engineering-Phase-Documentation-Standard.md) | Document chain after architecture |
| [`CES-003-Frontend-Engineering-Standard.md`](CES-003-Frontend-Engineering-Standard.md) | Repository First Rule (§15) for read-side consumers |
| [`M2-S3-Engineering-Work-Breakdown.md`](M2-S3-Engineering-Work-Breakdown.md) | Task E-02 scope · CITM rows 4, 12, 5, 1, 2 |
| [`IA-001`](M2-S3-Implementation-Authorization.md) | Implementation authorization boundary |

---

## 8. Architecture objective

E-02 introduces **Freeze Materialization** — the orchestrated, atomic creation of immutable snapshot state at the freeze instant.

| Responsibility | Description |
|----------------|-------------|
| **Create Freeze Event** | Assign globally unique freeze event identity per successful freeze (INV-8 foundation) |
| **Populate Voter Snapshot** | Materialize legal roll from live membership **at freeze instant only** |
| **Populate Resolution Snapshot** | Materialize immutable instrument set from meeting-owned formal resolutions **at freeze instant** |
| **Populate Frozen Motions** | Bind each formal motion into the frozen instrument under the resolution snapshot |
| **Commit atomically** | Persist all artifacts, meeting freeze marker, and phase transition in one transaction (INV-4) |
| **Prevent partial freeze** | Abort and roll back on any materialization failure — no partial persisted state |
| **Guarantee immutable frozen state** | On successful commit, snapshot rows become governed by E-01 immutability contracts (INV-1) |

E-02 **materializes** what E-01 **persisted**. E-02 does **not** redefine entity shapes, schema identity, or immutability hook semantics established by the E-01 baseline.

---

## 9. Out of scope

The following are **explicitly outside** E-02 architecture:

| Item | Owner |
|------|-------|
| Voting / ballot authorization | **E-03** |
| Ballot binding to frozen instrument | **E-03** |
| Day-7 / manual freeze **scheduling and triggers** | **E-04** |
| Consumer wiring (React, hooks, UI freeze buttons) | **E-04** + separate authorized work |
| Notification / council alerts on freeze failure | Future authorized work |
| Reporting / analytics | Out of scope |
| Correction / reissue workflow | **E-06** |
| Legacy compatibility matrix execution | **E-05** |

E-02 defines **what happens when freeze is invoked**. E-04 defines **when and by whom** freeze is invoked (server-primary scheduler, manual council early freeze). E-02 must expose a **callable freeze boundary** consumable by E-04 without embedding scheduler logic.

---

## 10. Architecture principles

| Principle | Architecture meaning |
|-----------|---------------------|
| **Single Freeze Event** | Each successful freeze produces exactly one primary Freeze Event correlated to one voter snapshot and one resolution snapshot (Blueprint §9 relationships). |
| **Atomic Transaction** | Voter snapshot, resolution snapshot, frozen motions, freeze timestamp, phase transition, and primary audit commit together or not at all (INV-4; Blueprint §10). |
| **Single Source of Truth** | Post-commit, the event-linked snapshot domain is the authoritative legal roll and instrument for downstream voting (CITM rows 1, 2). Live membership and live resolution rows are **not** post-freeze gates. |
| **Immutable Frozen State** | After successful commit, event-linked snapshot rows are immutable per E-01 persistence contracts (INV-1). E-02 must not permit silent rebuild of committed snapshots. |
| **Repository First** | Read-side consumers **shall** use the E-01 typed repository (`FrozenMeetingBundle`) per CES-003 §15. E-02 materialization writes through the freeze orchestration boundary; it does not bypass the repository for reads. |
| **Backward Compatibility** | Legacy meetings and legacy snapshot rows (`freeze_event_id IS NULL`) remain readable. New event-linked freezes coexist without invalidating historical ballots (INV-6 foundation). |
| **Fail Closed** | Validation failure, materialization failure, or correlation failure **aborts** the freeze. Meeting remains in authoring. No partial freeze timestamp. No voting-eligible phase transition. |
| **Idempotent Retry** | Concurrent or repeated freeze attempts resolve to a single committed outcome or an explicit conflict — never duplicate primary freeze events or corrupt snapshot identity (INV-8). |

---

## 11. System model

Conceptual flow from meeting to immutable state. **Not** SQL or RPC design.

```
Meeting (authoring)
        ↓
   Freeze Request
   (external trigger — E-04 / authorized caller)
        ↓
   Freeze Event (candidate identity)
        ↓
   Voter Snapshot (materialized from live membership @ freeze instant)
        ↓
   Resolution Snapshot (materialized from formal resolutions @ freeze instant)
        ↓
   Frozen Motions (N motions bound to resolution snapshot)
        ↓
   Atomic Commit
   (snapshots + freeze marker + phase + audit)
        ↓
   Immutable State
   (event-linked; E-01 immutability governs post-commit)
```

### Entity relationships (Blueprint §9 — consumed, not redefined)

```
Meeting 1 — 0..1 Active Freeze Event (successful)
Freeze Event 1 — 1 Voter Snapshot
Freeze Event 1 — 1 Resolution Snapshot
Resolution Snapshot 1 — N Frozen Motions
Voter Snapshot 1 — N Voter Entries
```

### Domain ownership at freeze boundary

| Phase | Domain owner |
|-------|--------------|
| Before freeze | **Meeting** — resolution authoring and agenda |
| At freeze (E-02) | **Freeze Engine** — materialization and atomic commit |
| After commit | **Snapshot Domain** — read-only legal roll and instrument |
| After commit (downstream) | **Voting Contract (E-03)** — ballot authorization |

---

## 12. Freeze state machine

E-02 governs the **freeze attempt lifecycle** for a single meeting freeze operation. States describe orchestration progress only — not meeting lifecycle phases (those belong to E-04).

### States

| State | Meaning |
|-------|---------|
| **Pending** | Freeze request accepted; meeting validated as freeze-eligible; no materialization started |
| **Preparing** | Pre-commit validation in progress — membership read, resolution completeness, duplicate-freeze check |
| **Materializing** | Snapshot candidates built; transaction open; rows staged for atomic commit |
| **Committed** | Transaction committed — Freeze Event, snapshots, motions, freeze marker, audit, and phase transition are durable |
| **Failed** | Validation or materialization failed; transaction rolled back; meeting remains authoring; failure reason recorded for audit/diagnostics |
| **Cancelled** | Freeze attempt explicitly aborted before commit (operator cancel, superseding conflict resolution, or policy block) |

### Transitions

```
                    ┌─────────────┐
                    │   Pending   │
                    └──────┬──────┘
                           │ validate meeting + eligibility
                           ▼
                    ┌─────────────┐
         ┌─────────│  Preparing  │─────────┐
         │         └──────┬──────┘         │
         │ validation     │ validation     │ duplicate /
         │ failure        │ success        │ policy block
         ▼                ▼                ▼
  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
  │   Failed    │  │Materializing│  │  Cancelled  │
  └─────────────┘  └──────┬──────┘  └─────────────┘
                          │
              ┌───────────┼───────────┐
              │ commit    │ rollback  │ explicit abort
              ▼           ▼           ▼
       ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
       │  Committed  │ │   Failed    │ │  Cancelled  │
       └─────────────┘ └─────────────┘ └─────────────┘
```

### Transition rules

| From | To | Condition |
|------|-----|-----------|
| Pending | Preparing | Meeting in authoring; no committed primary freeze for this boundary; caller authorized |
| Pending | Failed | Meeting not freeze-eligible (e.g. wrong phase, invalid resolution set) |
| Pending | Cancelled | Request rejected at gate (policy, authorization) |
| Preparing | Materializing | Membership and resolution candidates valid; Freeze Event identity assigned |
| Preparing | Failed | Membership read failure; resolution incomplete/invalid; correlation pre-check failure |
| Preparing | Cancelled | Superseded by winning concurrent attempt |
| Materializing | Committed | All artifacts staged; transaction commits; audit written |
| Materializing | Failed | Mid-transaction failure; rollback — no durable snapshot rows or freeze marker |
| Materializing | Cancelled | Abort before commit (rare — typically maps to Failed with rollback) |
| Committed | — | Terminal — immutable; re-freeze blocked or restricted per INV-8 (no silent rebuild) |
| Failed | Pending | **New** freeze attempt allowed if meeting still authoring and policy permits |
| Cancelled | Pending | **New** freeze attempt allowed per policy |

**Note:** A meeting may have **at most one** successful primary Freeze Event per freeze boundary. Committed is terminal for that boundary.

---

## 13. Atomic freeze model

Architecture derived from Blueprint §10. **No** implementation detail.

### Transaction boundary

The freeze transaction **begins** after Preparing validation succeeds and **ends** at Commit or Rollback.

**Inside the transaction boundary:**

1. Create / finalize Freeze Event identity
2. Insert voter snapshot rows correlated to Freeze Event
3. Insert resolution snapshot row correlated to Freeze Event
4. Insert frozen motion rows bound to resolution snapshot
5. Set meeting freeze timestamp (`snapshot_frozen_at` or equivalent) **only on success**
6. Transition meeting phase to frozen / voting-eligible
7. Write exactly one primary freeze audit record (INV-5)

**Outside the transaction boundary (before):**

- Read live membership at freeze instant
- Read meeting-owned formal resolutions at freeze instant
- Validate resolution completeness and instrument integrity
- Assign candidate Freeze Event identity

### Commit boundary

Commit is **valid** only when all mandatory artifacts are staged and correlated:

| Artifact | Correlation requirement |
|----------|-------------------------|
| Freeze Event | Globally unique identity (INV-8) |
| Voter Snapshot | `freeze_event_id` → Freeze Event |
| Resolution Snapshot | `freeze_event_id` → Freeze Event (1:1) |
| Frozen Motions | Resolution snapshot parent; full instrument set (INV-7) |
| Meeting freeze marker | Set concurrently with snapshot persistence |
| Primary audit | References freeze event id and meeting correlation |

On commit success → state **Committed** → E-01 immutability hooks govern event-linked rows (INV-1).

### Rollback boundary

Rollback is **mandatory** when any in-transaction step fails.

| Rollback outcome | Requirement |
|------------------|-------------|
| No voter snapshot rows durable | ✓ |
| No resolution snapshot rows durable | ✓ |
| No frozen motion rows durable | ✓ |
| No freeze timestamp on meeting | ✓ |
| No phase transition to voting-eligible | ✓ |
| No primary audit for failed attempt | ✓ (diagnostic log may exist; not primary freeze audit) |
| Meeting remains authoring | ✓ |

Partial completion is **architecturally invalid** (INV-4).

### Failure behavior

| Failure class | Architecture response |
|---------------|----------------------|
| Membership read failure | Abort → Failed; rollback; meeting authoring |
| Resolution incomplete / invalid | Abort → Failed; no partial freeze; council notification deferred to E-04/UI |
| Snapshot correlation failure | Abort → Failed; rollback |
| Concurrent freeze attempt | Single winner → Committed; others → idempotent success (same event) or explicit conflict → Cancelled/Failed |
| Mid-transaction persistence error | Abort → Failed; full rollback |

### Retry behavior

| Scenario | Expected behavior |
|----------|---------------------|
| Failed attempt | Meeting remains authoring; **new** Pending attempt permitted |
| Scheduler misfire (E-04) | E-04 retries invocation; E-02 idempotency governs outcome |
| Client fallback trigger (E-04) | Secondary path invokes same E-02 boundary — not a separate freeze semantics |

### Idempotency expectations

| Condition | Outcome |
|-----------|---------|
| Repeat request after **Committed** | Return existing Freeze Event / snapshot identity — no rebuild (INV-8) |
| Concurrent requests same meeting | One Committed; others idempotent success or explicit conflict |
| Repeat request mid-Materializing | Conflict or wait — never duplicate primary event |

---

## 14. Invariant enforcement (E-02)

Blueprint §8 defines invariants. E-02 **does not redefine** them. This section documents **where E-02 enforces** each applicable invariant.

| Invariant | Blueprint definition | E-02 enforcement point |
|-----------|---------------------|------------------------|
| **INV-1** | Snapshot becomes **immutable** after successful Freeze | E-02 commits event-linked rows; post-commit mutation blocked by E-01 persistence hooks. E-02 must not expose rebuild paths for committed snapshots. |
| **INV-4** | Freeze is **atomic** — all artifacts commit together or not at all | E-02 transaction boundary (§13). Rollback on any failure. |
| **INV-5** | Successful Freeze generates **exactly one** primary audit record | E-02 writes primary audit **once** at Commit boundary, correlated to Freeze Event id. |
| **INV-7** | Meeting resolutions freeze **together** as one instrument set bound to same freeze event | E-02 materializes complete resolution snapshot + all frozen motions in single transaction — no partial instrument commit. |
| **INV-8** | Snapshot identity globally unique per meeting freeze event — reissue requires authorized correction, not silent rebuild | E-02 assigns Freeze Event identity at materialization; Committed is terminal; re-freeze blocked or routed to E-06 correction — never silent overwrite. |

**Not enforced by E-02** (downstream owners):

| Invariant | Owner |
|-----------|-------|
| INV-2 (post-freeze eligibility from snapshot only) | E-03 |
| INV-3 (votes never rewritten) | E-03 |
| INV-6 (legacy history preserved) | E-01 foundation + E-05 |
| INV-9 (UI/RPC/persistence gate parity) | E-03, E-04 |
| INV-10 (server-primary Day-7 freeze) | E-04 |

---

## 15. Error model

Architecture-level error categories. **No** implementation logic, error codes, or RPC mapping.

| Error category | Meaning | Architecture response |
|----------------|---------|----------------------|
| **Freeze already exists** | Primary freeze already Committed for this meeting boundary | Idempotent return of existing Freeze Event; no rebuild |
| **Meeting not freeze-eligible** | Wrong phase, missing resolutions, or policy block | Fail closed → Failed; no transaction |
| **Membership materialization failure** | Cannot read or normalize live membership at freeze instant | Fail closed → Failed; rollback if mid-transaction |
| **Resolution mismatch / incomplete** | Formal resolution set invalid, empty, or inconsistent | Fail closed → Failed; council notification path (E-04) |
| **Snapshot correlation failure** | Voter/resolution/motion rows cannot bind to Freeze Event | Fail closed → Failed; rollback |
| **Rollback required** | Any in-transaction failure | Full rollback; Failed state; meeting authoring preserved |
| **Materialization incomplete** | Transaction cannot stage all mandatory artifacts | Do not commit; Rollback required |
| **Concurrent freeze conflict** | Another attempt won Materializing → Committed | Idempotent success or explicit conflict — never duplicate primary event |
| **Re-freeze forbidden** | Attempt to rebuild committed immutable snapshot | Reject; route to E-06 authorized correction if applicable |

All errors **fail closed**: no partial freeze timestamp, no voting-eligible phase, no durable snapshot artifacts on failure.

---

## 16. Backward compatibility

| Requirement | Architecture stance |
|-------------|---------------------|
| **Legacy meetings remain readable** | E-01 repository supports legacy path (`freeze_event_id IS NULL` — 44 existing rows). E-02 does not invalidate legacy reads. |
| **Legacy snapshot path remains valid** | Pre-E-02 production freeze behavior (`freeze_owner_vote_snapshot`) coexists during transition. E-02 event-linked freezes are additive, not destructive. |
| **No existing voting behavior changes** | E-02 does not modify vote submit paths (E-03). Until E-03 enforcement, production voting behavior unchanged. |
| **Historical ballots preserved** | E-02 never deletes or silently alters historical snapshot or ballot records (INV-6 foundation). |
| **Phased adoption** | New freezes may use event-linked materialization while legacy rows remain governed by prior production contract until E-05 migration matrix executes. |

---

## 17. Dependencies

### Consumes

| Dependency | What E-02 uses |
|------------|----------------|
| **E-01 Snapshot Foundation** | Freeze Event entity; voter/resolution/frozen motion persistence; immutability hooks; typed read repository contract |
| **E-01 Engineering Baseline** | Schema head `20261728120000`; entity relationships; extension-not-rewrite rule |
| **Blueprint §9–§10** | Domain model and atomic freeze sequence |
| **IA-001** | Authorized freeze transaction scope |

### Produces

| Output | Consumer |
|--------|----------|
| **Materialized Snapshot** (Freeze Event + voter snapshot + resolution snapshot + frozen motions) | **E-03** Voting Contract |
| **Committed immutable state** | **E-03**, **E-04** (phase/window enforcement) |
| **Primary freeze audit record** | **E-06** (operational guardrails) |
| **Freeze correlation identity** | Audit, voting, and lifecycle domains |

### Consumed later by

```
E-02 Materialized Snapshot
        ↓
    E-03 Voting Contract (eligibility + ballot binding)
        ↓
    E-04 Meeting Lifecycle (windows reference committed freeze)
```

E-04 **invokes** E-02 but does **not** own materialization semantics.

---

## 18. Engineering boundary

| Layer | Owner | This document |
|-------|-------|---------------|
| **Architecture Authority** | E-02 Architecture Authority (this document) | ✓ Normative contract — Freeze Authority, Correlation, Recovery, Freeze Contract |
| **Implementation Plan** | `E-02-Implementation-Plan.md` | Phases, IUs, verification criteria, deliverables |
| **Implementation** | E-02 engineering sessions | SQL, RPC, orchestration code, tests |
| **Trigger / schedule** | E-04 | When freeze is invoked |
| **Voting enforcement** | E-03 | Post-freeze ballot gates |

This document **shall not** specify SQL statements, migration files, function names, React components, or scheduler cron definitions.

---

## 19. CITM alignment

E-02 architecture satisfies the **materialization and atomicity** aspects of:

| CITM Row | E-02 architecture contribution |
|----------|-------------------------------|
| **4** | Freeze atomic event — transaction model §13 · Freeze Contract |
| **5** | Immutability at freeze commit — INV-1 enforcement §14 · Recovery Model §5 |
| **12** | Freeze audit record — commit boundary §13 · Freeze Contract outputs |
| **1, 2** | Voter + resolution snapshot materialization — §6, §8, §11 |

Full CITM satisfaction for rows 1, 2, 5 requires E-03 enforcement and E-06 guardrails per Engineering Evidence Ledger.

---

## Document control

| Field | Value |
|-------|-------|
| **Document Type** | Architecture Authority |
| **Program** | E-02 — Freeze Engine |
| **Status** | Approved — Architecture Authority |
| **Revision** | v1.1 |
| **Authoritative Source** | [`M2-S3-Snapshot-Freeze-Design.md`](M2-S3-Snapshot-Freeze-Design.md) · [`E-01-Project-Certification.md`](E-01-Project-Certification.md) |
| **Verified** | YES |
| **Supersedes** | E-02 Architecture v1.0 (overview) |
| **Next Document** | [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) · Phase 1 → [`E-02-Phase-1-Implementation-Plan.md`](E-02-Phase-1-Implementation-Plan.md) |
| **Production Effect** | None |
| **Normative sections** | §2 Architecture Authority · §3 Freeze Authority · §4 Correlation Model · §5 Recovery Model · §6 Freeze Contract |

**Related:** [`E-01-Engineering-Baseline.md`](E-01-Engineering-Baseline.md) · [`M2-S3-Engineering-Work-Breakdown.md`](M2-S3-Engineering-Work-Breakdown.md) · [`ER-001`](ER-001-M2-S3-Blueprint-Review.md) · [`IA-001`](M2-S3-Implementation-Authorization.md)
