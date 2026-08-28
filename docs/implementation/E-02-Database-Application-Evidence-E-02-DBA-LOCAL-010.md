# E-02 Database Application Evidence — E-02-DBA-LOCAL-010

| Field | Value |
|-------|-------|
| **Document Type** | Database Application Evidence (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-010** |
| **Authorization Reference** | [`E-02-Database-Application-Authorization-LOCAL-010.md`](E-02-Database-Application-Authorization-LOCAL-010.md) v1.0 |
| **BCR Artifact Authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-010.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-010.md) (E-02-BCR-IA-010 **CONSUMED**) · [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-010.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-010.md) (**COMPLETED WITH NOTES**) |
| **Guard clarification** | [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) (**DAA-014-C** · **ISSUED**) |
| **Predecessors** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-009.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-009.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-008.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-008.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-007.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-007.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md) — **immutable / not reclassified** |
| **Status** | **Issued — Event 1 BLOCKED (Docker cold) · Event 2 resume BLOCKED (engine still cold) · Event 3: first and only stateful apply — APPLICATION_FAILED** |
| **Revision** | v1.0 |
| **Effective Date** | 2026-08-26 |
| **Production Effect** | **None** |

> **Controlling latest result is Event 3** (`APPLICATION_FAILED`). Event 1 and Event 2 remain **historical pre-stateful `BLOCKED`** records and are **not** reclassified as `APPLICATION_FAILED`. Stateful apply attempt count became **1** only in Event 3.

```
CONTROLLING DATABASE APPLICATION RESULT = APPLICATION_FAILED
EVENT 3 FAILURE STAGE                   = GOVERNED REPLAY AT 20260320045054_enhance_dispute_resolution_system.sql
EVENT 3 FAILURE TEXT                    = syntax error at or near "category"
STATEFUL APPLY STARTED                  = YES (Event 3 only)
STATEFUL APPLY ATTEMPT COUNT            = 1
AUTHORIZATION CONSUMED                  = NO (E-02-DBA-LOCAL-010 NOT SUCCESSFULLY CONSUMED)
```

---

## Event 1 historical overall (immutable — not the controlling result)

```
OVERALL DATABASE APPLICATION RESULT     = BLOCKED
FAILURE STAGE                           = GATE 2 — DOCKER ENGINE NOT ALREADY WARM / NOT RESPONSIVE
FAILURE TEXT                            = docker version Client 29.7.2 responded;
                                          Server failed: cannot connect to
                                          npipe:////./pipe/dockerDesktopLinuxEngine
FIRST FAILING MIGRATION                 = NONE (governed replay not reached)
EXECUTED BEFORE FAILURE                 = 0
STATEFUL APPLY STARTED                  = NO
STATEFUL APPLY ATTEMPT COUNT            = 0
AUTHORIZATION CONSUMED                  = NO (E-02-DBA-LOCAL-010 NOT CONSUMED)
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

> **Result semantics (LOCAL-010 §20 / execution task §20):** `BLOCKED` — Gate 1 (governance/artifact) **PASS**; Gate 3 (TCP 54323) **PASS**; Gate 4 (`--plan`) **PASS**; Gate 2 (Docker already warm/responsive) **FAIL**. `--apply --preserve-environment` **never started**. **Not** `APPLICATION_FAILED` (pre-stateful interruption). **Not** `APPLIED_BASELINE_FAILED`. Authorization **NOT CONSUMED**. **No apply. No retry-as-apply. No Docker start used to pass the gate. No LOCAL-011. No process kill. No port remap. No REA.**

---

## 1. Files created / updated

| Path | Action |
|------|--------|
| `docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-010.md` | **Created** (this document) |
| `docs/implementation/README.md` | **Minimally updated** |

**Not created:** `tests/e02/evidence/local-010-*` (no apply; no evidenceRunId allocated).  
**Not modified:** replay artifact · verifier · environment guard · `package.json` · migrations · W1 · W2 · HMD-002 restored file · tests · CB-B · launcher · diagnostics · Docker.  
**Not overwritten:** LOCAL-009 or earlier evidence.

---

## 2. Gate 1 — governance / artifact — **PASS**

| ID | Check | Result |
|----|--------|--------|
| A | `EXPECTED_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-010` | **PASS** (artifact line 55) |
| B | `ARTIFACT_AUTHORIZATION_ID = E-02-BCR-IA-010` | **PASS** (artifact line 50) |
| C | Runtime env name `E02_DBA_AUTHORIZATION_ID` | **PASS** |
| D | Exact-match fail-closed | **PASS** (`raw !== EXPECTED_DBA_AUTHORIZATION_ID`) |
| E | Dual acceptance | **NONE** |
| F | E-02-BCR-IA-010 **CONSUMED** | **PASS** (ledger + Completion-010) |
| G | Completion-010 **COMPLETED WITH NOTES** | **PASS** |
| H | LOCAL-010 **NOT CONSUMED / NOT EXECUTED** before this task | **PASS** |
| I | W1 exists | **PASS** `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql` |
| J | W2 exists | **PASS** `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` |
| K | Quarantine exactly `20260314195641_add_demo_data.sql` · count 1 | **PASS** |

---

## 3. Gate 2 — Docker engine already warm — **FAIL**

Read-only. **No** Docker start. **No** apply used to wake Docker.

| Field | Value |
|-------|-------|
| `docker version` Client | **29.7.2** (API 1.55 · windows/amd64 · context `desktop-linux`) |
| `docker version` Server / Engine | **UNREACHABLE** |
| Elapsed (`docker version`) | **208 ms** |
| Server error | `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine; check if the path is correct and if the daemon is running: open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.` |
| `docker ps` / `docker ps -a` | **FAILED** (same npipe error) |
| Container counts | **NOT OBSERVABLE** (daemon unreachable; CLI exit non-zero) |
| `\\.\pipe\dockerDesktopLinuxEngine` | **ABSENT** (`Test-Path` = False) |
| `\\.\pipe\docker_engine` | **ABSENT** (`Test-Path` = False) |
| Processes `Docker Desktop` / `com.docker.backend` / `com.docker.service` | **NONE** |
| `docker info` | Client 29.7.2 only; daemon not connected (exit **-1**) |
| Cold-wake used as apply strategy | **NO** |
| Docker mutated to pass gate | **NO** |

```
DOCKER ENGINE = NOT ALREADY WARM / NOT RESPONSIVE
GATE 2        = FAIL
```

---

## 4. Gate 3 — TCP 54323 — **PASS** (not used for apply)

| Check | Result |
|-------|--------|
| `Get-NetTCPConnection -LocalPort 54323` | **no connections** |
| `netstat -ano` `:54323` | **no match** |
| Occupant / PID | **NONE** |
| Process kill | **NONE / NOT AUTHORIZED** |
| Port remap | **NONE / NOT AUTHORIZED** |

Historical Weixin.exe occupancy was **not** assumed current. Port was **FREE**, but Gate 2 already stopped execution.

---

## 5. Gate 4 — fresh DB-free `--plan` — **PASS** (not used for apply)

DB-free plan with `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-010`. **No** `--apply`. `E02_BCR_APPLY_AUTHORIZED` **not set**. `E02_ALLOW_DESTRUCTIVE_TESTS` **not set**. `E02_RUNTIME_EXECUTION_AUTHORIZED` **unset**. `E02_BASELINE_VERIFICATION_AUTHORIZED` **unset**.

| Field | Value |
|-------|-------|
| result | **PLAN_OK** |
| startedAt / finishedAt | `2026-08-27T03:01:44.586Z` / `2026-08-27T03:01:46.554Z` |
| `expectedDbaAuthorizationId` | `E-02-DBA-LOCAL-010` |
| `artifactAuthorizationId` | `E-02-BCR-IA-010` |
| `environmentClass` | `LOCAL_DISPOSABLE_SUPABASE` |
| `cleanBaseMode` | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` |
| `baselineMode` | `E02_DECLARED_BASELINE_REPLAY` |
| quarantined | `20260314195641_add_demo_data.sql` |
| `quarantineCount` | **1** |
| `migrationCountDiscovered` | **285** |
| planned executable | **284** |
| W1 | present · **executable / not quarantined** |
| W2 | present · **executable / not quarantined** |
| HMD-002 restored `20260315035847_add_meeting_templates_and_attachments.sql` | present · **executable / not quarantined** |

---

## 6. Final pre-apply recheck — **NOT REACHED**

Gate 2 failed. No evidenceRunId was allocated. No apply env-var set for stateful use.

| Field | Value |
|-------|-------|
| Docker recheck | **NOT PERFORMED** (Gate 2 already FAIL) |
| TCP 54323 | **FREE** at Gate 3 (unused) |
| LOCAL-010 | **NOT CONSUMED** |
| Prior LOCAL-010 stateful apply | **NONE** |
| `E02_EVIDENCE_RUN_ID` | **NOT ALLOCATED** |
| Stateful apply started | **NO** |

---

## 7. Technical environment inputs

| Variable | This task |
|----------|-----------|
| `E02_DBA_AUTHORIZATION_ID` | `E-02-DBA-LOCAL-010` **for `--plan` only** |
| `E02_BCR_APPLY_AUTHORIZED` | **NOT SET** |
| `E02_ALLOW_DESTRUCTIVE_TESTS` | **NOT SET** |
| `E02_EVIDENCE_ENV` | **NOT SET** |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **UNSET / FALSE** |
| `E02_BASELINE_VERIFICATION_AUTHORIZED` | **UNSET** |

Named LOCAL-010 apply inputs were **not** set because apply never started.

---

## 8. The single authorized apply — **NOT RUN**

| Field | Value |
|-------|-------|
| Mode | `--apply --preserve-environment` |
| Executed | **NO** |
| Stateful apply started | **NO** |
| Stateful apply attempt count | **0** |
| Second apply | **NONE** |

---

## 9. Auxiliary environment / start / guard

| Field | Value |
|-------|-------|
| Auxiliary init | **NOT RUN** |
| Auxiliary start | **NOT RUN** |
| Environment guard | **NOT RUN** |
| Platform baseline | **NOT REACHED** |
| Application-layer reset | **NOT REACHED** |
| Local DB target | **NONE** |

---

## 10. Governed replay / migration frontier

| Field | Value |
|-------|-------|
| Repo source | `supabase/migrations` |
| Discovered timestamped | **285** (plan) |
| Planned executable | **284** (plan) |
| Quarantine | `20260314195641_add_demo_data.sql` · **COUNT = 1** · **NOT executed** |
| Executed successfully | **0** |
| Highest successfully applied | **NONE** |
| First failing migration | **NONE** |
| Truthful history | **YES** — apply never started; nothing fabricated |

---

## 11. HMD-002 evidence (this run)

| Item | Result |
|------|--------|
| `20260315035847_add_meeting_templates_and_attachments.sql` | **NOT REACHED / NOT APPLIED** |
| Historical parser failure (`syntax error at or near "1."`) | **NOT REACHED** |
| File edited | **NO** |
| HMD-002 status | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT** — **not CLOSED** |

---

## 12. HMD-003 evidence (this run)

| Checkpoint | Result |
|------------|--------|
| W1 `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql` | **NOT REACHED / NOT APPLIED** |
| Former LOCAL-008 frontier `20260320045054_enhance_dispute_resolution_system.sql` | **NOT REACHED / NOT APPLIED** |
| Prior error `relation "invoices" does not exist` | **NOT REACHED** |
| W2 `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` | **NOT REACHED / NOT APPLIED** |
| April HARD `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | **NOT REACHED / NOT APPLIED** |
| July S1 `20260711120000_invoice_ai_audit_v1.sql` | **NOT REACHED / NOT APPLIED** · file **unmodified** |
| HMD-003 status | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** — **not CLOSED** |

---

## 13. RU-1.1 / RU-1.2 / preserve / verifier

| Field | Value |
|-------|-------|
| RU-1.1 | **NOT REACHED** |
| RU-1.2 | **NOT REACHED** |
| RPC invocation | **false** |
| Preserve / handoff | **NOT REACHED** |
| Baseline verifier invoked | **NO** |
| Baseline verifier result | **NOT RUN** |
| Primary Audit baseline | **NOT RUN** |
| RU-1.2 metadata baseline | **NOT RUN** |
| RU-1.4 tests | **false** |
| Destructive fixtures | **false** |

---

## 14. Cleanup / disposition

| Field | Value |
|-------|-------|
| Disposition | **NONE** (no auxiliary environment created) |
| Cleanup | **NOT REQUIRED** |
| Process kill | **NONE** |
| Port remap | **NONE** |
| Docker mutation | **NONE** |

---

## 15. Manifest

**NONE.** No `E02_EVIDENCE_RUN_ID`. No `tests/e02/evidence/local-010-*` directory.

---

## 16. Next governance action

```
NEXT = RETURN TO GOVERNANCE
```

LOCAL-010 remains **NOT CONSUMED** because the interruption was **pre-stateful**. Docker engine must already be warm/responsive **before** any future governed `--apply`. This evidence does **not** authorize starting Docker as part of apply. **Do not** retry LOCAL-009. **Do not** create LOCAL-011 from this block. **Do not** issue `E-02-RU-1.4-REA`. **Do not** edit W1/W2/HMD-002. **Do not** expand quarantine. **Do not** kill processes. **Do not** remap Studio.

---

## 17. Confirmation of no unauthorized work

**`--apply` was not run.** No second apply. No source/migration/W1/W2/verifier/guard/package/test change. No Docker start. No process kill. No port remap. No container logs. No RU-1.2 RPC. No RU-1.4. No REA. No EIR. No Acceptance. No Certification. No commit.

---

## 18. Lock statement

```
E-02-DBA-LOCAL-010                         = NOT CONSUMED
DATABASE APPLICATION RESULT                = BLOCKED
STATEFUL APPLY STARTED                     = NO
STATEFUL APPLY ATTEMPTS                    = 0
PRE-EXECUTION GATES                        = Gate 1 PASS · Gate 2 FAIL · Gate 3 PASS · Gate 4 PASS
FAILURE STAGE                              = DOCKER ENGINE NOT ALREADY WARM / NOT RESPONSIVE
FIRST FAILING MIGRATION                    = NONE
HIGHEST APPLIED                            = NONE
MIGRATIONS EXECUTED                        = 0
AUXILIARY INIT                             = NOT RUN
AUXILIARY START                            = NOT RUN
ENVIRONMENT GUARD                          = NOT RUN
PLATFORM BASELINE                          = NOT REACHED
PRESERVE                                   = NOT REACHED
BASELINE VERIFIER                          = NOT RUN
CLEANUP                                    = NOT REQUIRED
HMD-001                                    = OPEN / DISTINCT
HMD-002                                    = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT
HMD-003                                    = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
LOCAL-009                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = RETURN TO GOVERNANCE
```

---

**End of Event 1 — historical Docker-cold BLOCKED evidence (immutable) — 2026-08-26**

---

# Event 2 — RESUME AFTER HOST READINESS *(2026-08-26)*

> **This section does not erase Event 1.** Event 1 remains: `BLOCKED` · `STATEFUL APPLY STARTED = NO` · `STATEFUL APPLY ATTEMPT COUNT = 0`. This resume is **not** a retry of a failed stateful apply. LOCAL-011 was **not** created. No new DBA / BCR IA was issued.

```
PREVIOUS RESULT                         = BLOCKED
PREVIOUS BLOCKING STAGE                 = PRE-STATEFUL HOST READINESS / DOCKER ENGINE NOT ALREADY WARM
PREVIOUS STATEFUL APPLY STARTED         = NO
PREVIOUS STATEFUL APPLY ATTEMPT COUNT   = 0
THIS RESUME RESULT                      = BLOCKED
THIS RESUME BLOCKING STAGE              = GATE B — DOCKER ENGINE STILL NOT ALREADY WARM / NOT RESPONSIVE
THIS RESUME STATEFUL APPLY STARTED      = NO
TOTAL LOCAL-010 STATEFUL APPLY ATTEMPTS = 0
AUTHORIZATION CONSUMED                  = NO
```

## Event 2 §1 — Gate A — governance / artifact recheck — **PASS**

| Check | Result |
|-------|--------|
| LOCAL-010 | **APPROVED WITH CONDITIONS / NOT CONSUMED** |
| E-02-BCR-IA-010 | **CONSUMED** |
| Completion-010 | **COMPLETED WITH NOTES** |
| `EXPECTED_DBA_AUTHORIZATION_ID` | `E-02-DBA-LOCAL-010` |
| `ARTIFACT_AUTHORIZATION_ID` | `E-02-BCR-IA-010` |
| Runtime env name | `E02_DBA_AUTHORIZATION_ID` |
| Exact-match | **FAIL-CLOSED** |
| Dual acceptance | **NONE** |
| W1 | **EXISTS** `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql` |
| W2 | **EXISTS** `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` |
| Quarantine | exactly `20260314195641_add_demo_data.sql` · **COUNT 1** |
| Event 1 evidence | **BLOCKED / STATEFUL APPLY STARTED NO / ATTEMPT COUNT 0** |
| Later DBA / BCR superseding LOCAL-010 | **NONE** (no LOCAL-011 / IA-011) |

## Event 2 §2 — Gate B — Docker already warm — **FAIL**

Read-only. **No** Docker start / restart / wake. Client-only response is **not** sufficient.

| Field | Value |
|-------|-------|
| `docker version` Client | **29.7.2** (API 1.55 · windows/amd64 · context `desktop-linux`) |
| `docker version` Server / Engine | **UNREACHABLE** |
| Elapsed (`docker version`) | **292 ms** |
| Server error | `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine` |
| `\\.\pipe\dockerDesktopLinuxEngine` | **ABSENT** |
| `\\.\pipe\docker_engine` | **ABSENT** |
| Processes `Docker Desktop` / `com.docker.backend` / `com.docker.service` | **NONE** |
| `docker ps` / `docker ps -a` | **FAILED** (same npipe error) |
| Container counts | **NOT OBSERVABLE** |
| Docker mutated to pass gate | **NO** |

```
DOCKER CLIENT = RESPONSIVE
DOCKER SERVER / ENGINE = NOT RESPONSIVE
ENGINE = NOT ALREADY WARM
GATE B = FAIL
```

## Event 2 §3 — Gate C — TCP 54323 — **PASS** (unused; Gate B already FAIL)

| Check | Result |
|-------|--------|
| `Get-NetTCPConnection -LocalPort 54323` | **no connections** |
| `netstat -ano` `:54323` | **no match** |
| Occupant / PID | **NONE** |
| Process kill | **NONE** |
| Port remap | **NONE** |

## Event 2 §4 — Gate D — fresh `--plan` — **PASS** (unused for apply)

DB-free. `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-010`. Apply flags **not set**. `E02_RUNTIME_EXECUTION_AUTHORIZED` **unset**.

| Field | Value |
|-------|-------|
| result | **PLAN_OK** |
| startedAt / finishedAt | `2026-08-27T03:08:04.728Z` / `2026-08-27T03:08:04.790Z` |
| `expectedDbaAuthorizationId` | `E-02-DBA-LOCAL-010` |
| `artifactAuthorizationId` | `E-02-BCR-IA-010` |
| `environmentClass` | `LOCAL_DISPOSABLE_SUPABASE` |
| `cleanBaseMode` | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` |
| `baselineMode` | `E02_DECLARED_BASELINE_REPLAY` |
| quarantined | `20260314195641_add_demo_data.sql` |
| `quarantineCount` | **1** |
| `migrationCountDiscovered` | **285** |
| planned executable | **284** |
| W1 / W2 / HMD-002 restored | **executable / not quarantined** |

## Event 2 §5 — Final pre-stateful checkpoint — **NOT REACHED**

Gate B failed. No evidenceRunId allocated. No `--apply`.

| Field | Value |
|-------|-------|
| Fresh evidenceRunId | **NOT ALLOCATED** |
| `E02_BCR_APPLY_AUTHORIZED` | **NOT SET** |
| `E02_ALLOW_DESTRUCTIVE_TESTS` | **NOT SET** |
| `E02_EVIDENCE_ENV` | **NOT SET** |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **UNSET / FALSE** |
| Stateful apply started | **NO** |
| Total LOCAL-010 stateful apply attempts | **0** |

## Event 2 §6 — Runtime checkpoints

All **NOT REACHED** (apply never started): auxiliary init/start · environment guard · platform baseline · HMD-002 · W1 · former LOCAL-008 frontier · W2 · April HARD · July S1 · RU-1.1 / RU-1.2 · preserve · baseline verifier.

## Event 2 §7 — Lock

```
E-02-DBA-LOCAL-010                         = NOT CONSUMED
DATABASE APPLICATION RESULT                = BLOCKED
BLOCKING STAGE                             = PRE-STATEFUL HOST READINESS
STATEFUL APPLY STARTED                     = NO
TOTAL LOCAL-010 STATEFUL APPLY ATTEMPTS    = 0
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
NEXT                                       = RETURN TO GOVERNANCE / HOST READINESS
```

Cursor **did not** start, restart, wake, or mutate Docker. Host engine readiness remains an **external** precondition.

---

**End of Event 2 — historical second pre-stateful BLOCKED (immutable)**

---

# Event 3 — FIRST AND ONLY STATEFUL APPLY *(2026-08-26)*

> Event 1 and Event 2 remain historical `BLOCKED` / apply-never-started. This Event 3 is **not** a retry of a failed apply (prior attempts = 0). It is LOCAL-010’s **single authorized** `--apply --preserve-environment`. **No second apply.**

```
DATABASE APPLICATION RESULT             = APPLICATION_FAILED
E-02-DBA-LOCAL-010                      = NOT SUCCESSFULLY CONSUMED
STATEFUL APPLY STARTED                  = YES
STATEFUL APPLY ATTEMPT COUNT            = 1
FAILURE STAGE                           = GOVERNED REPLAY
FIRST FAILING MIGRATION                 = 20260320045054_enhance_dispute_resolution_system.sql
FAILURE TEXT                            = syntax error at or near "category"
EXECUTED BEFORE FAILURE                 = 33
HIGHEST SUCCESSFULLY APPLIED            = 20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql (W1)
ENVIRONMENT GUARD                       = PASS
PLATFORM BASELINE                       = PASS
OLD INVOICES ERROR                      = NOT REPRODUCED
```

## Event 3 §1 — Pre-execution gates — **PASS**

| Gate | Result |
|------|--------|
| 1 Governance / artifact | **PASS** (pin LOCAL-010 / IA-010; IA-010 CONSUMED; Completion-010 COMPLETED WITH NOTES; LOCAL-010 NOT CONSUMED before apply; W1/W2 present; quarantine count 1) |
| 2 Docker already warm | **PASS** — Client **29.7.2** · Server Engine **29.7.2** · Docker Desktop **4.87.0 (236836)** · elapsed **111 ms** (gate) / **115 ms** (final recheck) · pipes present · `docker ps`/`ps -a` empty · running **0** / all **0** |
| 3 TCP 54323 | **PASS** — **FREE** (no connections; occupant **NONE**) |
| 4 Fresh `--plan` | **PASS** — `PLAN_OK` · `2026-08-27T03:26:26.688Z` / `2026-08-27T03:26:28.144Z` · expected DBA LOCAL-010 · artifact IA-010 · discovered **285** · executable **284** · quarantineCount **1** |

Final pre-apply recheck: Docker warm · TCP **FREE** · LOCAL-010 **NOT CONSUMED** · prior stateful apply count **0**.

## Event 3 §2 — Technical environment / run id

| Variable | Value |
|----------|-------|
| `E02_EVIDENCE_RUN_ID` | **`local-010-20260826a`** (fresh; unused before this apply) |
| `E02_DBA_AUTHORIZATION_ID` | `E-02-DBA-LOCAL-010` (exact match; `validatedDbaAuthorizationId` same) |
| `E02_BCR_APPLY_AUTHORIZED` | `true` |
| `E02_ALLOW_DESTRUCTIVE_TESTS` | `true` (technical fail-closed input only; **not** fixture/RU-1.4/RPC/REA) |
| `E02_EVIDENCE_ENV` | `local` |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **UNSET** |
| `E02_BASELINE_VERIFICATION_AUTHORIZED` | **UNSET** (not set during apply) |

Guard stdout: `[e02-guard] evidenceRunId=local-010-20260826a env=local projectRef=127.0.0.1 host=127.0.0.1:54321`

## Event 3 §3 — The single authorized apply

| Field | Value |
|-------|-------|
| Mode | `--apply --preserve-environment` |
| APPLY_START | `2026-08-26T20:27:01.6434330-07:00` |
| APPLY_FINISH | `2026-08-26T20:28:54.1487133-07:00` |
| Manifest startedAt / finishedAt | `2026-08-27T03:27:02.572Z` / `2026-08-27T03:28:54.006Z` |
| APPLY_EXIT | **1** |
| `manifest.result` | **APPLICATION_FAILED** |
| Stateful apply started | **YES** |
| Stateful apply attempt count | **1** |
| Second apply | **NONE** |

## Event 3 §4 — Auxiliary / guard / platform baseline

| Field | Value |
|-------|-------|
| Auxiliary workdir (sanitized) | `<OS_TMP>/e02-bcr-aux-local-010-20260826a` |
| Aux timestamped migrations before start | **0** |
| Auxiliary init | **PASS** (start/status/guard reached; `cliFailureClass=null`) |
| Auxiliary start | **PASS** |
| Auxiliary status | **REACHED** |
| Environment guard | **PASS** (`environmentValidated=true`) |
| Platform baseline | **PASS** (`platformBaselineReady=true`) |
| Initial app history empty | **YES** (`applicationMigrationHistoryInitiallyEmpty=true`) |
| Application-layer reset | **REACHED** (replay began) |
| CLI failure class | **null** (failure was SQL in governed replay, not CLI start) |
| `auxiliaryProjectRef` | **null** (status JSON did not expose a project ref) |

## Event 3 §5 — Governed replay / migration frontier

| Field | Value |
|-------|-------|
| Repo source | `supabase/migrations` |
| Discovered timestamped | **285** |
| Planned executable | **284** |
| Quarantine | `20260314195641_add_demo_data.sql` · **COUNT 1** · **NOT executed** · **NOT recorded applied** |
| Executed successfully | **33** |
| Highest successfully applied | **`20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql`** (executable index **33**) |
| First failing migration | **`20260320045054_enhance_dispute_resolution_system.sql`** (executable index **34**) |
| Failure text | `syntax error at or near "category"` |
| Failed migration marked applied | **NO** |
| Truthful history | **YES** — executed 33; quarantine omitted; failing file not recorded applied |

Deterministic executable order (quarantine omitted) was used with `migrationCountExecuted=33` to identify the highest applied file. Applied state was **not** inferred from log proximity.

LOCAL-008 previously failed at the **same file** with `relation "invoices" does not exist` after **32** executed. This run executed **33** (W1) then failed at the same file with a **different** error.

## Event 3 §6 — HMD-002 checkpoint

| Item | Result |
|------|--------|
| `20260315035847_add_meeting_templates_and_attachments.sql` | **REACHED / APPLIED** (executable index **16** of 33 applied) |
| Historical parser failure (`syntax error at or near "1."`) | **NO** (not reproduced) |
| File edited this task | **NO** |
| HMD-002 overall status | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT** — **not CLOSED** (full replay `APPLICATION_FAILED`) |

## Event 3 §7 — HMD-003 checkpoints

| Checkpoint | Result |
|------------|--------|
| W1 `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql` | **REACHED / APPLIED** (highest applied; index **33**) |
| Former LOCAL-008 frontier `20260320045054_enhance_dispute_resolution_system.sql` | **REACHED / NOT APPLIED** |
| Prior error `relation "invoices" does not exist` | **NOT REPRODUCED** |
| Actual frontier error | `syntax error at or near "category"` |
| W2 `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` | **NOT REACHED / NOT APPLIED** (index 74) |
| April HARD `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | **NOT REACHED / NOT APPLIED** (index 75) |
| July S1 `20260711120000_invoice_ai_audit_v1.sql` | **NOT REACHED / NOT APPLIED** (index 145) · file **unmodified** |
| HMD-003 status | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** — **not CLOSED** |

W1 was applied. HMD-003 is **not** runtime-verified: frontier did not apply; W2 / April / July were not reached. **No** migration edit.

## Event 3 §8 — RU-1.1 / RU-1.2 / preserve / verifier

| Field | Value |
|-------|-------|
| RU-1.1 | **NOT REACHED** (`ru11Reached=false`) |
| RU-1.2 | **NOT REACHED** (`ru12Reached=false`) |
| RPC invocation | **false** |
| Preserve / `RUNNING_FOR_BASELINE_VERIFY` | **NOT REACHED** (failure-path cleanup) |
| Baseline verifier invoked | **NO** |
| Baseline verifier result | **NOT RUN** |
| Primary Audit baseline | **NOT RUN** |
| RU-1.2 metadata baseline | **NOT RUN** |
| RU-1.4 tests | **false** |
| Destructive fixtures | **false** |

## Event 3 §9 — Cleanup / disposition

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

## Event 3 §10 — Manifest

```
tests/e02/evidence/local-010-20260826a/bcr-replay-manifest.json
```

`result=APPLICATION_FAILED` · `migrationCountExecuted=33` · `validatedDbaAuthorizationId=E-02-DBA-LOCAL-010` · `environmentValidated=true` · `platformBaselineReady=true` · `failures=["20260320045054_enhance_dispute_resolution_system.sql: syntax error at or near \"category\""]` · `auxiliaryEnvironmentDisposition=CLEANED_AFTER_FAILURE` · CLI diagnostic fields **null**.

## Event 3 §11 — Next governance action

```
NEXT = RETURN TO GOVERNANCE
```

**Do not** retry LOCAL-010. **Do not** create LOCAL-011 automatically. **Do not** edit `20260320045054_enhance_dispute_resolution_system.sql`. **Do not** edit W1/W2. **Do not** expand quarantine. **Do not** issue `E-02-RU-1.4-REA`. **Do not** run the baseline verifier. **Do not** kill processes. **Do not** remap Studio.

## Event 3 §12 — Confirmation of no unauthorized work

**`--apply` ran exactly once.** No second apply. No source/migration/W1/W2/verifier/guard/package/test change. No process kill. No port remap. No RU-1.2 RPC. No RU-1.4. No REA. No EIR. No Acceptance. No Certification. No commit.

## Event 3 §13 — Lock

```
E-02-DBA-LOCAL-010                         = NOT SUCCESSFULLY CONSUMED
DATABASE APPLICATION RESULT                = APPLICATION_FAILED
STATEFUL APPLY STARTED                     = YES
STATEFUL APPLY ATTEMPTS                    = 1
PRE-EXECUTION GATES                        = PASS (governance · Docker warm · TCP 54323 · --plan)
FAILURE STAGE                              = GOVERNED REPLAY AT 20260320045054
FAILURE TEXT                               = syntax error at or near "category"
FIRST FAILING MIGRATION                    = 20260320045054_enhance_dispute_resolution_system.sql
HIGHEST APPLIED                            = 20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql
MIGRATIONS EXECUTED                        = 33
ENVIRONMENT GUARD                          = PASS
AUXILIARY INIT / START                     = PASS
PLATFORM BASELINE                          = PASS
PRESERVE                                   = NOT REACHED
BASELINE VERIFIER                          = NOT RUN
CLEANUP                                    = CLEANED_AFTER_FAILURE
HMD-001                                    = OPEN / DISTINCT
HMD-002                                    = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT
HMD-003                                    = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
LOCAL-009                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = RETURN TO GOVERNANCE
```

---

**End of document — E-02-DBA-LOCAL-010 Evidence — v1.0 Event 1 + Event 2 + Event 3 — 2026-08-26**


