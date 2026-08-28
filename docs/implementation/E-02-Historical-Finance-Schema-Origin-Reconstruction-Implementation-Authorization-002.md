# E-02 — Historical Finance Schema-Origin Reconstruction — Implementation Authorization (Successor)

## HMD-005 Pre-Target Enum-Commit Compatibility Reconstruction

| Field | Value |
|-------|-------|
| **Document Type** | **Implementation Authorization (Successor)** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-HFSOR-IA-002** |
| **Policy authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md) (**PAD-053** · HMIC-025 – HMIC-036) |
| **Predecessor IA** | [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization.md) (**E-02-HFSOR-IA** · HMD-003 · **CONSUMED** · **finance schema-origin only; does not cover this target**) |
| **Defect** | **HMD-005** |
| **Status** | **Approved With Conditions — NOT YET CONSUMED** |
| **Authority Level** | Implementation Authorization (repository compatibility reconstruction only) |
| **Effective Date** | 2026-08-27 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-002.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-002.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **Future repository-only reconstruction task · NOT this issuance** |
| **Successor Completion (not created)** | `docs/implementation/E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-002.md` |

> **Authority path finding: YES.** Filename `E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-002.md` is **authority-safe** as the next successor in the existing **reconstruction IA** family (**E-02-HFSOR-IA**). ID **`E-02-HFSOR-IA-002`**. Distinct filename keeps **E-02-HFSOR-IA** (HMD-003) **immutable**. This is **not** a new governance tier, **not** a new PAD, **not** PAD-054, **not** a DBA, **not** a BCR IA, **not** a HMIR restoration IA, **not** a forward-fix authority, **not** a runtime authority, **not** a REA, **not** an EIR.
>
> **Family determination (this issuance):** The existing Implementation Authorization class used for **historical migration compatibility reconstruction** (Option B · new reconstruction SQL · historical targets immutable) is **E-02-HFSOR-IA**, established by PAD-051 for HMD-003. **E-02-HMIR-IA / E-02-HMIR-IA-002** are **forensic source restoration** and are **not** this family (HMIR-IA-002: “not a reconstruction IA”). BCR IAs and DBA records are execution/retarget authority, not reconstruction. Highest issued reconstruction IA is **E-02-HFSOR-IA**. **E-02-HFSOR-IA-002** is the next unused identifier. No HFSOR-IA-002 document existed before this issuance. A new family name is **not** invented.
>
> **Defect distinctness:** HMD-005 remains **DISTINCT** from HMD-003. This successor **does not** reopen W1/W2, invoices, `invoice_status`, or `financial_anomalies`. Family reuse follows HMIR-IA → HMIR-IA-002 (same operational IA family; file-specific DISTINCT defect).
>
> **Document class:** Bounded **repository compatibility reconstruction** authorization only. This record **does not** create SQL · **does not** apply migrations · **does not** run BCR `--apply` · **does not** issue LOCAL-012 · **does not** authorize RU-1.4.

```
HISTORICAL COMPATIBILITY RECONSTRUCTION IA         = E-02-HFSOR-IA-002
DECISION                                           = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PAD-053                                            = ISSUED / IMMUTABLE
SELECTED POLICY                                    = OPTION B — PRE-TARGET ENUM-COMMIT COMPATIBILITY RECONSTRUCTION
HISTORICAL RECONSTRUCTION ≠ SOURCE RESTORATION     = LOCKED
THIS RECONSTRUCTION DID NOT EXIST HISTORICALLY     = LOCKED
TARGET                                             = 20260329103000_add_admin_user_role_and_policy.sql
AUTHORIZED RECONSTRUCTION                          = supabase/migrations/20260329102500_hmd005_reconstruct_user_role_admin.sql
RECONSTRUCTION COUNT                               = EXACTLY 1
RECONSTRUCTION EXECUTED                            = NO
HMD-005                                            = OPEN / DEFECT CLASSIFIED / COMPATIBILITY RECONSTRUCTION SELECTED / IMPLEMENTATION AUTHORIZED / IMPLEMENTATION NOT YET COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
HMD-001                                            = OPEN / DISTINCT
HMD-002                                            = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT
HMD-003                                            = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
HMD-004                                            = SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
QUARANTINE                                         = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
LOCAL-011                                          = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-011 RETRY                                    = NOT AUTHORIZED
LOCAL-012                                          = NOT AUTHORIZED / NOT CREATED
THIS IA                                            ≠ DBA · ≠ BCR IA · ≠ PAD · ≠ REA · ≠ HMIR
IMPLEMENTATION COMPLETION                          = REQUIRED / NOT ISSUED
```

---

## 1. Pre-issuance gates (this issuance — read-only)

| Condition | Finding |
|-----------|---------|
| PAD-053 ISSUED / IMMUTABLE · Option B selected | **PASS** |
| HMD-005 OPEN / COMPATIBILITY RECONSTRUCTION SELECTED / IMPLEMENTATION NOT AUTHORIZED (pre) | **PASS** |
| LOCAL-011 APPLICATION_FAILED / attempts 1 / no retry · evidence `local-011-20260827a` | **PASS** |
| LOCAL-012 not authorized / not created | **PASS** |
| Target exists · origin `bc48068` · executable SQL origin-identical · source corruption REJECTED | **PASS** |
| Target still ADD VALUE IF NOT EXISTS `'admin'` then same-file policy use | **PASS** |
| `admin` absent before target under clean declared replay | **PASS** |
| `public.user_role` exists before reconstruction (`20260314034834` · plus `'manager'` in `20260315010915`) | **PASS** |
| Reconstruction IA family = HFSOR · next unused = **E-02-HFSOR-IA-002** | **PASS** |
| Slot `20260329102500` unused · strictly between predecessor and target | **PASS** |
| Quarantine count 1 | **PASS** |
| No superseding PAD/IA | **PASS** |

**STOP does not apply.** This IA may issue.

---

## 2. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-HFSOR-IA-002** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Consumption** | **NOT YET CONSUMED** |
| **Authorized future action** | Create **exactly one** new reconstruction migration at the path in §5 |
| **Not authorized** | Target edit · source restoration · policy SQL · enum rebuild · forward-fix · fake history · LOCAL-011 retry · LOCAL-012 · DB/Supabase/Docker · RU-1.4 |
| **Execution this task** | **NOT PERFORMED** |

HMD-005 **post-issuance:** **OPEN / DEFECT CLASSIFIED / COMPATIBILITY RECONSTRUCTION SELECTED / IMPLEMENTATION AUTHORIZED / IMPLEMENTATION NOT YET COMPLETED / RUNTIME REPLAY VERIFICATION PENDING**. **Not reconstructed. Not complete. Not runtime verified. Not CLOSED.**

---

## 3. Defect / PAD-053 facts (not reopened)

```
CLASS          = HISTORICAL MIGRATION TRANSACTION-BOUNDARY COMPATIBILITY DEFECT
SUBTYPE        = ORIGINAL HISTORICAL CLEAN-REPLAY ENUM COMMIT-BOUNDARY DEFECT
SOURCE CORRUPTION = REJECTED
SOURCE RESTORATION = NOT AUTHORIZED
CURRENT EXECUTABLE SQL == PROVEN ORIGIN = YES
PROVEN ORIGIN  = bc48068db008d03b3c93d60646169737de7bc363
PG ENUM PATTERN = MATCH
```

Observed LOCAL-011 error: `unsafe use of new value "admin" of enum type user_role`.

Classification of this reconstruction: **GOVERNED HISTORICAL CLEAN-REPLAY COMPATIBILITY RECONSTRUCTION**. It is **not** a claim that the file existed historically.

---

## 4. Ordering / collision proof (read-only, this issuance)

Filenames with timestamp `>= 20260328120000` and `<= 20260329103000`:

1. `20260328120000_owner_info_council_manager_approve.sql`
2. `20260329103000_add_admin_user_role_and_policy.sql`

Occupied timestamps in `(20260328120000, 20260329103000)`: **NONE**.

| Role | Filename |
|------|----------|
| **Predecessor** | `20260328120000_owner_info_council_manager_approve.sql` |
| **Authorized reconstruction** | `20260329102500_hmd005_reconstruct_user_role_admin.sql` |
| **Successor / HMD-005 target** | `20260329103000_add_admin_user_role_and_policy.sql` |

```
ORDERING = STRICTLY BETWEEN / COLLISION FREE
20260328120000  <  20260329102500  <  20260329103000
```

Timestamp **20260329102500** is unused. Lexicographic BCR filename order matches numeric timestamp order. Analogous tightness to HMD-003 W1 (`20260320044500` before `20260320045054`). **No historical file is renumbered.**

---

## 5. Authorized reconstruction (exactly one)

```
AUTHORIZED RECONSTRUCTION PATH =
  supabase/migrations/20260329102500_hmd005_reconstruct_user_role_admin.sql
AUTHORIZED TIMESTAMP           = 20260329102500
RECONSTRUCTION MIGRATION COUNT = EXACTLY 1
```

**No** second migration · **no** companion cleanup · **no** target replacement · **no** forward-fix · **no** history manipulation.

**Do not create this file in this issuance task.**

---

## 6. Exact semantic authority

Future reconstruction may contain SQL semantics **equivalent only** to:

```
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
```

Schema qualification `public.user_role` is supported by repository evidence (`CREATE TYPE user_role` in `20260314034834` lands in `public`; later migrations use `public.user_role`).

**Purpose:** ensure `admin` exists as a **committed** enum member of `public.user_role` **before** `20260329103000` begins.

### Commit-boundary model

```
RECONSTRUCTION MIGRATION  →  adds admin
RECONSTRUCTION COMPLETES  →  separate migration / query boundary
COMMIT                    →  admin becomes safely usable
ORIGINAL TARGET           →  executes afterward
TARGET ADD VALUE IF NOT EXISTS 'admin'  →  enum-add no-op
TARGET POLICY             →  uses already committed admin
```

---

## 7. Forbidden semantics

The reconstruction **MUST NOT**:

CREATE/DROP/ALTER POLICY · duplicate target policy · edit `profiles` · update profile rows · alter unrelated RLS · create/drop tables or columns · rebuild / drop / rename `user_role` · remove or reorder enum labels · add any enum value except `admin` · change defaults · create functions or triggers · GRANT/REVOKE · manipulate migration history · contain data/demo fixtures.

No broader repair.

---

## 8. Original target immutability

```
supabase/migrations/20260329103000_add_admin_user_role_and_policy.sql
  = IMMUTABLE / DO NOT EDIT
```

No source restoration · no inserted `COMMIT` · no split of the historical file · no removal of its ADD VALUE · no modification of its policy.

---

## 9. Quarantine / BCR / verifier / guard locks

```
QUARANTINE     = EXACTLY 20260314195641_add_demo_data.sql / COUNT 1
NOT QUARANTINED: HMD-005 reconstruction · 20260329103000 · HMD-002 file · W1 · HMD-004 target · W2 · July S1
BCR            = scripts/verification/e02/replay-e02-declared-baseline.ts / UNCHANGED
VERIFIER       = verify-db-baseline.ts / UNCHANGED
GUARD          = UNCHANGED
DIAGNOSTICS    = UNCHANGED
LAUNCHER       = UNCHANGED
CB-B           = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS / UNCHANGED
BASELINE MODE  = E02_DECLARED_BASELINE_REPLAY / UNCHANGED
```

No transaction-engine redesign.

---

## 10. Future implementation write scope

Intentional writes **only**:

1. the exact authorized reconstruction migration (§5);
2. `docs/implementation/README.md` — minimal implementation ledger.

**Default model:** implementation first → **separate** Completion afterward. Do **not** issue Completion in the implementation task unless that later task is the Completion issuance.

---

## 11. Future implementation pre-gates (before writing SQL)

Implementation **must** re-verify:

- PAD-053 still ISSUED / IMMUTABLE;
- this IA ISSUED and **NOT YET CONSUMED**;
- HMD-005 target unchanged;
- reconstruction path still **unused**;
- timestamp still collision-free;
- predecessor/successor ordering still exact;
- `public.user_role` exists before reconstruction;
- `admin` does **not** already exist in declared clean history before reconstruction;
- target still contains `ADD VALUE IF NOT EXISTS 'admin'` and later same-file use;
- quarantine remains count 1;
- no superseding authority.

Any mismatch: **STOP → GOVERNANCE.** No repair.

---

## 12. Future content / ordering verification

After creating the file, implementation must prove:

```
RECONSTRUCTION FILE COUNT = 1
AUTHORIZED PATH MATCH     = YES
AUTHORIZED TIMESTAMP MATCH = YES
SQL SEMANTIC PURPOSE      = ADMIN ENUM PRE-COMMIT ONLY
POLICY STATEMENTS         = NONE
UNRELATED ENUM VALUES     = NONE
TABLE / DATA / FUNCTION / TRIGGER CHANGES = NONE
TARGET MIGRATION EDIT     = NONE
```

Ordering under BCR filename sort:

```
PREDECESSOR  <  HMD-005 RECONSTRUCTION  <  20260329103000 TARGET
```

DB-free BCR `--plan` must show reconstruction **discovered**, **executable**, and **before** the target. Target remains executable. Quarantine count remains 1. Current BCR pin/authority remain unchanged unless separately governed.

Do **not** hard-code discovered/executable counts as permanent truth. Adding one migration is expected to change counts by +1; **report actual values**.

---

## 13. Future DB-free plan / build

Authorized:

```
existing BCR --plan     (DB-free only)
npm run build           (require PASS)
```

`--plan` must be `PLAN_OK`. **No `--apply`.**

---

## 14. No runtime authority

```
DB EXECUTION                         = NOT AUTHORIZED
STATEFUL SUPABASE                    = NOT AUTHORIZED
DOCKER MUTATION                      = NOT AUTHORIZED
LOCAL-011 RETRY                      = NOT AUTHORIZED
LOCAL-012                            = NOT AUTHORIZED / NOT CREATED
E02_RUNTIME_EXECUTION_AUTHORIZED     = UNSET / FALSE
```

---

## 15. IA consumption rule

This IA becomes **CONSUMED** only if **all** hold:

1. exactly one authorized reconstruction migration created;
2. exact authorized path/timestamp used;
3. semantic scope respected;
4. target unchanged;
5. BCR / verifier / guard unchanged;
6. quarantine remains exactly one;
7. DB-free `--plan` PASS;
8. build PASS;
9. no DB / Supabase / Docker runtime;
10. no unauthorized files modified by the implementation task.

If implementation fails before these: **do not** mark this IA consumed.

---

## 16. Successor Completion

```
IMPLEMENTATION COMPLETION = REQUIRED / NOT ISSUED
```

Reserved family path (not created now):

`docs/implementation/E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-002.md`

Completion must later certify: IA consumed · reconstruction exact · ordering exact · semantic scope exact · target unchanged · BCR/verifier/guard unchanged · quarantine unchanged · plan PASS · build PASS · no runtime execution.

Only after Completion may successor BCR/DBA runtime governance be considered. **LOCAL-012 cannot bypass Completion.**

---

## 17. HMD / LOCAL / baseline locks

| ID | Status |
|----|--------|
| **HMD-001** | **OPEN / DISTINCT** |
| **HMD-002** | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT** |
| **HMD-003** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** (W1 / `20260320045054` applied; W2 / April HARD / July S1 **not reached**) |
| **HMD-004** | **SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** |
| **HMD-005** | **IMPLEMENTATION AUTHORIZED / NOT YET COMPLETED / RUNTIME PENDING** |

```
LOCAL-011                          = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-011 ATTEMPTS                 = 1
LOCAL-011 RETRY                    = NOT AUTHORIZED
LOCAL-012                          = NOT AUTHORIZED / NOT CREATED
DATABASE BASELINE VERIFIED         = NO
RU-1.1 / RU-1.2                    = NOT APPLIED
RU-1.4                             = RUNTIME NOT AUTHORIZED
EIR / ACCEPTANCE / CERTIFICATION   = NONE / BLOCKED / NOT ISSUED
RUNTIME COMMITTED                  = NOT CERTIFIED
FINAL COMMIT PATH                  = BLOCKED
```

This IA **does not** revive LOCAL-011.

---

## 18. Future runtime proof (not this IA)

A later separately authorized replay must prove:

```
RECONSTRUCTION 20260329102500…     = REACHED / APPLIED
TARGET 20260329103000…             = REACHED / APPLIED
PRIOR ERROR (unsafe use of new value "admin" of enum type user_role)
                                   = NOT REPRODUCED
```

Repository implementation does **not** satisfy runtime verification.

---

## 19. Exact next action

```
NEXT = IMPLEMENT EXACTLY ONE HMD-005 COMPATIBILITY RECONSTRUCTION MIGRATION
       UNDER E-02-HFSOR-IA-002
       (REPOSITORY ONLY)
```

That next task may create **only** the authorized migration plus a minimal README update. It **must** run DB-free `--plan` and `npm run build`. It **must not** execute LOCAL-012 or any database apply.

---

## 20. Lock

```
E-02-HFSOR-IA-002                                  = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PAD-053                                            = ISSUED / IMMUTABLE
AUTHORIZED RECONSTRUCTION                          = supabase/migrations/20260329102500_hmd005_reconstruct_user_role_admin.sql
RECONSTRUCTION COUNT                               = EXACTLY 1
RECONSTRUCTION CREATED                             = NO
TARGET                                             = IMMUTABLE / DO NOT EDIT
LOCAL-012                                          = NOT AUTHORIZED / NOT CREATED
NEXT                                               = IMPLEMENT HMD-005 RECONSTRUCTION / REPOSITORY ONLY
EXECUTABLE WORK THIS TASK                          = NONE
```

---

**End of document — E-02-HFSOR-IA-002 · HMD-005 · v1.0 — 2026-08-27**
