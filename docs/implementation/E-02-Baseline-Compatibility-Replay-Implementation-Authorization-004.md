# E-02 — Baseline Compatibility Replay Artifact — Implementation Authorization (Successor)

## Authorization-ID Retarget Only · E-02-DBA-LOCAL-004 → E-02-DBA-LOCAL-005

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Authorization (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Artifact** | Governed Baseline-Compatibility Replay Artifact (class C) — **DBA authorization-ID retarget only** |
| **Authorization ID** | **E-02-BCR-IA-004** |
| **Predecessors** | **E-02-BCR-IA** · **E-02-BCR-IA-002** · **E-02-BCR-IA-003** — all **CONSUMED / HISTORICAL / IMMUTABLE** |
| **Direct DBA authority aligned** | **E-02-DBA-LOCAL-005** — [`E-02-Database-Application-Authorization-LOCAL-005.md`](E-02-Database-Application-Authorization-LOCAL-005.md) (**APPROVED WITH CONDITIONS / NOT CONSUMED**) |
| **Status** | **Approved With Conditions** |
| **Authority Level** | Implementation Authorization (repository implementation only) |
| **Effective Date** | 2026-08-24 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-004.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-004.md) |
| **Production Effect** | **None** |

> **Authority path finding:** `E-02-Baseline-Compatibility-Replay-Implementation-Authorization-004.md` is **authority-safe** as the next **successor Implementation Authorization** in the existing BCR IA family (`…-Implementation-Authorization.md` → `-002` → `-003` → **`-004`**). ID **`E-02-BCR-IA-004`** parallels that series. Distinct filename keeps predecessors **immutable**. **Not a new governance tier.** **Not a Clean-Base Design Amendment.** **Not a DBA.** **Not a quarantine amendment.** **Not a RU-1.4 REA.**

> **Document class:** Bounded successor **Implementation Authorization** for **one future narrow repository retarget** of the replay artifact’s expected DBA authorization ID. This issuance **does not implement** the retarget · **does not** modify the artifact · **does not** execute LOCAL-005 · **does not** run DB / Supabase / Docker.

```
SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION = E-02-BCR-IA-004
DECISION                                   = APPROVED WITH CONDITIONS
PREDECESSORS (E-02-BCR-IA / -IA-002 / -IA-003)
                                           = CONSUMED / HISTORICAL / IMMUTABLE
AUTHORIZED ACTION                          = AUTHORIZATION-ID RETARGET ONLY
CURRENT ARTIFACT PIN                       = E-02-DBA-LOCAL-004
AUTHORIZED ARTIFACT PIN                    = E-02-DBA-LOCAL-005
EXACT-MATCH MODEL                          = RETAINED (no dual-accept / prefix / regex / override)
CB-B ARCHITECTURE                          = RETAINED
BCR-CB-001 / 002 / 003 / 004               = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
NEW BCR DEFECT                             = NOT REQUIRED / NOT ALLOCATED
ARTIFACT EXECUTION                         = NOT AUTHORIZED BY THIS IA
LOCAL-005                                  = APPROVED WITH CONDITIONS / NOT CONSUMED / STILL BLOCKED UNTIL RETARGET IMPLEMENTATION COMPLETES
THIS ISSUANCE                              ≠ IMPLEMENTATION · ≠ LOCAL-005 EXECUTION
```

---

## 1. Authority path finding (this issuance)

| Question | Finding |
|----------|---------|
| Successor IA path | **YES** — `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-004.md` |
| Authorization ID | **E-02-BCR-IA-004** |
| Why | Existing BCR IA family already contains predecessor successor records; **E-02-BCR-IA-003** is **CONSUMED / HISTORICAL**; `-004` is the next unused successor; same Implementation Authorization class; no new tier |

**Successor Completion path finding (do not create now):**

Clean-Base Implementation Completion naming (`…-Clean-Base-Implementation-Completion.md` / `-002.md`) is reserved for **CB-B / BCR-CB-00x remediations** (IA-002 → unlabeled Clean-Base Completion; IA-003 → Clean-Base Completion-002). **E-02-BCR-IA-004 is not a clean-base redesign.** Using `…-Clean-Base-Implementation-Completion-003.md` would **misclassify** this retarget as a third clean-base remediation and reopen CB-B architecture.

**Authority-safe successor Completion after future implementation:**

```
docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Completion-004.md
```

ID parallel: `E-02-BCR-IA-004`. Same BCR Completion class. Predecessors remain immutable. **Not created in this task.**

---

## 2. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Database-Application-Authorization-LOCAL-005.md`](E-02-Database-Application-Authorization-LOCAL-005.md) | **Direct reason for this IA** — LOCAL-005 already issued; artifact pin stale; execution **BLOCKED** at compatibility gate |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md) | Predecessor **E-02-BCR-IA-003 CONSUMED / HISTORICAL / IMMUTABLE** — implemented the exact-pin model (currently still `E-02-DBA-LOCAL-004`) |
| [`E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion-002.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion-002.md) | IA-003 repository completion — **COMPLETED WITH NOTES** · **not reopened** |
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md) | HMD-002 source restoration — **COMPLETED WITH NOTES** |
| [`E-02-Database-Application-Authorization-LOCAL-004.md`](E-02-Database-Application-Authorization-LOCAL-004.md) · evidence | LOCAL-004 **FAILED / IMMUTABLE** — **not retried** |
| PAD-026–PAD-038 / PAD-039–PAD-050 / PAD-011–PAD-025 | Quarantine · forensic restoration exception · DAA mechanism — **not reopened** |
| Artifact (read-only, this issuance) | `scripts/verification/e02/replay-e02-declared-baseline.ts` |

No new Program Authority Decision required. No Clean-Base Design Amendment required.

---

## 3. Pre-issuance STOP checks (read-only, 2026-08-24)

| Check | Result |
|-------|--------|
| LOCAL-005 file present | **YES** |
| LOCAL-005 status | **APPROVED WITH CONDITIONS / NOT CONSUMED** |
| Artifact still pins LOCAL-004 | **YES** — `EXPECTED_DBA_AUTHORIZATION_ID = 'E-02-DBA-LOCAL-004'` |
| Artifact already accepts LOCAL-005 | **NO** |
| `ARTIFACT_AUTHORIZATION_ID` | `E-02-BCR-IA-003` (static IA metadata; **not** DBA execution authority) |
| Quarantine | Exactly `20260314195641_add_demo_data.sql` · allowlist length **1** |
| Restored migration quarantined | **NO** |
| Option B | **NOT AUTHORIZED** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING** |
| PAD/HMIR superseded | **NO** |
| Conflicting BCR successor already issued | **NO** (`-004` does not exist) |
| New architecture/design required | **NO** |
| Package/dependency required | **NO** |
| Change larger than ID retarget | **NO** |

**No STOP.** Issuance may proceed.

---

## 4. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-BCR-IA-004** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Authorized action** | One future repository retarget of the replay artifact expected DBA ID |
| **Authorized transformation** | `EXPECTED_DBA_AUTHORIZATION_ID`: `E-02-DBA-LOCAL-004` → `E-02-DBA-LOCAL-005` |
| **Exact-match model** | **RETAINED** |
| **Implementation this task** | **NOT PERFORMED** |
| **Artifact execution** | **NOT AUTHORIZED** |
| **LOCAL-005 execution** | **NOT AUTHORIZED by this IA** (remains blocked until retarget implementation + Completion) |

---

## 5. Purpose

Align the artifact’s **stale execution-authority pin** with the **already issued** DBA:

```
CURRENT   EXPECTED_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-004
REQUIRED  E02_DBA_AUTHORIZATION_ID      = E-02-DBA-LOCAL-005   (LOCAL-005)
AUTHORIZED RETARGET                     = E-02-DBA-LOCAL-005
```

This is **AUTHORIZATION-ID RETARGET ONLY**.

**Not:** CB-B redesign · replay redesign · migration change · quarantine change · history-policy change · launcher redesign · preserve/cleanup redesign · verifier redesign · environment-guard redesign · HMD-001/HMD-002 change · database execution · LOCAL-005 execution.

---

## 6. Why this change is authority-safe

LOCAL-005 is already formally issued as **APPROVED WITH CONDITIONS / NOT CONSUMED**.

Retargeting the artifact to LOCAL-005 **does not fabricate authority**. It aligns the artifact with the current formally issued DBA. The change **must not create authority independently**.

```
No LOCAL-005  →  no retarget would have been permitted
```

---

## 7. Exact authorized source scope (future implementation)

**May modify exactly one source file:**

```
scripts/verification/e02/replay-e02-declared-baseline.ts
```

**Only** the narrow authorization-ID expectation necessary to accept `E-02-DBA-LOCAL-005`, plus **directly coupled truthful metadata** so the artifact does not lie after the retarget:

| Allowed | Not allowed |
|---------|-------------|
| `EXPECTED_DBA_AUTHORIZATION_ID` value `E-02-DBA-LOCAL-004` → `E-02-DBA-LOCAL-005` | Dual-accept LOCAL-004 **or** LOCAL-005 |
| Comments / help strings that currently hardcode the stale expected DBA ID, updated to match the new constant | Prefix / regex / env-provided expected ID / operator override |
| `ARTIFACT_AUTHORIZATION_ID` `E-02-BCR-IA-003` → `E-02-BCR-IA-004` so static IA metadata remains **truthful** | Weakening or disabling exact-match validation |
| | Second source file · helper file · wildcard |

Runtime supplied value remains **`E02_DBA_AUTHORIZATION_ID`** and must still **exact-match** the expected ID. Fail-closed behavior **retained**.

**This issuance task itself MUST NOT modify the artifact.**

README may be updated by the **future implementation task** only for governance bookkeeping if existing precedent requires it.

---

## 8. Exact-match security model (locked)

**Do not authorize:**

- accepting arbitrary DBA IDs
- prefix matching
- regex matching
- LOCAL-004 **OR** LOCAL-005 dual acceptance
- environment-provided expected IDs
- operator override of expected ID
- bypassing exact match
- disabling validation
- weakening fail-closed behavior

After implementation: **LOCAL-004 is no longer accepted as current expected authority.** **LOCAL-005 is the sole expected DBA authorization.**

---

## 9. Predecessor / history rule

| Record | Status |
|--------|--------|
| E-02-BCR-IA | **CONSUMED / HISTORICAL / IMMUTABLE** |
| E-02-BCR-IA-002 | **CONSUMED / HISTORICAL / IMMUTABLE** |
| E-02-BCR-IA-003 | **CONSUMED / HISTORICAL / IMMUTABLE** |
| E-02-DBA-LOCAL-004 | **FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| E-02-DBA-LOCAL-005 | **APPROVED WITH CONDITIONS / NOT CONSUMED** |

Do **not** rewrite historical records. Do **not** retry or reclassify LOCAL-004.

---

## 10. BCR core must remain unchanged

Future implementation **must not** change:

migration enumeration · deterministic ordering · quarantine logic / allowlist · data-only guard · downstream UUID guard · `schema_migrations` adapter · truthful history bookkeeping · `recordApplied` behavior · application-layer reset · auxiliary project creation · empty auxiliary migrations rule · platform baseline validation · real repository migration source · local DB URL discovery · launcher implementation · command allowlist · Windows ComSpec strategy · `shell:false` policy · error semantics · preserve-environment lifecycle · explicit cleanup lifecycle · manifest-before-handoff ordering · RU-1.1 tracking · RU-1.2 tracking · failure policy.

**CB-B architecture = RETAINED.** `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` **unchanged**.

---

## 11. Quarantine / Option B

```
quarantinedMigrations = [ 20260314195641_add_demo_data.sql ]
count                 = 1
```

`20260315035847_add_meeting_templates_and_attachments.sql` = **NOT QUARANTINED**.

No second baseline compatibility exception. Option B = **NOT AUTHORIZED**.

---

## 12. Historical migration restoration boundary

HMD-002 restoration is complete at **repository-source level only**:

```
HMD-002 = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
```

This IA **does not** authorize any migration modification.

**DO NOT touch:**

```
supabase/migrations/20260315035847_add_meeting_templates_and_attachments.sql
```

Do not normalize line endings. Do not alter the six forensic restorations. Do not expand PAD-039–PAD-050.

---

## 13. Verifier / environment-guard / package

| Path | This IA |
|------|---------|
| `scripts/verification/e02/verify-db-baseline.ts` | **UNCHANGED / NOT AUTHORIZED** |
| `scripts/verification/e02/environment-guard.ts` | **UNCHANGED / NOT AUTHORIZED** |
| `package.json` / lockfiles | **UNCHANGED / NOT AUTHORIZED** |
| tests / RU-1.4 harness | **UNCHANGED / NOT AUTHORIZED** |

`E02_BASELINE_VERIFICATION_AUTHORIZED` remains the DBA baseline gate. RU-1.4 remains separate. If implementation unexpectedly requires a dependency: **STOP → GOVERNANCE.**

---

## 14. Defect classification

**NO NEW BCR-CB DEFECT REQUIRED / NOT ALLOCATED.**

This is a **stale authorization-ID pin** discovered by LOCAL-005’s **intentional** pre-execution compatibility gate after a successor DBA was issued. It is **not** a failure of CB-B architecture, launcher, lifecycle, or verifier separation.

**Do not reopen** BCR-CB-001 / 002 / 003 / 004. They remain:

```
IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
```

---

## 15. Static verification authorized for future implementation

**Allowed (DB-free):** source inspection · exact grep/search · `git diff` / `--numstat` · replay artifact `--plan` · `npm run build` · non-mutating help/version if genuinely necessary.

**Not allowed:** `--apply` · operational `--cleanup` · `supabase init/start/status/stop` · DB connections · baseline verifier against DB · Docker · LOCAL-005 execution · RU-1.4.

---

## 16. Implementation Completion gate (future)

Future implementation + successor Completion must prove at least:

1. only authorized artifact source changed  
2. expected DBA ID changed from LOCAL-004 to LOCAL-005  
3. exact-match semantics retained  
4. runtime variable remains `E02_DBA_AUTHORIZATION_ID`  
5. arbitrary ID acceptance not introduced  
6. LOCAL-004 is no longer accepted as current expected authority  
7. LOCAL-005 is the sole expected DBA authorization  
8. `artifactAuthorizationId` / BCR IA metadata remains truthful (`E-02-BCR-IA-004`)  
9. CB-B architecture unchanged  
10. quarantine exactly one and unchanged  
11. restored migration untouched  
12. migration enumeration/order unchanged  
13. truthful history unchanged  
14. launcher unchanged  
15. preserve/cleanup unchanged  
16. verifier unchanged  
17. environment guard unchanged  
18. package/tests unchanged  
19. `--plan` PASS  
20. `npm run build` PASS  
21. no DB/Supabase/Docker  
22. LOCAL-005 still **NOT CONSUMED**  
23. runtime verification still pending  
24. HMD-002 still **not CLOSED**

---

## 17. LOCAL-005 status after this IA (issuance only)

Issuing **E-02-BCR-IA-004 does NOT itself unblock LOCAL-005.**

```
E-02-BCR-IA-004 = APPROVED WITH CONDITIONS / NOT YET CONSUMED
LOCAL-005       = APPROVED WITH CONDITIONS / NOT CONSUMED
                  / EXECUTION STILL BLOCKED UNTIL RETARGET IMPLEMENTATION COMPLETES
```

Only after **IA-004 implementation · static verification · successor BCR Completion** may governance consider the artifact compatible for LOCAL-005 execution.

**Do not execute LOCAL-005 in this task.** This IA does **not** authorize database execution. Future LOCAL-005 remains responsible for fresh aux · empty migrations · platform baseline · real-repo replay · one-file quarantine · truthful history · HMD-002 restored-migration replay · RU-1.1/RU-1.2 apply · manifest · preserve · separate baseline verifier · evidence · explicit cleanup.

---

## 18. HMD / LOCAL / certification (unchanged)

| Item | Status |
|------|--------|
| HMD-001 | **OPEN** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING** — not CLOSED / not RUNTIME VERIFIED / not DATABASE VERIFIED |
| LOCAL-004 | **FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Database baseline verified | **NO** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| EIR PASS | **NONE** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Acceptance | **ACCEPTANCE_BLOCKED** (unchanged) |
| Project Certification | **NOT ISSUED** (unchanged) |
| Final COMMIT path | **BLOCKED** |

---

## 19. Governance chain

```
E-02-BCR-IA-004 (this document)
  → IMPLEMENT AUTHORIZATION-ID RETARGET (replay-e02-declared-baseline.ts only)
  → E-02-Baseline-Compatibility-Replay-Implementation-Completion-004.md
  → THEN LOCAL-005 execution compatibility gate may PASS
  → EXECUTE E-02-DBA-LOCAL-005 (separate task; not this IA)
  → E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md
  → E-02-RU-1.4-REA ONLY IF APPLIED_AND_BASELINE_VERIFIED
```

**Completion and LOCAL-005 execution are not this task.**

---

## 20. Next action (this issuance)

```
NEXT = IMPLEMENT E-02-BCR-IA-004 RETARGET
```

Not implemented in this task.

---

## 21. File scope / prohibited work (this issuance confirmation)

This issuance may modify **only**:

1. `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-004.md` (this document)
2. `docs/implementation/README.md` (minimal)

**No** artifact edit · **no** verifier edit · **no** environment-guard edit · **no** migration edit · **no** package/test edit · **no** git commit · **no** DB / Supabase / Docker · **no** LOCAL-005 execution · **no** LOCAL-005 evidence · **no** Completion · **no** REA.

---

## 22. Lock statement

```
E-02-BCR-IA-004                            = APPROVED WITH CONDITIONS / NOT YET CONSUMED
DECISION                                   = APPROVED WITH CONDITIONS
AUTHORIZED CHANGE                          = REPLAY ARTIFACT DBA AUTHORIZATION-ID RETARGET ONLY
CURRENT ARTIFACT PIN                       = E-02-DBA-LOCAL-004
AUTHORIZED ARTIFACT PIN                    = E-02-DBA-LOCAL-005
EXACT-MATCH MODEL                          = RETAINED
AUTHORIZED SOURCE                          = scripts/verification/e02/replay-e02-declared-baseline.ts ONLY
CB-B ARCHITECTURE                          = RETAINED
BCR-CB-001                                 = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-002                                 = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-003                                 = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-004                                 = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
NEW BCR DEFECT                             = NOT REQUIRED / NOT ALLOCATED
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
HMD-001                                    = OPEN
HMD-002                                    = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
LOCAL-004                                  = FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-005                                  = APPROVED WITH CONDITIONS / NOT CONSUMED / STILL BLOCKED UNTIL RETARGET
DATABASE APPLICATION                       = AUTHORIZED TO BEGIN / GATED / NOT EXECUTED
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = IMPLEMENT E-02-BCR-IA-004 RETARGET
SUCCESSOR COMPLETION (NOT CREATED)         = E-02-Baseline-Compatibility-Replay-Implementation-Completion-004.md
DO NOT MODIFY ARTIFACT IN THIS TASK · NO DATABASE COMMANDS · NO LOCAL-005 EXECUTION
```

---

**End of document — E-02-BCR-IA-004 — v1.0 — 2026-08-24**
