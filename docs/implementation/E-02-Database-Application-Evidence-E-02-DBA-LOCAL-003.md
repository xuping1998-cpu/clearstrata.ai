# E-02 Database Application Evidence — E-02-DBA-LOCAL-003

| Field | Value |
|-------|-------|
| **Document Type** | Database Application Evidence (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-003** |
| **Authorization Reference** | [`E-02-Database-Application-Authorization-LOCAL-003.md`](E-02-Database-Application-Authorization-LOCAL-003.md) v1.0 |
| **BCR Artifact Authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md) (E-02-BCR-IA-002) · [`E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion.md) |
| **Predecessors** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md) — **immutable / not reclassified** |
| **Status** | **Issued — Execution Attempted — Application Failed (Auxiliary Environment-Acquisition Stage · `supabase init` spawn)** |
| **Revision** | v1.0 |
| **Effective Date** | 2026-08-22 |
| **Production Effect** | **None** |

```
OVERALL DATABASE APPLICATION RESULT     = APPLICATION_FAILED
FAILURE STAGE                           = CB-B AUXILIARY ENVIRONMENT ACQUISITION (STEP 3 — supabase init spawn)
FAILURE ROOT CAUSE                      = ARTIFACT CHILD-PROCESS PORTABILITY DEFECT (Windows: spawnSync 'npx.cmd' shell:false → EINVAL)
NEW EXECUTION-TIME DEFECT               = BCR-CB-002 (CB-B child-process spawn portability) — distinct from HMD-001 and BCR-CB-001
AUTHORIZATION CONSUMED                  = NO (E-02-DBA-LOCAL-003 NOT successfully consumed)
CLEAN-BASE MODE                         = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS (CB-B)
BASELINE MODE                           = E02_DECLARED_BASELINE_REPLAY (not executed)
QUARANTINE                              = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINED MIGRATION SQL (GOVERNED)    = NOT EXECUTED
QUARANTINED MIGRATION RECORDED APPLIED  = NO
HISTORICAL MIGRATION FILE               = UNCHANGED
MIGRATION HISTORY (GOVERNED)            = TRUTHFUL (none written; nothing fabricated)
RU-1.1 DATABASE                         = NOT APPLIED (governed replay not reached)
RU-1.2 DATABASE                         = NOT APPLIED (governed replay not reached)
DATABASE BASELINE VERIFIED              = NO
BCR-CB-001                              = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING (runtime NOT verified)
HMD-001                                 = OPEN (not reached)
RPC INVOCATION                          = NONE
RU-1.4 RUNTIME                          = NOT AUTHORIZED
```

> **Result semantics (LOCAL-003 §28/§29):** `APPLICATION_FAILED` — execution *was attempted* (target/Docker safety passed; the governed artifact ran in `--apply`), and failed during **CB-B auxiliary environment acquisition** at the first CLI step (`supabase init`), before any governed replay. Not `BLOCKED` (pre-checks passed; the artifact executed). Not `APPLIED_BASELINE_FAILED` (replay never succeeded). Authorization **not consumed**.

---

## 1. Authorization

| Field | Value |
|-------|-------|
| Authorization ID | E-02-DBA-LOCAL-003 |
| Decision | APPROVED WITH CONDITIONS |
| Superseding authority | [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026–PAD-038) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011–PAD-025) |
| Clean-base design authority | [`E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md) (BCR-CB-001 · CB-B) |
| Application mechanism | Governed CB-B replay artifact `scripts/verification/e02/replay-e02-declared-baseline.ts` (E-02-BCR-IA-002) |

---

## 2. Authorization-ID runtime adjustment (§2)

| Field | Value |
|-------|-------|
| Adjustment performed | **YES — single line only** |
| Change | `AUTHORIZATION_ID` constant `'E-02-DBA-LOCAL-002'` → `'E-02-DBA-LOCAL-003'` in `scripts/verification/e02/replay-e02-declared-baseline.ts` |
| Rationale | LOCAL-003 §23/§2 requires the effective runtime `authorizationId = E-02-DBA-LOCAL-003` |
| Logic changed | **NONE** — quarantine, clean-base mode, migration logic, history logic, environment guards, and manifest semantics unchanged |
| Confirmed in `--plan` | `authorizationId = E-02-DBA-LOCAL-003` · `artifactAuthorizationId = E-02-BCR-IA-002` |

---

## 3. Target safety finding — **PASS**

| Check | Result |
|-------|--------|
| Local disposable target model (CB-B OS-temp auxiliary project) | **PASS** |
| Not production | **PASS** |
| Not remote | **PASS** |
| Not shared staging | **PASS** |
| Not linked to a remote project | **PASS** (no `supabase link`; no remote ref/URL used) |
| Repo-workdir Supabase used as runtime target | **NO** (CB-B targets a fresh OS-temp auxiliary workdir) |

---

## 4. Docker Engine — **PASS**

`docker version` reported Client **and** Server: Client 29.7.2 (windows/amd64) · Server Docker Desktop 4.87.0, Engine 29.7.2 (linux/amd64). Docker Engine available.

---

## 5. Environment

| Field | Value |
|-------|-------|
| Environment class | `LOCAL_DISPOSABLE_SUPABASE` |
| Clean-base mode | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` (CB-B) |
| Baseline mode | `E02_DECLARED_BASELINE_REPLAY` |
| Repository commit | `afc7a29630cdbc4bfbdd5eaebb4bc8842663176e` |
| Execution date | 2026-08-22 |
| Apply opt-in | `E02_BCR_APPLY_AUTHORIZED=true` (source-implemented gate) |
| Guard inputs | `E02_ALLOW_DESTRUCTIVE_TESTS=true` · `E02_EVIDENCE_ENV=local` (existing `environment-guard.ts` required inputs) |

---

## 6. Commands executed (this task)

| # | Command | Purpose | Result |
|---|---------|---------|--------|
| 1 | `docker version` | Docker availability (read-only) | **PASS** — Client + Server |
| 2 | `npx tsx …replay-e02-declared-baseline.ts --plan` | Read-only BCR plan | **PASS** (§7) |
| 3 | `E02_BCR_APPLY_AUTHORIZED=true … --apply` | CB-B governed apply | **FAILED** — STOP at auxiliary `supabase init` (§8) |
| 4 | *(diagnostic, disposable temp)* `npx supabase init` via shell | Confirm CLI viability | **PASS** — created `supabase/config.toml` (init itself works) |
| 5 | *(diagnostic)* `spawnSync('npx.cmd', ['supabase','init'], {shell:false})` | Reproduce artifact spawn | **EINVAL** — root cause reproduced |
| 6 | `docker ps -a` / `docker volume ls` (read-only) | Post-failure state | No containers · no volumes (aux start never reached) |
| 7 | `git rev-parse HEAD` / `git status` (read-only) | Repo ref + integrity | `afc7a296…`; migrations clean |

**Explicitly NOT executed:** repo-workdir `supabase start` · `supabase db reset` · governed replay (never reached) · `npm run verify:e02:baseline` (prerequisite not met) · any RU-1.4 evidence/concurrency/integration suite · any RPC invocation · any migration edit/rename/move/delete · any manual `auth`/`storage` init · any migration-history fabrication · any `supabase migration repair` · **no artifact logic modification** (only the §2 single-line `AUTHORIZATION_ID`).

---

## 7. BCR pre-execution plan — **PASS**

```
authorizationId                    = E-02-DBA-LOCAL-003
artifactAuthorizationId            = E-02-BCR-IA-002
baselineMode                       = E02_DECLARED_BASELINE_REPLAY
cleanBaseMode                      = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
freshAuxiliaryProject              = true
auxiliaryMigrationCountBeforeStart = 0 (requirement)
realRepositoryMigrationSource      = supabase/migrations
quarantineCount                    = 1
quarantinedMigration               = 20260314195641_add_demo_data.sql
platformHistoryPreserved           = true
bcrCb001Status                     = IMPLEMENTED_RUNTIME_PENDING
migrationCountDiscovered           = 283 (timestamped) · 2 non-timestamped · RU-1.1/RU-1.2 reachable
```

No DB mutation during plan. All §5 plan expectations matched.

---

## 8. CB-B governed apply — **FAILED (auxiliary environment-acquisition · STEP 3)**

Console result:

```
ReplayStop: STOP: auxiliary "supabase init" failed (status 1).
```

Stage reached: STEP 2 (fresh auxiliary temp workdir created) → **STEP 3 (`supabase init`) FAILED**. STEP 4+ (empty-migrations assertion, `supabase start`, status/DB-URL discovery, platform-baseline validation, application-history-empty validation, application-layer reset, governed replay) **NOT REACHED**.

### 8.1 Root-cause finding — BCR-CB-002 (CB-B child-process spawn portability defect)

| Item | Finding |
|------|---------|
| Reported error | `auxiliary "supabase init" failed (status 1)` |
| Actual mechanism | The artifact's `runSupabaseCli()` calls `spawnSync('npx.cmd', ['supabase','init'], { shell:false })`. On Windows this returns `error = "spawnSync npx.cmd EINVAL"` with `status = null`. `runSupabaseCli` maps a non-numeric status to `1`, so the surfaced message is *"failed (status 1)"*. |
| Reproduction | `spawnSync('npx.cmd', ['supabase','init'], {shell:false})` → **`status=null`, `error=spawnSync npx.cmd EINVAL`, no files created** |
| Cause | Node.js (post-CVE-2024-27980 policy, Node ≥18.20/20.12) **refuses to spawn `.cmd`/`.bat` batch files without `shell:true`** → `EINVAL`. `npxBinary()` returns `npx.cmd` on Windows precisely to avoid `shell:true`, but that binary cannot be spawned with `shell:false`. |
| CLI viability (control) | `supabase init` **itself works** — via a shell it created `supabase/config.toml` + `supabase/.temp/cli-latest` (exit 0). The defect is **solely** the artifact's spawn invocation method, not the Supabase CLI. |
| Classification | **BCR-CB-002 — CB-B child-process spawn portability defect (Windows).** Distinct from **HMD-001** (historical migration FK; never reached) and from **BCR-CB-001** (clean-base/env-prep incompatibility; CB-B was designed to fix it but never got far enough at runtime to prove it). |
| Prohibited "fixes" (NOT performed) | patch artifact spawn logic · `shell:true` change · binary-resolution change · repo-workdir `supabase start` fallback · `db reset` · manual `auth`/`storage` init · migration edit · history fabrication (all **out of scope** under LOCAL-003 §7/§30/§35 — return to BCR governance) |

---

## 9. Auxiliary environment evidence

| Field | Value |
|-------|-------|
| Auxiliary workdir (sanitized) | `<OS_TMP>/e02-bcr-aux-local-003` |
| Fresh auxiliary project | `true` (created under OS temp per run) |
| `supabase init` result | **FAILED** (spawn `EINVAL`; no config produced by the artifact) |
| Auxiliary migrations path | `<OS_TMP>/e02-bcr-aux-local-003/supabase/migrations` (never reached — STEP 4 not executed) |
| Auxiliary timestamped migration count before start | **NOT ASSESSED** (STEP 4 not reached; requirement = 0) |
| Repository migration executed during startup | **NO** (auxiliary start never ran) |

---

## 10. Auxiliary start / platform baseline / DB URL — **NOT REACHED**

| Field | Value |
|-------|-------|
| `supabase start --workdir` | **NOT REACHED** |
| Any repository migration executed during startup | **NO** (start not reached) |
| `platformBaselineReady` | **N/A** |
| `auth` schema exists | **N/A** |
| `storage` schema exists | **N/A** |
| `supabase status --output json` DB URL | **N/A** (status not reached) |
| DB URL locality | **N/A** |
| Application migration history initially empty | **N/A** |

---

## 11. Application-layer reset / governed replay — **NOT REACHED**

| Field | Value |
|-------|-------|
| `resetApplicationLayerForReplay()` (public + supabase_migrations) | **NOT REACHED** |
| `auth` / `storage` / platform histories / extensions touched | **NO** (reset not reached) |
| Real repository migration source | `supabase/migrations` (authoritative; **unused** — replay not reached) |
| Migration discovered count | 283 (plan) |
| Migration executed count (governed) | **0** |
| Migration quarantined count | 1 (declared; **not executed**) |
| Quarantined migration | `20260314195641_add_demo_data.sql` |

---

## 12. Migration integrity

| Check | Result |
|-------|--------|
| `20260314195641_add_demo_data.sql` unchanged | **YES** |
| RU-1.1 `20261729120000_…` unchanged | **YES** |
| RU-1.2 `20261821120000_…` unchanged | **YES** |
| Any migration renamed/moved/deleted/edited | **NO** |
| `git status supabase/migrations` | clean |

---

## 13. Quarantine / truthful history

| Field | Value |
|-------|-------|
| Quarantined migration SQL executed | **NO** |
| Quarantined migration recorded as applied | **NO** |
| Governed `schema_migrations` writes | **None** (governed replay not reached) |
| Fake "applied" row for `20260314195641` | **None** — never written |
| `supabase migration repair` | **Not used** |
| Truthfulness | **HELD** — nothing fabricated (no DB reached) |

---

## 14. schema_migrations runtime finding

| Field | Value |
|-------|-------|
| Adapter runtime result | **NOT EXERCISED** — no auxiliary DB obtained (init failed) |
| Observed column shape | **N/A** |
| Recording behavior | **N/A** |
| Quarantine-omission behavior | **N/A** (statically verified in BCR Completion; runtime still pending) |

---

## 15. RU-1.1 / RU-1.2 database presence

| Migration | Reached (plan) | Applied (DB) | Object present |
|-----------|----------------|--------------|----------------|
| RU-1.1 `20261729120000_…` | YES (plan) | **NO** — governed replay not reached | `public.owner_vote_primary_freeze_audits` **NOT VERIFIED** (no live DB) |
| RU-1.2 `20261821120000_…` | YES (plan) | **NO** — governed replay not reached | `public.execute_owner_vote_atomic_freeze_commit` (+ helper) **NOT VERIFIED** (no live DB) |

Highest applied application-migration version: **N/A** (no live DB).

---

## 16. BCR manifest

| Field | Value |
|-------|-------|
| Manifest file | **NOT WRITTEN** — `--apply` threw at STEP 3 before the manifest-write step; `tests/e02/evidence/` contains only `.gitkeep` |
| Manifest fields | **N/A** (not produced) |

---

## 17. Baseline verification — **NOT RUN**

| Field | Value |
|-------|-------|
| Command | `npm run verify:e02:baseline` |
| Result | **NOT RUN** — prerequisite governed apply did not succeed (LOCAL-003 §24) |
| Primary Audit table / 20 columns / no `committed_at` / PK / UNIQUE(freeze_event_id) / 3 FK RESTRICT / CHECKs / RLS / SELECT policy / grants / immutability fn+trigger | **N/A** |
| RU-1.2 RPC metadata (name / 5 params / RETURNS jsonb / SECURITY DEFINER / search_path / owner / grants / helper) | **N/A** |
| RPC invoked | **NO** |

> **Structural note (LOCAL-003 §24 sequencing risk, surfaced for governance):** even had `--apply` succeeded, the artifact performs auxiliary cleanup (`supabase stop` + temp-dir removal) inside its `finally` block, tearing down the auxiliary DB before a *separate* `npm run verify:e02:baseline` process could connect (the verifier requires a live `DATABASE_URL` + `E02_RUNTIME_EXECUTION_AUTHORIZED`). This is **not** the cause of this failure (apply failed earlier at init), but it is a **second CB-B runtime gap** that BCR governance should address alongside BCR-CB-002 before the next execution attempt.

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

## 19. BCR-CB-001 runtime classification

| Field | Value |
|-------|-------|
| Fresh auxiliary init | **FAILED** (spawn EINVAL — BCR-CB-002) |
| Empty migrations assertion | NOT REACHED |
| Auxiliary start | NOT REACHED |
| Platform baseline ready | NOT REACHED |
| Local DB discovery | NOT REACHED |
| Empty application history | NOT REACHED |
| Control obtained before repo migration replay | NOT REACHED |
| **BCR-CB-001 result** | **RUNTIME OPEN / NOT VERIFIED** — failed stage = auxiliary `supabase init` (child-process spawn). Status remains `IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING`. |

---

## 20. Cleanup

| Field | Value |
|-------|-------|
| Artifact cleanup (`finally`) | Ran after fail-closed STOP |
| Auxiliary stack stop | `supabase stop` also failed (same `npx.cmd` EINVAL) → recorded as cleanup warning (no stack was running to stop) |
| Auxiliary temp dir removal | **SUCCEEDED** — no `e02-bcr-aux-*` left under OS temp |
| Docker containers / volumes | **None** (start never reached) |
| Repository mutation by cleanup | **None** |
| Diagnostic temp dirs (`e02-diag*`, `e02-spawn-*`) | Removed |

---

## 21. Database Application Manifest (summary — reconstructed; artifact manifest not written)

```
authorizationId            : E-02-DBA-LOCAL-003
artifactAuthorizationId    : E-02-BCR-IA-002
baselineMode               : E02_DECLARED_BASELINE_REPLAY (not executed)
cleanBaseMode              : AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
environmentClass           : LOCAL_DISPOSABLE_SUPABASE
freshAuxiliaryProject      : true
auxiliaryWorkdir           : <OS_TMP>/e02-bcr-aux-local-003
repositoryRef              : afc7a29630cdbc4bfbdd5eaebb4bc8842663176e
dockerStatus               : Client+Server available
bcrPlanResult              : PASS
bcrApplyResult             : FAILED (auxiliary supabase init spawn — EINVAL)
failureStage               : CB-B_AUXILIARY_ENV_ACQUISITION_STEP_3
newDefect                  : BCR-CB-002 (child-process spawn portability, Windows)
migrationCountDiscovered   : 283 (timestamped) · 2 non-timestamped
migrationCountExecuted     : 0 (governed replay)
migrationCountQuarantined  : 1
quarantinedMigrations      : [ "20260314195641_add_demo_data.sql" ]
quarantineHistoryRowStatus : NOT_WRITTEN (truthful)
historicalDefect           : HMD-001 (OPEN)
migrationFileModified      : false
platformBaselineReady      : NOT_REACHED
applicationMigrationHistoryInitiallyEmpty : NOT_REACHED
platformHistoryPreserved   : true (nothing touched)
ru11Reached / ru11Applied  : plan=true / db=false
ru12Reached / ru12Applied  : plan=true / db=false
manifestFile               : none (apply threw before manifest write)
baselineVerifier           : NOT_RUN
rpcInvoked                 : false
overallResult              : APPLICATION_FAILED
```

**No secrets recorded.**

---

## 22. Overall Database Application Result

```
APPLICATION_FAILED
```

**Failure stage:** CB-B auxiliary environment acquisition — STEP 3, `supabase init`.
**Failure cause:** BCR-CB-002 — the artifact spawns the Supabase CLI via `spawnSync('npx.cmd', …, { shell:false })`, which Node rejects on Windows with `EINVAL` (batch files cannot be spawned without a shell). The Supabase CLI and `supabase init` are themselves viable (verified via shell).
**Governed replay:** Not reached. **Baseline verification:** Not reached.
**DBA completion semantics:** `E-02-DBA-LOCAL-003` **NOT consumed**.

---

## 23. Defect finding (return to BCR governance)

| Field | Value |
|-------|-------|
| Classification | **BCR-CB-002 — CB-B child-process spawn portability defect (Windows)** |
| Relationship to HMD-001 | **Distinct.** HMD-001 (historical migration external-state FK) remains **OPEN**; never reached this run. |
| Relationship to BCR-CB-001 | **Distinct.** BCR-CB-001 (clean-base/env-prep incompatibility) remains **runtime-unverified**; CB-B never advanced past `supabase init` to demonstrate its clean-base acquisition. |
| Blocking mechanism | `spawnSync('npx.cmd', args, {shell:false})` → `EINVAL` on Windows; masked as "status 1" |
| Artifact assumption violated | That `npx.cmd` can be spawned with `shell:false` (portable CLI invocation) |
| Candidate remediation (governance, not this task) | A minimal, authorized child-process portability fix under a **successor BCR IA** (e.g., spawn with `shell:true` using safe argument arrays, or resolve/execute the actual CLI entrypoint, or invoke via `cmd /c` on Windows), plus resolve the §17 cleanup-before-verify sequencing gap, then re-execute under a **successor DBA (E-02-DBA-LOCAL-004)**. |
| Prohibited "fixes" (NOT performed) | patch artifact · repo-workdir `supabase start` · `db reset` · manual `auth`/`storage` init · migration edit · history fabrication · `supabase migration repair` |

---

## 24. Status ledger (unchanged by this failed attempt)

| Item | Status |
|------|--------|
| HMD-001 | **OPEN** |
| BCR-CB-001 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** (not verified) |
| BCR-CB-002 (new) | **OPEN** — CB-B child-process spawn portability (Windows) |
| E-02-DBA-LOCAL-001 | **NOT CONSUMED** — evidence immutable |
| E-02-DBA-LOCAL-002 | **FAILED / NOT CONSUMED** — evidence immutable |
| E-02-DBA-LOCAL-003 | **APPROVED WITH CONDITIONS / NOT SUCCESSFULLY CONSUMED** |
| E-02-BCR-IA-002 | CONSUMED (repository) — **runtime portability limitation now recorded** |
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

## 25. Next governance action

| Condition | Next |
|-----------|------|
| **Current (APPLICATION_FAILED · BCR-CB-002)** | **Return to BCR governance** — issue a successor BCR IA to remediate the CB-B child-process spawn portability defect (and the §17 cleanup-before-verify sequencing gap), re-implement minimally, re-complete, then issue a successor DBA **E-02-DBA-LOCAL-004** and re-execute. **Do NOT** issue `E-02-RU-1.4-REA`. |
| Only after `APPLIED_AND_BASELINE_VERIFIED` | [`E-02-RU-1.4-Runtime-Execution-Authorization.md`](E-02-RU-1.4-Runtime-Execution-Authorization.md) (`E-02-RU-1.4-REA`) — **not** reached |

---

## 26. Lock statement

```
E-02-DBA-LOCAL-003                         = NOT SUCCESSFULLY CONSUMED
DATABASE APPLICATION RESULT                = APPLICATION_FAILED (CB-B auxiliary env acquisition · supabase init spawn)
NEW DEFECT                                 = BCR-CB-002 (CB-B child-process spawn portability, Windows EINVAL) — distinct from HMD-001 / BCR-CB-001
DOCKER                                     = AVAILABLE (Client + Server)
TARGET                                     = LOCAL DISPOSABLE (CB-B OS-temp auxiliary) — safety PASS
CLEAN-BASE MODE                            = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
BASELINE MODE                              = E02_DECLARED_BASELINE_REPLAY (not executed)
AUTHORIZATION-ID RUNTIME ADJUSTMENT        = single-line AUTHORIZATION_ID → E-02-DBA-LOCAL-003 (no logic change)
BCR PLAN                                    = PASS
BCR APPLY                                   = FAILED at STEP 3 (supabase init spawn)
AUXILIARY START / PLATFORM BASELINE         = NOT REACHED
GOVERNED REPLAY                             = NOT REACHED
QUARANTINE                                  = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINED MIGRATION SQL (GOVERNED)        = NOT EXECUTED
QUARANTINED MIGRATION RECORDED AS APPLIED   = NO
HISTORICAL MIGRATION FILE                   = UNCHANGED
MIGRATION HISTORY                           = TRUTHFUL (nothing fabricated)
RU-1.1 DATABASE                             = NOT APPLIED
RU-1.2 DATABASE                             = NOT APPLIED
DATABASE BASELINE VERIFIED                  = NO
BCR-CB-001                                  = RUNTIME VERIFICATION PENDING (not verified)
HMD-001                                     = OPEN
LOCAL-001                                   = NOT CONSUMED / IMMUTABLE
LOCAL-002                                   = FAILED / NOT CONSUMED / IMMUTABLE
RPC INVOCATION                              = NONE
RU-1.4 DATABASE-BACKED TESTS                = NOT RUN
RU-1.4 EXECUTABLE EVIDENCE                  = NOT COLLECTED
EIR PASS                                    = NONE
RUNTIME COMMITTED                           = NOT CERTIFIED
FINAL COMMIT PATH                           = BLOCKED
NEXT                                        = RETURN TO BCR GOVERNANCE (successor BCR IA for BCR-CB-002) — NO REA
DO NOT MODIFY MIGRATIONS · DO NOT PATCH ARTIFACT · DO NOT RUN RU-1.4 EVIDENCE SUITE
```

---

**End of document — E-02-DBA-LOCAL-003 Evidence — v1.0 — 2026-08-22**
