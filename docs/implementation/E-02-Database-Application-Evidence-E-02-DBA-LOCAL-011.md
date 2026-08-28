# E-02 Database Application Evidence — E-02-DBA-LOCAL-011

| Field | Value |
|-------|-------|
| **Document Type** | Database Application Evidence (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-011** |
| **Authorization Reference** | [`E-02-Database-Application-Authorization-LOCAL-011.md`](E-02-Database-Application-Authorization-LOCAL-011.md) v1.0 |
| **BCR Artifact Authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-011.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-011.md) (E-02-BCR-IA-011 **CONSUMED**) · [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-011.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-011.md) (**COMPLETED WITH NOTES**) |
| **Guard clarification** | [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) (**DAA-014-C** · **ISSUED**) |
| **Predecessor DBA / evidence** | **E-02-DBA-LOCAL-010** — [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-010.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-010.md) · **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** — **not reclassified** |
| **Status** | **Issued — first and only stateful apply — APPLICATION_FAILED** |
| **Revision** | v1.0 |
| **Effective Date** | 2026-08-27 |
| **Production Effect** | **None** |

> **Controlling result:** `APPLICATION_FAILED`. Pre-stateful gates **PASS**. Stateful `--apply --preserve-environment` **started once**. **No retry. No second apply. No LOCAL-012. No source repair.**

```
CONTROLLING DATABASE APPLICATION RESULT = APPLICATION_FAILED
FAILURE STAGE                           = GOVERNED REPLAY AT 20260329103000_add_admin_user_role_and_policy.sql
FAILURE TEXT                            = unsafe use of new value "admin" of enum type user_role
STATEFUL APPLY STARTED                  = YES
STATEFUL APPLY ATTEMPT COUNT            = 1
AUTHORIZATION CONSUMED                  = NO (E-02-DBA-LOCAL-011 NOT SUCCESSFULLY CONSUMED)
EVIDENCE                                = IMMUTABLE
RETRY                                   = NOT AUTHORIZED
```

---

## 1. Files created / updated

| Path | Action |
|------|--------|
| `docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-011.md` | **Created** (this document) |
| `docs/implementation/README.md` | **Minimally updated** |
| `tests/e02/evidence/local-011-20260827a/bcr-replay-manifest.json` | **Created by BCR apply** (not hand-edited) |

**Not modified:** replay artifact · verifier · environment guard · `package.json` · migrations · W1 · W2 · HMD-002 restored file · HMD-004 restored file · July S1 · tests · CB-B · launcher · diagnostics · Docker configuration.

**Not created:** LOCAL-012 · REA · EIR.

**Not overwritten:** LOCAL-010 or earlier evidence.

---

## 2. Pre-stateful gates — **PASS**

| Gate | Result |
|------|--------|
| A–R Governance | **PASS** — LOCAL-011 existed, **NOT CONSUMED / NOT EXECUTED**, attempt count **0**; IA-011 **CONSUMED**; Completion-011 **COMPLETED WITH NOTES**; artifact pin **E-02-DBA-LOCAL-011** / **E-02-BCR-IA-011**; env `E02_DBA_AUTHORIZATION_ID`; exact-match retained; dual-accept **NONE**; quarantine exactly `20260314195641_add_demo_data.sql` / **COUNT 1**; HMD-002 / W1 / `20260320045054` / W2 / July S1 present and **not quarantined**; no LOCAL-012; no later superseding DBA |
| Docker already warm | **PASS** — Client **29.7.2** · Server Engine **29.7.2** · Docker Desktop **4.87.0 (236836)** · `docker ps`/`ps -a` empty · running **0** / all **0** · final recheck elapsed **99 ms** |
| TCP 54323 | **PASS** — **FREE** (no connections; occupant **NONE**) · rechecked immediately before apply |
| Fresh `--plan` | **PASS** — `PLAN_OK` · started `2026-08-27T19:34:28.6253608-07:00` / finished `2026-08-27T19:34:32.9840423-07:00` · `startedAt` `2026-08-28T02:34:31.420Z` / `finishedAt` `2026-08-28T02:34:32.938Z` |
| Environment | **PASS** — named DAA-014-C inputs set only for the apply path (below) |

### Fresh `--plan` captured fields

| Field | Value |
|-------|-------|
| `result` | `PLAN_OK` |
| `expectedDbaAuthorizationId` | `E-02-DBA-LOCAL-011` |
| `artifactAuthorizationId` | `E-02-BCR-IA-011` |
| `environmentClass` | `LOCAL_DISPOSABLE_SUPABASE` |
| `cleanBaseMode` | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` |
| `baselineMode` | `E02_DECLARED_BASELINE_REPLAY` |
| quarantined | `20260314195641_add_demo_data.sql` |
| `quarantineCount` | **1** |
| `migrationCountDiscovered` | **285** |
| planned executable count | **284** (285 − 1 quarantined) |

`--plan` used `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-011`. `E02_BCR_APPLY_AUTHORIZED` **UNSET**. `E02_RUNTIME_EXECUTION_AUTHORIZED` **UNSET**. **No `--apply` during plan.**

### Final pre-apply checkpoint

```
GOVERNANCE                         = PASS
DOCKER                             = PASS
TCP 54323                          = PASS
FRESH PLAN                         = PLAN_OK
DBA PIN                            = E-02-DBA-LOCAL-011
ARTIFACT AUTHORITY                 = E-02-BCR-IA-011
EXACT MATCH                        = PASS
QUARANTINE COUNT                   = 1
E02_BCR_APPLY_AUTHORIZED           = true   (set for apply only)
E02_ALLOW_DESTRUCTIVE_TESTS        = true   (technical fail-closed input only)
E02_EVIDENCE_ENV                   = local
E02_RUNTIME_EXECUTION_AUTHORIZED   = UNSET / FALSE
E02_BASELINE_VERIFICATION_AUTHORIZED = UNSET
STATEFUL APPLY ATTEMPTS            = 0  (immediately before apply start)
```

---

## 3. Technical environment / run id

| Variable | Value |
|----------|-------|
| `E02_EVIDENCE_RUN_ID` | **`local-011-20260827a`** (fresh; unused before this apply) |
| `E02_DBA_AUTHORIZATION_ID` | `E-02-DBA-LOCAL-011` (exact match; `validatedDbaAuthorizationId` same) |
| `E02_BCR_APPLY_AUTHORIZED` | `true` |
| `E02_ALLOW_DESTRUCTIVE_TESTS` | `true` (technical fail-closed input only; **not** fixture/RU-1.4/RPC/REA) |
| `E02_EVIDENCE_ENV` | `local` |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **UNSET** |
| `E02_BASELINE_VERIFICATION_AUTHORIZED` | **UNSET** (not set during apply) |

Guard stdout: `[e02-guard] evidenceRunId=local-011-20260827a env=local projectRef=127.0.0.1 host=127.0.0.1:54321`

Invocation (existing BCR artifact; no new launcher):

```
npx tsx scripts/verification/e02/replay-e02-declared-baseline.ts --apply --preserve-environment
```

---

## 4. The single authorized apply

| Field | Value |
|-------|-------|
| Mode | `--apply --preserve-environment` |
| APPLY_START | `2026-08-27T19:35:07.3184571-07:00` |
| APPLY_FINISH | `2026-08-27T19:36:17.9033268-07:00` |
| Manifest startedAt / finishedAt | `2026-08-28T02:35:08.051Z` / `2026-08-28T02:36:17.697Z` |
| APPLY_EXIT | **1** |
| `manifest.result` | **APPLICATION_FAILED** |
| Stateful apply started | **YES** |
| Stateful apply attempt count | **1** |
| Second apply | **NONE** |

---

## 5. Auxiliary / guard / platform baseline

| Field | Value |
|-------|-------|
| Auxiliary workdir (sanitized) | `<OS_TMP>/e02-bcr-aux-local-011-20260827a` |
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

---

## 6. Governed replay / migration frontier

| Field | Value |
|-------|-------|
| Repo source | `supabase/migrations` |
| Discovered timestamped | **285** |
| Planned executable | **284** |
| Quarantine | `20260314195641_add_demo_data.sql` · **COUNT 1** · **NOT executed** · **NOT recorded applied** |
| Executed successfully | **56** |
| Highest successfully applied | **`20260328120000_owner_info_council_manager_approve.sql`** (executable index **56**) |
| First failing migration | **`20260329103000_add_admin_user_role_and_policy.sql`** (executable index **57**) |
| Failure text | `unsafe use of new value "admin" of enum type user_role` |
| Failed migration marked applied | **NO** |
| Truthful history | **YES** — executed 56; quarantine omitted; failing file not recorded applied |

Deterministic executable order (quarantine omitted) was used with `migrationCountExecuted=56` to identify the highest applied file. Applied state was **not** inferred from log proximity.

LOCAL-010 previously failed at executable index **34** (`20260320045054`) with `syntax error at or near "category"`. This run executed **56**, so index **34 applied**, then failed later at index **57**.

---

## 7. HMD-002 checkpoint

| Item | Result |
|------|--------|
| `20260315035847_add_meeting_templates_and_attachments.sql` | **REACHED / APPLIED** (executable index **16** of 56 applied) |
| Historical parser failure (`syntax error at or near "1."`) | **NOT REPRODUCED** |
| File edited this task | **NO** |
| HMD-002 overall status | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT** — checkpoint evidenced on this LOCAL-011 apply; **not** a full-baseline certification |

---

## 8. HMD-003 checkpoints

| Checkpoint | Result |
|------------|--------|
| W1 `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql` | **REACHED / APPLIED** (executable index **33**) |
| Former LOCAL-008 frontier `20260320045054_enhance_dispute_resolution_system.sql` | **REACHED / APPLIED** (executable index **34**) |
| Prior error `relation "invoices" does not exist` | **NOT REPRODUCED** |
| W2 `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` | **NOT REACHED / NOT APPLIED** (executable index **74**) |
| April HARD `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | **NOT REACHED / NOT APPLIED** (executable index **75**) |
| July S1 `20260711120000_invoice_ai_audit_v1.sql` | **NOT REACHED / NOT APPLIED** (executable index **145**) · file **unmodified** |
| HMD-003 status | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** — **not CLOSED** (W2 / April HARD / July S1 not reached) |

W1 and `20260320045054` applied. HMD-003 is **not** fully runtime-verified. **No** migration edit.

---

## 9. HMD-004 / LOCAL-010 frontier checkpoint

| Item | Result |
|------|--------|
| Target `20260320045054_enhance_dispute_resolution_system.sql` | **REACHED / APPLIED** (executable index **34**) |
| Prior LOCAL-010 error `syntax error at or near "category"` | **NOT REPRODUCED** |
| File edited this task | **NO** |
| HMD-004 overall status | **SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — HMD-004 runtime objective evidenced on this LOCAL-011 apply; **not** a full-baseline certification |

---

## 10. Bounded sanitized process output

CLI diagnostic fields on the manifest are **null** (failure occurred inside governed SQL replay, not `supabase` CLI spawn).

Captured apply stdout (bounded):

- npm `devdir` warning (non-authoritative)
- `[e02-guard] evidenceRunId=local-011-20260827a env=local projectRef=127.0.0.1 host=127.0.0.1:54321`
- `[bcr-replay] manifest written: …\tests\e02\evidence\local-011-20260827a\bcr-replay-manifest.json`
- JSON manifest with `result=APPLICATION_FAILED` and failure string as in §6
- `APPLY_EXIT=1`

No unlimited process dump. No container-log expansion. No secret/URL persistence in this evidence.

---

## 11. RU-1.1 / RU-1.2 / preserve / verifier

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

Success-path `E02_BASELINE_VERIFICATION_AUTHORIZED=true` was **not** set. Verifier is **success-path only**.

---

## 12. Cleanup / disposition

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

## 13. Manifest

```
tests/e02/evidence/local-011-20260827a/bcr-replay-manifest.json
```

`result=APPLICATION_FAILED` · `migrationCountExecuted=56` · `validatedDbaAuthorizationId=E-02-DBA-LOCAL-011` · `artifactAuthorizationId=E-02-BCR-IA-011` · `environmentValidated=true` · `platformBaselineReady=true` · `failures=["20260329103000_add_admin_user_role_and_policy.sql: unsafe use of new value \"admin\" of enum type user_role"]` · `auxiliaryEnvironmentDisposition=CLEANED_AFTER_FAILURE` · CLI diagnostic fields **null**.

---

## 14. Next governance action

```
NEXT = RETURN TO GOVERNANCE
```

**Do not** retry LOCAL-011. **Do not** create LOCAL-012 automatically. **Do not** edit `20260329103000_add_admin_user_role_and_policy.sql`. **Do not** edit `20260320045054`. **Do not** edit W1/W2. **Do not** expand quarantine. **Do not** issue `E-02-RU-1.4-REA`. **Do not** run the baseline verifier. **Do not** kill processes. **Do not** remap Studio.

---

## 15. Confirmation of no unauthorized work

**`--apply` ran exactly once.** No second apply. No source/migration/W1/W2/HMD-002/HMD-004/July S1/verifier/guard/package/test change. No process kill. No port remap. No RU-1.2 RPC. No RU-1.4. No REA. No EIR. No Acceptance. No Certification. No commit.

---

## 16. Lock

```
E-02-DBA-LOCAL-011                         = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
DATABASE APPLICATION RESULT                = APPLICATION_FAILED
STATEFUL APPLY STARTED                     = YES
STATEFUL APPLY ATTEMPTS                    = 1
PRE-EXECUTION GATES                        = PASS (governance · Docker warm · TCP 54323 · --plan · environment)
FAILURE STAGE                              = GOVERNED REPLAY AT 20260329103000
FAILURE TEXT                               = unsafe use of new value "admin" of enum type user_role
FIRST FAILING MIGRATION                    = 20260329103000_add_admin_user_role_and_policy.sql
HIGHEST APPLIED                            = 20260328120000_owner_info_council_manager_approve.sql
MIGRATIONS EXECUTED                        = 56
ENVIRONMENT GUARD                          = PASS
AUXILIARY INIT / START                     = PASS
PLATFORM BASELINE                          = PASS
PRESERVE                                   = NOT REACHED
BASELINE VERIFIER                          = NOT RUN
CLEANUP                                    = CLEANED_AFTER_FAILURE
HMD-001                                    = OPEN / DISTINCT
HMD-002                                    = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT
HMD-003                                    = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
HMD-004                                    = SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
LOCAL-010                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-011 RETRY                            = NOT AUTHORIZED
LOCAL-012                                  = NOT AUTHORIZED
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = RETURN TO GOVERNANCE
```

---

**End of document — E-02-DBA-LOCAL-011 Evidence — v1.0 — 2026-08-27**
