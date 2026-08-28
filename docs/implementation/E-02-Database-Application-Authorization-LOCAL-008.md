# E-02 — Database Application Authorization (Successor)

## Local Disposable Evidence Environment · CB-B Clean-Base · Declared Baseline Replay · Enhanced Start Diagnostics · Docker Pre-Warm Gate · Strict Host TCP 54323 Readiness · HMD-002 Runtime Replay Verification

| Field | Value |
|-------|-------|
| **Document Type** | **Database Application Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-008** |
| **Predecessor** | **E-02-DBA-LOCAL-007** — [`E-02-Database-Application-Authorization-LOCAL-007.md`](E-02-Database-Application-Authorization-LOCAL-007.md) · evidence [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-007.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-007.md) · **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| **Prior predecessors** | **E-02-DBA-LOCAL-006** · **E-02-DBA-LOCAL-005** · **E-02-DBA-LOCAL-004** · **E-02-DBA-LOCAL-003** · **E-02-DBA-LOCAL-002** · **E-02-DBA-LOCAL-001** — **FAILED or NOT CONSUMED / IMMUTABLE** |
| **Classification** | **DATABASE APPLICATION ATTEMPT WITH ENHANCED DIAGNOSTICS AND STRICT HOST-PORT READINESS PRECONDITION** |
| **Diagnostic implementation consumed** | **E-02-BCR-IA-006 CONSUMED** · runtime later **EXERCISED** by LOCAL-007 evidence · [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md) · Completion [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-006.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-006.md) |
| **Restoration authority** | **E-02-HMIR-IA CONSUMED** · [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md) (**COMPLETED WITH NOTES**) |
| **Policy authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) (PAD-039 – PAD-050) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025) |
| **BCR artifact authority (read-only at issuance)** | **E-02-BCR-IA-007 CONSUMED** · `ARTIFACT_AUTHORIZATION_ID=E-02-BCR-IA-007` · `EXPECTED_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-007` · artifact **unmodified by this DBA** |
| **Status** | **Approved With Conditions** |
| **Authority Level** | Database Application Authorization |
| **Effective Date** | 2026-08-24 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Database-Application-Authorization-LOCAL-008.md`](E-02-Database-Application-Authorization-LOCAL-008.md) |
| **Production Effect** | **None** from this record alone |

> **Authority path finding: YES.** `E-02-Database-Application-Authorization-LOCAL-008.md` is **authority-safe** as a **scoped successor Database Application Authorization** under the PAD-012 naming pattern (`E-02-Database-Application-Authorization-{scope}.md` · ID `E-02-DBA-{ENV}-{SEQ}`). Precedent: LOCAL-001 through LOCAL-007. A distinct filename is used so predecessor DBA records and evidence remain **immutable**. This is **not** a new document class, **not** a new governance tier, **not** a BCR redesign, **not** a successor BCR Implementation Authorization, **not** a diagnostic-only execution class, **not** a host-remediation automation authorization, **not** a process-kill authorization, **not** a port-remap authorization, **not** a PAD-051+ allocation, **not** a migration-repair authorization, **not** a quarantine amendment, **not** a RU-1.4 Runtime Execution Authorization, **not** an EIR decision, **not** Acceptance, and **not** Certification.

> **Superseding authority:** LOCAL-008 **supersedes LOCAL-007 only for one future execution attempt**. It **must not** alter, amend, or reclassify predecessor evidence. LOCAL-007 remains **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE**. LOCAL-006 and LOCAL-005 remain **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE**. LOCAL-001–004 remain immutable.

> **Document class:** Bounded **Database Application Authorization** record only. It **does not execute** LOCAL-008. It **does not** authorize production deployment · remote database mutation · repo-root `supabase start` · raw Postgres/Docker Compose replacement · replay-artifact source modification · DBA-ID spoofing / substitution of LOCAL-007 · process termination · Studio/port remapping · `config.toml` edit · Docker networking mutation · RU-1.4 runtime evidence · RPC invocation · destructive fixtures · concurrency tests · Docker log collection · EIR reclassification · Acceptance · Project Certification · or Final COMMIT path unblock.

> **Controlling authority finding (not reopened):** No new Program Authority Decision is required. PAD-012 · PAD-013 · PAD-018 · PAD-023 · PAD-030 already govern successor local DBA attempts, including local `supabase start` as environment preparation **within** DBA. Adding a stricter **host-port readiness gate** after a confirmed LOCAL-007 precondition failure does **not** allocate PAD-051+. A distinct diagnostic execution class remains **REJECTED**. Host-remediation / process-kill / port-remap remain **NOT AUTHORIZED**.

```
DATABASE APPLICATION AUTHORIZATION (SUCCESSOR)  = APPROVED WITH CONDITIONS
AUTHORIZATION ID                                = E-02-DBA-LOCAL-008
PREDECESSOR E-02-DBA-LOCAL-007                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
PRIOR E-02-DBA-LOCAL-006 / 005 / 004 / 003 / 002 / 001
                                                = FAILED or NOT CONSUMED / IMMUTABLE
NEXT RUNTIME CLASSIFICATION                     = DATABASE APPLICATION ATTEMPT WITH ENHANCED DIAGNOSTICS
                                                  AND STRICT HOST-PORT READINESS PRECONDITION
DISTINCT DIAGNOSTIC EXECUTION CLASS             = REJECTED / NOT REQUIRED
HOST-REMEDIATION AUTOMATION                     = NOT AUTHORIZED
PROCESS KILL                                    = NOT AUTHORIZED
PORT REMAP / STUDIO PORT CHANGE                 = NOT AUTHORIZED
NEW PAD                                         = NOT ALLOCATED
LOCAL-007 ROOT CAUSE                            = CONFIRMED HOST TCP PORT COLLISION
HOST PORT                                       = 54323
EVIDENCE CLASS                                  = LegacyContainerStartError
LOCAL-007 DOCKER PRE-WARM                       = PASS
LOCAL-007 COLD WAKE                             = NO
LOCAL-007 DIAGNOSTICS                           = RUNTIME EXERCISED
GOVERNED REPLAY                                 = NOT REACHED · EXECUTED 0
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
HOST TCP 54323 GATE                             = MANDATORY (FREE / AVAILABLE FOR BIND before stateful Supabase)
DIAGNOSTIC OBSERVABILITY                        = IMPLEMENTED / PRESERVED / RUNTIME EXERCISED (LOCAL-007)
                                                · MAY BE CONSUMED · NO ADDITIONAL IMPLEMENTATION
CONTAINER LOG COLLECTION                        = NOT AUTHORIZED
CURRENT ARTIFACT AUTHORITY METADATA             = E-02-BCR-IA-007 (UNMODIFIED BY THIS DBA)
CURRENT ARTIFACT DBA PIN                        = E-02-DBA-LOCAL-007
DBA RUNTIME ID                                  = E02_DBA_AUTHORIZATION_ID / EXACT E-02-DBA-LOCAL-008
PRE-EXECUTION ARTIFACT-ID COMPATIBILITY (ISSUANCE READ-ONLY)
                                                = INCOMPATIBLE (artifact exact-pinned to E-02-DBA-LOCAL-007)
LOCAL-008 EXECUTION COMPATIBILITY               = BLOCKED UNTIL SUCCESSOR BCR RETARGET
SUCCESSOR BCR IA REQUIRED                       = YES (E-02-BCR-IA-008 expected; not this issuance)
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
| LOCAL-007 evidence | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-007.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-007.md) — **APPLICATION_FAILED** at auxiliary `supabase start` **on a pre-warmed engine** · cold wake **NO** · IA-006 diagnostics **RUNTIME EXERCISED** · stdout **`LegacyContainerStartError`** · host TCP **54323 bind collision** · **immutable** |
| LOCAL-007 runtime manifest | `tests/e02/evidence/local-007-20260824a/bcr-replay-manifest.json` — confirmed `cliStdoutExcerpt` bind failure |
| LOCAL-006 evidence | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md) — **APPLICATION_FAILED** at auxiliary `supabase start` on a pre-warmed engine · studio not observed · **immutable** (not reclassified) |
| LOCAL-005 evidence | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md) — **APPLICATION_FAILED** at auxiliary `supabase start` in a cold Docker context · **immutable** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-007.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-007.md) | IA-007 retarget **COMPLETED WITH NOTES** · LOCAL-007 later executed and failed |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-007.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-007.md) | **E-02-BCR-IA-007 CONSUMED** — pin `EXPECTED_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-007` |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md) | **E-02-BCR-IA-006 CONSUMED** — bounded sanitized stdout/stderr capture |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011–PAD-025 · PAD-012 DBA class · PAD-013 one-attempt granularity · PAD-018 `supabase start` in DBA · PAD-023 failure policy |
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | PAD-026–PAD-038 · PAD-030 successor DBA · single DATA_ONLY quarantine · HMD-001 |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) | PAD-039–PAD-050 · Option A · HMD-002 |
| Artifact (read-only, this issuance) | `scripts/verification/e02/replay-e02-declared-baseline.ts` · `verify-db-baseline.ts` · `environment-guard.ts` |

**Mechanism finding:** This successor DBA is **environment + host-readiness (Docker warm-engine **and** host TCP 54323 FREE) + clean-base-mode + migration-set + baseline-mode + lifecycle + enhanced-diagnostics-consumption + HMD-002 runtime-proof scoped**. It is **not** project-wide blanket permission, **not** production, **not** RU-1.4 REA, **not** artifact code authorization, **not** a Docker Compose replacement for Supabase CLI, **not** a diagnostic-only start probe, **not** host-process remediation, **not** Studio port remapping.

**CDGL loop impact:** Issuing this successor DBA **strengthens** traceability, accountability, and community memory by locking a confirmed host-port precondition into the next one-attempt local application. It does **not** alter Governance / Meeting / Voting / Execution layer boundaries.

---

## 2. Incoming authoritative state (locked)

| Item | Status |
|------|--------|
| E-02-DBA-LOCAL-007 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-007 pre-execution gate | **PASS** |
| LOCAL-007 Docker pre-warm | **PASS** |
| LOCAL-007 cold wake during apply | **NO** |
| LOCAL-007 diagnostic observability | **RUNTIME EXERCISED** |
| LOCAL-007 root cause | **CONFIRMED HOST TCP PORT COLLISION** on **54323** (`LegacyContainerStartError`) |
| LOCAL-007 failure stage | CB-B auxiliary `supabase start` · `PROCESS_EXITED_NONZERO` status=1 |
| LOCAL-007 governed replay | **NOT REACHED** · executed **0** |
| LOCAL-006 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-005 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Completion-007 | **COMPLETED WITH NOTES** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING** |
| HMD-001 | **OPEN** |
| Target restored migration | `supabase/migrations/20260315035847_add_meeting_templates_and_attachments.sql` · **NOT QUARANTINED** |
| Quarantine | Exactly `20260314195641_add_demo_data.sql` · count **1** |
| Option B | **NOT AUTHORIZED** |
| BCR-CB-001..004 | **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING** |
| Database baseline verified | **NO** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| EIR PASS | **NONE** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Final COMMIT path | **BLOCKED** |

LOCAL-008 **does not close HMD-002 merely by being issued.** LOCAL-005 / LOCAL-006 / LOCAL-007 **must not** be retried or relabelled successful.

---

## 3. Predecessor DBA history (immutable)

| Item | Status |
|------|--------|
| `E-02-DBA-LOCAL-001` | **NOT CONSUMED / IMMUTABLE** |
| `E-02-DBA-LOCAL-002` | **FAILED / NOT CONSUMED / IMMUTABLE** |
| `E-02-DBA-LOCAL-003` | **FAILED / NOT CONSUMED / IMMUTABLE** |
| `E-02-DBA-LOCAL-004` | **FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE** |
| `E-02-DBA-LOCAL-005` | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| `E-02-DBA-LOCAL-006` | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| `E-02-DBA-LOCAL-007` | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Evidence LOCAL-001–007 | **IMMUTABLE** — not reclassified, not relabelled, not amended in place |
| Relationship | LOCAL-008 **supersedes LOCAL-007 for one future execution only** |

**No predecessor may ever be relabelled successful.** LOCAL-007 environment **must not** be reused.

---

## 4. Decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-DBA-LOCAL-008** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Status at issuance** | **APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED** |
| **Attempts authorized** | **Exactly one** future fresh local-disposable CB-B database-application attempt |
| **This issuance executes that attempt** | **NO** |
| **Runtime DBA identity** | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-008` (exact; **no source edit**; **no LOCAL-007 substitution**; **no spoofing**) |
| **LOCAL-005 / LOCAL-006 / LOCAL-007 retry** | **NOT AUTHORIZED** |

---

## 5. Next-runtime classification

```
NEXT RUNTIME CLASSIFICATION
  = DATABASE APPLICATION ATTEMPT WITH ENHANCED DIAGNOSTICS
    AND STRICT HOST-PORT READINESS PRECONDITION

NOT
  = DIAGNOSTIC-ONLY EXECUTION
  = HOST-REMEDIATION AUTOMATION
  = DOCKER REPAIR AUTHORIZATION
  = PROCESS-KILL AUTHORIZATION
  = PORT-REMAPPING AUTHORIZATION
```

**Reason:** the replay artifact still executes the normal governed CB-B lifecycle. The new gate is a **host environment readiness precondition** before stateful Supabase. It does **not** truncate authority after `supabase start` if start succeeds.

PAD-012 forbids a separate Execution Authorization tier. PAD-018 authorizes local `supabase start` **within** DBA. Creating a diagnostic-only class is **REJECTED**. Automating host-process kill or Studio port change is **REJECTED**.

---

## 6. LOCAL-007 root cause (locked; do not reduce)

LOCAL-007 captured a **confirmed** host-port collision. Do **not** reduce this to “possible collision,” “studio crash,” “Docker cold-wake,” “migration failure,” or “launcher failure.”

Locked facts (immutable LOCAL-007 evidence / manifest):

- Governance pre-gate **PASS**. Docker warm-engine **PASS**. Cold wake during apply **NO**.
- `--plan` **PLAN_OK**. `--apply --preserve-environment` started.
- Aux init reached. Aux timestamped migrations **= 0**.
- `supabase start` returned `PROCESS_EXITED_NONZERO` status=1 (`cliElapsedMs=49860`).
- IA-006 diagnostics **RUNTIME EXERCISED** (`cliDebugEnabled=true`; stdout/stderr **not truncated**).
- Artifact stdout:

```
LegacyContainerStartError
failed to start docker container "supabase_studio_e02-bcr-aux-local-007-20260824a"
ports are not available: exposing port TCP 0.0.0.0:54323
listen tcp 0.0.0.0:54323: bind: Only one usage of each socket address
(protocol/network address/port) is normally permitted.
```

- Therefore LOCAL-005 idle-wake is **not** the LOCAL-007 cause.
- Governed replay **NOT REACHED**. Executed migrations **= 0**.

```
ROOT CAUSE        = CONFIRMED HOST TCP PORT COLLISION
PORT              = 54323
FAILURE EFFECT    = supabase_studio could not publish/bind host TCP 54323
EVIDENCE CLASS    = LegacyContainerStartError
ROOT-CAUSE CONFIDENCE
                  = CONFIRMED BY ARTIFACT STDOUT (LOCAL-007)
```

### 6.1 Historical occupant (LOCAL-007 only; must not be assumed live)

After LOCAL-007 cleanup, a **read-only** operator check found host TCP **54323** still `Bound` by **Weixin.exe** PID **5668**.

```
HISTORICAL OCCUPANT (LOCAL-007) = Weixin.exe / PID 5668
STATUS                          = HISTORICAL EVIDENCE ONLY
```

LOCAL-008 **must not** assume that PID or process instance still exists. Future execution **must re-check actual current port state** immediately before stateful Supabase. Identity lookup is permitted **only if** a listener is observed, and **only** as read-only evidence.

---

## 7. Host ownership / remediation boundary

```
GOVERNANCE CLASSIFICATION     = HOST ENVIRONMENT READINESS CONDITION
BCR CODE CHANGE REQUIRED      = NO
MIGRATION CHANGE REQUIRED     = NO
QUARANTINE CHANGE REQUIRED    = NO
VERIFIER CHANGE REQUIRED      = NO
PROCESS KILL                  = NOT AUTHORIZED
PORT REMAP / STUDIO PORT      = NOT AUTHORIZED
CONFIG.TOML EDIT              = NOT AUTHORIZED
DOCKER NETWORKING MUTATION    = NOT AUTHORIZED
```

LOCAL-008 **must not** authorize the artifact or the execution task to:

- kill Weixin.exe
- kill arbitrary processes
- stop unrelated software
- reassign ports
- edit Supabase Studio port
- edit `config.toml`
- modify Docker networking
- use a different hard-coded port
- automatically remediate port conflicts

If TCP **54323** is occupied at the LOCAL-008 host-port gate:

```
RESULT                    = BLOCKED
LOCAL-008                 = NOT CONSUMED
DATABASE APPLICATION      = NOT STARTED
```

The operator **may independently** close or reconfigure the unrelated host application **outside** the governed DBA execution. After that, readiness **must be re-checked from scratch** (Docker warm-engine **and** TCP 54323 FREE).

---

## 8. Mandatory pre-execution host TCP 54323 gate

Before **ANY** future stateful Supabase command under LOCAL-008, host TCP **54323** **MUST** be verified **FREE**.

This gate occurs **BEFORE**:

- `supabase init`
- `supabase start`
- BCR `--apply`
- any other stateful Supabase command

Required state:

```
HOST TCP 54323 = FREE / AVAILABLE FOR BIND
```

**Not merely:** no Docker container currently uses it. The check must cover **host-level** listeners/bindings.

Allowed future **read-only** checks may include OS-native commands, for example on Windows:

- `Get-NetTCPConnection` (LocalPort 54323)
- `netstat`
- `Get-Process` / `tasklist` **only** for identity lookup **if** a listener exists

or equivalent read-only host inspection.

**No** process termination. **No** port mutation. **No** `docker logs`.

---

## 9. Host-port gate fail semantics

If TCP **54323** is occupied **before** stateful execution:

```
RESULT                 = BLOCKED
LOCAL-008              = NOT CONSUMED
DATABASE APPLICATION   = NOT STARTED
```

This is **`BLOCKED`**, **not** `APPLICATION_FAILED`.

Do **NOT**:

- run BCR `--apply`
- run `supabase start`
- kill the occupant
- retry repeatedly inside the same execution task
- change Studio port
- create LOCAL-009 automatically

Record, as observable:

- port
- listener state
- PID if observable
- process name if observable

Then **STOP → GOVERNANCE / operator host preparation**.

---

## 10. Docker warm-engine gate (retained)

Retain the LOCAL-006 / LOCAL-007 Docker gate.

Before stateful Supabase, Docker Desktop Linux/WSL engine **MUST already be**:

```
RUNNING
RESPONSIVE
WARM
```

Read-only proof may include `docker version` · `docker info` · `docker ps` · `docker ps -a`.

LOCAL-008 apply **must NOT** cold-wake Docker.

If Docker is idle-stopped, stopped, starting, unreachable, or would be woken by apply:

```
RESULT = BLOCKED
LOCAL-008 = NOT CONSUMED
STOP. Do not start governed replay.
```

**Do NOT authorize:** raw Docker execution of Supabase services · manually recreating Supabase containers · Docker Compose replacement for Supabase CLI · manual network/volume construction · raw Postgres fallback · pruning as a workaround · deleting arbitrary Docker state · killing host processes to “free” Docker.

Purpose only: **HOST ENGINE READY BEFORE BCR APPLY.**

---

## 11. Required gate ordering (locked)

Future LOCAL-008 execution **must** follow this order:

1. Governance / artifact compatibility gate
2. Docker warm-engine gate
3. Host TCP **54323** availability gate
4. Read-only `--plan`
5. **Only then** stateful LOCAL-008 apply (`--apply --preserve-environment`)

**Both** host gates must PASS before stateful Supabase begins:

```
A. Docker warm-engine PASS
AND
B. TCP 54323 FREE
```

If **either** host gate fails: **STOP before stateful Supabase.** Result = **`BLOCKED`**. LOCAL-008 remains **NOT CONSUMED**.

---

## 12. Enhanced diagnostic observability (consume; do not implement)

LOCAL-008 **may consume** diagnostics already implemented under E-02-BCR-IA-006 and **runtime-exercised** by LOCAL-007:

- stdout capture
- stderr capture
- bounded head 8 KiB + tail 8 KiB excerpts
- truncation flags
- sanitization before persistence
- `PROCESS_DID_NOT_START` vs `PROCESS_EXITED_NONZERO`
- elapsed time / exit / signal / timeout metadata
- internal allowlisted `start --debug` where already implemented
- diagnostic persistence **before** best-effort cleanup

**No additional diagnostic implementation is authorized by this DBA.** No retry / backoff / sleep / readiness loop. No startup semantic change. No Docker log collection.

```
CONTAINER LOG COLLECTION = NOT AUTHORIZED
```

---

## 13. Authorized environment

Only `LOCAL_DISPOSABLE_SUPABASE`. Requirements: **fresh · temporary · machine-local · disposable · unlinked · non-production · non-remote · non-shared · not repo-root**.

**Prohibited:** reuse of LOCAL-007 / LOCAL-006 / LOCAL-005 or any partially replayed environment · repo-root Supabase stack as fallback · `supabase link` · remote / production / shared target.

Remote target detection → **fail closed**.

---

## 14. Clean-base / baseline modes

Clean-base = **exactly** `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` (CB-B). **UNCHANGED.** Fresh auxiliary project per attempt. Auxiliary timestamped migration count **= 0** before startup. If count ≠ 0: **STOP.**

Baseline mode = `E02_DECLARED_BASELINE_REPLAY`. **UNCHANGED.** No term redefinition.

Platform baseline is owned by Supabase CLI/images (`auth` · `auth.users` · `storage` · `storage.objects` · `storage.buckets` · required roles · required extensions · platform migration histories). BCR must **fabricate none** of these. Application history must initially be empty before real-repository replay. Platform histories must remain **preserved**.

**No BCR redesign is authorized.** Retain: fresh auxiliary project · empty auxiliary migrations · platform-owned baseline · real repository migrations as authoritative source · one-file quarantine · truthful applied history · existing launcher · preserve/handoff · separate baseline verifier · explicit cleanup.

---

## 15. Artifact authority and pre-execution DBA-ID compatibility gate

Runtime artifact: `scripts/verification/e02/replay-e02-declared-baseline.ts`.

Static metadata `ARTIFACT_AUTHORIZATION_ID` is **not** DBA execution authority.

**Required runtime DBA identity for LOCAL-008 execution:**

```
E02_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-008
```

exact match. **No prefix. No regex. No arbitrary ID. No source edit during execution. No substitution of LOCAL-007. No spoofing. No dual-accept. No warning-only mismatch. No bypass.**

### 15.1 Read-only compatibility finding (this issuance — 2026-08-24)

Inspected `scripts/verification/e02/replay-e02-declared-baseline.ts` **read-only**:

| Constant / rule | Current value |
|-----------------|---------------|
| `ARTIFACT_AUTHORIZATION_ID` | **`E-02-BCR-IA-007`** |
| `EXPECTED_DBA_AUTHORIZATION_ID` | **`E-02-DBA-LOCAL-007`** |
| Match model | exact string equality against `process.env.E02_DBA_AUTHORIZATION_ID` (fail-closed retained) |
| Dual-accept / prefix | **NONE** |
| Diagnostic capture | **PRESENT** (`boundedSanitizedExcerpt` · stdout **and** stderr) |
| `verify-db-baseline.ts` DBA-ID pin | **none found** (not required for this gate) |
| `environment-guard.ts` DBA-ID pin | **none found** |

**Finding:** the current replay artifact **cannot accept** `E-02-DBA-LOCAL-008` without source modification.

```
PRE-EXECUTION ARTIFACT-ID COMPATIBILITY = INCOMPATIBLE
CURRENT PIN                             = E-02-DBA-LOCAL-007
CURRENT ARTIFACT AUTHORITY METADATA     = E-02-BCR-IA-007
REQUIRED PIN FOR LOCAL-008 EXECUTION    = E-02-DBA-LOCAL-008
SOURCE MODIFICATION UNDER LOCAL-008     = NOT AUTHORIZED
LOCAL-007 SUBSTITUTION                  = NOT AUTHORIZED
SPOOFING                                = NOT AUTHORIZED
LOCAL-008 EXECUTION COMPATIBILITY       = BLOCKED UNTIL SUCCESSOR BCR RETARGET
```

**This issuance does not silently assume compatibility and does not falsely state that LOCAL-008 is immediately executable.**

Future executor **must re-check** this gate immediately before any stateful command. If still incompatible:

```
RESULT = BLOCKED
STOP → GOVERNANCE (narrow successor BCR Implementation Authorization:
        retarget EXPECTED_DBA_AUTHORIZATION_ID LOCAL-007 → LOCAL-008
        plus truthful directly-coupled artifact authority metadata)
NO DATABASE COMMAND
NO ARTIFACT EDIT UNDER LOCAL-008
```

LOCAL-008 **does not** authorize a BCR redesign or artifact edit.

Distinguish at issuance:

```
LOCAL-008 AUTHORITY              = APPROVED WITH CONDITIONS
LOCAL-008 DATABASE EXECUTION     = GATED BY
  (1) successor BCR IA retarget + Completion
  (2) Docker engine warm/running readiness
  (3) host TCP 54323 FREE
  (4) restoration-integrity
  (5) --plan PASS
```

---

## 16. Successor BCR IA (expected; not this issuance)

Existing BCR IA sequence ends at **E-02-BCR-IA-007 CONSUMED**. Authority-safe next successor:

```
ID   = E-02-BCR-IA-008
PATH = docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-008.md
```

**Purpose:** DBA-ID retarget **only**:

```
EXPECTED_DBA_AUTHORIZATION_ID : E-02-DBA-LOCAL-007 → E-02-DBA-LOCAL-008
```

plus truthful directly-coupled artifact authority metadata. Exact-match retained. Dual-accept **NONE**. After retarget, LOCAL-007 **must cease** to be an accepted runtime authorization ID.

**Do not create IA-008 in this task.**

---

## 17. Expected governance ordering

Locked by LOCAL-005 / LOCAL-006 / LOCAL-007 precedent (DBA issued first; compatibility BLOCKED; then retarget IA):

1. **ISSUE E-02-DBA-LOCAL-008** (this document)
2. **ISSUE** successor BCR Implementation Authorization for LOCAL-007 → LOCAL-008 pin retarget (`E-02-BCR-IA-008`)
3. **IMPLEMENT** retarget only
4. **ISSUE** corresponding BCR Implementation Completion
5. **EXECUTE** E-02-DBA-LOCAL-008 **only after** compatibility PASS **and** Docker warm **and** TCP 54323 FREE

**Do not execute LOCAL-008 before steps 2–4 complete.** **Do not** skip the host-port gate even after retarget.

---

## 18. Pre-execution restoration-integrity gate

Before **any** stateful execution (and only after Docker pre-warm, host-port, and artifact-ID compatibility all PASS), the executor must **read-only** verify:

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
| I | No governance record supersedes the HMIR Restoration Completion or this LOCAL-008 authority |

Any failure: **STOP → GOVERNANCE. Do not run the database.**

Pre-existing working-tree EOF CRLF vs HEAD LF remains a **recorded line-ending note**, not a seventh semantic restoration, and **must not** be normalized during LOCAL-008.

---

## 19. Historical migration boundary (HMD-002)

The restored migration is authorized to **participate normally** in replay **if replay reaches it**. It **MUST NOT** be edited · quarantined · skipped · copied into a filtered tree · marked applied without execution · replaced by compatibility SQL · repaired · rewritten · normalized · reseeded.

Until actual replay proof exists:

```
HMD-002 = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
```

If it fails: **STOP**. Do not edit. Do not quarantine. Do not retry. **Do not mark HMD-002 CLOSED at authorization issuance.** LOCAL-008 may advance HMD-002 to **RUNTIME REPLAY VERIFIED** **only if** actual replay evidence supports it.

---

## 20. Quarantine / HMD-001

```
quarantinedMigrations = [ 20260314195641_add_demo_data.sql ]
count                 = 1
reason                = HMD-001 historical defect
```

| File | Status |
|------|--------|
| `20260314195641_add_demo_data.sql` | **QUARANTINED** — not executed · not recorded applied |
| `20260315035847_add_meeting_templates_and_attachments.sql` | **NOT QUARANTINED** |
| Option B | **NOT AUTHORIZED** |
| HMD-001 | **OPEN** |

No second quarantine · no wildcard · no regex expansion · no automatic “skip failing migration” · no operator-selected skip · no migration repair · no fake applied history.

If **any other** non-quarantined migration fails: **STOP**. Record the exact migration and exact failure. Return to governance.

---

## 21. CLI / launcher contract (BCR-CB-002)

Runtime proof must exercise the **existing** launcher implementation. **No artifact edit under this DBA.**

| Platform | Contract |
|----------|----------|
| Windows | `ComSpec` / `cmd.exe` + `/d /s /c` + `npx` + `supabase` + allowlisted subcommand + `shell:false` |
| Non-Windows | direct `npx` + `shell:false` |

Allowed subcommands **exactly:** `init` · `start` · `status` · `stop`.

Internal `start --debug` is already implemented under IA-006 and **may** be present. It is **not** operator-controlled and **must not** be treated as a startup-semantic change authorized by this DBA.

**Forbidden:** `npx.cmd` direct spawn · `shell:true` · raw Docker fallback · raw Postgres fallback · undocumented no-migrate flags · repo-root start fallback.

Failures must distinguish `PROCESS_DID_NOT_START` from `PROCESS_EXITED_NONZERO`.

---

## 22. Connection discovery / application-layer reset / real migration source

Discover runtime connection details **only** through:

```
supabase status --workdir <auxiliaryWorkdir> --output json
```

DB target **must** be local. Non-local / remote / production / shared → **STOP**. Credentials: **runtime only** · **never** persisted. Raw status JSON **must not** be persisted.

After platform baseline is running and validated, existing `resetApplicationLayerForReplay()` may reset **only** `public` + `supabase_migrations`. **Must not** reset `auth` · `storage` · extensions · platform histories · platform roles.

Authoritative application migration source:

```
<repository>/supabase/migrations/
```

Auxiliary migrations directory remains **empty** and is **not** the application source.

Truthful history: executed → record applied; quarantined → not executed / not recorded; failed → **STOP**. **No** `supabase migration repair`. Platform histories remain preserved.

---

## 23. LOCAL-008 execution purpose (future; not this task)

Once **all** execution gates are satisfied (successor BCR retarget Completion · Docker pre-warm PASS · TCP 54323 FREE · artifact-ID compatibility PASS · restoration-integrity PASS · `--plan` PASS), LOCAL-008 authorizes the **full** governed lifecycle:

```
pre-gates
→ Docker warm-engine proof
→ host TCP 54323 FREE proof
→ plan
→ fresh auxiliary project
→ init
→ aux migrations = 0
→ already-warm Docker engine
→ supabase start
→ (if start fails: enhanced diagnostics → persist → cleanup → STOP)
→ platform baseline
→ local status / DB discovery
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
→ explicit cleanup
```

**Do NOT artificially STOP after start merely because diagnostics are enhanced.** **Do NOT stop after start if start succeeds.** **No RU-1.4.**

---

## 24. Success-path / failure-path authority

**Success path (if `supabase start` succeeds):** continue through governed replay → preserve → baseline verifier → explicit cleanup.

**Failure path (if `supabase start` or any later governed stage fails):**

```
capture enhanced diagnostics
→ sanitize
→ persist manifest/evidence
→ best-effort cleanup
→ STOP
→ return to governance
```

No silent retry. No second attempt under LOCAL-008. No automatic LOCAL-009. No source/migration repair in the same execution task. No process kill. No port remap.

**Host-gate failure path (Docker not warm **or** TCP 54323 occupied) is different:**

```
RESULT = BLOCKED
persist truthful gate evidence
STOP before stateful Supabase
LOCAL-008 remains NOT CONSUMED
```

---

## 25. HMD-002 / RU-1.1 / RU-1.2 runtime proof

- Restored `20260315035847_add_meeting_templates_and_attachments.sql` must be reached, executed, succeed, and be recorded truthfully **if replay reaches it**. Prior LOCAL-004 parser failure (`syntax error at or near "1."`) must **not** reproduce. If it fails: **APPLICATION_FAILED** · HMD-002 remains runtime-unverified · **STOP** · do not edit the file.
- Downstream non-quarantined replay continues deterministically. First subsequent failure: **STOP**.
- RU-1.1: actual application of `20261729120000_create_owner_vote_primary_freeze_audits.sql` and presence of `public.owner_vote_primary_freeze_audits`. Plan reachability is insufficient.
- RU-1.2: actual application of `20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql` plus RPC/helper **metadata**. **DO NOT invoke the RPC.**

---

## 26. Success apply hand-off / baseline verifier

Success-path apply **must** use `--apply --preserve-environment`. Expected disposition: `RUNNING_FOR_BASELINE_VERIFY` · `baselineVerificationPending=true` · `cleanupRequired=true` · `cleanupCompleted=false`. **Do not teardown** a successful environment before the verifier.

Only after successful preserved apply, run **exactly**:

```
npm run verify:e02:baseline
```

with `E02_BASELINE_VERIFICATION_AUTHORIZED=true`. **DO NOT set** `E02_RUNTIME_EXECUTION_AUTHORIZED`.

Verifier remains **read-only**. **No** RPC · fixtures · concurrency · RU-1.4 suite.

Must verify the existing governed baseline (Primary Audit table · RU-1.2 metadata). After evidence is written, explicit `--cleanup` with the **same** DBA ID and evidence run ID.

---

## 27. Result taxonomy

Use only:

- `APPLIED_AND_BASELINE_VERIFIED`
- `APPLICATION_FAILED`
- `APPLIED_BASELINE_FAILED`
- `BLOCKED`
- `NOT_RUN`

**Do not use:** `EIR_PASS` · `COMMITTED` · `PROJECT_CERTIFIED` · `FULL_REPLAY_PASS`.

If Docker pre-warm fails **or** host TCP 54323 is occupied **or** artifact-ID compatibility fails: **`BLOCKED`** before any DB / stateful Supabase command.

Port 54323 occupied **before** stateful execution **must** classify as **`BLOCKED`**, **not** `APPLICATION_FAILED`.

---

## 28. Future evidence path

```
docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-008.md
```

**Do not create it in this issuance task.**

Future evidence must include:

- governance pre-gate
- artifact compatibility
- Docker warm-engine (`docker version` / `docker info` / `docker ps`)
- whether any cold wake occurred at apply
- host TCP 54323 availability
- listener / PID / process name **if occupied**
- `--plan` result
- `evidenceRunId`
- auxiliary workdir
- auxiliary init
- aux migration count
- start result
- enhanced stdout/stderr diagnostics if failure
- diagnostic truncation flags / debug / timeout
- platform baseline
- local DB discovery
- migration replay result
- HMD-002 result
- RU-1.1
- RU-1.2
- manifest
- baseline verifier
- cleanup
- final taxonomy result

**No secrets.**

---

## 29. Success semantics (future execution only)

If and only if future LOCAL-008 succeeds fully:

```
E-02-DBA-LOCAL-008              = CONSUMED
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

## 30. Failure semantics (future execution only)

```
E-02-DBA-LOCAL-008 = NOT SUCCESSFULLY CONSUMED
```

Issue LOCAL-008 evidence. **No** silent retry. **No** migration/source repair. **No** automatic LOCAL-009. **No** process kill. **No** port remap. Governance path depends on the **actual** failure (host-port `BLOCKED` vs Docker `BLOCKED` vs start `APPLICATION_FAILED` vs replay failure vs baseline failure). **No REA.**

---

## 31. Current issuance effect

```
E-02-DBA-LOCAL-008 AUTHORITY           = APPROVED WITH CONDITIONS / NOT CONSUMED
E-02-DBA-LOCAL-008 DATABASE EXECUTION  = GATED / NOT EXECUTED / NOT IMMEDIATELY EXECUTABLE
DOCKER PRE-WARM GATE                   = MANDATORY
HOST TCP 54323 GATE                    = MANDATORY (FREE / AVAILABLE FOR BIND)
ARTIFACT-ID COMPATIBILITY (ISSUANCE)   = INCOMPATIBLE (PIN = E-02-DBA-LOCAL-007)
LOCAL-008 EXECUTION COMPATIBILITY      = BLOCKED UNTIL SUCCESSOR BCR RETARGET
SUCCESSOR BCR RETARGET                 = EXPECTED BEFORE EXECUTION (E-02-BCR-IA-008)
DATABASE APPLICATION                   = AUTHORIZED TO BEGIN / GATED / NOT EXECUTED
DATABASE BASELINE VERIFIED             = NO
```

LOCAL-005 / LOCAL-006 / LOCAL-007 remain **APPLICATION_FAILED / IMMUTABLE**. Completion-007 remains **COMPLETED WITH NOTES**. Diagnostic observability remains **RUNTIME EXERCISED** (LOCAL-007) and **may be consumed**.

---

## 32. RU-1.4 / EIR / Certification (unchanged)

```
RU-1.4                 = RUNTIME NOT AUTHORIZED
EIR PASS               = NONE
Acceptance             = BLOCKED
Certification          = NOT ISSUED
Runtime COMMITTED      = NOT CERTIFIED
Final COMMIT Path      = BLOCKED
```

---

## 33. Next action (this issuance)

```
NEXT = ISSUE E-02-BCR-IA-008
       docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-008.md
       for LOCAL-007 → LOCAL-008 authorization-ID retarget
```

Then implement retarget only → issue BCR Implementation Completion → execute LOCAL-008 **only after** compatibility PASS **and** Docker engine already warm **and** host TCP 54323 FREE.

**Do not** retry LOCAL-005 / LOCAL-006 / LOCAL-007. **Do not** create IA-008 in this task. **Do not** create REA. **Do not** execute LOCAL-008 in this task. **Do not** kill host processes. **Do not** remap Studio.

---

## 34. File scope / prohibited work (this issuance confirmation)

This issuance task may modify **only**:

1. `docs/implementation/E-02-Database-Application-Authorization-LOCAL-008.md` (this document)
2. `docs/implementation/README.md` (minimal)

**No** artifact modification · **no** verifier modification · **no** environment-guard modification · **no** migration modification · **no** package/test modification · **no** quarantine change · **no** DB application · **no** BCR `--apply` · **no** Supabase start · **no** Docker mutation · **no** process kill · **no** port mutation · **no** Studio remap · **no** LOCAL-008 execution · **no** LOCAL-008 evidence · **no** BCR IA-008 · **no** LOCAL-009 · **no** RU-1.4 · **no** REA · **no** EIR / Acceptance / Certification change · **no** commit.

---

## 35. Lock statement

```
DATABASE APPLICATION AUTHORIZATION     = E-02-DBA-LOCAL-008
DECISION                               = APPROVED WITH CONDITIONS
CONTROLLING AUTHORITY                  = PAD-012 / PAD-013 / PAD-018 / PAD-023 / PAD-030
NEXT RUNTIME CLASS                     = DATABASE APPLICATION ATTEMPT WITH ENHANCED DIAGNOSTICS
                                         AND STRICT HOST-PORT READINESS PRECONDITION
LOCAL-005                              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-006                              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-007                              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-007 ROOT CAUSE                   = CONFIRMED HOST TCP PORT COLLISION (54323)
ROOT-CAUSE CONFIDENCE                  = CONFIRMED BY ARTIFACT STDOUT
HOST PORT PRECONDITION                 = TCP 54323 MUST BE FREE BEFORE STATEFUL SUPABASE
PROCESS KILL                           = NOT AUTHORIZED
PORT REMAP                             = NOT AUTHORIZED
LOCAL-008                              = APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED
DIAGNOSTIC OBSERVABILITY               = IMPLEMENTED / PRESERVED / RUNTIME EXERCISED (may consume)
AUTHORIZED ENVIRONMENT                 = LOCAL_DISPOSABLE_SUPABASE
DOCKER PRE-WARM                        = MANDATORY
HOST TCP 54323                         = MANDATORY FREE GATE
CLEAN-BASE MODE                        = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
BASELINE MODE                          = E02_DECLARED_BASELINE_REPLAY
CURRENT ARTIFACT PIN                   = E-02-DBA-LOCAL-007
CURRENT ARTIFACT AUTHORITY             = E-02-BCR-IA-007
LOCAL-008 COMPATIBILITY                = INCOMPATIBLE / EXECUTION BLOCKED UNTIL SUCCESSOR BCR RETARGET
SUCCESSOR BCR IA                       = E-02-BCR-IA-008 EXPECTED / NOT CREATED THIS TASK
EXACT-MATCH MODEL                      = RETAINED
SUCCESS PATH                           = FULL GOVERNED CB-B DBA LIFECYCLE
FAILURE PATH                           = CAPTURE → PERSIST → CLEANUP → STOP → GOVERNANCE
HOST-GATE FAIL                         = BLOCKED (NOT APPLICATION_FAILED)
CONTAINER LOGS                         = NOT AUTHORIZED
QUARANTINE                             = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
OPTION B                               = NOT AUTHORIZED
HMD-001                                = OPEN
HMD-002                                = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
DATABASE APPLICATION                   = AUTHORIZED TO BEGIN / GATED / NOT EXECUTED
DATABASE BASELINE VERIFIED             = NO
RU-1.4                                 = RUNTIME NOT AUTHORIZED
EIR PASS                               = NONE
RUNTIME COMMITTED                      = NOT CERTIFIED
FINAL COMMIT PATH                      = BLOCKED
NEXT                                   = ISSUE E-02-BCR-IA-008
                                         (LOCAL-007 → LOCAL-008 RETARGET)
DO NOT RETRY LOCAL-005/006/007 · DO NOT EXECUTE LOCAL-008 IN THIS TASK
DO NOT MODIFY THE ARTIFACT · DO NOT KILL PROCESSES · DO NOT REMAP PORTS
```

---

**End of document — E-02-DBA-LOCAL-008 — v1.0 — 2026-08-24**
