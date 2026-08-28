# E-02 — Baseline Compatibility Replay Artifact — Implementation Authorization (Successor)

## Authorization-ID Retarget Only · E-02-DBA-LOCAL-010 → E-02-DBA-LOCAL-011

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Authorization (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Artifact** | Governed Baseline-Compatibility Replay Artifact (class C) — **DBA authorization-ID retarget only** |
| **Authorization ID** | **E-02-BCR-IA-011** |
| **Predecessors** | **E-02-BCR-IA** · **E-02-BCR-IA-002** · **E-02-BCR-IA-003** · **E-02-BCR-IA-004** · **E-02-BCR-IA-005** · **E-02-BCR-IA-006** · **E-02-BCR-IA-007** · **E-02-BCR-IA-008** · **E-02-BCR-IA-009** · **E-02-BCR-IA-010** — all **CONSUMED / HISTORICAL / IMMUTABLE** |
| **Direct DBA authority aligned** | **E-02-DBA-LOCAL-011** — [`E-02-Database-Application-Authorization-LOCAL-011.md`](E-02-Database-Application-Authorization-LOCAL-011.md) (**APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED**) |
| **Guard clarification (read-only)** | [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) (**DAA-014-C** · **ISSUED** · **EG-B**) |
| **Restoration authority (HMD-004, read-only)** | **PAD-052 ISSUED / IMMUTABLE** · **E-02-HMIR-IA-002 CONSUMED** · Completion-002 **COMPLETED WITH NOTES** |
| **Reconstruction authority (read-only)** | **E-02-HFSOR-IA CONSUMED** · Completion **COMPLETED WITH NOTES** · PAD-051 **ISSUED / IMMUTABLE** |
| **Status** | **Approved With Conditions — NOT YET CONSUMED** |
| **Authority Level** | Implementation Authorization (repository implementation only) |
| **Effective Date** | 2026-08-27 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-011.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-011.md) |
| **Production Effect** | **None** |

> **Authority path finding: YES.** `E-02-Baseline-Compatibility-Replay-Implementation-Authorization-011.md` is **authority-safe** as the next **successor Implementation Authorization** in the existing BCR IA family (`…-Implementation-Authorization.md` → `-002` … `-010` → **`-011`**). ID **`E-02-BCR-IA-011`** parallels that series. Highest previously allocated successor is **E-02-BCR-IA-010** (**CONSUMED**). No BCR IA numbered **012** or later exists. Distinct filename keeps predecessors **immutable**. **Not a new governance tier.** **Not a PAD.** **Not PAD-053.** **Not a DBA.** **Not a HMIR IA.** **Not a reconstruction IA.** **Not a Clean-Base Design Amendment.** **Not a Guard Implementation Authorization.** **Not a new diagnostic runtime class.** **Not a new BCR-CB architecture.** **Not a new defect by itself.** **Not a quarantine amendment.** **Not a restoration reopening.** **Not a RU-1.4 REA.** **Not an EIR.**

> **Document class:** Bounded successor **Implementation Authorization** for **one future narrow repository retarget** of the replay artifact’s expected DBA authorization ID (and directly coupled truthful IA metadata). This issuance **does not implement** the retarget · **does not** modify the artifact · **does not** execute LOCAL-011 · **does not** run DB / Supabase / Docker · **does not** edit W1/W2 · **does not** edit HMD-002 or HMD-004 restored migrations · **does not** change quarantine · **does not** modify the environment guard · **does not** re-implement diagnostic observability.

```
SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION = E-02-BCR-IA-011
DECISION                                   = APPROVED WITH CONDITIONS
PREDECESSORS (E-02-BCR-IA / -002 … -010)
                                           = CONSUMED / HISTORICAL / IMMUTABLE
AUTHORIZED ACTION                          = AUTHORIZATION-ID RETARGET ONLY
CURRENT ARTIFACT PIN                       = E-02-DBA-LOCAL-010
AUTHORIZED ARTIFACT PIN                    = E-02-DBA-LOCAL-011
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-010
AUTHORIZED ARTIFACT AUTHORITY              = E-02-BCR-IA-011
RUNTIME DBA ENV                            = E02_DBA_AUTHORIZATION_ID (UNCHANGED)
EXACT-MATCH MODEL                          = RETAINED (no dual-accept / prefix / regex / override)
SEMANTIC CHANGE COUNT                      = EXACTLY 2
DAA-014-C                                  = ISSUED / GUARD SEMANTICS UNCHANGED
DIAGNOSTIC OBSERVABILITY                   = MUST REMAIN INTACT
CB-B ARCHITECTURE                          = RETAINED
LAUNCHER / STARTUP                         = UNCHANGED
CONTAINER LOG COLLECTION                   = NOT AUTHORIZED / NOT IMPLEMENTED
PROCESS KILL                               = NOT AUTHORIZED
PORT REMAP / STUDIO PORT                   = NOT AUTHORIZED
HMD-002 RESTORED MIGRATION                 = UNTOUCHED
HMD-003 W1 / W2                            = UNTOUCHED
HMD-004 TARGET MIGRATION                   = UNTOUCHED
JULY S1                                    = UNTOUCHED
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
PAD-052                                    = ISSUED / IMMUTABLE
LOCAL-010                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-010 RETRY                            = NOT AUTHORIZED
LOCAL-011                                  = APPROVED WITH CONDITIONS / NOT CONSUMED / STILL BLOCKED UNTIL RETARGET IMPLEMENTATION + COMPLETION-011
ARTIFACT EXECUTION                         = NOT AUTHORIZED BY THIS IA
THIS ISSUANCE                              ≠ IMPLEMENTATION · ≠ LOCAL-011 EXECUTION · ≠ RESTORATION EDIT
```

---

## 1. Authority / sequence finding (this issuance)

| Check | Result |
|-------|--------|
| A. E-02-BCR-IA-010 exists | **YES** |
| B. E-02-BCR-IA-010 CONSUMED | **YES** (Completion-010 operational ledger) |
| C. Completion-010 COMPLETED WITH NOTES | **YES** |
| D. E-02-DBA-LOCAL-011 exists | **YES** |
| E. LOCAL-011 status | **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED** |
| F. LOCAL-011 requires successor BCR retarget | **YES** |
| G. Current artifact pin / authority | `EXPECTED_DBA_AUTHORIZATION_ID = 'E-02-DBA-LOCAL-010'` · `ARTIFACT_AUTHORIZATION_ID = 'E-02-BCR-IA-010'` |
| H. Runtime env | `E02_DBA_AUTHORIZATION_ID` (**UNCHANGED**) |
| I. Exact-match fail-closed present | **YES** (`raw !== EXPECTED_DBA_AUTHORIZATION_ID` → STOP) |
| J. Dual-accept mechanism | **NONE** |
| K. E-02-BCR-IA-011 already exists | **NO** |
| L. Later BCR IA already issued | **NO** (no **012+**) |
| M. Next unused successor | **011** |
| N. Superseding PAD/DAA/DBA/IA/Completion | **NONE** (LOCAL-011 NEXT = this retarget) |
| O. W1 present | **YES** `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql` |
| P. W2 present | **YES** `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` |
| Q. HMD-004 target present | **YES** `20260320045054_enhance_dispute_resolution_system.sql` |
| R. Quarantine exactly one | **YES** — `20260314195641_add_demo_data.sql` · allowlist length **1** |

```
AUTHORITY PATH     = PASS
SUCCESSOR BCR IA   = E-02-BCR-IA-011
```

**No STOP.** Issuance may proceed.

---

## 2. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Database-Application-Authorization-LOCAL-011.md`](E-02-Database-Application-Authorization-LOCAL-011.md) | Direct DBA — **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED** · NEXT = successor BCR retarget |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-010.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-010.md) | Predecessor **E-02-BCR-IA-010 CONSUMED / HISTORICAL / IMMUTABLE** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-010.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-010.md) | IA-010 repository completion — **COMPLETED WITH NOTES** · **not reopened** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-010.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-010.md) | LOCAL-010 **APPLICATION_FAILED** at `20260320045054` (`syntax error at or near "category"`) · **immutable** |
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion-002.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion-002.md) | HMD-004 repository restoration **COMPLETED WITH NOTES** |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md) | **PAD-052 ISSUED / IMMUTABLE** |
| [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) | DAA-014-C **ISSUED** · named technical guard inputs · **not implemented by this IA** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md) | **E-02-BCR-IA-006 CONSUMED** — diagnostic observability; **must remain intact** |
| PAD-011–PAD-025 / PAD-026–PAD-038 / PAD-039–PAD-050 / PAD-051 / PAD-052 | DAA · quarantine · forensic restoration · reconstruction · HMD-004 — **not reopened** |
| Artifact (read-only, this issuance) | `scripts/verification/e02/replay-e02-declared-baseline.ts` |

No new Program Authority Decision required. No Clean-Base Design Amendment required. No new BCR-CB defect required. No restoration SQL change. No reconstruction SQL change. No guard change.

---

## 3. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-BCR-IA-011** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Status at issuance** | **APPROVED WITH CONDITIONS / NOT YET CONSUMED** |
| **Authorized action** | One future repository retarget of the replay artifact expected DBA ID + coupled truthful IA metadata |
| **Authorized transformation (1)** | `EXPECTED_DBA_AUTHORIZATION_ID`: `E-02-DBA-LOCAL-010` → `E-02-DBA-LOCAL-011` |
| **Authorized transformation (2)** | `ARTIFACT_AUTHORIZATION_ID`: `E-02-BCR-IA-010` → `E-02-BCR-IA-011` |
| **Expected semantic change count** | **EXACTLY 2** |
| **Exact-match model** | **RETAINED** |
| **Dual acceptance** | **NONE** |
| **Implementation this task** | **NOT PERFORMED** |
| **LOCAL-011 execution** | **NOT AUTHORIZED by this IA** (remains blocked until retarget implementation + Completion-011) |

---

## 4. Purpose

Align the artifact’s **stale execution-authority pin** with the **already issued** DBA:

```
CURRENT   EXPECTED_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-010
REQUIRED  E02_DBA_AUTHORIZATION_ID      = E-02-DBA-LOCAL-011   (LOCAL-011)
AUTHORIZED RETARGET                     = E-02-DBA-LOCAL-011

CURRENT   ARTIFACT_AUTHORIZATION_ID     = E-02-BCR-IA-010
AUTHORIZED ARTIFACT AUTHORITY           = E-02-BCR-IA-011
```

This is **AUTHORIZATION-ID RETARGET ONLY**.

**Not:** CB-B redesign · replay redesign · migration change · W1/W2 edit · HMD-002/HMD-004 edit · quarantine change · history-policy change · launcher redesign · preserve/cleanup redesign · verifier redesign · environment-guard redesign · diagnostic redesign · DAA-014-C implementation · HMD status change · database execution · LOCAL-011 execution · LOCAL-010 retry · LOCAL-012.

---

## 5. Why this change is authority-safe

LOCAL-011 is already formally issued as **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED**.

Retargeting the artifact to LOCAL-011 **does not fabricate authority**. It aligns the artifact with the current formally issued DBA. The change **must not create authority independently**.

```
No LOCAL-011  →  no retarget would have been permitted
```

LOCAL-010 remains a **historical failed** DBA. This retarget is **prospective compatibility work for LOCAL-011 only**. It is **not** a retroactive repair of LOCAL-010. After future implementation, LOCAL-010 **must not** remain an operationally accepted DBA authority.

---

## 6. Exact authorized source scope (future implementation)

**May modify exactly one source file:**

```
scripts/verification/e02/replay-e02-declared-baseline.ts
```

| Allowed | Not allowed |
|---------|-------------|
| `EXPECTED_DBA_AUTHORIZATION_ID` value `E-02-DBA-LOCAL-010` → `E-02-DBA-LOCAL-011` | Dual-accept LOCAL-010 **or** LOCAL-011 |
| Comments / help strings that currently hardcode the stale expected DBA ID or stale IA ID, updated to match the new constants | Prefix / regex / `startsWith` / arrays of accepted IDs / env-provided expected ID / operator override / compatibility aliases |
| `ARTIFACT_AUTHORIZATION_ID` `E-02-BCR-IA-010` → `E-02-BCR-IA-011` so static IA metadata remains **truthful** | Weakening or disabling exact-match / `ReplayStop` validation |
| | Changing diagnostic capture / sanitization / `--debug` / cleanup-order |
| | Changing environment-guard import or call |
| | Second source file · helper file · wildcard |
| | `verify-db-baseline.ts` · `environment-guard.ts` · package/lockfiles · tests · app source · migrations · Docker/Supabase config |

Runtime supplied value remains **`E02_DBA_AUTHORIZATION_ID`** and must still **exact-match** the expected ID. Fail-closed comparison must remain semantically equivalent to:

```
raw !== EXPECTED_DBA_AUTHORIZATION_ID  →  STOP
```

After implementation: **LOCAL-010 must cease being the accepted future execution authority.** **LOCAL-011 is the sole expected DBA authorization.** Spoofing LOCAL-010 is **NOT AUTHORIZED**. Historical comments are not operational acceptance. Do **not** edit historical comments merely to make grep empty.

**This issuance task itself MUST NOT modify the artifact.**

---

## 7. Exact-match security model (locked)

**Do not authorize:**

- accepting arbitrary DBA IDs
- prefix / suffix / regex / `startsWith` / substring
- arrays of accepted DBA IDs
- LOCAL-010 **OR** LOCAL-011 dual acceptance
- fallback to LOCAL-010
- environment-provided expected IDs
- operator override of expected ID
- compatibility aliases / mode
- bypassing exact match
- disabling / weakening `ReplayStop`
- warning-only mismatch
- default acceptance

Required semantics after future implementation:

```
runtime DBA ID === E-02-DBA-LOCAL-011
Anything else → STOP
```

```
EXACT-MATCH MODEL = RETAINED
DUAL ACCEPTANCE   = NONE
```

---

## 8. Runtime env contract

Do **not** rename `E02_DBA_AUTHORIZATION_ID`. This IA changes **only** the expected DBA **value**.

Future LOCAL-011 technical environment remains controlled by the LOCAL-011 DBA and DAA-014-C:

```
E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-011
E02_BCR_APPLY_AUTHORIZED=true
E02_ALLOW_DESTRUCTIVE_TESTS=true
E02_EVIDENCE_ENV=local
```

**This IA does NOT set or execute these values.**

Preserve:

```
E02_RUNTIME_EXECUTION_AUTHORIZED = UNSET / FALSE
```

---

## 9. DAA-014-C / guard semantics (unchanged)

DAA-014-C remains controlling for LOCAL-011 **execution** guard semantics. **This IA does not implement or modify those semantics.** Do **not** modify `environment-guard.ts`, guard validation, variable names, guard error messages, or runtime-authority / baseline-authority separation.

Preserve:

```
E02_ALLOW_DESTRUCTIVE_TESTS=true
  = technical fail-closed input for the authorized disposable DB-backed DBA/BCR path
  ≠ destructive fixture / RU-1.4 / RPC / REA authority
```

---

## 10. Diagnostic observability must remain intact

IA-006 diagnostics **must remain intact**. Future implementation **must not** modify:

- bounded stdout capture
- bounded stderr capture
- sanitization
- head/tail limits
- truncation metadata
- CLI failure metadata
- `PROCESS_DID_NOT_START` vs `PROCESS_EXITED_NONZERO`
- internal start `--debug`
- capture-before-cleanup ordering
- diagnostic result structures

**No new diagnostic work. No container-log expansion.** This IA is **not** a diagnostic IA.

---

## 11. Launcher lock

**Launcher = UNCHANGED.** Do **not** modify:

- `WINDOWS_COMSPEC_NPX`
- shell behavior
- command allowlist
- init/start/status/stop
- process invocation
- retry behavior
- timeout behavior

No retry implementation.

---

## 12. CB-B / baseline mode lock

**CB-B architecture = RETAINED.** `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` **unchanged**.  
**Baseline mode = RETAINED.** `E02_DECLARED_BASELINE_REPLAY` **unchanged**.

Do **not** redesign clean-base behavior. Do **not** alter auxiliary project creation · empty migrations bootstrap · application reset · migration replay ordering · truthful history · preserve/cleanup lifecycle.

LOCAL-011 already owns Docker warm-engine and TCP **54323 FREE** gates. This IA does **not** implement those gates. Process kill **NOT AUTHORIZED**. Port remap **NOT AUTHORIZED**.

---

## 13. HMD-002 lock

| Item | Status |
|------|--------|
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT** |
| File | `20260315035847_add_meeting_templates_and_attachments.sql` · **DO NOT EDIT** |

LOCAL-011 runtime must later prove REACHED / APPLIED and prior parser failure **NOT REPRODUCED**. This IA **does not** certify runtime.

---

## 14. HMD-003 / W1 / W2 lock

| Item | Status |
|------|--------|
| W1 | `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql` · **DO NOT MODIFY** |
| W2 | `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` · **DO NOT MODIFY** |
| HMD-003 | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |

Future LOCAL-011 runtime objectives remain unchanged.

---

## 15. HMD-004 lock

| Item | Status |
|------|--------|
| Target | `20260320045054_enhance_dispute_resolution_system.sql` · **DO NOT MODIFY** |
| HMD-004 | **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |

Known four restored fragments remain repository facts. This retarget does **NOT** re-open restoration implementation. This retarget does **NOT** close HMD-004.

Future LOCAL-011 must prove:

```
20260320045054 =
  REACHED / APPLIED
prior syntax error at or near "category" =
  NOT REPRODUCED
```

---

## 16. July S1 lock

`20260711120000_invoice_ai_audit_v1.sql` · **DO NOT MODIFY**. Future runtime must still prove the S1 collision path. No implementation change here.

---

## 17. HMD status locks (issuance)

| Item | Status |
|------|--------|
| HMD-001 | **OPEN / DISTINCT** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT** |
| HMD-003 | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |
| HMD-004 | **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |

IA-011 issuance **does not** resolve any HMD.

---

## 18. Quarantine

Exactly:

```
20260314195641_add_demo_data.sql
COUNT = 1
```

Do **not** quarantine: HMD-004 migration · W1 · W2 · HMD-002 restored migration. Option D / skip **NOT AUTHORIZED**. No quarantine change.

---

## 19. Verifier / package / test lock

**Not authorized to modify:**

- `scripts/verification/e02/verify-db-baseline.ts`
- environment guard
- `package.json` / lockfiles / dependencies
- tests / fixtures
- application source
- Supabase functions
- generated types
- migrations

No dependency installation. No generated schema update. No formatting sweep outside the exact authorized artifact constants.

---

## 20. Defect classification

**NO NEW BCR-CB DEFECT REQUIRED / NOT ALLOCATED.**

This is a **stale authorization-ID pin** caused by successor DBA issuance (LOCAL-011), **not** a new CB-B architecture defect, **not** an HMD-003 reconstruction defect, **not** an HMD-004 restoration defect, and **not** a guard implementation defect.

BCR-CB-001 / 002 / 003 / 004 remain **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING**.

---

## 21. Static verification authorized for future implementation

**Allowed (repository/static, DB-free):** source inspection · grep/search · `git status` / `git diff` · constant inspection · exact-match inspection · migration presence/order checks · quarantine count check · BCR `--plan` · `npm run build`.

**Not allowed:** `--apply` · stateful Supabase · database · Docker mutation · baseline verifier runtime · LOCAL-011 execution · RU-1.4.

If an unrelated pre-existing build failure prevents certification: record it truthfully · **STOP → GOVERNANCE** if necessary. Do **not** fix unrelated build failures under this IA. If the retarget itself causes build failure: **STOP**.

---

## 22. Required future `--plan` result

After future retarget implementation, DB-free BCR plan must report:

| Field | Required |
|-------|----------|
| `result` | `PLAN_OK` |
| `expectedDbaAuthorizationId` | `E-02-DBA-LOCAL-011` |
| `artifactAuthorizationId` | `E-02-BCR-IA-011` |
| environment | `LOCAL_DISPOSABLE_SUPABASE` |
| CB-B | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` |
| baseline mode | `E02_DECLARED_BASELINE_REPLAY` |
| `quarantineCount` | **1** |
| quarantined migration | `20260314195641_add_demo_data.sql` |

Migration counts **must be discovered** from repository state at that time. Do **not** permanently hard-code 285/284 as governance truth.

---

## 23. Future build

Future implementation must run `npm run build`. Expected **PASS**. If retarget causes failure: **STOP**. Do not repair unrelated build failures under this IA.

---

## 24. Implementation Completion gate (future)

Future retarget implementation may be certified **only** if all of the following are proven:

1. E-02-BCR-IA-011 existed and was unconsumed before implementation.
2. Only the replay artifact constants were semantically changed (plus minimal governance ledger if required).
3. `EXPECTED_DBA_AUTHORIZATION_ID` changed exactly LOCAL-010 → LOCAL-011.
4. `ARTIFACT_AUTHORIZATION_ID` changed exactly IA-010 → IA-011.
5. Semantic change count = **2**.
6. Exact-match retained (`raw !== EXPECTED_DBA_AUTHORIZATION_ID` → STOP).
7. Dual acceptance none.
8. Runtime env name `E02_DBA_AUTHORIZATION_ID` unchanged.
9. Guard unchanged.
10. Diagnostics unchanged.
11. Launcher unchanged.
12. CB-B unchanged.
13. Baseline mode unchanged.
14. HMD-002 restored migration unchanged.
15. W1 unchanged.
16. W2 unchanged.
17. HMD-004 migration unchanged.
18. July S1 migration unchanged.
19. Quarantine count remains **1**.
20. Verifier unchanged.
21. Package/tests/source unchanged.
22. `--plan` = `PLAN_OK`.
23. Plan reports LOCAL-011.
24. Plan reports IA-011.
25. Build **PASS**.
26. No DB/Supabase/Docker.
27. LOCAL-011 remains **NOT CONSUMED**.
28. LOCAL-011 remains **NOT EXECUTED**.
29. No LOCAL-012.
30. No RU-1.4 / REA / EIR.

If any material condition fails: **DO NOT** issue successful Completion · **RETURN TO GOVERNANCE**.

---

## 25. Successor Completion (reserved; not this task)

Reserve, **do not create**:

```
docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Completion-011.md
```

Expected future sequence:

```
E-02-BCR-IA-011
  → IMPLEMENT TWO-CONSTANT RETARGET
  → STATIC VERIFY
  → ISSUE COMPLETION-011
  → ONLY THEN LOCAL-011 MAY BECOME EXECUTION-ELIGIBLE
  → RUNTIME GATES
  → SINGLE GOVERNED APPLY
```

Do **not** collapse these steps. Issuing IA-011 alone does **NOT** make LOCAL-011 executable.

---

## 26. LOCAL-010 / LOCAL-011 locks

```
LOCAL-010 =
  APPLICATION_FAILED /
  NOT SUCCESSFULLY CONSUMED /
  EVIDENCE IMMUTABLE
LOCAL-010 RETRY = NOT AUTHORIZED

LOCAL-011 =
  APPROVED WITH CONDITIONS /
  NOT CONSUMED /
  EXECUTION GATED /
  NOT EXECUTED
```

Issuing **E-02-BCR-IA-011 does NOT itself unblock LOCAL-011 execution.**

After this IA issuance:

```
LOCAL-011 COMPATIBILITY =
  STILL BLOCKED UNTIL
  IA-011 RETARGET IMPLEMENTATION
  +
  COMPLETION-011
```

Do **not** retry LOCAL-010 · reclassify LOCAL-010 · overwrite LOCAL-010 evidence · dual-accept LOCAL-010 · treat retarget as retroactive repair of LOCAL-010.

No LOCAL-011 `--apply` in this task. No LOCAL-012.

---

## 27. Database / runtime lock (unchanged)

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

Nothing in IA-011 changes those statuses.

---

## 28. Next action (this issuance)

```
NEXT = IMPLEMENT E-02-BCR-IA-011 RETARGET
       REPOSITORY ONLY
```

The implementation should change **only two** authority constants. **Do not** execute LOCAL-011.

Successor Completion path (not created): `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Completion-011.md`.

---

## 29. File scope / prohibited work (this issuance confirmation)

This issuance task may modify **only**:

1. `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-011.md` (this document)
2. `docs/implementation/README.md` (minimal)

**No** artifact edit · **no** verifier edit · **no** environment-guard edit · **no** migration edit · **no** W1/W2 edit · **no** HMD-002/HMD-004 edit · **no** July S1 edit · **no** package/test edit · **no** quarantine change · **no** env-var mutation · **no** DB · **no** stateful Supabase · **no** Docker · **no** LOCAL-011 execution · **no** LOCAL-011 evidence · **no** LOCAL-012 · **no** Completion-011 · **no** RU-1.4 · **no** REA · **no** commit.

---

## 30. Lock statement

```
E-02-BCR-IA-011                            = APPROVED WITH CONDITIONS / NOT YET CONSUMED
AUTHORIZED CHANGE                          = DBA AUTHORIZATION-ID RETARGET ONLY
CURRENT DBA PIN                            = E-02-DBA-LOCAL-010
AUTHORIZED DBA PIN                         = E-02-DBA-LOCAL-011
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-010
AUTHORIZED ARTIFACT AUTHORITY              = E-02-BCR-IA-011
RUNTIME DBA ENV                            = E02_DBA_AUTHORIZATION_ID
EXACT-MATCH MODEL                          = RETAINED
DUAL ACCEPTANCE                            = NONE
SEMANTIC CHANGE COUNT                      = EXACTLY 2
DAA-014-C                                  = ISSUED / GUARD SEMANTICS UNCHANGED
GUARD                                      = DO NOT MODIFY
DIAGNOSTIC OBSERVABILITY                   = PRESERVE / DO NOT MODIFY
LAUNCHER                                   = UNCHANGED
CB-B                                       = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS / UNCHANGED
BASELINE MODE                              = E02_DECLARED_BASELINE_REPLAY / UNCHANGED
HMD-002                                    = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT
HMD-003                                    = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
HMD-004                                    = OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
W1                                         = UNCHANGED
W2                                         = UNCHANGED
HMD-004 TARGET MIGRATION                   = 20260320045054_enhance_dispute_resolution_system.sql / UNCHANGED
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql / COUNT 1
LOCAL-010                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-010 RETRY                            = NOT AUTHORIZED
LOCAL-011                                  = APPROVED WITH CONDITIONS / NOT CONSUMED / NOT EXECUTED
LOCAL-011 COMPATIBILITY                    = BLOCKED UNTIL E-02-BCR-IA-011 RETARGET IMPLEMENTATION + COMPLETION-011
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = IMPLEMENT E-02-BCR-IA-011 RETARGET / REPOSITORY ONLY
EXECUTABLE WORK                            = NONE
```

---

**End of document — E-02-BCR-IA-011 — v1.0 — 2026-08-27**
