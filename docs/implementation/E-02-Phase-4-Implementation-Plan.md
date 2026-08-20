# E-02 Phase 4 Implementation Plan — Repository Integration

| Field | Value |
|-------|-------|
| **Document Type** | Phase Implementation Plan |
| **Program** | E-02 — Freeze Engine |
| **Phase** | E-02 Phase 4 — Repository Integration |
| **Status** | **Approved** |
| **Revision** | v1.0 |
| **Approval Date** | 2026-08-18 |
| **Authoritative Source** | [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) v1.0 |
| **Architecture Authority** | [`E-02-Architecture.md`](E-02-Architecture.md) v1.1 |
| **Upstream Certified Baselines** | [`E-02-Phase-1-Certification.md`](E-02-Phase-1-Certification.md) · [`E-02-Phase-2-Certification.md`](E-02-Phase-2-Certification.md) · [`E-02-Phase-3-Certification.md`](E-02-Phase-3-Certification.md) |
| **Scope** | Engineering Design / Repository Integration Planning |
| **Executable Implementation** | **NOT STARTED** |
| **Runtime Verification** | **PENDING** |
| **Production** | **UNCHANGED** |
| **Executable Final COMMIT Path** | **BLOCKED** |
| **Verified** | **YES** |
| **Previous Document** | [`E-02-Phase-3-Certification.md`](E-02-Phase-3-Certification.md) |
| **Next Document** | [`E-02-IU-4.1-Implementation.md`](E-02-IU-4.1-Implementation.md) |
| **Production Effect** | **None** |

> **Scope lock:** Phase 4 integrates certified Phase 1–3 freeze orchestration contracts with repository / domain / service boundaries. It **does not** redefine Architecture Authority, **does not** lift the Primary Audit executable blocker, and **does not** authorize production DB COMMIT, migration creation, or E-03 voting work by this plan alone.

> **Integration principle:** **INTEGRATE CERTIFIED CONTRACTS, NOT REDEFINE THEM.**

---

## 1. Document Control

| Field | Value |
|-------|-------|
| **Document Type** | Phase Implementation Plan |
| **Program** | E-02 — Freeze Engine |
| **Phase** | Phase 4 — Repository Integration |
| **Status** | Approved |
| **Revision** | v1.0 |
| **Approval Date** | 2026-08-18 |
| **Production Effect** | None |

**Related:** [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) · [`E-02-Phase-3-Certification.md`](E-02-Phase-3-Certification.md) · [`E-01-IU-4.1-Completion.md`](E-01-IU-4.1-Completion.md) · [`EPS-001-Engineering-Phase-Documentation-Standard.md`](EPS-001-Engineering-Phase-Documentation-Standard.md) · [`CES-003-Frontend-Engineering-Standard.md`](CES-003-Frontend-Engineering-Standard.md) §15

---

## 2. Purpose

Define the **authorized implementation plan** for **E-02 Phase 4 — Repository Integration**.

Phase 4 maps the **Certified Phase 1–3 freeze orchestration contracts** onto repository, domain, persistence, orchestration, and consumer-entry integration boundaries — forming the executable-integration baseline required before Phase 5 verification and acceptance.

This document **shall implement** the approved Program Plan §Phase 4 and Architecture Authority CM-7 / Repository First. It **shall not redefine** architecture decisions in [`E-02-Architecture.md`](E-02-Architecture.md).

| Phase 4 role | Action |
|--------------|--------|
| Consume certified Phase 1–3 baselines | ✓ |
| Plan repository integration layers | ✓ |
| Document repository investigation evidence | ✓ |
| Define RI4 invariants and integration questions | ✓ |
| Authorize IU-4.1 · IU-4.2 execution chain | ✓ |

| This plan is **not** | |
|----------------------|---|
| Executable implementation | |
| Migration / SQL / RPC creation | |
| Runtime COMMITTED certification | |
| E-02 Project Certification | |
| E-03 authorization | |

---

## 3. Authority

| Input | Role |
|-------|------|
| [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) v1.0 | **Highest authority** — Phase 4 scope · IU registry · completion criteria |
| [`E-02-Architecture.md`](E-02-Architecture.md) v1.1 | Architecture Authority — CM-7 · Repository First · atomic model |
| [`E-02-Phase-1-Certification.md`](E-02-Phase-1-Certification.md) | Certified transaction foundation |
| [`E-02-Phase-2-Certification.md`](E-02-Phase-2-Certification.md) | Certified Aggregate Snapshot Materialization Baseline |
| [`E-02-Phase-3-Certification.md`](E-02-Phase-3-Certification.md) | Certified Atomic Commit & Audit Baseline |
| [`E-02-Phase-1-Implementation-Plan.md`](E-02-Phase-1-Implementation-Plan.md) | Phase 1 IU boundaries |
| [`E-02-Phase-2-Implementation-Plan.md`](E-02-Phase-2-Implementation-Plan.md) | Phase 2 materialization boundaries |
| [`E-02-Phase-3-Implementation-Plan.md`](E-02-Phase-3-Implementation-Plan.md) | Phase 3 commit/audit boundaries · Phase 4 hand-off §20 |
| [`E-02-IU-3.1-Completion.md`](E-02-IU-3.1-Completion.md) | Atomic Commit Preparation Baseline |
| [`E-02-IU-3.2-Completion.md`](E-02-IU-3.2-Completion.md) | Primary Audit Baseline |
| [`E-02-IU-3.3-Completion.md`](E-02-IU-3.3-Completion.md) | Idempotent Retry & Final Commit Orchestration Baseline |
| [`E-01-IU-4.1-Completion.md`](E-01-IU-4.1-Completion.md) | Existing typed read repository |
| [`E-01-Project-Certification.md`](E-01-Project-Certification.md) | Snapshot Domain schema foundation |
| [`CES-003-Frontend-Engineering-Standard.md`](CES-003-Frontend-Engineering-Standard.md) | Repository First Rule §15 |
| [`EPS-001-Engineering-Phase-Documentation-Standard.md`](EPS-001-Engineering-Phase-Documentation-Standard.md) | Document chain |

**IU numbering and titles** follow Program Plan §8 exactly. No alternate IU registry is introduced.

---

## 4. Certified Upstream Baseline

| Baseline | Status | Phase 4 consumption |
|----------|--------|----------------------|
| E-02 Phase 1 — Freeze Transaction Foundation | **CERTIFIED COMPLETE** | Transaction ownership · Freeze Event identity · validation · envelope |
| E-02 Phase 2 — Aggregate Snapshot Materialization | **CERTIFIED COMPLETE** | Voter · resolution · motion materialization · **COMMIT_READY** |
| E-02 Phase 3 — Atomic Commit & Audit | **CERTIFIED COMPLETE** | A–G · state boundaries · Primary Audit logic · idempotency · **COMMITTED** authority |
| E-01 Snapshot Domain | **CERTIFIED COMPLETE** | Schema · immutability · typed read repository |
| Executable Final COMMIT Path | **BLOCKED** | **Preserved — not lifted by this plan** |

### Permanent inherited invariants (Phase 1–3)

```
NO PRIMARY AUDIT → NO COMMITTED FREEZE

COMMIT_READY
≠ COMMIT_SET_VERIFIED
≠ COMMIT_PREPARED
≠ AUDIT_PREPARED
≠ COMMIT_AUTHORIZED
≠ COMMITTING
≠ COMMITTED

Artifact F = VERIFY-ONLY
E-02 MUST NOT UPDATE owner_vote_meetings.status as part of freeze commit
snapshot_frozen_at = governance freeze marker
Client acknowledgement ≠ COMMITTED authority
COMMIT_OUTCOME_UNCERTAIN → DURABLE RECONCILIATION FIRST
Rolled-back attemptId / freezeEventId / primaryAuditId NEVER reused
No live reconstruction of already-frozen governance truth
```

Phase 4 repository integration **MUST NOT bypass** these invariants.

---

## 5. Phase Objective

**Integrate certified Phase 1–3 freeze orchestration contracts with repository / domain / service boundaries** so that:

1. Committed event-linked snapshot bundles are readable through the E-01 typed repository (CM-7 · CES-003 §15).
2. Correlation, composite **COMMITTED** authority, idempotency outcomes, and no-live-reconstruction rules are expressible at the repository boundary.
3. Legacy freeze paths are identified, isolated, and prevented from bypassing E-02 certified orchestration.
4. Executable prerequisites (Primary Audit persistence · transaction orchestration · ownership · reconciliation) have explicit disposition for downstream implementation.

Phase 4 **does not re-design**:

- Freeze Event identity · **FreezeContext**
- Phase 1 transaction ownership
- Phase 2 materialization semantics
- Phase 3 Atomic Commit · Primary Audit · idempotency / retry semantics
- **COMMITTED** composite authority

---

## 6. Repository Investigation

Investigation performed **read-only** on 2026-08-18 against repository source and migration head.

### A. Snapshot domain tables (migration head)

| Table / column | Repository evidence | Notes |
|----------------|---------------------|-------|
| `owner_vote_voter_snapshot` | ✓ Schema + immutability triggers | `freeze_event_id` nullable — legacy rows use `meeting_id` only |
| `owner_vote_resolution_snapshot` | ✓ Schema + immutability | One header per `freeze_event_id` |
| `owner_vote_frozen_motions` | ✓ Schema + immutability | Event-linked motion set |
| `owner_vote_freeze_events` | ✓ `20261725120000` | `is_primary` · `frozen_at` · unique primary per meeting index |
| `owner_vote_meetings.snapshot_frozen_at` | ✓ `20261724120000` | Governance freeze marker |
| Primary Audit physical table | ✗ **Not at migration head** | Confirms Phase 3 persistence gap |

### B. Existing repository / service abstractions

| Location | Role | Write? |
|----------|------|--------|
| `src/lib/ownerVote/snapshotDomain/` | E-01 typed **read-only** dual-snapshot repository | **No** |
| `frozenMeetingBundleRepository.ts` | `FrozenMeetingBundleRepository` — load by meeting or freeze event | **No** |
| `src/features/meetings/api.ts` | Direct Supabase client — meetings · resolutions · voting | **Mixed** |
| `src/pages/meeting/MeetingDetail.tsx` | UI + direct RPC for legacy freeze | **Yes (legacy)** |
| `src/components/meetings/MeetingOwnerVoteCouncilSection.tsx` | Direct RPC for legacy freeze | **Yes (legacy)** |

**Finding:** E-01 read repository exists. **No E-02 write/orchestration repository** exists. **No unified owner-vote freeze orchestration abstraction** exists.

### C. Database access pattern

| Pattern | Present | Usage |
|---------|---------|-------|
| Direct Supabase browser client (`.from()`) | ✓ | Primary pattern in `features/meetings/api.ts` |
| RPC (`.rpc()`) | ✓ | Legacy freeze · voting · governance |
| Typed read repository | ✓ | `snapshotDomain` — **not yet consumed by UI** |
| Service abstraction for freeze orchestration | ✗ | **Gap** |
| Server-side transaction holder | ✗ | **Gap** |

**Finding:** **Mixed** — direct client + RPC dominate production paths; E-01 repository is isolated read layer.

### D. Transaction boundary

| Capability | Evidence |
|------------|----------|
| Phase 1 + 2 + 3 single DB transaction in TypeScript | **Not found** |
| Browser Supabase client multi-statement transaction | **Not supported** — each REST call is independent |
| PostgreSQL RPC as transaction envelope | **Possible** — no E-02 orchestration RPC at migration head |
| E-02 orchestration module | **Not found** |

**Finding:** **Repository Integration Gap — Atomic Transaction Envelope.** Certified Phase 1–3 contract requires single atomic envelope; **no executable mechanism exists in application layer**.

### E. Legacy freeze path

| Artifact | Evidence |
|----------|----------|
| RPC `freeze_owner_vote_snapshot` | Invoked from `MeetingDetail.tsx` · `MeetingOwnerVoteCouncilSection.tsx` |
| RPC definition in repo migrations | **Not present** — live production contract per RC010-B |
| Behavior (documented) | Builds voter snapshot from live `property_members`; sets `snapshot_frozen_at`; allows re-freeze rebuild |
| E-02 authority | IU-3.1 Implementation Review: **E-02 must not invoke** legacy RPC |
| Resolution / motion population | Legacy path does **not** populate resolution snapshot or frozen motions (0 rows at E-01 acceptance) |

**Finding:** Active **legacy executable bypass path** exists in production UI. Phase 4 must plan isolation / retirement without deleting legacy code in this planning task.

---

## 7. Current Repository Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Consumer / Entry Layer (today)                              │
│  MeetingDetail · MeetingOwnerVoteCouncilSection · api.ts    │
│  → direct supabase.rpc('freeze_owner_vote_snapshot')        │
│  → direct supabase.from(...)                                │
└──────────────────────────┬──────────────────────────────────┘
                           │ (no E-02 orchestration)
┌──────────────────────────▼──────────────────────────────────┐
│ E-01 Read Repository (exists · unused by consumers)         │
│  src/lib/ownerVote/snapshotDomain/                          │
│  FrozenMeetingBundleRepository — SELECT / map / validate    │
│  readMode: legacy_meeting | event_linked                    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Persistence (PostgreSQL via PostgREST)                      │
│  owner_vote_* snapshot tables · freeze_events · meetings    │
└─────────────────────────────────────────────────────────────┘

Missing layers (Phase 4 must plan):
  · Domain Contract Layer (FreezeContext · outcomes · COMMITTED evidence)
  · Persistence Write Layer (staging · marker · audit · commit)
  · Orchestration Layer (Phase 1→2→3 sequence · rollback · idempotency)
  · E-02 Consumer Entry (authorized path into orchestration)
```

---

## 8. Integration Gap Analysis

| Gap ID | Gap | Severity | Phase 4 disposition |
|--------|-----|----------|---------------------|
| **GAP-01** | No E-02 orchestration repository / service | **Critical** | Plan orchestration layer contract; executable owner TBD at IU Design Review |
| **GAP-02** | No atomic transaction envelope in app layer | **Critical** | Plan server-side RPC or equivalent; browser client insufficient alone |
| **GAP-03** | Primary Audit physical table absent | **Critical** | Plan persistence target; migration **not authorized by this plan** |
| **GAP-04** | No durable ownership mechanism | **High** | Plan ownership persistence; mark EXECUTABLE PREREQUISITE |
| **GAP-05** | No durable reconciliation mechanism | **High** | Plan reconciliation queries; mark EXECUTABLE PREREQUISITE |
| **GAP-06** | Legacy `freeze_owner_vote_snapshot` bypass | **High** | Plan isolation in IU-4.1 / IU-4.2; consumer entry migration deferred (E-04) |
| **GAP-07** | E-01 read repo not adopted by consumers | **Medium** | IU-4.1 scope |
| **GAP-08** | No COMMITTED composite authority read helper | **Medium** | IU-4.1 scope — design only until audit schema exists |
| **GAP-09** | No write-path error / outcome taxonomy | **Medium** | Plan taxonomy; implement at orchestration layer |
| **GAP-10** | Read repo has no Primary Audit type | **Medium** | Extend when physical target approved |

**Executable Final COMMIT Path:** Remains **BLOCKED** until GAP-02 · GAP-03 · GAP-04 · GAP-05 resolved and verified.

---

## 9. Repository Integration Model

Phase 4 defines four integration layers. Layers 1–3 are **planned**; Layer 4 **partially exists** (legacy + direct client).

| Layer | Responsibility | Phase 4 status |
|-------|----------------|----------------|
| **1. Domain Contract Layer** | **FreezeContext** · domain types · commit/retry outcomes · COMMITTED evidence model | **Design / contract planning** |
| **2. Persistence Layer** | DB row mapping · INSERT/SELECT · constraints · transaction participation | **Read partial (E-01); write gap** |
| **3. Orchestration Layer** | Phase 1→2→3 sequence · single envelope · rollback · idempotency · reconciliation | **Gap — contract planning only** |
| **4. Consumer / Entry Layer** | Meeting / owner-voting call sites enter E-02 orchestration | **Legacy path exists; E-02 entry not wired** |

**Rule:** UI and ordinary services **must not** assemble frozen state from live sources. All freeze orchestration enters through the orchestration boundary.

---

## 10. Domain Contract Layer

Maps certified Phase 1–3 semantics to repository-facing types (design targets — not implemented by this plan):

| Contract | Source | Repository integration requirement |
|----------|--------|-----------------------------------|
| **FreezeContext** | Phase 1–3 Certification | Orchestration carrier; immutable frozen content fields |
| **FreezeEvent** | E-01 types + Phase 1 | Identity · primary · `frozen_at` alignment |
| **VoterSnapshot** | Phase 2 IU-2.1 | Event-linked rows; no live `property_members` reconstruction post-materialization |
| **ResolutionSnapshot** | Phase 2 IU-2.2 | One header per freeze event |
| **FrozenMotion** | Phase 2 IU-2.3 | Complete motion set |
| **PrimaryAudit** | Phase 3 IU-3.2 | Independent `primaryAuditId`; correlated by `freeze_event_id` |
| **CommitOutcome** | Phase 3 IU-3.3 | `IDEMPOTENT_RETURN` · `RETRYABLE` · `NEW_ATTEMPT_REQUIRED` · `COMMITTED` · `COMMIT_OUTCOME_UNCERTAIN` |

Existing E-01 read types in `snapshotDomain/types.ts` cover meeting · freeze event · snapshots · bundle. Phase 4 **extends** read contract for committed-bundle semantics and **plans** write/orchestration types without redefining certified meaning.

---

## 11. Persistence Layer

### Existing (E-01)

| Entity | Read repository | Write repository |
|--------|-----------------|------------------|
| `owner_vote_meetings` | ✓ `fetchMeeting` | ✗ — marker write unplanned |
| `owner_vote_freeze_events` | ✓ | ✗ |
| `owner_vote_voter_snapshot` | ✓ | ✗ |
| `owner_vote_resolution_snapshot` | ✓ | ✗ |
| `owner_vote_frozen_motions` | ✓ | ✗ |
| Primary Audit table | ✗ | ✗ |

### Required persistence rules (from certified Phase 3 — design closed)

| Rule | Status |
|------|--------|
| G staged in same transaction as A–F | **DESIGN CLOSED** · **EXECUTABLE PENDING** |
| `UNIQUE(freeze_event_id)` on Primary Audit | **DESIGN CLOSED** · **EXECUTABLE PENDING** |
| `snapshot_frozen_at IS NULL` pre-commit guard | **DESIGN CLOSED** · **EXECUTABLE PENDING** |
| One primary per meeting (`owner_vote_freeze_events_one_primary_per_meeting`) | ✓ Index exists |
| Immutability post-commit (E-01 triggers) | ✓ Event-linked rows protected |

### Read classification (Phase 4 contract)

| Read type | Purpose | Allowed sources |
|-----------|---------|-----------------|
| **AUTHORITATIVE SOURCE READ** | Phase 1 validation · Phase 2 materialization only | Certified live sources at authoritative stage |
| **FROZEN SNAPSHOT READ** | Post-materialization · commit verification · bundle load | Materialized tables · **FreezeContext** |
| **DIAGNOSTIC READ** | Engineering / support only | Any — **not** commit reconstruction authority |

---

## 12. Orchestration Layer

Certified orchestration sequence (Phase 1 → 2 → 3) **must** execute inside one atomic envelope:

```
Phase 1: validation · Freeze Event · ownership · envelope open
    ↓
Phase 2: voter · resolution · motion materialization → COMMIT_READY
    ↓
Phase 3: COMMIT_SET_VERIFIED → COMMIT_PREPARED → AUDIT_PREPARED
    ↓
    idempotency / reconciliation / ownership revalidation
    ↓
COMMIT_AUTHORIZED → COMMITTING → durable DB COMMIT → COMMITTED
```

**Phase 4 planning decisions:**

| Question | Planned answer |
|----------|----------------|
| Orchestration owner | Dedicated freeze orchestration module (server-side preferred) |
| Transaction holder | **Not** browser client alone — server RPC or edge function with explicit transaction |
| Repository methods commit? | **NO** — **NO INDEPENDENT COMMIT** inside IU repository operations |
| Repository methods rollback? | **NO** — orchestration boundary owns rollback |
| Failure propagation | Fail closed → full Phase 1 envelope rollback |

**Status:** **DESIGN / PLANNING ONLY** — no orchestration code authorized by this plan document alone.

---

## 13. Consumer / Entry Layer

### Current entry points (legacy)

| Consumer | Path | E-02 compliant? |
|----------|------|-----------------|
| `MeetingDetail.tsx` | `supabase.rpc('freeze_owner_vote_snapshot')` | **No** |
| `MeetingOwnerVoteCouncilSection.tsx` | `supabase.rpc('freeze_owner_vote_snapshot')` | **No** |
| Auto-freeze on `snapshot_freeze_at` | Same legacy RPC | **No** |

### Target entry model (Phase 4 plans · E-04 may wire)

```
Consumer (UI / scheduler / API)
    → E-02 Freeze Orchestration Entry (authorized boundary)
        → Orchestration Layer (Phase 1→2→3)
            → Persistence Layer (transaction-participating repositories)
```

**Phase 4 scope (Program Plan):** Plan integration and verify **read path**. React page wiring and RPC consumer adoption are **out of scope** (E-04).

---

## 14. Transaction Integration Contract

| # | Question | Planned resolution | Evidence status |
|---|----------|-------------------|-----------------|
| 1 | Who creates transaction? | Orchestration boundary (server-side RPC preferred) | **OPEN — REQUIRES IU DESIGN REVIEW** |
| 2 | Who holds transaction? | Single orchestration owner per active attempt | **Design closed** · **executable pending** |
| 3 | Phase 1/2/3 share same transaction? | **Required** by certified Phase 1–3 | **Gap — no mechanism** |
| 4 | Repository method self-commit? | **Prohibited** (RI4-3) | **Design closed** |
| 5 | Repository method self-rollback? | **Prohibited** — orchestration owns rollback | **Design closed** |
| 6 | Primary Audit INSERT same transaction? | **Required** | **EXECUTABLE PREREQUISITE** |
| 7 | Marker write same transaction? | **Required** | **EXECUTABLE PREREQUISITE** |
| 8 | Unique constraint failure propagation? | Map to domain outcome (PRIMARY_CONFLICT · AUDIT_DUPLICATE_FAILURE) | **Plan defined** |
| 9 | COMMIT failure propagation? | FAIL CLOSED · COMMIT_FAILURE or COMMIT_OUTCOME_UNCERTAIN | **Plan defined** |
| 10 | Rollback identity terminalization? | Abandon ids; NEW_ATTEMPT_REQUIRED on next lifecycle | **Design closed** |
| 11 | COMMIT_OUTCOME_UNCERTAIN reconciliation? | Durable state query first | **EXECUTABLE PREREQUISITE** |
| 12 | Prove successful DB COMMIT? | Composite durable evidence query — not client ack | **EXECUTABLE PREREQUISITE** |

```
NO INDEPENDENT COMMIT inside IU repository operations.
Final DB COMMIT only at authorized orchestration boundary.
```

---

## 15. Primary Audit Integration

Per Phase 3 Certification — **blocker preserved:**

| Dimension | Status |
|-----------|--------|
| PRIMARY AUDIT PERSISTENCE GAP | **CONFIRMED** |
| CQ-003 / AQ-001 | **RESOLVED AS NEW TARGET REQUIRED** |
| Logical contract | **COMPLETE / CERTIFIED** |
| Physical persistence | **PENDING EXECUTABLE IMPLEMENTATION** |
| Runtime INSERT | **NOT IMPLEMENTED** |
| Executable Final COMMIT Path | **BLOCKED** |

### Phase 4 planning disposition

| Topic | Disposition |
|-------|-------------|
| Which IU owns persistence integration? | **OPEN — REQUIRES IU DESIGN REVIEW** (RQ4-004). Not solely IU-4.1/4.2 read scope; likely cross-cutting executable work + authorized migration before COMMIT path unblocked |
| Migration / schema authorization timing | **Not authorized by this plan** — requires separate migration authorization after IU Design Review |
| Repository API — write | Stage G in open transaction; correlate `primaryAuditId` · `freeze_event_id` |
| Repository API — read | Load audit by `freeze_event_id`; participate in COMMITTED composite check |
| Immutability | E-01-style triggers on approved physical target |
| `UNIQUE(freeze_event_id)` | Required on physical target |
| `committed_at` / commit evidence | Composite evidence component — **not sole COMMITTED authority** |
| Same-transaction INSERT with A–F | **Mandatory** — orchestration layer responsibility |

**Phase 4 Repository Integration does NOT pretend this blocker is lifted.**

---

## 16. COMMITTED Authority Integration

Repository **read** contract must support Phase 3 composite **COMMITTED** determination:

| # | Durable evidence component |
|---|---------------------------|
| 1 | Authoritative primary Freeze Event |
| 2 | Complete Voter Snapshot (event-linked) |
| 3 | Complete Resolution Snapshot |
| 4 | Complete Frozen Motions |
| 5 | Freeze marker (`snapshot_frozen_at` aligned) |
| 6 | Primary Audit |
| 7 | A–G correlation |
| 8 | Exactly-one constraints satisfied |
| 9 | Successful durable DB COMMIT |

**Insufficient alone:** `is_primary` · `snapshot_frozen_at` · `frozen_at` · `created_at` · client acknowledgement · any pre-**COMMITTED** state.

**Current schema limitation:** No commit-state column on `owner_vote_freeze_events`. No Primary Audit table. Repository **cannot yet** reliably prove runtime **COMMITTED** — **executable persistence gap recorded**.

Proposed read helper (IU-4.1 design target): `evaluateCommittedAuthority(bundle, audit?) → CommittedAuthorityResult` — returns composite assessment, never single-field shortcut.

---

## 17. Idempotency / Retry Integration

Map IU-3.3 three-outcome model to repository/orchestration boundary:

| Condition | Repository / orchestration outcome |
|-----------|-------------------------------------|
| Durable **COMMITTED** exists | **IDEMPOTENT_RETURN** — return authoritative identity/evidence; no re-materialize · no re-stage audit · no second COMMIT |
| No committed + active owner | **RETRYABLE** |
| No committed + no owner + terminal rollback | **NEW_ATTEMPT_REQUIRED** — new identity chain from Phase 1 |
| Uncertain | **RECONCILE FIRST** → then map to above |

```
RETRYABLE ≠ NEW_ATTEMPT_REQUIRED
```

**Ownership investigation:** No durable ownership table or lock mechanism found in repository. **OWNERSHIP PERSISTENCE / COORDINATION GAP — CONFIRMED.** In-memory locks are **insufficient** for certified contract.

---

## 18. Concurrency Integration

| Scenario | Outcome |
|----------|---------|
| Attempt A owns active envelope | A proceeds |
| Competing Attempt B | **RETRYABLE** |
| A **COMMITTED** | B → **IDEMPOTENT_RETURN** |
| A terminal rollback | Next → **NEW_ATTEMPT_REQUIRED** |

**Prohibited:** ownership stealing · dual primary · dual Primary Audit · dual marker · second durable commit.

**Status:** Semantics **certified upstream** · executable verification **PENDING**.

---

## 19. Reconciliation Integration

```
COMMIT_OUTCOME_UNCERTAIN → DURABLE RECONCILIATION FIRST
```

| Reconciliation case | Outcome |
|---------------------|---------|
| Durable committed A–G found | **IDEMPOTENT_RETURN** |
| Not committed + active owner | **RETRYABLE** |
| Rolled back / no owner | **NEW_ATTEMPT_REQUIRED** |

**Special case:** DB COMMIT succeeded · client ack lost → reconcile → **IDEMPOTENT_RETURN** · **NEVER** second freeze.

Repository reconciliation = query durable post-commit evidence (freeze event · snapshots · marker · audit · constraints) — **not** client response.

**Status:** Semantic contract **design closed** · runtime mechanism **EXECUTABLE PENDING**.

---

## 20. Legacy Freeze Path Integration

| Legacy element | Risk | Phase 4 mitigation plan |
|----------------|------|-------------------------|
| `freeze_owner_vote_snapshot` RPC | Bypasses E-02 A–G · no Primary Audit · can rebuild | Document prohibition for E-02 path; isolation verification in IU-4.2 |
| UI direct RPC invocation | Production bypass | Consumer entry migration planned for E-04 — **not Phase 4** |
| Voter-only materialization | Incomplete bundle vs E-02 | Read repo `legacy_meeting` mode preserved; E-02 reads require `event_linked` |
| Re-freeze rebuild | Violates immutability intent | E-02 orchestration must not call legacy RPC (RA-3.1-002) |
| RPC not in migration head | Contract drift risk | Recovery tracked separately; Phase 4 records integration requirement |

**Phase 4 does not delete legacy code.** Records **integration / isolation / retirement requirement** and verifies read-layer does not strengthen legacy as E-02 authority.

---

## 21. No-Live-Reconstruction Contract

**Repository rule (RI4-4):**

After Phase 2 materialization completes, Phase 3 / Phase 4 integration **must not** re-read live mutable sources to rebuild frozen governance truth.

| Forbidden for commit / retry / reconciliation reconstruction |
|-------------------------------------------------------------|
| `property_members` |
| `owner_vote_resolutions` |
| Agenda authoring data |
| Mutable voting authoring sources |

**Allowed:**

- **FreezeContext** and materialized snapshot rows
- Freeze Event · meeting marker · Primary Audit evidence
- Constraints and durable reconciliation queries

Snapshot verification reads in IU-4.2 **must** use frozen tables / bundle repository — not live roll reconstruction.

---

## 22. Error / Result Taxonomy

Repository integration result taxonomy — aligned with certified upstream outcomes (names may refine at IU Design Review):

| Category | Meaning |
|----------|---------|
| **VALIDATION_FAILURE** | Pre-transaction or Phase 1 validation failed |
| **OWNERSHIP_CONFLICT** | Active competitor · maps to **RETRYABLE** when appropriate |
| **CORRELATION_FAILURE** | A–G or bundle correlation mismatch |
| **MATERIALIZATION_FAILURE** | Phase 2 incomplete or count mismatch |
| **PRIMARY_CONFLICT** | Primary freeze event uniqueness violation |
| **AUDIT_PERSISTENCE_FAILURE** | Primary Audit staging/insert failed |
| **AUDIT_DUPLICATE_FAILURE** | Duplicate audit for same `freeze_event_id` |
| **MARKER_CONFLICT** | `snapshot_frozen_at` pre-guard or marker conflict |
| **COMMIT_PRECONDITION_FAILURE** | Not **COMMIT_AUTHORIZED** |
| **COMMIT_CONFLICT** | Concurrent commit conflict |
| **COMMIT_FAILURE** | Durable commit failed · fail closed |
| **COMMIT_OUTCOME_UNCERTAIN** | Outcome unknown — reconcile first |
| **IDEMPOTENT_RETURN** | Durable **COMMITTED** exists |
| **RETRYABLE** | Active owner · no committed primary |
| **NEW_ATTEMPT_REQUIRED** | Terminal rollback · new identity chain |
| **COMMITTED** | Successful durable commit established |

Existing E-01 read errors (`MEETING_NOT_FOUND`, `CORRELATION_MISMATCH`, etc.) remain for read layer. Write/orchestration taxonomy **planned** — not implemented.

---

## 23. Phase 4 IU Breakdown

**Authority:** [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) §8 · §Phase 4

| IU | Title | Purpose (Program Plan) |
|----|-------|------------------------|
| **IU-4.1** | Repository Adoption | Wire freeze read path through E-01 typed repository |
| **IU-4.2** | Integration Verification | Verify correlation and bundle load end-to-end |

### IU-4.1 — Repository Adoption

| Field | Value |
|-------|-------|
| **Objective** | Adopt and extend E-01 typed repository for E-02 committed event-linked bundles; define orchestration/repository integration contracts |
| **Inputs** | E-01 `snapshotDomain` · Phase 3 certified baseline · CM-7 |
| **Outputs** | Extended read repository contract · COMMITTED authority read design · integration interfaces · consumer adoption plan |
| **Repository scope** | Read: `FrozenMeetingBundle` event-linked mode · correlation asserts · Primary Audit read slot (when schema exists). Plan: write/orchestration interfaces |
| **Dependencies** | E-01 IU-4.1 Complete · Phase 3 Certified |
| **Upstream contracts** | A–G · Artifact F · COMMITTED composite · no-live-reconstruction |
| **Downstream hand-off** | IU-4.2 verification |
| **Executable prerequisites** | Primary Audit schema for full COMMITTED read — **PENDING** |
| **Explicit exclusions** | React wiring · legacy RPC removal · migration · actual DB COMMIT |

### IU-4.2 — Integration Verification

| Field | Value |
|-------|-------|
| **Objective** | Verify correlation preserved end-to-end; issue integration verification evidence |
| **Inputs** | IU-4.1 outputs · E-01 schema · test fixtures |
| **Outputs** | Integration verification report · executable obligation registry |
| **Repository scope** | Bundle load · legacy vs event-linked modes · correlation · no-live-reconstruction reads · legacy bypass documentation |
| **Dependencies** | IU-4.1 Complete |
| **Upstream contracts** | CM-7 · RI4 invariants |
| **Downstream hand-off** | Phase 4 Completion · Certification |
| **Executable prerequisites** | Committed test data may require future EIR fixtures |
| **Explicit exclusions** | Production deployment · E-03 · voting UI |

**No additional IUs proposed.** Write/orchestration executable work is tracked as **prerequisites** and **integration gaps**, not as unauthorized IU registry changes.

---

## 24. IU Dependency Graph

```
Phase 3 Certification
        ↓
E-02 Phase 4 Implementation Plan (this document)
        ↓
IU-4.1 Repository Adoption
        ↓
IU-4.2 Integration Verification
        ↓
Phase 4 Completion
        ↓
Phase 4 Certification
        ↓
Phase 5 Verification & Acceptance
```

Cross-cutting executable prerequisites (Primary Audit migration · orchestration RPC · ownership) may parallel **planning** during IU-4.1/4.2 but **must not** block read-layer design completion. They **do** block **Executable Final COMMIT Path** unblocking.

---

## 25. RI4 Invariants

| ID | Invariant | Requirement |
|----|-----------|-------------|
| **RI4-1** | Certified Contract Preservation | Phase 4 **shall not** redefine Phase 1–3 certified semantics |
| **RI4-2** | Single Atomic Envelope | Phase 1 + 2 + 3 persistence participates in one transaction |
| **RI4-3** | No Independent Repository Commit | Repository methods **shall not** commit or rollback autonomously |
| **RI4-4** | No Live Reconstruction | Post-materialization paths use frozen artifacts only |
| **RI4-5** | Stable Freeze Correlation | `freezeEventId` · `meetingId` · `propertyId` stable across bundle |
| **RI4-6** | Primary Audit Mandatory | **NO PRIMARY AUDIT → NO COMMITTED FREEZE** |
| **RI4-7** | Artifact F Verify-Only | No `owner_vote_meetings.status` UPDATE on freeze commit |
| **RI4-8** | Durable Idempotency | **IDEMPOTENT_RETURN** without second durable effect |
| **RI4-9** | Identity Non-Reuse | Rolled-back ids **never** reused |
| **RI4-10** | Durable Reconciliation First | **COMMIT_OUTCOME_UNCERTAIN** → reconcile before new attempt |
| **RI4-11** | Composite COMMITTED Authority | No single-field COMMITTED shortcut |
| **RI4-12** | Fail Closed | Pre-**COMMITTED** failure → full envelope rollback |
| **RI4-13** | Repository / Domain Separation | Domain contracts separate from PostgREST row shapes |
| **RI4-14** | Legacy Path Cannot Bypass E-02 | Legacy RPC not E-02 orchestration authority |
| **RI4-15** | No E-03 Voting Side Effects | Phase 4 does not open voting or modify voting lifecycle |

---

## 26. Repository Integration Questions (RQ4)

| ID | Question | Finding / disposition | Status |
|----|----------|----------------------|--------|
| **RQ4-001** | Unified owner-vote freeze repository abstraction exists? | E-01 read repo only; **no write/orchestration repo** | **CONFIRMED GAP** |
| **RQ4-002** | Executable transaction mechanism location? | **None in app layer**; legacy RPC is voter-only | **OPEN — REQUIRES IU DESIGN REVIEW** |
| **RQ4-003** | Same DB transaction across Phase 1/2/3? | **Not possible via browser client alone** | **EXECUTABLE PREREQUISITE — server RPC** |
| **RQ4-004** | Primary Audit physical target owner IU? | Cross-cutting; not IU-4.1/4.2 read-only scope alone | **OPEN — REQUIRES IU DESIGN REVIEW** |
| **RQ4-005** | Primary Audit repository API minimum contract? | Stage/read by `freeze_event_id`; `primaryAuditId` independent; immutability | **PROPOSED — PENDING IU DESIGN REVIEW** |
| **RQ4-006** | Durable ownership expression? | **No mechanism found** | **OWNERSHIP PERSISTENCE GAP** |
| **RQ4-007** | Durable **COMMITTED** determination? | Composite query over event · snapshots · marker · audit | **DESIGN CLOSED** · **EXECUTABLE PENDING** (audit table absent) |
| **RQ4-008** | **COMMIT_OUTCOME_UNCERTAIN** reconciliation? | Durable evidence query → map to idempotency outcome | **EXECUTABLE PREREQUISITE** |
| **RQ4-009** | Legacy path isolation? | Document + verify; consumer migration E-04 | **PLANNED** |
| **RQ4-010** | Marker write repository owner? | Orchestration persistence layer — meeting row update | **OPEN — REQUIRES IU DESIGN REVIEW** |
| **RQ4-011** | Snapshot verification without live reconstruction? | Use `FrozenMeetingBundle` / frozen tables only | **DESIGN CLOSED** |
| **RQ4-012** | Constraint violations → domain outcome? | Map UNIQUE/FK to PRIMARY_CONFLICT · AUDIT_DUPLICATE · etc. | **PROPOSED — PENDING IU DESIGN REVIEW** |
| **RQ4-013** | Rollback identity terminalization? | Orchestration abandons ids; Phase 1 re-entry | **DESIGN CLOSED** |
| **RQ4-014** | New RPC / server function required? | **Likely yes** for atomic envelope | **PROPOSED — PENDING IU DESIGN REVIEW** |
| **RQ4-015** | Browser Supabase client sufficient for atomic envelope? | **No** — independent REST calls | **CONFIRMED INSUFFICIENT** |
| **RQ4-016** | Phase 4 completion unblocks Final COMMIT Path? | **No** — unless executable artifacts + reviews satisfy Phase 3 blockers | **NO — BLOCKER PRESERVED** |

---

## 27. Risks (R-084+)

| ID | Risk | Condition | Consequence | Mitigation | Verification gate | Owner |
|----|------|-----------|-------------|------------|-------------------|-------|
| **R-084** | No repository abstraction | Orchestration coded ad hoc in UI | Bypass RI4 · dual paths | IU-4.1 adoption · orchestration module plan | Integration verification | IU-4.1 |
| **R-085** | Browser client transaction limit | Multi-call freeze from client | Partial A–G persistence | Server-side RPC envelope (RQ4-014) | Transaction EIR | Executable prerequisite |
| **R-086** | Primary Audit schema gap | Commit without audit | Unaudited freeze | RI4-6 · blocker preserved | Audit EIR | Migration + orchestration |
| **R-087** | Ownership durability gap | In-memory lock only | Split envelope · RETRYABLE misclassified | Durable ownership store | Concurrency EIR | Executable prerequisite |
| **R-088** | Legacy freeze bypass | UI keeps calling legacy RPC | E-02 never authoritative | RI4-14 · E-04 consumer migration | Legacy bypass test | IU-4.2 |
| **R-089** | Hidden independent commit | Repository method commits | Partial commit | RI4-3 | Code review · EIR | Orchestration IU |
| **R-090** | Snapshot/live-source mixing | Read path uses `property_members` post-freeze | Reconstructed non-frozen state | RI4-4 · bundle reads only | No-reconstruction EIR | IU-4.2 |
| **R-091** | Partial A–G persistence | Transaction boundary broken | Durable inconsistent freeze | RI4-2 · single envelope | Atomicity EIR | Orchestration |
| **R-092** | False COMMITTED detection | Single-field check in repo | Premature downstream | RI4-11 · composite helper | COMMITTED authority EIR | IU-4.1 |
| **R-093** | Lost-ack duplicate freeze | No reconciliation | Second freeze | RI4-10 · IU-3.3 contract | Reconciliation EIR | Orchestration |
| **R-094** | Constraint error misclassification | Generic error mapping | Wrong retry outcome | Error taxonomy §22 | Error mapping EIR | Orchestration |
| **R-095** | Marker/audit divergence | Non-atomic writes | False frozen state | Same-transaction rule | Rollback EIR | Orchestration |
| **R-096** | Rollback identity reuse | Bug reuses abandoned id | Corrupt history | RI4-9 | Identity EIR | Orchestration |
| **R-097** | UI direct DB bypass | New reads skip repository | CM-7 violation | CES-003 §15 · IU-4.1 | Repository adoption test | IU-4.1 |
| **R-098** | Phase 4 opens E-03 voting | Status UPDATE on freeze | Voting side effect | RI4-15 · Artifact F | Boundary EIR | All Phase 4 IUs |

---

## 28. Executable Prerequisites

| # | Prerequisite | Design | Executable |
|---|--------------|--------|------------|
| 1 | Primary Audit physical persistence target | **CLOSED** | **PENDING** |
| 2 | Primary Audit immutability enforcement | **CLOSED** | **PENDING** |
| 3 | `UNIQUE(freeze_event_id)` audit binding | **CLOSED** | **PENDING** |
| 4 | Same-transaction audit INSERT with A–F | **CLOSED** | **PENDING** |
| 5 | Durable ownership mechanism | **CLOSED** | **PENDING** |
| 6 | Durable reconciliation mechanism | **CLOSED** | **PENDING** |
| 7 | Final transaction orchestration (server-side) | **CLOSED** | **PENDING** |
| 8 | DB COMMIT outcome evidence | **CLOSED** | **PENDING** |
| 9 | Legacy path isolation / consumer migration | **PLANNED** | **PENDING** |
| 10 | Repository-level constraint/error mapping | **PLANNED** | **PENDING** |

**Executable Final COMMIT Path:** **BLOCKED** — Phase 4 planning **does not lift** this blocker.

---

## 29. Verification Strategy

All executable tests: **PENDING VERIFICATION** — none marked PASS by this plan.

| Gate | Scope | Phase 4 owner |
|------|-------|---------------|
| **A** | Repository contract verification | IU-4.1 |
| **B** | Persistence/schema verification | Prerequisites + IU-4.2 |
| **C** | Transaction atomicity verification | Executable prerequisite / EIR |
| **D** | Rollback verification | Executable prerequisite / EIR |
| **E** | Primary Audit verification | Executable prerequisite / EIR |
| **F** | Idempotency verification | Executable prerequisite / EIR |
| **G** | Concurrency verification | Executable prerequisite / EIR |
| **H** | Uncertain-outcome reconciliation | Executable prerequisite / EIR |
| **I** | Legacy bypass prevention | IU-4.2 |
| **J** | No-live-reconstruction verification | IU-4.2 |
| **K** | Artifact F no-status-update verification | IU-4.2 + orchestration EIR |
| **L** | E-03 boundary verification | IU-4.2 |

Program Plan verification targets:

- `FrozenMeetingBundle` loads event-linked materialized state correctly
- Legacy path (`freeze_event_id IS NULL`) unchanged
- No direct Supabase table access from new freeze read helpers (CES-003 §15)

---

## 30. Entry Criteria

| Criterion | Status |
|-----------|--------|
| E-01 Project Certified | ✓ |
| E-02 Phase 1 Certified Complete | ✓ |
| E-02 Phase 2 Certified Complete | ✓ |
| E-02 Phase 3 Certified Complete | ✓ |
| Phase 3 Primary Audit persistence gap known | ✓ |
| Phase 3 Executable Final COMMIT Path BLOCKED | ✓ (preserved) |
| E-02 Program Plan authority available | ✓ |
| Phase 4 Plan approved | ✓ (this document) |

---

## 31. Exit Criteria

Per [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) §Phase 4:

| Criterion | Required |
|-----------|----------|
| IU-4.1 Complete | ✓ |
| IU-4.2 Complete | ✓ |
| Integration verification report issued | ✓ |
| Repository integration contracts closed | ✓ |
| Primary Audit executable prerequisite explicit disposition | ✓ |
| Transaction ownership/integration closed at plan level | ✓ |
| Legacy bypass integration requirement closed | ✓ |
| RI4 invariants preserved | ✓ |
| Executable obligations recorded | ✓ |
| Phase 4 Completion issued | ✓ |
| Phase 4 Certification issued | ✓ |

**Does not automatically require:**

- Executable Final COMMIT Path unblocked
- Primary Audit table exists
- Runtime **COMMITTED** certified

Exit criteria satisfied when **Phase 4 repository integration design and verification scope** is complete — not when full freeze pipeline is executable.

---

## 32. Phase Boundary

### In scope

| Item |
|------|
| Repository / domain / persistence / orchestration **integration planning** |
| Transaction integration **design** |
| Primary Audit integration **planning** |
| Ownership / reconciliation integration **planning** |
| Legacy path integration **planning** |
| Error / result mapping **design** |
| Consumer entry integration **planning** |
| IU-4.1 Repository Adoption |
| IU-4.2 Integration Verification |
| Executable prerequisite registry |

### Out of scope for this plan

| Item | Owner |
|------|-------|
| Actual application code (unless authorized by IU Implementation) | IU chain |
| Actual migration / SQL / RPC | Separate authorization |
| Actual DB COMMIT | Orchestration executable work |
| Production deployment | Verification & Release |
| Runtime certification | Phase 5 |
| Voting / ballots | **E-03** |
| React page wiring · RPC consumer adoption · scheduler | **E-04** |
| Post-commit correction | **E-06** |
| E-02 Project Certification | Phase 5 IU-5.4 |

---

## 33. E-03 Boundary

```
Phase 4 Repository Integration DOES NOT OPEN VOTING.
```

| Rule | Requirement |
|------|-------------|
| E-03 status | **BLOCKED** until E-02 Project Certification |
| `owner_vote_meetings.status` | **Must not** be modified by E-02 freeze integration to simulate voting-open state |
| Artifact F | **VERIFY-ONLY** — preserved |
| Voting / ballots / ballot RPC | **E-03 scope** — not Phase 4 |

---

## 34. Downstream Hand-off

After Phase 4 Certification:

| Consumer | Hand-off |
|----------|----------|
| **Phase 5** | Engineering verification · acceptance · Project Certification |
| **E-04** | Consumer UI wiring · RPC adoption · scheduler triggers |
| **E-03** | Remains blocked until E-02 Project Certification |
| **Executable COMMIT work** | Prerequisites §28 — authorized only after IU Design Review + migration authorization |

Phase 4 delivers **repository integration baseline** and **read-path verification** — not full executable freeze pipeline.

---

## 35. Open Items

| Category | Status |
|----------|--------|
| Unresolved architecture issues | **NONE** |
| Repository integration design open questions | **RQ4-002 · RQ4-004 · RQ4-010 · RQ4-014** — IU Design Review |
| Primary Audit physical target | **EXECUTABLE PREREQUISITE** |
| Ownership / reconciliation persistence | **EXECUTABLE PREREQUISITE** |
| Atomic transaction mechanism | **EXECUTABLE PREREQUISITE** |
| Executable Final COMMIT Path | **BLOCKED** |
| Production changes | **NONE** |

---

## 36. Success Criteria

Phase 4 succeeds when:

1. Certified Phase 1–3 contracts are mapped to repository integration layers without redefinition.
2. E-01 typed repository adoption path for event-linked committed bundles is defined and implemented (IU-4.1).
3. End-to-end correlation verification is evidenced (IU-4.2).
4. Integration gaps · RI4 invariants · RQ4 · risks · executable prerequisites are documented.
5. Legacy bypass and E-03 boundaries are explicit.
6. **Executable Final COMMIT Path blocker** remains correctly **BLOCKED** until executable evidence exists.

---

## 37. Next Authorized Step

| Field | Value |
|-------|-------|
| **Next authorized document** | [`E-02-IU-4.1-Implementation.md`](E-02-IU-4.1-Implementation.md) |
| **IU** | **IU-4.1 — Repository Adoption** |
| **Authority** | Program Plan §8 · this Phase 4 Plan §23 |

This document does **not** create the IU Implementation record.

---

## 38. Confirmation

| Statement | Confirmed |
|-----------|-----------|
| Documentation only | ✓ |
| No application code | ✓ |
| No SQL / migrations / RPC | ✓ |
| No database / production changes | ✓ |
| No Phase 4 IU Implementation documents created | ✓ |
| No Phase 4 Completion / Certification | ✓ |
| No E-02 Project Certification | ✓ |
| No E-03 work | ✓ |
| Phase 1–3 approved/completed/certified documents unchanged | ✓ |
| Architecture Authority unchanged | ✓ |
| Program Plan IU registry unchanged (IU-4.1 · IU-4.2) | ✓ |
| Primary Audit blocker preserved | ✓ |
| Executable Final COMMIT Path **BLOCKED** | ✓ |
| E-03 **BLOCKED** | ✓ |

---

## Document control

| Field | Value |
|-------|-------|
| **Document Type** | Phase Implementation Plan |
| **Program** | E-02 — Freeze Engine |
| **Phase** | Phase 4 — Repository Integration |
| **Status** | Approved |
| **Revision** | v1.0 |
| **Approval Date** | 2026-08-18 |
| **E-02 Program** | IN PROGRESS |
| **E-03** | BLOCKED |
| **Production Effect** | None |

**Related:** [`E-02-Phase-3-Certification.md`](E-02-Phase-3-Certification.md) · [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) · [`E-01-IU-4.1-Completion.md`](E-01-IU-4.1-Completion.md) · [`EPS-001-Engineering-Phase-Documentation-Standard.md`](EPS-001-Engineering-Phase-Documentation-Standard.md)
