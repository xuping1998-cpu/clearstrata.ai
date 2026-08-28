# E-02 HMD-003 — Historical Finance Schema-Origin Reconstruction Design

| Field | Value |
|-------|-------|
| **Document Type** | **Governance Reconstruction Design** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Policy authority** | [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) (**PAD-051** · HFSO-001 – HFSO-012) |
| **Defect** | **HMD-003** |
| **Status** | **GOVERNANCE DESIGN COMPLETE** |
| **Implementation Blocker Test** | **B — DESIGN SUFFICIENT WITH EXPLICIT INFERENCE ACKNOWLEDGEMENTS** |
| **Effective Date** | 2026-08-25 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-HMD-003-Historical-Finance-Schema-Origin-Reconstruction-Design.md`](E-02-HMD-003-Historical-Finance-Schema-Origin-Reconstruction-Design.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized** | **NO** |
| **E-02-HFSOR-IA** | **NOT ISSUED** |

> **Scope lock:** Converts PAD-051 Option B into evidence-tagged reconstruction contracts. This record **does not** create SQL · **does not** choose a migration filename/timestamp · **does not** issue `E-02-HFSOR-IA` · **does not** edit historical migrations · **does not** expand quarantine · **does not** run database/Supabase/Docker · **does not** authorize LOCAL-009 or RU-1.4.

```
HMD-003 RECONSTRUCTION DESIGN                        = GOVERNANCE DESIGN COMPLETE
IMPLEMENTATION BLOCKER TEST                          = B (INFERENCE ACKNOWLEDGEMENTS REQUIRED)
PAD-051                                              = ISSUED / IMMUTABLE
HMD-003                                              = OPEN / POLICY SELECTED / IMPLEMENTATION NOT AUTHORIZED
SELECTED POLICY                                      = OPTION B — HISTORICAL SCHEMA-ORIGIN RECONSTRUCTION
HISTORICAL RECONSTRUCTION ≠ SOURCE RESTORATION       = LOCKED
EXACT HISTORICAL CREATE SQL                          = UNRECOVERABLE (reconfirmed)
E-02-HFSOR-IA                                        = NOT ISSUED
RECONSTRUCTION EXECUTED                              = NO
```

---

## 1. Purpose

Answer, from repository evidence only:

- which HMD-003 primitives require reconstruction;
- each primitive’s first HARD dependency and existence frontier;
- the **minimum historically supportable** contract at that frontier;
- PROVEN / INFERRED WITH EVIDENCE / UNRESOLVED classification for every candidate field and constraint;
- which later migrations must remain later evolution;
- what a future `E-02-HFSOR-IA` may authorize, and what it must not.

This design does **not** implement reconstruction.

---

## 2. Governing Authority

| Record | Role |
|--------|------|
| PAD-001 – PAD-010 | Parent Program Authority |
| PAD-026 – PAD-038 | DATA_ONLY quarantine · HMD register · fake-history rejection |
| PAD-039 – PAD-050 | Source restoration (HMD-002) — **not applicable** here |
| **PAD-051** | Selected Option B · one bounded family · truthfulness / chronology locks |
| Completed read-only finance schema-origin forensics | Locked fact set consumed; not reopened except to classify reconstruction contracts |

---

## 3. Locked Facts

PAD-051 C1–C28 remain controlling. Reconfirmed this task:

| Fact | Status |
|------|--------|
| Exact `CREATE TABLE public.invoices` | **UNRECOVERABLE** (`git log -S` empty) |
| Exact `CREATE TYPE invoice_status` | **UNRECOVERABLE** |
| Exact `CREATE TABLE financial_anomalies` | **UNRECOVERABLE** |
| `invoice_ai_audits` later origin | `20260711120000_invoice_ai_audit_v1.sql` **`CREATE TABLE IF NOT EXISTS`** |
| Quarantine | exactly `20260314195641_add_demo_data.sql` · **COUNT = 1** |
| `20260320045054` / HMD-002 restored file | **DO NOT EDIT** |
| LOCAL-008 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-009 | **NOT AUTHORIZED** |

If exact CREATE SQL had been recovered, this design would **STOP** and return to governance. It was **not**.

---

## 4. Scope / Non-Scope

**In scope:** bounded HMD-003 family reconstruction contracts.

**Out of scope / forbidden:** SQL creation; migration edit; production back-projection; quarantine expansion; fake history; LOCAL-009; `E-02-HFSOR-IA` issuance; substituting `finance_bills` or `procurement_invoices` for `public.invoices`.

---

## 5. Evidence Method

Hierarchy used (PAD-051 / task §12):

1. timestamped historical migrations (HARD vs SOFT);
2. git pickaxe / all local refs (no checkout);
3. generated DB types — **none found** in repository history;
4. dumps/exports — **none found**;
5. later ALTER / FK / policy / function / trigger;
6. contemporaneous application (`bc48068` InvoiceManagement insert/interface);
7. fixtures/tests — not used as origin proof;
8. current production — **not used as sole or controlling basis**.

No database or runtime commands were executed.

---

## 6. Evidence Taxonomy

| Tag | Rule |
|-----|------|
| **PROVEN** | Direct SQL/runtime: relation/type/column must exist for that statement to execute |
| **INFERRED WITH EVIDENCE** | No CREATE, but concrete files + chronology constrain shape. Listed with Evidence / Inference / Confidence / Why not PROVEN |
| **UNRESOLVED** | Do not guess. Future IA must not invent from modern schema |

A PROVEN column does **not** automatically prove NOT NULL, DEFAULT, UNIQUE, CHECK, RLS, indexes, or triggers.

---

## 7. Primitive Inventory

| Primitive | Kind | Classification | Reconstruction required? |
|-----------|------|----------------|--------------------------|
| `public.invoices` | TABLE | CONFIRMED_MISSING_ORIGIN | **YES** |
| `invoice_status` | ENUM TYPE | CONFIRMED_MISSING_ORIGIN | **YES** |
| `public.financial_anomalies` | TABLE | CONFIRMED_MISSING_ORIGIN | **YES** |
| `public.invoice_ai_audits` | TABLE | ORIGIN_AFTER_FIRST_HARD_DEPENDENCY | **YES** (pre-HARD existence; do not edit later CREATE) |
| `procurement_invoices` | TABLE | VALID_ORIGIN (`20260320043431`) | NO — distinct |
| `finance_bills` | TABLE | VALID_ORIGIN (`20260314034834`) | NO — distinct |
| `invoice_ai_audit_results` | TABLE | VALID_ORIGIN (`20260409120000`) | NO — depends on invoices |
| `invoice_ai_audit_contexts` | TABLE | VALID_ORIGIN (`20260711120000`) | NO |
| Other invoice satellites with CREATE | TABLE | VALID_ORIGIN | NO |

**Additional missing primitives:** none confirmed.

`invoices.status` as a **column** is not a fifth object; it is part of the invoices contract. Whether its type is `invoice_status` is **INFERRED**, not PROVEN (no `status invoice_status` DDL; later `status::text` in `20261302120000` is corroboration that by then it was non-text).

No **IN-FAMILY CANDIDATE — GOVERNANCE CONFIRMATION REQUIRED**.  
No **OUT-OF-FAMILY DEFECT — STOP**.

---

## 8. Chronology / HARD Dependency Map

| Primitive | Object kind | Earliest HARD dependency | Exact dependency | Required pre-existing shape (at that instant) | Existing origin? | Reconstruction required? | Earliest safe placement window |
|-----------|-------------|--------------------------|------------------|-----------------------------------------------|------------------|--------------------------|--------------------------------|
| `public.invoices` | TABLE | `20260320045054_enhance_dispute_resolution_system.sql` | `REFERENCES invoices(id)` from `disputes.related_invoice_id uuid` | relation + `id` uuid + unique/PK on `id` | NONE | YES | **after** `20260320044053_create_meeting_voting_system.sql` **and before** `20260320045054` |
| `invoice_status` | ENUM | `20260321053551_add_invoice_failed_status_and_delete_policy.sql` | `ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'ai_extraction_failed'` | type exists (enum) | NONE | YES | **before** `20260321053551` (may share invoices window) |
| `invoices.uploaded_by` | COLUMN | same `20260321053551` | `CREATE POLICY … USING (auth.uid() = uploaded_by)` | column exists, comparable to `auth.uid()` (uuid) | never ADD COLUMN | YES (as invoices shape, not a separate primitive) | **before** `20260321053551` |
| `invoices.procurement_job_id` | COLUMN | `20260327173153_fix_procurement_jobs_fk_cascade_delete.sql` | unguarded `FOREIGN KEY (procurement_job_id) REFERENCES procurement_jobs(id)` | column exists, uuid-compatible | never ADD COLUMN | YES | **before** `20260327173153` |
| `public.financial_anomalies` | TABLE | `20260327173153` | unguarded `ALTER TABLE financial_anomalies ADD CONSTRAINT … (procurement_job_id)` | relation + `procurement_job_id` uuid-compatible | NONE | YES | **before** `20260327173153` |
| `invoices.status` | COLUMN | `20260409130000_ai_hybrid_audit_flags.sql` | `UPDATE … WHERE status IN ('approved', 'paid')` | column exists | never ADD COLUMN | YES before that UPDATE | **before** `20260409130000` |
| `public.invoice_ai_audits` | TABLE | `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | `CREATE TRIGGER … ON public.invoice_ai_audits` + `INSERT … SELECT … FROM public.invoice_ai_audits` | relation + columns used in that SELECT | origin **later** at `20260711120000` | YES pre-HARD | **after** `20260405120000` (properties exist) **and before** `20260409120000` |

**Do not choose an actual reconstruction filename or timestamp in this design.**

Family coherence (PAD-051 J7) requires covering **all four objects** so replay does not stop on the next already-known HARD miss.

---

## 9. Object: `public.invoices`

**Classification:** CONFIRMED_MISSING_ORIGIN  

**First HARD dependency:** `20260320045054_enhance_dispute_resolution_system.sql` — `ALTER TABLE disputes ADD COLUMN related_invoice_id uuid REFERENCES invoices(id)`  

**Required existence before:** that file  

**Minimum PROVEN contract (Frontier 1):**

- relation `public.invoices` (search_path-compatible `invoices`);
- column `id` type **uuid** (referencing column is uuid);
- **unique constraint or primary key on `id`** (PostgreSQL FK rule).

An id-only unique uuid column **is** the Frontier 1 proven minimum. It is **not** the family-coherent minimum (PAD-051 C14–C15).

**INFERRED WITH EVIDENCE candidates (required before later HARDs; never ADD COLUMN):**

| Item | Evidence | Inference | Confidence | Why not PROVEN |
|------|----------|-----------|------------|----------------|
| PRIMARY KEY on `id` (vs UNIQUE only) | FK to `id`; app `id` as identity | PK is the usual unique constraint | HIGH | FK allows UNIQUE without PK |
| `uploaded_by` uuid | `20260321053551` policy `auth.uid() = uploaded_by`; `bc48068` insert + `invoices_uploaded_by_fkey` embed | column uuid; likely FK to `profiles(id)` | HIGH existence; MEDIUM named FK | no CREATE/ADD COLUMN |
| `procurement_job_id` uuid | `20260327173153` unguarded FK to `procurement_jobs(id)` | column uuid nullable (SET NULL rule is **that** migration’s ADD CONSTRAINT, not origin proof) | HIGH existence | nullability/original delete rule unknown |
| `status` | `20260409130000` UPDATE on `status`; `bc48068` insert `status: 'pending_review'` | column exists before 20260409; likely enum `invoice_status` | HIGH existence; MEDIUM type=enum | no `status invoice_status` DDL |
| `created_at` timestamptz | `20260611120000` `EXTRACT(YEAR FROM created_at)` | column exists before that UPDATE | HIGH | type/default unproven |

**UNRESOLVED:** nullability (except PK-implied on `id`); defaults; RLS enablement; policies at origin; indexes other than unique/`id`; CHECK; `document_url`, `vendor_name`, `invoice_number`, `invoice_date`, `due_date`, `subtotal`, `tax_amount`, `total_amount`, `currency`, `notes`, `has_anomalies`, `ai_extracted_data`, `ai_confidence_score`, `is_over_budget`, `amount`; whether `status` was text vs enum at origin.

**Explicitly excluded from origin because later evolution adds it:** see §15 (category, file_name, hst_number, verified_*, paid_*, review_notes, updated_at, property_id, approved, related_task_id, quote_id, approval_note, budget_*, fiscal_year, is_abnormal, audit_summary, accounting_*).

**Collision / implementation concerns:** none at CREATE-collision level. Origin must not include later ADD COLUMN list.

**Future IA may authorize:** new reconstruction migration(s) in the placement window creating the proven Frontier 1 contract **plus** family-coherent inferred columns listed above **if** each is explicitly acknowledged.

**Future IA must NOT authorize without new evidence:** production-shaped invoices; back-projected ADD COLUMN fields; invented RLS/policies/indexes; `amount` vs `total_amount`; `is_over_budget`; client-only `pending_upload` as a required DB column.

---

## 10. Object: `invoice_status`

**Classification:** CONFIRMED_MISSING_ORIGIN  

**First HARD dependency:** `20260321053551_add_invoice_failed_status_and_delete_policy.sql` — `ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'ai_extraction_failed'`  

**Required existence before:** that file  

**Minimum PROVEN contract:**

- object exists;
- object kind = PostgreSQL **ENUM** (**PROVEN**: `ALTER TYPE … ADD VALUE` is enum-only).

**INFERRED WITH EVIDENCE candidates (initial labels):**

`ALTER TYPE … ADD VALUE` proves the type already had **some** labels. It does **not** prove which.

Contemporaneous `bc48068` `InvoiceManagement` status map / insert (same commit as the first ALTER TYPE file):

| Label | Role | Classification |
|-------|------|----------------|
| `pending_review` | insert default in `bc48068`; realtime comment `20260321054643` | INFERRED WITH EVIDENCE · HIGH |
| `approved`, `paid`, `rejected`, `flagged` | `bc48068` workflow | INFERRED WITH EVIDENCE · MEDIUM–HIGH |
| `ai_processing` | UI map + realtime comment | INFERRED WITH EVIDENCE · MEDIUM |
| `pending_upload` | UI map only | INFERRED WITH EVIDENCE · LOW — may be client-only · **do not require** |
| `ai_extraction_failed` | **explicit later ADD VALUE** `20260321053551` | **DEFER TO EXISTING LATER MIGRATION** |
| `draft_manual` | **explicit later ADD VALUE** `20260512103000` | **DEFER TO EXISTING LATER MIGRATION** |
| `pending` | first seen `20260710120100` `status IN (…, 'pending', …)` | UNRESOLVED — **do not put in origin** |

**UNRESOLVED IMPLEMENTATION CONSTRAINT:**

PostgreSQL `CREATE TYPE … AS ENUM (…)` requires **at least one** label. **No label is PROVEN initial.**  

This is **not** solved by copying today’s enum. It **is** an IA precondition: either (1) explicitly acknowledge a documented inferred initial set **excluding** later ADD VALUE labels, or (2) return to governance. Guessing a dummy label is **forbidden**.

**Why not STOP (task §22.8):** an evidence-backed inferred set exists (`pending_review` at minimum, plus contemporaneous workflow labels). That is inference, not production copy. It requires **acknowledgement**, not silent invention.

**Future IA may authorize:** `CREATE TYPE invoice_status AS ENUM (…)` using **only** IA-acknowledged inferred labels; leave `ai_extraction_failed` / `draft_manual` to existing ALTER TYPE files.

**Future IA must NOT authorize:** current full label set; inventing labels to look complete; putting later ADD VALUE labels into origin.

---

## 11. Object: `financial_anomalies`

**Classification:** CONFIRMED_MISSING_ORIGIN  

**First HARD dependency:** `20260327173153_fix_procurement_jobs_fk_cascade_delete.sql` — unguarded `ALTER TABLE financial_anomalies ADD CONSTRAINT … FOREIGN KEY (procurement_job_id) REFERENCES procurement_jobs(id) ON DELETE SET NULL`  

**Required existence before:** that file  

**Minimum PROVEN contract:**

- relation `financial_anomalies`;
- column `procurement_job_id` uuid-compatible with `procurement_jobs.id`.

The SET NULL delete rule is applied **by that migration**; it does **not** prove origin FK/delete behavior. Origin may omit the FK; the 20260327 statement **adds** it (after dropping any existing matching constraint in a loop). If origin has no constraint, the DROP loop is a no-op and ADD CONSTRAINT still requires the column.

**INFERRED WITH EVIDENCE:**

| Item | Evidence | Inference | Confidence | Why not PROVEN |
|------|----------|-----------|------------|----------------|
| `invoice_id` uuid | `20260405120000` `UPDATE financial_anomalies … fa.invoice_id`; never ADD COLUMN | column exists before that UPDATE | HIGH | not required at 20260327 HARD |
| `property_id` | ADD IF NOT EXISTS `20260405120000` then guarded SET NOT NULL | **later evolution** | n/a | must **not** be origin |
| `notes` | `src/lib/invoiceInterpreterAssist.ts` insert | app-era column | LOW for origin | not in timestamped SQL |

**UNRESOLVED:** PK; RLS at origin; policies at origin; `invoice_id` nullability; any CHECK/UNIQUE; relationship to invoices **at first HARD** (not required at 20260327; `invoice_id` needed by 20260405 UPDATE).

**Explicitly excluded from origin:** `property_id` (later ADD).

**Future IA may authorize:** table + `procurement_job_id`; optionally `invoice_id` with acknowledgement so `20260405120000` UPDATE succeeds.

**Future IA must NOT authorize:** current table copy; origin policies; inventing `notes`/PK/RLS without evidence.

---

## 12. Object: `invoice_ai_audits`

**Classification:** ORIGIN_AFTER_FIRST_HARD_DEPENDENCY  

**First HARD dependency:** `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql`

- `CREATE TRIGGER trg_sync_invoice_ai_audit_results AFTER INSERT OR UPDATE ON public.invoice_ai_audits`
- `INSERT INTO invoice_ai_audit_results … SELECT a.invoice_id, a.property_id, a.risk_score, a.risk_level, a.ai_reasons, a.ai_summary_zh, a.ai_summary_en, a.updated_at FROM public.invoice_ai_audits a`

**Later CREATE location:** `20260711120000_invoice_ai_audit_v1.sql` — **`CREATE TABLE IF NOT EXISTS public.invoice_ai_audits (`** (not plain `CREATE TABLE`)

**Required existence before:** `20260409120000`

**Minimum PROVEN contract at April HARD (SELECT list + trigger target):**

- relation exists;
- columns: `invoice_id`, `property_id`, `risk_score`, `risk_level`, `ai_reasons`, `ai_summary_zh`, `ai_summary_en`, `updated_at`.

Types of those columns are **not** fully proven (SELECT does not declare them). July CREATE documents types; using July types at April is **not** “July file ran in April” if tagged as reconstruction-for-later-CREATE-compat.

**INFERRED / chronology-preservation (later-CREATE companion DDL):**

If a reconstructed table already exists, July `CREATE TABLE IF NOT EXISTS` is a **no-op**. The same July file still runs:

- `CREATE INDEX IF NOT EXISTS … (property_id, fiscal_year)` → requires **`fiscal_year`**
- `CREATE INDEX IF NOT EXISTS … (status)` → requires **`status`**
- RLS + policy on `property_id` (column already in April SELECT)
- `updated_at` touch trigger (column already in April SELECT)

**RECONSTRUCTION / LATER-CREATE COLLISION = YES (mechanical), mechanism PROVEN in repository:** later origin already uses `CREATE TABLE IF NOT EXISTS`. Collision is **not** a reason to edit the July file.

**Design requirement for future IA (not implemented here):**

1. Reconstruct pre-HARD existence in window **after** `20260405120000` (so `properties` exists if a FK is used) **and before** `20260409120000`.
2. Do **not** edit `20260711120000`.
3. Do **not** claim the July file historically executed in April.
4. Explicitly choose one collision strategy:
   - **S1 (preferred under PAD-051 immutability):** include April PROVEN columns **plus** July-companion columns required for unedited July non-CREATE statements (`fiscal_year`, `status`, and any other columns those statements require), tagged **INFERRED WITH EVIDENCE / CHRONOLOGY-PRESERVATION**, not as proven March/April hosted shape;
   - **S2:** return to governance if S1 is judged forbidden back-projection.

Omitting `fiscal_year`/`status` from reconstruction **will** make unedited July index creation fail. That is not acceptable under “do not edit later CREATE” + family coherence.

**Parts that must remain associated with the later file:** the July **file identity** and all statements after CREATE TABLE (indexes IF NOT EXISTS, RLS, policies, functions). CREATE TABLE becomes a truthful no-op.

**`over_budget` / `bypass_approval`:** ADD COLUMN `20260409130000` — **later evolution**, not origin.

**Future IA may authorize:** S1 stub in the April window; IF NOT EXISTS no-op in July.

**Future IA must NOT authorize:** editing July CREATE; pretending July timestamp ran earlier; duplicating incompatible non-IF-NOT-EXISTS CREATE; fake applied history.

---

## 13. Field-level matrices

### 13.1 `public.invoices`

| Field | Needed at first HARD frontier? | Classification | Evidence | Minimum type known? | Constraints known? | Later evolution? | Reconstruction disposition |
|-------|--------------------------------|----------------|----------|---------------------|--------------------|------------------|----------------------------|
| (relation) | YES | PROVEN | LOCAL-008 + `REFERENCES invoices(id)` | n/a | n/a | n/a | INCLUDE — PROVEN |
| `id` | YES | PROVEN | uuid FK target | uuid | UNIQUE or PK **PROVEN** | no | INCLUDE — PROVEN |
| PK vs UNIQUE on `id` | YES (some unique) | INFERRED PK | FK + identity | uuid | PK inferred | no | INCLUDE — INFERRED WITH EVIDENCE, REQUIRES IA ACKNOWLEDGEMENT |
| `uploaded_by` | NO (needed `20260321053551`) | INFERRED | policy + `bc48068` | uuid | FK unproven | never ADD | INCLUDE — INFERRED WITH EVIDENCE, REQUIRES IA ACKNOWLEDGEMENT |
| `procurement_job_id` | NO (needed `20260327173153`) | INFERRED | unguarded FK add | uuid | origin FK unproven | constraint added 20260327 | INCLUDE — INFERRED WITH EVIDENCE, REQUIRES IA ACKNOWLEDGEMENT |
| `status` | NO (needed `20260409130000`) | INFERRED | UPDATE + app | unknown (enum vs text) | no | never ADD | INCLUDE — INFERRED WITH EVIDENCE, REQUIRES IA ACKNOWLEDGEMENT |
| `created_at` | NO (needed `20260611120000`) | INFERRED | EXTRACT(YEAR FROM created_at) | timestamptz inferred | default unproven | never ADD | INCLUDE — INFERRED WITH EVIDENCE, REQUIRES IA ACKNOWLEDGEMENT |
| `property_id` | NO | later ADD | `20260405120000` | uuid | SET NOT NULL later | YES | DEFER TO EXISTING LATER MIGRATION |
| `category`, `file_name`, `hst_number` | NO | later ADD | `20260321044704` | text | defaults in ADD | YES | DEFER TO EXISTING LATER MIGRATION |
| `verified_by/at`, `paid_at/by`, `review_notes`, `updated_at` | NO | later ADD | `20260329180000` | mixed | — | YES | DEFER TO EXISTING LATER MIGRATION |
| `approved` | NO | later ADD | `20260409130000` | boolean | DEFAULT false in ADD | YES | DEFER TO EXISTING LATER MIGRATION |
| `related_task_id`, `quote_id` | NO | later ADD | `20260605` / `20260606` | uuid | — | YES | DEFER TO EXISTING LATER MIGRATION |
| `approval_note` | NO | later ADD | `20260609120000` | text | — | YES | DEFER TO EXISTING LATER MIGRATION |
| `budget_category_id`, `budget_anomaly_flag` | NO | later ADD | `20260610120000` | mixed | — | YES | DEFER TO EXISTING LATER MIGRATION |
| `fiscal_year` | NO | later ADD | `20260611120000` | int | — | YES | DEFER TO EXISTING LATER MIGRATION |
| `is_abnormal`, `audit_summary` | NO | later ADD | `20260613120000` | mixed | — | YES | DEFER TO EXISTING LATER MIGRATION |
| `accounting_year`, `accounting_month` | NO | later ADD | `20260906120000` | int | SET NOT NULL later | YES | DEFER TO EXISTING LATER MIGRATION |
| `vendor_name`, `invoice_number`, `invoice_date`, `due_date`, `subtotal`, `tax_amount`, `total_amount`, `currency`, `document_url`, `notes`, `has_anomalies`, `ai_extracted_data`, `ai_confidence_score` | NO | INFERRED app `bc48068` | insert/interface | mixed | no | never ADD | EXCLUDE FROM ORIGIN unless a future HARD is shown; **not required for replay of known HARDs** (app is not migration execution). Optional IA expansion only with new evidence. |
| `created_by` | UNKNOWN | UNRESOLVED | checklist only | — | — | no ADD found | UNRESOLVED — DO NOT IMPLEMENT |
| `vendor_id` | UNKNOWN | UNRESOLVED | checklist only | — | — | no ADD found | UNRESOLVED — DO NOT IMPLEMENT |
| `is_over_budget` | NO | UNRESOLVED | plpgsql `20260610120000` | — | — | no ADD | UNRESOLVED — DO NOT IMPLEMENT |
| `amount` | NO | UNRESOLVED / conflict | non-timestamped `dashboard_functions_fix.sql` vs timestamped `total_amount` | — | — | n/a | UNRESOLVED — DO NOT IMPLEMENT |

Contemporaneous app columns are **existence evidence for hosted schema by 2026-03-29**, not PROVEN origin-at-`20260320` and **not required** to pass timestamped HARD statements after Frontier 1 except where listed INFERRED for SQL HARDs. Prefer historical ALTERs over packing the app insert into origin.

### 13.2 `invoice_status`

| Field | Needed at first HARD frontier? | Classification | Evidence | Minimum type known? | Constraints known? | Later evolution? | Reconstruction disposition |
|-------|--------------------------------|----------------|----------|---------------------|--------------------|------------------|----------------------------|
| type exists | YES | PROVEN | ALTER TYPE ADD VALUE | ENUM | — | n/a | INCLUDE — PROVEN |
| ≥1 label | YES (PostgreSQL) | INFERRED set | no PROVEN label | enum labels | — | ADD VALUE later | INCLUDE — INFERRED WITH EVIDENCE, REQUIRES IA ACKNOWLEDGEMENT |
| `ai_extraction_failed` | added at first HARD | later ADD VALUE | `20260321053551` | — | — | YES | DEFER TO EXISTING LATER MIGRATION |
| `draft_manual` | NO | later ADD VALUE | `20260512103000` | — | — | YES | DEFER TO EXISTING LATER MIGRATION |

### 13.3 `financial_anomalies`

| Field | Needed at first HARD frontier? | Classification | Evidence | Minimum type known? | Constraints known? | Later evolution? | Reconstruction disposition |
|-------|--------------------------------|----------------|----------|---------------------|--------------------|------------------|----------------------------|
| (relation) | YES | PROVEN | ALTER TABLE | n/a | n/a | n/a | INCLUDE — PROVEN |
| `procurement_job_id` | YES | PROVEN | FK ADD on that column | uuid | origin FK unproven | constraint 20260327 | INCLUDE — PROVEN |
| `invoice_id` | NO (needed `20260405120000` UPDATE) | INFERRED | UPDATE `fa.invoice_id` | uuid | no | never ADD | INCLUDE — INFERRED WITH EVIDENCE, REQUIRES IA ACKNOWLEDGEMENT |
| `property_id` | NO | later ADD | `20260405120000` | uuid | SET NOT NULL later | YES | DEFER TO EXISTING LATER MIGRATION |
| `id` PK | NO | UNRESOLVED | none | — | — | — | UNRESOLVED — DO NOT IMPLEMENT |
| `notes` | NO | UNRESOLVED / app | assist insert | text? | — | — | UNRESOLVED — DO NOT IMPLEMENT |

### 13.4 `invoice_ai_audits`

| Field | Needed at first HARD frontier? | Classification | Evidence | Minimum type known? | Constraints known? | Later evolution? | Reconstruction disposition |
|-------|--------------------------------|----------------|----------|---------------------|--------------------|------------------|----------------------------|
| (relation) | YES | PROVEN | CREATE TRIGGER ON | n/a | n/a | later CREATE IF NOT EXISTS | INCLUDE — PROVEN |
| `invoice_id`, `property_id`, `risk_score`, `risk_level`, `ai_reasons`, `ai_summary_zh`, `ai_summary_en`, `updated_at` | YES | PROVEN existence | INSERT SELECT list | types unproven | no | July CREATE documents types | INCLUDE — PROVEN (existence); types INFERRED FROM LATER CREATE, REQUIRES IA ACKNOWLEDGEMENT |
| `fiscal_year`, `status` | NO at April SELECT | INFERRED chronology-preservation | July `CREATE INDEX` after skipped CREATE TABLE | July CREATE | — | July file | INCLUDE — INFERRED WITH EVIDENCE, REQUIRES IA ACKNOWLEDGEMENT (S1) |
| `id`, `ai_recommendations`, `model_name`, `created_at`, UNIQUE(invoice_id) | NO | UNRESOLVED at April | only in July CREATE body | — | — | skipped if table exists | GOVERNANCE REVIEW REQUIRED if later SQL needs them without ADD COLUMN; default **UNRESOLVED — DO NOT IMPLEMENT** unless IA shows a later HARD |
| `over_budget`, `bypass_approval` | NO | later ADD | `20260409130000` | boolean | DEFAULT in ADD | YES | DEFER TO EXISTING LATER MIGRATION |

---

## 14. Constraint matrix

| Constraint class | `invoices` | `invoice_status` | `financial_anomalies` | `invoice_ai_audits` | Safe to omit from minimal reconstruction? |
|------------------|------------|------------------|----------------------|---------------------|-------------------------------------------|
| PRIMARY KEY | INFERRED on `id` | n/a | UNRESOLVED | UNRESOLVED at April | invoices: no (unique required). others: yes unless IA infers |
| UNIQUE | PROVEN some unique on `invoices.id` | n/a | UNRESOLVED | July UNIQUE(invoice_id) UNRESOLVED at April | omit July unique unless later HARD |
| FOREIGN KEY | F1 references **from** disputes **to** invoices — origin need not declare inbound FKs. `uploaded_by`→profiles INFERRED. `procurement_job_id` FK **added** 20260327 | n/a | FK **added** 20260327 | July FKs to invoices/properties UNRESOLVED at April | omit origin FKs that later migrations ADD |
| NOT NULL | only implied if PK on `id` | n/a | UNRESOLVED | UNRESOLVED | omit except PK-implied |
| DEFAULT | UNRESOLVED | n/a | UNRESOLVED | UNRESOLVED | omit |
| CHECK | UNRESOLVED | n/a | UNRESOLVED | July CHECKs UNRESOLVED at April | omit |
| ENUM | n/a | PROVEN kind; labels INFERRED | n/a | n/a | cannot omit type; labels need IA |
| RLS | UNRESOLVED at origin; later policies exist | n/a | later policies `20260405120100` | later `20260711` | **omit origin RLS** — later files enable/create |
| POLICIES | first CREATE `20260321053551` | n/a | first CREATE `20260405120100` | July | **omit origin policies** |
| TRIGGERS | later (e.g. audit engine) | n/a | none at origin HARD | April trigger is in `20260409120000` (leave it) | **do not reconstruct April trigger** — existing file creates it |
| INDEXES | UNRESOLVED at origin | n/a | UNRESOLVED | July IF NOT EXISTS | omit origin indexes; July indexes need companion columns (S1) |

---

## 15. Later-evolution / no-back-projection matrix (summary)

Default: **later ADD COLUMN / ADD VALUE = MUST REMAIN LATER / back-project NO.**

| Later migration | Operation | Object | Column/type | What it proves about pre-state | Must remain later? | May be back-projected? |
|-----------------|-----------|--------|-------------|--------------------------------|--------------------|------------------------|
| `20260321044704` | ADD COLUMN IF missing | invoices | category, file_name, hst_number | table exists; these columns **need not** exist yet | YES | NO |
| `20260321053551` | ALTER TYPE ADD VALUE | invoice_status | `ai_extraction_failed` | type exists; this label **need not** exist yet | YES | NO |
| `20260321053551` | CREATE POLICY | invoices | uses `uploaded_by` | **column must already exist** | policy later | column: origin/inferred, not this ADD |
| `20260321054643` | ALTER PUBLICATION ADD TABLE | invoices | table | table exists | YES | n/a |
| `20260327173153` | ADD CONSTRAINT FK | invoices / financial_anomalies | procurement_job_id | **columns must exist**; FK created here | YES (constraint) | column: not “added” here |
| `20260329180000` | ADD COLUMN IF missing | invoices | verified_*, paid_*, review_notes, updated_at | need not exist yet | YES | NO |
| `20260405120000` | ADD COLUMN IF missing | invoices / financial_anomalies | property_id | need not exist yet | YES | NO |
| `20260409120000` | CREATE TRIGGER + SELECT | invoice_ai_audits | listed columns | **must exist** | trigger stays in this file | columns: reconstruct |
| `20260409130000` | ADD COLUMN | invoices.approved; audits flags | approved, over_budget, bypass_approval | need not exist yet | YES | NO |
| `20260512103000` | ALTER TYPE ADD VALUE | invoice_status | draft_manual | need not exist yet | YES | NO |
| `20260605`–`20261205` | ADD COLUMN | invoices | task/quote/budget/fiscal/OCR/accounting | need not exist yet | YES | NO |
| `20260711120000` | CREATE TABLE IF NOT EXISTS | invoice_ai_audits | full July shape | if table exists, CREATE skipped | YES (file unedited) | full July body **NO** as claimed April origin; S1 companion columns only |

---

## 16. Reconstruction placement windows

No filename/timestamp chosen.

| Window | After | Before | Intended primitives |
|--------|-------|--------|---------------------|
| **W1** | `20260320044053_create_meeting_voting_system.sql` | `20260320045054_enhance_dispute_resolution_system.sql` | `public.invoices` (F1 + inferred family columns needed through `20260327173153` / `20260409130000` as designed) + `invoice_status` + `financial_anomalies` |
| **W2** | `20260405120000_multi_tenant_properties.sql` | `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` | `invoice_ai_audits` pre-HARD existence (properties available) |

Future IA **must** include an explicit rule for choosing unused timestamps **inside** these windows (lexicographic order among existing versions). PAD-051 permits IA to choose the concrete unused timestamp; this design does not.

One vs several reconstruction files: IA choice, provided windows and family coherence hold.

`finance_bills` / `procurement_invoices`: **must not** be aliased into `public.invoices`.

---

## 17. Unresolved facts

1. Exact historical CREATE SQL (all three missing origins).
2. `invoice_status` **PROVEN** initial labels (none).
3. Whether `invoices.status` was enum vs text at origin.
4. Nullability/defaults/indexes/RLS/policies at origin for all four objects.
5. App-only invoices columns vs hosted origin-at-20260320.
6. `financial_anomalies` PK / `notes`.
7. `invoice_ai_audits` July-only columns not referenced before July (`id` PK, UNIQUE, `ai_recommendations`, `model_name`, `created_at`) if CREATE TABLE is skipped.
8. `is_over_budget` / `amount`.
9. `pending` / `pending_upload` as DB enum values.

---

## 18. Anti-invention controls

- No production schema copy.
- No back-projection of §15 ADD COLUMN / ADD VALUE list.
- No reconstructing RLS, policies, triggers, or indexes “because production has them” (except S1 companion **columns** for unedited July indexes).
- No dummy enum labels.
- No editing `20260320045054`, `20260315035847`, or `20260711120000`.
- No quarantine change.
- Every reconstructed item in a future IA must carry PROVEN / INFERRED WITH EVIDENCE / UNRESOLVED.

---

## 19. Future `E-02-HFSOR-IA` boundary

**May authorize (only after consuming this design):**

- new reconstruction migration file(s) in W1/W2;
- timestamp selection rule inside those windows;
- minimum PROVEN contracts;
- **explicitly listed** INFERRED items with acknowledgement;
- S1 chronology-preservation columns for `invoice_ai_audits`;
- labeling SQL as reconstruction, not restoration;
- static verification of placement and non-edit of locked files.

**Must not automatically authorize:**

- existing migration edits;
- production back-projection;
- quarantine expansion;
- fake history / repair;
- LOCAL-009 / DB execution / RU-1.4;
- verifier or guard weakening;
- UNRESOLVED fields from §13–§17;
- packing the full `bc48068` Invoice insert into origin without a new HARD showing those columns are required for replay.

**IA is not issued by this document.**

---

## 20. Implementation Blocker Test

**Result: B — DESIGN SUFFICIENT WITH EXPLICIT INFERENCE ACKNOWLEDGEMENTS**

Not A: proven-only reconstruction (id-only invoices, enum with zero labels, anomalies without `invoice_id`, audits without S1 columns) **fails** later known HARDs or PostgreSQL/July-file mechanics.

Not C: minimum proven objects exist; inferred items are file-backed, not production guesses; enum has an evidence-backed inferred label set; later CREATE uses `IF NOT EXISTS` (collision mechanism present).

**Inferences a future IA must explicitly accept:**

1. `invoices.id` unique implemented as PRIMARY KEY (not merely UNIQUE).
2. `invoices.uploaded_by` uuid (optional profiles FK).
3. `invoices.procurement_job_id` uuid (FK left to `20260327173153`).
4. `invoices.status` column (type enum vs text).
5. `invoices.created_at` timestamptz.
6. `invoice_status` initial labels = acknowledged inferred set **excluding** `ai_extraction_failed` and `draft_manual`.
7. `financial_anomalies.invoice_id` uuid before `20260405120000`.
8. Collision strategy **S1** for `invoice_ai_audits` (April SELECT columns + `fiscal_year` + `status`; types drawn from later CREATE as chronology-preservation, not as “July ran in April”).
9. Placement: W1 + W2; IA chooses unused timestamps.

If any of 6 or 8 is refused, the result becomes **C** and IA must not issue.

---

## 21. HMD-001 / HMD-002 / HMD-003 separation

| ID | Status | Relation to this design |
|----|--------|-------------------------|
| HMD-001 | **OPEN / DISTINCT** | DATA_ONLY demo quarantine — unchanged |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT** | restored file **DO NOT EDIT** |
| HMD-003 | **OPEN / POLICY SELECTED / IMPLEMENTATION NOT AUTHORIZED** | this design only; **not CLOSED** |

---

## 22. LOCAL-008 / LOCAL-009

| Item | Status |
|------|--------|
| LOCAL-008 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Retry | **NOT AUTHORIZED** |
| LOCAL-009 | **NOT AUTHORIZED** |

---

## 23. Database / RU / EIR status

| Item | Status |
|------|--------|
| Database baseline verified | **NO** |
| RU-1.1 / RU-1.2 | **NOT APPLIED** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| EIR / Acceptance / Certification | **BLOCKED / UNCHANGED** |

---

## 24. Exact next governance action

```
NEXT = GOVERNANCE REVIEW / ISSUE E-02-HFSOR-IA
       consuming this design’s PROVEN contracts
       and explicit inference acknowledgements (Blocker Test B)
```

Do **not** implement SQL in that review. Do **not** treat this design as Implementation Authorization.

---

**End of document — HMD-003 Reconstruction Design v1.0 — 2026-08-25**
