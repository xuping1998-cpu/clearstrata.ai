# E-02 — Baseline Compatibility Replay Artifact — Implementation Authorization (Successor)

## Authorization-ID Retarget Only · E-02-DBA-LOCAL-015 → E-02-DBA-LOCAL-016

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Authorization (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Artifact** | Governed Baseline-Compatibility Replay Artifact (class C) — **DBA authorization-ID retarget only** |
| **Authorization ID** | **E-02-BCR-IA-016** |
| **Predecessors** | **E-02-BCR-IA** · **E-02-BCR-IA-002** · **E-02-BCR-IA-003** · **E-02-BCR-IA-004** · **E-02-BCR-IA-005** · **E-02-BCR-IA-006** · **E-02-BCR-IA-007** · **E-02-BCR-IA-008** · **E-02-BCR-IA-009** · **E-02-BCR-IA-010** · **E-02-BCR-IA-011** · **E-02-BCR-IA-012** · **E-02-BCR-IA-013** · **E-02-BCR-IA-014** · **E-02-BCR-IA-015** — all **CONSUMED / HISTORICAL / IMMUTABLE** |
| **Direct DBA authority aligned** | **E-02-DBA-LOCAL-016** — [`E-02-Database-Application-Authorization-LOCAL-016.md`](E-02-Database-Application-Authorization-LOCAL-016.md) (**APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED** · attempts **0**) |
| **Guard clarification (read-only)** | [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) (**DAA-014-C** · **ISSUED** · **EG-B**) |
| **Reconstruction authority (HMD-009, read-only)** | **PAD-057 ISSUED / IMMUTABLE** · **E-02-HFSOR-IA-003 CONSUMED** · Completion-003 **COMPLETED WITH NOTES** |
| **Restoration authority (HMD-008, read-only)** | **PAD-056 ISSUED / IMMUTABLE** · **E-02-HMIR-IA-005 CONSUMED** · Completion-005 **COMPLETED WITH NOTES** · LOCAL-015 runtime **REACHED / APPLIED** · **RUNTIME REPLAY VERIFIED** |
| **Restoration authority (HMD-007, read-only)** | **PAD-055 ISSUED / IMMUTABLE** · **E-02-HMIR-IA-004 CONSUMED** · Completion-004 **COMPLETED WITH NOTES** · LOCAL-014 / LOCAL-015 runtime **REACHED / APPLIED** · **RUNTIME REPLAY VERIFIED** |
| **Restoration authority (HMD-006, read-only)** | **PAD-054 ISSUED / IMMUTABLE** · **E-02-HMIR-IA-003 CONSUMED** · Completion-003 **COMPLETED WITH NOTES** · LOCAL-013 / LOCAL-014 / LOCAL-015 runtime **REACHED / APPLIED** · **RUNTIME REPLAY VERIFIED** |
| **Reconstruction authority (HMD-005, read-only)** | **PAD-053 ISSUED / IMMUTABLE** · **E-02-HFSOR-IA-002 CONSUMED** · Completion-002 **COMPLETED WITH NOTES** · LOCAL-012+ runtime **REACHED / APPLIED** · **RUNTIME REPLAY VERIFIED** |
| **Reconstruction authority (HMD-003, read-only)** | **E-02-HFSOR-IA CONSUMED** · Completion **COMPLETED WITH NOTES** · PAD-051 **ISSUED / IMMUTABLE** · W2 / April HARD / July S1 **NOT REACHED** (latest LOCAL-015 evidence) |
| **Status** | **Approved With Conditions — NOT YET CONSUMED** |
| **Authority Level** | Implementation Authorization (repository implementation only) |
| **Effective Date** | 2026-08-30 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-016.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-016.md) |
| **Production Effect** | **None** |

> **Authority path finding: YES.** `E-02-Baseline-Compatibility-Replay-Implementation-Authorization-016.md` is **authority-safe** as the next **successor Implementation Authorization** in the existing BCR IA family (`…-Implementation-Authorization.md` → `-002` … `-015` → **`-016`**). ID **`E-02-BCR-IA-016`** parallels that series. Highest previously allocated successor is **E-02-BCR-IA-015** (**CONSUMED**). No BCR IA numbered **016** existed before this issuance. BCR-IA-016 was **not reserved**. BCR-IA-016 has **not previously been issued or consumed**. No **017+** exists or supersedes the sequence. Distinct filename keeps predecessors **immutable**. **Not a new governance tier.** **Not a PAD.** **Not PAD-058.** **Not a DBA.** **Not LOCAL-017.** **Not a HMIR IA.** **Not a reconstruction IA.** **Not a Clean-Base Design Amendment.** **Not a Guard Implementation Authorization.** **Not a new diagnostic runtime class.** **Not a new BCR-CB architecture.** **Not a new defect by itself.** **Not a quarantine amendment.** **Not a restoration/reconstruction reopening.** **Not a RU-1.4 REA.** **Not an EIR.** **Not BCR Completion-016.** **Not LOCAL-016 execution.** **Not LOCAL-015 retry.**

> **Document class:** Bounded successor **Implementation Authorization** for **one future narrow repository retarget** of the replay artifact’s expected DBA authorization ID (and directly coupled truthful IA metadata). This issuance **does not implement** the retarget · **does not** modify the artifact · **does not** execute LOCAL-016 · **does not** retry LOCAL-015 · **does not** run DB / Supabase / Docker · **does not** run BCR `--plan` · **does not** edit the HMD-009 reconstruction · **does not** edit the HMD-009 target · **does not** change quarantine · **does not** modify the environment guard · **does not** re-implement diagnostic observability · **does not** issue Completion-016.

```
SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION = E-02-BCR-IA-016
DECISION                                   = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PREDECESSORS (E-02-BCR-IA / -002 … -015)
                                           = CONSUMED / HISTORICAL / IMMUTABLE
AUTHORIZED ACTION                          = AUTHORIZATION-ID RETARGET ONLY
CURRENT ARTIFACT PIN                       = E-02-DBA-LOCAL-015
AUTHORIZED ARTIFACT PIN                    = E-02-DBA-LOCAL-016
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-015
AUTHORIZED ARTIFACT AUTHORITY              = E-02-BCR-IA-016
RUNTIME DBA ENV                            = E02_DBA_AUTHORIZATION_ID (UNCHANGED)
EXACT-MATCH MODEL                          = RETAINED (no dual-accept / prefix / regex / override)
SEMANTIC CHANGE COUNT                      = EXACTLY 2
DAA-014-C                                  = ISSUED / GUARD SEMANTICS UNCHANGED
DIAGNOSTIC OBSERVABILITY                   = MUST REMAIN INTACT
CB-B ARCHITECTURE                          = RETAINED
LAUNCHER / STARTUP                         = UNCHANGED
HMD-009 RECONSTRUCTION                     = UNTOUCHED
HMD-009 HISTORICAL TARGET                  = UNTOUCHED
HMD-008 TARGET                             = UNTOUCHED
HMD-007 TARGET                             = UNTOUCHED
HMD-006 TARGET                             = UNTOUCHED
HMD-005 RECONSTRUCTION / TARGET            = UNTOUCHED
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
PAD-057                                    = ISSUED / IMMUTABLE / OPTION B
E-02-HFSOR-IA-003                          = CONSUMED
E-02 HFSOR IMPLEMENTATION COMPLETION-003   = COMPLETED WITH NOTES
LOCAL-015                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-015 RETRY                            = NOT AUTHORIZED
LOCAL-015 STATEFUL APPLY ATTEMPTS          = 1
LOCAL-015 EVIDENCE RUN                     = local-015-20260829a
LOCAL-016                                  = APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED
LOCAL-016 STATEFUL APPLY ATTEMPTS          = 0
LOCAL-016 BCR COMPATIBILITY                = BLOCKED UNTIL RETARGET IMPLEMENTATION AND SUCCESSOR BCR COMPLETION
BCR RETARGET                               = AUTHORIZED / NOT IMPLEMENTED
ARTIFACT EXECUTION                         = NOT AUTHORIZED BY THIS IA
THIS ISSUANCE                              ≠ IMPLEMENTATION · ≠ LOCAL-016 EXECUTION · ≠ COMPLETION-016
```

---

## 1. Authority / sequence finding (this issuance)

| Check | Result |
|-------|--------|
| A. E-02-BCR-IA-015 exists | **YES** |
| B. E-02-BCR-IA-015 CONSUMED | **YES** (Completion-015 operational ledger) |
| C. Completion-015 COMPLETED WITH NOTES | **YES** — [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-015.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-015.md) |
| D. E-02-DBA-LOCAL-016 exists | **YES** |
| E. LOCAL-016 status | **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED** |
| F. LOCAL-016 attempts | **0** (no LOCAL-016 evidence file) |
| G. LOCAL-016 requires successor BCR retarget | **YES** |
| H. Current operational artifact pin / authority | `EXPECTED_DBA_AUTHORIZATION_ID = 'E-02-DBA-LOCAL-015'` · `ARTIFACT_AUTHORIZATION_ID = 'E-02-BCR-IA-015'` |
| I. Runtime env | `E02_DBA_AUTHORIZATION_ID` (**UNCHANGED**) |
| J. Exact-match fail-closed present | **YES** (`raw !== EXPECTED_DBA_AUTHORIZATION_ID` → STOP) |
| K. Dual-accept mechanism | **NONE** |
| L. LOCAL-015 operationally accepted now | **YES** (current pin; must become **NO** after future retarget) |
| M. LOCAL-016 already accepted | **NO** (no alias / array / fallback accepting LOCAL-016) |
| N. E-02-BCR-IA-016 already exists | **NO** (before this issuance) |
| O. Later BCR IA already issued | **NO** (no **017+**) |
| P. Next unused successor | **016** |
| Q. Family / path | BCR Implementation Authorization family · `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-016.md` |
| R. PAD-057 / HFSOR-IA-003 / Completion-003 | **ISSUED / CONSUMED / COMPLETED WITH NOTES** |
| S. Quarantine exactly one | **YES** — `20260314195641_add_demo_data.sql` · allowlist length **1** |
| T. LOCAL-015 terminal | **APPLICATION_FAILED / EVIDENCE IMMUTABLE / attempts 1 / NO RETRY** · `local-015-20260829a` |
| U. Successor DBA eligibility → LOCAL-016 issuance | **YES** — LOCAL-016 later issued / gated / not executed |

```
AUTHORITY PATH     = PASS
BCR IA FAMILY      = E-02 Baseline Compatibility Replay Implementation Authorization
CURRENT IA         = E-02-BCR-IA-015
NEXT IA            = E-02-BCR-IA-016
DOCUMENT PATH      = docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-016.md
```

**No STOP.** Issuance may proceed.

---

## 2. BCR worktree finding (this issuance, read-only)

`scripts/verification/e02/replay-e02-declared-baseline.ts` is **dirty vs HEAD**.

| Check | Result |
|-------|--------|
| `git diff --numstat` | **2 / 2** |
| Diff content | **exactly two** constant replacements (authorized prior lineage) |
| Current operational pins | `ARTIFACT_AUTHORIZATION_ID` **`E-02-BCR-IA-015`** · `EXPECTED_DBA_AUTHORIZATION_ID` **`E-02-DBA-LOCAL-015`** |
| Extra hunk | **NONE** (this issuance does not implement) |

Classification:

```
A. Pre-existing authorized BCR lineage
   = YES
     IA-012 certified LOCAL-011/IA-011 → LOCAL-012/IA-012
     IA-013 certified LOCAL-012/IA-012 → LOCAL-013/IA-013
     IA-014 certified LOCAL-013/IA-013 → LOCAL-014/IA-014
     IA-015 certified LOCAL-014/IA-014 → LOCAL-015/IA-015
     combined HEAD-relative worktree now LOCAL-011/IA-011 → LOCAL-015/IA-015
B. New IA-016 attributable retarget
   = NONE (this issuance does not implement)
C. New unauthorized BCR drift
   = NONE
```

Operational current pins are the **worktree** constants (`LOCAL-015` / `IA-015`). Historical header comments naming older IDs are **not** operational acceptance.

Unexplained semantic drift = **NONE**. Gate **PASS**. Globally clean git is **not** required.

**This issuance task itself MUST NOT modify the artifact.**

---

## 3. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Database-Application-Authorization-LOCAL-016.md`](E-02-Database-Application-Authorization-LOCAL-016.md) | Direct DBA — **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED** · attempts **0** · NEXT = successor BCR retarget |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-015.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-015.md) | Predecessor **E-02-BCR-IA-015 CONSUMED / HISTORICAL / IMMUTABLE** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-015.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-015.md) | IA-015 repository completion — **COMPLETED WITH NOTES** · **not reopened** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-015.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-015.md) | LOCAL-015 **APPLICATION_FAILED** at `20260405120000` (`relation "public.hiring_jobs" does not exist`) · run `local-015-20260829a` · executed **72** · **immutable** |
| [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-003.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-003.md) | HMD-009 repository reconstruction **COMPLETED WITH NOTES** |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md) | **PAD-057 ISSUED / IMMUTABLE** · OPTION B |
| [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) | DAA-014-C **ISSUED** · named technical guard inputs · **not implemented by this IA** |
| Artifact (read-only, this issuance) | `scripts/verification/e02/replay-e02-declared-baseline.ts` |

No new Program Authority Decision required. No Clean-Base Design Amendment required. No new BCR-CB defect required. No reconstruction SQL change. No restoration SQL change. No guard change.

---

## 4. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-BCR-IA-016** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Status at issuance** | **APPROVED WITH CONDITIONS / NOT YET CONSUMED** |
| **Authorized action** | One future repository retarget of the replay artifact expected DBA ID + coupled truthful IA metadata |
| **Authorized transformation (1)** | `EXPECTED_DBA_AUTHORIZATION_ID`: `E-02-DBA-LOCAL-015` → `E-02-DBA-LOCAL-016` |
| **Authorized transformation (2)** | `ARTIFACT_AUTHORIZATION_ID`: `E-02-BCR-IA-015` → `E-02-BCR-IA-016` |
| **Expected semantic change count** | **EXACTLY 2** |
| **Exact-match model** | **RETAINED** |
| **Dual acceptance** | **NONE / FORBIDDEN** |
| **Implementation this task** | **NOT PERFORMED** |
| **LOCAL-016 execution** | **NOT AUTHORIZED by this IA** (remains blocked until retarget implementation + successor BCR Completion) |

---

## 5. Purpose

Align the artifact’s **stale execution-authority pin** with the **already issued** successor DBA:

```
CURRENT   EXPECTED_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-015
REQUIRED  E02_DBA_AUTHORIZATION_ID      = E-02-DBA-LOCAL-016   (LOCAL-016)
AUTHORIZED RETARGET                     = E-02-DBA-LOCAL-016

CURRENT   ARTIFACT_AUTHORIZATION_ID     = E-02-BCR-IA-015
AUTHORIZED ARTIFACT AUTHORITY           = E-02-BCR-IA-016
```

This is **AUTHORIZATION-ID RETARGET ONLY**.

**Not:** CB-B redesign · replay redesign · migration change · HMD-009 reconstruction edit · HMD-009 target edit · HMD-008 target edit · HMD-007 target edit · HMD-006 target edit · HMD-005 reconstruction/target edit · W1/W2 edit · HMD-002/HMD-004 edit · quarantine change · history-policy change · launcher redesign · preserve/cleanup redesign · verifier redesign · environment-guard redesign · diagnostic redesign · DAA-014-C implementation · HMD status change · database execution · LOCAL-016 execution · LOCAL-015 retry · LOCAL-017.

---

## 6. Why this change is authority-safe

LOCAL-016 is already formally issued as **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED** · attempts **0**.

Retargeting the artifact to LOCAL-016 **does not fabricate authority**. It aligns the artifact with the current formally issued DBA. The change **must not create authority independently**.

```
No LOCAL-016  →  no retarget would have been permitted
```

LOCAL-015 remains a **historical failed** DBA. This retarget is **prospective compatibility work for LOCAL-016 only**. It is **not** a retroactive repair of LOCAL-015. After future implementation, LOCAL-015 **must not** remain an operationally accepted DBA authority. Historical evidence and governance history may still name LOCAL-015.

Do **not** grant BCR compatibility with LOCAL-015 as an alternate runtime authority.

---

## 7. Exact authorized source scope (future implementation)

**May modify exactly one source file:**

```
scripts/verification/e02/replay-e02-declared-baseline.ts
```

Plus minimal `docs/implementation/README.md` ledger update.

Repository inspection confirms these two operational pins exist **only** in that principal artifact. `verify-db-baseline.ts` and `environment-guard.ts` do **not** hold DBA/IA authority pins.

| Allowed | Not allowed |
|---------|-------------|
| `EXPECTED_DBA_AUTHORIZATION_ID` value `E-02-DBA-LOCAL-015` → `E-02-DBA-LOCAL-016` | Dual-accept LOCAL-015 **or** LOCAL-016 |
| Comments / help strings that currently hardcode the stale expected DBA ID or stale IA ID, updated to match the new constants | Prefix / regex / `startsWith` / arrays of accepted IDs / env-provided expected ID / operator override / compatibility aliases |
| `ARTIFACT_AUTHORIZATION_ID` `E-02-BCR-IA-015` → `E-02-BCR-IA-016` so static IA metadata remains **truthful** | Weakening or disabling exact-match / `ReplayStop` validation |
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
artifact expected DBA            = E-02-DBA-LOCAL-016
runtime E02_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-016
artifact authority               = E-02-BCR-IA-016
LOCAL-015 CURRENT ACCEPTANCE     = NO
LOCAL-016 CURRENT ACCEPTANCE     = YES, exact only
BCR-IA-015 CURRENT AUTHORITY     = NO
BCR-IA-016 CURRENT AUTHORITY     = YES, exact only
```

No acceptance of LOCAL-015 · LOCAL-014 · LOCAL-013 · empty value · multiple values · legacy fallback · OR condition · prefix match · wildcard. Dual artifact authority **FORBIDDEN**. Historical comments / governance documents are not operational acceptance. Do **not** edit historical comments merely to make grep empty.

**This issuance task itself MUST NOT modify the artifact.**

---

## 8. Exact-match security model (locked)

**Do not authorize:**

- accepting arbitrary DBA IDs
- prefix / suffix / regex / `startsWith` / substring
- arrays of accepted DBA IDs
- LOCAL-015 **OR** LOCAL-016 dual acceptance
- fallback to LOCAL-015 / LOCAL-014 / LOCAL-013
- environment-provided expected IDs
- operator override of expected ID
- compatibility aliases / mode
- bypassing exact match
- disabling / weakening `ReplayStop`
- warning-only mismatch
- default acceptance

Required semantics after future implementation:

```
runtime DBA ID === E-02-DBA-LOCAL-016
Anything else → STOP
```

```
EXACT-MATCH MODEL = RETAINED / REQUIRED
DUAL ACCEPTANCE   = FORBIDDEN
```

---

## 9. Runtime env contract (future; not this task)

Do **not** rename `E02_DBA_AUTHORIZATION_ID`. This IA changes **only** the expected DBA **value**.

After successful BCR implementation **and** successor BCR Completion, future governed LOCAL-016 apply must use:

```
E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-016
E02_BCR_APPLY_AUTHORIZED=true
E02_ALLOW_DESTRUCTIVE_TESTS=true
E02_EVIDENCE_ENV=local
E02_RUNTIME_EXECUTION_AUTHORIZED=UNSET / FALSE
```

**This IA does NOT set or execute these values.** No RU-1.4 authority is implied. `E02_ALLOW_DESTRUCTIVE_TESTS=true` remains the technical disposable-db gate only. It does **not** authorize RU-1.4 · runtime RPC · destructive fixtures · EIR · unrelated runtime actions.

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

LOCAL-016 already owns Docker warm-engine and TCP **54323 FREE** gates. This IA does **not** implement those gates. Preserve/handoff and baseline-verifier rules remain governed by LOCAL-016 DBA. This IA does **not** alter them.

---

## 13. Verifier lock

Do **not** authorize edits to `verify-db-baseline.ts`. This retarget is **not** a baseline verifier redesign.

---

## 14. Migration-zero-edit lock

This BCR IA authorizes **ZERO** migration changes.

Do **not** modify: HMD-009 reconstruction · HMD-009 historical target · HMD-008 target · HMD-007 target · HMD-006 target · HMD-005 reconstruction · HMD-005 target · HMD-002 migration · W1 · HMD-004 target · W2 · April HARD · governed July S1 · quarantine migration.

```
MIGRATION EDIT COUNT AUTHORIZED = 0
```

HMD-009 reconstruction and target remain **executable** (not quarantined). Historical reconstruction/restoration state is already governed separately.

---

## 15. HMD-009 / Completion-003

| Item | Status |
|------|--------|
| PAD-057 | **ISSUED / IMMUTABLE** · OPTION B |
| E-02-HFSOR-IA-003 | **CONSUMED** |
| E-02-HFSOR-IMPLEMENTATION-COMPLETION-003 | **COMPLETED WITH NOTES** |
| HMD-009 | **OPEN / DISTINCT / ORIGINAL HISTORICAL CLEAN-REPLAY DESIGN DEFECT / ORIGINAL CLEAN-REPLAY MISSING PREREQUISITE AFTER INTENTIONAL EARLIER DROP / OPTION B SELECTED / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |
| Reconstruction | `20260405115900_hmd009_reconstruct_hiring_jobs.sql` · **DO NOT EDIT** |
| Historical target | `20260405120000_multi_tenant_properties.sql` · **DO NOT EDIT** |
| Prior error | `relation "public.hiring_jobs" does not exist` |
| Ordering | after `20260404120000_create_leads.sql` / immediately before target |
| Timestamp collision | **NONE** |

No HMD-009 migration edit under BCR authority. Completion-003 is **not** runtime proof.

Future LOCAL-016 runtime must prove:

```
RECONSTRUCTION 20260405115900_hmd009_reconstruct_hiring_jobs.sql
  = REACHED / APPLIED
TARGET 20260405120000_multi_tenant_properties.sql
  = REACHED / APPLIED
prior error (relation "public.hiring_jobs" does not exist)
  = NOT REPRODUCED
```

If that evidence exists, HMD-009 **may** advance to **RUNTIME REPLAY VERIFIED** and **must not** automatically be marked **CLOSED**. This BCR IA **does not** establish that evidence.

---

## 16. HMD-008 / HMD-007 / HMD-006 / HMD-005 preserved runtime proof

```
HMD-008 =
  OPEN /
  SOURCE INTEGRITY RESTORED /
  IMPLEMENTATION COMPLETED /
  RUNTIME REPLAY VERIFIED

HMD-007 =
  OPEN /
  SOURCE INTEGRITY RESTORED /
  IMPLEMENTATION COMPLETED /
  RUNTIME REPLAY VERIFIED

HMD-006 =
  OPEN /
  SOURCE INTEGRITY RESTORED /
  IMPLEMENTATION COMPLETED /
  RUNTIME REPLAY VERIFIED

HMD-005 =
  OPEN /
  RECONSTRUCTION IMPLEMENTED /
  IMPLEMENTATION COMPLETED /
  RUNTIME REPLAY VERIFIED
```

Do **not** close. Do **not** reopen. Do **not** edit those files. A later migration failure must **not** reopen them solely because it occurs after them.

---

## 17. HMD-003 pending runtime checkpoints

| Checkpoint | Filename | Current runtime (LOCAL-015) | Future LOCAL-016 objective |
|------------|----------|-----------------------------|----------------------------|
| W2 | `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` | **NOT REACHED / NOT APPLIED** | **REACHED / APPLIED** if no earlier failure |
| April HARD | `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | **NOT REACHED / NOT APPLIED** | **REACHED / APPLIED** if no earlier failure |
| Governed July S1 | `20260711120000_invoice_ai_audit_v1.sql` | **NOT REACHED / NOT APPLIED** | **REACHED / APPLIED** if no earlier failure |

Do **not** modify those files. Do **not** mark HMD-003 runtime verified. Do **not** infer runtime verification from plan discovery.

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
| HMD-006 | **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — do not close |
| HMD-007 | **OPEN / DISTINCT / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — do not close |
| HMD-008 | **OPEN / DISTINCT / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — do not close |
| HMD-009 | **OPEN / OPTION B / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |

IA-016 issuance **does not** resolve any HMD.

---

## 19. Quarantine lock

Exactly:

```
20260314195641_add_demo_data.sql
COUNT = 1
```

Do **not** quarantine: HMD-009 reconstruction · HMD-009 target · HMD-008 target · HMD-007 target · HMD-006 target · HMD-005 reconstruction · HMD-005 target · HMD-002 · W1 · HMD-004 · W2 · April HARD · July S1. No quarantine change.

---

## 20. Migration count model

Current certified DB-free plan reference from HMD-009 Completion-003: discovered **287** · planned executable **286** · quarantineCount **1**.

The future BCR retarget changes **no** migration files. The expected structural migration set therefore remains unchanged. **Do not** encode 287 / 286 as a permanent invariant. Future implementation **must** report actual fresh `--plan` values.

---

## 21. Future implementation pre-gates

Before editing the BCR, future implementation **must** verify:

| Gate | Required |
|------|----------|
| A | LOCAL-016 remains **APPROVED WITH CONDITIONS / NOT CONSUMED / NOT EXECUTED / attempts 0** |
| B | LOCAL-015 remains **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE / NO RETRY** · attempts **1** |
| C | Current operational BCR pins remain exactly **LOCAL-015 / BCR-IA-015** |
| D | E-02-BCR-IA-016 issued and **APPROVED WITH CONDITIONS / NOT YET CONSUMED** |
| E | No superseding BCR authority exists |
| F | No unexplained executable drift beyond the certified HEAD-relative 2/2 pin lineage (`LOCAL-011/IA-011` → operational `LOCAL-015/IA-015`) |
| G | Quarantine remains count **1** |
| H | HMD-009 Completion-003 remains valid · reconstruction and target unedited by this IA |

Material mismatch → **IMPLEMENTATION = BLOCKED** · **IA = NOT CONSUMED** · **STOP → GOVERNANCE**. No file edit.

---

## 22. Future implementation delta lock

Future implementation must prove semantic delta **exactly**:

```
OLD DBA PIN              = E-02-DBA-LOCAL-015
NEW DBA PIN              = E-02-DBA-LOCAL-016
OLD ARTIFACT AUTHORITY   = E-02-BCR-IA-015
NEW ARTIFACT AUTHORITY   = E-02-BCR-IA-016
AUTHORIZED SEMANTIC CHANGES = EXACTLY 2
ACTUAL ATTRIBUTABLE SEMANTIC CHANGES = 2
```

They must be only:

```
LOCAL-015 → LOCAL-016
IA-015    → IA-016
```

Capture `git diff` and `git diff --numstat`. Distinguish pre-existing authorized uncommitted BCR lineage from the new IA-016 attributable retarget. No third semantic change. If extra semantic changes appear: **IA NOT CONSUMED** · **STOP → GOVERNANCE**.

Old operational values must be absent from acceptance logic. Historical/governance documentation may still contain old IDs; that is **not** operational acceptance.

The certified IA-015 operational worktree (`LOCAL-015` / `IA-015`) remains the **starting operational state**. Future implementation must retarget **from that operational state**, not from HEAD.

---

## 23. Future static validation

Authorize: static source inspection · `git diff` / numstat / status · BCR `--plan` · `npm run build`.

Require:

```
PLAN     = PLAN_OK
failures = []
BUILD    = PASS
```

No DB. No Docker mutation. No `--apply`.

Future `--plan` authority report must show:

| Field | Required |
|-------|----------|
| `result` | `PLAN_OK` |
| `expectedDbaAuthorizationId` | `E-02-DBA-LOCAL-016` |
| `artifactAuthorizationId` | `E-02-BCR-IA-016` |
| `quarantineCount` | **1** |
| quarantined | `20260314195641_add_demo_data.sql` |

And must discover/executable at minimum:

| File | Required |
|------|----------|
| `20260329102500_hmd005_reconstruct_user_role_admin.sql` | **DISCOVERED / EXECUTABLE** |
| `20260329103000_add_admin_user_role_and_policy.sql` | **DISCOVERED / EXECUTABLE** |
| `20260331180000_announcements_created_by_inbox_fanout.sql` | **DISCOVERED / EXECUTABLE / NOT QUARANTINED** |
| `20260401140000_notifications_trigger_service_role_insert.sql` | **DISCOVERED / EXECUTABLE / NOT QUARANTINED** |
| `20260405115900_hmd009_reconstruct_hiring_jobs.sql` | **DISCOVERED / EXECUTABLE / NOT QUARANTINED** |
| `20260405120000_multi_tenant_properties.sql` | **DISCOVERED / EXECUTABLE / NOT QUARANTINED** |
| `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` | **DISCOVERED / EXECUTABLE** |
| `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | **DISCOVERED / EXECUTABLE** |
| `20260711120000_invoice_ai_audit_v1.sql` | **DISCOVERED / EXECUTABLE** |
| `20260314195641_add_demo_data.sql` | **DISCOVERED / QUARANTINED** |

Reconstruction must remain immediately before the HMD-009 target. Capture actual `migrationCountDiscovered` · planned executable count · `quarantineCount`. Do **not** treat 287/286/1 as permanent invariants.

---

## 24. Future zero-runtime lock

BCR retarget implementation itself **must** have:

```
DATABASE                = NONE
STATEFUL SUPABASE       = NONE
DOCKER MUTATION         = NONE
--apply                 = NONE
LOCAL-016 EXECUTION     = NONE
LOCAL-016 ATTEMPTS      = 0
LOCAL-015 RETRY         = NONE
LOCAL-017               = NOT ISSUED
```

This IA issuance **does not** increment LOCAL-016 attempts. Only a future stateful `--apply` start increments `0 → 1`.

Before `--apply`: gate failure → **BLOCKED** / attempts **0**. Once `--apply` starts: attempts → **1** irreversibly. No retry.

---

## 25. Future failure taxonomy lock

Preserve LOCAL-016 DBA-defined taxonomy:

| Result | Meaning |
|--------|---------|
| **APPLIED_AND_BASELINE_VERIFIED** | one authorized apply succeeds; every executable migration succeeds; preserve/handoff succeeds; baseline verifier passes → DBA **CONSUMED** · attempts **1** · `DATABASE BASELINE VERIFIED = YES` · still **does not** authorize RU-1.4 |
| **APPLICATION_FAILED** | post-apply migration or preserve failure → DBA **NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** · attempts **1** · retry **NOT AUTHORIZED** · baseline verifier **NOT RUN** · **STOP → GOVERNANCE** |
| **APPLIED_BASELINE_FAILED** | all migrations + preserve succeed; baseline verifier fails → DBA **NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** · attempts **1** · `DATABASE BASELINE VERIFIED = NO` · retry **NOT AUTHORIZED** · **STOP → GOVERNANCE** |
| **BLOCKED** | pre-stateful gate failure · attempts remain **0** · DBA not consumed / not executed |
| **NOT_RUN** | authorization exists but apply never started |

This IA **does not** execute any of those paths.

---

## 26. IA consumption rule

**E-02-BCR-IA-016** may become **CONSUMED** only if future implementation successfully establishes:

1. pre-state pins exactly matched (`LOCAL-015` / `IA-015`);
2. LOCAL-016 remains attempts **0** / not executed;
3. exactly the two authorized BCR semantic changes are implemented;
4. resulting DBA pin = `E-02-DBA-LOCAL-016`;
5. resulting artifact authority = `E-02-BCR-IA-016`;
6. LOCAL-016 is the sole operational DBA acceptance;
7. E-02-BCR-IA-016 is the sole operational artifact authority;
8. exact-match retained;
9. no dual acceptance;
10. LOCAL-015 operational acceptance removed;
11. IA-015 operational artifact authority removed;
12. BCR otherwise semantically unchanged;
13. migrations unchanged (HMD-009 reconstruction and target preserved);
14. verifier / guard / diagnostics / launcher / package / tests / app unchanged;
15. quarantine remains count **1**;
16. fresh `--plan` = `PLAN_OK` · failures `[]`;
17. build = **PASS**;
18. no runtime · no `--apply` · no database.

Otherwise:

```
IA = NOT CONSUMED
BCR IMPLEMENTATION = NOT CERTIFIED
STOP → GOVERNANCE
```

---

## 27. Successor BCR Completion (reserved; not this task)

Even after future retarget succeeds and this IA is consumed:

```
BCR =
  RETARGETED TO LOCAL-016 /
  IMPLEMENTATION COMPLETION PENDING
```

A separate Completion is required after implementation **before** LOCAL-016 runtime.

Reserve, **do not create**:

```
docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Completion-016.md
```

Expected Completion ID (verify sequence at that later issuance): **E-02-BCR-IMPLEMENTATION-COMPLETION-016**. Highest issued BCR Completion in this numbered family is **015**. **016 is the next unused identifier** if still unused then. **Do not allocate or issue it here.**

Do **NOT** issue Completion in this IA task. Do **NOT** issue Completion automatically during retarget implementation.

After BCR implementation:

```
LOCAL-016 remains EXECUTION GATED
until successor BCR Completion is issued
```

Issuing IA-016 alone does **NOT** make LOCAL-016 executable.

Expected sequence:

```
E-02-BCR-IA-016
  → IMPLEMENT TWO-CONSTANT RETARGET
  → STATIC VERIFY
  → FRESH DB-FREE --plan
  → npm run build
  → ISSUE COMPLETION-016 (separate later task)
  → ONLY THEN LOCAL-016 MAY BECOME PRE-STATEFUL ELIGIBLE
  → RUNTIME GATES
  → SINGLE GOVERNED APPLY
```

---

## 28. LOCAL-015 / LOCAL-016 / LOCAL-017 locks

```
LOCAL-015 =
  APPLICATION_FAILED /
  NOT SUCCESSFULLY CONSUMED /
  EVIDENCE IMMUTABLE
LOCAL-015 ATTEMPTS = 1
LOCAL-015 RETRY    = NOT AUTHORIZED
LOCAL-015 EVIDENCE = local-015-20260829a
LOCAL-015 FIRST FAILING = 20260405120000_multi_tenant_properties.sql
LOCAL-015 EXECUTABLE INDEX = 73
LOCAL-015 HIGHEST APPLIED = 20260404120000_create_leads.sql
LOCAL-015 EXECUTED = 72
LOCAL-015 FAILURE TEXT = relation "public.hiring_jobs" does not exist
LOCAL-015 PRESERVE/HANDOFF = NOT REACHED
LOCAL-015 BASELINE VERIFIER = NOT RUN

LOCAL-016 =
  APPROVED WITH CONDITIONS /
  NOT CONSUMED /
  NOT EXECUTED /
  EXECUTION GATED
LOCAL-016 STATEFUL APPLY ATTEMPTS = 0
FUTURE MAXIMUM STATEFUL APPLY     = EXACTLY 1

LOCAL-017 =
  NOT AUTHORIZED /
  NOT ISSUED
```

Issuing **E-02-BCR-IA-016 does NOT itself unblock LOCAL-016 execution.**

After this IA issuance:

```
LOCAL-016 BCR COMPATIBILITY =
  STILL BLOCKED UNTIL
  IA-016 RETARGET IMPLEMENTATION
  +
  SUCCESSOR BCR COMPLETION

BCR RETARGET =
  AUTHORIZED /
  NOT IMPLEMENTED

CURRENT BCR =
  STILL E-02-DBA-LOCAL-015 /
  E-02-BCR-IA-015
```

LOCAL-015 must **never** regain operational BCR execution authority after successor retarget.

If a future apply starts: attempts = **1**. If it fails: evidence immutable · no retry · no automatic LOCAL-017 · **STOP → GOVERNANCE**.

Do **not** retry LOCAL-015 · reclassify LOCAL-015 · overwrite LOCAL-015 evidence · dual-accept LOCAL-015 · treat retarget as retroactive repair of LOCAL-015.

No LOCAL-016 `--apply` in this task.

---

## 29. Database / runtime lock (unchanged)

| Item | Status |
|------|--------|
| Database baseline | **NOT VERIFIED** |
| Preserve/handoff | **NOT REACHED** (LOCAL-015 failed before preserve) |
| Baseline verifier | **NOT RUN** |
| RU-1.1 | **REPOSITORY IMPLEMENTED / DB NOT APPLIED** |
| RU-1.2 | **REPOSITORY IMPLEMENTED / DB NOT APPLIED / RUNTIME NOT VERIFIED** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **UNSET / FALSE / PROHIBITED** |
| EIR | **NONE** |
| Historical E-02 Acceptance Report | **ISSUED** |
| Current runtime path | **NOT ACCEPTANCE-ADVANCED** |
| Phase 5 Certification | **ISSUED — SCOPED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Final COMMIT path | **BLOCKED** |

Nothing in IA-016 changes those statuses. Do **not** set runtime eligibility merely because this IA is issued.

---

## 30. Next action (this issuance)

```
NEXT = SUCCESSOR BCR RETARGET IMPLEMENTATION
```

That later task must:

- verify current operational pins remain LOCAL-015 / IA-015;
- implement exactly two semantic pin changes;
- retain exact-match;
- prohibit dual acceptance;
- run DB-free `--plan` and `npm run build`;
- **not** issue Completion-016 in the same task unless separately authorized;
- **not** execute LOCAL-016;
- **not** retry LOCAL-015.

**Not implemented in this issuance.**

---

## 31. Confirmation of no executable work

**No** BCR artifact edit · **no** retarget implementation · **no** migration edit · **no** HMD reconstruction/restoration edit · **no** verifier / guard / diagnostics / launcher / package / test / app edit · **no** `--apply` · **no** `--plan` as this issuance’s execution · **no** database · **no** Supabase · **no** Docker · **no** LOCAL-015 retry · **no** LOCAL-016 execution · **no** LOCAL-017 · **no** BCR Completion-016 · **no** RU-1.1 / RU-1.2 / RU-1.4 · **no** EIR / Acceptance / Certification change · **no** commit.

Only this record and [`README.md`](README.md) are written.

---

## 32. Lock statement

```
E-02-BCR-IA-016                            = APPROVED WITH CONDITIONS /
                                             NOT YET CONSUMED
AUTHORIZED ACTION                          = AUTHORIZATION-ID RETARGET ONLY
AUTHORIZED SEMANTIC CHANGES                = EXACTLY 2
CURRENT ARTIFACT DBA PIN                   = E-02-DBA-LOCAL-015
AUTHORIZED FUTURE DBA PIN                  = E-02-DBA-LOCAL-016
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-015
AUTHORIZED FUTURE ARTIFACT AUTHORITY       = E-02-BCR-IA-016
EXACT-MATCH                                = RETAINED
DUAL-ACCEPT                                = FORBIDDEN
BCR RETARGET                               = AUTHORIZED / NOT IMPLEMENTED
PAD-057                                    = ISSUED / IMMUTABLE / OPTION B
E-02-HFSOR-IA-003                          = CONSUMED
E-02-HFSOR-IMPLEMENTATION-COMPLETION-003   = COMPLETED WITH NOTES
HMD-009                                    = OPEN / OPTION B /
                                             RECONSTRUCTION IMPLEMENTED /
                                             IMPLEMENTATION COMPLETED /
                                             RUNTIME REPLAY VERIFICATION PENDING
HMD-008                                    = OPEN / RUNTIME REPLAY VERIFIED
HMD-007                                    = OPEN / RUNTIME REPLAY VERIFIED
HMD-006                                    = OPEN / RUNTIME REPLAY VERIFIED
HMD-005                                    = OPEN / RUNTIME REPLAY VERIFIED
HMD-003                                    = OPEN / RUNTIME REPLAY VERIFICATION PENDING
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql /
                                             COUNT 1
LOCAL-015                                  = APPLICATION_FAILED /
                                             NOT SUCCESSFULLY CONSUMED /
                                             EVIDENCE IMMUTABLE
LOCAL-015 ATTEMPTS                         = 1
LOCAL-015 RETRY                            = NOT AUTHORIZED
LOCAL-016                                  = APPROVED WITH CONDITIONS /
                                             NOT CONSUMED /
                                             NOT EXECUTED /
                                             EXECUTION GATED
LOCAL-016 ATTEMPTS                         = 0
AUTHORIZED FUTURE APPLY                    = EXACTLY 1
LOCAL-016 RUNTIME                          = NOT YET AUTHORIZED TO START
LOCAL-017                                  = NOT AUTHORIZED
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
E02_RUNTIME_EXECUTION_AUTHORIZED           = UNSET / FALSE / PROHIBITED
EIR                                        = NONE
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = SUCCESSOR BCR RETARGET IMPLEMENTATION
EXECUTABLE WORK                            = NONE
```

---

**End of document — E-02-BCR-IA-016 — v1.0 — 2026-08-30**
