# E-02 — Database Application Authorization (Successor)

## Local Disposable Evidence Environment · CB-B Clean-Base · Declared Baseline Replay · Named Technical Guard Inputs (DAA-014-C) · Docker Pre-Warm Gate · Strict Host TCP 54323 Readiness · HMD-005 Compatibility-Reconstruction Runtime Proof · HMD-003 Remaining Checkpoints · Preserved HMD-002 / HMD-004 Runtime Checkpoints

| Field | Value |
|-------|-------|
| **Document Type** | **Database Application Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-012** |
| **Predecessor** | **E-02-DBA-LOCAL-011** — [`E-02-Database-Application-Authorization-LOCAL-011.md`](E-02-Database-Application-Authorization-LOCAL-011.md) · evidence [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-011.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-011.md) · **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| **Prior predecessors** | **E-02-DBA-LOCAL-010** · **E-02-DBA-LOCAL-009** · **E-02-DBA-LOCAL-008** · **E-02-DBA-LOCAL-007** · **E-02-DBA-LOCAL-006** · **E-02-DBA-LOCAL-005** · **E-02-DBA-LOCAL-004** · **E-02-DBA-LOCAL-003** · **E-02-DBA-LOCAL-002** · **E-02-DBA-LOCAL-001** — **FAILED or NOT CONSUMED / IMMUTABLE** |
| **Classification** | **DATABASE APPLICATION ATTEMPT — HMD-005 COMPATIBILITY-RECONSTRUCTION RUNTIME PROOF** (retains HMD-003 remaining checkpoints + preserved HMD-002 / HMD-004 runtime checkpoints + LOCAL-011 host-readiness + named DAA-014-C technical guard inputs) |
| **Guard clarification** | [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) (**DAA-014-C** · **EG-B** · **ISSUED**) |
| **Reconstruction authority (HMD-005)** | **PAD-053 ISSUED / IMMUTABLE** · **E-02-HFSOR-IA-002 CONSUMED** · Completion [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-002.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-002.md) (**E-02-HFSOR-IMPLEMENTATION-COMPLETION-002** · **COMPLETED WITH NOTES**) |
| **Reconstruction authority (HMD-003)** | **E-02-HFSOR-IA CONSUMED** · Completion [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion.md) (**COMPLETED WITH NOTES**) |
| **Restoration authority (HMD-004)** | **PAD-052 ISSUED / IMMUTABLE** · **E-02-HMIR-IA-002 CONSUMED** · Completion-002 **COMPLETED WITH NOTES** · LOCAL-011 runtime **REACHED / APPLIED** |
| **Restoration authority (HMD-002)** | **E-02-HMIR-IA CONSUMED** · Completion **COMPLETED WITH NOTES** · LOCAL-011 runtime **REACHED / APPLIED** |
| **Policy authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md) (**PAD-053**) · [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) (**PAD-051**) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md) (**PAD-052**) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) (PAD-039 – PAD-050) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025 · **PAD-012**) |
| **BCR artifact authority (read-only at issuance)** | **E-02-BCR-IA-011 CONSUMED** · `ARTIFACT_AUTHORIZATION_ID=E-02-BCR-IA-011` · `EXPECTED_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-011` · artifact **unmodified by this DBA** |
| **Status** | **Approved With Conditions — NOT CONSUMED — EXECUTION GATED — NOT EXECUTED** |
| **Authority Level** | Database Application Authorization |
| **Effective Date** | 2026-08-28 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Database-Application-Authorization-LOCAL-012.md`](E-02-Database-Application-Authorization-LOCAL-012.md) |
| **Production Effect** | **None** from this record alone |

> **Authority path finding: YES.** `E-02-Database-Application-Authorization-LOCAL-012.md` is **authority-safe** as a **scoped successor Database Application Authorization** under the PAD-012 naming pattern (`E-02-Database-Application-Authorization-{scope}.md` · ID `E-02-DBA-{ENV}-{SEQ}`). Precedent: LOCAL-001 through LOCAL-011. Highest previously allocated local DBA identifier is **LOCAL-011**. **LOCAL-012 is the next unused identifier.** No LOCAL-012 document existed before this issuance. No LOCAL-013+ exists or is reserved. A distinct filename is used so predecessor DBA records and evidence remain **immutable**. This is **not** a new document class, **not** a new governance tier, **not** a new PAD, **not** PAD-054, **not** a BCR Implementation Authorization, **not** BCR-IA-012, **not** a HMIR IA, **not** a reconstruction IA, **not** a Guard Implementation Authorization, **not** a Design Amendment, **not** a restoration execution, **not** a host-remediation automation authorization, **not** a process-kill authorization, **not** a port-remap authorization, **not** a migration-repair authorization, **not** a quarantine amendment, **not** a RU-1.4 Runtime Execution Authorization, **not** an EIR decision, **not** Acceptance, and **not** Certification.

> **Superseding authority:** LOCAL-012 **supersedes LOCAL-011 only for one future execution attempt**. It **must not** alter, amend, or reclassify predecessor evidence. LOCAL-011 remains **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE**. LOCAL-011 retry remains **NOT AUTHORIZED**. LOCAL-001–010 remain immutable.

> **Document class:** Bounded **Database Application Authorization** record only. It **does not execute** LOCAL-012. It **does not** retarget the replay artifact. It **does not** issue E-02-BCR-IA-012. It **does not** edit the HMD-005 reconstruction or target. It **does not** authorize production deployment · remote database mutation · repo-root `supabase start` · raw Postgres/Docker Compose replacement · replay-artifact source modification · DBA-ID spoofing / substitution of LOCAL-011 · process termination · Studio/port remapping · `config.toml` edit · Docker networking mutation · RU-1.4 runtime evidence · RPC invocation · destructive fixtures · concurrency tests · Docker log collection · EIR reclassification · Acceptance · Project Certification · or Final COMMIT path unblock.

> **Controlling authority finding (not reopened):** No new Program Authority Decision is required. PAD-012 · PAD-013 · PAD-018 · PAD-023 · PAD-030 already govern successor local DBA attempts. **DAA-014-C** restates named technical guard inputs. PAD-053 / Completion-002 contemplate successor DBA after HMD-005 repository reconstruction. PAD-054+ is **not** allocated.

```
DATABASE APPLICATION AUTHORIZATION (SUCCESSOR)  = APPROVED WITH CONDITIONS
AUTHORIZATION ID                                = E-02-DBA-LOCAL-012
CONSUMPTION                                     = NOT CONSUMED
EXECUTION                                       = GATED / NOT PERFORMED / NOT EXECUTED
STATEFUL APPLY ATTEMPTS                         = 0
PREDECESSOR E-02-DBA-LOCAL-011                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-011 RETRY                                 = NOT AUTHORIZED
LOCAL-011 STATEFUL APPLY ATTEMPTS               = 1
LOCAL-011 EVIDENCE RUN                          = local-011-20260827a
LOCAL-011 EXECUTED MIGRATIONS                   = 56
LOCAL-011 HIGHEST APPLIED                       = 20260328120000_owner_info_council_manager_approve.sql
LOCAL-011 FIRST FAILING MIGRATION               = 20260329103000_add_admin_user_role_and_policy.sql
LOCAL-011 FAILURE TEXT                          = unsafe use of new value "admin" of enum type user_role
PAD-053                                         = ISSUED / IMMUTABLE
E-02-HFSOR-IA-002                               = CONSUMED
E-02 HFSOR IMPLEMENTATION COMPLETION-002        = COMPLETED WITH NOTES
HMD-005                                         = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
RECONSTRUCTION                                  = 20260329102500_hmd005_reconstruct_user_role_admin.sql
TARGET                                          = 20260329103000_add_admin_user_role_and_policy.sql
TARGET                                          = IMMUTABLE / UNCHANGED
AUTHORIZED ENVIRONMENT                          = LOCAL_DISPOSABLE_SUPABASE ONLY
AUTHORIZED CLEAN-BASE MODE                      = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS (CB-B)
AUTHORIZED BASELINE MODE                        = E02_DECLARED_BASELINE_REPLAY
DECLARED QUARANTINE SET                         = EXACTLY ONE FILE
QUARANTINED MIGRATION                           = 20260314195641_add_demo_data.sql
CURRENT ARTIFACT AUTHORITY METADATA             = E-02-BCR-IA-011 (UNMODIFIED BY THIS DBA)
CURRENT ARTIFACT DBA PIN                        = E-02-DBA-LOCAL-011
DBA RUNTIME ID                                  = E02_DBA_AUTHORIZATION_ID / EXACT E-02-DBA-LOCAL-012
PRE-EXECUTION ARTIFACT-ID COMPATIBILITY         = INCOMPATIBLE (artifact exact-pinned to E-02-DBA-LOCAL-011)
LOCAL-012 BCR COMPATIBILITY                     = BLOCKED UNTIL SUCCESSOR BCR RETARGET
SUCCESSOR BCR IA REQUIRED                       = YES (expected family E-02-BCR-IA-012; not this issuance; verify sequence when issued)
E02_RUNTIME_EXECUTION_AUTHORIZED                = UNSET / FALSE / PROHIBITED
DATABASE APPLICATION EXECUTION (THIS TASK)      = NOT PERFORMED
DATABASE APPLICATION EXECUTION (FUTURE)         = AUTHORIZED TO BEGIN / GATED / NOT EXECUTED
```

---

## 1. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-002.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-002.md) | **Direct predecessor checkpoint** — COMPLETED WITH NOTES · NEXT = successor BCR / DBA governance |
| [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-002.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-002.md) | **E-02-HFSOR-IA-002 CONSUMED** |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md) | **PAD-053 ISSUED / IMMUTABLE** · HMD-005 Option B pre-target enum-commit compatibility reconstruction |
| [`E-02-Database-Application-Authorization-LOCAL-011.md`](E-02-Database-Application-Authorization-LOCAL-011.md) · evidence | **APPLICATION_FAILED** at `20260329103000` (`unsafe use of new value "admin" of enum type user_role`) · executed **56** · **immutable** · retry **NOT AUTHORIZED** |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011–PAD-025 · **PAD-012 DBA class** · PAD-013 granularity · PAD-018 start · PAD-020 DBA ≠ REA · PAD-023 failure policy · PAD-024 / DAA-014 |
| [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) | DAA-014-C · EG-B · named technical guard inputs |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-011.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-011.md) | **E-02-BCR-IA-011 CONSUMED** — pin still `EXPECTED_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-011` |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-011.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-011.md) | **COMPLETED WITH NOTES** — retarget LOCAL-010 → LOCAL-011 statically verified |
| Artifact (read-only, this issuance) | `scripts/verification/e02/replay-e02-declared-baseline.ts` · `verify-db-baseline.ts` · `environment-guard.ts` |

**Mechanism finding:** This successor DBA is **environment + host-readiness (Docker warm-engine and host TCP 54323 FREE) + named technical guard inputs (DAA-014-C) + clean-base-mode + migration-set + baseline-mode + lifecycle + HMD-005 reconstruction runtime-proof + HMD-003 remaining-checkpoint runtime-proof + preserved HMD-002 / HMD-004 checkpoint evidence scoped**. It is **not** project-wide blanket permission, **not** production, **not** RU-1.4 REA, **not** artifact code authorization, **not** BCR retarget, **not** host-process remediation, **not** Studio port remapping, **not** destructive-fixture authorization, **not** source restoration.

---

## 2. Incoming authoritative state (locked)

| Item | Status |
|------|--------|
| PAD-053 | **ISSUED / IMMUTABLE** · OPTION B · pre-target enum-commit compatibility reconstruction |
| E-02-HFSOR-IA-002 | **CONSUMED** |
| E-02-HFSOR-IMPLEMENTATION-COMPLETION-002 | **COMPLETED WITH NOTES** |
| HMD-005 | **OPEN / DEFECT CLASSIFIED / HISTORICAL MIGRATION TRANSACTION-BOUNDARY COMPATIBILITY DEFECT / COMPATIBILITY RECONSTRUCTION SELECTED / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |
| Reconstruction | `supabase/migrations/20260329102500_hmd005_reconstruct_user_role_admin.sql` |
| Reconstruction SQL | `ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';` |
| Target | `supabase/migrations/20260329103000_add_admin_user_role_and_policy.sql` |
| Target status | **IMMUTABLE / UNCHANGED** |
| E-02-DBA-LOCAL-011 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-011 retry | **NOT AUTHORIZED** |
| LOCAL-011 evidenceRunId | `local-011-20260827a` |
| LOCAL-011 executed | **56** |
| LOCAL-011 highest applied | `20260328120000_owner_info_council_manager_approve.sql` |
| LOCAL-011 first failing | `20260329103000_add_admin_user_role_and_policy.sql` |
| LOCAL-011 failure text | `unsafe use of new value "admin" of enum type user_role` |
| HMD-001 | **OPEN / DISTINCT** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT** |
| HMD-003 | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |
| HMD-004 | **SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** |
| Quarantine | exactly `20260314195641_add_demo_data.sql` · **count 1** |
| Current artifact DBA pin | **E-02-DBA-LOCAL-011** |
| Current artifact authority | **E-02-BCR-IA-011** |
| Database baseline | **NOT VERIFIED** |
| RU-1.1 / RU-1.2 | **NOT APPLIED** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |

Completion-002 is **not** runtime proof. Do **not** reopen HMD-002 or HMD-004. Do **not** mark HMD-003 or HMD-005 runtime verified.

---

## 3. Predecessor DBA history (immutable)

| ID | Disposition |
|----|-------------|
| LOCAL-001 | NOT CONSUMED / SUPERSEDED FOR FUTURE EXECUTION / IMMUTABLE |
| LOCAL-002 | APPLICATION_FAILED / NOT CONSUMED / IMMUTABLE |
| LOCAL-003 | APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE |
| LOCAL-004 | APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE |
| LOCAL-005 | APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE |
| LOCAL-006 | APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE |
| LOCAL-007 | APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE |
| LOCAL-008 | APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE |
| LOCAL-009 | APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE |
| LOCAL-010 | APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE |
| LOCAL-011 | APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE |

LOCAL-012 is the **next unused** local DBA identifier. No later DBA exists. No newer authority supersedes this path. LOCAL-011 is **permanently non-retriable** and **not resumable**.

**Do not** reclassify LOCAL-011 as `BLOCKED`, `CONSUMED`, `APPLIED`, superseded failure, or successful. **Do not** retry LOCAL-011. **Do not** overwrite LOCAL-011 evidence.

---

## 4. Decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-DBA-LOCAL-012** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Consumption** | **NOT CONSUMED** |
| **Execution this task** | **NOT PERFORMED** |
| **Future execution** | **AUTHORIZED TO BEGIN / GATED / BLOCKED UNTIL SUCCESSOR BCR RETARGET** |
| **Runtime DBA identity** | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-012` (exact; **no source edit**; **no LOCAL-011 substitution**; **no spoofing**) |
| **Compatibility at issuance** | **BLOCKED UNTIL SUCCESSOR BCR RETARGET** |
| **Stateful apply attempts at issuance** | **0** |

---

## 5. Authorized purpose / environment

Authorize **ONE** future fresh local disposable CB-B database application attempt whose purpose is to verify the **full reconstructed baseline**, including:

- named DAA-014-C technical guard inputs on the apply path
- preserved HMD-002 restored migration `20260315035847_add_meeting_templates_and_attachments.sql`
- preserved W1 `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql`
- preserved HMD-004 target `20260320045054_enhance_dispute_resolution_system.sql`
- **HMD-005 reconstruction** `20260329102500_hmd005_reconstruct_user_role_admin.sql`
- **HMD-005 target** `20260329103000_add_admin_user_role_and_policy.sql` (prior LOCAL-011 enum error must not recur)
- HMD-003 W2 reconstruction
- April HARD `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql`
- governed July S1 `20260711120000_invoice_ai_audit_v1.sql` (unmodified)
- downstream migration replay
- RU-1.1 actual application
- RU-1.2 metadata (no RPC invocation)
- baseline verifier after preserve

**Authorized environment:** `LOCAL_DISPOSABLE_SUPABASE` only.  
**Clean-base mode:** `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` (CB-B).  
**Baseline mode:** `E02_DECLARED_BASELINE_REPLAY`.

Preserve existing BCR replay architecture. **Forbidden environments:** production · staging · remote hosted · shared development · existing user database · repo-root stack. Ambiguous classification → **fail closed**.

---

## 6. HMD-005 future runtime objective

LOCAL-012 future replay **must** establish actual evidence that:

```
RECONSTRUCTION 20260329102500_hmd005_reconstruct_user_role_admin.sql
  = REACHED / APPLIED
TARGET 20260329103000_add_admin_user_role_and_policy.sql
  = REACHED / APPLIED
PRIOR ERROR (unsafe use of new value "admin" of enum type user_role)
  = NOT REPRODUCED
```

Repository Completion-002 **does not** establish this proof.

---

## 7. HMD-003 remaining runtime checkpoints

If replay progresses beyond HMD-005, future LOCAL-012 evidence **must** continue pending HMD-003 checkpoints:

| Checkpoint | Filename | LOCAL-011 evidence | Future LOCAL-012 requirement |
|------------|----------|--------------------|------------------------------|
| W1 | `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql` | **REACHED / APPLIED** | preserve as checkpoint |
| HMD-004 target | `20260320045054_enhance_dispute_resolution_system.sql` | **REACHED / APPLIED** | preserve as checkpoint |
| W2 | `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` | **NOT REACHED** | **REACHED / APPLIED** |
| April HARD | `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | **NOT REACHED** | **REACHED / APPLIED** |
| Governed July S1 | `20260711120000_invoice_ai_audit_v1.sql` | **NOT REACHED** | **REACHED / APPLIED** |

HMD-003 cannot become runtime replay verified until W2, April HARD, and governed July S1 are each **REACHED / APPLIED**.

**July S1 lock:** Completion-002 reconciled the implementation-report typo. Governed July S1 remains `20260711120000_invoice_ai_audit_v1.sql`. `20260701120000_invoice_audit_reports_storage_path_email.sql` is **not** the HMD-003 S1 checkpoint.

---

## 8. Historical checkpoint preservation (HMD-002 / HMD-004)

Do **not** reopen HMD-002 or HMD-004. Future replay should continue to record:

| Checkpoint | Expected |
|------------|----------|
| HMD-002 `20260315035847_add_meeting_templates_and_attachments.sql` | **REACHED / APPLIED** · prior HMD-002 error **NOT REPRODUCED** |
| W1 `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql` | **REACHED / APPLIED** |
| HMD-004 `20260320045054_enhance_dispute_resolution_system.sql` | **REACHED / APPLIED** |
| `relation "invoices" does not exist` | **NOT REPRODUCED** |
| `syntax error at or near "category"` | **NOT REPRODUCED** |

These remain **checkpoint evidence**. Already-verified HMD-002 / HMD-004 statuses are **not** reclassified by this DBA.

---

## 9. Quarantine lock

```
QUARANTINE = EXACTLY 20260314195641_add_demo_data.sql / COUNT 1
```

**Do not quarantine:** HMD-002 migration · W1 · HMD-004 target · HMD-005 reconstruction · HMD-005 target · W2 · April HARD · governed July S1.

No quarantine expansion. Option D / second quarantine **NOT AUTHORIZED**.

---

## 10. Named technical environment inputs (DAA-014-C — required)

For the **future** LOCAL-012 stateful apply path **only**, after successor BCR retarget and Completion, authorize jointly:

```
E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-012
E02_BCR_APPLY_AUTHORIZED=true
E02_ALLOW_DESTRUCTIVE_TESTS=true
E02_EVIDENCE_ENV=local
```

**No bypass. Use only source-supported gates.** These four controls remain **orthogonal**.

### 10.1 `E02_ALLOW_DESTRUCTIVE_TESTS=true`

**Authorized solely as** the DAA-014-C **technical fail-closed input** for disposable DB-backed DBA/BCR paths that invoke `validateEnvironmentGuard()`.

**TRUE itself executes nothing.** Guard PASS **≠** governance authorization.

Setting this variable **does NOT** authorize:

- destructive fixtures
- RU-1.4 runtime tests
- RPC invocation
- concurrency evidence
- security evidence
- REA-governed work

A DBA-authorized bounded disposable reset (`DROP SCHEMA public CASCADE` + recreation of `public` / `supabase_migrations`) remains **Category A** CB-B lifecycle. It is **not** RU-1.4 destructive-fixture execution merely because this technical input is required.

### 10.2 `E02_EVIDENCE_ENV=local`

Separate **environment classification** input. Not a substitute for DBA, BCR apply, baseline, or RU-1.4 authority.

### 10.3 `E02_BCR_APPLY_AUTHORIZED=true`

Separate BCR **apply** opt-in. Authorized **only** for the future governed LOCAL-012 apply path after all pre-gates PASS, including successor BCR retarget Completion.

### 10.4 `E02_DBA_AUTHORIZATION_ID`

Future runtime **must** equal **exactly**:

```
E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-012
```

No dual acceptance of LOCAL-011. No prefix/regex/override. No source edit under DBA authority.

---

## 11. Runtime authority variable — prohibited

```
E02_RUNTIME_EXECUTION_AUTHORIZED
  MUST remain unset or not equal to "true"
```

**Explicitly prohibit** `E02_RUNTIME_EXECUTION_AUTHORIZED=true` for LOCAL-012 application/replay.

RU-1.4 runtime authority has **not** been issued. LOCAL-012 **must not** run: RU-1.4 · destructive fixtures · runtime security tests · concurrency tests · RPC evidence · REA-governed evidence paths.

Do **not** interpret `E02_ALLOW_DESTRUCTIVE_TESTS=true` as permission to set runtime execution authority.

---

## 12. Current BCR state / successor retarget requirement

At this issuance the artifact remains:

```
scripts/verification/e02/replay-e02-declared-baseline.ts
EXPECTED_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-011
ARTIFACT_AUTHORIZATION_ID     = E-02-BCR-IA-011
```

**This DBA does not edit the artifact.** Exact-match therefore **blocks** LOCAL-012 execution until a successor BCR retarget.

```
LOCAL-012 BCR COMPATIBILITY = BLOCKED UNTIL SUCCESSOR BCR RETARGET
```

Expected future successor BCR authority family: **next unused BCR IA after E-02-BCR-IA-011**. Likely `E-02-BCR-IA-012` / `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-012.md`. **Do not issue it in this task.** Do **not** treat the expected identifier as issued authority until its own governance task verifies the sequence.

After future retarget:

- artifact expected DBA **must** equal `E-02-DBA-LOCAL-012`
- runtime env **must** equal `E-02-DBA-LOCAL-012`
- exact-match **RETAINED**
- dual-accept **NONE**
- LOCAL-011 **must not** remain operationally accepted

Successor BCR implementation must be **repository/static only** and **must** have a successor BCR Completion before runtime.

---

## 13. Baseline verifier — success-path only

Baseline verifier is **not** part of this DBA issuance task.

During BCR replay/application, `E02_BASELINE_VERIFICATION_AUTHORIZED` **must not** be set to `true` and **must not** substitute for apply authority.

Only after **application success + preserve/handoff success**, invoke **exactly**:

```
npm run verify:e02:baseline
```

with success-path baseline authorization. This **does not** authorize RU-1.4.

---

## 14. Docker warm / TCP 54323 / fresh plan (future)

When LOCAL-012 eventually becomes runtime eligible, require **before** the single stateful apply:

1. LOCAL-012 issued / not consumed / not executed
2. successor BCR retarget implemented and completion-certified
3. Docker engine warm / responsive
4. TCP 54323 FREE (available for bind)
5. fresh DB-free `--plan` = `PLAN_OK`
6. exact LOCAL-012 DBA environment
7. DAA-014-C technical guard inputs
8. `E02_RUNTIME_EXECUTION_AUTHORIZED` unset / false
9. quarantine exactly one
10. stateful apply attempts = **0**

Any failure before `--apply` starts:

```
RESULT = BLOCKED
STATEFUL APPLY ATTEMPTS remain 0
NO --apply
```

**Process kill:** **NOT AUTHORIZED.**  
**Port remap / Studio port change / `config.toml` edit / Docker networking mutation:** **NOT AUTHORIZED.**

Migration counts **must be rediscovered** at execution time. Do **not** hard-code 286/285 as runtime truth.

Expected successful future plan must prove at least:

| Field | Required |
|-------|----------|
| `result` | `PLAN_OK` |
| `expectedDbaAuthorizationId` | `E-02-DBA-LOCAL-012` |
| `artifactAuthorizationId` | successor BCR authority issued for LOCAL-012 |
| environment | `LOCAL_DISPOSABLE_SUPABASE` |
| CB-B | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` |
| baseline mode | `E02_DECLARED_BASELINE_REPLAY` |
| `quarantineCount` | **1** |
| quarantined migration | `20260314195641_add_demo_data.sql` |

---

## 15. Gate ordering (locked)

1. Governance pre-gate (this DBA NOT CONSUMED · LOCAL-011 immutable · no later superseding DBA)
2. Artifact-ID compatibility PASS (after successor BCR retarget Completion)
3. Docker warm-engine PASS
4. TCP 54323 FREE
5. `--plan` PASS
6. Named technical guard inputs present (`E02_ALLOW_DESTRUCTIVE_TESTS=true` · `E02_EVIDENCE_ENV=local` · `E02_BCR_APPLY_AUTHORIZED=true` · exact DBA ID)
7. Then **exactly one** `--apply --preserve-environment`

---

## 16. Single stateful apply rule

LOCAL-012 authorizes at most **EXACTLY ONE** future stateful `--apply --preserve-environment`, and only after successor BCR retarget implementation and Completion.

```
BEFORE STATEFUL APPLY STARTS  = attempts 0
ONCE STATEFUL APPLY STARTS    = attempts 1
NO silent retry
NO automatic retry
NO second --apply
NO LOCAL-012 reuse after a started failed apply
NO automatic LOCAL-013
```

If application fails:

```
LOCAL-012 =
  APPLICATION_FAILED /
  NOT SUCCESSFULLY CONSUMED /
  EVIDENCE IMMUTABLE /
  NO RETRY
THEN RETURN TO GOVERNANCE
```

Do **not** automatically create LOCAL-013. No source/migration/guard/verifier fix under DBA authority. No quarantine expansion. No process kill. No port remap. No HMD-005 reconstruction or target edit under this DBA.

---

## 17. Authorized lifecycle (future; not this task)

After successor BCR retarget Completion **and** all pre-gates PASS, one governed:

```
--apply --preserve-environment
```

Fresh auxiliary project. Auxiliary timestamped migrations before start = **0**.

Then:

```
aux init
→ aux start
→ aux status
→ validateEnvironmentGuard (named DAA-014-C inputs)
→ platform baseline
→ app-history validation
→ application-layer reset (bounded public / supabase_migrations only)
→ truthful replay
→ HMD-002 restored file (checkpoint)
→ W1 (checkpoint)
→ 20260320045054 (HMD-004 checkpoint; former invoices-missing and category syntax must not recur)
→ HMD-005 reconstruction 20260329102500
→ HMD-005 target 20260329103000 (prior admin enum error must not recur)
→ W2
→ April HARD
→ July S1 collision path
→ downstream replay
→ RU-1.1 actual application
→ RU-1.2 metadata (no RPC)
→ manifest
→ preserve
→ baseline verifier (E02_BASELINE_VERIFICATION_AUTHORIZED=true; RUNTIME unset)
→ explicit cleanup
```

---

## 18. Result taxonomy

Use only:

- `APPLIED_AND_BASELINE_VERIFIED`
- `APPLICATION_FAILED`
- `APPLIED_BASELINE_FAILED`
- `BLOCKED`
- `NOT_RUN`

**Do not invent a new success state.** Do **not** use: `EIR_PASS` · `COMMITTED` · `PROJECT_CERTIFIED` · `FULL_REPLAY_PASS`.

| Condition | Result |
|-----------|--------|
| Artifact not retargeted / still pinned to LOCAL-011 | `BLOCKED` |
| Docker not warm before apply | `BLOCKED` |
| TCP 54323 occupied before apply | `BLOCKED` |
| `--plan` fails before stateful execution | `BLOCKED` / `NOT_RUN` per existing semantics |
| Stateful apply starts and then fails | `APPLICATION_FAILED` |
| Application succeeds but baseline verifier fails | `APPLIED_BASELINE_FAILED` |
| Application + baseline both pass | `APPLIED_AND_BASELINE_VERIFIED` |

---

## 19. Authorization consumption semantics

LOCAL-012 becomes **CONSUMED** **only** if:

1. single governed application succeeds;
2. all planned executable migrations apply;
3. preserve/handoff succeeds;
4. baseline verifier success-path executes;
5. baseline verifier passes.

Then and only then:

```
RESULT                      = APPLIED_AND_BASELINE_VERIFIED
LOCAL-012                   = CONSUMED
DATABASE BASELINE VERIFIED  = YES
```

| Outcome | Consumption |
|---------|-------------|
| Pre-stateful gate failure | **NOT CONSUMED** (attempts remain 0) |
| Stateful apply failure | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE / NO RETRY** |
| Applied baseline failure | **NOT SUCCESSFULLY CONSUMED / APPLIED_BASELINE_FAILED / EVIDENCE IMMUTABLE / NO RETRY** |

Do **not** mark CONSUMED merely because Docker started, plan passed, reconstruction applied, target applied, or all migrations applied but baseline failed.

Only `APPLIED_AND_BASELINE_VERIFIED` may later permit governance to consider **ISSUE E-02-RU-1.4-REA**. REA is **NOT** issued in this task.

---

## 20. RU-1.1 / RU-1.2 / RU-1.4 locks

At issuance:

| Item | Status |
|------|--------|
| RU-1.1 | **NOT APPLIED** |
| RU-1.2 | **NOT APPLIED** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| RPC | **NOT AUTHORIZED** |
| REA | **NOT ISSUED** |
| Database baseline verified | **NO** |

LOCAL-012 success path **must** require actual application of RU-1.1 and actual application + metadata proof of RU-1.2. Do **not** satisfy RU-1.2 by invoking `execute_owner_vote_atomic_freeze_commit` or any other runtime RPC.

---

## 21. EIR / Acceptance / Certification (unchanged)

| Item | Status |
|------|--------|
| EIR PASS | **NONE** |
| Acceptance | **BLOCKED** |
| Certification | **NOT ISSUED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Final COMMIT path | **BLOCKED** |

Issuing LOCAL-012 does **not** change these. **No commit** in this task.

---

## 22. Future evidence path

Reserve, **do not create** in this issuance:

```
docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-012.md
```

Prior LOCAL-011 evidence remains **immutable**. **No fake runtime evidence.** **No secrets.**

---

## 23. Current issuance effect

```
E-02-DBA-LOCAL-012                     = APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED / NOT EXECUTED
STATEFUL APPLY ATTEMPTS                = 0
DATABASE APPLICATION                   = AUTHORIZED TO BEGIN / GATED / NOT EXECUTED
LOCAL-012 BCR COMPATIBILITY            = BLOCKED UNTIL SUCCESSOR BCR RETARGET
DAA-014-C                              = ISSUED / CONSUMED AS NAMING RULE FOR THIS DBA
HOST TCP 54323 GATE                    = MANDATORY (FREE / AVAILABLE FOR BIND)
DOCKER PRE-WARM GATE                   = MANDATORY
PAD-053                                = ISSUED / IMMUTABLE
HMD-005                                = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME PENDING
LOCAL-011                              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
```

---

## 24. Next action (this issuance)

```
NEXT = ISSUE SUCCESSOR BCR RETARGET
       IMPLEMENTATION AUTHORIZATION
       FOR LOCAL-012
```

That later task must:

- verify LOCAL-012 is issued / gated / not executed;
- verify next unused BCR IA identifier;
- likely retarget artifact from LOCAL-011 to LOCAL-012;
- likely advance artifact authority IA-011 to successor IA;
- authorize only the exact bounded semantic pin changes required by repository precedent;
- preserve exact-match;
- preserve no-dual-acceptance;
- perform repository/static implementation only;
- require a successor BCR Completion before runtime.

**Not created. Not implemented.** Expected family (verify later): `E-02-BCR-IA-012`. LOCAL-012 **must not** be executed until that retarget Completion exists and compatibility PASS.

---

## 25. Confirmation of no executable work

**No** environment-variable mutation · **no** `E02_ALLOW_DESTRUCTIVE_TESTS=true` execution in this task · **no** `E02_EVIDENCE_ENV` mutation · **no** `E02_RUNTIME_EXECUTION_AUTHORIZED` · **no** `E02_BASELINE_VERIFICATION_AUTHORIZED` · **no** source modification · **no** guard modification · **no** BCR artifact modification · **no** BCR retarget · **no** BCR-IA-012 · **no** BCR Completion-012 · **no** verifier modification · **no** migration modification · **no** HMD-005 reconstruction/target modification · **no** W1/W2 modification · **no** package/test modification · **no** database · **no** Supabase init/start/status/stop · **no** Docker mutation · **no** `--apply` · **no** `--plan` as this issuance’s execution · **no** LOCAL-011 retry · **no** LOCAL-012 execution · **no** LOCAL-012 evidence creation · **no** RU-1.4 · **no** REA · **no** RPC · **no** fixtures · **no** EIR/Acceptance/Certification change · **no** commit.

Only this record and [`README.md`](README.md) are written.

---

## 26. Lock statement

```
E-02-DBA-LOCAL-012                         = APPROVED WITH CONDITIONS /
                                             NOT CONSUMED /
                                             EXECUTION GATED /
                                             NOT EXECUTED
PAD-053                                    = ISSUED / IMMUTABLE
E-02-HFSOR-IA-002                          = CONSUMED
E-02-HFSOR-IMPLEMENTATION-COMPLETION-002   = COMPLETED WITH NOTES
HMD-005                                    = OPEN /
                                             RECONSTRUCTION IMPLEMENTED /
                                             IMPLEMENTATION COMPLETED /
                                             RUNTIME REPLAY VERIFICATION PENDING
HMD-001                                    = OPEN / DISTINCT
HMD-002                                    = SOURCE INTEGRITY RESTORED /
                                             RUNTIME REPLAY VERIFIED / DISTINCT
HMD-003                                    = OPEN /
                                             RECONSTRUCTION IMPLEMENTED /
                                             IMPLEMENTATION COMPLETED /
                                             RUNTIME REPLAY VERIFICATION PENDING
HMD-004                                    = SOURCE INTEGRITY RESTORED /
                                             IMPLEMENTATION COMPLETED /
                                             RUNTIME REPLAY VERIFIED
RECONSTRUCTION                             = 20260329102500_hmd005_reconstruct_user_role_admin.sql
TARGET                                     = 20260329103000_add_admin_user_role_and_policy.sql
TARGET                                     = IMMUTABLE / UNCHANGED
GOVERNED JULY S1                           = 20260711120000_invoice_ai_audit_v1.sql
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql /
                                             COUNT 1
AUTHORIZED ENVIRONMENT                     = LOCAL_DISPOSABLE_SUPABASE
CB-B                                       = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
BASELINE MODE                              = E02_DECLARED_BASELINE_REPLAY
E02_ALLOW_DESTRUCTIVE_TESTS                = AUTHORIZED AS TECHNICAL FAIL-CLOSED INPUT
                                             FOR LOCAL DISPOSABLE DB-BACKED DBA/BCR PATH /
                                             NOT DESTRUCTIVE FIXTURE AUTHORITY
E02_EVIDENCE_ENV                           = local
E02_BCR_APPLY_AUTHORIZED                   = true
                                             FOR FUTURE GOVERNED LOCAL-012 APPLY ONLY
E02_DBA_AUTHORIZATION_ID                   = E-02-DBA-LOCAL-012
                                             FOR FUTURE GOVERNED EXECUTION
E02_RUNTIME_EXECUTION_AUTHORIZED           = UNSET / FALSE /
                                             RU-1.4 NOT AUTHORIZED
BASELINE VERIFICATION                      = SUCCESS-PATH ONLY
LOCAL-011                                  = APPLICATION_FAILED /
                                             NOT SUCCESSFULLY CONSUMED /
                                             EVIDENCE IMMUTABLE
LOCAL-011 RETRY                            = NOT AUTHORIZED
LOCAL-012 STATEFUL APPLY ATTEMPTS          = 0
CURRENT ARTIFACT DBA PIN                   = E-02-DBA-LOCAL-011
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-011
LOCAL-012 BCR COMPATIBILITY                = BLOCKED UNTIL SUCCESSOR BCR RETARGET
EXACT-MATCH                                = RETAINED
DUAL-ACCEPT                                = NONE
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = ISSUE SUCCESSOR BCR RETARGET
                                             IMPLEMENTATION AUTHORIZATION
                                             FOR LOCAL-012
                                             EXPECTED E-02-BCR-IA-012
                                             SUBJECT TO SEQUENCE VERIFICATION
EXECUTABLE WORK                            = NONE
```

---

**End of document — E-02-DBA-LOCAL-012 — v1.0 — 2026-08-28**
