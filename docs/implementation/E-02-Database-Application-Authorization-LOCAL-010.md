# E-02 — Database Application Authorization (Successor)

## Local Disposable Evidence Environment · CB-B Clean-Base · Declared Baseline Replay · Named Technical Guard Inputs (DAA-014-C) · Enhanced Start Diagnostics · Docker Pre-Warm Gate · Strict Host TCP 54323 Readiness · HMD-002 Runtime Replay Verification · HMD-003 Reconstruction Runtime Proof

| Field | Value |
|-------|-------|
| **Document Type** | **Database Application Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-010** |
| **Predecessor** | **E-02-DBA-LOCAL-009** — [`E-02-Database-Application-Authorization-LOCAL-009.md`](E-02-Database-Application-Authorization-LOCAL-009.md) · evidence [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-009.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-009.md) · **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| **Prior predecessors** | **E-02-DBA-LOCAL-008** · **E-02-DBA-LOCAL-007** · **E-02-DBA-LOCAL-006** · **E-02-DBA-LOCAL-005** · **E-02-DBA-LOCAL-004** · **E-02-DBA-LOCAL-003** · **E-02-DBA-LOCAL-002** · **E-02-DBA-LOCAL-001** — **FAILED or NOT CONSUMED / IMMUTABLE** |
| **Classification** | **DATABASE APPLICATION ATTEMPT — HMD-003 RECONSTRUCTION RUNTIME PROOF** (retains LOCAL-009 host-readiness + named DAA-014-C technical guard inputs) |
| **Guard clarification** | [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) (**DAA-014-C** · **EG-B** · **ISSUED**) |
| **Reconstruction authority** | **E-02-HFSOR-IA CONSUMED** · Completion [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion.md) (**COMPLETED WITH NOTES**) |
| **Restoration authority** | **E-02-HMIR-IA CONSUMED** · [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md) (**COMPLETED WITH NOTES**) |
| **Policy authority** | [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) (**PAD-051**) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) (PAD-039 – PAD-050) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025) |
| **BCR artifact authority (read-only at issuance)** | **E-02-BCR-IA-009 CONSUMED** · `ARTIFACT_AUTHORIZATION_ID=E-02-BCR-IA-009` · `EXPECTED_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-009` · artifact **unmodified by this DBA** |
| **Status** | **Approved With Conditions — NOT CONSUMED — EXECUTION GATED** |
| **Authority Level** | Database Application Authorization |
| **Effective Date** | 2026-08-26 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Database-Application-Authorization-LOCAL-010.md`](E-02-Database-Application-Authorization-LOCAL-010.md) |
| **Production Effect** | **None** from this record alone |

> **Authority path finding: YES.** `E-02-Database-Application-Authorization-LOCAL-010.md` is **authority-safe** as a **scoped successor Database Application Authorization** under the PAD-012 naming pattern (`E-02-Database-Application-Authorization-{scope}.md` · ID `E-02-DBA-{ENV}-{SEQ}`). Precedent: LOCAL-001 through LOCAL-009. Highest previously allocated local DBA identifier is **LOCAL-009**. **LOCAL-010 is the next unused identifier.** A distinct filename is used so predecessor DBA records and evidence remain **immutable**. This is **not** a new document class, **not** a new governance tier, **not** a new PAD, **not** PAD-052, **not** a BCR Implementation Authorization, **not** a Guard Implementation Authorization, **not** a Design Amendment, **not** a reconstruction IA, **not** a diagnostic-only execution class, **not** a host-remediation automation authorization, **not** a process-kill authorization, **not** a port-remap authorization, **not** a migration-repair authorization, **not** a quarantine amendment, **not** a RU-1.4 Runtime Execution Authorization, **not** an EIR decision, **not** Acceptance, and **not** Certification.

> **Superseding authority:** LOCAL-010 **supersedes LOCAL-009 only for one future execution attempt**. It **must not** alter, amend, or reclassify predecessor evidence. LOCAL-009 remains **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE**. LOCAL-009 retry remains **NOT AUTHORIZED**. LOCAL-001–008 remain immutable.

> **Document class:** Bounded **Database Application Authorization** record only. It **does not execute** LOCAL-010. It **does not** retarget the replay artifact. It **does not** authorize production deployment · remote database mutation · repo-root `supabase start` · raw Postgres/Docker Compose replacement · replay-artifact source modification · DBA-ID spoofing / substitution of LOCAL-009 · process termination · Studio/port remapping · `config.toml` edit · Docker networking mutation · RU-1.4 runtime evidence · RPC invocation · destructive fixtures · concurrency tests · Docker log collection · EIR reclassification · Acceptance · Project Certification · or Final COMMIT path unblock.

> **Controlling authority finding (not reopened):** No new Program Authority Decision is required. PAD-012 · PAD-013 · PAD-018 · PAD-023 · PAD-030 already govern successor local DBA attempts. **DAA-014-C** restates named technical guard inputs for disposable DB-backed replay. PAD-051 HFSO-009 contemplates successor DBA after HMD-003 reconstruction Implementation Completion. PAD-052+ is **not** allocated.

```
DATABASE APPLICATION AUTHORIZATION (SUCCESSOR)  = APPROVED WITH CONDITIONS
AUTHORIZATION ID                                = E-02-DBA-LOCAL-010
CONSUMPTION                                     = NOT CONSUMED
EXECUTION                                       = GATED / NOT PERFORMED
PREDECESSOR E-02-DBA-LOCAL-009                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-009 RETRY                                 = NOT AUTHORIZED
LOCAL-009 STATEFUL APPLY ATTEMPTS               = 1
LOCAL-009 FAILURE STAGE                         = ENVIRONMENT GUARD AFTER AUXILIARY START
LOCAL-009 MIGRATIONS EXECUTED                   = 0
LOCAL-009 FIRST FAILING MIGRATION               = NONE
PRIOR E-02-DBA-LOCAL-008 / 007 / 006 / 005 / 004 / 003 / 002 / 001
                                                = FAILED or NOT CONSUMED / IMMUTABLE
DAA-014-C                                       = ISSUED / EG-B
PAD-051                                         = ISSUED / IMMUTABLE
E-02-HFSOR-IA                                   = CONSUMED
HFSOR IMPLEMENTATION COMPLETION                 = COMPLETED WITH NOTES
HMD-003                                         = OPEN / POLICY SELECTED / RECONSTRUCTION IMPLEMENTED IN REPOSITORY / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
W1                                              = 20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql
W2                                              = 20260406000000_hmd003_reconstruct_invoice_ai_audits.sql
RECONSTRUCTION MIGRATIONS                       = EXACTLY 2
AUTHORIZED ENVIRONMENT                          = LOCAL_DISPOSABLE_SUPABASE ONLY
AUTHORIZED CLEAN-BASE MODE                      = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS (CB-B)
AUTHORIZED BASELINE MODE                        = E02_DECLARED_BASELINE_REPLAY
DECLARED QUARANTINE SET                         = EXACTLY ONE FILE
QUARANTINED MIGRATION                           = 20260314195641_add_demo_data.sql
HMD-002 RESTORED FILE QUARANTINE STATUS         = NOT QUARANTINED
W1 / W2 QUARANTINE STATUS                       = NOT QUARANTINED
OPTION D / SECOND QUARANTINE                    = NOT AUTHORIZED
TECHNICAL GUARD INPUTS (NAMED)                  = E02_ALLOW_DESTRUCTIVE_TESTS=true
                                                  + E02_EVIDENCE_ENV=local
E02_ALLOW_DESTRUCTIVE_TESTS                     = TECHNICAL FAIL-CLOSED INPUT /
                                                  NOT DESTRUCTIVE FIXTURE / RU-1.4 / RPC / REA AUTHORITY
E02_BCR_APPLY_AUTHORIZED                        = true (FUTURE GOVERNED APPLY ONLY)
E02_DBA_AUTHORIZATION_ID                        = EXACT E-02-DBA-LOCAL-010
E02_RUNTIME_EXECUTION_AUTHORIZED                = UNSET / FALSE / PROHIBITED
E02_BASELINE_VERIFICATION_AUTHORIZED            = SUCCESS-PATH ONLY
DOCKER PRE-WARM GATE                            = MANDATORY
HOST TCP 54323 GATE                             = MANDATORY (FREE / AVAILABLE FOR BIND before stateful Supabase)
PROCESS KILL                                    = NOT AUTHORIZED
PORT REMAP / STUDIO PORT CHANGE                 = NOT AUTHORIZED
CURRENT ARTIFACT AUTHORITY METADATA             = E-02-BCR-IA-009 (UNMODIFIED BY THIS DBA)
CURRENT ARTIFACT DBA PIN                        = E-02-DBA-LOCAL-009
DBA RUNTIME ID                                  = E02_DBA_AUTHORIZATION_ID / EXACT E-02-DBA-LOCAL-010
PRE-EXECUTION ARTIFACT-ID COMPATIBILITY (ISSUANCE READ-ONLY)
                                                = INCOMPATIBLE (artifact exact-pinned to E-02-DBA-LOCAL-009)
LOCAL-010 EXECUTION COMPATIBILITY               = BLOCKED UNTIL SUCCESSOR BCR RETARGET
SUCCESSOR BCR IA REQUIRED                       = YES (expected family E-02-BCR-IA-010; not this issuance; verify sequence when issued)
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
| [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) | **Direct predecessor checkpoint** — DAA-014-C · EG-B · named technical guard inputs · NEXT = LOCAL-010 |
| [`E-02-Database-Application-Authorization-LOCAL-009.md`](E-02-Database-Application-Authorization-LOCAL-009.md) · evidence | **APPLICATION_FAILED** at environment guard after auxiliary start · executed **0** · first failing migration **NONE** · **immutable** · retry **NOT AUTHORIZED** |
| [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion.md) | HMD-003 reconstruction **COMPLETED WITH NOTES** · W1/W2 in repository |
| [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization.md) | **E-02-HFSOR-IA CONSUMED** |
| [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) | PAD-051 · Option B · HFSO-009 successor DBA after Completion |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011–PAD-025 · PAD-012 DBA class · PAD-013 granularity · PAD-018 start · PAD-020 DBA ≠ REA · PAD-023 failure policy · PAD-024 / DAA-014 |
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | PAD-026–PAD-038 · PAD-030 successor DBA · single DATA_ONLY quarantine · HMD-001 |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) | PAD-039–PAD-050 · Option A · HMD-002 |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-009.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-009.md) | **E-02-BCR-IA-009 CONSUMED** — pin still `EXPECTED_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-009` |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-009.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-009.md) | **COMPLETED WITH NOTES** — retarget LOCAL-008 → LOCAL-009 statically verified |
| Artifact (read-only, this issuance) | `scripts/verification/e02/replay-e02-declared-baseline.ts` · `verify-db-baseline.ts` · `environment-guard.ts` |

**Mechanism finding:** This successor DBA is **environment + host-readiness (Docker warm-engine and host TCP 54323 FREE) + named technical guard inputs (DAA-014-C) + clean-base-mode + migration-set + baseline-mode + lifecycle + enhanced-diagnostics-consumption + HMD-002 runtime-proof + HMD-003 reconstruction runtime-proof scoped**. It is **not** project-wide blanket permission, **not** production, **not** RU-1.4 REA, **not** artifact code authorization, **not** host-process remediation, **not** Studio port remapping, **not** destructive-fixture authorization.

---

## 2. Incoming authoritative state (locked)

| Item | Status |
|------|--------|
| DAA-014-C | **ISSUED** · EG-B · `E02_ALLOW_DESTRUCTIVE_TESTS` = technical fail-closed input |
| PAD-051 | **ISSUED / IMMUTABLE** · Option B |
| E-02-HFSOR-IA | **CONSUMED** |
| HFSOR Implementation Completion | **COMPLETED WITH NOTES** |
| HMD-003 | **OPEN / POLICY SELECTED / RECONSTRUCTION IMPLEMENTED IN REPOSITORY / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |
| W1 | `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql` (**exists**) |
| W2 | `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` (**exists**) |
| Reconstruction file count | **2** |
| E-02-DBA-LOCAL-009 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-009 retry | **NOT AUTHORIZED** |
| LOCAL-009 stateful apply attempts | **1** |
| LOCAL-009 failure stage | **ENVIRONMENT GUARD AFTER AUXILIARY START** |
| LOCAL-009 failure text | `E02_ALLOW_DESTRUCTIVE_TESTS must equal "true" for destructive or DB-backed evidence paths` |
| LOCAL-009 migrations executed | **0** |
| LOCAL-009 first failing migration | **NONE** |
| LOCAL-008 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| HMD-001 | **OPEN / DISTINCT** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT** |
| Quarantine | exactly `20260314195641_add_demo_data.sql` · **count 1** |
| Current artifact DBA pin | **E-02-DBA-LOCAL-009** |
| Current artifact authority | **E-02-BCR-IA-009** |
| Database baseline | **NOT VERIFIED** |
| RU-1.1 / RU-1.2 | **NOT APPLIED** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |

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

LOCAL-010 is the **next unused** local DBA identifier. No later DBA exists. No newer authority supersedes this path.

**Do not** reclassify LOCAL-009 as `BLOCKED`. Pre-stateful gates passed and `--apply` started. **Do not** retry LOCAL-009. **Do not** overwrite LOCAL-009 evidence. **Do not** claim HMD-003 runtime was exercised by LOCAL-009 (replay executed 0).

---

## 4. Decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-DBA-LOCAL-010** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Consumption** | **NOT CONSUMED** |
| **Execution this task** | **NOT PERFORMED** |
| **Future execution** | **AUTHORIZED TO BEGIN / GATED** |
| **Runtime DBA identity** | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-010` (exact; **no source edit**; **no LOCAL-009 substitution**; **no spoofing**) |
| **Compatibility at issuance** | **BLOCKED UNTIL SUCCESSOR BCR RETARGET** |

---

## 5. Authorized purpose / environment

Authorize **ONE** future fresh local disposable CB-B database application attempt whose purpose is to verify the **full reconstructed baseline**, including:

- named DAA-014-C technical guard inputs on the apply path
- HMD-002 restored migration `20260315035847_add_meeting_templates_and_attachments.sql`
- HMD-003 W1 reconstruction
- HMD-003 W2 reconstruction
- downstream migration replay
- RU-1.1 actual application
- RU-1.2 metadata (no RPC invocation)
- baseline verifier after preserve

**Authorized environment:** `LOCAL_DISPOSABLE_SUPABASE` only.  
**Clean-base mode:** `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` (CB-B).  
**Baseline mode:** `E02_DECLARED_BASELINE_REPLAY`.

**Forbidden environments:** production · staging · remote hosted · shared development · existing user database · repo-root stack. Ambiguous classification → **fail closed**.

---

## 6. Named technical environment inputs (DAA-014-C — required)

Unlike LOCAL-009, this DBA **explicitly names** the technical guard inputs required by `validateEnvironmentGuard()` on the disposable DB-backed replay path.

For the **future** LOCAL-010 stateful apply path **only**, authorize jointly:

```
E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-010
E02_BCR_APPLY_AUTHORIZED=true
E02_ALLOW_DESTRUCTIVE_TESTS=true
E02_EVIDENCE_ENV=local
```

**No bypass. Use only source-supported gates.** These four controls remain **orthogonal** and **must not** be collapsed into one authorization concept.

### 6.1 `E02_ALLOW_DESTRUCTIVE_TESTS=true`

**Authorized solely as** the DAA-014-C **technical fail-closed input** for disposable DB-backed DBA/BCR paths that invoke `validateEnvironmentGuard()`.

**TRUE itself executes nothing.** Guard PASS **≠** governance authorization.

Setting this variable **does NOT** authorize:

- destructive fixtures
- RU-1.4 runtime tests
- RPC invocation
- concurrency evidence
- security evidence
- destructive seed/reset fixtures outside the DBA-authorized bounded application-layer reset
- REA-governed work

A DBA-authorized bounded disposable reset (`DROP SCHEMA public CASCADE` + recreation of `public` / `supabase_migrations` via `resetApplicationLayerForReplay()`) remains **Category A** CB-B lifecycle. It is **not** RU-1.4 destructive-fixture execution merely because this technical input is required.

### 6.2 `E02_EVIDENCE_ENV=local`

Separate **environment classification** input required by the current guard for CB-B / `LOCAL_DISPOSABLE_SUPABASE`. Not a substitute for DBA, BCR apply, baseline, or RU-1.4 authority.

### 6.3 `E02_BCR_APPLY_AUTHORIZED=true`

Separate BCR **apply** opt-in. Authorized **only** for the future governed LOCAL-010 apply path after all pre-gates PASS.

### 6.4 `E02_DBA_AUTHORIZATION_ID`

Future runtime **must** equal **exactly**:

```
E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-010
```

No dual acceptance of LOCAL-009. No prefix/regex/override. No source edit under DBA authority.

---

## 7. Runtime authority variable — prohibited

```
E02_RUNTIME_EXECUTION_AUTHORIZED
  MUST remain unset or not equal to "true"
```

**Explicitly prohibit** `E02_RUNTIME_EXECUTION_AUTHORIZED=true` for LOCAL-010 application/replay.

RU-1.4 runtime authority has **not** been issued. LOCAL-010 **must not** run: RU-1.4 · destructive fixtures · runtime security tests · concurrency tests · RPC evidence · REA-governed evidence paths.

Do **not** interpret `E02_ALLOW_DESTRUCTIVE_TESTS=true` as permission to set runtime execution authority.

---

## 8. Baseline verifier — success-path only

During BCR replay/application, `E02_BASELINE_VERIFICATION_AUTHORIZED` **must not** substitute for apply authority.

Only after **application success + preserve/handoff success**, invoke **exactly**:

```
npm run verify:e02:baseline
```

with:

```
E02_BASELINE_VERIFICATION_AUTHORIZED=true
E02_RUNTIME_EXECUTION_AUTHORIZED     unset / not "true"
```

Verifier remains **read-only metadata / baseline proof** within existing governed scope. **No** verifier source modification. **No** RPC invocation. After evidence is written, explicit `--cleanup` with the **same** DBA ID and evidence run ID.

Only **application success + baseline verifier PASS** may produce `APPLIED_AND_BASELINE_VERIFIED`.

---

## 9. Artifact compatibility gate (issuance read-only)

Runtime artifact: `scripts/verification/e02/replay-e02-declared-baseline.ts`.

Inspected **read-only** (this issuance):

| Constant / rule | Current value |
|-----------------|---------------|
| `ARTIFACT_AUTHORIZATION_ID` | **`E-02-BCR-IA-009`** |
| `EXPECTED_DBA_AUTHORIZATION_ID` | **`E-02-DBA-LOCAL-009`** |
| Match model | exact string equality against `process.env.E02_DBA_AUTHORIZATION_ID` (fail-closed) |
| Dual-accept / prefix / regex / override | **NONE** |

**Finding:** the current replay artifact **cannot accept** `E-02-DBA-LOCAL-010` without source modification.

```
PRE-EXECUTION ARTIFACT-ID COMPATIBILITY = INCOMPATIBLE
CURRENT PIN                             = E-02-DBA-LOCAL-009
CURRENT ARTIFACT AUTHORITY METADATA     = E-02-BCR-IA-009
REQUIRED PIN FOR LOCAL-010 EXECUTION    = E-02-DBA-LOCAL-010
SOURCE MODIFICATION UNDER THIS DBA      = NOT AUTHORIZED
LOCAL-009 SUBSTITUTION                  = NOT AUTHORIZED
LOCAL-010 EXECUTION COMPATIBILITY       = BLOCKED UNTIL SUCCESSOR BCR RETARGET
```

This DBA **does not** modify artifact source. **Do not** dual-accept LOCAL-009 and LOCAL-010.

Static metadata `ARTIFACT_AUTHORIZATION_ID` is **not** DBA execution authority.

---

## 10. Successor BCR IA (expected; not this issuance)

Exact next governance step after this DBA issuance:

```
ISSUE successor narrow BCR Implementation Authorization
Purpose: retarget EXPECTED_DBA_AUTHORIZATION_ID
         E-02-DBA-LOCAL-009 → E-02-DBA-LOCAL-010
         and corresponding truthful ARTIFACT_AUTHORIZATION_ID metadata
```

**Not created in this task.** Highest existing BCR IA is **E-02-BCR-IA-009** (**CONSUMED**). Expected next unused ID **may be** `E-02-BCR-IA-010` / `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-010.md`. **Verify repository sequence at that later issuance.** Do not implement the retarget here.

Expected later ordering:

1. Issue this DBA (LOCAL-010) — **this record**
2. Issue successor BCR IA (retarget only)
3. Implement retarget
4. Issue BCR Implementation Completion
5. **EXECUTE** LOCAL-010 **only after** compatibility PASS **and** Docker warm **and** TCP 54323 FREE **and** `--plan` PASS **and** named technical guard inputs present

---

## 11. Reconstruction runtime objectives (HMD-003)

LOCAL-010 success path **must** prove at runtime:

| # | Objective |
|---|-----------|
| A | W1 `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql` executes **before** `20260320045054_enhance_dispute_resolution_system.sql` |
| B | W1 creates `invoice_status`, `public.invoices`, and `public.financial_anomalies` |
| C | Former LOCAL-008 error `relation "invoices" does not exist` **does not recur** |
| D | Former LOCAL-008 frontier `20260320045054_enhance_dispute_resolution_system.sql` is reached and applied |
| E | W2 `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` executes **before** `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` |
| F | W2 establishes the authorized `invoice_ai_audits` S1 stub; April HARD dependencies execute |
| G | Unmodified `20260711120000_invoice_ai_audit_v1.sql` executes with `CREATE TABLE IF NOT EXISTS` plus later indexes against the reconstructed S1 object |
| H | No existing migration is edited or bypassed |

**Do not** alter W1, W2, the April HARD migration, or the July migration.

HMD-003 remains **runtime pending** until required reconstruction-related runtime evidence succeeds. Issuing LOCAL-010 **does not** close any HMD. HMD-002 / HMD-003 may change runtime-verification status **only** from actual future replay evidence.

---

## 12. HMD-002 runtime proof

Future LOCAL-010 replay **must reach** `20260315035847_add_meeting_templates_and_attachments.sql` and record whether it applies successfully.

HMD-002 may advance only from **this run’s** actual runtime evidence. Do **not** mark CLOSED merely because LOCAL-008 previously applied it. LOCAL-009 did **not** reach it. Prior LOCAL-004 parser failure must **not** reproduce. If it fails: **APPLICATION_FAILED** · **STOP** · do not edit the file.

---

## 13. Quarantine / HMD-001

Exactly:

```
20260314195641_add_demo_data.sql
COUNT = 1
```

**Do not quarantine:**

- `20260315035847_add_meeting_templates_and_attachments.sql`
- W1 `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql`
- W2 `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql`

No second quarantine. Option D remains rejected. HMD-001 remains **OPEN / DISTINCT**.

Any new migration failure: **CAPTURE → PERSIST EVIDENCE → CLEANUP → STOP → GOVERNANCE**. No automatic quarantine expansion. No skip/ignore of a new failure.

---

## 14. Truthful history

| Event | Record |
|-------|--------|
| Executed successfully | record applied normally |
| Quarantined | do not execute · do not record applied |
| Failed | **STOP** · do not record applied |

W1 and W2 are **real PAD-051-authorized reconstruction migrations**. They are **not** recovered historical source. When executed successfully they record **normally as applied**.

**FORBIDDEN:** fake historical origin `schema_migrations` rows · repair-as-applied · Option B history fabrication · mark missing hosted SQL applied · rewrite existing migration history · manual metadata manipulation.

Do **not** fabricate a first failing migration when failure occurs outside migration execution.

---

## 15. Docker warm-engine gate

Before **any** future stateful LOCAL-010 execution, Docker engine **must already be warm and responsive**. Require current runtime evidence such as:

```
docker version
docker ps
docker ps -a
```

The future execution **must not** rely on a cold Docker wake inside the governed apply.

If Docker is not responsive:

```
RESULT = BLOCKED
LOCAL-010 remains NOT CONSUMED
```

Do **not** start stateful Supabase.

---

## 16. Host TCP 54323 gate

Before **any** future stateful Supabase command:

```
HOST TCP 54323 = FREE / AVAILABLE FOR BIND
```

Require a **fresh current-state** check. Historical Weixin.exe occupancy **must not** be assumed current.

If occupied **before** stateful execution:

```
RESULT = BLOCKED
LOCAL-010 remains NOT CONSUMED
```

**Process kill:** **NOT AUTHORIZED.**  
**Port remap / Studio port change / `config.toml` edit / Docker networking mutation / silent other-port selection:** **NOT AUTHORIZED.**

Host remediation remains **outside** governed DBA execution. After an operator independently frees the port, readiness **must** be re-checked from scratch.

---

## 17. Plan gate

After governance compatibility + Docker warm + TCP 54323 FREE, run only the authorized **DB-free** `--plan`.

Expected successful future plan must prove at least:

| Field | Required |
|-------|----------|
| `result` | `PLAN_OK` |
| `expectedDbaAuthorizationId` | `E-02-DBA-LOCAL-010` |
| `artifactAuthorizationId` | successor BCR authority issued for LOCAL-010 |
| environment | `LOCAL_DISPOSABLE_SUPABASE` |
| CB-B | `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` |
| baseline mode | `E02_DECLARED_BASELINE_REPLAY` |
| `quarantineCount` | **1** |
| quarantined migration | `20260314195641_add_demo_data.sql` |

Migration counts **must be rediscovered** at execution time. Do **not** hard-code 285/284 as runtime truth.

If plan fails:

```
RESULT = BLOCKED or NOT_RUN (existing semantics)
LOCAL-010 = NOT CONSUMED
NO --apply
```

---

## 18. Gate ordering (locked)

1. Governance pre-gate (this DBA NOT CONSUMED · LOCAL-009 immutable · no later superseding DBA)
2. Artifact-ID compatibility PASS (after successor BCR retarget)
3. Docker warm-engine PASS
4. TCP 54323 FREE
5. `--plan` PASS
6. Named technical guard inputs present (`E02_ALLOW_DESTRUCTIVE_TESTS=true` · `E02_EVIDENCE_ENV=local` · `E02_BCR_APPLY_AUTHORIZED=true` · exact DBA ID)
7. Then **exactly one** `--apply --preserve-environment`

---

## 19. Single stateful apply rule

Future LOCAL-010 authority permits **EXACTLY ONE** governed stateful `--apply` attempt, only after every preceding gate passes, using the repository-authorized apply path and preserve-environment behavior.

```
NO silent retry
NO automatic retry
NO second --apply
NO "try again after fixing"
NO LOCAL-010 reuse after a started failed apply
```

Once the stateful LOCAL-010 apply starts, the authorization has entered its **single** governed application attempt.

If it fails:

```
LOCAL-010 =
  APPLICATION_FAILED /
  NOT SUCCESSFULLY CONSUMED /
  EVIDENCE IMMUTABLE
THEN RETURN TO GOVERNANCE
```

Do **not** automatically create LOCAL-011. No source/migration/guard/verifier fix under DBA authority. No quarantine expansion. No process kill. No port remap.

---

## 20. Authorized lifecycle (future; not this task)

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
→ HMD-002 restored file
→ W1
→ former LOCAL-008 failure frontier (20260320045054)
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

## 21. RU-1.1 / RU-1.2

LOCAL-010 success path **must** require actual application:

| Item | Requirement |
|------|-------------|
| RU-1.1 | **actual application** required |
| RU-1.2 | **actual application + metadata proof** required |
| RPC invocation | **NOT AUTHORIZED** |

Do **not** satisfy RU-1.2 by invoking `execute_owner_vote_atomic_freeze_commit` or any other runtime RPC.

---

## 22. Success-path runtime evidence

A successful future LOCAL-010 application must prove **actual replay**, not merely startup. Evidence must include, as applicable:

- `evidenceRunId`
- environment classification
- Docker readiness
- TCP 54323 gate
- plan result
- auxiliary workdir
- auxiliary init
- auxiliary start/status
- environment-guard result (named inputs)
- platform baseline
- discovered migration count
- planned executable count
- executed migration count
- truthful migration history
- quarantine omission
- highest applied migration
- W1 reached/applied
- former LOCAL-008 frontier reached/applied
- old invoices failure absent
- HMD-002 restored migration reached/applied
- W2 reached/applied
- April HARD reached/applied
- July S1 collision path reached/applied
- RU-1.1 actual application result
- RU-1.2 actual application/metadata result
- preserve/handoff result
- baseline verifier result
- cleanup/final environment disposition

Do **not** infer runtime success from repository presence of W1/W2.

---

## 23. Failure evidence

If future LOCAL-010 apply fails after starting: capture and persist evidence **before** cleanup wherever supported. Evidence must identify:

- failure stage
- failing subcommand
- CLI failure class
- exit code
- bounded sanitized stdout/stderr excerpts
- truncation status
- first failing migration, **if any** (NONE if failure is outside migration execution)
- highest successfully applied migration
- migration count executed
- whether W1 / former LOCAL-008 frontier / W2 / April HARD / July collision / HMD-002 restored file were reached
- RU-1.1 / RU-1.2 state
- cleanup state

Failure taxonomy must remain truthful.

---

## 24. Result taxonomy

Use only:

- `APPLIED_AND_BASELINE_VERIFIED`
- `APPLICATION_FAILED`
- `APPLIED_BASELINE_FAILED`
- `BLOCKED`
- `NOT_RUN`

**Do not use:** `EIR_PASS` · `COMMITTED` · `PROJECT_CERTIFIED` · `FULL_REPLAY_PASS`.

| Condition | Result |
|-----------|--------|
| Docker not warm before apply | `BLOCKED` |
| TCP 54323 occupied before apply | `BLOCKED` |
| Artifact still pinned to LOCAL-009 | `BLOCKED` |
| `--plan` fails before stateful execution | `BLOCKED` / `NOT_RUN` per existing semantics |
| Stateful apply starts and guard fails | `APPLICATION_FAILED` |
| Migration fails | `APPLICATION_FAILED` |
| Application succeeds but baseline verifier fails | `APPLIED_BASELINE_FAILED` |
| Application + baseline both pass | `APPLIED_AND_BASELINE_VERIFIED` |

---

## 25. Authorization consumption semantics

LOCAL-010 may be marked **CONSUMED** **only** on:

```
APPLIED_AND_BASELINE_VERIFIED
```

| Outcome | Consumption |
|---------|-------------|
| Stateful apply failure | **NOT SUCCESSFULLY CONSUMED** |
| Pre-stateful gate failure | **NOT CONSUMED** |

Do **not** mark CONSUMED merely because Docker started, Supabase started, guard passed, plan passed, migrations began, W1 applied, HMD-003 frontier passed, or all migrations applied but baseline failed.

Only `APPLIED_AND_BASELINE_VERIFIED` may later permit governance to consider **ISSUE E-02-RU-1.4-REA**. REA is **NOT** issued in this task.

---

## 26. RU-1.4 / REA lock

```
RU-1.4 = RUNTIME NOT AUTHORIZED
```

Do **not** issue REA in this task. Do **not** authorize RU-1.4 execution in LOCAL-010 itself.

---

## 27. EIR / Acceptance / Certification (unchanged)

| Item | Status |
|------|--------|
| EIR PASS | **NONE** |
| Acceptance | **BLOCKED** |
| Certification | **NOT ISSUED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Final COMMIT path | **BLOCKED** |
| RU-1.1 | **NOT APPLIED** (future runtime objective) |
| RU-1.2 | **NOT APPLIED** (future metadata objective; no RPC) |
| Database baseline | **NOT VERIFIED** |

Issuing LOCAL-010 does **not** change these. **No commit** in this task.

---

## 28. Future evidence path

Reserve, **do not create** in this issuance:

```
docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-010.md
```

Prior LOCAL-009 evidence remains **immutable**. Future evidence must include all §22 / §23 fields. **No secrets.**

---

## 29. Current issuance effect

```
E-02-DBA-LOCAL-010                     = APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED
DATABASE APPLICATION                   = AUTHORIZED TO BEGIN / GATED / NOT EXECUTED
LOCAL-010 COMPATIBILITY                = BLOCKED UNTIL SUCCESSOR BCR RETARGET
DAA-014-C                              = ISSUED / CONSUMED AS NAMING RULE FOR THIS DBA
HOST TCP 54323 GATE                    = MANDATORY (FREE / AVAILABLE FOR BIND)
DOCKER PRE-WARM GATE                   = MANDATORY
PAD-051                                = ISSUED / IMMUTABLE
HMD-003                                = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME PENDING
LOCAL-009                              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
```

---

## 30. Next action (this issuance)

```
NEXT = ISSUE SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION
       FOR LOCAL-009 → LOCAL-010 DBA PIN RETARGET
```

Expected family (verify later): `E-02-BCR-IA-010` / `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-010.md`.

**Not created. Not implemented.** LOCAL-010 **must not** be executed until that retarget Completion exists and compatibility PASS.

---

## 31. Confirmation of no executable work

**No** environment-variable mutation · **no** `E02_ALLOW_DESTRUCTIVE_TESTS=true` execution in this task · **no** `E02_EVIDENCE_ENV` mutation · **no** `E02_RUNTIME_EXECUTION_AUTHORIZED` · **no** `E02_BASELINE_VERIFICATION_AUTHORIZED` · **no** source modification · **no** guard modification · **no** BCR artifact modification · **no** verifier modification · **no** migration modification · **no** W1/W2 modification · **no** HMD-003 modification · **no** package/test modification · **no** database · **no** Supabase init/start/status/stop · **no** Docker mutation · **no** `--apply` · **no** `--plan` as this issuance’s execution · **no** LOCAL-009 retry · **no** LOCAL-010 execution · **no** LOCAL-010 evidence creation · **no** BCR-IA-010 · **no** RU-1.4 · **no** REA · **no** RPC · **no** fixtures · **no** EIR/Acceptance/Certification change · **no** commit.

Only this record and [`README.md`](README.md) are written.

---

## 32. Lock statement

```
E-02-DBA-LOCAL-010                         = APPROVED WITH CONDITIONS /
                                             NOT CONSUMED /
                                             EXECUTION GATED
DAA-014-C                                  = ISSUED
E02_ALLOW_DESTRUCTIVE_TESTS                = AUTHORIZED AS TECHNICAL FAIL-CLOSED INPUT
                                             FOR LOCAL DISPOSABLE DB-BACKED DBA/BCR PATH /
                                             NOT DESTRUCTIVE FIXTURE AUTHORITY
E02_EVIDENCE_ENV                           = local
E02_BCR_APPLY_AUTHORIZED                   = true
                                             FOR FUTURE GOVERNED LOCAL-010 APPLY ONLY
E02_DBA_AUTHORIZATION_ID                   = E-02-DBA-LOCAL-010
                                             FOR FUTURE GOVERNED EXECUTION
E02_RUNTIME_EXECUTION_AUTHORIZED           = UNSET / FALSE /
                                             RU-1.4 NOT AUTHORIZED
BASELINE VERIFICATION                      = SUCCESS-PATH ONLY
PAD-051                                    = ISSUED / IMMUTABLE
HMD-001                                    = OPEN / DISTINCT
HMD-002                                    = SOURCE INTEGRITY RESTORED /
                                             RUNTIME REPLAY VERIFICATION PENDING / DISTINCT
HMD-003                                    = OPEN /
                                             RECONSTRUCTION IMPLEMENTED /
                                             IMPLEMENTATION COMPLETED /
                                             RUNTIME REPLAY VERIFICATION PENDING
W1                                         = 20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql
W2                                         = 20260406000000_hmd003_reconstruct_invoice_ai_audits.sql
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql /
                                             COUNT 1
LOCAL-009                                  = APPLICATION_FAILED /
                                             NOT SUCCESSFULLY CONSUMED /
                                             EVIDENCE IMMUTABLE
LOCAL-009 RETRY                            = NOT AUTHORIZED
LOCAL-010                                  = APPROVED WITH CONDITIONS /
                                             NOT CONSUMED /
                                             NOT EXECUTED
CURRENT ARTIFACT DBA PIN                   = E-02-DBA-LOCAL-009
CURRENT ARTIFACT AUTHORITY                 = E-02-BCR-IA-009
LOCAL-010 COMPATIBILITY                    = BLOCKED UNTIL SUCCESSOR BCR RETARGET
EXACT-MATCH                                = RETAINED
DUAL-ACCEPT                                = NONE
DATABASE BASELINE VERIFIED                 = NO
RU-1.4                                     = RUNTIME NOT AUTHORIZED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = ISSUE SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION
                                             FOR LOCAL-009 → LOCAL-010 RETARGET
                                             EXPECTED E-02-BCR-IA-010
                                             SUBJECT TO SEQUENCE VERIFICATION
EXECUTABLE WORK                            = NONE
```

---

**End of document — E-02-DBA-LOCAL-010 — v1.0 — 2026-08-26**
