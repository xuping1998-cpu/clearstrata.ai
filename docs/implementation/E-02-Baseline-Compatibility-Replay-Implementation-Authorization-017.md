# E-02 — Baseline Compatibility Replay Artifact — Implementation Authorization (Successor)

## Authorization-ID Retarget Only · E-02-DBA-LOCAL-016 → E-02-DBA-LOCAL-017

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Authorization (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Artifact** | Governed Baseline-Compatibility Replay Artifact (class C) — **DBA authorization-ID retarget only** |
| **Authorization ID** | **E-02-BCR-IA-017** |
| **Predecessors** | **E-02-BCR-IA** · **E-02-BCR-IA-002** · **E-02-BCR-IA-003** · **E-02-BCR-IA-004** · **E-02-BCR-IA-005** · **E-02-BCR-IA-006** · **E-02-BCR-IA-007** · **E-02-BCR-IA-008** · **E-02-BCR-IA-009** · **E-02-BCR-IA-010** · **E-02-BCR-IA-011** · **E-02-BCR-IA-012** · **E-02-BCR-IA-013** · **E-02-BCR-IA-014** · **E-02-BCR-IA-015** · **E-02-BCR-IA-016** — all **CONSUMED / HISTORICAL / IMMUTABLE** |
| **Direct DBA authority aligned** | **E-02-DBA-LOCAL-017** — [`E-02-Database-Application-Authorization-LOCAL-017.md`](E-02-Database-Application-Authorization-LOCAL-017.md) (**APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED** · attempts **0**) |
| **Guard clarification (read-only)** | [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) (**DAA-014-C** · **ISSUED** · **EG-B**) |
| **Correction authority (HMD-010, read-only)** | **PAD-058 ISSUED / IMMUTABLE / OPTION C** · **PAD-059 ISSUED / IMMUTABLE / HOSCC FAMILY** · **E-02-HOSCC-IA CONSUMED** · Completion [`E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Completion.md`](E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Completion.md) (**E-02-HOSCC-IMPLEMENTATION-COMPLETION** · **COMPLETED WITH NOTES**) |
| **Reconstruction authority (HMD-009, read-only)** | **PAD-057 ISSUED / IMMUTABLE** · **E-02-HFSOR-IA-003 CONSUMED** · Completion-003 **COMPLETED WITH NOTES** · LOCAL-016 reconstruction **REACHED / APPLIED** · target **REACHED / NOT APPLIED** · **RUNTIME REPLAY VERIFICATION PENDING** |
| **Restoration authority (HMD-008 / 007 / 006, read-only)** | PAD-056 / PAD-055 / PAD-054 · respective HMIR IAs **CONSUMED** · Completions **COMPLETED WITH NOTES** · **RUNTIME REPLAY VERIFIED** |
| **Reconstruction authority (HMD-005 / HMD-003, read-only)** | PAD-053 / PAD-051 · HFSOR IAs **CONSUMED** · HMD-005 **RUNTIME REPLAY VERIFIED** · HMD-003 W2 / April HARD / July S1 **NOT REACHED** (latest LOCAL-016 evidence) |
| **Status** | **Approved With Conditions — NOT YET CONSUMED** |
| **Authority Level** | Implementation Authorization (repository implementation only) |
| **Effective Date** | 2026-08-30 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-017.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-017.md) |
| **Production Effect** | **None** |

> **Authority path finding: YES.** `E-02-Baseline-Compatibility-Replay-Implementation-Authorization-017.md` is **authority-safe** as the next **successor Implementation Authorization** in the existing BCR IA family (`…-Implementation-Authorization.md` → `-002` … `-016` → **`-017`**). ID **`E-02-BCR-IA-017`** parallels that series and aligns with successor DBA **E-02-DBA-LOCAL-017**. Highest previously allocated successor is **E-02-BCR-IA-016** (**CONSUMED** · Completion-016 **COMPLETED WITH NOTES**). No BCR IA numbered **017** existed before this issuance. BCR-IA-017 was **not reserved**. BCR-IA-017 has **not previously been issued or consumed**. No **018+** exists or supersedes the sequence. Distinct filename keeps predecessors **immutable**. **Not a new governance tier.** **Not a PAD.** **Not PAD-060.** **Not a DBA.** **Not LOCAL-018.** **Not a HMIR IA.** **Not an HOSCC IA.** **Not a reconstruction IA.** **Not a Clean-Base Design Amendment.** **Not a Guard Implementation Authorization.** **Not a new diagnostic runtime class.** **Not a new BCR-CB architecture.** **Not a new defect by itself.** **Not a quarantine amendment.** **Not a restoration/reconstruction/SQL-correction reopening.** **Not a RU-1.4 REA.** **Not an EIR.** **Not BCR Completion-017.** **Not LOCAL-017 execution.** **Not LOCAL-016 retry.**

> **Document class:** Bounded successor **Implementation Authorization** for **one future narrow repository retarget** of the replay artifact’s expected DBA authorization ID (and directly coupled truthful IA metadata). This issuance **does not implement** the retarget · **does not** modify the artifact · **does not** execute LOCAL-017 · **does not** retry LOCAL-016 · **does not** run DB / Supabase / Docker · **does not** run BCR `--plan` · **does not** edit the HMD-010 target · **does not** edit the HMD-009 reconstruction · **does not** change quarantine · **does not** modify the environment guard · **does not** re-implement diagnostic observability · **does not** issue Completion-017.

```
SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION = E-02-BCR-IA-017
DECISION                                   = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PREDECESSORS (E-02-BCR-IA / -002 … -016)
                                           = CONSUMED / HISTORICAL / IMMUTABLE
AUTHORIZED ACTION                          = AUTHORIZATION-ID RETARGET ONLY
CURRENT ARTIFACT PIN                       = E-02-DBA-LOCAL-016
AUTHORIZED ARTIFACT PIN                    = E-02-DBA-LOCAL-017
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-016
AUTHORIZED ARTIFACT AUTHORITY              = E-02-BCR-IA-017
RUNTIME DBA ENV                            = E02_DBA_AUTHORIZATION_ID (UNCHANGED)
EXACT-MATCH MODEL                          = RETAINED (no dual-accept / prefix / regex / override)
SEMANTIC CHANGE COUNT                      = EXACTLY 2
DAA-014-C                                  = ISSUED / GUARD SEMANTICS UNCHANGED
DIAGNOSTIC OBSERVABILITY                   = MUST REMAIN INTACT
CB-B ARCHITECTURE                          = RETAINED
LAUNCHER / STARTUP                         = UNCHANGED
HMD-010 TARGET                             = UNTOUCHED
HMD-009 RECONSTRUCTION                     = UNTOUCHED
HMD-008 / 007 / 006 TARGETS                = UNTOUCHED
HMD-005 RECONSTRUCTION / TARGET            = UNTOUCHED
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
PAD-058                                    = ISSUED / IMMUTABLE / OPTION C
PAD-059                                    = ISSUED / IMMUTABLE / HOSCC FAMILY
E-02-HOSCC-IA                              = CONSUMED
E-02-HOSCC-IMPLEMENTATION-COMPLETION       = COMPLETED WITH NOTES
LOCAL-016                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-016 RETRY                            = NOT AUTHORIZED
LOCAL-016 STATEFUL APPLY ATTEMPTS          = 1
LOCAL-016 EVIDENCE RUN                     = local-016-20260830a
LOCAL-017                                  = APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED
LOCAL-017 STATEFUL APPLY ATTEMPTS          = 0
LOCAL-017 BCR COMPATIBILITY                = BLOCKED UNTIL RETARGET IMPLEMENTATION AND SUCCESSOR BCR COMPLETION
BCR RETARGET                               = AUTHORIZED / NOT IMPLEMENTED
ARTIFACT EXECUTION                         = NOT AUTHORIZED BY THIS IA
THIS ISSUANCE                              ≠ IMPLEMENTATION · ≠ LOCAL-017 EXECUTION · ≠ COMPLETION-017
```

---

## 1. Authority / sequence finding (this issuance)

| Check | Result |
|-------|--------|
| A. E-02-BCR-IA-016 exists | **YES** |
| B. E-02-BCR-IA-016 CONSUMED | **YES** (Completion-016 operational ledger) |
| C. Completion-016 COMPLETED WITH NOTES | **YES** — [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-016.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-016.md) |
| D. E-02-DBA-LOCAL-017 exists | **YES** |
| E. LOCAL-017 status | **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED** |
| F. LOCAL-017 attempts | **0** (no LOCAL-017 evidence file; no `--apply`) |
| G. LOCAL-017 requires successor BCR retarget | **YES** |
| H. Current operational artifact pin / authority | `EXPECTED_DBA_AUTHORIZATION_ID = 'E-02-DBA-LOCAL-016'` · `ARTIFACT_AUTHORIZATION_ID = 'E-02-BCR-IA-016'` (L50 / L55 of artifact) |
| I. Runtime env | `E02_DBA_AUTHORIZATION_ID` (**UNCHANGED**) |
| J. Exact-match fail-closed present | **YES** (`raw !== EXPECTED_DBA_AUTHORIZATION_ID` → STOP · L425) |
| K. Dual-accept mechanism | **NONE** |
| L. LOCAL-016 operationally accepted now | **YES** (current pin; must become **NO** after future retarget) |
| M. LOCAL-017 already accepted | **NO** (no alias / array / fallback accepting LOCAL-017) |
| N. E-02-BCR-IA-017 already exists | **NO** (before this issuance) |
| O. Later BCR IA already issued | **NO** (no **018+**) |
| P. Next unused successor | **017** |
| Q. Family / path | BCR Implementation Authorization family · `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-017.md` |
| R. BCR IA numbering vs successor DBA | **ALIGNED** — IA-017 pairs with LOCAL-017 (same pattern as IA-016 / LOCAL-016) |
| S. PAD-058 / PAD-059 / HOSCC-IA / HOSCC Completion | **ISSUED / CONSUMED / COMPLETED WITH NOTES** |
| T. Quarantine exactly one | **YES** — `20260314195641_add_demo_data.sql` · allowlist length **1** |
| U. LOCAL-016 terminal | **APPLICATION_FAILED / EVIDENCE IMMUTABLE / attempts 1 / NO RETRY** · `local-016-20260830a` · first failing `20260405120000` index **74** · executed **73** · preserve **NOT REACHED** · baseline verifier **NOT RUN** |
| V. Successor DBA eligibility → LOCAL-017 issuance | **YES** — LOCAL-017 issued / gated / not executed |

```
AUTHORITY PATH     = PASS
BCR IA FAMILY      = E-02 Baseline Compatibility Replay Implementation Authorization
CURRENT IA         = E-02-BCR-IA-016
NEXT IA            = E-02-BCR-IA-017
DOCUMENT PATH      = docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-017.md
```

**No STOP.** Issuance may proceed.

---

## 2. BCR worktree finding (this issuance, read-only)

`scripts/verification/e02/replay-e02-declared-baseline.ts` is **dirty vs HEAD**.

| Check | Result |
|-------|--------|
| `git diff --numstat` | **2 / 2** |
| Diff content | **exactly two** constant replacements (authorized prior lineage through IA-016) |
| Current operational pins | `ARTIFACT_AUTHORIZATION_ID` **`E-02-BCR-IA-016`** · `EXPECTED_DBA_AUTHORIZATION_ID` **`E-02-DBA-LOCAL-016`** |
| Extra hunk | **NONE** (this issuance does not implement) |

Classification:

```
A. Pre-existing authorized BCR lineage
   = YES
     IA-012 … IA-016 successive retargets
     combined HEAD-relative worktree now LOCAL-011/IA-011 → LOCAL-016/IA-016
B. New IA-017 attributable retarget
   = NONE (this issuance does not implement)
C. New unauthorized BCR drift
   = NONE
```

**HEAD-relative caution:** HEAD-relative BCR numstat **2 / 2** does **not** need to equal the future incremental IA-017 delta. Future implementation must establish pre-task pins, post-task pins, incremental IA-017 attributable changes (**exactly 2**), total HEAD-relative diff, and whether total diff is fully explained by authorized lineage. Success criterion: **UNEXPLAINED BCR SEMANTIC DRIFT = NONE**, not blindly **HEAD DIFF = exactly 2 changes**.

Operational current pins are the **worktree** constants (`LOCAL-016` / `IA-016`). Historical header comments naming older IDs are **not** operational acceptance. Unexplained semantic drift = **NONE**. Gate **PASS**. Globally clean git is **not** required.

**This issuance task itself MUST NOT modify the artifact.**

---

## 3. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Database-Application-Authorization-LOCAL-017.md`](E-02-Database-Application-Authorization-LOCAL-017.md) | Direct DBA — **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED** · attempts **0** · NEXT = successor BCR retarget |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-016.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-016.md) | Predecessor **E-02-BCR-IA-016 CONSUMED / HISTORICAL / IMMUTABLE** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-016.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-016.md) | IA-016 repository completion — **COMPLETED WITH NOTES** · **not reopened** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-016.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-016.md) | LOCAL-016 **APPLICATION_FAILED** at `20260405120000` (`column mv.meeting_id does not exist`) · run `local-016-20260830a` · executed **73** · **immutable** |
| [`E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Completion.md`](E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Completion.md) | HMD-010 Option C repository implementation **COMPLETED WITH NOTES** |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-008.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-008.md) | **PAD-058 ISSUED / IMMUTABLE** · OPTION C |
| [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) | DAA-014-C **ISSUED** · named technical guard inputs · **not implemented by this IA** |
| Artifact (read-only, this issuance) | `scripts/verification/e02/replay-e02-declared-baseline.ts` |

No new Program Authority Decision required. No Clean-Base Design Amendment required. No new BCR-CB defect required. No reconstruction SQL change. No restoration SQL change. No Option C SQL change. No guard change.

---

## 4. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-BCR-IA-017** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Status at issuance** | **APPROVED WITH CONDITIONS / NOT YET CONSUMED** |
| **Authorized action** | One future repository retarget of the replay artifact expected DBA ID + coupled truthful IA metadata |
| **Authorized transformation (1)** | `EXPECTED_DBA_AUTHORIZATION_ID`: `E-02-DBA-LOCAL-016` → `E-02-DBA-LOCAL-017` |
| **Authorized transformation (2)** | `ARTIFACT_AUTHORIZATION_ID`: `E-02-BCR-IA-016` → `E-02-BCR-IA-017` |
| **Expected semantic change count** | **EXACTLY 2** |
| **Exact-match model** | **RETAINED** |
| **Dual acceptance** | **NONE / FORBIDDEN** |
| **Implementation this task** | **NOT PERFORMED** |
| **LOCAL-017 execution** | **NOT AUTHORIZED by this IA** (remains blocked until retarget implementation + successor BCR Completion) |

---

## 5. Purpose

Align the artifact’s **stale execution-authority pin** with the **already issued** successor DBA:

```
CURRENT   EXPECTED_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-016
REQUIRED  E02_DBA_AUTHORIZATION_ID      = E-02-DBA-LOCAL-017   (LOCAL-017)
AUTHORIZED RETARGET                     = E-02-DBA-LOCAL-017

CURRENT   ARTIFACT_AUTHORIZATION_ID     = E-02-BCR-IA-016
AUTHORIZED ARTIFACT AUTHORITY           = E-02-BCR-IA-017
```

This is **AUTHORIZATION-ID RETARGET ONLY**.

**Not:** CB-B redesign · replay redesign · migration change · HMD-010 SQL edit · HMD-009 reconstruction edit · HMD-008/007/006 target edit · HMD-005 reconstruction/target edit · W1/W2 edit · quarantine change · history-policy change · launcher redesign · preserve/cleanup redesign · verifier redesign · environment-guard redesign · diagnostic redesign · DAA-014-C implementation · HMD status change · database execution · LOCAL-017 execution · LOCAL-016 retry · LOCAL-018.

---

## 6. Why this change is authority-safe

LOCAL-017 is already formally issued as **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED** · attempts **0**.

Retargeting the artifact to LOCAL-017 **does not fabricate authority**. It aligns the artifact with the current formally issued DBA. The change **must not create authority independently**.

```
No LOCAL-017  →  no retarget would have been permitted
```

LOCAL-016 remains a **historical failed** DBA. This retarget is **prospective compatibility work for LOCAL-017 only**. It is **not** a retroactive repair of LOCAL-016. After future implementation, LOCAL-016 **must not** remain an operationally accepted DBA authority. Historical evidence and governance history may still name LOCAL-016.

Do **not** grant BCR compatibility with LOCAL-016 as an alternate runtime authority.

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
| `EXPECTED_DBA_AUTHORIZATION_ID` value `E-02-DBA-LOCAL-016` → `E-02-DBA-LOCAL-017` | Dual-accept LOCAL-016 **or** LOCAL-017 |
| Comments / help strings that currently hardcode the stale expected DBA ID or stale IA ID, updated to match the new constants | Prefix / regex / `startsWith` / arrays of accepted IDs / env-provided expected ID / operator override / compatibility aliases |
| `ARTIFACT_AUTHORIZATION_ID` `E-02-BCR-IA-016` → `E-02-BCR-IA-017` so static IA metadata remains **truthful** | Weakening or disabling exact-match / `ReplayStop` validation |
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
artifact expected DBA            = E-02-DBA-LOCAL-017
runtime E02_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-017
artifact authority               = E-02-BCR-IA-017
LOCAL-016 CURRENT ACCEPTANCE     = NO
LOCAL-017 CURRENT ACCEPTANCE     = YES, exact only
BCR-IA-016 CURRENT AUTHORITY     = NO
BCR-IA-017 CURRENT AUTHORITY     = YES, exact only
```

No acceptance of LOCAL-016 · LOCAL-015 · empty value · multiple values · legacy fallback · OR condition · prefix match · wildcard. Dual artifact authority **FORBIDDEN**. Historical comments / governance documents are not operational acceptance. Do **not** edit historical comments merely to make grep empty.

**This issuance task itself MUST NOT modify the artifact.**

---

## 8. Exact-match security model (locked)

**Do not authorize:**

- accepting arbitrary DBA IDs
- prefix / suffix / regex / `startsWith` / substring
- arrays of accepted DBA IDs
- LOCAL-016 **OR** LOCAL-017 dual acceptance
- fallback to LOCAL-016 / LOCAL-015
- environment-provided expected IDs
- operator override of expected ID
- compatibility aliases / mode
- bypassing exact match
- disabling / weakening `ReplayStop`
- warning-only mismatch
- default acceptance

Required semantics after future implementation:

```
runtime DBA ID === E-02-DBA-LOCAL-017
Anything else → STOP
```

```
EXACT-MATCH MODEL = RETAINED / REQUIRED
DUAL ACCEPTANCE   = FORBIDDEN
```

---

## 9. Runtime env contract (future; not this task)

Do **not** rename `E02_DBA_AUTHORIZATION_ID`. This IA changes **only** the expected DBA **value**.

After successful BCR implementation **and** successor BCR Completion, future governed LOCAL-017 apply must use:

```
E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-017
E02_BCR_APPLY_AUTHORIZED=true
E02_ALLOW_DESTRUCTIVE_TESTS=true
E02_EVIDENCE_ENV=local
E02_RUNTIME_EXECUTION_AUTHORIZED=UNSET / FALSE
```

**This IA does NOT set or execute these values.** No RU-1.4 authority is implied. `E02_ALLOW_DESTRUCTIVE_TESTS=true` remains the technical disposable-db fail-closed input only. It does **not** authorize RU-1.4 · runtime RPC · destructive fixtures · production actions · unrelated database operations.

Environment / CB-B / baseline mode remain:

```
ENVIRONMENT   = LOCAL_DISPOSABLE_SUPABASE
CB-B          = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
BASELINE MODE = E02_DECLARED_BASELINE_REPLAY
```

---

## 10. DAA-014-C / guard lock

Do **not** modify `environment-guard.ts`. DAA-014-C remains:

```
E02_ALLOW_DESTRUCTIVE_TESTS=true
  = technical fail-closed input for the authorized disposable DB-backed DBA/BCR path
  ≠ destructive fixture / RU-1.4 / RPC / REA / production authority
```

---

## 11. Diagnostics / launcher lock

IA-006 diagnostics **must remain intact**. Future implementation **must not** modify diagnostics, launcher, package scripts, tests, or app source beyond the two authorized pins.

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

LOCAL-017 already owns Docker warm-engine and TCP **54323 FREE** gates. This IA does **not** implement those gates. Preserve/handoff and baseline-verifier rules remain governed by LOCAL-017 DBA. This IA does **not** alter them.

---

## 13. Verifier lock

Do **not** authorize edits to `verify-db-baseline.ts`. This retarget is **not** a baseline verifier redesign.

---

## 14. Migration-zero-edit lock

This BCR IA authorizes **ZERO** migration changes.

Do **not** modify: HMD-010 target · HMD-009 reconstruction · HMD-008 target · HMD-007 target · HMD-006 target · HMD-005 reconstruction · HMD-005 target · HMD-002 migration · W1 · HMD-004 target · W2 · April HARD · governed July S1 · quarantine migration.

```
MIGRATION EDIT COUNT AUTHORIZED = 0
```

HMD-010 target and HMD-009 reconstruction remain **executable** (not quarantined).

---

## 15. HMD-010 Completion / runtime checkpoint

| Item | Status |
|------|--------|
| PAD-058 | **ISSUED / IMMUTABLE** · OPTION C |
| PAD-059 | **ISSUED / IMMUTABLE** · HOSCC family |
| E-02-HOSCC-IA | **CONSUMED** (operational ledger) |
| E-02-HOSCC-IMPLEMENTATION-COMPLETION | **COMPLETED WITH NOTES** |
| HMD-010 | **OPEN / DISTINCT / ORIGINAL HISTORICAL SQL / SCHEMA-ASSUMPTION DEFECT / ORIGINAL CLEAN-REPLAY WRONG-COLUMN ASSUMPTION ON EXISTING TABLE / OPTION C SELECTED / IMPLEMENTATION COMPLETED / HOSCC COMPLETION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |
| Target | `20260405120000_multi_tenant_properties.sql` · **DO NOT EDIT** |
| Current blob | `a37966fe60a9a7be1897e04b521d284a55185805` |
| Prior error | `column mv.meeting_id does not exist` |

Governed construct (PAD-058 §13.1):

```
UPDATE public.meeting_votes mv
SET property_id = m.property_id
FROM public.meeting_agenda_items mai, public.meetings m
WHERE mv.agenda_item_id = mai.id
  AND mai.meeting_id = m.id
  AND mv.property_id IS NULL;
```

No HMD-010 executable edit under BCR authority. HOSCC Completion is **not** runtime proof.

Future LOCAL-017 runtime must prove:

```
TARGET 20260405120000_multi_tenant_properties.sql
  = REACHED / APPLIED
prior error (column mv.meeting_id does not exist)
  = NOT REPRODUCED
```

If that evidence exists, HMD-010 **may** advance to **RUNTIME REPLAY VERIFIED** and **must not** automatically be marked **CLOSED**. This BCR IA **does not** establish that evidence.

---

## 16. HMD-009 runtime checkpoint

```
HMD-009 =
  OPEN /
  OPTION B /
  RECONSTRUCTION IMPLEMENTED /
  IMPLEMENTATION COMPLETED /
  RUNTIME REPLAY VERIFICATION PENDING
```

Reconstruction `20260405115900_hmd009_reconstruct_hiring_jobs.sql` · **DO NOT EDIT**.

LOCAL-016 already proved reconstruction **REACHED / APPLIED** and prior `hiring_jobs` error **NOT REPRODUCED**, but the historical target **did not apply**. Future LOCAL-017 must still record reconstruction **REACHED / APPLIED** and target **REACHED / APPLIED** before promoting HMD-009. Do **not** infer merely from later progress.

---

## 17. HMD-008 / HMD-007 / HMD-006 / HMD-005 preserved runtime proof

```
HMD-008 / HMD-007 / HMD-006 =
  OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED

HMD-005 =
  OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
```

Do **not** close. Do **not** reopen. Do **not** edit those files.

---

## 18. HMD-003 pending runtime checkpoints

| Checkpoint | Filename | Current runtime (LOCAL-016) | Future LOCAL-017 objective |
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

## 19. Quarantine lock

Exactly:

```
20260314195641_add_demo_data.sql
COUNT = 1
```

Do **not** quarantine: HMD-010 target · HMD-009 reconstruction · HMD-008/007/006 targets · HMD-005 reconstruction/target · HMD-002 · W1 · HMD-004 · W2 · April HARD · July S1. No quarantine change.

---

## 20. Migration count model

Latest certified DB-free plan reference from HMD-010 implementation / HOSCC Completion: discovered **287** · planned executable **286** · quarantineCount **1**. Older BCR-family reports of 286/285/1 are **historical reference only**.

The future BCR retarget changes **no** migration files. The expected structural migration set therefore remains unchanged. **Do not** encode 287/286/1 or 286/285/1 as a permanent invariant. Future implementation **must** report actual fresh `--plan` values.

---

## 21. Future implementation pre-gates

Before editing the BCR, future implementation **must** verify:

| Gate | Required |
|------|----------|
| A | LOCAL-017 remains **APPROVED WITH CONDITIONS / NOT CONSUMED / NOT EXECUTED / attempts 0** |
| B | LOCAL-016 remains **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE / NO RETRY** · attempts **1** |
| C | Current operational BCR pins remain exactly **LOCAL-016 / BCR-IA-016** |
| D | E-02-BCR-IA-017 issued and **APPROVED WITH CONDITIONS / NOT YET CONSUMED** |
| E | No superseding BCR authority exists |
| F | No unexplained executable drift beyond the certified authorized lineage |
| G | Quarantine remains count **1** |
| H | HMD-010 HOSCC Completion remains valid · target blob `a37966fe60a9a7be1897e04b521d284a55185805` unedited by this IA |

Material mismatch → **IMPLEMENTATION = BLOCKED** · **IA = NOT CONSUMED** · **STOP → GOVERNANCE**. No file edit.

---

## 22. Future implementation delta lock

Future implementation must prove semantic delta **exactly**:

```
OLD DBA PIN              = E-02-DBA-LOCAL-016
NEW DBA PIN              = E-02-DBA-LOCAL-017
OLD ARTIFACT AUTHORITY   = E-02-BCR-IA-016
NEW ARTIFACT AUTHORITY   = E-02-BCR-IA-017
AUTHORIZED SEMANTIC CHANGES = EXACTLY 2
ACTUAL ATTRIBUTABLE SEMANTIC CHANGES = 2
```

They must be only:

```
LOCAL-016 → LOCAL-017
IA-016    → IA-017
```

Capture `git diff` and `git diff --numstat`. Distinguish pre-existing authorized uncommitted BCR lineage from the new IA-017 attributable retarget. No third semantic change. If extra semantic changes appear: **IA NOT CONSUMED** · **STOP → GOVERNANCE**.

The certified IA-016 operational worktree (`LOCAL-016` / `IA-016`) remains the **starting operational state**. Future implementation must retarget **from that operational state**, not from HEAD.

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
| `expectedDbaAuthorizationId` | `E-02-DBA-LOCAL-017` |
| `artifactAuthorizationId` | `E-02-BCR-IA-017` |
| `quarantineCount` | **1** |
| quarantined | `20260314195641_add_demo_data.sql` |

And must discover/executable at minimum:

| File | Required |
|------|----------|
| `20260405115900_hmd009_reconstruct_hiring_jobs.sql` | **DISCOVERED / EXECUTABLE** |
| `20260405120000_multi_tenant_properties.sql` | **DISCOVERED / EXECUTABLE / NOT QUARANTINED** |
| `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` | **DISCOVERED / EXECUTABLE** |
| `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | **DISCOVERED / EXECUTABLE** |
| `20260711120000_invoice_ai_audit_v1.sql` | **DISCOVERED / EXECUTABLE** |
| `20260314195641_add_demo_data.sql` | **DISCOVERED / QUARANTINED** |

Capture actual `migrationCountDiscovered` · planned executable count · `quarantineCount`. Do **not** treat prior counts as permanent invariants.

---

## 24. Future zero-runtime lock

BCR retarget implementation itself **must** have:

```
DATABASE                = NONE
STATEFUL SUPABASE       = NONE
DOCKER MUTATION         = NONE
--apply                 = NONE
LOCAL-017 EXECUTION     = NONE
LOCAL-017 ATTEMPTS      = 0
LOCAL-016 RETRY         = NONE
LOCAL-018               = NOT ISSUED
```

This IA issuance **does not** increment LOCAL-017 attempts. Only a future stateful `--apply` start increments `0 → 1`.

Before `--apply`: gate failure → **BLOCKED** / attempts **0**. Once `--apply` starts: attempts → **1** irreversibly. No retry.

---

## 25. Future failure taxonomy lock

Preserve LOCAL-017 DBA-defined taxonomy:

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

**E-02-BCR-IA-017** may become **CONSUMED** only if future implementation successfully establishes:

1. pre-state pins exactly matched (`LOCAL-016` / `IA-016`);
2. LOCAL-017 remains attempts **0** / not executed;
3. exactly the two authorized BCR semantic changes are implemented;
4. resulting DBA pin = `E-02-DBA-LOCAL-017`;
5. resulting artifact authority = `E-02-BCR-IA-017`;
6. LOCAL-017 is the sole operational DBA acceptance;
7. E-02-BCR-IA-017 is the sole operational artifact authority;
8. exact-match retained;
9. no dual acceptance;
10. LOCAL-016 operational acceptance removed;
11. IA-016 operational artifact authority removed;
12. BCR otherwise semantically unchanged;
13. no unexplained BCR semantic drift;
14. migrations unchanged (HMD-010 target and HMD-009 reconstruction preserved);
15. verifier / guard / diagnostics / launcher / package / tests / app unchanged beyond the two authorized pins;
16. quarantine remains count **1**;
17. fresh `--plan` = `PLAN_OK` · failures `[]`;
18. build = **PASS**;
19. no runtime · no `--apply` · no database.

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
  RETARGETED TO LOCAL-017 /
  ARTIFACT AUTHORITY E-02-BCR-IA-017 /
  IMPLEMENTATION COMPLETION PENDING
```

A separate Completion is required after implementation **before** LOCAL-017 runtime.

Reserve, **do not create**:

```
docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Completion-017.md
```

Expected Completion ID (verify sequence at that later issuance): **E-02-BCR-IMPLEMENTATION-COMPLETION-017**. Highest issued BCR Completion in this numbered family is **016**. **017 is the next unused identifier** if still unused then. **Do not allocate or issue it here.**

Do **NOT** issue Completion in this IA task. Do **NOT** issue Completion automatically during retarget implementation.

After BCR implementation:

```
LOCAL-017 remains EXECUTION GATED
until successor BCR Completion is issued
```

Issuing IA-017 alone does **NOT** make LOCAL-017 executable.

Expected sequence:

```
E-02-BCR-IA-017
  → IMPLEMENT TWO-CONSTANT RETARGET
  → STATIC VERIFY
  → FRESH DB-FREE --plan
  → npm run build
  → ISSUE COMPLETION-017 (separate later task)
  → ONLY THEN LOCAL-017 MAY BECOME PRE-STATEFUL ELIGIBLE
  → RUNTIME GATES
  → SINGLE GOVERNED APPLY
```

---

## 28. LOCAL-016 / LOCAL-017 / LOCAL-018 locks

```
LOCAL-016 =
  APPLICATION_FAILED /
  NOT SUCCESSFULLY CONSUMED /
  EVIDENCE IMMUTABLE
LOCAL-016 ATTEMPTS = 1
LOCAL-016 RETRY    = NOT AUTHORIZED
LOCAL-016 EVIDENCE = local-016-20260830a
LOCAL-016 FIRST FAILING = 20260405120000_multi_tenant_properties.sql
LOCAL-016 EXECUTABLE INDEX = 74
LOCAL-016 HIGHEST APPLIED = 20260405115900_hmd009_reconstruct_hiring_jobs.sql
LOCAL-016 EXECUTED = 73
LOCAL-016 FAILURE TEXT = column mv.meeting_id does not exist
LOCAL-016 PRESERVE/HANDOFF = NOT REACHED
LOCAL-016 BASELINE VERIFIER = NOT RUN

LOCAL-017 =
  APPROVED WITH CONDITIONS /
  NOT CONSUMED /
  NOT EXECUTED /
  EXECUTION GATED
LOCAL-017 STATEFUL APPLY ATTEMPTS = 0
FUTURE MAXIMUM STATEFUL APPLY     = EXACTLY 1

LOCAL-018 =
  NOT AUTHORIZED /
  NOT ISSUED
```

Issuing **E-02-BCR-IA-017 does NOT itself unblock LOCAL-017 execution.**

After this IA issuance:

```
LOCAL-017 BCR COMPATIBILITY =
  STILL BLOCKED UNTIL
  IA-017 RETARGET IMPLEMENTATION
  +
  SUCCESSOR BCR COMPLETION

BCR RETARGET =
  AUTHORIZED /
  NOT IMPLEMENTED

CURRENT BCR =
  STILL E-02-DBA-LOCAL-016 /
  E-02-BCR-IA-016
```

LOCAL-016 must **never** regain operational BCR execution authority after successor retarget.

If a future apply starts: attempts = **1**. If it fails: evidence immutable · no retry · no automatic LOCAL-018 · **STOP → GOVERNANCE**.

Do **not** retry LOCAL-016 · reclassify LOCAL-016 · overwrite LOCAL-016 evidence · dual-accept LOCAL-016 · treat retarget as retroactive repair of LOCAL-016.

No LOCAL-017 `--apply` in this task.

---

## 29. Database / runtime lock (unchanged)

| Item | Status |
|------|--------|
| Database baseline | **NOT VERIFIED** |
| Preserve/handoff | **NOT REACHED** (LOCAL-016 failed before preserve) |
| Baseline verifier | **NOT RUN** |
| RU-1.1 | **REPOSITORY IMPLEMENTED / DB NOT APPLIED** |
| RU-1.2 | **REPOSITORY IMPLEMENTED / DB NOT APPLIED / RUNTIME NOT VERIFIED** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **UNSET / FALSE / PROHIBITED** |
| EIR | **NONE** |
| ACCEPTANCE | **BLOCKED** |
| CERTIFICATION | **NOT ISSUED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Final COMMIT path | **BLOCKED** |

Nothing in IA-017 changes those statuses. Do **not** set runtime eligibility merely because this IA is issued.

---

## 30. Next action (this issuance)

```
NEXT = BCR RETARGET IMPLEMENTATION UNDER E-02-BCR-IA-017
```

That later task must:

- verify current operational pins remain LOCAL-016 / IA-016;
- verify LOCAL-017 remains attempts **0** / not executed;
- implement exactly two semantic pin changes;
- retain exact-match;
- prohibit dual acceptance;
- run DB-free `--plan` and `npm run build`;
- **not** issue Completion-017 in the same task unless separately authorized;
- **not** execute LOCAL-017;
- **not** retry LOCAL-016.

**Not implemented in this issuance.**

---

## 31. Confirmation of no executable work

**No** BCR artifact edit · **no** retarget implementation · **no** migration edit · **no** HMD reconstruction/restoration/Option-C edit · **no** verifier / guard / diagnostics / launcher / package / test / app edit · **no** `--apply` · **no** `--plan` as this issuance’s execution · **no** database · **no** Supabase · **no** Docker · **no** LOCAL-016 retry · **no** LOCAL-017 execution · **no** LOCAL-018 · **no** BCR Completion-017 · **no** RU-1.1 / RU-1.2 / RU-1.4 · **no** EIR / Acceptance / Certification change · **no** commit.

Only this record and [`README.md`](README.md) are written.

---

## 32. Lock statement

```
E-02-BCR-IA-017                            = APPROVED WITH CONDITIONS /
                                             NOT YET CONSUMED
AUTHORIZED ACTION                          = AUTHORIZATION-ID RETARGET ONLY
AUTHORIZED SEMANTIC CHANGES                = EXACTLY 2
CURRENT ARTIFACT DBA PIN                   = E-02-DBA-LOCAL-016
AUTHORIZED FUTURE DBA PIN                  = E-02-DBA-LOCAL-017
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-016
AUTHORIZED FUTURE ARTIFACT AUTHORITY       = E-02-BCR-IA-017
EXACT-MATCH                                = RETAINED
DUAL-ACCEPT                                = FORBIDDEN
BCR RETARGET                               = AUTHORIZED / NOT IMPLEMENTED
PAD-058                                    = ISSUED / IMMUTABLE / OPTION C
PAD-059                                    = ISSUED / IMMUTABLE / HOSCC FAMILY
E-02-HOSCC-IA                              = CONSUMED
E-02-HOSCC-IMPLEMENTATION-COMPLETION       = COMPLETED WITH NOTES
HMD-010                                    = OPEN / OPTION C /
                                             IMPLEMENTATION COMPLETED /
                                             HOSCC COMPLETION COMPLETED /
                                             RUNTIME REPLAY VERIFICATION PENDING
HMD-009                                    = OPEN / OPTION B /
                                             RECONSTRUCTION IMPLEMENTED /
                                             IMPLEMENTATION COMPLETED /
                                             RUNTIME REPLAY VERIFICATION PENDING
HMD-008 / 007 / 006 / 005                  = OPEN / RUNTIME REPLAY VERIFIED
HMD-003                                    = OPEN / RUNTIME REPLAY VERIFICATION PENDING
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql /
                                             COUNT 1
LOCAL-016                                  = APPLICATION_FAILED /
                                             NOT SUCCESSFULLY CONSUMED /
                                             EVIDENCE IMMUTABLE
LOCAL-016 ATTEMPTS                         = 1
LOCAL-016 RETRY                            = NOT AUTHORIZED
LOCAL-017                                  = APPROVED WITH CONDITIONS /
                                             NOT CONSUMED /
                                             NOT EXECUTED /
                                             EXECUTION GATED
LOCAL-017 ATTEMPTS                         = 0
AUTHORIZED FUTURE APPLY                    = EXACTLY 1
LOCAL-017 RUNTIME                          = NOT YET AUTHORIZED TO START
LOCAL-018                                  = NOT AUTHORIZED
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
E02_RUNTIME_EXECUTION_AUTHORIZED           = UNSET / FALSE / PROHIBITED
EIR                                        = NONE
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = BCR RETARGET IMPLEMENTATION
                                             UNDER E-02-BCR-IA-017
EXECUTABLE WORK                            = NONE
```

---

**End of document — E-02-BCR-IA-017 — v1.0 — 2026-08-30**
