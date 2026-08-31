# E-02 — Historical Finance Schema-Origin Reconstruction — Implementation Authorization (Successor)

## HMD-009 Pre-Target Historical Compatibility Reconstruction · `hiring_jobs` / `hiring_candidates`

| Field | Value |
|-------|-------|
| **Document Type** | **Implementation Authorization (Successor)** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-HFSOR-IA-003** |
| **Policy authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md) (**PAD-057** · HMIC-073 – HMIC-084) |
| **Predecessor IAs** | [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization.md) (**E-02-HFSOR-IA** · HMD-003 · **CONSUMED** · **finance schema-origin only; does not cover this target**) · [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-002.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-002.md) (**E-02-HFSOR-IA-002** · HMD-005 · **CONSUMED** · **enum commit-boundary only; does not cover this target**) |
| **Forensic record** | [`E-02-HMD-009-Multi-Tenant-Properties-Hiring-Jobs-Forensic-Investigation.md`](E-02-HMD-009-Multi-Tenant-Properties-Hiring-Jobs-Forensic-Investigation.md) |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-015.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-015.md) · run `local-015-20260829a` |
| **Defect** | **HMD-009** |
| **Status** | **Approved With Conditions — NOT YET CONSUMED** |
| **Authority Level** | Implementation Authorization (repository compatibility reconstruction only) |
| **Effective Date** | 2026-08-30 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-003.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-003.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **Future repository-only reconstruction task · NOT this issuance** |
| **Successor Completion (not created)** | `docs/implementation/E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-003.md` |

> **Authority path finding: YES.** Filename `E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-003.md` is **authority-safe** as the next successor in the existing **reconstruction IA** family (**E-02-HFSOR-IA**). ID **`E-02-HFSOR-IA-003`**. Distinct filename keeps **E-02-HFSOR-IA** (HMD-003) and **E-02-HFSOR-IA-002** (HMD-005) **immutable**. This is **not** a new governance tier, **not** a new PAD, **not** PAD-058, **not** a DBA, **not** a BCR IA, **not** a HMIR restoration IA, **not** a forward-fix authority, **not** a runtime authority, **not** a REA, **not** an EIR, **not** an Implementation Completion.
>
> **Family determination / sequence proof (this issuance, independently verified):** Repository-established reconstruction IA files are exactly two:
>
> 1. `E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization.md` — ID **`E-02-HFSOR-IA`** (unnumbered first member; HMD-003; **CONSUMED**). There is **no** document or ID **`E-02-HFSOR-IA-001`**.
> 2. `E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-002.md` — ID **`E-02-HFSOR-IA-002`** (HMD-005; **CONSUMED**).
>
> Highest issued reconstruction IA is **E-02-HFSOR-IA-002**. **E-02-HFSOR-IA-003** is the next unused identifier. No HFSOR-IA-003 document existed before this issuance. HFSOR-IA-003 was **not reserved**. HFSOR-IA-003 has **not previously been issued or consumed**. No HFSOR-IA-004+ exists or supersedes the sequence. A new family name is **not** invented. **E-02-HMIR-IA** through **E-02-HMIR-IA-005** are forensic source restoration and are **not** this family.
>
> **Defect distinctness:** HMD-009 remains **DISTINCT** from HMD-003 (finance invoices family) and HMD-005 (`user_role.admin` enum). This successor **does not** reopen W1/W2, invoices, `invoice_status`, `financial_anomalies`, or `user_role`. Family reuse follows HFSOR-IA → HFSOR-IA-002 (same operational IA family; file-specific DISTINCT defect).
>
> **Document class:** Bounded **repository compatibility reconstruction** authorization only. This record **does not** create SQL · **does not** create `20260405115900_hmd009_reconstruct_hiring_jobs.sql` · **does not** edit the DROP or target · **does not** apply migrations · **does not** run BCR `--apply` · **does not** issue LOCAL-016 · **does not** authorize RU-1.4.

```
HISTORICAL COMPATIBILITY RECONSTRUCTION IA         = E-02-HFSOR-IA-003
DECISION                                           = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PAD-057                                            = ISSUED / IMMUTABLE
HMIC RANGE                                         = HMIC-073 – HMIC-084
SELECTED POLICY                                    = OPTION B — PRE-TARGET HISTORICAL COMPATIBILITY RECONSTRUCTION
HISTORICAL RECONSTRUCTION ≠ SOURCE RESTORATION     = LOCKED
THIS RECONSTRUCTION DID NOT EXIST HISTORICALLY     = LOCKED
TARGET                                             = 20260405120000_multi_tenant_properties.sql
EARLIER DROP                                       = 20260315010915_create_property_manager_system.sql
AUTHORIZED RECONSTRUCTION                          = supabase/migrations/20260405115900_hmd009_reconstruct_hiring_jobs.sql
RECONSTRUCTION COUNT                               = EXACTLY 1
TABLE COUNT                                        = EXACTLY 2
  public.hiring_jobs
  public.hiring_candidates
RECONSTRUCTION EXECUTED                            = NO
HMD-009                                            = OPEN / DISTINCT /
                                                       ORIGINAL HISTORICAL CLEAN-REPLAY DESIGN DEFECT /
                                                       ORIGINAL CLEAN-REPLAY MISSING PREREQUISITE
                                                       AFTER INTENTIONAL EARLIER DROP /
                                                       OPTION B SELECTED /
                                                       RECONSTRUCTION IMPLEMENTATION AUTHORIZED /
                                                       NOT YET IMPLEMENTED
HMD-003                                            = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                       IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
HMD-005                                            = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                       IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-006                                            = OPEN / SOURCE INTEGRITY RESTORED /
                                                       IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-007                                            = OPEN / SOURCE INTEGRITY RESTORED /
                                                       IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-008                                            = OPEN / SOURCE INTEGRITY RESTORED /
                                                       IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
QUARANTINE                                         = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
LOCAL-015                                          = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-015 RETRY                                    = NOT AUTHORIZED
LOCAL-016                                          = NOT ISSUED
BCR DBA PIN                                        = E-02-DBA-LOCAL-015
BCR ARTIFACT AUTHORITY                             = E-02-BCR-IA-015
BCR EDIT                                           = NOT AUTHORIZED
THIS IA                                            ≠ DBA · ≠ BCR IA · ≠ PAD · ≠ REA · ≠ HMIR
IMPLEMENTATION COMPLETION                          = REQUIRED / NOT ISSUED
```

---

## 1. Pre-issuance gates (this issuance — read-only)

| Condition | Finding |
|-----------|---------|
| PAD-057 ISSUED / IMMUTABLE · Option B · HMIC-073 – HMIC-084 · HMD-009 | **PASS** |
| HMD-009 OPEN / DISTINCT / original-design missing prerequisite / Option B selected / implementation not authorized (pre) | **PASS** |
| No HMD-009 repair performed · reconstruction file absent | **PASS** |
| LOCAL-015 APPLICATION_FAILED / attempts 1 / no retry · evidence `local-015-20260829a` | **PASS** |
| LOCAL-016 not issued | **PASS** |
| CREATE origin `20260314034834_create_strata_schema.sql` / `bc48068` present for both tables | **PASS** |
| Intentional DROP `20260315010915` contains both DROP TABLE statements · **do not edit** | **PASS** |
| Recreate between DROP and target = **NONE** · no alternate schema/name | **PASS** |
| Target HARD-uses both tables (L229 + L334–338) | **PASS** |
| Later hard use `20260405120100` / `20260410120000` · no later DROP | **PASS** |
| Slot `20260405115900` unused · strictly after `20260404120000` · immediately before `20260405120000` | **PASS** |
| Reconstruction IA family = HFSOR · highest issued = **E-02-HFSOR-IA-002 CONSUMED** · next unused = **E-02-HFSOR-IA-003** · no `HFSOR-IA-001` | **PASS** |
| Quarantine count 1 | **PASS** |
| No superseding PAD/IA | **PASS** |
| PAD-057 contract matches this authorization (filename, 2 tables, CREATE TABLE contracts, RLS, prohibitions) | **PASS** |

**STOP does not apply.** This IA may issue.

---

## 2. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-HFSOR-IA-003** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Consumption** | **NOT YET CONSUMED** |
| **Authorized future action** | Create **exactly one** new reconstruction migration at the path in §6, recreating **exactly two** tables per §8–§10 |
| **Not authorized** | Target edit · DROP edit · source restoration · target-guard · original policies · indexes · grants/triggers · `property_id` · data/seed/backfill · forward-fix · quarantine change · LOCAL-015 retry · LOCAL-016 · DB/Supabase/Docker · RU-1.4 |
| **Execution this task** | **NOT PERFORMED** |

HMD-009 **post-issuance:** **OPEN / DISTINCT / ORIGINAL HISTORICAL CLEAN-REPLAY DESIGN DEFECT / OPTION B SELECTED / RECONSTRUCTION IMPLEMENTATION AUTHORIZED / NOT YET IMPLEMENTED / IMPLEMENTATION COMPLETION PENDING / RUNTIME REPLAY VERIFICATION PENDING**. **Not reconstructed. Not complete. Not runtime verified. Not CLOSED.**

---

## 3. Controlling PAD / defect / runtime (not reopened)

```
PAD                    = PAD-057
PAD PATH               = docs/implementation/E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md
HMIC                   = HMIC-073 – HMIC-084
DECISION               = APPROVED WITH CONDITIONS — OPTION B /
                         PRE-TARGET HISTORICAL COMPATIBILITY RECONSTRUCTION /
                         ISSUED / IMMUTABLE
HMD                    = HMD-009
CLASS                  = ORIGINAL HISTORICAL CLEAN-REPLAY DESIGN DEFECT
SUBTYPE                = ORIGINAL CLEAN-REPLAY MISSING PREREQUISITE
                         AFTER INTENTIONAL EARLIER DROP
SOURCE CORRUPTION      = REJECTED
SOURCE RESTORATION     = REJECTED / NOT AUTHORIZED
```

Triggering runtime (immutable; not modified):

```
DBA                    = E-02-DBA-LOCAL-015
evidenceRunId          = local-015-20260829a
LOCAL-015              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
ATTEMPTS               = 1
RETRY                  = NOT AUTHORIZED
TARGET                 = 20260405120000_multi_tenant_properties.sql
FIRST FAILURE          = L229 UPDATE public.hiring_jobs SET property_id = default_id WHERE property_id IS NULL;
ERROR                  = relation "public.hiring_jobs" does not exist
Executed               = 72
Highest applied        = 20260404120000_create_leads.sql
```

Classification of this reconstruction: **GOVERNED HISTORICAL CLEAN-REPLAY COMPATIBILITY RECONSTRUCTION**. It is **not** a claim that the file existed historically.

---

## 4. Historical CREATE proof

```
CREATE PATH       = supabase/migrations/20260314034834_create_strata_schema.sql
TIMESTAMP         = 20260314034834
ORIGIN COMMIT     = bc48068db008d03b3c93d60646169737de7bc363
```

Exact origin structural contracts (quote; implementation must copy these, not invent stubs):

```
CREATE TABLE IF NOT EXISTS hiring_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by uuid REFERENCES profiles(id) NOT NULL,
  title_en text NOT NULL,
  title_zh text,
  description_en text NOT NULL,
  description_zh text,
  probation_months integer DEFAULT 3,
  status hiring_status DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

```
CREATE TABLE IF NOT EXISTS hiring_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES hiring_jobs(id) ON DELETE CASCADE,
  candidate_name text NOT NULL,
  candidate_contact text,
  recommended_by uuid REFERENCES profiles(id),
  council_score numeric CHECK (council_score >= 0 AND council_score <= 100),
  owner_score numeric CHECK (owner_score >= 0 AND owner_score <= 100),
  total_score numeric,
  status candidate_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

Same origin file also contains `ENABLE ROW LEVEL SECURITY` and council-era `CREATE POLICY` statements. **Only ENABLE RLS is authorized** (§11–§12). Policies are **prohibited**.

Same origin file creates:

```
CREATE TYPE hiring_status AS ENUM ('open', 'in_review', 'hired', 'closed');
CREATE TYPE candidate_status AS ENUM ('pending', 'interview', 'hired', 'rejected');
```

Those types were **never dropped**. Reconstruction **must reference** them and **must not recreate** them.

---

## 5. Intentional DROP / missing recreate / later lifespan

```
DROP PATH         = supabase/migrations/20260315010915_create_property_manager_system.sql
DROP STATEMENTS   =
  DROP TABLE IF EXISTS hiring_candidates CASCADE;
  DROP TABLE IF EXISTS hiring_jobs CASCADE;
CLASSIFICATION    = INTENTIONAL RETIRE-AND-REPLACE HISTORICAL DESIGN
DROP EDIT         = NOT AUTHORIZED
```

Between `20260315010915` and `20260405120000`: **NO** `CREATE TABLE` of `hiring_jobs` or `hiring_candidates`. Alternate schema/name: **NONE**.

Target usage (`20260405120000_multi_tenant_properties.sql`):

| Object | Guarded ADD `property_id` | Unguarded DML | Guarded SET NOT NULL |
|--------|---------------------------|---------------|----------------------|
| `hiring_jobs` | L148–150 | **L229 UPDATE** | L406–407 |
| `hiring_candidates` | L152–153 | **L334–338 JOIN/UPDATE** | L409–410 |

Reconstructing only `hiring_jobs` is **insufficient**. Both relations are authorized.

Later hard use (no later DROP):

- `20260405120100_multi_tenant_rls.sql` — unguarded `CREATE POLICY` on both
- `20260410120000_property_members_saas.sql` — unguarded DROP/CREATE tenant policies on both

```
EXPECTED FINAL BASELINE = both relations persist
                          (plus property_id NOT NULL from the target)
```

---

## 6. Authorized reconstruction (exactly one file)

```
AUTHORIZED RECONSTRUCTION PATH =
  supabase/migrations/20260405115900_hmd009_reconstruct_hiring_jobs.sql
AUTHORIZED TIMESTAMP           = 20260405115900
RECONSTRUCTION MIGRATION COUNT = EXACTLY 1
AUTHORIZED TABLE COUNT         = EXACTLY 2
```

**No** second migration · **no** companion cleanup · **no** target replacement · **no** forward-fix · **no** third relation · **no** history manipulation.

**Do not create this file in this issuance task.**

---

## 7. Ordering / collision proof (read-only, this issuance)

Occupied `20260405*` prefixes: `20260405120000` · `20260405120100` only. Occupied `20260405115*` / `20260405119*`: **NONE**. File `20260405115900_hmd009_reconstruct_hiring_jobs.sql`: **ABSENT**.

| Role | Filename |
|------|----------|
| Intentional DROP (immutable) | `20260315010915_create_property_manager_system.sql` |
| Immediate predecessor | `20260404120000_create_leads.sql` |
| **Authorized reconstruction** | `20260405115900_hmd009_reconstruct_hiring_jobs.sql` |
| **HMD-009 target (immutable)** | `20260405120000_multi_tenant_properties.sql` |
| Next multi-tenant RLS | `20260405120100_multi_tenant_rls.sql` |

```
ORDERING = STRICTLY BETWEEN / COLLISION FREE
20260315010915  <  20260404120000  <  20260405115900  <  20260405120000  <  20260405120100
```

Timestamp **20260405115900** is unused. Lexicographic BCR filename order matches numeric timestamp order. **No alternate timestamp is authorized** unless governance reopens scope. **No historical file is renumbered.**

---

## 8. Authorized objects

Authorize **exactly**:

1. `public.hiring_jobs`
2. `public.hiring_candidates`

Create **hiring_jobs first**, then **hiring_candidates** (FK `job_id` depends on jobs).

No third relation. No enums. No views. No functions.

---

## 9. `hiring_jobs` structural contract (authorized)

Future implementation must recreate `hiring_jobs` from the quoted origin CREATE TABLE in §4.

| Column | Contract |
|--------|----------|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `posted_by` | `uuid REFERENCES profiles(id) NOT NULL` |
| `title_en` | `text NOT NULL` |
| `title_zh` | `text` |
| `description_en` | `text NOT NULL` |
| `description_zh` | `text` |
| `probation_months` | `integer DEFAULT 3` |
| `status` | `hiring_status DEFAULT 'open'` |
| `created_at` | `timestamptz DEFAULT now()` |
| `updated_at` | `timestamptz DEFAULT now()` |

```
property_id IN THIS FILE = PROHIBITED
```

The target historically adds `property_id`.

---

## 10. `hiring_candidates` structural contract (authorized)

Future implementation must recreate `hiring_candidates` from the quoted origin CREATE TABLE in §4.

| Column | Contract |
|--------|----------|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `job_id` | `uuid REFERENCES hiring_jobs(id) ON DELETE CASCADE` (nullable; origin has no `NOT NULL`) |
| `candidate_name` | `text NOT NULL` |
| `candidate_contact` | `text` |
| `recommended_by` | `uuid REFERENCES profiles(id)` |
| `council_score` | `numeric CHECK (council_score >= 0 AND council_score <= 100)` |
| `owner_score` | `numeric CHECK (owner_score >= 0 AND owner_score <= 100)` |
| `total_score` | `numeric` |
| `status` | `candidate_status DEFAULT 'pending'` |
| `created_at` | `timestamptz DEFAULT now()` |
| `updated_at` | `timestamptz DEFAULT now()` |

Exact historically proven score columns and CHECK expressions (do not paraphrase):

```
  council_score numeric CHECK (council_score >= 0 AND council_score <= 100),
  owner_score numeric CHECK (owner_score >= 0 AND owner_score <= 100),
  total_score numeric,
```

```
property_id IN THIS FILE = PROHIBITED
```

---

## 11. Constraint / enum / RLS / prohibition locks

```
PK                         = REQUIRED (both id columns)
FK                         = REQUIRED (posted_by, job_id ON DELETE CASCADE, recommended_by)
CHECK                      = REQUIRED (exact origin score CHECKs only)
DEFAULTS / NULLABILITY     = REQUIRED as origin
ADDITIONAL CONSTRAINTS     = NOT AUTHORIZED
ENUMS hiring_status /
      candidate_status     = DO NOT RECREATE / REFERENCE ONLY
ENABLE ROW LEVEL SECURITY  = REQUIRED ON BOTH TABLES
ORIGINAL MARCH 14 POLICIES = PROHIBITED
INDEXES                    = PROHIBITED
  including idx_hiring_jobs_posted_by
            idx_hiring_candidates_job_id
            idx_hiring_candidates_recommended_by
GRANTS / TRIGGERS /
  FUNCTIONS / COMMENTS /
  SEEDS / UNRELATED OBJECTS = PROHIBITED
DATA / BACKFILL /
  SYNTHETIC ROWS           = NOT AUTHORIZED
STRUCTURE                  = ONLY
TABLES AFTER CREATE        = EMPTY
```

Original policy names **must not** be recreated, including:

- `"All authenticated users can view hiring jobs"`
- `"Council can create hiring jobs"`
- `"Council can update hiring jobs"`
- `"All authenticated users can view candidates"`
- `"Owners can recommend candidates"`
- `"Council can update candidates"`

Reason: those policies belong to the retired pre-property-manager access design. Later `20260405120100` installs tenant policies.

---

## 12. Expected clean-replay sequence after implementation

1. Reconstruction creates original table contracts and enables RLS (no `property_id`, no policies, no data).
2. Target guarded ADD adds `property_id` to both tables.
3. Target UPDATEs empty sets successfully (L229, L334–338).
4. Target SET NOT NULL succeeds.

---

## 13. Rejected remediation classes

```
SOURCE RESTORATION OF TARGET     = REJECTED
TARGET-GUARD (skip / wrap UPDATE)= REJECTED
FORWARD FIX AFTER TARGET         = REJECTED
EDIT / REVERSE MARCH 15 DROP     = REJECTED
QUARANTINE TARGET OR RECON       = REJECTED
FAKE HISTORY / MARK-APPLIED      = REJECTED
```

```
GLOBAL QUARANTINE = EXACTLY 20260314195641_add_demo_data.sql
COUNT             = 1
```

Do **not** quarantine `20260405120000`, `20260405115900`, or hiring migrations.

---

## 14. Original target and DROP immutability

```
supabase/migrations/20260405120000_multi_tenant_properties.sql
  = IMMUTABLE / DO NOT EDIT
supabase/migrations/20260315010915_create_property_manager_system.sql
  = IMMUTABLE / DO NOT EDIT
```

---

## 15. Future implementation pre-gates (before writing SQL)

Implementation **must** re-verify:

- PAD-057 still ISSUED / IMMUTABLE;
- this IA ISSUED and **NOT YET CONSUMED**;
- future filename still **absent**;
- timestamp still collision-free;
- predecessor/successor ordering still exact;
- origin CREATE TABLE contracts still available and match §4;
- DROP file unchanged (both DROP TABLE statements present);
- target unchanged (L229 / L334–338 still unguarded);
- quarantine remains count 1;
- no superseding authority.

Any mismatch: **IMPLEMENTATION BLOCKED · IA NOT CONSUMED · STOP → GOVERNANCE.** No repair.

---

## 16. Future implementation write scope

Intentional writes **only**:

1. the exact authorized reconstruction migration (§6);
2. `docs/implementation/README.md` — minimal implementation ledger.

No historical migration edit. No BCR edit. No verifier/guard/tooling/app edit.

**Default model:** implementation first → **separate** Completion afterward. Do **not** issue Completion in the implementation task unless that later task is the Completion issuance.

---

## 17. Future SQL source-of-truth rule

Future SQL **must** be derived directly from the proven historical CREATE TABLE definitions quoted in §4.

Do **not** hand-invent an equivalent schema or a minimal stub.

Copy exact column / PK / FK / CHECK / default / nullability contracts. Intentionally exclude: policies, indexes, `property_id`, enum CREATE TYPE, grants, triggers, seeds, unrelated original objects.

`CREATE TABLE IF NOT EXISTS` wording may follow origin. Schema qualification `public.` is permitted.

---

## 18. Future static certification

After creating the file, implementation must prove:

```
NEW MIGRATION FILE COUNT     = 1
AUTHORIZED PATH MATCH        = YES
AUTHORIZED TIMESTAMP MATCH   = YES
TABLES RECONSTRUCTED         = 2
HIRING_JOBS CONTRACT         = exact historical structural source
HIRING_CANDIDATES CONTRACT   = exact historical structural source
PK / FK / CHECK / DEFAULTS /
  NULLABILITY                = origin-exact
ENUM CREATE TYPE             = NONE
RLS ENABLED                  = YES / BOTH
ORIGINAL POLICIES            = NONE
INDEXES                      = NONE
PROPERTY_ID                  = ABSENT from reconstruction
DATA                         = NONE
UNAUTHORIZED OBJECTS         = NONE
TARGET MIGRATION EDIT        = NONE
DROP MIGRATION EDIT          = NONE
BCR EDIT                     = NONE
```

Ordering under BCR filename sort:

```
20260404120000  <  HMD-009 RECONSTRUCTION  <  20260405120000 TARGET
```

Reconstruction **must not** be quarantined.

---

## 19. Future DB-free plan / build

Authorized after successful static reconstruction:

```
existing BCR --plan     (DB-free only)
npm run build           (require PASS)
```

`--plan` must be `PLAN_OK` with `failures = []`. **No `--apply`.**

Current BCR pins (do **not** retarget):

```
EXPECTED_DBA_AUTHORIZATION_ID = E-02-DBA-LOCAL-015
ARTIFACT_AUTHORIZATION_ID     = E-02-BCR-IA-015
```

Plan must prove `20260405115900_hmd009_reconstruct_hiring_jobs.sql` is executable **after** `20260404120000…` and **immediately before** `20260405120000_multi_tenant_properties.sql`.

Record plan states for: HMD-009 reconstruction · HMD-009 target · HMD-003 W2 · April HARD · July S1 · quarantine migration. **Do not** promote runtime states from plan evidence.

Do **not** hard-code discovered/executable counts as permanent truth. Adding one migration is expected to change counts by +1; **report actual values**.

---

## 20. No runtime authority

```
DB EXECUTION                         = NOT AUTHORIZED
STATEFUL SUPABASE                    = NOT AUTHORIZED
DOCKER MUTATION                      = NOT AUTHORIZED
LOCAL-015 RETRY                      = NOT AUTHORIZED
LOCAL-016                            = NOT ISSUED
E02_RUNTIME_EXECUTION_AUTHORIZED     = UNSET / FALSE
RU-1.4                               = RUNTIME NOT AUTHORIZED
```

---

## 21. IA consumption rule

This IA becomes **CONSUMED** only if **all** hold:

1. exact authorized future filename created;
2. exactly one new migration;
3. exact ordering;
4. exactly two tables;
5. historically sourced table contracts (§4 / §9 / §10);
6. required PK / FK / CHECK / default / nullability;
7. ENABLE RLS on both;
8. no original policies;
9. no indexes;
10. no `property_id`;
11. no data;
12. no historical migration edits;
13. no BCR edits;
14. DB-free `--plan` `PLAN_OK`;
15. build PASS;
16. no runtime.

If any gate fails: **IA = NOT CONSUMED · IMPLEMENTATION = NOT CERTIFIED · STOP → GOVERNANCE.**

---

## 22. Successor Completion

```
IMPLEMENTATION COMPLETION = REQUIRED / NOT ISSUED
```

Reserved family path (not created now):

`docs/implementation/E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-003.md`

Even after successful reconstruction and IA consumption:

```
HMD-009 = RECONSTRUCTION IMPLEMENTED /
          IMPLEMENTATION COMPLETION PENDING /
          RUNTIME REPLAY VERIFICATION PENDING
```

A separate HFSOR Implementation Completion must follow. **Do not issue it in the implementation task unless that later task is Completion issuance.**

Only after Completion may successor BCR/DBA runtime governance be considered. **LOCAL-016 cannot bypass Completion.**

---

## 23. HMD / LOCAL / BCR / baseline locks

| ID | Status |
|----|--------|
| **HMD-003** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |
| **HMD-005** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** |
| **HMD-006** | **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** |
| **HMD-007** | **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** |
| **HMD-008** | **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** |
| **HMD-009** | **IMPLEMENTATION AUTHORIZED / NOT YET IMPLEMENTED** |

```
HMD-003 W2 / APRIL HARD / JULY S1 = NOT REACHED / NOT APPLIED
LOCAL-015                          = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-015 ATTEMPTS                 = 1
LOCAL-015 RETRY                    = NOT AUTHORIZED
LOCAL-016                          = NOT ISSUED
BCR DBA PIN                        = E-02-DBA-LOCAL-015
BCR ARTIFACT AUTHORITY             = E-02-BCR-IA-015
BCR EDIT                           = NOT AUTHORIZED
DATABASE BASELINE VERIFIED         = NO
RU-1.1                             = REPOSITORY IMPLEMENTED / DB NOT APPLIED
RU-1.2                             = REPOSITORY IMPLEMENTED / DB NOT APPLIED / RUNTIME NOT VERIFIED
RU-1.4                             = RUNTIME NOT AUTHORIZED
EIR / ACCEPTANCE / CERTIFICATION   = NONE / BLOCKED / NOT ISSUED
RUNTIME COMMITTED                  = NOT CERTIFIED
FINAL COMMIT PATH                  = BLOCKED
```

This IA **does not** revive LOCAL-015.

---

## 24. Future runtime proof (not this IA)

A later separately authorized replay must prove:

```
RECONSTRUCTION 20260405115900…     = REACHED / APPLIED
TARGET 20260405120000…             = REACHED / APPLIED
PRIOR ERROR (relation "public.hiring_jobs" does not exist)
                                   = NOT REPRODUCED
```

Repository implementation does **not** satisfy runtime verification.

---

## 25. Exact next action

```
NEXT = IMPLEMENT EXACTLY ONE HMD-009 COMPATIBILITY RECONSTRUCTION MIGRATION
       UNDER E-02-HFSOR-IA-003
       (REPOSITORY ONLY)
```

That next task may create **only** the authorized migration plus a minimal README update. It **must** run DB-free `--plan` and `npm run build`. It **must not** execute LOCAL-016 or any database apply.

---

## 26. Lock

```
E-02-HFSOR-IA-003                                  = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PAD-057                                            = ISSUED / IMMUTABLE / OPTION B
AUTHORIZED RECONSTRUCTION                          = supabase/migrations/20260405115900_hmd009_reconstruct_hiring_jobs.sql
RECONSTRUCTION COUNT                               = EXACTLY 1
TABLE COUNT                                        = EXACTLY 2
RECONSTRUCTION CREATED                             = NO
TARGET                                             = IMMUTABLE / DO NOT EDIT
DROP                                               = IMMUTABLE / DO NOT EDIT
LOCAL-016                                          = NOT ISSUED
NEXT                                               = IMPLEMENT HMD-009 RECONSTRUCTION / REPOSITORY ONLY
EXECUTABLE WORK THIS TASK                          = NONE
```

---

**End of document — E-02-HFSOR-IA-003 · HMD-009 · v1.0 — 2026-08-30**
