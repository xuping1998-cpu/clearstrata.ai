# E-02 Database Application Evidence — E-02-DBA-LOCAL-009

| Field | Value |
|-------|-------|
| **Document Type** | Database Application Evidence (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-009** |
| **Authorization Reference** | [`E-02-Database-Application-Authorization-LOCAL-009.md`](E-02-Database-Application-Authorization-LOCAL-009.md) v1.0 |
| **BCR Artifact Authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-009.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-009.md) (E-02-BCR-IA-009 **CONSUMED**) · [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-009.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-009.md) (**COMPLETED WITH NOTES**) |
| **Predecessors** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-008.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-008.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-007.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-007.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md) — **immutable / not reclassified** |
| **Status** | **Issued — First and only stateful apply attempted — APPLICATION_FAILED (environment-guard after auxiliary start; governed replay not reached)** |
| **Revision** | v1.0 |
| **Effective Date** | 2026-08-25 |
| **Production Effect** | **None** |

```
OVERALL DATABASE APPLICATION RESULT     = APPLICATION_FAILED
FAILURE STAGE                           = ENVIRONMENT GUARD (after auxiliary init/start/status)
FAILURE TEXT                            = E02 guard: E02_ALLOW_DESTRUCTIVE_TESTS must equal "true"
                                          for destructive or DB-backed evidence paths
FIRST FAILING MIGRATION                 = NONE (governed replay not reached)
EXECUTED BEFORE FAILURE                 = 0
STATEFUL APPLY STARTED                  = YES
STATEFUL APPLY ATTEMPT COUNT            = 1
AUTHORIZATION CONSUMED                  = NO (E-02-DBA-LOCAL-009 NOT SUCCESSFULLY CONSUMED)
CLEAN-BASE MODE                         = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS (CB-B)
BASELINE MODE                           = E02_DECLARED_BASELINE_REPLAY
QUARANTINE                              = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINED MIGRATION SQL               = NOT EXECUTED
QUARANTINED MIGRATION RECORDED APPLIED  = NO
HMD-002 RESTORED MIGRATION REACHED      = NO
HMD-003 W1 / W2 REACHED                 = NO
DATABASE BASELINE VERIFIED              = NO
RPC INVOCATION                          = false
RU-1.4 TESTS                            = false
```

> **Result semantics (LOCAL-009 §18 / execution task §16):** `APPLICATION_FAILED` — governance/artifact, Docker warm, TCP 54323, and `--plan` gates **PASS**; `--apply --preserve-environment` **started**; auxiliary init/start/status **reached**; failure occurred at `validateEnvironmentGuard` **before** platform-baseline validation, application-layer reset, and governed replay. **Not** `BLOCKED` (pre-stateful gates passed; apply started). **Not** `APPLIED_BASELINE_FAILED`. Authorization **not successfully consumed**. **No second apply. No LOCAL-010. No process kill. No port remap. No REA.**

---

## 1. Files created / updated

| Path | Action |
|------|--------|
| `docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-009.md` | **Created** (this document) |
| `docs/implementation/README.md` | **Minimally updated** |
| `tests/e02/evidence/local-009-20260825a/bcr-replay-manifest.json` | **Created by artifact** |

**Not modified:** replay artifact · verifier · environment guard · `package.json` · migrations · W1 · W2 · HMD-002 restored file · tests · CB-B · launcher · diagnostics.  
**Not overwritten:** LOCAL-005 / LOCAL-006 / LOCAL-007 / LOCAL-008 evidence.

---

## 2. Pre-gate evidence — **PASS**

| ID | Check | Result |
|----|--------|--------|
| A | `EXPECTED_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-009` | **PASS** (artifact line 55) |
| B | `ARTIFACT_AUTHORIZATION_ID = E-02-BCR-IA-009` | **PASS** (artifact line 50) |
| C | Runtime env `E02_DBA_AUTHORIZATION_ID` | **PASS** |
| D | Exact-match fail-closed | **PASS** |
| E | Dual acceptance | **NONE** |
| F | LOCAL-009 **NOT CONSUMED** before apply | **PASS** |
| G | Completion-009 **COMPLETED WITH NOTES** | **PASS** |
| H | W1 exists | **PASS** `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql` |
| I | W2 exists | **PASS** `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` |
| J | Quarantine exactly `20260314195641_add_demo_data.sql` · count 1 | **PASS** |
| K | No newer authority superseding LOCAL-009 / IA-009 | **PASS** (no LOCAL-010 / IA-010) |

---

## 3. Docker warm evidence — **PASS**

| Field | Value |
|-------|-------|
| `docker version` Client | **29.7.2** |
| `docker version` Server / Engine | **29.7.2** |
| Docker Desktop | **4.87.0 (236836)** |
| Context | `desktop-linux` |
| Elapsed (`docker version`) | **189 ms** (gate) · **116 ms** (final recheck) |
| `docker ps` | empty |
| `docker ps -a` | empty |
| Container counts | running **0** · stopped **0** · total **0** |
| Cold-wake used as apply strategy | **NO** |

Engine was already responsive. Apply was **not** used to wake Docker.

---

## 4. TCP 54323 evidence — **PASS**

| Check | Result |
|-------|--------|
| `Get-NetTCPConnection -LocalPort 54323` | **no connections** |
| `netstat -ano` `:54323` | **no match** |
| Final pre-apply recheck | **FREE** |
| Occupant / PID | **NONE** |
| Process kill | **NONE / NOT AUTHORIZED** |
| Port remap | **NONE / NOT AUTHORIZED** |

Historical Weixin.exe occupancy was **not** assumed current.

---

## 5. `--plan` evidence — **PASS**

DB-free plan with `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-009`.

| Field | Value |
|-------|-------|
| result | **PLAN_OK** |
| startedAt / finishedAt | `2026-08-26T03:37:51.101Z` / `2026-08-26T03:37:52.650Z` |
| `expectedDbaAuthorizationId` | `E-02-DBA-LOCAL-009` |
| `artifactAuthorizationId` | `E-02-BCR-IA-009` |
| `environmentClass` | `LOCAL_DISPOSABLE_SUPABASE` |
| `cleanBaseMode` | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` |
| `baselineMode` | `E02_DECLARED_BASELINE_REPLAY` |
| quarantined | `20260314195641_add_demo_data.sql` |
| `quarantineCount` | **1** |
| `migrationCountDiscovered` | **285** |
| planned executable | **284** |
| W1 / W2 / HMD-002 restored file | present · **not quarantined** |

---

## 6. Final pre-apply recheck — **PASS then apply started**

| Field | Value |
|-------|-------|
| Docker | warm / responsive · containers **0** |
| TCP 54323 | **FREE** |
| LOCAL-009 | **NOT CONSUMED** |
| Prior LOCAL-009 stateful apply | **NONE** |
| `E02_DBA_AUTHORIZATION_ID` | `E-02-DBA-LOCAL-009` |
| `E02_BCR_APPLY_AUTHORIZED` | `true` |
| `E02_EVIDENCE_RUN_ID` | **`local-009-20260825a`** (fresh; unused before this run) |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **NOT SET** |
| `E02_BASELINE_VERIFICATION_AUTHORIZED` | **NOT SET** |
| `E02_ALLOW_DESTRUCTIVE_TESTS` | **NOT SET** (see §8) |

---

## 7. The single authorized apply

| Field | Value |
|-------|-------|
| Mode | `--apply --preserve-environment` |
| Runtime DBA | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-009` (exact match; validated in manifest) |
| APPLY_START | `2026-08-25T20:38:34.1885830-07:00` |
| APPLY_FINISH | `2026-08-25T20:39:43.7199114-07:00` |
| Manifest startedAt / finishedAt | `2026-08-26T03:38:35.121Z` / `2026-08-26T03:39:43.601Z` |
| APPLY_EXIT | **1** |
| `manifest.result` | **APPLICATION_FAILED** |
| Stateful apply started | **YES** |
| Stateful apply attempt count | **1** |
| Second apply | **NONE** |

---

## 8. Auxiliary environment / start / guard failure

| Field | Value |
|-------|-------|
| Environment | `LOCAL_DISPOSABLE_SUPABASE` |
| Clean base | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` |
| Auxiliary workdir (sanitized) | `<OS_TMP>/e02-bcr-aux-local-009-20260825a` |
| Fresh vs LOCAL-008 aux | **YES** (new run id) |
| Repo-root supabase used | **NO** |
| Auxiliary timestamped migrations before start | **0** (manifest) |
| Auxiliary init | **PASS** (start/status reached; `cliFailureClass=null`) |
| Auxiliary start | **PASS** (guard is after start+status; CLI failure class would be set if start failed) |
| Auxiliary status | **REACHED** (guard is after `parseAuxiliaryStatus`) |
| `auxiliaryProjectRef` | **null** (status JSON did not expose a project ref; recorded truthfully) |
| `environmentValidated` | **false** |
| Platform baseline | **NOT REACHED** (`platformBaselineReady=false`) |
| Initial app history | **NOT CHECKED** (default `applicationMigrationHistoryInitiallyEmpty=false`; replay never began) |
| Application-layer reset | **NOT REACHED** |
| Local DB target | auxiliary local only (URL not persisted) |

CLI start diagnostics: **unused** (`cliFailureClass=null`) — CLI stages did not throw. Failure was the existing environment guard.

```
failures[0] =
  E02 guard: E02_ALLOW_DESTRUCTIVE_TESTS must equal "true"
  for destructive or DB-backed evidence paths
```

The artifact calls `validateEnvironmentGuard({ requireDatabaseUrl: true })` **after** auxiliary init/start/status and **before** pg connect / replay. `E02_ALLOW_DESTRUCTIVE_TESTS=true` is a required input of the **existing** `environment-guard.ts` (also recorded on LOCAL-003–007 apply evidence). It was **not set** on this run. **No retry** is authorized to supply it after this apply started.

---

## 9. Governed replay / migration frontier

| Field | Value |
|-------|-------|
| Repo source | `supabase/migrations` |
| Discovered timestamped | **285** |
| Planned executable | **284** |
| Quarantine | `20260314195641_add_demo_data.sql` · **COUNT = 1** · **NOT executed** · **NOT recorded applied** |
| Executed successfully | **0** |
| Highest successfully applied | **NONE** |
| First failing migration | **NONE** (failure was not a migration) |
| Failed migration marked applied | **NO** (nothing recorded) |
| Truthful history | **YES** — executed 0; quarantine omitted; nothing fabricated |

---

## 10. HMD-002 evidence (this run)

| Item | Result |
|------|--------|
| `20260315035847_add_meeting_templates_and_attachments.sql` | **NOT REACHED / NOT APPLIED** |
| Historical parser failure (`syntax error at or near "1."`) | **NOT REPRODUCED** (file not executed) |
| File edited | **NO** |
| HMD-002 status | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT** — **not CLOSED** |

Do **not** close HMD-002 from LOCAL-008’s prior applied evidence. This run did not re-prove it.

---

## 11. HMD-003 evidence (this run)

| Checkpoint | Result |
|------------|--------|
| W1 `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql` | **NOT REACHED / NOT APPLIED** |
| Former LOCAL-008 frontier `20260320045054_enhance_dispute_resolution_system.sql` | **NOT REACHED / NOT APPLIED** |
| Prior error `relation "invoices" does not exist` | **NOT REPRODUCED** (replay never reached that file) |
| W2 `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` | **NOT REACHED / NOT APPLIED** |
| April HARD `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | **NOT REACHED / NOT APPLIED** |
| July S1 `20260711120000_invoice_ai_audit_v1.sql` | **NOT REACHED / NOT APPLIED** · file **unmodified** |
| HMD-003 status | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** — **not CLOSED** |

Required HMD-003 runtime checkpoints were **not** proven.

---

## 12. RU-1.1 / RU-1.2 / preserve / verifier

| Field | Value |
|-------|-------|
| RU-1.1 `20261729120000_create_owner_vote_primary_freeze_audits.sql` | **NOT REACHED** (`ru11Reached=false`) |
| RU-1.2 `20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql` | **NOT REACHED** (`ru12Reached=false`) |
| Preserve / `RUNNING_FOR_BASELINE_VERIFY` | **NOT REACHED** (failure-path cleanup ran instead) |
| Baseline verifier invoked | **NO** |
| Baseline verifier result | **NOT RUN** |
| Primary Audit baseline | **NOT RUN** |
| RU-1.2 metadata baseline | **NOT RUN** |
| RPC invocation | **false** |
| RU-1.4 tests | **false** |
| Destructive fixtures | **false** |

---

## 13. Cleanup / disposition

| Field | Value |
|-------|-------|
| Disposition | **`CLEANED_AFTER_FAILURE`** |
| `cleanupCompleted` | **true** |
| `cleanupWarnings` | **[]** |
| Auxiliary dir after cleanup | **ABSENT** |
| Docker containers after cleanup | **NONE** (`docker ps -a` empty) |
| TCP 54323 after cleanup | **FREE** |
| Process kill | **NONE** |
| Port remap | **NONE** |

---

## 14. Manifest

```
tests/e02/evidence/local-009-20260825a/bcr-replay-manifest.json
```

`result=APPLICATION_FAILED` · `migrationCountExecuted=0` · `validatedDbaAuthorizationId=E-02-DBA-LOCAL-009` · `failures=["E02 guard: E02_ALLOW_DESTRUCTIVE_TESTS must equal \"true\" for destructive or DB-backed evidence paths"]` · `environmentValidated=false` · `auxiliaryEnvironmentDisposition=CLEANED_AFTER_FAILURE`.

---

## 15. Next governance action

```
NEXT = RETURN TO GOVERNANCE
```

**Do not** retry LOCAL-009. **Do not** create LOCAL-010. **Do not** set missing guard env and re-`--apply`. **Do not** issue `E-02-RU-1.4-REA`. **Do not** edit W1/W2/HMD-002. **Do not** expand quarantine. **Do not** kill processes. **Do not** remap Studio.

---

## 16. Confirmation of no unauthorized work

**`--apply` ran exactly once.** No second apply. No source/migration/W1/W2/verifier/guard/package/test change. No process kill. No port remap. No container logs. No RU-1.2 RPC. No RU-1.4. No REA. No EIR. No Acceptance. No Certification. No commit.

---

## 17. Lock statement

```
E-02-DBA-LOCAL-009                         = NOT SUCCESSFULLY CONSUMED
DATABASE APPLICATION RESULT                = APPLICATION_FAILED
STATEFUL APPLY STARTED                     = YES
STATEFUL APPLY ATTEMPTS                    = 1
PRE-EXECUTION GATES                        = PASS (governance · Docker warm · TCP 54323 · --plan)
FAILURE STAGE                              = ENVIRONMENT GUARD AFTER AUXILIARY START
FAILURE TEXT                               = E02_ALLOW_DESTRUCTIVE_TESTS must equal "true"
FIRST FAILING MIGRATION                    = NONE
HIGHEST APPLIED                            = NONE
MIGRATIONS EXECUTED                        = 0
AUXILIARY INIT                             = PASS
AUXILIARY START                            = PASS
PLATFORM BASELINE                          = NOT REACHED
PRESERVE                                   = NOT REACHED
BASELINE VERIFIER                          = NOT RUN
CLEANUP                                    = CLEANED_AFTER_FAILURE
HMD-001                                    = OPEN / DISTINCT
HMD-002                                    = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT
HMD-003                                    = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
LOCAL-008                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = RETURN TO GOVERNANCE
```

---

**End of document — E-02-DBA-LOCAL-009 Evidence — v1.0 — 2026-08-25**
