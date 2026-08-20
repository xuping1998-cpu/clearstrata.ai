# E-02 Phase 3 — Atomic Commit & Audit

## Implementation Plan

| Field | Value |
|-------|-------|
| **Document Type** | Phase Implementation Plan |
| **Program** | E-02 — Freeze Engine |
| **Phase** | E-02 Phase 3 — Atomic Commit & Audit |
| **Status** | **Approved** |
| **Revision** | v1.0 |
| **Authoritative Source** | [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) v1.0 |
| **Architecture Authority** | [`E-02-Architecture.md`](E-02-Architecture.md) v1.1 |
| **Upstream Certified Baseline** | [`E-02-Phase-2-Certification.md`](E-02-Phase-2-Certification.md) — Aggregate Snapshot Materialization Baseline |
| **Verified** | **YES** |
| **Supersedes** | None |
| **Previous Document** | [`E-02-Phase-2-Certification.md`](E-02-Phase-2-Certification.md) |
| **Next Document** | [`E-02-IU-3.1-Implementation.md`](E-02-IU-3.1-Implementation.md) |
| **Production Effect** | **None** |
| **Approval Date** | 2026-08-17 |

> **Scope lock:** Phase 3 consumes the Phase 2 **COMMIT_READY** hand-off and owns terminal **COMMITTED** state through atomic database commit, freeze marker, meeting transition, and primary freeze audit. Phase 3 **shall not** re-materialize snapshots from live sources. **No executable implementation** is authorized by this plan alone.

---

## 1. Purpose

Define the **authorized implementation plan** for **E-02 Phase 3 — Atomic Commit & Audit**.

Phase 3 **shall** consume the certified Phase 2 Aggregate Snapshot Materialization Baseline and finalize one authoritative Freeze Event within the Phase 1 atomic work envelope.

Phase 3 consists of three Implementation Units per [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) §8:

| IU | Title |
|----|-------|
| **IU-3.1** | Atomic Commit |
| **IU-3.2** | Primary Audit |
| **IU-3.3** | Idempotent Retry |

This document **shall implement** the approved Architecture Authority and parent Program Plan. It **shall not redefine** architecture decisions in [`E-02-Architecture.md`](E-02-Architecture.md).

---

## 2. Authoritative inputs

| Input | Role |
|-------|------|
| [`E-02-Architecture.md`](E-02-Architecture.md) v1.1 | Architecture Authority · §13 Atomic freeze model · INV-4 · INV-5 · INV-8 |
| [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) v1.0 | Program plan · Phase 3 IU registry |
| [`E-02-Phase-1-Certification.md`](E-02-Phase-1-Certification.md) | Certified transaction foundation |
| [`E-02-Phase-2-Implementation-Plan.md`](E-02-Phase-2-Implementation-Plan.md) v1.0 | Upstream phase plan |
| [`E-02-Phase-2-Completion.md`](E-02-Phase-2-Completion.md) | Phase 2 completion record |
| [`E-02-Phase-2-Certification.md`](E-02-Phase-2-Certification.md) | Certified Aggregate Snapshot Materialization Baseline |
| [`E-01-Project-Certification.md`](E-01-Project-Certification.md) | E-01 Snapshot Domain foundation |
| [`E-01-Engineering-Baseline.md`](E-01-Engineering-Baseline.md) | Schema head · immutability |
| [`RC010-B-Production-Freeze-Contract-Recovery.md`](../rc/RC010-B-Production-Freeze-Contract-Recovery.md) | Production Freeze Contract · PEC |
| [`M2-S3-Snapshot-Freeze-Design.md`](M2-S3-Snapshot-Freeze-Design.md) | Blueprint §10 · INV-4 · INV-5 · INV-8 |
| [`ENGINEERING-GOVERNANCE-v1.3.md`](ENGINEERING-GOVERNANCE-v1.3.md) | GR-7 · GR-8 |
| [`EPS-001-Engineering-Phase-Documentation-Standard.md`](EPS-001-Engineering-Phase-Documentation-Standard.md) | IU / Phase document chain |

### Repository evidence consulted (read-only)

| Artifact | Evidence use |
|----------|--------------|
| `public.owner_vote_freeze_events` | Freeze Event entity · `is_primary` · `frozen_at` · unique primary per meeting (migration `20261725120000`) |
| `public.owner_vote_voter_snapshot` | Staged voter rows · `freeze_event_id` correlation |
| `public.owner_vote_resolution_snapshot` | Staged header · one per `freeze_event_id` |
| `public.owner_vote_frozen_motions` | Staged motion set |
| `public.owner_vote_meetings.snapshot_frozen_at` | Production freeze handoff marker (migration `20261724120000`) |
| `public.owner_vote_meetings.status` | Meeting lifecycle enum · used in voting gate |
| Legacy RPC `freeze_owner_vote_snapshot` | Legacy voter-only freeze path — **not** E-02 commit authority |
| E-01 immutability triggers | Event-linked row protection post-commit (`20261728120000` et seq.) |

**Primary freeze audit persistence:** Referenced in Architecture (INV-5) and E-01 Program documentation (`owner_vote_audit_logs` / production audit path). **No dedicated primary-freeze-audit table verified in current migration head.** Resolved at IU Design Review via **CQ-003** — not assumed present.

---

## 3. Phase objective

**Consume the Phase 2 certified COMMIT_READY hand-off and atomically finalize one authoritative Freeze Event.**

```
COMMIT_READY
        ↓
Commit Preconditions
        ↓
Freeze Marker
        ↓
Meeting State / Phase Transition
        ↓
Primary Freeze Audit
        ↓
Atomic Database Commit
        ↓
COMMITTED
```

| # | Core objective |
|---|----------------|
| 1 | Receive Phase 2 complete materialized snapshot set |
| 2 | **Not** re-read live sources to rebuild snapshots |
| 3 | **Not** re-materialize voter / header / motions |
| 4 | Verify final commit prerequisites |
| 5 | Write authoritative freeze marker |
| 6 | Execute meeting freeze state / phase transition |
| 7 | Create exactly **one** primary freeze audit record |
| 8 | Commit all Phase 2 staged artifacts + Phase 3 commit artifacts in **one** atomic transaction |
| 9 | Transition Freeze Event to **COMMITTED** only after successful commit |
| 10 | Any pre-commit failure rolls back the entire Phase 1–3 atomic envelope |

**Normative separation:**

```
COMMIT_READY ≠ COMMITTED
```

Phase 3 is the **only** phase that owns the **COMMITTED** terminal state.

---

## 4. Certified upstream baseline

### Phase 1 certified baseline (consume · do not redefine)

| Element |
|---------|
| Freeze Event identity |
| Validation (**VALID** / **INVALID** / **IDEMPOTENT RETURN** / **RETRYABLE**) |
| Transaction ownership |
| Atomic work envelope |
| Rollback contract |
| Failure propagation |
| Idempotency · retry semantics |

### Phase 2 certified baseline (consume · do not redefine)

| Element |
|---------|
| Voter Snapshot Materialization Baseline |
| Resolution Snapshot Materialization Baseline |
| Frozen Motion Materialization Baseline |
| Aggregate correlation |
| **MI-1 – MI-8** |
| **MI-3 COMPLETE** at design-contract level (after aggregate gate) |
| **COMMIT_READY** hand-off |

**Authoritative rules:**

```
Phase 3 MUST NOT reconstruct the frozen state from live tables.
Phase 3 commits the already materialized authoritative frozen state.
```

---

## 5. Phase 3 system model

```
Phase 1 VALID + OPEN envelope
        ↓
Phase 2 MATERIALIZED → RESOLUTION_MATERIALIZED → MOTIONS_MATERIALIZED
        ↓
Phase 2 Aggregate Verification → MI-3 COMPLETE
        ↓
COMMIT_READY  ← Phase 2 terminal hand-off
        ↓
Phase 3 Commit Preconditions (CP-1 … CP-14)
        ↓
Authoritative Commit Set verified
        ↓
Freeze marker + meeting transition + primary audit staged
        ↓
Database COMMIT (single transaction)
        ↓
COMMITTED  ← Phase 3 terminal state
        ↓
Phase 4 (Repository Integration — blocked until Phase 3 Certification)
```

Phase 2 **materializes**. Phase 3 **commits**.

---

## 6. Phase 3 input contract

Phase 3 may begin **only** when **all** conditions hold:

| Condition | Requirement |
|-----------|-------------|
| `FreezeContext` exists | Complete |
| Validation result | **VALID** (authoritative · not silently downgraded) |
| Candidate `freezeEventId` | Exists |
| Transaction owner | Valid |
| Atomic envelope | Active |
| Phase 2 aggregate verification | **PASS** |
| IU-2.1 | **MATERIALIZED** |
| IU-2.2 | **RESOLUTION_MATERIALIZED** |
| IU-2.3 | **MOTIONS_MATERIALIZED** |
| **MI-1 – MI-8** | Satisfied |
| **MI-3** | **COMPLETE** |
| Transaction state | **COMMIT_READY** |
| Superseding committed primary | **None** |
| Transaction ownership conflict | **None** |

Any failure: **FAIL CLOSED**.

Phase 3 **shall not:** partial commit · repair snapshots during commit · regenerate snapshots · bypass Phase 2 completeness.

---

## 7. Phase 3 output contract

Successful output is one complete **terminal Freeze State**:

| # | Output |
|---|--------|
| 1 | Freeze Event becomes authoritative committed primary |
| 2 | Freeze marker persisted |
| 3 | Meeting freeze phase/state persisted |
| 4 | Exactly **one** primary freeze audit persisted |
| 5 | Phase 2 snapshot set remains correlated to same `freezeEventId` |
| 6 | Transaction commits atomically |
| 7 | `FreezeContext` terminal state = **COMMITTED** |

**COMMITTED** means all required commit artifacts became durable **together**.

The following **alone** do **not** constitute **COMMITTED:**

| Event | Not COMMITTED |
|-------|---------------|
| Snapshots inserted (staged) | ✓ |
| Marker written (pre-commit) | ✓ |
| Meeting phase changed (pre-commit) | ✓ |
| Audit written (pre-commit) | ✓ |

Only successful **database transaction COMMIT** produces **COMMITTED**.

---

## 8. Implementation unit breakdown

**Authority:** [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) §8 — **not** redefined by this plan.

### IU-3.1 — Atomic Commit

| Field | Value |
|-------|-------|
| **Purpose** | Commit all staged artifacts, meeting freeze marker, and phase transition atomically |
| **Architecture basis** | §13 Atomic freeze model · INV-4 · steps 5–6 |

**Responsibilities:**

- Consume **COMMIT_READY**
- Verify commit preconditions (§11)
- Verify transaction ownership and authoritative commit set (§9)
- Persist freeze marker (§12)
- Persist meeting freeze state / phase transition (§13)
- Stage/commit durable snapshot rows with event linkage
- Finalize primary Freeze Event row (`is_primary`, `frozen_at` alignment)
- Perform **database COMMIT** as terminal persistence gate
- Transition orchestration to **COMMITTED**
- **No** independent transaction outside Phase 1 envelope

**Local success:** durable atomic commit complete · **COMMITTED** orchestration state

**Does not alone own:** idempotent concurrent-attempt policy (IU-3.3) · primary audit authoring detail (IU-3.2 participates in same commit set)

### IU-3.2 — Primary Audit

| Field | Value |
|-------|-------|
| **Purpose** | Write exactly one primary freeze audit per successful commit (INV-5) |
| **Architecture basis** | INV-5 · Blueprint §10 step 7 |

**Responsibilities:**

- Define primary audit persistence target (repository-verified — **CQ-003**)
- Stage exactly **one** primary audit correlated to `freezeEventId`
- Prove freeze boundary · commit outcome · materialization completeness evidence
- Participate in same atomic commit set as IU-3.1
- Distinguish primary audit from diagnostic / retry telemetry

**Local success:** primary audit staged and durable after commit

### IU-3.3 — Idempotent Retry

| Field | Value |
|-------|-------|
| **Purpose** | Handle repeat and concurrent freeze attempts per INV-8 |
| **Architecture basis** | Recovery Model · Phase 1 idempotency baseline |

**Responsibilities:**

- **IDEMPOTENT RETURN** when committed primary already exists
- **RETRYABLE** when competing active transaction holds ownership
- Post-rollback retry → new attempt · new candidate Freeze Event identity
- Prevent duplicate primary Freeze Event · duplicate primary audit · second commit transaction
- Prevent Phase 2 re-run against committed event

**Execution order within Phase 3:** IU-3.1 → IU-3.2 → IU-3.3 design chain; IU-3.3 idempotency gates apply at Phase 3 entry and commit boundary.

---

## 9. Atomic commit set

The **Atomic Commit Set** is the complete durable artifact bundle that **must** commit together or not at all (INV-4).

| ID | Artifact | Repository anchor (verified / proposed) |
|----|----------|----------------------------------------|
| **A** | Freeze Event | `owner_vote_freeze_events` — primary row · `is_primary = true` |
| **B** | Voter Snapshot | `owner_vote_voter_snapshot` — event-linked rows |
| **C** | Resolution Snapshot | `owner_vote_resolution_snapshot` — one header |
| **D** | Frozen Motions | `owner_vote_frozen_motions` — complete N motion set |
| **E** | Freeze Marker | `owner_vote_meetings.snapshot_frozen_at` (+ alignment with `freezeBoundaryAt`) |
| **F** | Meeting state / phase transition | `owner_vote_meetings.status` (exact transition — **CQ-002**) |
| **G** | Primary Freeze Audit | Target TBD — **CQ-003** |

**Correlation requirements (all artifacts):**

| Dimension | Rule |
|-----------|------|
| `freezeEventId` | Same |
| `meetingId` | Same |
| `propertyId` | Same |
| Transaction attempt | Same |
| Logical freeze boundary | Same `freezeBoundaryAt` |
| Atomic envelope | Same Phase 1 ownership |

**Invalid partial states (prohibited):**

| Invalid state |
|---------------|
| Snapshots committed but audit missing |
| Marker committed but snapshots missing |
| Meeting frozen but audit missing |
| Audit committed against incomplete snapshot set |
| Two primary Freeze Events for same meeting boundary |
| Two primary audits for same authoritative freeze |

---

## 10. Commit preconditions

Final commit preconditions — **all PASS** required before commit sequence:

| ID | Precondition |
|----|--------------|
| **CP-1** | Freeze Event identity valid |
| **CP-2** | Phase 1 validation still authoritative (**VALID**) |
| **CP-3** | Transaction ownership valid |
| **CP-4** | Atomic envelope active |
| **CP-5** | Phase 2 aggregate **PASS** |
| **CP-6** | Voter snapshot complete |
| **CP-7** | Resolution snapshot complete (exactly one header) |
| **CP-8** | Frozen motions complete |
| **CP-9** | All correlation invariants **PASS** |
| **CP-10** | No superseding committed primary |
| **CP-11** | Freeze marker not conflicting |
| **CP-12** | Meeting transition valid |
| **CP-13** | Primary audit can be created |
| **CP-14** | **COMMIT_READY** state valid |

Any failure → **FAIL CLOSED** → Phase 1 rollback authority.

---

## 11. Commit sequence

Deterministic commit sequence (orchestration level):

```
1. Receive COMMIT_READY
2. Verify commit preconditions (CP-1 … CP-14)
3. Lock / verify transaction ownership
4. Verify authoritative commit set completeness
5. Persist freeze marker (pre-commit within envelope)
6. Persist meeting transition (pre-commit within envelope)
7. Stage primary freeze audit (pre-commit within envelope)
8. Verify commit-set completeness (A … G)
9. Mark Freeze Event as committed primary (is_primary / frozen_at alignment)
10. DATABASE COMMIT (single transaction)
11. Set orchestration terminal state COMMITTED
12. Return committed result
```

**Critical rule:** Steps 5–9 occur **inside** the same transaction envelope. Until step 10 succeeds, **no durable partial freeze** exists.

---

## 12. Freeze marker contract

### Repository evidence

| Field | Table | Status |
|-------|-------|--------|
| `snapshot_frozen_at` | `owner_vote_meetings` | **Verified** — E-01 migration `20261724120000` · RC010-B §7.6 handoff marker |
| `frozen_at` | `owner_vote_freeze_events` | **Verified** — commit instant column; comment notes alignment with meeting marker at E-02 write time |
| `is_primary` | `owner_vote_freeze_events` | **Verified** — partial unique index `owner_vote_freeze_events_one_primary_per_meeting` |

### Plan contract

| Rule | Requirement |
|------|-------------|
| **Ownership** | Phase 3 (IU-3.1) |
| **Write timing** | Only after Phase 2 aggregate completeness · within commit transaction · not before **COMMIT_READY** |
| **Value authority** | Align with envelope `freezeBoundaryAt` — **CQ-006** resolves exact write semantics at IU Design Review |
| **Correlation** | Same `meetingId` · same `freezeEventId` |
| **Idempotency** | Existing committed primary → **IDEMPOTENT RETURN** (IU-3.3) — no marker rewrite |
| **Rollback** | Marker write rolled back with full envelope on failure |

Freeze marker **shall not** precede Phase 2 aggregate completeness.

---

## 13. Meeting transition contract

Phase 3 **shall** transition the owner-vote meeting from pre-freeze authoring to the Architecture-authoritative frozen / post-freeze governance state.

### Repository evidence

| Field | Evidence |
|-------|----------|
| `owner_vote_meetings.status` | `owner_vote_meeting_status` enum · referenced in voting RPC gate |
| Architecture | Transition to frozen / voting-eligible on successful commit only |

### Plan contract

| Rule | Requirement |
|------|-------------|
| **Authority** | Architecture §13 step 6 · **CQ-002** closes exact enum transition |
| **Timing** | Within same commit transaction as marker and snapshots |
| **Scope** | Governance marker only — **not** E-03 ballot authorization |
| **Failure** | No transition on rollback · meeting remains authoring |

**Meeting transition does not open voting.** E-03 owns voting semantics.

---

## 14. Primary freeze audit contract

### Architecture requirement (INV-5)

Exactly **one** authoritative primary freeze audit per committed Freeze Event.

### Repository status

| Finding | Detail |
|---------|--------|
| Architecture / Blueprint | Primary audit required at commit boundary |
| E-01 Program documentation | References production audit path (`owner_vote_audit_logs` / `snapshot_frozen`) |
| Current migration head | **No verified dedicated primary-freeze-audit table** in repository |

**CQ-003** **shall** resolve persistence target at IU-3.2 Design Review. This plan **does not** invent schema.

### Audit shall prove (minimum evidence)

| Evidence element |
|------------------|
| `freezeEventId` |
| `meetingId` |
| `propertyId` |
| Freeze boundary |
| Commit timestamp |
| Committed primary identity |
| Materialization completeness summary |
| Transaction outcome |

### Distinctions

| Type | Role |
|------|------|
| **Primary Freeze Audit** | Part of atomic commit set (artifact **G**) |
| Diagnostic logs | Failure / retry telemetry — **not** primary audit |
| Retry telemetry | IU-3.3 — **not** primary audit |

---

## 15. Rollback contract

Phase 3 **continues** to obey the Phase 1 Rollback Contract.

```
Pre-commit failure
        ↓
ROLLING_BACK
        ↓
rollback entire envelope
        ↓
ROLLED_BACK
```

Rollback **must** cover:

| Domain |
|--------|
| Phase 2 voter snapshot rows |
| Resolution Snapshot header |
| Frozen Motions |
| Phase 3 freeze marker writes |
| Meeting transition writes |
| Primary audit staging |
| Staged Freeze Event terminal changes |

**No partial freeze** may survive.

After successful **COMMITTED** commit: **terminal** for this attempt. Correction → **E-06** only.

**Runtime rollback behavior:** **PENDING VERIFICATION** at Engineering Implementation Review.

---

## 16. Failure propagation

| Failure class | Response |
|---------------|----------|
| Commit precondition failure | **FAIL CLOSED** → rollback |
| Commit set incomplete | **FAIL CLOSED** → rollback |
| Marker / transition / audit staging failure | **FAIL CLOSED** → rollback |
| Database COMMIT failure | **FAIL CLOSED** → rollback |
| Ownership loss | **FAIL CLOSED** → rollback |
| Correlation drift detected | **FAIL CLOSED** → rollback |

Phase 3 **shall not** convert failure to partial success.

---

## 17. Idempotency · retry · concurrency

Consumes Phase 1 certified semantics:

| Condition | Phase 3 behavior |
|-----------|------------------|
| Existing committed primary | **IDEMPOTENT RETURN** — Phase 3 does not re-commit |
| Active competing transaction | **RETRYABLE** — Phase 3 does not execute |
| Failed + fully rolled back attempt | New attempt · **new** candidate Freeze Event identity |

**Prohibited:**

| Prohibition |
|-------------|
| Reuse abandoned `freezeEventId` |
| Open second commit transaction |
| Duplicate primary audit |
| Duplicate primary Freeze Event |
| Re-run Phase 2 against committed event |

**Runtime verification:** **PENDING** (IU-3.3 · Engineering Implementation Review).

---

## 18. FreezeContext contract

### Consumed (immutable from upstream)

| Element |
|---------|
| `freezeEventId` · `meetingId` · `propertyId` |
| Attempt identity · validation state |
| Transaction ownership · `freezeBoundaryAt` |
| IU-2.1 / IU-2.2 / IU-2.3 results |
| `resolutionSnapshotId` |
| Phase 2 aggregate result · **COMMIT_READY** |

### May add (subordinate)

| Element |
|---------|
| Commit verification state |
| Marker state · meeting transition state |
| Primary audit identity |
| Commit timestamp |
| Terminal transaction state (**COMMITTED**) |

### Shall not modify

| Prohibited modification |
|-------------------------|
| Frozen voter content |
| Frozen resolution identity |
| Frozen motion content |
| Phase 2 provenance |
| `freezeBoundaryAt` |
| Original validation decision |

---

## 19. COMMITTED state contract

**COMMITTED requires:**

| Requirement |
|-------------|
| Database **COMMIT** succeeded |
| Authoritative Freeze Event durable · primary |
| All snapshots durable |
| Freeze marker durable |
| Meeting transition durable |
| Primary audit durable |
| Correlation intact |
| Uniqueness intact |

**COMMITTED is:**

| Property |
|----------|
| Terminal for this freeze attempt |
| Immutable historical freeze identity |
| Authoritative downstream input |

**COMMITTED is not:**

| Misinterpretation |
|-------------------|
| Voting open |
| Ballot eligibility decision |
| Scheduler completion |
| Correction mechanism |

---

## 20. Phase 3 → Phase 4 hand-off

After Phase 3 Certification, Phase 4 **Repository Integration** may consume **committed event-linked** snapshot bundles through E-01 typed repository (`FrozenMeetingBundle`).

| Hand-off element |
|------------------|
| Committed `freezeEventId` |
| Event-linked voter · resolution · motion rows |
| Primary audit record |
| Meeting freeze marker · transitioned status |
| Immutable post-commit state per E-01 |

Phase 4 **blocked until** Phase 3 Certification.

---

## 21. Program invariants

### Preserved upstream

| Set | Status |
|-----|--------|
| **PI-1 – PI-5** | PRESERVED |
| **MI-1 – MI-8** | PRESERVED |

### Phase 3 commit invariants (CI-1 – CI-10)

| ID | Invariant | Status at plan approval |
|----|-----------|-------------------------|
| **CI-1** | Single Authoritative Commit — exactly one committed primary Freeze Event per meeting freeze boundary | **DEFINED** |
| **CI-2** | Atomic Commit Set — all required artifacts commit together or none | **DEFINED** |
| **CI-3** | Complete Before Commit — **COMMIT_READY** requires complete certified materialization | **DEFINED** |
| **CI-4** | Exactly One Primary Audit — one primary audit per committed Freeze Event | **DEFINED** |
| **CI-5** | Marker Atomicity — freeze marker cannot survive without complete committed snapshot set | **DEFINED** |
| **CI-6** | Meeting Transition Atomicity — meeting freeze transition cannot survive without committed Freeze Event | **DEFINED** |
| **CI-7** | Stable Correlation — `freezeEventId` / `meetingId` / `propertyId` identical across commit set | **DEFINED** |
| **CI-8** | No Live Reconstruction — Phase 3 does not rebuild from mutable live sources | **DEFINED** |
| **CI-9** | Commit Terminality — **COMMITTED** cannot transition back to pre-commit states | **DEFINED** |
| **CI-10** | Fail Closed — any pre-commit inconsistency aborts entire transaction | **DEFINED** |

**CI-1 – CI-10** formally confirmed at each IU Design Review and Phase 3 Certification.

---

## 22. Engineering risks

Continuing E-02 numbering from R-047:

| ID | Risk | Condition | Consequence | Mitigation | Verification gate |
|----|------|-----------|-------------|------------|-------------------|
| **R-048** | Partial Commit | COMMIT without full set | Durable inconsistent freeze | INV-4 · CI-2 · single transaction | Forced-failure EIR |
| **R-049** | Duplicate Primary Commit | Concurrent winners | Two primaries | INV-8 · unique index · IU-3.3 | Concurrency EIR |
| **R-050** | Missing Primary Audit | Audit skipped | Unaudited freeze | INV-5 · CI-4 · CP-13 | Audit EIR |
| **R-051** | Marker / Snapshot Divergence | Marker without snapshots | False frozen meeting | CI-5 · atomic set | Rollback EIR |
| **R-052** | Meeting State Divergence | Status change without commit | Governance drift | CI-6 · CP-12 | Transition EIR |
| **R-053** | Correlation Drift | Mismatched ids across set | Invalid instrument | CI-7 · CP-9 | Correlation EIR |
| **R-054** | Commit After Stale Ownership | Ownership lost mid-commit | Split envelope | CP-3 · Phase 1 envelope | Ownership EIR |
| **R-055** | Retry Reuses Abandoned Identity | Same id after rollback | Corrupt history | IU-3.3 · Phase 1 retry rules | Retry EIR |
| **R-056** | COMMIT_READY Misread as COMMITTED | Early terminal state | Premature downstream | Normative separation §19 | State machine EIR |
| **R-057** | Live State Reconstruction During Commit | Re-read live tables | Non-frozen instrument | CI-8 · Phase 2 baseline | Source-read EIR |

---

## 23. Design questions (CQ-001 – CQ-012)

| ID | Question | Proposed resolution | Expected | Status |
|----|----------|---------------------|----------|--------|
| **CQ-001** | What exact field(s) constitute the authoritative freeze marker? | `owner_vote_meetings.snapshot_frozen_at` + aligned `owner_vote_freeze_events.frozen_at` | Repository-verified marker set | **PROPOSED** |
| **CQ-002** | What exact meeting state/phase transition is required at commit? | Transition from authoring to Architecture frozen / voting-eligible enum value on `owner_vote_meetings.status` | Exact enum at IU-3.1 Design Review | **PROPOSED** |
| **CQ-003** | Which table/entity stores the primary freeze audit? | E-01 references production audit path; **no table in migration head** — IU-3.2 must verify or authorize schema extension | Repository evidence required | **OPEN → IU-3.2** |
| **CQ-004** | What uniqueness rule guarantees exactly one primary audit? | One audit row per `freezeEventId` / meeting boundary — exact constraint TBD with CQ-003 target | IU-3.2 Design Review | **PROPOSED** |
| **CQ-005** | What operation marks Freeze Event as committed primary? | Persist / finalize `owner_vote_freeze_events` with `is_primary = true` under `owner_vote_freeze_events_one_primary_per_meeting` | Unique index verified | **PROPOSED** |
| **CQ-006** | What is the authoritative commit timestamp? | Envelope `freezeBoundaryAt` written to marker + event `frozen_at` + audit | Align with Phase 2 baseline | **PROPOSED** |
| **CQ-007** | What locks/constraints prevent concurrent primary commit? | Phase 1 ownership + `is_primary` partial unique index + IU-3.3 concurrency contract | INV-8 | **PROPOSED** |
| **CQ-008** | Can an already committed event re-enter Phase 3? | **NO** — **IDEMPOTENT RETURN** | **NO** | **PROPOSED** |
| **CQ-009** | May Phase 3 query live voter/resolution sources to reconstruct snapshots? | **NO** | **NO** | **PROPOSED** |
| **CQ-010** | Does writing the freeze marker alone mean COMMITTED? | **NO** | **NO** | **PROPOSED** |
| **CQ-011** | Does meeting transition open voting? | **NO** — E-03 owns voting | **NO** | **PROPOSED** |
| **CQ-012** | What commit-set verification must pass immediately before COMMIT? | CP-1 … CP-14 + atomic set A … G completeness | IU-3.1 Design Review | **PROPOSED** |

**CQ-003** is the primary open repository question. Remaining CQs close at IU Design Reviews.

---

## 24. Verification strategy

Each Phase 3 IU **shall** follow:

```
Implementation Design
        ↓
Design Review
        ↓
Implementation Review
        ↓
Completion
```

Phase 3 closure:

```
IU-3.1 Completion + IU-3.2 Completion + IU-3.3 Completion
        ↓
E-02-Phase-3-Completion.md
        ↓
E-02-Phase-3-Certification.md
```

### Executable Engineering Implementation Review obligations (pending)

| Category | Obligations |
|----------|-------------|
| Transaction | Atomic DB transaction · forced failure before/after marker · after transition · after audit staging |
| Rollback | Removes all Phase 2/3 artifacts · no partial durable rows |
| Uniqueness | Duplicate primary prevention · duplicate audit prevention |
| Concurrency | Concurrent freeze attempts · idempotent committed return |
| Retry | After rollback · new identity · no abandoned reuse |
| Boundary | **COMMIT_READY** / **COMMITTED** separation · correlation preservation |
| Atomicity | Marker · meeting transition · audit atomicity |

**These are executable verification obligations — not passed runtime tests at plan approval.**

---

## 25. Phase 3 success criteria

Phase 3 design/readiness complete when:

| # | Criterion |
|---|-----------|
| 1 | Commit preconditions defined |
| 2 | Atomic commit set defined |
| 3 | Freeze marker contract defined |
| 4 | Meeting transition contract defined |
| 5 | Primary audit contract defined |
| 6 | Deterministic commit sequence defined |
| 7 | Rollback integration defined |
| 8 | Idempotency/concurrency behavior defined |
| 9 | **COMMITTED** contract defined |
| 10 | **CI-1 – CI-10** preserved |
| 11 | All Phase 3 IUs completed |
| 12 | Phase 3 Completion issued |
| 13 | Phase 3 Certification issued |
| 14 | No unresolved blocking architecture semantics |

---

## 26. Entry criteria

| Criterion | Status |
|-----------|--------|
| E-01 Snapshot Foundation certified | **YES** |
| E-02 Architecture Authority current | **YES** |
| E-02 Phase 1 **CERTIFIED COMPLETE** | **YES** |
| E-02 Phase 2 **CERTIFIED COMPLETE** | **YES** |
| Phase 2 Aggregate Snapshot Materialization Baseline certified | **YES** |
| **COMMIT_READY** contract certified | **YES** |
| This Phase 3 Plan approved | **YES** (this document) |

---

## 27. Exit criteria

| Criterion | Requirement |
|-----------|-------------|
| All Phase 3 IUs | **COMPLETED** |
| **CI-1 – CI-10** | **PRESERVED** |
| Atomic commit design | Complete |
| Marker / transition / audit contracts | Complete |
| **COMMITTED** terminal contract | Complete |
| Blocking Review Actions | **NONE** |
| [`E-02-Phase-3-Completion.md`](E-02-Phase-3-Completion.md) | Issued |
| [`E-02-Phase-3-Certification.md`](E-02-Phase-3-Certification.md) | Issued |

Phase 4 remains **blocked** until Phase 3 Certification.

---

## 28. Phase boundary

### In scope

| Activity |
|----------|
| Final commit verification |
| Freeze marker |
| Meeting freeze transition |
| Primary freeze audit |
| Atomic commit |
| **COMMITTED** terminal state |
| Rollback integration |
| Idempotent committed result |
| Commit concurrency protection |

### Out of scope

| Activity | Owner |
|----------|-------|
| Snapshot materialization | Phase 2 (complete) |
| Voter eligibility redesign | — |
| Resolution authoring | — |
| Voting / ballots / tally | **E-03** |
| Scheduler | **E-04** |
| UI | — |
| Repository adoption (unless Program Plan assigns here) | Phase 4 |
| Historical correction | **E-06** |
| E-03 implementation | Blocked on E-02 Project Certification |
| Production deployment | Phase 5 |

---

## 29. E-03 boundary

**Phase 3 COMMITTED** means the authoritative frozen governance state is durably established.

**It does NOT mean** voting has opened.

E-03 may consume the certified committed snapshot **only after** E-02 reaches the required **Project Certification** gate.

Phase 3 **shall not** introduce ballot or voting behavior.

---

## 30. Documentation lifecycle

```
E-02 Phase 3 Implementation Plan (this document)
        ↓
IU-3.1 Implementation → Design Review → Implementation Review → Completion
        ↓
IU-3.2 Implementation → Design Review → Implementation Review → Completion
        ↓
IU-3.3 Implementation → Design Review → Implementation Review → Completion
        ↓
E-02 Phase 3 Completion
        ↓
E-02 Phase 3 Certification
        ↓
E-02 Phase 4 Implementation Plan (blocked until Phase 3 Certification)
```

---

## 31. Next authorized step

| Field | Value |
|-------|-------|
| **Next authorized document** | [`E-02-IU-3.1-Implementation.md`](E-02-IU-3.1-Implementation.md) |
| **IU-3.1 title** | Atomic Commit |

IU-3.1 Implementation **shall not** be created by this plan document.

---

## 32. EPS-001 compliance

| Requirement | Status |
|-------------|--------|
| Document identity | ✓ |
| Authoritative inputs | ✓ |
| Phase objective | ✓ |
| IU breakdown | ✓ |
| Invariants · risks · design questions | ✓ |
| Verification strategy | ✓ |
| Entry / exit criteria | ✓ |
| Phase boundary | ✓ |
| Next-document gate | ✓ |
| Plan vs Certification separation | ✓ |
| Executable scope explicitly deferred | ✓ |

**EPS-001 status:** **COMPLIANT**

---

## 33. Confirmation

| Statement | Confirmed |
|-----------|-----------|
| Documentation only | ✓ |
| No application code | ✓ |
| No SQL | ✓ |
| No migrations | ✓ |
| No RPC | ✓ |
| No database changes | ✓ |
| No production changes | ✓ |
| No Phase 3 executable implementation | ✓ |
| No E-03 work | ✓ |
| Architecture Authority unchanged | ✓ |
| Phase 1 / Phase 2 certified records unchanged | ✓ |

**Next authorized step:** [`E-02-IU-3.1-Implementation.md`](E-02-IU-3.1-Implementation.md)

---

## Document control

| Field | Value |
|-------|-------|
| **Document Type** | Phase Implementation Plan |
| **Program** | E-02 — Freeze Engine |
| **Phase** | E-02 Phase 3 — Atomic Commit & Audit |
| **Status** | Approved |
| **Revision** | v1.0 |
| **Approval Date** | 2026-08-17 |
| **Production Effect** | None |

**Related:** [`E-02-Phase-2-Certification.md`](E-02-Phase-2-Certification.md) · [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) · [`E-02-Architecture.md`](E-02-Architecture.md) · [`EPS-001-Engineering-Phase-Documentation-Standard.md`](EPS-001-Engineering-Phase-Documentation-Standard.md)
