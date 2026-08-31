# E-02 Program Authority Decision — Historical Migration Integrity / Compatibility (Successor)

## Pre-Target Historical Compatibility Reconstruction · HMD-009 · `public.hiring_jobs`

| Field | Value |
|-------|-------|
| **Document Type** | **Program Authority Decision (Supplement)** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Parent Authority** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) v1.0 (PAD-001 – PAD-010) |
| **Direct Predecessor Supplement** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md) (**PAD-056** · HMIC-061 – HMIC-072 · HMD-008) |
| **Prior Predecessor Supplements** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md) (**PAD-055** · HMD-007) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md) (**PAD-054** · HMD-006) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md) (**PAD-053** · HMD-005) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md) (**PAD-052** · HMD-004) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) (PAD-039 – PAD-050 · HMD-002) · [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) (PAD-051 · HMD-003) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038 · HMD-001) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025) |
| **Forensic record** | [`E-02-HMD-009-Multi-Tenant-Properties-Hiring-Jobs-Forensic-Investigation.md`](E-02-HMD-009-Multi-Tenant-Properties-Hiring-Jobs-Forensic-Investigation.md) |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-015.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-015.md) · run `local-015-20260829a` |
| **Supplement ID** | **PAD-057** |
| **Authority Question Register** | **HMIC-073 – HMIC-084** |
| **Status** | **APPROVED WITH CONDITIONS — OPTION B (FILE-SPECIFIC SUCCESSOR)** |
| **Selected Policy** | **PRE-TARGET HISTORICAL COMPATIBILITY RECONSTRUCTION** |
| **Defect** | **HMD-009** |
| **Authority Level** | Program Authority |
| **Effective Date** | 2026-08-30 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **NO** |

> **Authority path finding: YES.** Filename `E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md` is **authority-safe** as the next successor in the existing **HMIC** decision family (`Decision.md` · `Decision-002.md` · `Decision-003.md` · `Decision-004.md` · `Decision-005.md` · `Decision-006.md` · **this Decision-007**). Distinct filename keeps PAD-039 – PAD-050, **PAD-052**, **PAD-053**, **PAD-054**, **PAD-055**, and **PAD-056** **immutable**. This is **not** a new governance tier. PAD identifiers are **not** CS/FD registry numbers.
>
> Sequence: Parent PAD-001 – PAD-010 · DAA PAD-011 – PAD-025 · HMBC PAD-026 – PAD-038 · HMIC PAD-039 – PAD-050 · HFSO PAD-051 · HMIC successor PAD-052 · HMIC successor PAD-053 · HMIC successor PAD-054 · HMIC successor PAD-055 · HMIC successor PAD-056 · **this supplement PAD-057**. Highest previously allocated PAD is **PAD-056**. **PAD-057 is the next unused identifier.** **PAD-057 did not already exist. PAD-057 was not reserved. PAD-057 has not previously been issued.** Mentions of “PAD-057 not issued / not allocated” in earlier records are **locks**, not reservations. **No PAD-058+ supersedes the sequence.** **PAD-058+ is not allocated.**
>
> HMIC subsequence: HMIC-001 – HMIC-012 (PAD-039 – PAD-050) · HMIC-013 – HMIC-024 (PAD-052) · HMIC-025 – HMIC-036 (PAD-053) · HMIC-037 – HMIC-048 (PAD-054) · HMIC-049 – HMIC-060 (PAD-055) · HMIC-061 – HMIC-072 (PAD-056) · **this register HMIC-073 – HMIC-084**. Highest previously allocated HMIC is **HMIC-072**. **HMIC-073 – HMIC-084 is the next unused 12-clause range.** No HMIC-073+ existed before this issuance.
>
> **Why a new PAD is required (not reflexive):** PAD-056 / HMD-008 is **exact historical source restoration** of a corrupted notifications trigger. HMD-009’s failing `hiring_jobs` SQL is **already equal to target origin**. PAD-039 / `E-02-HMIR-IA` through `E-02-HMIR-IA-005` therefore **cannot** restore a “corrected origin.” PAD-051 reconstruction is **finance schema-origin** (HMD-003 invoices family) and **does not** cover `hiring_jobs`. PAD-053 reconstruction is **enum commit-boundary** (HMD-005 / `user_role.admin`) and **does not** cover this relation. PAD-032 still requires **future authority** before historical-set mutation. A file-specific successor PAD is required to allocate remediation policy for **HMD-009**.
>
> **Why this is not a new class of fake history:** The March 15 DROP remains **immutable** and remains the historical retirement of the March 14 tables. The future reconstruction is a **governed replay compatibility layer** placed **after** that DROP, not a claim that such a file existed historically, and not mark-as-applied. The April 5+ historical series already assumed the relations still existed.

> **Scope lock:** Establishes **Option B — pre-target historical compatibility reconstruction** for the LOCAL-015 first failure at `20260405120000_multi_tenant_properties.sql` / `public.hiring_jobs`, including the same-family object `public.hiring_candidates` dropped in the same March 15 file and HARD-used later in the same target. This record **does not** write SQL · **does not** create the reconstruction file · **does not** edit the target · **does not** edit the March 15 DROP · **does not** issue Implementation Authorization · **does not** retry LOCAL-015 · **does not** create LOCAL-016 · **does not** expand quarantine · **does not** modify BCR/guard/verifier · **does not** run database/Supabase/Docker · **does not** authorize RU-1.4 · **does not** reclassify EIR / Acceptance / Certification.

```
HISTORICAL MIGRATION INTEGRITY / COMPATIBILITY AUTHORITY-007 = ESTABLISHED (THIS SUPPLEMENT)
DECISION                                                     = APPROVED WITH CONDITIONS — OPTION B
SELECTED POLICY                                              = PRE-TARGET HISTORICAL COMPATIBILITY RECONSTRUCTION
REMEDIATION MODEL                                            = ONE NEW PRE-TARGET RECONSTRUCTION MIGRATION
                                                               + IMMUTABLE ORIGINAL TARGET
                                                               + IMMUTABLE EARLIER DROP
SOURCE CORRUPTION OF FAILING SQL                             = REJECTED
CURRENT EXECUTABLE HIRING_JOBS SQL == TARGET ORIGIN          = YES
TARGET ORIGIN COMMIT                                         = fb0094239d74cc4466853cc1cfcb906164d0fb89
TARGET ORIGIN BLOB                                           = b8c2b851d41d2218e90acba38403288cec5e28c9
CURRENT TARGET BLOB                                          = 4bc119833071125695eb393844d7e8335e952154
CURRENT TARGET WORKTREE                                      = CLEAN vs HEAD
EXACT HISTORICAL SOURCE RESTORATION                          = NOT INDICATED / REJECTED AS THIS REMEDY
TARGET-GUARD / TARGET SOURCE MODIFICATION                    = REJECTED
FORWARD-FIX                                                  = REJECTED / INSUFFICIENT FOR CLEAN REPLAY
QUARANTINE / SKIP                                            = NOT AUTHORIZED / REJECTED
EDIT EARLIER DROP                                            = REJECTED
FAKE HISTORY / REPAIR-AS-APPLIED                             = REJECTED
HMD-009                                                      = OPEN / DISTINCT /
                                                               ORIGINAL HISTORICAL CLEAN-REPLAY DESIGN DEFECT /
                                                               ORIGINAL CLEAN-REPLAY MISSING PREREQUISITE
                                                               AFTER INTENTIONAL EARLIER DROP /
                                                               PRE-TARGET RECONSTRUCTION SELECTED /
                                                               IMPLEMENTATION NOT AUTHORIZED YET
TARGET                                                       = 20260405120000_multi_tenant_properties.sql
ORIGINAL TARGET                                              = IMMUTABLE / DO NOT EDIT
EARLIER DROP                                                 = 20260315010915_create_property_manager_system.sql
                                                               IMMUTABLE / DO NOT EDIT
FUTURE RECONSTRUCTION COUNT                                  = EXACTLY 1
FUTURE RECONSTRUCTION CREATED                                = NO
FUTURE RECONSTRUCTION FILENAME                               = 20260405115900_hmd009_reconstruct_hiring_jobs.sql
HMD-001                                                      = OPEN / DISTINCT
HMD-002                                                      = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT
HMD-003                                                      = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                               IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
HMD-004                                                      = SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED / DISTINCT
HMD-005                                                      = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                               IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-006                                                      = OPEN / SOURCE INTEGRITY RESTORED /
                                                               IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED / DISTINCT
HMD-007                                                      = OPEN / SOURCE INTEGRITY RESTORED /
                                                               IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED / DISTINCT
HMD-008                                                      = OPEN / SOURCE INTEGRITY RESTORED /
                                                               IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED / DISTINCT
EXISTING QUARANTINE                                          = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINE COUNT                                             = 1
LOCAL-015                                                    = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-015 ATTEMPTS                                           = 1
LOCAL-015 RETRY                                              = NOT AUTHORIZED
LOCAL-016                                                    = NOT ISSUED
BCR EDIT                                                     = NOT AUTHORIZED
RUNTIME                                                      = NOT AUTHORIZED
RECONSTRUCTION EXECUTED                                      = NO (POLICY ONLY)
THIS PAD                                                     ≠ IMPLEMENTATION AUTHORIZATION
THIS PAD                                                     ≠ DATABASE APPLICATION AUTHORIZATION
THIS PAD                                                     ≠ PRODUCTION DEPLOYMENT AUTHORIZATION
PAD-058+                                                     = NOT ALLOCATED
```

---

## 1. Authority / provenance

| Record | Role |
|--------|------|
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) | Parent — PAD-001 – PAD-010 |
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | PAD-026 – PAD-038 · DATA_ONLY quarantine · **HMD register (PAD-032)** |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) | PAD-039 – PAD-050 · HMD-002 restoration class |
| [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) | PAD-051 · HMD-003 reconstruction class (**finance schema-origin**; not this file) |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md) | PAD-053 · HMD-005 **Option B reconstruction class precedent** (enum; not this relation) |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md) | **PAD-056 ISSUED / IMMUTABLE** · HMD-008 exact source restoration |
| [`E-02-HMD-009-Multi-Tenant-Properties-Hiring-Jobs-Forensic-Investigation.md`](E-02-HMD-009-Multi-Tenant-Properties-Hiring-Jobs-Forensic-Investigation.md) | HMD-009 forensic facts — consumed as **immutable classification**; lifecycle **reconfirmed** from repository |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-015.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-015.md) | LOCAL-015 **APPLICATION_FAILED** · evidence **immutable** · run `local-015-20260829a` |
| [`tests/e02/evidence/local-015-20260829a/bcr-replay-manifest.json`](../../tests/e02/evidence/local-015-20260829a/bcr-replay-manifest.json) | Manifest `result=APPLICATION_FAILED` · executed **72** · failure string as below |

**MANDATORY STOP does not apply.** Authority sequence is unambiguous. Forensic hashes match. Target identity matches. Lifecycle / pre-state / remediation scope are established. Authority supports issuance of PAD-057.

---

## 2. Pre-issuance gates (this issuance — read-only)

| ID | Check | Result |
|----|--------|--------|
| A. PAD sequence | Highest issued HMIC Decision = **Decision-006 / PAD-056 / HMIC-061 – HMIC-072**. Decision-007 **absent**. PAD-057 document **absent**. PAD-057 **not reserved**. | **PASS** |
| B. Next unused IDs | PAD-057 · Decision-007 · HMIC-073 – HMIC-084 | **PASS** |
| C. HMD-009 identity | **OPEN / DISTINCT / FORENSIC INVESTIGATION COMPLETE**. No prior repair PAD/IA/Completion. Not merged into HMD-001–008. | **PASS** |
| D. LOCAL-015 immutability | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** · attempts **1** · retry **NOT AUTHORIZED** · run `local-015-20260829a` · executed **72** · highest applied `20260404120000_create_leads.sql` · first failing `20260405120000_multi_tenant_properties.sql` index **73** · error `relation "public.hiring_jobs" does not exist` | **PASS** |
| E. Target identity | Current blob `4bc119833071125695eb393844d7e8335e952154` = HEAD · worktree **CLEAN** · origin `fb009423` blob `b8c2b851d41d2218e90acba38403288cec5e28c9` · CURRENT ≠ origin only by `8c30eb2` comment `→` → `?` + four trailing LF blanks · failing hiring_jobs SQL **unchanged from origin** | **PASS** |
| F. Failure construct | Guarded ADD L148–150 skipped when absent; unguarded L229 UPDATE inside `DO $c$` (starts ~L74) raises missing relation | **PASS** |
| G. Repair authority exists? | **NO** | **PASS** |
| H. Later PAD reserved? | **NO** | **PASS** |

---

## 3. LOCAL-015 evidence lock

```
E-02-DBA-LOCAL-015              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
ATTEMPTS                        = 1
RETRY                           = NOT AUTHORIZED
evidenceRunId                   = local-015-20260829a
Executed migration count        = 72
Highest applied                 = 20260404120000_create_leads.sql  (index 72)
First failing                   = 20260405120000_multi_tenant_properties.sql
First failing executable index  = 73
Exact error                     = relation "public.hiring_jobs" does not exist
Preserve / handoff              = NOT REACHED
Baseline verifier               = NOT RUN
DATABASE BASELINE VERIFIED      = NO
```

This issuance **does not** alter LOCAL-015 evidence or the replay manifest.

---

## 4. Target identity and source-integrity rejection

```
TARGET PATH                     = supabase/migrations/20260405120000_multi_tenant_properties.sql
CURRENT BLOB                    = 4bc119833071125695eb393844d7e8335e952154
WORKTREE vs HEAD                = CLEAN
TARGET ORIGIN COMMIT            = fb0094239d74cc4466853cc1cfcb906164d0fb89
TARGET ORIGIN BLOB              = b8c2b851d41d2218e90acba38403288cec5e28c9
FAILING STATEMENT               = L229  UPDATE public.hiring_jobs SET property_id = default_id WHERE property_id IS NULL;
HIRING_JOBS SQL vs ORIGIN       = UNCHANGED
NON-CAUSAL CURRENT vs ORIGIN    = comment → → ? ; four trailing LF blank lines (8c30eb2)
```

```
TARGET SOURCE RESTORATION       = NOT INDICATED / REJECTED AS THIS REMEDY
```

Restoring the origin comment/`→` does **not** create `public.hiring_jobs`. The failing DML is original design.

---

## 5. Failure construct

Inside `DO $c$` beginning around L74:

| Lines | Object | Guarded? | Kind |
|-------|--------|----------|------|
| 148–150 | `hiring_jobs` `ADD COLUMN property_id` | **YES** | DDL |
| 152–153 | `hiring_candidates` `ADD COLUMN property_id` | **YES** | DDL |
| **229** | `UPDATE public.hiring_jobs …` | **NO** | DML — **first fail** |
| 334–337 | `UPDATE public.hiring_candidates … FROM public.hiring_jobs` | **NO** | DML |
| 338 | `UPDATE public.hiring_candidates …` | **NO** | DML |
| 406–410 | `ALTER … property_id SET NOT NULL` | **YES** | DDL |

When `public.hiring_jobs` is absent: guarded ADD is skipped; no relation is recreated; L229 executes; PostgreSQL raises `relation "public.hiring_jobs" does not exist`. Reconstructing **only** `hiring_jobs` would pass L229 and fail next at L334 on `hiring_candidates`. Both tables were dropped together and are HARD-used together. They are **one bounded family** under HMD-009. **HMD-010 is not allocated.**

---

## 6. Historical lifecycle of `public.hiring_jobs`

Reconfirmed from repository migrations (not only the forensic summary).

### 6.1 CREATE origin

```
PATH        = supabase/migrations/20260314034834_create_strata_schema.sql
TIMESTAMP   = 20260314034834
EXECUTABLE  = index 1
ORIGIN COMMIT = bc48068db008d03b3c93d60646169737de7bc363
PRESENT     = YES
```

Same file also creates:

- `CREATE TYPE hiring_status AS ENUM ('open', 'in_review', 'hired', 'closed');`
- `CREATE TYPE candidate_status AS ENUM ('pending', 'interview', 'hired', 'rejected');`
- `CREATE TABLE IF NOT EXISTS hiring_jobs` (L513–524)
- `CREATE TABLE IF NOT EXISTS hiring_candidates` (L563–575)

**Enums are not later dropped.** `DROP TYPE` for these names: **NONE**.

### 6.2 Original CREATE TABLE shape (`hiring_jobs`)

| Column | Type / constraint |
|--------|-------------------|
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

Surrounding (same file; **not** required for target DML): `ENABLE ROW LEVEL SECURITY`; three council-era policies; later indexes in `20260314062844` (`idx_hiring_jobs_posted_by`) and `idx_hiring_candidates_job_id` in the CREATE file. Policy rewrite in `20260314062921` and `20260314211043` (both **before** the DROP).

### 6.3 Original CREATE TABLE shape (`hiring_candidates`)

| Column | Type / constraint |
|--------|-------------------|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `job_id` | `uuid REFERENCES hiring_jobs(id) ON DELETE CASCADE` (nullable) |
| `candidate_name` | `text NOT NULL` |
| `candidate_contact` | `text` |
| `recommended_by` | `uuid REFERENCES profiles(id)` |
| `council_score` | `numeric CHECK (council_score >= 0 AND council_score <= 100)` |
| `owner_score` | `numeric CHECK (owner_score >= 0 AND owner_score <= 100)` |
| `total_score` | `numeric` |
| `status` | `candidate_status DEFAULT 'pending'` |
| `created_at` | `timestamptz DEFAULT now()` |
| `updated_at` | `timestamptz DEFAULT now()` |

### 6.4 Intentional DROP

```
PATH          = supabase/migrations/20260315010915_create_property_manager_system.sql
TIMESTAMP     = 20260315010915
EXECUTABLE    = index 13
ORIGIN COMMIT = bc48068db008d03b3c93d60646169737de7bc363
ORIGIN BLOB   = aa8ed2c35276f2b43d0d80f6de3c6a243e26f238
CURRENT BLOB  = 2f574424646abd0ff0c1cb435c7f07b35c2438dd
LAST COMMIT   = 8c30eb2f657847dc0767201149190eef8d610475  (trailing blanks only; DROP SQL unchanged)
```

Exact statements:

```
DROP TABLE IF EXISTS hiring_candidates CASCADE;
DROP TABLE IF EXISTS hiring_jobs CASCADE;
```

Header rationale: “Transform hiring system into comprehensive property manager management system” · “Drop old hiring tables (hiring_jobs, hiring_candidates)” · create `property_managers` and related staff tables · add `user_role` value `manager`.

```
DROP RATIONALE = INTENTIONAL RETIRE-AND-REPLACE
                 (hiring table family → property_managers / staff model)
```

The DROP is **intentional historical design**. It is **not** source corruption.

### 6.5 No recreate; no alternate name

Between `20260315010915` and `20260405120000`:

```
RECREATE hiring_jobs / hiring_candidates = NONE
ALTERNATE SCHEMA / NAME                  = NONE
```

Quarantined `20260314195641_add_demo_data.sql` only **INSERT**s; it sorts **before** the DROP; it does not CREATE the tables. Quarantine interaction: **NO**.

---

## 7. Why the April target still expects the tables

`fb009423` (2026-04-06) authored unguarded backfill assuming `hiring_jobs` / `hiring_candidates` still exist. Later historical migrations continue that assumption:

- `20260405120100_multi_tenant_rls.sql` — drop-policy loop is `to_regclass`-guarded; then **unguarded** `CREATE POLICY "hj_all_tenant"` / `"hc_all_tenant"` using `property_id`.
- `20260410120000_property_members_saas.sql` — **unguarded** `DROP POLICY IF EXISTS` / `CREATE POLICY` on both tables (`DROP POLICY IF EXISTS` still requires the **table** to exist).
- No later `DROP TABLE` of either relation.
- `src/pages/Hiring.tsx` (from `bc48068`, still live) reads/writes both tables and `.eq('property_id', …)`.

March 15 retired the tables. The April+ series **re-assumed** them as a live multi-tenant feature. That later historical series is the governing truth for whether clean replay must have the relations. Recreating the tables is **not** a claim that the March 15 DROP was accidental.

---

## 8. Post-target usage and final-schema implications

| Later file | Usage | Later DROP? |
|------------|-------|-------------|
| `20260405120100_multi_tenant_rls.sql` | unguarded CREATE POLICY on both; expressions use `property_id` | **NO** |
| `20260410120000_property_members_saas.sql` | unguarded DROP/CREATE tenant policies on both | **NO** |
| May–September executable migrations | **NONE** | **NO** |

```
LATER DROP / CANONICAL REPLACEMENT TABLE = NONE
EXPECTED FINAL hiring_jobs STATE         = RELATION REMAINS IN BASELINE
                                           (plus property_id NOT NULL from target)
RECONSTRUCTION LIFESPAN                  = PERSISTENT THROUGH FINAL BASELINE
                                           (matches later migrations and Hiring.tsx)
```

A one-column stub would let L229 pass but would **invent** a long-lived schema that later app inserts (`posted_by`, `title_en`, `description_en`, scores, `job_id`, …) cannot use. Because reconstruction is persistent, the CREATE TABLE column contract must be the **historical** one, not a placeholder.

`20260405120100` does **not** `ENABLE ROW LEVEL SECURITY` on these tables. If the tables had never been dropped, RLS would still be on from the original CREATE. Reconstruction must therefore enable RLS so later tenant policies are meaningful. Original March 14 council policies are **not** restored (they are immediately dropped/replaced by `20260405120100`).

---

## 9. Minimum required pre-state immediately before the target

For **the entire target file** (not only L229) to execute:

1. `public.hiring_jobs` **exists**.
2. `public.hiring_candidates` **exists**.
3. `hiring_jobs` has `id` (JOIN / PK).
4. `hiring_candidates` has `job_id` (JOIN `hc.job_id = hj.id`).
5. `property_id` is **not** required before the target — the target adds it if the tables exist, then backfills, then `SET NOT NULL`.

A stub of only those four facts would be **sufficient for this target’s SQL** and **insufficient** as a persistent compatibility object (see §8). The minimum **historically justified** contract is therefore the original CREATE TABLE definitions (§6.2–6.3), plus `ENABLE ROW LEVEL SECURITY` from the original CREATE (so later unguarded tenant policies apply). `property_id` remains the target’s responsibility.

```
FULL ORIGINAL FEATURE RESTORATION (policies / indexes / seeds) = NOT NECESSARY
MINIMAL INVENTED STUB (id-only)                                = INSUFFICIENT FOR PERSISTENT FINAL SCHEMA
HISTORICALLY SOURCED CREATE TABLE CONTRACT                     = REQUIRED
```

---

## 10. Historical truth vs compatibility shim

| Philosophy | Meaning | Supported? |
|------------|---------|------------|
| **A. Historical object reconstruction** | Recreate the full March 14 hiring feature (table + council policies + indexes + seeds) because it once existed | **NOT SELECTED** — would revive intentionally retired council-era access semantics; demo seeds are quarantined-path only |
| **B. Minimum clean-replay compatibility reconstruction** | Recreate the historically sourced relation contract later historical migrations need, without reviving obsolete feature semantics | **SELECTED** |

Option B is selected **because** later historical migrations and the persistent final schema re-assume the **tables**, not because the forensic report said “FORENSICALLY ELIGIBLE.” The DROP stays. The target stays. A new governed file supplies the missing prerequisite.

---

## 11. Reconstruction window and timestamp

Verified window (not accepted from the forensic report alone):

| Bound | File / timestamp |
|-------|------------------|
| Intentional DROP | `20260315010915_create_property_manager_system.sql` |
| Immediate predecessor of target | `20260404120000_create_leads.sql` |
| Target | `20260405120000_multi_tenant_properties.sql` |
| Occupied `20260405*` prefixes | `20260405120000` · `20260405120100` only |
| Occupied `20260405115*` / `20260405119*` | **NONE** |
| Intervening migrations requiring table **absent** | **NONE** |

```
EARLIEST SAFE RECONSTRUCTION = immediately after 20260315010915
LATEST SAFE RECONSTRUCTION   = immediately before 20260405120000
PREFERRED PLACEMENT          = immediately before the target
                               (HMD-005 adjacency precedent; minimizes
                               unintended intervening visibility)
```

Authorized future filename (not created by this PAD):

```
supabase/migrations/20260405115900_hmd009_reconstruct_hiring_jobs.sql
```

```
ORDER = 20260315010915  <  20260405115900  <  20260405120000  <  20260405120100
```

Implementation Authorization must re-confirm no collision immediately before creating the file. This PAD **does not** create it.

---

## 12. Evaluated options

| Option | Decision | Reason |
|--------|----------|--------|
| **A** Exact historical source restoration of the target | **REJECTED / NOT INDICATED** | Failing hiring_jobs SQL already equals origin |
| **A′** Target-guard (make L229 conditional) | **REJECTED** | Changes original historical design; silently omits intended backfill; does **not** fix later unguarded `CREATE POLICY` on both tables |
| **B** Pre-target historical compatibility reconstruction | **SELECTED** | Supplies the missing prerequisite after the intentional DROP; preserves DROP + target; historically sourced CREATE TABLE contract; least invention |
| **C** Forward-fix after `20260405120000` | **REJECTED / INSUFFICIENT FOR CLEAN REPLAY** | Replay dies at index **73** |
| **D** Quarantine the target | **REJECTED** | Core multi-tenant schema, not DATA_ONLY |
| **E** Edit / reverse the March 15 DROP | **REJECTED** | DROP is intentional historical design |
| **F** Fake history / mark-applied | **REJECTED** | No skip-as-applied |

```
GLOBAL QUARANTINE = EXACTLY 20260314195641_add_demo_data.sql
COUNT             = 1
```

HMD-009 target is **not** quarantined. Future reconstruction **must not** be quarantined.

---

## 13. Selected remediation — Option B

```
SELECTED = OPTION B
MODEL    = PRE-TARGET HISTORICAL COMPATIBILITY RECONSTRUCTION
PURPOSE  = restore the relation contract later historical migrations
           already assumed after the intentional March 15 DROP,
           so 20260405120000 can replay without editing origin SQL
```

### 13.1 Exact future implementation scope (policy only — no SQL written)

| Item | Authority |
|------|-----------|
| Option name | **OPTION B / PRE-TARGET HISTORICAL COMPATIBILITY RECONSTRUCTION** |
| File count | **EXACTLY 1** new migration |
| Filename | `supabase/migrations/20260405115900_hmd009_reconstruct_hiring_jobs.sql` |
| Timestamp / order | `20260405115900` · after `20260315010915` · after `20260404120000` · before `20260405120000` |
| Objects | `public.hiring_jobs` **and** `public.hiring_candidates` (same family; one file; jobs first) |
| Enums | **DO NOT RECREATE** `hiring_status` / `candidate_status` (already present; never dropped) |
| `hiring_jobs` columns | Exact §6.2 contract (types, nullability, defaults, PK, `posted_by` FK to `profiles`) |
| `hiring_candidates` columns | Exact §6.3 contract (types, nullability, defaults, PK, `job_id` FK `ON DELETE CASCADE`, `recommended_by` FK, both CHECKs) |
| `property_id` | **NOT** created here — target adds it |
| Extra columns | **PROHIBITED** |
| PK | **REQUIRED** as in original CREATE (`id uuid PRIMARY KEY`) |
| FKs | **REQUIRED** as in original CREATE (`posted_by`, `job_id`, `recommended_by`) |
| CHECKs | **REQUIRED** as in original CREATE (score bounds only) |
| Unique (beyond PK) | **NONE** (original had none) |
| Indexes | **NOT REQUIRED / NOT AUTHORIZED** |
| RLS | **REQUIRED** — `ALTER TABLE … ENABLE ROW LEVEL SECURITY` on both (original CREATE; later tenant policies otherwise do not apply) |
| Original March 14 policies | **PROHIBITED** (retired council-era access; `20260405120100` installs tenant policies) |
| Triggers / functions | **NONE / NOT AUTHORIZED** |
| Grants | **NONE / NOT AUTHORIZED** (original CREATE issued none) |
| Data / seed / backfill / synthetic rows | **NOT AUTHORIZED** |
| Target after reconstruction | Guarded ADD **runs**; L229 / L334–338 UPDATE **succeed** (empty sets); SET NOT NULL **runs** |
| Final lifespan | **PERSISTENT** through baseline; later DROP **does not exist** and is **not** to be invented |
| Target edit | **NOT AUTHORIZED** |
| DROP edit | **NOT AUTHORIZED** |

`CREATE TABLE` / `IF NOT EXISTS` wording may follow the original CREATE files. Implementation may **not** invent omitted columns, policies, indexes, seeds, or types.

This is a **compatibility reconstruction**, not a historical-source claim. Do **not** claim such a reconstruction existed historically.

### 13.2 Original target and DROP immutability

```
20260405120000_multi_tenant_properties.sql              = IMMUTABLE / DO NOT EDIT
20260315010915_create_property_manager_system.sql       = IMMUTABLE / DO NOT EDIT
```

---

## 14. Data / RLS / constraint locks

```
DATA BACKFILL     = NOT AUTHORIZED
SYNTHETIC DATA    = NOT AUTHORIZED
SEED ROWS         = NOT AUTHORIZED
CLEAN BASELINE    = begins without production hiring rows; empty tables are correct
RLS ENABLE        = REQUIRED (both tables)
ORIGINAL POLICIES = PROHIBITED
LATER POLICIES    = remain the responsibility of 20260405120100 / 20260410120000
PK / FK / CHECK   = REQUIRED as original CREATE
INDEXES           = NOT AUTHORIZED
```

---

## 15. Relations / distinctness locks

| Defect | Relation / state |
|--------|------------------|
| **HMD-001** | **OPEN / DISTINCT** — quarantine unchanged |
| **HMD-002** | **DISTINCT** — do not reopen |
| **HMD-003** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** · **CHRONOLOGICAL ONLY / DISTINCT** · does **not** own `hiring_jobs` because W2 is later |
| **HMD-004** | **DISTINCT** — do not reopen |
| **HMD-005** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** · **DISTINCT** |
| **HMD-006** | **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** · **DISTINCT** |
| **HMD-007** | **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** · **DISTINCT** |
| **HMD-008** | **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** · **DISTINCT** · **do not reopen** |
| **HMD-009** | **this defect** · **not CLOSED** |
| **HMD-010+** | **NOT ALLOCATED** |

```
HMD-003 W2 / APRIL HARD / JULY S1 = NOT REACHED / NOT APPLIED
                                    (LOCAL-015 fail at index 73 < 75 / 76 / 146)
```

Do **not** promote HMD-003.

---

## 16. Implementation authority lock

PAD-057 **selects the model**. It **does not** authorize implementation.

A **separate** future Implementation Authorization must:

- verify PAD-057 issued / immutable;
- verify HMD-009 status;
- **determine the correct existing IA family and next unused IA identifier from repository sequence** (this PAD **does not** issue an IA ID);
- use the existing **reconstruction** family (**E-02-HFSOR-IA** / successors), **not** HMIR source-restoration IAs;
- authorize **exactly** the filename and schema contract in §13.1 after a fresh collision check;
- forbid target and DROP edits;
- require static verification / build / `--plan`;
- forbid runtime application until later governance.

At this issuance, highest issued reconstruction IA is **E-02-HFSOR-IA-002**. `E-02-HFSOR-IA-003` is **absent** and is **not issued here**. The IA task must re-verify the next unused identifier.

**Do not create that IA now.**

Required later sequence:

```
PAD-057
→ HMD-009 reconstruction Implementation Authorization (HFSOR family)
→ reconstruction implementation
→ implementation verification / Completion
→ successor BCR/DBA governance as required
→ only then future runtime replay
```

**No automatic LOCAL-016.**

---

## 17. BCR / LOCAL / RU / certification locks

```
BCR DBA PIN                        = E-02-DBA-LOCAL-015
BCR ARTIFACT AUTHORITY             = E-02-BCR-IA-015
BCR EDIT                           = NOT AUTHORIZED
LOCAL-015                          = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-015 ATTEMPTS                 = 1
LOCAL-015 RETRY                    = NOT AUTHORIZED
LOCAL-016                          = NOT ISSUED
DATABASE BASELINE VERIFIED         = NO
RU-1.1                             = REPOSITORY IMPLEMENTED / DB NOT APPLIED
RU-1.2                             = REPOSITORY IMPLEMENTED / DB NOT APPLIED / RUNTIME NOT VERIFIED
RU-1.4                             = RUNTIME NOT AUTHORIZED
E02_RUNTIME_EXECUTION_AUTHORIZED   = UNSET / FALSE
EIR                                = NONE
ACCEPTANCE                         = BLOCKED
CERTIFICATION                      = NOT ISSUED
RUNTIME COMMITTED                  = NOT CERTIFIED
FINAL COMMIT PATH                  = BLOCKED
```

---

## 18. Exact next action

```
NEXT = HMD-009 RECONSTRUCTION IMPLEMENTATION AUTHORIZATION
       using the existing E-02-HFSOR-IA reconstruction family
       after independent IA-sequence verification
```

That subsequent task **must first** determine the correct authority family and next unused IA identifier from repository governance. **Do not implement** the reconstruction in this PAD.

---

## 19. Program Authority Decisions (PAD-057 / HMIC-073 – HMIC-084)

PAD-057 is **one** supplement ID covering the following resolutions (PAD-051 / PAD-053 / PAD-056 single-ID precedent; not a 12-ID block).

### PAD-057 / HMIC-073 — Successor file-specific reconstruction permitted

**RESOLVED:** A file-specific HMIC successor may select **Option B** for HMD-009. PAD-039 – PAD-056 do **not** contain sufficient *file-specific* authority for `hiring_jobs`.

### PAD-057 / HMIC-074 — Prior-grant coverage

**RESOLVED:** HMIR restoration grants (HMD-002 / 004 / 006 / 007 / 008) **do not** apply. PAD-051 / HMD-003 finance reconstruction **does not** apply. PAD-053 / HMD-005 enum reconstruction **does not** apply.

### PAD-057 / HMIC-075 — Defect identifier

**RESOLVED:** Remediation policy is allocated to **HMD-009**. **HMD-010+ not allocated.** `hiring_candidates` is **in-family**, not a new HMD.

### PAD-057 / HMIC-076 — Classification

**RESOLVED:** **ORIGINAL HISTORICAL CLEAN-REPLAY DESIGN DEFECT** · subtype **ORIGINAL CLEAN-REPLAY MISSING PREREQUISITE AFTER INTENTIONAL EARLIER DROP**. Target failing SQL source-integrity: **REJECTED**.

### PAD-057 / HMIC-077 — Target and DROP immutability

**RESOLVED:** `20260405120000_multi_tenant_properties.sql` and `20260315010915_create_property_manager_system.sql` remain **immutable**. Target-guard and DROP rewrite are **rejected**.

### PAD-057 / HMIC-078 — Selected model and ordering

**RESOLVED:** **Option B**. Exactly one future file `20260405115900_hmd009_reconstruct_hiring_jobs.sql` strictly after the DROP and immediately before the target.

### PAD-057 / HMIC-079 — Schema contract

**RESOLVED:** Exact original CREATE TABLE contracts for `hiring_jobs` and `hiring_candidates` (§6.2–6.3). Enable RLS. Do not recreate enums, original policies, indexes, grants, triggers, or `property_id`.

### PAD-057 / HMIC-080 — Data

**RESOLVED:** Data backfill / synthetic / seed = **NOT AUTHORIZED**. Empty tables are the correct clean-replay pre-state.

### PAD-057 / HMIC-081 — Rejected alternatives

**RESOLVED:** Source restoration, target-guard, forward-fix, quarantine, earlier-DROP edit, fake history = **REJECTED**.

### PAD-057 / HMIC-082 — Distinctness

**RESOLVED:** HMD-001 through HMD-008 remain as locked in §15. HMD-003 relationship is **chronological only**.

### PAD-057 / HMIC-083 — Implementation still separate

**RESOLVED:** This PAD is **not** Implementation Authorization. Reconstruction file **not created**. HFSOR-IA successor **not issued**.

### PAD-057 / HMIC-084 — Runtime / BCR / successor DBA

**RESOLVED:** LOCAL-015 immutable failed. LOCAL-016 **not issued**. BCR pins unchanged. RU-1.4 **not authorized**. EIR / Acceptance / Certification **not issued**. Database baseline **not verified**.

---

## 20. Issuance checklist

| ID | Check | Result |
|----|--------|--------|
| HMIC7-I01 | Decision-007 unused before this file | **PASS** |
| HMIC7-I02 | PAD-057 unused / not reserved | **PASS** |
| HMIC7-I03 | HMIC-073 – HMIC-084 unused | **PASS** |
| HMIC7-I04 | HMD-009 distinct / forensic complete / no prior repair authority | **PASS** |
| HMIC7-I05 | LOCAL-015 immutable failed facts match | **PASS** |
| HMIC7-I06 | Target hashes / worktree / origin hiring_jobs SQL | **PASS** |
| HMIC7-I07 | CREATE + intentional DROP + no recreate proven | **PASS** |
| HMIC7-I08 | Entire-target + post-target contract inventoried | **PASS** |
| HMIC7-I09 | Filename collision `20260405115900` none | **PASS** |
| HMIC7-I10 | Option B historically justified vs stub / full-feature / target-guard | **PASS** |
| HMIC7-I11 | Quarantine remains count 1 | **PASS** |
| HMIC7-I12 | No migration / BCR / DB / commit in this issuance | **PASS** |
| HMIC7-I13 | Implementation not authorized | **PASS** |
| HMIC7-I14 | PAD-058+ not allocated | **PASS** |

---

## 21. Decision immutability

```
PAD-057                                                    = ISSUED / IMMUTABLE
IMPLEMENTATION                                             = NOT AUTHORIZED
RECONSTRUCTION FILE                                        = NOT CREATED
```

---

**End of document — PAD-057 · HMIC-073 – HMIC-084 · HMD-009 — v1.0 — 2026-08-30**
