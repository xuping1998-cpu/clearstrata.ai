# E-02 Program Authority Decision — Historical Migration Integrity / Compatibility (Successor)

## Pre-Target Enum-Commit Compatibility Reconstruction · HMD-005

| Field | Value |
|-------|-------|
| **Document Type** | **Program Authority Decision (Supplement)** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Parent Authority** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) v1.0 (PAD-001 – PAD-010) |
| **Direct Predecessor Supplement** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md) (**PAD-052** · HMIC-013 – HMIC-024 · HMD-004) |
| **Prior Predecessor Supplements** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) (PAD-039 – PAD-050 · HMIC-001 – HMIC-012 · HMD-002) · [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) (PAD-051 · HMD-003) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038 · HMD-001) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025) |
| **Supplement ID** | **PAD-053** |
| **Authority Question Register** | **HMIC-025 – HMIC-036** |
| **Status** | **APPROVED WITH CONDITIONS — OPTION B (FILE-SPECIFIC SUCCESSOR)** |
| **Selected Policy** | **PRE-TARGET ENUM-COMMIT COMPATIBILITY RECONSTRUCTION** |
| **Defect** | **HMD-005** |
| **Authority Level** | Program Authority |
| **Effective Date** | 2026-08-27 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **NO** |

> **Authority path finding: YES.** Filename `E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md` is **authority-safe** as the next successor in the existing **HMIC** decision family (`Decision.md` · `Decision-002.md` · **this Decision-003**). Distinct filename keeps PAD-039 – PAD-050 and **PAD-052** **immutable**. This is **not** a new governance tier. PAD identifiers are **not** CS/FD registry numbers.
>
> Sequence: Parent PAD-001 – PAD-010 · DAA PAD-011 – PAD-025 · HMBC PAD-026 – PAD-038 · HMIC PAD-039 – PAD-050 · HFSO PAD-051 · HMIC successor PAD-052 · **this supplement PAD-053**. Highest previously allocated PAD is **PAD-052**. **PAD-053 is the next unused identifier.** **PAD-054+ is not allocated.**
>
> **Why a new PAD is required (not reflexive):** PAD-052 / HMD-004 is **exact historical source restoration** of a corrupted file. HMD-005’s proven origin **already contains** the failing structure. PAD-039 / `E-02-HMIR-IA` / `E-02-HMIR-IA-002` therefore **cannot** restore a “corrected origin.” PAD-051 reconstruction is **finance schema-origin** (HMD-003) and **does not** cover `user_role` / `20260329103000`. PAD-032 still requires **future authority** before historical-set mutation. A file-specific successor PAD is required to allocate **HMD-005** and select a **compatibility reconstruction** model.
>
> **Why this is not a new class of fake history:** The original target remains **immutable** and remains responsible for its own policy. The future reconstruction is a **governed replay compatibility layer**, not a claim that such a file existed historically, and not mark-as-applied.

> **Scope lock:** Establishes **Option B — pre-target enum-commit compatibility reconstruction** for **one** migration (`20260329103000_add_admin_user_role_and_policy.sql`) and **exactly one** future reconstruction migration whose only semantic purpose is to make `user_role.admin` a **committed** enum label **before** that target begins. This record **does not** write SQL · **does not** create the reconstruction file · **does not** edit the target · **does not** issue Implementation Authorization · **does not** retry LOCAL-011 · **does not** create LOCAL-012 · **does not** expand quarantine · **does not** modify BCR/guard/verifier · **does not** run database/Supabase/Docker · **does not** authorize RU-1.4 · **does not** reclassify EIR / Acceptance / Certification.

```
HISTORICAL MIGRATION INTEGRITY / COMPATIBILITY AUTHORITY-003 = ESTABLISHED (THIS SUPPLEMENT)
DECISION                                                     = APPROVED WITH CONDITIONS — OPTION B
SELECTED POLICY                                              = PRE-TARGET ENUM-COMMIT COMPATIBILITY RECONSTRUCTION
REMEDIATION MODEL                                            = ONE NEW PRE-TARGET RECONSTRUCTION MIGRATION
                                                               + IMMUTABLE ORIGINAL TARGET
SOURCE CORRUPTION                                            = REJECTED
CURRENT EXECUTABLE SQL == PROVEN ORIGIN                      = YES
PROVEN ORIGIN                                                = bc48068db008d03b3c93d60646169737de7bc363
EXACT HISTORICAL SOURCE RESTORATION                          = NOT APPLICABLE
FORWARD-FIX                                                  = REJECTED
REPLAY-ENGINE TRANSACTION CHANGE                             = REJECTED AS CURRENT REMEDY
QUARANTINE / SKIP                                            = NOT AUTHORIZED
FAKE HISTORY / REPAIR-AS-APPLIED                             = REJECTED
HMD-005                                                      = OPEN / DEFECT CLASSIFIED / COMPATIBILITY RECONSTRUCTION SELECTED / IMPLEMENTATION NOT AUTHORIZED / RUNTIME REPLAY VERIFICATION PENDING
TARGET                                                       = 20260329103000_add_admin_user_role_and_policy.sql
ORIGINAL TARGET                                              = IMMUTABLE / DO NOT EDIT
FUTURE RECONSTRUCTION COUNT                                  = EXACTLY 1
FUTURE RECONSTRUCTION CREATED                                = NO
HMD-001                                                      = OPEN / DISTINCT
HMD-002                                                      = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT
HMD-003                                                      = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
HMD-004                                                      = SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
EXISTING QUARANTINE                                          = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINE COUNT                                             = 1
LOCAL-011                                                    = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-011 RETRY                                              = NOT AUTHORIZED
LOCAL-012                                                    = NOT AUTHORIZED / NOT CREATED
THIS PAD                                                     ≠ IMPLEMENTATION AUTHORIZATION
THIS PAD                                                     ≠ DATABASE APPLICATION AUTHORIZATION
THIS PAD                                                     ≠ PRODUCTION DEPLOYMENT AUTHORIZATION
PAD-054+                                                     = NOT ALLOCATED
```

---

## 1. Authority / provenance

| Record | Role |
|--------|------|
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) | Parent — PAD-001 – PAD-010 |
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | PAD-026 – PAD-038 · DATA_ONLY quarantine · **HMD register (PAD-032)** |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) | PAD-039 – PAD-050 · HMD-002 restoration class |
| [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) | PAD-051 · HMD-003 reconstruction class (**finance schema-origin**; not this file) |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md) | **PAD-052 ISSUED / IMMUTABLE** · HMD-004 exact source restoration |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-011.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-011.md) | LOCAL-011 **APPLICATION_FAILED** · evidence **immutable** · run `local-011-20260827a` |
| [`tests/e02/evidence/local-011-20260827a/bcr-replay-manifest.json`](../../tests/e02/evidence/local-011-20260827a/bcr-replay-manifest.json) | Manifest `result=APPLICATION_FAILED` · executed **56** · failure string as below |
| HMD-005 forensic return (2026-08-27) | Consumed as **immutable fact**; not reopened |

**MANDATORY STOP does not apply.** Authority supports issuance of PAD-053.

---

## 2. Pre-issuance gates (this issuance — read-only)

| ID | Check | Result |
|----|--------|--------|
| A | PAD-052 exists / immutable | **PASS** |
| B | HMD-001 – HMD-004 exist | **PASS** |
| C | HMD-005 not allocated | **PASS** |
| D | PAD-053 next unused PAD | **PASS** (highest allocated **PAD-052**) |
| E | Decision-003 next unused HMIC decision filename | **PASS** (`Decision.md` · `Decision-002.md` exist; `-003` unused) |
| F | LOCAL-011 evidence exists | **PASS** |
| G | LOCAL-011 APPLICATION_FAILED / no retry | **PASS** |
| H | LOCAL-012 not authorized / not created | **PASS** |
| I | Target exists | **PASS** |
| J–N | Target unchanged from forensics; executable SQL origin-identical; origin `bc48068`; non-semantic trailing blanks only | **PASS** |
| O–Q | Origin contains ADD VALUE `'admin'` then same-file policy use; `admin` absent before target; pre-target labels owner/caretaker/council/manager | **PASS** |
| R–T | BCR whole-file query; source corruption **REJECTED**; PG enum pattern **MATCH** | **PASS** |
| U–W | HMD-002 / HMD-004 runtime verified; HMD-003 runtime pending | **PASS** |
| X | Quarantine exactly `20260314195641_add_demo_data.sql` / count 1 | **PASS** |

**No material discrepancy. This PAD may issue.**

---

## 3. Immutable LOCAL-011 evidence basis

```
E-02-DBA-LOCAL-011                 = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
STATEFUL APPLY ATTEMPTS            = 1
RETRY                              = NOT AUTHORIZED
evidenceRunId                      = local-011-20260827a
EXECUTED MIGRATION COUNT           = 56
HIGHEST APPLIED                    = 20260328120000_owner_info_council_manager_approve.sql
FIRST FAILING MIGRATION            = 20260329103000_add_admin_user_role_and_policy.sql
OBSERVED ERROR                     = unsafe use of new value "admin" of enum type user_role
DATABASE BASELINE VERIFIED         = NO
```

This PAD **does not** alter that evidence and **does not** revive LOCAL-011.

---

## 4. HMD register / HMD-005 issuance

Verified unused:

| ID | Status before this PAD |
|----|------------------------|
| HMD-001 | ALLOCATED / OPEN / DISTINCT |
| HMD-002 | ALLOCATED / SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT |
| HMD-003 | ALLOCATED / OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME PENDING |
| HMD-004 | ALLOCATED / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED |
| **HMD-005** | **NOT ALLOCATED** (PAD-052: “HMD-005+ is not allocated”) |

**Allocated now: HMD-005** — next unused identifier in the PAD-032 register (PAD-045 / PAD-051 / PAD-052 precedent). **Not** a new governance tier. **HMD-006+ is not allocated.**

| Field | Value |
|-------|-------|
| **Defect ID** | **HMD-005** |
| **Title / class** | **HISTORICAL MIGRATION TRANSACTION-BOUNDARY COMPATIBILITY DEFECT** |
| **Subtype** | **ORIGINAL HISTORICAL CLEAN-REPLAY ENUM COMMIT-BOUNDARY DEFECT** |
| **Target** | `supabase/migrations/20260329103000_add_admin_user_role_and_policy.sql` |
| **Attribution** | **NOT RU-1.1 · NOT RU-1.2 · NOT RU-1.3 · NOT RU-1.4 · NOT HMD-001/002/003/004** |

**Defect basis:** The proven historical origin itself (1) adds enum value `admin` and (2) uses `admin` later in the same migration / BCR query boundary. Under the governed clean-replay transaction model, PostgreSQL rejects that immediate use before the adding transaction commits.

```
HMD-005 STATUS =
  OPEN /
  DEFECT CLASSIFIED /
  COMPATIBILITY RECONSTRUCTION SELECTED /
  IMPLEMENTATION NOT AUTHORIZED /
  RUNTIME REPLAY VERIFICATION PENDING
```

**Not reconstructed. Not implemented. Not source restored. Not runtime verified. Not CLOSED.**

---

## 5. Origin / source-integrity finding

```
SOURCE CORRUPTION                              = REJECTED
CURRENT EXECUTABLE SQL == PROVEN ORIGIN        = YES
PROVEN ORIGIN                                  = bc48068db008d03b3c93d60646169737de7bc363
CURRENT/ORIGIN SEMANTIC DIFFERENCE             = NONE
NON-SEMANTIC DIFFERENCE                        = trailing blank lines only (8c30eb2)
EXACT HISTORICAL SOURCE RESTORATION            = NOT APPLICABLE
```

Do **not** reopen HMD-004 restoration doctrine for this file. There is no recoverable “corrected origin” that removes ADD VALUE + same-migration use.

PostgreSQL enum transaction pattern = **MATCH**.  
BCR executes the target as a **single** `client.query(entire file)` boundary = **PROVEN** for this replay path.

---

## 6. Proven historical intent

Bounded intended outcome proven by the original target (unchanged):

1. `user_role` must contain **`admin`**.
2. A `profiles` UPDATE policy must permit **`council`** and **`admin`**.

The original target **already contains** that policy. The compatibility defect is **not** missing policy semantics. The missing clean-replay prerequisite is:

```
admin MUST already be a COMMITTED enum value
before 20260329103000 evaluates its policy expressions.
```

Immediate historical pre-target enum labels under clean declared replay: **owner · caretaker · council · manager**. **Not** `admin`.

---

## 7. Selected remediation — Option B

```
SELECTED = OPTION B
MODEL    = PRE-TARGET ENUM-COMMIT COMPATIBILITY RECONSTRUCTION
```

Create **exactly one** **NEW** reconstruction migration that sorts:

- **strictly before** `20260329103000_add_admin_user_role_and_policy.sql`
- **strictly after** the latest required earlier historical migration

Read-only adjacency (this issuance; **filename not reserved**):

| Bound | File |
|-------|------|
| Immediate predecessor | `20260328120000_owner_info_council_manager_approve.sql` |
| Target | `20260329103000_add_admin_user_role_and_policy.sql` |
| Occupied timestamps in `(20260328120000, 20260329103000)` | **NONE** |

The future Implementation Authorization **must** pick a unique timestamp in that open interval after a fresh collision check. This PAD **does not** create the file and **does not** freeze an exact filename.

**Intended transaction boundary:**

```
RECONSTRUCTION MIGRATION  →  adds admin
COMMIT BOUNDARY           →  after that migration completes
ORIGINAL TARGET           →  starts afterward
TARGET ADD VALUE IF NOT EXISTS 'admin'  →  sees committed admin (idempotent / no-op as creation)
TARGET POLICY USE         →  uses previously committed enum value
```

This is a **compatibility reconstruction**, not a historical-source claim. Do **not** claim such a reconstruction existed historically.

### 7.1 Semantic scope (enum prerequisite only)

Future reconstruction may authorize **only** semantics equivalent to:

```
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
```

subject to exact schema/type evidence at Implementation Authorization time.

**Not selected:** recreating/replacing target policy · copying the target · modifying unrelated roles · modifying `profiles` · extra RLS · defaults · tables · enum rebuild / drop-create `user_role` · broader schema repair.

The historical target remains responsible for its original policy. **No policy statement** belongs in the reconstruction unless a **later** governance decision proves it necessary. Current evidence: **not necessary**.

This PAD **does not** authorize executable SQL.

### 7.2 Original target immutability

```
20260329103000_add_admin_user_role_and_policy.sql = IMMUTABLE / DO NOT EDIT
```

---

## 8. Rejected options

| Option | Decision | Reason |
|--------|----------|--------|
| **A** Exact historical source restoration | **REJECTED** | Proven origin already contains ADD VALUE + same-migration use |
| **C** Forward-fix migration | **REJECTED** | Clean replay fails **in** `20260329103000`; a later file cannot run first |
| **D** Replay-engine transaction change | **REJECTED AS CURRENT REMEDY** / high-impact alternative **not selected** | Would affect the entire historical replay model; hosted historical boundaries remain unresolved; BCR **unchanged** |
| **E** Quarantine | **REJECTED** | Schema / enum / RLS — **not DATA_ONLY** |
| **F** Fake history / mark-applied | **REJECTED** | No skip-as-applied; no `migration repair` |

Quarantine remains **exactly** `20260314195641_add_demo_data.sql` / **COUNT 1**. HMD-005 target is **not** quarantined. Future reconstruction **must not** be quarantined.

---

## 9. Relations

| Defect | Relation |
|--------|----------|
| **HMD-001** | **OPEN / DISTINCT** — quarantine unchanged |
| **HMD-002** | **DISTINCT** — `20260315035847` **REACHED / APPLIED**; prior parser defect **NOT REPRODUCED**; **do not reopen** |
| **HMD-003** | **DISTINCT** — finance schema-origin reconstruction; not `user_role` / enum commit-boundary |
| **HMD-004** | **DISTINCT** — source-integrity corruption / origin divergence / exact restoration. HMD-005 is origin-valid original-design clean-replay compatibility. **Do not merge classes.** |

HMD-002 / HMD-004 checkpoint successes **do not** constitute full baseline success.

HMD-003 remains **runtime pending**: W1 and `20260320045054` applied; W2 / April HARD / July S1 **not reached**. **Do not close HMD-003.**

---

## 10. Implementation authority lock

PAD-053 **selects the model**. It **does not** authorize implementation.

A **separate** future Implementation Authorization must:

- verify PAD-053 issued / immutable;
- verify HMD-005 status;
- **determine the correct existing IA family and next unused IA identifier from repository sequence** (this PAD **does not** reserve an IA ID);
- determine exact reconstruction filename/timestamp;
- prove ordering strictly before `20260329103000` and after required predecessors;
- prove no filename/timestamp collision;
- authorize **exactly one** new migration;
- authorize **only** enum-precommit semantics;
- forbid original target edits;
- require static verification / build / `--plan`;
- forbid runtime application until later governance.

**Do not create that IA now.**

Required later sequence:

```
PAD-053
→ HMD-005 compatibility-reconstruction Implementation Authorization
→ reconstruction implementation
→ implementation verification / Completion
→ successor BCR/DBA governance as required
→ only then future runtime replay
```

**No automatic LOCAL-012.**

---

## 11. Future completion / runtime proof (not certified here)

Future implementation completion must prove: one reconstruction migration · correct pre-target ordering · target unchanged · enum-precommit only · no policy duplication · no enum rebuild · quarantine unchanged · BCR/verifier unchanged · `--plan` includes reconstruction before target · build PASS · no stateful DB during repository implementation · IA consumed correctly.

HMD-005 may become **runtime verified** only when a separately authorized future replay proves:

```
RECONSTRUCTION MIGRATION     = REACHED / APPLIED
TARGET 20260329103000        = REACHED / APPLIED
PRIOR ERROR
  unsafe use of new value "admin" of enum type user_role
                         = NOT REPRODUCED
```

This PAD certifies **none** of those facts.

---

## 12. LOCAL / baseline / certification locks

```
LOCAL-011                          = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-011 ATTEMPTS                 = 1
LOCAL-011 RETRY                    = NOT AUTHORIZED
LOCAL-012                          = NOT AUTHORIZED / NOT CREATED
DATABASE BASELINE VERIFIED         = NO
RU-1.1                             = NOT APPLIED
RU-1.2                             = NOT APPLIED
RU-1.4                             = RUNTIME NOT AUTHORIZED
E02_RUNTIME_EXECUTION_AUTHORIZED   = UNSET / FALSE
EIR PASS                           = NONE
ACCEPTANCE                         = BLOCKED
CERTIFICATION                      = NOT ISSUED
RUNTIME COMMITTED                  = NOT CERTIFIED
FINAL COMMIT PATH                  = BLOCKED
```

---

## 13. Exact next action

```
NEXT = ISSUE A SEPARATE HMD-005 COMPATIBILITY RECONSTRUCTION IMPLEMENTATION AUTHORIZATION
```

That subsequent task **must first** determine the correct authority family and next unused IA identifier from repository governance. **Do not implement** the reconstruction in this PAD.

---

## 14. Program Authority Decisions (PAD-053 / HMIC-025 – HMIC-036)

PAD-053 is **one** supplement ID covering the following resolutions (PAD-051 / PAD-052 single-ID precedent).

### PAD-053 / HMIC-025 — Defect identifier

**RESOLVED:** Allocate **HMD-005**. **HMD-006+ not allocated.**

### PAD-053 / HMIC-026 — Classification

**RESOLVED:** HISTORICAL MIGRATION TRANSACTION-BOUNDARY COMPATIBILITY DEFECT · subtype ORIGINAL HISTORICAL CLEAN-REPLAY ENUM COMMIT-BOUNDARY DEFECT.

### PAD-053 / HMIC-027 — Source restoration

**RESOLVED:** Option A **REJECTED**. Source corruption **REJECTED**. Exact historical source restoration **NOT APPLICABLE**.

### PAD-053 / HMIC-028 — Selected remedy

**RESOLVED:** Option B **SELECTED** — pre-target enum-commit compatibility reconstruction. Exactly **one** new migration. Original target **immutable**.

### PAD-053 / HMIC-029 — Semantic scope

**RESOLVED:** Reconstruction may only ensure committed `user_role.admin` before the target. No policy duplication. No enum rebuild.

### PAD-053 / HMIC-030 — Ordering

**RESOLVED:** Future file must sort `< 20260329103000` and after required predecessors. Open interval after `20260328120000` currently has **zero** occupants. Exact timestamp **not reserved** here.

### PAD-053 / HMIC-031 — Forward-fix

**RESOLVED:** Option C **REJECTED**.

### PAD-053 / HMIC-032 — Replay engine

**RESOLVED:** Option D **REJECTED AS CURRENT REMEDY**. BCR **unchanged**.

### PAD-053 / HMIC-033 — Quarantine / fake history

**RESOLVED:** Option E **REJECTED**. Option F **REJECTED**. Quarantine count remains **1**.

### PAD-053 / HMIC-034 — Relations

**RESOLVED:** HMD-003 **DISTINCT**. HMD-004 **DISTINCT**. Do not merge classes. Do not reopen HMD-002/HMD-004 checkpoints.

### PAD-053 / HMIC-035 — Successor chain

**RESOLVED:** Next issued document = **HMD-005 compatibility-reconstruction Implementation Authorization** (not created here; IA family/ID determined at that issuance).

### PAD-053 / HMIC-036 — LOCAL-011 / LOCAL-012 / RU-1.4

**RESOLVED:** LOCAL-011 immutable failure / no retry. LOCAL-012 **not** authorized. RU-1.4 **RUNTIME NOT AUTHORIZED**. This PAD ≠ execution.

---

## 15. Invariants

| ID | Invariant |
|----|-----------|
| HMIC3-I1 | HMD-001 remains OPEN; quarantine count remains 1 |
| HMIC3-I2 | HMD-002 remains DISTINCT / runtime verified |
| HMIC3-I3 | HMD-003 remains DISTINCT / runtime pending |
| HMIC3-I4 | HMD-004 remains DISTINCT / runtime verified |
| HMIC3-I5 | Original target `20260329103000` remains unedited |
| HMIC3-I6 | Future reconstruction count = 1; enum-precommit only |
| HMIC3-I7 | No `migration repair` / fake applied row |
| HMIC3-I8 | LOCAL-011 evidence immutable; no retry |
| HMIC3-I9 | This PAD ≠ execution / ≠ IA / ≠ DBA |
| HMIC3-I10 | PAD-054+ not allocated |
| HMIC3-I11 | EIR / Acceptance / Certification unchanged |

---

## 16. Strongest allowed claim

A committed `user_role.admin` **before** `20260329103000` begins is the clean-replay prerequisite implied by the original target’s `ADD VALUE IF NOT EXISTS` plus same-file policy use.

This PAD **does not** claim: reconstruction exists · target already applies · HMD-003 closed · database baseline verified · LOCAL-012 authorized.

---

## 17. Lock

```
PAD-053                                                    = ISSUED / IMMUTABLE
HMD-005                                                    = OPEN / DEFECT CLASSIFIED / COMPATIBILITY RECONSTRUCTION SELECTED / IMPLEMENTATION NOT AUTHORIZED / RUNTIME REPLAY VERIFICATION PENDING
TARGET                                                     = 20260329103000_add_admin_user_role_and_policy.sql
SOURCE CORRUPTION                                          = REJECTED
CURRENT EXECUTABLE SQL == PROVEN ORIGIN                    = YES
SELECTED REMEDY                                            = OPTION B / PRE-TARGET ENUM-COMMIT COMPATIBILITY RECONSTRUCTION
FUTURE RECONSTRUCTION COUNT                                = EXACTLY 1
ORIGINAL TARGET                                            = IMMUTABLE / DO NOT EDIT
LOCAL-011                                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-012                                                  = NOT AUTHORIZED / NOT CREATED
DATABASE BASELINE VERIFIED                                 = NO
RU-1.4                                                     = RUNTIME NOT AUTHORIZED
NEXT                                                       = ISSUE HMD-005 COMPATIBILITY RECONSTRUCTION IMPLEMENTATION AUTHORIZATION
EXECUTABLE WORK                                            = NONE
```

---

**End of document — PAD-053 · HMIC-025 – HMIC-036 · HMD-005 — v1.0 — 2026-08-27**
