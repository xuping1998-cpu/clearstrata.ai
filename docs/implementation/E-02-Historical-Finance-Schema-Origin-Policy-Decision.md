# E-02 Program Authority Decision — Historical Finance Schema-Origin Policy

| Field | Value |
|-------|-------|
| **Document Type** | **Program Authority Decision (Supplement)** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Parent Authority** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) v1.0 (PAD-001 – PAD-010) |
| **Direct Predecessor Supplement** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) (PAD-039 – PAD-050 · HMIC-001 – HMIC-012 · HMD-002) |
| **Prior Predecessor Supplements** | [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038 · HMD-001) |
| **Supplement ID** | **PAD-051** |
| **Authority Question Register** | **HFSO-001 – HFSO-012** |
| **Status** | **APPROVED WITH CONDITIONS — OPTION B** |
| **Selected Policy** | **HISTORICAL SCHEMA-ORIGIN RECONSTRUCTION** |
| **Defect** | **HMD-003** |
| **Authority Level** | Program Authority |
| **Effective Date** | 2026-08-25 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **NO** |

> **Authority path finding:** Filename `E-02-Historical-Finance-Schema-Origin-Policy-Decision.md` is **authority-safe** as a **Program Authority Decision supplement** continuing **PAD-051** under the existing [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) document class. It follows the established supplement sequence:
>
> - Parent PAD — `PAD-001` – `PAD-010`
> - DAA supplement — `PAD-011` – `PAD-025`
> - HMBC supplement — `PAD-026` – `PAD-038`
> - HMIC supplement — `PAD-039` – `PAD-050`
> - **This supplement — `PAD-051`**
>
> Highest previously allocated PAD is **PAD-050**. PAD-051 is the next unused identifier in the **E-02 PAD sequence**. PAD identifiers are **not** CS/FD registry numbers. This is **not** a new governance tier. Operational reconstruction remains a separate **Implementation Authorization**. Operational replay remains a separate **Database Application Authorization**. Neither is issued here. **PAD-052+ is not allocated.**

> **Scope lock:** Establishes **Historical Schema-Origin Reconstruction** policy for **one** bounded historical finance schema-origin defect family (HMD-003). This record **does not** write SQL · **does not** create or edit migrations · **does not** expand quarantine · **does not** modify the BCR artifact · **does not** issue LOCAL-009 · **does not** run database/Supabase/Docker · **does not** authorize RU-1.4 · **does not** reclassify EIR / Acceptance / Certification.

```
HISTORICAL FINANCE SCHEMA-ORIGIN POLICY              = ESTABLISHED (THIS SUPPLEMENT)
DECISION                                             = APPROVED WITH CONDITIONS — OPTION B
SELECTED POLICY                                      = HISTORICAL SCHEMA-ORIGIN RECONSTRUCTION
HISTORICAL RECONSTRUCTION ≠ SOURCE RESTORATION       = LOCKED
OPTION A (SOURCE RESTORATION)                        = NOT AVAILABLE / NOT APPLICABLE
OPTION C (FORWARD-FIX / CHRONOLOGY-BRIDGE)           = REJECTED — CHRONOLOGY-INCAPABLE
OPTION D (QUARANTINE / SKIP)                         = NOT AUTHORIZED
OPTION E (FAKE HISTORY / REPAIR-AS-APPLIED)          = REJECTED
DEFECT FAMILY                                        = ONE BOUNDED FAMILY
HMD-003                                              = OPEN / POLICY SELECTED / IMPLEMENTATION NOT AUTHORIZED
HMD-001                                              = OPEN / DISTINCT
HMD-002                                              = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT
PUBLIC.INVOICES                                      = CONFIRMED_MISSING_ORIGIN
INVOICE_STATUS                                       = CONFIRMED_MISSING_ORIGIN
FINANCIAL_ANOMALIES                                  = CONFIRMED_MISSING_ORIGIN
INVOICE_AI_AUDITS                                    = ORIGIN_AFTER_FIRST_HARD_DEPENDENCY (IN FAMILY)
EXISTING QUARANTINE                                  = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINE COUNT                                     = 1
20260320045054                                       = DO NOT EDIT
HMD-002 RESTORED FILE                                = DO NOT EDIT
LOCAL-008                                            = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-009                                            = NOT AUTHORIZED
RECONSTRUCTION EXECUTED                              = NO (POLICY ONLY)
THIS PAD                                             ≠ IMPLEMENTATION AUTHORIZATION
THIS PAD                                             ≠ DATABASE APPLICATION AUTHORIZATION
THIS PAD                                             ≠ PRODUCTION DEPLOYMENT AUTHORIZATION
```

---

## 1. Authority / provenance

| Record | Role |
|--------|------|
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) | Parent — PAD-001 – PAD-010 · PAD-007 remediation loop · PAD-008 historical records |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011 – PAD-025 · DAA mechanism · PAD-012 document class · PAD-013 granularity · PAD-018 start · PAD-023 failure policy |
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | PAD-026 – PAD-038 · DATA_ONLY quarantine · HMD register (PAD-032) · PAD-027 / PAD-029 |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) | PAD-039 – PAD-050 · Option A source restoration · HMD-002 (PAD-045) · PAD-041 second exception NO · PAD-044 later forward migration cannot bypass earlier HARD fail |
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md) · Completion | HMD-002 IA consumed · source restored · runtime pending |
| [`E-02-Database-Application-Authorization-LOCAL-008.md`](E-02-Database-Application-Authorization-LOCAL-008.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-008.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-008.md) | LOCAL-008 **APPLICATION_FAILED** · evidence **immutable** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-008.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-008.md) | Artifact pin LOCAL-008 statically verified; runtime not a pass |
| Prior governance STOP (README, 2026-08-25) | B/C policy-open; PAD-051 **not** issued until separately authorized |
| Completed read-only finance schema-origin forensics | Consumed as **immutable fact**; not reopened |

This supplement **is** the separately authorized Program Authority contemplated by that STOP. It does **not** rewrite PAD-008, PAD-027, PAD-029, PAD-039–050, or prior DBA/BCR locks. Those locks remain historically correct for the tasks in which they applied.

### 1.1 Pre-gate (HFSO-001)

| Question | Finding |
|----------|---------|
| Highest allocated PAD | **PAD-050** (HMIC supplement) |
| Parent permit successor PAD? | **YES** — PAD-007 remediation loop; established supplement sequence (DAA → HMBC → HMIC); PAD-032 HMD register; PAD-045 allocation precedent |
| PAD-051 continuation vs new tier? | **A — continuation/supplement of existing E-02 Program Authority** |
| Forensic inventory complete enough? | **YES** — bounded; sufficient to choose B vs C |
| Inventory alone automatic PAD? | **NO** — this record is the separate authorization |

**MANDATORY STOP does not apply.** Authority supports issuance of PAD-051.

---

## 2. Triggering defect

LOCAL-008 governed replay failed at:

```
supabase/migrations/20260320045054_enhance_dispute_resolution_system.sql
ALTER TABLE disputes ADD COLUMN related_invoice_id uuid REFERENCES invoices(id);
DATABASE ERROR = relation "invoices" does not exist
```

This is **not** HMD-001 (`20260314195641_add_demo_data.sql` · DATA_ONLY · demo FK / external-state).  
This is **not** HMD-002 (`20260315035847_add_meeting_templates_and_attachments.sql` · parser literals · Option A restoration).  
The three defects **must not be collapsed**.

Completed forensics established a **bounded finance-origin set**, not a single missing FK.

---

## 3. Locked forensic fact set (HFSO-002)

Treat the completed read-only forensics as **immutable evidence**. This PAD does not weaken, expand by guesswork, or silently rewrite:

| ID | Fact |
|----|------|
| C1 | `public.invoices` = **CONFIRMED_MISSING_ORIGIN** |
| C2 | `invoice_status` = **CONFIRMED_MISSING_ORIGIN** (PostgreSQL ENUM kind **PROVABLE**) |
| C3 | `public.financial_anomalies` = **CONFIRMED_MISSING_ORIGIN** |
| C4 | `public.invoice_ai_audits` = **ORIGIN_AFTER_FIRST_HARD_DEPENDENCY** |
| C5 | CONFIRMED_MISSING_ORIGIN count = **3** |
| C6 | ORIGIN_AFTER_FIRST_HARD_DEPENDENCY count = **1** |
| C7 | Historical hosted-schema hypothesis = **STRONGLY SUPPORTED** |
| C8 | Exact historical `CREATE TABLE public.invoices` SQL = **NOT RECOVERABLE** |
| C9 | Exact historical `CREATE TYPE invoice_status` SQL = **NOT RECOVERABLE** |
| C10 | `invoice_status` object kind = PostgreSQL ENUM = **PROVABLE** |
| C11 | `invoice_status` initial label set = **NOT PROVABLE** |
| C12 | `public.invoices` historical shape = **PARTIALLY PROVABLE** |
| C13 | First deterministic missing-origin HARD = `20260320045054` `REFERENCES invoices(id)` |
| C14 | At Frontier 1, existence + `id` are the **minimum proven** requirements — **not** automatically an acceptable repair shape |
| C15 | Immediate downstream HARD shape includes `invoices.uploaded_by`, `invoices.procurement_job_id`, `invoice_status`, `financial_anomalies` |
| C16 | `invoice_ai_audits` origin exists (`20260711120000`) **after** first HARD (`20260409120000`) |
| C17 | `finance_bills` = distinct owner-billing concept · **VALID_ORIGIN** |
| C18 | `procurement_invoices` = distinct procurement child · **VALID_ORIGIN** |
| C19 | Neither may substitute for `public.invoices` |
| C20 | Skipping only `20260320045054` is technically insufficient |
| C21 | Quarantine = exactly `20260314195641_add_demo_data.sql` · **COUNT = 1** |
| C22 | HMD-001 = **OPEN / DISTINCT** |
| C23 | HMD-002 = **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT** |
| C24–C26 | LOCAL-008 **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** · retry **NOT AUTHORIZED** · LOCAL-009 **NOT AUTHORIZED** |
| C27–C28 | Database baseline **NOT VERIFIED** · RU-1.4 **RUNTIME NOT AUTHORIZED** |

---

## 4. Defect-family determination (HFSO-003)

**RESOLVED: ONE BOUNDED DEFECT FAMILY.**

The four findings are manifestations of the same historical condition:

> Finance schema primitives existed in the historical hosted/dev environment, but their complete origin chronology was not represented in repository migrations.

| Criterion | Evaluation |
|-----------|------------|
| Common provenance | Same hosted-schema / ALTER-only finance graph; initial commit `bc48068` already assumed `public.invoices` |
| Chronology | One replay chain; failures are sequential manifestations of the same missing origin set |
| Dependency graph | `invoices` → enum/policies/FKs → `financial_anomalies` → `invoice_ai_audits` trigger |
| Repair atomicity | Repairing only Frontier 1 recreates known later HARD fails already inventoried |
| Replay consequences | Separating IDs would manufacture artificial sequential LOCAL failures |
| Different policy? | All four need **pre-HARD existence in timestamp order**. `invoice_ai_audits` is a late `CREATE IF NOT EXISTS` catch-up of the same class, not a distinct policy object |

`invoice_ai_audits` remains classified **ORIGIN_AFTER_FIRST_HARD_DEPENDENCY** (not CONFIRMED_MISSING). It is **in the family** because leaving it out would intentionally create the next known fail after the three missing origins were supplied.

**HMD-004+ is not allocated.** One ID covers the bounded family.

---

## 5. HMD-003 (HFSO-004)

Allocated from the **HMD register** established by PAD-032, as the next identifier after HMD-002 (PAD-045 precedent). **Not** a new governance tier.

| Field | Value |
|-------|-------|
| **Defect ID** | **HMD-003** |
| **Classification** | **HISTORICAL FINANCE SCHEMA-ORIGIN DEFECT** / **MISSING HISTORICAL SCHEMA-ORIGIN MIGRATION** + **HISTORICAL CLEAN-REPLAY INCOMPATIBILITY** (includes one in-family origin-after-HARD ordering defect) |
| **Bounded objects** | `public.invoices` · `invoice_status` · `public.financial_anomalies` · `public.invoice_ai_audits` (ordering) |
| **Attribution** | **NOT RU-1.1 · NOT RU-1.2 · NOT RU-1.3 · NOT RU-1.4 · NOT HMD-001 · NOT HMD-002** |
| **Status** | **OPEN / POLICY SELECTED / IMPLEMENTATION NOT AUTHORIZED** |
| **Must not replace** | HMD-001 · HMD-002 |

HMD-003 is **not CLOSED** by this PAD. Policy selection is not reconstruction.

---

## 6. Rejected options (HFSO-005)

Preserved unless contradicted. **Not contradicted.**

### OPTION A — SOURCE RESTORATION

**NOT AVAILABLE / NOT APPLICABLE.**

PAD-039–050 Option A requires exact recoverable historical source. Git pickaxe found **no** `CREATE TABLE invoices` / `CREATE TYPE invoice_status` / `CREATE TABLE financial_anomalies`. Exact CREATE SQL is **UNRECOVERABLE**. This PAD does **not** claim source restoration.

```
HISTORICAL RECONSTRUCTION ≠ HISTORICAL SOURCE RESTORATION
```

### OPTION D — QUARANTINE / SKIP

**NOT AUTHORIZED** and **technically insufficient.**

PAD-027 / PAD-041 remain in force. Quarantine remains **exactly** `20260314195641_add_demo_data.sql` · **COUNT = 1**. Skipping `20260320045054` does not restore deterministic replay (later HARD `invoices` / enum / anomalies / AI-audit dependencies).

### OPTION E — FAKE HISTORY / REPAIR-AS-APPLIED / SYNTHETIC HISTORY

**REJECTED** (PAD-029 HMBC-008/009/010).

Do **not**: fake applied history; insert migration versions as applied without executing truthful SQL; use `migration repair`; hide/rename/move historical files; substitute a snapshot for replay.

### Immutable historical files

| File | Rule |
|------|------|
| `20260320045054_enhance_dispute_resolution_system.sql` | **DO NOT EDIT** — historically faithful; changing the FK would be rewrite, not restore |
| `20260315035847_add_meeting_templates_and_attachments.sql` | **DO NOT EDIT** — HMD-002 restored source **immutable for this defect** |
| `20260711120000_invoice_ai_audit_v1.sql` | **DO NOT EDIT** — later origin remains; reconstruction must not pretend this file ran in April |

---

## 7. Policy choice — B vs C (HFSO-006)

**RESOLVED: OPTION B — HISTORICAL SCHEMA-ORIGIN RECONSTRUCTION.**

### 7.1 Option C — FORWARD-FIX / CHRONOLOGY-BRIDGE — REJECTED

E-02 declared baseline replay executes **non-quarantined timestamped migrations in timestamp order** (PAD-028 / PAD-035). The first HARD dependency is:

```
20260320045054_enhance_dispute_resolution_system.sql
```

A **later-timestamped** forward migration (any version `> 20260320045054`) **cannot** make clean chronological replay reach that file with `public.invoices` already present.

C would require one or more of:

| Mechanism | Status |
|-----------|--------|
| Edit `20260320045054` | **FORBIDDEN** |
| Insert a migration **before** the failure frontier | That is **reconstruction placement**, not a forward-fix |
| Special replay bootstrap / out-of-order apply | **Not authorized**; adjacent to fake history |
| Mark unexecuted SQL as applied | **REJECTED** (PAD-029) |

PAD-044 already recorded that a later forward migration **cannot** by itself bypass an earlier HARD failure. That finding applies here.

**C is technically incapable of satisfying the E-02 clean-replay objective under current replay ordering.** It is not rejected for being “less historical”; it is rejected because it **cannot precede the first HARD dependency truthfully**.

### 7.2 Option B — HISTORICAL RECONSTRUCTION — SELECTED

**Definition:** Create a narrowly governed reconstruction of the missing historical finance schema origin **at the historically necessary point in replay** (before each primitive’s first HARD dependency), using **only** the minimum historically supportable schema derived from the forensic evidence.

B **may not** claim to reproduce exact lost SQL.  
B **must** label reconstructed SQL as reconstruction.  
B **must not** copy current production schema backward.  
B **must** distinguish **PROVEN / STRONGLY SUPPORTED / PARTIALLY PROVABLE / UNPROVABLE** (implementation evidence tags: **PROVEN / INFERRED WITH EVIDENCE / UNRESOLVED**).

B satisfies chronology because reconstructed origin SQL is **new timestamped migration content that executes before the first HARD dependency**, without editing existing historical files and without fabricating applied history. That is truthful **addition of missing origin chronology**, not rewrite of existing chronology.

---

## 8. Reconstruction truthfulness boundary (HFSO-007)

Policy only. **No SQL in this PAD.**

### 8.1 Evidence-only reconstruction

Future reconstruction **must** be based on the locked forensic fact set and successor evidence-tagged design. No production/current schema may be copied backward as the historical origin.

### 8.2 Do not back-project later ADD COLUMN

Unless **separate earlier evidence** proves historical necessity **at the reconstruction frontier**, these **must not** be placed in the origin merely for convenience:

`category` · `file_name` · `hst_number` · `verified_by` · `verified_at` · `paid_at` · `paid_by` · `review_notes` · `updated_at` · `property_id` · `approved` · `related_task_id` · `quote_id` · `approval_note` · `budget_category_id` · `budget_anomaly_flag` · `fiscal_year` · `is_abnormal` · `audit_summary` · `accounting_year` · `accounting_month`

Later migrations already `ADD COLUMN IF NOT EXISTS` these. Reconstruction must not duplicate that evolution as if it were March 2026 origin.

### 8.3 Do not invent UNPROVABLE properties

Silent invention is **forbidden** for:

- exact nullability, defaults, indexes, RLS
- exact original constraints
- `invoice_status` **initial** label set
- `is_over_budget`
- `amount` vs `total_amount` (non-timestamped `dashboard_functions_fix.sql` conflicts with timestamped `total_amount`; **out of replay chain**)
- questionable labels (`pending`, `pending_upload` as proven DB enum values)

An id-only `invoices` table is **not** automatically an acceptable repair: Frontier 2 HARD consumers require additional **historically pre-existing** shape (`uploaded_by`, `procurement_job_id`, `invoice_status`, `financial_anomalies`). Those must be reconstructed **only** to the extent evidenced, and tagged.

### 8.4 Evidence tags (mandatory on future implementation)

Every reconstructed primitive / column / type / constraint **must** be documented as:

| Tag | Meaning |
|-----|---------|
| **PROVEN** | HARD SQL or runtime evidence at or before the relevant frontier |
| **INFERRED WITH EVIDENCE** | contemporaneous app / named FK / CAST / hosted-schema corroboration; not exact DDL |
| **UNRESOLVED** | must **not** be invented; omit or defer with explicit IA justification |

### 8.5 Family coherence (no sequential known fails)

Implementation **must** address the bounded family so E-02 does not intentionally create:

```
run → fail on invoices
repair → run → fail on invoice_status
repair → run → fail on financial_anomalies
repair → run → fail on invoice_ai_audits
```

when all four are already known.

Exact SQL, migration filename/timestamp, enum labels, constraints, and RLS are **not** decided here. They belong to a future Implementation Authorization after a **bounded reconstruction design** that does not guess UNPROVABLE fields.

---

## 9. Chronology and `invoice_ai_audits` (HFSO-008)

**Governing chronology rule:**

```
reconstructed origin MUST execute before the first historical HARD dependency
of that primitive, in timestamp order, without editing existing migrations.
```

| Primitive | First HARD | Reconstruction placement principle |
|-----------|------------|-------------------------------------|
| `public.invoices` | `20260320045054` | before that file |
| `invoice_status` | `20260321053551` | before that file (may share a pre-`20260320045054` reconstruction if family-coherent) |
| `financial_anomalies` | `20260327173153` | before that file |
| `invoice_ai_audits` | `20260409120000` (`CREATE TRIGGER` / `SELECT FROM`) | reconstruct **minimum pre-HARD existence** before `20260409120000`; **do not** claim `20260711120000` historically preceded April; **do not** edit the July file; later `CREATE TABLE IF NOT EXISTS` remains a truthful catch-up |

Placement **filename/timestamp is not chosen here** unless a future IA proves a deterministic slot. One or more reconstruction migrations may be used; that is an implementation design choice.

`finance_bills` and `procurement_invoices` **must not** be renamed or aliased into `public.invoices`.

---

## 10. What this PAD does not authorize

| Action | Status |
|--------|--------|
| Write / edit / create SQL or migrations | **NO** |
| Expand quarantine | **NO** |
| LOCAL-008 retry | **NO** |
| LOCAL-009 | **NO** |
| BCR IA / artifact retarget | **NO** |
| RU-1.4 / REA / EIR / Acceptance / Certification | **NO** |
| Production / shared-DB inference | **NO** (PCQ-010 remains OPEN) |
| Copy production schema into March 2026 | **NO** |

---

## 11. Successor governance chain (HFSO-009)

Verified against HMD-002 precedent (PAD-049 → `E-02-HMIR-IA` → Completion → successor DBA) and PAD-013 exact-match DBA granularity.

```
THIS PAD (PAD-051)  [ISSUED — policy only]
  → HMD-003 OPEN / POLICY SELECTED / IMPLEMENTATION NOT AUTHORIZED
  → bounded Reconstruction Design
       (evidence-tagged primitives; no executable SQL required as a separate runtime)
  → narrow Implementation Authorization
       (existing IA class; proposed ID family: E-02-HFSOR-IA;
        proposed path family:
        E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization.md)
  → repository implementation (reconstructed origin SQL, labeled as reconstruction)
  → static verification
  → Implementation Completion
  → BCR IA retarget LOCAL-008 → LOCAL-009
       ONLY IF the existing exact-match artifact pin requires it
  → successor Database Application Authorization  (NOT LOCAL-008; NOT issued here)
  → fresh CB-B replay + preserve + verify:e02:baseline
  → new DBA evidence
  → E-02-RU-1.4-REA  ONLY IF APPLIED_AND_BASELINE_VERIFIED
```

**Not in this chain now:** LOCAL-009 · BCR IA · REA · EIR · SQL.

Because origin DDL is **unrecoverable**, the next document is **not** a byte-restore IA. It is a reconstruction IA that **must** consume a bounded evidence-tagged design and **must not** invent UNPROVABLE fields.

**Exact next governance action:** issue the **bounded Reconstruction Design** feeding **E-02-HFSOR-IA** (neither issued here).

---

## 12. LOCAL-008 immutability (HFSO-010)

| Item | Status |
|------|--------|
| LOCAL-008 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Retry | **NOT AUTHORIZED** |
| Evidence / manifest | **DO NOT OVERWRITE** · do not relabel BLOCKED |
| Recorded facts | auxiliary start PASS · platform baseline reached · 32 migrations executed · restored HMD-002 file reached/applied · first fail `20260320045054` · `relation "invoices" does not exist` |

Per PAD-023 / PAD-031: each authorization keeps its own immutable evidence. Successor replay uses a **new** DBA/evidence pair.

---

## 13. Program Authority Decision (PAD-051)

**RESOLVED:**

1. Successor Program Authority for this defect class **is permitted** and **is this supplement**.
2. PAD-051 **is** the next E-02 PAD (continuation, not a new tier). PAD-052+ **not** allocated.
3. Forensic inventory **accepted** as locked.
4. Four findings = **ONE BOUNDED DEFECT FAMILY**.
5. **HMD-003** allocated: **HISTORICAL FINANCE SCHEMA-ORIGIN DEFECT** · **OPEN / POLICY SELECTED / IMPLEMENTATION NOT AUTHORIZED**.
6. HMD-001 and HMD-002 **unchanged / DISTINCT**.
7. Option A **NOT APPLICABLE**. Option D **NOT AUTHORIZED**. Option E **REJECTED**.
8. Option C **REJECTED** (cannot precede first HARD dependency under timestamped replay).
9. Option B **SELECTED**: historical schema-origin reconstruction, **not** source restoration.
10. Reconstruction must be evidence-tagged, family-coherent, placed before each first HARD dependency, and must not back-project modern schema or invent UNPROVABLE properties.
11. `invoice_ai_audits`: reconstruct pre-HARD existence; do not reorder or rewrite the July origin file.
12. Quarantine **unchanged** (count 1).
13. `20260320045054` and the HMD-002 restored file **DO NOT EDIT**.
14. LOCAL-008 immutable; LOCAL-009 **NOT AUTHORIZED**; RU-1.4 runtime **NOT AUTHORIZED**.
15. Next: bounded Reconstruction Design → Implementation Authorization (`E-02-HFSOR-IA` proposed). **No executable work in this record.**

---

## 14. Authority question register (HFSO-001 – HFSO-012)

| ID | Question | Resolution |
|----|----------|------------|
| **HFSO-001** | May a successor PAD be issued for this class? Is PAD-051 continuation vs new tier? | **YES — continuation (PAD-051)** |
| **HFSO-002** | Accept locked forensic fact set? | **YES** |
| **HFSO-003** | One family or multiple defects? | **ONE BOUNDED FAMILY** |
| **HFSO-004** | Allocate HMD-003? | **YES — OPEN / POLICY SELECTED / IMPLEMENTATION NOT AUTHORIZED** |
| **HFSO-005** | A / D / E? | **A N/A · D NOT AUTHORIZED · E REJECTED** |
| **HFSO-006** | B or C? | **B SELECTED · C REJECTED (chronology-incapable)** |
| **HFSO-007** | Reconstruction truthfulness? | **Evidence-tagged · no production back-projection · no silent ADD COLUMN · no UNPROVABLE invention** |
| **HFSO-008** | Chronology / `invoice_ai_audits`? | **Origin before first HARD · July file unedited · no fake April origin claim** |
| **HFSO-009** | Successor chain? | **Design → IA → implement → Completion → pin retarget if required → successor DBA** |
| **HFSO-010** | LOCAL-008 / quarantine / HMD-001/002? | **Preserved** |
| **HFSO-011** | May `finance_bills` / `procurement_invoices` substitute? | **NO** |
| **HFSO-012** | Executable work / LOCAL-009 / REA? | **NO / NOT AUTHORIZED / NOT AUTHORIZED** |

---

## 15. Locked statuses (unchanged by this PAD)

| Item | Status |
|------|--------|
| HMD-001 | **OPEN / DISTINCT** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT** |
| HMD-003 | **OPEN / POLICY SELECTED / IMPLEMENTATION NOT AUTHORIZED** |
| Quarantine | **exactly `20260314195641_add_demo_data.sql` / COUNT 1** |
| LOCAL-008 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-008 retry | **NOT AUTHORIZED** |
| LOCAL-009 | **NOT AUTHORIZED** |
| Database baseline | **NOT VERIFIED** |
| RU-1.1 / RU-1.2 | **NOT APPLIED** (LOCAL-008) |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| EIR / Acceptance / Certification | **UNCHANGED / BLOCKED** |

---

**End of document — PAD-051 · HFSO-001 – HFSO-012 · HMD-003 — v1.0 — 2026-08-25**
