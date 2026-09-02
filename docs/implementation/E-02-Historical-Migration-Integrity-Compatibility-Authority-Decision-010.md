# E-02 Program Authority Decision — Historical Migration Integrity / Compatibility (Successor)

## Narrow Original-Historical-SQL Compatibility Correction · HMD-011 · `public.meeting_quota_tracker` / `mqt.meeting_id`

| Field | Value |
|-------|-------|
| **Document Type** | **Program Authority Decision (Supplement)** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Parent Authority** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) v1.0 (PAD-001 – PAD-010) |
| **Direct Predecessor Supplement** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-009.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-009.md) (**PAD-059** · HMIC-097 – HMIC-108 · HOSCC family architecture) |
| **Substantive HOSCC predecessor** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-008.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-008.md) (**PAD-058** · HMIC-085 – HMIC-096 · HMD-010 Option C · **IMMUTABLE / NOT AMENDED**) |
| **Prior Predecessor Supplements** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md) (**PAD-057** · HMD-009) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md) (**PAD-056** · HMD-008) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md) (**PAD-055** · HMD-007) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md) (**PAD-054** · HMD-006) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md) (**PAD-053** · HMD-005) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md) (**PAD-052** · HMD-004) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) (PAD-039 – PAD-050 · HMD-002) · [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) (PAD-051 · HMD-003) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038 · HMD-001) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025) |
| **Forensic record** | [`E-02-HMD-011-Multi-Tenant-Properties-Meeting-Quota-Tracker-Meeting-Id-Forensic-Investigation.md`](E-02-HMD-011-Multi-Tenant-Properties-Meeting-Quota-Tracker-Meeting-Id-Forensic-Investigation.md) |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-017.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-017.md) · run `local-017-20260831a` |
| **Supplement ID** | **PAD-060** |
| **Authority Question Register** | **HMIC-109 – HMIC-120** |
| **Status** | **APPROVED WITH CONDITIONS — OPTION C (FILE-SPECIFIC SUCCESSOR)** |
| **Selected Policy** | **NARROW ORIGINAL-HISTORICAL-SQL COMPATIBILITY CORRECTION** |
| **Defect** | **HMD-011** |
| **Authority Level** | Program Authority |
| **Effective Date** | 2026-08-31 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-010.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-010.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **NO** |

> **Authority path finding: YES.** Filename `E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-010.md` is **authority-safe** as the next successor in the existing **HMIC** decision family (`Decision.md` · `Decision-002.md` … `Decision-009.md` · **this Decision-010**). Distinct filename keeps PAD-039 – PAD-059 **immutable**. This is **not** a new governance tier. PAD identifiers are **not** CS/FD registry numbers.
>
> Sequence: Parent PAD-001 – PAD-010 · DAA PAD-011 – PAD-025 · HMBC PAD-026 – PAD-038 · HMIC PAD-039 – PAD-050 · HFSO PAD-051 · HMIC successor PAD-052 – PAD-059 · **this supplement PAD-060**. Highest previously allocated PAD is **PAD-059**. **PAD-060 is the next unused identifier.** **PAD-060 did not already exist. PAD-060 was not reserved. PAD-060 has not previously been issued.** Mentions of “PAD-060+ not allocated” in PAD-059 are **locks**, not reservations. **No PAD-061+ supersedes the sequence.** **PAD-061+ is not allocated.**
>
> HMIC subsequence: HMIC-001 – HMIC-096 (through PAD-058) · HMIC-097 – HMIC-108 (PAD-059) · **this register HMIC-109 – HMIC-120**. Highest previously allocated HMIC is **HMIC-108**. **HMIC-109 – HMIC-120 is the next unused 12-clause range.** No HMIC-109+ existed before this issuance.
>
> **Why a new PAD is required (not reflexive):** PAD-058 / HMD-010 governs **`meeting_votes` / `mv.meeting_id`** only. HMD-011 is a **different construct** (`meeting_quota_tracker` / `mqt.meeting_id`) in the **same target file**. PAD-059 established the **HOSCC** family but **does not** select remediation for HMD-011. PAD-057 / HMD-009 reconstruction **does not** apply. HMIR restoration **cannot** restore a non-defective origin: failing `mqt.meeting_id` **already exists in proven origin**. A file-specific successor PAD is required to allocate remediation policy for **HMD-011**.
>
> **HOSCC precedent:** PAD-058 Option C and PAD-059 HOSCC family govern **how** narrow original-historical-SQL compatibility correction is implemented and authorized. This PAD **selects Option C for HMD-011** using repository-established terminology. It **does not** mechanically copy HMD-010’s `agenda_item_id` join rewrite. HMD-011’s correction is **independently derived** from `meeting_quota_tracker` fiscal-year aggregate semantics and clean-baseline row facts.

> **Scope lock:** Establishes **Option C — narrow original-historical-SQL compatibility correction** for the LOCAL-017 first failure at `20260405120000_multi_tenant_properties.sql` / `UPDATE public.meeting_quota_tracker mqt` / `mqt.meeting_id`. This record **does not** edit the target · **does not** add `meeting_id` · **does not** create reconstruction · **does not** amend PAD-058 / PAD-059 · **does not** edit HMD-010 HOSCC L280–285 · **does not** edit HMD-009 reconstruction · **does not** issue Implementation Authorization · **does not** issue `E-02-HOSCC-IA-002` · **does not** retry LOCAL-017 · **does not** issue LOCAL-018 · **does not** expand quarantine · **does not** modify BCR/guard/verifier · **does not** run database/Supabase/Docker · **does not** authorize RU-1.4.

```
HISTORICAL MIGRATION INTEGRITY / COMPATIBILITY AUTHORITY-010 = ESTABLISHED (THIS SUPPLEMENT)
DECISION                                                     = APPROVED WITH CONDITIONS — OPTION C
SELECTED POLICY                                              = NARROW ORIGINAL-HISTORICAL-SQL
                                                               COMPATIBILITY CORRECTION
REMEDIATION MODEL                                            = OMIT ONE INVALID MEETING-KEYED
                                                               BACKFILL STATEMENT ONLY
                                                               + PRESERVE EXISTING default_id
                                                               FALLBACK BACKFILL
                                                               + NO SCHEMA INVENTION
SOURCE CORRUPTION OF FAILING SQL                             = REJECTED
FAILING mqt.meeting_id EXISTS IN TARGET ORIGIN               = YES
TARGET ORIGIN COMMIT                                         = fb0094239d74cc4466853cc1cfcb906164d0fb89
TARGET ORIGIN BLOB                                           = b8c2b851d41d2218e90acba38403288cec5e28c9
CURRENT TARGET BLOB (HMD-010 HOSCC IN PLACE)                 = a37966fe60a9a7be1897e04b521d284a55185805
EXACT HISTORICAL SOURCE RESTORATION                          = NOT APPLICABLE / REJECTED
ADD-meeting_id RECONSTRUCTION                                = REJECTED / NOT HISTORICALLY GROUNDED
FORWARD-FIX                                                  = REJECTED / INSUFFICIENT FOR CLEAN REPLAY
TARGET QUARANTINE                                            = NOT AUTHORIZED / REJECTED
HMD-011                                                      = OPEN / DISTINCT /
                                                               ORIGINAL HISTORICAL SQL /
                                                               SCHEMA-ASSUMPTION DEFECT /
                                                               ORIGINAL CLEAN-REPLAY WRONG-COLUMN
                                                               ASSUMPTION ON EXISTING TABLE /
                                                               OPTION C SELECTED /
                                                               IMPLEMENTATION NOT AUTHORIZED YET
TARGET                                                       = 20260405120000_multi_tenant_properties.sql
FAILING STATEMENT                                            = L294–297 UPDATE public.meeting_quota_tracker mqt
FAILING REFERENCE                                            = mqt.meeting_id
BOUND OBJECT                                                 = public.meeting_quota_tracker
HISTORICAL KEY                                               = fiscal_year (UNIQUE)
PRE-TARGET meeting_id ON BOUND OBJECT                        = ABSENT
AUTHORIZED FUTURE FILE COUNT                                 = EXACTLY 1
AUTHORIZED FUTURE STATEMENT COUNT                            = EXACTLY 1 (OMIT invalid UPDATE)
FUTURE SQL WRITTEN                                           = NO
HMD-010 PRIOR HOSCC                                          = PRESERVED / IMMUTABLE
HMD-009                                                      = OPEN / OPTION B /
                                                               RECONSTRUCTION IMPLEMENTED /
                                                               IMPLEMENTATION COMPLETED /
                                                               RUNTIME REPLAY VERIFICATION PENDING
LOCAL-017                                                    = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED /
                                                               EVIDENCE IMMUTABLE
LOCAL-017 ATTEMPTS                                           = 1
LOCAL-017 RETRY                                              = NOT AUTHORIZED
LOCAL-018                                                    = NOT ISSUED
BCR EDIT                                                     = NOT AUTHORIZED
PAD-061+                                                     = NOT ALLOCATED
```

---

## 1. Authority / provenance

| Record | Role |
|--------|------|
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) | Parent — PAD-001 – PAD-010 |
| PAD-058 / Decision-008 | HMD-010 substantive Option C — **immutable** · **not amended** |
| PAD-059 / Decision-009 | HOSCC family architecture — **immutable** · **not amended** |
| [`E-02-HMD-011-Multi-Tenant-Properties-Meeting-Quota-Tracker-Meeting-Id-Forensic-Investigation.md`](E-02-HMD-011-Multi-Tenant-Properties-Meeting-Quota-Tracker-Meeting-Id-Forensic-Investigation.md) | HMD-011 forensic facts — consumed as **immutable classification**; remediation semantics **independently re-proven** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-017.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-017.md) | LOCAL-017 **APPLICATION_FAILED** · evidence **immutable** · run `local-017-20260831a` |
| [`tests/e02/evidence/local-017-20260831a/bcr-replay-manifest.json`](../../tests/e02/evidence/local-017-20260831a/bcr-replay-manifest.json) | Manifest `result=APPLICATION_FAILED` · executed **73** · failure string as below |

**MANDATORY STOP does not apply.** Authority sequence is unambiguous. Forensic hashes match. Target identity matches. Historical table semantics and zero-row clean-baseline facts are proven from migration source. Authority supports issuance of PAD-060.

---

## 2. Pre-issuance gates (this issuance — read-only)

| ID | Check | Result |
|----|--------|--------|
| A. PAD sequence | Highest issued HMIC Decision = **Decision-009 / PAD-059 / HMIC-097 – HMIC-108**. Decision-010 **absent**. PAD-060 document **absent**. PAD-060 **not reserved**. PAD-061+ **absent**. | **PASS** |
| B. Next unused IDs | PAD-060 · Decision-010 · HMIC-109 – HMIC-120 | **PASS** |
| C. HMD-011 identity | **OPEN / DISTINCT / FORENSIC INVESTIGATION COMPLETE**. Not HMD-009 or HMD-010 extension. No prior repair PAD/IA/Completion for this construct. | **PASS** |
| D. HMD-009 / HMD-010 preserved | HMD-009 **OPEN / RUNTIME PENDING**. HMD-010 **OPEN / HOSCC IMPLEMENTED / RUNTIME PENDING**. LOCAL-017 `mv.meeting_id` **NOT REPRODUCED**. | **PASS** |
| E. LOCAL-017 immutability | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** · attempts **1** · retry **NOT AUTHORIZED** · run `local-017-20260831a` · executed **73** · highest applied `20260405115900_hmd009_reconstruct_hiring_jobs.sql` · first failing `20260405120000_multi_tenant_properties.sql` index **74** · error `column mqt.meeting_id does not exist` | **PASS** |
| F. Target identity | Current blob `a37966fe60a9a7be1897e04b521d284a55185805` · origin `fb009423` blob `b8c2b851d41d2218e90acba38403288cec5e28c9` · CURRENT ≠ origin due to **governed HMD-010 HOSCC** + `8c30eb2` comment/trailing blanks · failing `mqt.meeting_id` block **unchanged from origin** | **PASS** |
| G. Failure construct | Unguarded `UPDATE public.meeting_quota_tracker mqt` L294–297 inside `DO $c$`; `mqt` = TABLE alias bound to `public.meeting_quota_tracker` | **PASS** |
| H. Repair authority exists? | **NO** prior HMD-011 PAD/IA | **PASS** |
| I. Later PAD reserved? | **NO** | **PASS** |

---

## 3. LOCAL-017 evidence lock

```
E-02-DBA-LOCAL-017              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
ATTEMPTS                        = 1
RETRY                           = NOT AUTHORIZED
evidenceRunId                   = local-017-20260831a
Executed migration count        = 73
Highest applied                 = 20260405115900_hmd009_reconstruct_hiring_jobs.sql  (index 73)
First failing                   = 20260405120000_multi_tenant_properties.sql
First failing executable index  = 74
Exact error                     = column mqt.meeting_id does not exist
Prior LOCAL-016 mv.meeting_id   = NOT REPRODUCED
Preserve / handoff              = NOT REACHED
Baseline verifier               = NOT RUN
DATABASE BASELINE VERIFIED      = NO
```

This issuance **does not** alter LOCAL-017 evidence or the replay manifest. **No LOCAL-017 retry. No LOCAL-018.**

---

## 4. Target identity and source-integrity rejection

```
TARGET PATH                     = supabase/migrations/20260405120000_multi_tenant_properties.sql
CURRENT BLOB                    = a37966fe60a9a7be1897e04b521d284a55185805
TARGET ORIGIN COMMIT            = fb0094239d74cc4466853cc1cfcb906164d0fb89
TARGET ORIGIN BLOB              = b8c2b851d41d2218e90acba38403288cec5e28c9
FAILING STATEMENT               = L294–297  UPDATE public.meeting_quota_tracker mqt … WHERE mqt.meeting_id = m.id
FAILING REFERENCE vs ORIGIN     = UNCHANGED
NON-CAUSAL CURRENT vs ORIGIN    = HMD-010 HOSCC mv block (L280–285); comment → → ? ; trailing LF blanks (8c30eb2)
8c30eb2 meeting_quota_tracker   = NO HUNKS
```

```
POST-CREATION SOURCE-INTEGRITY DEFECT = REJECTED
TARGET SOURCE RESTORATION             = NOT APPLICABLE / REJECTED AS THIS REMEDY
```

The failing `mqt.meeting_id` reference is **original target text**, not post-creation corruption.

---

## 5. Failure construct

Inside `DO $c$` beginning at L74:

```
L294  UPDATE public.meeting_quota_tracker mqt
L295  SET property_id = m.property_id
L296  FROM public.meetings m
L297  WHERE mqt.meeting_id = m.id AND mqt.property_id IS NULL;
L298  UPDATE public.meeting_quota_tracker SET property_id = default_id WHERE property_id IS NULL;
```

| Field | Result |
|-------|--------|
| Construct | **DML UPDATE / tenant property backfill** |
| Alias `mqt` | **TABLE alias** |
| Bound object | **`public.meeting_quota_tracker`** |
| Object type | **TABLE** |
| Failing reference | **`mqt.meeting_id`** at L297 |
| Sibling fallback | **L298** `default_id` backfill — **immediate successor in same block** |

LOCAL-017 passed HMD-010-corrected `meeting_votes` backfill (L280–285) and failed on L294–297.

---

## 6. Pre-target schema — `public.meeting_quota_tracker`

Origin: `20260320044053_create_meeting_voting_system.sql` L395–408.

| Column / constraint | Pre-target |
|---------------------|------------|
| `id` | uuid PK |
| `fiscal_year` | integer NOT NULL **UNIQUE** |
| `agm_count` … `total_overtime_fees` | aggregate counters |
| `created_at` / `updated_at` | timestamptz |
| `meeting_id` | **ABSENT** |
| `property_id` | **ABSENT** |

Repository search before `20260405120000`: **no** `ALTER TABLE meeting_quota_tracker ADD COLUMN meeting_id` · **no** table recreation with `meeting_id`.

Trigger `update_meeting_quota()` (same origin file L449–485) maintains rows by **`fiscal_year`** derived from `meetings.scheduled_date`. **No FK to meetings.** One tracker row per fiscal year globally (pre-multi-tenant single-community assumption).

---

## 7. Target `property_id` evolution and intended final schema

| Step | Location | Action |
|------|----------|--------|
| ADD `property_id` | L116–117 | `ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id)` — **nullable** |
| Invalid backfill | L294–297 | Attempt join via nonexistent `mqt.meeting_id` |
| Valid fallback backfill | L298 | `SET property_id = default_id WHERE property_id IS NULL` |
| SET NOT NULL | L390–391 | `ALTER COLUMN property_id SET NOT NULL` (guarded by column existence) |

**Intended final schema after target succeeds (from target + immediate successor RLS):**

- `property_id` **NOT NULL** · FK to `properties(id)`
- **`fiscal_year UNIQUE` unchanged** — target does **not** drop or replace this constraint
- No new `(property_id, fiscal_year)` unique index in target
- `20260405120100_multi_tenant_rls.sql` L347–350: RLS policy `mqt_all_tenant` filters on `property_id IN user_property_ids()`
- `20260410120000_property_members_saas.sql` replaces same policy pattern — **property-scoped tenant isolation assumed**

**Schema tension (recorded, not remediated here):** global `fiscal_year UNIQUE` + per-property RLS implies **one tracker row per calendar year for the whole database**, not per property per year. Later `20260409190000` / `20260409210000` drop `meeting_quota_tracker_trigger` and introduce `meeting_yearly_stats` as **property-scoped derived stats**. HMD-011 Option C **does not** resolve this broader design tension; it only removes the **invalid SQL reference** blocking clean replay.

---

## 8. Clean-baseline row facts and zero-row SQL validity

| Question | Result |
|----------|--------|
| Direct `INSERT INTO meeting_quota_tracker` before target? | **Only** inside trigger on `meetings` INSERT/UPDATE (`20260320044053` L457–459) |
| Executable pre-target `INSERT INTO meetings`? | **NONE** (later files only, post-`20261215*`) |
| Quarantined demo `20260314195641` | **NOT executed** · no `meeting` / `meeting_quota` seed found in that file |
| Clean-baseline pre-target `mqt` rows | **ZERO / EFFECTIVELY ZERO** |
| Parser/binder failure with zero rows? | **YES** — invalid column reference fails regardless of row count |

```
ZERO ROWS ≠ VALID SQL
```

---

## 9. Remediation semantics analysis (§15–§16 gates)

| Question | Answer |
|----------|--------|
| A. Globally fiscal-year aggregated? | **YES** — one row per `fiscal_year` (UNIQUE) |
| B. Multiple properties share same fiscal year? | **YES** — under multi-tenant, many properties share calendar years |
| C. Per-property mapping without schema change? | **NO** — `fiscal_year UNIQUE` prevents multiple property rows per year |
| D. Target alters uniqueness to property-scoped? | **NO** |
| E. Target multi-tenant intent for tracker | Add nullable `property_id`, backfill, **NOT NULL**, tenant RLS — **without** splitting aggregate rows per property |
| F. Historical data backfill needed on declared clean baseline? | **NO** — zero pre-target rows; L298 suffices for any null `property_id` after ADD |

**Historically valid mapping via `mqt.meeting_id`:** **NONE** — column never existed; table is not meeting-keyed.

**Critical backfill decision:** **B** — the invalid L294–297 block must be **omitted/skipped** because (1) no historical `meeting_id` join exists, (2) declared clean baseline has **zero** pre-target rows, (3) sibling **L298** already performs the only applicable backfill (`default_id` for all null `property_id` rows), matching aggregate semantics for a single default property at replay time.

This is **not** a substitute join rewrite analogous to HMD-010’s `agenda_item_id` path. **No alternate meeting-keyed mapping is proven.**

---

## 10. Subsequent-lineage evidence

| Migration | Evidence |
|-----------|----------|
| `20260405120100_multi_tenant_rls.sql` | `property_id` tenant RLS on `meeting_quota_tracker` |
| `20260409190000_meeting_module_three_layer.sql` | Drops `meeting_quota_tracker_trigger`; `meeting_yearly_stats` view **replaces fragile tracker reads** · property-scoped derived counts |
| `20260409210000_meeting_module_production_repair.sql` | Same trigger drop + view comment |
| `20260410120000_property_members_saas.sql` | Replaces `mqt_all_tenant` policy |

Earliest proof of stable post-target direction: tracker becomes **legacy**; **property-scoped stats** move to views. HMD-011 correction must **not** backport later view semantics into the target.

---

## 11. HOSCC precedent (read-only)

| Record | Role |
|--------|------|
| PAD-058 | Defines **Option C** = **narrow original-historical-SQL compatibility correction** · exactly one file · exactly one statement · no schema invention |
| PAD-059 | Establishes **HOSCC** IA/Completion family · `E-02-HOSCC-IA` first member **CONSUMED** for HMD-010 |
| `E-02-HOSCC-IA` | Next member would be **`E-02-HOSCC-IA-002`** (PAD-059 numbering: unnumbered first, then `-002`) — **not issued here** |

HMD-010 Option C **rewrote** the failing UPDATE with a proven historical join. HMD-011 Option C **omits** the failing UPDATE because **no** proven historical join exists; preservation of L298 completes the target’s stated backfill chain for declared clean baseline.

---

## 12. Evaluated options

| Option | This PAD’s name | Decision | Reason |
|--------|-----------------|----------|--------|
| **A** | Exact historical source restoration | **REJECTED / NOT APPLICABLE** | Failing `mqt.meeting_id` exists in origin `fb009423` / blob `b8c2b851` |
| **B** | Pre-target compatibility reconstruction (`ADD meeting_id`) | **REJECTED / NOT HISTORICALLY GROUNDED / NO PROVEN HISTORICAL ORIGIN** | Would invent per-meeting column contradicting fiscal-year UNIQUE aggregate design |
| **C** | Narrow original-historical-SQL compatibility correction | **SELECTED** | Omit invalid meeting-keyed backfill; preserve L298 `default_id` fallback; proven semantics |
| **D** | Forward fix after the target | **REJECTED / INSUFFICIENT FOR CLEAN REPLAY** | Replay dies at executable index **74** |
| **E** | Quarantine the target | **NOT AUTHORIZED / REJECTED** | Core multi-tenant schema; global quarantine remains count **1** |
| **F** | No remediation / additional forensics | **NOT REQUIRED** | Semantics and zero-row facts are unambiguous |

```
GLOBAL QUARANTINE = EXACTLY 20260314195641_add_demo_data.sql
COUNT             = 1
TARGET QUARANTINE = NOT AUTHORIZED
```

---

## 13. Selected remediation — Option C

```
SELECTED = OPTION C
MODEL    = NARROW ORIGINAL-HISTORICAL-SQL COMPATIBILITY CORRECTION
PURPOSE  = remove the invalid meeting-keyed backfill that references a
           column the historical table never had, while preserving the
           target's ADD property_id, existing default_id fallback backfill,
           and SET NOT NULL chain — without inventing meeting_id
```

### 13.1 Authorized future correction (policy only — no SQL written)

| Item | Authority |
|------|-----------|
| Option name | **OPTION C / NARROW ORIGINAL-HISTORICAL-SQL COMPATIBILITY CORRECTION** |
| Implementation family (future) | **HOSCC** per PAD-059 — successor IA **`E-02-HOSCC-IA-002`** (not issued here) |
| Base blob for future edit | **`a37966fe60a9a7be1897e04b521d284a55185805`** (includes **immutable** HMD-010 HOSCC) |
| Authorized file count | **EXACTLY 1** |
| Authorized file | `supabase/migrations/20260405120000_multi_tenant_properties.sql` |
| Authorized statement / fragment count | **EXACTLY 1** |
| Authorized act | **OMIT / REMOVE** the unguarded invalid UPDATE currently at **L294–297** |
| Statement to remove | the full `UPDATE public.meeting_quota_tracker mqt` block through `WHERE mqt.meeting_id = m.id AND mqt.property_id IS NULL` |
| Failing reference to eliminate | **`mqt.meeting_id`** — by **omission** of the entire invalid statement |
| Bound object | **`public.meeting_quota_tracker`** (alias **`mqt`**) |
| **Preserved** ADD | L116–117 `ADD COLUMN property_id` — **UNCHANGED** |
| **Preserved** fallback backfill | L298 `UPDATE public.meeting_quota_tracker SET property_id = default_id WHERE property_id IS NULL` — **UNCHANGED** |
| **Preserved** NOT NULL | L390–391 `ALTER COLUMN property_id SET NOT NULL` — **UNCHANGED** |
| **Preserved** HMD-010 HOSCC | L280–285 `meeting_votes` correction — **UNCHANGED** |

**Canonical authorized future state** (conceptual — implementation writes SQL in separate IA):

```
-- L294–297 invalid UPDATE REMOVED
-- L298 default_id fallback REMAINS:
UPDATE public.meeting_quota_tracker SET property_id = default_id WHERE property_id IS NULL;
```

### 13.2 Prohibited future acts

```
REPLACE mqt.meeting_id WITH fiscal_year JOIN WITHOUT NEW PAD AUTHORITY     = PROHIBITED
ADD COLUMN meeting_id / reconstruction migration                             = PROHIBITED
EDIT L298 default_id fallback                                                = PROHIBITED
EDIT L116–117 ADD property_id                                                = PROHIBITED
EDIT L390–391 SET NOT NULL                                                   = PROHIBITED
EDIT HMD-010 HOSCC L280–285                                                  = PROHIBITED
EDIT HMD-009 reconstruction 20260405115900                                   = PROHIBITED
DROP/ALTER fiscal_year UNIQUE to invent per-property rows                    = PROHIBITED
WHOLE-FILE REPLACEMENT                                                       = PROHIBITED
RESTORE TARGET TO ORIGIN BLOB b8c2b851 (would undo HMD-010 HOSCC)            = PROHIBITED
RESTORE 8c30eb2 comment / trailing-whitespace drift                          = PROHIBITED
QUARANTINE CHANGE                                                            = PROHIBITED
```

### 13.3 Declared-clean-baseline and nonempty-data bounds

```
DECLARED CLEAN BASELINE REPLAY BOUND           = YES
  - zero pre-target tracker rows proven
  - omission equivalent to no-op for historical data on clean replay
  - L298 completes property_id assignment for any null rows before SET NOT NULL

NON-CLEAN DEPLOYED DATA                        = PARTIALLY ADDRESSED BY L298 ONLY
  - any pre-existing tracker rows with null property_id receive default_id via L298
  - this PAD does NOT claim full multi-property aggregate semantics for
    fiscal_year UNIQUE + property_id NOT NULL beyond making SQL executable
  - broader fiscal_year/property design tension remains OUT OF SCOPE
```

### 13.4 SET NOT NULL safety

On **declared clean baseline**: zero rows → ADD nullable column → L298 (no-op on zero rows) → SET NOT NULL **succeeds**.

On **nonzero** pre-target rows: L298 must assign `default_id` to all null `property_id` before L390–391; **if L298 is preserved unchanged**, SET NOT NULL **succeeds** when no null `property_id` remains. This PAD **does not** certify universal production migration safety beyond the proven backfill chain.

---

## 14. Implementation authority lock

PAD-060 **selects the model**. It **does not** authorize implementation.

A **separate** future **HOSCC** Implementation Authorization must:

- verify PAD-060 issued / immutable;
- verify PAD-058 / PAD-059 unchanged;
- verify HMD-011 status and this exact §13 bind;
- use **`E-02-HOSCC-IA-002`** (next unused HOSCC IA per PAD-059 numbering);
- start from blob **`a37966fe`**;
- authorize **exactly** §13.1 omission after fresh worktree/hash check;
- forbid schema invention, HMD-010 / HMD-009 edits, whole-file replace;
- require static verification;
- forbid runtime application until later governance.

**Do not create that IA now.**

```
PAD-060
→ HMD-011 HOSCC Implementation Authorization (E-02-HOSCC-IA-002)
→ omit L294–297 only
→ HOSCC Implementation Completion
→ successor BCR/DBA governance as required
→ only then future runtime replay
```

**No automatic LOCAL-018. No LOCAL-017 retry.**

---

## 15. Relations / distinctness locks

| Defect | Relation / state |
|--------|------------------|
| **HMD-009** | **OPEN / OPTION B / RECONSTRUCTION APPLIED / TARGET NOT APPLIED / RUNTIME REPLAY VERIFICATION PENDING** · **DISTINCT** · reconstruction **IMMUTABLE** |
| **HMD-010** | **OPEN / HOSCC IMPLEMENTED / PRIOR `mv.meeting_id` NOT REPRODUCED ON LOCAL-017 / TARGET NOT APPLIED / RUNTIME REPLAY VERIFICATION PENDING** · **DISTINCT** · L280–285 **IMMUTABLE** |
| **HMD-011** | **this defect** · **not CLOSED** |
| **HMD-005 – HMD-008** | **OPEN / RUNTIME REPLAY VERIFIED** · **DISTINCT** — do not reopen |
| **HMD-003** | **OPEN / RUNTIME REPLAY VERIFICATION PENDING** · W2 / April HARD / July S1 **NOT REACHED** |

```
HMD-003 W2 / APRIL HARD / JULY S1 = NOT REACHED / NOT APPLIED (LOCAL-017 fail at index 74)
```

---

## 16. BCR / LOCAL / RU / certification locks

```
BCR DBA PIN (read-only)            = E-02-DBA-LOCAL-017
BCR ARTIFACT AUTHORITY (read-only) = E-02-BCR-IA-017
BCR EDIT                           = NOT AUTHORIZED
EXACT-MATCH                        = RETAINED
DUAL ACCEPTANCE                    = NONE
LOCAL-017                          = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-017 ATTEMPTS                 = 1
LOCAL-017 RETRY                    = NOT AUTHORIZED
LOCAL-018                          = NOT ISSUED
DATABASE BASELINE VERIFIED         = NO
PRESERVE/HANDOFF                   = NOT REACHED
BASELINE VERIFIER                  = NOT RUN
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

## 17. Exact next action

```
NEXT = HMD-011 HOSCC IMPLEMENTATION AUTHORIZATION
       (E-02-HOSCC-IA-002 per PAD-059 numbering)
       after independent verification of PAD-060 §13.1 bind
```

**Do not implement** the SQL omission in this PAD.

---

## 18. Program Authority Decisions (PAD-060 / HMIC-109 – HMIC-120)

### PAD-060 / HMIC-109 — Successor file-specific Option C permitted

**RESOLVED:** A file-specific HMIC successor may select **Option C** for HMD-011. PAD-058 governs **HMD-010 only**. PAD-057 / HMD-009 **does not** apply.

### PAD-060 / HMIC-110 — Prior-grant coverage

**RESOLVED:** HMIR restoration **does not** apply. HFSOR reconstruction **does not** apply. PAD-058 HMD-010 bind **does not** transfer mechanically to `mqt`. HMD-010 HOSCC L280–285 **remains immutable**.

### PAD-060 / HMIC-111 — Defect identifier

**RESOLVED:** Remediation policy is allocated to **HMD-011**. HMD-009 and HMD-010 remain independently **OPEN** as locked in §15. **HMD-012+ not allocated.**

### PAD-060 / HMIC-112 — Classification

**RESOLVED:** **ORIGINAL HISTORICAL SQL / SCHEMA-ASSUMPTION DEFECT** · subtype **ORIGINAL CLEAN-REPLAY WRONG-COLUMN ASSUMPTION ON EXISTING TABLE**. Source-integrity: **REJECTED**. Missing-schema-origin for `meeting_id`: **REJECTED / NOT PROVEN**. Transaction-boundary: **REJECTED**.

### PAD-060 / HMIC-113 — Object semantics lock

**RESOLVED:** Analysis locked to pre-target **`public.meeting_quota_tracker`** fiscal-year aggregate table. **No `meeting_id`**. Historical key **`fiscal_year UNIQUE`**. Not meeting-keyed.

### PAD-060 / HMIC-114 — Selected model and exact bind

**RESOLVED:** **Option C**. **Omit** L294–297 invalid `mqt.meeting_id` UPDATE **only**. **Preserve** L298 `default_id` fallback · L116–117 ADD · L390–391 SET NOT NULL · HMD-010 HOSCC L280–285. Canonical bind in §13.1.

### PAD-060 / HMIC-115 — Prohibited substitutions

**RESOLVED:** `ADD meeting_id` **prohibited**. Invented fiscal_year join **prohibited without new authority**. L298 / ADD / SET NOT NULL / HMD-010 / HMD-009 edits **prohibited**. Whole-file replace and origin-blob restore **prohibited**.

### PAD-060 / HMIC-116 — Rejected alternatives

**RESOLVED:** Option A, Option B, Option D, Option E, fake history = **REJECTED**. Option F additional forensics = **NOT REQUIRED**.

### PAD-060 / HMIC-117 — Distinctness

**RESOLVED:** Same target file **≠** same defect. HMD-009 / HMD-010 / HMD-011 remain **DISTINCT**.

### PAD-060 / HMIC-118 — Implementation still separate

**RESOLVED:** This PAD is **not** Implementation Authorization. Target SQL **not edited**. **`E-02-HOSCC-IA-002` not issued**.

### PAD-060 / HMIC-119 — LOCAL-017 / LOCAL-018 / BCR / RU

**RESOLVED:** LOCAL-017 immutable failed · attempts **1** · retry **NOT AUTHORIZED**. LOCAL-018 **not issued**. BCR pins **unchanged** (LOCAL-017 / IA-017, read-only). RU-1.4 **not authorized**.

### PAD-060 / HMIC-120 — Quarantine / baseline / clean-baseline bound

**RESOLVED:** Global quarantine exactly `20260314195641_add_demo_data.sql` · count **1**. Database baseline **not verified**. Option C bind is **declared-clean-baseline-bounded** as §13.3. EIR / Acceptance / Certification **not issued**.

---

## 19. Issuance checklist

| ID | Check | Result |
|----|--------|--------|
| HMIC10-I01 | Decision-010 unused before this file | **PASS** |
| HMIC10-I02 | PAD-060 unused / not reserved | **PASS** |
| HMIC10-I03 | HMIC-109 – HMIC-120 unused | **PASS** |
| HMIC10-I04 | HMD-011 distinct / forensic complete | **PASS** |
| HMIC10-I05 | LOCAL-017 immutable failed facts match | **PASS** |
| HMIC10-I06 | Origin contains `mqt.meeting_id`; mqt block unchanged | **PASS** |
| HMIC10-I07 | Pre-target `meeting_id` absent | **PASS** |
| HMIC10-I08 | Zero-row clean baseline proven | **PASS** |
| HMIC10-I09 | Option C omission + L298 preserve proven | **PASS** |
| HMIC10-I10 | HMD-010 HOSCC preserved | **PASS** |
| HMIC10-I11 | Quarantine count 1 | **PASS** |
| HMIC10-I12 | No migration / BCR / DB / commit | **PASS** |
| HMIC10-I13 | Implementation not authorized | **PASS** |
| HMIC10-I14 | PAD-061+ not allocated | **PASS** |

---

## 20. Decision immutability

```
PAD-060                                                    = ISSUED / IMMUTABLE
IMPLEMENTATION                                             = NOT AUTHORIZED
TARGET SQL                                                 = NOT EDITED
RECONSTRUCTION FILE                                        = NOT CREATED
PAD-058 / PAD-059                                          = UNCHANGED / IMMUTABLE
HMD-010 HOSCC                                              = PRESERVED
```

---

**End of document — PAD-060 · HMIC-109 – HMIC-120 · HMD-011 — v1.0 — 2026-08-31**
