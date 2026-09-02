# E-02 — Historical Original-SQL Compatibility Correction — Implementation Authorization (Successor)

## HMD-011 Narrow Original-Historical-SQL Compatibility Correction · `public.meeting_quota_tracker` / `mqt.meeting_id`

| Field | Value |
|-------|-------|
| **Document Type** | **Implementation Authorization (Successor)** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-HOSCC-IA-002** |
| **Family** | **Historical Original-SQL Compatibility Correction (HOSCC)** |
| **Substantive controlling Program Authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-010.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-010.md) (**PAD-060** · HMIC-109 – HMIC-120) |
| **Implementation-governance family authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-009.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-009.md) (**PAD-059** · HMIC-097 – HMIC-108) |
| **Predecessor IA** | [`E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Authorization.md`](E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Authorization.md) (**E-02-HOSCC-IA** · HMD-010 · **CONSUMED** · **does not cover this construct**) |
| **Forensic record** | [`E-02-HMD-011-Multi-Tenant-Properties-Meeting-Quota-Tracker-Meeting-Id-Forensic-Investigation.md`](E-02-HMD-011-Multi-Tenant-Properties-Meeting-Quota-Tracker-Meeting-Id-Forensic-Investigation.md) |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-017.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-017.md) · run `local-017-20260831a` |
| **Defect** | **HMD-011** |
| **Status** | **Approved With Conditions — NOT YET CONSUMED** |
| **Authority Level** | Implementation Authorization (repository original-historical-SQL compatibility correction only) |
| **Effective Date** | 2026-08-31 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Authorization-002.md`](E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Authorization-002.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **Future repository-only Option C correction · NOT this issuance** |
| **Successor Completion (not created)** | `docs/implementation/E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Completion-002.md` (**E-02-HOSCC-IMPLEMENTATION-COMPLETION-002** · reserved · **not issued**) |

> **Authority path finding: YES.** Filename `E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Authorization-002.md` is **authority-safe** as the **next numbered successor** in the PAD-059 **HOSCC** Implementation Authorization family. ID **`E-02-HOSCC-IA-002`**. **`E-02-HOSCC-IA-001` must not exist and is not created.** Predecessor **`E-02-HOSCC-IA`** (unnumbered first member · HMD-010 · **CONSUMED**) remains **immutable**. No **`E-02-HOSCC-IA-003+`** exists or supersedes the sequence. Distinct filename keeps HMIR, HFSOR, BCR, DBA, and RU IAs **immutable**. This is **not** a new Program Authority tier, **not** a new PAD, **not** an amendment of PAD-060 or PAD-059, **not** a DBA, **not** a BCR IA, **not** a Completion, **not** LOCAL-018.
>
> **Family determination / sequence proof (this issuance, independently verified):** Repository-established HOSCC IA files:
>
> 1. `E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Authorization.md` — ID **`E-02-HOSCC-IA`** (unnumbered first member; HMD-010; **CONSUMED**). There is **no** document or ID **`E-02-HOSCC-IA-001`**.
> 2. **This file** — ID **`E-02-HOSCC-IA-002`** (HMD-011; **issued here** · **NOT YET CONSUMED**).
>
> PAD-059 numbering: **UNNUMBERED FIRST THEN `-002` / `-003` / … · NO `-001`**. **Next unused ID = `E-02-HOSCC-IA-002`.**
>
> **Document class:** Bounded **repository narrow original-historical-SQL compatibility correction** authorization only. This record **does not** edit the target · **does not** write SQL · **does not** add `meeting_id` · **does not** create reconstruction · **does not** alter HMD-010 HOSCC L280–285 · **does not** apply migrations · **does not** run BCR `--apply` · **does not** issue LOCAL-018 · **does not** issue HOSCC Completion-002 · **does not** authorize RU-1.4.

```
HISTORICAL ORIGINAL-SQL COMPATIBILITY CORRECTION IA = E-02-HOSCC-IA-002
DECISION                                            = APPROVED WITH CONDITIONS / NOT YET CONSUMED
SUCCESSOR MEMBER                                    = -002 (PAD-059 numbering)
E-02-HOSCC-IA-001                                   = MUST NOT EXIST / DOES NOT EXIST
E-02-HOSCC-IA (HMD-010)                             = CONSUMED / IMMUTABLE / DISTINCT
PAD-060                                             = SUBSTANTIVE CONTROLLING AUTHORITY /
                                                      ISSUED / IMMUTABLE / OPTION C
PAD-059                                             = HOSCC FAMILY AUTHORITY /
                                                      ISSUED / IMMUTABLE
SELECTED POLICY                                     = OPTION C —
                                                      NARROW ORIGINAL-HISTORICAL-SQL
                                                      COMPATIBILITY CORRECTION
HMD-011                                             = OPEN / DISTINCT /
                                                      ORIGINAL HISTORICAL SQL /
                                                      SCHEMA-ASSUMPTION DEFECT /
                                                      ORIGINAL CLEAN-REPLAY WRONG-COLUMN
                                                      ASSUMPTION ON EXISTING TABLE /
                                                      OPTION C SELECTED /
                                                      IMPLEMENTATION AUTHORIZED /
                                                      NOT YET IMPLEMENTED
TARGET                                              = supabase/migrations/
                                                      20260405120000_multi_tenant_properties.sql
AUTHORIZED BASE BLOB                                = a37966fe60a9a7be1897e04b521d284a55185805
GOVERNED CONSTRUCT                                  = L294–297 invalid mqt.meeting_id UPDATE
AUTHORIZED ACTION                                   = OMIT / REMOVE invalid UPDATE ONLY
REPLACEMENT SQL                                     = NOT AUTHORIZED
AUTHORIZED FILE COUNT                               = EXACTLY 1
AUTHORIZED CONSTRUCT COUNT                          = EXACTLY 1
CORRECTION EXECUTED                                 = NO
ADD meeting_id                                      = PROHIBITED
L298 default_id backfill                            = PRESERVE / UNCHANGED
L116–117 property_id ADD                            = PRESERVE / UNCHANGED
L390–391 SET NOT NULL                               = PRESERVE / UNCHANGED
HMD-010 L280–285 HOSCC                              = PRESERVE / UNCHANGED
fiscal_year UNIQUE                                  = PRESERVE / UNCHANGED
SOURCE RESTORATION                                  = PROHIBITED
WHOLE-FILE REPLACEMENT                              = PROHIBITED
HMD-009                                             = LOCKED / UNCHANGED
LOCAL-017                                           = APPLICATION_FAILED /
                                                      NOT SUCCESSFULLY CONSUMED /
                                                      EVIDENCE IMMUTABLE
LOCAL-017 ATTEMPTS                                  = 1
LOCAL-017 RETRY                                     = NOT AUTHORIZED
LOCAL-018                                           = NOT ISSUED
BCR EDIT                                            = NOT AUTHORIZED
BCR DBA PIN (read-only)                             = E-02-DBA-LOCAL-017
BCR ARTIFACT AUTHORITY (read-only)                  = E-02-BCR-IA-017
THIS IA                                             ≠ DBA · ≠ BCR IA · ≠ PAD · ≠ REA · ≠ COMPLETION
HOSCC COMPLETION-002                                = REQUIRED AFTER IMPLEMENTATION / NOT ISSUED
```

---

## 1. Pre-issuance gates

| ID | Check | Result |
|----|--------|--------|
| A. PAD-060 | Decision-010 · PAD-060 · HMIC-109 – HMIC-120 · Option C **ISSUED / IMMUTABLE** | **PASS** |
| B. PAD-059 | Decision-009 · HOSCC family **ESTABLISHED** · does **not** amend PAD-060 | **PASS** |
| C. HOSCC sequence | **`E-02-HOSCC-IA` CONSUMED** · **`E-02-HOSCC-IA-002` absent** · **no `-001`** · **no `-003+`** | **PASS** |
| D. HMD-011 | Option C selected · forensic complete · implementation not yet authorized | **PASS** |
| E. Target base blob | Worktree blob **`a37966fe60a9a7be1897e04b521d284a55185805`** = PAD-060 authorized base · includes HMD-010 HOSCC | **PASS** |
| F. Invalid construct | L294–297 `mqt.meeting_id` UPDATE present exactly once | **PASS** |
| G. Preservation locks | L298 · L116–117 · L390–391 · L280–285 present | **PASS** |

**STOP does not apply.** This IA may issue.

---

## 2. Authorization basis

| Record | Role |
|--------|------|
| PAD-060 | **Substantive** Option C policy · exact §13.1 bind · **inherited without modification** |
| PAD-059 | **Family** HOSCC · successor ID/path/numbering · **does not** authorize SQL alone |
| HMD-011 forensic | Classification · failing construct · origin hashes |
| LOCAL-017 evidence | Immutable `APPLICATION_FAILED` · run `local-017-20260831a` |
| Target (this issuance, read-only) | blob `a37966fe60a9a7be1897e04b521d284a55185805` · constructs as below |

**This IA consumes PAD-060 (substantive) and PAD-059 (family) for implementation authorization only.** Correction is **not performed** in this issuance.

---

## 3. Authorization decision

| Field | Value |
|-------|--------|
| **Authorization ID** | **E-02-HOSCC-IA-002** |
| **Decision** | **APPROVED WITH CONDITIONS / NOT YET CONSUMED** |
| **Authorized future action** | **Remove exactly** the invalid L294–297 `UPDATE public.meeting_quota_tracker mqt` that references `mqt.meeting_id` |
| **Not authorized** | Replacement SQL · reconstruction · `ADD meeting_id` · fiscal_year join · L298 edit · HMD-010 revert · whole-file rewrite · BCR retarget · LOCAL-018 · runtime |
| **Execution this task** | **NOT PERFORMED** |

---

## 4. Target identity (pre-implementation lock)

```
PATH            = supabase/migrations/20260405120000_multi_tenant_properties.sql
AUTHORIZED BASE = a37966fe60a9a7be1897e04b521d284a55185805
HEAD BLOB       = a37966fe60a9a7be1897e04b521d284a55185805
PAD-060 BASE    = a37966fe60a9a7be1897e04b521d284a55185805
ORIGIN COMMIT   = fb0094239d74cc4466853cc1cfcb906164d0fb89
ORIGIN BLOB     = b8c2b851d41d2218e90acba38403288cec5e28c9
CURRENT vs ORIGIN = HMD-010 HOSCC (L280–285) + 8c30eb2 comment/trailing blanks
                  mqt block UNCHANGED from origin (invalid reference is original)
RESTORE TO ORIGIN BLOB = PROHIBITED (would undo HMD-010 HOSCC)
HMD-009 ATTRIBUTABLE CHANGE IN THIS FILE = NONE
UNEXPLAINED TARGET DRIFT = NONE
```

Future implementation **must** re-verify blob **`a37966fe60a9a7be1897e04b521d284a55185805`** and governed constructs **immediately before edit**. If blob or pre-edit constructs differ materially:

```
IMPLEMENTATION = BLOCKED
IA             = NOT CONSUMED
               STOP → GOVERNANCE
```

---

## 5. Classification

```
PRIMARY   = ORIGINAL HISTORICAL SQL / SCHEMA-ASSUMPTION DEFECT
SUBTYPE   = ORIGINAL CLEAN-REPLAY WRONG-COLUMN ASSUMPTION ON EXISTING TABLE
SOURCE CORRUPTION OF mqt.meeting_id = REJECTED
MISSING SCHEMA-ORIGIN meeting_id    = REJECTED / NOT PROVEN
```

---

## 6. Historical schema — `public.meeting_quota_tracker`

Origin: `20260320044053_create_meeting_voting_system.sql` L395–408.

| Item | Pre-target |
|------|------------|
| `id` | uuid PK |
| `fiscal_year` | integer NOT NULL **UNIQUE** |
| Count / overtime columns | present |
| `meeting_id` | **ABSENT** |
| `property_id` | **ABSENT** |

No pre-target migration adds `meeting_id` to this table. Table is **fiscal-year aggregate** (one row per calendar year), not meeting-keyed.

---

## 7. Exact governed invalid SQL (pre-state)

**Container:** anonymous `DO $c$` beginning **L74**.

**Governed object to REMOVE:** unguarded DML at **L294–297**.

**Alias `mqt`:** TABLE alias bound to `public.meeting_quota_tracker`.

**Current invalid fragment (authoritative pre-state):**

```
L294  UPDATE public.meeting_quota_tracker mqt
L295  SET property_id = m.property_id
L296  FROM public.meetings m
L297  WHERE mqt.meeting_id = m.id AND mqt.property_id IS NULL;
```

**Failing reference:** `mqt.meeting_id` at L297.

**Essential invalid reference:** `mqt.meeting_id` — column **never existed** on historical table.

---

## 8. Authorized future correction (inherits PAD-060 §13.1 without modification)

| Item | Bind |
|------|------|
| File count | **EXACTLY 1** |
| File | `supabase/migrations/20260405120000_multi_tenant_properties.sql` |
| Construct count | **EXACTLY 1** |
| Authorized act | **OMIT / REMOVE** L294–297 invalid UPDATE **only** |
| Replacement SQL | **NONE** |
| `meeting_id` on tracker | **NOT ADDED** |

**Canonical authorized future state** (conceptual):

```
-- L294–297 REMOVED (invalid mqt.meeting_id UPDATE omitted entirely)
-- L298 PRESERVED:
UPDATE public.meeting_quota_tracker SET property_id = default_id WHERE property_id IS NULL;
```

### 8.1 Preserved constructs (must remain unchanged)

| Location | Construct | Authority |
|----------|-----------|-----------|
| L116–117 | `ADD COLUMN IF NOT EXISTS property_id` on `meeting_quota_tracker` | **PRESERVE** |
| L298 | `UPDATE … SET property_id = default_id WHERE property_id IS NULL` | **PRESERVE** (semantic effect unchanged) |
| L390–391 | guarded `ALTER COLUMN property_id SET NOT NULL` | **PRESERVE** |
| L280–285 | HMD-010 HOSCC `meeting_votes` correction | **PRESERVE** |
| `20260320044053` origin | `fiscal_year UNIQUE` on tracker (not altered in target) | **PRESERVE** — do not add `(property_id, fiscal_year)` unique |

---

## 9. Prohibited acts

```
ADD COLUMN meeting_id / reconstruction migration              = PROHIBITED
REPLACE WITH fiscal_year JOIN / meeting-date mapping        = PROHIBITED
SYNTHETIC meeting_id / per-property row reconstruction      = PROHIBITED
ALTER fiscal_year UNIQUE / new uniqueness semantics         = PROHIBITED
EDIT L298 default_id backfill                               = PROHIBITED
EDIT L116–117 property_id ADD                               = PROHIBITED
EDIT L390–391 SET NOT NULL                                  = PROHIBITED
EDIT HMD-010 HOSCC L280–285                                 = PROHIBITED
RESTORE TARGET TO ORIGIN BLOB b8c2b851                      = PROHIBITED
EDIT HMD-009 reconstruction 20260405115900                  = PROHIBITED
WHOLE-FILE REPLACEMENT / CHECKOUT / GLOBAL NORMALIZE        = PROHIBITED
RESTORE 8c30eb2 comment / trailing-whitespace drift         = PROHIBITED
UNRELATED CLEANUP / REFORMAT / COMMENT CHURN                = PROHIBITED
QUARANTINE CHANGE                                           = PROHIBITED
BCR EDIT / RETARGET                                         = PROHIBITED
LOCAL-018                                                   = PROHIBITED IN THIS IA AND ITS IMPLEMENTATION TASK
RUNTIME / --apply / DATABASE / SUPABASE STATEFUL            = PROHIBITED
```

---

## 10. Clean-baseline boundary

```
DECLARED CLEAN BASELINE REPLAY BOUND = YES
ZERO PRE-TARGET mqt ROWS             = PROVEN (demo quarantined; no pre-target meetings seed)
OMISSION EQUIVALENT TO NO-OP         = YES on declared clean baseline
L298 COVERS NULL property_id         = YES before SET NOT NULL
```

This authority **does not** claim full multi-property aggregate semantics for `fiscal_year UNIQUE` + `property_id NOT NULL` beyond making SQL executable under declared clean replay. Broader fiscal_year/property design tension remains **out of scope** (PAD-060 §13.3).

For deployed environments with pre-existing tracker rows: preserved L298 assigns `default_id` to null `property_id` rows before SET NOT NULL — **not** a per-meeting property mapping.

---

## 11. Future implementation permissions

After this IA is issued, a **separate** implementation task **may**:

- re-verify blob `a37966fe60a9a7be1897e04b521d284a55185805` and L294–297 presence;
- remove **only** the authorized invalid UPDATE;
- prove HMD-011 attributable file count **1** and construct count **1** (removal only);
- run DB-free BCR `--plan` (require `PLAN_OK` · `failures = []`; record actual counts; **no `--apply`**);
- run `npm run build` (require **PASS**; no database);
- update README with implementation result;
- produce repository-static implementation evidence.

It **may not**: run database/Supabase/`--apply` · issue LOCAL-018 · retarget BCR · execute RU · issue HOSCC Completion-002 in the same breath unless a later task is explicitly scoped to Completion **after** consumption.

---

## 12. Future static certification (required for consumption)

```
AUTHORIZED MIGRATION FILE COUNT              = 1
ACTUAL ATTRIBUTABLE MIGRATION FILE COUNT     = 1
UNAUTHORIZED MIGRATION CHANGES               = NONE
INVALID mqt.meeting_id UPDATE (L294–297)     = ABSENT AFTER EDIT
REPLACEMENT SQL ADDED                        = NONE
L298 default_id backfill                     = PRESENT / SEMANTICALLY UNCHANGED
L116–117 property_id ADD                     = PRESENT / UNCHANGED
L390–391 SET NOT NULL                        = PRESENT / UNCHANGED
HMD-010 L280–285 HOSCC                       = PRESENT / UNCHANGED
fiscal_year UNIQUE                           = UNCHANGED (no new unique index)
ADD meeting_id                               = NONE
SOURCE RESTORATION                           = NONE
WHOLE-FILE REWRITE                           = NONE
HMD-009 FILE                                 = UNCHANGED
8c30eb2 COMMENT/WHITESPACE                   = UNTOUCHED
BCR --plan                                   = PLAN_OK / failures = []
npm run build                                = PASS
RUNTIME                                      = NONE
```

If any fail: **IA = NOT CONSUMED** · **IMPLEMENTATION = NOT CERTIFIED** · **STOP → GOVERNANCE**.

---

## 13. Consumption rule

`E-02-HOSCC-IA-002` becomes **CONSUMED** only when the future repository implementation satisfies §12.

Consumption does **not** imply: runtime replay verified · database baseline verified · DBA issuance · BCR retarget · HMD closure · RU authorization · EIR · Acceptance · Certification.

After consumption, HMD-011 remains **IMPLEMENTATION COMPLETED / IMPLEMENTATION COMPLETION PENDING / RUNTIME REPLAY VERIFICATION PENDING** until separate **E-02-HOSCC-IMPLEMENTATION-COMPLETION-002** is issued.

---

## 14. Locks

```
GLOBAL QUARANTINE     = exactly 20260314195641_add_demo_data.sql / COUNT 1
TARGET QUARANTINE     = NOT AUTHORIZED
HMD-009               = OPEN / RECONSTRUCTION APPLIED / TARGET NOT APPLIED / RUNTIME PENDING
HMD-010               = OPEN / HOSCC IMPLEMENTED / TARGET NOT APPLIED / RUNTIME PENDING
                      / LOCAL-017 mv.meeting_id NOT REPRODUCED
HMD-003               = OPEN / RUNTIME PENDING
W2 / APRIL / JULY S1  = NOT REACHED / NOT APPLIED
HMD-005–008           = OPEN / RUNTIME REPLAY VERIFIED
DATABASE BASELINE     = NOT VERIFIED
RU-1.4                = NOT AUTHORIZED
EIR / ACCEPTANCE      = BLOCKED / NOT ISSUED
```

---

## 15. Exact next action

```
NEXT = HMD-011 HOSCC IMPLEMENTATION
       (consume E-02-HOSCC-IA-002 · PAD-060 §13.1 · omit L294–297 only)
       then separate E-02-HOSCC-IMPLEMENTATION-COMPLETION-002
```

**Do not implement** the omission in this IA issuance.

---

**End of document — E-02-HOSCC-IA-002 · HMD-011 · v1.0 — 2026-08-31**
