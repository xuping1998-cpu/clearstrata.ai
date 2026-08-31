# E-02 Database Application Evidence — E-02-DBA-LOCAL-013

| Field | Value |
|-------|-------|
| **Document Type** | Database Application Evidence (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-013** |
| **Authorization Reference** | [`E-02-Database-Application-Authorization-LOCAL-013.md`](E-02-Database-Application-Authorization-LOCAL-013.md) v1.0 |
| **BCR Artifact Authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-013.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-013.md) (E-02-BCR-IA-013 **CONSUMED**) · [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-013.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-013.md) (**E-02-BCR-IMPLEMENTATION-COMPLETION-013** · **COMPLETED WITH NOTES**) |
| **Guard clarification** | [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) (**DAA-014-C** · **ISSUED**) |
| **Predecessor DBA / evidence** | **E-02-DBA-LOCAL-012** — [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-012.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-012.md) · **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** — **not reclassified** |
| **Status** | **Issued — first and only stateful apply — APPLICATION_FAILED** |
| **Revision** | v1.0 |
| **Effective Date** | 2026-08-28 |
| **Production Effect** | **None** |

> **Controlling result:** `APPLICATION_FAILED`. Pre-stateful gates **PASS**. Stateful `--apply --preserve-environment` **started once**. **No retry. No second apply. No LOCAL-014. No source repair.**

```
CONTROLLING DATABASE APPLICATION RESULT = APPLICATION_FAILED
FAILURE STAGE                           = GOVERNED REPLAY AT 20260331180000_announcements_created_by_inbox_fanout.sql
FAILURE TEXT                            = unterminated quoted string at or near "' … END;"
STATEFUL APPLY STARTED                  = YES
STATEFUL APPLY ATTEMPT COUNT            = 1
AUTHORIZATION CONSUMED                  = NO (E-02-DBA-LOCAL-013 NOT SUCCESSFULLY CONSUMED)
EVIDENCE                                = IMMUTABLE
RETRY                                   = NOT AUTHORIZED
HMD-006 TARGET                          = REACHED / APPLIED
PRIOR HMD-006 PARSER ERROR              = NOT REPRODUCED
HMD-006 RUNTIME                         = RUNTIME REPLAY VERIFIED (still OPEN)
NEW FAILURE vs HMD-001..006             = YES (not classified / not remediated in this task)
```

---

## 1. Files created / updated

| Path | Action |
|------|--------|
| `docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-013.md` | **Created** (this document) |
| `docs/implementation/README.md` | **Minimally updated** |
| `tests/e02/evidence/local-013-20260828a/bcr-replay-manifest.json` | **Created by BCR apply** (not hand-edited) |

**Not modified:** replay artifact · verifier · environment guard · `package.json` · migrations · HMD-006 target · HMD-005 reconstruction · HMD-005 target · W1 · W2 · HMD-002 restored file · HMD-004 restored file · April HARD · July S1 · tests · CB-B · launcher · diagnostics · Docker configuration · LOCAL-012 evidence.

**Not created:** LOCAL-014 · REA · EIR.

**Not overwritten:** LOCAL-012 or earlier evidence.

---

## 2. Pre-stateful gates — **PASS**

| Gate | Result |
|------|--------|
| A authority documents | **PASS** — LOCAL-013 **APPROVED WITH CONDITIONS / NOT CONSUMED / NOT EXECUTED**; attempts **0**; future apply **EXACTLY 1**; IA-013 **CONSUMED**; Completion-013 **COMPLETED WITH NOTES**; BCR **RETARGETED TO LOCAL-013 / ARTIFACT AUTHORITY E-02-BCR-IA-013 / IMPLEMENTATION COMPLETED / STATICALLY CERTIFIED** |
| B LOCAL-013 attempts | **PASS** — **0** before apply (no LOCAL-013 evidence file; no `tests/e02/evidence/local-013-*`) |
| C BCR pins | **PASS** — `EXPECTED_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-013` · `ARTIFACT_AUTHORIZATION_ID=E-02-BCR-IA-013` |
| D exact-match | **PASS** — `raw !== EXPECTED_DBA_AUTHORIZATION_ID` retained · dual-accept **NONE** · LOCAL-012 operational acceptance **NO** · IA-012 operational artifact authority **NO** |
| E predecessor | **PASS** — LOCAL-012 **APPLICATION_FAILED / EVIDENCE IMMUTABLE** · attempts **1** · retry **NOT AUTHORIZED** |
| F HMD-006 static | **PASS** — **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** (pre-apply) · HMIR Completion-003 **COMPLETED WITH NOTES** · target **not edited** this task |
| G quarantine | **PASS** — exactly `20260314195641_add_demo_data.sql` / **COUNT 1** · HMD-006 target **not quarantined** |
| H worktree | **PASS** — executable diffs limited to authorized BCR pin lineage (`git numstat` **2 / 2**) · HMD-006 four-fragment restoration (`4 / 4`) · HMD-005 reconstruction untracked · verifier/guard/package/tests/app **clean** · **UNEXPLAINED EXECUTABLE DRIFT = NONE** |
| I fresh `--plan` | **PASS** — `PLAN_OK` · `startedAt` `2026-08-29T03:45:19.752Z` / `finishedAt` `2026-08-29T03:45:21.883Z` |
| J checkpoints in plan/source | **PASS** — HMD-005 recon/target · HMD-006 target · W2 · April HARD · July S1 **DISCOVERED / EXECUTABLE**; quarantine **DISCOVERED / QUARANTINED**; HMD-006 target **NOT QUARANTINED** |
| K fresh build | **PASS** — `npm run build` exit **0** · Vite **5.4.21** · **3333** modules · **15.27s** (duration non-normative) |
| L env authority (apply path) | **PASS** — set only for apply: DBA **LOCAL-013** · apply `true` · destructive-tests `true` (technical fail-closed only) · evidence env `local` · runtime-execution **UNSET** · baseline-verification **UNSET** · runId **`local-013-20260828a`** (not `local-012-20260828a`) |
| M authorized environment | **PASS** — `LOCAL_DISPOSABLE_SUPABASE` · CB-B `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` · baseline `E02_DECLARED_BASELINE_REPLAY` |
| N Docker | **PASS** — Client **29.7.2** · Server Engine **29.7.2** · Docker Desktop **4.87.0 (236836)** · version elapsed **180 ms** · pipes present · `docker ps` / `ps -a` empty |
| O disposable DB pre-state | **PASS** — running **0** / all **0** · LOCAL-012 failed runtime **not reused** |
| P TCP 54323 | **PASS** — **FREE** (occupant **NONE**; bind probe **FREE**) · rechecked immediately before apply |

### Fresh `--plan` captured fields

| Field | Value |
|-------|-------|
| `result` | `PLAN_OK` |
| `failures` | `[]` |
| `expectedDbaAuthorizationId` | `E-02-DBA-LOCAL-013` |
| `artifactAuthorizationId` | `E-02-BCR-IA-013` |
| `environmentClass` | `LOCAL_DISPOSABLE_SUPABASE` |
| `cleanBaseMode` | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` |
| `baselineMode` | `E02_DECLARED_BASELINE_REPLAY` |
| quarantined | `20260314195641_add_demo_data.sql` |
| `quarantineCount` | **1** |
| `migrationCountDiscovered` | **286** |
| planned executable count | **285** (286 − 1 quarantined) |

`--plan` used **no `--apply`**. `E02_RUNTIME_EXECUTION_AUTHORIZED` **UNSET**.

### Final pre-apply checkpoint

```
GOVERNANCE                         = PASS
DOCKER                             = PASS / RESPONSIVE
TCP 54323                          = PASS / FREE
FRESH PLAN                         = PLAN_OK
FRESH BUILD                        = PASS
DBA PIN                            = E-02-DBA-LOCAL-013
ARTIFACT AUTHORITY                 = E-02-BCR-IA-013
EXACT MATCH                        = PASS
QUARANTINE COUNT                   = 1
UNEXPLAINED EXECUTABLE DRIFT       = NONE
E02_BCR_APPLY_AUTHORIZED           = true   (set for apply only)
E02_ALLOW_DESTRUCTIVE_TESTS        = true   (technical fail-closed input only)
E02_EVIDENCE_ENV                   = local
E02_RUNTIME_EXECUTION_AUTHORIZED   = UNSET / FALSE
E02_BASELINE_VERIFICATION_AUTHORIZED = UNSET
STATEFUL APPLY ATTEMPTS            = 0  (immediately before apply start)
PRE_STATEFUL                       = PASSED
LOCAL-013 APPLY                    = AUTHORIZED TO START
```

---

## 3. Technical environment / run id

| Variable | Value |
|----------|-------|
| `E02_EVIDENCE_RUN_ID` | **`local-013-20260828a`** (fresh; unused before this apply; **not** `local-012-20260828a`) |
| `E02_DBA_AUTHORIZATION_ID` | `E-02-DBA-LOCAL-013` (exact match; `validatedDbaAuthorizationId` same) |
| `E02_BCR_APPLY_AUTHORIZED` | `true` |
| `E02_ALLOW_DESTRUCTIVE_TESTS` | `true` (technical fail-closed input only; **not** fixture/RU-1.4/RPC/REA) |
| `E02_EVIDENCE_ENV` | `local` |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **UNSET** |
| `E02_BASELINE_VERIFICATION_AUTHORIZED` | **UNSET** (not set during apply) |

Guard stdout: `[e02-guard] evidenceRunId=local-013-20260828a env=local projectRef=127.0.0.1 host=127.0.0.1:54321`

Invocation (existing BCR artifact; no new launcher):

```
npx tsx scripts/verification/e02/replay-e02-declared-baseline.ts --apply --preserve-environment
```

At apply start: **LOCAL-013 STATEFUL APPLY ATTEMPTS 0 → 1** (irreversible).

---

## 4. The single authorized apply

| Field | Value |
|-------|-------|
| Mode | `--apply --preserve-environment` |
| APPLY_START | `2026-08-28T20:46:31.2647454-07:00` |
| APPLY_FINISH | `2026-08-28T20:47:46.1192145-07:00` |
| Manifest startedAt / finishedAt | `2026-08-29T03:46:32.030Z` / `2026-08-29T03:47:45.897Z` |
| APPLY_EXIT | **1** |
| `manifest.result` | **APPLICATION_FAILED** |
| Stateful apply started | **YES** |
| Stateful apply attempt count | **1** |
| Second apply | **NONE** |

---

## 5. Auxiliary / guard / platform baseline

| Field | Value |
|-------|-------|
| Auxiliary workdir (sanitized) | `<OS_TMP>/e02-bcr-aux-local-013-20260828a` |
| Aux timestamped migrations before start | **0** |
| Auxiliary init | **PASS** (start/status/guard reached; `cliFailureClass=null`) |
| Auxiliary start | **PASS** |
| Auxiliary status | **REACHED** |
| Environment guard | **PASS** (`environmentValidated=true`) |
| Platform baseline | **PASS** (`platformBaselineReady=true`) |
| Initial app history empty | **YES** (`applicationMigrationHistoryInitiallyEmpty=true`) |
| Application-layer reset | **REACHED** (replay began) |
| Writes occurred | **YES** (64 migrations applied in disposable env, then failure-path cleanup) |
| CLI failure class | **null** (failure was SQL in governed replay, not CLI start) |
| `auxiliaryProjectRef` | **null** (status JSON did not expose a project ref) |

---

## 6. Governed replay / migration frontier

| Field | Value |
|-------|-------|
| Repo source | `supabase/migrations` |
| Discovered timestamped | **286** |
| Planned executable | **285** |
| Quarantine | `20260314195641_add_demo_data.sql` · **COUNT 1** · **NOT executed** · **NOT recorded applied** |
| Executed successfully | **64** |
| Highest successfully applied | **`20260331161000_owner_bulletin_notifications.sql`** (executable index **64**) |
| First failing migration | **`20260331180000_announcements_created_by_inbox_fanout.sql`** (executable index **65**) |
| Failure text | `unterminated quoted string at or near "'` then `ELSE r` / `END;` / `RETURN NEW;` / `END;` |
| Failed migration marked applied | **NO** |
| Truthful history | **YES** — executed 64; quarantine omitted; failing file not recorded applied |

Deterministic executable order (quarantine omitted) was used with `migrationCountExecuted=64` to identify the highest applied file. Applied state was **not** inferred from log proximity.

LOCAL-012 previously failed at executable index **64** (`20260331161000`) with `syntax error at or near "物业经理"`. This run executed **64**, so index **64 applied**, then failed later at index **65**.

This first-failing migration is **not** already governed as HMD-001..006. **No classification. No remediation. STOP → GOVERNANCE.**

---

## 7. HMD-002 checkpoint

| Item | Result |
|------|--------|
| `20260315035847_add_meeting_templates_and_attachments.sql` | **REACHED / APPLIED** (executable index **16** of 64 applied) |
| Historical parser failure (`syntax error at or near "1."`) | **NOT REPRODUCED** |
| File edited this task | **NO** |
| HMD-002 overall status | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT** |

---

## 8. HMD-003 checkpoints

| Checkpoint | Result |
|------------|--------|
| W1 `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql` | **REACHED / APPLIED** (executable index **33**) |
| Former LOCAL-008 frontier `20260320045054_enhance_dispute_resolution_system.sql` | **REACHED / APPLIED** (executable index **34**) |
| Prior error `relation "invoices" does not exist` | **NOT REPRODUCED** |
| W2 `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` | **NOT REACHED / NOT APPLIED** (executable index **75**) |
| April HARD `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | **NOT REACHED / NOT APPLIED** (executable index **76**) |
| July S1 `20260711120000_invoice_ai_audit_v1.sql` | **NOT REACHED / NOT APPLIED** (executable index **146**) · file **unmodified** |
| HMD-003 status | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** — **not CLOSED** (W2 / April HARD / July S1 not reached) |

W1 and `20260320045054` applied. HMD-003 is **not** fully runtime-verified. **No** migration edit. **No** invented closure.

---

## 9. HMD-004 checkpoint

| Item | Result |
|------|--------|
| Target `20260320045054_enhance_dispute_resolution_system.sql` | **REACHED / APPLIED** (executable index **34**) |
| Prior LOCAL-010 error `syntax error at or near "category"` | **NOT REPRODUCED** |
| File edited this task | **NO** |
| HMD-004 overall status | **SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** |

---

## 10. HMD-005 checkpoints

| Item | Result |
|------|--------|
| Reconstruction `20260329102500_hmd005_reconstruct_user_role_admin.sql` | **REACHED / APPLIED** (executable index **57**) |
| Target `20260329103000_add_admin_user_role_and_policy.sql` | **REACHED / APPLIED** (executable index **58**) |
| Prior LOCAL-011 error `unsafe use of new value "admin" of enum type user_role` | **NOT REPRODUCED** |
| Files edited this task | **NO** |
| HMD-005 overall status | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — **not CLOSED** |

HMD-005 runtime replay checkpoint is **reconfirmed**. Later failure at `20260331180000` does **not** reopen the enum commit-boundary defect.

---

## 11. HMD-006 checkpoint

| Item | Result |
|------|--------|
| Target `20260331161000_owner_bulletin_notifications.sql` | **REACHED / APPLIED** (executable index **64**) |
| Prior LOCAL-012 error `syntax error at or near "物业经理"` | **NOT REPRODUCED** |
| File edited this task | **NO** |
| HMD-006 overall status | **OPEN / HISTORICAL SOURCE-INTEGRITY DEFECT / EXACT SOURCE RESTORATION SELECTED / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — **not CLOSED** |

HMD-006 runtime replay checkpoint is **VERIFIED**. Later failure at `20260331180000` is a **different** file and does **not** reopen the `物业经理` parser defect.

---

## 12. Bounded sanitized process output

CLI diagnostic fields on the manifest are **null** (failure occurred inside governed SQL replay, not `supabase` CLI spawn).

Captured apply stdout (bounded):

- npm `devdir` warning (non-authoritative)
- `[e02-guard] evidenceRunId=local-013-20260828a env=local projectRef=127.0.0.1 host=127.0.0.1:54321`
- `[bcr-replay] manifest written: …\tests\e02\evidence\local-013-20260828a\bcr-replay-manifest.json`
- JSON manifest with `result=APPLICATION_FAILED` and failure string as in §6
- `APPLY_EXIT=1`

No unlimited process dump. No container-log expansion. No secret/URL persistence in this evidence.

---

## 13. RU-1.1 / RU-1.2 / preserve / verifier

| Field | Value |
|-------|-------|
| RU-1.1 | **NOT REACHED** (`ru11Reached=false`) / **NOT APPLIED** |
| RU-1.2 | **NOT REACHED** (`ru12Reached=false`) / **NOT APPLIED** |
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

## 14. Cleanup / disposition

| Field | Value |
|-------|-------|
| Disposition | **`CLEANED_AFTER_FAILURE`** |
| `cleanupCompleted` | **true** |
| `cleanupWarnings` | **[]** |
| Docker containers after cleanup | **NONE** (`docker ps -a` empty) |
| TCP 54323 after cleanup | **FREE** |
| Process kill | **NONE** |
| Port remap | **NONE** |

---

## 15. Manifest

```
tests/e02/evidence/local-013-20260828a/bcr-replay-manifest.json
```

`result=APPLICATION_FAILED` · `migrationCountExecuted=64` · `validatedDbaAuthorizationId=E-02-DBA-LOCAL-013` · `artifactAuthorizationId=E-02-BCR-IA-013` · `environmentValidated=true` · `platformBaselineReady=true` · `failures=["20260331180000_announcements_created_by_inbox_fanout.sql: unterminated quoted string at or near \"'…END;\""]` · `auxiliaryEnvironmentDisposition=CLEANED_AFTER_FAILURE` · CLI diagnostic fields **null**.

---

## 16. Next governance action

```
NEXT = STOP → GOVERNANCE
```

**Do not** retry LOCAL-013. **Do not** create LOCAL-014 automatically. **Do not** edit `20260331180000_announcements_created_by_inbox_fanout.sql`. **Do not** edit the HMD-006 target. **Do not** edit HMD-005 reconstruction or target. **Do not** edit W1/W2. **Do not** expand quarantine. **Do not** issue `E-02-RU-1.4-REA`. **Do not** run the baseline verifier. **Do not** kill processes. **Do not** remap Studio.

Potential new HMD allocation for the `20260331180000` unterminated-quoted-string error is a **later governance decision**. This evidence task does **not** allocate it.

---

## 17. Confirmation of no unauthorized work

**`--apply` ran exactly once.** No second apply. No source/migration/HMD-006 target/HMD-005 reconstruction/target/W1/W2/HMD-002/HMD-004/July S1/verifier/guard/package/test change during this runtime task. No process kill. No port remap. No RU-1.2 RPC. No RU-1.4. No REA. No EIR. No Acceptance. No Certification. No commit.

---

## 18. Lock

```
E-02-DBA-LOCAL-013                         = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
DATABASE APPLICATION RESULT                = APPLICATION_FAILED
STATEFUL APPLY STARTED                     = YES
STATEFUL APPLY ATTEMPTS                    = 1
PRE-EXECUTION GATES                        = PASS (governance · Docker warm · TCP 54323 · --plan · build · environment)
FAILURE STAGE                              = GOVERNED REPLAY AT 20260331180000
FAILURE TEXT                               = unterminated quoted string at or near "'"
FIRST FAILING MIGRATION                    = 20260331180000_announcements_created_by_inbox_fanout.sql
HIGHEST APPLIED                            = 20260331161000_owner_bulletin_notifications.sql
MIGRATIONS EXECUTED                        = 64
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
HMD-005                                    = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-006                                    = OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
LOCAL-012                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-013 RETRY                            = NOT AUTHORIZED
LOCAL-014                                  = NOT AUTHORIZED / NOT CREATED
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = STOP → GOVERNANCE
```

---

**End of document — E-02-DBA-LOCAL-013 Evidence — v1.0 — 2026-08-28**
