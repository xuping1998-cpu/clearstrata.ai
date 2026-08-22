# E-02 Phase 5 Implementation Plan — Verification & Acceptance

| Field | Value |
|-------|-------|
| **Document Type** | Phase Implementation Plan |
| **Program** | E-02 — Freeze Engine |
| **Phase** | E-02 Phase 5 — Verification & Acceptance |
| **Status** | **Approved** |
| **Revision** | **v1.1** |
| **Program Authority Amendment** | **2026-08-21** — see §0 |
| **Approval Date** | 2026-08-19 *(v1.0)* · 2026-08-21 *(v1.1 amendment)* |
| **Authoritative Source** | [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) **v1.1** §Phase 5 · §8 · §13 · §16–26 |
| **Program Authority Decision** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) — **APPROVED** |
| **Architecture Authority** | [`E-02-Architecture.md`](E-02-Architecture.md) v1.1 |
| **Upstream Certified Baselines** | [`E-02-Phase-1-Certification.md`](E-02-Phase-1-Certification.md) · [`E-02-Phase-2-Certification.md`](E-02-Phase-2-Certification.md) · [`E-02-Phase-3-Certification.md`](E-02-Phase-3-Certification.md) · [`E-02-Phase-4-Certification.md`](E-02-Phase-4-Certification.md) |
| **Scope** | Engineering Verification · Acceptance Validation · Acceptance Report · Project Certification planning |
| **Executable Implementation** | **NOT AUTHORIZED BY THIS PHASE** |
| **Runtime Verification** | **PENDING** (evidence collection only) |
| **Production** | **UNCHANGED** |
| **Executable Final COMMIT Path** | **BLOCKED** |
| **Verified** | **YES** |
| **Previous Document** | [`E-02-Phase-4-Certification.md`](E-02-Phase-4-Certification.md) |
| **Next Document** | [`E-02-Phase-5-Completion.md`](E-02-Phase-5-Completion.md) *(next authorized — PCQ-002)* |
| **Production Effect** | **None** |

> **Scope lock:** Phase 5 completes engineering verification and acceptance only. **No new engineering functionality** is authorized ([`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) §Phase 5). This plan **does not** lift the Primary Audit executable blocker, **does not** authorize migration / SQL / RPC creation, **does not** certify runtime **COMMITTED**, and **does not** issue E-02 Project Certification by existence of this document alone.

> **Integration principle:** **INTEGRATE / CONSUME CERTIFIED CONTRACTS. DO NOT REDEFINE THEM.**

---

## 0. Amendment Note (v1.0 → v1.1)

| Field | Value |
|-------|-------|
| **Amendment type** | Program Authority Amendment |
| **Effective date** | 2026-08-21 |
| **Authority chain** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) → [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) v1.1 → **this document v1.1** |

**v1.1** clarifies the **post-IU-5.4 authority model** after the actual Acceptance Report concluded **ACCEPTANCE_BLOCKED**. It **does not** invalidate original Phase 5 execution history.

**v1.1 does NOT:**

- Modify IU-5.1–IU-5.4 Completion records
- Rewrite [`E-02-Acceptance-Report.md`](E-02-Acceptance-Report.md) v1.0
- Authorize executable remediation
- Issue Phase 5 Completion / Certification / Project Certification

Where v1.0 wording conflicted with Program Plan v1.1 or the Program Authority Decision, **v1.1 is controlling** for Phase 5 authority.

---

## 1. Document Control

| Field | Value |
|-------|-------|
| **Document Type** | Phase Implementation Plan |
| **Program** | E-02 — Freeze Engine |
| **Phase** | Phase 5 — Verification & Acceptance |
| **Status** | Approved |
| **Revision** | **v1.1** |
| **Program Authority Amendment** | 2026-08-21 |
| **Approval Date** | 2026-08-19 *(v1.0)* · 2026-08-21 *(v1.1)* |
| **Production Effect** | None |

**Related:** [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) · [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) v1.1 · [`E-02-Phase-4-Certification.md`](E-02-Phase-4-Certification.md) · [`M2-S3-Engineering-Work-Breakdown.md`](M2-S3-Engineering-Work-Breakdown.md) Task E-02 · [`EPS-001-Engineering-Phase-Documentation-Standard.md`](EPS-001-Engineering-Phase-Documentation-Standard.md) · [`E-01-Phase-5-Implementation-Plan.md`](E-01-Phase-5-Implementation-Plan.md) *(structural reference only — IU titles differ)*

---

## 2. Purpose

Define the **authorized implementation plan** for **E-02 Phase 5 — Verification & Acceptance**.

Phase 5 expands the parent Program Plan §Phase 5 into executable Implementation Units with explicit deliverables, verification strategy, gap inventory, and exit criteria per [`EPS-001`](EPS-001-Engineering-Phase-Documentation-Standard.md).

This document **shall implement** the approved Program Plan. It **shall not redefine** Architecture Authority, certified Phase 1–4 contracts, or Work Breakdown scope.

| Phase 5 role | Action |
|--------------|--------|
| Verify engineering evidence across Phases 1–4 | ✓ |
| Validate against Work Breakdown E-02 completion criteria | ✓ |
| Produce E-02 Acceptance Report evidence chain | ✓ |
| Determine E-02 Project Certification readiness (**evaluation only**) | ✓ |
| Establish deduplicated EIR inventory (if authorized) | ✓ |
| Classify remaining executable gaps | ✓ |

| This plan is **not** | |
|----------------------|---|
| Executable freeze implementation | |
| Primary Audit table / INSERT / immutability implementation | |
| Atomic transaction envelope implementation | |
| Runtime COMMITTED certification | |
| E-03 / E-04 authorization by itself | |
| E-02 Project Certification issuance | |

---

## 3. Master-Plan Authority Finding

All Phase 5 content below is derived from [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) **v1.1** and [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md). No Phase 5 title, IU, deliverable, or certification semantics were invented.

| Field | Authoritative value | Source |
|-------|---------------------|--------|
| **Official phase name** | **Phase 5 — Verification & Acceptance** | Program Plan §Phase 5 |
| **Purpose** | Engineering verification, acceptance validation, Acceptance Report issuance, Project Certification **evaluation**. **No new engineering functionality.** | Program Plan §Phase 5 · v1.1 |
| **Architecture basis** | Full Architecture Authority compliance check | Program Plan §Phase 5 |
| **Blocked by** | Phase 4 certified | Program Plan §Phase 5 |
| **Unblocks E-03 / E-04** | **Only after E-02 Project Certification issued** | Program Plan v1.1 §13.3 · PAD-010 |
| **Deliverables** | IU-5.1 Engineering Verification · IU-5.2 Acceptance Validation · IU-5.3 Acceptance Report · IU-5.4 Project Certification **evaluation** | Program Plan §Phase 5 |
| **Phase 5 process exit** | IU-5.1–5.4 Complete · Acceptance Report **issued** · Phase 5 Completion **`Completed with Follow-up`** · Phase 5 Certification **scoped** | Program Plan v1.1 §13.2 · PCQ-002/003 |
| **E-02 program exit** | Work Breakdown executable criteria · acceptable acceptance · **E-02 Project Certification issued** | Program Plan v1.1 §13.1 |
| **Document chain (Phase 5 close)** | IU Completion → Phase Completion → Phase Certification | Program Plan v1.1 §17.2 blocked path |
| **Post-program output (full path)** | Project Certification → Engineering Baseline → E-03 | Program Plan v1.1 §17.1 |

**IU registry (exact — Program Plan §8):**

| IU | Title | Purpose | Historical status (2026-08-21) |
|----|-------|---------|-------------------------------|
| **IU-5.1** | Engineering Verification | Cross-check Architecture Authority, phases, schema, and evidence | **COMPLETED** |
| **IU-5.2** | Acceptance Validation | Work Breakdown E-02 completion criteria checklist | **COMPLETED** |
| **IU-5.3** | Acceptance Report | Task-level verification and acceptance evidence (EPS-001) | **COMPLETED** *(specification)* |
| **IU-5.4** | Project Certification | Project Certification **evaluation** — issuance conditional | **COMPLETED** *(evaluation — BLOCKED)* |

**Actual deliverables issued:**

| Deliverable | Status |
|-------------|--------|
| [`E-02-Acceptance-Report.md`](E-02-Acceptance-Report.md) v1.0 | **ISSUED** — ACCEPTANCE_BLOCKED |
| [`E-02-Project-Certification.md`](E-02-Project-Certification.md) | **NOT ISSUED** |

```
4 / 4 IU COMPLETED ≠ PHASE 5 COMPLETION DOCUMENT ISSUED
4 / 4 IU COMPLETED ≠ PHASE 5 CERTIFIED
4 / 4 IU COMPLETED ≠ E-02 PROJECT CERTIFIED
```

**Authority gaps — RESOLVED (v1.1):**

| Topic | v1.0 status | v1.1 disposition |
|-------|-------------|------------------|
| Executable implementation locus | REQUIRES AUTHORITY CONFIRMATION | **VAQ-001 RESOLVED** — **E-02 Executable Remediation Stage** (§23) |
| Project Certification vs executable blockers | REQUIRES AUTHORITY CONFIRMATION | **VAQ-010 = YES** · **VAQ-007 = NO** (§15 · §19) |
| Phase 5 Completion while Project Cert blocked | PCQ-002 unresolved | **PCQ-002 = YES WITH FOLLOW-UP** (§19) |
| Phase 5 Certification while Project Cert blocked | PCQ-003 unresolved | **PCQ-003 = YES SCOPED** (§19) |
| Ownership sequencing | VAQ-003 open | **VAQ-003 = RESOLVED AT AUTHORITY LEVEL** — sequencing deferred to remediation design (§23) |

---

## 4. Entry Gate

### 4.1 Pre-Phase-5 program state (verified at plan creation)

| Criterion | Required state | Verified |
|-----------|----------------|----------|
| Phase 1 | **CERTIFIED COMPLETE** | ✓ [`E-02-Phase-1-Certification.md`](E-02-Phase-1-Certification.md) |
| Phase 2 | **CERTIFIED COMPLETE** | ✓ [`E-02-Phase-2-Certification.md`](E-02-Phase-2-Certification.md) |
| Phase 3 | **CERTIFIED COMPLETE** | ✓ [`E-02-Phase-3-Certification.md`](E-02-Phase-3-Certification.md) |
| Phase 4 | **CERTIFIED COMPLETE** | ✓ [`E-02-Phase-4-Certification.md`](E-02-Phase-4-Certification.md) |
| Phase 4 Baseline | **CERTIFIED** | ✓ Phase 4 Certification |
| E-02 overall | **IN PROGRESS** | ✓ |
| E-02 Project Certification | **NOT ISSUED** | ✓ |
| Runtime COMMITTED | **NOT CERTIFIED** | ✓ |
| Executable Final COMMIT Path | **BLOCKED** | ✓ |
| E-03 | **BLOCKED** | ✓ pending E-02 Project Certification |
| E-04 | **NOT STARTED** | ✓ |

### 4.2 Phase 5 entry condition (Program Plan)

| Condition | Source | Status |
|-----------|--------|--------|
| Phase 4 certified | Program Plan §Phase 5 · §359 | **SATISFIED** |

```
PHASE 5 ENTRY GATE: SATISFIED
```

Phase 5 planning **may proceed**. Phase 5 IU execution **does not** lift executable blockers by entry alone.

---

## 5. Certified Phase 1–4 Contract Consumption

Phase 5 **consumes** the following certified contracts. Phase 5 **must not** reopen settled semantics unless repository evidence creates genuine contradiction.

### 5.1 Permanent rules (inherited)

| Rule | Status entering Phase 5 |
|------|-------------------------|
| **INTEGRATE / CONSUME CERTIFIED CONTRACTS. DO NOT REDEFINE THEM.** | **LOCKED** |
| Certified **FreezeContext** semantics | **LOCKED** |
| Phase 1 validation / ownership boundaries | **LOCKED** |
| Phase 2 frozen materialization semantics | **LOCKED** |
| Phase 3 Atomic Commit Set **A–G** | **LOCKED** |
| Artifact **F** = **VERIFY-ONLY** | **LOCKED** |
| Artifact **G** = mandatory **Primary Audit** | **LOCKED** |
| **NO PRIMARY AUDIT → NO COMMITTED FREEZE** | **LOCKED** |
| **COMMIT_READY ≠ COMMIT_SET_VERIFIED** | **LOCKED** |
| **COMMIT_PREPARED ≠ AUDIT_PREPARED** | **LOCKED** |
| **COMMIT_AUTHORIZED ≠ COMMITTING ≠ COMMITTED** | **LOCKED** |
| Client acknowledgement ≠ **COMMITTED** authority | **LOCKED** |
| **COMMIT_OUTCOME_UNCERTAIN → DURABLE RECONCILIATION FIRST** | **LOCKED** |
| Rolled-back identities **NEVER reused** | **LOCKED** |
| **ADOPT THE CERTIFIED REPOSITORY. DO NOT REBUILD IT.** | **LOCKED** |
| `loadByOwnerVoteMeetingId` = **AUTHORITATIVE PRIMARY LOOKUP** | **LOCKED** |
| `loadByFreezeEventId` = **EXPLICIT EVENT IDENTITY LOOKUP** | **LOCKED** |
| **EVENT IDENTITY LOOKUP ≠ AUTHORITATIVE PRIMARY LOOKUP** | **LOCKED** |
| **PRIMARY CROSS-ENTRY EQUIVALENCE ≠ COMMITTED** proof | **LOCKED** |
| **LEGACY_MEETING ≠ E-02 AUTHORITATIVE EVENT-LINKED FREEZE** | **LOCKED** |
| **READ COMPLETENESS ≠ COMMITTED COMPLETENESS** | **LOCKED** |
| **NO LIVE RECONSTRUCTION** | **LOCKED** |

### 5.2 Certified baseline records consumed

| Phase | Certification record | What Phase 5 consumes |
|-------|---------------------|------------------------|
| **1** | [`E-02-Phase-1-Certification.md`](E-02-Phase-1-Certification.md) | Freeze Event identity · validation fail-closed · transaction boundary design |
| **2** | [`E-02-Phase-2-Certification.md`](E-02-Phase-2-Certification.md) | Voter / resolution / motion materialization design · correlation pre-check |
| **3** | [`E-02-Phase-3-Certification.md`](E-02-Phase-3-Certification.md) | Atomic Commit Set A–G · Primary Audit logical contract · idempotency / reconciliation design |
| **4** | [`E-02-Phase-4-Certification.md`](E-02-Phase-4-Certification.md) | Repository integration baseline · dual-entry semantics · IVI invariants · executable gap classification |

### 5.3 Settled questions — do not reopen

Unless repository evidence contradicts certified records, Phase 5 **shall not** reopen:

- ACQ / AQ / IQ / ARQ / IVQ / RAI questions marked **RESOLVED** in Phase 1–4 Completion / Certification chains
- RA-4.1-002 legacy bypass classification (**deferred to E-04**)
- RA-4.2-002 consumer migration classification (**deferred to E-04**)
- RA-4.2-001 property correlation gap classification (**executable enforcement pending**)

---

## 6. Known Executable Gaps at Phase 5 Entry

Inventory verified from [`E-02-Phase-4-Certification.md`](E-02-Phase-4-Certification.md) §28 and upstream Phase 3 Certification. Phase 5 **classifies** ownership; Phase 5 **does not** assume it owns implementation (Program Plan: no new engineering functionality).

| # | Gap | Classification | Owner / gate |
|---|-----|----------------|--------------|
| 1 | Primary Audit physical persistence target | **EXECUTABLE VERIFICATION** · **PROJECT CERTIFICATION GATE** | **E-02 Executable Remediation Stage** (§23) — **NOT YET AUTHORIZED** |
| 2 | Primary Audit immutable persistence enforcement | **EXECUTABLE VERIFICATION** · **PROJECT CERTIFICATION GATE** | Same |
| 3 | Primary Audit same-transaction INSERT (Artifact G in A–G envelope) | **EXECUTABLE VERIFICATION** · **PROJECT CERTIFICATION GATE** | Same |
| 4 | Atomic transaction envelope / server-side orchestration | **EXECUTABLE VERIFICATION** · **PROJECT CERTIFICATION GATE** | Phase 4 certified browser-side sequential ops **insufficient**. Server RPC = **candidate/proposed** only unless future authority certifies. Phase 5 verifies/classifies; **does not implement**. |
| 5 | Durable ownership / coordination persistence | **EXECUTABLE VERIFICATION** · **DOWNSTREAM OWNED** (implementation) | Phase 5 verifies classification preserved |
| 6 | Durable reconciliation persistence / queries | **EXECUTABLE VERIFICATION** · **DOWNSTREAM OWNED** (implementation) | Phase 5 verifies classification preserved |
| 7 | Final COMMIT orchestration | **EXECUTABLE VERIFICATION** · **PROJECT CERTIFICATION GATE** | Phase 5 verifies evidence; **does not execute COMMIT** |
| 8 | Runtime **COMMITTED** authority | **PROJECT CERTIFICATION GATE** | **NOT CERTIFIED** at Phase 5 entry; Phase 5 must not claim |
| 9 | Concurrency / rollback executable verification | **EXECUTABLE VERIFICATION** | EIR — Phase 5 IU-5.1 inventory |
| 10 | `resolutionSnapshot.property_id` correlation enforcement | **EXECUTABLE VERIFICATION** · **KNOWN EXECUTABLE OBLIGATION** (RA-4.2-001) | **NOT FIXED** — do not mark PASS |
| 11 | `frozenMotion.property_id` correlation enforcement | **EXECUTABLE VERIFICATION** · **KNOWN EXECUTABLE OBLIGATION** (RA-4.2-001) | **NOT FIXED** |
| 12 | Consumer / direct-table migration | **E-04 OWNED** (RA-4.2-002) | Phase 5 **must not** migrate |
| 13 | Legacy freeze RPC bypass / isolation | **E-04 OWNED** (RA-4.1-002) | Phase 5 **must not** remove |
| 14 | Prior-phase EV obligations (Phase 3 + EV-4.1 + EV-4.2) | **EXECUTABLE VERIFICATION** | Phase 5 IU-5.1 EIR planning |

**Phase 5 owned scope (verification only):** gap classification accuracy · evidence traceability · EIR deduplication planning · Acceptance Report · Project Certification readiness determination.

**Phase 5 explicitly does NOT own:** schema creation · RPC implementation · consumer migration · legacy RPC removal · runtime COMMIT execution.

---

## 7. Primary Audit Blocker

Carried forward from Phase 3–4 Certification without semantic change.

| Item | Status |
|------|--------|
| **PRIMARY AUDIT PERSISTENCE GAP** | **CONFIRMED** |
| Logical contract | **CERTIFIED** (Phase 3 IU-3.2 baseline) |
| Physical persistence | **PENDING EXECUTABLE IMPLEMENTATION** |
| Runtime INSERT | **NOT IMPLEMENTED** |
| CI-4 runtime satisfaction | **PENDING** |
| Executable Final COMMIT Path | **BLOCKED** |

```
NO PRIMARY AUDIT → NO COMMITTED FREEZE
```

Phase 5 **must not** silently convert this blocker into a planning-only issue. IU-5.1 **shall** verify the blocker remains accurately classified in all downstream evidence. IU-5.4 **shall not** issue Project Certification that implies runtime Primary Audit exists without executable evidence.

---

## 8. Atomic Transaction Envelope Gap

| Item | Status |
|------|--------|
| **REPOSITORY INTEGRATION GAP — ATOMIC TRANSACTION ENVELOPE** | **CONFIRMED** |
| Certified finding | Browser-side sequential Supabase operations are **insufficient** for Phase 1 → Phase 2 → Phase 3 atomic envelope |
| Transaction orchestration | **PENDING EXECUTABLE IMPLEMENTATION** |
| Server-side RPC | **Candidate/proposed** — **not authoritative** unless future implementation authority certifies |

**Phase 5 disposition (from Program Plan authority):**

| Action | Authorized? |
|--------|-------------|
| Design executable mechanism | **NO** — no new engineering functionality |
| Implement mechanism | **NO** |
| Verify evidence / classify gap | **YES** — IU-5.1 |
| Carry blocker forward in Acceptance Report | **YES** — IU-5.3 |

Phase 5 **does not** choose server RPC as final authority merely because Phase 4 described it as likely.

---

## 9. Ownership / Reconciliation Gap

| Item | Status |
|------|--------|
| **OWNERSHIP PERSISTENCE / COORDINATION GAP** | **CONFIRMED** |
| Durable ownership | **PENDING EXECUTABLE** |
| Durable reconciliation | **PENDING EXECUTABLE** |
| **COMMIT_OUTCOME_UNCERTAIN → DURABLE RECONCILIATION FIRST** | **LOCKED** |

Phase 5 **must not** invent an ownership table or persistence schema. Phase 5 verifies that certified Phase 3 recovery semantics remain traceable in evidence and that Acceptance Report documents executable status accurately.

**Ownership table / schema authority:** Deferred to **E-02 Executable Remediation Stage** design — **VAQ-003 resolved at authority level** (§23.3).

---

## 10. Property Correlation Gap (RA-4.2-001)

| Item | Status |
|------|--------|
| **RA-4.2-001** | **RESOLVED FOR IMPLEMENTATION READINESS; EXECUTABLE PROPERTY CORRELATION ENFORCEMENT PENDING** |
| `resolutionSnapshot.property_id` vs `meeting.property_id` / `freezeEvent.property_id` | **NOT ENFORCED** |
| `frozenMotion.property_id` vs `meeting.property_id` / `freezeEvent.property_id` | **NOT ENFORCED** |
| FK validity alone | **Does not prove equality** |

**Repository evidence:** `assertBundleCorrelation` in `src/lib/ownerVote/snapshotDomain/validators.ts` asserts voter `property_id` and freeze-event correlation but **does not** cross-assert resolution snapshot or frozen motion `property_id` against meeting / freeze event (lines 190–225).

**Phase 5 classification:** **EXECUTABLE VERIFICATION** — Phase 5 verifies gap remains documented; **does not** mark fixed.

---

## 11. Consumer / Legacy Boundary

Carried forward from Phase 4 Certification.

| Item | Status |
|------|--------|
| External `FrozenMeetingBundleRepository` consumers | **ZERO** |
| Direct-table bypass candidates | **4** (certified Phase 4 inventory) |
| Legacy freeze RPC UI calls | **Present** |
| **RA-4.2-002** | Consumer migration **deferred to E-04** |
| **RA-4.1-002** | Legacy bypass executable migration **deferred to E-04** |

**Phase 5 MUST NOT:**

- Migrate UI consumers to E-02 orchestration or repository
- Remove legacy RPC calls
- Start E-04
- Claim production repository adoption

**E-03 / E-04 at plan creation:**

| Program | Status |
|---------|--------|
| **E-03** | **BLOCKED** pending E-02 Project Certification |
| **E-04** | **NOT STARTED** |

Phase 5 **must not** change `owner_vote_meetings.status`, open voting behavior, or modify owner-vote UI paths.

---

## 12. Repository Investigation (Read-Only)

Investigation performed for Phase 5 planning only. **No repository modifications.**

### 12.1 Migration head

| Item | Evidence |
|------|----------|
| Latest E-01 migration in repo | `supabase/migrations/20261728120000_e01_iu32_resolution_snapshot_immutability.sql` |
| Primary Audit table migration | **Absent** — grep across `supabase/migrations/` finds no primary audit / freeze audit table |
| E-02 transaction orchestration RPC | **Absent** in repo migrations |

### 12.2 Snapshot domain repository

| Item | Evidence |
|------|----------|
| Repository location | `src/lib/ownerVote/snapshotDomain/` |
| Factory | `createFrozenMeetingBundleRepository()` · exported singleton `frozenMeetingBundleRepository` |
| Primary lookup | `loadByOwnerVoteMeetingId` — **AUTHORITATIVE PRIMARY LOOKUP** |
| Event lookup | `loadByFreezeEventId` — **EXPLICIT EVENT IDENTITY LOOKUP** |
| Correlation assertion | `assertBundleCorrelation` — partial; property_id gap confirmed (§10) |
| External consumers | **ZERO** — only defined/exported within `snapshotDomain` |

### 12.3 Legacy / bypass call sites (confirmed present)

| Call site | Evidence |
|-----------|----------|
| `freeze_owner_vote_snapshot` | `src/pages/meeting/MeetingDetail.tsx` L1019 · L2023 |
| `freeze_owner_vote_snapshot` | `src/components/meetings/MeetingOwnerVoteCouncilSection.tsx` L393 |
| `set_owner_vote_snapshot_freeze_at` | `src/features/meetings/api.ts` L2232 |
| Direct-table reads (Phase 4 inventory) | `MeetingDetail.tsx` · `api.ts` · `useImportantUpdatesBullets.ts` |

### 12.4 Persistence tables (read path exists; write orchestration absent)

| Table | Read in repository | E-02 write orchestration |
|-------|---------------------|--------------------------|
| `owner_vote_meetings` | ✓ | **Not implemented** |
| `owner_vote_freeze_events` | ✓ | **Not implemented** |
| `owner_vote_voter_snapshot` | ✓ | **Not implemented** |
| `owner_vote_resolution_snapshot` | ✓ | **Not implemented** |
| `owner_vote_frozen_motions` | ✓ | **Not implemented** |
| Primary Audit | ✗ | **Not implemented** |

### 12.5 Investigation finding summary

Repository state **consistent with** Phase 4 Certification: certified read repository exists; executable commit / audit / orchestration path **not present**; legacy production freeze path **unchanged**.

---

## 13. Implementation Units

IUs **shall** execute in order **5.1 → 5.2 → 5.3 → 5.4** (Program Plan §8). IU numbering and titles are **exact** — no additional IUs.

### IU-5.1 — Engineering Verification

| Field | Value |
|-------|-------|
| **Objective** | Cross-check Architecture Authority, Phases 1–4 evidence, schema alignment, and executable gap classification |
| **Inputs** | Phase 1–4 Certification · Completion · IU records · Architecture Authority · RC-011 · repository read-only investigation |
| **Outputs** | [`E-02-IU-5.1-Implementation.md`](E-02-IU-5.1-Implementation.md) · `E-02-IU-5.1-Completion.md` · EIR inventory draft |
| **Dependencies** | Phase 4 Certification · this Phase 5 Plan |
| **Owned gaps** | EIR deduplication planning · evidence traceability · blocker classification verification |
| **Non-owned gaps** | Primary Audit implementation · transaction envelope implementation · consumer migration |
| **Entry criteria** | Phase 5 entry gate satisfied · this plan approved |
| **Exit criteria** | Engineering evidence matrix complete · Architecture Authority traceability documented · executable gaps classified · EIR inventory established or explicitly deferred with authority citation |
| **Executable boundary** | Read-only repository queries permitted for evidence; **no** code / SQL changes |
| **Downstream hand-off** | Findings feed IU-5.2 acceptance checklist and IU-5.3 Acceptance Report |

**Verification scope:**

- Blueprint §10 · Architecture Authority §3–§6 · §13 traceability
- Phase 1–4 Completion and Certification records
- Database schema alignment (migrations through `20261728120000`)
- `snapshotDomain` read contract · dual-entry semantics · IVI inheritance
- Primary Audit · transaction · ownership · reconciliation blocker preservation
- Phase 3 EV obligations + EV-4.1 + EV-4.2 status (**PENDING** — do not mark PASS)

---

### IU-5.2 — Acceptance Validation

| Field | Value |
|-------|-------|
| **Objective** | Validate E-02 outcomes against Work Breakdown Task E-02 completion criteria |
| **Inputs** | IU-5.1 findings · [`M2-S3-Engineering-Work-Breakdown.md`](M2-S3-Engineering-Work-Breakdown.md) Task E-02 · VA invariants |
| **Outputs** | `E-02-IU-5.2-Implementation.md` · `E-02-IU-5.2-Completion.md` · acceptance checklist matrix |
| **Dependencies** | IU-5.1 Complete |
| **Owned gaps** | Work Breakdown criteria mapping · deferred-scope documentation |
| **Non-owned gaps** | Executable implementation of freeze transaction |
| **Entry criteria** | IU-5.1 Complete |
| **Exit criteria** | Each Work Breakdown completion criterion mapped to evidence or explicit blocker · constitutional invariants verified against certified baselines |
| **Executable boundary** | Validation documentation only |
| **Downstream hand-off** | Checklist inputs IU-5.3 Acceptance Report |

**Work Breakdown E-02 completion criteria to validate** (Program Plan §10 · Work Breakdown §Completion):

| Criterion | Phase 5 action |
|-----------|----------------|
| Freeze transaction commits atomically per Blueprint §10 | Map to evidence or document executable blocker |
| Audit record generated exactly once per successful freeze | Map to Primary Audit gap — **must not** claim PASS without runtime evidence |
| Re-freeze cannot silently rebuild immutable snapshot | Map to Phase 3 INV-8 design + legacy path boundary |
| CITM rows 4, 12 implemented; rows 1, 2, 5 updated | IU-5.3 row closure |

---

### IU-5.3 — Acceptance Report

| Field | Value |
|-------|-------|
| **Objective** | Produce task-level verification and acceptance evidence (EPS-001) |
| **Inputs** | IU-5.1 · IU-5.2 · full E-02 document chain |
| **Outputs** | [`E-02-Acceptance-Report.md`](E-02-Acceptance-Report.md) *(Program Plan §495)* · `E-02-IU-5.3-Completion.md` |
| **Dependencies** | IU-5.2 Complete |
| **Owned gaps** | EPS-001 evidence packaging · CITM row evidence · explicit deferred executable scope |
| **Non-owned gaps** | Executable closure of Primary Audit / COMMIT path |
| **Entry criteria** | IU-5.2 Complete |
| **Exit criteria** | Acceptance Report draft complete and ready for approval gate |
| **Executable boundary** | Documentation only |
| **Downstream hand-off** | IU-5.4 Project Certification decision input |

**CITM rows in E-02 scope** (Work Breakdown · IA-001):

| CITM # | Item | Evidence source |
|--------|------|-----------------|
| **4** | Freeze atomic event | Phases 1–3 design · Phase 4 integration |
| **12** | Freeze audit record | Phase 3 IU-3.2 · Primary Audit gap |
| **5** | Snapshot immutability post-freeze (freeze-path) | E-01 hooks + Phase 3 commit design |
| **1** | Voter snapshot materialization (freeze-path) | Phase 2 IU-2.1 |
| **2** | Resolution snapshot / frozen instrument (freeze-path) | Phase 2 IU-2.2 · IU-2.3 |

---

### IU-5.4 — Project Certification

| Field | Value |
|-------|-------|
| **Objective** | Determine whether E-02 task may close within approved scope and issue E-02 Project Certification |
| **Inputs** | IU-5.1–5.3 · Program Plan §13 exit criteria · Work Breakdown completion criteria |
| **Outputs** | `E-02-IU-5.4-Implementation.md` · `E-02-IU-5.4-Completion.md` · recommendation for [`E-02-Project-Certification.md`](E-02-Project-Certification.md) |
| **Dependencies** | IU-5.3 Complete · Acceptance Report approved |
| **Owned gaps** | Accept/Reject/Conditional determination · E-03 handoff prerequisites |
| **Non-owned gaps** | E-03 Implementation Plan · executable COMMIT path |
| **Entry criteria** | Acceptance Report approved |
| **Exit criteria** | Project Certification readiness determination documented · **E-02-Project-Certification.md issued only if authority criteria met** |
| **Executable boundary** | Certification documentation only — **no** runtime certification |
| **Downstream hand-off** | E-02 Project Certification → E-03 authorization gate · `E-02-Engineering-Baseline.md` post certification |

**Critical distinction:**

| Certification type | Meaning |
|--------------------|---------|
| **Phase 5 Completion / Certification** | Phase 5 verification work closed |
| **E-02 Project Certification** | E-02 task closed within approved scope (IU-5.4 deliverable) |
| **Runtime COMMITTED certification** | **Separate** — **NOT ISSUED** while Executable Final COMMIT Path BLOCKED unless explicit authority says otherwise (**REQUIRES AUTHORITY CONFIRMATION**) |

---

## 14. Phase 5 Invariants (VA-)

Prefix **VA-** (Verification & Acceptance). Does not conflict with CI · MI · PI · AI · PA · II · RAI · IVI.

| ID | Invariant |
|----|-----------|
| **VA-1** | Phase 5 **consumes** certified Phase 1–4 contracts; **does not redefine** them |
| **VA-2** | No silent semantic redefinition of **COMMITTED**, **Primary Audit**, or **FreezeContext** |
| **VA-3** | **NO PRIMARY AUDIT → NO COMMITTED FREEZE** preserved in all acceptance evidence |
| **VA-4** | **READ COMPLETENESS ≠ COMMITTED COMPLETENESS** — bundle load success is not COMMITTED proof |
| **VA-5** | **PRIMARY CROSS-ENTRY EQUIVALENCE ≠ COMMITTED** proof |
| **VA-6** | **LEGACY_MEETING ≠ E-02 AUTHORITATIVE EVENT-LINKED FREEZE** |
| **VA-7** | Artifact **F** remains **VERIFY-ONLY**; Artifact **G** remains mandatory Primary Audit |
| **VA-8** | Same-envelope atomicity requirement **documented** where applicable; not claimed satisfied without executable evidence |
| **VA-9** | **NO LIVE RECONSTRUCTION** — verification reads materialized state only |
| **VA-10** | Rolled-back identities **NEVER reused** — verified in evidence review |
| **VA-11** | **COMMIT_OUTCOME_UNCERTAIN → DURABLE RECONCILIATION FIRST** |
| **VA-12** | Fail-closed behavior on ambiguous acceptance evidence |
| **VA-13** | Phase 5 introduces **no new engineering functionality** |
| **VA-14** | Executable obligations **PENDING** remain **PENDING** until executable evidence PASS |
| **VA-15** | Phase 5 Plan / Completion / Certification **≠** runtime COMMITTED certification |
| **VA-16** | **ADOPT THE CERTIFIED REPOSITORY. DO NOT REBUILD IT.** |
| **VA-17** | `loadByOwnerVoteMeetingId` = **AUTHORITATIVE PRIMARY LOOKUP** preserved |
| **VA-18** | `loadByFreezeEventId` = **EXPLICIT EVENT IDENTITY LOOKUP** preserved |
| **VA-19** | E-03 scope (voting) **must not leak** into Phase 5 acceptance |
| **VA-20** | E-04 scope (consumer migration · legacy bypass · scheduler) **must not leak** into Phase 5 execution |
| **VA-21** | Project Certification **must not** precede required acceptance evidence |
| **VA-22** | Property correlation gap (RA-4.2-001) **must not** be marked fixed without executable enforcement evidence |

---

## 15. Phase 5 Questions (VAQ-)

### 15.1 Resolved authority questions (v1.1)

| ID | Question | Disposition | Authority |
|----|----------|-------------|-----------|
| **VAQ-001** | Where are remaining executable obligations implemented? | **RESOLVED** — **E-02 Executable Remediation Stage** (§23) | PAD-003 · Program Plan v1.1 §19 |
| **VAQ-003** | Where / how is durable ownership persisted and sequenced? | **RESOLVED AT AUTHORITY LEVEL** — locus established; detailed sequencing **DEFERRED** to remediation design | PAD-004 · §23.3 |
| **VAQ-007** | Can Project Certification issue while COMMIT Path BLOCKED? | **RESOLVED — NO** | PAD-002 · §19 |
| **VAQ-010** | Do Work Breakdown executable criteria require runtime PASS for Project Certification? | **RESOLVED — YES** | PAD-001 · §15.2 |

**VAQ-010 locked rules:**

```
design/readiness completion ≠ executable completion
static verification ≠ runtime verification
22 PASS ≠ executable readiness
ZERO FAIL ≠ acceptance pass
Acceptance Report issuance ≠ Project Certification eligibility
Project Certification Evaluation completed ≠ Project Certification issuance
NO EXECUTABLE EVIDENCE → NO EXECUTABLE PASS
```

**VAQ-007 current consequence:** Phase 5 Completion / Certification **MUST NOT** be interpreted as authorization to issue Project Certification while **ACCEPTANCE_BLOCKED** and **COMMIT Path BLOCKED**.

### 15.2 Remaining VAQ register (unchanged or open)

Questions target **genuine unresolved facts**. Settled semantics are not reopened.

| ID | Question | Evidence | Disposition | Owner | Gate |
|----|----------|----------|-------------|-------|------|
| **VAQ-002** | What repository mechanism can hold the full Phase 1→2→3 transaction? | Browser sequential ops insufficient (Phase 4 certified) | Verify gap preserved; server RPC = candidate only | Remediation design | Executable Remediation |
| **VAQ-004** | How is **COMMIT_OUTCOME_UNCERTAIN** reconciled at runtime? | Recovery Model §5; no reconciliation persistence | Verify design traceability; executable **PENDING** | Remediation design | EIR |
| **VAQ-005** | What durable evidence distinguishes runtime **COMMITTED**? | Primary Audit gap; no COMMITTED helper wired | **FAIL CLOSED** — cannot certify COMMITTED | Re-Verification | Runtime certification |
| **VAQ-006** | Which constraint arbitrates concurrent freeze attempts? | Phase 3 IU-3.3 design; indexes exist partially | Map to EV obligations; executable **PENDING** | Remediation design | EIR |
| **VAQ-008** | Which Phase 3 EV obligations belong to Phase 5 vs EIR-only? | Phase 3 Certification §EV inventory | IU-5.1 established deduplicated EIR — **historical** | Re-Verification | EIR |
| **VAQ-009** | What must exist before E-02 Engineering Baseline? | Program Plan §16 | Map at Project Certification re-evaluation | IU-5.4-R | Project Certification |
| **VAQ-011** | When / where are RA-4.2-001 property_id assertions implemented? | `validators.ts` gap confirmed | **EXECUTABLE VERIFICATION** — remediation scope | Remediation design | EIR |
| **VAQ-012** | Aggregate unique EIR count? | IU-5.1 established **84 canonical EIR** — **historical baseline** | **RESOLVED at IU-5.1** — forward changes via Re-Verification only | Re-Verification | EIR |

**Question status (v1.1):** **4 RESOLVED** (VAQ-001 · VAQ-003 · VAQ-007 · VAQ-010) · **8 open/deferred to remediation or re-verification**

---

## 16. Executable Verification / EIR Inventory

### 16.1 Inherited obligation sets (do not auto-sum — overlaps exist)

| Source | ID range | Count | Status entering Phase 5 |
|--------|----------|-------|-------------------------|
| Phase 3 IU-3.1 | EV-3.1-* | **32** | **PENDING VERIFICATION** |
| Phase 3 IU-3.2 | EV-3.2-* | **40** | **PENDING VERIFICATION** |
| Phase 3 IU-3.3 | EV-3.3-* | **25** | **PENDING VERIFICATION** |
| Phase 4 IU-4.1 | EV-4.1-001 – EV-4.1-020 | **20** | **PENDING VERIFICATION** |
| Phase 4 IU-4.2 | EV-4.2-001 – EV-4.2-026 | **26** | **PENDING VERIFICATION** |
| **Marked PASS** | — | **0** | — |

### 16.2 EIR planning disposition

| Category | Phase 5 action |
|----------|----------------|
| **Inherited obligation** | Catalog and trace to Architecture Authority / IU source |
| **Duplicate/overlap** | Deduplicate in IU-5.1 where same runtime test appears in multiple IU inventories |
| **Phase 5-owned verification** | Evidence that gap classification and document chain are accurate |
| **Downstream verification** | Executable runtime tests requiring implementation not authorized in Phase 5 |
| **Project Certification gate** | Obligations that block Project Certification if Work Breakdown requires runtime PASS (**VAQ-010**) |
| **E-04 verification** | Consumer migration · legacy bypass — **E-04 OWNED** |

```
AGGREGATE UNIQUE EIR COUNT: NOT YET ESTABLISHED
```

IU-5.1 is authorized to establish the deduplicated inventory per Phase 4 Certification hand-off. **This Phase 5 Plan does not mark any EV obligation PASS.**

---

## 17. Risk Register (R-135+)

Continues after R-117 – R-134 (IU-4.2). Phase 5-specific risks only.

| ID | Condition | Consequence | Mitigation | Verification gate | Owner | Status |
|----|-----------|-------------|------------|-------------------|-------|--------|
| **R-135** | Primary Audit blocker carried into acceptance without visibility | False freeze confidence · premature E-03 | VA-3 · IU-5.1 blocker matrix · Acceptance Report explicit § | IU-5.1 Complete | IU-5.1 | **OPEN** |
| **R-136** | Phase 5 Certification mistaken for runtime COMMITTED | Production voting on non-committed state | VA-15 · separate certification labels | Phase 5 Certification | Program | **OPEN** |
| **R-137** | Project Certification issued despite Work Breakdown executable gaps | Downstream E-03/E-04 built on incomplete freeze | VAQ-007 · VAQ-010 fail-closed review | IU-5.4 | IU-5.4 | **OPEN** |
| **R-138** | Transaction envelope gap hidden during acceptance | Partial commit assumed atomic | VA-8 · §8 visibility | IU-5.1 | IU-5.1 | **OPEN** |
| **R-139** | Ownership race not documented in Acceptance Report | Concurrent freeze unsafe retry | VA-11 · Phase 3 recovery trace | IU-5.3 | IU-5.3 | **OPEN** |
| **R-140** | Uncertain commit replay without reconciliation | Duplicate or orphan artifacts | VA-11 · COMMIT_OUTCOME_UNCERTAIN preserved | EIR | IU-5.1 | **OPEN** |
| **R-141** | Identity reuse after rollback | Constitutional INV-8 breach | VA-10 evidence review | EIR | IU-5.1 | **OPEN** |
| **R-142** | property_id gap marked fixed in acceptance docs | Tenant isolation breach | VA-22 · RA-4.2-001 preserved | IU-5.2 | IU-5.2 | **OPEN** |
| **R-143** | Premature consumer migration during Phase 5 | Scope breach · E-04 bypass | VA-20 · §11 boundary | Phase 5 boundary check | Program | **OPEN** |
| **R-144** | Legacy RPC removal attempted | Production freeze regression | VA-20 · RA-4.1-002 deferred | Phase 5 out-of-scope | E-04 | **OPEN** |
| **R-145** | EV obligation marked PASS from documentation alone | False executable certification | VA-14 · §16 | IU-5.1 EIR | IU-5.1 | **OPEN** |
| **R-146** | E-03 voting scope leaks into acceptance validation | Voting contract pre-implemented | VA-19 | IU-5.2 boundary | IU-5.2 | **OPEN** |
| **R-147** | CITM row 4/12 marked implemented without executable audit | Compliance traceability false | IU-5.3 explicit partial/foundation labels | Acceptance Report | IU-5.3 | **OPEN** |
| **R-148** | EIR overlap double-counted as PASS | Verification completeness inflated | §16 deduplication in IU-5.1 | EIR inventory | IU-5.1 | **OPEN** |
| **R-149** | Acceptance Report approved before IU-5.1/5.2 complete | Missing evidence | IU ordering rule §18 | Phase 5 Completion | Program | **OPEN** |
| **R-150** | Engineering Baseline issued without Project Certification | Document chain breach | Program Plan §16 order | IU-5.4 | IU-5.4 | **OPEN** |

---

## 18. Success Criteria

Derived from Program Plan §Phase 5 · §13 · §10. Three layers distinguished.

### 18.1 Design / readiness success (Phase 5 Plan)

| Criterion | Status at plan creation |
|-----------|---------------------------|
| Phase 5 Implementation Plan approved | **MET** (this document) |
| Entry gate verified | **MET** |
| IU registry matches Program Plan §8 | **MET** |
| Certified contracts consumed not redefined | **MET** |
| Executable gaps inventoried and classified | **MET** |

### 18.2 Phase 5 process exit (IU / Phase documentation — PCQ-002 / PCQ-003)

| Criterion | Required | Status (2026-08-21) |
|-----------|----------|---------------------|
| IU-5.1 Complete | ✓ | **MET** |
| IU-5.2 Complete | ✓ | **MET** |
| IU-5.3 Complete | ✓ | **MET** |
| IU-5.4 Complete | ✓ | **MET** |
| Acceptance Report **issued** | ✓ | **MET** — v1.0 ACCEPTANCE_BLOCKED |
| Phase 5 Completion issued — **`Completed with Follow-up`** | ✓ | **NOT YET ISSUED** — **AUTHORITY-PERMITTED** |
| Phase 5 Certification issued — **scoped** | ✓ | **NOT YET ISSUED** — **AUTHORITY-PERMITTED after Completion** |

```
PHASE 5 PROCESS EXIT ≠ E-02 PROJECT CERTIFICATION GATE SATISFIED
```

### 18.3 Executable success (NOT Phase 5 original IU scope)

| Criterion | Status |
|-----------|--------|
| Executable Final COMMIT Path available | **NOT MET — BLOCKED** |
| Runtime COMMITTED certified | **NOT MET** |
| Primary Audit runtime INSERT | **NOT MET** |
| Work Breakdown executable verification criteria PASS | **NOT MET** — **VAQ-010 = YES** requires executable evidence |

### 18.4 E-02 program exit (Project Certification — separate from Phase 5 process exit)

| Criterion | Required | Status |
|-----------|----------|--------|
| Work Breakdown E-02 executable completion criteria met | ✓ | **NOT MET** |
| Acceptable acceptance decision (not ACCEPTANCE_BLOCKED) | ✓ | **NOT MET** |
| E-02 Project Certification issued | ✓ | **NOT ISSUED** |
| E-03 authorized to begin | Follows Project Certification | **BLOCKED** |

**Note:** Phase 5 may **process-close** with **ACCEPTANCE_BLOCKED** while E-02 program exit remains blocked.

---

## 19. Phase 5 Exit / Project Certification Relationship

### 19.1 Phase 5 process exit gates (v1.1 — PCQ-002 / PCQ-003)

**Authoritative Phase 5 process exit** *(does not require Project Certification issued):*

| Step | Requirement | Status (2026-08-21) |
|------|-------------|---------------------|
| 1 | IU-5.1 **COMPLETED** | ✓ |
| 2 | IU-5.2 **COMPLETED** | ✓ |
| 3 | IU-5.3 **COMPLETED** | ✓ |
| 4 | Acceptance Report **ISSUED** | ✓ — ACCEPTANCE_BLOCKED |
| 5 | IU-5.4 Project Certification Evaluation **COMPLETED** | ✓ — BLOCKED |
| 6 | Phase 5 Completion issued — **`Completed with Follow-up`** | **NOT YET ISSUED** |
| 7 | Phase 5 Certification issued — **scoped** | **NOT YET ISSUED** |

**PCQ-002 = RESOLVED — YES WITH FOLLOW-UP**

Phase 5 Completion **MAY** issue because IU-5.1–5.4 are COMPLETED and Acceptance Report is ISSUED, **even though** E-02 Acceptance = **ACCEPTANCE_BLOCKED**.

**Phase 5 Completion answers:** *Did Phase 5 perform and complete its authorized verification, acceptance-validation, reporting, and certification-evaluation work?*

**Current answer after formal Completion document (when issued):** **YES — COMPLETED WITH FOLLOW-UP**

**Phase 5 Completion does NOT answer:** *Did E-02 satisfy all executable certification requirements?* — **Current answer: NO**

**PCQ-003 = RESOLVED — YES SCOPED**

Phase 5 Certification **MAY** issue after Phase 5 Completion. Scope **strictly limited to:**

- Engineering Verification process correctness
- Evidence classification correctness
- Acceptance Validation process correctness
- fail-closed acceptance disposition
- Acceptance Report correctness
- Project Certification Evaluation correctness
- governance / reporting integrity
- preservation of unresolved blockers and authority gaps

**Phase 5 Certification MUST NOT certify:** executable E-02 completeness · Primary Audit runtime · transaction · ownership · reconciliation · Runtime COMMITTED · COMMIT Path · full property_id enforcement · E-02 Project Certification · E-03 readiness.

```
CERTIFICATION OF THE PROCESS ≠ CERTIFICATION OF E-02 EXECUTABLE COMPLETENESS
PHASE 5 CERTIFICATION ≠ E-02 PROJECT CERTIFICATION
```

A correctly executed Phase 5 may validly conclude **ACCEPTANCE_BLOCKED** and still be **Phase-5-process certified**.

### 19.2 E-02 program exit gates (distinct — requires Project Certification)

| Gate | Requirement | Authority |
|------|-------------|-----------|
| **E-02 Project Certification** | `E-02-Project-Certification.md` **issued** — gate **CLOSED** | Program Plan v1.1 §21 |
| **E-02 Engineering Baseline** | Post Project Certification | Program Plan §16 |
| **E-03 authorization** | E-02 Project Certification **issued** only | PAD-010 · Program Plan §13.3 |

Phase 5 Completion / Certification **do not** satisfy E-02 program exit.

### 19.3 Explicit non-equivalences (locked)

```
Phase 5 Completion ≠ E-02 Project Certification
Phase 5 Certification ≠ E-02 Project Certification
Phase 5 Certification ≠ runtime COMMITTED certification
E-02 Project Certification ≠ Executable Final COMMIT Path unblocked
4 / 4 IU COMPLETED ≠ PHASE 5 COMPLETION ISSUED
ACCEPTANCE REPORT ISSUED ≠ ACCEPTANCE PASS
PROJECT CERTIFICATION EVALUATION COMPLETED ≠ PROJECT CERTIFICATION ISSUED
```

### 19.4 Executable Final COMMIT Path

| Item | Status |
|------|--------|
| **Executable Final COMMIT Path** | **BLOCKED** |
| **VAQ-007** | **NO** — Project Certification not permitted while blocked |
| Phase 5 authorization to unblock | **NONE** in Phase 5 |

### 19.5 Blocked post-Phase-5 path (v1.1 authority)

```
Phase 5 — IU-5.1–5.4 COMPLETED
        ↓
Acceptance Report v1.0 = ACCEPTANCE_BLOCKED
        ↓
Project Certification Evaluation = PROJECT_CERTIFICATION_BLOCKED
        ↓
Program Authority Decision = APPROVED
        ↓
Program Plan v1.1
        ↓
Phase 5 Plan v1.1 = THIS AMENDMENT
        ↓
Phase 5 Completion = COMPLETED WITH FOLLOW-UP  ← next authorized doc
        ↓
Phase 5 Certification = scoped process certification
        ↓
E-02 Executable Remediation planning
        ↓
approved remediation work
        ↓
Engineering Re-Verification
        ↓
Acceptance Re-Validation
        ↓
Superseding Acceptance Report
        ↓
Project Certification Re-Evaluation
        ↓
E-02 Project Certification (only if mandatory gates pass)
        ↓
E-03
```

If gates remain blocked: **return to Executable Remediation** OR **remain PROJECT_CERTIFICATION_BLOCKED**.

**Rules:** NO AUTOMATIC PASS · NO COMPLETION-BASED STATUS PROPAGATION · NO SCORE-BASED CERTIFICATION.

### 19.6 Normal successful path (reference — not current state)

```
E-02 Phases 1–4 certified → Phase 5 → Acceptance PASS → Project Certification → E-03
```

---

## 20. Out of Scope / Prohibited Work

Phase 5 **SHALL NOT** (Program Plan §Phase 5 · user authorization):

| Prohibited action | Reason |
|-------------------|--------|
| Modify application code | Verification only |
| Modify `snapshotDomain` | Phase 4 certified baseline |
| Create / modify SQL migrations | Not authorized |
| Create / modify RPC | Not authorized |
| Implement Primary Audit table / INSERT / immutability | Executable blocker — not Phase 5 |
| Implement transaction envelope | Not Phase 5 |
| Implement ownership / reconciliation | Not Phase 5 |
| Execute final COMMIT | **BLOCKED** |
| Claim runtime **COMMITTED** | **NOT CERTIFIED** |
| Mark inherited EV obligations **PASS** without evidence | VA-14 |
| Mark property_id gap fixed | RA-4.2-001 |
| Migrate consumers / remove legacy RPC | E-04 deferred |
| Start E-03 / E-04 | Blocked / not started |
| Issue E-02 Project Certification in this plan document | IU-5.4 deliverable |
| Modify upstream certified/completed documents | Preservation rule |

---

## 21. Implementation Order

### 21.1 Original Phase 5 IU order (historical — complete)

```
IU-5.1  Engineering Verification          ← COMPLETED
    ↓
IU-5.2  Acceptance Validation             ← COMPLETED
    ↓
IU-5.3  Acceptance Report specification   ← COMPLETED
    ↓
E-02-Acceptance-Report.md v1.0            ← ISSUED (ACCEPTANCE_BLOCKED)
    ↓
IU-5.4  Project Certification Evaluation  ← COMPLETED (BLOCKED)
```

**Rule:** Original IUs **must not** be skipped or reordered. **Historical records immutable.**

### 21.2 Phase 5 documentation close (current authorized sequence)

```
E-02-Phase-5-Completion.md               ← NEXT AUTHORIZED (Completed with Follow-up)
    ↓
E-02-Phase-5-Certification.md            ← scoped process certification (PCQ-003)
```

### 21.3 Post-Phase-5 blocked path (forward — not yet authorized for execution)

```
E-02 Executable Remediation Plan
    ↓
approved Executable Remediation IUs
    ↓
Engineering Re-Verification
    ↓
Acceptance Re-Validation
    ↓
Superseding Acceptance Report
    ↓
Project Certification Re-Evaluation
    ↓
E-02-Project-Certification.md            ← only if gates pass
    ↓
E-02-Engineering-Baseline.md
```

**Original IU-5.1–5.4 chain is NOT reopened for engineering work.**

---

## 22. Document Chain

### 22.1 Historical Phase 5 execution chain (complete)

```
E-02-Phase-4-Certification.md
        ↓
E-02-Phase-5-Implementation-Plan.md v1.0
        ↓
E-02-IU-5.1 … IU-5.4 (all COMPLETED)
        ↓
E-02-Acceptance-Report.md v1.0
```

### 22.2 Current forward governance chain (v1.1)

```
E-02-Program-Authority-Decision.md         APPROVED
        ↓
E-02-Implementation-Plan.md v1.1
        ↓
E-02-Phase-5-Implementation-Plan.md v1.1   ← this document
        ↓
E-02-Phase-5-Completion.md                 ← NEXT AUTHORIZED
        ↓
E-02-Phase-5-Certification.md
        ↓
(next remediation planning artifact — exact filename per Program Plan v1.1 §26)
        ↓
… remediation → re-verification → superseding report → cert re-evaluation …
```

**Next authorized document:** [`E-02-Phase-5-Completion.md`](E-02-Phase-5-Completion.md)

**Authority:** PCQ-002 = YES WITH FOLLOW-UP · Program Plan v1.1 §13.2 · PAD-005.

---

## 23. E-02 Executable Remediation Stage

### 23.1 Authority name (exact)

```
E-02 Executable Remediation Stage
```

**Not:** Phase 6 · Phase ER · E-03 · E-04 · extension of IU-5.4.

### 23.2 Definition and current status

| Field | Value |
|-------|-------|
| **Purpose** | Close mandatory executable certification blockers identified by Phase 5 without rewriting Phase 1–4 or IU-5.1–5.4 history |
| **Established in authority** | **YES** — PAD-003 · Program Plan v1.1 §19 |
| **Executable work authorized** | **NO** — requires Remediation Plan + approved remediation IUs |

```
PHASE 5 PLAN v1.1 ≠ EXECUTABLE REMEDIATION AUTHORIZATION
```

### 23.3 Program-level scope (categories only — no design)

May include work to close mandatory blockers: Primary Audit persistence/runtime · atomic server-side transaction · durable ownership · durable reconciliation · property_id correlation · runtime orchestration · Runtime COMMITTED evidence · executable CITM evidence · mandatory pending external evidence where authority requires.

**VAQ-003:** Implementation locus **resolved**. Detailed sequencing **DEFERRED** to approved remediation design.

**Preserved dependency principles (not a hard-coded IU sequence):**

```
NO PRIMARY AUDIT → NO COMMITTED FREEZE
COMMIT_OUTCOME_UNCERTAIN → DURABLE RECONCILIATION FIRST
UNIQUE INDEX ≠ OWNERSHIP ORCHESTRATION
```

**Prohibited at Phase 5 Plan level:** remediation IU count · IU names · IU order · schema · RPC · migrations · transaction/ownership/reconciliation implementation design.

---

## 24. Forward verification and acceptance authority

### 24.1 Engineering Re-Verification

| Rule | Requirement |
|------|-------------|
| **NOT** reopening IU-5.1 | IU-5.1 Completion **immutable** |
| New forward evidence cycle | After executable remediation |
| Reclassify obligations | Only via **new executable evidence + authorized re-verification** |

```
NEW CODE ALONE ≠ NEW PASS
OLD EIR STATUS + NEW CODE ≠ AUTOMATIC NEW PASS
```

### 24.2 Acceptance Re-Validation

| Rule | Requirement |
|------|-------------|
| **NOT** editing IU-5.2 | IU-5.2 Completion **immutable** |
| Consumes | remediation evidence · Re-Verification · remaining blockers · authority questions |
| Produces | new forward acceptance decision — **no automatic ACCEPTED** |

### 24.3 Superseding Acceptance Report

| Rule | Requirement |
|------|-------------|
| [`E-02-Acceptance-Report.md`](E-02-Acceptance-Report.md) v1.0 | **Immutable** historical record |
| Future report | Explicitly versioned · supersedes prior for **forward certification authority only** |

```
SUPERSEDE ≠ DELETE HISTORY
SUPERSEDE ≠ RETROACTIVELY CHANGE ORIGINAL DECISION
```

### 24.4 Project Certification Re-Evaluation

| Rule | Requirement |
|------|-------------|
| IU-5.4 historical evaluation | **PROJECT_CERTIFICATION_BLOCKED** — **immutable** |
| Re-evaluation | **NEW** cycle after remediation + re-validation + superseding report |
| Issuance | Only when mandatory gates satisfied |

---

## 25. Historical record preservation

| Record | Rule |
|--------|------|
| Phase 1–4 Certifications | **Immutable** |
| IU-5.1 · IU-5.2 · IU-5.3 · IU-5.4 Completions | **Immutable** |
| Acceptance Report v1.0 | **Immutable** — ACCEPTANCE_BLOCKED preserved |
| Original EIR classifications (IU-5.1) | **Immutable historical baseline** |
| Original PCG/PCB/PCL evaluation (IU-5.4) | **Immutable historical baseline** |

Forward lifecycle uses superseding evidence and new verification cycles. **No silent rewrite.**

---

## 26. Authority questions remaining open

| # | ID / Topic | Status |
|---|------------|--------|
| 1 | **PCQ-010** — EIR-048 / EIR-054 pre-certification threshold | **OPEN** |
| 2 | **PCQ-011** — CITM partial rows 1 / 2 / 5 executable threshold | **OPEN** |
| 3 | **PCQ-012** — E-04 deferred vs E-02 certification prerequisite | **OPEN** |
| 4 | Production deployment certification threshold | **OPEN** |
| 5 | Exact remediation IU decomposition | **OPEN** |
| 6 | Detailed remediation engineering sequencing | **OPEN** |
| 7 | Schema / RPC / orchestration design | **OPEN** |

---

## 27. E-04 boundary

| Item | Status |
|------|--------|
| **EIR-077 · EIR-078** | **DEFERRED TO E-04** |
| **E-02 Executable Remediation Stage** | **≠** E-04 consumer / legacy migration |

Do not move legacy RPC migration or consumer migration into E-02 remediation without new authority.

---

## 28. Current program status (as of 2026-08-21)

| Item | Status |
|------|--------|
| Phase 1–4 | **CERTIFIED COMPLETE** |
| IU-5.1 · IU-5.2 · IU-5.3 · IU-5.4 | **COMPLETED** |
| Phase 5 IU | **4 / 4 COMPLETED** |
| Acceptance Report v1.0 | **ISSUED** |
| E-02 Acceptance | **ACCEPTANCE_BLOCKED** |
| Project Certification Evaluation | **PROJECT_CERTIFICATION_BLOCKED** / **AUTHORITY_GATED** |
| Program Authority Decision | **APPROVED** |
| E-02 Implementation Plan | **v1.1** |
| E-02 Executable Remediation Stage | **ESTABLISHED IN PROGRAM AUTHORITY** |
| Executable Remediation | **NOT YET AUTHORIZED** |
| Phase 5 Completion | **AUTHORITY-PERMITTED / NOT YET ISSUED** |
| Phase 5 Certification | **AUTHORITY-PERMITTED AFTER COMPLETION / NOT YET ISSUED** |
| E-02 Project Certification | **NOT ISSUED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Executable Final COMMIT Path | **BLOCKED** |
| E-03 | **BLOCKED** |
| E-04 | **NOT STARTED** |

---

## Document control

| Field | Value |
|-------|-------|
| **Document Type** | Phase Implementation Plan |
| **Program** | E-02 — Freeze Engine |
| **Phase** | Phase 5 — Verification & Acceptance |
| **Status** | Approved |
| **Revision** | **v1.1** |
| **Program Authority Amendment** | 2026-08-21 |
| **Approval Date** | 2026-08-19 *(v1.0)* · 2026-08-21 *(v1.1)* |
| **Authoritative Source** | [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) **v1.1** · [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) |
| **Verified** | YES |
| **Supersedes** | v1.0 (content preserved — see §0) |
| **Previous Document** | [`E-02-Phase-4-Certification.md`](E-02-Phase-4-Certification.md) |
| **Next Document** | [`E-02-Phase-5-Completion.md`](E-02-Phase-5-Completion.md) |
| **Production Effect** | None |

**Related:** [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) · [`E-02-Implementation-Plan.md`](E-02-Implementation-Plan.md) v1.1 · [`E-02-Acceptance-Report.md`](E-02-Acceptance-Report.md) · [`E-02-IU-5.4-Completion.md`](E-02-IU-5.4-Completion.md) · [`EPS-001-Engineering-Phase-Documentation-Standard.md`](EPS-001-Engineering-Phase-Documentation-Standard.md)
