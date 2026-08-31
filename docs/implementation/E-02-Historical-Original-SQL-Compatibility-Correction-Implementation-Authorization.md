# E-02 — Historical Original-SQL Compatibility Correction — Implementation Authorization

## HMD-010 Narrow Original-Historical-SQL Compatibility Correction · `public.meeting_votes` / `mv.meeting_id`

| Field | Value |
|-------|-------|
| **Document Type** | **Implementation Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-HOSCC-IA** |
| **Family** | **Historical Original-SQL Compatibility Correction (HOSCC)** |
| **Substantive controlling Program Authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-008.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-008.md) (**PAD-058** · HMIC-085 – HMIC-096) |
| **Implementation-governance family authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-009.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-009.md) (**PAD-059** · HMIC-097 – HMIC-108) |
| **Forensic record** | [`E-02-HMD-010-Multi-Tenant-Properties-Meeting-Votes-Meeting-Id-Forensic-Investigation.md`](E-02-HMD-010-Multi-Tenant-Properties-Meeting-Votes-Meeting-Id-Forensic-Investigation.md) |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-016.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-016.md) · run `local-016-20260830a` |
| **Defect** | **HMD-010** |
| **Status** | **Approved With Conditions — NOT YET CONSUMED** |
| **Authority Level** | Implementation Authorization (repository original-historical-SQL compatibility correction only) |
| **Effective Date** | 2026-08-30 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Authorization.md`](E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Authorization.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **Future repository-only Option C correction · NOT this issuance** |
| **Successor Completion (not created)** | `docs/implementation/E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Completion.md` (**E-02-HOSCC-IMPLEMENTATION-COMPLETION** · reserved · **not issued**) |

> **Authority path finding: YES.** Filename `E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Authorization.md` is **authority-safe** as the **unnumbered first member** of the PAD-059 **HOSCC** Implementation Authorization family. ID **`E-02-HOSCC-IA`**. **`E-02-HOSCC-IA-001` must not exist and is not created.** No HOSCC IA existed before this issuance. `E-02-HOSCC-IA` was **reserved by PAD-059 only** and had **not previously been issued or consumed**. No **`E-02-HOSCC-IA-002+`** exists or supersedes the sequence. Distinct filename keeps HMIR, HFSOR, BCR, DBA, and RU IAs **immutable**. This is **not** a new Program Authority tier, **not** a new PAD, **not** an amendment of PAD-058 or PAD-059, **not** a DBA, **not** a BCR IA, **not** a HMIR restoration IA, **not** an HFSOR reconstruction IA, **not** a Completion, **not** LOCAL-017.
>
> **Family determination / sequence proof (this issuance, independently verified):** PAD-059 established family **Historical Original-SQL Compatibility Correction (HOSCC)** · first IA ID **`E-02-HOSCC-IA`** · first path **this file** · numbering **UNNUMBERED FIRST THEN `-002` / `-003` / … · NO `-001`**. Repository search: no prior HOSCC IA file · no `E-02-HOSCC-IA-001` · no `E-02-HOSCC-IA-002+`. HMIR / HFSOR remain **not this family**.
>
> **Document class:** Bounded **repository narrow original-historical-SQL compatibility correction** authorization only. This record **does not** edit the target · **does not** write SQL · **does not** add `meeting_id` · **does not** create reconstruction · **does not** restore `8c30eb2` comments · **does not** apply migrations · **does not** run BCR `--apply` · **does not** issue LOCAL-017 · **does not** issue HOSCC Completion · **does not** authorize RU-1.4.

```
HISTORICAL ORIGINAL-SQL COMPATIBILITY CORRECTION IA = E-02-HOSCC-IA
DECISION                                            = APPROVED WITH CONDITIONS / NOT YET CONSUMED
FIRST MEMBER                                        = UNNUMBERED
E-02-HOSCC-IA-001                                   = MUST NOT EXIST / DOES NOT EXIST
PAD-058                                             = SUBSTANTIVE CONTROLLING AUTHORITY /
                                                      ISSUED / IMMUTABLE / OPTION C
PAD-059                                             = HOSCC FAMILY AUTHORITY /
                                                      ISSUED / IMMUTABLE /
                                                      DOES NOT AUTHORIZE IMPLEMENTATION BY ITSELF
SELECTED POLICY                                     = OPTION C —
                                                      NARROW ORIGINAL-HISTORICAL-SQL
                                                      COMPATIBILITY CORRECTION
HMD-010                                             = OPEN / DISTINCT /
                                                      ORIGINAL HISTORICAL SQL /
                                                      SCHEMA-ASSUMPTION DEFECT /
                                                      ORIGINAL CLEAN-REPLAY WRONG-COLUMN
                                                      ASSUMPTION ON EXISTING TABLE /
                                                      OPTION C SELECTED /
                                                      IMPLEMENTATION AUTHORIZED /
                                                      NOT YET IMPLEMENTED
TARGET                                              = supabase/migrations/
                                                      20260405120000_multi_tenant_properties.sql
CURRENT BLOB                                        = 4bc119833071125695eb393844d7e8335e952154
ORIGIN COMMIT                                       = fb0094239d74cc4466853cc1cfcb906164d0fb89
ORIGIN BLOB                                         = b8c2b851d41d2218e90acba38403288cec5e28c9
GOVERNED STATEMENT                                  = L280–283 UPDATE public.meeting_votes mv
                                                      inside DO $c$ (starts L74)
FAILING REFERENCE                                   = mv.meeting_id
AUTHORIZED FILE COUNT                               = EXACTLY 1
AUTHORIZED STATEMENT COUNT                          = EXACTLY 1
CORRECTION EXECUTED                                 = NO
ADD meeting_id                                      = PROHIBITED
NAIVE mv.meeting_id → mv.agenda_item_id             = PROHIBITED
L284                                                = OUT OF SCOPE / NOT AUTHORIZED
SOURCE RESTORATION                                  = PROHIBITED
WHOLE-FILE REPLACEMENT                              = PROHIBITED
HMD-009                                             = LOCKED / UNCHANGED
LOCAL-016                                           = APPLICATION_FAILED /
                                                      NOT SUCCESSFULLY CONSUMED /
                                                      EVIDENCE IMMUTABLE
LOCAL-016 ATTEMPTS                                  = 1
LOCAL-016 RETRY                                     = NOT AUTHORIZED
LOCAL-017                                           = NOT ISSUED
BCR EDIT                                            = NOT AUTHORIZED
BCR DBA PIN (read-only)                             = E-02-DBA-LOCAL-016
BCR ARTIFACT AUTHORITY (read-only)                  = E-02-BCR-IA-016
THIS IA                                             ≠ DBA · ≠ BCR IA · ≠ PAD · ≠ REA · ≠ COMPLETION
HOSCC COMPLETION                                    = REQUIRED AFTER IMPLEMENTATION / NOT ISSUED
```

---

## 1. Pre-issuance gates

| ID | Check | Result |
|----|--------|--------|
| A. PAD-058 | Decision-008 · PAD-058 · HMIC-085 – HMIC-096 · Option C **ISSUED / IMMUTABLE** | **PASS** |
| B. PAD-059 | Decision-009 · PAD-059 · HMIC-097 – HMIC-108 · HOSCC family **ESTABLISHED** · does **not** amend PAD-058 | **PASS** |
| C. HOSCC sequence | First ID **`E-02-HOSCC-IA`** reserved · this file **absent** · **no `-001`** · **no `-002+`** | **PASS** |
| D. HMD-010 | Option C selected · implementation not yet authorized · no SQL written | **PASS** |
| E. Target identity | Worktree blob **`4bc119833071125695eb393844d7e8335e952154`** = HEAD blob = PAD-058 current blob · L280–283 still `WHERE mv.meeting_id = m.id` | **PASS** |
| F. Topology | PAD-058 join path independently still the governed bind | **PASS** |
| G. Exact fragment | PAD-058 §13.1 supplies current SQL + canonical corrected construct | **PASS** |

**STOP does not apply.** This IA may issue.

---

## 2. Authorization basis

| Record | Role |
|--------|------|
| PAD-058 | **Substantive** Option C policy · exact §13.1 bind · **inherited without modification** |
| PAD-059 | **Family** HOSCC · first ID/path/numbering · **does not** authorize SQL |
| HMD-010 forensic | Classification · failing construct · origin hashes |
| LOCAL-016 evidence | Immutable `APPLICATION_FAILED` · run `local-016-20260830a` |
| Target (this issuance, read-only) | blob `4bc119833071125695eb393844d7e8335e952154` · L280–283 as below |

**This IA consumes PAD-058 (substantive) and PAD-059 (family) for implementation authorization only.** Correction is **not performed** in this issuance.

---

## 3. Authorization decision

| Field | Value |
|-------|--------|
| **Authorization ID** | **E-02-HOSCC-IA** |
| **Decision** | **APPROVED WITH CONDITIONS / NOT YET CONSUMED** |
| **Authorized future action** | Replace **exactly** the L280–283 `UPDATE public.meeting_votes mv` so meeting `property_id` is obtained through the proven `meeting_agenda_items` path |
| **Not authorized** | Source restoration · reconstruction · `ADD meeting_id` · naive column swap · L284 edit · whole-file rewrite · BCR retarget · LOCAL-017 · runtime |
| **Execution this task** | **NOT PERFORMED** |

---

## 4. Target identity (pre-implementation lock)

```
PATH            = supabase/migrations/20260405120000_multi_tenant_properties.sql
CURRENT BLOB    = 4bc119833071125695eb393844d7e8335e952154
HEAD BLOB       = 4bc119833071125695eb393844d7e8335e952154
PAD-058 BLOB    = 4bc119833071125695eb393844d7e8335e952154
ORIGIN COMMIT   = fb0094239d74cc4466853cc1cfcb906164d0fb89
ORIGIN BLOB     = b8c2b851d41d2218e90acba38403288cec5e28c9
CURRENT vs ORIGIN NON-CAUSAL = 8c30eb2 comment/trailing blanks · OUT OF SCOPE
HMD-009 ATTRIBUTABLE CHANGE IN THIS FILE = NONE
  (HMD-009 reconstruction is 20260405115900 · different file)
UNEXPLAINED TARGET DRIFT = NONE
```

Future implementation **must** re-verify this blob and the L280–283 fragment **immediately before edit**. If blob or governed statement differs materially:

```
IMPLEMENTATION = BLOCKED
IA             = NOT CONSUMED
               STOP → GOVERNANCE
```

---

## 5. Exact governed historical SQL

**Container:** anonymous `DO $c$` beginning **L74**.

**Governed object:** unguarded DML `UPDATE public.meeting_votes mv` at **L280–283**.

**Alias `mv`:** TABLE alias bound to historical `public.meeting_votes` (pre-`20260409190000` legacy table).

**Current fragment (authoritative pre-state):**

```
L280  UPDATE public.meeting_votes mv
L281  SET property_id = m.property_id
L282  FROM public.meetings m
L283  WHERE mv.meeting_id = m.id AND mv.property_id IS NULL;
```

**Failing reference:** `mv.meeting_id` at L283.

**Out of scope (must remain byte-identical except as implied by replacing only L280–283):**

```
L284  UPDATE public.meeting_votes SET property_id = default_id WHERE property_id IS NULL;
```

L108–110 (`ADD COLUMN IF NOT EXISTS property_id`) · HMD-009 hiring statements · all other statements in this file · **PROHIBITED**.

---

## 6. Historical topology (authoritative)

```
meeting_votes.agenda_item_id
  → meeting_agenda_items.id
  → meeting_agenda_items.meeting_id
  → meetings.id
```

```
meeting_votes.meeting_id     = NOT PROVEN / ABSENT PRE-TARGET
ADD meeting_votes.meeting_id = PROHIBITED
```

First later `meeting_id` on a **replacement** `public.meeting_votes` is `20260409190000` after rename to `meeting_votes_legacy`. That later object is **not** the index-74 bound table and is **not** origin proof.

---

## 7. Authorized future correction (inherits PAD-058 §13.1 without modification)

| Item | Bind |
|------|------|
| File count | **EXACTLY 1** |
| File | `supabase/migrations/20260405120000_multi_tenant_properties.sql` |
| Statement count | **EXACTLY 1** |
| Statement | L280–283 `UPDATE public.meeting_votes mv` only |
| SET | **`property_id = m.property_id`** — **PRESERVE** |
| NULL filter | **`mv.property_id IS NULL`** — **PRESERVE** |
| Intermediate relation | **`public.meeting_agenda_items`** alias **`mai`** — **REQUIRED** |
| Join bindings | **`mv.agenda_item_id = mai.id` AND `mai.meeting_id = m.id`** |
| Meetings alias | **`m`** = `public.meetings` |

**Canonical authorized future construct** (PAD-058 §13.1 comma-`FROM` style):

```
UPDATE public.meeting_votes mv
SET property_id = m.property_id
FROM public.meeting_agenda_items mai, public.meetings m
WHERE mv.agenda_item_id = mai.id
  AND mai.meeting_id = m.id
  AND mv.property_id IS NULL;
```

Equivalent explicit `JOIN` spelling is permitted **only** if every binding above is identical (same tables, aliases, SET, and predicates). Example of a permitted equivalent **if and only if** those bindings hold:

```
UPDATE public.meeting_votes mv
SET property_id = m.property_id
FROM public.meeting_agenda_items mai
JOIN public.meetings m ON m.id = mai.meeting_id
WHERE mv.agenda_item_id = mai.id
  AND mv.property_id IS NULL;
```

Whitespace/indentation inside this **one** statement may follow surrounding `DO $c$` style. That is **not** license to reformat the rest of the file.

**Logical topology the implementation must realize:**

```
meeting_votes mv
  → meeting_agenda_items mai  ON mai.id = mv.agenda_item_id
  → meetings m                ON m.id = mai.meeting_id
```

Implementation evidence **must** show exact before/after of this statement.

---

## 8. Prohibited acts

```
NAIVE mv.meeting_id → mv.agenda_item_id                 = PROHIBITED
mv.agenda_item_id = m.id                                = PROHIBITED
ALTER TABLE … ADD meeting_id / any equivalent           = PROHIBITED
RECONSTRUCTION MIGRATION                                = PROHIBITED
EDIT L284                                               = PROHIBITED
EDIT L108–110                                           = PROHIBITED
EDIT HMD-009 reconstruction 20260405115900              = PROHIBITED
EDIT hiring_jobs / hiring_candidates statements         = PROHIBITED
WHOLE-FILE REPLACEMENT / CHECKOUT / GLOBAL NORMALIZE    = PROHIBITED
RESTORE 8c30eb2 comment / trailing-whitespace drift     = PROHIBITED
UNRELATED CLEANUP / REFORMAT / COMMENT CHURN            = PROHIBITED
BACKPORT 20260409 replacement-table semantics           = PROHIBITED
QUARANTINE CHANGE                                       = PROHIBITED
BCR EDIT / RETARGET                                     = PROHIBITED
LOCAL-017                                               = PROHIBITED IN THIS IA AND ITS IMPLEMENTATION TASK
RUNTIME / --apply / DATABASE / SUPABASE STATEFUL        = PROHIBITED
```

---

## 9. Future implementation permissions

After this IA is issued, a **separate** implementation task **may**:

- re-verify blob `4bc119833071125695eb393844d7e8335e952154` and L280–283;
- apply **only** the authorized Option C correction;
- prove HMD-010 attributable file count **1** and statement count **1**;
- run DB-free BCR `--plan` (require `PLAN_OK` · `failures = []`; record actual counts; **no `--apply`**);
- run `npm run build` (require **PASS**; no database);
- update README with implementation result;
- produce repository-static implementation evidence.

It **may not**: run database/Supabase/`--apply` · issue LOCAL-017 · retarget BCR · execute RU · issue HOSCC Completion in the same breath unless a later task is explicitly scoped to Completion **after** consumption.

---

## 10. Future static certification (required for consumption)

```
AUTHORIZED MIGRATION FILE COUNT              = 1
ACTUAL ATTRIBUTABLE MIGRATION FILE COUNT     = 1
UNAUTHORIZED MIGRATION CHANGES               = NONE
MEETING_VOTES.MEETING_ID DEPENDENCY          = REMOVED FROM GOVERNED STATEMENT
MEETING_AGENDA_ITEMS INTERMEDIATE JOIN       = PRESENT
SET property_id = m.property_id              = PRESERVED
mv.property_id IS NULL                       = PRESERVED
ADD meeting_id                               = NONE
L284                                         = UNCHANGED
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

## 11. Consumption rule

`E-02-HOSCC-IA` becomes **CONSUMED** only when the future repository implementation satisfies §10.

Consumption does **not** imply: runtime replay verified · database baseline verified · DBA issuance · BCR retarget · HMD closure · RU authorization · EIR · Acceptance · Certification.

---

## 12. Completion separation

After successful implementation and IA consumption, require separate:

```
E-02-HOSCC-IMPLEMENTATION-COMPLETION
PATH = docs/implementation/E-02-Historical-Original-SQL-Compatibility-Correction-Implementation-Completion.md
FIRST MEMBER = UNNUMBERED
```

**Not issued here.** Completion certifies repository implementation only. It does **not** authorize runtime.

---

## 13. Distinctness / runtime / BCR / quarantine locks

| Lock | State |
|------|--------|
| **HMD-009** | **OPEN / OPTION B / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |
| **HMD-008 / 007 / 006** | **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** |
| **HMD-005** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** |
| **HMD-003** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |
| W2 / April HARD / July S1 | **NOT REACHED / NOT APPLIED** |
| Quarantine | exactly `20260314195641_add_demo_data.sql` · **COUNT 1** |
| BCR | pin **E-02-DBA-LOCAL-016** / **E-02-BCR-IA-016** · **EDIT NO** |
| LOCAL-016 | **APPLICATION_FAILED / EVIDENCE IMMUTABLE** · attempts **1** · retry **NOT AUTHORIZED** |
| LOCAL-017 | **NOT ISSUED** |
| RU-1.1 / 1.2 | repository implemented · DB not applied · RU-1.2 runtime not verified |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| Baseline / EIR / Acceptance / Certification | **NOT VERIFIED / NONE / BLOCKED / NOT ISSUED** |

---

## 14. Exact next action

```
NEXT = HMD-010 HOSCC IMPLEMENTATION
       (consume E-02-HOSCC-IA · PAD-058 §13.1 · this IA §7)
```

Do **not** issue LOCAL-017. Do **not** issue HOSCC Completion until implementation succeeds and this IA is consumed.

---

## 15. Confirmation of no executable work

This issuance performed **no**: migration edit · reconstruction · source restoration · BCR edit · database/Supabase/Docker · `--apply` · LOCAL-016 retry · LOCAL-017 · HOSCC Completion · commit.

---

**End of document — E-02-HOSCC-IA · HMD-010 · v1.0 — 2026-08-30**
