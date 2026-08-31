# E-02 HMD-010 — Multi-Tenant Properties Meeting-Votes Meeting-Id Forensic Investigation

## Clean-Replay Wrong-Column Assumption on Existing `public.meeting_votes` · `20260405120000_multi_tenant_properties.sql`

| Field | Value |
|-------|-------|
| **Document Type** | Forensic Investigation Record (governance) — **not** a Program Authority Decision |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Defect** | **HMD-010** |
| **Target** | `supabase/migrations/20260405120000_multi_tenant_properties.sql` |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-016.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-016.md) · run `local-016-20260830a` |
| **Status** | **FORENSIC INVESTIGATION COMPLETE** |
| **Classification** | **ORIGINAL HISTORICAL SQL / SCHEMA-ASSUMPTION DEFECT** · subtype **ORIGINAL CLEAN-REPLAY WRONG-COLUMN ASSUMPTION ON EXISTING TABLE** |
| **Effective Date** | 2026-08-30 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-HMD-010-Multi-Tenant-Properties-Meeting-Votes-Meeting-Id-Forensic-Investigation.md`](E-02-HMD-010-Multi-Tenant-Properties-Meeting-Votes-Meeting-Id-Forensic-Investigation.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized** | **NO** |

> **Authority path finding: YES.** Filename follows the existing HMD forensic-record pattern (`E-02-HMD-009-Multi-Tenant-Properties-Hiring-Jobs-Forensic-Investigation.md`). This is a **forensic investigation record**, not a PAD. **PAD-058 is not allocated. Not invented.** Highest issued HMIC PAD remains **PAD-057**. Highest allocated HMD remains **HMD-009** before this record. **HMD-010 is the next unused identifier.** No HMD-010 defect record existed before this investigation. HMD-010 was **not reserved** as a defect record. PAD-057’s phrase “HMD-010 is not allocated” referred only to **not splitting `hiring_candidates` into a new HMD**; it did **not** reserve the identifier and does **not** own this `meeting_votes.meeting_id` failure. No HMD-011+ exists. **Not a new governance tier.** **Not Implementation Authorization.** **Not a DBA.** **Not LOCAL-017.** **Not a merge into HMD-009.**

> **Scope lock:** Classifies the LOCAL-016 first-failing construct `column mv.meeting_id does not exist`. This record **does not** edit the target · **does not** edit the HMD-009 reconstruction · **does not** add `meeting_id` · **does not** create reconstruction · **does not** expand quarantine · **does not** retry LOCAL-016 · **does not** issue LOCAL-017 · **does not** issue PAD-058 · **does not** run database/Supabase/Docker.

```
HMD-010                                            = OPEN / FORENSIC INVESTIGATION COMPLETE /
                                                       DISTINCT /
                                                       ORIGINAL HISTORICAL SQL /
                                                       SCHEMA-ASSUMPTION DEFECT /
                                                       ORIGINAL CLEAN-REPLAY WRONG-COLUMN
                                                       ASSUMPTION ON EXISTING TABLE
TARGET                                             = 20260405120000_multi_tenant_properties.sql
FAILING STATEMENT                                  = L280-283 unguarded UPDATE public.meeting_votes mv
ALIAS                                              = mv
BOUND OBJECT                                       = public.meeting_votes
OBJECT TYPE                                        = TABLE
EXPECTED COLUMN                                    = meeting_id
PRE-TARGET meeting_id ON BOUND OBJECT              = NO
PRE-TARGET HISTORICAL KEY                          = agenda_item_id
TARGET ORIGIN COMMIT                               = fb0094239d74cc4466853cc1cfcb906164d0fb89
TARGET ORIGIN BLOB                                 = b8c2b851d41d2218e90acba38403288cec5e28c9
CURRENT BLOB                                       = 4bc119833071125695eb393844d7e8335e952154
CURRENT == TARGET ORIGIN                           = NO (comment/trailing blanks only; same as HMD-009 file-level note)
FAILING mv.meeting_id UNCHANGED FROM ORIGIN        = YES
SOURCE CORRUPTION OF FAILING SQL                   = REJECTED
TRANSACTION-BOUNDARY                               = REJECTED
PARSER / ENCODING                                  = REJECTED
HMD-009 OWNERSHIP                                  = NO
HMD-009 SAME ROOT CAUSE                            = NO
HMD-009 SAME REMEDIATION UNIT                      = NO
EXACT HISTORICAL SOURCE OF FAILING SQL             = YES (already in origin)
TARGET SOURCE RESTORATION                          = NOT INDICATED
COLUMN RECONSTRUCTION ON LEGACY TABLE              = NOT PROVEN AS HISTORICAL ORIGIN
FORWARD-FIX AS CLEAN REPLAY REMEDY                 = INSUFFICIENT
TARGET QUARANTINE                                  = NOT AUTHORIZED
PROGRAM AUTHORITY                                  = NOT ISSUED
IMPLEMENTATION AUTHORITY                           = NOT ISSUED
LOCAL-016                                          = APPLICATION_FAILED / EVIDENCE IMMUTABLE / NO RETRY
LOCAL-017                                          = NOT ISSUED
```

---

## 1. LOCAL-016 evidence gate

Verified against immutable evidence and manifest. **No material discrepancy.** Runtime evidence was **not modified**.

| Field | Observed |
|-------|----------|
| LOCAL-016 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Attempts | **1** |
| Retry | **NOT AUTHORIZED** |
| evidenceRunId | `local-016-20260830a` |
| Manifest | `tests/e02/evidence/local-016-20260830a/bcr-replay-manifest.json` |
| Executed | **73** |
| Highest applied | `20260405115900_hmd009_reconstruct_hiring_jobs.sql` (executable index **73**) |
| First failing | `20260405120000_multi_tenant_properties.sql` |
| Executable index | **74** |
| Target reached / applied | **YES / NO** |
| Error | `column mv.meeting_id does not exist` |
| Preserve/handoff | **NOT REACHED** (`CLEANED_AFTER_FAILURE`) |
| Baseline verifier | **NOT RUN** |
| DATABASE BASELINE VERIFIED | **NO** |

Manifest `failures[0]`:

```
20260405120000_multi_tenant_properties.sql: column mv.meeting_id does not exist
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
| HMD-009 | **ALLOCATED / OPEN** | hiring_jobs missing prerequisite after DROP · reconstruction applied in LOCAL-016 · target still not applied |
| HMD-010 | **NOT ALLOCATED / NOT RESERVED** as a defect record before this file | **allocated here** |
| HMD-011+ | **NONE** | no superseding identifier |

PAD-057 / HMD-009 forensics said “HMD-010 is not allocated” only to keep `hiring_candidates` **inside HMD-009**. That sentence is **not** a reservation of identifier HMD-010 and **not** ownership of this failure.

```
HIGHEST ALLOCATED HMD BEFORE THIS RECORD = HMD-009
NEXT UNUSED                              = HMD-010
AMBIGUITY                                = NONE
```

---

## 3. HMD-009 separation

Preserve LOCAL-016 HMD-009 facts:

| Item | Status |
|------|--------|
| Reconstruction `20260405115900_hmd009_reconstruct_hiring_jobs.sql` | **REACHED / APPLIED** (index **73**) |
| Target `20260405120000_multi_tenant_properties.sql` | **REACHED / NOT APPLIED** (index **74**) |
| Prior HMD-009 error `relation "public.hiring_jobs" does not exist` | **NOT REPRODUCED** |
| HMD-009 | **OPEN / OPTION B / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |

| Comparison | Result |
|------------|--------|
| SAME FILE | **YES** |
| SAME FAILURE CONSTRUCT | **NO** — HMD-009 = unguarded `UPDATE public.hiring_jobs` missing **table**; this = unguarded `UPDATE public.meeting_votes mv` missing **column** |
| SAME MISSING OBJECT | **NO** — `public.hiring_jobs` vs `public.meeting_votes.meeting_id` |
| SAME ROOT CAUSE | **NO** — HMD-009 is CREATE-then-DROP with no recreate; this is a live table whose historical columns never included `meeting_id` |
| SAME REMEDIATION UNIT | **NO** — HMD-009 reconstruction already applied and is **not** the failing object |

```
HMD-009 OWNERSHIP OF THIS FAILURE = NO
HMD-009 SCOPE EXPANSION           = NOT SUPPORTED
HMD-010 DISTINCT                  = YES
```

Do **not** promote HMD-009 to runtime verified. Do **not** merge this failure into HMD-009.

---

## 4. Target identity / source history

| Item | Result |
|------|--------|
| Path | `supabase/migrations/20260405120000_multi_tenant_properties.sql` |
| Target origin commit | **`fb0094239d74cc4466853cc1cfcb906164d0fb89`** (2026-04-06) |
| Target origin blob | **`b8c2b851d41d2218e90acba38403288cec5e28c9`** |
| Later touching commit | **`8c30eb2f657847dc0767201149190eef8d610475`** (2026-04-10) · `+5 / -1` |
| Current blob | **`4bc119833071125695eb393844d7e8335e952154`** |
| CURRENT EQUALS TARGET ORIGIN | **NO** |
| `8c30eb2` change | comment/`→` plus trailing blanks (same file-level class already recorded by HMD-009) |
| `8c30eb2` `meeting_votes` / `mv.meeting_id` hunks | **NONE** |
| Failing `mv.meeting_id` in origin | **YES** — origin L280–283 already contains the same UPDATE |
| Failing reference changed post-creation | **NO** |
| Encoding / parser corruption of this construct | **REJECTED** |

```
SOURCE-INTEGRITY DEFECT OF FAILING REFERENCE = REJECTED
FAILING SQL IS ORIGINAL TARGET TEXT          = YES
```

---

## 5. Exact failing construct

The failure is inside `DO $c$` beginning **L74**. Guarded ADD at L108–110 can add `property_id` when the **table** exists. It does **not** add `meeting_id`. Replay then reaches the unguarded backfill:

```
L280  UPDATE public.meeting_votes mv
L281  SET property_id = m.property_id
L282  FROM public.meetings m
L283  WHERE mv.meeting_id = m.id AND mv.property_id IS NULL;
```

| Field | Result |
|-------|--------|
| Construct | **DML UPDATE / backfill** |
| Object created/altered by this statement | **none** — updates existing rows |
| Alias | **`mv`** |
| Bound object | **`public.meeting_votes`** |
| Object type | **TABLE** |
| Expected column | **`meeting_id`** |
| Source lines | **L280–283** |
| `mv.meeting_id` reference | **L283** `WHERE mv.meeting_id = m.id` |
| Sibling `FROM` alias | **`m` = `public.meetings`** (`m.id`, `m.property_id`) |

Immediately preceding sibling backfills in the same block (`meeting_agenda_items` L268–271 · `meeting_attendees` L274–277) use `*.meeting_id` on tables that **do** have that column historically. Those statements are consistent with LOCAL-016 reaching L280.

L284 (`UPDATE public.meeting_votes SET property_id = default_id`) is **not** the first stop.

No view, policy, function, trigger, index, or CTE is the first failing object.

---

## 6. `mv` identity / pre-target schema

```
ALIAS          = mv
BOUND OBJECT   = public.meeting_votes
OBJECT TYPE    = TABLE
EXPECTED COL   = meeting_id
```

Origin of the bound object: `20260320044053_create_meeting_voting_system.sql` L258–268 (before target; LOCAL-008/011+ runtime previously applied this file).

Historical column list at CREATE (and still the live shape immediately before `20260405120000` on clean replay):

- `id uuid PK`
- `agenda_item_id uuid NOT NULL REFERENCES meeting_agenda_items(id)`
- `voter_id uuid NOT NULL REFERENCES profiles(id)`
- `vote_decision vote_decision NOT NULL`
- `is_proxy_vote boolean`
- `proxy_for_user_id uuid`
- `voted_at timestamptz`
- `comments text`
- UNIQUE `(agenda_item_id, voter_id)`

```
PRE-TARGET meeting_id ON public.meeting_votes = NO
HISTORICAL JOIN KEY                          = agenda_item_id
```

No pre-target migration `ALTER TABLE … meeting_votes ADD COLUMN meeting_id`.

Sibling tables created in the **same** origin file **do** have `meeting_id`:

| Table | Origin | Has `meeting_id` before target |
|-------|--------|--------------------------------|
| `meeting_agenda_items` | same file L167 | **YES** |
| `meeting_attendees` | same file L214 | **YES** |
| `meeting_documents` | same file L363 | **YES** |
| `meeting_quota_tracker` | same file L395 | **YES** (same pattern) |
| `meeting_votes` | same file L258 | **NO** |

The target copied the `meeting_id` join pattern from those siblings onto `meeting_votes`, which historically links to a meeting only **through** `agenda_item_id → meeting_agenda_items.meeting_id`.

---

## 7. Exact migration order

| Timestamp | File | Role vs `mv.meeting_id` |
|-----------|------|-------------------------|
| `20260320044053` | `create_meeting_voting_system.sql` | **CREATE** `meeting_votes` **without** `meeting_id` |
| `20260404120000` | `create_leads.sql` | LOCAL-015 highest applied (index **72**) |
| `20260405115900` | `hmd009_reconstruct_hiring_jobs.sql` | LOCAL-016 highest applied (index **73**) · **unrelated object** |
| `20260405120000` | **target** | first HARD use of `mv.meeting_id` (index **74**) |
| `20260405120100` | `multi_tenant_rls.sql` | later RLS on `meeting_votes.property_id` · **not reached** |
| `20260406000000` | W2 | **after target** · **not reached** |
| `20260409120000` | April HARD | **after target** · **not reached** |
| `20260409190000` | `meeting_module_three_layer.sql` | **first CREATE** of a `public.meeting_votes` that **has** `meeting_id` (after renaming legacy table to `meeting_votes_legacy`) |
| `20260409210000` | `meeting_module_production_repair.sql` | later repair of the same new model |

```
meeting_id APPEARS ON A public.meeting_votes =
  AFTER TARGET
  first in 20260409190000
  as a NEW table after RENAME of the 20260320 table
  NOT as ALTER COLUMN on the pre-target object
```

Taxonomy of origin timing:

| Option | Result |
|--------|--------|
| A. column origin before target | **NO** |
| B. column origin inside target after the failing statement | **NO** |
| C. column origin only in a later migration | **YES** — later **replacement table**, not an ALTER of the live 20260320 table |
| D. never in historical repository | **NO** — later files do create `meeting_id` on a new `meeting_votes` |

---

## 8. Classification tests

| Hypothesis | Result | Why |
|------------|--------|-----|
| Source corruption of `mv.meeting_id` | **REJECTED** | present unchanged in `fb009423` origin |
| Parser / encoding defect | **REJECTED** | runtime error is missing column, not a syntax/encoding error |
| Transaction-boundary / enum | **REJECTED** | error is `column … does not exist`, not `unsafe use of new value` |
| Wrong-column | **SUPPORTED** | historical `meeting_votes` key is `agenda_item_id`, not `meeting_id` |
| Wrong-alias already present in the same statement | **NOT SUFFICIENT** | `m` is `meetings` (`m.id`); no same-statement alias already owns `meeting_votes.meeting_id`. A historical join would need an **added** `meeting_agenda_items` join. That is analysis only. **No repair.** |
| Missing CREATE of `meeting_votes` | **REJECTED** | table exists; LOCAL-016 reached L280 |
| HMD-003-style never-origin of the table | **REJECTED** | CREATE exists at `20260320044053` |
| HMD-009-style CREATE-then-DROP of this table | **REJECTED** | no DROP of `meeting_votes` before the target |
| Missing historical `meeting_id` **on this same table** as a lost origin | **NOT PROVEN** | no earlier CREATE/ALTER of that column on the 20260320 object |
| Original SQL / schema-assumption defect | **SUPPORTED** | origin target HARD-uses a column the predecessor table never had |

Application code (`src/features/meetings/api.ts` selecting `meeting_id` from `meeting_votes`) is **SUPPORTING ONLY**. It reflects the **later** 20260409+ model, not the 20260320 clean-replay shape. It does **not** override migration chronology.

---

## 9. Primary classification

```
PRIMARY = B. ORIGINAL HISTORICAL SQL / SCHEMA-ASSUMPTION DEFECT
SUBTYPE = ORIGINAL CLEAN-REPLAY WRONG-COLUMN ASSUMPTION ON EXISTING TABLE
```

Closest analogue: **HMD-009** (same file; original clean-replay design inconsistency). **Not the same defect.** HMD-009 missing object is a dropped table; HMD-010 missing object is a column the live table never had.

HMD-003 is a broader schema-origin family but owns invoices / anomalies / `invoice_ai_audits`, not `meeting_votes`.

HMD-005 / HMD-006 / HMD-007 / HMD-008 do **not** own this failure.

---

## 10. Remediation eligibility — analysis only

| Option | Eligibility | Notes |
|--------|-------------|-------|
| **A** Exact historical source restoration of the target | **NOT INDICATED** | failing SQL is original |
| **B** Reconstruct `meeting_id` onto pre-target `meeting_votes` | **NOT PROVEN AS HISTORICAL ORIGIN** | would invent a column the 20260320 table never had; later `meeting_id` belongs to a **renamed/replaced** table |
| **C** Forward fix after the target | **INSUFFICIENT FOR CLEAN REPLAY** | replay dies at index **74** |
| **D** Quarantine the target | **NOT AUTHORIZED** | core multi-tenant schema |
| **E** Rewrite L280–283 to join via `agenda_item_id` | **FORWARD DESIGN CHANGE** · **NOT AUTHORIZED HERE** | would change original target SQL |

```
PROGRAM AUTHORITY = NOT ISSUED
IMPLEMENTATION    = NOT AUTHORIZED
RECONSTRUCTION    = NOT CREATED
REPAIR            = NOT AUTHORIZED
```

---

## 11. Quarantine lock

```
GLOBAL QUARANTINE = exactly 20260314195641_add_demo_data.sql
COUNT             = 1
TARGET QUARANTINE = NOT AUTHORIZED
```

---

## 12. Locks

```
HMD-009 = OPEN / OPTION B / RECONSTRUCTION IMPLEMENTED /
          IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
HMD-009 RECONSTRUCTION = REACHED / APPLIED
HMD-009 PRIOR hiring_jobs ERROR = NOT REPRODUCED
HMD-009 TARGET = REACHED / NOT APPLIED
HMD-008 = OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-007 = OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-006 = OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-005 = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-003 = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
W2 / April HARD / July S1 = NOT REACHED / NOT APPLIED
RU-1.1 = REPOSITORY IMPLEMENTED / DB NOT APPLIED
RU-1.2 = REPOSITORY IMPLEMENTED / DB NOT APPLIED / RUNTIME NOT VERIFIED
RU-1.4 = RUNTIME NOT AUTHORIZED
DATABASE BASELINE VERIFIED = NO
PRESERVE/HANDOFF = NOT REACHED
BASELINE VERIFIER = NOT RUN
EIR = NONE
ACCEPTANCE = BLOCKED
CERTIFICATION = NOT ISSUED
RUNTIME COMMITTED = NOT CERTIFIED
FINAL COMMIT PATH = BLOCKED
LOCAL-016 = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE / attempts 1 / NO RETRY
LOCAL-017 = NOT ISSUED
```

---

## 13. Next governance action

```
NEXT = HMD-010 PROGRAM AUTHORITY DECISION
```

A later PAD may choose among eligible remedies. This record **does not** select a remedy. **Do not** issue LOCAL-017 until the defect is governed and any authorized remediation is completed.

---

## 14. Confirmation of no unauthorized work

No migration edit. No HMD-009 reconstruction edit. No new reconstruction. No BCR edit. No database / Supabase / Docker / `--apply`. No LOCAL-016 retry. No LOCAL-017. No PAD-058. No implementation authorization. No commit.

---

**End of document — E-02 HMD-010 Forensic Investigation · v1.0 — 2026-08-30**
