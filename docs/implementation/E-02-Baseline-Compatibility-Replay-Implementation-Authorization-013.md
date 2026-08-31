# E-02 — Baseline Compatibility Replay Artifact — Implementation Authorization (Successor)

## Authorization-ID Retarget Only · E-02-DBA-LOCAL-012 → E-02-DBA-LOCAL-013

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Authorization (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Artifact** | Governed Baseline-Compatibility Replay Artifact (class C) — **DBA authorization-ID retarget only** |
| **Authorization ID** | **E-02-BCR-IA-013** |
| **Predecessors** | **E-02-BCR-IA** · **E-02-BCR-IA-002** · **E-02-BCR-IA-003** · **E-02-BCR-IA-004** · **E-02-BCR-IA-005** · **E-02-BCR-IA-006** · **E-02-BCR-IA-007** · **E-02-BCR-IA-008** · **E-02-BCR-IA-009** · **E-02-BCR-IA-010** · **E-02-BCR-IA-011** · **E-02-BCR-IA-012** — all **CONSUMED / HISTORICAL / IMMUTABLE** |
| **Direct DBA authority aligned** | **E-02-DBA-LOCAL-013** — [`E-02-Database-Application-Authorization-LOCAL-013.md`](E-02-Database-Application-Authorization-LOCAL-013.md) (**APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED**) |
| **Guard clarification (read-only)** | [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) (**DAA-014-C** · **ISSUED** · **EG-B**) |
| **Restoration authority (HMD-006, read-only)** | **PAD-054 ISSUED / IMMUTABLE** · **E-02-HMIR-IA-003 CONSUMED** · Completion-003 **COMPLETED WITH NOTES** |
| **Reconstruction authority (HMD-005, read-only)** | **PAD-053 ISSUED / IMMUTABLE** · **E-02-HFSOR-IA-002 CONSUMED** · Completion-002 **COMPLETED WITH NOTES** · LOCAL-012 runtime **REACHED / APPLIED** |
| **Reconstruction authority (HMD-003, read-only)** | **E-02-HFSOR-IA CONSUMED** · Completion **COMPLETED WITH NOTES** · PAD-051 **ISSUED / IMMUTABLE** |
| **Status** | **Approved With Conditions — NOT YET CONSUMED** |
| **Authority Level** | Implementation Authorization (repository implementation only) |
| **Effective Date** | 2026-08-28 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-013.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-013.md) |
| **Production Effect** | **None** |

> **Authority path finding: YES.** `E-02-Baseline-Compatibility-Replay-Implementation-Authorization-013.md` is **authority-safe** as the next **successor Implementation Authorization** in the existing BCR IA family (`…-Implementation-Authorization.md` → `-002` … `-012` → **`-013`**). ID **`E-02-BCR-IA-013`** parallels that series. Highest previously allocated successor is **E-02-BCR-IA-012** (**CONSUMED**). No BCR IA numbered **013** existed before this issuance. BCR-IA-013 was **not reserved**. BCR-IA-013 has **not previously been issued or consumed**. No **014+** exists or supersedes the sequence. Distinct filename keeps predecessors **immutable**. **Not a new governance tier.** **Not a PAD.** **Not PAD-055.** **Not a DBA.** **Not a HMIR IA.** **Not a reconstruction IA.** **Not a Clean-Base Design Amendment.** **Not a Guard Implementation Authorization.** **Not a new diagnostic runtime class.** **Not a new BCR-CB architecture.** **Not a new defect by itself.** **Not a quarantine amendment.** **Not a restoration/reconstruction reopening.** **Not a RU-1.4 REA.** **Not an EIR.** **Not BCR Completion-013.**

> **Document class:** Bounded successor **Implementation Authorization** for **one future narrow repository retarget** of the replay artifact’s expected DBA authorization ID (and directly coupled truthful IA metadata). This issuance **does not implement** the retarget · **does not** modify the artifact · **does not** execute LOCAL-013 · **does not** retry LOCAL-012 · **does not** run DB / Supabase / Docker · **does not** edit the HMD-006 target · **does not** change quarantine · **does not** modify the environment guard · **does not** re-implement diagnostic observability · **does not** issue Completion-013.

```
SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION = E-02-BCR-IA-013
DECISION                                   = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PREDECESSORS (E-02-BCR-IA / -002 … -012)
                                           = CONSUMED / HISTORICAL / IMMUTABLE
AUTHORIZED ACTION                          = AUTHORIZATION-ID RETARGET ONLY
CURRENT ARTIFACT PIN                       = E-02-DBA-LOCAL-012
AUTHORIZED ARTIFACT PIN                    = E-02-DBA-LOCAL-013
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-012
AUTHORIZED ARTIFACT AUTHORITY              = E-02-BCR-IA-013
RUNTIME DBA ENV                            = E02_DBA_AUTHORIZATION_ID (UNCHANGED)
EXACT-MATCH MODEL                          = RETAINED (no dual-accept / prefix / regex / override)
SEMANTIC CHANGE COUNT                      = EXACTLY 2
DAA-014-C                                  = ISSUED / GUARD SEMANTICS UNCHANGED
DIAGNOSTIC OBSERVABILITY                   = MUST REMAIN INTACT
CB-B ARCHITECTURE                          = RETAINED
LAUNCHER / STARTUP                         = UNCHANGED
HMD-006 TARGET                             = UNTOUCHED
HMD-005 RECONSTRUCTION / TARGET            = UNTOUCHED
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
PAD-054                                    = ISSUED / IMMUTABLE
LOCAL-012                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-012 RETRY                            = NOT AUTHORIZED
LOCAL-013                                  = APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED
LOCAL-013 STATEFUL APPLY ATTEMPTS          = 0
LOCAL-013 BCR COMPATIBILITY                = BLOCKED UNTIL RETARGET IMPLEMENTATION AND SUCCESSOR BCR COMPLETION
BCR RETARGET                               = AUTHORIZED / NOT IMPLEMENTED
ARTIFACT EXECUTION                         = NOT AUTHORIZED BY THIS IA
THIS ISSUANCE                              ≠ IMPLEMENTATION · ≠ LOCAL-013 EXECUTION · ≠ COMPLETION-013
```

---

## 1. Authority / sequence finding (this issuance)

| Check | Result |
|-------|--------|
| A. E-02-BCR-IA-012 exists | **YES** |
| B. E-02-BCR-IA-012 CONSUMED | **YES** (Completion-012 operational ledger) |
| C. Completion-012 COMPLETED WITH NOTES | **YES** |
| D. E-02-DBA-LOCAL-013 exists | **YES** |
| E. LOCAL-013 status | **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED** |
| F. LOCAL-013 attempts | **0** (no LOCAL-013 evidence file) |
| G. LOCAL-013 requires successor BCR retarget | **YES** |
| H. Current operational artifact pin / authority | `EXPECTED_DBA_AUTHORIZATION_ID = 'E-02-DBA-LOCAL-012'` · `ARTIFACT_AUTHORIZATION_ID = 'E-02-BCR-IA-012'` |
| I. Runtime env | `E02_DBA_AUTHORIZATION_ID` (**UNCHANGED**) |
| J. Exact-match fail-closed present | **YES** (`raw !== EXPECTED_DBA_AUTHORIZATION_ID` → STOP) |
| K. Dual-accept mechanism | **NONE** |
| L. LOCAL-011 operationally accepted | **NO** |
| M. LOCAL-013 already accepted | **NO** |
| N. E-02-BCR-IA-013 already exists | **NO** (before this issuance) |
| O. Later BCR IA already issued | **NO** (no **014+**) |
| P. Next unused successor | **013** |
| Q. Family / path | BCR Implementation Authorization family · `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-013.md` |
| R. PAD-054 / HMIR-IA-003 / Completion-003 | **ISSUED / CONSUMED / COMPLETED WITH NOTES** |
| S. Quarantine exactly one | **YES** — `20260314195641_add_demo_data.sql` · allowlist length **1** |

```
AUTHORITY PATH     = PASS
BCR IA FAMILY      = E-02 Baseline Compatibility Replay Implementation Authorization
CURRENT IA         = E-02-BCR-IA-012
NEXT IA            = E-02-BCR-IA-013
DOCUMENT PATH      = docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-013.md
```

**No STOP.** Issuance may proceed.

---

## 2. BCR worktree finding (this issuance, read-only)

`scripts/verification/e02/replay-e02-declared-baseline.ts` is **dirty vs HEAD**.

| Check | Result |
|-------|--------|
| `git diff --numstat` | **2 / 2** |
| Diff content | **exactly two** constant replacements |
| From HEAD | `ARTIFACT_AUTHORIZATION_ID` `E-02-BCR-IA-011` → `E-02-BCR-IA-012` |
| From HEAD | `EXPECTED_DBA_AUTHORIZATION_ID` `E-02-DBA-LOCAL-011` → `E-02-DBA-LOCAL-012` |
| Extra hunk | **NONE** |

Classification:

```
A. Pre-existing authorized BCR diff attributable to E-02-BCR-IA-012
   = YES  (certified LOCAL-011/IA-011 → LOCAL-012/IA-012 retarget)
B. New unauthorized BCR drift
   = NONE
```

Operational current pins are the **worktree** constants (`LOCAL-012` / `IA-012`), not HEAD (`LOCAL-011` / `IA-011`). HEAD remains the last committed predecessor pin set. Historical header comments naming older IDs (including `E-02-DBA-LOCAL-004`) are **not** operational acceptance.

Unexplained semantic drift = **NONE**. Gate **PASS**.

**This issuance task itself MUST NOT modify the artifact.**

---

## 3. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Database-Application-Authorization-LOCAL-013.md`](E-02-Database-Application-Authorization-LOCAL-013.md) | Direct DBA — **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED** · NEXT = successor BCR retarget |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-012.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-012.md) | Predecessor **E-02-BCR-IA-012 CONSUMED / HISTORICAL / IMMUTABLE** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-012.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-012.md) | IA-012 repository completion — **COMPLETED WITH NOTES** · **not reopened** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-012.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-012.md) | LOCAL-012 **APPLICATION_FAILED** at `20260331161000` (`syntax error at or near "物业经理"`) · **immutable** |
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion-003.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion-003.md) | HMD-006 repository restoration **COMPLETED WITH NOTES** |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md) | **PAD-054 ISSUED / IMMUTABLE** |
| [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) | DAA-014-C **ISSUED** · named technical guard inputs · **not implemented by this IA** |
| Artifact (read-only, this issuance) | `scripts/verification/e02/replay-e02-declared-baseline.ts` |

No new Program Authority Decision required. No Clean-Base Design Amendment required. No new BCR-CB defect required. No reconstruction SQL change. No restoration SQL change. No guard change.

---

## 4. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-BCR-IA-013** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Status at issuance** | **APPROVED WITH CONDITIONS / NOT YET CONSUMED** |
| **Authorized action** | One future repository retarget of the replay artifact expected DBA ID + coupled truthful IA metadata |
| **Authorized transformation (1)** | `EXPECTED_DBA_AUTHORIZATION_ID`: `E-02-DBA-LOCAL-012` → `E-02-DBA-LOCAL-013` |
| **Authorized transformation (2)** | `ARTIFACT_AUTHORIZATION_ID`: `E-02-BCR-IA-012` → `E-02-BCR-IA-013` |
| **Expected semantic change count** | **EXACTLY 2** |
| **Exact-match model** | **RETAINED** |
| **Dual acceptance** | **NONE / FORBIDDEN** |
| **Implementation this task** | **NOT PERFORMED** |
| **LOCAL-013 execution** | **NOT AUTHORIZED by this IA** (remains blocked until retarget implementation + Completion-013) |

---

## 5. Purpose

Align the artifact’s **stale execution-authority pin** with the **already issued** DBA:

```
CURRENT   EXPECTED_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-012
REQUIRED  E02_DBA_AUTHORIZATION_ID      = E-02-DBA-LOCAL-013   (LOCAL-013)
AUTHORIZED RETARGET                     = E-02-DBA-LOCAL-013

CURRENT   ARTIFACT_AUTHORIZATION_ID     = E-02-BCR-IA-012
AUTHORIZED ARTIFACT AUTHORITY           = E-02-BCR-IA-013
```

This is **AUTHORIZATION-ID RETARGET ONLY**.

**Not:** CB-B redesign · replay redesign · migration change · HMD-006 target edit · HMD-005 reconstruction/target edit · W1/W2 edit · HMD-002/HMD-004 edit · quarantine change · history-policy change · launcher redesign · preserve/cleanup redesign · verifier redesign · environment-guard redesign · diagnostic redesign · DAA-014-C implementation · HMD status change · database execution · LOCAL-013 execution · LOCAL-012 retry · LOCAL-014.

---

## 6. Why this change is authority-safe

LOCAL-013 is already formally issued as **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED**.

Retargeting the artifact to LOCAL-013 **does not fabricate authority**. It aligns the artifact with the current formally issued DBA. The change **must not create authority independently**.

```
No LOCAL-013  →  no retarget would have been permitted
```

LOCAL-012 remains a **historical failed** DBA. This retarget is **prospective compatibility work for LOCAL-013 only**. It is **not** a retroactive repair of LOCAL-012. After future implementation, LOCAL-012 **must not** remain an operationally accepted DBA authority. Historical evidence and governance history may still name LOCAL-012.

Do **not** grant BCR compatibility with LOCAL-012 as an alternate runtime authority.

---

## 7. Exact authorized source scope (future implementation)

**May modify exactly one source file:**

```
scripts/verification/e02/replay-e02-declared-baseline.ts
```

Plus minimal `docs/implementation/README.md` ledger update.

| Allowed | Not allowed |
|---------|-------------|
| `EXPECTED_DBA_AUTHORIZATION_ID` value `E-02-DBA-LOCAL-012` → `E-02-DBA-LOCAL-013` | Dual-accept LOCAL-012 **or** LOCAL-013 |
| Comments / help strings that currently hardcode the stale expected DBA ID or stale IA ID, updated to match the new constants | Prefix / regex / `startsWith` / arrays of accepted IDs / env-provided expected ID / operator override / compatibility aliases |
| `ARTIFACT_AUTHORIZATION_ID` `E-02-BCR-IA-012` → `E-02-BCR-IA-013` so static IA metadata remains **truthful** | Weakening or disabling exact-match / `ReplayStop` validation |
| | Changing diagnostic capture / sanitization / `--debug` / cleanup-order |
| | Changing environment-guard import or call |
| | Second source file · helper file · wildcard |
| | `verify-db-baseline.ts` · `environment-guard.ts` · package/lockfiles · tests · app source · migrations · Docker/Supabase config |

Prefer **minimal direct replacement**. Do **not** refactor surrounding code.

Runtime supplied value remains **`E02_DBA_AUTHORIZATION_ID`** and must still **exact-match** the expected ID. Fail-closed comparison must remain semantically equivalent to:

```
raw !== EXPECTED_DBA_AUTHORIZATION_ID  →  STOP
```

After implementation:

```
artifact expected DBA          = E-02-DBA-LOCAL-013
runtime E02_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-013
artifact authority             = E-02-BCR-IA-013
LOCAL-012 CURRENT ACCEPTANCE   = NO
LOCAL-013 CURRENT ACCEPTANCE   = YES, exact only
BCR-IA-012 CURRENT AUTHORITY   = NO
BCR-IA-013 CURRENT AUTHORITY   = YES, exact only
```

No acceptance of LOCAL-012 · LOCAL-011 · empty value · multiple values · legacy fallback · OR condition · prefix match · wildcard. Dual artifact authority **FORBIDDEN**. Historical comments / governance documents are not operational acceptance. Do **not** edit historical comments merely to make grep empty.

**This issuance task itself MUST NOT modify the artifact.**

---

## 8. Exact-match security model (locked)

**Do not authorize:**

- accepting arbitrary DBA IDs
- prefix / suffix / regex / `startsWith` / substring
- arrays of accepted DBA IDs
- LOCAL-012 **OR** LOCAL-013 dual acceptance
- fallback to LOCAL-012
- environment-provided expected IDs
- operator override of expected ID
- compatibility aliases / mode
- bypassing exact match
- disabling / weakening `ReplayStop`
- warning-only mismatch
- default acceptance

Required semantics after future implementation:

```
runtime DBA ID === E-02-DBA-LOCAL-013
Anything else → STOP
```

```
EXACT-MATCH MODEL = RETAINED / REQUIRED
DUAL ACCEPTANCE   = FORBIDDEN
```

---

## 9. Runtime env contract (future; not this task)

Do **not** rename `E02_DBA_AUTHORIZATION_ID`. This IA changes **only** the expected DBA **value**.

After successful BCR implementation **and** Completion, future governed LOCAL-013 apply must use:

```
E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-013
E02_BCR_APPLY_AUTHORIZED=true
E02_ALLOW_DESTRUCTIVE_TESTS=true
E02_EVIDENCE_ENV=local
E02_RUNTIME_EXECUTION_AUTHORIZED=UNSET / FALSE
```

**This IA does NOT set or execute these values.** No RU-1.4 authority is implied. `E02_ALLOW_DESTRUCTIVE_TESTS=true` remains the technical disposable-db gate only.

---

## 10. DAA-014-C / guard lock

Do **not** modify `environment-guard.ts`. DAA-014-C remains:

```
E02_ALLOW_DESTRUCTIVE_TESTS=true
  = technical fail-closed input for the authorized disposable DB-backed DBA/BCR path
  ≠ destructive fixture / RU-1.4 / RPC / REA authority
```

---

## 11. Diagnostics / launcher lock

IA-006 diagnostics **must remain intact**. Future implementation **must not** modify diagnostics, launcher, package scripts, tests, or app source.

**Launcher = UNCHANGED.** Process kill **NOT AUTHORIZED**. Port remap **NOT AUTHORIZED**.

---

## 12. CB-B / baseline mode / artifact lock

**CB-B architecture = RETAINED.** `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` **unchanged**.  
**Baseline mode = RETAINED.** `E02_DECLARED_BASELINE_REPLAY` **unchanged**.

Other than the two authorized pin changes, future implementation **must leave BCR semantically unchanged**. Do **not** change:

- migration discovery · ordering · quarantine logic
- transaction strategy · SQL execution
- preserve/handoff · evidence generation · manifest structure
- error handling · attempt behavior
- environment validation · cleanup behavior
- compatibility branch

LOCAL-013 already owns Docker warm-engine and TCP **54323 FREE** gates. This IA does **not** implement those gates.

---

## 13. Verifier lock

Do **not** authorize edits to `verify-db-baseline.ts`. This retarget is **not** a baseline verifier redesign.

---

## 14. Migration-zero-edit lock

This BCR IA authorizes **ZERO** migration changes.

Do **not** modify: HMD-006 target · HMD-005 reconstruction · HMD-005 target · HMD-002 migration · W1 · HMD-004 target · W2 · April HARD · governed July S1 · quarantine migration · sibling contamination files.

```
MIGRATION EDIT COUNT AUTHORIZED = 0
```

HMD-006 target remains **executable** (not quarantined). Historical restoration/reconstruction state is already governed separately.

---

## 15. HMD-006 / Completion-003

| Item | Status |
|------|--------|
| PAD-054 | **ISSUED / IMMUTABLE** |
| E-02-HMIR-IA-003 | **CONSUMED** |
| E-02-HMIR-IMPLEMENTATION-COMPLETION-003 | **COMPLETED WITH NOTES** |
| HMD-006 | **OPEN / HISTORICAL SOURCE-INTEGRITY DEFECT / EXACT SOURCE RESTORATION SELECTED / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |
| Target | `20260331161000_owner_bulletin_notifications.sql` · **DO NOT EDIT** |
| Restored fragments | **4** (L4 / L10 / L52 / L88) · whitespace **NONE** · siblings **UNCHANGED** |

No HMD-006 migration edit under BCR authority. Completion-003 is **not** runtime proof.

Future LOCAL-013 runtime must prove:

```
TARGET     = REACHED / APPLIED
prior error (syntax error at or near "物业经理")
           = NOT REPRODUCED
```

If that evidence exists, HMD-006 **may** advance to **RUNTIME REPLAY VERIFIED** and **must not** automatically be marked **CLOSED**. This BCR IA **does not** establish that evidence.

---

## 16. HMD-005 preserved runtime proof

```
HMD-005 =
  OPEN /
  RECONSTRUCTION IMPLEMENTED /
  IMPLEMENTATION COMPLETED /
  RUNTIME REPLAY VERIFIED
```

Do **not** close. Do **not** reopen. Do **not** edit reconstruction or target.

---

## 17. HMD-003 pending runtime checkpoints

| Checkpoint | Filename | Future LOCAL-013 objective |
|------------|----------|----------------------------|
| W2 | `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` | **REACHED / APPLIED** |
| April HARD | `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | **REACHED / APPLIED** |
| Governed July S1 | `20260711120000_invoice_ai_audit_v1.sql` | **REACHED / APPLIED** |

Do **not** modify those files. Do **not** mark HMD-003 runtime verified.

```
HMD-003 =
  OPEN /
  RECONSTRUCTION IMPLEMENTED /
  IMPLEMENTATION COMPLETED /
  RUNTIME REPLAY VERIFICATION PENDING
```

---

## 18. HMD status locks (issuance)

| Item | Status |
|------|--------|
| HMD-001 | **OPEN / DISTINCT** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT** — do not reopen |
| HMD-003 | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |
| HMD-004 | **SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — do not reopen |
| HMD-005 | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — do not close |
| HMD-006 | **OPEN / HISTORICAL SOURCE-INTEGRITY DEFECT / EXACT SOURCE RESTORATION SELECTED / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |

IA-013 issuance **does not** resolve any HMD.

---

## 19. Quarantine lock

Exactly:

```
20260314195641_add_demo_data.sql
COUNT = 1
```

Do **not** quarantine: HMD-006 target · HMD-005 reconstruction · HMD-005 target · HMD-002 · W1 · HMD-004 · W2 · April HARD · July S1. No quarantine change.

---

## 20. Migration count model

Current certified DB-free plan reference: discovered **286** · planned executable **285** · quarantineCount **1**.

The future BCR retarget changes **no** migration files. The expected structural migration set therefore remains unchanged. **Do not** encode 286 / 285 as a permanent invariant. Future implementation **must** report actual fresh `--plan` values.

---

## 21. Future implementation pre-gates

Before editing the BCR, future implementation **must** verify:

| Gate | Required |
|------|----------|
| A | LOCAL-013 remains **APPROVED WITH CONDITIONS / NOT CONSUMED / NOT EXECUTED / attempts 0** |
| B | LOCAL-012 remains **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE / NO RETRY** |
| C | Current operational BCR pins remain exactly **LOCAL-012 / BCR-IA-012** |
| D | E-02-BCR-IA-013 issued and **APPROVED WITH CONDITIONS / NOT YET CONSUMED** |
| E | No superseding BCR authority exists |
| F | No unexplained executable drift beyond the certified IA-012 2/2 pin retarget |
| G | Quarantine remains count **1** |
| H | HMD-006 Completion-003 remains valid · HMD-006 target unedited by this IA |

Material mismatch → **STOP → GOVERNANCE**. No file edit.

---

## 22. Future implementation delta lock

Future implementation must prove semantic delta **exactly**:

```
OLD DBA PIN              = E-02-DBA-LOCAL-012
NEW DBA PIN              = E-02-DBA-LOCAL-013
OLD ARTIFACT AUTHORITY   = E-02-BCR-IA-012
NEW ARTIFACT AUTHORITY   = E-02-BCR-IA-013
SEMANTIC CHANGE COUNT    = EXACTLY 2
```

Capture `git diff` and `git diff --numstat`. No third semantic change. If extra semantic changes appear: **IA NOT CONSUMED** · **STOP → GOVERNANCE**.

Old operational values must be absent from acceptance logic. Historical/governance documentation may still contain old IDs; that is **not** operational acceptance.

The certified IA-012 worktree 2/2 (HEAD `LOCAL-011/IA-011` → worktree `LOCAL-012/IA-012`) remains the **starting operational state**. Future implementation must retarget **from that operational state**, not from HEAD.

---

## 23. Future static validation

Authorize: static source inspection · `git diff` / numstat / status · BCR `--plan` · `npm run build`.

Require:

```
PLAN  = PLAN_OK
BUILD = PASS
```

No DB. No Docker mutation. No `--apply`.

Future `--plan` authority report must show:

| Field | Required |
|-------|----------|
| `result` | `PLAN_OK` |
| `expectedDbaAuthorizationId` | `E-02-DBA-LOCAL-013` |
| `artifactAuthorizationId` | `E-02-BCR-IA-013` |
| `quarantineCount` | **1** |
| quarantined | `20260314195641_add_demo_data.sql` |

And must discover/executable at minimum:

| File | Required |
|------|----------|
| `20260329102500_hmd005_reconstruct_user_role_admin.sql` | **DISCOVERED / EXECUTABLE** |
| `20260329103000_add_admin_user_role_and_policy.sql` | **DISCOVERED / EXECUTABLE** |
| `20260331161000_owner_bulletin_notifications.sql` | **DISCOVERED / EXECUTABLE / NOT QUARANTINED** |
| `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` | **DISCOVERED / EXECUTABLE** |
| `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | **DISCOVERED / EXECUTABLE** |
| `20260711120000_invoice_ai_audit_v1.sql` | **DISCOVERED / EXECUTABLE** |
| `20260314195641_add_demo_data.sql` | **DISCOVERED / QUARANTINED** |

Capture actual `migrationCountDiscovered` · planned executable count · `quarantineCount`. Do **not** treat 286/285/1 as permanent invariants.

---

## 24. Future zero-runtime lock

BCR retarget implementation itself **must** have:

```
DATABASE                = NONE
STATEFUL SUPABASE       = NONE
DOCKER MUTATION         = NONE
--apply                 = NONE
LOCAL-013 EXECUTION     = NONE
LOCAL-013 ATTEMPTS      = 0
```

This IA issuance **does not** increment LOCAL-013 attempts. Only a future stateful `--apply` start increments `0 → 1`.

---

## 25. IA consumption rule

**E-02-BCR-IA-013** may become **CONSUMED** only if:

1. pre-state pins exactly matched (`LOCAL-012` / `IA-012`);
2. exactly the two authorized BCR semantic changes are implemented;
3. resulting DBA pin = `E-02-DBA-LOCAL-013`;
4. resulting artifact authority = `E-02-BCR-IA-013`;
5. exact-match retained;
6. no dual acceptance;
7. LOCAL-012 operational acceptance removed;
8. BCR otherwise semantically unchanged;
9. migrations unchanged;
10. verifier / guard / diagnostics / launcher / package / tests / app unchanged;
11. quarantine remains count **1**;
12. fresh `--plan` = `PLAN_OK`;
13. build = **PASS**;
14. no runtime.

Otherwise: **BCR IA = NOT CONSUMED** · **STOP → GOVERNANCE**.

---

## 26. Successor BCR Completion (reserved; not this task)

A separate Completion is required after implementation.

Reserve, **do not create**:

```
docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Completion-013.md
```

Expected Completion ID (verify sequence at that later issuance): **E-02-BCR-IMPLEMENTATION-COMPLETION-013**. Highest issued BCR Completion in this numbered family is **012**. **013 is the next unused identifier** if still unused then.

Do **NOT** issue Completion in this IA task. Do **NOT** issue Completion automatically during retarget implementation.

After BCR implementation:

```
LOCAL-013 remains EXECUTION GATED
until successor BCR Completion is issued
```

Issuing IA-013 alone does **NOT** make LOCAL-013 executable.

Expected sequence:

```
E-02-BCR-IA-013
  → IMPLEMENT TWO-CONSTANT RETARGET
  → STATIC VERIFY
  → ISSUE COMPLETION-013
  → ONLY THEN LOCAL-013 MAY BECOME PRE-STATEFUL ELIGIBLE
  → RUNTIME GATES
  → SINGLE GOVERNED APPLY
```

---

## 27. LOCAL-012 / LOCAL-013 locks

```
LOCAL-012 =
  APPLICATION_FAILED /
  NOT SUCCESSFULLY CONSUMED /
  EVIDENCE IMMUTABLE
LOCAL-012 ATTEMPTS = 1
LOCAL-012 RETRY    = NOT AUTHORIZED

LOCAL-013 =
  APPROVED WITH CONDITIONS /
  NOT CONSUMED /
  NOT EXECUTED /
  EXECUTION GATED
LOCAL-013 STATEFUL APPLY ATTEMPTS = 0
FUTURE MAXIMUM STATEFUL APPLY     = EXACTLY 1
```

Issuing **E-02-BCR-IA-013 does NOT itself unblock LOCAL-013 execution.**

After this IA issuance:

```
LOCAL-013 BCR COMPATIBILITY =
  STILL BLOCKED UNTIL
  IA-013 RETARGET IMPLEMENTATION
  +
  COMPLETION-013

BCR RETARGET =
  AUTHORIZED /
  NOT IMPLEMENTED
```

If a future apply starts: attempts = **1**. If it fails: evidence immutable · no retry · no automatic LOCAL-014 · **STOP → GOVERNANCE**.

Do **not** retry LOCAL-012 · reclassify LOCAL-012 · overwrite LOCAL-012 evidence · dual-accept LOCAL-012 · treat retarget as retroactive repair of LOCAL-012.

No LOCAL-013 `--apply` in this task.

---

## 28. Database / runtime lock (unchanged)

| Item | Status |
|------|--------|
| Database baseline | **NOT VERIFIED** |
| RU-1.1 | **NOT APPLIED** |
| RU-1.2 | **NOT APPLIED** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **UNSET / FALSE** |
| EIR PASS | **NONE** |
| Acceptance | **BLOCKED** |
| Certification | **NOT ISSUED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Final COMMIT path | **BLOCKED** |

Nothing in IA-013 changes those statuses. Do **not** set runtime eligibility merely because this IA is issued.

---

## 29. Next action (this issuance)

```
NEXT = IMPLEMENT SUCCESSOR BCR RETARGET
       UNDER E-02-BCR-IA-013
       REPOSITORY ONLY
```

Then: successor BCR Completion-013. Only after Completion may LOCAL-013 pre-stateful eligibility be considered.

**Do not** execute LOCAL-013. **Do not** create Completion-013 in this task.

---

## 30. File scope / prohibited work (this issuance confirmation)

This issuance task may modify **only**:

1. `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-013.md` (this document)
2. `docs/implementation/README.md` (minimal)

**No** artifact edit · **no** verifier edit · **no** environment-guard edit · **no** diagnostic edit · **no** launcher edit · **no** package/test/app edit · **no** migration edit · **no** HMD-006 target edit · **no** HMD-005 reconstruction/target edit · **no** W1/W2 edit · **no** quarantine change · **no** env-var mutation · **no** DB · **no** stateful Supabase · **no** Docker · **no** LOCAL-012 retry · **no** LOCAL-013 execution · **no** LOCAL-013 evidence · **no** Completion-013 · **no** another DBA · **no** RU-1.4 · **no** REA · **no** EIR · **no** commit.

---

## 31. Lock statement

```
E-02-BCR-IA-013                            = APPROVED WITH CONDITIONS / NOT YET CONSUMED
AUTHORIZED CHANGE                          = DBA AUTHORIZATION-ID RETARGET ONLY
CURRENT DBA PIN                            = E-02-DBA-LOCAL-012
AUTHORIZED DBA PIN                         = E-02-DBA-LOCAL-013
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-012
AUTHORIZED ARTIFACT AUTHORITY              = E-02-BCR-IA-013
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
HMD-006                                    = OPEN / SOURCE INTEGRITY RESTORED /
                                             IMPLEMENTATION COMPLETED /
                                             RUNTIME REPLAY VERIFICATION PENDING
HMD-005                                    = OPEN / RUNTIME REPLAY VERIFIED / NOT CLOSED
HMD-003                                    = OPEN / RUNTIME REPLAY VERIFICATION PENDING
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql / COUNT 1
LOCAL-012                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-012 RETRY                            = NOT AUTHORIZED
LOCAL-013                                  = APPROVED WITH CONDITIONS / NOT CONSUMED / NOT EXECUTED / EXECUTION GATED
LOCAL-013 STATEFUL APPLY ATTEMPTS          = 0
LOCAL-013 BCR COMPATIBILITY                = BLOCKED UNTIL E-02-BCR-IA-013 RETARGET IMPLEMENTATION + COMPLETION-013
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = IMPLEMENT SUCCESSOR BCR RETARGET
                                             UNDER E-02-BCR-IA-013 / REPOSITORY ONLY
EXECUTABLE WORK                            = NONE
```

---

**End of document — E-02-BCR-IA-013 — v1.0 — 2026-08-28**
