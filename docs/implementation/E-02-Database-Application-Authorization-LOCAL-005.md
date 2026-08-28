# E-02 — Database Application Authorization (Successor)

## Local Disposable Evidence Environment · CB-B Clean-Base · Declared Baseline Replay · HMD-002 Runtime Replay Verification · IA-003 Artifact Unmodified

| Field | Value |
|-------|-------|
| **Document Type** | **Database Application Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-005** |
| **Predecessor** | **E-02-DBA-LOCAL-004** — [`E-02-Database-Application-Authorization-LOCAL-004.md`](E-02-Database-Application-Authorization-LOCAL-004.md) · **FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| **Prior predecessors** | **E-02-DBA-LOCAL-003** · **E-02-DBA-LOCAL-002** · **E-02-DBA-LOCAL-001** — **NOT CONSUMED / IMMUTABLE** |
| **Restoration authority** | **E-02-HMIR-IA CONSUMED** · [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md) (**COMPLETED WITH NOTES**) |
| **Policy authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) (PAD-039 – PAD-050) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025) |
| **BCR artifact authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md) (**E-02-BCR-IA-003**) — **CONSUMED** · artifact **unmodified by this DBA** |
| **Status** | **Approved With Conditions** |
| **Authority Level** | Database Application Authorization |
| **Effective Date** | 2026-08-23 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Database-Application-Authorization-LOCAL-005.md`](E-02-Database-Application-Authorization-LOCAL-005.md) |
| **Production Effect** | **None** from this record alone |

> **Authority path finding:** `E-02-Database-Application-Authorization-LOCAL-005.md` is **authority-safe** as a **scoped successor Database Application Authorization** under the PAD-012 naming pattern (`E-02-Database-Application-Authorization-{scope}.md` · ID `E-02-DBA-{ENV}-{SEQ}`). A distinct filename is used so predecessors LOCAL-001 / LOCAL-002 / LOCAL-003 / LOCAL-004 and their evidence remain **immutable**. This is **not** a new document class, **not** a new governance tier, **not** a BCR redesign, **not** a migration-repair authorization, **not** a quarantine amendment, **not** a RU-1.4 Runtime Execution Authorization, **not** an EIR decision, **not** Acceptance, and **not** Certification.

> **Superseding authority:** LOCAL-005 **supersedes LOCAL-004 only for a future execution attempt**. It **must not** alter, amend, or reclassify predecessor evidence. LOCAL-004 remains **FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE**.

> **Document class:** Bounded **Database Application Authorization** record only. It **does not execute** LOCAL-005. It **does not** authorize production deployment · remote database mutation · repo-root `supabase start` · raw Postgres/Docker · replay-artifact source modification · DBA-ID spoofing / substitution · RU-1.4 runtime evidence · RPC invocation · destructive fixtures · concurrency tests · EIR reclassification · Acceptance · Project Certification · or Final COMMIT path unblock.

```
DATABASE APPLICATION AUTHORIZATION (SUCCESSOR)  = APPROVED WITH CONDITIONS
AUTHORIZATION ID                                = E-02-DBA-LOCAL-005
PREDECESSOR E-02-DBA-LOCAL-004                  = FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE
PRIOR E-02-DBA-LOCAL-003 / 002 / 001            = NOT CONSUMED / IMMUTABLE
HMIR RESTORATION COMPLETION                     = COMPLETED WITH NOTES
E-02-HMIR-IA                                    = CONSUMED
HMD-002                                         = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
HMD-001                                         = OPEN
RESTORED MIGRATION                              = 20260315035847_add_meeting_templates_and_attachments.sql
SOURCE OF TRUTH                                 = bc48068
RESTORATIONS                                    = 6 / 6
UNEXPECTED GIT-VISIBLE CONTENT CHANGES          = NONE
AUTHORIZED ENVIRONMENT                          = LOCAL_DISPOSABLE_SUPABASE ONLY
AUTHORIZED CLEAN-BASE MODE                      = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS (CB-B)
AUTHORIZED BASELINE MODE                        = E02_DECLARED_BASELINE_REPLAY
DECLARED QUARANTINE SET                         = EXACTLY ONE FILE
QUARANTINED MIGRATION                           = 20260314195641_add_demo_data.sql
RESTORED MIGRATION QUARANTINE STATUS            = NOT QUARANTINED
OPTION B                                        = NOT AUTHORIZED
ARTIFACT AUTHORITY                              = E-02-BCR-IA-003 (UNMODIFIED)
DBA RUNTIME ID                                  = E02_DBA_AUTHORIZATION_ID / EXACT E-02-DBA-LOCAL-005
PRE-EXECUTION ARTIFACT-ID COMPATIBILITY (ISSUANCE READ-ONLY)
                                                = INCOMPATIBLE (artifact exact-pinned to E-02-DBA-LOCAL-004)
SUCCESSFUL APPLY                                = --apply + --preserve-environment
BASELINE VERIFIER AUTHORITY                     = E02_BASELINE_VERIFICATION_AUTHORIZED
RU-1.4 RUNTIME AUTHORITY                        = NOT REQUIRED / NOT AUTHORIZED
DATABASE APPLICATION EXECUTION (THIS TASK)      = NOT PERFORMED
DATABASE APPLICATION EXECUTION (FUTURE)         = AUTHORIZED TO BEGIN / GATED / NOT EXECUTED
OPTION E / RAW POSTGRES / SNAPSHOT / REPAIR     = REJECTED
```

---

## 1. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md) | Direct predecessor checkpoint — six `bc48068` restorations verified · **COMPLETED WITH NOTES** |
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md) | **E-02-HMIR-IA CONSUMED** |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) | PAD-039–PAD-050 · Option A · HMD-002 |
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | PAD-026–PAD-038 · single DATA_ONLY quarantine · HMD-001 |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011–PAD-025 · DAA mechanism |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md) | **E-02-BCR-IA-003 CONSUMED** — artifact implementation authority |
| [`E-02-Database-Application-Authorization-LOCAL-004.md`](E-02-Database-Application-Authorization-LOCAL-004.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md) | LOCAL-004 **APPLICATION_FAILED** at restored-file-before-restoration; evidence **immutable** |
| Artifact (read-only, this issuance) | `scripts/verification/e02/replay-e02-declared-baseline.ts` · `verify-db-baseline.ts` · `environment-guard.ts` |

**Mechanism finding:** This successor DBA is **environment + clean-base-mode + migration-set + baseline-mode + lifecycle + HMD-002 runtime-proof scoped**. It is **not** project-wide blanket permission, **not** production, **not** RU-1.4 REA, **not** artifact code authorization.

---

## 2. Incoming authoritative state (locked)

| Item | Status |
|------|--------|
| E-02 HMIR Restoration Completion | **COMPLETED WITH NOTES** |
| E-02-HMIR-IA | **CONSUMED** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING** |
| HMD-001 | **OPEN** |
| Target restored migration | `supabase/migrations/20260315035847_add_meeting_templates_and_attachments.sql` |
| Source of truth | Git commit **`bc48068`** |
| Authorized / verified restorations | **6 / 6** |
| Unexpected Git-visible content changes | **NONE** |
| Quarantine | Exactly `20260314195641_add_demo_data.sql` · count **1** |
| Option B | **NOT AUTHORIZED** |
| BCR redesign | **NO** |
| LOCAL-001 | **NOT CONSUMED / IMMUTABLE** |
| LOCAL-002 | **FAILED / NOT CONSUMED / IMMUTABLE** |
| LOCAL-003 | **FAILED / NOT CONSUMED / IMMUTABLE** |
| LOCAL-004 | **FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE** |
| LOCAL-005 (before this record) | **REQUIRED / NOT ISSUED** |
| Database baseline verified | **NO** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| EIR PASS | **NONE** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Final COMMIT path | **BLOCKED** |

LOCAL-005 **does not close HMD-002 merely by being issued.**

---

## 3. Predecessor DBA history (immutable)

| Item | Status |
|------|--------|
| `E-02-DBA-LOCAL-001` | **NOT CONSUMED / IMMUTABLE** |
| `E-02-DBA-LOCAL-002` | **FAILED / NOT CONSUMED / IMMUTABLE** |
| `E-02-DBA-LOCAL-003` | **FAILED / NOT CONSUMED / IMMUTABLE** |
| `E-02-DBA-LOCAL-004` | **FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE** (`APPLICATION_FAILED` at `20260315035847_add_meeting_templates_and_attachments.sql`) |
| Evidence LOCAL-001–004 | **IMMUTABLE** — not reclassified, not relabelled, not amended in place |
| Relationship | LOCAL-005 **supersedes LOCAL-004 for future execution only** |

**No predecessor may ever be relabelled successful.** LOCAL-004 environment **must not** be reused.

---

## 4. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-DBA-LOCAL-005** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Authorized environment** | `LOCAL_DISPOSABLE_SUPABASE` only |
| **Authorized clean-base mode** | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` (CB-B) |
| **Authorized baseline mode** | `E02_DECLARED_BASELINE_REPLAY` |
| **Declared quarantine** | Exactly `20260314195641_add_demo_data.sql` · count = 1 |
| **Restored migration** | Participates **normally** in replay · **NOT quarantined** |
| **Application mechanism** | Existing artifact `scripts/verification/e02/replay-e02-declared-baseline.ts` (**E-02-BCR-IA-003**) — **no modification authorized** |
| **Runtime DBA identity** | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-005` (exact; **no source edit**; **no LOCAL-004 substitution**; **no spoofing**) |
| **Successful apply path** | `--apply --preserve-environment` |
| **Baseline verifier gate** | `E02_BASELINE_VERIFICATION_AUTHORIZED=true` (**not** `E02_RUNTIME_EXECUTION_AUTHORIZED`) |
| **Execution this task** | **NOT PERFORMED** |
| **Execution future** | **AUTHORIZED TO BEGIN / PRE-GATED / NOT EXECUTED** |
| **Database Applied** | **NO** |
| **Database Baseline Verified** | **NO** |
| **RU-1.4 Runtime** | **NOT AUTHORIZED** |

---

## 5. Purpose

Authorize **exactly one future fresh local-disposable database-application attempt** to determine whether:

1. CB-B can acquire a fresh auxiliary local Supabase platform baseline;
2. auxiliary application migrations are initially empty;
3. the real repository migration chain can replay under `E02_DECLARED_BASELINE_REPLAY`;
4. exactly one migration remains quarantined: `20260314195641_add_demo_data.sql`;
5. restored migration `20260315035847_add_meeting_templates_and_attachments.sql` now **parses and applies successfully**;
6. no additional historical migration defect blocks replay;
7. RU-1.1 is actually applied;
8. RU-1.2 is actually applied;
9. the resulting DB baseline passes the authorized read-only `verify:e02:baseline` verifier;
10. BCR-CB-001 / 002 / 003 / 004 obtain the required **local** runtime proof to the extent actually proven.

LOCAL-005 is the **runtime replay verification step for HMD-002**.

**This authorization does not itself execute any of those steps.**

---

## 6. Authorized environment

Only `LOCAL_DISPOSABLE_SUPABASE`. Requirements: **fresh · temporary · machine-local · disposable · unlinked · non-production · non-remote · non-shared.**

**Prohibited:** reuse of LOCAL-004 environment · reuse of any partially replayed environment · repo-root Supabase stack as fallback · `supabase link` · remote / production / shared target.

Remote target detection → **fail closed**.

---

## 7. Clean-base / baseline modes

Clean-base = **exactly** `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` (CB-B). Fresh auxiliary project per attempt. Auxiliary timestamped migration count **= 0** before startup. If count ≠ 0: **STOP.**

Baseline mode = `E02_DECLARED_BASELINE_REPLAY`.

Platform baseline is owned by Supabase CLI/images (`auth` · `auth.users` · `storage` · `storage.objects` · `storage.buckets` · required roles · required extensions · platform migration histories). BCR must **fabricate none** of these. Application history must initially be empty before real-repository replay. Platform histories must remain **preserved**.

---

## 8. Artifact authority and pre-execution DBA-ID compatibility gate

Runtime artifact: `scripts/verification/e02/replay-e02-declared-baseline.ts`. Implementation authority: **E-02-BCR-IA-003**. Static metadata `ARTIFACT_AUTHORIZATION_ID=E-02-BCR-IA-003` is **not** DBA execution authority.

**Required runtime DBA identity for LOCAL-005 execution:**

```
E02_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-005
```

exact match. **No prefix. No regex. No arbitrary ID. No source edit during execution. No substitution of LOCAL-004. No spoofing.**

### 8.1 Read-only compatibility finding (this issuance — 2026-08-23)

Inspected `scripts/verification/e02/replay-e02-declared-baseline.ts` **read-only**:

| Constant / rule | Current value |
|-----------------|---------------|
| `ARTIFACT_AUTHORIZATION_ID` | `E-02-BCR-IA-003` |
| `EXPECTED_DBA_AUTHORIZATION_ID` | **`E-02-DBA-LOCAL-004`** |
| Match model | exact string equality against `process.env.E02_DBA_AUTHORIZATION_ID` |
| `verify-db-baseline.ts` DBA-ID pin | **none found** |
| `environment-guard.ts` DBA-ID pin | **none found** |

**Finding:** the current replay artifact **cannot accept** `E-02-DBA-LOCAL-005` without source modification.

```
PRE-EXECUTION ARTIFACT-ID COMPATIBILITY = INCOMPATIBLE
CURRENT PIN                             = E-02-DBA-LOCAL-004
REQUIRED PIN FOR LOCAL-005 EXECUTION    = E-02-DBA-LOCAL-005
SOURCE MODIFICATION UNDER LOCAL-005     = NOT AUTHORIZED
LOCAL-004 SUBSTITUTION                  = NOT AUTHORIZED
SPOOFING                                = NOT AUTHORIZED
```

**This issuance does not silently assume compatibility.** Future executor **must re-check** this gate immediately before any stateful command. If still incompatible:

```
RESULT = BLOCKED
STOP → GOVERNANCE (successor BCR Implementation Authorization required)
NO DATABASE COMMAND
NO ARTIFACT EDIT UNDER LOCAL-005
```

LOCAL-005 **does not** authorize a BCR redesign or artifact edit. A **successor BCR implementation authorization** would be required to retarget `EXPECTED_DBA_AUTHORIZATION_ID` before apply can lawfully proceed.

---

## 9. Pre-execution restoration-integrity gate

Before **any** stateful execution, the executor must **read-only** verify:

| ID | Check |
|----|--------|
| A | Target path remains exactly `supabase/migrations/20260315035847_add_meeting_templates_and_attachments.sql` |
| B | Working-tree restoration remains **exactly** the six PAD-039–050 / E-02-HMIR-IA authorized restorations |
| C | Each restored value still **equals `bc48068`** |
| D | No seventh Git-visible content restoration/change has appeared |
| E | Target filename and timestamp unchanged |
| F | Quarantine remains exactly `20260314195641_add_demo_data.sql` · count = 1 |
| G | Restored migration is **NOT quarantined** |
| H | Option B remains **NOT AUTHORIZED** |
| I | No governance record supersedes the HMIR Restoration Completion or this LOCAL-005 authority |

Any failure: **STOP → GOVERNANCE. Do not run the database.**

The six locked restorations (from HMIR Completion / `bc48068`):

| # | Before (corrupted HEAD/`8c30eb2`) | After (`bc48068`) |
|---|-----------------------------------|-------------------|
| 1 | `'所有业主参加的年度会议，审查年度绩效并选举业委会成?,` | `'所有业主参加的年度会议，审查年度绩效并选举业委会成员',` |
| 2 | `'业委会会?,` | `'业委会会议',` |
| 3 | `'业委会定期会议，讨论和决定小区事?,` | `'业委会定期会议，讨论和决定小区事务',` |
| 4 | `'为需要业主批准的紧急或特定事项召开的特别会?,` | `'为需要业主批准的紧急或特定事项召开的特别会议',` |
| 5 | `'紧急会?,` | `'紧急会议',` |
| 6 | `'需要紧急处理的即时问题的紧急会?,` | `'需要紧急处理的即时问题的紧急会议',` |

Pre-existing working-tree EOF CRLF vs HEAD LF is a **recorded line-ending note**, not a seventh semantic restoration, and **must not** be normalized during LOCAL-005.

---

## 10. Historical migration boundary (HMD-002)

The restored migration is authorized to **participate normally** in replay. It **MUST NOT** be:

- edited again
- quarantined
- skipped
- copied into a filtered migration tree
- marked applied without execution
- replaced by compatibility SQL
- repaired with `migration repair`
- rewritten
- normalized
- reseeded manually

The restoration is the authorized repository source for LOCAL-005 replay.

Until actual replay proof exists:

```
HMD-002 = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
```

---

## 11. Quarantine

```
quarantinedMigrations = [ 20260314195641_add_demo_data.sql ]
count                 = 1
reason                = HMD-001 historical defect
```

| File | Status |
|------|--------|
| `20260314195641_add_demo_data.sql` | **QUARANTINED** |
| `20260315035847_add_meeting_templates_and_attachments.sql` | **NOT QUARANTINED** |
| Option B | **NOT AUTHORIZED** |

No second quarantine · no wildcard · no regex expansion · no automatic “skip failing migration” · no operator-selected skip · no migration repair · no fake applied history.

If **any other** non-quarantined migration fails: **STOP**. Record the exact migration and exact failure. Return to governance.

---

## 12. CLI / launcher contract (BCR-CB-002)

Runtime proof must exercise the **IA-003** launcher implementation. **No artifact edit.**

| Platform | Contract |
|----------|----------|
| Windows | `ComSpec` / `cmd.exe` + `/d /s /c` + `npx` + `supabase` + allowlisted subcommand + `shell:false` |
| Non-Windows | direct `npx` + `shell:false` |

Allowed subcommands **exactly:** `init` · `start` · `status` · `stop`.

**Forbidden:** `npx.cmd` direct spawn · `shell:true` · raw Docker fallback · raw Postgres fallback · undocumented no-migrate flags · repo-root start fallback.

Failures must distinguish `PROCESS_DID_NOT_START` from `PROCESS_EXITED_NONZERO`.

---

## 13. Connection discovery

Discover runtime connection details **only** through:

```
supabase status --workdir <auxiliaryWorkdir> --output json
```

DB target **must** be local. Non-local / remote / production / shared → **STOP**.

`DATABASE_URL` / `SUPABASE_URL` / credentials: **runtime only** · **never** persisted in manifest · **never** persisted in governance evidence · **never** printed unnecessarily.

---

## 14. Application-layer reset

Only after the auxiliary platform baseline is running and validated, existing `resetApplicationLayerForReplay()` may reset **only**:

- `public`
- `supabase_migrations`

**Must not** reset or fabricate: `auth` · `storage` · extensions · platform histories · platform roles.

---

## 15. Real migration source

Authoritative application migration source:

```
<repository>/supabase/migrations/
```

Auxiliary migrations directory remains **empty** and is **not** the application source. **No** copying · filtered tree · symlink alternate source · temporary rewritten migrations.

---

## 16. Truthful migration history / platform histories

| Event | History |
|-------|---------|
| Executed migration | record applied |
| Quarantined migration | do **not** execute · do **not** record applied |
| Failed migration | **STOP** · do not continue |

**No** `supabase migration repair` · **no** mark-as-applied · **no** fabricated `schema_migrations` row · **no** platform-history modification.

Platform histories (`auth.schema_migrations` · `storage.migrations` · platform-managed) remain **preserved**. BCR manages **only** application migration history.

---

## 17. HMD-002 runtime proof (restored migration)

LOCAL-005 evidence **must** record the actual result for:

```
20260315035847_add_meeting_templates_and_attachments.sql
```

**Required success proof:**

- migration reached
- SQL executed
- migration completed successfully
- migration recorded truthfully as applied
- no parser error at the prior LOCAL-004 line-119 failure site (`syntax error at or near "1."`)
- no compatibility exception used
- no second quarantine used

If this migration fails again:

```
DATABASE APPLICATION RESULT = APPLICATION_FAILED
HMD-002                     = remains runtime-unverified
```

**STOP.** Do **not** edit the migration during execution.

---

## 18. Downstream replay

After the restored migration succeeds, continue deterministic replay of **all remaining non-quarantined** timestamped migrations.

First subsequent failure: **STOP**. No silent retry · no additional repair · no second quarantine.

Evidence must identify: exact migration · failure stage · sanitized error · highest successfully applied migration before failure.

---

## 19. RU-1.1

Prove **actual database application** of:

```
20261729120000_create_owner_vote_primary_freeze_audits.sql
```

and presence of `public.owner_vote_primary_freeze_audits`. **Plan reachability alone is insufficient.**

---

## 20. RU-1.2

Prove **actual database application** of:

```
20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql
```

and metadata for `public.execute_owner_vote_atomic_freeze_commit` plus the governed helper expected by the baseline verifier.

**DO NOT invoke the RPC.** Metadata only.

---

## 21. Success apply hand-off (BCR-CB-003)

LOCAL-005 success-path apply **must** use:

```
--apply --preserve-environment
```

Lifecycle:

```
fresh auxiliary environment
→ platform baseline
→ governed replay
→ restored migration succeeds
→ downstream replay succeeds
→ RU-1.1 reached/applied
→ RU-1.2 reached/applied
→ manifest finalized
→ manifest persisted
→ auxiliary DB remains RUNNING
→ baseline verification pending
```

Expected disposition:

```
auxiliaryEnvironmentDisposition = RUNNING_FOR_BASELINE_VERIFY
baselineVerificationPending     = true
cleanupRequired                 = true
cleanupCompleted                = false
```

**Do not teardown** a successful environment before the verifier.

---

## 22. Manifest (minimum)

LOCAL-005 evidence must require a replay manifest containing at least ( **no secrets · no URLs** ):

```
authorizationId                      = E-02-DBA-LOCAL-005
artifactAuthorizationId              = E-02-BCR-IA-003
validatedDbaAuthorizationId          = E-02-DBA-LOCAL-005
baselineMode                         = E02_DECLARED_BASELINE_REPLAY
cleanBaseMode                        = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
environmentClass                     = local / LOCAL_DISPOSABLE as implemented
freshAuxiliaryProject                = true
auxiliaryMigrationCountBeforeStart   = 0
platformBaselineReady                = true on successful acquisition
applicationMigrationHistoryInitiallyEmpty = true on successful acquisition
realRepositoryMigrationSource        = supabase/migrations
quarantinedMigrations                = [20260314195641_add_demo_data.sql]
quarantineCount                      = 1
historicalDefect                     includes HMD-001
HMD-002 runtime replay result        recorded distinctly
ru11Reached / ru12Reached
executedMigrationCount
quarantinedMigrationCount
failure list
startedAt / finishedAt
cliLauncherMode / cliLauncherPlatform
auxiliaryEnvironmentDisposition
baselineVerificationPending
cleanupRequired / cleanupCompleted
bcrCb001Status / bcrCb002Status / bcrCb003Status / bcrCb004Status
```

---

## 23. Baseline verifier authority (BCR-CB-004)

Only after successful preserved apply, run **exactly**:

```
npm run verify:e02:baseline
```

with `E02_BASELINE_VERIFICATION_AUTHORIZED=true` and the required local environment-guard inputs.

**DO NOT set** `E02_RUNTIME_EXECUTION_AUTHORIZED` for baseline-only verification.

Verifier remains **read-only metadata verification**. **No** RPC · DML · DDL · fixtures · concurrency tests · advisory-lock tests · partial-state tests · EIR-048/EIR-054 · RU-1.4 suite.

Must verify the governed baseline already defined by the existing verifier, including:

**Primary Audit table baseline:** expected 20 columns · no `committed_at` · PK · UNIQUE(`freeze_event_id`) · three governed FK RESTRICT relationships · CHECK constraints · RLS · governed SELECT policy · grants · immutability function / trigger.

**RU-1.2 metadata baseline:** RPC identity · expected five parameters · RETURNS jsonb · SECURITY DEFINER · governed `search_path` · owner/grants · helper metadata/exposure. **No RPC invocation.**

---

## 24. HMD-002 success semantics

Only if **all** of: restoration-integrity gate PASS · artifact accepts exact LOCAL-005 authority **without source modification** · fresh CB-B acquisition PASS · restored migration actually applies · full governed replay reaches required head · RU-1.1 applies · RU-1.2 applies · baseline verifier PASS —

may LOCAL-005 evidence reclassify HMD-002 from:

```
SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
```

to:

```
SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED
```

**Do NOT** use `CLOSED` unless a separate governance decision explicitly authorizes closure terminology.

HMD-001 remains **OPEN**.

---

## 25. BCR defect runtime proof

On full LOCAL-005 success, evidence may record **local** runtime verification for BCR-CB-001 / 002 / 003 / 004 **only to the extent actually proven by this run**. Do **not** generalize local proof into production certification.

---

## 26. Result taxonomy

Use only:

- `APPLIED_AND_BASELINE_VERIFIED`
- `APPLICATION_FAILED`
- `APPLIED_BASELINE_FAILED`
- `BLOCKED`
- `NOT_RUN`

**Do not use:** `EIR_PASS` · `COMMITTED` · `PROJECT_CERTIFIED` · `FULL_REPOSITORY_CERTIFIED`.

If pre-execution artifact authorization-ID compatibility fails: **`BLOCKED`** and return to BCR governance **before any DB command**.

---

## 27. Failure policy

Any failure: **STOP**. No silent retry under the same authorization · no code modification · no migration modification · no repair · no second quarantine · no environment fallback · no fake history.

Issue LOCAL-005 evidence reflecting the **actual** failure stage.

Do **not** modify LOCAL-001 / LOCAL-002 / LOCAL-003 / LOCAL-004 evidence.

---

## 28. Cleanup

After apply evidence · manifest · baseline verifier (or failure) · required forensic evidence are captured, perform **explicit** artifact cleanup using the authorized cleanup mode and the **same** evidence run ID / DBA ID:

```
--cleanup
+ E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-005
+ same E02_EVIDENCE_RUN_ID
```

Successful full path expected final disposition: `CLEANED_AFTER_VERIFY`.

Cleanup failure after successful replay + baseline verification must be recorded as a cleanup warning/failure and **must not** falsify `APPLIED_AND_BASELINE_VERIFIED` if database application and baseline verification actually passed. **Do not fabricate cleanup success.**

---

## 29. Future Database Application Evidence

After execution, create a **NEW** evidence document:

```
docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md
```

**Do not create it in this issuance task. Do not modify** LOCAL-001–004 evidence.

Evidence must record at minimum:

1. authorization ID  
2. execution date/time  
3. repository commit/ref  
4. environment classification  
5. Docker availability  
6. pre-execution restoration-integrity result  
7. restored migration six-value `bc48068` equality result  
8. quarantine name/count  
9. BCR plan result  
10. launcher platform/mode  
11. auxiliary workdir sanitized identity  
12. auxiliary init result  
13. auxiliary migration count before start  
14. auxiliary start result  
15. platform baseline result  
16. auth/storage presence  
17. local DB URL validation result **without URL**  
18. initial application-history-empty result  
19. application-layer reset result  
20. real repository source  
21. discovered migration count  
22. executable migration count  
23. quarantined migration count  
24. restored migration reached/applied/result  
25. prior parser failure reproduced? YES/NO  
26. executed migration count  
27. first failing migration if any  
28. highest applied migration  
29. quarantine history-row status  
30. truthful history result  
31. RU-1.1 reached/applied/object result  
32. RU-1.2 reached/applied/RPC-helper metadata result  
33. manifest result/path  
34. successful preserve/handoff state  
35. baseline verifier authorization gate result  
36. baseline verifier result  
37. Primary Audit baseline result  
38. RU-1.2 metadata baseline result  
39. `rpcInvoked=false`  
40. RU-1.4 `runtimeTests=false`  
41. `destructiveFixtures=false`  
42. BCR-CB-001 runtime result  
43. BCR-CB-002 runtime result  
44. BCR-CB-003 runtime result  
45. BCR-CB-004 runtime result  
46. HMD-001 status  
47. HMD-002 resulting status  
48. explicit cleanup result  
49. final environment disposition  
50. overall Database Application Result  
51. EIR/Acceptance/Certification unchanged  
52. exact next governance action  

**No secrets.**

---

## 30. Success semantics

Full success requires **ALL** of:

- restoration-integrity pre-gate PASS
- artifact accepts exact LOCAL-005 authority **without source modification**
- fresh auxiliary project PASS
- auxiliary migrations = 0
- platform baseline PASS
- local DB target PASS
- application history initially empty
- bounded app-layer reset PASS
- real repo replay begins
- quarantine remains exactly one
- restored `20260315035847` migration applies successfully
- no additional non-quarantined migration fails
- RU-1.1 applies
- RU-1.2 applies
- truthful migration history maintained
- manifest written
- environment preserved
- baseline verifier runs under DBA baseline authority
- baseline verifier PASS
- no RPC invoked
- no RU-1.4 suite run
- evidence captured
- explicit cleanup attempted and truthfully recorded

Then:

```
E-02-DBA-LOCAL-005              = CONSUMED
DATABASE APPLICATION RESULT     = APPLIED_AND_BASELINE_VERIFIED
HMD-002                         = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED
HMD-001                         = OPEN
DATABASE BASELINE VERIFIED      = YES
BCR-CB-001..004                 = RUNTIME VERIFIED LOCALLY (to the extent proven)
RU-1.4                          = STILL NOT AUTHORIZED
EIR PASS                        = NONE
RUNTIME COMMITTED               = NOT CERTIFIED
FINAL COMMIT PATH               = BLOCKED
```

---

## 31. Failure semantics

On failure:

```
E-02-DBA-LOCAL-005 = NOT SUCCESSFULLY CONSUMED
```

Evidence must still be issued. Use actual result taxonomy. **Do not** issue RU-1.4 REA. **Do not** retry silently. **Do not** change historical evidence.

If the artifact-ID compatibility gate fails: result **`BLOCKED`**; next action is BCR governance (successor BCR IA), **not** silent apply.

---

## 32. RU-1.4 boundary

LOCAL-005 does **NOT** authorize: `verify:e02` runtime suite · `test:e02` · concurrency tests · destructive fixtures · advisory-lock proof · partial-state proof · EIR-048 · EIR-054 · `execute_owner_vote_atomic_freeze_commit` invocation.

RU-1.4 remains **RUNTIME NOT AUTHORIZED** even if LOCAL-005 succeeds.

---

## 33. Next after future execution (not this task)

**ONLY if** LOCAL-005 result is `APPLIED_AND_BASELINE_VERIFIED`, the next governance document may be:

```
docs/implementation/E-02-RU-1.4-Runtime-Execution-Authorization.md
Authorization ID: E-02-RU-1.4-REA
```

**Do not create REA in this task.**

If LOCAL-005 fails, next action is determined by the **actual** failure (including `BLOCKED` at the artifact-ID gate → successor BCR IA).

---

## 34. Pre-execution sequence (future; not performed here)

```
1.  read-only artifact-ID compatibility gate
    (must accept exact E-02-DBA-LOCAL-005 without source modification)
    if INCOMPATIBLE → BLOCKED → BCR governance; NO DB
2.  restoration-integrity gate A–I
    if FAIL → GOVERNANCE; NO DB
3.  target safety (local disposable)
4.  Docker Engine check (read-only)
5.  BCR --plan (no DB)
6.  set E02_BCR_APPLY_AUTHORIZED=true
    E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-005
    E02_EVIDENCE_RUN_ID=<safe id>
7.  BCR --apply --preserve-environment
    (fresh aux; empty migrations; platform baseline; no LOCAL-004 reuse)
8.  prove restored 20260315035847 applies; downstream replay; RU-1.1; RU-1.2
9.  persist manifest; env remains RUNNING_FOR_BASELINE_VERIFY
10. rediscover DB URL via status --output json (runtime-only; not persisted)
11. npm run verify:e02:baseline
    with E02_BASELINE_VERIFICATION_AUTHORIZED=true
    WITHOUT E02_RUNTIME_EXECUTION_AUTHORIZED
12. issue LOCAL-005 evidence
13. BCR --cleanup (same DBA ID + same runId)
14. record cleanup disposition
```

---

## 35. Current project effect (issuance only)

```
E-02-DBA-LOCAL-005     = APPROVED WITH CONDITIONS / NOT YET CONSUMED
Database Application   = AUTHORIZED TO BEGIN / GATED / NOT EXECUTED
HMD-002                = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
HMD-001                = OPEN
Database Baseline      = NOT VERIFIED
RU-1.4 Runtime         = NOT AUTHORIZED
Artifact-ID gate       = INCOMPATIBLE at issuance (pin still E-02-DBA-LOCAL-004)
```

LOCAL-004 remains **FAILED / IMMUTABLE**. HMIR Restoration Completion remains **COMPLETED WITH NOTES**.

---

## 36. Next action (this issuance)

```
NEXT = EXECUTE E-02-DBA-LOCAL-005
```

Not executed in this task. Executor **must** run §8 compatibility gate and §9 restoration-integrity gate **before** any stateful command.

REA remains **not created**.

---

## 37. File scope / prohibited work (this issuance confirmation)

This issuance task may modify **only**:

1. `docs/implementation/E-02-Database-Application-Authorization-LOCAL-005.md` (this document)
2. `docs/implementation/README.md` (minimal)

**No** migration modification · **no** source modification · **no** replay artifact modification · **no** verifier modification · **no** environment-guard modification · **no** package/lockfile modification · **no** tests/harness modification · **no** git commit · **no** DB · **no** Supabase init/start/status/stop · **no** Docker · **no** BCR `--apply` · **no** baseline verifier · **no** LOCAL-005 execution · **no** LOCAL-005 evidence creation · **no** RU-1.4 · **no** REA · **no** RPC · **no** fixtures · **no** EIR/Acceptance/Certification change.

---

## 38. Lock statement

```
DATABASE APPLICATION AUTHORIZATION     = E-02-DBA-LOCAL-005
DECISION                               = APPROVED WITH CONDITIONS
AUTHORIZED ENVIRONMENT                 = LOCAL_DISPOSABLE_SUPABASE
CLEAN-BASE MODE                        = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
BASELINE MODE                          = E02_DECLARED_BASELINE_REPLAY
HMIR RESTORATION COMPLETION            = COMPLETED WITH NOTES
HMD-002                                = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
HMD-001                                = OPEN
RESTORED MIGRATION                     = 20260315035847_add_meeting_templates_and_attachments.sql
SOURCE OF TRUTH                        = bc48068
RESTORATIONS                           = 6 / 6
QUARANTINE                             = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
OPTION B                               = NOT AUTHORIZED
ARTIFACT AUTHORITY                     = E-02-BCR-IA-003
DBA AUTHORIZATION ID                   = E02_DBA_AUTHORIZATION_ID / EXACT E-02-DBA-LOCAL-005
PRE-EXECUTION ARTIFACT-ID COMPATIBILITY = INCOMPATIBLE (CURRENT PIN E-02-DBA-LOCAL-004)
LOCAL-004                              = FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE
LOCAL-005                              = APPROVED WITH CONDITIONS / NOT YET CONSUMED
DATABASE APPLICATION                   = AUTHORIZED TO BEGIN / GATED / NOT EXECUTED
DATABASE BASELINE VERIFIED             = NO
RU-1.4                                 = RUNTIME NOT AUTHORIZED
EIR PASS                               = NONE
RUNTIME COMMITTED                      = NOT CERTIFIED
FINAL COMMIT PATH                      = BLOCKED
NEXT                                   = EXECUTE E-02-DBA-LOCAL-005
DO NOT MODIFY MIGRATIONS · NO DATABASE COMMANDS IN THIS TASK
```

---

**End of document — E-02-DBA-LOCAL-005 — v1.0 — 2026-08-23**
