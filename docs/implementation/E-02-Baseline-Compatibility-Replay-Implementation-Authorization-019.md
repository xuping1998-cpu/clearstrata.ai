# E-02 — Baseline Compatibility Replay Artifact — Implementation Authorization (Successor)

## Authorization-ID Retarget Only · E-02-DBA-LOCAL-018 → E-02-DBA-LOCAL-019

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Authorization (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Artifact** | Governed Baseline-Compatibility Replay Artifact (class C) — **DBA authorization-ID retarget only** |
| **Authorization ID** | **E-02-BCR-IA-019** |
| **Predecessors** | **E-02-BCR-IA** through **E-02-BCR-IA-018** — all **CONSUMED / HISTORICAL / IMMUTABLE** |
| **Direct DBA authority aligned** | **E-02-DBA-LOCAL-019** — [`E-02-Database-Application-Authorization-LOCAL-019.md`](E-02-Database-Application-Authorization-LOCAL-019.md) (**APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED** · attempts **0**) |
| **Successor governance review** | [`E-02-Successor-Database-Application-Governance-Review-LOCAL-019.md`](E-02-Successor-Database-Application-Governance-Review-LOCAL-019.md) (**ELIGIBLE FOR SEPARATE DBA ISSUANCE**) |
| **Guard clarification (read-only)** | [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) (**DAA-014-C** · **ISSUED** · **EG-B**) |
| **Reconstruction authority (HMD-012, read-only)** | **PAD-061 ISSUED / IMMUTABLE / OPTION B** · **E-02-HFSOR-IA-004 CONSUMED** · Completion [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-004.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-004.md) (**E-02-HFSOR-IMPLEMENTATION-COMPLETION-004** · **COMPLETED WITH NOTES**) |
| **Correction authority (HMD-011, read-only)** | **PAD-060 ISSUED / IMMUTABLE / OPTION C** · LOCAL-018 target **REACHED / APPLIED** · **RUNTIME REPLAY VERIFIED** (not CLOSED) |
| **Correction authority (HMD-010, read-only)** | **PAD-058 ISSUED / IMMUTABLE / OPTION C** · LOCAL-018 target **REACHED / APPLIED** · **RUNTIME REPLAY VERIFIED** (not CLOSED) |
| **Reconstruction authority (HMD-009, read-only)** | **PAD-057 ISSUED / IMMUTABLE** · LOCAL-018 recon+target **REACHED / APPLIED** · **RUNTIME REPLAY VERIFIED** (not CLOSED) |
| **Status** | **Approved With Conditions — NOT YET CONSUMED** |
| **Authority Level** | Implementation Authorization (repository implementation only) |
| **Effective Date** | 2026-09-01 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-019.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-019.md) |
| **Production Effect** | **None** |

> **Authority path finding: YES.** Successor **E-02-BCR-IA-019** parallels BCR IA family **`-002` … `-018` → `-019`**, aligned with **E-02-DBA-LOCAL-019**. Highest issued BCR IA is **018** (**CONSUMED** · Completion-018 **COMPLETED WITH NOTES**). **019** did not exist before this issuance. **Not a DBA.** **Not BCR Completion-019.** **Not LOCAL-019 execution.** **Not artifact edit in this task.**

> **Document class:** Bounded successor **Implementation Authorization** for **one future narrow repository retarget** of `EXPECTED_DBA_AUTHORIZATION_ID` and coupled `ARTIFACT_AUTHORIZATION_ID`. This issuance **does not implement** retarget · **does not** modify artifact · **does not** execute LOCAL-019 · **does not** retry LOCAL-018 · **does not** run DB / Supabase / Docker / `--apply` · **does not** issue Completion-019.

```
SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION = E-02-BCR-IA-019
DECISION                                   = APPROVED WITH CONDITIONS / NOT YET CONSUMED
AUTHORIZED ACTION                          = AUTHORIZATION-ID RETARGET ONLY
CURRENT ARTIFACT PIN                       = E-02-DBA-LOCAL-018
AUTHORIZED ARTIFACT PIN                    = E-02-DBA-LOCAL-019
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-018
AUTHORIZED ARTIFACT AUTHORITY              = E-02-BCR-IA-019
SEMANTIC CHANGE COUNT                      = EXACTLY 2
EXACT-MATCH MODEL                          = RETAINED
DUAL ACCEPTANCE                            = NONE / FORBIDDEN
LOCAL-018                                  = APPLICATION_FAILED / EVIDENCE IMMUTABLE / attempts 1 / NO RETRY
LOCAL-019                                  = APPROVED / NOT CONSUMED / NOT EXECUTED / attempts 0
HMD-012                                    = RECONSTRUCTION IMPLEMENTED / COMPLETION COMPLETED / RUNTIME PENDING
BCR RETARGET                               = AUTHORIZED / NOT IMPLEMENTED
THIS ISSUANCE                              ≠ IMPLEMENTATION · ≠ COMPLETION-019 · ≠ LOCAL-019 EXECUTION
```

---

## 1. Stale-evidence / chronology gate

An older reconciliation snapshot (LOCAL-017 failed · HMD-012 not allocated · LOCAL-019 not issued) is **superseded**. Current repository independently establishes:

| Item | Current state |
|------|----------------|
| LOCAL-018 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** · attempts **1** · evidenceRunId `local-018-20260901a` |
| HMD-012 | OPEN / RECONSTRUCTION IMPLEMENTED / COMPLETION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING |
| PAD-061 | ISSUED / IMMUTABLE / OPTION B |
| E-02-HFSOR-IA-004 | CONSUMED |
| E-02-HFSOR-IMPLEMENTATION-COMPLETION-004 | COMPLETED WITH NOTES |
| E-02-DBA-LOCAL-019 | APPROVED WITH CONDITIONS / NOT CONSUMED / NOT EXECUTED / attempts **0** |

**Gate: PASS.**

---

## 2. BCR IA sequence gate

| Check | Result |
|-------|--------|
| Highest issued BCR IA | **E-02-BCR-IA-018** |
| E-02-BCR-IA-018 | **CONSUMED** (Completion-018) |
| E-02-BCR-IA-019 exists before issuance | **NO** |
| E-02-BCR-IA-020+ | **NO** |
| Next unused | **019** |

**Sequence: ESTABLISHED.**

---

## 3. LOCAL-019 DBA gate

[`E-02-Database-Application-Authorization-LOCAL-019.md`](E-02-Database-Application-Authorization-LOCAL-019.md): **E-02-DBA-LOCAL-019** · **APPROVED WITH CONDITIONS / NOT CONSUMED / NOT EXECUTED / EXECUTION GATED** · attempts **0** · authorized future stateful apply **EXACTLY 1**. LOCAL-020 **NOT ISSUED**.

---

## 4. Successor governance review gate

[`E-02-Successor-Database-Application-Governance-Review-LOCAL-019.md`](E-02-Successor-Database-Application-Governance-Review-LOCAL-019.md): **RECONCILIATION PASS** · **ELIGIBLE FOR SEPARATE DBA ISSUANCE** · binds LOCAL-018 → LOCAL-019 successor chain.

---

## 5. Predecessor LOCAL-018 immutability

| Field | Value |
|-------|-------|
| Result | **APPLICATION_FAILED** |
| State | **NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Attempts | **1** |
| Retry | **NOT AUTHORIZED** |
| evidenceRunId | `local-018-20260901a` |
| Executed | **79** |
| Highest applied | `20260409140000_vendor_risk_signals.sql` (index **79**) |
| First failing | `20260409150000_unit_whitelist_invite_codes.sql` (index **80** pre-reconstruction era) |
| Error | `relation "public.property_invite_codes" does not exist` |
| Preserve/handoff | **NOT REACHED** |
| Baseline verifier | **NOT RUN** |

---

## 6. HMD-012 remediation gate

| Field | Value |
|-------|-------|
| HMD | **HMD-012** |
| Classification | MISSING HISTORICAL PREREQUISITE / SCHEMA-ORIGIN DEFECT |
| Subtype | ORIGINAL CLEAN-REPLAY FORWARD REFERENCE TO TABLE CREATED ONLY LATER |
| Target | `supabase/migrations/20260409150000_unit_whitelist_invite_codes.sql` (**IMMUTABLE**) |
| Reconstruction | `supabase/migrations/20260409145900_hmd012_reconstruct_property_invite_codes.sql` |
| Later canonical CREATE | `supabase/migrations/20260509120000_property_invite_codes.sql` (**IMMUTABLE**) |
| Object | `public.property_invite_codes` (exactly **1**) |
| `unit_no` / `role` | **ABSENT** |
| Unauthorized semantics | **NONE** |

---

## 7. Current BCR pre-state (read-only; not modified this task)

Artifact `scripts/verification/e02/replay-e02-declared-baseline.ts`:

```
EXPECTED_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-018
ARTIFACT_AUTHORIZATION_ID     = E-02-BCR-IA-018
```

Exact-match **RETAINED** (`raw !== EXPECTED_DBA_AUTHORIZATION_ID` → reject). Dual acceptance **NONE**. **This task does not edit these values.**

---

## 8. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-BCR-IA-019** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Status** | **NOT YET CONSUMED** |
| **Authorized transformation (1)** | `EXPECTED_DBA_AUTHORIZATION_ID`: `E-02-DBA-LOCAL-018` → `E-02-DBA-LOCAL-019` |
| **Authorized transformation (2)** | `ARTIFACT_AUTHORIZATION_ID`: `E-02-BCR-IA-018` → `E-02-BCR-IA-019` |
| **Semantic change count** | **EXACTLY 2** |
| **Implementation this task** | **NOT PERFORMED** |

---

## 9. Authorized future implementation scope

Future implementation may edit **only** the two pin constants in:

`scripts/verification/e02/replay-e02-declared-baseline.ts`

**Not authorized:** migrations · HMD-012 reconstruction · HMD-012 target · verifier/guard/launcher redesign · quarantine change · runtime · `--apply`.

After retarget:

- LOCAL-018 operational acceptance at apply time = **NO**
- LOCAL-019 exact acceptance = **YES**
- No dual acceptance of LOCAL-018 OR LOCAL-019
- No dual acceptance of IA-018 OR IA-019

---

## 10. Future static verification (authorized; not this task)

After future implementation:

- `BCR --plan` → **PLAN_OK** · failures **`[]`** (no `--apply`)
- `npm run build` → **PASS**
- Reference counts: discovered **288** · executable **287** · quarantine **1** (evidence references; not permanent invariants)

Fresh plan must show expected DBA **LOCAL-019** · artifact authority **IA-019** · HMD-012 reconstruction index **80** · HMD-012 target index **81** · later canonical CREATE index **113** · W2 index **76** · April HARD index **77** · July S1 index **148** · all **DISCOVERED / EXECUTABLE / NOT QUARANTINED** (except global quarantine).

---

## 11. Quarantine lock

Exactly `20260314195641_add_demo_data.sql` · **count 1**. No quarantine edits authorized.

---

## 12. Preserved HMD / baseline / RU locks

| Item | State |
|------|-------|
| HMD-009 | OPEN / RUNTIME REPLAY VERIFIED (LOCAL-018; not CLOSED) |
| HMD-010 | OPEN / RUNTIME REPLAY VERIFIED (LOCAL-018; not CLOSED) |
| HMD-011 | OPEN / RUNTIME REPLAY VERIFIED (LOCAL-018; not CLOSED) |
| HMD-012 | OPEN / COMPLETION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING |
| HMD-003 | OPEN / RUNTIME PENDING · W2 + April HARD **REACHED / APPLIED** (LOCAL-018) · July S1 **NOT REACHED** |
| HMD-005–008 | OPEN / RUNTIME REPLAY VERIFIED |
| Database baseline | **NOT VERIFIED** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **UNSET / FALSE** |
| EIR / Acceptance / Certification | **NONE / BLOCKED / NOT ISSUED** |

---

## 13. Future LOCAL-019 runtime checkpoints (not activated by this IA)

If LOCAL-019 is later executed after BCR Completion-019 and pre-stateful gates:

| Checkpoint | Requirement |
|------------|-------------|
| HMD-012 reconstruction | `20260409145900…` **REACHED / APPLIED** |
| HMD-012 target | `20260409150000…` **REACHED / APPLIED** · `property_invite_codes` error **NOT REPRODUCED** |
| HMD-009 / HMD-010 / HMD-011 | prior checkpoints **not reopened** if replay progresses past them |
| HMD-003 W2 / April HARD | preserve / reconfirm if replay progresses |
| HMD-003 July S1 | **REACHED / APPLIED** if no earlier failure (expected index **148**) |

Future env contract (not set by this IA):

```
E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-019
E02_BCR_APPLY_AUTHORIZED=true
E02_ALLOW_DESTRUCTIVE_TESTS=true
E02_EVIDENCE_ENV=local
E02_RUNTIME_EXECUTION_AUTHORIZED=UNSET/FALSE
```

Fresh disposable CB-B environment required with **288-migration** discovered set (reconstruction present). Do not reuse LOCAL-018 failed DB state.

---

## 14. IA consumption rule

**E-02-BCR-IA-019** becomes **CONSUMED** only if future implementation proves:

1. pre-state pins exactly `LOCAL-018` / `IA-018`;
2. exactly **two** semantic pin changes implemented;
3. resulting pins `LOCAL-019` / `IA-019`;
4. exact-match retained · dual acceptance none;
5. no unrelated BCR semantic edits;
6. no migration / quarantine edits;
7. fresh `--plan` **PLAN_OK** · failures **`[]`**;
8. build **PASS**;
9. no runtime · no `--apply`.

Otherwise: **NOT CONSUMED** · **STOP → GOVERNANCE**.

---

## 15. BCR Completion separation

**Do not issue** [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-019.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-019.md) in this task.

Even after future retarget + IA consumption:

```
LOCAL-019 remains EXECUTION GATED until Completion-019 is issued
```

Expected sequence:

```
E-02-BCR-IA-019 (this record)
  → IMPLEMENT TWO-CONSTANT RETARGET
  → STATIC VERIFY + --plan + build
  → ISSUE COMPLETION-019 (separate task)
  → LOCAL-019 PRE-STATEFUL GATES
  → SINGLE GOVERNED --apply
```

---

## 16. Next action (this issuance)

```
NEXT = IMPLEMENT E-02-BCR-IA-019
       (repository retarget LOCAL-018 → LOCAL-019 · IA-018 → IA-019 only)
```

**Not implemented here.** **No BCR edit.** **No runtime.**

---

**End of document — E-02-BCR-IA-019 · v1.0 — 2026-09-01**
