# E-02 — Baseline Compatibility Replay Artifact — Implementation Authorization (Successor)

## Authorization-ID Retarget Only · E-02-DBA-LOCAL-011 → E-02-DBA-LOCAL-012

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Authorization (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Artifact** | Governed Baseline-Compatibility Replay Artifact (class C) — **DBA authorization-ID retarget only** |
| **Authorization ID** | **E-02-BCR-IA-012** |
| **Predecessors** | **E-02-BCR-IA** · **E-02-BCR-IA-002** · **E-02-BCR-IA-003** · **E-02-BCR-IA-004** · **E-02-BCR-IA-005** · **E-02-BCR-IA-006** · **E-02-BCR-IA-007** · **E-02-BCR-IA-008** · **E-02-BCR-IA-009** · **E-02-BCR-IA-010** · **E-02-BCR-IA-011** — all **CONSUMED / HISTORICAL / IMMUTABLE** |
| **Direct DBA authority aligned** | **E-02-DBA-LOCAL-012** — [`E-02-Database-Application-Authorization-LOCAL-012.md`](E-02-Database-Application-Authorization-LOCAL-012.md) (**APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED**) |
| **Guard clarification (read-only)** | [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) (**DAA-014-C** · **ISSUED** · **EG-B**) |
| **Reconstruction authority (HMD-005, read-only)** | **PAD-053 ISSUED / IMMUTABLE** · **E-02-HFSOR-IA-002 CONSUMED** · Completion-002 **COMPLETED WITH NOTES** |
| **Reconstruction authority (HMD-003, read-only)** | **E-02-HFSOR-IA CONSUMED** · Completion **COMPLETED WITH NOTES** · PAD-051 **ISSUED / IMMUTABLE** |
| **Status** | **Approved With Conditions — NOT YET CONSUMED** |
| **Authority Level** | Implementation Authorization (repository implementation only) |
| **Effective Date** | 2026-08-28 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-012.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-012.md) |
| **Production Effect** | **None** |

> **Authority path finding: YES.** `E-02-Baseline-Compatibility-Replay-Implementation-Authorization-012.md` is **authority-safe** as the next **successor Implementation Authorization** in the existing BCR IA family (`…-Implementation-Authorization.md` → `-002` … `-011` → **`-012`**). ID **`E-02-BCR-IA-012`** parallels that series. Highest previously allocated successor is **E-02-BCR-IA-011** (**CONSUMED**). No BCR IA numbered **012** existed before this issuance. No **013+** exists. Distinct filename keeps predecessors **immutable**. **Not a new governance tier.** **Not a PAD.** **Not PAD-054.** **Not a DBA.** **Not a HMIR IA.** **Not a reconstruction IA.** **Not a Clean-Base Design Amendment.** **Not a Guard Implementation Authorization.** **Not a new diagnostic runtime class.** **Not a new BCR-CB architecture.** **Not a new defect by itself.** **Not a quarantine amendment.** **Not a restoration/reconstruction reopening.** **Not a RU-1.4 REA.** **Not an EIR.**

> **Document class:** Bounded successor **Implementation Authorization** for **one future narrow repository retarget** of the replay artifact’s expected DBA authorization ID (and directly coupled truthful IA metadata). This issuance **does not implement** the retarget · **does not** modify the artifact · **does not** execute LOCAL-012 · **does not** run DB / Supabase / Docker · **does not** edit HMD-005 reconstruction or target · **does not** change quarantine · **does not** modify the environment guard · **does not** re-implement diagnostic observability · **does not** issue Completion-012.

```
SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION = E-02-BCR-IA-012
DECISION                                   = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PREDECESSORS (E-02-BCR-IA / -002 … -011)
                                           = CONSUMED / HISTORICAL / IMMUTABLE
AUTHORIZED ACTION                          = AUTHORIZATION-ID RETARGET ONLY
CURRENT ARTIFACT PIN                       = E-02-DBA-LOCAL-011
AUTHORIZED ARTIFACT PIN                    = E-02-DBA-LOCAL-012
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-011
AUTHORIZED ARTIFACT AUTHORITY              = E-02-BCR-IA-012
RUNTIME DBA ENV                            = E02_DBA_AUTHORIZATION_ID (UNCHANGED)
EXACT-MATCH MODEL                          = RETAINED (no dual-accept / prefix / regex / override)
SEMANTIC CHANGE COUNT                      = EXACTLY 2
DAA-014-C                                  = ISSUED / GUARD SEMANTICS UNCHANGED
DIAGNOSTIC OBSERVABILITY                   = MUST REMAIN INTACT
CB-B ARCHITECTURE                          = RETAINED
LAUNCHER / STARTUP                         = UNCHANGED
HMD-005 RECONSTRUCTION / TARGET            = UNTOUCHED
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
PAD-053                                    = ISSUED / IMMUTABLE
LOCAL-011                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-011 RETRY                            = NOT AUTHORIZED
LOCAL-012                                  = APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED
LOCAL-012 STATEFUL APPLY ATTEMPTS          = 0
LOCAL-012 BCR COMPATIBILITY                = BLOCKED UNTIL RETARGET IMPLEMENTATION AND SUCCESSOR BCR COMPLETION
ARTIFACT EXECUTION                         = NOT AUTHORIZED BY THIS IA
THIS ISSUANCE                              ≠ IMPLEMENTATION · ≠ LOCAL-012 EXECUTION · ≠ COMPLETION-012
```

---

## 1. Authority / sequence finding (this issuance)

| Check | Result |
|-------|--------|
| A. E-02-BCR-IA-011 exists | **YES** |
| B. E-02-BCR-IA-011 CONSUMED | **YES** (Completion-011 operational ledger) |
| C. Completion-011 COMPLETED WITH NOTES | **YES** |
| D. E-02-DBA-LOCAL-012 exists | **YES** |
| E. LOCAL-012 status | **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED** |
| F. LOCAL-012 attempts | **0** |
| G. LOCAL-012 requires successor BCR retarget | **YES** |
| H. Current artifact pin / authority | `EXPECTED_DBA_AUTHORIZATION_ID = 'E-02-DBA-LOCAL-011'` · `ARTIFACT_AUTHORIZATION_ID = 'E-02-BCR-IA-011'` |
| I. Runtime env | `E02_DBA_AUTHORIZATION_ID` (**UNCHANGED**) |
| J. Exact-match fail-closed present | **YES** (`raw !== EXPECTED_DBA_AUTHORIZATION_ID` → STOP) |
| K. Dual-accept mechanism | **NONE** |
| L. E-02-BCR-IA-012 already exists | **NO** (before this issuance) |
| M. Later BCR IA already issued | **NO** (no **013+**) |
| N. Next unused successor | **012** |
| O. Family / path | BCR Implementation Authorization family · `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-012.md` |
| P. PAD-053 / HFSOR-IA-002 / Completion-002 | **ISSUED / CONSUMED / COMPLETED WITH NOTES** |
| Q. Quarantine exactly one | **YES** — `20260314195641_add_demo_data.sql` · allowlist length **1** |

```
AUTHORITY PATH     = PASS
BCR IA FAMILY      = E-02 Baseline Compatibility Replay Implementation Authorization
CURRENT IA         = E-02-BCR-IA-011
NEXT IA            = E-02-BCR-IA-012
DOCUMENT PATH      = docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-012.md
```

**No STOP.** Issuance may proceed.

---

## 2. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Database-Application-Authorization-LOCAL-012.md`](E-02-Database-Application-Authorization-LOCAL-012.md) | Direct DBA — **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED** · NEXT = successor BCR retarget |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-011.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-011.md) | Predecessor **E-02-BCR-IA-011 CONSUMED / HISTORICAL / IMMUTABLE** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-011.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-011.md) | IA-011 repository completion — **COMPLETED WITH NOTES** · **not reopened** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-011.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-011.md) | LOCAL-011 **APPLICATION_FAILED** at `20260329103000` (`unsafe use of new value "admin" of enum type user_role`) · **immutable** |
| [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-002.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-002.md) | HMD-005 repository reconstruction **COMPLETED WITH NOTES** |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md) | **PAD-053 ISSUED / IMMUTABLE** |
| [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) | DAA-014-C **ISSUED** · named technical guard inputs · **not implemented by this IA** |
| Artifact (read-only, this issuance) | `scripts/verification/e02/replay-e02-declared-baseline.ts` |

No new Program Authority Decision required. No Clean-Base Design Amendment required. No new BCR-CB defect required. No reconstruction SQL change. No restoration SQL change. No guard change.

---

## 3. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-BCR-IA-012** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Status at issuance** | **APPROVED WITH CONDITIONS / NOT YET CONSUMED** |
| **Authorized action** | One future repository retarget of the replay artifact expected DBA ID + coupled truthful IA metadata |
| **Authorized transformation (1)** | `EXPECTED_DBA_AUTHORIZATION_ID`: `E-02-DBA-LOCAL-011` → `E-02-DBA-LOCAL-012` |
| **Authorized transformation (2)** | `ARTIFACT_AUTHORIZATION_ID`: `E-02-BCR-IA-011` → `E-02-BCR-IA-012` |
| **Expected semantic change count** | **EXACTLY 2** |
| **Exact-match model** | **RETAINED** |
| **Dual acceptance** | **NONE / FORBIDDEN** |
| **Implementation this task** | **NOT PERFORMED** |
| **LOCAL-012 execution** | **NOT AUTHORIZED by this IA** (remains blocked until retarget implementation + Completion-012) |

---

## 4. Purpose

Align the artifact’s **stale execution-authority pin** with the **already issued** DBA:

```
CURRENT   EXPECTED_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-011
REQUIRED  E02_DBA_AUTHORIZATION_ID      = E-02-DBA-LOCAL-012   (LOCAL-012)
AUTHORIZED RETARGET                     = E-02-DBA-LOCAL-012

CURRENT   ARTIFACT_AUTHORIZATION_ID     = E-02-BCR-IA-011
AUTHORIZED ARTIFACT AUTHORITY           = E-02-BCR-IA-012
```

This is **AUTHORIZATION-ID RETARGET ONLY**.

**Not:** CB-B redesign · replay redesign · migration change · HMD-005 reconstruction/target edit · W1/W2 edit · HMD-002/HMD-004 edit · quarantine change · history-policy change · launcher redesign · preserve/cleanup redesign · verifier redesign · environment-guard redesign · diagnostic redesign · DAA-014-C implementation · HMD status change · database execution · LOCAL-012 execution · LOCAL-011 retry · LOCAL-013.

---

## 5. Why this change is authority-safe

LOCAL-012 is already formally issued as **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED**.

Retargeting the artifact to LOCAL-012 **does not fabricate authority**. It aligns the artifact with the current formally issued DBA. The change **must not create authority independently**.

```
No LOCAL-012  →  no retarget would have been permitted
```

LOCAL-011 remains a **historical failed** DBA. This retarget is **prospective compatibility work for LOCAL-012 only**. It is **not** a retroactive repair of LOCAL-011. After future implementation, LOCAL-011 **must not** remain an operationally accepted DBA authority. Historical evidence and governance history may still name LOCAL-011.

---

## 6. Exact authorized source scope (future implementation)

**May modify exactly one source file:**

```
scripts/verification/e02/replay-e02-declared-baseline.ts
```

Plus minimal `docs/implementation/README.md` ledger update.

| Allowed | Not allowed |
|---------|-------------|
| `EXPECTED_DBA_AUTHORIZATION_ID` value `E-02-DBA-LOCAL-011` → `E-02-DBA-LOCAL-012` | Dual-accept LOCAL-011 **or** LOCAL-012 |
| Comments / help strings that currently hardcode the stale expected DBA ID or stale IA ID, updated to match the new constants | Prefix / regex / `startsWith` / arrays of accepted IDs / env-provided expected ID / operator override / compatibility aliases |
| `ARTIFACT_AUTHORIZATION_ID` `E-02-BCR-IA-011` → `E-02-BCR-IA-012` so static IA metadata remains **truthful** | Weakening or disabling exact-match / `ReplayStop` validation |
| | Changing diagnostic capture / sanitization / `--debug` / cleanup-order |
| | Changing environment-guard import or call |
| | Second source file · helper file · wildcard |
| | `verify-db-baseline.ts` · `environment-guard.ts` · package/lockfiles · tests · app source · migrations · Docker/Supabase config |

Runtime supplied value remains **`E02_DBA_AUTHORIZATION_ID`** and must still **exact-match** the expected ID. Fail-closed comparison must remain semantically equivalent to:

```
raw !== EXPECTED_DBA_AUTHORIZATION_ID  →  STOP
```

After implementation:

```
artifact expected DBA     = E-02-DBA-LOCAL-012
runtime E02_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-012
artifact authority        = E-02-BCR-IA-012
LOCAL-011 CURRENT ACCEPTANCE = NO
LOCAL-012 CURRENT ACCEPTANCE = YES
```

No acceptance of LOCAL-011 · LOCAL-010 · empty value · multiple values · legacy fallback · OR condition · prefix match · wildcard. Dual artifact authority **FORBIDDEN**. Historical comments are not operational acceptance. Do **not** edit historical comments merely to make grep empty.

**This issuance task itself MUST NOT modify the artifact.**

---

## 7. Exact-match security model (locked)

**Do not authorize:**

- accepting arbitrary DBA IDs
- prefix / suffix / regex / `startsWith` / substring
- arrays of accepted DBA IDs
- LOCAL-011 **OR** LOCAL-012 dual acceptance
- fallback to LOCAL-011
- environment-provided expected IDs
- operator override of expected ID
- compatibility aliases / mode
- bypassing exact match
- disabling / weakening `ReplayStop`
- warning-only mismatch
- default acceptance

Required semantics after future implementation:

```
runtime DBA ID === E-02-DBA-LOCAL-012
Anything else → STOP
```

```
EXACT-MATCH MODEL = RETAINED / REQUIRED
DUAL ACCEPTANCE   = FORBIDDEN
```

---

## 8. Runtime env contract (future; not this task)

Do **not** rename `E02_DBA_AUTHORIZATION_ID`. This IA changes **only** the expected DBA **value**.

After successful BCR implementation **and** Completion, future governed LOCAL-012 apply must use:

```
E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-012
E02_BCR_APPLY_AUTHORIZED=true
E02_ALLOW_DESTRUCTIVE_TESTS=true
E02_EVIDENCE_ENV=local
E02_RUNTIME_EXECUTION_AUTHORIZED=UNSET / FALSE
```

**This IA does NOT set or execute these values.** No RU-1.4 authority is implied.

---

## 9. DAA-014-C / guard lock

Do **not** modify `environment-guard.ts`. DAA-014-C remains:

```
E02_ALLOW_DESTRUCTIVE_TESTS=true
  = technical fail-closed input for the authorized disposable DB-backed DBA/BCR path
  ≠ destructive fixture / RU-1.4 / RPC / REA authority
```

---

## 10. Diagnostics / launcher lock

IA-006 diagnostics **must remain intact**. Future implementation **must not** modify diagnostics, launcher, package scripts, tests, or app source.

**Launcher = UNCHANGED.** Process kill **NOT AUTHORIZED**. Port remap **NOT AUTHORIZED**.

---

## 11. CB-B / baseline mode lock

**CB-B architecture = RETAINED.** `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` **unchanged**.  
**Baseline mode = RETAINED.** `E02_DECLARED_BASELINE_REPLAY` **unchanged**.

Do **not** redesign clean-base behavior. Do **not** alter auxiliary project creation · empty migrations bootstrap · application reset · migration replay ordering · truthful history · preserve/cleanup lifecycle.

LOCAL-012 already owns Docker warm-engine and TCP **54323 FREE** gates. This IA does **not** implement those gates.

---

## 12. Verifier lock

Do **not** authorize edits to `verify-db-baseline.ts`. This retarget is **not** a baseline verifier redesign.

---

## 13. Migration-zero-edit lock

This BCR IA authorizes **ZERO** migration changes.

Do **not** modify: HMD-005 reconstruction · HMD-005 target · HMD-002 migration · W1 · HMD-004 target · W2 · April HARD · governed July S1 · quarantine migration.

```
MIGRATION EDIT COUNT AUTHORIZED = 0
```

HMD-005 reconstruction and target remain **executable** (not quarantined).

---

## 14. HMD-005 / Completion-002

| Item | Status |
|------|--------|
| PAD-053 | **ISSUED / IMMUTABLE** |
| E-02-HFSOR-IA-002 | **CONSUMED** |
| E-02-HFSOR-IMPLEMENTATION-COMPLETION-002 | **COMPLETED WITH NOTES** |
| HMD-005 | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |
| Reconstruction | `20260329102500_hmd005_reconstruct_user_role_admin.sql` · **DO NOT EDIT** |
| Target | `20260329103000_add_admin_user_role_and_policy.sql` · **IMMUTABLE / DO NOT EDIT** |

No further HMD-005 repository repair is authorized. Completion-002 is **not** runtime proof.

Future LOCAL-012 runtime must prove:

```
RECONSTRUCTION = REACHED / APPLIED
TARGET         = REACHED / APPLIED
prior error (unsafe use of new value "admin" of enum type user_role)
               = NOT REPRODUCED
```

This BCR IA **does not** establish that evidence.

---

## 15. HMD-003 pending runtime checkpoints

| Checkpoint | Filename | Future objective |
|------------|----------|------------------|
| W2 | `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` | **REACHED / APPLIED** |
| April HARD | `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | **REACHED / APPLIED** |
| Governed July S1 | `20260711120000_invoice_ai_audit_v1.sql` | **REACHED / APPLIED** |

Do **not** modify those files. Do **not** mark HMD-003 runtime verified.

---

## 16. HMD status locks (issuance)

| Item | Status |
|------|--------|
| HMD-001 | **OPEN / DISTINCT** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT** — do not reopen |
| HMD-003 | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |
| HMD-004 | **SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — do not reopen |
| HMD-005 | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |

IA-012 issuance **does not** resolve any HMD.

---

## 17. Quarantine lock

Exactly:

```
20260314195641_add_demo_data.sql
COUNT = 1
```

Do **not** quarantine: HMD-005 reconstruction · HMD-005 target · HMD-002 · W1 · HMD-004 · W2 · April HARD · July S1. No quarantine change.

---

## 18. Migration count model

Current certified DB-free plan after HMD-005 implementation: discovered **286** · planned executable **285** · quarantineCount **1**.

The future BCR retarget changes **no** migration files. The expected structural migration set therefore remains unchanged. **Do not** encode 286 / 285 as a permanent invariant. Future implementation **must** report actual fresh `--plan` values.

---

## 19. Future implementation pre-gates

Before editing the BCR, future implementation **must** verify:

| Gate | Required |
|------|----------|
| A | E-02-BCR-IA-012 issued and **not consumed** |
| B | LOCAL-012 remains **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED** |
| C | LOCAL-012 attempts remain **0** |
| D | Current BCR still has exactly LOCAL-011 + IA-011 pins |
| E | No superseding BCR authority exists |
| F | HMD-005 Completion-002 remains valid |
| G | Quarantine remains count **1** |
| H | No material post-issuance migration-set change to replay governance |

Material mismatch → **STOP → GOVERNANCE**. No file edit.

---

## 20. Future implementation delta lock

Future implementation must prove semantic delta **exactly**:

```
OLD DBA PIN              = E-02-DBA-LOCAL-011
NEW DBA PIN              = E-02-DBA-LOCAL-012
OLD ARTIFACT AUTHORITY   = E-02-BCR-IA-011
NEW ARTIFACT AUTHORITY   = E-02-BCR-IA-012
SEMANTIC CHANGE COUNT    = EXACTLY 2
```

No additional semantic changes.

---

## 21. Future static validation

Authorize: static source inspection · `git diff` / numstat / status · BCR `--plan` · `npm run build`.

Require:

```
PLAN  = PLAN_OK
BUILD = PASS
```

No DB. No Docker mutation. No `--apply`.

---

## 22. Future `--plan` expectations

After retarget, DB-free `--plan` must report:

| Field | Required |
|-------|----------|
| `result` | `PLAN_OK` |
| `expectedDbaAuthorizationId` | `E-02-DBA-LOCAL-012` |
| `artifactAuthorizationId` | `E-02-BCR-IA-012` |
| quarantine | exactly one (`20260314195641_add_demo_data.sql`) |
| HMD-005 reconstruction | discovered / executable / **before** target |
| HMD-005 target | discovered / executable |

Capture actual `migrationCountDiscovered` · planned executable count · `quarantineCount`.

If existing plan tooling allows a DB-free wrong-ID test, it **may** be used. Do **not** perform stateful runtime merely to prove rejection.

---

## 23. IA consumption rule

**E-02-BCR-IA-012** may become **CONSUMED** only if:

1. exactly the two authorized BCR semantic changes are implemented;
2. LOCAL-012 becomes the sole expected DBA pin;
3. IA-012 becomes the sole artifact authority pin;
4. exact-match retained;
5. no dual acceptance;
6. migration files unchanged;
7. quarantine unchanged;
8. verifier / guard / diagnostics / launcher unchanged;
9. DB-free `--plan` = `PLAN_OK`;
10. build = **PASS**;
11. no DB / Supabase / Docker runtime;
12. no unauthorized intentional write.

Otherwise: **do not** mark IA consumed.

---

## 24. Successor BCR Completion (reserved; not this task)

A separate Completion is required after implementation.

Reserve, **do not create**:

```
docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Completion-012.md
```

Expected Completion ID (verify sequence at that later issuance): **E-02-BCR-IMPLEMENTATION-COMPLETION-012**. Highest issued BCR Completion in this numbered family is **011**. **012 is the next unused identifier** if still unused then.

After BCR implementation:

```
LOCAL-012 remains EXECUTION GATED
until successor BCR Completion is issued
```

Issuing IA-012 alone does **NOT** make LOCAL-012 executable.

Expected sequence:

```
E-02-BCR-IA-012
  → IMPLEMENT TWO-CONSTANT RETARGET
  → STATIC VERIFY
  → ISSUE COMPLETION-012
  → ONLY THEN LOCAL-012 MAY BECOME PRE-STATEFUL ELIGIBLE
  → RUNTIME GATES
  → SINGLE GOVERNED APPLY
```

---

## 25. LOCAL-011 / LOCAL-012 locks

```
LOCAL-011 =
  APPLICATION_FAILED /
  NOT SUCCESSFULLY CONSUMED /
  EVIDENCE IMMUTABLE
LOCAL-011 ATTEMPTS = 1
LOCAL-011 RETRY    = NOT AUTHORIZED

LOCAL-012 =
  APPROVED WITH CONDITIONS /
  NOT CONSUMED /
  EXECUTION GATED /
  NOT EXECUTED
LOCAL-012 STATEFUL APPLY ATTEMPTS = 0
FUTURE MAXIMUM STATEFUL APPLY     = EXACTLY 1
```

Issuing **E-02-BCR-IA-012 does NOT itself unblock LOCAL-012 execution.**

After this IA issuance:

```
LOCAL-012 BCR COMPATIBILITY =
  STILL BLOCKED UNTIL
  IA-012 RETARGET IMPLEMENTATION
  +
  COMPLETION-012
```

If a future apply starts: attempts = **1**. If it fails: evidence immutable · no retry · no automatic LOCAL-013.

Do **not** retry LOCAL-011 · reclassify LOCAL-011 · overwrite LOCAL-011 evidence · dual-accept LOCAL-011 · treat retarget as retroactive repair of LOCAL-011.

No LOCAL-012 `--apply` in this task.

---

## 26. Database / runtime lock (unchanged)

| Item | Status |
|------|--------|
| Database baseline | **NOT VERIFIED** |
| RU-1.1 | **NOT APPLIED** |
| RU-1.2 | **NOT APPLIED** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| EIR PASS | **NONE** |
| Acceptance | **BLOCKED** |
| Certification | **NOT ISSUED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Final COMMIT path | **BLOCKED** |

Nothing in IA-012 changes those statuses. Do **not** set runtime eligibility merely because this IA is issued.

---

## 27. Next action (this issuance)

```
NEXT = IMPLEMENT EXACTLY TWO BCR SEMANTIC RETARGET CHANGES
       UNDER E-02-BCR-IA-012
       REPOSITORY ONLY
```

Then: successor BCR Completion-012. Only after Completion may LOCAL-012 pre-stateful eligibility be considered.

**Do not** execute LOCAL-012. **Do not** create Completion-012 in this task.

---

## 28. File scope / prohibited work (this issuance confirmation)

This issuance task may modify **only**:

1. `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-012.md` (this document)
2. `docs/implementation/README.md` (minimal)

**No** artifact edit · **no** verifier edit · **no** environment-guard edit · **no** migration edit · **no** HMD-005 reconstruction/target edit · **no** W1/W2 edit · **no** package/test edit · **no** quarantine change · **no** env-var mutation · **no** DB · **no** stateful Supabase · **no** Docker · **no** LOCAL-012 execution · **no** LOCAL-012 evidence · **no** Completion-012 · **no** RU-1.4 · **no** REA · **no** commit.

---

## 29. Lock statement

```
E-02-BCR-IA-012                            = APPROVED WITH CONDITIONS / NOT YET CONSUMED
AUTHORIZED CHANGE                          = DBA AUTHORIZATION-ID RETARGET ONLY
CURRENT DBA PIN                            = E-02-DBA-LOCAL-011
AUTHORIZED DBA PIN                         = E-02-DBA-LOCAL-012
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-011
AUTHORIZED ARTIFACT AUTHORITY              = E-02-BCR-IA-012
RUNTIME DBA ENV                            = E02_DBA_AUTHORIZATION_ID
EXACT-MATCH MODEL                          = RETAINED / REQUIRED
DUAL ACCEPTANCE                            = FORBIDDEN
SEMANTIC CHANGE COUNT                      = EXACTLY 2
BCR IMPLEMENTATION                         = AUTHORIZED / NOT IMPLEMENTED
DAA-014-C                                  = ISSUED / GUARD SEMANTICS UNCHANGED
GUARD                                      = DO NOT MODIFY
DIAGNOSTIC OBSERVABILITY                   = PRESERVE / DO NOT MODIFY
LAUNCHER                                   = UNCHANGED
CB-B                                       = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS / UNCHANGED
BASELINE MODE                              = E02_DECLARED_BASELINE_REPLAY / UNCHANGED
HMD-005                                    = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql / COUNT 1
LOCAL-011                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-011 RETRY                            = NOT AUTHORIZED
LOCAL-012                                  = APPROVED WITH CONDITIONS / NOT CONSUMED / NOT EXECUTED
LOCAL-012 STATEFUL APPLY ATTEMPTS          = 0
LOCAL-012 BCR COMPATIBILITY                = BLOCKED UNTIL E-02-BCR-IA-012 RETARGET IMPLEMENTATION + COMPLETION-012
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = IMPLEMENT BCR RETARGET UNDER E-02-BCR-IA-012 / REPOSITORY ONLY
EXECUTABLE WORK                            = NONE
```

---

**End of document — E-02-BCR-IA-012 — v1.0 — 2026-08-28**
