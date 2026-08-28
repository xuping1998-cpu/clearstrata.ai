# E-02 — Database Application Authorization (Successor)

## Local Disposable Evidence Environment · Declared Baseline Replay

| Field | Value |
|-------|-------|
| **Document Type** | **Database Application Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-002** |
| **Predecessor** | **E-02-DBA-LOCAL-001** — [`E-02-Database-Application-Authorization.md`](E-02-Database-Application-Authorization.md) · **NOT CONSUMED / HISTORICAL EVIDENCE PRESERVED** |
| **Status** | **Approved With Conditions** |
| **Authority Level** | Database Application Authorization |
| **Effective Date** | 2026-08-22 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Database-Application-Authorization-LOCAL-002.md`](E-02-Database-Application-Authorization-LOCAL-002.md) |
| **Production Effect** | **None** from this record alone |

> **Authority path finding:** `E-02-Database-Application-Authorization-LOCAL-002.md` is **authority-safe** as a **scoped successor Database Application Authorization** under the PAD-012 naming pattern (`E-02-Database-Application-Authorization-{scope}.md` · ID `E-02-DBA-{ENV}-{SEQ}`). A distinct filename is used so that predecessor `E-02-Database-Application-Authorization.md` (`E-02-DBA-LOCAL-001`) and its evidence remain **immutable**. This is **not** a new document class or tier.

> **Superseding authority:** [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038 · HMBC-001 – HMBC-018) is the **direct superseding authority** for this successor DBA, together with [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025).

> **Document class:** Bounded **Database Application Authorization** record only. It **does not** authorize production deployment · remote database mutation · plain unmodified `supabase db reset` as the application mechanism · replay-artifact repository implementation · RU-1.4 runtime evidence execution · RPC invocation · destructive fixtures · concurrency tests · EIR reclassification · Acceptance · Project Certification · or Final COMMIT path unblock.

```
DATABASE APPLICATION AUTHORIZATION (SUCCESSOR)  = APPROVED WITH CONDITIONS
AUTHORIZATION ID                                = E-02-DBA-LOCAL-002
PREDECESSOR E-02-DBA-LOCAL-001                  = NOT CONSUMED / EVIDENCE IMMUTABLE
AUTHORIZED ENVIRONMENT                          = LOCAL_DISPOSABLE_SUPABASE ONLY
AUTHORIZED BASELINE MODE                        = E02_DECLARED_BASELINE_REPLAY
DECLARED QUARANTINE SET                         = EXACTLY ONE FILE
QUARANTINED MIGRATION                           = 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION FILE                       = UNCHANGED / IMMUTABLE
HMD-001 HISTORICAL DEFECT                       = OPEN
OPTION E                                        = REJECTED
PLAIN UNMODIFIED supabase db reset              = NOT SUFFICIENT / NOT THE APPLICATION MECHANISM
GOVERNED REPLAY ARTIFACT                        = REQUIRED / NOT YET IMPLEMENTED / SEPARATE IA REQUIRED
DATABASE APPLICATION EXECUTION (THIS TASK)      = NOT PERFORMED
DATABASE APPLICATION EXECUTION (FUTURE)         = BLOCKED ON AUTHORIZED ARTIFACT IMPLEMENTATION
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
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | **Superseding authority** — PAD-026 – PAD-038 · HMBC-001 – HMBC-018 · quarantine mechanism · replacement term · artifact class C · HMD-001 |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011 – PAD-025 · DAA mechanism · DAA-011 apply-failure · PAD-013/016 scope · PAD-022 manifest |
| [`E-02-Database-Application-Authorization.md`](E-02-Database-Application-Authorization.md) | Predecessor `E-02-DBA-LOCAL-001` — **NOT CONSUMED**; format precedent; preserved immutable |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md) | `APPLICATION_FAILED`; Attempt-1 Docker; **immutable historical record** |
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) v1.0 | PAD-003 · PAD-007 · PAD-008 immutability |
| [`E-02-Executable-Remediation-Plan.md`](E-02-Executable-Remediation-Plan.md) v1.0 | RU chain · immutability constraints |
| [`E-02-RU-1.1-Completion.md`](E-02-RU-1.1-Completion.md) · [`E-02-RU-1.2-Completion.md`](E-02-RU-1.2-Completion.md) · [`E-02-RU-1.3-Completion.md`](E-02-RU-1.3-Completion.md) | Repository IMPLEMENTED · DB NOT APPLIED · runtime NOT VERIFIED |
| [`E-02-RU-1.4-Implementation.md`](E-02-RU-1.4-Implementation.md) · [`E-02-RU-1.4-Design-Review.md`](E-02-RU-1.4-Design-Review.md) · [`E-02-RU-1.4-Implementation-Review.md`](E-02-RU-1.4-Implementation-Review.md) · [`E-02-RU-1.4-Implementation-Authorization.md`](E-02-RU-1.4-Implementation-Authorization.md) | Harness only · **CONSUMED** · **locked 38-file tree (§5)** · broad wildcards prohibited (§6) |
| Migration targets (repository) | `20261729120000_create_owner_vote_primary_freeze_audits.sql` (RU-1.1) · `20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql` (RU-1.2) |
| Quarantine target (repository) | `20260314195641_add_demo_data.sql` — data-only · HMD-001 |

**Mechanism finding:** This successor DBA is **environment + migration-set + baseline-mode scoped**. It is **not** project-wide blanket permission, **not** production deployment, **not** runtime execution authorization, **not** replay-artifact code authorization, **not** generic Supabase administration.

**No contradiction found** between the superseding PAD, the DAA mechanism, and this authorization.

---

## 2. Predecessor relationship (preserved)

| Item | Value |
|------|-------|
| `E-02-DBA-LOCAL-001` status | **NOT CONSUMED** — remains as issued |
| LOCAL-001 evidence | **IMMUTABLE** — preserves Attempt-1 (Docker unavailable) and the recorded `APPLICATION_FAILED` |
| Relationship | LOCAL-002 **supersedes LOCAL-001 for future execution** (baseline term changed) but **does not amend or relabel** LOCAL-001 |
| LOCAL-001 baseline term | `FULL_REPOSITORY_MIGRATION_REPLAY` — **retired** for E-02 baseline; not reused |

**LOCAL-001 must never be relabelled successful.** Historical attempts (Attempt-1 Docker · Attempt-2 FK failure at `20260314195641`) remain preserved as governed findings.

---

## 3. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-DBA-LOCAL-002** |
| **Database Application Authorization** | **APPROVED WITH CONDITIONS** |
| **Authorized environment** | `LOCAL_DISPOSABLE_SUPABASE` only |
| **Authorized baseline mode** | `E02_DECLARED_BASELINE_REPLAY` |
| **Declared quarantine** | Exactly `20260314195641_add_demo_data.sql` |
| **Database Application execution (this task)** | **NOT PERFORMED** |
| **Database Application execution (future)** | **BLOCKED ON AUTHORIZED GOVERNED REPLAY ARTIFACT IMPLEMENTATION** (see §10) |
| **Database Applied** | **NO** |
| **Database Baseline Verified** | **NO** |
| **RU-1.4 Runtime Execution** | **NOT AUTHORIZED** |

**Authorization statement:** Once a governed deterministic baseline-replay artifact is **separately implemented and authorized**, future execution under **E-02-DBA-LOCAL-002** may prepare a **local disposable Supabase evidence environment**, reconstruct the baseline via `E02_DECLARED_BASELINE_REPLAY` with the single declared quarantine, verify baseline read-only, and issue successor Database Application Evidence — **only** within the conditions in this record.

**This task performed authorization issuance only.** No database connection · no environment bring-up · no migration apply · no replay-artifact creation · no baseline execution · no evidence collection.

---

## 4. Authorized baseline mode

```
baselineMode         = E02_DECLARED_BASELINE_REPLAY
full semantic meaning = FULL_REPOSITORY_SCHEMA_BASELINE_REPLAY
                        WITH DECLARED NON-E02 LEGACY-DATA QUARANTINE
```

Unqualified `FULL_REPOSITORY_MIGRATION_REPLAY` **MUST NOT** be used for LOCAL-002. The mode must always make explicit that exactly one declared migration is not executed.

**Truthful scope statement:**

```
E02_DECLARED_BASELINE_REPLAY  = repository schema baseline reconstruction, all migrations in order,
                                MINUS one declared quarantined non-E02 legacy demo-data migration
QUARANTINED                   = 20260314195641_add_demo_data.sql (exactly one)
E-02 REMEDIATION FOCUS        = 20261729120000 + 20261821120000
AUTHORIZATION                 ≠ "full clean repository replay"
AUTHORIZATION                 ≠ "only two migrations"
```

---

## 5. Declared quarantine allowlist

| Field | Value |
|-------|-------|
| **Authorized quarantine set** | **EXACTLY ONE FILE** |
| **Quarantined migration** | `supabase/migrations/20260314195641_add_demo_data.sql` |
| Wildcard / pattern | **PROHIBITED** |
| "skip all demo migrations" | **PROHIBITED** |
| "skip failing migration" (generic) | **PROHIBITED** |
| Second quarantined migration | **PROHIBITED without new Program Authority** |

**If any other migration fails during future replay: STOP.** No automatic quarantine expansion.

---

## 6. Quarantine classification (recorded)

| Property | Value |
|----------|-------|
| migration | `20260314195641_add_demo_data.sql` |
| classification | `NON_E02_LEGACY_DEMO_DATA` / `HISTORICAL_REPLAY_DEFECT` |
| defect | **HMD-001 — OPEN** |
| `DATA_ONLY` | **TRUE** |
| `SCHEMA_OBJECTS` | **NONE** |
| `FUNCTIONS / POLICIES / TRIGGERS / INDEXES` | **NONE** |
| `DOWNSTREAM_DEPENDENCY` | **NONE_FOUND** |
| `RU_1_4_DEPENDENCY` | **NONE** |
| `migrationFileModified` | **FALSE** |

---

## 7. Historical migration immutability (locked)

During any future execution under this DBA, the following are **explicitly prohibited** for `supabase/migrations/20260314195641_add_demo_data.sql`:

- editing · renaming · moving · deleting · commenting out · `supabase migration repair`-marking

Quarantine **must** occur through the governed replay mechanism only. The historical file **remains immutable** and part of repository history. RU-1.1 (`20261729120000`) and RU-1.2 (`20261821120000`) migration files must likewise remain **unchanged**.

---

## 8. Governed baseline replay artifact (contract)

The application mechanism for LOCAL-002 is a **deterministic governed baseline-compatibility replay artifact** (artifact **class C** per PAD-035) — **not** RU-1.4 harness, **not** a migration, **not** a manual psql procedure, **not** plain `supabase db reset`.

Required behavior (contract — **implementation deferred**, see §10):

| # | Requirement |
|---|-------------|
| 1 | Establish local disposable Supabase baseline (environment prep) |
| 2 | Enumerate repository migrations in deterministic timestamp order |
| 3 | Quarantine **exactly** `20260314195641_add_demo_data.sql` |
| 4 | Execute all remaining applicable migrations in order |
| 5 | Record the quarantine explicitly in a manifest |
| 6 | Preserve original migration files unchanged (no edit/rename/move/delete) |
| 7 | Fail closed on **any** additional migration failure |
| 8 | Produce a manifest (§12) |
| 9 | Verify resulting migration/schema state (hand off to baseline verifier §14) |
| 10 | Operate **LOCAL_DISPOSABLE only** |

---

## 9. Governed replay artifact — path finding

| Item | Finding |
|------|---------|
| Preferred candidate path | `scripts/verification/e02/replay-e02-declared-baseline.ts` (or an equivalent E-02 verification-tooling location) |
| RU-1.4-IA file-tree authority | RU-1.4-IA §5 locks an **exact 38-file authorized tree**; §6 prohibits broad wildcards; RU-1.4-IA is **CONSUMED** |
| Is the candidate path inside RU-1.4-IA scope? | **NO** — the replay artifact is **not** among the RU-1.4 authorized files and is a **distinct artifact class** (baseline-compatibility, not evidence harness) |
| Path decision | **PROPOSED — AUTHORITY TO BE CONFIRMED IN A SEPARATE IMPLEMENTATION AUTHORIZATION** (do not invent/commit the path in this task) |

**The artifact is NOT created in this task.**

---

## 10. Replay implementation authorization question (formal)

**Decision: Case B.**

```
LOCAL-002 does NOT authorize repository implementation of the governed replay artifact.
LOCAL-002 establishes the artifact CONTRACT (§8) and authorizes future DATABASE EXECUTION
ONLY ONCE the artifact is separately implemented and authorized.
```

**Basis:** The only consumed repository-implementation authority for `scripts/verification/e02/**` is **E-02-RU-1.4-IA**, whose §5 authorized file tree does **not** include a baseline-replay artifact, whose §6 prohibits broad wildcards, and whose §29 requires **STOP and return to governance** on any new tooling/DB-authorization assumption. Bundling replay code authority into a DBA would create code authority outside the established Implementation-Authorization chain. Therefore a **separate Implementation Authorization** is required for the governed replay artifact (fail-closed governance).

```
NEXT (repository track) = ISSUE IMPLEMENTATION AUTHORIZATION FOR THE GOVERNED REPLAY ARTIFACT
```

---

## 11. Quarantine preconditions (fail-closed, before future execution)

- [ ] Target = `LOCAL_DISPOSABLE_SUPABASE`
- [ ] Quarantine count **= 1**
- [ ] Filename exact: `20260314195641_add_demo_data.sql`
- [ ] Migration file exists
- [ ] Migration file **unchanged** from approved content / hash / reference
- [ ] Migration remains **DATA_ONLY** (no schema/function/policy/trigger/index)
- [ ] **No downstream dependency** discovered
- [ ] RU-1.4 still has **no dependency** on it
- [ ] **No other** quarantine requested
- [ ] RU-1.1 (`20261729120000`) and RU-1.2 (`20261821120000`) migration files **unchanged**

If any check fails: **STOP · AUTHORITY INVALID FOR CURRENT REPOSITORY STATE · return to governance.**

---

## 12. Replay / application manifest (required)

Future execution must produce a manifest containing at least:

```
authorizationId                       : E-02-DBA-LOCAL-002
environmentClass                      : LOCAL_DISPOSABLE_SUPABASE
baselineMode                          : E02_DECLARED_BASELINE_REPLAY
quarantinedMigrations                 : [ "20260314195641_add_demo_data.sql" ]
quarantineReason                      : HISTORICAL_DEMO_EXTERNAL_STATE_DEPENDENCY
quarantineAuthority                   : E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision (PAD-026–PAD-038)
historicalDefect                      : HMD-001
migrationFileModified                 : false
e02SchemaImpact                       : none
downstreamDependency                  : none_found
repositoryRef                         : <commit/ref>
targetIdentifier                      : <local/disposable id>
migrationCountTotal                   : <n>
migrationCountExecuted                : <n - 1>
migrationCountQuarantined             : 1
ru11Migration                         : 20261729120000_create_owner_vote_primary_freeze_audits.sql
ru12Migration                         : 20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql
runtimeExecutionAuthorized            : false
destructiveEvidenceExecutionAuthorized: false
startedAt / finishedAt / result
```

**No secrets.** The single quarantine must be explicit and auditable — **no hidden exclusion.**

---

## 13. Plain `supabase db reset` relationship (locked)

| Item | Rule |
|------|------|
| Plain unmodified `supabase db reset` | **CANNOT implement the declared quarantine** — it replays all timestamped migrations and would fail at `20260314195641` (FK) |
| Instruction to re-run plain `db reset` and expect success | **PROHIBITED** |
| `supabase start` | May be authorized **only** for local disposable environment preparation prior to governed replay |
| Application mechanism | The **governed replay artifact (§8)** — not plain `db reset` |

```
PLAIN UNMODIFIED DB RESET = NOT SUFFICIENT TO IMPLEMENT QUARANTINE
```

---

## 14. Application method (deterministic)

Future application method **must** be deterministic and reproducible from a fresh clone:

- No manual SQL sequencing · no manual migration skip · no editor intervention · no "continue after failure."
- Quarantine expressed **only** through the governed replay artifact per its (future) Implementation Authorization.

---

## 15. Authorized command class

| Category | Authorized | Notes |
|----------|------------|-------|
| `supabase start` | **YES** (future) | Local disposable environment preparation only |
| Governed replay artifact execution | **YES** (future) | **Only after** the artifact is separately implemented + authorized |
| Read-only migration/status inspection | **YES** | Manifest / safety checks |
| `npm run verify:e02:baseline` | **YES** | **Only after** successful declared replay |

**Explicitly prohibited:** remote `supabase db push` · generic `db push` · `supabase link` mutation · production deploy · SQL Editor manual paste · `psql` remote apply · plain `supabase db reset` as the application mechanism · runtime evidence suite.

---

## 16. RU-1.1 / RU-1.2 application proof

Future successful LOCAL-002 execution must prove:

| Migration | Requirement |
|-----------|-------------|
| `20261729120000_create_owner_vote_primary_freeze_audits.sql` (RU-1.1) | **applied**; actual DB metadata matches approved 20-column Primary Audit contract |
| `20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql` (RU-1.2) | **applied**; RPC 5-param `jsonb` `SECURITY DEFINER` metadata matches approved contract |

---

## 17. Post-application baseline verification

| Command | Script |
|---------|--------|
| `npm run verify:e02:baseline` | `scripts/verification/e02/verify-db-baseline.ts` |

**Read-only only.** Must verify **actual** DB objects. **Quarantine success ≠ baseline verified.** Application success alone does **not** satisfy DBA completion.

---

## 18. Application result taxonomy

| Result | Meaning |
|--------|---------|
| `APPLIED_AND_BASELINE_VERIFIED` | Declared replay success + baseline PASS |
| `APPLICATION_FAILED` | Replay did not succeed |
| `APPLIED_BASELINE_FAILED` | Replay succeeded but baseline FAIL |
| `BLOCKED` | Pre-checks failed / artifact not yet authorized · execution not attempted |
| `NOT_RUN` | Authorization issued but not executed |

Quarantine execution must be **visible** in evidence (manifest §12). **Prohibited labels:** `FULL_REPLAY_PASS` · `EIR_PASS` · `COMMITTED`.

---

## 19. Application failure policy

If environment prep / governed replay / a non-quarantined migration **fails**: **STOP.** No migration edit · no manual SQL repair · no quarantine expansion · no repair-marking · no test execution. Result = **`APPLICATION_FAILED`**. RU-1.4 runtime remains blocked. Create successor evidence (§21).

---

## 20. Baseline failure policy

If replay succeeds but baseline verifier fails: result = **`APPLIED_BASELINE_FAILED`**; database state **≠ verified baseline**. **STOP** — no REA, no runtime tests.

---

## 21. Successor Database Application Evidence

Future success/failure evidence **must** use a **new successor evidence document**:

```
docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md
```

**Do not overwrite** `E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md` — LOCAL-001 evidence remains an **immutable historical record**. Minimum content mirrors DAA PAD-023 / LOCAL-001 §19, plus: baseline mode `E02_DECLARED_BASELINE_REPLAY`, quarantine set, quarantine visibility, migration counts. **No secrets.**

---

## 22. HMD-001 (historical defect)

```
HMD-001 = OPEN
```

Even if LOCAL-002 later reaches `APPLIED_AND_BASELINE_VERIFIED`, the historical repository replay defect for `20260314195641_add_demo_data.sql` is **NOT closed**. `E02_DECLARED_BASELINE_REPLAY` success **≠** full repository migration health. HMD-001 long-term remediation is separate (path **AUTHORITY TO BE ESTABLISHED**).

---

## 23. Option E boundary (rejected)

Explicitly prohibited under LOCAL-002: fabricating `auth.users` · fabricating `profiles` · seed workaround · mid-history compatibility migration · production demo identity. **Option E = REJECTED.**

---

## 24. Rejected mechanisms

| Mechanism | Status |
|-----------|--------|
| `supabase migration repair` as quarantine mechanism | **NOT AUTHORIZED** |
| Temporary hide / rename / move / delete of migration files | **NOT AUTHORIZED** |
| Schema snapshot / pg dump as substitute for declared replay | **NOT AUTHORIZED** |

---

## 25. Environment / remote / production boundary

| Class | Status |
|-------|--------|
| `LOCAL_DISPOSABLE_SUPABASE` | **AUTHORIZED** (only class in scope) |
| Isolated remote staging | **NOT AUTHORIZED** — separate target-specific DBA required |
| Shared dev / preview | **NOT AUTHORIZED** |
| Production | **NOT AUTHORIZED** — no production replay/quarantine/skip/apply/destructive tests · **PCQ-010 OPEN** |

If runtime target resolution detects a **remote** Supabase, execution **must fail closed**.

---

## 26. RU-1.4 harness boundary

RU-1.4 harness = **IMPLEMENTED / UNCHANGED / no defect**. The governed replay artifact is **not** an EEP test and **not** part of the RU-1.4 harness. No RU-1.4 modification is authorized by this DBA. Any need to integrate the artifact with RU-1.4 must return to governance (would be handled by the separate replay-artifact Implementation Authorization, not here).

---

## 27. REA boundary

Even after `APPLIED_AND_BASELINE_VERIFIED`, RU-1.4 runtime execution remains **NOT AUTHORIZED**. Separate authorization required:

| Document | Authorization ID |
|----------|------------------|
| [`E-02-RU-1.4-Runtime-Execution-Authorization.md`](E-02-RU-1.4-Runtime-Execution-Authorization.md) | **E-02-RU-1.4-REA** |

```
DBA ≠ REA · BASELINE VERIFIED ≠ RUNTIME EVIDENCE PASS
```

---

## 28. EIR / Acceptance / Certification boundary

| Item | Effect |
|------|--------|
| EIR | **No reclassification · no EIR PASS** |
| Acceptance | **ACCEPTANCE_BLOCKED** — unchanged |
| Project Certification | **NOT ISSUED** — unchanged |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Executable Final COMMIT Path | **BLOCKED** |
| TG-1/2/3 · PCQ-010/011/012 | **OPEN** |

---

## 29. Authorization completion semantics

**E-02-DBA-LOCAL-002 becomes CONSUMED only when all are true:**

1. Governed replay mechanism valid (separately implemented + authorized)
2. Local application succeeds via `E02_DECLARED_BASELINE_REPLAY`
3. Single declared quarantine recorded (count = 1) in manifest
4. RU-1.1 (`20261729120000`) + RU-1.2 (`20261821120000`) reached/applied
5. Baseline verifier PASS
6. Successor evidence `E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md` issued

**Because the replay artifact is not yet implemented/authorized:**

```
E-02-DBA-LOCAL-002                = ISSUED
DATABASE APPLICATION EXECUTION    = BLOCKED ON AUTHORIZED ARTIFACT IMPLEMENTATION
```

---

## 30. Pre-application safety checks (future)

Future apply task **must fail closed** unless all pass: authorization ID = `E-02-DBA-LOCAL-002` · environment = local disposable · target not production · target not remote · repository migrations unchanged since authorization · quarantine preconditions (§11) all pass · governed replay artifact separately authorized + implemented · no runtime execution implied.

If any check fails: **STOP.**

---

## 31. Next step decision (formal)

```
Case A (LOCAL-002 authorizes replay-artifact code)                = REJECTED
Case B (separate Implementation Authorization required)           = SELECTED

NEXT = ISSUE IMPLEMENTATION AUTHORIZATION FOR THE GOVERNED REPLAY ARTIFACT
       (baseline-compatibility implementation artifact · class C · deterministic · fail-closed · local-disposable only)
THEN = implement governed replay artifact
THEN = execute E-02-DBA-LOCAL-002 (env prep → declared replay → verify:e02:baseline)
THEN = issue E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md
THEN = (only if APPLIED_AND_BASELINE_VERIFIED) issue E-02-RU-1.4-REA
```

Do **not** jump to DB execution before the artifact exists and is authorized.

---

## 32. Prohibited work in this task (confirmation)

This authorization issuance performed **no**: replay-artifact creation · migration edit/rename/move/delete · SQL · Supabase command · Docker command · db reset · migration repair · database connection · baseline verifier execution · tests · package change · RU-1.4 runtime · REA · EIR change · Acceptance change · Certification. Only this record and [`README.md`](README.md) were written.

---

## 33. Lock statement

```
DATABASE APPLICATION AUTHORIZATION (SUCCESSOR)  = APPROVED WITH CONDITIONS
AUTHORIZATION ID                                = E-02-DBA-LOCAL-002
PREDECESSOR E-02-DBA-LOCAL-001                  = NOT CONSUMED / EVIDENCE IMMUTABLE
AUTHORIZED ENVIRONMENT                          = LOCAL DISPOSABLE SUPABASE ONLY
BASELINE MODE                                   = E02_DECLARED_BASELINE_REPLAY
FULL_REPOSITORY_MIGRATION_REPLAY (UNQUALIFIED)  = NOT USED
QUARANTINE SET                                  = EXACTLY ONE FILE
QUARANTINED MIGRATION                           = 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION FILE                       = UNCHANGED / IMMUTABLE
HMD-001                                         = OPEN
OPTION E                                        = REJECTED
MIGRATION REPAIR / RENAME / MOVE / SNAPSHOT     = REJECTED
PLAIN UNMODIFIED supabase db reset              = NOT SUFFICIENT TO IMPLEMENT QUARANTINE
APPLICATION MECHANISM                           = GOVERNED DETERMINISTIC REPLAY ARTIFACT (CLASS C)
REPLAY ARTIFACT                                 = NOT IMPLEMENTED / SEPARATE IA REQUIRED (CASE B)
DATABASE APPLICATION EXECUTION (THIS TASK)      = NOT PERFORMED
DATABASE APPLICATION EXECUTION (FUTURE)         = BLOCKED ON AUTHORIZED ARTIFACT IMPLEMENTATION
RU-1.1 MIGRATION                                = 20261729120000 (NOT YET APPLIED)
RU-1.2 MIGRATION                                = 20261821120000 (NOT YET APPLIED)
MIGRATION APPLIED                               ≠ BASELINE VERIFIED
BASELINE VERIFIED                               ≠ RUNTIME EVIDENCE PASS
QUARANTINED REPLAY PASS                         ≠ FULL REPOSITORY MIGRATION HEALTH
SUCCESSOR EVIDENCE                              = E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md
LOCAL-001 EVIDENCE                              = IMMUTABLE
RU-1.4 HARNESS                                  = IMPLEMENTED / UNCHANGED
RU-1.4 RUNTIME EXECUTION                        = NOT AUTHORIZED
REA                                             = SEPARATE (E-02-RU-1.4-REA)
EIR PASS RECLASSIFICATION                       = NONE
RUNTIME COMMITTED                               = NOT CERTIFIED
FINAL COMMIT PATH                               = BLOCKED
PCQ-010 / PCQ-011 / PCQ-012                     = OPEN
NEXT                                            = ISSUE IMPLEMENTATION AUTHORIZATION FOR GOVERNED REPLAY ARTIFACT
DO NOT MODIFY HISTORICAL MIGRATIONS
DO NOT RE-RUN PLAIN DB RESET
DO NOT RUN RU-1.4 EVIDENCE SUITE
```

---

**End of document — E-02-DBA-LOCAL-002 — v1.0 — 2026-08-22**
