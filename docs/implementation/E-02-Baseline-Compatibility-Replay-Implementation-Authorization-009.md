# E-02 — Baseline Compatibility Replay Artifact — Implementation Authorization (Successor)

## Authorization-ID Retarget Only · E-02-DBA-LOCAL-008 → E-02-DBA-LOCAL-009

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Authorization (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Artifact** | Governed Baseline-Compatibility Replay Artifact (class C) — **DBA authorization-ID retarget only** |
| **Authorization ID** | **E-02-BCR-IA-009** |
| **Predecessors** | **E-02-BCR-IA** · **E-02-BCR-IA-002** · **E-02-BCR-IA-003** · **E-02-BCR-IA-004** · **E-02-BCR-IA-005** · **E-02-BCR-IA-006** · **E-02-BCR-IA-007** · **E-02-BCR-IA-008** — all **CONSUMED / HISTORICAL / IMMUTABLE** |
| **Direct DBA authority aligned** | **E-02-DBA-LOCAL-009** — [`E-02-Database-Application-Authorization-LOCAL-009.md`](E-02-Database-Application-Authorization-LOCAL-009.md) (**APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED**) |
| **Reconstruction authority (read-only)** | **E-02-HFSOR-IA CONSUMED** · Completion **COMPLETED WITH NOTES** · PAD-051 **ISSUED / IMMUTABLE** |
| **Status** | **Approved With Conditions — NOT YET CONSUMED** |
| **Authority Level** | Implementation Authorization (repository implementation only) |
| **Effective Date** | 2026-08-25 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-009.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-009.md) |
| **Production Effect** | **None** |

> **Authority path finding: YES.** `E-02-Baseline-Compatibility-Replay-Implementation-Authorization-009.md` is **authority-safe** as the next **successor Implementation Authorization** in the existing BCR IA family (`…-Implementation-Authorization.md` → `-002` … `-008` → **`-009`**). ID **`E-02-BCR-IA-009`** parallels that series. Highest previously allocated successor is **E-02-BCR-IA-008** (**CONSUMED**). Distinct filename keeps predecessors **immutable**. **Not a new governance tier.** **Not a Clean-Base Design Amendment.** **Not a DBA.** **Not a PAD.** **Not a new diagnostic runtime class.** **Not a new BCR-CB architecture.** **Not a new defect by itself.** **Not a quarantine amendment.** **Not a reconstruction authorization.** **Not a RU-1.4 REA.**

> **Document class:** Bounded successor **Implementation Authorization** for **one future narrow repository retarget** of the replay artifact’s expected DBA authorization ID (and directly coupled truthful IA metadata). This issuance **does not implement** the retarget · **does not** modify the artifact · **does not** execute LOCAL-009 · **does not** run DB / Supabase / Docker · **does not** edit W1/W2 · **does not** change quarantine · **does not** re-implement diagnostic observability.

```
SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION = E-02-BCR-IA-009
DECISION                                   = APPROVED WITH CONDITIONS
PREDECESSORS (E-02-BCR-IA / -002 / -003 / -004 / -005 / -006 / -007 / -008)
                                           = CONSUMED / HISTORICAL / IMMUTABLE
AUTHORIZED ACTION                          = AUTHORIZATION-ID RETARGET ONLY
CURRENT ARTIFACT PIN                       = E-02-DBA-LOCAL-008
AUTHORIZED ARTIFACT PIN                    = E-02-DBA-LOCAL-009
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-008
AUTHORIZED ARTIFACT AUTHORITY              = E-02-BCR-IA-009
RUNTIME DBA ENV                            = E02_DBA_AUTHORIZATION_ID (UNCHANGED)
EXACT-MATCH MODEL                          = RETAINED (no dual-accept / prefix / regex / override)
SEMANTIC CHANGE COUNT                      = 2 (expected)
DIAGNOSTIC OBSERVABILITY                   = MUST REMAIN INTACT
CB-B ARCHITECTURE                          = RETAINED
LAUNCHER / STARTUP                         = UNCHANGED
CONTAINER LOG COLLECTION                   = NOT AUTHORIZED / NOT IMPLEMENTED
PROCESS KILL                               = NOT AUTHORIZED
PORT REMAP / STUDIO PORT                   = NOT AUTHORIZED
HMD-003 W1 / W2                            = UNTOUCHED
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
PAD-051                                    = ISSUED / IMMUTABLE
LOCAL-008                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-009                                  = APPROVED WITH CONDITIONS / NOT CONSUMED / STILL BLOCKED UNTIL RETARGET IMPLEMENTATION + COMPLETION
ARTIFACT EXECUTION                         = NOT AUTHORIZED BY THIS IA
THIS ISSUANCE                              ≠ IMPLEMENTATION · ≠ LOCAL-009 EXECUTION · ≠ RECONSTRUCTION EDIT
```

---

## 1. Authority path finding (this issuance)

| Question | Finding |
|----------|---------|
| Successor IA path | **YES** — `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-009.md` |
| Authorization ID | **E-02-BCR-IA-009** |
| Why | Existing BCR IA family already contains predecessor successor records; **E-02-BCR-IA-008** is **CONSUMED / HISTORICAL**; `-009` is the next unused successor; same Implementation Authorization class; no new tier |
| Sequence ambiguous? | **NO** |

**Successor Completion path finding (do not create now):**

```
docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Completion-009.md
```

ID parallel: `E-02-BCR-IA-009`. Same BCR Completion class. Predecessors remain immutable. **Not created in this task.**

---

## 2. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Database-Application-Authorization-LOCAL-009.md`](E-02-Database-Application-Authorization-LOCAL-009.md) | **Direct reason for this IA** — LOCAL-009 already issued; artifact pin stale at LOCAL-008; execution **BLOCKED** at compatibility gate |
| [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion.md) | HFSOR Completion **COMPLETED WITH NOTES** · reconstruction in repository · next was LOCAL-009 |
| [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) | PAD-051 **ISSUED / IMMUTABLE** · HFSO-009 pin retarget if required |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-008.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-008.md) | LOCAL-008 **APPLICATION_FAILED** at `20260320045054` (`relation "invoices" does not exist`) · **immutable** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-008.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-008.md) | Predecessor **E-02-BCR-IA-008 CONSUMED / HISTORICAL / IMMUTABLE** — current pin metadata |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-008.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-008.md) | IA-008 repository completion — **COMPLETED WITH NOTES** · **not reopened** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md) | **E-02-BCR-IA-006 CONSUMED** — diagnostic observability; **must remain intact** |
| PAD-011–PAD-025 / PAD-026–PAD-038 / PAD-039–PAD-050 | DAA · quarantine · forensic restoration — **not reopened** |
| Artifact (read-only, this issuance) | `scripts/verification/e02/replay-e02-declared-baseline.ts` |

No new Program Authority Decision required. No Clean-Base Design Amendment required. No new BCR-CB defect required. No reconstruction SQL change.

---

## 3. Pre-issuance STOP checks (read-only, 2026-08-25)

| Check | Result |
|-------|--------|
| LOCAL-009 file present | **YES** |
| LOCAL-009 status | **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED** |
| E-02-BCR-IA-008 | **CONSUMED** |
| Completion-008 | **COMPLETED WITH NOTES** |
| Artifact still pins LOCAL-008 | **YES** — `EXPECTED_DBA_AUTHORIZATION_ID = 'E-02-DBA-LOCAL-008'` |
| Artifact already accepts LOCAL-009 | **NO** |
| `ARTIFACT_AUTHORIZATION_ID` actual value | **`E-02-BCR-IA-008`** |
| Runtime env | `E02_DBA_AUTHORIZATION_ID` · exact-match fail-closed **retained** (`raw !== EXPECTED_DBA_AUTHORIZATION_ID`) |
| Diagnostic observability present | **YES** (`boundedSanitizedExcerpt` · stdout **and** stderr) |
| Quarantine | Exactly `20260314195641_add_demo_data.sql` · allowlist length **1** |
| W1 / W2 exist and are not quarantined | **YES** |
| HMD-002 restored file quarantined | **NO** |
| Conflicting BCR successor already issued | **NO** (`-009` does not exist) |
| Later authority superseding LOCAL-009 / making IA-009 unnecessary | **NO** |
| New architecture/design required | **NO** |
| Package/dependency required | **NO** |
| Change larger than ID retarget | **NO** |

**No STOP.** Issuance may proceed.

---

## 4. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-BCR-IA-009** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Status at issuance** | **APPROVED WITH CONDITIONS / NOT YET CONSUMED** |
| **Authorized action** | One future repository retarget of the replay artifact expected DBA ID + coupled truthful IA metadata |
| **Authorized transformation (1)** | `EXPECTED_DBA_AUTHORIZATION_ID`: `E-02-DBA-LOCAL-008` → `E-02-DBA-LOCAL-009` |
| **Authorized transformation (2)** | `ARTIFACT_AUTHORIZATION_ID`: `E-02-BCR-IA-008` → `E-02-BCR-IA-009` |
| **Expected semantic change count** | **2** |
| **Exact-match model** | **RETAINED** |
| **Implementation this task** | **NOT PERFORMED** |
| **LOCAL-009 execution** | **NOT AUTHORIZED by this IA** (remains blocked until retarget implementation + Completion) |

---

## 5. Purpose

Align the artifact’s **stale execution-authority pin** with the **already issued** DBA:

```
CURRENT   EXPECTED_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-008
REQUIRED  E02_DBA_AUTHORIZATION_ID      = E-02-DBA-LOCAL-009   (LOCAL-009)
AUTHORIZED RETARGET                     = E-02-DBA-LOCAL-009

CURRENT   ARTIFACT_AUTHORIZATION_ID     = E-02-BCR-IA-008
AUTHORIZED ARTIFACT AUTHORITY           = E-02-BCR-IA-009
```

This is **AUTHORIZATION-ID RETARGET ONLY**.

**Not:** CB-B redesign · replay redesign · migration change · W1/W2 edit · quarantine change · history-policy change · launcher redesign · preserve/cleanup redesign · verifier redesign · environment-guard redesign · diagnostic redesign · HMD-001/HMD-002/HMD-003 status change · database execution · LOCAL-009 execution · LOCAL-008 retry · LOCAL-010.

---

## 6. Why this change is authority-safe

LOCAL-009 is already formally issued as **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED**.

Retargeting the artifact to LOCAL-009 **does not fabricate authority**. It aligns the artifact with the current formally issued DBA. The change **must not create authority independently**.

```
No LOCAL-009  →  no retarget would have been permitted
```

The two HMD-003 reconstruction migrations remain ordinary repository inventory. This IA **does not** authorize additional reconstruction, reorder, or quarantine of W1/W2.

---

## 7. Exact authorized source scope (future implementation)

**May modify exactly one source file:**

```
scripts/verification/e02/replay-e02-declared-baseline.ts
```

| Allowed | Not allowed |
|---------|-------------|
| `EXPECTED_DBA_AUTHORIZATION_ID` value `E-02-DBA-LOCAL-008` → `E-02-DBA-LOCAL-009` | Dual-accept LOCAL-008 **or** LOCAL-009 |
| Comments / help strings that currently hardcode the stale expected DBA ID or stale IA ID, updated to match the new constants | Prefix / regex / `startsWith` / arrays of accepted IDs / env-provided expected ID / operator override / compatibility aliases |
| `ARTIFACT_AUTHORIZATION_ID` `E-02-BCR-IA-008` → `E-02-BCR-IA-009` so static IA metadata remains **truthful** | Weakening or disabling exact-match / `ReplayStop` validation |
| | Changing diagnostic capture / sanitization / `--debug` / cleanup-order |
| | Second source file · helper file · wildcard |
| | `verify-db-baseline.ts` · `environment-guard.ts` · package/lockfiles · tests · app source · migrations · Docker/Supabase config |

Runtime supplied value remains **`E02_DBA_AUTHORIZATION_ID`** and must still **exact-match** the expected ID. Fail-closed behavior **retained**.

After implementation: **LOCAL-008 must cease being the accepted future execution authority.** **LOCAL-009 is the sole expected DBA authorization.** Spoofing LOCAL-008 is **NOT AUTHORIZED**.

**This issuance task itself MUST NOT modify the artifact.**

README may be updated by the **future implementation task** only for governance bookkeeping if existing precedent requires it.

---

## 8. Exact-match security model (locked)

**Do not authorize:**

- accepting arbitrary DBA IDs
- prefix / suffix / regex / `startsWith`
- arrays of accepted DBA IDs
- LOCAL-008 **OR** LOCAL-009 dual acceptance
- fallback to LOCAL-008
- environment-provided expected IDs
- operator override of expected ID
- compatibility aliases
- bypassing exact match
- disabling / weakening `ReplayStop`
- warning-only mismatch

Required semantics after future implementation:

```
runtime DBA ID === E-02-DBA-LOCAL-009
Anything else → STOP
```

---

## 9. Replay / HMD-003 logic must remain unchanged

Future implementation **must not** modify:

- W1 / W2 reconstruction migrations
- migration enumeration
- migration ordering
- quarantine behavior / allowlist
- history recording / `recordApplied`
- application reset
- CB-B architecture
- launcher
- diagnostics
- stdout/stderr capture
- sanitization
- preserve/cleanup lifecycle
- environment disposition
- HMD status logic
- RU-1.1 / RU-1.2 tracking

The two reconstruction migrations remain part of the **ordinary** repository migration inventory. No special-case replay logic is authorized.

---

## 10. HMD-003 boundary

| Item | Status |
|------|--------|
| W1 | `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql` · **UNTOUCHED** |
| W2 | `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` · **UNTOUCHED** |
| Additional reconstruction migration | **NOT AUTHORIZED** |
| PAD-051 implementation | **UNCHANGED** |
| HMD-003 | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |

---

## 11. Quarantine

Exactly:

```
20260314195641_add_demo_data.sql
COUNT = 1
```

Do **not** quarantine W1, W2, or `20260315035847_add_meeting_templates_and_attachments.sql`.

---

## 12. Diagnostic observability must remain intact

IA-006 diagnostics **must remain intact**. Future implementation **must not** modify:

- `boundedSanitizedExcerpt`
- stdout / stderr capture
- bounded head/tail 8 KiB
- truncation flags
- process error classification (`PROCESS_DID_NOT_START` vs `PROCESS_EXITED_NONZERO`)
- internal start `--debug`
- capture-before-cleanup ordering

**No new diagnostic work. No container logs.**

---

## 13. CB-B / launcher / host readiness (unchanged)

**CB-B architecture = RETAINED.** `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` **unchanged**.

**Launcher / startup = UNCHANGED.** No Docker readiness implementation. No host-port remediation. Process kill **NOT AUTHORIZED**. Port remap **NOT AUTHORIZED**.

LOCAL-009 already owns Docker warm-engine and TCP **54323 FREE** gates. This IA does **not** implement those gates.

---

## 14. Defect classification

**NO NEW BCR-CB DEFECT REQUIRED / NOT ALLOCATED.**

This is a **stale authorization-ID pin** caused by successor DBA issuance (LOCAL-009), **not** a new CB-B architecture defect and **not** an HMD-003 reconstruction defect.

BCR-CB-001 / 002 / 003 / 004 remain **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING**.

---

## 15. Static verification authorized for future implementation

**Allowed (DB-free):** source inspection · grep · `git status` / `git diff` · BCR `--plan` · `npm run build`.

**Not allowed:** `--apply` · operational `--cleanup` · stateful Supabase · DB · Docker mutation · LOCAL-009 execution · baseline verifier against DB · RU-1.4.

---

## 16. Implementation Completion gate (future)

Future implementation + successor Completion must prove **all** of:

1. expected DBA pin changed only: LOCAL-008 → LOCAL-009  
2. artifact authority changed only: IA-008 → IA-009  
3. runtime env variable unchanged: `E02_DBA_AUTHORIZATION_ID`  
4. exact-match fail-closed retained  
5. no dual acceptance  
6. semantic change count = **2**  
7. HMD-003 W1 untouched  
8. HMD-003 W2 untouched  
9. HMD-002 restored migration untouched  
10. quarantine count remains **1**  
11. diagnostic observability preserved  
12. launcher preserved  
13. CB-B preserved  
14. verifier untouched  
15. environment guard untouched  
16. package/tests untouched  
17. `--plan` PASS  
18. plan reports `expectedDbaAuthorizationId=E-02-DBA-LOCAL-009`  
19. plan reports `artifactAuthorizationId=E-02-BCR-IA-009`  
20. `migrationCountDiscovered` remains consistent with current repository (currently **285** unless repository facts change)  
21. `quarantineCount=1`  
22. build PASS  
23. no DB/Supabase/Docker execution  
24. LOCAL-009 remains **NOT CONSUMED**  
25. no LOCAL-010  
26. no RU-1.4 / REA  

---

## 17. LOCAL-009 status after this IA (issuance only)

Issuing **E-02-BCR-IA-009 does NOT itself unblock LOCAL-009 execution.**

```
E-02-BCR-IA-009 = APPROVED WITH CONDITIONS / NOT YET CONSUMED
LOCAL-009       = APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED
                  / STILL BLOCKED UNTIL:
                    (1) IA-009 retarget implementation completes
                    AND
                    (2) BCR Completion-009 is issued
```

Do **not** execute LOCAL-009 in this task.

---

## 18. HMD / LOCAL / certification (unchanged)

| Item | Status |
|------|--------|
| HMD-001 | **OPEN / DISTINCT** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT** |
| HMD-003 | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |
| LOCAL-008 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-009 | **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED** |
| Database baseline verified | **NO** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| EIR / Acceptance / Certification | **UNCHANGED / BLOCKED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Final COMMIT path | **BLOCKED** |

---

## 19. Next action (this issuance)

```
NEXT = IMPLEMENT E-02-BCR-IA-009 RETARGET
```

**Not performed in this task.** Successor Completion path (not created): `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Completion-009.md`.

---

## 20. File scope / prohibited work (this issuance confirmation)

This issuance task may modify **only**:

1. `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-009.md` (this document)
2. `docs/implementation/README.md` (minimal)

**No** artifact edit · **no** verifier edit · **no** environment-guard edit · **no** migration edit · **no** W1/W2 edit · **no** package/test edit · **no** quarantine change · **no** DB · **no** stateful Supabase · **no** Docker · **no** LOCAL-009 execution · **no** LOCAL-010 · **no** Completion-009 · **no** RU-1.4 · **no** REA · **no** commit.

---

## 21. Lock statement

```
E-02-BCR-IA-009                            = APPROVED WITH CONDITIONS / NOT YET CONSUMED
DECISION                                   = APPROVED WITH CONDITIONS
AUTHORIZED CHANGE                          = DBA AUTHORIZATION-ID RETARGET ONLY
CURRENT DBA PIN                            = E-02-DBA-LOCAL-008
AUTHORIZED DBA PIN                         = E-02-DBA-LOCAL-009
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-008
AUTHORIZED ARTIFACT AUTHORITY              = E-02-BCR-IA-009
RUNTIME DBA ENV                            = E02_DBA_AUTHORIZATION_ID
EXACT-MATCH MODEL                          = RETAINED
DUAL ACCEPTANCE                            = NONE
AUTHORIZED SOURCE                          = scripts/verification/e02/replay-e02-declared-baseline.ts ONLY
SEMANTIC CHANGE COUNT                      = 2
DIAGNOSTIC OBSERVABILITY                   = PRESERVE / DO NOT MODIFY
CB-B ARCHITECTURE                          = RETAINED
LAUNCHER / STARTUP                         = UNCHANGED
HMD-003 W1 / W2                            = UNTOUCHED
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
HMD-001                                    = OPEN / DISTINCT
HMD-002                                    = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT
HMD-003                                    = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME PENDING
LOCAL-008                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-009                                  = APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION BLOCKED UNTIL RETARGET IMPLEMENTATION + COMPLETION
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = IMPLEMENT E-02-BCR-IA-009 RETARGET
SUCCESSOR COMPLETION (NOT CREATED)         = E-02-Baseline-Compatibility-Replay-Implementation-Completion-009.md
DO NOT MODIFY ARTIFACT IN THIS TASK · NO DATABASE COMMANDS · NO LOCAL-009 EXECUTION
```

---

**End of document — E-02-BCR-IA-009 — v1.0 — 2026-08-25**
