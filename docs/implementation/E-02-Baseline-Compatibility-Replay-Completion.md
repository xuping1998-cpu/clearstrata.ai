# E-02 — Baseline Compatibility Replay Artifact — Completion (Repository)

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Completion Checkpoint (repository) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Artifact** | Governed Baseline-Compatibility Replay Artifact (class C) |
| **Consumes** | **E-02-BCR-IA** — [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md) |
| **Completion status** | **COMPLETED WITH NOTES** |
| **Effective Date** | 2026-08-22 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Completion.md`](E-02-Baseline-Compatibility-Replay-Completion.md) |
| **Production Effect** | **None** |

> **Completion class:** This record certifies **only** that the authorized governed replay artifact was **implemented within the approved repository scope** and that its authorized contract was **statically verified** (source inspection + `--plan` read-only + `npm run build`). It follows the `E-02-RU-1.x-Completion.md` precedent (EPS/CES completion checkpoint). It **does NOT** certify database application, migration execution, baseline verification, runtime evidence, EIR PASS, Runtime COMMITTED, RU-1.4 Completion, or Project Certification.

```
E-02 BCR COMPLETION            = COMPLETED WITH NOTES
E-02-BCR-IA                    = CONSUMED
BCR ARTIFACT                   = IMPLEMENTED IN REPOSITORY
ARTIFACT                       = scripts/verification/e02/replay-e02-declared-baseline.ts
BASELINE MODE                  = E02_DECLARED_BASELINE_REPLAY
QUARANTINE                     = EXACTLY 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION           = UNCHANGED / IMMUTABLE
MIGRATION HISTORY MODEL        = TRUTHFUL / NO FAKE APPLIED STATUS
HMD-001                        = OPEN
LOCAL-001                      = NOT CONSUMED / EVIDENCE PRESERVED
LOCAL-002                      = APPROVED WITH CONDITIONS / NOT CONSUMED
DATABASE APPLICATION           = NOT EXECUTED
BASELINE VERIFIED              = NO
RU-1.4 RUNTIME                 = NOT AUTHORIZED
EIR PASS                       = NONE
RUNTIME COMMITTED              = NOT CERTIFIED
FINAL COMMIT PATH              = BLOCKED
STATIC PLAN/BUILD PASS         ≠ RUNTIME VERIFICATION
```

---

## 1. Authoritative inputs (read)

[`E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md) (E-02-BCR-IA) · [`E-02-Database-Application-Authorization-LOCAL-002.md`](E-02-Database-Application-Authorization-LOCAL-002.md) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) · [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) · [`E-02-Executable-Remediation-Plan.md`](E-02-Executable-Remediation-Plan.md) · [`E-02-RU-1.4-Implementation-Authorization.md`](E-02-RU-1.4-Implementation-Authorization.md) · [`E-02-RU-1.4-Implementation-Review.md`](E-02-RU-1.4-Implementation-Review.md) · [`README.md`](README.md).

Implementation inspected read-only: `scripts/verification/e02/replay-e02-declared-baseline.ts` · `scripts/verification/e02/environment-guard.ts` · `package.json` · migrations `20260314195641` (data-only) · `20261729120000` (RU-1.1) · `20261821120000` (RU-1.2). **Implementation not modified.**

---

## 2. Authorization compliance checklist

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | E-02-BCR-IA consumed | **PASS** | header refs BCR-IA; contract satisfied |
| 2 | Exactly one new implementation source file | **PASS** | only `replay-e02-declared-baseline.ts` |
| 3 | Artifact path exact | **PASS** | `scripts/verification/e02/replay-e02-declared-baseline.ts` |
| 4 | No second implementation module | **PASS** | single file; allowlist constant inlined |
| 5 | No package/lockfile change | **PASS** | `package.json` unchanged; no new deps |
| 6 | No migration change | **PASS** | `git status supabase/migrations` clean |
| 7 | RU-1.4 harness unchanged | **PASS** | no RU-1.4 file touched |
| 8 | environment-guard read-only consumed | **PASS** | dynamic import; not modified |
| 9 | No database command during implementation | **PASS** | plan mode only; no DB connection |
| 10 | Build/static verification only | **PASS** | `npm run build` PASS; `--plan` PASS |

---

## 3. Contract verification (against E-02-BCR-IA)

| Item | Finding | Status |
|------|---------|--------|
| **Baseline mode** | `BASELINE_MODE = 'E02_DECLARED_BASELINE_REPLAY'` (const); no unqualified `FULL_REPOSITORY_MIGRATION_REPLAY` fallback | **PASS** |
| **Quarantine allowlist** | `QUARANTINED_MIGRATION = '20260314195641_add_demo_data.sql'`; frozen `QUARANTINE_ALLOWLIST` length asserted = 1; no env override; forbidden flags `--skip/--migration/--target-db/--quarantine/--db/--exclude` and env `E02_QUARANTINE*`/`E02_BCR_SKIP*`/… → hard STOP; no wildcard/regex; no "skip failing migration" | **PASS** |
| **Historical immutability** | migrations only `readFile`/`readdir`; **no** rename/move/modify/delete/patch/copy-over path anywhere | **PASS** |
| **Migration enumeration** | `^(\d{14})_(.+)\.sql$`; deterministic sort (version asc, filename tie-break); strictly-ascending assertion; non-timestamped `.sql` collected separately as `nonTimestampedSqlFiles` (NOT quarantine); no filesystem-order dependency | **PASS** |
| **Data-only guard** | `stripSqlComments` then lexical reject of `CREATE/ALTER/DROP TABLE`, `CREATE (OR REPLACE) / ALTER / DROP FUNCTION`, `CREATE/ALTER/DROP POLICY`, `CREATE/DROP TRIGGER`, `CREATE (UNIQUE) / DROP INDEX`; comment explicitly states **not** parser-complete | **PASS** |
| **Downstream dependency guard** | scans every migration with `version >` quarantine for `a35ef381-2e80-425d-be09-ad1a9e829b3c`; any hit → STOP/governance; comment states **not** a complete SQL-dependency proof | **PASS** |
| **Environment guard** | apply path imports `environment-guard.ts`, calls `validateEnvironmentGuard({requireDatabaseUrl:true})` and additionally requires `environmentClass === 'local'`; refuses `isolated-nonprod`/remote/production/unknown; no generic remote `DATABASE_URL` execution | **PASS** |
| **RU-1.1 / RU-1.2 identities** | exact filenames locked as consts; presence asserted; `ru11Reached`/`ru12Reached` tracked | **PASS** |

---

## 4. Truthful migration-history result (blocking criterion)

**Result: PASS (truthful, omit-not-fabricate).**

| Property | Code behavior |
|----------|---------------|
| Executed migration → recorded as applied | `recordApplied()` inserts one row into `supabase_migrations.schema_migrations` after successful `client.query(fileSql)` |
| Quarantined migration → not executed | `if (migration.quarantined) continue;` — skipped in the apply loop |
| Quarantined migration → not recorded as applied | never passed to `recordApplied`; `recordApplied` additionally **throws** if called with a quarantined migration |
| No fake `schema_migrations` row | no INSERT for the quarantined version anywhere |
| No migration repair | `supabase migration repair` absent from the entire file |
| No "mark applied then continue" | absent; omission is the mechanism, not fabrication |

Runtime state: **IMPLEMENTED IN REPOSITORY / RUNTIME PENDING** (not executed under LOCAL-002).

---

## 5. schema_migrations adapter result

**Result: PASS (repository-implemented; runtime pending).** `discoverHistoryColumns()` reads `information_schema.columns` for `supabase_migrations.schema_migrations`; `recordApplied()` builds the INSERT dynamically over the columns actually present — always `version`, plus `name` and/or `statements` only if present. Records **only** actually-executed migrations. **Not runtime-verified** against the installed local CLI shape in this task.

---

## 6. Clean-base model

`resetToCleanBaseline()` (execution-only) performs: `DROP SCHEMA IF EXISTS public CASCADE;` → `CREATE SCHEMA public;` → standard `GRANT` (public to `postgres, anon, authenticated, service_role`) → `DROP SCHEMA IF EXISTS supabase_migrations CASCADE;` → recreate `supabase_migrations.schema_migrations`. Plain unmodified `supabase db reset` is **not** used (it would execute the quarantined migration).

**Status: CLEAN-BASE SQL MODEL = IMPLEMENTED IN REPOSITORY / NOT RUNTIME VERIFIED.** It is **not** asserted compatible with the current local Supabase until LOCAL-002 execution.

---

## 7. Public / internal schema boundary (accurate scope)

The reset touches **only** `public` and `supabase_migrations`. It does **not** drop/recreate `auth`, `storage`, or other Supabase-managed internal schemas — the code contains no such statements. Consequently:

- The replay **assumes** the local stack already provides `auth` (the base schema migration `20260314034834` creates `public.profiles` with an FK to `auth.users`). This assumption is a **residual runtime risk** (§13), not certified here.
- No expanded "full clean database" claim is made. "Clean baseline" here = **app-owned `public` + migration bookkeeping reset**, relying on the local disposable stack for managed schemas.

---

## 8. Migration application model

Sequential over `plan.ordered`; quarantined entry hits `continue` (not executed, not recorded); each non-quarantined migration is applied via a single `client.query(fileSql)`. **First** non-quarantined error → push failure, set `APPLICATION_FAILED`, `return` (no continue-after-error, no automatic quarantine expansion, no operator interactive selection). Transaction boundaries are **whatever each SQL file itself declares** (e.g. RU-1.1/RU-1.2 carry `BEGIN;…COMMIT;`); the artifact does **not** impose an additional wrapper transaction — stated accurately, no over-claim.

---

## 9. Failure policy

Fail-closed via `ReplayStop`/non-zero exit on: allowlist drift · quarantine absent/duplicated · non-data-only quarantine · downstream dependency · RU-1.1/RU-1.2 missing or not reached · non-ascending ordering · forbidden arg/env · non-local environment · apply-not-authorized · any non-quarantined migration error. No repair, no fallback, no hidden skip.

---

## 10. Manifest

`ReplayManifest` fields present and IA-aligned: `authorizationId` (E-02-DBA-LOCAL-002), `artifactAuthorizationId` (E-02-BCR-IA), `baselineMode`, `environmentClass`, `mode`, `quarantinedMigrations`, `quarantineCount`, `quarantineReason`, `quarantineAuthority`, `historicalDefect` (HMD-001), `migrationFileModified=false`, `migrationCountDiscovered/Executed/Quarantined`, `nonTimestampedSqlFiles`, `ru11Migration`/`ru12Migration` + `ru11Reached`/`ru12Reached`, `result`, `failures`, `environmentValidated`, `startedAt`/`finishedAt`, `repositoryRef`. **No secrets / no URLs.**

**Output boundary:** plan mode → **stdout only, no file**; apply mode → `tests/e02/evidence/<runId>/bcr-replay-manifest.json` (gitignored evidence dir). **No apply-mode evidence exists** from implementation.

---

## 11. Static verification (recorded — not runtime evidence)

| Check | Result |
|-------|--------|
| `--plan` read-only run | **PASS** — exit 0; 283 timestamped discovered · 282 executable · 1 quarantined · 2 non-timestamped (`create_property_invite_system.sql`, `dashboard_functions_fix.sql`) · RU-1.1/RU-1.2 reachable · **no DB connection · no mutation · no Supabase command** |
| `npm run build` | **PASS** — vite production build (no DB involved) |

`PLAN MODE STATIC VERIFICATION = PASS` and `BUILD = PASS` are **static/repository** signals only — **not** runtime evidence.

---

## 12. Boundaries preserved

| Item | Status |
|------|--------|
| **Option E** | **REJECTED / absent** — no `auth.users`/`profiles` fabrication, no seed workaround, no compatibility migration |
| **Migration repair** | **absent** |
| **RU-1.4 boundary** | no RU-1.4 harness source modified; artifact is not an EEP test; no integration/runtime execution |
| **LOCAL-001** | **NOT CONSUMED** — historical evidence immutable; no reclassification |
| **HMD-001** | **OPEN** — the artifact provides E-02 local baseline compatibility only; it does **not** repair the historical migration chain |

---

## 13. BCR completion invariants

| ID | Invariant | Status |
|----|-----------|--------|
| **BCR-C-1** | Declared quarantine exactly one file (`20260314195641_add_demo_data.sql`) | **HELD** |
| **BCR-C-2** | Historical migration immutable | **HELD** |
| **BCR-C-3** | Migration history truthful (omit-not-fabricate) | **HELD** |
| **BCR-C-4** | No generic/operator skip mechanism | **HELD** |
| **BCR-C-5** | Local-disposable only | **HELD** |
| **BCR-C-6** | No Option E identity fabrication | **HELD** |
| **BCR-C-7** | No migration repair | **HELD** |
| **BCR-C-8** | No RU-1.4 evidence semantics | **HELD** |
| **BCR-C-9** | Artifact implementation ≠ DB application | **HELD** |
| **BCR-C-10** | Plan/build PASS ≠ runtime verification | **HELD** |
| **BCR-C-11** | HMD-001 remains OPEN | **HELD** |
| **BCR-C-12** | LOCAL-002 required for execution | **HELD** |

---

## 14. File-scope verification

Implementation task changed only: `scripts/verification/e02/replay-e02-declared-baseline.ts` + `docs/implementation/README.md`. This Completion task changes only: `docs/implementation/E-02-Baseline-Compatibility-Replay-Completion.md` + `docs/implementation/README.md`. **Artifact not modified. Migrations unchanged. No package/lockfile change.**

---

## 15. Residual runtime risks (NOT resolved by repository Completion)

1. `supabase_migrations.schema_migrations` actual local shape / bookkeeping behavior — verified only via dynamic column introspection design, not runtime.
2. Clean-base compatibility with the current local Supabase (drop/recreate `public` + `supabase_migrations`, managed schemas assumed present).
3. The migration chain after the quarantine may reveal **another** blocker at apply time (fail-closed by design).
4. Local `auth`/`storage`/internal-schema assumptions (FK targets such as `auth.users`).
5. **HMD-001 remains OPEN.**

These are explicitly **not** resolved here and must be evaluated at LOCAL-002 execution.

---

## 16. Status ledger

| Item | Status |
|------|--------|
| Database application | **NOT EXECUTED** |
| Baseline verification (`verify:e02:baseline`) | **NOT RUN / NO** |
| RU-1.4 runtime | **NOT AUTHORIZED** (no REA) |
| EIR | **No PASS reclassification** |
| Acceptance | **ACCEPTANCE_BLOCKED** |
| Project Certification | **NOT ISSUED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Executable Final COMMIT Path | **BLOCKED** |

---

## 17. Completion semantics

```
E-02 BCR ARTIFACT = COMPLETED WITH NOTES
  MEANS: repository implementation complete + authorized contract statically verified
  NOT:   database application complete / baseline verified / runtime verified / evidence collected
```

---

## 18. Next authorized action

Repository prerequisite for LOCAL-002 execution (**artifact implemented + Completion issued**) is now satisfied. Subject to **all** LOCAL-002 preconditions:

```
NEXT = EXECUTE E-02-DBA-LOCAL-002
  1. confirm LOCAL_DISPOSABLE_SUPABASE target
  2. environment prep as authorized
  3. run governed replay artifact in --apply mode (E02_BCR_APPLY_AUTHORIZED=true)
  4. record the single declared quarantine (count = 1)
  5. prove RU-1.1 (20261729120000) + RU-1.2 (20261821120000) reached/applied
  6. run npm run verify:e02:baseline
  7. issue docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md
```

None of the above is performed in this Completion task.

---

## 19. Lock statement

```
E-02 BCR COMPLETION            = COMPLETED WITH NOTES
E-02-BCR-IA                    = CONSUMED
BCR ARTIFACT                   = IMPLEMENTED IN REPOSITORY
ARTIFACT                       = scripts/verification/e02/replay-e02-declared-baseline.ts
BASELINE MODE                  = E02_DECLARED_BASELINE_REPLAY
QUARANTINE                     = EXACTLY 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION           = UNCHANGED
MIGRATION HISTORY MODEL        = TRUTHFUL / NO FAKE APPLIED STATUS
CLEAN-BASE MODEL               = IMPLEMENTED / NOT RUNTIME VERIFIED
HMD-001                        = OPEN
LOCAL-001                      = NOT CONSUMED / EVIDENCE PRESERVED
LOCAL-002                      = APPROVED WITH CONDITIONS / NOT CONSUMED
DATABASE APPLICATION           = NOT EXECUTED
BASELINE VERIFIED              = NO
RU-1.4 RUNTIME                 = NOT AUTHORIZED
EIR PASS                       = NONE
RUNTIME COMMITTED              = NOT CERTIFIED
FINAL COMMIT PATH              = BLOCKED
NEXT                           = EXECUTE E-02-DBA-LOCAL-002
DO NOT MODIFY MIGRATIONS · DO NOT RUN DATABASE COMMANDS
```

---

**End of document — E-02 Baseline Compatibility Replay Completion — v1.0 — 2026-08-22**
