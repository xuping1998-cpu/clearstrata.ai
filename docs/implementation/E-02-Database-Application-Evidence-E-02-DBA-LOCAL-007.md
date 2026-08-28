# E-02 Database Application Evidence — E-02-DBA-LOCAL-007

| Field | Value |
|-------|-------|
| **Document Type** | Database Application Evidence (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-007** |
| **Authorization Reference** | [`E-02-Database-Application-Authorization-LOCAL-007.md`](E-02-Database-Application-Authorization-LOCAL-007.md) v1.0 |
| **BCR Artifact Authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-007.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-007.md) (E-02-BCR-IA-007) · [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-007.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-007.md) |
| **Diagnostic implementation** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md) (E-02-BCR-IA-006) · [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-006.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-006.md) |
| **Predecessors** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md) — **immutable / not reclassified** |
| **Status** | **Issued — Execution Attempted — Application Failed (CB-B auxiliary `supabase start` on a pre-warmed Docker engine; IA-006 diagnostics runtime-exercised)** |
| **Revision** | v1.0 |
| **Effective Date** | 2026-08-24 |
| **Production Effect** | **None** |

```
OVERALL DATABASE APPLICATION RESULT     = APPLICATION_FAILED
FAILURE STAGE                           = CB-B AUXILIARY ENVIRONMENT ACQUISITION (`supabase start`)
FIRST FAILING MIGRATION                 = NONE (governed replay not reached)
DATABASE ERROR                          = PROCESS_EXITED_NONZERO (supabase start) status=1
CLI FAILURE CLASS                       = PROCESS_EXITED_NONZERO
CLI FAILURE SUBCOMMAND                  = start
STRONGEST ROOT-CAUSE CLUE (ARTIFACT)    = LegacyContainerStartError · host bind of TCP 0.0.0.0:54323
                                        (supabase_studio_e02-bcr-aux-local-007-20260824a)
EXECUTED BEFORE FAILURE                 = 0
QUARANTINE CROSSED                      = NO (replay never started)
RU-1.1 REACHED                          = NO
RU-1.2 REACHED                          = NO
AUTHORIZATION CONSUMED                  = NO (E-02-DBA-LOCAL-007 NOT successfully consumed)
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
DIAGNOSTIC OBSERVABILITY                = IMPLEMENTED / PRESERVED / RUNTIME EXERCISED
CONTAINER LOG COLLECTION                = NOT PERFORMED / NOT AUTHORIZED
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

> **Result semantics (LOCAL-007 §26/§27):** `APPLICATION_FAILED` — execution *was* attempted (governance pre-gate PASS; Docker warm-engine gate PASS; `--plan` PASS; `--apply --preserve-environment` started). Failure occurred at auxiliary `supabase start` (`PROCESS_EXITED_NONZERO` status=1) **before** platform-baseline validation, application-layer reset, and governed replay. Not `BLOCKED` (pre-gates passed; engine was already warm). Not `APPLIED_BASELINE_FAILED` (replay never succeeded). Authorization **not successfully consumed**. **No silent retry. No source edit. No migration edit. No second quarantine. No LOCAL-008 auto-issuance. No RU-1.4 REA.**

---

## 1. Files created / updated

| Path | Action |
|------|--------|
| `docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-007.md` | **Created** (this document) |
| `docs/implementation/README.md` | **Minimally updated** (ledger + next action) |
| `tests/e02/evidence/local-007-20260824a/bcr-replay-manifest.json` | **Created by governed artifact** (runtime manifest) |

**Not modified:** `scripts/verification/e02/replay-e02-declared-baseline.ts` · verifier · environment guard · `package.json` · migrations · tests/harness · CB-B architecture · launcher/startup · diagnostic capture code · sanitization · cleanup semantics.

---

## 2. Authorization executed / consumption result

| Field | Value |
|-------|-------|
| Authorization ID | E-02-DBA-LOCAL-007 |
| Decision at execution | APPROVED WITH CONDITIONS / NOT CONSUMED (before this run) |
| Consumption result | **NOT SUCCESSFULLY CONSUMED** |
| Artifact IA | E-02-BCR-IA-007 |
| Runtime DBA identity | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-007` (exact match; fail-closed retained) |
| Apply gates | `E02_BCR_APPLY_AUTHORIZED=true` + exact DBA ID + `E02_ALLOW_DESTRUCTIVE_TESTS=true` + `E02_EVIDENCE_ENV=local` |
| Preserve mode | `--apply --preserve-environment` (requested; success hand-off **not reached**) |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **NOT SET / NOT CONSUMED** |
| `E02_BASELINE_VERIFICATION_AUTHORIZED` | **NOT SET for a verifier run** (verifier never invoked) |
| Application mechanism | `scripts/verification/e02/replay-e02-declared-baseline.ts` (E-02-BCR-IA-007 pin) |
| Dual-accept of LOCAL-005/006 | **NONE** |

---

## 3. Execution timestamp / repository ref

| Field | Value |
|-------|-------|
| Execution date | 2026-08-24 (Pacific) |
| Apply startedAt (manifest) | `2026-08-25T03:15:05.465Z` |
| Apply finishedAt (manifest) | `2026-08-25T03:16:01.429Z` |
| Operator APPLY_START | `2026-08-24T20:15:04.4201356-07:00` |
| Operator APPLY_FINISH | `2026-08-24T20:16:01.5756318-07:00` |
| Elapsed | ~57 s wall / `cliElapsedMs=49860` for `supabase start` |
| Repository ref | `afc7a29630cdbc4bfbdd5eaebb4bc8842663176e` |
| Host platform | Windows (`win32`) |
| ComSpec launcher | `WINDOWS_COMSPEC_NPX` |

Operator note: a first PowerShell wrapper using ternary `? :` failed to parse **before** `npx` / `--apply` (no stateful Supabase). That parser error is **not** a governed application failure. The single governed apply is the subsequent command recorded above. **No second `--apply` after the start failure.**

---

## 4. Pre-execution governance gate — **PASS**

Performed **read-only** before any stateful apply command. No file was modified to make the gate pass.

| # | Check | Result |
|---|-------|--------|
| A | LOCAL-007 exists; APPROVED WITH CONDITIONS / NOT CONSUMED | **PASS** |
| B | BCR Completion-007 exists; COMPLETED WITH NOTES | **PASS** |
| C | Replay artifact `EXPECTED_DBA_AUTHORIZATION_ID` = `E-02-DBA-LOCAL-007` | **PASS** |
| D | Replay artifact `ARTIFACT_AUTHORIZATION_ID` = `E-02-BCR-IA-007` | **PASS** |
| E | Exact-match fail-closed validation retained | **PASS** |
| F | No dual acceptance of LOCAL-006/005 | **PASS** (neither ID is an accepted DBA constant) |
| G | CB-B remains `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` | **PASS** |
| H | Quarantine exactly `20260314195641_add_demo_data.sql` · count = 1 | **PASS** |
| I | Restored migration `20260315035847_add_meeting_templates_and_attachments.sql` **not** quarantined | **PASS** |
| J | Diagnostic stdout/stderr bounded sanitized capture remains present | **PASS** |
| K | Internal `start --debug` behavior remains present | **PASS** (plan templates include `--debug` on start) |
| L | Container-log collection remains absent | **PASS** |
| M | No newer governance authority supersedes LOCAL-007 | **PASS** (no LOCAL-008 / IA-008) |
| N | No unauthorized source change invalidates Completion-007 | **PASS** |

**Restoration-integrity (LOCAL-007 §15, read-only):** restored file Git-visible `numstat 6 6` (six insertions / six deletions); no seventh content change. Quarantine unchanged.

**Artifact-ID compatibility:** **PASS** (runtime `validatedDbaAuthorizationId` = `E-02-DBA-LOCAL-007` recorded in the apply manifest).

---

## 5. Docker warm-engine gate — **PASS** (before any stateful Supabase)

Performed **before** `supabase init` / `supabase start` / BCR `--apply`. Apply was **not** used to wake Docker.

| Required condition | Result |
|--------------------|--------|
| Docker client reaches Docker server | **PASS** — Client 29.7.2 · Server 29.7.2 · ServerOS=linux · Docker Desktop 4.87.0 |
| Docker server responds promptly | **PASS** — `docker version` **173 ms**; recheck immediately before apply **192 ms** |
| Cold-wake / daemon unavailable | **NO** — engine already running; no “starting” / connection-refused behavior |
| Residual LOCAL-005/006/007 auxiliary containers | **NONE** — `docker ps` and `docker ps -a` empty (0 running / 0 stopped) |
| Environment suitable for a fresh LOCAL-007 CB-B attempt | **YES** (warm engine; empty container set) |

`docker info` (pre-apply): Containers 0 / Running 0 / Stopped 0 · Images 23 · Kernel 6.6.87.2-microsoft-standard-WSL2 · Total Memory 15.37 GiB.

**Pre-apply recheck:** `docker version` 192 ms · `docker ps -a` empty.

---

## 6. Cold wake during apply

**NO.** Engine was already warm before `--apply`. Start elapsed ~49.9 s and failed on a **port bind**, not daemon-unavailable / idle-wake.

---

## 7. `--plan` result / evidenceRunId

`evidenceRunId` = **`local-007-20260824a`** (new; not reused `local-005-20260824a` / `local-006-20260824a`).

`--plan` (DB-free) **PLAN_OK**:

```
artifactAuthorizationId            = E-02-BCR-IA-007
expectedDbaAuthorizationId         = E-02-DBA-LOCAL-007
cleanBaseMode                      = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
baselineMode                       = E02_DECLARED_BASELINE_REPLAY
quarantineCount                    = 1
quarantinedMigrations              = [20260314195641_add_demo_data.sql]
environmentClass                   = LOCAL_DISPOSABLE_SUPABASE
auxiliaryWorkdir (plan placeholder)= <OS_TMP>/e02-bcr-aux-<runId>
auxiliaryMigrationCountBeforeStart = 0
migrationCountDiscovered           = 283 timestamped · 2 non-timestamped
planned executable (283 − 1)       = 282
cliDebugEnabled (plan)             = null (diagnostics unused in --plan)
result                             = PLAN_OK
```

---

## 8. Environment classification / auxiliary workdir / init

| Field | Value |
|-------|-------|
| Environment classification | `LOCAL_DISPOSABLE_SUPABASE` |
| Auxiliary workdir (sanitized) | `<OS_TMP>/e02-bcr-aux-local-007-20260824a` |
| Workdir class | OS-temp auxiliary (not repository `supabase/`) |
| LOCAL-005 / LOCAL-006 workdir reused | **NO** |
| Repo-root local Supabase used as target | **NO** |
| Fresh auxiliary project | **YES** (`freshAuxiliaryProject=true`) |
| `supabase init` | **SUCCEEDED** (inferred: aux created; start was reached) |
| Auxiliary timestamped migration count before start | **0** |
| Copied filtered migration tree | **NO** |
| Symlinked alternate source | **NO** |
| Post-cleanup aux dir exists | **NO** (`Test-Path` false) |

---

## 9. Auxiliary `supabase start` — **FAILED** (warm engine; diagnostics runtime-exercised)

| Field | Value |
|-------|-------|
| Enhanced diagnostic runtime exercised | **YES** |
| `cliFailureSubcommand` | `start` |
| `cliFailureClass` | `PROCESS_EXITED_NONZERO` |
| `cliExitCode` | `1` |
| `cliSignal` | `null` |
| `cliElapsedMs` | `49860` |
| `cliStdoutTruncated` | `false` |
| `cliStderrTruncated` | `false` |
| `cliDebugEnabled` | `true` |
| `cliTimedOut` | `false` |
| Container-log collection | **NOT PERFORMED** |
| Manual retry / second start | **NO** |
| Repository mutation by init/start | **NONE** |

CLI immediately emitted its own teardown (`Stopping containers...` / pruned containers, volumes, network) as a failure consequence. Artifact then performed best-effort `--stop` cleanup (`cleanupCompleted=true`, `cleanupWarnings=[]`, disposition `CLEANED_AFTER_FAILURE`).

### 9.1 Sanitized stdout excerpt (artifact; no secrets)

Captured `cliStdoutExcerpt` (JSON error from `supabase --debug start`). **Strongest root-cause clue actually present:**

```
{
  "_tag": "Error",
  "error": {
    "code": "LegacyContainerStartError",
    "message": "failed to start docker container \"supabase_studio_e02-bcr-aux-local-007-20260824a\": Error response from daemon: ports are not available: exposing port TCP 0.0.0.0:54323 -> 127.0.0.1:0: listen tcp 0.0.0.0:54323: bind: Only one usage of each socket address (protocol/network address/port) is normally permitted.\nfailed to start containers: 50e2ea4f758a5926cbe40f4b17729182cfeae647257423576fc6129105d79d42"
  }
}
```

This evidence **does not** invent an internal Studio application exception. It **does** prove Docker refused to publish **TCP 54323** because that socket address was already in use.

### 9.2 Sanitized stderr excerpt (artifact; no secrets)

`cliStderrExcerpt` (truncated flags **false**; condensed here for readability; full text in the runtime manifest):

```
npm warn Unknown env config "devdir". ...
NotFound: FileSystem.readFile (C:\Users\Ping\.supabase\profile)
Starting database...
Initialising schema...
Running migrations
Seeding selfhosted Realtime
Starting Realtime
Seeding globals from roles.sql...
WARN: no files matched pattern: supabase/seed.sql
Stopping containers...
Pruned containers: [...12 ids...]
Pruned volumes: [supabase_db_e02-bcr-aux-local-007-20260824a supabase_storage_e02-bcr-aux-local-007-20260824a supabase_edge_runtime_e02-bcr-aux-local-007-20260824a]
Pruned network: [supabase_network_e02-bcr-aux-local-007-20260824a]
```

`npm warn Unknown env config "devdir"` is environmental noise. `NotFound: FileSystem.readFile (...\.supabase\profile)` is a missing optional CLI profile; it is **not** the bind-failure line. Start **did begin** (database / schema / Realtime / roles.sql) and then **self-stopped**. The **causal** diagnostic is in **stdout** (`LegacyContainerStartError` / port **54323**).

Sanitization: excerpts contain **no** DB passwords, service-role keys, or connection strings. Container IDs and workdir names are non-secret identifiers.

### 9.3 Post-apply read-only operator corroboration (not BCR logic; not Docker logs)

Performed **after** artifact cleanup. **No** `docker logs`. **No** process kill. **No** retry.

| Check | Result |
|-------|--------|
| `docker ps -a` after apply | **empty** (no leftover LOCAL-007 containers) |
| Auxiliary OS-temp dir | **absent** |
| Host TCP **54323** still bound | **YES** — `Get-NetTCPConnection` LocalPort 54323 State=`Bound` OwningProcess=**5668**; also one `CloseWait` from `10.0.0.56:54323` |
| Owning process (read-only) | **Weixin.exe** (`C:\Program Files\Tencent\Weixin\Weixin.exe`) PID 5668 · start time 2026-06-21 |

This corroborates the artifact stdout: **54323 was occupied by a long-running host process, not by a leftover LOCAL-005/006/007 container** (pre-apply `docker ps -a` was already empty; post-apply still empty). This task **did not** terminate Weixin and **did not** remap Studio.

LOCAL-006’s observation (`supabase_studio` not observed · 54323 not published on a warm engine) is **consistent with** this bind collision but **was not proven** in LOCAL-006 because stderr capture truncated before the JSON error. LOCAL-007 **does not reclassify** LOCAL-006 evidence.

---

## 10. Platform baseline / auth / storage / local DB target — **NOT REACHED**

| Field | Value |
|-------|-------|
| `platformBaselineReady` | `false` |
| `auth` / `storage` presence | **NOT VERIFIED** (no live connection) |
| `auth.users` / `storage.objects` / `storage.buckets` | **NOT VERIFIED** |
| Platform histories fabricated by BCR | **NO** |
| `supabase status --output json` | **NOT REACHED** |
| Local DB target validation / classification | **NOT REACHED** |
| DB URL persisted | **NO** |

---

## 11. Initial application history / app-layer reset — **NOT REACHED**

| Field | Value |
|-------|-------|
| `applicationMigrationHistoryInitiallyEmpty` | `false` (default; validation not reached) |
| Application reset | **NOT INVOKED** |
| auth/storage/platform histories touched | **NO** |

---

## 12. Authoritative migration source / quarantine / executed count

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
| Option B | **NOT USED** |
| Migration repair / fake `schema_migrations` | **NO** |

---

## 13. HMD-002 critical runtime proof — **NOT REACHED**

| Question | Answer |
|----------|--------|
| Restored file reached? | **NO** |
| Execution attempted? | **NO** |
| Applied successfully? | **NO** |
| Recorded truthfully as applied? | **NO** (nothing applied) |
| Old parser failure reproduced? | **NO** (file not executed) |

HMD-002 remains **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING**. **Not CLOSED.** **Not** “RUNTIME REPLAY VERIFIED.”

---

## 14. First failing migration / highest applied

| Field | Value |
|-------|-------|
| First failing migration | **NONE** (governed replay not reached) |
| Highest successful / applied version | **NONE** |
| Truthful history | **YES** — nothing written; nothing fabricated |

---

## 15. RU-1.1 / RU-1.2

| Item | Result |
|------|--------|
| RU-1.1 file applied | **NO** (`ru11Reached=false`) |
| Primary Audit object existence | **NOT VERIFIED** |
| RU-1.2 file applied | **NO** (`ru12Reached=false`) |
| RU-1.2 metadata | **NOT VERIFIED** |
| RPC invoked | **false** |

---

## 16. Manifest / preserve / baseline verifier

| Field | Value |
|-------|-------|
| Manifest | `tests/e02/evidence/local-007-20260824a/bcr-replay-manifest.json` |
| Manifest result | `APPLICATION_FAILED` |
| `auxiliaryEnvironmentDisposition` | `CLEANED_AFTER_FAILURE` |
| `baselineVerificationPending` | `false` |
| `cleanupRequired` | `false` |
| `cleanupCompleted` | `true` |
| Preserve hand-off `RUNNING_FOR_BASELINE_VERIFY` | **NOT REACHED** |
| Baseline-verifier authority `E02_BASELINE_VERIFICATION_AUTHORIZED` | **NOT SET** |
| `npm run verify:e02:baseline` | **NOT RUN** |
| Primary Audit baseline | **NOT RUN** |
| RU-1.2 metadata baseline | **NOT RUN** |

---

## 17. Prohibited runtime (confirmed not performed)

| Item | Result |
|------|--------|
| RPC `execute_owner_vote_atomic_freeze_commit` invoked | **false** |
| RU-1.4 tests | **false** |
| Destructive fixtures | **false** |
| Concurrency suite | **false** |
| EIR-048 / EIR-054 evidence | **false** |
| Container logs (`docker logs`) | **false** |
| Production / staging / remote Supabase | **false** |
| Repo-root Supabase as application target | **false** |
| Raw Docker/Postgres substitute path | **false** |
| LOCAL-008 created | **false** |
| `E-02-RU-1.4-REA` issued | **false** |

---

## 18. BCR-CB runtime classification (this run only; not production)

| Defect | Classification |
|--------|----------------|
| BCR-CB-001 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** (aux empty-migrations=0 recorded; start failed before platform baseline proof) |
| BCR-CB-002 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** (init PASS; start FAIL) — **not** `RUNTIME VERIFIED LOCALLY` |
| BCR-CB-003 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** (preserve hand-off not reached; failure-path cleanup **did** run) |
| BCR-CB-004 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** (verifier not invoked) |

Do **not** generalize to production.

---

## 19. HMD / cleanup / overall

| Item | Status |
|------|--------|
| HMD-001 | **OPEN** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING** |
| Cleanup | Failure-path **CLEANED_AFTER_FAILURE** · aux dir absent · no leftover containers |
| Final environment disposition | `CLEANED_AFTER_FAILURE` |
| Overall Database Application Result | **APPLICATION_FAILED** |
| LOCAL-005 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-006 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-007 | **NOT SUCCESSFULLY CONSUMED** |
| Database baseline verified | **NO** |
| RU-1.4 authorization | **RUNTIME NOT AUTHORIZED** |
| EIR / Acceptance / Certification | **UNCHANGED** (documents not modified) |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Final COMMIT path | **BLOCKED** |

---

## 20. Forensic note (this run vs LOCAL-005 / LOCAL-006)

```
DOCKER PRE-WARM GATE              = PASS
COLD WAKE DURING APPLY            = NO
START                             = FAILED (status=1)
DIAGNOSTIC OBSERVABILITY          = RUNTIME EXERCISED
ARTIFACT STDOUT ROOT-CAUSE CLUE   = LegacyContainerStartError
                                    host TCP 0.0.0.0:54323 already in use
                                    (supabase_studio_... bind failed)
CONTAINER LOGS                    = NOT COLLECTED
```

Idle-wake is **not** the explanation for this LOCAL-007 failure. The captured stdout names a **host port collision on Studio’s default 54323**. Post-apply, that port remained bound by **Weixin.exe** (PID 5668) with **zero** Docker containers present.

This evidence **does not** authorize killing host processes, remapping Studio, editing the artifact, or retrying LOCAL-007.

---

## 21. Next governance action

| Condition | Next |
|-----------|------|
| **Current (`APPLICATION_FAILED` · auxiliary `supabase start` PROCESS_EXITED_NONZERO on a pre-warmed engine · 54323 bind collision captured)** | **RETURN TO GOVERNANCE.** Do **not** retry LOCAL-007. Do **not** automatically create LOCAL-008. Do **not** expand quarantine. Do **not** edit the restored migration. Do **not** modify the replay artifact / verifier / guard / packages / tests. Do **NOT** issue `E-02-RU-1.4-REA`. |
| Only after a future `APPLIED_AND_BASELINE_VERIFIED` | [`E-02-RU-1.4-Runtime-Execution-Authorization.md`](E-02-RU-1.4-Runtime-Execution-Authorization.md) (`E-02-RU-1.4-REA`) — **not** reached |

This evidence document **does not create** LOCAL-008 and **does not create** REA.

---

## 22. Confirmation of no unauthorized work

This execution modified **only** the evidence document, the implementation README ledger, and the artifact-written runtime manifest under `tests/e02/evidence/local-007-20260824a/`. **No** source, migration, verifier, guard, package, test, quarantine, CB-B, launcher, diagnostic-code, sanitization, or cleanup-semantic change. **No** second apply after the governed start failure. **No** Docker mutation to “fix” the port. **No** container logs.

---

## 23. Lock statement

```
E-02-DBA-LOCAL-007                         = NOT SUCCESSFULLY CONSUMED
DATABASE APPLICATION RESULT                = APPLICATION_FAILED
PRE-EXECUTION GATE                         = PASS
DOCKER ENGINE PRE-WARM                     = PASS
COLD WAKE DURING APPLY                     = NO
DIAGNOSTIC OBSERVABILITY                   = IMPLEMENTED / PRESERVED / RUNTIME EXERCISED
ROOT-CAUSE EVIDENCE                        = LegacyContainerStartError · TCP 54323 bind collision
                                           (supabase_studio publish failed)
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
LOCAL-006                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-007                                  = NOT SUCCESSFULLY CONSUMED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = RETURN TO GOVERNANCE (NO LOCAL-007 RETRY · NO AUTO LOCAL-008 · NO REA)
```

---

**End of document — E-02-DBA-LOCAL-007 Evidence — v1.0 — 2026-08-24**
