# E-02 — Database Application Authorization (Successor)

## Local Disposable Evidence Environment · CB-B Clean-Base · Declared Baseline Replay · Enhanced Start Diagnostics · Docker Pre-Warm Gate · Strict Host TCP 54323 Readiness · HMD-002 Runtime Replay Verification · HMD-003 Reconstruction Runtime Proof

| Field | Value |
|-------|-------|
| **Document Type** | **Database Application Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-009** |
| **Predecessor** | **E-02-DBA-LOCAL-008** — [`E-02-Database-Application-Authorization-LOCAL-008.md`](E-02-Database-Application-Authorization-LOCAL-008.md) · evidence [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-008.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-008.md) · **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| **Prior predecessors** | **E-02-DBA-LOCAL-007** · **E-02-DBA-LOCAL-006** · **E-02-DBA-LOCAL-005** · **E-02-DBA-LOCAL-004** · **E-02-DBA-LOCAL-003** · **E-02-DBA-LOCAL-002** · **E-02-DBA-LOCAL-001** — **FAILED or NOT CONSUMED / IMMUTABLE** |
| **Classification** | **DATABASE APPLICATION ATTEMPT — HMD-003 RECONSTRUCTION RUNTIME PROOF** (retains LOCAL-008 host-readiness + enhanced diagnostics) |
| **Reconstruction authority** | **E-02-HFSOR-IA CONSUMED** · Completion [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion.md) (**COMPLETED WITH NOTES**) |
| **Restoration authority** | **E-02-HMIR-IA CONSUMED** · [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md) (**COMPLETED WITH NOTES**) |
| **Policy authority** | [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) (**PAD-051**) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) (PAD-039 – PAD-050) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025) |
| **BCR artifact authority (read-only at issuance)** | **E-02-BCR-IA-008 CONSUMED** · `ARTIFACT_AUTHORIZATION_ID=E-02-BCR-IA-008` · `EXPECTED_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-008` · artifact **unmodified by this DBA** |
| **Status** | **Approved With Conditions — NOT CONSUMED — EXECUTION GATED** |
| **Authority Level** | Database Application Authorization |
| **Effective Date** | 2026-08-25 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Database-Application-Authorization-LOCAL-009.md`](E-02-Database-Application-Authorization-LOCAL-009.md) |
| **Production Effect** | **None** from this record alone |

> **Authority path finding: YES.** `E-02-Database-Application-Authorization-LOCAL-009.md` is **authority-safe** as a **scoped successor Database Application Authorization** under the PAD-012 naming pattern (`E-02-Database-Application-Authorization-{scope}.md` · ID `E-02-DBA-{ENV}-{SEQ}`). Precedent: LOCAL-001 through LOCAL-008. Highest previously allocated local DBA identifier is **LOCAL-008**. **LOCAL-009 is the next unused identifier.** A distinct filename is used so predecessor DBA records and evidence remain **immutable**. This is **not** a new document class, **not** a new governance tier, **not** a new PAD, **not** a BCR redesign, **not** a successor BCR Implementation Authorization, **not** a diagnostic-only execution class, **not** a host-remediation automation authorization, **not** a process-kill authorization, **not** a port-remap authorization, **not** a migration-repair authorization, **not** a quarantine amendment, **not** a RU-1.4 Runtime Execution Authorization, **not** an EIR decision, **not** Acceptance, and **not** Certification.

> **Superseding authority:** LOCAL-009 **supersedes LOCAL-008 only for one future execution attempt**. It **must not** alter, amend, or reclassify predecessor evidence. LOCAL-008 remains **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE**. LOCAL-008 retry remains **NOT AUTHORIZED**. LOCAL-001–007 remain immutable.

> **Document class:** Bounded **Database Application Authorization** record only. It **does not execute** LOCAL-009. It **does not** retarget the replay artifact. It **does not** authorize production deployment · remote database mutation · repo-root `supabase start` · raw Postgres/Docker Compose replacement · replay-artifact source modification · DBA-ID spoofing / substitution of LOCAL-008 · process termination · Studio/port remapping · `config.toml` edit · Docker networking mutation · RU-1.4 runtime evidence · RPC invocation · destructive fixtures · concurrency tests · Docker log collection · EIR reclassification · Acceptance · Project Certification · or Final COMMIT path unblock.

> **Controlling authority finding (not reopened):** No new Program Authority Decision is required. PAD-012 · PAD-013 · PAD-018 · PAD-023 · PAD-030 already govern successor local DBA attempts. PAD-051 HFSO-009 explicitly contemplates successor DBA after HMD-003 reconstruction Implementation Completion. PAD-052+ is **not** allocated.

```
DATABASE APPLICATION AUTHORIZATION (SUCCESSOR)  = APPROVED WITH CONDITIONS
AUTHORIZATION ID                                = E-02-DBA-LOCAL-009
CONSUMPTION                                     = NOT CONSUMED
EXECUTION                                       = GATED / NOT PERFORMED
PREDECESSOR E-02-DBA-LOCAL-008                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-008 RETRY                                 = NOT AUTHORIZED
PRIOR E-02-DBA-LOCAL-007 / 006 / 005 / 004 / 003 / 002 / 001
                                                = FAILED or NOT CONSUMED / IMMUTABLE
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
DOCKER PRE-WARM GATE                            = MANDATORY
HOST TCP 54323 GATE                             = MANDATORY (FREE / AVAILABLE FOR BIND before stateful Supabase)
PROCESS KILL                                    = NOT AUTHORIZED
PORT REMAP / STUDIO PORT CHANGE                 = NOT AUTHORIZED
CURRENT ARTIFACT AUTHORITY METADATA             = E-02-BCR-IA-008 (UNMODIFIED BY THIS DBA)
CURRENT ARTIFACT DBA PIN                        = E-02-DBA-LOCAL-008
DBA RUNTIME ID                                  = E02_DBA_AUTHORIZATION_ID / EXACT E-02-DBA-LOCAL-009
PRE-EXECUTION ARTIFACT-ID COMPATIBILITY (ISSUANCE READ-ONLY)
                                                = INCOMPATIBLE (artifact exact-pinned to E-02-DBA-LOCAL-008)
LOCAL-009 EXECUTION COMPATIBILITY               = BLOCKED UNTIL SUCCESSOR BCR RETARGET
SUCCESSOR BCR IA REQUIRED                       = YES (expected family E-02-BCR-IA-009; not this issuance; verify sequence when issued)
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
| [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion.md) | Direct predecessor checkpoint — two reconstruction migrations verified · **COMPLETED WITH NOTES** · next = LOCAL-009 |
| [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization.md) | **E-02-HFSOR-IA CONSUMED** |
| [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) | PAD-051 · Option B · HFSO-009 successor DBA after Completion |
| [`E-02-HMD-003-Historical-Finance-Schema-Origin-Reconstruction-Design.md`](E-02-HMD-003-Historical-Finance-Schema-Origin-Reconstruction-Design.md) | Reconstruction contracts · Blocker Test B |
| LOCAL-008 DBA + evidence | **APPLICATION_FAILED** at `20260320045054` (`relation "invoices" does not exist`) · restored `20260315035847` **REACHED/APPLIED** · executed **32** · **immutable** |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011–PAD-025 · PAD-012 DBA class · PAD-013 granularity · PAD-018 start · PAD-023 failure policy |
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | PAD-026–PAD-038 · PAD-030 successor DBA · single DATA_ONLY quarantine · HMD-001 |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) | PAD-039–PAD-050 · Option A · HMD-002 |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-008.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-008.md) | **E-02-BCR-IA-008 CONSUMED** — pin still `EXPECTED_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-008` |
| Artifact (read-only, this issuance) | `scripts/verification/e02/replay-e02-declared-baseline.ts` · `verify-db-baseline.ts` · `environment-guard.ts` |

**Mechanism finding:** This successor DBA is **environment + host-readiness (Docker warm-engine and host TCP 54323 FREE) + clean-base-mode + migration-set + baseline-mode + lifecycle + enhanced-diagnostics-consumption + HMD-002 runtime-proof + HMD-003 reconstruction runtime-proof scoped**. It is **not** project-wide blanket permission, **not** production, **not** RU-1.4 REA, **not** artifact code authorization, **not** host-process remediation, **not** Studio port remapping.

---

## 2. Incoming authoritative state (locked)

| Item | Status |
|------|--------|
| PAD-051 | **ISSUED / IMMUTABLE** · Option B |
| E-02-HFSOR-IA | **CONSUMED** |
| HFSOR Implementation Completion | **COMPLETED WITH NOTES** |
| HMD-003 | **OPEN / POLICY SELECTED / RECONSTRUCTION IMPLEMENTED IN REPOSITORY / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |
| W1 | `20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql` |
| W2 | `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` |
| Reconstruction file count | **2** |
| E-02-DBA-LOCAL-008 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-008 retry | **NOT AUTHORIZED** |
| LOCAL-008 failure migration | `20260320045054_enhance_dispute_resolution_system.sql` |
| LOCAL-008 failing SQL | `ALTER TABLE disputes ADD COLUMN related_invoice_id uuid REFERENCES invoices(id)` |
| LOCAL-008 error | `relation "invoices" does not exist` |
| LOCAL-008 highest applied | `20260320044053_create_meeting_voting_system.sql` |
| LOCAL-008 restored HMD-002 file | **REACHED / APPLIED** (parser failure **not** reproduced that run) |
| HMD-001 | **OPEN / DISTINCT** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT** |
| Quarantine | exactly `20260314195641_add_demo_data.sql` · **count 1** |
| Static `--plan` (implementation evidence) | **PLAN_OK** · discovered **285** · quarantineCount **1** · planned executable **284** |
| Current artifact DBA pin | **E-02-DBA-LOCAL-008** |
| Current artifact authority | **E-02-BCR-IA-008** |
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

LOCAL-009 is the **next unused** local DBA identifier. No newer authority supersedes this path.

---

## 4. Decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-DBA-LOCAL-009** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Consumption** | **NOT CONSUMED** |
| **Execution this task** | **NOT PERFORMED** |
| **Future execution** | **AUTHORIZED TO BEGIN / GATED** |
| **Runtime DBA identity** | `E02_DBA_AUTHORIZATION_ID=E-02-DBA-LOCAL-009` (exact; **no source edit**; **no LOCAL-008 substitution**; **no spoofing**) |
| **Compatibility at issuance** | **BLOCKED UNTIL SUCCESSOR BCR RETARGET** |

---

## 5. Authorized purpose

Authorize **ONE** future fresh local disposable CB-B database application attempt whose purpose is to verify the **full reconstructed baseline**, including:

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

**Forbidden environments:** production · remote · shared · repo-root stack.

---

## 6. Reconstruction runtime objective

LOCAL-009 success path **must** prove at runtime:

| # | Objective |
|---|-----------|
| A | W1 executes **before** `20260320045054_enhance_dispute_resolution_system.sql` |
| B | Former LOCAL-008 failure `relation "invoices" does not exist` **does not recur** |
| C | `invoice_status` reconstruction supports later historical `ALTER TYPE` evolution |
| D | `financial_anomalies` reconstruction survives its first HARD dependency (`20260327173153`) |
| E | W2 executes **before** `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` |
| F | `invoice_ai_audits` S1 reconstruction satisfies the April HARD dependency |
| G | Unmodified `20260711120000_invoice_ai_audit_v1.sql` executes with `CREATE TABLE IF NOT EXISTS` plus later indexes against the reconstructed S1 object |
| H | No existing migration is edited or bypassed |

HMD-003 remains **runtime pending** until required reconstruction-related runtime evidence succeeds. Do **not** mark CLOSED from this issuance.

---

## 7. Artifact compatibility gate (issuance read-only)

Runtime artifact: `scripts/verification/e02/replay-e02-declared-baseline.ts`.

Static metadata `ARTIFACT_AUTHORIZATION_ID` is **not** DBA execution authority.

Inspected **read-only** (this issuance):

| Constant / rule | Current value |
|-----------------|---------------|
| `ARTIFACT_AUTHORIZATION_ID` | **`E-02-BCR-IA-008`** |
| `EXPECTED_DBA_AUTHORIZATION_ID` | **`E-02-DBA-LOCAL-008`** |
| Match model | exact string equality against `process.env.E02_DBA_AUTHORIZATION_ID` (fail-closed) |
| Dual-accept / prefix / regex / override | **NONE** |

**Finding:** the current replay artifact **cannot accept** `E-02-DBA-LOCAL-009` without source modification.

```
PRE-EXECUTION ARTIFACT-ID COMPATIBILITY = INCOMPATIBLE
CURRENT PIN                             = E-02-DBA-LOCAL-008
CURRENT ARTIFACT AUTHORITY METADATA     = E-02-BCR-IA-008
REQUIRED PIN FOR LOCAL-009 EXECUTION    = E-02-DBA-LOCAL-009
SOURCE MODIFICATION UNDER THIS DBA      = NOT AUTHORIZED
LOCAL-008 SUBSTITUTION                  = NOT AUTHORIZED
LOCAL-009 EXECUTION COMPATIBILITY       = BLOCKED UNTIL SUCCESSOR BCR RETARGET
```

This DBA **does not** modify artifact source.

---

## 8. Exact-match model

Future runtime **must** require exactly:

```
E02_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-009
```

No dual acceptance. No LOCAL-008 fallback. No prefix/regex/override. No source edit under DBA authority. Warning-only mismatch is **forbidden**.

---

## 9. Successor BCR IA (expected; not this issuance)

Exact next governance step after this DBA issuance:

```
ISSUE successor narrow BCR Implementation Authorization
Purpose: retarget EXPECTED_DBA_AUTHORIZATION_ID
         E-02-DBA-LOCAL-008 → E-02-DBA-LOCAL-009
         and corresponding truthful ARTIFACT_AUTHORIZATION_ID metadata
```

**Not created in this task.** Highest existing BCR IA is **E-02-BCR-IA-008**. Expected next unused ID **may be** `E-02-BCR-IA-009` / `E-02-Baseline-Compatibility-Replay-Implementation-Authorization-009.md`. **Verify repository sequence at that later issuance.** Do not implement the retarget here.

Expected later ordering:

1. Issue this DBA (LOCAL-009) — **this record**
2. Issue successor BCR IA (retarget only)
3. Implement retarget
4. Issue BCR Implementation Completion
5. **EXECUTE** LOCAL-009 **only after** compatibility PASS **and** Docker warm **and** TCP 54323 FREE

---

## 10. Migration inventory (static evidence; not a success hard-code)

Implementation-task `--plan` evidence (repository at reconstruction Completion):

| Field | Value |
|-------|-------|
| `migrationCountDiscovered` | **285** |
| quarantine count | **1** |
| planned executable | **284** (285 − 1) |

Future runtime **must re-discover** actual repository counts. Do **not** hard-code success from these values. If counts materially differ at execution time: **STOP** according to artifact/governance rules.

---

## 11. Quarantine / HMD-001

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

---

## 12. Truthful history

| Event | Record |
|-------|--------|
| Executed successfully | record applied normally |
| Quarantined | do not execute · do not record applied |
| Failed | **STOP** · do not record applied |

W1 and W2 are **real new repository migrations**. When executed successfully they record **normally as applied**.

**FORBIDDEN:** fake historical origin `schema_migrations` rows · repair-as-applied · mark missing hosted SQL applied · rewrite existing migration history.

---

## 13. HMD-002 runtime proof

Future LOCAL-009 replay **must again reach** `20260315035847_add_meeting_templates_and_attachments.sql` and record whether it applies successfully.

HMD-002 may advance only from **this run’s** actual runtime evidence. Do **not** mark CLOSED merely because LOCAL-008 previously applied it. Prior LOCAL-004 parser failure must **not** reproduce. If it fails: **APPLICATION_FAILED** · **STOP** · do not edit the file.

---

## 14. HMD-003 runtime evidence (mandatory recording)

Future LOCAL-009 evidence **must** explicitly record:

**W1 (`20260320044500`):** reached? applied? `invoice_status` created? `public.invoices` created? `public.financial_anomalies` created?

**Former LOCAL-008 failure migration (`20260320045054`):** reached? applied? prior `invoices does not exist` failure reproduced?

**W2 (`20260406000000`):** reached? applied? `invoice_ai_audits` object established?

**April HARD (`20260409120000`):** reached? applied?

**July (`20260711120000`):** reached? applied? `CREATE TABLE IF NOT EXISTS` behavior compatible? post-CREATE indexes successful?

HMD-003 remains runtime pending until required reconstruction-related runtime evidence succeeds.

---

## 15. Docker / host readiness (retained from LOCAL-008)

Before stateful execution:

- Docker engine **must already be warm/responsive** (no cold-wake as the apply strategy).
- Relevant Supabase host ports **must be free**, including TCP **54323**.

```
HOST TCP 54323 = FREE / AVAILABLE FOR BIND
```

If occupied **before** stateful execution:

```
RESULT = BLOCKED
LOCAL-009 remains NOT CONSUMED
```

**No** process kill. **No** port remap. **No** automatic workaround. Operator may independently free the port **outside** governed execution; readiness must then be re-checked from scratch.

Gate ordering (locked):

1. Governance pre-gate
2. Artifact-ID compatibility PASS (after successor BCR retarget)
3. Docker warm-engine PASS
4. TCP 54323 FREE
5. `--plan` PASS
6. Then `--apply --preserve-environment`

---

## 16. Authorized lifecycle (future; not this task)

After successor BCR retarget Completion **and** all pre-gates PASS, one governed:

```
--apply --preserve-environment
```

Fresh auxiliary project. Auxiliary timestamped migrations before start = **0**.

Then:

```
aux init
→ aux start
→ platform baseline
→ app-history validation
→ application-layer reset
→ truthful replay
→ W1
→ former LOCAL-008 failure frontier (20260320045054)
→ W2
→ downstream replay
→ HMD runtime evidence
→ RU-1.1
→ RU-1.2 metadata
→ manifest
→ preserve
→ baseline verifier
→ explicit cleanup
```

**No retry** under this authorization.

---

## 17. Baseline verifier

Only after successful preserve, run **exactly**:

```
npm run verify:e02:baseline
```

with `E02_BASELINE_VERIFICATION_AUTHORIZED=true`.

**DO NOT set** `E02_RUNTIME_EXECUTION_AUTHORIZED`.

No RU-1.2 RPC invocation. No RU-1.4. Verifier remains read-only. After evidence is written, explicit `--cleanup` with the **same** DBA ID and evidence run ID.

---

## 18. Result taxonomy

Use only:

- `APPLIED_AND_BASELINE_VERIFIED`
- `APPLICATION_FAILED`
- `APPLIED_BASELINE_FAILED`
- `BLOCKED`
- `NOT_RUN`

**Do not use:** `EIR_PASS` · `COMMITTED` · `PROJECT_CERTIFIED` · `FULL_REPLAY_PASS`.

If Docker pre-warm fails **or** host TCP 54323 is occupied **or** artifact-ID compatibility fails: **`BLOCKED`** before any DB / stateful Supabase command. Port 54323 occupied before stateful execution is **`BLOCKED`**, not `APPLICATION_FAILED`.

Only `APPLIED_AND_BASELINE_VERIFIED` may mark:

```
E-02-DBA-LOCAL-009 = CONSUMED
```

and may permit the next governance step **ISSUE E-02-RU-1.4-REA**. REA is **NOT** issued in this task.

---

## 19. Failure policy

If future execution fails:

```
capture truthful evidence
→ persist manifest/evidence
→ best-effort cleanup
→ STOP
→ return to governance
```

No silent retry. No second attempt under LOCAL-009. No automatic LOCAL-010. No source/migration fix under DBA authority. No quarantine expansion. No process kill. No port remap.

---

## 20. Future evidence path

```
docs/implementation/E-02-Database-Application-Evidence-E-02-DBA-LOCAL-009.md
```

**Do not create it in this issuance task.** Prior LOCAL-008 evidence remains **immutable**.

Future evidence must include governance pre-gate · artifact compatibility · Docker warm-engine · TCP 54323 · `--plan` · `evidenceRunId` · aux init/start · replay result · W1/W2/HMD-002/HMD-003 runtime fields in §14 · former LOCAL-008 frontier · July collision · RU-1.1 · RU-1.2 metadata · manifest · baseline verifier · cleanup · final taxonomy. **No secrets.**

---

## 21. Success semantics (future execution only)

If and only if future LOCAL-009 succeeds fully:

```
E-02-DBA-LOCAL-009              = CONSUMED
DATABASE APPLICATION RESULT     = APPLIED_AND_BASELINE_VERIFIED
DATABASE BASELINE VERIFIED      = YES
HMD-002                         = may advance only from this run’s evidence
HMD-003                         = may advance only from this run’s reconstruction evidence
HMD-001                         = OPEN
RU-1.4                          = STILL NOT AUTHORIZED until REA issued
EIR PASS                        = NONE
RUNTIME COMMITTED               = NOT CERTIFIED
FINAL COMMIT PATH               = BLOCKED
NEXT                            = ISSUE E-02-RU-1.4-REA  (not this task)
```

---

## 22. Current issuance effect

```
E-02-DBA-LOCAL-009                     = APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED
DATABASE APPLICATION                   = AUTHORIZED TO BEGIN / GATED / NOT EXECUTED
LOCAL-009 COMPATIBILITY                = BLOCKED UNTIL SUCCESSOR BCR RETARGET
HOST TCP 54323 GATE                    = MANDATORY (FREE / AVAILABLE FOR BIND)
DOCKER PRE-WARM GATE                   = MANDATORY
PAD-051                                = ISSUED / IMMUTABLE
HMD-003                                = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME PENDING
LOCAL-008                              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
```

---

## 23. RU-1.4 / EIR / Certification (unchanged)

| Item | Status |
|------|--------|
| RU-1.1 | **NOT APPLIED** (future runtime objective) |
| RU-1.2 | **NOT APPLIED** (future metadata objective; no RPC) |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| EIR / Acceptance / Certification | **UNCHANGED / BLOCKED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Final COMMIT path | **BLOCKED** |

---

## 24. Next action (this issuance)

```
NEXT = ISSUE SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION
       FOR LOCAL-008 → LOCAL-009 DBA PIN RETARGET
```

Expected family (verify later): `E-02-BCR-IA-009` / `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-009.md`.

**Not created. Not implemented.** LOCAL-009 **must not** be executed until that retarget Completion exists and compatibility PASS.

---

## 25. File scope / prohibited work (this issuance confirmation)

This issuance task may modify **only**:

1. `docs/implementation/E-02-Database-Application-Authorization-LOCAL-009.md` (this document)
2. `docs/implementation/README.md` (minimal)

**No** reconstruction-migration modification · **no** existing-migration modification · **no** source modification · **no** replay artifact modification · **no** DBA pin retarget · **no** verifier modification · **no** environment-guard modification · **no** package/lockfile modification · **no** tests/harness modification · **no** git commit · **no** DB · **no** Supabase init/start/status/stop · **no** Docker · **no** BCR `--apply` · **no** baseline verifier · **no** LOCAL-009 execution · **no** LOCAL-009 evidence creation · **no** RU-1.4 · **no** REA · **no** RPC · **no** fixtures · **no** EIR/Acceptance/Certification change.

---

## 26. Lock statement

```
DATABASE APPLICATION AUTHORIZATION     = E-02-DBA-LOCAL-009
DECISION                               = APPROVED WITH CONDITIONS / NOT CONSUMED / EXECUTION GATED
AUTHORIZED ENVIRONMENT                 = LOCAL_DISPOSABLE_SUPABASE
CLEAN-BASE MODE                        = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
BASELINE MODE                          = E02_DECLARED_BASELINE_REPLAY
PAD-051                                = ISSUED / IMMUTABLE
E-02-HFSOR-IA                          = CONSUMED
HFSOR COMPLETION                       = COMPLETED WITH NOTES
HMD-003                                = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
W1                                     = 20260320044500_hmd003_reconstruct_invoices_status_anomalies.sql
W2                                     = 20260406000000_hmd003_reconstruct_invoice_ai_audits.sql
QUARANTINE                             = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
HMD-001                                = OPEN / DISTINCT
HMD-002                                = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT
CURRENT ARTIFACT DBA PIN               = E-02-DBA-LOCAL-008
CURRENT ARTIFACT AUTHORITY             = E-02-BCR-IA-008
DBA AUTHORIZATION ID                   = E02_DBA_AUTHORIZATION_ID / EXACT E-02-DBA-LOCAL-009
PRE-EXECUTION ARTIFACT-ID COMPATIBILITY = INCOMPATIBLE (CURRENT PIN E-02-DBA-LOCAL-008)
LOCAL-009 EXECUTION COMPATIBILITY      = BLOCKED UNTIL SUCCESSOR BCR RETARGET
LOCAL-008                              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-008 RETRY                        = NOT AUTHORIZED
LOCAL-009                              = APPROVED WITH CONDITIONS / NOT CONSUMED / NOT EXECUTED
DATABASE APPLICATION                   = AUTHORIZED TO BEGIN / GATED / NOT EXECUTED
DATABASE BASELINE VERIFIED             = NO
RU-1.4                                 = RUNTIME NOT AUTHORIZED
EIR PASS                               = NONE
RUNTIME COMMITTED                      = NOT CERTIFIED
FINAL COMMIT PATH                      = BLOCKED
NEXT                                   = ISSUE SUCCESSOR BCR IA FOR LOCAL-008 → LOCAL-009 RETARGET
DO NOT MODIFY MIGRATIONS · NO DATABASE COMMANDS · NO LOCAL-009 EXECUTION IN THIS TASK
```

---

**End of document — E-02-DBA-LOCAL-009 v1.0 — 2026-08-25**
