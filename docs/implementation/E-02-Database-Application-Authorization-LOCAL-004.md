# E-02 — Database Application Authorization (Successor)

## Local Disposable Evidence Environment · CB-B Clean-Base · Declared Baseline Replay · IA-003 Lifecycle

| Field | Value |
|-------|-------|
| **Document Type** | **Database Application Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-004** |
| **Predecessor** | **E-02-DBA-LOCAL-003** — [`E-02-Database-Application-Authorization-LOCAL-003.md`](E-02-Database-Application-Authorization-LOCAL-003.md) · **FAILED / NOT CONSUMED / EVIDENCE IMMUTABLE** |
| **Prior predecessors** | **E-02-DBA-LOCAL-002** · **E-02-DBA-LOCAL-001** — **NOT CONSUMED / IMMUTABLE** |
| **BCR artifact authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md) (E-02-BCR-IA-003) · [`E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion-002.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion-002.md) |
| **Clean-base design authority** | [`E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment-002.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment-002.md) (BCR-CB-002/003/004) · predecessor [`…-Clean-Base-Design-Amendment.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md) (BCR-CB-001 · CB-B · **RETAINED**) |
| **Status** | **Approved With Conditions** |
| **Authority Level** | Database Application Authorization |
| **Effective Date** | 2026-08-23 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Database-Application-Authorization-LOCAL-004.md`](E-02-Database-Application-Authorization-LOCAL-004.md) |
| **Production Effect** | **None** from this record alone |

> **Authority path finding:** `E-02-Database-Application-Authorization-LOCAL-004.md` is **authority-safe** as a **scoped successor Database Application Authorization** under the PAD-012 naming pattern (`E-02-Database-Application-Authorization-{scope}.md` · ID `E-02-DBA-{ENV}-{SEQ}`). A distinct filename is used so predecessors LOCAL-001 / LOCAL-002 / LOCAL-003 and their evidence remain **immutable**. This is **not** a new document class or governance tier.

> **Superseding authority:** [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038) together with [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025). The **direct application mechanism** is the IA-003-remediated CB-B artifact (COMPLETED WITH NOTES in Completion-002). LOCAL-004 **supersedes LOCAL-003 only for future execution**; it does **not** amend or relabel predecessor evidence.

> **Document class:** Bounded **Database Application Authorization** record only. It **does not** authorize production deployment · remote database mutation · repo-workdir `supabase start` · raw Postgres/Docker · replay-artifact code modification · source authorization-ID edit · RU-1.4 runtime evidence · RPC invocation · destructive fixtures · concurrency tests · EIR reclassification · Acceptance · Project Certification · or Final COMMIT path unblock. **This record does not execute** any apply / verify / cleanup step.

```
DATABASE APPLICATION AUTHORIZATION (SUCCESSOR)  = APPROVED WITH CONDITIONS
AUTHORIZATION ID                                = E-02-DBA-LOCAL-004
PREDECESSOR E-02-DBA-LOCAL-003                  = FAILED / NOT CONSUMED / IMMUTABLE
PRIOR E-02-DBA-LOCAL-002                        = FAILED / NOT CONSUMED / IMMUTABLE
PRIOR E-02-DBA-LOCAL-001                        = NOT CONSUMED / IMMUTABLE
AUTHORIZED ENVIRONMENT                          = LOCAL_DISPOSABLE_SUPABASE ONLY
AUTHORIZED CLEAN-BASE MODE                      = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS (CB-B)
AUTHORIZED BASELINE MODE                        = E02_DECLARED_BASELINE_REPLAY
DECLARED QUARANTINE SET                         = EXACTLY ONE FILE
QUARANTINED MIGRATION                           = 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION FILE                       = UNCHANGED / IMMUTABLE
HMD-001                                         = OPEN
ARTIFACT AUTHORITY                              = E-02-BCR-IA-003
DBA RUNTIME ID                                  = E02_DBA_AUTHORIZATION_ID / EXACT E-02-DBA-LOCAL-004
SUCCESSFUL APPLY                                = --apply + --preserve-environment
BASELINE VERIFIER AUTHORITY                     = E02_BASELINE_VERIFICATION_AUTHORIZED
RU-1.4 RUNTIME AUTHORITY                        = NOT REQUIRED / NOT AUTHORIZED
BCR-CB-001 / 002 / 003 / 004                    = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
DATABASE APPLICATION EXECUTION (THIS TASK)      = NOT PERFORMED
DATABASE APPLICATION EXECUTION (FUTURE)         = AUTHORIZED TO BEGIN / NOT EXECUTED
OPTION E / RAW POSTGRES / SNAPSHOT / REPAIR     = REJECTED
```

---

## 1. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | Superseding authority — PAD-026–PAD-038 · quarantine · HMD-001 |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011–PAD-025 · DAA mechanism · apply-failure policy |
| [`E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment-002.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment-002.md) | BCR-CB-002/003/004 design (launcher · lifecycle · verifier gate) |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md) | **E-02-BCR-IA-003** — CONSUMED |
| [`E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion-002.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion-002.md) | IA-003 repository completion — **COMPLETED WITH NOTES** |
| [`E-02-Database-Application-Authorization-LOCAL-003.md`](E-02-Database-Application-Authorization-LOCAL-003.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md) | LOCAL-003 — **FAILED / NOT CONSUMED**; empirical basis for BCR-CB-002/003 |
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) | Program locus |
| Artifact (read-only) | `scripts/verification/e02/replay-e02-declared-baseline.ts` · `verify-db-baseline.ts` · `environment-guard.ts` (unchanged) |

**Mechanism finding:** This successor DBA is **environment + clean-base-mode + migration-set + baseline-mode + lifecycle scoped**. It is **not** project-wide blanket permission, **not** production, **not** RU-1.4 REA, **not** artifact code authorization. **No contradiction** with the superseding PADs, Design Amendment-002, IA-003, or Completion-002.

---

## 2. Predecessor history (locked)

| Item | Status |
|------|--------|
| `E-02-DBA-LOCAL-001` | **NOT CONSUMED / IMMUTABLE** |
| `E-02-DBA-LOCAL-002` | **FAILED / NOT CONSUMED / IMMUTABLE** (BCR-CB-001 at env-prep) |
| `E-02-DBA-LOCAL-003` | **FAILED / NOT CONSUMED / IMMUTABLE** (BCR-CB-002 at `supabase init` spawn) |
| Evidence | **IMMUTABLE** — not reclassified, not relabelled, not amended in place |
| Relationship | LOCAL-004 **supersedes LOCAL-003 for future execution only** |

**No predecessor may ever be relabelled successful.**

---

## 3. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-DBA-LOCAL-004** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Authorized environment** | `LOCAL_DISPOSABLE_SUPABASE` only |
| **Authorized clean-base mode** | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` (CB-B) |
| **Authorized baseline mode** | `E02_DECLARED_BASELINE_REPLAY` |
| **Declared quarantine** | Exactly `20260314195641_add_demo_data.sql` |
| **Application mechanism** | Already-implemented artifact `scripts/verification/e02/replay-e02-declared-baseline.ts` (E-02-BCR-IA-003) |
| **Runtime DBA identity** | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-004` (exact; **no source edit**) |
| **Successful apply path** | `--apply --preserve-environment` |
| **Baseline verifier gate** | `E02_BASELINE_VERIFICATION_AUTHORIZED=true` (**not** `E02_RUNTIME_EXECUTION_AUTHORIZED`) |
| **Execution this task** | **NOT PERFORMED** |
| **Execution future** | **AUTHORIZED TO BEGIN / NOT EXECUTED** |
| **Database Applied** | **NO** |
| **Database Baseline Verified** | **NO** |
| **RU-1.4 Runtime** | **NOT AUTHORIZED** |

---

## 4. Purpose

Authorize **one future local-disposable execution attempt** proving the complete remediated CB-B lifecycle:

```
portable CLI launcher
→ fresh auxiliary project
→ empty auxiliary migrations
→ platform baseline
→ governed replay
→ single quarantine
→ truthful migration history
→ RU-1.1 / RU-1.2 applied
→ manifest persisted
→ auxiliary DB preserved
→ DBA baseline verifier
→ evidence
→ explicit cleanup
```

**This authorization does not itself execute any of those steps.**

---

## 5. Authorized environment

Only `LOCAL_DISPOSABLE_SUPABASE`. Requirements: **fresh · temporary · machine-local · unlinked · non-production · non-remote · non-shared.** Prohibited: `supabase link` · remote project · production project · shared staging. Remote target detection → **fail closed**.

---

## 6. Clean-base / baseline modes

Clean-base = **exactly** `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS`. **No** fallback to repo-root Supabase · raw Postgres · raw Docker orchestration.

Baseline mode = `E02_DECLARED_BASELINE_REPLAY` with **exactly one** declared quarantine.

---

## 7. Authorized artifact and DBA ID

Runtime artifact: `scripts/verification/e02/replay-e02-declared-baseline.ts`. Implementation authority: **E-02-BCR-IA-003**.

The artifact **must consume** `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-004` (exact match against `EXPECTED_DBA_AUTHORIZATION_ID`). **No source authorization-ID edit is permitted during execution.** Static metadata `ARTIFACT_AUTHORIZATION_ID=E-02-BCR-IA-003` is **not** DBA execution authority.

---

## 8. Apply authority

Future execution must satisfy the artifact's existing gates, jointly:

```
E02_BCR_APPLY_AUTHORIZED=true
E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-004
```

plus existing environment-guard inputs as applicable (`E02_ALLOW_DESTRUCTIVE_TESTS`, `E02_EVIDENCE_ENV=local`). **No bypass. Use only source-supported gates.**

---

## 9. Preserve mode (mandatory for LOCAL-004 success path)

LOCAL-004 **MUST** use:

```
--apply --preserve-environment
```

Purpose: a successful replay must leave the auxiliary DB running for `verify:e02:baseline`. **Do not** use default auto-cleanup on a successful LOCAL-004 apply.

---

## 10. Windows / non-Windows launcher runtime proof (BCR-CB-002)

LOCAL-004 must **runtime-prove** BCR-CB-002.

| Platform | Contract |
|----------|----------|
| Windows | `ComSpec` / `cmd.exe` + `/d /s /c` + `npx` + `supabase` + allowlisted subcommand + `shell:false` |
| Non-Windows | direct `npx` + `shell:false` |

Must cover as applicable: `init` · `start` · `status` · `stop`. If `PROCESS_DID_NOT_START`: record the actual error. **No** fallback to `npx.cmd`. **No** `shell:true` fallback. Use the **actual** platform branch; do not force the Windows path on a non-Windows host.

---

## 11. Fresh auxiliary project

**Mandatory fresh project for LOCAL-004.** No reuse of: LOCAL-003 temp directory · LOCAL-003 partial environment · repo-root local Supabase. Unique run identity (`E02_EVIDENCE_RUN_ID` recommended; safe identifier).

---

## 12. Auxiliary migrations

Before startup: timestamped migration count **= 0**. If not zero: **STOP.** No delete-and-continue · no filtered copies.

---

## 13. Platform baseline

After auxiliary start prove: `platformBaselineReady = true` · `auth` exists · `auth.users` exists · `storage` exists · `storage.objects` exists · `storage.buckets` exists · platform histories exist/are platform-owned as applicable. **No BCR fabrication.**

---

## 14. Application-history initial state

Before real-repo replay: `supabase_migrations.schema_migrations` must be application-baseline empty per CB-B. If unexpected applied repo migrations exist: **STOP.**

---

## 15. Connection discovery

Use `supabase status --workdir <aux> --output json`. Obtain DB target on demand. Prove local host. **Do not persist** `DATABASE_URL` / `SUPABASE_URL` / credentials in manifest or evidence.

---

## 16. Application-layer reset

Authorize only existing bounded `resetApplicationLayerForReplay()`: `public` + `supabase_migrations`. **Not authorized:** auth reset · storage reset · platform-history reset · extension recreation · manual platform setup.

---

## 17. Real migration source

Authoritative source: `<repository>/supabase/migrations/`. Auxiliary migrations remain **EMPTY / NOT APPLICATION SOURCE.**

---

## 18. Quarantine / historical immutability

Exactly `20260314195641_add_demo_data.sql`. Count = 1. No second quarantine · no wildcard · no automatic expansion.

Historical file remains **UNCHANGED / IMMUTABLE**. No edit · rename · move · delete · comment-out · patch · repair · copy-over.

---

## 19. Truthful history / platform histories

Executed migration → recorded. Quarantined migration → not executed → not recorded. **No fake applied row. No migration repair.**

Platform histories remain untouched: `auth.schema_migrations` · `storage.migrations` · platform-managed histories. BCR manages **only** application migration history.

---

## 20. RU-1.1 / RU-1.2

**RU-1.1:** prove actual application of `20261729120000_create_owner_vote_primary_freeze_audits.sql` and actual object `public.owner_vote_primary_freeze_audits`. **No plan-only inference.**

**RU-1.2:** prove actual application of `20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql` and metadata existence of `public.execute_owner_vote_atomic_freeze_commit` plus approved helper. **Do NOT invoke the RPC.**

---

## 21. BCR manifest (successful apply)

Must truthfully show at least (no secrets):

```
validatedDbaAuthorizationId              = E-02-DBA-LOCAL-004
artifactAuthorizationId                  = E-02-BCR-IA-003
baselineMode                             = E02_DECLARED_BASELINE_REPLAY
cleanBaseMode                            = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
cliLauncherMode / cliLauncherPlatform
freshAuxiliaryProject                    = true
auxiliaryMigrationCountBeforeStart       = 0
platformBaselineReady                    = true
applicationMigrationHistoryInitiallyEmpty = true
realRepositoryMigrationSource
platformHistoryPreserved                 = true
quarantinedMigrations                    = [ 20260314195641_add_demo_data.sql ]
quarantineCount                          = 1
ru11Reached                              = true
ru12Reached                              = true
bcrCb001Status / bcrCb002Status / bcrCb003Status / bcrCb004Status
auxiliaryEnvironmentDisposition          = RUNNING_FOR_BASELINE_VERIFY
baselineVerificationPending              = true
cleanupRequired                          = true
cleanupCompleted                         = false
```

---

## 22. Defect runtime-proof rules

| Defect | Runtime verified only if |
|--------|--------------------------|
| **BCR-CB-001** | Fresh aux + empty migrations + start + platform baseline + application-history control + governed replay |
| **BCR-CB-002** | Actual successful launcher execution through required CLI commands (Windows or non-Windows branch) |
| **BCR-CB-003** | Replay success + manifest persisted + aux still running + verifier uses same env + explicit cleanup after evidence-safe point |
| **BCR-CB-004** | Baseline verifier succeeds under `E02_BASELINE_VERIFICATION_AUTHORIZED=true` **without** RU-1.4 REA / `E02_RUNTIME_EXECUTION_AUTHORIZED` |

Until then each remains **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING**. Classification after success: **RUNTIME VERIFIED IN LOCAL EVIDENCE ENVIRONMENT** (not production).

---

## 23. DBA baseline verifier

After successful preserved apply, authorize **only**:

```
npm run verify:e02:baseline
```

with exact gate `E02_BASELINE_VERIFICATION_AUTHORIZED=true`. **Do NOT set** `E02_RUNTIME_EXECUTION_AUTHORIZED`. This is a **mandatory BCR-CB-004 proof**.

The executor may set **runtime-only** `DATABASE_URL` / `SUPABASE_URL` (and other existing non-persisted local inputs) derived from the preserved auxiliary project. **No secret persistence.**

Scope: **read-only metadata only.** No RPC · DML · DDL · fixture · concurrency · migration · cleanup.

---

## 24. Primary Audit / RU-1.2 RPC baseline

Must verify actual `public.owner_vote_primary_freeze_audits`: 20 columns · no `committed_at` · PK · UNIQUE(`freeze_event_id`) · 3 FK ON DELETE RESTRICT · CHECKs · RLS · SELECT policy · grants · immutability function · immutability trigger.

RU-1.2 RPC **metadata only**: exact name · 5 params · RETURNS jsonb · SECURITY DEFINER · `search_path` · owner/grants · helper exposure. **No execution.**

---

## 25. Result taxonomy

Use only: `APPLIED_AND_BASELINE_VERIFIED` · `APPLICATION_FAILED` · `APPLIED_BASELINE_FAILED` · `BLOCKED` · `NOT_RUN`.

**Prohibited labels:** `COMMITTED` · `EIR_PASS` · `PROJECT_CERTIFIED` · `FULL_REPLAY_PASS`.

---

## 26. Failure policy

**Apply / launcher / platform / replay failure:** STOP. No silent retry · no code edit · no migration edit · no second quarantine · no migration repair. Issue evidence. Result = `APPLICATION_FAILED` or `BLOCKED` per exact class.

**Baseline failure after successful replay:** `APPLIED_BASELINE_FAILED`. Environment may remain for diagnostic/evidence-safe inspection only within the authorized task. No DB repair. No REA.

---

## 27. Successful hand-off

On successful replay **before** verifier:

```
AUXILIARY ENVIRONMENT = RUNNING_FOR_BASELINE_VERIFY
```

**Do not cleanup yet.**

---

## 28. Database Application Evidence

Future execution evidence (**NEW**, v1.0):

```
docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md
```

**Do not amend** LOCAL-001 / LOCAL-002 / LOCAL-003 evidence.

---

## 29. Evidence content

Include at least: authorization ID · artifact IA-003 · target safety · Docker result · environment · launcher platform/mode · launcher runtime result · auxiliary sanitized workdir identity · init result · aux migration count · start result · status result · platform baseline · auth/storage checks · initial application history · BCR plan · BCR apply · migration counts · quarantine · quarantine SQL executed=false · quarantine history row=false · `schema_migrations` runtime shape · truthful history result · RU-1.1 applied/object · RU-1.2 applied/RPC/helper · highest applied migration · manifest path/result · environment disposition before verifier · baseline verifier authorization gate · RU-1.4 runtime flag **absent** · baseline verifier result · Primary Audit baseline · RPC metadata · RPC invoked=false · BCR-CB-001/002/003/004 results · cleanup result · HMD-001 · overall application result. **No secrets.**

---

## 30. Explicit cleanup

After verifier result and evidence-safe capture, invoke the authorized artifact cleanup mode:

```
--cleanup
+ E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-004
+ same E02_EVIDENCE_RUN_ID
```

Do **not** manually `supabase stop` outside the artifact unless the implementation explicitly requires it (it does not).

**Cleanup success:** `auxiliaryEnvironmentDisposition=CLEANED_AFTER_VERIFY` · `baselineVerificationPending=false` · `cleanupRequired=false` · `cleanupCompleted=true`. Record warnings separately. A cleanup warning **must not** rewrite a truthful successful baseline result.

**Cleanup failure after successful replay/baseline:** preserve `APPLIED_AND_BASELINE_VERIFIED` if DB/baseline actually passed; record `cleanupCompleted=false` + `cleanupWarnings`; route cleanup defect separately if needed. **Do not fabricate CLEANED.**

---

## 31. Success semantics

Only if **all** of: launcher succeeds · aux environment succeeds · platform baseline succeeds · history initial state valid · replay succeeds · single quarantine truthful · RU-1.1 applied · RU-1.2 applied · manifest persisted · environment preserved · baseline verifier PASS under DBA-specific authority · evidence captured —

```
E-02-DBA-LOCAL-004          = CONSUMED
DATABASE APPLICATION RESULT = APPLIED_AND_BASELINE_VERIFIED
DATABASE BASELINE VERIFIED  = YES
BCR-CB-001 / 002 / 003 / 004 = RUNTIME VERIFIED IN LOCAL EVIDENCE ENVIRONMENT
```

This still does **NOT** mean: EIR PASS · RU-1.4 evidence · Runtime COMMITTED certification · Acceptance PASS · Project Certification.

---

## 32. Failure semantics

If any required stage fails: `E-02-DBA-LOCAL-004` = **NOT SUCCESSFULLY CONSUMED**. Issue evidence. **No silent re-execution.** Next governance route is determined from the actual defect.

---

## 33. HMD-001

```
HMD-001 = OPEN
```

Remains OPEN even if LOCAL-004 succeeds. Declared quarantine does **not** repair historical migration health.

---

## 34. RU-1.4 / RPC / fixture boundaries

**Do NOT run:** `npm run verify:e02` · `npm run verify:e02:concurrency` · `npm run test:e02` · `npm run test:e02:integration` · any EIR-048/EIR-054 evidence · any RPC call · any destructive fixture.

**Do NOT invoke** `public.execute_owner_vote_atomic_freeze_commit`. Metadata only.

---

## 35. PCQ / EIR / Acceptance / Certification

PCQ-010 / PCQ-011 / PCQ-012 remain **OPEN.** LOCAL-004 does not resolve them.

No EIR / Acceptance / Certification reclassification under this DBA.

---

## 36. Pre-execution plan and future sequence

Future execution must first run read-only `--plan` (no DB). Then, **not performed in this task**:

```
1.  target safety (local disposable)
2.  Docker Engine check (read-only)
3.  BCR --plan
4.  set E02_BCR_APPLY_AUTHORIZED=true
    E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-004
    E02_EVIDENCE_RUN_ID=<safe id>
5.  BCR --apply --preserve-environment
6.  prove launcher / init / empty migrations / start / status / platform baseline
7.  application-layer reset + governed replay + quarantine truthful
8.  prove RU-1.1 / RU-1.2 applied
9.  persist manifest; env remains RUNNING_FOR_BASELINE_VERIFY
10. rediscover DB URL via status --output json (runtime-only)
11. npm run verify:e02:baseline
    with E02_BASELINE_VERIFICATION_AUTHORIZED=true
    WITHOUT E02_RUNTIME_EXECUTION_AUTHORIZED
12. issue LOCAL-004 evidence
13. BCR --cleanup (same DBA ID + same runId)
14. record cleanup disposition
```

---

## 37. Current project effect (issuance only)

```
E-02-DBA-LOCAL-004     = APPROVED WITH CONDITIONS / NOT YET CONSUMED
Database Application   = AUTHORIZED TO BEGIN / NOT EXECUTED
BCR-CB-001/002/003/004 = RUNTIME VERIFICATION PENDING
Database Baseline      = NOT VERIFIED
RU-1.4 Runtime         = NOT AUTHORIZED
```

Everything else unchanged.

---

## 38. Next action / REA gate

**NEXT = EXECUTE E-02-DBA-LOCAL-004.** Not executed in this task.

REA [`E-02-RU-1.4-Runtime-Execution-Authorization.md`](E-02-RU-1.4-Runtime-Execution-Authorization.md) (`E-02-RU-1.4-REA`) becomes the next governance document **only if** the future result is `APPLIED_AND_BASELINE_VERIFIED`. **Not created now.**

---

## 39. Prohibited work in this task (confirmation)

No source / verifier / guard / migration / package edit · no Docker · no Supabase stateful command · no DB connection · no BCR apply/cleanup · no baseline verifier · no LOCAL-004 evidence · no RU-1.4 · no REA · no EIR/Acceptance/Certification change. Only this record and [`README.md`](README.md) were written.

---

## 40. Lock statement

```
DATABASE APPLICATION AUTHORIZATION     = E-02-DBA-LOCAL-004
DECISION                               = APPROVED WITH CONDITIONS
AUTHORIZED ENVIRONMENT                 = LOCAL_DISPOSABLE_SUPABASE
CLEAN-BASE MODE                        = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
BASELINE MODE                          = E02_DECLARED_BASELINE_REPLAY
ARTIFACT AUTHORITY                     = E-02-BCR-IA-003
DBA AUTHORIZATION ID                   = E02_DBA_AUTHORIZATION_ID / EXACT E-02-DBA-LOCAL-004
WINDOWS CLI LAUNCHER                   = COMSPEC/CMD.EXE + NPX SUPABASE + SHELL FALSE
SUCCESSFUL APPLY                       = PRESERVE ENVIRONMENT FOR BASELINE VERIFIER
BASELINE VERIFIER AUTHORITY            = E02_BASELINE_VERIFICATION_AUTHORIZED
RU-1.4 RUNTIME AUTHORITY               = NOT REQUIRED / NOT AUTHORIZED
QUARANTINE                             = EXACTLY 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION                   = UNCHANGED
APPLICATION HISTORY                    = TRUTHFUL
PLATFORM HISTORIES                     = PRESERVED
BCR-CB-001 / 002 / 003 / 004           = RUNTIME VERIFICATION PENDING
LOCAL-001                              = NOT CONSUMED / IMMUTABLE
LOCAL-002                              = FAILED / NOT CONSUMED / IMMUTABLE
LOCAL-003                              = FAILED / NOT CONSUMED / IMMUTABLE
LOCAL-004                              = APPROVED WITH CONDITIONS / NOT YET CONSUMED
DATABASE APPLICATION                   = AUTHORIZED TO BEGIN / NOT EXECUTED
DATABASE BASELINE VERIFIED             = NO
HMD-001                                = OPEN
RU-1.4 RUNTIME                         = NOT AUTHORIZED
EIR PASS                               = NONE
RUNTIME COMMITTED                      = NOT CERTIFIED
FINAL COMMIT PATH                      = BLOCKED
NEXT                                   = EXECUTE E-02-DBA-LOCAL-004
DO NOT MODIFY MIGRATIONS · NO DATABASE COMMANDS IN THIS TASK
```

---

**End of document — E-02-DBA-LOCAL-004 — v1.0 — 2026-08-23**
