# E-02 — Database Application Authorization (Successor)

## Local Disposable Evidence Environment · CB-B Clean-Base · Declared Baseline Replay · Enhanced Start Diagnostics · Docker Pre-Warm Gate · HMD-002 Runtime Replay Verification

| Field | Value |
|-------|-------|
| **Document Type** | **Database Application Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-007** |
| **Predecessor** | **E-02-DBA-LOCAL-006** — [`E-02-Database-Application-Authorization-LOCAL-006.md`](E-02-Database-Application-Authorization-LOCAL-006.md) · evidence [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md) · **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| **Prior predecessors** | **E-02-DBA-LOCAL-005** · **E-02-DBA-LOCAL-004** · **E-02-DBA-LOCAL-003** · **E-02-DBA-LOCAL-002** · **E-02-DBA-LOCAL-001** — **FAILED or NOT CONSUMED / IMMUTABLE** |
| **Classification** | **DATABASE APPLICATION ATTEMPT WITH ENHANCED DIAGNOSTICS** |
| **Diagnostic implementation consumed** | **E-02-BCR-IA-006 CONSUMED** · [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md) · Completion [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-006.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-006.md) (**COMPLETED WITH NOTES**) |
| **Restoration authority** | **E-02-HMIR-IA CONSUMED** · [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md) (**COMPLETED WITH NOTES**) |
| **Policy authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) (PAD-039 – PAD-050) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025) |
| **BCR artifact authority** | **E-02-BCR-IA-006 CONSUMED** (diagnostics) · pin metadata still **E-02-BCR-IA-005** / `EXPECTED_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-006` · artifact **unmodified by this DBA** |
| **Status** | **Approved With Conditions** |
| **Authority Level** | Database Application Authorization |
| **Effective Date** | 2026-08-24 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Database-Application-Authorization-LOCAL-007.md`](E-02-Database-Application-Authorization-LOCAL-007.md) |
| **Production Effect** | **None** from this record alone |

> **Authority path finding: YES.** `E-02-Database-Application-Authorization-LOCAL-007.md` is **authority-safe** as a **scoped successor Database Application Authorization** under the PAD-012 naming pattern (`E-02-Database-Application-Authorization-{scope}.md` · ID `E-02-DBA-{ENV}-{SEQ}`). Precedent: LOCAL-001 through LOCAL-006. A distinct filename is used so predecessor DBA records and evidence remain **immutable**. This is **not** a new document class, **not** a new governance tier, **not** a BCR redesign, **not** a successor BCR Implementation Authorization, **not** a diagnostic-only execution class, **not** a PAD-051+ allocation, **not** a migration-repair authorization, **not** a quarantine amendment, **not** a RU-1.4 Runtime Execution Authorization, **not** an EIR decision, **not** Acceptance, and **not** Certification.

> **Superseding authority:** LOCAL-007 **supersedes LOCAL-006 only for one future execution attempt**. It **must not** alter, amend, or reclassify predecessor evidence. LOCAL-006 remains **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE**. LOCAL-005 remains **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE**. LOCAL-001–004 remain immutable.

> **Document class:** Bounded **Database Application Authorization** record only. It **does not execute** LOCAL-007. It **does not** authorize production deployment · remote database mutation · repo-root `supabase start` · raw Postgres/Docker Compose replacement · replay-artifact source modification · DBA-ID spoofing / substitution of LOCAL-006 · RU-1.4 runtime evidence · RPC invocation · destructive fixtures · concurrency tests · Docker log collection · EIR reclassification · Acceptance · Project Certification · or Final COMMIT path unblock.

> **Controlling authority finding (not reopened):** No new Program Authority Decision is required. PAD-012 · PAD-013 · PAD-018 · PAD-023 · PAD-030 already govern successor local DBA attempts. A distinct diagnostic execution authorization is **REJECTED / NOT REQUIRED**. IA-006 authorized repository diagnostics only. Completion-006 certified repository/static completion only.

```
DATABASE APPLICATION AUTHORIZATION (SUCCESSOR)  = APPROVED WITH CONDITIONS
AUTHORIZATION ID                                = E-02-DBA-LOCAL-007
PREDECESSOR E-02-DBA-LOCAL-006                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
PRIOR E-02-DBA-LOCAL-005 / 004 / 003 / 002 / 001
                                                = FAILED or NOT CONSUMED / IMMUTABLE
NEXT RUNTIME CLASSIFICATION                     = DATABASE APPLICATION ATTEMPT WITH ENHANCED DIAGNOSTICS
DISTINCT DIAGNOSTIC EXECUTION CLASS             = REJECTED / NOT REQUIRED
NEW PAD                                         = NOT ALLOCATED
ROOT CAUSE                                      = CB-B AUXILIARY PLATFORM START FAILURE / STILL NOT YET CAPTURED
LOCAL-006 DOCKER PRE-WARM                       = PASS
LOCAL-006 COLD WAKE                             = NO
LOCAL-006 START                                 = PROCESS_EXITED_NONZERO / STATUS 1
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
DIAGNOSTIC OBSERVABILITY                        = IMPLEMENTED IN REPOSITORY / RUNTIME NOT YET EXERCISED
CONTAINER LOG COLLECTION                        = NOT AUTHORIZED
ARTIFACT AUTHORITY METADATA                     = E-02-BCR-IA-005 (UNMODIFIED BY THIS DBA)
CURRENT ARTIFACT DBA PIN                        = E-02-DBA-LOCAL-006
DBA RUNTIME ID                                  = E02_DBA_AUTHORIZATION_ID / EXACT E-02-DBA-LOCAL-007
PRE-EXECUTION ARTIFACT-ID COMPATIBILITY (ISSUANCE READ-ONLY)
                                                = INCOMPATIBLE (artifact exact-pinned to E-02-DBA-LOCAL-006)
LOCAL-007 EXECUTION COMPATIBILITY               = BLOCKED UNTIL SUCCESSOR BCR RETARGET
SUCCESSOR BCR IA REQUIRED                       = YES (E-02-BCR-IA-007 expected; not this issuance)
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
| LOCAL-006 evidence | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md) — **APPLICATION_FAILED** at auxiliary `supabase start` **on a pre-warmed engine** · cold wake **NO** · studio **not observed** · port **54323 not published** · **immutable** |
| LOCAL-005 evidence | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md) — **APPLICATION_FAILED** at auxiliary `supabase start` in a cold Docker context · **immutable** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-006.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-006.md) | IA-006 diagnostic observability **COMPLETED WITH NOTES** · runtime **not exercised** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md) | **E-02-BCR-IA-006 CONSUMED** — bounded sanitized stdout/stderr capture in repository |
| Prior governance review | Successor DBA is the controlling runtime class; distinct diagnostic execution authorization **REJECTED**; **no PAD-051+** |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011–PAD-025 · PAD-012 DBA class · PAD-013 one-attempt granularity · PAD-018 `supabase start` in DBA · PAD-023 failure policy |
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | PAD-026–PAD-038 · PAD-030 successor DBA · single DATA_ONLY quarantine · HMD-001 |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) | PAD-039–PAD-050 · Option A · HMD-002 |
| Artifact (read-only, this issuance) | `scripts/verification/e02/replay-e02-declared-baseline.ts` · `verify-db-baseline.ts` · `environment-guard.ts` |

**Mechanism finding:** This successor DBA is **environment + host-readiness + clean-base-mode + migration-set + baseline-mode + lifecycle + enhanced-diagnostics-consumption + HMD-002 runtime-proof scoped**. It is **not** project-wide blanket permission, **not** production, **not** RU-1.4 REA, **not** artifact code authorization, **not** a Docker Compose replacement for Supabase CLI, **not** a diagnostic-only start probe.

---

## 2. Incoming authoritative state (locked)

| Item | Status |
|------|--------|
| E-02-DBA-LOCAL-006 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-006 failure stage | CB-B auxiliary `supabase start` · `PROCESS_EXITED_NONZERO` status=1 |
| LOCAL-006 Docker pre-warm | **PASS** |
| LOCAL-006 cold wake during apply | **NO** |
| LOCAL-006 governed replay | **NOT REACHED** · executed **0** |
| LOCAL-005 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Root cause | **STILL NOT YET CAPTURED** (idle-wake is **not** a sufficient sole explanation) |
| Completion-006 | **COMPLETED WITH NOTES** |
| Diagnostic observability | **IMPLEMENTED IN REPOSITORY / STATICALLY VERIFIED / RUNTIME NOT EXECUTED** |
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

LOCAL-007 **does not close HMD-002 merely by being issued.** LOCAL-005 and LOCAL-006 **must not** be retried or relabelled successful.

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
| Evidence LOCAL-001–006 | **IMMUTABLE** — not reclassified, not relabelled, not amended in place |
| Relationship | LOCAL-007 **supersedes LOCAL-006 for one future execution only** |

**No predecessor may ever be relabelled successful.** LOCAL-006 environment **must not** be reused.

---

## 4. Decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-DBA-LOCAL-007** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Attempts authorized** | **Exactly one** future fresh local-disposable CB-B database-application attempt |
| **This issuance executes that attempt** | **NO** |
| **Runtime DBA identity** | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-007` (exact; **no source edit**; **no LOCAL-006 substitution**; **no spoofing**) |
| **LOCAL-005 / LOCAL-006 retry** | **NOT AUTHORIZED** |

---

## 5. Next-runtime classification

```
NEXT RUNTIME CLASSIFICATION
  = DATABASE APPLICATION ATTEMPT WITH ENHANCED DIAGNOSTICS

NOT
  = DIAGNOSTIC-ONLY EXECUTION
```

**Reason:** the replay artifact still executes the normal governed lifecycle:

```
fresh auxiliary project
→ init
→ start
→ platform baseline
→ application history validation
→ application-layer reset
→ governed repository replay
→ one declared quarantine
→ restored HMD-002 migration
→ downstream migrations
→ RU-1.1
→ RU-1.2
→ manifest
→ preserve
→ baseline verifier
→ cleanup
```

IA-006 diagnostics are **evidence collection inside that lifecycle**. They do **not** truncate authority after `supabase start`.

PAD-012 forbids a separate Execution Authorization tier. PAD-018 authorizes local `supabase start` **within** DBA. Creating a diagnostic-only class is **REJECTED**.

---

## 6. Empirical basis (LOCAL-006 start failure)

LOCAL-006 proved that LOCAL-005 idle-wake is **not a sufficient sole explanation**.

Locked facts (immutable):

- Docker warm-engine gate **PASS** before apply.
- Cold wake during apply **NO**.
- Aux init **PASS**. Aux timestamped migrations **= 0**.
- `supabase start` returned `PROCESS_EXITED_NONZERO` status=1 (~53.5s).
- `supabase_studio` **not observed**; port **54323 not published**.
- CLI then `Stopping containers...` (cleanup, not a confirmed root-cause line).
- Governed replay **NOT REACHED**. Executed migrations **= 0**.
- Prior capture discarded stdout and truncated stderr to ~400 characters.

```
ROOT CAUSE
  = CB-B AUXILIARY PLATFORM START FAILURE / STILL NOT YET CAPTURED
```

This DBA **must not** classify a confirmed root cause from issuance alone. Future LOCAL-007 evidence must use the IA-006 capture **before** cleanup.

---

## 7. Enhanced diagnostic observability (consume; do not implement)

LOCAL-007 **may consume** diagnostics already implemented under E-02-BCR-IA-006 / Completion-006:

- stdout capture
- stderr capture
- bounded head 8 KiB + tail 8 KiB excerpts
- truncation flags
- sanitization before persistence
- `PROCESS_DID_NOT_START` vs `PROCESS_EXITED_NONZERO`
- elapsed time / exit / signal / timeout metadata
- internal allowlisted `start --debug` where already implemented
- diagnostic persistence **before** best-effort cleanup

**No additional diagnostic implementation is authorized by this DBA.** No retry / backoff / sleep / readiness loop. No startup semantic change.

---

## 8. Container logs

```
CONTAINER LOG COLLECTION = NOT AUTHORIZED
```

LOCAL-007 **does not** authorize `docker logs` · container inspection automation · container restart · container repair · leaving failed stacks running by default.

If enhanced stdout/stderr still proves insufficient: **STOP → GOVERNANCE**. Do not expand this DBA in the same execution task.

---

## 9. Authorized environment

Only `LOCAL_DISPOSABLE_SUPABASE`. Requirements: **fresh · temporary · machine-local · disposable · unlinked · non-production · non-remote · non-shared · not repo-root**.

**Prohibited:** reuse of LOCAL-006 environment · reuse of LOCAL-005 or any partially replayed environment · repo-root Supabase stack as fallback · `supabase link` · remote / production / shared target.

Remote target detection → **fail closed**.

---

## 10. Clean-base / baseline modes

Clean-base = **exactly** `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` (CB-B). Fresh auxiliary project per attempt. Auxiliary timestamped migration count **= 0** before startup. If count ≠ 0: **STOP.**

Baseline mode = `E02_DECLARED_BASELINE_REPLAY`. **UNCHANGED.** No term redefinition.

Platform baseline is owned by Supabase CLI/images (`auth` · `auth.users` · `storage` · `storage.objects` · `storage.buckets` · required roles · required extensions · platform migration histories). BCR must **fabricate none** of these. Application history must initially be empty before real-repository replay. Platform histories must remain **preserved**.

**No BCR redesign is authorized.** Retain: fresh auxiliary project · empty auxiliary migrations · platform-owned baseline · real repository migrations as authoritative source · one-file quarantine · truthful applied history · existing launcher · preserve/handoff · separate baseline verifier · explicit cleanup.

---

## 11. Host / Docker pre-warm gate (mandatory)

Before invoking the governed BCR `--apply` path, Docker Desktop Linux/WSL engine **MUST already be running and responsive**. The apply command itself **must not** be the event that cold-starts an idle-stopped Docker engine.

### 11.1 Required pre-execution evidence (immediately before apply)

1. Docker Desktop is open / running.
2. Docker client can reach Docker server.
3. Engine is responsive **without** a wake/start transition caused by apply.
4. A read-only command such as `docker ps` succeeds **promptly**.
5. Docker Desktop backend state does **not** indicate Linux/WSL engine stopped / starting.
6. No host-level Docker startup transition is in progress.
7. No stale auxiliary LOCAL-006 / LOCAL-005 stack is being reused.

If Docker is idle-stopped, stopped, starting, unreachable, or requires the LOCAL-007 apply operation itself to wake it:

```
RESULT = BLOCKED
STOP. Do not start governed replay.
```

Read-only readiness evidence should include `docker version` · `docker info` · `docker ps`.

### 11.2 Pre-warm boundary

This DBA may authorize the **operator** to ensure Docker Desktop is already running **before** the governed attempt. That is an **environment prerequisite**, **not** BCR replay logic.

**Do NOT authorize:** raw Docker execution of Supabase services · manually recreating Supabase containers · Docker Compose replacement for Supabase CLI · manual network/volume construction · raw Postgres fallback · pruning as a workaround · deleting arbitrary Docker state.

Purpose only: **HOST ENGINE READY BEFORE BCR APPLY.**

Do **not** mutate Docker merely to make the gate pass, except normal user-level Docker Desktop startup **if needed before the execution task begins**. If startup is required, **wait until the engine is fully running BEFORE beginning the governed LOCAL-007 apply attempt**.

---

## 12. Artifact authority and pre-execution DBA-ID compatibility gate

Runtime artifact: `scripts/verification/e02/replay-e02-declared-baseline.ts`.

Static metadata `ARTIFACT_AUTHORIZATION_ID` is **not** DBA execution authority.

**Required runtime DBA identity for LOCAL-007 execution:**

```
E02_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-007
```

exact match. **No prefix. No regex. No arbitrary ID. No source edit during execution. No substitution of LOCAL-006. No spoofing. No dual-accept. No warning-only mismatch. No bypass.**

### 12.1 Read-only compatibility finding (this issuance — 2026-08-24)

Inspected `scripts/verification/e02/replay-e02-declared-baseline.ts` **read-only**:

| Constant / rule | Current value |
|-----------------|---------------|
| `ARTIFACT_AUTHORIZATION_ID` | **`E-02-BCR-IA-005`** |
| `EXPECTED_DBA_AUTHORIZATION_ID` | **`E-02-DBA-LOCAL-006`** |
| Match model | exact string equality against `process.env.E02_DBA_AUTHORIZATION_ID` (fail-closed retained) |
| Dual-accept / prefix | **NONE** |
| Diagnostic capture | **PRESENT** (`boundedSanitizedExcerpt` · stdout **and** stderr) |
| `verify-db-baseline.ts` DBA-ID pin | **none found** (not required for this gate) |
| `environment-guard.ts` DBA-ID pin | **none found** |

**Finding:** the current replay artifact **cannot accept** `E-02-DBA-LOCAL-007` without source modification.

```
PRE-EXECUTION ARTIFACT-ID COMPATIBILITY = INCOMPATIBLE
CURRENT PIN                             = E-02-DBA-LOCAL-006
CURRENT ARTIFACT AUTHORITY METADATA     = E-02-BCR-IA-005
REQUIRED PIN FOR LOCAL-007 EXECUTION    = E-02-DBA-LOCAL-007
SOURCE MODIFICATION UNDER LOCAL-007     = NOT AUTHORIZED
LOCAL-006 SUBSTITUTION                  = NOT AUTHORIZED
SPOOFING                                = NOT AUTHORIZED
LOCAL-007 EXECUTION COMPATIBILITY       = BLOCKED UNTIL SUCCESSOR BCR RETARGET
```

**This issuance does not silently assume compatibility and does not falsely state that LOCAL-007 is immediately executable.**

Future executor **must re-check** this gate immediately before any stateful command. If still incompatible:

```
RESULT = BLOCKED
STOP → GOVERNANCE (narrow successor BCR Implementation Authorization:
        retarget EXPECTED_DBA_AUTHORIZATION_ID LOCAL-006 → LOCAL-007
        plus truthful directly-coupled artifact authority metadata)
NO DATABASE COMMAND
NO ARTIFACT EDIT UNDER LOCAL-007
```

LOCAL-007 **does not** authorize a BCR redesign or artifact edit.

Distinguish at issuance:

```
LOCAL-007 AUTHORITY              = APPROVED WITH CONDITIONS
LOCAL-007 DATABASE EXECUTION     = GATED BY
  (1) successor BCR IA retarget + Completion
  (2) Docker engine warm/running readiness
  (3) restoration-integrity
  (4) --plan PASS
```

---

## 13. Successor BCR IA (expected; not this issuance)

Existing BCR IA sequence ends at **E-02-BCR-IA-006 CONSUMED**. Authority-safe next successor:

```
ID   = E-02-BCR-IA-007
PATH = docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-007.md
```

**Purpose:** DBA-ID retarget **only**:

```
EXPECTED_DBA_AUTHORIZATION_ID : E-02-DBA-LOCAL-006 → E-02-DBA-LOCAL-007
```

plus truthful directly-coupled artifact authority metadata. Exact-match retained. Dual-accept **NONE**. After retarget, LOCAL-006 **must cease** to be an accepted runtime authorization ID.

**Do not create IA-007 in this task.**

---

## 14. Expected governance ordering

Locked by LOCAL-005 / LOCAL-006 precedent (DBA issued first; compatibility BLOCKED; then retarget IA):

1. **ISSUE E-02-DBA-LOCAL-007** (this document)
2. **ISSUE** successor BCR Implementation Authorization for LOCAL-006 → LOCAL-007 pin retarget (`E-02-BCR-IA-007`)
3. **IMPLEMENT** retarget only
4. **ISSUE** corresponding BCR Implementation Completion
5. **EXECUTE** E-02-DBA-LOCAL-007

**Do not execute LOCAL-007 before steps 2–4 complete.**

---

## 15. Pre-execution restoration-integrity gate

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
| I | No governance record supersedes the HMIR Restoration Completion or this LOCAL-007 authority |

Any failure: **STOP → GOVERNANCE. Do not run the database.**

Pre-existing working-tree EOF CRLF vs HEAD LF remains a **recorded line-ending note**, not a seventh semantic restoration, and **must not** be normalized during LOCAL-007.

---

## 16. Historical migration boundary (HMD-002)

The restored migration is authorized to **participate normally** in replay **if replay reaches it**. It **MUST NOT** be edited · quarantined · skipped · copied into a filtered tree · marked applied without execution · replaced by compatibility SQL · repaired · rewritten · normalized · reseeded.

Until actual replay proof exists:

```
HMD-002 = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
```

If it fails: **STOP**. Do not edit. Do not quarantine. Do not retry. **Do not mark HMD-002 CLOSED at authorization issuance.**

---

## 17. Quarantine / HMD-001

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

## 18. CLI / launcher contract (BCR-CB-002)

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

## 19. Connection discovery / application-layer reset / real migration source

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

## 20. LOCAL-007 execution purpose (future; not this task)

Once **all** execution gates are satisfied (successor BCR retarget Completion · Docker pre-warm PASS · artifact-ID compatibility PASS · restoration-integrity PASS · `--plan` PASS), LOCAL-007 authorizes the **full** governed lifecycle:

```
pre-gates
→ Docker warm-engine proof
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

**Do NOT artificially STOP after start merely because diagnostics are enhanced.** **No RU-1.4.**

---

## 21. Success-path / failure-path authority

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

No silent retry. No second attempt under LOCAL-007. No automatic LOCAL-008. No source/migration repair in the same execution task.

---

## 22. HMD-002 / RU-1.1 / RU-1.2 runtime proof

- Restored `20260315035847_add_meeting_templates_and_attachments.sql` must be reached, executed, succeed, and be recorded truthfully **if replay reaches it**. Prior LOCAL-004 parser failure (`syntax error at or near "1."`) must **not** reproduce. If it fails: **APPLICATION_FAILED** · HMD-002 remains runtime-unverified · **STOP** · do not edit the file.
- Downstream non-quarantined replay continues deterministically. First subsequent failure: **STOP**.
- RU-1.1: actual application of `20261729120000_create_owner_vote_primary_freeze_audits.sql` and presence of `public.owner_vote_primary_freeze_audits`. Plan reachability is insufficient.
- RU-1.2: actual application of `20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql` plus RPC/helper **metadata**. **DO NOT invoke the RPC.**

---

## 23. Success apply hand-off / baseline verifier

Success-path apply **must** use `--apply --preserve-environment`. Expected disposition: `RUNNING_FOR_BASELINE_VERIFY` · `baselineVerificationPending=true` · `cleanupRequired=true` · `cleanupCompleted=false`. **Do not teardown** a successful environment before the verifier.

Only after successful preserved apply, run **exactly**:

```
npm run verify:e02:baseline
```

with `E02_BASELINE_VERIFICATION_AUTHORIZED=true`. **DO NOT set** `E02_RUNTIME_EXECUTION_AUTHORIZED`.

Verifier remains **read-only**. **No** RPC · fixtures · concurrency · RU-1.4 suite.

Must verify the existing governed baseline (Primary Audit table · RU-1.2 metadata). After evidence is written, explicit `--cleanup` with the **same** DBA ID and evidence run ID.

---

## 24. Result taxonomy

Use only:

- `APPLIED_AND_BASELINE_VERIFIED`
- `APPLICATION_FAILED`
- `APPLIED_BASELINE_FAILED`
- `BLOCKED`
- `NOT_RUN`

**Do not use:** `EIR_PASS` · `COMMITTED` · `PROJECT_CERTIFIED` · `FULL_REPLAY_PASS`.

If Docker pre-warm fails **or** artifact-ID compatibility fails: **`BLOCKED`** before any DB command.

---

## 25. Future evidence path

```
docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-007.md
```

**Do not create it in this issuance task.**

Future evidence must include:

- governance pre-gates
- artifact compatibility
- Docker warm-engine result (`docker version` / `docker info` / `docker ps`)
- whether any cold wake occurred at apply
- `--plan` result
- `evidenceRunId`
- auxiliary init
- aux migration count
- start result
- enhanced stdout/stderr diagnostics
- diagnostic truncation flags
- debug status
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

## 26. Success semantics (future execution only)

If and only if future LOCAL-007 succeeds fully:

```
E-02-DBA-LOCAL-007              = CONSUMED
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

## 27. Failure semantics (future execution only)

```
E-02-DBA-LOCAL-007 = NOT SUCCESSFULLY CONSUMED
```

Issue LOCAL-007 evidence. **No** silent retry. **No** migration/source repair. **No** automatic LOCAL-008. Governance path depends on the **actual** failure (warm-engine start failure vs replay failure vs baseline failure vs `BLOCKED` at a gate). **No REA.**

---

## 28. Current issuance effect

```
E-02-DBA-LOCAL-007 AUTHORITY           = APPROVED WITH CONDITIONS / NOT CONSUMED
E-02-DBA-LOCAL-007 DATABASE EXECUTION  = GATED / NOT EXECUTED / NOT IMMEDIATELY EXECUTABLE
DOCKER PRE-WARM GATE                   = MANDATORY
ARTIFACT-ID COMPATIBILITY (ISSUANCE)   = INCOMPATIBLE (PIN = E-02-DBA-LOCAL-006)
LOCAL-007 EXECUTION COMPATIBILITY      = BLOCKED UNTIL SUCCESSOR BCR RETARGET
SUCCESSOR BCR RETARGET                 = EXPECTED BEFORE EXECUTION (E-02-BCR-IA-007)
DATABASE APPLICATION                   = NOT RUN
DATABASE BASELINE VERIFIED             = NO
```

LOCAL-005 / LOCAL-006 remain **APPLICATION_FAILED / IMMUTABLE**. Completion-006 remains **COMPLETED WITH NOTES**. Diagnostic observability remains **RUNTIME NOT EXECUTED**.

---

## 29. Next action (this issuance)

```
NEXT = ISSUE E-02-BCR-IA-007
       docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-007.md
       for LOCAL-006 → LOCAL-007 authorization-ID retarget
```

Then implement retarget only → issue BCR Implementation Completion → execute LOCAL-007 **only after** compatibility PASS **and** Docker engine already warm.

**Do not** retry LOCAL-005 / LOCAL-006. **Do not** create IA-007 in this task. **Do not** create REA. **Do not** execute LOCAL-007 in this task.

---

## 30. File scope / prohibited work (this issuance confirmation)

This issuance task may modify **only**:

1. `docs/implementation/E-02-Database-Application-Authorization-LOCAL-007.md` (this document)
2. `docs/implementation/README.md` (minimal)

**No** artifact modification · **no** verifier modification · **no** environment-guard modification · **no** migration modification · **no** package/test modification · **no** quarantine change · **no** DB application · **no** BCR `--apply` · **no** Supabase start · **no** Docker mutation · **no** LOCAL-007 execution · **no** LOCAL-007 evidence · **no** BCR IA-007 · **no** RU-1.4 · **no** REA · **no** EIR / Acceptance / Certification change.

---

## 31. Lock statement

```
DATABASE APPLICATION AUTHORIZATION     = E-02-DBA-LOCAL-007
DECISION                               = APPROVED WITH CONDITIONS
CONTROLLING AUTHORITY                  = PAD-012 / PAD-013 / PAD-018 / PAD-023 / PAD-030
NEXT RUNTIME CLASS                     = DATABASE APPLICATION ATTEMPT WITH ENHANCED DIAGNOSTICS
LOCAL-005                              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-006                              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-007                              = APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED
DIAGNOSTIC OBSERVABILITY               = IMPLEMENTED IN REPOSITORY / RUNTIME NOT YET EXERCISED
ROOT CAUSE                             = STILL NOT YET CAPTURED
AUTHORIZED ENVIRONMENT                 = LOCAL_DISPOSABLE_SUPABASE
DOCKER PRE-WARM                        = MANDATORY
CLEAN-BASE MODE                        = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
BASELINE MODE                          = E02_DECLARED_BASELINE_REPLAY
CURRENT ARTIFACT PIN                   = E-02-DBA-LOCAL-006
CURRENT ARTIFACT AUTHORITY             = E-02-BCR-IA-005
LOCAL-007 COMPATIBILITY                = INCOMPATIBLE / EXECUTION BLOCKED UNTIL SUCCESSOR BCR RETARGET
SUCCESSOR BCR IA                       = E-02-BCR-IA-007 EXPECTED / NOT CREATED THIS TASK
EXACT-MATCH MODEL                      = RETAINED
SUCCESS PATH                           = FULL GOVERNED CB-B DBA LIFECYCLE
FAILURE PATH                           = CAPTURE → PERSIST → CLEANUP → STOP → GOVERNANCE
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
NEXT                                   = ISSUE E-02-BCR-IA-007
                                         (LOCAL-006 → LOCAL-007 RETARGET)
DO NOT RETRY LOCAL-005/006 · DO NOT EXECUTE LOCAL-007 IN THIS TASK · DO NOT MODIFY THE ARTIFACT
```

---

**End of document — E-02-DBA-LOCAL-007 — v1.0 — 2026-08-24**
