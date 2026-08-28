# E-02 — Baseline Compatibility Replay — Clean-Base Implementation Completion-002

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Completion Checkpoint (repository) — successor |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Artifact** | Governed Baseline-Compatibility Replay Artifact (class C) — BCR-CB-002 / 003 / 004 remediations |
| **Consumes** | **E-02-BCR-IA-003** — [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md) |
| **Design authority** | [`E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment-002.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment-002.md) (BCR-CB-002/003/004 · CBD2-Q01–Q18 · CBD2-I1–I18) |
| **Predecessor completion** | [`E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion.md) (CB-B; **not reopened**) |
| **Completion status** | **COMPLETED WITH NOTES** |
| **Effective Date** | 2026-08-23 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion-002.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion-002.md) |
| **Production Effect** | **None** |

> **Completion class:** This record certifies **only** that the IA-003 remediations (portable CLI launcher, apply→preserve→verify→cleanup lifecycle, DBA-vs-RU-1.4 verifier gate, exact-pinned runtime DBA ID) were **implemented within the approved repository scope** and **statically verified** (source inspection + `--plan` read-only + `npm run build`). It **does NOT** certify launcher runtime, auxiliary startup, platform baseline, governed replay, preserved-environment hand-off, baseline verification, explicit cleanup, RU-1.4 evidence, EIR PASS, Runtime COMMITTED, or Project Certification.

```
E-02 BCR CLEAN-BASE IMPLEMENTATION COMPLETION-002 = COMPLETED WITH NOTES
E-02-BCR-IA-003                    = CONSUMED
E-02-BCR-IA-002 / E-02-BCR-IA      = CONSUMED / HISTORICAL / IMMUTABLE
CB-B ARCHITECTURE                  = RETAINED
BCR-CB-001                         = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-002                         = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-003                         = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-004                         = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
WINDOWS CLI LAUNCHER               = COMSPEC/CMD.EXE + /D /S /C + NPX SUPABASE + ALLOWLIST + SHELL FALSE
SUCCESS APPLY                      = MANIFEST WRITTEN + AUX ENVIRONMENT RUNNING + BASELINE VERIFICATION PENDING
FAILURE                            = DIAGNOSTIC/MANIFEST + BEST-EFFORT CLEANUP
BASELINE VERIFIER                  = SEPARATE DBA STEP
DBA BASELINE AUTHORITY             = E02_BASELINE_VERIFICATION_AUTHORIZED
RU-1.4 AUTHORITY                   = SEPARATE / NOT AUTHORIZED
DBA AUTHORIZATION ID               = E02_DBA_AUTHORIZATION_ID / EXACT E-02-DBA-LOCAL-004
DB URL                             = NOT PERSISTED
QUARANTINE                         = EXACTLY 20260314195641_add_demo_data.sql
NEW DEPENDENCIES                   = NONE
LOCAL-003                          = FAILED / NOT CONSUMED / IMMUTABLE
LOCAL-004                          = REQUIRED / NOT ISSUED
HMD-001                            = OPEN
RU-1.4 RUNTIME                     = NOT AUTHORIZED
EIR PASS                           = NONE
RUNTIME COMMITTED                  = NOT CERTIFIED
FINAL COMMIT PATH                  = BLOCKED
STATIC PLAN/BUILD PASS             ≠ RUNTIME VERIFICATION
```

---

## 1. Authoritative inputs (read)

[`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md) · [`E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment-002.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment-002.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md) · [`E-02-Database-Application-Authorization-LOCAL-003.md`](E-02-Database-Application-Authorization-LOCAL-003.md) · [`E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion.md) · [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) · [`README.md`](README.md).

Implementation inspected read-only: `scripts/verification/e02/replay-e02-declared-baseline.ts` · `scripts/verification/e02/verify-db-baseline.ts` · `scripts/verification/e02/environment-guard.ts` · `package.json` · `package-lock.json` · `supabase/migrations/`. **Implementation not modified in this Completion task.**

---

## 2. Completion decision

**COMPLETED WITH NOTES.** The implemented artifact matches Design Amendment-002 and `E-02-BCR-IA-003` (§3–§33). No material deviation found. Binding notes preserved: **runtime not verified · LOCAL-004 not issued · BCR-CB-001/002/003/004 runtime pending · HMD-001 open · RU-1.4 runtime not authorized · database baseline not verified.**

---

## 3. IA-003 consumption

`E-02-BCR-IA-003` = **CONSUMED** (repository implementation performed and statically verified). Predecessors `E-02-BCR-IA` and `E-02-BCR-IA-002` = **CONSUMED / HISTORICAL / IMMUTABLE** — **not reopened, not rewritten**.

---

## 4. Authorized file scope

| Check | Result | Evidence |
|-------|--------|----------|
| Replay artifact modified | **YES (authorized)** | `scripts/verification/e02/replay-e02-declared-baseline.ts` |
| Baseline verifier modified | **YES (authorized)** | `scripts/verification/e02/verify-db-baseline.ts` |
| Implementation README | **YES (authorized, minimal)** | `docs/implementation/README.md` |
| `environment-guard.ts` | **UNCHANGED** | not in IA-003 implementation diff |
| `package.json` / lockfile | **UNCHANGED** | no dependency/script change |
| `supabase/migrations/**` | **UNCHANGED** | historical files immutable |
| `tests/e02` / RU-1.4 harness | **UNCHANGED** | no harness/test file touched |
| Helper file | **NOT CREATED** | no `auxiliary-local-project.ts` or other helper |

This Completion task changes only this document + `README.md`.

---

## 5. CB-B architecture (retained)

Fresh disposable auxiliary local Supabase per run · auxiliary migrations count = 0 · platform-owned auth/storage/baseline · real repository `supabase/migrations` authoritative source · exactly one-file quarantine · truthful application history · platform histories preserved. **No architectural reopening.**

---

## 6. BCR-CB-002 — portable launcher

`runSupabaseCli()` is the **single** bounded launcher. All four commands route through it.

| Platform | Implementation |
|----------|----------------|
| Windows | `process.env.ComSpec?.trim() \|\| 'cmd.exe'` + `['/d','/s','/c','npx','supabase', subcommand, …internalArgs]` · `shell: false` |
| Non-Windows | `npx` + `['supabase', subcommand, …internalArgs]` · `shell: false` |

Allowlist type: `SupabaseSubcommand = 'init' \| 'start' \| 'status' \| 'stop'`. No generic proxy. Operational `spawnSync('npx.cmd', …)` **removed**. `npx.cmd` appears only in comments stating it is **not** spawned.

**Status: IMPLEMENTED IN REPOSITORY / RUNTIME PENDING.**

---

## 7. Error semantics

| Condition | Classification |
|-----------|----------------|
| `res.error` present | `PROCESS_DID_NOT_START` — sanitized `name` / `code` / `message` |
| no `res.error`, `status !== 0` or non-numeric | `PROCESS_EXITED_NONZERO` — subcommand + status + sanitized stderr |

Generic "status 1" masking is **removed**. **HELD.**

---

## 8. Command coverage

`init` · `start` · `status` · `stop` all call `runSupabaseCli(<allowlisted sub>, internalArgs, auxWorkdir)`. Cleanup `stop` uses the same launcher. **HELD.**

---

## 9. Dependencies

**NO NEW DEPENDENCIES.** Node stdlib + `tsx` + `pg` + `npx supabase`. No `package.json` / lockfile change.

---

## 10. Authorization-ID model

Runtime execution authority = `process.env.E02_DBA_AUTHORIZATION_ID` exact-equals `EXPECTED_DBA_AUTHORIZATION_ID = 'E-02-DBA-LOCAL-004'`. Missing / wrong / malformed → **STOP**. No prefix match, no regex, no arbitrary ID, no per-run source edit.

Static artifact metadata = `ARTIFACT_AUTHORIZATION_ID = 'E-02-BCR-IA-003'` — **not** DBA execution authority. Manifest `authorizationId` is set **only** after exact validation (equals `validatedDbaAuthorizationId`); otherwise `null`. **No ambiguous dual authority.**

---

## 11. Preserve mode (BCR-CB-003)

`--preserve-environment` exists and is valid **only** with `--apply` + `E02_BCR_APPLY_AUTHORIZED=true` + exact DBA ID + `LOCAL_DISPOSABLE_SUPABASE` + CB-B mode. Outside that context → **STOP**. Exactly one primary mode (`--plan` / `--apply` / `--cleanup`).

---

## 12. Success / failure lifecycle and manifest order

**Success + preserve:** replay → `result = APPLIED` → `RUNNING_FOR_BASELINE_VERIFY` · `baselineVerificationPending=true` · `cleanupRequired=true` · `cleanupCompleted=false` → **write manifest** → return **without** teardown.

**Failure:** capture diagnostics → persist failure manifest if possible → best-effort cleanup → `CLEANED_AFTER_FAILURE` **only if** stop+rm actually succeed; otherwise do **not** fabricate CLEANED.

**Default apply (no preserve):** auto-cleanup after manifest write (safe default; not a DBA verify hand-off; does not claim `CLEANED_AFTER_VERIFY`).

**Old defect removed:** unconditional `finally { cleanupAuxiliary() }` then later manifest write. **New order: result → manifest → preserve or cleanup.**

---

## 13. Explicit cleanup

`--cleanup` is a separate primary mode (not combinable with `--plan`/`--apply`). Target recovered from `E02_EVIDENCE_RUN_ID` via `e02-bcr-aux-<safeRunId>` under OS temp. `assertCleanupTargetSafe()` requires: OS-temp prefix · BCR naming convention · not repo root · not repo migrations · safe runId. No operator `--workdir`. No global stop. Uses `runSupabaseCli('stop', …)` then `rm` temp dir.

Disposition values: `RUNNING_FOR_BASELINE_VERIFY` | `CLEANED_AFTER_FAILURE` | `CLEANED_AFTER_VERIFY`. Fields `cleanupRequired` / `cleanupCompleted` / `cleanupWarnings` implemented truthfully. Cleanup does not overwrite a prior APPLIED database result into APPLICATION_FAILED.

---

## 14. DB URL secret boundary

`supabase status --workdir <aux> --output json` discovers the URL at runtime. Manifest does **not** contain `DATABASE_URL` / `SUPABASE_URL` / credentials. Runtime-only `process.env` assignment for the environment guard. **HELD.**

---

## 15. Manifest additions

Confirmed present (prior CB-B / quarantine / RU-1.1–1.2 fields preserved):

```
cliLauncherMode · cliLauncherPlatform
auxiliaryEnvironmentDisposition
baselineVerificationPending · cleanupRequired · cleanupCompleted · cleanupWarnings
bcrCb002Status · bcrCb003Status · bcrCb004Status
validatedDbaAuthorizationId · expectedDbaAuthorizationId
artifactAuthorizationId · authorizationId (validated-only)
```

No secrets.

---

## 16. Plan mode

`--plan` = **PASS** (read-only; no DB, no Supabase, no Docker, no auxiliary directory created). Observed:

```
baselineMode                       = E02_DECLARED_BASELINE_REPLAY
cleanBaseMode                      = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
expectedDbaAuthorizationId         = E-02-DBA-LOCAL-004
validatedDbaAuthorizationId        = null
cliLauncherMode                    = WINDOWS_COMSPEC_NPX
cliLauncherPlatform                = win32
auxiliaryEnvironmentDisposition    = RUNNING_FOR_BASELINE_VERIFY   (planned preserve-success semantics)
baselineVerificationPending        = true
bcrCb001Status / 002 / 003 / 004   = IMPLEMENTED_RUNTIME_PENDING
quarantineCount                    = 1  (20260314195641_add_demo_data.sql)
migrationCountDiscovered           = 283 · quarantined 1 · nonTimestamped 2
result                             = PLAN_OK
```

---

## 17. BCR-CB-004 — verifier gate

`verify-db-baseline.ts` **no longer** requires `E02_RUNTIME_EXECUTION_AUTHORIZED`. New gate: `E02_BASELINE_VERIFICATION_AUTHORIZED === 'true'` (`assertBaselineVerificationAuthorized`); missing/false → STOP. Does not authorize `verify:e02`, concurrency, integration, RPC, fixtures, or RU-1.4 runtime.

`validateEnvironmentGuard({ requireDatabaseUrl: true })` **retained** (`E02_ALLOW_DESTRUCTIVE_TESTS`, `E02_EVIDENCE_ENV`, local-target validation). **Not weakened.**

Verifier body: `SCHEMA_G_CATALOG_QUERIES` are **SELECT/catalog only**. No RPC, INSERT/UPDATE/DELETE, DDL, migration, fixture, or cleanup. `environment-guard.ts` **UNCHANGED**.

**Status: IMPLEMENTED IN REPOSITORY / RUNTIME PENDING.**

---

## 18. Quarantine / history / BCR core

| Item | Status |
|------|--------|
| Quarantine | **exactly** `20260314195641_add_demo_data.sql` · count = 1 · no wildcard · no expansion |
| Historical migration file | **UNCHANGED / IMMUTABLE** |
| Application history | executed → `recordApplied`; quarantined → continue / not recorded; no repair |
| Platform histories | `auth.schema_migrations` / `storage.migrations` never written |
| Enumeration / ordering | **RETAINED** |
| Data-only + downstream UUID guards | **RETAINED** |
| `schema_migrations` adapter | **RETAINED** |
| Application-layer reset | **RETAINED** (public + `supabase_migrations` only) |
| Real repo source | `supabase/migrations` |
| RU-1.1 / RU-1.2 tracking | **RETAINED** |

---

## 19. Build / static grep / stateful commands

| Check | Result |
|-------|--------|
| `npm run build` | **PASS** (vite production; no DB) |
| Operational `npx.cmd` spawn | **ABSENT** |
| `shell: true` | **ABSENT** (only `shell: false`) |
| ComSpec launcher | **PRESENT** |
| Allowlist exact four | **PRESENT** |
| `res.error` / PROCESS_DID_NOT_START | **PRESENT** |
| `--preserve-environment` / `--cleanup` | **PRESENT** |
| Manifest-before-handoff | **PRESENT** |
| Exact `E-02-DBA-LOCAL-004` validation | **PRESENT** (`!==` exact) |
| New baseline gate | **PRESENT** |
| Old RU-1.4 baseline gate | **REMOVED** from `verify-db-baseline.ts` |
| Quarantine unchanged | **HELD** |
| Stateful Supabase / Docker / DB / `--apply` / `--cleanup` operational / baseline-against-DB | **NONE** in this Completion task |

---

## 20. Defect statuses (not resolved)

| Defect | Status |
|--------|--------|
| BCR-CB-001 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** |
| BCR-CB-002 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** — resolved only when LOCAL-004 launcher succeeds (init/start/status/stop) |
| BCR-CB-003 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** — resolved only when preserve → verifier → explicit cleanup succeeds |
| BCR-CB-004 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** — resolved only when baseline verifier runs under DBA gate without RU-1.4 REA |

---

## 21. Completion invariants (CBIC2)

| ID | Invariant | Classification |
|----|-----------|----------------|
| CBIC2-1 | CB-B retained | **HELD** |
| CBIC2-2 | Windows launcher portable by design | **IMPLEMENTED / RUNTIME PENDING** |
| CBIC2-3 | One allowlisted launcher | **HELD** |
| CBIC2-4 | `shell:true` absent | **HELD** |
| CBIC2-5 | Spawn errors preserved (not masked) | **HELD** |
| CBIC2-6 | Success environment preserved | **IMPLEMENTED / RUNTIME PENDING** |
| CBIC2-7 | Manifest precedes hand-off | **HELD** |
| CBIC2-8 | Failure cleanup best-effort | **IMPLEMENTED / RUNTIME PENDING** |
| CBIC2-9 | Cleanup explicit/deterministic | **IMPLEMENTED / RUNTIME PENDING** |
| CBIC2-10 | Baseline verifier separate | **HELD** |
| CBIC2-11 | DBA verifier authority ≠ RU-1.4 | **HELD** |
| CBIC2-12 | DB URLs not persisted | **HELD** |
| CBIC2-13 | DBA ID exact-pinned | **HELD** |
| CBIC2-14 | Quarantine unchanged | **HELD** |
| CBIC2-15 | History truthful | **HELD** |
| CBIC2-16 | Platform histories preserved | **HELD** |
| CBIC2-17 | Runtime claims remain pending | **HELD** |
| CBIC2-18 | LOCAL-004 required | **HELD** |

---

## 22. Residual runtime risks (NOT closed)

Windows ComSpec quoting/runtime · ComSpec availability · npx/Supabase version drift · actual init/start/status/stop · preserved-environment leak · cleanup target recovery · cleanup after verifier · wrong-stack verifier connection · DBA ID env correctness · baseline-gate runtime correctness · actual platform baseline · actual migration replay. **None closed here.**

---

## 23. LOCAL-003 / LOCAL-004

`E-02-DBA-LOCAL-003` = **FAILED / NOT CONSUMED / IMMUTABLE** — not retried.

`E-02-DBA-LOCAL-004` = **REQUIRED / NEXT GOVERNANCE ACTION** — not issued here.

Future LOCAL-004 must prove sequentially: launcher runtime · fresh aux init · empty migrations · start · platform baseline · governed replay · manifest persisted · env preserved · baseline verifier with `E02_BASELINE_VERIFICATION_AUTHORIZED=true` **without** `E02_RUNTIME_EXECUTION_AUTHORIZED` · baseline PASS · evidence · explicit cleanup. Only then → `APPLIED_AND_BASELINE_VERIFIED`.

---

## 24. HMD-001 / RU-1.4 / EIR

HMD-001 = **OPEN**. RU-1.4 = **HARNESS IMPLEMENTED · RUNTIME NOT AUTHORIZED · EVIDENCE NOT COLLECTED · no REA**. EIR PASS = **NONE** · Acceptance = **ACCEPTANCE_BLOCKED** · Project Certification = **NOT ISSUED** · Runtime COMMITTED = **NOT CERTIFIED** · Final COMMIT Path = **BLOCKED**. **No changes.**

---

## 25. Completion semantics

```
E-02 BCR CLEAN-BASE IMPLEMENTATION COMPLETION-002 = COMPLETED WITH NOTES
  MEANS: IA-003 repository implementation complete + authorized static verification complete
  NOT:   runtime verified / database applied / baseline verified / RU-1.4 authorized
```

---

## 26. Next authorized governance document

```
NEXT = docs/implementation/E-02-Database-Application-Authorization-LOCAL-004.md
       (Authorization ID: E-02-DBA-LOCAL-004)
```

Not created in this task. Completion precedes LOCAL-004 issuance.

---

## 27. File-scope verification

This Completion task changes only: `docs/implementation/E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion-002.md` + `docs/implementation/README.md`. **No artifact edit · no verifier edit · no environment-guard edit · no package/migration change · no Docker/Supabase/DB command · no LOCAL-004 · no `--apply` / `--cleanup` / baseline-against-DB.**

---

## 28. Lock statement

```
E-02 BCR CLEAN-BASE IMPLEMENTATION COMPLETION-002 = COMPLETED WITH NOTES
E-02-BCR-IA-003                    = CONSUMED
BCR-CB-001                         = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-002                         = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-003                         = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-004                         = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
CB-B ARCHITECTURE                  = RETAINED
WINDOWS CLI LAUNCHER               = COMSPEC/CMD.EXE + /D /S /C + NPX SUPABASE + ALLOWLIST + SHELL FALSE
SUCCESS APPLY                      = MANIFEST WRITTEN + AUX ENVIRONMENT RUNNING + BASELINE VERIFICATION PENDING
FAILURE                            = DIAGNOSTIC/MANIFEST + BEST-EFFORT CLEANUP
BASELINE VERIFIER                  = SEPARATE DBA STEP
DBA BASELINE AUTHORITY             = E02_BASELINE_VERIFICATION_AUTHORIZED
RU-1.4 AUTHORITY                   = SEPARATE / NOT AUTHORIZED
DBA AUTHORIZATION ID               = E02_DBA_AUTHORIZATION_ID / EXACT E-02-DBA-LOCAL-004
DB URL                             = NOT PERSISTED
QUARANTINE                         = EXACTLY 20260314195641_add_demo_data.sql
APPLICATION HISTORY                = TRUTHFUL
PLATFORM HISTORIES                 = PRESERVED
LOCAL-003                          = FAILED / NOT CONSUMED / IMMUTABLE
LOCAL-004                          = REQUIRED / NOT ISSUED
DATABASE BASELINE VERIFIED         = NO
HMD-001                            = OPEN
RU-1.4 RUNTIME                     = NOT AUTHORIZED
EIR PASS                           = NONE
RUNTIME COMMITTED                  = NOT CERTIFIED
FINAL COMMIT PATH                  = BLOCKED
NEXT                               = E-02-DBA-LOCAL-004
DO NOT MODIFY MIGRATIONS · NO DATABASE COMMANDS · NO SOURCE MODIFICATION IN THIS TASK
```

---

**End of document — E-02 BCR Clean-Base Implementation Completion-002 — v1.0 — 2026-08-23**
