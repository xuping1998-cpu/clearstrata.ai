# E-02 HMD-009 — Multi-Tenant Properties Hiring-Jobs Forensic Investigation

## Clean-Replay Missing Prerequisite After Earlier Intentional Drop · `20260405120000_multi_tenant_properties.sql`

| Field | Value |
|-------|-------|
| **Document Type** | Forensic Investigation Record (governance) — **not** a Program Authority Decision |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Defect** | **HMD-009** |
| **Target** | `supabase/migrations/20260405120000_multi_tenant_properties.sql` |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-015.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-015.md) · run `local-015-20260829a` |
| **Status** | **FORENSIC INVESTIGATION COMPLETE** |
| **Classification** | **ORIGINAL HISTORICAL CLEAN-REPLAY DESIGN DEFECT** · subtype **ORIGINAL CLEAN-REPLAY MISSING PREREQUISITE AFTER INTENTIONAL EARLIER DROP** |
| **Effective Date** | 2026-08-30 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-HMD-009-Multi-Tenant-Properties-Hiring-Jobs-Forensic-Investigation.md`](E-02-HMD-009-Multi-Tenant-Properties-Hiring-Jobs-Forensic-Investigation.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized** | **NO** |

> **Authority path finding: YES.** Filename follows the existing HMD forensic-record pattern (`E-02-HMD-008-Notifications-Trigger-Service-Role-Insert-Forensic-Investigation.md`). This is a **forensic investigation record**, not a PAD. **PAD-057 is not allocated. Not invented.** Highest issued HMIC PAD remains **PAD-056**. Highest allocated HMD remains **HMD-008** before this record. **HMD-009 is the next unused identifier.** No HMD-009 existed before this investigation. HMD-009 was **not reserved**. No HMD-010+ exists. **Not a new governance tier.** **Not Implementation Authorization.** **Not a DBA.** **Not LOCAL-016.** **Not a merge into HMD-003 or HMD-008.**

> **Scope lock:** Classifies the LOCAL-015 first-failing migration. This record **does not** restore SQL · **does not** edit the target · **does not** recreate `hiring_jobs` · **does not** undo the March 15 DROP · **does not** create reconstruction · **does not** expand quarantine · **does not** retry LOCAL-015 · **does not** issue LOCAL-016 · **does not** issue PAD-057 · **does not** issue HMIR-IA-006 · **does not** run database/Supabase/Docker.

```
HMD-009                                            = OPEN / FORENSIC INVESTIGATION COMPLETE /
                                                       DISTINCT /
                                                       ORIGINAL HISTORICAL CLEAN-REPLAY DESIGN DEFECT /
                                                       ORIGINAL CLEAN-REPLAY MISSING PREREQUISITE
                                                       AFTER INTENTIONAL EARLIER DROP
TARGET                                             = 20260405120000_multi_tenant_properties.sql
MISSING OBJECT AT FIRST HARD USE                   = public.hiring_jobs
FAILING STATEMENT                                  = L229 unguarded UPDATE public.hiring_jobs
TARGET ORIGIN COMMIT                               = fb0094239d74cc4466853cc1cfcb906164d0fb89
TARGET ORIGIN BLOB                                 = b8c2b851d41d2218e90acba38403288cec5e28c9
CURRENT BLOB                                       = 4bc119833071125695eb393844d7e8335e952154
CURRENT == TARGET ORIGIN                           = NO (comment/trailing blanks only)
HIRING_JOBS STATEMENTS UNCHANGED FROM ORIGIN       = YES
CREATE ORIGIN                                      = 20260314034834_create_strata_schema.sql (present)
DROP ORIGIN                                        = 20260315010915_create_property_manager_system.sql (present)
RECREATE AFTER DROP                                = NONE
DELETED CREATE AFTER DROP                          = NOT FOUND
SOURCE CORRUPTION OF FAILING SQL                   = REJECTED
MISSING-CREATE / NEVER-ORIGIN                      = REJECTED (CREATE exists, then DROP)
ORDERING DEFECT (CREATE AFTER TARGET)              = REJECTED
TRANSACTION-BOUNDARY                               = REJECTED
HMD-003 OWNERSHIP                                  = NO
HMD-008 OWNERSHIP                                  = NO
EXACT HISTORICAL SOURCE OF TARGET FAILING SQL      = YES (already in origin)
TARGET SOURCE RESTORATION                          = NOT INDICATED
RECONSTRUCTION                                     = FORENSICALLY ELIGIBLE (NOT AUTHORIZED / NOT CREATED)
FORWARD-FIX AS CLEAN REPLAY REMEDY                 = INSUFFICIENT
TARGET QUARANTINE                                  = NOT AUTHORIZED
PROGRAM AUTHORITY                                  = NOT ISSUED
IMPLEMENTATION AUTHORITY                           = NOT ISSUED
LOCAL-015                                          = APPLICATION_FAILED / EVIDENCE IMMUTABLE / NO RETRY
LOCAL-016                                          = NOT ISSUED
```

---

## 1. LOCAL-015 evidence gate

Verified against immutable evidence and manifest. **No material discrepancy.** Runtime evidence was **not modified**.

| Field | Observed |
|-------|----------|
| LOCAL-015 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Attempts | **1** |
| Retry | **NOT AUTHORIZED** |
| evidenceRunId | `local-015-20260829a` |
| Manifest | `tests/e02/evidence/local-015-20260829a/bcr-replay-manifest.json` |
| Executed | **72** |
| Highest applied | `20260404120000_create_leads.sql` (executable index **72**) |
| First failing | `20260405120000_multi_tenant_properties.sql` |
| Executable index | **73** |
| Target reached / applied | **YES / NO** |
| Error | `relation "public.hiring_jobs" does not exist` |
| Preserve/handoff | **NOT REACHED** (`CLEANED_AFTER_FAILURE`) |
| Baseline verifier | **NOT RUN** |
| DATABASE BASELINE VERIFIED | **NO** |

Manifest `failures[0]`:

```
20260405120000_multi_tenant_properties.sql: relation "public.hiring_jobs" does not exist
```

---

## 2. HMD sequence gate

| ID | Pre-this-record allocation | Notes |
|----|----------------------------|-------|
| HMD-001 | **ALLOCATED / OPEN** | demo-data quarantine target |
| HMD-002 | **ALLOCATED** | meeting templates restoration · runtime verified |
| HMD-003 | **ALLOCATED / OPEN** | finance schema-origin reconstruction · runtime pending |
| HMD-004 | **ALLOCATED** | dispute-resolution restoration · runtime verified |
| HMD-005 | **ALLOCATED / OPEN** | enum commit-boundary reconstruction · runtime verified |
| HMD-006 | **ALLOCATED / OPEN** | owner-bulletin restoration · runtime verified |
| HMD-007 | **ALLOCATED / OPEN** | announcements fan-out restoration · runtime verified |
| HMD-008 | **ALLOCATED / OPEN** | notifications trigger restoration · runtime verified |
| HMD-009 | **NOT ALLOCATED / NOT RESERVED** before this record | **allocated here** |
| HMD-010+ | **NONE** | no superseding identifier |

```
HIGHEST ALLOCATED HMD BEFORE THIS RECORD = HMD-008
NEXT UNUSED                              = HMD-009
AMBIGUITY                                = NONE
```

---

## 3. Existing HMD ownership

| HMD | Owns `20260405120000` / `public.hiring_jobs` failure? | Evidence |
|-----|------------------------------------------------------|----------|
| HMD-001 | **NO** | quarantines demo **INSERT**s into `hiring_jobs`; does not CREATE or DROP the relation |
| HMD-002 | **NO** | different file |
| HMD-003 | **NO** | family is `invoices` / `invoice_status` / `financial_anomalies` / `invoice_ai_audits`; `20260405120000` is only a **W2 placement boundary** |
| HMD-004 | **NO** | different file |
| HMD-005 | **NO** | `user_role.admin` enum commit-boundary |
| HMD-006 | **NO** | different file |
| HMD-007 | **NO** | different file |
| HMD-008 | **NO** | `20260401140000` CJK source-integrity; LOCAL-015 applied that file; this failure is later and different |

```
HMD-003 OWNERSHIP OF THIS FAILURE = NO
HMD-008 OWNERSHIP OF THIS FAILURE = NO
RELATION TO HMD-003               = CHRONOLOGICAL ONLY / DISTINCT
RELATION TO HMD-008               = DISTINCT / LATER FILE / NOT REOPENED
```

---

## 4. Target identity

| Item | Result |
|------|--------|
| Path | `supabase/migrations/20260405120000_multi_tenant_properties.sql` |
| Worktree | **CLEAN** vs HEAD (`git status --porcelain` empty) |
| Current / HEAD / index blob | **`4bc119833071125695eb393844d7e8335e952154`** |
| Target origin commit | **`fb0094239d74cc4466853cc1cfcb906164d0fb89`** (2026-04-06 · `feat: invoice audit reports, finance routes, Vercel API, Supabase migrations`) |
| Target origin blob | **`b8c2b851d41d2218e90acba38403288cec5e28c9`** |
| CURRENT EQUALS TARGET ORIGIN | **NO** |
| Later touching commit | **`8c30eb2f657847dc0767201149190eef8d610475`** (2026-04-10) · `+5 / -1` |
| `8c30eb2` change | comment `New profile → default property_users` → `New profile ?default property_users`; **four trailing LF blank lines** |
| `8c30eb2` hiring_jobs hunks | **NONE** |
| Encoding | UTF-8 · no BOM · mostly LF · **4** CRLF (non-normative) |
| Failing context | `DO $c$` block beginning **L74** |

The file-level origin mismatch is the same dashboard-commit whitespace/comment class seen on other April files. It does **not** change the `hiring_jobs` SQL. **Do not treat this as the LOCAL-015 parser/relation cause.**

---

## 5. Exact failing reference

All current `hiring_jobs` references in the target:

| Line | Form | Guarded? | Kind |
|------|------|----------|------|
| 148–150 | `information_schema.tables` … `'hiring_jobs'` then `ALTER TABLE public.hiring_jobs ADD COLUMN IF NOT EXISTS property_id` | **YES** | ALTER TABLE ADD COLUMN |
| **229** | **`UPDATE public.hiring_jobs SET property_id = default_id WHERE property_id IS NULL;`** | **NO** | **DML backfill** |
| 336 | `FROM public.hiring_jobs hj` (candidates backfill) | **NO** | DML JOIN |
| 406–407 | `information_schema.columns` … `'hiring_jobs'` then `ALTER COLUMN property_id SET NOT NULL` | **YES** | ALTER COLUMN |

The ADD-column step is skipped when the table is absent. Clean replay therefore continues to the unguarded backfill.

```
FAILING STATEMENT / OBJECT =
  L229 UPDATE public.hiring_jobs
  inside DO $c$ (starts L74)
CAUSE OF RUNTIME ERROR     =
  relation public.hiring_jobs does not exist
```

L336 would be a later unguarded use of the same missing relation / of `hiring_candidates`. It is **not** the first stop.

No FK, policy, trigger, function, index, grant, RLS, or view in this file is the first failing object.

---

## 6. Repository origin search

Current timestamped migrations that mention `hiring_jobs`:

| File | Timestamp vs target | Role |
|------|---------------------|------|
| `20260314034834_create_strata_schema.sql` | **before** (executable index **1**) | **`CREATE TABLE IF NOT EXISTS hiring_jobs (`** · RLS · policies |
| `20260314062844_add_foreign_key_indexes.sql` | before | `CREATE INDEX … ON hiring_jobs(posted_by)` |
| `20260314062921_optimize_rls_auth_function_calls.sql` | before | DROP/CREATE policies on `hiring_jobs` |
| `20260314195641_add_demo_data.sql` | before · **QUARANTINED** | **INSERT** only · **not CREATE** |
| `20260315010915_create_property_manager_system.sql` | **before** (executable index **13**) | **`DROP TABLE IF EXISTS hiring_jobs CASCADE;`** |
| `20260405120000_multi_tenant_properties.sql` | **target** (index **73**) | guarded ADD + **unguarded UPDATE** |
| `20260405120100_multi_tenant_rls.sql` | after | later RLS on `public.hiring_jobs` |
| `20260410120000_property_members_saas.sql` | after | later policies on `public.hiring_jobs` |

```
CREATE TABLE ... hiring_jobs in current history = YES
  PATH      = 20260314034834_create_strata_schema.sql
  TIMESTAMP = 20260314034834  (before target)
  COMMIT    = bc48068db008d03b3c93d60646169737de7bc363
  PRESENT   = YES

TRUE SCHEMA-ORIGIN CLASS AT FIRST HARD USE =
  A (valid earlier CREATE exists and did run)
  AND then an earlier DROP removed it
  AND no recreate exists before 20260405120000
```

This is **not** class B (no earlier origin). It is **not** class C (quarantine/skip of the CREATE). It is **not** class D (CREATE only after the target).

`git log -S 'CREATE TABLE IF NOT EXISTS hiring_jobs'` hits **only** the initial commit. `git log -S 'DROP TABLE IF EXISTS hiring_jobs'` hits **only** the initial commit. `git log -S 'UPDATE public.hiring_jobs'` hits **only** target introduction `fb009423`.

---

## 7. Drop / recreate / deleted-file tests

`20260315010915_create_property_manager_system.sql` L38–L40 (present in `bc48068` and now):

```
-- Drop old hiring tables
DROP TABLE IF EXISTS hiring_candidates CASCADE;
DROP TABLE IF EXISTS hiring_jobs CASCADE;
```

Header text: “Transform hiring system into comprehensive property manager management system” · “Drop old hiring tables (hiring_jobs, hiring_candidates)” · create `property_managers` and related staff tables.

| Test | Result |
|------|--------|
| DROP present before target | **YES** · executable index **13** |
| DROP intentional / documented | **YES** |
| Recreate between DROP and target | **NONE** |
| CREATE after target | **NONE** |
| Deleted CREATE-after-drop migration | **NOT FOUND** |
| Deleted `20260314211043_fix_hiring_candidates_insert_policy.sql` (removed `822f53da`, 2026-04-23) | policy-only filename; **not** a CREATE origin |

```
DELETED / LOST CREATE AFTER DROP = NOT SUPPORTED
ORDERING DEFECT (CREATE SORTS AFTER TARGET) = REJECTED
```

`8c30eb2` also appended trailing blanks to the DROP file. The DROP statements themselves are initial-commit text.

---

## 8. Quarantine interaction

```
QUARANTINE = exactly 20260314195641_add_demo_data.sql · COUNT 1
```

That file **INSERTs** into `hiring_jobs`. It does **not** CREATE the table. The CREATE is in `20260314034834` and **runs**. The DROP in `20260315010915` **still runs**. Omitting demo data does **not** remove the only creation, and including it would not survive the later DROP.

```
QUARANTINE INTERACTION = NO
HMD-009 TARGET         = NOT QUARANTINED
TARGET QUARANTINE      = NOT AUTHORIZED (real multi-tenant schema evolution)
```

---

## 9. Why clean replay sees hiring_jobs absent

Executable order (quarantine omitted):

1. Index **1** — `20260314034834_create_strata_schema.sql` **creates** `hiring_jobs`.
2. Index **13** — `20260315010915_create_property_manager_system.sql` **drops** `hiring_jobs`.
3. Indexes **14–72** apply (LOCAL-015 executed **72**; no masked earlier failure).
4. Index **73** — target `DO $c$` skips guarded ADD (table gone), then **L229 UPDATE** fails.

```
HIRING_JOBS ABSENT BECAUSE =
  earlier executable migration 20260315010915
  DROP TABLE IF EXISTS hiring_jobs CASCADE
  ran after 20260314034834 CREATE
  and no later migration recreates the table
  before 20260405120000
```

No alternate schema/name: searches for `public.hiring_jobs`, `hiring_jobs`, `hiring_job` show the same public table. Failure is **missing table**, not search_path / rename.

---

## 10. Historical original-design vs current history

| Fact | Evidence |
|------|----------|
| CREATE + DROP coexist from first snapshot | both files in `bc48068` (2026-03-29) |
| App expected `hiring_jobs` from first snapshot | `src/pages/Hiring.tsx` added in `bc48068`; still `.from('hiring_jobs')` |
| Target authored later | `fb009423` (2026-04-06) already contains L229 unguarded UPDATE |
| Later migrations still assume the table | `20260405120100` · `20260410120000` |
| Current app still assumes `property_id` on jobs | `Hiring.tsx` `.eq('property_id', currentPropertyId)` |

Repository **current** history therefore contains a live CREATE, a live DROP, and a later HARD use with **no recreate**. That is an original clean-replay design inconsistency, not a lost CREATE file.

App/types are **supporting** only. They do not override migration truth.

---

## 11. Source-integrity / original-design / schema-origin / transaction-boundary tests

| Hypothesis | Result | Why |
|------------|--------|-----|
| Target post-creation source corruption **caused this failure** | **REJECTED** | origin already has L229; `8c30eb2` does not touch `hiring_jobs` SQL |
| Original historical clean-replay design defect | **SUPPORTED** | origin target HARD-uses a relation removed by an earlier authorized DROP |
| Missing-create / HMD-003-style never-origin | **REJECTED** | CREATE exists at index **1** |
| Schema-origin missing **at first HARD use** (live relation absent) | **TRUE AS PRE-STATE** · **not** a missing CREATE file | DROP removed it |
| Ordering defect (CREATE after target) | **REJECTED** | CREATE is index **1** |
| Transaction-boundary / enum commit | **REJECTED** | error is missing relation, not `unsafe use of new value` |
| Runtime-only / search_path | **REJECTED** | no other schema form found |

Primary taxonomy **B** is selected because the CREATE exists. Taxonomy **C** is **not** used as the primary class: that class in this program means *no earlier CREATE*, which is HMD-003’s invoices pattern, not this file.

---

## 12. Minimum expected pre-state (forensic only)

Referenced by the **target** at first HARD use:

- relation **`public.hiring_jobs` exists**;
- after the guarded ADD (which only runs if the table exists): column **`property_id uuid`** nullable, then backfilled, then optionally `SET NOT NULL`.

Original CREATE shape (`20260314034834`, not to be back-projected beyond this evidence):

- `id uuid PK`
- `posted_by uuid REFERENCES profiles(id) NOT NULL`
- `title_en` / `title_zh` / `description_en` / `description_zh`
- `probation_months integer`
- `status hiring_status`
- `created_at` / `updated_at`

**Do not** treat later RLS (`20260405120100`, `20260410120000`) or `Hiring.tsx` extra columns as required origin. **Do not** design reconstruction SQL here.

Related later unguarded use in the **same** `DO $c$` block: `hiring_candidates` was dropped in the same March 15 file. First failure remains **`hiring_jobs` L229**.

---

## 13. Remediation eligibility — analysis only

| Option | Eligibility | Notes |
|--------|-------------|-------|
| **A** Exact historical source restoration of the target | **NOT INDICATED** | failing SQL is original; restoring origin comment/`→` does not create the table |
| **A′** Restore a deleted CREATE-after-drop file | **NOT INDICATED** | no such deleted file proven |
| **B** Historical prerequisite / recreate `hiring_jobs` after the DROP and before the target | **FORENSICALLY ELIGIBLE** | placement window: after `20260315010915` and before `20260405120000`; CREATE text exists at `20260314034834` as shape evidence only |
| **C** Forward fix after the target | **INSUFFICIENT FOR CLEAN REPLAY** | replay dies at index **73** |
| **D** Quarantine the target | **NOT APPROPRIATE** | core multi-tenant schema, not demo-only |
| **E** Other | **NONE selected** | e.g. editing the DROP or making L229 guarded would be a **forward design change**, not authorized here |

```
PROGRAM AUTHORITY = NOT ISSUED
IMPLEMENTATION    = NOT AUTHORIZED
RECONSTRUCTION    = NOT CREATED
```

---

## 14. Distinctness / locks

```
DISTINCT DEFECT vs HMD-001..008 = YES
HMD-009 ALLOCATED               = YES
HMD-008                         = OPEN / DISTINCT / SOURCE INTEGRITY RESTORED /
                                  IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-007                         = OPEN / SOURCE INTEGRITY RESTORED /
                                  IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-006                         = OPEN / SOURCE INTEGRITY RESTORED /
                                  IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-005                         = OPEN / RECONSTRUCTION IMPLEMENTED /
                                  IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-003                         = OPEN / RECONSTRUCTION IMPLEMENTED /
                                  IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
W2 / April HARD / July S1       = NOT REACHED / NOT APPLIED (fail at index 73 < 75 / 76 / 146)
```

**Do not mark HMD-009 CLOSED.** **Do not mark RUNTIME REPLAY VERIFIED.**

---

## 15. BCR / DBA / RU / acceptance locks

```
BCR DBA PIN                     = E-02-DBA-LOCAL-015
BCR ARTIFACT AUTHORITY          = E-02-BCR-IA-015
EXACT-MATCH                     = RETAINED
DUAL ACCEPT                     = NONE
LOCAL-015                       = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED /
                                  EVIDENCE IMMUTABLE / attempts 1 / NO RETRY
LOCAL-016                       = NOT ISSUED
E-02-BCR-IA-016                 = NOT ISSUED
PAD-057                         = NOT ISSUED
HMIR-IA-006                     = NOT ISSUED
DATABASE BASELINE VERIFIED      = NO
RU-1.1                          = REPOSITORY IMPLEMENTED / DB NOT APPLIED
RU-1.2                          = REPOSITORY IMPLEMENTED / DB NOT APPLIED / RUNTIME NOT VERIFIED
RU-1.4                          = RUNTIME NOT AUTHORIZED
EIR                             = NONE
ACCEPTANCE                      = BLOCKED
PROJECT CERTIFICATION           = NOT ISSUED
RUNTIME COMMITTED               = NOT CERTIFIED
FINAL COMMIT PATH               = BLOCKED
```

---

## 16. Next governance action

```
NEXT = PROGRAM AUTHORITY DECISION
```

A later PAD may choose among eligible remedies. This record **does not** select Option B. **Do not** issue LOCAL-016 until the defect is governed, remediated if required, implementation-completed, and separately authorized.

---

## 17. Confirmation of no unauthorized work

No migration edit. No reconstruction file. No BCR edit. No database / Supabase / Docker / `--apply`. No LOCAL-015 retry. No LOCAL-016. No PAD-057. No HMIR-IA-006. No Completion-006. No commit.

---

**End of document — E-02 HMD-009 Forensic Investigation · v1.0 — 2026-08-30**
