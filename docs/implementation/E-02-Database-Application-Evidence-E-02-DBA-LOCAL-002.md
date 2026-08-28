# E-02 Database Application Evidence — E-02-DBA-LOCAL-002

| Field | Value |
|-------|-------|
| **Document Type** | Database Application Evidence (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-002** |
| **Authorization Reference** | [`E-02-Database-Application-Authorization-LOCAL-002.md`](E-02-Database-Application-Authorization-LOCAL-002.md) v1.0 |
| **BCR Artifact Authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md) (E-02-BCR-IA) · [`E-02-Baseline-Compatibility-Replay-Completion.md`](E-02-Baseline-Compatibility-Replay-Completion.md) |
| **Predecessor** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md) — **immutable / not reclassified** |
| **Status** | **Issued — Execution Attempted — Application Failed (Clean-Base / Environment-Prep Stage)** |
| **Revision** | v1.0 |
| **Effective Date** | 2026-08-22 |
| **Production Effect** | **None** |

```
OVERALL DATABASE APPLICATION RESULT     = APPLICATION_FAILED
FAILURE STAGE                           = ENVIRONMENT PREPARATION / CLEAN BASE (before governed replay --apply)
AUTHORIZATION CONSUMED                  = NO (E-02-DBA-LOCAL-002 NOT successfully consumed)
BASELINE MODE                           = E02_DECLARED_BASELINE_REPLAY (not executed)
QUARANTINE                              = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINED MIGRATION SQL (GOVERNED)    = NOT EXECUTED
QUARANTINED MIGRATION RECORDED APPLIED  = NO
HISTORICAL MIGRATION FILE               = UNCHANGED
MIGRATION HISTORY (GOVERNED)            = TRUTHFUL (none written; nothing fabricated)
RU-1.1 DATABASE                         = NOT APPLIED (governed replay not reached)
RU-1.2 DATABASE                         = NOT APPLIED (governed replay not reached)
DATABASE BASELINE VERIFIED              = NO
HMD-001                                 = OPEN
RPC INVOCATION                          = NONE
RU-1.4 RUNTIME                          = NOT AUTHORIZED
```

> **Result semantics (LOCAL-002 §18/§19):** `APPLICATION_FAILED` — environment preparation failed before the governed replay `--apply` mechanism could run. Not `BLOCKED` (execution *was* attempted; target/Docker safety passed). Not `APPLIED_BASELINE_FAILED` (replay never succeeded). Authorization **not consumed**.

---

## 1. Authorization

| Field | Value |
|-------|-------|
| Authorization ID | E-02-DBA-LOCAL-002 |
| Decision | APPROVED WITH CONDITIONS |
| Superseding authority | [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026–PAD-038) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011–PAD-025) |
| Application mechanism | Governed replay artifact `scripts/verification/e02/replay-e02-declared-baseline.ts` (E-02-BCR-IA) |

---

## 2. Environment

| Field | Value |
|-------|-------|
| Environment class | `LOCAL_DISPOSABLE_SUPABASE` |
| remoteTarget | `false` |
| productionTarget | `false` |
| Safe to reset | Intended (disposable local) |
| Repository commit | `afc7a29630cdbc4bfbdd5eaebb4bc8842663176e` |
| Execution date | 2026-08-22 |

---

## 3. Target identifier

| Field | Value |
|-------|-------|
| Target class | Local disposable Supabase (machine-local Docker stack) |
| Target identifier | `local-supabase-project` (repository directory `project`) |
| Remote project ref | **None** |
| Production project ref | **None** |
| Linked remote project | **None** |
| Configured `.env` remote URL | **Absent** |

---

## 4. Target safety finding — **PASS**

| Check | Result |
|-------|--------|
| Local disposable target identity proven | **PASS** |
| Not production | **PASS** |
| Not remote | **PASS** |
| Not shared staging | **PASS** |
| No production project ref | **PASS** |
| No remote database URL used | **PASS** |
| Destructive local baseline reset safe | **PASS** (disposable) |

Target identity is unambiguous local/disposable. Failure is **not** target ambiguity.

---

## 5. Docker status — **PASS**

`docker version` reported Client **and** Server (Docker Desktop 4.87.0, Engine 29.7.2 linux/amd64). Docker Engine available. This is the key difference from LOCAL-001 (which failed because Docker was absent).

---

## 6. Commands executed (this task)

| # | Command | Purpose | Result |
|---|---------|---------|--------|
| 1 | `docker version` | Docker availability (read-only) | **PASS** — Client + Server |
| 2 | `npx supabase status` | Detect running stack (read-only) | No stack running |
| 3 | `npx supabase start` | Authorized environment prep (LOCAL-002 §15) | **FAILED** — see §7 |
| 4 | `docker ps -a` / `docker volume ls` | Post-failure state (read-only) | No containers · no volumes (torn down) |
| 5 | `npx supabase start --help` / `npx supabase db --help` / `npx supabase db start --help` | Search for a no-migration start path (read-only) | No supported skip-migrations flag |
| 6 | `npx supabase db start` | Alternate env-prep (Postgres only) | **FAILED** — identical FK failure + teardown |
| 7 | `git rev-parse HEAD` | Repository ref (read-only) | `afc7a296…` |

**Explicitly NOT executed:** `supabase db reset` (prohibited application mechanism — LOCAL-002 §13; an attempt to even inspect its help was declined as an unauthorized mechanism) · governed replay `--apply` (env prep never produced a DB — STOP per LOCAL-002 §19) · `npm run verify:e02:baseline` · any RU-1.4 evidence/concurrency/integration suite · any RPC invocation · any migration edit/rename/move/delete · any manual `auth`/`storage` initialization · any migration-history fabrication · any `supabase migration repair`.

---

## 7. Environment preparation result — **FAILED (clean-base stage)**

Both authorized environment-prep commands reproduce the **HMD-001** defect and then **stop all containers**:

```
Starting database... / Initialising schema... / Seeding globals from roles.sql...
Skipping migration create_property_invite_system.sql ... (non-timestamped)
Skipping migration dashboard_functions_fix.sql ... (non-timestamped)
Applying migration 20260314034834_create_strata_schema.sql ...
... (chain applies through 20260314062936_remove_duplicate_indexes.sql) ...
Applying migration 20260314195641_add_demo_data.sql...
Stopping containers...
ERROR: insert or update on table "owner_info" violates foreign key constraint
"owner_info_user_id_fkey" (SQLSTATE 23503)
Key (user_id)=(a35ef381-2e80-425d-be09-ad1a9e829b3c) is not present in table "profiles".
```

Post-failure: `docker ps -a` = empty; `docker volume ls` = empty (CLI tore down containers **and** volumes on migration failure).

**Empirical confirmation of HMD-001:** the exact FK failure at `20260314195641_add_demo_data.sql` (legacy UUID `a35ef381-…` absent from `profiles`) is reproduced at the database level.

---

## 8. Root-cause finding — BCR clean-base / environment-prep incompatibility (new execution-time defect)

| Item | Finding |
|------|---------|
| Artifact `resetToCleanBaseline()` | Performs `DROP/CREATE public` + `DROP/CREATE supabase_migrations` **against an already-running** Supabase-initialized database; it does **not** create `auth`/`storage` (by design — those are managed schemas the base migration `20260314034834` FKs into via `auth.users`). |
| Precondition assumed | A **reachable, running** local Postgres with Supabase-managed schemas already initialized. |
| Authorized env-prep reality | `supabase start` **and** `supabase db start` both auto-apply the **entire** migration chain (including the quarantined `20260314195641`) during bring-up and **tear down all containers** on its FK failure. |
| Supported skip-migrations path | **None** — `supabase start`/`db start` expose no flag to bring Postgres up without applying migrations (`--exclude` excludes *services*, `--ignore-health-check` ignores *health*; neither skips migration apply). |
| Consequence | The governed replay artifact **never obtains a running DB** to reset → `--apply` cannot be reached under authority. |
| Classification | **BCR clean-base runtime defect** (artifact design/runtime limitation) — **distinct from HMD-001** and **not** a second historical-migration defect. |

Per task §10/§17/§18/§31 and LOCAL-002 §19: **STOP; do not patch the artifact; do not run plain `db reset`; do not manually initialize `auth`/`storage`; do not move/modify migrations; do not fabricate history.** Return to BCR governance.

---

## 9. Governed replay — **NOT REACHED**

| Field | Value |
|-------|-------|
| `--plan` (prior, read-only) | PASS — 283 timestamped discovered · 282 executable · 1 quarantined · 2 non-timestamped · RU-1.1/RU-1.2 reachable (recorded in BCR Completion §11) |
| `--apply` (this task) | **NOT EXECUTED** — no running DB; STOP at env-prep per LOCAL-002 §19 |
| BCR replay manifest | **Not produced** (apply not run) — no evidence file written under `tests/e02/evidence/` |

---

## 10. Migration integrity

| Check | Result |
|-------|--------|
| `20260314195641_add_demo_data.sql` unchanged | **YES** (read-only reproduction only) |
| RU-1.1 `20261729120000_…` unchanged | **YES** |
| RU-1.2 `20261821120000_…` unchanged | **YES** |
| Any migration renamed/moved/deleted/edited | **NO** |
| `git status supabase/migrations` | clean |

---

## 11. Governed migration-history / bookkeeping

| Field | Value |
|-------|-------|
| Governed replay `schema_migrations` writes | **None** (apply not run) |
| Fake "applied" row for `20260314195641` | **None** — never written |
| `supabase migration repair` | **Not used** |
| Truthfulness | **HELD** — nothing fabricated; the only migration attempt was the CLI's own env-prep, which honestly failed |

Note: the transient CLI env-prep attempt applied migrations `20260314034834 … 20260314062936` into a container that was **immediately torn down** (containers + volumes removed); no persisted database or bookkeeping remains.

---

## 12. RU-1.1 / RU-1.2 database presence

| Migration | Reached (plan) | Applied (DB) |
|-----------|----------------|--------------|
| RU-1.1 `20261729120000_create_owner_vote_primary_freeze_audits.sql` | YES (plan) | **NO** — governed replay not reached |
| RU-1.2 `20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql` | YES (plan) | **NO** — governed replay not reached |

`public.owner_vote_primary_freeze_audits` and `public.execute_owner_vote_atomic_freeze_commit` — **not verified in a live DB** (no live DB).

---

## 13. schema_migrations runtime finding

| Field | Value |
|-------|-------|
| Adapter runtime result | **NOT EXERCISED** — governed apply not reached (no DB) |
| Observed column shape | **N/A** — not observed |
| Recording behavior | **N/A** |
| Quarantine-omission behavior | **N/A** (statically verified in BCR Completion §4; runtime pending) |

---

## 14. Clean-base runtime finding

| Field | Value |
|-------|-------|
| `DROP/CREATE public` + `DROP/CREATE supabase_migrations` sufficient? | **NOT DEMONSTRABLE** — the artifact never obtained a running DB to reset |
| Root issue | Authorized env-prep cannot yield a running Supabase DB without applying the quarantined migration (§7–§8) |
| Manual `auth`/`storage` cleanup/init | **NOT PERFORMED** (prohibited) |

---

## 15. Baseline verification — **NOT RUN**

| Field | Value |
|-------|-------|
| Command | `npm run verify:e02:baseline` |
| Result | **NOT RUN** — prerequisite governed apply not reached |
| Primary Audit table / 20 columns / no `committed_at`,`updated_at` | **N/A** |
| PK / UNIQUE(freeze_event_id) / 3 FK RESTRICT / 7 CHECK | **N/A** |
| RLS / SELECT policy / grants | **N/A** |
| Immutability function/trigger | **N/A** |
| RU-1.2 RPC exists / 5 params / RETURNS jsonb / SECURITY DEFINER / search_path / owner / PUBLIC revoked / authenticated EXECUTE / helper not granted | **N/A** |
| RPC invoked | **NO** |

---

## 16. Runtime / evidence boundary confirmation

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

## 17. Database Application Manifest (summary)

```
authorizationId            : E-02-DBA-LOCAL-002
artifactAuthorizationId    : E-02-BCR-IA
baselineMode               : E02_DECLARED_BASELINE_REPLAY (not executed)
environmentClass           : LOCAL_DISPOSABLE_SUPABASE
targetIdentifier           : local-supabase-project
repositoryRef              : afc7a29630cdbc4bfbdd5eaebb4bc8842663176e
dockerStatus               : Client+Server available
envPrepResult              : FAILED (supabase start / db start tear down on quarantined migration)
bcrPlanResult              : PASS (prior read-only)
bcrApplyResult             : NOT_EXECUTED
migrationCountDiscovered   : 283 (timestamped) · 2 non-timestamped
migrationCountExecuted     : 0 (governed replay)
migrationCountQuarantined  : 1
quarantinedMigrations      : [ "20260314195641_add_demo_data.sql" ]
quarantineReason           : HISTORICAL_DEMO_EXTERNAL_STATE_DEPENDENCY
historicalDefect           : HMD-001 (OPEN)
migrationFileModified      : false
schemaMigrationsRuntime    : NOT_OBSERVED
quarantineHistoryRowStatus : NOT_WRITTEN (truthful)
ru11Reached / ru11Applied  : plan=true / db=false
ru12Reached / ru12Applied  : plan=true / db=false
migrationHead              : N/A (no live DB)
manifestFile               : none (apply not run)
baselineVerifier           : NOT_RUN
rpcInvoked                 : false
overallResult              : APPLICATION_FAILED
```

**No secrets recorded.**

---

## 18. Overall Database Application Result

```
APPLICATION_FAILED
```

**Failure stage:** Environment preparation / clean base (before governed replay `--apply`).
**Failure cause:** Authorized environment-prep (`supabase start` / `supabase db start`) auto-applies the full migration chain including the quarantined `20260314195641_add_demo_data.sql`, fails on its FK defect (HMD-001), and tears down all containers/volumes — leaving no running local database for the governed replay artifact to reset. No supported CLI flag brings Postgres up without applying migrations.
**Governed replay:** Not reached. **Baseline verification:** Not reached.
**DBA completion semantics:** `E-02-DBA-LOCAL-002` **NOT consumed**.

---

## 19. Defect finding (return to BCR governance)

| Field | Value |
|-------|-------|
| Classification | **BCR clean-base / environment-prep runtime incompatibility** (artifact design/runtime limitation) |
| Relationship to HMD-001 | **Distinct.** HMD-001 (historical migration external-state dependency) remains **OPEN** and unchanged. This is **not** a second historical-migration defect (task §10). |
| Blocking mechanism | Supabase CLI applies all migrations during `start`/`db start`; no skip-migrations path; teardown on failure |
| Artifact assumption violated | `resetToCleanBaseline()` requires a pre-existing running Supabase-initialized DB (with `auth`) that env-prep cannot deliver here |
| Prohibited "fixes" (NOT performed) | patch artifact · move/rename/delete/edit migration · plain `db reset` · manual `auth`/`storage` init · fake `schema_migrations` · `supabase migration repair` |
| Recommended next (governance, not this task) | Return to **BCR governance**: revise the governed replay artifact's clean-base/env-prep design (e.g., an authorized mechanism to obtain a running local Postgres without applying the quarantined migration) under a **new/updated Implementation Authorization**, then re-execute `E-02-DBA-LOCAL-002`. |

---

## 20. Status ledger (unchanged by this failed attempt)

| Item | Status |
|------|--------|
| HMD-001 | **OPEN** |
| E-02-DBA-LOCAL-001 | **NOT CONSUMED** — evidence immutable, not reclassified |
| E-02-DBA-LOCAL-002 | **APPROVED WITH CONDITIONS / NOT CONSUMED** |
| E-02-BCR-IA | CONSUMED (repository artifact implemented) — **runtime limitation now recorded** |
| Database application | **APPLICATION_FAILED** |
| Baseline verified | **NO** |
| RU-1.4 runtime | **NOT AUTHORIZED** (no REA) |
| EIR | **No PASS reclassification** |
| Acceptance | **ACCEPTANCE_BLOCKED** |
| Project Certification | **NOT ISSUED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Executable Final COMMIT Path | **BLOCKED** |

---

## 21. Next governance action

| Condition | Next |
|-----------|------|
| **Current (APPLICATION_FAILED)** | **Return to BCR governance** — revise clean-base/env-prep design of the governed replay artifact (new/updated IA), then re-execute `E-02-DBA-LOCAL-002`. **Do NOT** issue `E-02-RU-1.4-REA`. |
| Only after `APPLIED_AND_BASELINE_VERIFIED` | [`E-02-RU-1.4-Runtime-Execution-Authorization.md`](E-02-RU-1.4-Runtime-Execution-Authorization.md) (`E-02-RU-1.4-REA`) — **not** reached |

---

## 22. Lock statement

```
E-02-DBA-LOCAL-002                         = NOT SUCCESSFULLY CONSUMED
DATABASE APPLICATION RESULT                = APPLICATION_FAILED (env-prep / clean-base stage)
DOCKER                                     = AVAILABLE (Client + Server)
TARGET                                     = LOCAL DISPOSABLE SUPABASE (proven)
ENVIRONMENT PREP                           = FAILED (supabase start / db start tear down on quarantined migration)
BASELINE MODE                              = E02_DECLARED_BASELINE_REPLAY (not executed)
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINED MIGRATION SQL (GOVERNED)       = NOT EXECUTED
QUARANTINED MIGRATION RECORDED AS APPLIED  = NO
HISTORICAL MIGRATION FILE                  = UNCHANGED
MIGRATION HISTORY                          = TRUTHFUL (nothing fabricated)
RU-1.1 DATABASE                            = NOT APPLIED
RU-1.2 DATABASE                            = NOT APPLIED
DATABASE BASELINE VERIFIED                 = NO
NEW DEFECT                                 = BCR CLEAN-BASE / ENV-PREP INCOMPATIBILITY (distinct from HMD-001)
HMD-001                                    = OPEN
LOCAL-001                                  = NOT CONSUMED / EVIDENCE PRESERVED
RPC INVOCATION                             = NONE
RU-1.4 DATABASE-BACKED TESTS               = NOT RUN
RU-1.4 EXECUTABLE EVIDENCE                 = NOT COLLECTED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = RETURN TO BCR GOVERNANCE (revise clean-base design) — NO REA
DO NOT MODIFY MIGRATIONS · DO NOT RUN PLAIN DB RESET · DO NOT PATCH ARTIFACT · DO NOT RUN RU-1.4 EVIDENCE SUITE
```

---

**End of document — E-02-DBA-LOCAL-002 Evidence — v1.0 — 2026-08-22**
