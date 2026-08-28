# E-02 — Historical Finance Schema-Origin Reconstruction — Implementation Authorization

| Field | Value |
|-------|-------|
| **Document Type** | **Implementation Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-HFSOR-IA** |
| **Policy authority** | [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) (**PAD-051** · HFSO-001 – HFSO-012) |
| **Design consumed** | [`E-02-HMD-003-Historical-Finance-Schema-Origin-Reconstruction-Design.md`](E-02-HMD-003-Historical-Finance-Schema-Origin-Reconstruction-Design.md) v1.0 |
| **Defect** | **HMD-003** |
| **Status** | **Approved With Conditions — NOT YET CONSUMED** |
| **Authority Level** | Implementation Authorization (repository reconstruction only) |
| **Effective Date** | 2026-08-25 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization.md) |
| **Production Effect** | **None** |
| **Successor Completion (not created)** | `docs/implementation/E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion.md` |

> **Authority path finding:** Filename `E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization.md` is **authority-safe** as an **Implementation Authorization** in the established E-02 IA class (`E-02-*-Implementation-Authorization.md`), matching PAD-051’s proposed family and ID **`E-02-HFSOR-IA`** (same pattern as **`E-02-HMIR-IA`**). It is **not** a new Program Authority tier, **not** a new PAD, **not** a DBA, **not** a BCR IA, **not** a quarantine authorization, and **not** a migration-repair authorization.

> **Document class:** Bounded **repository historical schema-origin reconstruction** authorization only. This record **does not** create SQL · **does not** apply migrations · **does not** run BCR · **does not** issue LOCAL-009 · **does not** authorize RU-1.4.

```
HISTORICAL FINANCE SCHEMA-ORIGIN RECONSTRUCTION IA = E-02-HFSOR-IA
DECISION                                           = APPROVED WITH CONDITIONS
PAD-051                                            = POLICY CONSUMED (implementation not performed)
SELECTED POLICY                                    = OPTION B — HISTORICAL SCHEMA-ORIGIN RECONSTRUCTION
HISTORICAL RECONSTRUCTION ≠ SOURCE RESTORATION     = LOCKED
BLOCKER TEST                                       = B (INFERENCES EXPLICITLY ACKNOWLEDGED BELOW)
RECONSTRUCTION EXECUTED                            = NO
HMD-003                                            = OPEN / POLICY SELECTED / IMPLEMENTATION AUTHORIZED / RUNTIME REPLAY VERIFICATION PENDING
HMD-001                                            = OPEN / DISTINCT
HMD-002                                            = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT
QUARANTINE                                         = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
LOCAL-008                                          = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-009                                          = NOT AUTHORIZED
THIS IA                                            ≠ DBA · ≠ BCR IA · ≠ PAD · ≠ REA
```

---

## 1. Pre-issuance gate

| Condition | Finding |
|-----------|---------|
| PAD-051 ISSUED / controlling | **PASS** |
| Option B selected | **PASS** |
| HMD-003 OPEN / POLICY SELECTED / IMPLEMENTATION NOT AUTHORIZED (pre) | **PASS** |
| Design GOVERNANCE DESIGN COMPLETE | **PASS** |
| Blocker Test B | **PASS** |
| Exact CREATE SQL unrecoverable | **PASS** (Design reconfirmed) |
| No superseding authority | **PASS** |
| LOCAL-008 immutable failed | **PASS** |
| LOCAL-008 retry / LOCAL-009 NOT AUTHORIZED | **PASS** |
| Quarantine count 1 | **PASS** |
| HMD-001 / HMD-002 DISTINCT unchanged | **PASS** |
| Historical migrations non-editable | **PASS** |

**STOP does not apply.** This IA may issue.

---

## 2. Authorization basis

| Record | Role |
|--------|------|
| PAD-051 | Direct policy — Option B · HMD-003 family · no source restoration · no forward-fix · no fake history |
| HMD-003 Reconstruction Design v1.0 | Evidence-tagged contracts · Blocker Test B · W1/W2 · S1 |
| PAD-026 – PAD-038 | Quarantine immutability · PAD-029 fake-history rejection |
| PAD-039 – PAD-050 / E-02-HMIR-IA | HMD-002 distinct; restored file DO NOT EDIT |
| LOCAL-008 DBA + evidence | Immutable APPLICATION_FAILED |

**This IA consumes PAD-051 and the Design for implementation authorization only.** Reconstruction is **not performed** in this issuance task.

---

## 3. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-HFSOR-IA** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Consumption** | **NOT YET CONSUMED** |
| **Authorized future action** | Create **exactly two** new reconstruction migrations in W1 and W2 per §13–§21 |
| **Not authorized** | Existing-file edit · production back-projection · fake history · LOCAL-009 · DB/Supabase/Docker · RU-1.4 · unresolved invention |
| **Execution this task** | **NOT PERFORMED** |

HMD-003 **post-issuance:** **OPEN / POLICY SELECTED / IMPLEMENTATION AUTHORIZED / RUNTIME REPLAY VERIFICATION PENDING**. **Not resolved. Not complete.**

---

## 4. Authorized purpose

Authorize **one future repository-only** task: implement the Design’s minimum evidence-supported reconstruction so timestamped clean replay can traverse the known HMD-003 HARD gaps **without** editing existing migrations, expanding quarantine, fabricating applied history, or copying production schema backward.

**Not authorized:** DB execution · LOCAL-009 · replay · baseline verifier against DB · RU-1.4 · EIR · certification.

---

## 5. Defect family — locked

Exactly four members. **No silent expansion.** If another missing-origin primitive is discovered: **STOP → GOVERNANCE.**

| # | Object | Classification |
|---|--------|----------------|
| 1 | `public.invoices` | CONFIRMED_MISSING_ORIGIN |
| 2 | `invoice_status` | CONFIRMED_MISSING_ORIGIN |
| 3 | `public.financial_anomalies` | CONFIRMED_MISSING_ORIGIN |
| 4 | `public.invoice_ai_audits` | ORIGIN_AFTER_FIRST_HARD_DEPENDENCY |

---

## 6. Evidence model

| Tag | Implementation rule |
|-----|---------------------|
| **PROVEN** | May implement within the authorized minimum contract |
| **INFERRED WITH EVIDENCE** | May implement **only** if this IA **explicitly acknowledges that exact item** |
| **UNRESOLVED** | **MUST NOT** implement unless this IA gives a bounded resolution (none except the listed acknowledgements) |

Silent promotion is forbidden. Need for an unlisted UNRESOLVED fact: **STOP → GOVERNANCE.**

---

## 7. `public.invoices` — proven contract

**First HARD:** `20260320045054_enhance_dispute_resolution_system.sql` — `REFERENCES invoices(id)`.

**PROVEN (authorized):**

- relation `public.invoices`;
- column `id` type **uuid**;
- referenced uniqueness on `id` (PostgreSQL FK rule).

**INFERRED uniqueness representation:** PRIMARY KEY (not a second UNIQUE-only design) — **ACKNOWLEDGED** (§8). PK implies NOT NULL on `id` in PostgreSQL. **DEFAULT `gen_random_uuid()` is NOT AUTHORIZED** (unresolved). Exact constraint name is **NOT AUTHORIZED** (implementer may use PostgreSQL default PK name).

---

## 8. `public.invoices` — per-field inference acknowledgements

| Field | Disposition | Evidence basis | Why before later HARD | Minimum type | Constraints NOT proven / not authorized | Later interaction |
|-------|-------------|----------------|----------------------|--------------|------------------------------------------|-------------------|
| uniqueness as **PRIMARY KEY** | **ACKNOWLEDGED FOR IMPLEMENTATION** | Design §9 / §20 item 1; FK to `id` | F1 | uuid PK | DEFAULT; constraint name | none |
| `uploaded_by` | **ACKNOWLEDGED FOR IMPLEMENTATION** | `20260321053551` `USING (auth.uid() = uploaded_by)`; `bc48068` insert | before `20260321053551` policy | **uuid** | NOT NULL, DEFAULT, **FK to profiles NOT AUTHORIZED** (policy needs column only; named fkey unproven) | later policies reuse column |
| `procurement_job_id` | **ACKNOWLEDGED FOR IMPLEMENTATION** | `20260327173153` unguarded FK ADD | column must exist before that ADD CONSTRAINT | **uuid** | NOT NULL, DEFAULT; **origin FK NOT AUTHORIZED** (leave FK to `20260327173153`) | that migration adds FK |
| `status` | **ACKNOWLEDGED FOR IMPLEMENTATION** | `20260409130000` `WHERE status IN ('approved','paid')`; `bc48068` insert | before that UPDATE | **`invoice_status`** (inferred enum; Design MEDIUM type) | DEFAULT | UPDATE uses labels in authorized enum set |
| `created_at` | **ACKNOWLEDGED FOR IMPLEMENTATION** | `20260611120000` `EXTRACT(YEAR FROM created_at)` | before that UPDATE | **timestamptz** | NOT NULL, **DEFAULT now() NOT AUTHORIZED** | fiscal_year backfill uses it |

**NOT AUTHORIZED / DEFER** (Design UNRESOLVED / later ADD / app-only):  
`property_id`, `category`, `file_name`, `hst_number`, `verified_by`, `verified_at`, `paid_at`, `paid_by`, `review_notes`, `updated_at`, `approved`, `related_task_id`, `quote_id`, `approval_note`, `budget_category_id`, `budget_anomaly_flag`, `fiscal_year` (**on invoices**), `is_abnormal`, `audit_summary`, `accounting_year`, `accounting_month`, `vendor_name`, `invoice_number`, `invoice_date`, `due_date`, `subtotal`, `tax_amount`, `total_amount`, `currency`, `document_url`, `notes`, `has_anomalies`, `ai_extracted_data`, `ai_confidence_score`, `created_by`, `vendor_id`, `is_over_budget`, `amount`, origin RLS/policies/indexes/CHECKs/triggers.

`invoices.fiscal_year` remains **later ADD** (`20260611120000`). Do **not** confuse with S1 `invoice_ai_audits.fiscal_year`.

---

## 9. `invoice_status` — Blocker B acknowledgement

**PROVEN:** object kind = PostgreSQL **ENUM**.  
**NOT PROVEN:** exact initial label set. This IA **does not** pretend labels are PROVEN.

**INFERRED WITH EVIDENCE / IMPLEMENTATION ACKNOWLEDGED UNDER PAD-051** — **exact authorized initial labels (and no others):**

| Label | Earliest evidence | Predates ADD VALUE? | Confidence | Required by contemporaneous SQL/app? |
|-------|-------------------|---------------------|------------|--------------------------------------|
| `pending_review` | `bc48068` insert; comment in `20260321054643` | YES (before `ai_extraction_failed` ADD) | HIGH | YES (app insert) |
| `ai_processing` | `bc48068` UI map; `20260321054643` comment | YES | MEDIUM | contemporaneous comment/app |
| `approved` | `bc48068` workflow; `20260409130000` UPDATE | YES | MEDIUM–HIGH | YES if `invoices.status` is enum |
| `paid` | same | YES | MEDIUM–HIGH | YES if `invoices.status` is enum |
| `rejected` | `bc48068` workflow | YES | MEDIUM–HIGH | contemporaneous app |
| `flagged` | `bc48068` workflow | YES | MEDIUM–HIGH | contemporaneous app |

**Exact authorized `CREATE TYPE` label set (order not historically proven; implementer may use this order):**

```
pending_review, ai_processing, approved, paid, rejected, flagged
```

**NOT AUTHORIZED / DEFER:**

| Label | Reason |
|-------|--------|
| `ai_extraction_failed` | later `ALTER TYPE` `20260321053551` |
| `draft_manual` | later `ALTER TYPE` `20260512103000` |
| `pending_upload` | Design LOW / possibly client-only |
| `pending` | Design UNRESOLVED (`20260710120100`) |

No production enum copy. No dummy extra label.

---

## 10. `financial_anomalies`

**First HARD:** `20260327173153` unguarded `ALTER TABLE financial_anomalies` … `procurement_job_id`.

**PROVEN (authorized):** relation exists; column `procurement_job_id` **uuid**. Origin FK **NOT AUTHORIZED** (that migration adds it).

| Field | Disposition |
|-------|-------------|
| `invoice_id` uuid | **ACKNOWLEDGED FOR IMPLEMENTATION** — `20260405120000` `UPDATE … fa.invoice_id`; never ADD COLUMN; required before that UPDATE |
| `property_id` | **NOT AUTHORIZED / DEFER** — later ADD |
| `id` PK | **NOT AUTHORIZED / DEFER** — UNRESOLVED |
| `notes` | **NOT AUTHORIZED / DEFER** — UNRESOLVED |
| RLS / policies / indexes / defaults / CHECK | **NOT AUTHORIZED** |

---

## 11. `invoice_ai_audits` — S1

**First HARD:** `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` — `CREATE TRIGGER … ON public.invoice_ai_audits` + `SELECT` of: `invoice_id`, `property_id`, `risk_score`, `risk_level`, `ai_reasons`, `ai_summary_zh`, `ai_summary_en`, `updated_at`.

**Later CREATE:** `20260711120000_invoice_ai_audit_v1.sql` — **`CREATE TABLE IF NOT EXISTS`**. **DO NOT EDIT. DO NOT claim it ran in April.**

**S1 meaning (authorized):** Reconstruct **only** (1) April SELECT/trigger columns **plus** (2) columns required so unedited July **post-CREATE** statements (`CREATE INDEX IF NOT EXISTS` on `(property_id, fiscal_year)` and on `(status)`) do not fail when CREATE TABLE is skipped. **Not** the full July/current table.

| Column | Classification | Design evidence | Collision role | Type authorized (chronology-preservation from July CREATE body; NOT NULL/DEFAULT/CHECK/FK **NOT** authorized) |
|--------|----------------|-----------------|----------------|------------------------------------------------------------------------------------------------------------------|
| `invoice_id` | PROVEN existence | April SELECT | April HARD | uuid |
| `property_id` | PROVEN existence | April SELECT | April HARD | uuid |
| `risk_score` | PROVEN existence | April SELECT | April HARD | numeric |
| `risk_level` | PROVEN existence | April SELECT; July also indexes it | April HARD | text |
| `ai_reasons` | PROVEN existence | April SELECT | April HARD | jsonb |
| `ai_summary_zh` | PROVEN existence | April SELECT | April HARD | text |
| `ai_summary_en` | PROVEN existence | April SELECT | April HARD | text |
| `updated_at` | PROVEN existence | April SELECT | April HARD | timestamptz |
| `fiscal_year` | INFERRED S1 | July `CREATE INDEX … (property_id, fiscal_year)` | skipped CREATE TABLE | **int** — **ACKNOWLEDGED under S1 only**, not invoices back-projection |
| `status` | INFERRED S1 | July `CREATE INDEX … (status)` | skipped CREATE TABLE | **text** — **ACKNOWLEDGED under S1 only**; **not** `invoice_status` enum |

**NOT AUTHORIZED:** `id` PK, `ai_recommendations`, `model_name`, `created_at`, UNIQUE(`invoice_id`), July FKs, July NOT NULL/DEFAULT/CHECK, `over_budget`, `bypass_approval`, origin RLS/policies/triggers (April trigger remains in `20260409120000`; July RLS/indexes/triggers remain in July file).

S1 is **bounded** to the ten columns above. **STOP → GOVERNANCE** if implementation needs more.

---

## 12. Placement windows

Design §16 — **not invented here.**

**W1**

- After: `20260320044053_create_meeting_voting_system.sql`
- Before: `20260320045054_enhance_dispute_resolution_system.sql`
- Primitives: `public.invoices` (proven + §8 acknowledgements) · `invoice_status` (enum + §9 labels) · `public.financial_anomalies` (proven + `invoice_id`)

**W2**

- After: `20260405120000_multi_tenant_properties.sql`
- Before: `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql`
- Primitives: `public.invoice_ai_audits` S1 stub only

---

## 13. Reconstruction file strategy

**MULTIPLE — exactly two files** (one in W1, one in W2). Two chronology windows; `invoice_ai_audits` must not share W1.

**Maximum file count: 2.** No third reconstruction migration. No application source. No artifact/verifier/guard/package/test edits.

**CREATE ONLY** under `supabase/migrations/`:

- naming: existing 14-digit version prefix + descriptive slug containing `hmd003` (example pattern, **not** a chosen timestamp): `*_hmd003_reconstruct_*.sql`
- **no** overwrite of an existing version
- **no** reorder of existing files
- version **strictly inside** the window (greater than predecessor version, less than successor version)

**Concrete timestamps: NOT chosen.** Implementation **must** select unused versions inside W1/W2 with **fail-closed** collision check (abort if the version exists or is not strictly between bounds).

---

## 14. Existing migration immutability

**ALL** existing historical migrations are **DO NOT EDIT**, including:

- `20260320045054_enhance_dispute_resolution_system.sql`
- `20260315035847_add_meeting_templates_and_attachments.sql`
- `20260711120000_invoice_ai_audit_v1.sql`

No rename, move, comment-out, patch, copy-over, or replacement.

---

## 15. No back-projection

Production/current schema **MUST NOT** be copied backward. Later ADD COLUMN / ADD VALUE remain later, except **S1 `invoice_ai_audits.fiscal_year` and `invoice_ai_audits.status`** authorized **only** under §11 collision rationale.

Listed ADD COLUMN fields in the task (category, file_name, … `invoices.fiscal_year`, accounting_*) remain **NOT AUTHORIZED** on `invoices`.

---

## 16. Constraint boundary

Authorize only: invoices PK on `id`; nothing else listed in Design as UNRESOLVED.

**Not authorized at origin:** extra UNIQUE, origin FKs (except not required), NOT NULL (except PK-implied on `invoices.id`), DEFAULT, CHECK, INDEX, RLS, POLICY, TRIGGER, sequences, generated columns.

April `invoice_ai_audits` trigger is **created by existing** `20260409120000` — do not reconstruct it.

---

## 17. Truthful labeling

Each reconstruction file **must** document (header comments):

```
PAD-051 AUTHORIZED HISTORICAL SCHEMA-ORIGIN RECONSTRUCTION
HMD-003 · E-02-HFSOR-IA
Exact historical DDL unavailable
Minimum evidence-supported reconstruction — not restored original SQL
Not source restoration
```

Must **not** claim: restored historical migration · recovered exact SQL · original SQL · source restoration · fabricated historical authorship.

---

## 18. Application history semantics

Reconstruction files are **new real repository migrations**. If/when later DBA executes them, they record **normally as applied**.

**FORBIDDEN:** fake `schema_migrations` rows; mark unexecuted SQL applied; `migration repair`; pretend hosted DDL had an old timestamped file.

---

## 19. Quarantine

Exactly `20260314195641_add_demo_data.sql` · **COUNT = 1**. HMD-003 is **not** quarantine. Option D remains rejected.

---

## 20. HMD separation

| ID | Status |
|----|--------|
| HMD-001 | **OPEN / DISTINCT** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT** |
| HMD-003 | **OPEN / POLICY SELECTED / IMPLEMENTATION AUTHORIZED / RUNTIME REPLAY VERIFICATION PENDING** |

Do not merge. Do not close.

---

## 21. Authorized future file scope

| Action | Scope |
|--------|--------|
| **CREATE** | At most **2** files in `supabase/migrations/` per §13 |
| **MODIFY** | `docs/implementation/README.md` only if the implementation ledger requires a minimal note |
| **FORBIDDEN** | application source · replay artifact · verifier · guards · package.json/lock · tests · existing migrations |

No new package/extension/runtime helper/build dependency. SQL may use only capabilities already valid in this repository’s historical PostgreSQL/Supabase migrations (`uuid`, `timestamptz`, `numeric`, `jsonb`, `text`, `int`, `CREATE TYPE … AS ENUM`). If an extension add is needed: **STOP → GOVERNANCE**.

---

## 22. Static verification (implementation task)

Allowed: source inspection · git diff/status · migration ordering · grep · SQL lexical/static analysis · `npm run build` if appropriate · BCR `--plan` **only if DB-free**.

**Forbidden:** stateful Supabase · Docker mutation · DB · LOCAL-009 · DB baseline verifier · RU-1.4.

---

## 23. Future completion checklist

A future Completion record (not created now) must verify:

1. only the two authorized reconstruction files created;  
2. no historical migration edited;  
3. W1/W2 placement correct;  
4. no version collision;  
5. `public.invoices` does not exceed §7–§8;  
6. `invoice_status` initial labels **equal exactly** the six authorized labels;  
7. later ADD VALUE labels not in origin;  
8. `financial_anomalies` = relation + `procurement_job_id` + `invoice_id` only;  
9. `invoice_ai_audits` S1 = exactly the ten §11 columns;  
10. July CREATE file untouched;  
11. no claim July CREATE executed in April;  
12. production schema not copied;  
13. unresolved fields omitted;  
14. no unauthorized defaults/nullability/RLS/indexes/FKs;  
15. truthful reconstruction comments;  
16. no fake `schema_migrations` edits in repo;  
17. quarantine count = 1;  
18. HMD-001 unchanged;  
19. HMD-002 unchanged;  
20. HMD-003 remains runtime pending;  
21. no package changes;  
22. static syntax/order checks PASS;  
23. build PASS if run;  
24. no DB/Supabase/Docker;  
25. LOCAL-009 not created;  
26. RU-1.4 not authorized.

---

## 24. Successor Completion path (not created)

```
docs/implementation/E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion.md
```

After Completion: **return to governance** for successor DBA / BCR pin / LOCAL-009. This IA **does not** authorize LOCAL-009.

---

## 25. LOCAL-008 / LOCAL-009

| Item | Status |
|------|--------|
| LOCAL-008 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Retry | **NOT AUTHORIZED** |
| LOCAL-009 | **NOT AUTHORIZED** |

---

## 26. Database / RU / EIR

| Item | Status |
|------|--------|
| Database baseline | **NOT VERIFIED** |
| RU-1.1 / RU-1.2 | **NOT APPLIED** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |
| EIR / Acceptance / Certification | **UNCHANGED / BLOCKED** |

---

## 27. Exact next action

```
NEXT = IMPLEMENT E-02-HFSOR-IA
       REPOSITORY ONLY
```

Consume this IA in a separate implementation task. **Do not implement in this issuance.**

---

**End of document — E-02-HFSOR-IA v1.0 — 2026-08-25**
