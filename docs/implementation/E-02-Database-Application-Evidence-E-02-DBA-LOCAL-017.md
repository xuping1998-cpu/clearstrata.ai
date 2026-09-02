# E-02 Database Application Evidence — E-02-DBA-LOCAL-017

| Field | Value |
|-------|-------|
| **Document Type** | Database Application Evidence (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-017** |
| **Authorization Reference** | [`E-02-Database-Application-Authorization-LOCAL-017.md`](E-02-Database-Application-Authorization-LOCAL-017.md) v1.0 |
| **BCR Artifact Authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-017.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-017.md) (E-02-BCR-IA-017 **CONSUMED**) · [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-017.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-017.md) (**E-02-BCR-IMPLEMENTATION-COMPLETION-017** · **COMPLETED WITH NOTES**) |
| **Guard clarification** | [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) (**DAA-014-C** · **ISSUED**) |
| **Predecessor DBA / evidence** | **E-02-DBA-LOCAL-016** — [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-016.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-016.md) · **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** — **not reclassified** · **not overwritten** |
| **Status** | **Issued — first and only stateful apply — APPLICATION_FAILED** |
| **Revision** | v1.0 |
| **Effective Date** | 2026-08-31 |
| **Production Effect** | **None** |

> **Controlling result:** `APPLICATION_FAILED`. Pre-stateful gates **PASS**. Stateful `--apply --preserve-environment` **started once**. **No retry. No second apply. No LOCAL-018. No source repair.**

```
CONTROLLING DATABASE APPLICATION RESULT = APPLICATION_FAILED
FAILURE STAGE                           = GOVERNED REPLAY AT 20260405120000_multi_tenant_properties.sql
FAILURE TEXT                            = column mqt.meeting_id does not exist
STATEFUL APPLY STARTED                  = YES
STATEFUL APPLY ATTEMPT COUNT            = 1
AUTHORIZATION CONSUMED                  = NO (E-02-DBA-LOCAL-017 NOT SUCCESSFULLY CONSUMED)
EVIDENCE                                = IMMUTABLE
RETRY                                   = NOT AUTHORIZED
HMD-010 TARGET                          = REACHED / NOT APPLIED
PRIOR HMD-010 MV.MEETING_ID ERROR       = NOT REPRODUCED
HMD-010 RUNTIME                         = RUNTIME REPLAY VERIFICATION PENDING (still OPEN)
HMD-009 RECONSTRUCTION                  = REACHED / APPLIED
PRIOR HMD-009 HIRING_JOBS ERROR         = NOT REPRODUCED
HMD-009 TARGET                          = REACHED / NOT APPLIED
HMD-009 RUNTIME                         = RUNTIME REPLAY VERIFICATION PENDING (still OPEN)
HMD-008 / HMD-007 / HMD-006 / HMD-005   = REACHED / APPLIED / RECONFIRMED / RUNTIME REPLAY VERIFIED
HMD-003 W2 / APRIL HARD / JULY S1       = NOT REACHED / NOT APPLIED
NEW FAILURE vs HMD-001..010             = YES (same target file; different error than LOCAL-016; not classified / not remediated)
```

---

## 1. Files created / updated

| Path | Action |
|------|--------|
| `docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-017.md` | **Created** (this document) |
| `docs/implementation/README.md` | **Minimally updated** |
| `tests/e02/evidence/local-017-20260831a/bcr-replay-manifest.json` | **Created by BCR apply** (not hand-edited) |

**Not modified:** replay artifact · verifier · environment guard · `package.json` · migrations · HMD-010 target · HMD-009 reconstruction · HMD-008 target · HMD-007 target · HMD-006 target · HMD-005 reconstruction · HMD-005 target · W1 · W2 · HMD-002 restored file · HMD-004 restored file · April HARD · July S1 · tests · CB-B · launcher · diagnostics · Docker configuration · LOCAL-016 evidence · earlier evidence · Completion-017 issuance text · IA-017 issuance text · DBA-017 issuance text.

**Not created:** LOCAL-018 · REA · EIR · new HMD identifier.

**Not overwritten:** LOCAL-016 or earlier evidence.

---

## 2. Pre-stateful gates — **PASS**

| Gate | Result |
|------|--------|
| A authority documents | **PASS** — LOCAL-017 **APPROVED WITH CONDITIONS / NOT CONSUMED / NOT EXECUTED / EXECUTION GATED**; attempts **0**; future apply **EXACTLY 1**; IA-017 **CONSUMED**; Completion-017 **COMPLETED WITH NOTES**; BCR **RETARGETED TO LOCAL-017 / ARTIFACT AUTHORITY E-02-BCR-IA-017 / IMPLEMENTATION COMPLETED / STATICALLY CERTIFIED** |
| B LOCAL-017 attempts | **PASS** — **0** before apply (no LOCAL-017 evidence file; no `tests/e02/evidence/local-017-*` before this run) |
| C BCR pins | **PASS** — `EXPECTED_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-017` · `ARTIFACT_AUTHORIZATION_ID=E-02-BCR-IA-017` |
| D exact-match | **PASS** — `raw !== EXPECTED_DBA_AUTHORIZATION_ID` retained · dual-accept **NONE** · LOCAL-016 operational acceptance **NO** · IA-016 operational artifact authority **NO** |
| E predecessor | **PASS** — LOCAL-016 **APPLICATION_FAILED / EVIDENCE IMMUTABLE** · attempts **1** · retry **NOT AUTHORIZED** · evidence run `local-016-20260830a` **not reused** · prior error `column mv.meeting_id does not exist` · executed **73** · index **74** |
| F HMD-010 static | **PASS** — **OPEN / OPTION C SELECTED / IMPLEMENTATION COMPLETED / HOSCC COMPLETION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** (pre-apply) · HOSCC Completion **COMPLETED WITH NOTES** · target **not edited** this task |
| G HMD-009 / HMD-008 / HMD-007 / HMD-006 / HMD-005 / HMD-003 locks | **PASS** — HMD-009 **RUNTIME REPLAY VERIFICATION PENDING** · HMD-008 **RUNTIME REPLAY VERIFIED** · HMD-007 **RUNTIME REPLAY VERIFIED** · HMD-006 **RUNTIME REPLAY VERIFIED** · HMD-005 **RUNTIME REPLAY VERIFIED** · HMD-003 **RUNTIME REPLAY VERIFICATION PENDING** · reconstructions/targets **not edited** |
| H quarantine | **PASS** — exactly `20260314195641_add_demo_data.sql` / **COUNT 1** · HMD-009 reconstruction **NOT QUARANTINED** · HMD-010 target **NOT QUARANTINED** |
| I worktree | **PASS** — uncommitted lineage limited to governed Completion-017 documentation (`docs/implementation/README.md` · Completion-017) · BCR pins already in HEAD (`LOCAL-017` / `IA-017`) · HMD lineage already governed · verifier/guard/package/tests/app **clean** · **UNEXPLAINED EXECUTABLE DRIFT = NONE** |
| J fresh `--plan` | **PASS** — `PLAN_OK` · `startedAt` `2026-08-31T18:46:59.684Z` · failures `[]` |
| K checkpoints in plan/source | **PASS** — HMD-009 recon+target · W2 · April HARD · July S1 **DISCOVERED / EXECUTABLE**; quarantine **DISCOVERED / QUARANTINED**; HMD-009 recon+target **NOT QUARANTINED**; HMD-010 target **NOT QUARANTINED** |
| L fresh build | **PASS** — `npm run build` exit **0** · Vite **5.4.21** · **3333** modules · **36.29s** (duration non-normative) |
| M env authority (apply path) | **PASS** — set only for apply: DBA **LOCAL-017** · apply `true` · destructive-tests `true` (technical fail-closed only) · evidence env `local` · runtime-execution **UNSET** · baseline-verification **UNSET** · runId **`local-017-20260831a`** (not `local-016-20260830a`) |
| N authorized environment | **PASS** — `LOCAL_DISPOSABLE_SUPABASE` · CB-B `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` · baseline `E02_DECLARED_BASELINE_REPLAY` |
| O Docker | **PASS** — Client **29.7.2** · Server Engine **29.7.2** · Desktop **4.87.0 (236836)** · containers running **0** / all **0** · version probe **214 ms** |
| P disposable DB pre-state | **PASS** — LOCAL-016 failed runtime **not reused** · no leftover containers · no leftover `e02-bcr-aux-*` temp · no manual DDL · no fake history |
| Q TCP 54323 | **PASS** — **FREE** (occupant **NONE**; bind probe **FREE**) immediately before apply |

### Fresh `--plan` captured fields

| Field | Value |
|-------|-------|
| `result` | `PLAN_OK` |
| `failures` | `[]` |
| `expectedDbaAuthorizationId` | `E-02-DBA-LOCAL-017` |
| `artifactAuthorizationId` | `E-02-BCR-IA-017` |
| `environmentClass` | `LOCAL_DISPOSABLE_SUPABASE` |
| `cleanBaseMode` | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` |
| `baselineMode` | `E02_DECLARED_BASELINE_REPLAY` |
| quarantined | `20260314195641_add_demo_data.sql` |
| `quarantineCount` | **1** |
| `migrationCountDiscovered` | **287** |
| planned executable count | **286** (287 − 1 quarantined) |

`--plan` used **no `--apply`**. `E02_RUNTIME_EXECUTION_AUTHORIZED` **UNSET**. Counts match the certified reference 287 / 286 / 1. **No material unexplained count drift.**

### Fresh plan checkpoints

| File | Plan status | Executable index |
|------|-------------|------------------|
| `20260405115900_hmd009_reconstruct_hiring_jobs.sql` | **DISCOVERED / EXECUTABLE / NOT QUARANTINED** | **73** |
| `20260405120000_multi_tenant_properties.sql` | **DISCOVERED / EXECUTABLE / NOT QUARANTINED** | **74** |
| `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` | **DISCOVERED / EXECUTABLE** | **76** |
| `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | **DISCOVERED / EXECUTABLE** | **77** |
| `20260711120000_invoice_ai_audit_v1.sql` | **DISCOVERED / EXECUTABLE** | **147** |
| `20260314195641_add_demo_data.sql` | **DISCOVERED / QUARANTINED** | n/a |

### Final pre-apply checkpoint

```
DBA AUTHORITY                      = PASS
BCR AUTHORITY                      = PASS
EXACT PINS                         = PASS
COMPLETION-017                     = PASS
PREDECESSOR IMMUTABILITY           = PASS
WORKTREE INTEGRITY                 = PASS
HMD LOCKS                          = PASS
HMD-010 STATIC STATE               = PASS
QUARANTINE                         = PASS
FRESH PLAN                         = PASS / PLAN_OK
BUILD                              = PASS
ENVIRONMENT                        = PASS
DOCKER                             = PASS / RESPONSIVE
TCP 54323                          = PASS / FREE
DISPOSABLE DB PRE-STATE            = PASS
UNEXPLAINED EXECUTABLE DRIFT       = NONE
E02_BCR_APPLY_AUTHORIZED           = true   (set for apply only)
E02_ALLOW_DESTRUCTIVE_TESTS        = true   (technical fail-closed input only)
E02_EVIDENCE_ENV                   = local
E02_RUNTIME_EXECUTION_AUTHORIZED   = UNSET / FALSE
E02_BASELINE_VERIFICATION_AUTHORIZED = UNSET
STATEFUL APPLY ATTEMPTS            = 0  (immediately before apply start)
PRE_STATEFUL                       = PASSED
LOCAL-017 APPLY                    = AUTHORIZED TO START
```

---

## 3. Technical environment / run id

| Variable | Value |
|----------|-------|
| `E02_EVIDENCE_RUN_ID` | **`local-017-20260831a`** (fresh; unused before this apply; **not** `local-016-20260830a`) |
| `E02_DBA_AUTHORIZATION_ID` | `E-02-DBA-LOCAL-017` (exact match; `validatedDbaAuthorizationId` same) |
| `E02_BCR_APPLY_AUTHORIZED` | `true` |
| `E02_ALLOW_DESTRUCTIVE_TESTS` | `true` (technical fail-closed input only; **not** fixture/RU-1.4/RPC/REA) |
| `E02_EVIDENCE_ENV` | `local` |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **UNSET** |
| `E02_BASELINE_VERIFICATION_AUTHORIZED` | **UNSET** (not set during apply) |

Guard stdout: `[e02-guard] evidenceRunId=local-017-20260831a env=local projectRef=127.0.0.1 host=127.0.0.1:54321`

Invocation (existing BCR artifact; no new launcher):

```
npx tsx scripts/verification/e02/replay-e02-declared-baseline.ts --apply --preserve-environment
```

At apply start: **LOCAL-017 STATEFUL APPLY ATTEMPTS 0 → 1** (irreversible).

---

## 4. The single authorized apply

| Field | Value |
|-------|-------|
| Mode | `--apply --preserve-environment` |
| APPLY_START | `2026-08-31T11:47:39.5137521-07:00` |
| APPLY_FINISH | `2026-08-31T11:48:51.1885333-07:00` |
| Manifest startedAt / finishedAt | `2026-08-31T18:47:40.263Z` / `2026-08-31T18:48:51.035Z` |
| APPLY_EXIT | **1** |
| `manifest.result` | **APPLICATION_FAILED** |
| Stateful apply started | **YES** |
| Stateful apply attempt count | **1** |
| Second apply | **NONE** |

---

## 5. Auxiliary / guard / platform baseline

| Field | Value |
|-------|-------|
| Auxiliary workdir (sanitized) | `<OS_TMP>/e02-bcr-aux-local-017-20260831a` |
| Aux timestamped migrations before start | **0** |
| Auxiliary init | **PASS** (start/status/guard reached; `cliFailureClass=null`) |
| Auxiliary start | **PASS** |
| Auxiliary status | **REACHED** |
| Environment guard | **PASS** (`environmentValidated=true`) |
| Platform baseline | **PASS** (`platformBaselineReady=true`) |
| Initial app history empty | **YES** (`applicationMigrationHistoryInitiallyEmpty=true`) |
| Application-layer reset | **REACHED** (replay began) |
| Writes occurred | **YES** (73 migrations applied in disposable env, then failure-path cleanup) |
| CLI failure class | **null** (failure was SQL in governed replay, not CLI start) |
| `auxiliaryProjectRef` | **null** (status JSON did not expose a project ref) |

---

## 6. Governed replay / migration frontier

| Field | Value |
|-------|-------|
| Repo source | `supabase/migrations` |
| Discovered timestamped | **287** |
| Planned executable | **286** |
| Quarantine | `20260314195641_add_demo_data.sql` · **COUNT 1** · **NOT executed** · **NOT recorded applied** |
| Executed successfully | **73** |
| Highest successfully applied | **`20260405115900_hmd009_reconstruct_hiring_jobs.sql`** (executable index **73**) |
| First failing migration | **`20260405120000_multi_tenant_properties.sql`** (executable index **74**) |
| Failure text | `column mqt.meeting_id does not exist` |
| Failed migration marked applied | **NO** |
| Truthful history | **YES** — executed 73; quarantine omitted; failing file not recorded applied |

Deterministic executable order (quarantine omitted) was used with `migrationCountExecuted=73` to identify the highest applied file. Applied state was **not** inferred from discovery or log proximity.

LOCAL-016 previously failed at executable index **74** (`20260405120000`) with `column mv.meeting_id does not exist`. This run applied reconstruction at index **73**, then the same target failed at **index 74** with a **different** error (`column mqt.meeting_id does not exist`). The prior LOCAL-016 `mv.meeting_id` error was **NOT REPRODUCED**.

This first-failing error is **FORENSICALLY NOTED / NOT CLASSIFIED / NOT REPAIRED / NOT ALLOCATED**. **No new HMD. No remediation. STOP → GOVERNANCE.**

Immediate predecessor that applied: `20260404120000_create_leads.sql` (index **72**) then reconstruction `20260405115900_hmd009_reconstruct_hiring_jobs.sql` (index **73**). Immediate successor after the failing target (`20260405120100_multi_tenant_rls.sql`, index **75**) was **NOT REACHED**.

---

## 7. HMD-002 checkpoint

| Item | Result |
|------|--------|
| `20260315035847_add_meeting_templates_and_attachments.sql` | **REACHED / APPLIED** (executable index **16**) |
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
| W2 `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` | **NOT REACHED / NOT APPLIED** (executable index **76**) |
| April HARD `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | **NOT REACHED / NOT APPLIED** (executable index **77**) |
| July S1 `20260711120000_invoice_ai_audit_v1.sql` | **NOT REACHED / NOT APPLIED** (executable index **147**) · file **unmodified** |
| HMD-003 status | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** — **not CLOSED** (W2 / April HARD / July S1 not reached) |

W1 and `20260320045054` applied. HMD-003 is **not** fully runtime-verified. **No** migration edit. **No** invented closure. **Not** promoted to `RUNTIME REPLAY VERIFIED`.

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

HMD-005 runtime replay checkpoint is **reconfirmed**. Later failure at `20260405120000` does **not** reopen the enum commit-boundary defect.

---

## 11. HMD-006 checkpoint

| Item | Result |
|------|--------|
| Target `20260331161000_owner_bulletin_notifications.sql` | **REACHED / APPLIED** (executable index **64**) |
| Prior LOCAL-012 error `syntax error at or near "物业经理"` | **NOT REPRODUCED** |
| File edited this task | **NO** |
| HMD-006 overall status | **OPEN / HISTORICAL SOURCE-INTEGRITY DEFECT / EXACT SOURCE RESTORATION SELECTED / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — **not CLOSED** |

HMD-006 runtime replay checkpoint is **reconfirmed**. Later failure at `20260405120000` is a **different** file and does **not** reopen the `物业经理` parser defect.

---

## 12. HMD-007 reconfirmation

| Item | Result |
|------|--------|
| Target `20260331180000_announcements_created_by_inbox_fanout.sql` | **REACHED / APPLIED** (executable index **65**) |
| Prior LOCAL-013 error `unterminated quoted string at or near "'"` | **NOT REPRODUCED** |
| File edited this task | **NO** |
| HMD-007 overall status | **OPEN / DISTINCT / HISTORICAL SOURCE-INTEGRITY DEFECT / POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION / OPTION A SELECTED / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — **not CLOSED** |

HMD-007 runtime replay checkpoint is **RECONFIRMED**. Later failure at `20260405120000` is a **different** file and does **not** reopen the L70 unterminated-quoted-string defect. **Do not mark CLOSED.**

---

## 13. HMD-008 reconfirmation

| Item | Result |
|------|--------|
| Target `20260401140000_notifications_trigger_service_role_insert.sql` | **REACHED / APPLIED** (executable index **69**) |
| Prior LOCAL-014 error `syntax error at or near "manager"` | **NOT REPRODUCED** |
| File edited this task | **NO** |
| HMD-008 overall status | **OPEN / DISTINCT / HISTORICAL SOURCE-INTEGRITY DEFECT / POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION / OPTION A SELECTED / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — **not CLOSED** |

HMD-008 runtime replay checkpoint is **RECONFIRMED**. Later failure at `20260405120000` is a **different** error on a later file and does **not** reopen the `manager` parser defect. **Do not mark CLOSED.**

---

## 14. HMD-009 runtime checkpoint

| Item | Result |
|------|--------|
| Reconstruction `20260405115900_hmd009_reconstruct_hiring_jobs.sql` | **REACHED / APPLIED** (executable index **73**) |
| Target `20260405120000_multi_tenant_properties.sql` | **REACHED / NOT APPLIED** (executable index **74**) |
| Prior LOCAL-015 / HMD-009 error `relation "public.hiring_jobs" does not exist` | **NOT REPRODUCED** |
| Actual target error | `column mqt.meeting_id does not exist` |
| Reconstruction edited this task | **NO** |
| Target edited this task | **NO** |
| HMD-009 overall status | **OPEN / OPTION B / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** — **not CLOSED** |

Reconstruction applied. The governed prior `hiring_jobs` missing-prerequisite error did **not** reproduce. The historical target was **reached** but **did not apply**, so HMD-009 is **not** promoted to `RUNTIME REPLAY VERIFIED`.

---

## 15. HMD-010 runtime checkpoint

| Item | Result |
|------|--------|
| Target `20260405120000_multi_tenant_properties.sql` | **REACHED / NOT APPLIED** (executable index **74**) |
| Prior LOCAL-016 / HMD-010 error `column mv.meeting_id does not exist` | **NOT REPRODUCED** |
| Actual target error | `column mqt.meeting_id does not exist` |
| Target edited this task | **NO** |
| HMD-010 overall status | **OPEN / OPTION C SELECTED / IMPLEMENTATION COMPLETED / HOSCC COMPLETION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** — **not CLOSED** |

The governed HMD-010 Option C statement is **not** certified runtime-verified: the target file **did not apply**. The prior `mv.meeting_id` error is a **different** string from the observed `mqt.meeting_id` error. **Do not** mark HMD-010 `RUNTIME REPLAY VERIFIED`. **Do not** reopen HMD-010 as a new defect merely because a later statement in the same file failed. **Do not** treat this as automatic Option C invalidation. Forensic classification is a **separate** governance task.

---

## 16. New failure observation

| Item | Result |
|------|--------|
| File | `20260405120000_multi_tenant_properties.sql` |
| Executable index | **74** |
| REACHED | **YES** |
| APPLIED | **NO** |
| Exact error | `column mqt.meeting_id does not exist` |
| Relation to prior HMD-010 error | **DIFFERENT** (`mv.meeting_id` **not** reproduced) |
| Relation to prior HMD-009 error | **DIFFERENT** (`hiring_jobs` missing relation **not** reproduced) |
| Classification | **NOT CLASSIFIED / NOT REPAIRED** |
| Edited this task | **NO** |
| Merged into HMD-010 | **NO** |
| Merged into HMD-009 | **NO** |
| New HMD allocated | **NO** |

A new defect classification requires **separate forensic governance**. This evidence task does **not** allocate it.

```
NEW FAILURE =
  20260405120000_multi_tenant_properties.sql /
  executable index 74 /
  column mqt.meeting_id does not exist /
  NOT CLASSIFIED /
  NOT REPAIRED
```

---

## 17. Bounded sanitized process output

CLI diagnostic fields on the manifest are **null** (failure occurred inside governed SQL replay, not `supabase` CLI spawn).

Captured apply stdout (bounded):

- npm `devdir` warning (non-authoritative)
- `[e02-guard] evidenceRunId=local-017-20260831a env=local projectRef=127.0.0.1 host=127.0.0.1:54321`
- `[bcr-replay] manifest written: …\tests\e02\evidence\local-017-20260831a\bcr-replay-manifest.json`
- JSON manifest with `result=APPLICATION_FAILED` and failure string as in §6
- `APPLY_EXIT=1`

No unlimited process dump. No container-log expansion. No secret/URL persistence in this evidence.

---

## 18. RU-1.1 / RU-1.2 / preserve / verifier

| Field | Value |
|-------|-------|
| RU-1.1 replay | **NOT REACHED** (`ru11Reached=false`) / **NOT APPLIED** · file `20261729120000_create_owner_vote_primary_freeze_audits.sql` |
| RU-1.1 governance state | **REPOSITORY IMPLEMENTED / DB NOT APPLIED** |
| RU-1.2 replay | **NOT REACHED** (`ru12Reached=false`) / **NOT APPLIED** · file `20261821120000_create_execute_owner_vote_atomic_freeze_commit.sql` |
| RU-1.2 governance state | **REPOSITORY IMPLEMENTED / DB NOT APPLIED / RUNTIME NOT VERIFIED** |
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

## 19. Cleanup / disposition

| Field | Value |
|-------|-------|
| Disposition | **`CLEANED_AFTER_FAILURE`** |
| `cleanupCompleted` | **true** |
| `cleanupWarnings` | **[]** |
| Docker containers after cleanup | **NONE** (`docker ps -a` empty) |
| TCP 54323 after cleanup | **FREE** (occupant **NONE**; bind probe **FREE**) |
| Process kill | **NONE** |
| Port remap | **NONE** |

---

## 20. Manifest

```
tests/e02/evidence/local-017-20260831a/bcr-replay-manifest.json
```

`result=APPLICATION_FAILED` · `migrationCountExecuted=73` · `validatedDbaAuthorizationId=E-02-DBA-LOCAL-017` · `artifactAuthorizationId=E-02-BCR-IA-017` · `environmentValidated=true` · `platformBaselineReady=true` · `failures=["20260405120000_multi_tenant_properties.sql: column mqt.meeting_id does not exist"]` · `auxiliaryEnvironmentDisposition=CLEANED_AFTER_FAILURE` · CLI diagnostic fields **null**.

---

## 21. Next governance action

```
NEXT = STOP → GOVERNANCE
```

**Do not** retry LOCAL-017. **Do not** create LOCAL-018 automatically. **Do not** edit `20260405120000_multi_tenant_properties.sql`. **Do not** edit `20260405115900_hmd009_reconstruct_hiring_jobs.sql`. **Do not** edit the HMD-010 Option C construct. **Do not** edit the HMD-008 target. **Do not** edit the HMD-007 target. **Do not** edit the HMD-006 target. **Do not** edit HMD-005 reconstruction or target. **Do not** edit W1/W2. **Do not** expand quarantine. **Do not** issue `E-02-RU-1.4-REA`. **Do not** run the baseline verifier. **Do not** kill processes. **Do not** remap Studio. **Do not** allocate a new HMD in this task.

Potential forensic classification of the `20260405120000` `column mqt.meeting_id does not exist` error is a **later governance decision**. This evidence task does **not** allocate it.

---

## 22. Confirmation of no unauthorized work

**`--apply` ran exactly once.** No second apply. No source/migration/HMD-010 target/HMD-009 reconstruction/HMD-008 target/HMD-007 target/HMD-006 target/HMD-005 reconstruction/target/W1/W2/HMD-002/HMD-004/July S1/verifier/guard/package/test change during this runtime task. No process kill. No port remap. No RU-1.2 RPC. No RU-1.4. No REA. No EIR. No Acceptance. No Certification. No commit.

---

## 23. Lock

```
E-02-DBA-LOCAL-017                         = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
DATABASE APPLICATION RESULT                = APPLICATION_FAILED
STATEFUL APPLY STARTED                     = YES
STATEFUL APPLY ATTEMPTS                    = 1
PRE-EXECUTION GATES                        = PASS (governance · Docker · TCP 54323 · --plan · build · environment)
FAILURE STAGE                              = GOVERNED REPLAY AT 20260405120000
FAILURE TEXT                               = column mqt.meeting_id does not exist
FIRST FAILING MIGRATION                    = 20260405120000_multi_tenant_properties.sql
FIRST FAILING EXECUTABLE INDEX             = 74
HIGHEST APPLIED                            = 20260405115900_hmd009_reconstruct_hiring_jobs.sql
MIGRATIONS EXECUTED                        = 73
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
HMD-008                                    = OPEN / DISTINCT / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-009                                    = OPEN / OPTION B / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
HMD-009 RECONSTRUCTION                     = REACHED / APPLIED
HMD-009 PRIOR HIRING_JOBS ERROR            = NOT REPRODUCED
HMD-009 TARGET                             = REACHED / NOT APPLIED
HMD-010                                    = OPEN / OPTION C SELECTED / IMPLEMENTATION COMPLETED / HOSCC COMPLETION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
HMD-010 TARGET                             = REACHED / NOT APPLIED
HMD-010 PRIOR MV.MEETING_ID ERROR          = NOT REPRODUCED
NEW FAILURE 20260405120000                 = NOT CLASSIFIED / NOT REPAIRED / NEW HMD NOT ALLOCATED
LOCAL-016                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-017 RETRY                            = NOT AUTHORIZED
LOCAL-018                                  = NOT ISSUED
DATABASE BASELINE VERIFIED                 = NO
RU-1.1                                     = REPOSITORY IMPLEMENTED / DB NOT APPLIED
RU-1.2                                     = REPOSITORY IMPLEMENTED / DB NOT APPLIED / RUNTIME NOT VERIFIED
RU-1.4                                     = RUNTIME NOT AUTHORIZED
EIR PASS                                   = NONE
HISTORICAL ACCEPTANCE                      = ISSUED
CURRENT PATH                               = NOT ACCEPTANCE-ADVANCED
PHASE 5 CERTIFICATION                      = ISSUED — SCOPED
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = STOP → GOVERNANCE
```

---

**End of document — E-02-DBA-LOCAL-017 Evidence — v1.0 — 2026-08-31**
