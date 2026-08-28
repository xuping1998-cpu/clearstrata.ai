# E-02 Database Application Evidence — E-02-DBA-LOCAL-005

| Field | Value |
|-------|-------|
| **Document Type** | Database Application Evidence (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-005** |
| **Authorization Reference** | [`E-02-Database-Application-Authorization-LOCAL-005.md`](E-02-Database-Application-Authorization-LOCAL-005.md) v1.0 |
| **BCR Artifact Authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-004.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-004.md) (E-02-BCR-IA-004) · [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-004.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-004.md) |
| **Predecessors** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md) — **immutable / not reclassified** |
| **Status** | **Issued — Execution Attempted — Application Failed (CB-B auxiliary `supabase start`)** |
| **Revision** | v1.0 |
| **Effective Date** | 2026-08-24 |
| **Production Effect** | **None** |

```
OVERALL DATABASE APPLICATION RESULT     = APPLICATION_FAILED
FAILURE STAGE                           = CB-B AUXILIARY ENVIRONMENT ACQUISITION (`supabase start`)
FIRST FAILING MIGRATION                 = NONE (governed replay not reached)
DATABASE ERROR                          = PROCESS_EXITED_NONZERO (supabase start) status=1
EXECUTED BEFORE FAILURE                 = 0
QUARANTINE CROSSED                      = NO (replay never started)
RU-1.1 REACHED                          = NO
RU-1.2 REACHED                          = NO
AUTHORIZATION CONSUMED                  = NO (E-02-DBA-LOCAL-005 NOT successfully consumed)
CLEAN-BASE MODE                         = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS (CB-B)
BASELINE MODE                           = E02_DECLARED_BASELINE_REPLAY
QUARANTINE                              = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINED MIGRATION SQL               = NOT EXECUTED
QUARANTINED MIGRATION RECORDED APPLIED  = NO
RESTORED MIGRATION REACHED              = NO
PRIOR PARSER FAILURE REPRODUCED         = NO (file not executed)
MIGRATION HISTORY                       = TRUTHFUL (nothing written; nothing fabricated)
RU-1.1 DATABASE                         = NOT APPLIED
RU-1.2 DATABASE                         = NOT APPLIED
DATABASE BASELINE VERIFIED              = NO
BCR-CB-001                              = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-002                              = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
                                        (this run: init PASS; start FAIL)
BCR-CB-003                              = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-004                              = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
HMD-001                                 = OPEN
HMD-002                                 = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
RPC INVOCATION                          = NONE
RU-1.4 RUNTIME                          = NOT AUTHORIZED / NOT CONSUMED
```

> **Result semantics (LOCAL-005 §22/§24/§31):** `APPLICATION_FAILED` — execution *was* attempted (pre-execution gate PASS; Docker available; `--plan` PASS; `--apply --preserve-environment` started). Failure occurred at auxiliary `supabase start` (`PROCESS_EXITED_NONZERO` status=1) **before** platform-baseline validation, application-layer reset, and governed replay. Not `BLOCKED` (pre-gates passed). Not `APPLIED_BASELINE_FAILED` (replay never succeeded). Authorization **not consumed**. **No silent retry. No source edit. No migration edit. No second quarantine. No RU-1.4 REA.**

---

## 1. Authorization

| Field | Value |
|-------|-------|
| Authorization ID | E-02-DBA-LOCAL-005 |
| Decision at execution | APPROVED WITH CONDITIONS / NOT CONSUMED (before this run) |
| Consumption result | **NOT SUCCESSFULLY CONSUMED** |
| Artifact IA | E-02-BCR-IA-004 |
| Runtime DBA identity | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-005` (exact match; fail-closed retained) |
| Apply gates | `E02_BCR_APPLY_AUTHORIZED=true` + exact DBA ID + `E02_ALLOW_DESTRUCTIVE_TESTS=true` + `E02_EVIDENCE_ENV=local` |
| Preserve mode | `--apply --preserve-environment` (requested; success hand-off **not reached**) |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **NOT SET / NOT CONSUMED** |
| `E02_BASELINE_VERIFICATION_AUTHORIZED` | **NOT SET for a verifier run** (verifier never invoked) |
| Application mechanism | `scripts/verification/e02/replay-e02-declared-baseline.ts` (E-02-BCR-IA-004 pin) |

---

## 2. Execution timestamp / repository ref

| Field | Value |
|-------|-------|
| Execution date | 2026-08-24 |
| Apply startedAt (manifest) | `2026-08-24T20:38:52.223Z` |
| Apply finishedAt (manifest) | `2026-08-24T20:39:46.384Z` |
| Repository ref | `afc7a29630cdbc4bfbdd5eaebb4bc8842663176e` |
| Host platform | Windows (`win32`) |
| ComSpec | `C:\Windows\system32\cmd.exe` |

---

## 3. Pre-execution gate — **PASS**

Performed **read-only** before any stateful apply command. No file was modified to make the gate pass.

| # | Check | Result |
|---|-------|--------|
| A | LOCAL-005 authorization exists; APPROVED WITH CONDITIONS / NOT CONSUMED | **PASS** |
| B | BCR Completion-004 exists; COMPLETED WITH NOTES | **PASS** |
| C | Replay artifact `EXPECTED_DBA_AUTHORIZATION_ID` = `E-02-DBA-LOCAL-005` | **PASS** |
| D | Replay artifact `ARTIFACT_AUTHORIZATION_ID` = `E-02-BCR-IA-004` | **PASS** |
| E | Runtime DBA variable remains `E02_DBA_AUTHORIZATION_ID` | **PASS** |
| F | Exact-match fail-closed validation retained | **PASS** |
| G | Quarantine exactly `20260314195641_add_demo_data.sql` · count = 1 | **PASS** |
| H | Restored migration `supabase/migrations/20260315035847_add_meeting_templates_and_attachments.sql` present; six forensic restorations still Git-visible `numstat 6 6` vs HEAD | **PASS** |
| I | No seventh Git-visible restoration/content change (one file; six insertions / six deletions) | **PASS** |
| J | Restored migration NOT quarantined | **PASS** |
| K | Option B remains NOT AUTHORIZED | **PASS** |
| L | No newer governance record supersedes LOCAL-005 | **PASS** |
| M | Docker Desktop / Docker Engine available | **PASS** — Client 29.7.2 · Server Docker Desktop 4.87.0, Engine 29.7.2 |
| N | This execution path not linked to a remote Supabase target | **PASS** — runtime target was a fresh OS-temp auxiliary `--workdir`; repo-root `supabase/.temp/project-ref` leftover **not used** |

**Artifact-ID compatibility:** **PASS** (runtime `validatedDbaAuthorizationId` = `E-02-DBA-LOCAL-005` recorded in the apply manifest).

---

## 4. Target safety finding — **PASS**

| Check | Result |
|-------|--------|
| Environment class | `LOCAL_DISPOSABLE_SUPABASE` |
| Local disposable target model (CB-B OS-temp auxiliary project) | **PASS** (init created; start then failed) |
| Not production | **PASS** |
| Not remote | **PASS** |
| Not shared staging | **PASS** |
| Not linked as the runtime target | **PASS** — no `supabase link`; runtime target was `<OS_TMP>/e02-bcr-aux-local-005-20260824a` |
| Repo-workdir Supabase used as runtime target | **NO** |
| Repo leftover `supabase/.temp/project-ref` | Present on disk from prior CLI use; **not used** as this run's target |

---

## 5. Docker Engine — **PASS (available)** / start still failed

`docker version` reported Client **and** Server: Client 29.7.2 (windows/amd64) · Server Docker Desktop 4.87.0, Engine 29.7.2 (linux/amd64). Docker Engine was available. Availability did **not** imply a successful auxiliary `supabase start`.

Post-failure `docker ps -a`: **no leftover containers**.

---

## 6. Environment

| Field | Value |
|-------|-------|
| Environment class | `LOCAL_DISPOSABLE_SUPABASE` |
| Clean-base mode | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` (CB-B) |
| Baseline mode | `E02_DECLARED_BASELINE_REPLAY` |
| Apply opt-in | `E02_BCR_APPLY_AUTHORIZED=true` |
| DBA ID | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-005` |
| Guard inputs | `E02_ALLOW_DESTRUCTIVE_TESTS=true` · `E02_EVIDENCE_ENV=local` |
| `environmentValidated` (manifest) | `false` (guard never reached; start failed first) |

---

## 7. Evidence run identity

| Field | Value |
|-------|-------|
| `E02_EVIDENCE_RUN_ID` | `local-005-20260824a` |
| LOCAL-004 run id reused | **NO** (`local-004-20260823a` not reused) |
| Auxiliary naming | `<OS_TMP>/e02-bcr-aux-local-005-20260824a` |

---

## 8. Restored-migration integrity (repository; not runtime)

| Field | Value |
|-------|-------|
| File | `supabase/migrations/20260315035847_add_meeting_templates_and_attachments.sql` |
| Source of truth | Git commit `bc48068` (six literals; HMIR Completion) |
| This-run Git-visible `numstat` | **6 / 6** (one file) |
| Seventh Git-visible content change | **NONE** |
| Quarantine status | **NOT QUARANTINED** |
| Runtime replay of this file | **NOT REACHED** |

HMD-002 source integrity remains as previously restored. This run **does not** convert that restoration into runtime proof.

---

## 9. Commands executed (this task)

| # | Command | Purpose | Result |
|---|---------|---------|--------|
| 1 | Pre-execution read-only gates A–N | LOCAL-005 §1 | **PASS** |
| 2 | `npx tsx …replay-e02-declared-baseline.ts --plan` | Read-only BCR plan | **PASS** (`PLAN_OK`; no DB mutation) |
| 3 | `E02_BCR_APPLY_AUTHORIZED=true` · `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-005` · `E02_EVIDENCE_RUN_ID=local-005-20260824a` · `--apply --preserve-environment` | CB-B governed apply | **FAILED** — `supabase start` status=1 (§12) |
| 4 | Artifact failure-path cleanup (`supabase stop` + temp-dir removal) | Best-effort after diagnostics | **SUCCEEDED** — `CLEANED_AFTER_FAILURE` · `cleanupCompleted=true` · warnings **none** |
| 5 | `docker ps -a` / OS-temp listing (read-only, post-failure) | Confirm teardown | No containers · aux dir **absent** |
| 6 | `npm run verify:e02:baseline` | Baseline verifier | **NOT RUN** — apply did not succeed |
| 7 | Explicit `--cleanup` after evidence | LOCAL-005 §21 success-path teardown | **NOT RUN** — failure-path already cleaned; a second `--cleanup` would rewrite the truthful `APPLICATION_FAILED` manifest to `CLEANED` / `CLEANUP_FAILED` |

**Explicitly NOT executed:** repo-workdir `supabase start` · `supabase db reset` · raw Docker/Postgres fallback · `npm run verify:e02` · `verify:e02:concurrency` · `test:e02` · any EIR-048/EIR-054 · any RPC invocation · any migration edit/rename/move/delete · any second quarantine · any `supabase migration repair` · any source/artifact/verifier/guard/package/test edit · silent retry.

---

## 10. BCR pre-execution plan — **PASS**

Plan was read-only. Apply-time plan fields recorded in the failure manifest match the authorized model:

```
authorizationId                    = E-02-DBA-LOCAL-005   (validated at apply)
artifactAuthorizationId            = E-02-BCR-IA-004
expectedDbaAuthorizationId         = E-02-DBA-LOCAL-005
baselineMode                       = E02_DECLARED_BASELINE_REPLAY
cleanBaseMode                      = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
freshAuxiliaryProject              = true
auxiliaryMigrationCountBeforeStart = 0
realRepositoryMigrationSource      = supabase/migrations
cliLauncherPlatform                = win32
cliLauncherMode                    = WINDOWS_COMSPEC_NPX
quarantineCount                    = 1
quarantinedMigration               = 20260314195641_add_demo_data.sql
restored migration                 = NOT quarantined
ru11Migration present in plan set  = YES (file listed; not executed)
ru12Migration present in plan set  = YES (file listed; not executed)
migrationCountDiscovered           = 283 timestamped · 2 non-timestamped
planned executable (283 − 1)       = 282
result (plan mode)                 = PLAN_OK
```

RU-1.1 / RU-1.2 **reachable in the planned set** = **YES**. Runtime application = **NO**.

---

## 11. Launcher platform / mode

| Field | Value |
|-------|-------|
| Platform | `win32` |
| Mode | `WINDOWS_COMSPEC_NPX` |
| Contract | `ComSpec`/`cmd.exe` + `/d /s /c` + `npx` + `supabase` + allowlist + `shell:false` |
| `npx.cmd` fallback | **NOT USED** |
| `shell:true` fallback | **NOT USED** |

| Command | Classification |
|---------|----------------|
| `supabase init` | **PROCESS_EXITED_ZERO** (inferred: auxiliary project created; `auxiliaryMigrationCountBeforeStart=0` recorded) |
| `supabase start --workdir <aux>` | **PROCESS_EXITED_NONZERO** status=1 |
| `supabase status --workdir <aux> --output json` | **NOT REACHED** |
| `supabase stop --workdir <aux>` (failure-path cleanup) | **SUCCEEDED** (`cleanupWarnings=[]`; `cleanupCompleted=true`) |

**BCR-CB-002 result for this run:** **NOT RUNTIME VERIFIED.** Init succeeded; start failed. Prior LOCAL-004 local launcher verification is **historical / immutable** and is **not** reclassified by this evidence.

---

## 12. Auxiliary environment / start — **FAILED**

| Field | Value |
|-------|-------|
| Auxiliary workdir (sanitized) | `<OS_TMP>/e02-bcr-aux-local-005-20260824a` |
| Fresh auxiliary project | `true` |
| LOCAL-004 temp reused | **NO** |
| Repo-root local Supabase reused | **NO** |
| `supabase init` | **SUCCEEDED** |
| Auxiliary timestamped migration count before start | **0** |
| Copied filtered migration tree | **NO** |
| `supabase start --workdir` | **FAILED** — `PROCESS_EXITED_NONZERO` status=1 |
| Repository mutation by init/start | **NONE** |

### 12.1 Sanitized start stderr (artifact truncation)

The artifact records at most 400 characters of CLI stderr. Captured text (no secrets):

```
npm warn Unknown env config "devdir". This will stop working in the next major version of npm. ...
Starting database...
Initialising schema...
Seeding globals from roles.sql...
WARN: no files matched pattern: supabase/seed.sql
Stopping containers...
```

The `npm warn Unknown env config "devdir"` line is environmental noise. Start **did begin** (database / schema / roles.sql) and then **self-stopped** (`Stopping containers...`). Any subsequent CLI diagnostic **after** that line was **not captured** (400-character truncation). This evidence does **not** invent a root cause beyond `PROCESS_EXITED_NONZERO status=1`.

The artifact was **not** modified to enlarge stderr capture.

---

## 13. Platform baseline / auth / storage / local DB target — **NOT REACHED**

| Field | Value |
|-------|-------|
| `platformBaselineReady` | `false` |
| `auth` / `storage` presence | **NOT VERIFIED** (no live connection) |
| `auth.users` / `storage.objects` / `storage.buckets` | **NOT VERIFIED** |
| Platform histories fabricated by BCR | **NO** |
| `supabase status --output json` | **NOT REACHED** |
| Local DB target validation | **NOT REACHED** |
| DB URL persisted | **NO** |

---

## 14. Application history / reset — **NOT REACHED**

| Field | Value |
|-------|-------|
| Initial application history | **NOT OBSERVED** (`applicationMigrationHistoryInitiallyEmpty=false` is the unset default, not a live catalog reading) |
| `resetApplicationLayerForReplay()` | **NOT EXECUTED** |
| `auth` / `storage` / platform histories reset | **NO** |

---

## 15. Governed replay — **NOT REACHED**

| Field | Value |
|-------|-------|
| Real repository source | `supabase/migrations` (authoritative; planned) |
| Discovered timestamped | 283 |
| Planned executable | 282 |
| Quarantine count | **1** |
| Quarantined file | `20260314195641_add_demo_data.sql` |
| Second quarantine added | **NO** |
| Actual executed count | **0** |
| Restored migration reached | **NO** |
| Restored migration applied | **NO** |
| Restored migration recorded | **NO** |
| Prior parser failure (`syntax error at or near "1."`) reproduced | **NO** — file was not executed |
| First failing migration | **NONE** (failure is `supabase start`, not a migration) |
| Highest applied migration | **NONE** |
| Continue / retry / repair | **NO** |

---

## 16. Quarantine / truthful history

| Field | Value |
|-------|-------|
| Quarantined migration SQL executed | **NO** |
| Quarantined version recorded as applied | **NO** |
| Fake applied row | **NONE** |
| `supabase migration repair` | **NOT USED** |
| Truthfulness | **HELD** — no application history was written; start failed before replay |

---

## 17. RU-1.1 / RU-1.2 database presence

| Migration | Reached | Applied (DB) | Object present |
|-----------|---------|--------------|----------------|
| RU-1.1 `20261729120000_create_owner_vote_primary_freeze_audits.sql` | **NO** | **NO** | `public.owner_vote_primary_freeze_audits` **NOT VERIFIED** |
| RU-1.2 `20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql` | **NO** | **NO** | `public.execute_owner_vote_atomic_freeze_commit` (+ helper) **NOT VERIFIED** |

RPC invocation of `execute_owner_vote_atomic_freeze_commit`: **FALSE**.

---

## 18. BCR manifest

| Field | Value |
|-------|-------|
| Manifest path | `tests/e02/evidence/local-005-20260824a/bcr-replay-manifest.json` (runtime / gitignored evidence) |
| Manifest persisted before cleanup | **YES** (failure path writes manifest, then cleans) |
| `validatedDbaAuthorizationId` | `E-02-DBA-LOCAL-005` |
| `artifactAuthorizationId` | `E-02-BCR-IA-004` |
| `result` | `APPLICATION_FAILED` |
| Success-path disposition `RUNNING_FOR_BASELINE_VERIFY` | **NOT ESTABLISHED** |
| Actual disposition | `CLEANED_AFTER_FAILURE` |
| `baselineVerificationPending` | `false` |
| `cleanupRequired` | `false` |
| `cleanupCompleted` | `true` |
| Secrets in manifest | **NONE** (no DB URL) |

---

## 19. Preserved-environment / baseline verifier — **NOT RUN**

| Field | Value |
|-------|-------|
| Success preserve hand-off | **NOT REACHED** |
| `npm run verify:e02:baseline` | **NOT RUN** |
| Baseline verifier authority consumed | **NO** |
| Primary Audit baseline checks | **NOT RUN** |
| RU-1.2 RPC metadata baseline checks | **NOT RUN** |
| RPC invoked | **NO** |
| RU-1.4 tests | **NO** |
| Destructive fixtures | **NO** |

---

## 20. Defect runtime classifications

| Defect | Result |
|--------|--------|
| **BCR-CB-001** | Fresh aux + empty migrations **proven this run** (`auxiliaryMigrationCountBeforeStart=0`). Start / platform baseline / empty app history / bounded reset **not proven this run**. **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING.** |
| **BCR-CB-002** | Init via ComSpec **succeeded**; start **failed**. **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** for this run. LOCAL-004's prior local verification remains historical. |
| **BCR-CB-003** | Success preserve → external verifier → explicit `--cleanup` **not reached**. Failure-path auto-cleanup **did** run. **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING.** |
| **BCR-CB-004** | Baseline verifier **not run**. **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING.** |
| **HMD-001** | **OPEN** (quarantine still exactly one file; not executed). |
| **HMD-002** | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING.** Restored file **not reached**. **Not CLOSED.** Prior LOCAL-004 parser failure **not reproduced** because the file was not executed. |

This start failure is **distinct from** HMD-001, HMD-002, LOCAL-004 SQL syntax, and LOCAL-003 Windows EINVAL-on-init.

---

## 21. Cleanup

| Field | Value |
|-------|-------|
| Path | Artifact **failure-path** cleanup after diagnostics + failure manifest |
| `supabase stop --workdir <aux>` | **SUCCEEDED** (`cleanupWarnings` empty) |
| Temp-dir removal | **SUCCEEDED** (post-check: aux dir **absent**) |
| Cleanup warnings | **NONE** |
| Final disposition | `CLEANED_AFTER_FAILURE` |
| `cleanupCompleted` | `true` |
| Explicit post-verify `--cleanup` | **NOT RUN** — success verify hand-off never established; running `--cleanup` would rewrite `APPLICATION_FAILED` to `CLEANED`/`CLEANUP_FAILED` |
| Fabricated `CLEANED_AFTER_VERIFY` | **NO** |

---

## 22. Database Application Manifest (summary)

```
authorizationId                    : E-02-DBA-LOCAL-005
validatedDbaAuthorizationId        : E-02-DBA-LOCAL-005
artifactAuthorizationId            : E-02-BCR-IA-004
baselineMode                       : E02_DECLARED_BASELINE_REPLAY
cleanBaseMode                      : AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
environmentClass                   : LOCAL_DISPOSABLE_SUPABASE
evidenceRunId                      : local-005-20260824a
cliLauncherMode                    : WINDOWS_COMSPEC_NPX
cliLauncherPlatform                : win32
freshAuxiliaryProject              : true
auxiliaryWorkdir                   : <OS_TMP>/e02-bcr-aux-local-005-20260824a
auxiliaryMigrationCountBeforeStart : 0
platformBaselineReady              : false
applicationMigrationHistoryInitiallyEmpty : false (unset; not observed)
realRepositoryMigrationSource      : supabase/migrations
platformHistoryPreserved           : true (default; platform not mutated)
repositoryRef                      : afc7a29630cdbc4bfbdd5eaebb4bc8842663176e
dockerStatus                       : Client+Server available
bcrPlanResult                      : PASS
bcrApplyResult                     : APPLICATION_FAILED
failureStage                       : AUXILIARY_SUPABASE_START
firstFailingMigration              : NONE
databaseError                      : PROCESS_EXITED_NONZERO (supabase start) status=1
migrationCountDiscovered           : 283 timestamped · 2 non-timestamped
migrationCountExecuted             : 0
migrationCountQuarantined          : 1
quarantinedMigrations              : [ "20260314195641_add_demo_data.sql" ]
quarantineSqlExecuted              : false
quarantineHistoryRow               : false
highestAppliedVersion              : NONE
restoredMigrationReached           : false
priorParserFailureReproduced       : false
ru11Reached / ru11Applied          : false / false
ru12Reached / ru12Applied          : false / false
manifestFile                       : tests/e02/evidence/local-005-20260824a/bcr-replay-manifest.json
auxiliaryEnvironmentDisposition    : CLEANED_AFTER_FAILURE
baselineVerifier                   : NOT_RUN
rpcInvoked                         : false
overallResult                      : APPLICATION_FAILED
```

**No secrets recorded.**

---

## 23. Overall Database Application Result

```
APPLICATION_FAILED
```

**Failure stage:** CB-B auxiliary `supabase start`.  
**Failure cause:** CLI exited status=1 after beginning initialization and then stopping containers. Full subsequent stderr not captured (artifact 400-character truncation).  
**Governed replay / HMD-002 runtime / RU-1.1 / RU-1.2 / baseline verifier:** not reached.  
**DBA completion semantics:** `E-02-DBA-LOCAL-005` **NOT successfully consumed**.

---

## 24. Status ledger

| Item | Status |
|------|--------|
| HMD-001 | **OPEN** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING** (not CLOSED) |
| BCR-CB-001 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** |
| BCR-CB-002 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** (this run) |
| BCR-CB-003 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** |
| BCR-CB-004 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** |
| E-02-DBA-LOCAL-001 | **NOT CONSUMED / IMMUTABLE** |
| E-02-DBA-LOCAL-002 | **FAILED / NOT CONSUMED / IMMUTABLE** |
| E-02-DBA-LOCAL-003 | **FAILED / NOT CONSUMED / IMMUTABLE** |
| E-02-DBA-LOCAL-004 | **FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE** |
| E-02-DBA-LOCAL-005 | **NOT SUCCESSFULLY CONSUMED** |
| Database application | **APPLICATION_FAILED** |
| Database baseline verified | **NO** |
| RU-1.4 runtime | **NOT AUTHORIZED** (no REA) |
| EIR | **No PASS reclassification** |
| Acceptance | **ACCEPTANCE_BLOCKED** |
| Project Certification | **NOT ISSUED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Executable Final COMMIT Path | **BLOCKED** |

EIR / Acceptance / Certification documents were **not modified**.

---

## 25. Next governance action

| Condition | Next |
|-----------|------|
| **Current (`APPLICATION_FAILED` · auxiliary `supabase start` PROCESS_EXITED_NONZERO)** | **ISSUE successor Database Application Authorization `E-02-DBA-LOCAL-006`** for a **fresh** CB-B attempt after diagnosing the local `supabase start` non-zero exit (stderr truncated after `Stopping containers...`). Do **not** retry LOCAL-005. Do **not** expand quarantine. Do **not** edit the restored migration. Do **not** modify the replay artifact / verifier / guard / packages / tests. Do **NOT** issue `E-02-RU-1.4-REA`. |
| Only after a future `APPLIED_AND_BASELINE_VERIFIED` | [`E-02-RU-1.4-Runtime-Execution-Authorization.md`](E-02-RU-1.4-Runtime-Execution-Authorization.md) (`E-02-RU-1.4-REA`) — **not** reached |

This evidence document **does not create** LOCAL-006 and **does not create** REA.

---

## 26. Lock statement

```
E-02-DBA-LOCAL-005                         = NOT SUCCESSFULLY CONSUMED
DATABASE APPLICATION RESULT                = APPLICATION_FAILED
PRE-EXECUTION GATE                         = PASS
FAILURE STAGE                              = AUXILIARY SUPABASE START
FIRST FAILING MIGRATION                    = NONE
EXECUTED COUNT                             = 0
HIGHEST APPLIED VERSION                    = NONE
RESTORED MIGRATION REACHED                 = NO
PRIOR PARSER FAILURE REPRODUCED            = NO
DOCKER                                     = AVAILABLE (Client + Server)
TARGET                                     = LOCAL DISPOSABLE (CB-B OS-temp auxiliary) — safety PASS
CLEAN-BASE MODE                            = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
BASELINE MODE                              = E02_DECLARED_BASELINE_REPLAY
ARTIFACT AUTHORITY                         = E-02-BCR-IA-004
DBA AUTHORIZATION ID                       = E-02-DBA-LOCAL-005 (exact env)
WINDOWS CLI LAUNCHER                       = COMSPEC/CMD.EXE + NPX SUPABASE + SHELL FALSE — INIT PASS / START FAIL
AUXILIARY PROJECT                          = FRESH / EMPTY MIGRATIONS / START FAILED / THEN CLEANED AFTER FAILURE
PLATFORM BASELINE                          = NOT REACHED
APPLICATION HISTORY                        = TRUTHFUL (none written)
REAL REPOSITORY MIGRATIONS                 = AUTHORITATIVE SOURCE (not executed)
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINED MIGRATION SQL EXECUTED         = NO
QUARANTINED MIGRATION RECORDED AS APPLIED  = NO
HISTORICAL / RESTORED MIGRATION FILE       = UNCHANGED BY THIS TASK
RU-1.1 DATABASE                            = NOT APPLIED
RU-1.2 DATABASE                            = NOT APPLIED
BASELINE VERIFIER                          = NOT RUN
BASELINE VERIFIER AUTHORITY                = E02_BASELINE_VERIFICATION_AUTHORIZED (not consumed)
RU-1.4 RUNTIME AUTHORITY                   = NOT CONSUMED
BCR-CB-001                                 = RUNTIME VERIFICATION PENDING
BCR-CB-002                                 = RUNTIME VERIFICATION PENDING (this run)
BCR-CB-003                                 = RUNTIME VERIFICATION PENDING
BCR-CB-004                                 = RUNTIME VERIFICATION PENDING
HMD-001                                    = OPEN
HMD-002                                    = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
LOCAL-001                                  = NOT CONSUMED / IMMUTABLE
LOCAL-002                                  = FAILED / NOT CONSUMED / IMMUTABLE
LOCAL-003                                  = FAILED / NOT CONSUMED / IMMUTABLE
LOCAL-004                                  = FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE
RPC INVOCATION                             = NONE
RU-1.4 DATABASE-BACKED TESTS               = NOT RUN
RU-1.4 EXECUTABLE EVIDENCE                 = NOT COLLECTED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = ISSUE E-02-DBA-LOCAL-006 AFTER DIAGNOSING AUXILIARY SUPABASE START FAILURE — NO REA
DO NOT MODIFY MIGRATIONS · DO NOT ADD A SECOND QUARANTINE · DO NOT RUN RU-1.4 EVIDENCE SUITE · DO NOT RETRY LOCAL-005
```

---

**End of document — E-02-DBA-LOCAL-005 Evidence — v1.0 — 2026-08-24**
