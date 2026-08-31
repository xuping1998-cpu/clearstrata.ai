# E-02 Database Application Evidence — E-02-DBA-LOCAL-014

| Field | Value |
|-------|-------|
| **Document Type** | Database Application Evidence (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-014** |
| **Authorization Reference** | [`E-02-Database-Application-Authorization-LOCAL-014.md`](E-02-Database-Application-Authorization-LOCAL-014.md) v1.0 |
| **BCR Artifact Authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-014.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-014.md) (E-02-BCR-IA-014 **CONSUMED**) · [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-014.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-014.md) (**E-02-BCR-IMPLEMENTATION-COMPLETION-014** · **COMPLETED WITH NOTES**) |
| **Guard clarification** | [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) (**DAA-014-C** · **ISSUED**) |
| **Predecessor DBA / evidence** | **E-02-DBA-LOCAL-013** — [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-013.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-013.md) · **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** — **not reclassified** |
| **Status** | **Issued — first and only stateful apply — APPLICATION_FAILED** |
| **Revision** | v1.0 |
| **Effective Date** | 2026-08-29 |
| **Production Effect** | **None** |

> **Controlling result:** `APPLICATION_FAILED`. Pre-stateful gates **PASS**. Stateful `--apply --preserve-environment` **started once**. **No retry. No second apply. No LOCAL-015. No source repair.**

```
CONTROLLING DATABASE APPLICATION RESULT = APPLICATION_FAILED
FAILURE STAGE                           = GOVERNED REPLAY AT 20260401140000_notifications_trigger_service_role_insert.sql
FAILURE TEXT                            = syntax error at or near "manager"
STATEFUL APPLY STARTED                  = YES
STATEFUL APPLY ATTEMPT COUNT            = 1
AUTHORIZATION CONSUMED                  = NO (E-02-DBA-LOCAL-014 NOT SUCCESSFULLY CONSUMED)
EVIDENCE                                = IMMUTABLE
RETRY                                   = NOT AUTHORIZED
HMD-007 TARGET                          = REACHED / APPLIED
PRIOR HMD-007 PARSER ERROR              = NOT REPRODUCED
HMD-007 RUNTIME                         = RUNTIME REPLAY VERIFIED (still OPEN)
SIBLING 20260401140000                  = REACHED / NOT APPLIED / FORENSICALLY NOTED / OUT OF HMD-007 SCOPE / NOT ALLOCATED
NEW FAILURE vs HMD-001..007             = YES (not classified / not remediated in this task)
```

---

## 1. Files created / updated

| Path | Action |
|------|--------|
| `docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-014.md` | **Created** (this document) |
| `docs/implementation/README.md` | **Minimally updated** |
| `tests/e02/evidence/local-014-20260829a/bcr-replay-manifest.json` | **Created by BCR apply** (not hand-edited) |

**Not modified:** replay artifact · verifier · environment guard · `package.json` · migrations · HMD-007 target · HMD-006 target · HMD-005 reconstruction · HMD-005 target · sibling `20260401140000…` · W1 · W2 · HMD-002 restored file · HMD-004 restored file · April HARD · July S1 · tests · CB-B · launcher · diagnostics · Docker configuration · LOCAL-013 evidence.

**Not created:** LOCAL-015 · REA · EIR.

**Not overwritten:** LOCAL-013 or earlier evidence.

---

## 2. Pre-stateful gates — **PASS**

| Gate | Result |
|------|--------|
| A authority documents | **PASS** — LOCAL-014 **APPROVED WITH CONDITIONS / NOT CONSUMED / NOT EXECUTED / EXECUTION GATED**; attempts **0**; future apply **EXACTLY 1**; IA-014 **CONSUMED**; Completion-014 **COMPLETED WITH NOTES**; BCR **RETARGETED TO LOCAL-014 / ARTIFACT AUTHORITY E-02-BCR-IA-014 / IMPLEMENTATION COMPLETED / STATICALLY CERTIFIED** |
| B LOCAL-014 attempts | **PASS** — **0** before apply (no LOCAL-014 evidence file; no `tests/e02/evidence/local-014-*` before this run) |
| C BCR pins | **PASS** — `EXPECTED_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-014` · `ARTIFACT_AUTHORIZATION_ID=E-02-BCR-IA-014` |
| D exact-match | **PASS** — `raw !== EXPECTED_DBA_AUTHORIZATION_ID` retained · dual-accept **NONE** · LOCAL-013 operational acceptance **NO** · IA-013 operational artifact authority **NO** |
| E predecessor | **PASS** — LOCAL-013 **APPLICATION_FAILED / EVIDENCE IMMUTABLE** · attempts **1** · retry **NOT AUTHORIZED** · evidence run `local-013-20260828a` **not reused** |
| F HMD-007 static | **PASS** — **OPEN / DISTINCT / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** (pre-apply) · HMIR Completion-004 **COMPLETED WITH NOTES** · L70 `WHEN 'council' THEN '业委会'` · trailing CRLF blanks **4** · target **not edited** this task |
| G HMD-006 / HMD-005 / HMD-003 locks | **PASS** — HMD-006 **RUNTIME REPLAY VERIFIED** · HMD-005 **RUNTIME REPLAY VERIFIED** · HMD-003 **RUNTIME REPLAY VERIFICATION PENDING** · targets **not edited** |
| H quarantine | **PASS** — exactly `20260314195641_add_demo_data.sql` / **COUNT 1** · HMD-007 target **not quarantined** |
| I worktree | **PASS** — executable diffs limited to authorized BCR pin lineage · HMD-007 L70 restoration · HMD-006 four-fragment restoration · HMD-005 reconstruction untracked · verifier/guard/package/tests/app **clean** · sibling `20260401140000…` **unchanged** · **UNEXPLAINED EXECUTABLE DRIFT = NONE** |
| J fresh `--plan` | **PASS** — `PLAN_OK` · `startedAt` `2026-08-29T16:33:45.194Z` · failures `[]` |
| K checkpoints in plan/source | **PASS** — HMD-007 / HMD-006 / HMD-005 recon+target · W2 · April HARD · July S1 **DISCOVERED / EXECUTABLE**; quarantine **DISCOVERED / QUARANTINED**; HMD-007 target **NOT QUARANTINED** |
| L fresh build | **PASS** — `npm run build` exit **0** · Vite **5.4.21** · **3333** modules · **25.02s** (duration non-normative) |
| M env authority (apply path) | **PASS** — set only for apply: DBA **LOCAL-014** · apply `true` · destructive-tests `true` (technical fail-closed only) · evidence env `local` · runtime-execution **UNSET** · baseline-verification **UNSET** · runId **`local-014-20260829a`** (not `local-013-20260828a`) |
| N authorized environment | **PASS** — `LOCAL_DISPOSABLE_SUPABASE` · CB-B `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` · baseline `E02_DECLARED_BASELINE_REPLAY` |
| O Docker | **PASS** — Client **29.7.2** · Server Engine **29.7.2** · Docker Desktop **4.87.0 (236836)** · version elapsed **192 ms** · pipes present · `docker ps` / `ps -a` empty |
| P disposable DB pre-state | **PASS** — running **0** / all **0** · LOCAL-013 failed runtime **not reused** |
| Q TCP 54323 | **PASS** — **FREE** (occupant **NONE**; bind probe **FREE**) · rechecked immediately before apply |

### Fresh `--plan` captured fields

| Field | Value |
|-------|-------|
| `result` | `PLAN_OK` |
| `failures` | `[]` |
| `expectedDbaAuthorizationId` | `E-02-DBA-LOCAL-014` |
| `artifactAuthorizationId` | `E-02-BCR-IA-014` |
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
DBA PIN                            = E-02-DBA-LOCAL-014
ARTIFACT AUTHORITY                 = E-02-BCR-IA-014
EXACT MATCH                        = PASS
DUAL ACCEPT                        = NONE
QUARANTINE COUNT                   = 1
UNEXPLAINED EXECUTABLE DRIFT       = NONE
E02_BCR_APPLY_AUTHORIZED           = true   (set for apply only)
E02_ALLOW_DESTRUCTIVE_TESTS        = true   (technical fail-closed input only)
E02_EVIDENCE_ENV                   = local
E02_RUNTIME_EXECUTION_AUTHORIZED   = UNSET / FALSE
E02_BASELINE_VERIFICATION_AUTHORIZED = UNSET
STATEFUL APPLY ATTEMPTS            = 0  (immediately before apply start)
PRE_STATEFUL                       = PASSED
LOCAL-014 APPLY                    = AUTHORIZED TO START
```

---

## 3. Technical environment / run id

| Variable | Value |
|----------|-------|
| `E02_EVIDENCE_RUN_ID` | **`local-014-20260829a`** (fresh; unused before this apply; **not** `local-013-20260828a`) |
| `E02_DBA_AUTHORIZATION_ID` | `E-02-DBA-LOCAL-014` (exact match; `validatedDbaAuthorizationId` same) |
| `E02_BCR_APPLY_AUTHORIZED` | `true` |
| `E02_ALLOW_DESTRUCTIVE_TESTS` | `true` (technical fail-closed input only; **not** fixture/RU-1.4/RPC/REA) |
| `E02_EVIDENCE_ENV` | `local` |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **UNSET** |
| `E02_BASELINE_VERIFICATION_AUTHORIZED` | **UNSET** (not set during apply) |

Guard stdout: `[e02-guard] evidenceRunId=local-014-20260829a env=local projectRef=127.0.0.1 host=127.0.0.1:54321`

Invocation (existing BCR artifact; no new launcher):

```
npx tsx scripts/verification/e02/replay-e02-declared-baseline.ts --apply --preserve-environment
```

At apply start: **LOCAL-014 STATEFUL APPLY ATTEMPTS 0 → 1** (irreversible).

---

## 4. The single authorized apply

| Field | Value |
|-------|-------|
| Mode | `--apply --preserve-environment` |
| APPLY_START | `2026-08-29T09:34:50.6300663-07:00` |
| APPLY_FINISH | `2026-08-29T09:35:56.6250179-07:00` |
| Manifest startedAt / finishedAt | `2026-08-29T16:34:51.351Z` / `2026-08-29T16:35:56.423Z` |
| APPLY_EXIT | **1** |
| `manifest.result` | **APPLICATION_FAILED** |
| Stateful apply started | **YES** |
| Stateful apply attempt count | **1** |
| Second apply | **NONE** |

---

## 5. Auxiliary / guard / platform baseline

| Field | Value |
|-------|-------|
| Auxiliary workdir (sanitized) | `<OS_TMP>/e02-bcr-aux-local-014-20260829a` |
| Aux timestamped migrations before start | **0** |
| Auxiliary init | **PASS** (start/status/guard reached; `cliFailureClass=null`) |
| Auxiliary start | **PASS** |
| Auxiliary status | **REACHED** |
| Environment guard | **PASS** (`environmentValidated=true`) |
| Platform baseline | **PASS** (`platformBaselineReady=true`) |
| Initial app history empty | **YES** (`applicationMigrationHistoryInitiallyEmpty=true`) |
| Application-layer reset | **REACHED** (replay began) |
| Writes occurred | **YES** (68 migrations applied in disposable env, then failure-path cleanup) |
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
| Executed successfully | **68** |
| Highest successfully applied | **`20260401120000_strata_feed_notifications.sql`** (executable index **68**) |
| First failing migration | **`20260401140000_notifications_trigger_service_role_insert.sql`** (executable index **69**) |
| Failure text | `syntax error at or near "manager"` |
| Failed migration marked applied | **NO** |
| Truthful history | **YES** — executed 68; quarantine omitted; failing file not recorded applied |

Deterministic executable order (quarantine omitted) was used with `migrationCountExecuted=68` to identify the highest applied file. Applied state was **not** inferred from log proximity.

LOCAL-013 previously failed at executable index **65** (`20260331180000`) with `unterminated quoted string at or near "'"`. This run executed **68**, so index **65 applied**, then later failed at index **69**.

This first-failing migration is **FORENSICALLY NOTED / OUT OF HMD-007 SCOPE / NOT AUTHORIZED / NOT ALLOCATED**. **No classification. No remediation. No HMD allocation in this task. STOP → GOVERNANCE.**

---

## 7. HMD-002 checkpoint

| Item | Result |
|------|--------|
| `20260315035847_add_meeting_templates_and_attachments.sql` | **REACHED / APPLIED** (executable index **16** of 68 applied) |
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

HMD-005 runtime replay checkpoint is **reconfirmed**. Later failure at `20260401140000` does **not** reopen the enum commit-boundary defect.

---

## 11. HMD-006 checkpoint

| Item | Result |
|------|--------|
| Target `20260331161000_owner_bulletin_notifications.sql` | **REACHED / APPLIED** (executable index **64**) |
| Prior LOCAL-012 error `syntax error at or near "物业经理"` | **NOT REPRODUCED** |
| File edited this task | **NO** |
| HMD-006 overall status | **OPEN / HISTORICAL SOURCE-INTEGRITY DEFECT / EXACT SOURCE RESTORATION SELECTED / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — **not CLOSED** |

HMD-006 runtime replay checkpoint is **reconfirmed**. Later failure at `20260401140000` is a **different** file and does **not** reopen the `物业经理` parser defect.

---

## 12. HMD-007 primary runtime checkpoint

| Item | Result |
|------|--------|
| Target `20260331180000_announcements_created_by_inbox_fanout.sql` | **REACHED / APPLIED** (executable index **65**) |
| Prior LOCAL-013 error `unterminated quoted string at or near "'"` with `ELSE r` / `END;` / `RETURN NEW;` / `END;` | **NOT REPRODUCED** |
| File edited this task | **NO** |
| HMD-007 overall status | **OPEN / DISTINCT / HISTORICAL SOURCE-INTEGRITY DEFECT / POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION / OPTION A SELECTED / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — **not CLOSED** |

HMD-007 runtime replay checkpoint is **VERIFIED**. Later failure at `20260401140000` is a **different** file and does **not** reopen the L70 unterminated-quoted-string defect. **Do not mark CLOSED.**

---

## 13. 20260401140000 observation

| Item | Result |
|------|--------|
| File | `20260401140000_notifications_trigger_service_role_insert.sql` |
| Executable index | **69** |
| REACHED | **YES** |
| APPLIED | **NO** |
| Exact error | `syntax error at or near "manager"` |
| Pre-state classification | **FORENSICALLY NOTED / OUT OF HMD-007 SCOPE / NOT AUTHORIZED / NOT ALLOCATED** |
| Edited this task | **NO** |
| Merged into HMD-007 | **NO** |
| New HMD allocated | **NO** |

Immediate successors after HMD-007 also applied before this failure: `20260331190000_notifications_attachment_storage.sql` (index **66**) · `20260331203000_notifications_bucket_excel_mime.sql` (index **67**) · `20260401120000_strata_feed_notifications.sql` (index **68**).

A new defect classification requires **separate forensic governance**. This evidence task does **not** allocate it.

---

## 14. Bounded sanitized process output

CLI diagnostic fields on the manifest are **null** (failure occurred inside governed SQL replay, not `supabase` CLI spawn).

Captured apply stdout (bounded):

- npm `devdir` warning (non-authoritative)
- `[e02-guard] evidenceRunId=local-014-20260829a env=local projectRef=127.0.0.1 host=127.0.0.1:54321`
- `[bcr-replay] manifest written: …\tests\e02\evidence\local-014-20260829a\bcr-replay-manifest.json`
- JSON manifest with `result=APPLICATION_FAILED` and failure string as in §6
- `APPLY_EXIT=1`

No unlimited process dump. No container-log expansion. No secret/URL persistence in this evidence.

---

## 15. RU-1.1 / RU-1.2 / preserve / verifier

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

## 16. Cleanup / disposition

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

## 17. Manifest

```
tests/e02/evidence/local-014-20260829a/bcr-replay-manifest.json
```

`result=APPLICATION_FAILED` · `migrationCountExecuted=68` · `validatedDbaAuthorizationId=E-02-DBA-LOCAL-014` · `artifactAuthorizationId=E-02-BCR-IA-014` · `environmentValidated=true` · `platformBaselineReady=true` · `failures=["20260401140000_notifications_trigger_service_role_insert.sql: syntax error at or near \"manager\""]` · `auxiliaryEnvironmentDisposition=CLEANED_AFTER_FAILURE` · CLI diagnostic fields **null**.

---

## 18. Next governance action

```
NEXT = STOP → GOVERNANCE
```

**Do not** retry LOCAL-014. **Do not** create LOCAL-015 automatically. **Do not** edit `20260401140000_notifications_trigger_service_role_insert.sql`. **Do not** edit the HMD-007 target. **Do not** edit the HMD-006 target. **Do not** edit HMD-005 reconstruction or target. **Do not** edit W1/W2. **Do not** expand quarantine. **Do not** issue `E-02-RU-1.4-REA`. **Do not** run the baseline verifier. **Do not** kill processes. **Do not** remap Studio.

Potential new HMD allocation for the `20260401140000` `syntax error at or near "manager"` error is a **later governance decision**. This evidence task does **not** allocate it.

---

## 19. Confirmation of no unauthorized work

**`--apply` ran exactly once.** No second apply. No source/migration/HMD-007 target/HMD-006 target/HMD-005 reconstruction/target/sibling/W1/W2/HMD-002/HMD-004/July S1/verifier/guard/package/test change during this runtime task. No process kill. No port remap. No RU-1.2 RPC. No RU-1.4. No REA. No EIR. No Acceptance. No Certification. No commit.

---

## 20. Lock

```
E-02-DBA-LOCAL-014                         = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
DATABASE APPLICATION RESULT                = APPLICATION_FAILED
STATEFUL APPLY STARTED                     = YES
STATEFUL APPLY ATTEMPTS                    = 1
PRE-EXECUTION GATES                        = PASS (governance · Docker warm · TCP 54323 · --plan · build · environment)
FAILURE STAGE                              = GOVERNED REPLAY AT 20260401140000
FAILURE TEXT                               = syntax error at or near "manager"
FIRST FAILING MIGRATION                    = 20260401140000_notifications_trigger_service_role_insert.sql
HIGHEST APPLIED                            = 20260401120000_strata_feed_notifications.sql
MIGRATIONS EXECUTED                        = 68
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
HMD-007                                    = OPEN / DISTINCT / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
SIBLING 20260401140000                     = FORENSICALLY NOTED / OUT OF HMD-007 SCOPE / NOT AUTHORIZED / NOT ALLOCATED
LOCAL-013                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-014 RETRY                            = NOT AUTHORIZED
LOCAL-015                                  = NOT AUTHORIZED / NOT CREATED
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = STOP → GOVERNANCE
```

---

**End of document — E-02-DBA-LOCAL-014 Evidence — v1.0 — 2026-08-29**
