# E-02 — Database Application Authorization (Successor)

## Local Disposable Evidence Environment · CB-B Clean-Base · Declared Baseline Replay

| Field | Value |
|-------|-------|
| **Document Type** | **Database Application Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-003** |
| **Predecessor** | **E-02-DBA-LOCAL-002** — [`E-02-Database-Application-Authorization-LOCAL-002.md`](E-02-Database-Application-Authorization-LOCAL-002.md) · **NOT CONSUMED / EXECUTION FAILED / EVIDENCE IMMUTABLE** |
| **Prior predecessor** | **E-02-DBA-LOCAL-001** — [`E-02-Database-Application-Authorization.md`](E-02-Database-Application-Authorization.md) · **NOT CONSUMED / HISTORICAL EVIDENCE PRESERVED** |
| **BCR artifact authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md) (E-02-BCR-IA-002) · [`E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion.md) |
| **Clean-base design authority** | [`E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md) (BCR-CB-001 · CB-B) |
| **Status** | **Approved With Conditions** |
| **Authority Level** | Database Application Authorization |
| **Effective Date** | 2026-08-22 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Database-Application-Authorization-LOCAL-003.md`](E-02-Database-Application-Authorization-LOCAL-003.md) |
| **Production Effect** | **None** from this record alone |

> **Authority path finding:** `E-02-Database-Application-Authorization-LOCAL-003.md` is **authority-safe** as a **scoped successor Database Application Authorization** under the PAD-012 naming pattern (`E-02-Database-Application-Authorization-{scope}.md` · ID `E-02-DBA-{ENV}-{SEQ}`). A distinct filename is used so predecessors `E-02-DBA-LOCAL-001` and `E-02-DBA-LOCAL-002` and their evidence remain **immutable** (mirrors the `LOCAL-001 → LOCAL-002` precedent). This is **not** a new document class or governance tier.

> **Superseding authority:** [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038) together with [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025). The **direct application mechanism** is the CB-B clean-base redesign authorized by **E-02-BCR-IA-002** and completed in the repository (COMPLETED WITH NOTES).

> **Document class:** Bounded **Database Application Authorization** record only. It **does not** authorize production deployment · remote database mutation · plain unmodified `supabase db reset` / repo-workdir `supabase start` as the application mechanism · replay-artifact code modification · RU-1.4 runtime evidence execution · RPC invocation · destructive fixtures · concurrency tests · EIR reclassification · Acceptance · Project Certification · or Final COMMIT path unblock.

```
DATABASE APPLICATION AUTHORIZATION (SUCCESSOR)  = APPROVED WITH CONDITIONS
AUTHORIZATION ID                                = E-02-DBA-LOCAL-003
PREDECESSOR E-02-DBA-LOCAL-002                  = NOT CONSUMED / EXECUTION FAILED / IMMUTABLE
PRIOR E-02-DBA-LOCAL-001                        = NOT CONSUMED / EVIDENCE IMMUTABLE
AUTHORIZED ENVIRONMENT                          = LOCAL_DISPOSABLE_SUPABASE ONLY
AUTHORIZED CLEAN-BASE MODE                      = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS (CB-B)
AUTHORIZED BASELINE MODE                        = E02_DECLARED_BASELINE_REPLAY
DECLARED QUARANTINE SET                         = EXACTLY ONE FILE
QUARANTINED MIGRATION                           = 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION FILE                       = UNCHANGED / IMMUTABLE
HMD-001 HISTORICAL DEFECT                       = OPEN
BCR-CB-001                                      = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
CB-B ARTIFACT                                   = IMPLEMENTED + COMPLETED (repository) / READY FOR RUNTIME PROOF
OPTION E / RAW POSTGRES / SNAPSHOT / REPAIR     = REJECTED
DATABASE APPLICATION EXECUTION (THIS TASK)      = NOT PERFORMED
DATABASE APPLICATION EXECUTION (FUTURE)         = AUTHORIZED TO BEGIN (local disposable) / NOT EXECUTED
RU-1.4 RUNTIME EXECUTION                        = NOT AUTHORIZED
MIGRATION APPLIED                               ≠ BASELINE VERIFIED
BASELINE VERIFIED                               ≠ RUNTIME EVIDENCE PASS
QUARANTINED REPLAY PASS                         ≠ FULL REPOSITORY MIGRATION HEALTH
LOCAL EVIDENCE                                  ≠ PRODUCTION CERTIFICATION
```

---

## 1. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | **Superseding authority** — PAD-026 – PAD-038 · quarantine mechanism · artifact class C · HMD-001 |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011 – PAD-025 · DAA mechanism · apply-failure policy · manifest |
| [`E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md) | **CB-B design authority** — BCR-CB-001 · CBQ-001–015 · CBI-1–15 |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md) | **E-02-BCR-IA-002** — CB-B repository implementation authority (CONSUMED) |
| [`E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion.md) | CB-B repository completion — **COMPLETED WITH NOTES** (static verified; runtime pending) |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md) · [`E-02-Baseline-Compatibility-Replay-Completion.md`](E-02-Baseline-Compatibility-Replay-Completion.md) | Original BCR IA/completion — CONSUMED / historical |
| [`E-02-Database-Application-Authorization-LOCAL-002.md`](E-02-Database-Application-Authorization-LOCAL-002.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md) | LOCAL-002 DBA + evidence — **NOT CONSUMED / FAILED**; empirical basis for BCR-CB-001; execution-contract precedent |
| [`E-02-Database-Application-Authorization.md`](E-02-Database-Application-Authorization.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md) | LOCAL-001 DBA + evidence — **NOT CONSUMED**; immutable |
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) · [`E-02-Executable-Remediation-Plan.md`](E-02-Executable-Remediation-Plan.md) | Program locus · immutability constraints |
| Migration targets (repository) | `20261729120000_create_owner_vote_primary_freeze_audits.sql` (RU-1.1) · `20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql` (RU-1.2) |
| Quarantine target (repository) | `20260314195641_add_demo_data.sql` — data-only · HMD-001 |

**Mechanism finding:** This successor DBA is **environment + clean-base-mode + migration-set + baseline-mode scoped**. It is **not** project-wide blanket permission, **not** production deployment, **not** RU-1.4 runtime authorization, **not** replay-artifact code authorization, **not** generic Supabase administration. **No contradiction** found between the superseding PADs, the CB-B design amendment, E-02-BCR-IA-002, and this authorization.

---

## 2. Predecessor relationship (preserved)

| Item | Value |
|------|-------|
| `E-02-DBA-LOCAL-001` status | **NOT CONSUMED** — Docker-unavailable historical evidence preserved |
| `E-02-DBA-LOCAL-002` status | **NOT CONSUMED / EXECUTION FAILED** — BCR-CB-001 discovered at env-prep/clean-base stage; evidence immutable |
| LOCAL-001 / LOCAL-002 evidence | **IMMUTABLE** — not reclassified, not relabelled, not amended in place |
| Relationship | LOCAL-003 **supersedes LOCAL-002 for future execution** (clean-base mechanism changed to CB-B) but **does not amend or relabel** LOCAL-001 or LOCAL-002 |
| Superseded mechanism | LOCAL-002 relied on repo-workdir `supabase start`/`db start` for env-prep (defective — BCR-CB-001). LOCAL-003 uses **CB-B** (fresh auxiliary local project + empty migrations + `--workdir`). |

**Neither predecessor may ever be relabelled successful.** Historical attempts (LOCAL-001 Attempt-1 Docker unavailable · LOCAL-002 env-prep FK teardown at `20260314195641`) remain preserved as governed findings.

---

## 3. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-DBA-LOCAL-003** |
| **Database Application Authorization** | **APPROVED WITH CONDITIONS** |
| **Authorized environment** | `LOCAL_DISPOSABLE_SUPABASE` only |
| **Authorized clean-base mode** | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` (CB-B) |
| **Authorized baseline mode** | `E02_DECLARED_BASELINE_REPLAY` |
| **Declared quarantine** | Exactly `20260314195641_add_demo_data.sql` |
| **Application mechanism** | The **already-implemented** governed CB-B replay artifact `scripts/verification/e02/replay-e02-declared-baseline.ts` (E-02-BCR-IA-002) — **no code modification during execution** |
| **Database Application execution (this task)** | **NOT PERFORMED** |
| **Database Application execution (future)** | **AUTHORIZED TO BEGIN** (local disposable only; see §25 sequence) |
| **Database Applied** | **NO** (not yet executed) |
| **Database Baseline Verified** | **NO** |
| **RU-1.4 Runtime Execution** | **NOT AUTHORIZED** |

**Authorization statement:** Because the governed CB-B replay artifact is now **implemented and repository-completed** (unlike at LOCAL-002 issuance, where the artifact contract was still pending), future execution under **E-02-DBA-LOCAL-003** may bring up a **fresh disposable auxiliary local Supabase environment**, prove platform baseline readiness with an empty application migration state, run the governed replay of the **real** repository migrations with the single declared quarantine, verify baseline read-only, and issue successor Database Application Evidence — **only** within the conditions in this record.

**This task performed authorization issuance only.** No database connection · no auxiliary project creation · no Supabase/Docker command · no migration apply · no baseline execution · no evidence collection.

---

## 4. Purpose

Authorize **one future local-disposable execution attempt** to prove, end-to-end:

- CB-B auxiliary Supabase environment acquisition (fresh temp project · `supabase init` · `--workdir` start)
- platform baseline readiness (CLI/image-owned `auth`/`storage`/roles/extensions/histories)
- empty application migration state at bring-up (no repository migration executed during startup)
- governed BCR replay of the **real** repository migrations
- exact one-file quarantine (`20260314195641_add_demo_data.sql`) as a truthful declared omission
- actual DB application of RU-1.1 + RU-1.2
- read-only baseline verification

**No RU-1.4 evidence tests. No RPC invocation.**

---

## 5. Predecessor history (locked)

```
E-02-DBA-LOCAL-001 = NOT CONSUMED / Docker-unavailable historical evidence preserved / IMMUTABLE
E-02-DBA-LOCAL-002 = NOT CONSUMED / EXECUTION FAILED / BCR-CB-001 discovered / evidence IMMUTABLE
```

LOCAL-003 **must not relabel** either predecessor. LOCAL-001 baseline term `FULL_REPOSITORY_MIGRATION_REPLAY` remains **retired**; LOCAL-002 env-prep mechanism (repo-workdir start) remains **superseded** by CB-B.

---

## 6. Authorized environment

Only `LOCAL_DISPOSABLE_SUPABASE`. Requirements: **fresh per run · temporary · machine-local · unlinked · non-production · non-remote · non-shared.** Prohibited: `supabase link` · remote project ref · production project ref · shared staging. If runtime target resolution detects a **remote** Supabase, execution **must fail closed**.

---

## 7. Fresh auxiliary project

**MANDATORY: a fresh auxiliary project per LOCAL-003 attempt.** No reuse of the LOCAL-002 environment · no reuse of any prior temp directory · no reuse after a partial replay. (Repository migrations add storage policies/bucket rows/an auth trigger that are not all idempotent across replays — fresh-per-run is required.)

---

## 8. Auxiliary workdir

Future execution must use the implemented CB-B artifact to create a **fresh OS-temp workdir with a unique run identity** (`planAuxiliaryWorkdir()` → `os.tmpdir()/e02-bcr-aux-<runId>`). The auxiliary workdir must be **distinct from** the repository root **and** the real repository migration directory (`assertWorkdirsDistinct()`). On alias: **STOP.**

---

## 9. Auxiliary migrations

Before auxiliary startup, `<auxiliaryWorkdir>/supabase/migrations` must contain **0 timestamped migrations**. If count ≠ 0: **STOP.** No deleting files to force zero · no copying filtered real migrations · no symlinked filtered tree.

---

## 10. Platform baseline

Future runtime may use the public Supabase CLI to initialize `auth` · `storage` · roles · extensions · platform histories. **BCR must not fabricate these.** Required proof after auxiliary startup:

- `platformBaselineReady = true`
- `auth` schema exists
- `storage` schema exists
- application migration history initially empty (`supabase_migrations.schema_migrations` count = 0)
- auxiliary application migration count remained 0
- **no** real repository migration executed during startup

---

## 11. Public CLI surface

Authorize only the public CLI surface implemented in CB-B: `supabase init` · global `--workdir` · `supabase start` · `supabase status --output json` · `supabase stop`. **No** undocumented flags · **no** raw Docker stack · **no** raw Postgres. (Installed CLI v2.84.2 statically confirms `--workdir` global + `--output json`.)

---

## 12. Local connection discovery

Authorize future machine-readable connection discovery via `supabase status --workdir <aux> --output json`, extracting the local `DB_URL`. **No** fixed port · **no** human-output scraping · **no** arbitrary remote `DATABASE_URL`. The discovered host must be local (`localhost`/`127.0.0.1`/`::1`/`*.local`) or execution **fails closed**.

---

## 13. BCR apply

After platform-baseline validation, execute the **already-implemented** governed BCR apply path. Authorized artifact: `scripts/verification/e02/replay-e02-declared-baseline.ts`. Apply authority must require the existing explicit opt-in gate (`E02_BCR_APPLY_AUTHORIZED=true`, plus the environment-guard destructive/env flags). **No code modification during DBA execution.**

---

## 14. Application-layer reset

Authorize only the implemented **bounded** reset — `resetApplicationLayerForReplay()`: `DROP/CREATE public` + `DROP/CREATE supabase_migrations` — and **only after** the auxiliary platform baseline is running. **NOT authorized:** `auth` reset · `storage` reset · platform-history reset · extensions reset · manual platform initialization.

---

## 15. Real repository migration source

Authoritative replay source = `<repository>/supabase/migrations/`. Auxiliary migrations = **EMPTY / NOT an application source.** No copied migration tree · no modified migration tree.

---

## 16. Quarantine

Exactly one: `20260314195641_add_demo_data.sql`. Classification remains `NON_E02_LEGACY_DEMO_DATA` / `HISTORICAL_REPLAY_DEFECT`; **HMD-001 remains OPEN.** No second quarantine · no wildcard · no automatic expansion.

---

## 17. Historical migration

Must remain **UNCHANGED / IMMUTABLE**. Prohibited: edit · rename · move · delete · comment-out · patch · copy-over · `supabase migration repair`-marking. RU-1.1 (`20261729120000`) and RU-1.2 (`20261821120000`) files must likewise remain unchanged.

---

## 18. Application history

Truthful model mandatory: executed repository migration → application-history record; quarantined migration → not executed → not recorded. **No fake applied status. No migration repair.**

---

## 19. Platform histories

Must remain platform-owned and untouched: `auth.schema_migrations` · `storage.migrations` · equivalent internal histories. BCR manages **only** `supabase_migrations.schema_migrations`.

---

## 20. RU-1.1 application proof

Future successful replay must prove **actual DB application** of `20261729120000_create_owner_vote_primary_freeze_audits.sql` and **actual presence** of `public.owner_vote_primary_freeze_audits`. **Do not infer from plan only.**

---

## 21. RU-1.2 application proof

Future successful replay must prove **actual DB application** of `20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql` and **actual presence** of `public.execute_owner_vote_atomic_freeze_commit` plus its approved helper. **RPC invocation remains prohibited** under this DBA (metadata only).

---

## 22. BCR-CB-001 runtime proof

LOCAL-003 is the **first authorized runtime proof** for BCR-CB-001. Success requires proving:

- a fresh auxiliary project can initialize
- empty auxiliary migrations remain empty
- platform baseline becomes ready
- BCR gains control **before any real repository migration executes**
- governed replay can proceed

**Only then** may BCR-CB-001 be considered **RUNTIME VERIFIED (in local evidence environment)**. **Do not pre-close it at DBA issuance** — it remains `IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING`.

---

## 23. Manifest (required)

Future BCR manifest must include (no secrets):

```
authorizationId                           : E-02-DBA-LOCAL-003
artifactAuthorizationId                   : E-02-BCR-IA-002
baselineMode                              : E02_DECLARED_BASELINE_REPLAY
cleanBaseMode                             : AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
environmentClass                          : LOCAL_DISPOSABLE_SUPABASE
freshAuxiliaryProject                     : true
auxiliaryWorkdir                          : <sanitized, evidence-safe>
auxiliaryProjectRef                       : <local synthetic / non-secret, if safe>
auxiliaryMigrationCountBeforeStart        : 0
platformBaselineReady                     : true|false
applicationMigrationHistoryInitiallyEmpty : true|false
realRepositoryMigrationSource             : supabase/migrations
platformHistoryPreserved                  : true
quarantinedMigrations                     : [ "20260314195641_add_demo_data.sql" ]
quarantineCount                           : 1
historicalDefect                          : HMD-001
bcrCb001Status                            : IMPLEMENTED_RUNTIME_PENDING → (runtime-verified value only on success)
ru11Reached                               : true|false
ru12Reached                               : true|false
migrationCountDiscovered / Executed / Quarantined
failures                                  : [ ... ]
startedAt / finishedAt
cleanupWarnings                           : [ ... ]
```

> **Note:** the artifact currently sets `authorizationId = E-02-DBA-LOCAL-002` as a source constant. Under LOCAL-003 execution the evidence must record the **effective authorization = E-02-DBA-LOCAL-003**; if the manifest constant must be updated to `E-02-DBA-LOCAL-003`, that is a **one-line authority-locked constant change** to be handled under the LOCAL-003 execution task's authorized scope (single-line `AUTHORIZATION_ID`), not a redesign. No other code change is authorized.

**No secrets.** The single quarantine must be explicit and auditable — no hidden exclusion.

---

## 24. Pre-execution plan

Future execution must first run the approved **read-only** `--plan` mode and confirm: CB-B selected · `cleanBaseMode = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` · `freshAuxiliaryProject = true` · auxiliary migration requirement = 0 · `realRepositoryMigrationSource = supabase/migrations` · `quarantineCount = 1` · quarantine filename exact · `platformHistoryPreserved = true`. **No DB mutation during plan.**

---

## 25. Stateful execution sequence (future — not performed here)

```
1.  target safety proof (local disposable; not remote; not production)
2.  Docker Engine check (read-only)
3.  BCR read-only --plan
4.  create fresh auxiliary temp workdir (unique run identity)
5.  supabase init in auxiliary workdir
6.  verify auxiliary migrations = 0
7.  supabase start using auxiliary --workdir
8.  supabase status --output json
9.  discover local DB URL (local-only assertion)
10. validate platform baseline (auth + storage present)
11. validate application migration history initially empty
12. reset application layer: public + supabase_migrations ONLY
13. governed replay of REAL repository migrations
14. quarantine exactly one migration (truthful omission)
15. prove RU-1.1 applied (table present)
16. prove RU-1.2 applied (function + helper present)
17. write BCR manifest
18. run: npm run verify:e02:baseline
19. issue LOCAL-003 evidence
20. cleanup auxiliary stack/workdir after evidence-safe point
```

**Not performed in this authorization task.**

---

## 26. Baseline verifier

Mandatory after a successful replay: `npm run verify:e02:baseline` (`scripts/verification/e02/verify-db-baseline.ts`). **Read-only.** No other verify/test commands under this DBA.

---

## 27. Baseline success requirements

At minimum, the **actual DB** must verify:

- **Primary Audit table** `public.owner_vote_primary_freeze_audits`: exists · **20 columns** · **no `committed_at`** · PK · **UNIQUE(freeze_event_id)** · **3 FK RESTRICT** · CHECK constraints · RLS enabled · SELECT policy · grants · immutability function/trigger
- **RU-1.2 RPC metadata** `public.execute_owner_vote_atomic_freeze_commit`: exact name · **5 params** · **RETURNS jsonb** · **SECURITY DEFINER** · `search_path` · owner/grants · helper exposure

**No RPC execution.**

---

## 28. Result taxonomy

Use only: `APPLIED_AND_BASELINE_VERIFIED` · `APPLICATION_FAILED` · `APPLIED_BASELINE_FAILED` · `BLOCKED` · `NOT_RUN`. **Prohibited labels:** `EIR_PASS` · `COMMITTED` · `PROJECT_CERTIFIED` · `FULL_REPLAY_PASS`.

---

## 29. Environment acquisition failure

If auxiliary init fails · start fails · status fails · migrations non-empty · platform baseline missing · DB URL non-local · application history non-empty · workdir aliases repo → result = **`APPLICATION_FAILED`** or **`BLOCKED`** per the exact failure class. **STOP.** No fallback to repository-workdir `supabase start` · no LOCAL-002 behavior.

---

## 30. Migration failure

If any non-quarantined migration fails: **STOP.** No second quarantine · no migration edit · no repair · no manual dependency injection · no continue-after-error. Record the exact migration and error. Result = **`APPLICATION_FAILED`**.

---

## 31. Baseline failure

If replay succeeds but the baseline verifier fails: result = **`APPLIED_BASELINE_FAILED`**; database state **≠ verified baseline**. **STOP.** No REA.

---

## 32. Cleanup

Cleanup is allowed **only after** result/evidence are safely captured. Future cleanup may: stop the auxiliary stack scoped to its workdir · remove the auxiliary temp directory. Cleanup warnings **must be recorded** (`cleanupWarnings`). Cleanup **must not mutate the repository**, and cleanup failure **must not** convert a successful DB application result into a fabricated failure.

---

## 33. Database Application Evidence

Future evidence document (v1.0, **NEW**):

```
docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md
```

**Do not modify** LOCAL-001 / LOCAL-002 evidence — both remain immutable historical records.

---

## 34. Evidence content

Include at least: authorization ID (E-02-DBA-LOCAL-003) · BCR IA-002 · environment · Docker result · sanitized auxiliary workdir identity · auxiliary `init` result · auxiliary migration count · auxiliary `start` result · platform baseline checks (auth/storage) · DB URL locality result · application-history initial state · BCR `--plan` result · BCR `--apply` result · migration counts · quarantine result · quarantine history-row status (not written) · RU-1.1 applied · RU-1.2 applied · resulting highest applied version · manifest path · baseline verifier result · Primary Audit metadata · RU-1.2 RPC metadata · `rpcInvoked=false` · `runtimeTests=false` · HMD-001 · BCR-CB-001 runtime result · overall result. **No secrets.**

---

## 35. Success semantics

**Only if all** of: auxiliary startup succeeds · platform baseline valid · application history initially empty · governed replay succeeds · exact quarantine applied as a declared omission · history truthful · RU-1.1 applied · RU-1.2 applied · baseline verifier PASS · evidence issued —

```
E-02-DBA-LOCAL-003          = CONSUMED
DATABASE APPLICATION RESULT = APPLIED_AND_BASELINE_VERIFIED
BCR-CB-001                  = RUNTIME VERIFIED (in local evidence environment)
```

This still does **NOT** mean: EIR PASS · Runtime COMMITTED certified · RU-1.4 evidence complete · Acceptance PASS · Project Certification.

---

## 36. Failure semantics

If execution fails: `E-02-DBA-LOCAL-003` = **NOT SUCCESSFULLY CONSUMED**. Evidence is **still issued** (recording the actual stage/class). BCR-CB-001 status reflects the actual stage reached. **No silent retry.**

---

## 37. RU-1.4 boundary

Even after LOCAL-003 success, **RU-1.4 runtime remains NOT AUTHORIZED** until a separate authorization: [`E-02-RU-1.4-Runtime-Execution-Authorization.md`](E-02-RU-1.4-Runtime-Execution-Authorization.md) (`E-02-RU-1.4-REA`). No evidence suite under this DBA. `DBA ≠ REA · BASELINE VERIFIED ≠ RUNTIME EVIDENCE PASS`.

---

## 38. RPC boundary

Do **not** invoke `public.execute_owner_vote_atomic_freeze_commit` under this DBA. **Metadata only.**

---

## 39. Destructive-fixture boundary

No RU-1.4 destructive fixture · no concurrency · no advisory lock · no partial-state corruption · no EIR-048/EIR-054 runtime proof.

---

## 40. HMD-001

```
HMD-001 = OPEN
```

Remains OPEN even if LOCAL-003 reaches `APPLIED_AND_BASELINE_VERIFIED`. CB-B does not repair the historical migration; `E02_DECLARED_BASELINE_REPLAY` success **≠** full repository migration health.

---

## 41. LOCAL-001 / LOCAL-002

Preserve immutable. **No status rewrite.** LOCAL-001 = NOT CONSUMED / evidence preserved. LOCAL-002 = FAILED / NOT CONSUMED / evidence immutable.

---

## 42. PCQ

PCQ-010 / PCQ-011 / PCQ-012 remain **OPEN.** LOCAL-003 does not resolve them.

---

## 43. EIR / Acceptance / Certification

No governance reclassification under this DBA. EIR PASS = **NONE** · Acceptance = **ACCEPTANCE_BLOCKED** · Project Certification = **NOT ISSUED** · Runtime COMMITTED = **NOT CERTIFIED** · Final COMMIT Path = **BLOCKED**.

---

## 44. Current project effect after issuance

```
E-02-DBA-LOCAL-003   = APPROVED WITH CONDITIONS (issued; not executed)
Database Application  = AUTHORIZED TO BEGIN / NOT EXECUTED
CB-B                  = IMPLEMENTED IN REPOSITORY / READY FOR RUNTIME PROOF
BCR-CB-001            = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
RU-1.4 runtime        = NOT AUTHORIZED
```

Everything else unchanged.

---

## 45. Pre-execution safety checks (future)

Future apply task **must fail closed** unless all pass: authorization ID = `E-02-DBA-LOCAL-003` · environment = local disposable · target not production · target not remote · repository migrations unchanged since authorization · quarantine preconditions (count = 1; filename exact; DATA_ONLY; no downstream dependency; RU-1.4 no dependency) all pass · CB-B artifact unmodified (except the authorized single-line `AUTHORIZATION_ID` constant, if required per §23) · fresh auxiliary identity · auxiliary migrations = 0 · no runtime execution implied. If any check fails: **STOP.**

---

## 46. Next step decision (formal)

```
NEXT = EXECUTE E-02-DBA-LOCAL-003
  → target safety + Docker check
  → BCR --plan (read-only)
  → CB-B auxiliary env acquisition (fresh temp · init · empty-migrations · --workdir start)
  → platform baseline + application-history-empty validation
  → application-layer reset (public + supabase_migrations)
  → governed replay of real repo migrations (exact one quarantine)
  → prove RU-1.1 + RU-1.2 applied
  → npm run verify:e02:baseline
  → issue E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md
  → (only if APPLIED_AND_BASELINE_VERIFIED) issue E-02-RU-1.4-REA
```

Do **not** perform execution in this authorization task.

---

## 47. Prohibited work in this task (confirmation)

This authorization issuance performed **no**: source modification · migration edit/rename/move/delete · SQL · Supabase command · Docker command · db reset · migration repair · database connection · auxiliary project creation · BCR `--apply` · baseline verifier execution · LOCAL-003 evidence · tests · package change · RU-1.4 runtime · REA · EIR change · Acceptance change · Certification. Only this record and [`README.md`](README.md) were written.

---

## 48. Lock statement

```
DATABASE APPLICATION AUTHORIZATION            = E-02-DBA-LOCAL-003
DECISION                                      = APPROVED WITH CONDITIONS
PREDECESSOR E-02-DBA-LOCAL-002                = FAILED / NOT CONSUMED / IMMUTABLE
PRIOR E-02-DBA-LOCAL-001                      = NOT CONSUMED / IMMUTABLE
AUTHORIZED ENVIRONMENT                        = LOCAL_DISPOSABLE_SUPABASE
CLEAN-BASE MODE                               = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
BASELINE MODE                                 = E02_DECLARED_BASELINE_REPLAY
CB-B                                          = IMPLEMENTED IN REPOSITORY / READY FOR RUNTIME PROOF
BCR-CB-001                                    = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
APPLICATION MECHANISM                         = GOVERNED CB-B REPLAY ARTIFACT (no code change during execution)
QUARANTINE                                    = EXACTLY 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION                          = UNCHANGED / IMMUTABLE
APPLICATION HISTORY                           = TRUTHFUL (omit-not-fabricate)
PLATFORM HISTORIES                            = PRESERVED
OPTION E / RAW POSTGRES / SNAPSHOT / REPAIR / TREE-COPY = REJECTED
RU-1.1 MIGRATION                              = 20261729120000 (NOT YET APPLIED)
RU-1.2 MIGRATION                              = 20261821120000 (NOT YET APPLIED)
DATABASE APPLICATION EXECUTION (THIS TASK)    = NOT PERFORMED
DATABASE APPLICATION EXECUTION (FUTURE)       = AUTHORIZED TO BEGIN / NOT EXECUTED
BASELINE VERIFIED                             = NO
MIGRATION APPLIED                             ≠ BASELINE VERIFIED
BASELINE VERIFIED                             ≠ RUNTIME EVIDENCE PASS
SUCCESSOR EVIDENCE                            = E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md
HMD-001                                       = OPEN
RU-1.4 RUNTIME EXECUTION                      = NOT AUTHORIZED
REA                                           = SEPARATE (E-02-RU-1.4-REA)
EIR PASS RECLASSIFICATION                     = NONE
RUNTIME COMMITTED                             = NOT CERTIFIED
FINAL COMMIT PATH                             = BLOCKED
PCQ-010 / PCQ-011 / PCQ-012                   = OPEN
NEXT                                          = EXECUTE E-02-DBA-LOCAL-003
DO NOT MODIFY HISTORICAL MIGRATIONS · NO DATABASE COMMANDS IN THIS TASK · NO RU-1.4 EVIDENCE SUITE
```

---

**End of document — E-02-DBA-LOCAL-003 — v1.0 — 2026-08-22**
