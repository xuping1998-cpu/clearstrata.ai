# E-02 — Baseline Compatibility Replay Artifact — Implementation Authorization (Successor)

## Authorization-ID Retarget Only · E-02-DBA-LOCAL-017 → E-02-DBA-LOCAL-018

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Authorization (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Artifact** | Governed Baseline-Compatibility Replay Artifact (class C) — **DBA authorization-ID retarget only** |
| **Authorization ID** | **E-02-BCR-IA-018** |
| **Predecessors** | **E-02-BCR-IA** through **E-02-BCR-IA-017** — all **CONSUMED / HISTORICAL / IMMUTABLE** |
| **Direct DBA authority aligned** | **E-02-DBA-LOCAL-018** — [`E-02-Database-Application-Authorization-LOCAL-018.md`](E-02-Database-Application-Authorization-LOCAL-018.md) (**APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED** · attempts **0**) |
| **Guard clarification (read-only)** | [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) (**DAA-014-C** · **ISSUED** · **EG-B**) |
| **Correction authority (HMD-011, read-only)** | **PAD-060 ISSUED / IMMUTABLE / OPTION C** · **PAD-059 ISSUED / IMMUTABLE / HOSCC FAMILY** · **E-02-HOSCC-IA-002 CONSUMED** · Completion [`E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Completion-002.md`](E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Completion-002.md) (**E-02-HOSCC-IMPLEMENTATION-COMPLETION-002** · **COMPLETED WITH NOTES**) |
| **Correction authority (HMD-010, read-only)** | **PAD-058 ISSUED / IMMUTABLE / OPTION C** · **E-02-HOSCC-IA CONSUMED** · HMD-010 target **NOT APPLIED** · **RUNTIME REPLAY VERIFICATION PENDING** |
| **Reconstruction authority (HMD-009, read-only)** | **PAD-057 ISSUED / IMMUTABLE** · **E-02-HFSOR-IA-003 CONSUMED** · LOCAL-017 reconstruction **REACHED / APPLIED** · target **REACHED / NOT APPLIED** · **RUNTIME REPLAY VERIFICATION PENDING** |
| **Status** | **Approved With Conditions — NOT YET CONSUMED** |
| **Authority Level** | Implementation Authorization (repository implementation only) |
| **Effective Date** | 2026-09-01 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-018.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-018.md) |
| **Production Effect** | **None** |

> **Authority path finding: YES.** Successor **E-02-BCR-IA-018** parallels BCR IA family **`-002` … `-017` → `-018`**, aligned with **E-02-DBA-LOCAL-018**. Highest issued BCR IA is **017** (**CONSUMED** · Completion-017 **COMPLETED WITH NOTES**). **018** did not exist before this issuance. **Not a DBA.** **Not BCR Completion-018.** **Not LOCAL-018 execution.** **Not artifact edit in this task.**

> **Document class:** Bounded successor **Implementation Authorization** for **one future narrow repository retarget** of `EXPECTED_DBA_AUTHORIZATION_ID` and coupled `ARTIFACT_AUTHORIZATION_ID`. This issuance **does not implement** retarget · **does not** modify artifact · **does not** execute LOCAL-018 · **does not** retry LOCAL-017 · **does not** run DB / Supabase / Docker / `--apply` · **does not** issue Completion-018.

```
SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION = E-02-BCR-IA-018
DECISION                                   = APPROVED WITH CONDITIONS / NOT YET CONSUMED
AUTHORIZED ACTION                          = AUTHORIZATION-ID RETARGET ONLY
CURRENT ARTIFACT PIN                       = E-02-DBA-LOCAL-017
AUTHORIZED ARTIFACT PIN                    = E-02-DBA-LOCAL-018
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-017
AUTHORIZED ARTIFACT AUTHORITY              = E-02-BCR-IA-018
SEMANTIC CHANGE COUNT                      = EXACTLY 2
EXACT-MATCH MODEL                          = RETAINED
DUAL ACCEPTANCE                            = NONE / FORBIDDEN
LOCAL-017                                  = APPLICATION_FAILED / EVIDENCE IMMUTABLE / attempts 1 / NO RETRY
LOCAL-018                                  = APPROVED / NOT CONSUMED / NOT EXECUTED / attempts 0
HMD-011                                    = IMPLEMENTATION COMPLETED / COMPLETION COMPLETED / RUNTIME PENDING
BCR RETARGET                               = AUTHORIZED / NOT IMPLEMENTED
THIS ISSUANCE                              ≠ IMPLEMENTATION · ≠ COMPLETION-018 · ≠ LOCAL-018 EXECUTION
```

---

## 1. Stale-evidence / chronology gate

An older reconciliation snapshot (LOCAL-017 failed · HMD-011 not allocated · LOCAL-018 not issued) is **superseded**. Current repository independently establishes:

| Item | Current state |
|------|----------------|
| HMD-011 | OPEN / IMPLEMENTATION COMPLETED / HOSCC COMPLETION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING |
| PAD-059 | ISSUED / IMMUTABLE / HOSCC GOVERNANCE FAMILY |
| PAD-060 | ISSUED / IMMUTABLE / OPTION C / substantive HMD-011 remediation |
| E-02-HOSCC-IA-002 | CONSUMED |
| E-02-HOSCC-IMPLEMENTATION-COMPLETION-002 | COMPLETED WITH NOTES |
| E-02-DBA-LOCAL-018 | APPROVED WITH CONDITIONS / NOT CONSUMED / NOT EXECUTED / attempts **0** |

**Gate: PASS.**

---

## 2. BCR IA sequence gate

| Check | Result |
|-------|--------|
| Highest issued BCR IA | **E-02-BCR-IA-017** |
| E-02-BCR-IA-017 | **CONSUMED** (Completion-017) |
| E-02-BCR-IA-018 exists before issuance | **NO** |
| E-02-BCR-IA-019+ | **NO** |
| Next unused | **018** |

**Sequence: ESTABLISHED.**

---

## 3. LOCAL-018 DBA gate

[`E-02-Database-Application-Authorization-LOCAL-018.md`](E-02-Database-Application-Authorization-LOCAL-018.md): **E-02-DBA-LOCAL-018** · **APPROVED WITH CONDITIONS / NOT CONSUMED / NOT EXECUTED** · attempts **0** · authorized future stateful apply **EXACTLY 1**. LOCAL-019 **NOT ISSUED**.

---

## 4. Predecessor LOCAL-017 immutability

| Field | Value |
|-------|-------|
| Result | **APPLICATION_FAILED** |
| State | **NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Attempts | **1** |
| Retry | **NOT AUTHORIZED** |
| evidenceRunId | `local-017-20260831a` |
| First failing | `20260405120000_multi_tenant_properties.sql` |
| Error | `column mqt.meeting_id does not exist` |

---

## 5. HMD-011 remediation gate

| Field | Value |
|-------|-------|
| Target | `supabase/migrations/20260405120000_multi_tenant_properties.sql` |
| Pre-edit blob | `a37966fe60a9a7be1897e04b521d284a55185805` |
| Post-edit blob | `dd4960e2bf3836da4e98950d2a215054478fa7ca` |
| `mqt.meeting_id` in target | **ABSENT** |
| HMD-010 L280–285 | **PRESERVED** |

---

## 6. Current BCR pre-state (read-only; not modified this task)

Artifact `scripts/verification/e02/replay-e02-declared-baseline.ts`:

```
EXPECTED_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-017
ARTIFACT_AUTHORIZATION_ID     = E-02-BCR-IA-017
```

Exact-match **RETAINED**. Dual acceptance **NONE**. **This task does not edit these values.**

---

## 7. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-BCR-IA-018** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Status** | **NOT YET CONSUMED** |
| **Authorized transformation (1)** | `EXPECTED_DBA_AUTHORIZATION_ID`: `E-02-DBA-LOCAL-017` → `E-02-DBA-LOCAL-018` |
| **Authorized transformation (2)** | `ARTIFACT_AUTHORIZATION_ID`: `E-02-BCR-IA-017` → `E-02-BCR-IA-018` |
| **Semantic change count** | **EXACTLY 2** |
| **Implementation this task** | **NOT PERFORMED** |

---

## 8. Authorized future implementation scope

Future implementation may edit **only** the two pin constants in:

`scripts/verification/e02/replay-e02-declared-baseline.ts`

**Not authorized:** migrations · HMD remediation · verifier/guard/launcher redesign · quarantine change · runtime · `--apply`.

After retarget:

- LOCAL-017 operational acceptance = **NO**
- LOCAL-018 exact acceptance = **YES**
- No dual acceptance of LOCAL-017 OR LOCAL-018
- No dual acceptance of IA-017 OR IA-018

---

## 9. Future static verification (authorized; not this task)

After future implementation:

- `BCR --plan` → **PLAN_OK** · failures **`[]`** (no `--apply`)
- `npm run build` → **PASS**
- Reference counts: discovered **287** · executable **286** · quarantine **1** (evidence references; not permanent invariants)

Fresh plan must show expected DBA **LOCAL-018** · artifact authority **IA-018** · HMD-011 target **DISCOVERED / EXECUTABLE / NOT QUARANTINED** · HMD-009 recon+target · W2 · April HARD · July S1 **DISCOVERED / EXECUTABLE**.

---

## 10. Quarantine lock

Exactly `20260314195641_add_demo_data.sql` · **count 1**. No quarantine edits authorized.

---

## 11. Preserved HMD / baseline / RU locks

| Item | State |
|------|-------|
| HMD-010 | OPEN / TARGET NOT APPLIED / RUNTIME PENDING (`mv.meeting_id` NOT reproduced at LOCAL-017; target not applied) |
| HMD-009 | OPEN / RECONSTRUCTION APPLIED / TARGET NOT APPLIED / RUNTIME PENDING |
| HMD-003 | OPEN / RUNTIME PENDING · W2 / April HARD / July S1 **NOT REACHED** |
| HMD-005–008 | OPEN / RUNTIME REPLAY VERIFIED |
| Database baseline | **NOT VERIFIED** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **UNSET / FALSE** |
| EIR / Acceptance / Certification | **NONE / BLOCKED / NOT ISSUED** |

---

## 12. Future LOCAL-018 runtime checkpoints (not activated by this IA)

If LOCAL-018 is later executed after BCR Completion-018 and pre-stateful gates:

| Checkpoint | Requirement |
|------------|-------------|
| HMD-011 | target **REACHED / APPLIED** · `mqt.meeting_id` error **NOT REPRODUCED** |
| HMD-010 | target **REACHED / APPLIED** · `mv.meeting_id` error **NOT REPRODUCED** |
| HMD-009 | reconstruction + target **REACHED / APPLIED** · `hiring_jobs` error **NOT REPRODUCED** |
| HMD-003 | W2 / April HARD / July S1 **REACHED / APPLIED** if no earlier failure |

Future env contract (not set by this IA):

```
E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-018
E02_BCR_APPLY_AUTHORIZED=true
E02_ALLOW_DESTRUCTIVE_TESTS=true
E02_EVIDENCE_ENV=local
E02_RUNTIME_EXECUTION_AUTHORIZED=UNSET/FALSE
```

Fresh disposable CB-B environment required. Do not reuse LOCAL-017 failed DB state.

---

## 13. IA consumption rule

**E-02-BCR-IA-018** becomes **CONSUMED** only if future implementation proves:

1. pre-state pins exactly `LOCAL-017` / `IA-017`;
2. exactly **two** semantic pin changes implemented;
3. resulting pins `LOCAL-018` / `IA-018`;
4. exact-match retained · dual acceptance none;
5. no unrelated BCR semantic edits;
6. no migration / quarantine edits;
7. fresh `--plan` **PLAN_OK** · failures **`[]`**;
8. build **PASS**;
9. no runtime · no `--apply`.

Otherwise: **NOT CONSUMED** · **STOP → GOVERNANCE**.

---

## 14. BCR Completion separation

**Do not issue** [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-018.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-018.md) in this task.

Even after future retarget + IA consumption:

```
LOCAL-018 remains EXECUTION GATED until Completion-018 is issued
```

Expected sequence:

```
E-02-BCR-IA-018 (this record)
  → IMPLEMENT TWO-CONSTANT RETARGET
  → STATIC VERIFY + --plan + build
  → ISSUE COMPLETION-018 (separate task)
  → LOCAL-018 PRE-STATEFUL GATES
  → SINGLE GOVERNED --apply
```

---

## 15. Next action (this issuance)

```
NEXT = IMPLEMENT E-02-BCR-IA-018
       (repository retarget LOCAL-017 → LOCAL-018 · IA-017 → IA-018 only)
```

**Not implemented here.** **No BCR edit.** **No runtime.**
