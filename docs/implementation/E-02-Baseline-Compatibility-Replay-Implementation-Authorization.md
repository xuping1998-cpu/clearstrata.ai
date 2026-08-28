# E-02 — Baseline Compatibility Replay Artifact — Implementation Authorization

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Authorization |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Artifact** | **Governed Baseline-Compatibility Replay Artifact** (class C per PAD-035) |
| **Authorization ID** | **E-02-BCR-IA** |
| **Status** | **Approved With Conditions** |
| **Authority Level** | Implementation Authorization (repository implementation only) |
| **Effective Date** | 2026-08-22 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md) |
| **Production Effect** | **None** from this record alone |

> **Authority path finding:** `E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md` is **authority-safe** as an **Implementation Authorization** document class, under the established precedent [`IA-001`](M2-S3-Implementation-Authorization.md) · [`E-02-RU-1.1-Implementation-Authorization.md`](E-02-RU-1.1-Implementation-Authorization.md) · [`E-02-RU-1.2-Implementation-Authorization.md`](E-02-RU-1.2-Implementation-Authorization.md) · [`E-02-RU-1.3-Implementation-Authorization.md`](E-02-RU-1.3-Implementation-Authorization.md) · [`E-02-RU-1.4-Implementation-Authorization.md`](E-02-RU-1.4-Implementation-Authorization.md) (CES-010 workflow). Authorization ID **`E-02-BCR-IA`** mirrors the `E-02-RU-1.4-IA` / `IA-001` ID pattern. **Not a new governance tier.**

> **Document class:** Bounded **Implementation Authorization** for **repository code implementation only**. It **does not** authorize running the artifact, database application, `supabase start`, `supabase db reset`, migration apply, baseline verification execution, RU-1.4 runtime evidence, RPC invocation, REA, EIR reclassification, Acceptance, or Project Certification.

```
BCR IMPLEMENTATION AUTHORIZATION                = APPROVED WITH CONDITIONS
AUTHORIZED SCOPE                                = ONE GOVERNED REPLAY ARTIFACT — REPOSITORY IMPLEMENTATION ONLY
ARTIFACT EXECUTION                              = NOT AUTHORIZED BY THIS IA (governed by E-02-DBA-LOCAL-002)
BASELINE MODE (IMPLEMENTED BY ARTIFACT)         = E02_DECLARED_BASELINE_REPLAY
QUARANTINE SET                                  = EXACTLY ONE FILE
QUARANTINED MIGRATION                           = 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION FILE                       = UNCHANGED / IMMUTABLE
MIGRATION HISTORY                               = MUST REMAIN TRUTHFUL
FAKE APPLIED STATUS                             = PROHIBITED
OPTION E                                        = REJECTED
NEW DEPENDENCIES                                = NONE REQUIRED / NONE AUTHORIZED
DATABASE APPLICATION                            = NOT COMPLETED
RU-1.4 RUNTIME EXECUTION                        = NOT AUTHORIZED
```

---

## 1. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | **Superseding authority** — PAD-035 artifact class C · PAD-027 single-file allowlist · PAD-028 term · PAD-037 preconditions · HMD-001 |
| [`E-02-Database-Application-Authorization-LOCAL-002.md`](E-02-Database-Application-Authorization-LOCAL-002.md) | Successor DBA — Case B: **separate IA required** for the artifact (§10) · artifact contract (§8) · execution authority for LOCAL disposable |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011 – PAD-025 · manifest requirements · apply-failure policy |
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) v1.0 | PAD-003/007 remediation locus · PAD-008 immutability |
| [`E-02-Executable-Remediation-Plan.md`](E-02-Executable-Remediation-Plan.md) v1.0 | §11 per-artifact chain · immutability constraints |
| [`E-02-RU-1.4-Implementation-Authorization.md`](E-02-RU-1.4-Implementation-Authorization.md) | **CONSUMED** · §5 locked 38-file tree · §6 no broad wildcards — establishes that the replay artifact is **outside** RU-1.4 scope |
| [`E-02-RU-1.4-Implementation-Review.md`](E-02-RU-1.4-Implementation-Review.md) | RU-1.4 harness contract — not modified by this IA |
| [`IA-001`](M2-S3-Implementation-Authorization.md) · [`CES-010`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) | Implementation Authorization document-class precedent / workflow |
| Repository (read-only) | `scripts/verification/e02/` · `package.json` · `supabase/config.toml` · the three migrations below |

**Migration facts (read-only inspection this task):**

| Migration | Nature | Prior head recorded in file |
|-----------|--------|-----------------------------|
| `20260314195641_add_demo_data.sql` | **DATA ONLY** (`DO $$ … INSERT …$$`); FK to `profiles(id)` | (base schema `20260314034834`) |
| `20261729120000_create_owner_vote_primary_freeze_audits.sql` (RU-1.1) | **Schema DDL** `CREATE TABLE public.owner_vote_primary_freeze_audits` in `BEGIN;…COMMIT;` | `20261728120000_e01_iu32_resolution_snapshot_immutability.sql` |
| `20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql` (RU-1.2) | **RPC/function DDL** in `BEGIN;…COMMIT;` | `20261729120000_create_owner_vote_primary_freeze_audits.sql` |

`supabase/config.toml` contains **no** `[db]` / migrations / seed / `schema_paths` override → default local behavior; **no `supabase/seed.sql` exists**. Each migration is a self-contained transaction (`BEGIN;…COMMIT;`).

---

## 2. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-BCR-IA** |
| **Implementation Authorization** | **APPROVED WITH CONDITIONS** |
| **Authorized action** | Implement **one** governed baseline-compatibility replay artifact in the repository |
| **Artifact execution** | **NOT AUTHORIZED** by this IA (execution governed by `E-02-DBA-LOCAL-002`, after implementation + completion checkpoint) |
| **Migration-history model** | **RESOLVED** — truthful "omit-not-fabricate" (see §7) — this is the **hard fail-closed condition** and it is satisfied in principle |

**Authorization statement:** Repository implementation of a single deterministic, fail-closed, local-disposable-only governed replay artifact implementing `E02_DECLARED_BASELINE_REPLAY` is authorized within the exact contract below. **No execution, no database connection, no DB command** is authorized by this IA.

**This task performed authorization issuance only.**

---

## 3. Artifact class & purpose

| Field | Value |
|-------|-------|
| **Class** | Baseline-compatibility implementation artifact (PAD-035 class C) |
| **Purpose** | Implement `E02_DECLARED_BASELINE_REPLAY` for `LOCAL_DISPOSABLE_SUPABASE` only |

The artifact **must NOT** be: a migration · a replacement migration · a seed · a production deployment tool · an RU-1.4 evidence test · manual psql instructions · a generic migration skipper.

---

## 4. Exact authorized file scope

| # | Path | Change | Notes |
|---|------|--------|-------|
| 1 | `scripts/verification/e02/replay-e02-declared-baseline.ts` | **CREATE (new)** | The entire artifact — orchestration + hard-coded allowlist constant + manifest emission in **one** file |

**Read-only reuse (no modification permitted):** the artifact **may import** existing `scripts/verification/e02/environment-guard.ts` for local-target detection. It **must not edit** it or any other existing file.

**Manifest output:** the artifact **may write** its run manifest to the existing gitignored runtime directory `tests/e02/evidence/` (runtime output — **not** a committed source change).

**Prohibited:**

| Path | Rule |
|------|------|
| `supabase/migrations/**` | **NO changes** (read-only enumeration only) |
| RU-1.4 locked files (RU-1.4-IA §5 tree) | **NO changes** |
| `src/**` · application code | **NOT AUTHORIZED** |
| Governance docs · EIR / Acceptance / Certification | **NOT AUTHORIZED** |
| Broad wildcards (`scripts/**`, `docs/**`, `supabase/**`) | **NOT AUTHORIZED** |
| Any second/new source module beyond file #1 | **NOT AUTHORIZED** (return to governance if genuinely required) |

**Total authorized new source files: 1.**

---

## 5. Quarantine allowlist (authority-locked)

The artifact **must** hard-code exactly:

```
QUARANTINE_ALLOWLIST = [ "20260314195641_add_demo_data.sql" ]   // count = 1
```

**Prohibited:** wildcard · regex (`*demo*`, `add_demo_*`) · environment-provided arbitrary skip list · CLI argument allowing operator-selected skips · any second file. If the requested/observed quarantine differs from this exact single entry: **STOP**.

---

## 6. Historical file immutability

The artifact must **NEVER** rename · move · delete · modify · comment out · copy-over · patch the migration file (or any migration file). The repository working tree **must remain unchanged** by execution. Migration files are enumerated **read-only**.

---

## 7. Migration-history bookkeeping model (hard fail-closed condition — RESOLVED)

**Truthful model (authority-locked):**

```
APPLY every non-quarantined migration in deterministic timestamp order.
RECORD in the local migration-history table (supabase_migrations.schema_migrations)
  EXACTLY and ONLY the migrations that were actually applied.
OMIT the quarantined migration from applied history — it is genuinely NOT applied,
  so it is genuinely NOT recorded as applied.
DECLARE the quarantine explicitly in the artifact manifest (§12), NOT as a fake applied row.
```

| Rule | Lock |
|------|------|
| Fabricate an "applied" row for `20260314195641` | **PROHIBITED** |
| Represent the quarantined migration as executed/applied | **PROHIBITED** |
| Applied-history reflects reality (omission = truthful) | **REQUIRED** |
| Match the installed CLI's `schema_migrations` row shape for migrations actually applied | **REQUIRED** (inspect locally; do not guess) |

**Why RESOLVED:** "omit-not-fabricate" is truthful **by construction** — the applied set is exactly the migrations that ran. This does not require falsifying any metadata.

**Mandatory fail-closed escalation (design-confirmation checkpoint):** Before writing **any** history row, the implementer must confirm the installed local CLI/Postgres `schema_migrations` shape can be populated **truthfully** for applied migrations and that a clean starting baseline can be obtained **without** editing files or fabricating history. If a truthful realization cannot be achieved (e.g., bookkeeping would require an entry implying the quarantined migration was applied): **STOP · return `BLOCKED — DESIGN GAP: TRUTHFUL QUARANTINED MIGRATION HISTORY MODEL NOT REALIZABLE` · do not proceed.**

---

## 8. Application mechanism (deterministic)

The artifact locks the following deterministic, non-interactive mechanism:

1. Prove target is `LOCAL_DISPOSABLE_SUPABASE` (reuse environment-guard; fail closed on remote/prod/unknown).
2. Obtain a clean local baseline (environment prep / disposable reconstruction is authorized under **E-02-DBA-LOCAL-002**, not this IA) **without** auto-applying the full migration folder in a way that would run the quarantined file.
3. Enumerate valid timestamped migrations in deterministic (ascending timestamp, then lexical) order — read-only.
4. Verify allowlist (§5) and preconditions (§11).
5. Apply each **non-quarantined** migration's SQL in order (each migration is already a `BEGIN;…COMMIT;` transaction).
6. Truthfully record each applied migration in history (§7); **omit** the quarantined one.
7. Record the declared quarantine + counts in the manifest (§12).
8. Hand off to `verify:e02:baseline` (separately, under DBA execution — not run by the artifact IA task).

**Prohibited:** manual copy/paste · SQL Editor · operator-selected sequencing · interactive skip prompt · "continue after failure" · plain unmodified `supabase db reset` as the mechanism.

---

## 9. Deterministic ordering contract

Ordering must be fully deterministic and reproducible from a fresh clone: strict timestamp-prefix ascending order, stable tie-break, no reliance on filesystem enumeration order, no randomization, no operator input. Non-timestamped files (e.g. `create_property_invite_system.sql`, `dashboard_functions_fix.sql`) are treated exactly as the Supabase CLI treats them (skipped as non-migrations) — this is **not** a quarantine and must not be conflated with the declared quarantine set.

---

## 10. Dependency finding

**No new dependency required or authorized.** Sufficient existing tooling:

| Tool | Availability |
|------|--------------|
| `tsx` | present (devDependency) |
| Node `fs` / `path` | built-in |
| `pg` | present (devDependency) |
| `@supabase/supabase-js` | present (dependency) |
| Supabase CLI | available via `npx supabase` |

No `package.json` change · no `package-lock.json` change · no dependency upgrade. If the implementer discovers a genuine technical need for a new dependency: **STOP and return to governance** (this IA does not authorize it).

---

## 11. Quarantine preconditions (artifact must verify; fail closed)

- [ ] Target = `LOCAL_DISPOSABLE_SUPABASE`
- [ ] Quarantine count **= 1**
- [ ] Exact filename `20260314195641_add_demo_data.sql`
- [ ] Migration file exists
- [ ] Migration remains approved **DATA_ONLY** historical file (content/hash/reference)
- [ ] No unauthorized/second quarantine requested
- [ ] Every migration file unchanged (no edit/rename/move/delete)
- [ ] RU-1.1 (`20261729120000`) + RU-1.2 (`20261821120000`) files unchanged
- [ ] Migration ordering provable/deterministic
- [ ] Migration-history bookkeeping can be truthful (§7)

Any failure → **STOP · AUTHORITY INVALID FOR CURRENT REPOSITORY STATE.**

---

## 12. Manifest contract

The artifact must generate data sufficient for LOCAL-002 evidence:

```
authorizationId            : E-02-DBA-LOCAL-002
baselineMode               : E02_DECLARED_BASELINE_REPLAY
environmentClass           : LOCAL_DISPOSABLE_SUPABASE
quarantinedMigrations      : [ "20260314195641_add_demo_data.sql" ]
quarantineCount            : 1
quarantineReason           : HISTORICAL_DEMO_EXTERNAL_STATE_DEPENDENCY
quarantineAuthority        : E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision (PAD-026–PAD-038)
artifactAuthorization      : E-02-BCR-IA
historicalDefect           : HMD-001
migrationFileModified      : false
migrationCountDiscovered   : <n>
migrationCountExecuted     : <n - 1>
migrationCountQuarantined  : 1
ru11Reached                : <bool>
ru12Reached                : <bool>
migrationHead / result
failures
startedAt / finishedAt
```

**No secrets.** No hidden exclusion — the single quarantine must be explicit.

---

## 13. Failure policy

**STOP** (no repair · no fallback · no hidden skip · no auto-quarantine expansion) if: quarantine target absent · quarantine content drifted · a second quarantine is needed · any non-quarantined migration fails · RU-1.1 not reached · RU-1.2 not reached · target ambiguous/remote · migration ordering not provable · migration-history bookkeeping cannot be truthful. A failed non-quarantined migration is **never** auto-added to the quarantine set.

---

## 14. Security / environment boundary

`LOCAL_DISPOSABLE_SUPABASE` only. The artifact must **refuse**: remote Supabase · production · shared staging · unknown environment. No production project refs. No generic arbitrary `DATABASE_URL` execution. Fail closed on any remote/production detection.

---

## 15. Option E boundary (rejected)

The artifact must **not**: fabricate `auth.users` · fabricate `profiles` · inject pre-migration demo identity · use a seed workaround · introduce a mid-history compatibility migration. **Option E remains REJECTED.**

---

## 16. No migration repair

The artifact must **not** use `supabase migration repair` (or equivalent) as a compatibility/quarantine mechanism.

---

## 17. No file hiding

No rename / move / hide / delete of migration files (see §6).

---

## 18. No snapshot

No schema dump / snapshot as a substitute for the declared replay.

---

## 19. Static verification authority (this artifact)

After implementation, authorized **non-DB** verification only:

| Check | Authorized |
|-------|------------|
| `npm run build` | **YES** |
| `npm run typecheck` | **YES** |
| `npm run lint` | **YES** (if applicable to the file) |
| Source inspection / import discovery | **YES** |
| Pure-logic unit reasoning (no DB) | **YES** |
| **Any DB connection / execution / `supabase` / `pg` connect / db reset / baseline verify** | **NOT AUTHORIZED** under this IA |

---

## 20. Implementation completion gate

After implementation, verify (repository-only):

- [ ] Only the single authorized file changed (+ optional gitignored manifest output)
- [ ] Historical migration unchanged (all migration files unchanged)
- [ ] Allowlist exact (count = 1)
- [ ] No arbitrary skip API / no operator skip argument
- [ ] Deterministic ordering
- [ ] Local-only guard present (fail closed on remote/prod)
- [ ] Manifest semantics (§12)
- [ ] No fake migration-history entry (§7 truthful model)
- [ ] Failure policy encoded (§13)
- [ ] `build` / `typecheck` pass
- [ ] No DB command executed
- [ ] No RU-1.4 runtime evidence produced

**Post-implementation governance step:** a **BCR artifact implementation completion/checkpoint** finding (repository track), **then** execution proceeds under **E-02-DBA-LOCAL-002** (env prep → `E02_DECLARED_BASELINE_REPLAY` → `verify:e02:baseline`) → successor evidence `E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md`. Exact completion-record document class follows CES-010/EPS-001 precedent (not created here).

---

## 21. DBA vs artifact IA boundary

```
E-02-BCR-IA        = repository implementation authority (this document) — CODE ONLY
E-02-DBA-LOCAL-002 = future database application EXECUTION authority (already issued, conditional)
```

These are **not merged**. Implementing the artifact does **not** authorize running it; execution remains governed by `E-02-DBA-LOCAL-002` and its preconditions, and only after the artifact exists and is compliant.

---

## 22. RU-1.4 boundary

The replay artifact is **not** RU-1.4 harness evidence. **No RU-1.4 harness changes** are authorized (preferred: none). The artifact is a distinct class C artifact; it must not be treated as an EEP test.

---

## 23. Preserved boundaries

| Item | Status |
|------|--------|
| HMD-001 historical defect | **OPEN** (unchanged; success ≠ full repository migration health) |
| Option E | **REJECTED** |
| RU-1.4 runtime execution / REA | **NOT AUTHORIZED** (`E-02-RU-1.4-REA` separate) |
| EIR | **No reclassification / no PASS** |
| Acceptance / Project Certification | **BLOCKED / NOT ISSUED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Executable Final COMMIT Path | **BLOCKED** |
| Production / remote non-prod | **NOT AUTHORIZED** · PCQ-010 OPEN |

---

## 24. Prohibited work in this authorization task (confirmation)

This record creation performed **no**: script/artifact implementation · migration edit/rename/move/delete · SQL · package/dependency change · Docker/Supabase command · db reset · database connection · baseline verification · tests · LOCAL-002 execution · REA · EIR/Acceptance/Certification changes. Only this IA and [`README.md`](README.md) were written.

---

## 25. Lock statement

```
GOVERNED REPLAY ARTIFACT IMPLEMENTATION AUTHORIZATION = APPROVED WITH CONDITIONS
AUTHORIZATION ID                                      = E-02-BCR-IA
AUTHORIZED SCOPE                                       = 1 NEW FILE: scripts/verification/e02/replay-e02-declared-baseline.ts
ARTIFACT CLASS                                         = BASELINE-COMPATIBILITY IMPLEMENTATION ARTIFACT (CLASS C)
BASELINE MODE                                          = E02_DECLARED_BASELINE_REPLAY
QUARANTINE SET                                         = EXACTLY ONE FILE
QUARANTINED MIGRATION                                  = 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION FILE                              = UNCHANGED / IMMUTABLE
MIGRATION HISTORY                                      = MUST REMAIN TRUTHFUL (OMIT-NOT-FABRICATE)
FAKE APPLIED STATUS                                    = PROHIBITED
TRUTHFUL HISTORY MODEL                                 = RESOLVED (with mandatory pre-write fail-closed checkpoint)
NEW DEPENDENCIES                                       = NONE
OPTION E                                               = REJECTED
MIGRATION REPAIR / RENAME / MOVE / SNAPSHOT            = REJECTED
PLAIN UNMODIFIED DB RESET                              = NOT THE MECHANISM
ARTIFACT EXECUTION                                     = NOT AUTHORIZED BY THIS IA (governed by E-02-DBA-LOCAL-002)
E-02-DBA-LOCAL-002                                     = APPROVED WITH CONDITIONS / NOT YET EXECUTED
DATABASE APPLICATION                                   = NOT COMPLETED
RU-1.4 HARNESS                                         = UNCHANGED / NO CHANGE AUTHORIZED
RU-1.4 RUNTIME EXECUTION                               = NOT AUTHORIZED
EIR PASS RECLASSIFICATION                              = NONE
RUNTIME COMMITTED                                      = NOT CERTIFIED
FINAL COMMIT PATH                                      = BLOCKED
HMD-001                                                = OPEN
NEXT                                                   = IMPLEMENT GOVERNED REPLAY ARTIFACT (1 FILE) → COMPLETION CHECKPOINT → EXECUTE E-02-DBA-LOCAL-002
DO NOT MODIFY MIGRATIONS
DO NOT RUN DATABASE COMMANDS
DO NOT RUN RU-1.4 EVIDENCE SUITE
```

---

**End of document — E-02-BCR-IA — v1.0 — 2026-08-22**
