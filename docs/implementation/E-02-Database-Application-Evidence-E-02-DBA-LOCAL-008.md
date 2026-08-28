# E-02 Database Application Evidence — E-02-DBA-LOCAL-008

| Field | Value |
|-------|-------|
| **Document Type** | Database Application Evidence (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-008** |
| **Authorization Reference** | [`E-02-Database-Application-Authorization-LOCAL-008.md`](E-02-Database-Application-Authorization-LOCAL-008.md) v1.0 |
| **BCR Artifact Authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-008.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-008.md) (E-02-BCR-IA-008 **CONSUMED**) · [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-008.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-008.md) (**COMPLETED WITH NOTES**) |
| **Predecessors** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-007.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-007.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md) — **immutable / not reclassified** |
| **Status** | **Issued — First and only stateful apply attempted — APPLICATION_FAILED (governed replay; first failing historical migration after restored file applied)** |
| **Revision** | v1.2 |
| **Effective Date** | 2026-08-25 |
| **Production Effect** | **None** |

```
OVERALL DATABASE APPLICATION RESULT     = APPLICATION_FAILED
FAILURE STAGE                           = GOVERNED REPLAY (after successful auxiliary start)
FIRST FAILING MIGRATION                 = 20260320045054_enhance_dispute_resolution_system.sql
DATABASE ERROR                          = relation "invoices" does not exist
EXECUTED BEFORE FAILURE                 = 32
STATEFUL APPLY STARTED                  = YES (first and only LOCAL-008 apply)
STATEFUL APPLY ATTEMPTS BEFORE THIS     = 0
v1.1 PRIOR RESULT                       = BLOCKED / STATEFUL_APPLY_NOT_STARTED (historical; apply count was 0)
AUTHORIZATION CONSUMED                  = NO (E-02-DBA-LOCAL-008 NOT SUCCESSFULLY CONSUMED)
CLEAN-BASE MODE                         = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS (CB-B)
BASELINE MODE                           = E02_DECLARED_BASELINE_REPLAY
QUARANTINE                              = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINED MIGRATION SQL               = NOT EXECUTED
QUARANTINED MIGRATION RECORDED APPLIED  = NO
RESTORED MIGRATION                      = 20260315035847_add_meeting_templates_and_attachments.sql
RESTORED MIGRATION REACHED              = YES
RESTORED MIGRATION APPLIED              = YES
PRIOR PARSER FAILURE REPRODUCED         = NO
HMD-002                                 = RUNTIME REPLAY VERIFIED (restored file applied; overall apply later failed)
HMD-001                                 = OPEN
RU-1.1                                  = NOT APPLIED (not reached)
RU-1.2                                  = NOT APPLIED (not reached)
DATABASE BASELINE VERIFIED              = NO
RPC INVOCATION                          = false
RU-1.4 TESTS                            = false
```

> **Result semantics (LOCAL-008 §27):** `APPLICATION_FAILED` — stateful `--apply --preserve-environment` **began** and failed during governed replay. **Not** `BLOCKED` (host gates passed; apply started). **Not** `APPLIED_BASELINE_FAILED`. Authorization **not successfully consumed**. **No second apply. No LOCAL-009. No process kill. No port remap. No REA.**

---

## 0. Distinction from v1.1 (BLOCKED / STATEFUL_APPLY_NOT_STARTED)

| Item | v1.1 (earlier 2026-08-25) | v1.2 (this continuation) |
|------|---------------------------|--------------------------|
| Result | **BLOCKED** | **APPLICATION_FAILED** |
| Blocking / failure | `STATEFUL_APPLY_NOT_STARTED` | governed replay at `20260320045054_enhance_dispute_resolution_system.sql` |
| Stateful apply started | **NO** | **YES** |
| evidenceRunId | `local-008-20260825a` allocated / unused | **`local-008-20260825b`** (fresh; used) |
| `--apply` | NOT RUN | **ONE** `--apply --preserve-environment` |
| Auxiliary start | NOT REACHED | **PASS** |
| Explicit confirmation | not completed | **YES** (this continuation task) |

v1.1 remains historical. This document’s **current** lock is v1.2.

---

## 1. Files created / updated

| Path | Action |
|------|--------|
| `docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-008.md` | **Updated** (this document, v1.2) |
| `docs/implementation/README.md` | **Minimally updated** |
| `tests/e02/evidence/local-008-20260825b/bcr-replay-manifest.json` | **Created by artifact** |

**Not modified:** replay artifact · verifier · environment guard · `package.json` · migrations · tests · CB-B · launcher · diagnostics.  
**Not overwritten:** LOCAL-005 / LOCAL-006 / LOCAL-007 evidence.

---

## 2. Short re-check (before this apply) — **PASS**

| # | Check | Result |
|---|-------|--------|
| A | LOCAL-008 exists and NOT CONSUMED | **PASS** |
| B | Artifact pin `EXPECTED_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-008` | **PASS** |
| C | Artifact authority `ARTIFACT_AUTHORIZATION_ID=E-02-BCR-IA-008` | **PASS** |
| D | Docker engine warm / responsive | **PASS** — Client/Server **29.7.2** · Desktop 4.87.0 · `docker version` **211 ms** · `docker ps -a` empty |
| E | TCP 54323 FREE / available for bind | **PASS** — `Get-NetTCPConnection` no connections; `netstat` no match; re-checked immediately before apply still **FREE** |
| F | No newer authority supersedes LOCAL-008 | **PASS** (no LOCAL-009 / IA-009) |
| G | `--plan` | **PLAN_OK** (`2026-08-25T22:51:56.808Z`–`22:51:58.522Z`) · expected DBA LOCAL-008 · artifact IA-008 · quarantineCount **1** |

Explicit confirmation accepted: **YES**.  
Stateful apply attempts before this: **0**.

---

## 3. The single authorized apply

| Field | Value |
|-------|-------|
| Mode | `--apply --preserve-environment` |
| Runtime DBA | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-008` (exact match) |
| `E02_BCR_APPLY_AUTHORIZED` | `true` |
| `E02_EVIDENCE_RUN_ID` | **`local-008-20260825b`** |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **NOT SET** |
| `E02_BASELINE_VERIFICATION_AUTHORIZED` | **NOT SET** (verifier never authorized; apply failed) |
| APPLY_START | `2026-08-25T15:52:52.5844554-07:00` |
| APPLY_FINISH | `2026-08-25T15:54:08.7579665-07:00` |
| Manifest startedAt / finishedAt | `2026-08-25T22:52:53.307Z` / `2026-08-25T22:54:08.575Z` |
| APPLY_EXIT | **1** |
| Second apply | **NONE** |

---

## 4. Auxiliary environment / start

| Field | Value |
|-------|-------|
| Environment | `LOCAL_DISPOSABLE_SUPABASE` |
| Clean base | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` |
| Auxiliary workdir (sanitized) | `<OS_TMP>/e02-bcr-aux-local-008-20260825b` |
| Fresh vs LOCAL-005/006/007 aux | **YES** (new run id) |
| Repo-root supabase used | **NO** |
| Auxiliary init | **PASS** (start reached) |
| Auxiliary timestamped migrations before start | **0** |
| Auxiliary start | **PASS** |
| Platform baseline | **REACHED** (`platformBaselineReady=true`) |
| auth / storage | **PRESENT** (artifact would STOP if missing) |
| Environment validated (local guard) | **true** (`projectRef=127.0.0.1`) |
| Initial app history empty | **true** |
| Application-layer reset | **INVOKED** (replay then began) |
| Local DB target | auxiliary local only (URL not persisted) |

CLI start diagnostics: **unused** (`cliFailureClass=null`) — start **succeeded**; failure was SQL replay, not `supabase` CLI.

---

## 5. Governed replay

| Field | Value |
|-------|-------|
| Repo source | `supabase/migrations` |
| Discovered timestamped | **283** |
| Planned executable | **282** |
| Quarantine | `20260314195641_add_demo_data.sql` · **COUNT = 1** · **NOT executed** · **NOT recorded applied** |
| Executed successfully | **32** |
| Restored `20260315035847_add_meeting_templates_and_attachments.sql` | **REACHED and APPLIED** (16th successful executable; after `20260315033923`) |
| Prior parser failure (`syntax error at or near "1."`) | **NOT reproduced** |
| First failing migration | **`20260320045054_enhance_dispute_resolution_system.sql`** |
| Failure text | `relation "invoices" does not exist` |
| Highest successfully applied | **`20260320044053_create_meeting_voting_system.sql`** |
| Failed migration marked applied | **NO** |
| Truthful history | **YES** — 32 executed recorded; failing file not marked applied; quarantine omitted |
| RU-1.1 | **NOT REACHED** |
| RU-1.2 | **NOT REACHED** |

The 32 successful executables (quarantine omitted) were, in order:

`20260314034834` … through `20260315033923`, then restored `20260315035847`, then `20260315163805` … through `20260320044053_create_meeting_voting_system.sql`.

---

## 6. Preserve / verifier / RU-1.4

| Field | Value |
|-------|-------|
| Preserve / `RUNNING_FOR_BASELINE_VERIFY` | **NOT REACHED** (failure-path cleanup ran instead) |
| Baseline verifier | **NOT RUN** |
| Primary Audit baseline | **NOT RUN** |
| RU-1.2 metadata baseline | **NOT RUN** |
| RPC invocation | **false** |
| RU-1.4 tests | **false** |
| Destructive fixtures | **false** |

---

## 7. Cleanup / disposition

| Field | Value |
|-------|-------|
| Disposition | **`CLEANED_AFTER_FAILURE`** |
| `cleanupCompleted` | **true** |
| Auxiliary dir after cleanup | **ABSENT** (`Test-Path` false) |
| Docker containers after cleanup | **NONE** (`docker ps -a` empty) |
| Process kill | **NONE** |
| Port remap | **NONE** |

---

## 8. Manifest

```
tests/e02/evidence/local-008-20260825b/bcr-replay-manifest.json
```

`result=APPLICATION_FAILED` · `migrationCountExecuted=32` · `failures=["20260320045054_enhance_dispute_resolution_system.sql: relation \"invoices\" does not exist"]` · `validatedDbaAuthorizationId=E-02-DBA-LOCAL-008`.

---

## 9. Next governance action

```
NEXT = RETURN TO GOVERNANCE
```

**Do not** retry LOCAL-008. **Do not** auto-create LOCAL-009. **Do not** issue `E-02-RU-1.4-REA`. **Do not** kill processes. **Do not** remap Studio. **Do not** expand quarantine or repair migrations in this evidence task.

---

## 10. Confirmation of no unauthorized work

**`--apply` ran exactly once.** No second apply. No source/migration/verifier/guard/package/test change. No process kill. No port remap. No container logs. No RU-1.2 RPC. No RU-1.4. No REA. No commit.

---

## 11. Lock statement

```
E-02-DBA-LOCAL-008                         = NOT SUCCESSFULLY CONSUMED
DATABASE APPLICATION RESULT                = APPLICATION_FAILED
v1.1                                       = BLOCKED / STATEFUL_APPLY_NOT_STARTED (historical)
THIS EXECUTION                             = FIRST AND ONLY AUTHORIZED STATEFUL APPLY
PRE-EXECUTION / SHORT RE-CHECK             = PASS
DOCKER ENGINE PRE-WARM                     = PASS
COLD WAKE DURING APPLY                     = NO
TCP 54323                                  = FREE
TCP 54323 GATE                             = PASS
PROCESS KILL                               = NONE / NOT AUTHORIZED
PORT REMAP                                 = NONE / NOT AUTHORIZED
STATEFUL SUPABASE                          = YES (auxiliary start PASS; replay FAIL)
AUXILIARY START                            = PASS
MIGRATIONS EXECUTED                        = 32
RESTORED MIGRATION                         = REACHED / APPLIED (parser failure not reproduced)
FIRST FAILING MIGRATION                    = 20260320045054_enhance_dispute_resolution_system.sql
HIGHEST APPLIED                            = 20260320044053_create_meeting_voting_system.sql
HMD-001                                    = OPEN
HMD-002                                    = RUNTIME REPLAY VERIFIED
RU-1.1                                     = NOT APPLIED
RU-1.2                                     = NOT APPLIED
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
LOCAL-007                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-008                                  = NOT SUCCESSFULLY CONSUMED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = RETURN TO GOVERNANCE
```

---

**End of document — E-02-DBA-LOCAL-008 Evidence — v1.2 — 2026-08-25**
