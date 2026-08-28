# E-02 — Database Application Authorization (Successor)

## Local Disposable Evidence Environment · CB-B Clean-Base · Declared Baseline Replay · Host Docker Pre-Warm Gate · HMD-002 Runtime Replay Verification

| Field | Value |
|-------|-------|
| **Document Type** | **Database Application Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-006** |
| **Predecessor** | **E-02-DBA-LOCAL-005** — [`E-02-Database-Application-Authorization-LOCAL-005.md`](E-02-Database-Application-Authorization-LOCAL-005.md) · evidence [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md) · **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| **Prior predecessors** | **E-02-DBA-LOCAL-004** · **E-02-DBA-LOCAL-003** · **E-02-DBA-LOCAL-002** · **E-02-DBA-LOCAL-001** — **FAILED or NOT CONSUMED / IMMUTABLE** |
| **Forensic finding consumed** | LOCAL-005 auxiliary `supabase start` failure · **STRONGLY INDICATED** host/Docker idle-wake + `supabase_studio` startup/port-publish incomplete · ownership **HOST / DOCKER ENVIRONMENT** (primary) · **SUPABASE CLI / PLATFORM** (secondary) |
| **Restoration authority** | **E-02-HMIR-IA CONSUMED** · [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md) (**COMPLETED WITH NOTES**) |
| **Policy authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) (PAD-039 – PAD-050) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025) |
| **BCR artifact authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-004.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-004.md) (**E-02-BCR-IA-004**) — **CONSUMED** · artifact **unmodified by this DBA** |
| **Status** | **Approved With Conditions** |
| **Authority Level** | Database Application Authorization |
| **Effective Date** | 2026-08-24 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Database-Application-Authorization-LOCAL-006.md`](E-02-Database-Application-Authorization-LOCAL-006.md) |
| **Production Effect** | **None** from this record alone |

> **Authority path finding: YES.** `E-02-Database-Application-Authorization-LOCAL-006.md` is **authority-safe** as a **scoped successor Database Application Authorization** under the PAD-012 naming pattern (`E-02-Database-Application-Authorization-{scope}.md` · ID `E-02-DBA-{ENV}-{SEQ}`). Precedent: LOCAL-001 through LOCAL-005. A distinct filename is used so predecessor DBA records and evidence remain **immutable**. This is **not** a new document class, **not** a new governance tier, **not** a BCR redesign, **not** a successor BCR Implementation Authorization, **not** a migration-repair authorization, **not** a quarantine amendment, **not** a RU-1.4 Runtime Execution Authorization, **not** an EIR decision, **not** Acceptance, and **not** Certification.

> **Superseding authority:** LOCAL-006 **supersedes LOCAL-005 only for one future execution attempt**. It **must not** alter, amend, or reclassify predecessor evidence. LOCAL-005 remains **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE**. LOCAL-001–004 remain immutable.

> **Document class:** Bounded **Database Application Authorization** record only. It **does not execute** LOCAL-006. It **does not** authorize production deployment · remote database mutation · repo-root `supabase start` · raw Postgres/Docker Compose replacement · replay-artifact source modification · DBA-ID spoofing / substitution of LOCAL-005 · RU-1.4 runtime evidence · RPC invocation · destructive fixtures · concurrency tests · EIR reclassification · Acceptance · Project Certification · or Final COMMIT path unblock.

```
DATABASE APPLICATION AUTHORIZATION (SUCCESSOR)  = APPROVED WITH CONDITIONS
AUTHORIZATION ID                                = E-02-DBA-LOCAL-006
PREDECESSOR E-02-DBA-LOCAL-005                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
PRIOR E-02-DBA-LOCAL-004 / 003 / 002 / 001      = FAILED or NOT CONSUMED / IMMUTABLE
FORENSIC ROOT-CAUSE CONFIDENCE                  = STRONGLY INDICATED
GOVERNANCE OWNERSHIP (PRIMARY)                  = HOST / DOCKER ENVIRONMENT
GOVERNANCE OWNERSHIP (SECONDARY)                = SUPABASE CLI / PLATFORM STARTUP
BCR CHANGE REQUIRED FOR ROOT CAUSE              = NO
SUCCESSOR BCR IA REQUIRED FOR ROOT CAUSE        = NO
SUCCESSOR BCR IA EXPECTED FOR DBA-ID RETARGET   = YES (execution gate; not this issuance)
HMD-002                                         = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
HMD-001                                         = OPEN
RESTORED MIGRATION                              = 20260315035847_add_meeting_templates_and_attachments.sql
AUTHORIZED ENVIRONMENT                          = LOCAL_DISPOSABLE_SUPABASE ONLY
AUTHORIZED CLEAN-BASE MODE                      = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS (CB-B)
AUTHORIZED BASELINE MODE                        = E02_DECLARED_BASELINE_REPLAY
DECLARED QUARANTINE SET                         = EXACTLY ONE FILE
QUARANTINED MIGRATION                           = 20260314195641_add_demo_data.sql
RESTORED MIGRATION QUARANTINE STATUS            = NOT QUARANTINED
OPTION B                                        = NOT AUTHORIZED
DOCKER PRE-WARM GATE                            = MANDATORY (engine already running before apply)
ARTIFACT AUTHORITY                              = E-02-BCR-IA-004 (UNMODIFIED BY THIS DBA)
DBA RUNTIME ID                                  = E02_DBA_AUTHORIZATION_ID / EXACT E-02-DBA-LOCAL-006
PRE-EXECUTION ARTIFACT-ID COMPATIBILITY (ISSUANCE READ-ONLY)
                                                = INCOMPATIBLE (artifact exact-pinned to E-02-DBA-LOCAL-005)
ERROR_CAPTURE_INSUFFICIENT                      = DIAGNOSTIC LIMITATION / NOT A BLOCKING BCR CODE DEFECT
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
| LOCAL-005 evidence | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md) — **APPLICATION_FAILED** at auxiliary `supabase start` · **immutable** |
| LOCAL-005 read-only forensic | STRONGLY INDICATED host/Docker idle-wake + `supabase_studio` incomplete port-publish · **not** CONFIRMED internal studio exception string |
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md) | Six `bc48068` restorations verified · **COMPLETED WITH NOTES** · HMD-002 runtime still pending |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) | PAD-039–PAD-050 · Option A · HMD-002 |
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | PAD-026–PAD-038 · single DATA_ONLY quarantine · HMD-001 |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011–PAD-025 · DAA mechanism |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-004.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-004.md) | **E-02-BCR-IA-004 CONSUMED** — current artifact pin `E-02-DBA-LOCAL-005` |
| Artifact (read-only, this issuance) | `scripts/verification/e02/replay-e02-declared-baseline.ts` · `verify-db-baseline.ts` · `environment-guard.ts` |

**Mechanism finding:** This successor DBA is **environment + host-readiness + clean-base-mode + migration-set + baseline-mode + lifecycle + HMD-002 runtime-proof scoped**. It is **not** project-wide blanket permission, **not** production, **not** RU-1.4 REA, **not** artifact code authorization, **not** a Docker Compose replacement for Supabase CLI.

---

## 2. Incoming authoritative state (locked)

| Item | Status |
|------|--------|
| E-02-DBA-LOCAL-005 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-005 failure stage | CB-B auxiliary `supabase start` · `PROCESS_EXITED_NONZERO` status=1 |
| LOCAL-005 pre-execution gate / plan / init | **PASS** / **PASS** / **PASS** |
| LOCAL-005 aux migrations before start | **0** |
| LOCAL-005 governed replay | **NOT REACHED** · executed **0** |
| Forensic confidence | **STRONGLY INDICATED** (not CONFIRMED internal studio root cause) |
| Forensic ownership | **HOST / DOCKER ENVIRONMENT** (primary) · **SUPABASE CLI / PLATFORM** (secondary) |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING** · **unrelated** to LOCAL-005 start failure |
| HMD-001 | **OPEN** · **unrelated** to LOCAL-005 start failure |
| Target restored migration | `supabase/migrations/20260315035847_add_meeting_templates_and_attachments.sql` · **NOT QUARANTINED** |
| Quarantine | Exactly `20260314195641_add_demo_data.sql` · count **1** |
| Option B | **NOT AUTHORIZED** |
| BCR redesign | **NO** (forensic does not require it) |
| BCR-CB-001..004 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** |
| LOCAL-001 | **NOT CONSUMED / IMMUTABLE** |
| LOCAL-002 / 003 | **FAILED / NOT CONSUMED / IMMUTABLE** |
| LOCAL-004 | **FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE** |
| Database baseline verified | **NO** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| EIR PASS | **NONE** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Final COMMIT path | **BLOCKED** |

LOCAL-006 **does not close HMD-002 merely by being issued.** LOCAL-005 **must not** be retried or relabelled successful.

---

## 3. Predecessor DBA history (immutable)

| Item | Status |
|------|--------|
| `E-02-DBA-LOCAL-001` | **NOT CONSUMED / IMMUTABLE** |
| `E-02-DBA-LOCAL-002` | **FAILED / NOT CONSUMED / IMMUTABLE** |
| `E-02-DBA-LOCAL-003` | **FAILED / NOT CONSUMED / IMMUTABLE** |
| `E-02-DBA-LOCAL-004` | **FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE** (`APPLICATION_FAILED` at `20260315035847_add_meeting_templates_and_attachments.sql`) |
| `E-02-DBA-LOCAL-005` | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** (auxiliary `supabase start`) |
| Evidence LOCAL-001–005 | **IMMUTABLE** — not reclassified, not relabelled, not amended in place |
| Relationship | LOCAL-006 **supersedes LOCAL-005 for one future execution only** |

**No predecessor may ever be relabelled successful.** LOCAL-005 environment **must not** be reused.

---

## 4. Decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-DBA-LOCAL-006** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Attempts authorized** | **Exactly one** future fresh local-disposable CB-B database-application attempt |
| **This issuance executes that attempt** | **NO** |
| **Runtime DBA identity** | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-006` (exact; **no source edit**; **no LOCAL-005 substitution**; **no spoofing**) |
| **LOCAL-005 retry** | **NOT AUTHORIZED** |

---

## 5. Forensic finding consumed (LOCAL-005 start failure)

Confidence: **STRONGLY INDICATED**. This DBA **must not** elevate the finding to a confirmed studio-internal exception string.

**Technical finding (locked):**

- Docker Desktop Linux/WSL engine had been **idle-stopped for ~5 hours**.
- LOCAL-005 `supabase start` **woke** the engine.
- Auxiliary containers **were actually created**.
- `db` / `analytics` / `vector` / `kong` / `auth` / `inbucket` / `realtime` / `rest` / `storage` / `edge_runtime` / `pg_meta` progressed.
- `supabase_studio` started but **did not complete** its normal port-publish lifecycle for **54323**.
- CLI then emitted `Stopping containers...` and returned **status=1**.
- `Stopping containers...` was **cleanup behavior**, not the root-cause line.
- **No** migration execution occurred.
- **No** evidence of HMD-001 / HMD-002 involvement.
- Launcher syntax / workdir were **not** identified as causal.
- **No** port collision was established.
- Error capture was diagnostically incomplete because **stdout and container logs were not retained** after cleanup.

```
ROOT-CAUSE CONFIDENCE     = STRONGLY INDICATED
PRIMARY GOVERNANCE OWNER  = HOST / DOCKER ENVIRONMENT
SECONDARY CONTEXT         = SUPABASE CLI / PLATFORM STARTUP
BCR CHANGE FOR ROOT CAUSE = NO
SUCCESSOR BCR IA FOR ROOT CAUSE = NO
```

---

## 6. Error-capture finding

```
ERROR_CAPTURE_INSUFFICIENT
```

Classification: **DIAGNOSTIC LIMITATION / NOT CURRENTLY A BLOCKING BCR CODE DEFECT**.

LOCAL-006 **does not** require a successor BCR IA solely to improve stdout/stderr capture. If a future **warmed-engine** attempt again fails at `supabase start`, governance should consider a narrowly authorized diagnostic execution / error-capture enhancement. **Do not implement such enhancement under this DBA.**

---

## 7. Authorized environment

Only `LOCAL_DISPOSABLE_SUPABASE`. Requirements: **fresh · temporary · machine-local · disposable · unlinked · non-production · non-remote · non-shared · not repo-root**.

**Prohibited:** reuse of LOCAL-005 environment · reuse of LOCAL-004 or any partially replayed environment · repo-root Supabase stack as fallback · `supabase link` · remote / production / shared target.

Remote target detection → **fail closed**.

---

## 8. Clean-base / baseline modes

Clean-base = **exactly** `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` (CB-B). Fresh auxiliary project per attempt. Auxiliary timestamped migration count **= 0** before startup. If count ≠ 0: **STOP.**

Baseline mode = `E02_DECLARED_BASELINE_REPLAY`.

Platform baseline is owned by Supabase CLI/images (`auth` · `auth.users` · `storage` · `storage.objects` · `storage.buckets` · required roles · required extensions · platform migration histories). BCR must **fabricate none** of these. Application history must initially be empty before real-repository replay. Platform histories must remain **preserved**.

**No BCR redesign is authorized.** Retain: fresh auxiliary project · empty auxiliary migrations · platform-owned baseline · real repository migrations as authoritative source · one-file quarantine · truthful applied history · existing launcher · preserve/handoff · separate baseline verifier · explicit cleanup.

---

## 9. Host / Docker pre-warm gate (new; mandatory)

Before invoking the governed BCR `--apply` path, Docker Desktop Linux/WSL engine **MUST already be running and responsive**. The apply command itself **must not** be the event that cold-starts an idle-stopped Docker engine.

### 9.1 Required pre-execution evidence (immediately before apply)

1. Docker Desktop is open / running.
2. Docker client can reach Docker server.
3. Engine is responsive **without** a wake/start transition caused by apply.
4. A read-only command such as `docker ps` succeeds **promptly**.
5. Docker Desktop backend state does **not** indicate Linux/WSL engine stopped / starting.
6. No host-level Docker startup transition is in progress.
7. No stale auxiliary LOCAL-005 stack is being reused.

If Docker is idle-stopped, stopped, starting, unreachable, or requires the LOCAL-006 apply operation itself to wake it:

```
RESULT = BLOCKED
STOP. Do not start governed replay.
```

### 9.2 Pre-warm boundary

This DBA may authorize the **operator** to ensure Docker Desktop is already running **before** the governed attempt. That is an **environment prerequisite**, **not** BCR replay logic.

**Do NOT authorize:** raw Docker execution of Supabase services · manually recreating Supabase containers · Docker Compose replacement for Supabase CLI · manual network/volume construction · raw Postgres fallback · pruning as a workaround · deleting arbitrary Docker state.

Purpose only: **HOST ENGINE READY BEFORE BCR APPLY.**

### 9.3 Read-only host precheck

Future LOCAL-006 execution must first perform read-only checks such as `docker version` · `docker info` · `docker ps -a` and appropriate existing Docker Desktop state inspection. These checks are diagnostic/readiness evidence.

Do **not** mutate Docker merely to make the gate pass, except normal user-level Docker Desktop startup **if needed before the execution task begins**. If startup is required, **wait until the engine is fully running BEFORE beginning the governed LOCAL-006 apply attempt**.

---

## 10. Artifact authority and pre-execution DBA-ID compatibility gate

Runtime artifact: `scripts/verification/e02/replay-e02-declared-baseline.ts`. Implementation authority: **E-02-BCR-IA-004**. Static metadata `ARTIFACT_AUTHORIZATION_ID=E-02-BCR-IA-004` is **not** DBA execution authority.

**Required runtime DBA identity for LOCAL-006 execution:**

```
E02_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-006
```

exact match. **No prefix. No regex. No arbitrary ID. No source edit during execution. No substitution of LOCAL-005. No spoofing.**

### 10.1 Read-only compatibility finding (this issuance — 2026-08-24)

Inspected `scripts/verification/e02/replay-e02-declared-baseline.ts` **read-only**:

| Constant / rule | Current value |
|-----------------|---------------|
| `ARTIFACT_AUTHORIZATION_ID` | `E-02-BCR-IA-004` |
| `EXPECTED_DBA_AUTHORIZATION_ID` | **`E-02-DBA-LOCAL-005`** |
| Match model | exact string equality against `process.env.E02_DBA_AUTHORIZATION_ID` (fail-closed retained) |
| Dual-accept / prefix | **NONE** |
| `verify-db-baseline.ts` DBA-ID pin | **none found** (not required for this gate) |
| `environment-guard.ts` DBA-ID pin | **none found** |

**Finding:** the current replay artifact **cannot accept** `E-02-DBA-LOCAL-006` without source modification.

```
PRE-EXECUTION ARTIFACT-ID COMPATIBILITY = INCOMPATIBLE
CURRENT PIN                             = E-02-DBA-LOCAL-005
REQUIRED PIN FOR LOCAL-006 EXECUTION    = E-02-DBA-LOCAL-006
SOURCE MODIFICATION UNDER LOCAL-006     = NOT AUTHORIZED
LOCAL-005 SUBSTITUTION                  = NOT AUTHORIZED
SPOOFING                                = NOT AUTHORIZED
LOCAL-006 EXECUTION COMPATIBILITY       = BLOCKED
```

**This issuance does not silently assume compatibility and does not falsely state that LOCAL-006 is immediately executable.**

Future executor **must re-check** this gate immediately before any stateful command. If still incompatible:

```
RESULT = BLOCKED
STOP → GOVERNANCE (narrow successor BCR Implementation Authorization:
        retarget EXPECTED_DBA_AUTHORIZATION_ID LOCAL-005 → LOCAL-006)
NO DATABASE COMMAND
NO ARTIFACT EDIT UNDER LOCAL-006
```

LOCAL-006 **does not** authorize a BCR redesign or artifact edit. A **narrow successor BCR implementation authorization** is **expected** to retarget the DBA ID **before apply can lawfully proceed**. That retarget is **not** required to remediate the LOCAL-005 host/Docker root cause; it is required because the exact-match pin still names LOCAL-005.

Distinguish at issuance:

```
LOCAL-006 AUTHORITY              = APPROVED WITH CONDITIONS
LOCAL-006 DATABASE EXECUTION     = GATED BY
  (1) Docker engine warm/running readiness
  (2) replay artifact DBA-ID compatibility
```

---

## 11. Pre-execution restoration-integrity gate

Before **any** stateful execution (and only after Docker pre-warm and artifact-ID compatibility both PASS), the executor must **read-only** verify:

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
| I | No governance record supersedes the HMIR Restoration Completion or this LOCAL-006 authority |

Any failure: **STOP → GOVERNANCE. Do not run the database.**

Pre-existing working-tree EOF CRLF vs HEAD LF remains a **recorded line-ending note**, not a seventh semantic restoration, and **must not** be normalized during LOCAL-006.

---

## 12. Historical migration boundary (HMD-002)

The restored migration is authorized to **participate normally** in replay. It **MUST NOT** be edited · quarantined · skipped · copied into a filtered tree · marked applied without execution · replaced by compatibility SQL · repaired · rewritten · normalized · reseeded.

Until actual replay proof exists:

```
HMD-002 = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
```

LOCAL-005 did not reach this file. LOCAL-006 remains the future runtime replay proof path. **Do not mark HMD-002 CLOSED at authorization issuance.**

---

## 13. Quarantine / HMD-001

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
| HMD-001 | **OPEN** (unchanged by LOCAL-005 host startup failure) |

No second quarantine · no wildcard · no regex expansion · no automatic “skip failing migration” · no operator-selected skip · no migration repair · no fake applied history.

If **any other** non-quarantined migration fails: **STOP**. Record the exact migration and exact failure. Return to governance.

---

## 14. CLI / launcher contract (BCR-CB-002)

Runtime proof must exercise the **existing** launcher implementation. **No artifact edit under this DBA.**

| Platform | Contract |
|----------|----------|
| Windows | `ComSpec` / `cmd.exe` + `/d /s /c` + `npx` + `supabase` + allowlisted subcommand + `shell:false` |
| Non-Windows | direct `npx` + `shell:false` |

Allowed subcommands **exactly:** `init` · `start` · `status` · `stop`.

**Forbidden:** `npx.cmd` direct spawn · `shell:true` · raw Docker fallback · raw Postgres fallback · undocumented no-migrate flags · repo-root start fallback.

Failures must distinguish `PROCESS_DID_NOT_START` from `PROCESS_EXITED_NONZERO`.

---

## 15. Connection discovery / application-layer reset / real migration source

Discover runtime connection details **only** through:

```
supabase status --workdir <auxiliaryWorkdir> --output json
```

DB target **must** be local. Non-local / remote / production / shared → **STOP**. Credentials: **runtime only** · **never** persisted.

After platform baseline is running and validated, existing `resetApplicationLayerForReplay()` may reset **only** `public` + `supabase_migrations`. **Must not** reset `auth` · `storage` · extensions · platform histories · platform roles.

Authoritative application migration source:

```
<repository>/supabase/migrations/
```

Auxiliary migrations directory remains **empty** and is **not** the application source.

Truthful history: executed → record applied; quarantined → not executed / not recorded; failed → **STOP**. **No** `supabase migration repair`. Platform histories remain preserved.

---

## 16. LOCAL-006 execution purpose (future; not this task)

Once **all** execution gates are satisfied (Docker pre-warm PASS · artifact-ID compatibility PASS · restoration-integrity PASS · `--plan` PASS), LOCAL-006 may authorize the same governed lifecycle as LOCAL-005:

```
pre-gates
→ plan
→ fresh auxiliary project
→ init
→ aux migrations = 0
→ already-warm Docker engine
→ supabase start
→ platform baseline
→ local status
→ empty app migration history
→ app-layer reset
→ governed replay
→ one declared quarantine
→ restored HMD-002 migration replay
→ downstream replay
→ RU-1.1
→ RU-1.2
→ manifest
→ preserve
→ baseline verifier
→ evidence
→ cleanup
```

**No RU-1.4.**

---

## 17. Supabase start success requirement

LOCAL-006 evidence **must** explicitly capture whether:

- `supabase start` succeeds with Docker engine **already warm**;
- studio completes startup (if observable);
- expected local port publication succeeds (if observable);
- platform baseline becomes available.

Compare with LOCAL-005 failure stage (cold idle-wake + studio incomplete publish).

If start still fails **with a warm engine**:

```
DATABASE APPLICATION RESULT = APPLICATION_FAILED
```

**STOP.** Do not retry silently. Capture as much diagnostic evidence as the **existing** artifact provides. Return to governance. Do **not** expand quarantine. Do **not** edit migrations. Do **not** implement error-capture enhancement under this DBA.

---

## 18. HMD-002 / RU-1.1 / RU-1.2 runtime proof

Same governed requirements as LOCAL-005:

- Restored `20260315035847_add_meeting_templates_and_attachments.sql` must be reached, executed, succeed, and be recorded truthfully. Prior LOCAL-004 parser failure (`syntax error at or near "1."`) must **not** reproduce. If it fails: **APPLICATION_FAILED** · HMD-002 remains runtime-unverified · **STOP** · do not edit the file.
- Downstream non-quarantined replay continues deterministically. First subsequent failure: **STOP**.
- RU-1.1: actual application of `20261729120000_create_owner_vote_primary_freeze_audits.sql` and presence of `public.owner_vote_primary_freeze_audits`. Plan reachability is insufficient.
- RU-1.2: actual application of `20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql` plus RPC/helper **metadata**. **DO NOT invoke the RPC.**

---

## 19. Success apply hand-off / baseline verifier

Success-path apply **must** use `--apply --preserve-environment`. Expected disposition: `RUNNING_FOR_BASELINE_VERIFY` · `baselineVerificationPending=true` · `cleanupRequired=true` · `cleanupCompleted=false`. **Do not teardown** a successful environment before the verifier.

Only after successful preserved apply, run **exactly**:

```
npm run verify:e02:baseline
```

with `E02_BASELINE_VERIFICATION_AUTHORIZED=true`. **DO NOT set** `E02_RUNTIME_EXECUTION_AUTHORIZED`.

Verifier remains **read-only**. **No** RPC · fixtures · concurrency · RU-1.4 suite.

Must verify the existing governed baseline (Primary Audit table · RU-1.2 metadata). After evidence is written, explicit `--cleanup` with the **same** DBA ID and evidence run ID.

---

## 20. Result taxonomy

Use only:

- `APPLIED_AND_BASELINE_VERIFIED`
- `APPLICATION_FAILED`
- `APPLIED_BASELINE_FAILED`
- `BLOCKED`
- `NOT_RUN`

**Do not use:** `EIR_PASS` · `COMMITTED` · `PROJECT_CERTIFIED` · `FULL_REPLAY_PASS`.

If Docker pre-warm fails **or** artifact-ID compatibility fails: **`BLOCKED`** before any DB command.

---

## 21. Future evidence path

```
docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md
```

**Do not create it in this issuance task.**

Evidence must include new host-readiness fields:

- Docker engine state **before** apply
- whether engine was **already running**
- whether any **cold wake** occurred at apply
- docker readiness command result
- `supabase start` result
- studio startup result if observable
- port publication result if observable
- comparison with LOCAL-005 failure stage

plus the existing DBA evidence set. **No secrets.**

---

## 22. Success semantics (future execution only)

If and only if future LOCAL-006 succeeds fully:

```
E-02-DBA-LOCAL-006              = CONSUMED
DATABASE APPLICATION RESULT     = APPLIED_AND_BASELINE_VERIFIED
DATABASE BASELINE VERIFIED      = YES
HMD-002                         = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED
HMD-001                         = OPEN
RU-1.4                          = STILL NOT AUTHORIZED
EIR PASS                        = NONE
RUNTIME COMMITTED               = NOT CERTIFIED
FINAL COMMIT PATH               = BLOCKED
NEXT                            = ISSUE E-02-RU-1.4-REA
```

**Do NOT** mark HMD-002 `CLOSED` unless a separate governance decision authorizes closure terminology. **Do not create REA in this issuance.**

---

## 23. Failure semantics (future execution only)

```
E-02-DBA-LOCAL-006 = NOT SUCCESSFULLY CONSUMED
```

Issue LOCAL-006 evidence. **No** silent retry. **No** migration/source repair. **No** automatic LOCAL-007. Governance path depends on the **actual** failure (warm-engine start failure vs replay failure vs baseline failure vs `BLOCKED` at a gate).

---

## 24. Current issuance effect

```
E-02-DBA-LOCAL-006 AUTHORITY           = APPROVED WITH CONDITIONS / NOT CONSUMED
E-02-DBA-LOCAL-006 DATABASE EXECUTION  = GATED / NOT EXECUTED / NOT IMMEDIATELY EXECUTABLE
DOCKER PRE-WARM GATE                   = MANDATORY
ARTIFACT-ID COMPATIBILITY (ISSUANCE)   = INCOMPATIBLE (PIN = E-02-DBA-LOCAL-005)
LOCAL-006 EXECUTION COMPATIBILITY      = BLOCKED
SUCCESSOR BCR RETARGET                 = EXPECTED BEFORE EXECUTION
DATABASE APPLICATION                   = NOT RUN
DATABASE BASELINE VERIFIED             = NO
```

LOCAL-005 remains **APPLICATION_FAILED / IMMUTABLE**. HMIR Restoration Completion remains **COMPLETED WITH NOTES**.

---

## 25. Next action (this issuance)

```
NEXT = READ-ONLY CHECK LOCAL-006 ARTIFACT-ID COMPATIBILITY
       before any execution
```

Known at issuance: pin is `E-02-DBA-LOCAL-005` → execution compatibility **BLOCKED** until a **narrow successor BCR Implementation Authorization** retargets `EXPECTED_DBA_AUTHORIZATION_ID` from LOCAL-005 to LOCAL-006 (exact-match retained; dual-accept none).

Then, only after compatibility PASS **and** Docker engine already warm: **EXECUTE** LOCAL-006.

**Do not** retry LOCAL-005. **Do not** create REA. **Do not** execute LOCAL-006 in this task.

---

## 26. File scope / prohibited work (this issuance confirmation)

This issuance task may modify **only**:

1. `docs/implementation/E-02-Database-Application-Authorization-LOCAL-006.md` (this document)
2. `docs/implementation/README.md` (minimal)

**No** artifact modification · **no** verifier modification · **no** environment-guard modification · **no** migration modification · **no** package/test modification · **no** quarantine change · **no** DB application · **no** BCR `--apply` · **no** Supabase start · **no** Docker mutation · **no** LOCAL-006 execution · **no** LOCAL-006 evidence · **no** RU-1.4 · **no** REA · **no** EIR / Acceptance / Certification change.

---

## 27. Lock statement

```
DATABASE APPLICATION AUTHORIZATION     = E-02-DBA-LOCAL-006
DECISION                               = APPROVED WITH CONDITIONS
LOCAL-005                              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-005 ROOT CAUSE                   = STRONGLY INDICATED HOST/DOCKER IDLE-WAKE + STUDIO STARTUP/PORT-PUBLISH INCOMPLETE
CONFIDENCE                             = STRONGLY INDICATED
GOVERNANCE OWNER                       = HOST / DOCKER ENVIRONMENT (PRIMARY)
BCR CHANGE REQUIRED                    = NO (for root cause)
DOCKER PRE-WARM                        = MANDATORY
AUTHORIZED ENVIRONMENT                 = LOCAL_DISPOSABLE_SUPABASE
CLEAN-BASE MODE                        = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
BASELINE MODE                          = E02_DECLARED_BASELINE_REPLAY
CURRENT ARTIFACT PIN                   = E-02-DBA-LOCAL-005
LOCAL-006 COMPATIBILITY                = INCOMPATIBLE / EXECUTION BLOCKED
SUCCESSOR BCR IA                       = EXPECTED FOR DBA-ID RETARGET BEFORE EXECUTION
                                        (NOT required to remediate LOCAL-005 host root cause)
QUARANTINE                             = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
OPTION B                               = NOT AUTHORIZED
HMD-001                                = OPEN
HMD-002                                = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
ERROR CAPTURE                          = INSUFFICIENT / DIAGNOSTIC LIMITATION / NOT BLOCKING BCR DEFECT
DATABASE APPLICATION                   = AUTHORIZED TO BEGIN / GATED / NOT EXECUTED
DATABASE BASELINE VERIFIED             = NO
RU-1.4                                 = RUNTIME NOT AUTHORIZED
EIR PASS                               = NONE
RUNTIME COMMITTED                      = NOT CERTIFIED
FINAL COMMIT PATH                      = BLOCKED
NEXT                                   = READ-ONLY CHECK LOCAL-006 ARTIFACT-ID COMPATIBILITY
                                         THEN NARROW SUCCESSOR BCR IA RETARGET IF STILL PINNED TO LOCAL-005
DO NOT RETRY LOCAL-005 · DO NOT EXECUTE LOCAL-006 IN THIS TASK · DO NOT MODIFY THE ARTIFACT
```

---

**End of document — E-02-DBA-LOCAL-006 — v1.0 — 2026-08-24**
