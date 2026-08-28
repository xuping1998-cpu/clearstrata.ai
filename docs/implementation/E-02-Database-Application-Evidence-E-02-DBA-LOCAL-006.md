# E-02 Database Application Evidence — E-02-DBA-LOCAL-006

| Field | Value |
|-------|-------|
| **Document Type** | Database Application Evidence (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-006** |
| **Authorization Reference** | [`E-02-Database-Application-Authorization-LOCAL-006.md`](E-02-Database-Application-Authorization-LOCAL-006.md) v1.0 |
| **BCR Artifact Authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-005.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-005.md) (E-02-BCR-IA-005) · [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-005.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-005.md) |
| **Predecessors** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md) — **immutable / not reclassified** |
| **Status** | **Issued — Execution Attempted — Application Failed (CB-B auxiliary `supabase start` on a pre-warmed Docker engine)** |
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
AUTHORIZATION CONSUMED                  = NO (E-02-DBA-LOCAL-006 NOT successfully consumed)
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
DOCKER ENGINE PRE-WARM                  = PASS (engine already running / responsive before apply)
COLD WAKE DURING APPLY                  = NO
STUDIO CONTAINER OBSERVED               = NO
STUDIO PORT 54323 PUBLISHED             = NO
BCR-CB-001                              = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-002                              = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
                                        (this run: init PASS; start FAIL on warm engine)
BCR-CB-003                              = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-004                              = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
HMD-001                                 = OPEN
HMD-002                                 = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
RPC INVOCATION                          = NONE
RU-1.4 RUNTIME                          = NOT AUTHORIZED / NOT CONSUMED
```

> **Result semantics (LOCAL-006 §20/§24):** `APPLICATION_FAILED` — execution *was* attempted (governance pre-gate PASS; Docker warm-engine gate PASS; `--plan` PASS; `--apply --preserve-environment` started). Failure occurred at auxiliary `supabase start` (`PROCESS_EXITED_NONZERO` status=1) **before** platform-baseline validation, application-layer reset, and governed replay. Not `BLOCKED` (pre-gates passed; engine was already warm). Not `APPLIED_BASELINE_FAILED` (replay never succeeded). Authorization **not consumed**. **No silent retry. No source edit. No migration edit. No second quarantine. No LOCAL-007 auto-issuance. No RU-1.4 REA.**

---

## 1. Authorization

| Field | Value |
|-------|-------|
| Authorization ID | E-02-DBA-LOCAL-006 |
| Decision at execution | APPROVED WITH CONDITIONS / NOT CONSUMED (before this run) |
| Consumption result | **NOT SUCCESSFULLY CONSUMED** |
| Artifact IA | E-02-BCR-IA-005 |
| Runtime DBA identity | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-006` (exact match; fail-closed retained) |
| Apply gates | `E02_BCR_APPLY_AUTHORIZED=true` + exact DBA ID + `E02_ALLOW_DESTRUCTIVE_TESTS=true` + `E02_EVIDENCE_ENV=local` |
| Preserve mode | `--apply --preserve-environment` (requested; success hand-off **not reached**) |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **NOT SET / NOT CONSUMED** |
| `E02_BASELINE_VERIFICATION_AUTHORIZED` | **NOT SET for a verifier run** (verifier never invoked) |
| Application mechanism | `scripts/verification/e02/replay-e02-declared-baseline.ts` (E-02-BCR-IA-005 pin) |

---

## 2. Execution timestamp / repository ref

| Field | Value |
|-------|-------|
| Execution date | 2026-08-24 |
| Apply startedAt (manifest) | `2026-08-24T23:20:26.082Z` |
| Apply finishedAt (manifest) | `2026-08-24T23:21:17.936Z` |
| Operator APPLY_START | `2026-08-24T16:20:25.3409522-07:00` |
| Elapsed | ~53.5 s |
| Repository ref | `afc7a29630cdbc4bfbdd5eaebb4bc8842663176e` |
| Host platform | Windows (`win32`) |
| ComSpec launcher | `WINDOWS_COMSPEC_NPX` |

---

## 3. Pre-execution governance gate — **PASS**

Performed **read-only** before any stateful apply command. No file was modified to make the gate pass.

| # | Check | Result |
|---|-------|--------|
| A | LOCAL-006 authorization exists; APPROVED WITH CONDITIONS / NOT CONSUMED | **PASS** |
| B | BCR Completion-005 exists; COMPLETED WITH NOTES | **PASS** |
| C | Replay artifact `EXPECTED_DBA_AUTHORIZATION_ID` = `E-02-DBA-LOCAL-006` | **PASS** |
| D | Replay artifact `ARTIFACT_AUTHORIZATION_ID` = `E-02-BCR-IA-005` | **PASS** |
| E | Runtime DBA variable remains `E02_DBA_AUTHORIZATION_ID` | **PASS** |
| F | Exact-match fail-closed validation retained | **PASS** |
| G | Quarantine exactly `20260314195641_add_demo_data.sql` · count = 1 | **PASS** |
| H | Restored migration `supabase/migrations/20260315035847_add_meeting_templates_and_attachments.sql` present | **PASS** |
| I | Six HMIR restorations still equal `bc48068` (line-equal at 118/124/126/134/140/142) | **PASS** |
| J | No seventh Git-visible restoration (`numstat 6 6`; six `@@` hunks only) | **PASS** |
| K | Restored migration NOT quarantined | **PASS** |
| L | Option B remains NOT AUTHORIZED | **PASS** |
| M | No newer governance record supersedes LOCAL-006 | **PASS** (no LOCAL-007 / IA-006) |
| N | No material invalidating drift of artifact / verifier / guard / package / tests | **PASS** (pre-existing HMIR working-tree restoration and IA-003 verifier remain authorized prior state) |

**Artifact-ID compatibility:** **PASS** (runtime `validatedDbaAuthorizationId` = `E-02-DBA-LOCAL-006` recorded in the apply manifest).

---

## 4. Docker warm-engine gate — **PASS** (before any stateful Supabase)

Performed **before** `supabase init` / `supabase start` / BCR `--apply`.

| Required condition | Result |
|--------------------|--------|
| Docker client reaches Docker server | **PASS** — Client 29.7.2 · Server 29.7.2 · ServerOS=linux |
| Docker server responds promptly | **PASS** — `docker version` ~0.11–0.12 s; earlier `docker ps` ~0.082 s |
| Linux/WSL engine already running | **PASS** — `docker info` OSType=linux, OperatingSystem=Docker Desktop, Kernel 6.6.87.2-microsoft-standard-WSL2 |
| Engine not stopped | **PASS** — daemon answering; `ServerErrors=[]` |
| Engine not transitioning stopped→starting | **PASS** — no start-transition observed immediately before apply |
| Engine not cold-booting because of this task | **PASS** — Docker Desktop processes already running since 2026-08-22 14:22 local |
| `docker ps` succeeds without delayed engine wake | **PASS** |
| No stale LOCAL-005 auxiliary stack reused | **PASS** — `docker ps -a` empty immediately before apply; aux name is `e02-bcr-aux-local-006-20260824a` |
| No obvious host Docker fault | **PASS** — `ServerErrors=[]`; Running=0 (idle, not faulted) |

**Immediate pre-apply recheck (2026-08-24T16:20:02-07:00):** Client=29.7.2 Server=29.7.2 ServerOS=linux · `version_s=0.1234781` · Running=0 · Errors=[] · `docker ps -a` empty.

Docker Desktop available: **YES**.

---

## 5. Docker pre-warm evidence vs apply

| Item | Finding |
|------|---------|
| Docker Desktop available | **YES** (processes `Docker Desktop` / `com.docker.backend` already running) |
| Docker client version | **29.7.2** (windows) |
| Docker server/engine version | **29.7.2** (linux) |
| Engine already running before BCR apply | **YES** |
| `docker ps` prompt success | **YES** |
| Cold wake observed during apply start | **NO** |
| Engine transition stopped→starting immediately before apply | **NO** |

LOCAL-005 idle-wake (~5 h) was **not** reproduced. Apply was **not** the event that started Docker Desktop.

---

## 6. Environment

| Field | Value |
|-------|-------|
| Environment class | `LOCAL_DISPOSABLE_SUPABASE` |
| Clean-base mode | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` (CB-B) |
| Baseline mode | `E02_DECLARED_BASELINE_REPLAY` |
| Apply opt-in | `E02_BCR_APPLY_AUTHORIZED=true` |
| DBA ID | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-006` |
| Guard inputs | `E02_ALLOW_DESTRUCTIVE_TESTS=true` · `E02_EVIDENCE_ENV=local` |
| `environmentValidated` (manifest) | `false` (guard never reached; start failed first) |
| Production / remote / shared staging | **NOT USED** |
| Repo-root Supabase as fallback | **NOT USED** |

---

## 7. Evidence run identity

| Field | Value |
|-------|-------|
| `E02_EVIDENCE_RUN_ID` | `local-006-20260824a` |
| LOCAL-005 run id reused | **NO** (`local-005-20260824a` not reused) |
| LOCAL-004 run id reused | **NO** |
| Auxiliary naming | `<OS_TMP>/e02-bcr-aux-local-006-20260824a` |

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
| 1 | Pre-execution read-only gates A–N | LOCAL-006 §1 | **PASS** |
| 2 | Docker warm-engine checks (`docker version` / `info` / `ps`) | LOCAL-006 §2–§3 | **PASS** |
| 3 | Immediate pre-apply Docker recheck | Confirm engine still warm | **PASS** |
| 4 | `npx tsx …replay-e02-declared-baseline.ts --plan` | Read-only BCR plan | **PASS** (`PLAN_OK`; no DB mutation) |
| 5 | `E02_BCR_APPLY_AUTHORIZED=true` · `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-006` · `E02_EVIDENCE_RUN_ID=local-006-20260824a` · `--apply --preserve-environment` | CB-B governed apply | **FAILED** — `supabase start` status=1 (§13) |
| 6 | Parallel read-only `docker ps` sampling during start | Studio / port-publish observation | Studio **not observed**; 54323 **not published**; stack torn down by CLI |
| 7 | Artifact failure-path cleanup (`supabase stop` + temp-dir removal) | Best-effort after diagnostics | **SUCCEEDED** — `CLEANED_AFTER_FAILURE` · `cleanupCompleted=true` · warnings **none** |
| 8 | `docker ps -a` / OS-temp listing (read-only, post-failure) | Confirm teardown | No containers · aux dir **absent** |
| 9 | `npm run verify:e02:baseline` | Baseline verifier | **NOT RUN** — apply did not succeed |
| 10 | Explicit `--cleanup` after evidence | LOCAL-006 §27 success-path teardown | **NOT RUN** — failure-path already cleaned; a second `--cleanup` would rewrite the truthful `APPLICATION_FAILED` manifest to `CLEANED` / `CLEANUP_FAILED` |

**Explicitly NOT executed:** repo-workdir `supabase start` · `supabase db reset` · raw Docker/Postgres fallback · `npm run verify:e02` · `verify:e02:concurrency` · `test:e02` · any EIR-048/EIR-054 · any RPC invocation · any migration edit · any second quarantine · any `supabase migration repair` · any source/artifact/verifier/guard/package/test edit · silent retry · LOCAL-007 issuance.

---

## 10. BCR pre-execution plan — **PASS**

Plan was read-only (`--plan` does not consume the runtime DBA env). Apply-time validated identity is recorded in the failure manifest.

```
expectedDbaAuthorizationId         = E-02-DBA-LOCAL-006   (plan)
authorizationId                    = E-02-DBA-LOCAL-006   (validated at apply)
artifactAuthorizationId            = E-02-BCR-IA-005
baselineMode                       = E02_DECLARED_BASELINE_REPLAY
cleanBaseMode                      = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
freshAuxiliaryProject              = true
auxiliaryMigrationCountBeforeStart = 0
realRepositoryMigrationSource      = supabase/migrations
cliLauncherPlatform                = win32
cliLauncherMode                    = WINDOWS_COMSPEC_NPX
quarantineCount                    = 1
quarantinedMigration               = 20260314195641_add_demo_data.sql
restored migration                 = reachable / NOT quarantined
ru11Migration present in plan set  = YES (file listed; not executed)
ru12Migration present in plan set  = YES (file listed; not executed)
migrationCountDiscovered           = 283 timestamped · 2 non-timestamped
planned executable (283 − 1)       = 282
result (plan mode)                 = PLAN_OK
```

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

**BCR-CB-002 result for this run:** **NOT RUNTIME VERIFIED.** Init succeeded; start failed on a **warm** engine.

---

## 12. Auxiliary project

| Field | Value |
|-------|-------|
| Auxiliary workdir (sanitized) | `<OS_TMP>/e02-bcr-aux-local-006-20260824a` |
| Fresh / OS-temp / unique | **YES** |
| Unlinked / not repo root / not repo migrations dir | **YES** |
| LOCAL-005 temp reused | **NO** |
| Repo-root local Supabase reused | **NO** |
| `supabase init` | **SUCCEEDED** |
| Auxiliary timestamped migration count before start | **0** |
| Copied filtered migration tree | **NO** |
| Symlinked alternate source | **NO** |

---

## 13. Auxiliary `supabase start` — **FAILED** (warm engine)

| Field | Value |
|-------|-------|
| `supabase start --workdir` | **FAILED** — `PROCESS_EXITED_NONZERO` status=1 |
| CLI immediately emitted cleanup as failure consequence | **YES** — captured stderr ends with `Stopping containers...` |
| Repository mutation by init/start | **NONE** |

### 13.1 Sanitized start stderr (artifact truncation)

The artifact records at most 400 characters of CLI stderr. Captured text (no secrets):

```
npm warn Unknown env config "devdir". This will stop working in the next major version of npm. ...
Starting database...
Initialising schema...
Seeding globals from roles.sql...
WARN: no files matched pattern: supabase/seed.sql
Stopping containers...
```

The `npm warn Unknown env config "devdir"` line is environmental noise. Start **did begin** (database / schema / roles.sql) and then **self-stopped**. Any subsequent CLI diagnostic **after** that line was **not captured** (400-character truncation). This evidence does **not** invent an internal studio exception string.

The artifact was **not** modified to enlarge stderr capture.

### 13.2 Read-only docker sampling during start (operator observation; not BCR logic)

Sampling interval ~8 s. Apply start `16:20:25` local.

| Snap | Local time | Observation |
|------|------------|-------------|
| 1–3 | 16:20:19–16:20:35 | no running containers (init / pre-start) |
| 4 | 16:20:43 | `supabase_db_e02-bcr-aux-local-006-20260824a` Up 3s (health: starting); **54322** published |
| 5 | 16:20:51 | db **healthy**; transient `cool_borg` |
| 6 | 16:20:59 | db healthy |
| 7 | 16:21:07 | db, analytics, vector, kong (**54321**), auth, inbucket (**54324**), realtime, rest, storage, edge_runtime, pg_meta |
| 7 | 16:21:07 | **`supabase_studio` NOT present** · **54323 NOT published** |
| 8+ | 16:21:16 onward | no running containers (CLI teardown) |

**Studio startup result:** **NOT OBSERVED** (container never appeared in sampling).  
**Studio port publication:** **NO**.  
Platform containers **were created** and then **removed by CLI cleanup**, consistent with LOCAL-005’s `Stopping containers...` as cleanup rather than a causal log line.

This run **does not** confirm an internal Studio exception. It **does** show that a **warm** engine still failed at `supabase start` before Studio became observable.

---

## 14. Platform baseline / auth / storage / local DB target — **NOT REACHED**

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

## 15. Initial application history / app-layer reset — **NOT REACHED**

| Field | Value |
|-------|-------|
| `applicationMigrationHistoryInitiallyEmpty` | `false` (default; validation not reached) |
| `resetApplicationLayerForReplay()` | **NOT INVOKED** |
| auth/storage/platform histories touched | **NO** |

---

## 16. Authoritative migration source / quarantine / executed count

| Field | Value |
|-------|-------|
| Real repository source | `supabase/migrations` |
| Discovered timestamped migrations | **283** |
| Executable planned (283 − 1) | **282** |
| Quarantine | exactly `20260314195641_add_demo_data.sql` · count **1** |
| Quarantine executed | **NO** |
| Quarantine recorded applied | **NO** |
| Actual executed count | **0** |
| Second quarantine | **NO** |
| Migration repair | **NO** |
| Fake `schema_migrations` | **NO** |

---

## 17. HMD-002 critical runtime proof — **NOT REACHED**

| Question | Answer |
|----------|--------|
| Reached? | **NO** |
| Execution attempted? | **NO** |
| Execution succeeded? | **NO** |
| Recorded truthfully as applied? | **NO** (nothing applied) |
| Old parser failure reproduced? | **NO** (file not executed) |

HMD-002 remains **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING**. **Not CLOSED.**

---

## 18. First failing migration / highest applied

| Field | Value |
|-------|-------|
| First failing migration | **NONE** (governed replay not reached) |
| Highest successful / applied version | **NONE** |
| Truthful history | **YES** — nothing written; nothing fabricated |

---

## 19. RU-1.1 / RU-1.2

| Item | Result |
|------|--------|
| RU-1.1 file applied | **NO** (`ru11Reached=false`) |
| `public.owner_vote_primary_freeze_audits` existence | **NOT VERIFIED** |
| RU-1.2 file applied | **NO** (`ru12Reached=false`) |
| RPC metadata | **NOT VERIFIED** |
| RPC invoked | **NO** |

---

## 20. Manifest / preserve / baseline verifier

| Field | Value |
|-------|-------|
| Manifest | `tests/e02/evidence/local-006-20260824a/bcr-replay-manifest.json` |
| Manifest result | `APPLICATION_FAILED` |
| `auxiliaryEnvironmentDisposition` | `CLEANED_AFTER_FAILURE` |
| `baselineVerificationPending` | `false` |
| `cleanupRequired` | `false` |
| `cleanupCompleted` | `true` |
| Preserve hand-off `RUNNING_FOR_BASELINE_VERIFY` | **NOT REACHED** |
| `E02_BASELINE_VERIFICATION_AUTHORIZED` | **NOT SET** |
| `npm run verify:e02:baseline` | **NOT RUN** |
| Primary Audit baseline | **NOT RUN** |
| RU-1.2 metadata baseline | **NOT RUN** |

---

## 21. Prohibited runtime (confirmed not performed)

| Item | Result |
|------|--------|
| RPC `execute_owner_vote_atomic_freeze_commit` invoked | **false** |
| RU-1.4 tests | **false** |
| Destructive fixtures | **false** |
| Concurrency suite | **false** |
| EIR-048 / EIR-054 evidence | **false** |

---

## 22. BCR-CB runtime classification (this run only; not production)

| Defect | Classification |
|--------|----------------|
| BCR-CB-001 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** (aux empty-migrations=0 recorded; start failed before platform baseline proof) |
| BCR-CB-002 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** (init PASS; start FAIL) — **not** `RUNTIME VERIFIED LOCALLY` |
| BCR-CB-003 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** (preserve hand-off not reached; failure-path cleanup **did** run) |
| BCR-CB-004 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** (verifier not invoked) |

Do **not** generalize to production.

---

## 23. HMD / cleanup / overall

| Item | Status |
|------|--------|
| HMD-001 | **OPEN** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING** |
| Cleanup | Failure-path **CLEANED_AFTER_FAILURE** · aux dir absent · no leftover containers |
| Final environment disposition | `CLEANED_AFTER_FAILURE` |
| Overall Database Application Result | **APPLICATION_FAILED** |
| EIR / Acceptance / Certification | **UNCHANGED** (documents not modified) |

---

## 24. Forensic note (this run vs LOCAL-005)

LOCAL-005 forensic: **STRONGLY INDICATED** host/Docker idle-wake + Studio port-publish incomplete. LOCAL-006 **consumed that finding as a mandatory warm-engine gate**.

LOCAL-006 observation:

```
DOCKER PRE-WARM GATE     = PASS
COLD WAKE DURING APPLY   = NO
START                    = STILL FAILED (status=1)
STUDIO CONTAINER         = NOT OBSERVED
STUDIO PORT 54323        = NOT PUBLISHED
```

Idle-wake is therefore **not a sufficient explanation** for this LOCAL-006 failure. Error capture remains truncated after `Stopping containers...`. Per LOCAL-006 issuance: a **warmed-engine** start failure should return to governance and may warrant a **narrowly authorized diagnostic / error-capture** follow-up. **This evidence task does not implement that enhancement, does not retry LOCAL-006, and does not auto-issue LOCAL-007.**

---

## 25. Next governance action

| Condition | Next |
|-----------|------|
| **Current (`APPLICATION_FAILED` · auxiliary `supabase start` PROCESS_EXITED_NONZERO on a pre-warmed engine)** | **RETURN TO GOVERNANCE.** Do **not** retry LOCAL-006. Do **not** automatically create LOCAL-007. Do **not** expand quarantine. Do **not** edit the restored migration. Do **not** modify the replay artifact / verifier / guard / packages / tests. Consider a **narrow diagnostic / error-capture authorization** before any further CB-B apply. Do **NOT** issue `E-02-RU-1.4-REA`. |
| Only after a future `APPLIED_AND_BASELINE_VERIFIED` | [`E-02-RU-1.4-Runtime-Execution-Authorization.md`](E-02-RU-1.4-Runtime-Execution-Authorization.md) (`E-02-RU-1.4-REA`) — **not** reached |

This evidence document **does not create** LOCAL-007 and **does not create** REA.

---

## 26. Lock statement

```
E-02-DBA-LOCAL-006                         = NOT SUCCESSFULLY CONSUMED
DATABASE APPLICATION RESULT                = APPLICATION_FAILED
PRE-EXECUTION GATE                         = PASS
DOCKER ENGINE PRE-WARM                     = PASS
COLD WAKE DURING APPLY                     = NO
FAILURE STAGE                              = AUXILIARY SUPABASE START
FIRST FAILING MIGRATION                    = NONE
EXECUTED COUNT                             = 0
HIGHEST APPLIED VERSION                    = NONE
RESTORED MIGRATION REACHED                 = NO
PRIOR PARSER FAILURE REPRODUCED            = NO
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
HMD-001                                    = OPEN
HMD-002                                    = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
RU-1.1                                     = NOT APPLIED
RU-1.2                                     = NOT APPLIED
DATABASE BASELINE VERIFIED                 = NO
BCR-CB-001                                 = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-002                                 = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-003                                 = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-004                                 = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
RPC INVOCATION                             = NONE
RU-1.4 TESTS                               = NONE
LOCAL-005                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-006                                  = NOT SUCCESSFULLY CONSUMED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = RETURN TO GOVERNANCE (NO LOCAL-006 RETRY · NO AUTO LOCAL-007 · NO REA)
```

---

**End of document — E-02-DBA-LOCAL-006 Evidence — v1.0 — 2026-08-24**
