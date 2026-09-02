# E-02 Database Application Evidence — E-02-DBA-LOCAL-018

| Field | Value |
|-------|-------|
| **Document Type** | Database Application Evidence (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-DBA-LOCAL-018** |
| **Authorization Reference** | [`E-02-Database-Application-Authorization-LOCAL-018.md`](E-02-Database-Application-Authorization-LOCAL-018.md) v1.0 |
| **BCR Artifact Authority** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-018.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-018.md) (E-02-BCR-IA-018 **CONSUMED**) · [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-018.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-018.md) (**E-02-BCR-IMPLEMENTATION-COMPLETION-018** · **COMPLETED WITH NOTES**) |
| **Guard clarification** | [`E-02-Environment-Guard-Authority-Clarification.md`](E-02-Environment-Guard-Authority-Clarification.md) (**DAA-014-C** · **ISSUED**) |
| **Predecessor DBA / evidence** | **E-02-DBA-LOCAL-017** — [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-017.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-017.md) · **APPLICATION_FAILED / IMMUTABLE** — **not reclassified** |
| **Status** | **Issued — Event 1 pre-stateful BLOCKED (Docker) · Event 2 resumed — first and only stateful apply — APPLICATION_FAILED** |
| **Revision** | v1.1 |
| **Effective Date** | 2026-09-01 |
| **Production Effect** | **None** |

> **Controlling result is Event 2:** `APPLICATION_FAILED`. Event 1 remains **historical pre-stateful `BLOCKED`** (Docker unreachable · apply never started · attempts **0**). Event 2 consumed the single authorized stateful apply (**attempts 1**). **No retry. No LOCAL-019.**

```
CONTROLLING DATABASE APPLICATION RESULT = APPLICATION_FAILED
FAILURE STAGE                           = GOVERNED REPLAY AT 20260409150000_unit_whitelist_invite_codes.sql
FAILURE TEXT                            = relation "public.property_invite_codes" does not exist
STATEFUL APPLY STARTED (Event 2)        = YES
STATEFUL APPLY ATTEMPT COUNT            = 1
AUTHORIZATION CONSUMED                  = NO
EVIDENCE RUN ID (runtime)               = local-018-20260901a
NEW FAILURE                             = NOT CLASSIFIED / NOT REPAIRED / NOT ALLOCATED
```

---

## Event 1 — pre-stateful BLOCKED (immutable historical record)

**Date:** 2026-09-01 (first gate evaluation)

```
RESULT                                = BLOCKED
FAILURE STAGE                         = GATE — DOCKER ENGINE NOT AVAILABLE
STATEFUL APPLY STARTED                = NO
STATEFUL APPLY ATTEMPT COUNT          = 0
EVIDENCE RUN ID                       = NONE
```

Docker Client **29.7.2** responded; Server **UNREACHABLE** (`dockerDesktopLinuxEngine` npipe missing). TCP **54323 FREE**. Fresh `--plan` **PLAN_OK** · build **PASS**. **No** `--apply`. **Do not erase this phase.**

---

## Event 2 — resumed pre-stateful gates + single apply

### 1. Resume authority

| Check | Result |
|-------|--------|
| LOCAL-018 APPROVED / NOT CONSUMED / NOT EXECUTED before Event 2 apply | **PASS** |
| Attempts before Event 2 apply | **0** |
| Future authorized apply | **EXACTLY 1** |
| Not a retry-after-failure / not LOCAL-019 | **PASS** |

### 2. Pre-stateful gates (re-run; Event 2)

| Gate | Result |
|------|--------|
| BCR IA-018 CONSUMED · Completion-018 COMPLETED WITH NOTES | **PASS** |
| BCR pins LOCAL-018 / IA-018 · exact-match · dual-accept NONE | **PASS** |
| LOCAL-017 IMMUTABLE · attempts 1 · NO RETRY | **PASS** |
| HMD-011 governance (PAD-059/060 · HOSCC IA-002 · Completion-002) | **PASS** |
| Worktree · unexplained executable drift | **NONE** |
| Quarantine count 1 | **PASS** |
| Fresh `--plan` | **PLAN_OK** · `startedAt` `2026-09-01T20:03:16.079Z` · failures `[]` · discovered **287** · executable **286** · quarantine **1** |
| Fresh build | **PASS** · exit **0** · Vite **5.4.21** · **3333** modules · **11.01s** |
| Docker | **PASS** — Client **29.7.2** · Server **29.7.2** · Desktop **4.87.0 (236836)** · containers **0** |
| TCP 54323 | **PASS** — **FREE** |
| Disposable pre-state | **PASS** — fresh aux · no `local-017-20260831a` reuse |

```
PRE-STATEFUL FINAL DECISION (Event 2) = APPLY MAY START
```

### 3. Runtime environment

| Variable | Value |
|----------|-------|
| `E02_EVIDENCE_RUN_ID` | **`local-018-20260901a`** |
| `E02_DBA_AUTHORIZATION_ID` | `E-02-DBA-LOCAL-018` |
| `E02_BCR_APPLY_AUTHORIZED` | `true` |
| `E02_ALLOW_DESTRUCTIVE_TESTS` | `true` (technical disposable-DB gate only) |
| `E02_EVIDENCE_ENV` | `local` |
| `E02_RUNTIME_EXECUTION_AUTHORIZED` | **UNSET** |

Invocation:

```
npx tsx scripts/verification/e02/replay-e02-declared-baseline.ts --apply --preserve-environment
```

Apply window: **2026-09-01T13:03:59** → **13:05:04** (local) · manifest **2026-09-01T20:04:00.177Z** → **20:05:04.450Z** · exit **1**.

At apply start: attempts **0 → 1** (irreversible).

### 4. Governed replay frontier

| Field | Value |
|-------|-------|
| Executed successfully | **79** |
| Highest applied (executable index) | **79** — `20260409140000_vendor_risk_signals.sql` |
| First failing (executable index) | **80** — `20260409150000_unit_whitelist_invite_codes.sql` |
| Failure text | `relation "public.property_invite_codes" does not exist` |
| Quarantine | **NOT executed** · count **1** |
| `manifest.result` | **APPLICATION_FAILED** |
| Disposition | **CLEANED_AFTER_FAILURE** · `cleanupCompleted=true` |

### 5. HMD runtime checkpoints (Event 2)

| Checkpoint | Index | Reached | Applied | Prior error reproduced? | Notes |
|------------|-------|---------|---------|-------------------------|-------|
| HMD-009 reconstruction `20260405115900_hmd009_reconstruct_hiring_jobs.sql` | **73** | **YES** | **YES** | `hiring_jobs` **NO** | |
| HMD-009 / HMD-010 / HMD-011 target `20260405120000_multi_tenant_properties.sql` | **74** | **YES** | **YES** | `mv.meeting_id` **NO** · `mqt.meeting_id` **NO** | HMD-011 Option C omit effective |
| W2 `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` | **76** | **YES** | **YES** | | |
| April HARD `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | **77** | **YES** | **YES** | | |
| July S1 `20260711120000_invoice_ai_audit_v1.sql` | **147** | **NO** | **NO** | | |

**HMD-011:** OPEN / IMPLEMENTATION COMPLETED / HOSCC COMPLETION COMPLETED / **RUNTIME REPLAY VERIFIED** (target applied · `mqt.meeting_id` **NOT REPRODUCED**) — **not CLOSED**

**HMD-010:** OPEN / IMPLEMENTATION COMPLETED / **RUNTIME REPLAY VERIFIED** (shared target applied · `mv.meeting_id` **NOT REPRODUCED**) — **not CLOSED**

**HMD-009:** OPEN / RECONSTRUCTION APPLIED / target **REACHED / APPLIED** · `hiring_jobs` **NOT REPRODUCED** / **RUNTIME REPLAY VERIFIED** per checkpoint — **not CLOSED**

**HMD-003:** OPEN / W2 + April HARD **REACHED / APPLIED** · July S1 **NOT REACHED** — **RUNTIME REPLAY VERIFICATION PENDING** — **not CLOSED**

**HMD-005–008:** Prior verified targets **reconfirmed** · later failure does **not** reopen.

### 6. Preserve / baseline / RU

| Field | Value |
|-------|-------|
| Preserve / handoff | **NOT REACHED** |
| Baseline verifier | **NOT RUN** |
| Database baseline verified | **NO** |
| RU-1.1 / RU-1.2 | **NOT REACHED** in replay (`ru11Reached=false` · `ru12Reached=false`) |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |

### 7. Cleanup

Docker containers after cleanup: **NONE**. TCP **54323 FREE**.

### 8. Manifest

```
tests/e02/evidence/local-018-20260901a/bcr-replay-manifest.json
```

`migrationCountExecuted=79` · `failures=["20260409150000_unit_whitelist_invite_codes.sql: relation \"public.property_invite_codes\" does not exist"]` · `auxiliaryEnvironmentDisposition=CLEANED_AFTER_FAILURE`.

### 9. Next governance action

```
NEXT = STOP → GOVERNANCE
```

Forensic investigation / defect allocation for `20260409150000` / `property_invite_codes` **only after** immutable evidence. **Do not** retry LOCAL-018. **Do not** issue LOCAL-019 automatically. **Do not** repair in this task.

---

## Lock

```
E-02-DBA-LOCAL-018              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
STATEFUL APPLY ATTEMPT COUNT    = 1
RETRY                           = NOT AUTHORIZED
DATABASE BASELINE VERIFIED      = NO
LOCAL-019                       = NOT ISSUED
```
