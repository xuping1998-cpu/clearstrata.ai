# E-02 — Baseline Compatibility Replay Artifact — Implementation Authorization (Successor)

## Authorization-ID Retarget Only · E-02-DBA-LOCAL-007 → E-02-DBA-LOCAL-008

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Authorization (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Artifact** | Governed Baseline-Compatibility Replay Artifact (class C) — **DBA authorization-ID retarget only** |
| **Authorization ID** | **E-02-BCR-IA-008** |
| **Predecessors** | **E-02-BCR-IA** · **E-02-BCR-IA-002** · **E-02-BCR-IA-003** · **E-02-BCR-IA-004** · **E-02-BCR-IA-005** · **E-02-BCR-IA-006** · **E-02-BCR-IA-007** — all **CONSUMED / HISTORICAL / IMMUTABLE** |
| **Direct DBA authority aligned** | **E-02-DBA-LOCAL-008** — [`E-02-Database-Application-Authorization-LOCAL-008.md`](E-02-Database-Application-Authorization-LOCAL-008.md) (**APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED**) |
| **Status** | **Approved With Conditions** |
| **Authority Level** | Implementation Authorization (repository implementation only) |
| **Effective Date** | 2026-08-24 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-008.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-008.md) |
| **Production Effect** | **None** |

> **Authority path finding: YES.** `E-02-Baseline-Compatibility-Replay-Implementation-Authorization-008.md` is **authority-safe** as the next **successor Implementation Authorization** in the existing BCR IA family (`…-Implementation-Authorization.md` → `-002` … `-007` → **`-008`**). ID **`E-02-BCR-IA-008`** parallels that series. Distinct filename keeps predecessors **immutable**. **Not a new governance tier.** **Not a Clean-Base Design Amendment.** **Not a DBA.** **Not a PAD.** **Not a new diagnostic runtime class.** **Not a new BCR-CB architecture.** **Not a new defect by itself.** **Not a quarantine amendment.** **Not a port-remediation authorization.** **Not a process-kill authorization.** **Not a RU-1.4 REA.**

> **Document class:** Bounded successor **Implementation Authorization** for **one future narrow repository retarget** of the replay artifact’s expected DBA authorization ID (and directly coupled truthful IA metadata). This issuance **does not implement** the retarget · **does not** modify the artifact · **does not** execute LOCAL-008 · **does not** run DB / Supabase / Docker · **does not** kill processes · **does not** remap ports · **does not** re-implement diagnostic observability · **does not** remediate the confirmed TCP 54323 host collision.

```
SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION = E-02-BCR-IA-008
DECISION                                   = APPROVED WITH CONDITIONS
PREDECESSORS (E-02-BCR-IA / -002 / -003 / -004 / -005 / -006 / -007)
                                           = CONSUMED / HISTORICAL / IMMUTABLE
AUTHORIZED ACTION                          = AUTHORIZATION-ID RETARGET ONLY
CURRENT ARTIFACT PIN                       = E-02-DBA-LOCAL-007
AUTHORIZED ARTIFACT PIN                    = E-02-DBA-LOCAL-008
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-007
AUTHORIZED ARTIFACT AUTHORITY              = E-02-BCR-IA-008
RUNTIME DBA ENV                            = E02_DBA_AUTHORIZATION_ID (UNCHANGED)
EXACT-MATCH MODEL                          = RETAINED (no dual-accept / prefix / regex / override)
SEMANTIC CHANGE COUNT                      = 2 (expected)
DIAGNOSTIC OBSERVABILITY                   = MUST REMAIN INTACT (IA-006; runtime-exercised by LOCAL-007)
CB-B ARCHITECTURE                          = RETAINED
LAUNCHER / STARTUP                         = UNCHANGED
CONTAINER LOG COLLECTION                   = NOT AUTHORIZED / NOT IMPLEMENTED
PROCESS KILL                               = NOT AUTHORIZED
PORT REMAP / STUDIO PORT                   = NOT AUTHORIZED
BCR-CB-001 / 002 / 003 / 004               = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
NEW BCR DEFECT                             = NOT REQUIRED / NOT ALLOCATED
ARTIFACT EXECUTION                         = NOT AUTHORIZED BY THIS IA
LOCAL-005 / LOCAL-006 / LOCAL-007          = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-007 ROOT CAUSE                       = CONFIRMED HOST TCP 54323 COLLISION
LOCAL-008                                  = APPROVED WITH CONDITIONS / NOT CONSUMED / STILL BLOCKED UNTIL RETARGET IMPLEMENTATION COMPLETES
NEXT RUNTIME CLASS                         = DATABASE APPLICATION ATTEMPT WITH ENHANCED DIAGNOSTICS
                                             AND STRICT HOST-PORT READINESS PRECONDITION
DOCKER PRE-WARM                            = MANDATORY (governed by LOCAL-008; not implemented here)
HOST TCP 54323 GATE                        = MANDATORY FREE (governed by LOCAL-008; not implemented here)
THIS ISSUANCE                              ≠ IMPLEMENTATION · ≠ LOCAL-008 EXECUTION · ≠ HOST REMEDIATION
```

---

## 1. Authority path finding (this issuance)

| Question | Finding |
|----------|---------|
| Successor IA path | **YES** — `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-008.md` |
| Authorization ID | **E-02-BCR-IA-008** |
| Why | Existing BCR IA family already contains predecessor successor records; **E-02-BCR-IA-007** is **CONSUMED / HISTORICAL**; `-008` is the next unused successor; same Implementation Authorization class; no new tier |

**Successor Completion path finding (do not create now):**

Clean-Base Implementation Completion naming remains reserved for **CB-B / BCR-CB-00x remediations**. **E-02-BCR-IA-008 is not a clean-base redesign.**

**Authority-safe successor Completion after future implementation** (existing BCR Implementation Completion family):

```
docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Completion-008.md
```

ID parallel: `E-02-BCR-IA-008`. Same BCR Completion class. Predecessors remain immutable. **Not created in this task.**

---

## 2. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Database-Application-Authorization-LOCAL-008.md`](E-02-Database-Application-Authorization-LOCAL-008.md) | **Direct reason for this IA** — LOCAL-008 already issued; artifact pin stale at LOCAL-007; execution **BLOCKED** at compatibility gate |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-007.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-007.md) | LOCAL-007 **APPLICATION_FAILED** at auxiliary `supabase start` on pre-warmed engine · **confirmed TCP 54323 bind collision** (`LegacyContainerStartError`) · **immutable** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md) | LOCAL-006 **APPLICATION_FAILED** · **immutable** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md) | LOCAL-005 **APPLICATION_FAILED** · **immutable** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-007.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-007.md) | Predecessor **E-02-BCR-IA-007 CONSUMED / HISTORICAL / IMMUTABLE** — current pin metadata |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-007.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-007.md) | IA-007 repository completion — **COMPLETED WITH NOTES** · **not reopened** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md) | **E-02-BCR-IA-006 CONSUMED** — diagnostic observability; **must remain intact** |
| PAD-026–PAD-038 / PAD-039–PAD-050 / PAD-011–PAD-025 | Quarantine · forensic restoration exception · DAA mechanism — **not reopened** |
| Artifact (read-only, this issuance) | `scripts/verification/e02/replay-e02-declared-baseline.ts` |

No new Program Authority Decision required. No Clean-Base Design Amendment required. No new BCR-CB defect required. No second diagnostic implementation authorization. No host-port remediation authorization.

---

## 3. Pre-issuance STOP checks (read-only, 2026-08-24)

| Check | Result |
|-------|--------|
| LOCAL-008 file present | **YES** |
| LOCAL-008 status | **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED** |
| E-02-BCR-IA-007 | **CONSUMED** |
| Completion-007 | **COMPLETED WITH NOTES** |
| Artifact still pins LOCAL-007 | **YES** — `EXPECTED_DBA_AUTHORIZATION_ID = 'E-02-DBA-LOCAL-007'` |
| Artifact already accepts LOCAL-008 | **NO** |
| `ARTIFACT_AUTHORIZATION_ID` actual value | **`E-02-BCR-IA-007`** (static IA metadata; **not** DBA execution authority) |
| Runtime env | `E02_DBA_AUTHORIZATION_ID` · exact-match fail-closed **retained** (`raw !== EXPECTED_DBA_AUTHORIZATION_ID`) |
| Diagnostic observability present | **YES** (`boundedSanitizedExcerpt` · stdout **and** stderr · internal `start --debug`) |
| Container-log collection | **ABSENT / NOT AUTHORIZED** |
| Quarantine | Exactly `20260314195641_add_demo_data.sql` · allowlist length **1** |
| Restored migration quarantined | **NO** |
| Option B | **NOT AUTHORIZED** |
| LOCAL-007 evidence TCP 54323 collision | **YES** (`LegacyContainerStartError`) |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING** |
| LOCAL-005 / LOCAL-006 / LOCAL-007 | **APPLICATION_FAILED / IMMUTABLE** — **not retried** |
| Conflicting BCR successor already issued | **NO** (`-008` does not exist) |
| Later authority superseding LOCAL-008 / making IA-008 unnecessary | **NO** |
| New architecture/design required | **NO** |
| Package/dependency required | **NO** |
| Change larger than ID retarget | **NO** |

**No STOP.** Issuance may proceed.

---

## 4. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-BCR-IA-008** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Status at issuance** | **APPROVED WITH CONDITIONS / NOT YET CONSUMED** |
| **Authorized action** | One future repository retarget of the replay artifact expected DBA ID + coupled truthful IA metadata |
| **Authorized transformation (1)** | `EXPECTED_DBA_AUTHORIZATION_ID`: `E-02-DBA-LOCAL-007` → `E-02-DBA-LOCAL-008` |
| **Authorized transformation (2)** | `ARTIFACT_AUTHORIZATION_ID`: `E-02-BCR-IA-007` → `E-02-BCR-IA-008` |
| **Expected semantic change count** | **2** |
| **Exact-match model** | **RETAINED** |
| **Diagnostic observability** | **MUST REMAIN INTACT** |
| **Implementation this task** | **NOT PERFORMED** |
| **Artifact execution** | **NOT AUTHORIZED** |
| **LOCAL-008 execution** | **NOT AUTHORIZED by this IA** (remains blocked until retarget implementation + Completion; Docker pre-warm and TCP 54323 FREE remain LOCAL-008’s gates) |

---

## 5. Purpose

Align the artifact’s **stale execution-authority pin** with the **already issued** DBA:

```
CURRENT   EXPECTED_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-007
REQUIRED  E02_DBA_AUTHORIZATION_ID      = E-02-DBA-LOCAL-008   (LOCAL-008)
AUTHORIZED RETARGET                     = E-02-DBA-LOCAL-008

CURRENT   ARTIFACT_AUTHORIZATION_ID     = E-02-BCR-IA-007
AUTHORIZED ARTIFACT AUTHORITY           = E-02-BCR-IA-008
```

This is **AUTHORIZATION-ID RETARGET ONLY**.

**Not:** CB-B redesign · replay redesign · migration change · quarantine change · history-policy change · launcher redesign · preserve/cleanup redesign · verifier redesign · environment-guard redesign · Docker readiness code · Studio workaround · port remap · process kill · second diagnostic implementation · container-log collection · HMD-001/HMD-002 change · database execution · LOCAL-008 execution · LOCAL-005/006/007 retry.

---

## 6. Why this change is authority-safe

LOCAL-008 is already formally issued as **APPROVED WITH CONDITIONS / NOT CONSUMED**.

Retargeting the artifact to LOCAL-008 **does not fabricate authority**. It aligns the artifact with the current formally issued DBA. The change **must not create authority independently**.

```
No LOCAL-008  →  no retarget would have been permitted
```

The confirmed LOCAL-007 host TCP **54323** collision remains a **LOCAL-008 host-readiness gate**, **not** a BCR code defect. This IA **does not** authorize a code fix, process kill, or port remap for that failure.

---

## 7. Exact authorized source scope (future implementation)

**May modify exactly one source file:**

```
scripts/verification/e02/replay-e02-declared-baseline.ts
```

**Only** the narrow authorization-ID expectation necessary to accept `E-02-DBA-LOCAL-008`, plus **directly coupled truthful metadata** so the artifact does not lie after the retarget:

| Allowed | Not allowed |
|---------|-------------|
| `EXPECTED_DBA_AUTHORIZATION_ID` value `E-02-DBA-LOCAL-007` → `E-02-DBA-LOCAL-008` | Dual-accept LOCAL-007 **or** LOCAL-008 |
| Comments / help strings that currently hardcode the stale expected DBA ID or stale IA ID, updated to match the new constants | Prefix / regex / `startsWith` / arrays of accepted IDs / env-provided expected ID / operator override / compatibility aliases |
| `ARTIFACT_AUTHORIZATION_ID` `E-02-BCR-IA-007` → `E-02-BCR-IA-008` so static IA metadata remains **truthful** | Weakening or disabling exact-match / `ReplayStop` validation |
| | Changing diagnostic capture / sanitization / `--debug` / cleanup-order |
| | Second source file · helper file · wildcard |
| | Port / Studio / `config.toml` / Docker / process-kill logic |

Runtime supplied value remains **`E02_DBA_AUTHORIZATION_ID`** and must still **exact-match** the expected ID. Fail-closed behavior **retained**.

After implementation: **LOCAL-007 must cease being the accepted future execution authority.** **LOCAL-008 is the sole expected DBA authorization.** Spoofing LOCAL-007 is **NOT AUTHORIZED**.

**This issuance task itself MUST NOT modify the artifact.**

README may be updated by the **future implementation task** only for governance bookkeeping if existing precedent requires it.

---

## 8. Exact-match security model (locked)

**Do not authorize:**

- accepting arbitrary DBA IDs
- prefix matching
- suffix matching
- regex matching
- `startsWith`
- arrays of accepted DBA IDs
- LOCAL-007 **OR** LOCAL-008 dual acceptance
- fallback to LOCAL-007
- environment-provided expected IDs
- operator override of expected ID
- compatibility aliases
- bypassing exact match
- disabling / weakening `ReplayStop`
- spoofing LOCAL-007
- warning-only mismatch

Required semantics after future implementation:

```
runtime DBA ID === E-02-DBA-LOCAL-008
Anything else → STOP
```

---

## 9. Diagnostic observability must remain intact

IA-006 / Completion-006 diagnostics **must remain intact**. They were **runtime-exercised** by LOCAL-007. Future implementation **must not** modify:

- `boundedSanitizedExcerpt` behavior
- stdout capture
- stderr capture
- bounded head/tail excerpts
- truncation flags / metadata
- sanitization
- elapsed time / exit / signal / timeout metadata
- `PROCESS_DID_NOT_START` vs `PROCESS_EXITED_NONZERO`
- diagnostic manifest fields (`cliFailureSubcommand` · `cliFailureClass` · `cliExitCode` · `cliSignal` · `cliElapsedMs` · `cliStdoutExcerpt` · `cliStderrExcerpt` · `cliStdoutTruncated` · `cliStderrTruncated` · `cliDebugEnabled` · `cliTimedOut`)
- internal start `--debug` behavior
- diagnostic persistence-before-cleanup ordering

**E-02-BCR-IA-008 is NOT a diagnostic redesign authorization.** Do **not** expand diagnostic scope.

```
CONTAINER LOG COLLECTION = NOT AUTHORIZED / NOT IMPLEMENTED
```

Do **not** implement `docker logs` · container inspection automation · container restart · service manipulation.

---

## 10. Predecessor / history rule

| Record | Status |
|--------|--------|
| E-02-BCR-IA | **CONSUMED / HISTORICAL / IMMUTABLE** |
| E-02-BCR-IA-002 | **CONSUMED / HISTORICAL / IMMUTABLE** |
| E-02-BCR-IA-003 | **CONSUMED / HISTORICAL / IMMUTABLE** |
| E-02-BCR-IA-004 | **CONSUMED / HISTORICAL / IMMUTABLE** |
| E-02-BCR-IA-005 | **CONSUMED / HISTORICAL / IMMUTABLE** |
| E-02-BCR-IA-006 | **CONSUMED / HISTORICAL / IMMUTABLE** |
| E-02-BCR-IA-007 | **CONSUMED / HISTORICAL / IMMUTABLE** |
| E-02-DBA-LOCAL-005 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| E-02-DBA-LOCAL-006 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| E-02-DBA-LOCAL-007 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| E-02-DBA-LOCAL-008 | **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED** |

Do **not** rewrite historical records. Do **not** retry or reclassify LOCAL-005 / LOCAL-006 / LOCAL-007.

---

## 11. CB-B / launcher / startup / preserve-cleanup (unchanged)

Future implementation **must not** change:

migration enumeration · deterministic ordering · quarantine logic / allowlist · data-only guard · downstream UUID guard · `schema_migrations` adapter · truthful history bookkeeping · `recordApplied` behavior · application-layer reset · auxiliary project creation · empty auxiliary migrations rule · platform baseline validation · real repository migration source · local DB URL discovery · `runSupabaseCli` · command allowlist · Windows ComSpec / `cmd.exe /d /s /c` / `npx supabase` / `shell:false` · error semantics · `--preserve-environment` · `RUNNING_FOR_BASELINE_VERIFY` · failure cleanup · `--cleanup` · environment disposition · manifest-before-handoff ordering · RU-1.1 tracking · RU-1.2 tracking · failure policy · ports · Studio port · `config.toml` · Supabase configuration · Docker readiness behavior · Docker networking · retry / sleep / backoff.

**CB-B architecture = RETAINED.** `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` **unchanged**.

**Baseline mode = RETAINED.** `E02_DECLARED_BASELINE_REPLAY` **unchanged**.

**Launcher / startup = UNCHANGED.** This IA does **not** attempt to solve the TCP 54323 host collision in code.

**Preserve / cleanup = UNCHANGED** except that IA-006 diagnostic-before-cleanup order **must remain**.

---

## 12. Host TCP 54323 boundary (LOCAL-008 owns the gate; this IA does not remediate)

LOCAL-007 failed because `supabase_studio` could not bind:

```
TCP 0.0.0.0:54323
LegacyContainerStartError
```

This is a **HOST ENVIRONMENT READINESS** condition. Historical LOCAL-007 occupant observation (**Weixin.exe** PID **5668**) is **historical evidence only** and **must not** be treated as current truth. Future LOCAL-008 execution must **independently re-check** TCP 54323.

**IA-008 MUST NOT authorize:**

- killing Weixin.exe
- killing any process
- stopping unrelated software
- changing Studio’s port
- changing `config.toml`
- Docker networking changes
- port remapping
- automatic remediation
- adding retry / sleep / readiness loops

LOCAL-008 already governs:

```
TCP 54323 MUST BE FREE / AVAILABLE FOR BIND
before any stateful Supabase command
```

If occupied at future LOCAL-008 execution time:

```
RESULT = BLOCKED
LOCAL-008 remains NOT CONSUMED
```

---

## 13. Enhanced diagnostic execution purpose (LOCAL-008 classification preserved)

```
NEXT RUNTIME CLASS
  = DATABASE APPLICATION ATTEMPT WITH ENHANCED DIAGNOSTICS
    AND STRICT HOST-PORT READINESS PRECONDITION
```

If start fails: existing IA-006 diagnostics may capture evidence.  
If start succeeds: LOCAL-008 may continue through the **full** governed CB-B lifecycle.

Do **not** change the lifecycle to diagnostic-only. Do **not** stop after start if start succeeds.

---

## 14. Quarantine / Option B

```
quarantinedMigrations = [ 20260314195641_add_demo_data.sql ]
count                 = 1
```

`20260315035847_add_meeting_templates_and_attachments.sql` = **NOT QUARANTINED**.

No second baseline compatibility exception. Option B = **NOT AUTHORIZED**. No wildcard · no dynamic quarantine · no skip-on-error · no expansion. No `schema_migrations` repair. No fabricated history.

---

## 15. Historical migration restoration boundary

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

HMD-001 remains **OPEN**. Do **not** mark HMD-002 `CLOSED` or runtime verified.

---

## 16. Verifier / environment-guard / package / tests

| Path | This IA |
|------|---------|
| `scripts/verification/e02/verify-db-baseline.ts` | **UNCHANGED / NOT AUTHORIZED** |
| `scripts/verification/e02/environment-guard.ts` | **UNCHANGED / NOT AUTHORIZED** |
| `package.json` / lockfiles | **UNCHANGED / NOT AUTHORIZED** |
| tests / RU-1.4 harness | **UNCHANGED / NOT AUTHORIZED** |
| migrations / seed / Supabase config / Docker config | **UNCHANGED / NOT AUTHORIZED** |

`E02_BASELINE_VERIFICATION_AUTHORIZED` remains the DBA baseline gate. RU-1.4 remains separate. If implementation unexpectedly requires a dependency or any of the above: **STOP → GOVERNANCE.**

---

## 17. Defect classification

**NO NEW BCR-CB DEFECT REQUIRED / NOT ALLOCATED.**

This is a **stale authorization-ID pin** caused by successor DBA issuance (LOCAL-008), **not** a new CB-B architecture defect, **not** a launcher/lifecycle/verifier/diagnostic defect, and **not** a host-port code defect.

**Do not reopen** BCR-CB-001 / 002 / 003 / 004. They remain:

```
IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
```

---

## 18. Static verification authorized for future implementation

**Allowed (DB-free):** source inspection · exact grep/search · `git status` · `git diff` / `--numstat` · exact constant inspection · replay artifact `--plan` · `npm run build`.

**Not allowed:** `--apply` · operational `--cleanup` · `supabase init/start/status/stop` as operational commands · DB connections · baseline verifier against DB · Docker mutation · LOCAL-008 execution · RU-1.4 · process kill · port remap.

---

## 19. Implementation Completion gate (future)

Future implementation + successor Completion must prove **all** of:

1. Only the authorized artifact source file was semantically changed.  
2. `EXPECTED_DBA_AUTHORIZATION_ID` = `E-02-DBA-LOCAL-008`  
3. `ARTIFACT_AUTHORIZATION_ID` = `E-02-BCR-IA-008`  
4. runtime variable remains `E02_DBA_AUTHORIZATION_ID`  
5. exact-match fail-closed semantics retained  
6. fail-closed behavior retained  
7. no dual acceptance  
8. LOCAL-007 is no longer accepted as expected DBA ID  
9. diagnostic observability remains intact  
10. stdout capture unchanged  
11. stderr capture unchanged  
12. sanitization unchanged  
13. bounded head/tail capture unchanged  
14. `--debug` remains internal start only  
15. container logs remain absent / not authorized  
16. CB-B unchanged  
17. launcher unchanged  
18. startup semantics unchanged  
19. no retry added  
20. no port-remediation logic added  
21. quarantine remains exactly one file  
22. restored migration untouched and not quarantined  
23. verifier / guard / package / tests unchanged  
24. `--plan` PASS  
25. `--plan` expected DBA = `E-02-DBA-LOCAL-008`  
26. `--plan` artifact authority = `E-02-BCR-IA-008`  
27. `--plan` `quarantineCount=1`  
28. `npm run build` PASS  
29. no DB / Supabase / Docker stateful command executed  
30. LOCAL-008 remains **NOT CONSUMED**

---

## 20. LOCAL-008 status after this IA (issuance only)

Issuing **E-02-BCR-IA-008 does NOT itself unblock LOCAL-008 execution.**

```
E-02-BCR-IA-008 = APPROVED WITH CONDITIONS / NOT YET CONSUMED
LOCAL-008       = APPROVED WITH CONDITIONS / NOT CONSUMED
                  / EXECUTION STILL BLOCKED UNTIL RETARGET IMPLEMENTATION COMPLETES
```

Only after **IA-008 implementation · static verification · successor BCR Completion** may governance consider:

```
E-02-DBA-LOCAL-008 = APPROVED WITH CONDITIONS /
                     NOT CONSUMED /
                     REPOSITORY COMPATIBILITY PREREQUISITE SATISFIED
```

Still **NOT executed**. Docker warm-engine gate **remains mandatory**. Host TCP **54323 FREE** gate **remains mandatory**. Future LOCAL-008 remains responsible for Docker pre-warm · TCP 54323 FREE · fresh aux · empty migrations · platform baseline · real-repo replay · one-file quarantine · truthful history · HMD-002 restored-migration replay · RU-1.1/RU-1.2 apply · IA-006 diagnostics on failure · manifest · preserve · separate baseline verifier · evidence · explicit cleanup.

---

## 21. HMD / LOCAL / certification (unchanged)

| Item | Status |
|------|--------|
| HMD-001 | **OPEN** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING** — not CLOSED / not RUNTIME VERIFIED / not DATABASE VERIFIED |
| LOCAL-005 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-006 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-007 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-008 | **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED** |
| Database baseline verified | **NO** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| EIR PASS | **NONE** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Acceptance | **ACCEPTANCE_BLOCKED** (unchanged) |
| Project Certification | **NOT ISSUED** (unchanged) |
| Final COMMIT path | **BLOCKED** |

---

## 22. Governance chain

```
1. ISSUE E-02-BCR-IA-008          ← THIS TASK
2. IMPLEMENT IA-008 RETARGET
3. ISSUE Completion-008
   docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Completion-008.md
4. Re-check governance compatibility
5. Docker warm-engine gate
6. TCP 54323 FREE gate
7. --plan
8. EXECUTE LOCAL-008
   → E-02-Database-Application-Evidence-E-02-DBA-LOCAL-008.md
   → E-02-RU-1.4-REA ONLY IF APPLIED_AND_BASELINE_VERIFIED
```

**Do not skip ordering.** Completion and LOCAL-008 execution are **not this task**.

---

## 23. Next action (this issuance)

```
NEXT = IMPLEMENT E-02-BCR-IA-008 RETARGET
```

Not implemented in this task.

---

## 24. File scope / prohibited work (this issuance confirmation)

This issuance may modify **only**:

1. `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-008.md` (this document)
2. `docs/implementation/README.md` (minimal)

**No** replay artifact edit · **no** diagnostic implementation · **no** verifier edit · **no** environment-guard edit · **no** migration edit · **no** line-ending normalization · **no** package/test edit · **no** quarantine change · **no** Docker mutation · **no** process kill · **no** port remap · **no** Supabase stateful command · **no** database command · **no** LOCAL-008 execution · **no** LOCAL-008 evidence · **no** Completion-008 · **no** LOCAL-009 · **no** RU-1.4 · **no** REA · **no** EIR / Acceptance / Certification change · **no** commit.

---

## 25. Lock statement

```
E-02-BCR-IA-008                            = APPROVED WITH CONDITIONS / NOT YET CONSUMED
DECISION                                   = APPROVED WITH CONDITIONS
AUTHORIZED CHANGE                          = REPLAY ARTIFACT DBA AUTHORIZATION-ID RETARGET ONLY
CURRENT DBA PIN                            = E-02-DBA-LOCAL-007
AUTHORIZED DBA PIN                         = E-02-DBA-LOCAL-008
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-007
AUTHORIZED ARTIFACT AUTHORITY              = E-02-BCR-IA-008
RUNTIME DBA ENV                            = E02_DBA_AUTHORIZATION_ID
EXACT-MATCH MODEL                          = RETAINED
DUAL ACCEPTANCE                            = NONE
AUTHORIZED SOURCE                          = scripts/verification/e02/replay-e02-declared-baseline.ts ONLY
DIAGNOSTIC OBSERVABILITY                   = PRESERVE / DO NOT MODIFY
CONTAINER LOGS                             = NOT AUTHORIZED / NOT IMPLEMENTED
LOCAL-007 ROOT CAUSE                       = CONFIRMED HOST TCP 54323 COLLISION
HOST PORT PRECONDITION                     = TCP 54323 MUST BE FREE BEFORE STATEFUL SUPABASE
PROCESS KILL                               = NOT AUTHORIZED
PORT REMAP                                 = NOT AUTHORIZED
CB-B ARCHITECTURE                          = RETAINED
LAUNCHER / STARTUP                         = UNCHANGED
BCR-CB-001                                 = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-002                                 = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-003                                 = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-004                                 = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
NEW BCR DEFECT                             = NOT REQUIRED / NOT ALLOCATED
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
HMD-001                                    = OPEN
HMD-002                                    = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
LOCAL-005                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-006                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-007                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-008                                  = APPROVED WITH CONDITIONS / NOT CONSUMED / STILL BLOCKED UNTIL RETARGET
LOCAL-008 COMPATIBILITY                    = INCOMPATIBLE UNTIL IMPLEMENTATION COMPLETES
DOCKER PRE-WARM                            = MANDATORY (LOCAL-008 GATE; NOT THIS IA)
DATABASE APPLICATION                       = AUTHORIZED TO BEGIN / GATED / NOT EXECUTED
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = IMPLEMENT E-02-BCR-IA-008 RETARGET
SUCCESSOR COMPLETION (NOT CREATED)         = E-02-Baseline-Compatibility-Replay-Implementation-Completion-008.md
DO NOT MODIFY ARTIFACT IN THIS TASK · NO DATABASE COMMANDS · NO LOCAL-008 EXECUTION
DO NOT KILL PROCESSES · DO NOT REMAP PORTS
```

---

**End of document — E-02-BCR-IA-008 — v1.0 — 2026-08-24**
