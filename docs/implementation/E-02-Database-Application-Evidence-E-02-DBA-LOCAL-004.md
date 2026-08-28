# E-02 Database Application Evidence — E-02-DBA-LOCAL-004

| Field | Value |
|-------|-------|
| **Document Type** | Database Application Evidence (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-004** |
| **Authorization Reference** | [`E-02-Database-Application-Authorization-LOCAL-004.md`](E-02-Database-Application-Authorization-LOCAL-004.md) v1.0 |
| **BCR Artifact Authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md) (E-02-BCR-IA-003) · [`E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion-002.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion-002.md) |
| **Predecessors** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md) — **immutable / not reclassified** |
| **Status** | **Issued — Execution Attempted — Application Failed (Governed Replay · first failing historical migration)** |
| **Revision** | v1.0 |
| **Effective Date** | 2026-08-23 |
| **Production Effect** | **None** |

```
OVERALL DATABASE APPLICATION RESULT     = APPLICATION_FAILED
FAILURE STAGE                           = GOVERNED REPLAY (real repository migration apply)
FIRST FAILING MIGRATION                 = 20260315035847_add_meeting_templates_and_attachments.sql
DATABASE ERROR                          = syntax error at or near "1."
EXECUTED BEFORE FAILURE                 = 15
QUARANTINE ALREADY CROSSED              = YES (declared quarantine omitted; replay continued)
RU-1.1 REACHED                          = NO
RU-1.2 REACHED                          = NO
AUTHORIZATION CONSUMED                  = NO (E-02-DBA-LOCAL-004 NOT successfully consumed)
CLEAN-BASE MODE                         = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS (CB-B)
BASELINE MODE                           = E02_DECLARED_BASELINE_REPLAY
QUARANTINE                              = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINED MIGRATION SQL               = NOT EXECUTED
QUARANTINED MIGRATION RECORDED APPLIED  = NO
HISTORICAL MIGRATION FILE               = UNCHANGED
MIGRATION HISTORY                       = TRUTHFUL (applied recorded; quarantined omitted; failing not recorded)
RU-1.1 DATABASE                         = NOT APPLIED
RU-1.2 DATABASE                         = NOT APPLIED
DATABASE BASELINE VERIFIED              = NO
BCR-CB-001                              = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
                                        (CB-B acquisition path succeeded; full replay did not complete)
BCR-CB-002                              = RUNTIME VERIFIED IN LOCAL EVIDENCE ENVIRONMENT
BCR-CB-003                              = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-004                              = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
HMD-001                                 = OPEN
RPC INVOCATION                          = NONE
RU-1.4 RUNTIME                          = NOT AUTHORIZED / NOT CONSUMED
```

> **Result semantics (LOCAL-004 §25/§32):** `APPLICATION_FAILED` — execution *was attempted* (target/Docker/plan passed; CB-B auxiliary environment was acquired; governed replay began) and failed at the first non-quarantined historical migration that PostgreSQL rejected. Not `BLOCKED` (pre-checks passed). Not `APPLIED_BASELINE_FAILED` (replay never succeeded). Authorization **not consumed**. **No silent retry. No source edit. No migration edit. No second quarantine.**

---

## 1. Authorization

| Field | Value |
|-------|-------|
| Authorization ID | E-02-DBA-LOCAL-004 |
| Decision | APPROVED WITH CONDITIONS |
| Artifact IA | E-02-BCR-IA-003 |
| Runtime DBA identity | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-004` (exact; **no source authorization-ID edit**) |
| Apply gates | `E02_BCR_APPLY_AUTHORIZED=true` + exact DBA ID + `E02_ALLOW_DESTRUCTIVE_TESTS=true` + `E02_EVIDENCE_ENV=local` |
| Preserve mode | `--apply --preserve-environment` (requested; not reached as a success hand-off) |
| Superseding authority | [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026–PAD-038) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011–PAD-025) |
| Application mechanism | `scripts/verification/e02/replay-e02-declared-baseline.ts` (E-02-BCR-IA-003) |

---

## 2. Target safety finding — **PASS**

| Check | Result |
|-------|--------|
| Environment class | `LOCAL_DISPOSABLE_SUPABASE` |
| Local disposable target model (CB-B OS-temp auxiliary project) | **PASS** |
| Not production | **PASS** |
| Not remote | **PASS** |
| Not shared staging | **PASS** |
| Not linked as the runtime target | **PASS** — no `supabase link`; runtime target was a fresh OS-temp auxiliary project |
| Repo-workdir Supabase used as runtime target | **NO** |
| Repo leftover `supabase/.temp/project-ref` | Present on disk from prior CLI use; **not used** as this run's target |

---

## 3. Docker Engine — **PASS**

`docker version` reported Client **and** Server: Client 29.7.2 (windows/amd64) · Server Docker Desktop 4.87.0, Engine 29.7.2 (linux/amd64). Docker Engine available.

---

## 4. Environment

| Field | Value |
|-------|-------|
| Environment class | `LOCAL_DISPOSABLE_SUPABASE` |
| Clean-base mode | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` (CB-B) |
| Baseline mode | `E02_DECLARED_BASELINE_REPLAY` |
| Repository commit | `afc7a29630cdbc4bfbdd5eaebb4bc8842663176e` |
| Execution date | 2026-08-23 |
| Host platform | Windows (`win32`) |
| ComSpec | `C:\Windows\system32\cmd.exe` |
| Apply opt-in | `E02_BCR_APPLY_AUTHORIZED=true` |
| DBA ID | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-004` |
| Guard inputs | `E02_ALLOW_DESTRUCTIVE_TESTS=true` · `E02_EVIDENCE_ENV=local` |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **NOT SET / NOT CONSUMED** |

---

## 5. Evidence run identity

| Field | Value |
|-------|-------|
| `E02_EVIDENCE_RUN_ID` | `local-004-20260823a` |
| LOCAL-003 run id reused | **NO** |
| Auxiliary naming | `<OS_TMP>/e02-bcr-aux-local-004-20260823a` |

---

## 6. Commands executed (this task)

| # | Command | Purpose | Result |
|---|---------|---------|--------|
| 1 | `docker version` | Docker availability (read-only) | **PASS** — Client + Server |
| 2 | `npx tsx …replay-e02-declared-baseline.ts --plan` | Read-only BCR plan | **PASS** (§7) |
| 3 | `E02_BCR_APPLY_AUTHORIZED=true` · `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-004` · `--apply --preserve-environment` | CB-B governed apply | **FAILED** — governed replay at `20260315035847_…` (§12) |
| 4 | Artifact failure-path cleanup (`supabase stop` + temp-dir removal) | Best-effort after diagnostics | **SUCCEEDED** — `CLEANED_AFTER_FAILURE` |
| 5 | `docker ps -a` / OS-temp listing (read-only, post-failure) | Confirm teardown | No containers · no `e02-bcr-aux-*` dirs |

**Explicitly NOT executed:** repo-workdir `supabase start` · `supabase db reset` · `npm run verify:e02:baseline` (prerequisite apply did not succeed) · `npm run verify:e02` · `verify:e02:concurrency` · `test:e02` · `test:e02:integration` · any EIR-048/EIR-054 · any RPC invocation · any migration edit/rename/move/delete · any second quarantine · any `supabase migration repair` · any source edit · any explicit second `--cleanup` after already-successful failure teardown.

---

## 7. BCR pre-execution plan — **PASS**

```
artifactAuthorizationId            = E-02-BCR-IA-003
expectedDbaAuthorizationId         = E-02-DBA-LOCAL-004
validatedDbaAuthorizationId        = null (plan)
baselineMode                       = E02_DECLARED_BASELINE_REPLAY
cleanBaseMode                      = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
cliLauncherPlatform                = win32
cliLauncherMode                    = WINDOWS_COMSPEC_NPX
quarantineCount                    = 1
quarantinedMigration               = 20260314195641_add_demo_data.sql
bcrCb001Status / 002 / 003 / 004   = IMPLEMENTED_RUNTIME_PENDING
migrationCountDiscovered           = 283 (timestamped) · 2 non-timestamped
result                             = PLAN_OK
```

No DB mutation during plan. All LOCAL-004 §4 plan expectations matched.

---

## 8. Launcher runtime (BCR-CB-002) — **PASS in this local evidence environment**

| Field | Value |
|-------|-------|
| Platform | `win32` |
| Mode | `WINDOWS_COMSPEC_NPX` |
| Contract | `ComSpec`/`cmd.exe` + `/d /s /c` + `npx` + `supabase` + allowlist + `shell:false` |
| `npx.cmd` fallback | **NOT USED** |
| `shell:true` fallback | **NOT USED** |

| Command | Classification |
|---------|----------------|
| `supabase init` | **PROCESS_EXITED_ZERO** (auxiliary project created) |
| `supabase start --workdir <aux>` | **PROCESS_EXITED_ZERO** (stack started; env-guard subsequently consumed local URL) |
| `supabase status --workdir <aux> --output json` | **PROCESS_EXITED_ZERO** (DB URL discovered; host `127.0.0.1`) |
| `supabase stop --workdir <aux>` (failure-path cleanup) | **PROCESS_EXITED_ZERO** (`cleanupCompleted=true`; no cleanup warnings) |

**BCR-CB-002 result:** **RUNTIME VERIFIED IN LOCAL EVIDENCE ENVIRONMENT.** Preserved even though a later unrelated historical-migration stage failed.

---

## 9. Auxiliary environment

| Field | Value |
|-------|-------|
| Auxiliary workdir (sanitized) | `<OS_TMP>/e02-bcr-aux-local-004-20260823a` |
| Fresh auxiliary project | `true` |
| LOCAL-003 temp reused | **NO** |
| Repo-root local Supabase reused | **NO** |
| `supabase init` | **SUCCEEDED** |
| Auxiliary timestamped migration count before start | **0** |
| Repository mutation by init | **NONE** |

---

## 10. Auxiliary start / platform baseline / connection

| Field | Value |
|-------|-------|
| `supabase start --workdir` | **SUCCEEDED** |
| Repository migrations executed during auxiliary startup | **NO** (aux migrations empty; quarantined file not present in aux) |
| `platformBaselineReady` | **true** |
| `auth` schema exists | **YES** (artifact platform-baseline check) |
| `storage` schema exists | **YES** (artifact platform-baseline check) |
| `auth.users` / `storage.objects` / `storage.buckets` | Not separately catalogued beyond schema-level platform-baseline PASS; start produced a healthy local stack consumed by the artifact |
| Platform histories fabricated by BCR | **NO** |
| `supabase status --output json` | **SUCCEEDED** |
| DB URL exists | **YES** (runtime-only; **not persisted**) |
| DB host locality | **`127.0.0.1`** (local) |
| Guard log (sanitized) | `evidenceRunId=local-004-20260823a env=local projectRef=127.0.0.1 host=127.0.0.1:54321` |

---

## 11. Application-history initial state / reset

| Field | Value |
|-------|-------|
| Application migration history initially empty | **true** |
| `resetApplicationLayerForReplay()` | **EXECUTED** (bounded: `public` + `supabase_migrations`) |
| `auth` / `storage` / platform histories reset | **NO** (not authorized; not performed) |
| Unexpected applied repo rows before replay | **NO** |

### schema_migrations runtime shape (after reset, before replay)

Adapter ensures:

```
supabase_migrations.schema_migrations
  (version text NOT NULL PRIMARY KEY, statements text[], name text)
```

Runtime column discovery used those columns for subsequent `recordApplied` inserts. Live catalog after cleanup is **gone** (environment torn down). No secrets recorded.

---

## 12. Governed replay — **FAILED**

| Field | Value |
|-------|-------|
| Real repository source | `supabase/migrations` (authoritative) |
| Auxiliary migrations as application source | **NO** (remained empty) |
| Deterministic order | **YES** |
| Discovered timestamped | 283 |
| Quarantine count | **1** |
| Second quarantine added | **NO** |
| Executed (successfully recorded) | **15** |
| First failing migration | `20260315035847_add_meeting_templates_and_attachments.sql` |
| Failing version | `20260315035847` |
| Database error | `syntax error at or near "1."` |
| Quarantine already crossed | **YES** |
| RU-1.1 reached | **NO** |
| RU-1.2 reached | **NO** |
| Highest applied version | `20260315033923` (`add_meeting_records_table`) |
| Continue / retry / repair | **NO** |

### 12.1 Executed before failure (15) + declared quarantine (omitted)

```
20260314034834_create_strata_schema.sql                          APPLIED
20260314042930_add_profile_insert_policy.sql                     APPLIED
20260314055449_add_missing_policies_and_tables.sql               APPLIED
20260314060801_fix_critical_security_issues.sql                  APPLIED
20260314061700_add_owner_info_insert_policy.sql                  APPLIED
20260314062640_fix_vote_privacy_security.sql                     APPLIED
20260314062844_add_foreign_key_indexes.sql                       APPLIED
20260314062921_optimize_rls_auth_function_calls.sql              APPLIED
20260314062936_remove_duplicate_indexes.sql                      APPLIED
20260314195641_add_demo_data.sql                                 QUARANTINED — NOT EXECUTED — NOT RECORDED
20260314211043_fix_hiring_candidates_insert_policy.sql           APPLIED
20260314212434_add_phone_and_unit_number.sql                     APPLIED
20260314212952_add_owner_info_delete_policy.sql                  APPLIED
20260315010915_create_property_manager_system.sql                APPLIED
20260315032339_add_compliance_docs_table.sql                     APPLIED
20260315033923_add_meeting_records_table.sql                     APPLIED
20260315035847_add_meeting_templates_and_attachments.sql         FAILED — NOT RECORDED
```

### 12.2 Forensic finding (read-only; file not modified)

The failing file is a historical application migration. Its `INSERT INTO meeting_templates …` block contains **truncated / broken SQL string literals** (Chinese description fields end as `成?,` / `会?,` rather than a closed `'…'` string). PostgreSQL therefore leaves the `E'1. Opening and attendance…'` agenda literal and reports `syntax error at or near "1."`.

This is **not** a BCR launcher defect, **not** a CB-B acquisition defect, **not** HMD-001 (demo FK / missing `auth.users`+`profiles` row), and **not** a platform-baseline fabrication issue.

**Classification:** new historical-migration **SQL syntax / encoding** defect at `20260315035847_add_meeting_templates_and_attachments.sql`. Governance must allocate the next official historical-defect identifier; this evidence **does not invent** a registry number.

**Prohibited actions (NOT performed):** edit/rename/move/delete/comment-out/patch/repair the file · copy-over · add a second quarantine · inject data · continue replay · silent retry · `supabase migration repair`.

---

## 13. Quarantine / truthful history

| Field | Value |
|-------|-------|
| Quarantined migration SQL executed | **NO** |
| Quarantined version `20260314195641` recorded as applied | **NO** |
| Fake applied row | **NONE** |
| `supabase migration repair` | **NOT USED** |
| Truthfulness | **HELD** — 15 applied rows correspond to 15 successful executions; quarantine omitted; failing file not recorded |

---

## 14. Migration integrity

| Check | Result |
|-------|--------|
| `20260314195641_add_demo_data.sql` unchanged | **YES** (git index `513e0989…`) |
| `20260315035847_add_meeting_templates_and_attachments.sql` unchanged | **YES** (git index `e27f58f5…`) |
| RU-1.1 / RU-1.2 files unchanged | **YES** (not reached; not edited) |
| Any migration renamed/moved/deleted/edited | **NO** |
| `git status supabase/migrations` | clean |

---

## 15. RU-1.1 / RU-1.2 database presence

| Migration | Reached | Applied (DB) | Object present |
|-----------|---------|--------------|----------------|
| RU-1.1 `20261729120000_…` | **NO** | **NO** | `public.owner_vote_primary_freeze_audits` **NOT VERIFIED** |
| RU-1.2 `20261821120000_…` | **NO** | **NO** | `public.execute_owner_vote_atomic_freeze_commit` (+ helper) **NOT VERIFIED** |

---

## 16. BCR manifest

| Field | Value |
|-------|-------|
| Manifest path | `tests/e02/evidence/local-004-20260823a/bcr-replay-manifest.json` (runtime / gitignored evidence) |
| `validatedDbaAuthorizationId` | `E-02-DBA-LOCAL-004` |
| `artifactAuthorizationId` | `E-02-BCR-IA-003` |
| `baselineMode` | `E02_DECLARED_BASELINE_REPLAY` |
| `cleanBaseMode` | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` |
| `cliLauncherPlatform` | `win32` |
| `cliLauncherMode` | `WINDOWS_COMSPEC_NPX` |
| `freshAuxiliaryProject` | `true` |
| `auxiliaryMigrationCountBeforeStart` | `0` |
| `platformBaselineReady` | `true` |
| `applicationMigrationHistoryInitiallyEmpty` | `true` |
| `platformHistoryPreserved` | `true` |
| `quarantineCount` | `1` |
| `ru11Reached` / `ru12Reached` | `false` / `false` |
| Success-path disposition `RUNNING_FOR_BASELINE_VERIFY` | **NOT ESTABLISHED** (apply failed) |
| Actual disposition | `CLEANED_AFTER_FAILURE` |
| `baselineVerificationPending` | `false` |
| `cleanupRequired` | `false` |
| `cleanupCompleted` | `true` |
| `result` | `APPLICATION_FAILED` |
| Secrets in manifest | **NONE** |

---

## 17. Preserved-environment / baseline verifier — **NOT RUN**

| Field | Value |
|-------|-------|
| Success preserve hand-off | **NOT REACHED** |
| Re-status after successful BCR exit | **N/A** (process exited failed; env already on failure-cleanup path) |
| `E02_BASELINE_VERIFICATION_AUTHORIZED` | **NOT SET for a verifier run** (verifier never invoked) |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **NOT SET / NOT CONSUMED** |
| `npm run verify:e02:baseline` | **NOT RUN** — prerequisite apply did not succeed |
| Primary Audit baseline checks | **NOT RUN** |
| RU-1.2 RPC metadata checks | **NOT RUN** |
| RPC invoked | **NO** |

---

## 18. Runtime / evidence boundary confirmation

| Field | Value |
|-------|-------|
| runtimeExecutionPerformed | false |
| rpcInvocationPerformed | false |
| destructiveFixtureExecution | false |
| integrationTestExecution | false |
| concurrencyTestExecution | false |
| RU-1.4 evidence suite | NOT RUN |
| EIR reclassification | none |

---

## 19. Defect runtime classifications

| Defect | Result |
|--------|--------|
| **BCR-CB-001** | CB-B acquisition (fresh aux · empty migrations · start without repo-migration apply · platform baseline · empty application history · bounded reset) **succeeded**. Governed replay **did not complete**. **RUNTIME VERIFICATION PENDING** — not closed. |
| **BCR-CB-002** | **RUNTIME VERIFIED IN LOCAL EVIDENCE ENVIRONMENT** — init / start / status / stop via ComSpec/`cmd.exe` `/d /s /c` `npx supabase` `shell:false`. |
| **BCR-CB-003** | Success preserve → external verifier → explicit `--cleanup` **not reached**. Failure-path auto-cleanup **did** run. **RUNTIME VERIFICATION PENDING**. |
| **BCR-CB-004** | Baseline verifier **not run**. **RUNTIME VERIFICATION PENDING**. |
| **HMD-001** | **OPEN** (quarantine omitted as designed; defect not repaired). |
| **New historical SQL syntax/encoding defect** | Observed at `20260315035847_add_meeting_templates_and_attachments.sql`. Distinct from HMD-001 / BCR-CB-*. **OPEN — return to historical-migration governance.** |

---

## 20. Cleanup

| Field | Value |
|-------|-------|
| Path | Artifact **failure-path** cleanup after diagnostics + failure manifest (authorized; not the success `--cleanup` after verifier) |
| `supabase stop --workdir <aux>` | **SUCCEEDED** (same ComSpec launcher — additional BCR-CB-002 `stop` proof) |
| Temp-dir removal | **SUCCEEDED** |
| Cleanup warnings | **NONE** |
| Final disposition | `CLEANED_AFTER_FAILURE` |
| `cleanupCompleted` | `true` |
| Explicit post-verify `--cleanup` | **NOT RUN** — success verify hand-off never established; a second `--cleanup` against an already-removed workdir would have risked a false `CLEANUP_FAILED` |
| Manual global `supabase stop` | **NOT USED** |
| Fabricated `CLEANED_AFTER_VERIFY` | **NO** |

---

## 21. Database Application Manifest (summary)

```
validatedDbaAuthorizationId        : E-02-DBA-LOCAL-004
artifactAuthorizationId            : E-02-BCR-IA-003
baselineMode                       : E02_DECLARED_BASELINE_REPLAY
cleanBaseMode                      : AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
environmentClass                   : LOCAL_DISPOSABLE_SUPABASE
evidenceRunId                      : local-004-20260823a
cliLauncherMode                    : WINDOWS_COMSPEC_NPX
cliLauncherPlatform                : win32
freshAuxiliaryProject              : true
auxiliaryWorkdir                   : <OS_TMP>/e02-bcr-aux-local-004-20260823a
auxiliaryMigrationCountBeforeStart : 0
platformBaselineReady              : true
applicationMigrationHistoryInitiallyEmpty : true
realRepositoryMigrationSource      : supabase/migrations
platformHistoryPreserved           : true
repositoryRef                      : afc7a29630cdbc4bfbdd5eaebb4bc8842663176e
dockerStatus                       : Client+Server available
bcrPlanResult                      : PASS
bcrApplyResult                     : APPLICATION_FAILED
failureStage                       : GOVERNED_REPLAY
firstFailingMigration              : 20260315035847_add_meeting_templates_and_attachments.sql
databaseError                      : syntax error at or near "1."
migrationCountDiscovered           : 283 timestamped · 2 non-timestamped
migrationCountExecuted             : 15
migrationCountQuarantined          : 1
quarantinedMigrations              : [ "20260314195641_add_demo_data.sql" ]
quarantineSqlExecuted              : false
quarantineHistoryRow               : false
highestAppliedVersion              : 20260315033923
ru11Reached / ru11Applied          : false / false
ru12Reached / ru12Applied          : false / false
manifestFile                       : tests/e02/evidence/local-004-20260823a/bcr-replay-manifest.json
auxiliaryEnvironmentDisposition    : CLEANED_AFTER_FAILURE
baselineVerifier                   : NOT_RUN
rpcInvoked                         : false
overallResult                      : APPLICATION_FAILED
```

**No secrets recorded.**

---

## 22. Overall Database Application Result

```
APPLICATION_FAILED
```

**Failure stage:** governed replay of the real repository migration set.  
**Failure cause:** historical file `20260315035847_add_meeting_templates_and_attachments.sql` is not valid PostgreSQL as stored (broken string literals → `syntax error at or near "1."`).  
**CB-B acquisition / Windows launcher:** succeeded. **Baseline verification:** not run.  
**DBA completion semantics:** `E-02-DBA-LOCAL-004` **NOT successfully consumed**.

---

## 23. Status ledger

| Item | Status |
|------|--------|
| HMD-001 | **OPEN** |
| New historical SQL syntax/encoding defect (`20260315035847_…`) | **OPEN** — governance must classify / allocate ID |
| BCR-CB-001 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** |
| BCR-CB-002 | **RUNTIME VERIFIED IN LOCAL EVIDENCE ENVIRONMENT** |
| BCR-CB-003 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** |
| BCR-CB-004 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** |
| E-02-DBA-LOCAL-001 | **NOT CONSUMED / IMMUTABLE** |
| E-02-DBA-LOCAL-002 | **FAILED / NOT CONSUMED / IMMUTABLE** |
| E-02-DBA-LOCAL-003 | **FAILED / NOT CONSUMED / IMMUTABLE** |
| E-02-DBA-LOCAL-004 | **NOT SUCCESSFULLY CONSUMED** |
| Database application | **APPLICATION_FAILED** |
| Baseline verified | **NO** |
| RU-1.4 runtime | **NOT AUTHORIZED** (no REA) |
| EIR | **No PASS reclassification** |
| Acceptance | **ACCEPTANCE_BLOCKED** |
| Project Certification | **NOT ISSUED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Executable Final COMMIT Path | **BLOCKED** |
| PCQ-010 / PCQ-011 / PCQ-012 | **OPEN** |

---

## 24. Next governance action

| Condition | Next |
|-----------|------|
| **Current (`APPLICATION_FAILED` · historical SQL syntax/encoding at `20260315035847_…`)** | **Return to historical-migration / program governance.** Classify the new defect, keep the file **immutable**, do **not** silently add a second quarantine, and only then issue any successor DBA. **Do NOT** issue `E-02-RU-1.4-REA`. |
| Only after `APPLIED_AND_BASELINE_VERIFIED` | [`E-02-RU-1.4-Runtime-Execution-Authorization.md`](E-02-RU-1.4-Runtime-Execution-Authorization.md) (`E-02-RU-1.4-REA`) — **not** reached |

---

## 25. Lock statement

```
E-02-DBA-LOCAL-004                         = NOT SUCCESSFULLY CONSUMED
DATABASE APPLICATION RESULT                = APPLICATION_FAILED
FAILURE STAGE                              = GOVERNED REPLAY
FIRST FAILING MIGRATION                    = 20260315035847_add_meeting_templates_and_attachments.sql
DATABASE ERROR                             = syntax error at or near "1."
EXECUTED COUNT                             = 15
HIGHEST APPLIED VERSION                    = 20260315033923
DOCKER                                     = AVAILABLE (Client + Server)
TARGET                                     = LOCAL DISPOSABLE (CB-B OS-temp auxiliary) — safety PASS
CLEAN-BASE MODE                            = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
BASELINE MODE                              = E02_DECLARED_BASELINE_REPLAY
ARTIFACT AUTHORITY                         = E-02-BCR-IA-003
DBA AUTHORIZATION ID                       = E-02-DBA-LOCAL-004 (exact env; no source edit)
WINDOWS CLI LAUNCHER                       = COMSPEC/CMD.EXE + NPX SUPABASE + SHELL FALSE — RUNTIME VERIFIED LOCAL
AUXILIARY PROJECT                          = FRESH / EMPTY MIGRATIONS / STARTED / THEN CLEANED AFTER FAILURE
PLATFORM BASELINE                          = READY (auth + storage schemas)
APPLICATION HISTORY                        = TRUTHFUL
REAL REPOSITORY MIGRATIONS                 = AUTHORITATIVE SOURCE
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINED MIGRATION SQL EXECUTED         = NO
QUARANTINED MIGRATION RECORDED AS APPLIED  = NO
HISTORICAL MIGRATION FILE                  = UNCHANGED
RU-1.1 DATABASE                            = NOT APPLIED
RU-1.2 DATABASE                            = NOT APPLIED
BASELINE VERIFIER                          = NOT RUN
BASELINE VERIFIER AUTHORITY                = E02_BASELINE_VERIFICATION_AUTHORIZED (not consumed)
RU-1.4 RUNTIME AUTHORITY                   = NOT CONSUMED
BCR-CB-001                                 = RUNTIME VERIFICATION PENDING
BCR-CB-002                                 = RUNTIME VERIFIED IN LOCAL EVIDENCE ENVIRONMENT
BCR-CB-003                                 = RUNTIME VERIFICATION PENDING
BCR-CB-004                                 = RUNTIME VERIFICATION PENDING
HMD-001                                    = OPEN
LOCAL-001                                  = NOT CONSUMED / IMMUTABLE
LOCAL-002                                  = FAILED / NOT CONSUMED / IMMUTABLE
LOCAL-003                                  = FAILED / NOT CONSUMED / IMMUTABLE
RPC INVOCATION                             = NONE
RU-1.4 DATABASE-BACKED TESTS               = NOT RUN
RU-1.4 EXECUTABLE EVIDENCE                 = NOT COLLECTED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = HISTORICAL-MIGRATION GOVERNANCE FOR 20260315035847 SYNTAX/ENCODING DEFECT — NO REA
DO NOT MODIFY MIGRATIONS · DO NOT ADD A SECOND QUARANTINE · DO NOT RUN RU-1.4 EVIDENCE SUITE
```

---

**End of document — E-02-DBA-LOCAL-004 Evidence — v1.0 — 2026-08-23**
