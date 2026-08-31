# E-02 Program Authority Decision — Historical Migration Integrity / Compatibility (Successor)

## Narrow Original-Historical-SQL Compatibility Correction · HMD-010 · `public.meeting_votes` / `mv.meeting_id`

| Field | Value |
|-------|-------|
| **Document Type** | **Program Authority Decision (Supplement)** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Parent Authority** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) v1.0 (PAD-001 – PAD-010) |
| **Direct Predecessor Supplement** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md) (**PAD-057** · HMIC-073 – HMIC-084 · HMD-009) |
| **Prior Predecessor Supplements** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md) (**PAD-056** · HMD-008) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md) (**PAD-055** · HMD-007) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md) (**PAD-054** · HMD-006) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md) (**PAD-053** · HMD-005) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md) (**PAD-052** · HMD-004) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) (PAD-039 – PAD-050 · HMD-002) · [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) (PAD-051 · HMD-003) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038 · HMD-001) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025) |
| **Forensic record** | [`E-02-HMD-010-Multi-Tenant-Properties-Meeting-Votes-Meeting-Id-Forensic-Investigation.md`](E-02-HMD-010-Multi-Tenant-Properties-Meeting-Votes-Meeting-Id-Forensic-Investigation.md) |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-016.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-016.md) · run `local-016-20260830a` |
| **Supplement ID** | **PAD-058** |
| **Authority Question Register** | **HMIC-085 – HMIC-096** |
| **Status** | **APPROVED WITH CONDITIONS — OPTION C (FILE-SPECIFIC SUCCESSOR)** |
| **Selected Policy** | **NARROW ORIGINAL-HISTORICAL-SQL COMPATIBILITY CORRECTION** |
| **Defect** | **HMD-010** |
| **Authority Level** | Program Authority |
| **Effective Date** | 2026-08-30 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-008.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-008.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **NO** |

> **Authority path finding: YES.** Filename `E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-008.md` is **authority-safe** as the next successor in the existing **HMIC** decision family (`Decision.md` · `Decision-002.md` · `Decision-003.md` · `Decision-004.md` · `Decision-005.md` · `Decision-006.md` · `Decision-007.md` · **this Decision-008**). Distinct filename keeps PAD-039 – PAD-050, **PAD-052**, **PAD-053**, **PAD-054**, **PAD-055**, **PAD-056**, and **PAD-057** **immutable**. This is **not** a new governance tier. PAD identifiers are **not** CS/FD registry numbers.
>
> Sequence: Parent PAD-001 – PAD-010 · DAA PAD-011 – PAD-025 · HMBC PAD-026 – PAD-038 · HMIC PAD-039 – PAD-050 · HFSO PAD-051 · HMIC successor PAD-052 · HMIC successor PAD-053 · HMIC successor PAD-054 · HMIC successor PAD-055 · HMIC successor PAD-056 · HMIC successor PAD-057 · **this supplement PAD-058**. Highest previously allocated PAD is **PAD-057**. **PAD-058 is the next unused identifier.** **PAD-058 did not already exist. PAD-058 was not reserved. PAD-058 has not previously been issued.** Mentions of “PAD-058 not issued / not allocated” in earlier records are **locks**, not reservations. **No PAD-059+ supersedes the sequence.** **PAD-059+ is not allocated.**
>
> HMIC subsequence: HMIC-001 – HMIC-012 (PAD-039 – PAD-050) · HMIC-013 – HMIC-024 (PAD-052) · HMIC-025 – HMIC-036 (PAD-053) · HMIC-037 – HMIC-048 (PAD-054) · HMIC-049 – HMIC-060 (PAD-055) · HMIC-061 – HMIC-072 (PAD-056) · HMIC-073 – HMIC-084 (PAD-057) · **this register HMIC-085 – HMIC-096**. Highest previously allocated HMIC is **HMIC-084**. **HMIC-085 – HMIC-096 is the next unused 12-clause range.** No HMIC-085+ existed before this issuance.
>
> **Why a new PAD is required (not reflexive):** PAD-057 / HMD-009 is **pre-target compatibility reconstruction** of `hiring_jobs` / `hiring_candidates`. HMD-010’s failing construct is a **different object** (`public.meeting_votes.meeting_id`) in the **same target file**. PAD-057 / HMIC-075’s phrase “HMD-010+ not allocated” kept `hiring_candidates` **inside HMD-009**; it did **not** reserve identifier HMD-010 and does **not** own this failure. PAD-039 / `E-02-HMIR-IA` through `E-02-HMIR-IA-005` restore corrupted origin text and **cannot** restore a “corrected origin” here: the failing `mv.meeting_id` **already exists in proven origin**. PAD-051 / PAD-053 / PAD-057 reconstructions invent or restore **missing schema primitives**; they do **not** cover a wrong-column assumption on a live table whose historical key is `agenda_item_id`. A file-specific successor PAD is required to allocate remediation policy for **HMD-010**.
>
> **Lettering note:** HMD-010 forensics listed a possible L280–283 rewrite as forensic “Option E / FORWARD DESIGN CHANGE / NOT AUTHORIZED HERE.” That forensic lettering is **not** this PAD’s option register. This PAD uses the HMIC successor register: **A** = source restoration · **B** = reconstruction · **C** = narrow original-historical-SQL correction · **D** = forward fix · **E** = quarantine · **F** = additional forensics. Forensic “Option E rewrite” maps to **this PAD’s Option C** and is independently re-proven below.

> **Scope lock:** Establishes **Option C — narrow original-historical-SQL compatibility correction** for the LOCAL-016 first failure at `20260405120000_multi_tenant_properties.sql` / `UPDATE public.meeting_votes mv` / `mv.meeting_id`. This record **does not** edit the target · **does not** add `meeting_id` · **does not** create reconstruction · **does not** edit HMD-009 reconstruction · **does not** issue Implementation Authorization · **does not** retry LOCAL-016 · **does not** create LOCAL-017 · **does not** expand quarantine · **does not** modify BCR/guard/verifier · **does not** run database/Supabase/Docker · **does not** authorize RU-1.4 · **does not** reclassify EIR / Acceptance / Certification.

```
HISTORICAL MIGRATION INTEGRITY / COMPATIBILITY AUTHORITY-008 = ESTABLISHED (THIS SUPPLEMENT)
DECISION                                                     = APPROVED WITH CONDITIONS — OPTION C
SELECTED POLICY                                              = NARROW ORIGINAL-HISTORICAL-SQL
                                                               COMPATIBILITY CORRECTION
REMEDIATION MODEL                                            = ONE NARROW FUTURE EDIT OF THE FAILING
                                                               UPDATE ONLY
                                                               + NO SCHEMA INVENTION
                                                               + NO HMD-009 TOUCH
SOURCE CORRUPTION OF FAILING SQL                             = REJECTED
FAILING mv.meeting_id EXISTS IN TARGET ORIGIN                = YES
TARGET ORIGIN COMMIT                                         = fb0094239d74cc4466853cc1cfcb906164d0fb89
TARGET ORIGIN BLOB                                           = b8c2b851d41d2218e90acba38403288cec5e28c9
CURRENT TARGET BLOB                                          = 4bc119833071125695eb393844d7e8335e952154
CURRENT vs ORIGIN NON-CAUSAL                                 = comment → → ? + trailing LF blanks (8c30eb2)
EXACT HISTORICAL SOURCE RESTORATION                          = NOT APPLICABLE / REJECTED
ADD-meeting_id RECONSTRUCTION                                = REJECTED / NOT HISTORICALLY GROUNDED
FORWARD-FIX                                                  = REJECTED / INSUFFICIENT FOR CLEAN REPLAY
TARGET QUARANTINE                                            = NOT AUTHORIZED / REJECTED
FAKE HISTORY / REPAIR-AS-APPLIED                             = REJECTED
HMD-010                                                      = OPEN / DISTINCT /
                                                               ORIGINAL HISTORICAL SQL /
                                                               SCHEMA-ASSUMPTION DEFECT /
                                                               ORIGINAL CLEAN-REPLAY WRONG-COLUMN
                                                               ASSUMPTION ON EXISTING TABLE /
                                                               OPTION C SELECTED /
                                                               IMPLEMENTATION NOT AUTHORIZED YET
TARGET                                                       = 20260405120000_multi_tenant_properties.sql
FAILING STATEMENT                                            = L280–283 UPDATE public.meeting_votes mv
FAILING REFERENCE                                            = mv.meeting_id
ALIAS mv                                                     = TABLE ALIAS
BOUND OBJECT                                                 = public.meeting_votes
                                                               (PRE-20260409190000 LEGACY TABLE)
HISTORICAL KEY                                               = agenda_item_id
PRE-TARGET meeting_id ON BOUND OBJECT                        = ABSENT
AUTHORIZED FUTURE FILE COUNT                                 = EXACTLY 1
AUTHORIZED FUTURE STATEMENT COUNT                            = EXACTLY 1
FUTURE SQL WRITTEN                                           = NO
HMD-009                                                      = OPEN / OPTION B /
                                                               RECONSTRUCTION IMPLEMENTED /
                                                               IMPLEMENTATION COMPLETED /
                                                               RUNTIME REPLAY VERIFICATION PENDING
HMD-008                                                      = OPEN / SOURCE INTEGRITY RESTORED /
                                                               IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-007                                                      = OPEN / SOURCE INTEGRITY RESTORED /
                                                               IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-006                                                      = OPEN / SOURCE INTEGRITY RESTORED /
                                                               IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-005                                                      = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                               IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-003                                                      = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                               IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
EXISTING QUARANTINE                                          = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINE COUNT                                             = 1
LOCAL-016                                                    = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED /
                                                               EVIDENCE IMMUTABLE
LOCAL-016 ATTEMPTS                                           = 1
LOCAL-016 RETRY                                              = NOT AUTHORIZED
LOCAL-017                                                    = NOT ISSUED
BCR EDIT                                                     = NOT AUTHORIZED
BCR DBA PIN (read-only)                                      = E-02-DBA-LOCAL-016
BCR ARTIFACT AUTHORITY (read-only)                           = E-02-BCR-IA-016
RUNTIME                                                      = NOT AUTHORIZED
THIS PAD                                                     ≠ IMPLEMENTATION AUTHORIZATION
THIS PAD                                                     ≠ DATABASE APPLICATION AUTHORIZATION
THIS PAD                                                     ≠ PRODUCTION DEPLOYMENT AUTHORIZATION
PAD-059+                                                     = NOT ALLOCATED
```

---

## 1. Authority / provenance

| Record | Role |
|--------|------|
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) | Parent — PAD-001 – PAD-010 |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md) | **PAD-057 ISSUED / IMMUTABLE** · HMD-009 Option B reconstruction |
| [`E-02-HMD-010-Multi-Tenant-Properties-Meeting-Votes-Meeting-Id-Forensic-Investigation.md`](E-02-HMD-010-Multi-Tenant-Properties-Meeting-Votes-Meeting-Id-Forensic-Investigation.md) | HMD-010 forensic facts — consumed as **immutable classification**; join path / options **independently re-proven** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-016.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-016.md) | LOCAL-016 **APPLICATION_FAILED** · evidence **immutable** · run `local-016-20260830a` |
| [`tests/e02/evidence/local-016-20260830a/bcr-replay-manifest.json`](../../tests/e02/evidence/local-016-20260830a/bcr-replay-manifest.json) | Manifest `result=APPLICATION_FAILED` · executed **73** · failure string as below |

**MANDATORY STOP does not apply.** Authority sequence is unambiguous. Forensic hashes match. Target identity matches. Historical join topology is proven from pre-target migrations. Authority supports issuance of PAD-058.

---

## 2. Pre-issuance gates (this issuance — read-only)

| ID | Check | Result |
|----|--------|--------|
| A. PAD sequence | Highest issued HMIC Decision = **Decision-007 / PAD-057 / HMIC-073 – HMIC-084**. Decision-008 **absent**. PAD-058 document **absent**. PAD-058 **not reserved**. PAD-059+ **absent**. | **PASS** |
| B. Next unused IDs | PAD-058 · Decision-008 · HMIC-085 – HMIC-096 | **PASS** |
| C. HMD-010 identity | **OPEN / DISTINCT / FORENSIC INVESTIGATION COMPLETE**. Not an HMD-009 extension. No prior repair PAD/IA/Completion for this construct. | **PASS** |
| D. HMD-009 preserved | **OPEN / OPTION B / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING**. Reconstruction applied in LOCAL-016; target not applied. | **PASS** |
| E. LOCAL-016 immutability | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** · attempts **1** · retry **NOT AUTHORIZED** · run `local-016-20260830a` · executed **73** · highest applied `20260405115900_hmd009_reconstruct_hiring_jobs.sql` · first failing `20260405120000_multi_tenant_properties.sql` index **74** · error `column mv.meeting_id does not exist` | **PASS** |
| F. Target identity | Current blob `4bc119833071125695eb393844d7e8335e952154` · origin `fb009423` blob `b8c2b851d41d2218e90acba38403288cec5e28c9` · CURRENT ≠ origin only by `8c30eb2` comment/`→` + trailing blanks · failing `mv.meeting_id` **unchanged from origin** | **PASS** |
| G. Failure construct | Unguarded `UPDATE public.meeting_votes mv` L280–283 inside `DO $c$`; `mv` = TABLE alias bound to `public.meeting_votes` | **PASS** |
| H. Repair authority exists? | **NO** prior HMD-010 PAD/IA | **PASS** |
| I. Later PAD reserved? | **NO** | **PASS** |

---

## 3. LOCAL-016 evidence lock

```
E-02-DBA-LOCAL-016              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
ATTEMPTS                        = 1
RETRY                           = NOT AUTHORIZED
evidenceRunId                   = local-016-20260830a
Executed migration count        = 73
Highest applied                 = 20260405115900_hmd009_reconstruct_hiring_jobs.sql  (index 73)
First failing                   = 20260405120000_multi_tenant_properties.sql
First failing executable index  = 74
Exact error                     = column mv.meeting_id does not exist
Preserve / handoff              = NOT REACHED
Baseline verifier               = NOT RUN
DATABASE BASELINE VERIFIED      = NO
```

This issuance **does not** alter LOCAL-016 evidence or the replay manifest. **No LOCAL-016 retry. No LOCAL-017.**

---

## 4. Target identity and source-integrity rejection

```
TARGET PATH                     = supabase/migrations/20260405120000_multi_tenant_properties.sql
CURRENT BLOB                    = 4bc119833071125695eb393844d7e8335e952154
TARGET ORIGIN COMMIT            = fb0094239d74cc4466853cc1cfcb906164d0fb89
TARGET ORIGIN BLOB              = b8c2b851d41d2218e90acba38403288cec5e28c9
FAILING STATEMENT               = L280–283  UPDATE public.meeting_votes mv … WHERE mv.meeting_id = m.id
FAILING REFERENCE vs ORIGIN     = UNCHANGED
NON-CAUSAL CURRENT vs ORIGIN    = comment → → ? ; trailing LF blanks (8c30eb2)
8c30eb2 meeting_votes HUNKS     = NONE
```

```
POST-CREATION SOURCE-INTEGRITY DEFECT = REJECTED
TARGET SOURCE RESTORATION             = NOT APPLICABLE / REJECTED AS THIS REMEDY
8c30eb2 COMMENT/WHITESPACE            = OUT OF SCOPE / NOT HMD-010 REPAIR
```

Restoring the origin comment/`→` does **not** create `meeting_votes.meeting_id`. The failing reference is original design.

---

## 5. Failure construct

Inside `DO $c$` beginning at L74:

```
L280  UPDATE public.meeting_votes mv
L281  SET property_id = m.property_id
L282  FROM public.meetings m
L283  WHERE mv.meeting_id = m.id AND mv.property_id IS NULL;
```

| Field | Result |
|-------|--------|
| Construct | **DML UPDATE / tenant property backfill** |
| Alias `mv` | **TABLE alias** — **not** a record alias, CTE alias, or another relation |
| Bound object | **`public.meeting_votes`** |
| Object type | **TABLE** (pre-`20260409190000` legacy table) |
| Failing reference | **`mv.meeting_id`** at L283 |
| Sibling `m` | **`public.meetings`** (`m.id`, `m.property_id`) |
| Guarded ADD L108–110 | adds **`property_id` only** — does **not** add `meeting_id` |
| L284 fallback | `UPDATE public.meeting_votes SET property_id = default_id WHERE property_id IS NULL` — **not** first fail · **out of authorized future scope** |

Sibling backfills in the same block (`meeting_agenda_items` L268–271 · `meeting_attendees` L274–277) use `*.meeting_id` on tables that **historically have** that column. The target copied that pattern onto `meeting_votes`, which historically does **not**.

---

## 6. Historical `public.meeting_votes` schema (pre-target)

Origin: `supabase/migrations/20260320044053_create_meeting_voting_system.sql` L258–268.

| Column | Type / constraint |
|--------|-------------------|
| `id` | `uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| `agenda_item_id` | `uuid NOT NULL REFERENCES meeting_agenda_items(id) ON DELETE CASCADE` |
| `voter_id` | `uuid NOT NULL REFERENCES profiles(id)` |
| `vote_decision` | `vote_decision NOT NULL` |
| `is_proxy_vote` | `boolean DEFAULT false` |
| `proxy_for_user_id` | `uuid REFERENCES profiles(id)` |
| `voted_at` | `timestamptz DEFAULT now()` |
| `comments` | `text` |
| UNIQUE | `(agenda_item_id, voter_id)` |

```
PRE-TARGET meeting_id ON public.meeting_votes = ABSENT
PRE-TARGET ALTER ADD meeting_id              = NONE
```

Pre-target `ALTER TABLE … meeting_votes` that adds a column: only the **target itself** later adds `property_id` (L108–110). No pre-target file adds `meeting_id`.

Same-origin siblings that **do** have `meeting_id` before the target:

| Table | Origin | `meeting_id` before target |
|-------|--------|----------------------------|
| `meetings` | same file L101 · `id` PK | n/a (the meeting itself) |
| `meeting_agenda_items` | same file L167–169 | **YES** · `uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE` |
| `meeting_attendees` | same file L214–216 | **YES** |
| `meeting_documents` / `meeting_quota_tracker` | same file | **YES** |
| `meeting_votes` | same file L258 | **NO** |

Functions/policies in the origin file query `meeting_votes` by **`agenda_item_id`**, not `meeting_id` (vote-count trigger L493–495; index `idx_meeting_votes_agenda_item`).

---

## 7. Later replacement table lock

First later appearance of `meeting_id` on a relation named `public.meeting_votes`:

```
FILE = 20260409190000_meeting_module_three_layer.sql
ACT  = RENAME legacy public.meeting_votes → meeting_votes_legacy
THEN = CREATE TABLE public.meeting_votes (… meeting_id uuid NOT NULL REFERENCES meetings(id) …)
```

```
LATER meeting_id EXISTENCE  ≠  HISTORICAL ORIGIN PROOF
LATER OBJECT                ≠  THE INDEX-74 BOUND TABLE
meeting_votes_legacy        ≠  AUTHORITY FOR ADDING meeting_id BEFORE TARGET
```

This PAD reasons **only** from the pre-`20260409190000` legacy table bound at executable index **74**.

---

## 8. Historical join topology (independently proven)

Proven from `20260320044053_create_meeting_voting_system.sql` **before** the target. No assumption from later 20260409 design.

```
meetings.id                         = PK
meeting_agenda_items.id             = PK
meeting_agenda_items.meeting_id     = uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE
meeting_votes.agenda_item_id        = uuid NOT NULL REFERENCES meeting_agenda_items(id) ON DELETE CASCADE
```

Exact historical path:

```
public.meeting_votes.agenda_item_id
  → public.meeting_agenda_items.id
  → public.meeting_agenda_items.meeting_id
  → public.meetings.id
```

Required objects/columns **already exist** before `20260405120000`. The failing UPDATE already includes `public.meetings m` but **does not** already join `meeting_agenda_items`. A historically valid meeting lookup therefore **requires adding** that intermediate relation. It is **not** already present as another alias in L280–283.

`20260327173153` (pre-target) touches `meeting_agenda_items` procurement FK only. It does **not** drop `meeting_id` and does **not** add `meeting_votes.meeting_id`.

Conceptual name `agenda_items` in some analyses = historical table **`meeting_agenda_items`**. This PAD uses the exact relation name.

---

## 9. Target intended semantic purpose

The `DO $c$` block (L74+):

1. Adds nullable `property_id` to tenant-bearing tables, including `meeting_votes` (L108–110).
2. Backfills `public.meetings.property_id = default_id` where NULL (**L227**, **before** vote UPDATE).
3. Backfills child meeting tables from the related meeting’s `property_id`, then falls back to `default_id`.

Vote-row intent of L280–283, read against L268–277 siblings:

| Item | Value |
|------|--------|
| Destination | `public.meeting_votes.property_id` |
| Source | `public.meetings.property_id` (alias `m`) |
| Meeting identity use | locate the meeting that owns the vote, then copy that meeting’s property |
| Intended row set | votes whose `property_id IS NULL` |
| Tenant semantics | derive property from the owning meeting; leftover NULLs get `default_id` at L284 |

Votes **do** require a meeting lookup. Historical votes do **not** store `meeting_id`. `agenda_item_id` provides an **exact equivalent** historical path (§8).

Naive substitution `mv.meeting_id` → `mv.agenda_item_id` would equate a **vote’s agenda-item UUID** to `meetings.id`. Those are **different entity types**. **PROHIBITED.**

---

## 10. Theory A vs Theory B

| Theory | Claim | Finding |
|--------|-------|---------|
| **A** | Historical `meeting_votes` **should** have had `meeting_id`; schema origin is missing | **NOT PROVEN** — no pre-target CREATE/ALTER; later `meeting_id` is on a **replacement** table |
| **B** | Historical table correctly used `agenda_item_id`; target incorrectly assumed direct `meeting_id` | **SUPPORTED** — CREATE, indexes, vote-count trigger, and sibling contrast all agree |

```
MISSING HISTORICAL SCHEMA ORIGIN          = REJECTED / NOT PROVEN
ADD-meeting_id RECONSTRUCTION             = REJECTED / NOT HISTORICALLY GROUNDED
WRONG-COLUMN / WRONG-RELATIONSHIP-PATH    = SUPPORTED
                                            (wrong direct column; correct path is the agenda-item join)
```

---

## 11. Cardinality / tenant safety of the proven path

| Question | Result |
|----------|--------|
| One vote → one agenda item? | **YES** — `agenda_item_id` **NOT NULL** FK |
| One agenda item → one meeting? | **YES** — `meeting_id` **NOT NULL** FK |
| Nullable relationship? | **NO** on either hop |
| Orphans? | **Prevented** by `ON DELETE CASCADE` on both FKs |
| Duplicate-update risk? | **NO** — each vote maps to exactly one meeting; UNIQUE is `(agenda_item_id, voter_id)`, not multi-meeting |
| Cross-property contamination? | **NO** if `property_id` continues to come from that vote’s meeting (same as sibling agenda/attendee backfills) |
| WHERE `property_id IS NULL` | **PRESERVED** — does not broaden to already-filled rows |
| New join vs original intended set | Original intended set = votes whose meeting can supply `property_id`. Historically that is **all** votes with a live agenda item. The join **reaches that set**; it does **not** invent a different tenant rule. |
| L284 leftover fallback | Remains the sibling `default_id` safety net; **not** in this PAD’s authorized fragment |

Meetings are backfilled at L227 **before** L280. Child copy of `m.property_id` therefore uses the same tenant value the target already assigned to meetings (including `default_id` when meeting `property_id` was NULL).

---

## 12. Evaluated options

| Option | This PAD’s name | Decision | Reason |
|--------|-----------------|----------|--------|
| **A** | Exact historical source restoration | **REJECTED / NOT APPLICABLE** | Failing `mv.meeting_id` exists in origin `fb009423` / blob `b8c2b851` |
| **B** | Pre-target compatibility reconstruction (`ADD meeting_id`) | **REJECTED / NOT HISTORICALLY GROUNDED** | Would invent a column the 20260320 object never had; later 20260409 `meeting_id` is a **different table** |
| **C** | Narrow original-historical-SQL compatibility correction | **SELECTED** | Intent, historical keys, join path, cardinality, and tenant copy semantics are proven |
| **D** | Forward fix after the target | **REJECTED / INSUFFICIENT FOR CLEAN REPLAY** | Replay dies at executable index **74** |
| **E** | Quarantine the target | **NOT AUTHORIZED / REJECTED** | Core multi-tenant schema; global quarantine remains count **1** |
| **F** | No remediation / additional forensics | **NOT REQUIRED** | Historical join and intent are unambiguous |

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
PURPOSE  = make the original target’s vote property backfill use the schema
           that actually existed at target time, without inventing meeting_id
           and without restoring a non-defective origin
```

### 13.1 Authorized future correction (policy only — no SQL written)

| Item | Authority |
|------|-----------|
| Option name | **OPTION C / NARROW ORIGINAL-HISTORICAL-SQL COMPATIBILITY CORRECTION** |
| Authorized file count | **EXACTLY 1** |
| Authorized file | `supabase/migrations/20260405120000_multi_tenant_properties.sql` |
| Authorized statement / fragment count | **EXACTLY 1** |
| Authorized statement | the unguarded `UPDATE public.meeting_votes mv` currently at **L280–283** |
| Failing reference to remove | **`mv.meeting_id`** |
| Bound object | **`public.meeting_votes`** (legacy pre-20260409 table) · alias **`mv`** |
| Destination column | **`property_id` only** |
| Source of tenant value | **`public.meetings.property_id`** (alias **`m`**) |
| Required historical join | **`mv.agenda_item_id = meeting_agenda_items.id` AND `meeting_agenda_items.meeting_id = m.id`** |
| Intermediate relation | **`public.meeting_agenda_items`** — must be introduced into this UPDATE; it is **not** already present in L280–283 |
| Preferred intermediate alias | **`mai`** (already used for the same table at L268 in the same `DO` block) |
| Preserved predicates | **`mv.property_id IS NULL`** |
| Preserved SET | **`property_id = m.property_id`** |

**Canonical authorized future construct** (comma-`FROM` style matching L268–277; equivalent explicit `JOIN` spelling is permitted **only** if every binding above is identical):

```
UPDATE public.meeting_votes mv
SET property_id = m.property_id
FROM public.meeting_agenda_items mai, public.meetings m
WHERE mv.agenda_item_id = mai.id
  AND mai.meeting_id = m.id
  AND mv.property_id IS NULL;
```

### 13.2 Prohibited future acts

```
NAIVE mv.meeting_id → mv.agenda_item_id                 = PROHIBITED
mv.agenda_item_id = m.id                                = PROHIBITED
ADD COLUMN meeting_id / reconstruction migration        = PROHIBITED
EDIT L284 default_id fallback                           = PROHIBITED
EDIT L108–110 ADD property_id                           = PROHIBITED
EDIT HMD-009 reconstruction 20260405115900              = PROHIBITED
EDIT hiring_jobs / hiring_candidates statements         = PROHIBITED
WHOLE-FILE REPLACEMENT                                  = PROHIBITED
RESTORE 8c30eb2 comment / trailing-whitespace drift     = PROHIBITED
UNRELATED CLEANUP / REFORMAT / COMMENT CHURN            = PROHIBITED
BACKPORT 20260409 replacement-table semantics           = PROHIBITED
QUARANTINE CHANGE                                       = PROHIBITED
```

This PAD **does not** write the construct. Implementation remains a **separate** authorization.

---

## 14. Implementation authority lock

PAD-058 **selects the model**. It **does not** authorize implementation.

A **separate** future Implementation Authorization must:

- verify PAD-058 issued / immutable;
- verify HMD-010 status and this exact §13 bind;
- **determine the correct existing IA family and next unused IA identifier from repository sequence** (this PAD **does not** issue an IA ID);
- **not assume HMIR** — Option C is **not** exact historical source restoration;
- **not assume HFSOR** — Option C is **not** pre-target schema reconstruction;
- inspect repository precedent for original-historical-SQL correction and choose the correct family **then**;
- authorize **exactly** §13.1 after a fresh worktree/hash check;
- forbid schema invention, HMD-009 edits, whole-file replace, and `8c30eb2` comment restoration;
- require static verification;
- forbid runtime application until later governance.

**Do not create that IA now.**

Required later sequence:

```
PAD-058
→ HMD-010 Implementation Authorization for OPTION C
   (family/sequence independently verified)
→ narrow L280–283 implementation
→ implementation verification / Completion
→ successor BCR/DBA governance as required
→ only then future runtime replay
```

**No automatic LOCAL-017.**

---

## 15. Relations / distinctness locks

| Defect | Relation / state |
|--------|------------------|
| **HMD-001** | **OPEN / DISTINCT** — quarantine unchanged |
| **HMD-002** | **DISTINCT** — do not reopen |
| **HMD-003** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** · **DISTINCT** |
| **HMD-004** | **DISTINCT** — do not reopen |
| **HMD-005** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** · **DISTINCT** |
| **HMD-006** | **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** · **DISTINCT** |
| **HMD-007** | **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** · **DISTINCT** |
| **HMD-008** | **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** · **DISTINCT** |
| **HMD-009** | **OPEN / OPTION B / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** · **DISTINCT** · same file **≠** same defect · reconstruction **IMMUTABLE / UNCHANGED** · **not** promoted to RUNTIME REPLAY VERIFIED |
| **HMD-010** | **this defect** · **not CLOSED** |
| **HMD-011+** | **NOT ALLOCATED** |

PAD-057 / HMIC-075 remains in force for **`hiring_candidates` in-family under HMD-009**. This PAD does **not** split that family.

```
HMD-003 W2 / APRIL HARD / JULY S1 = NOT REACHED / NOT APPLIED
                                    (LOCAL-016 fail at index 74 < W2 / April HARD / July S1)
```

Do **not** promote HMD-003. Do **not** promote HMD-009.

---

## 16. BCR / LOCAL / RU / certification locks

```
BCR DBA PIN (read-only)            = E-02-DBA-LOCAL-016
BCR ARTIFACT AUTHORITY (read-only) = E-02-BCR-IA-016
BCR EDIT                           = NOT AUTHORIZED
LOCAL-016                          = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-016 ATTEMPTS                 = 1
LOCAL-016 RETRY                    = NOT AUTHORIZED
LOCAL-017                          = NOT ISSUED
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
NEXT = HMD-010 IMPLEMENTATION AUTHORIZATION FOR OPTION C
       after independent IA-family and IA-sequence verification
       (do not assume HMIR; do not assume HFSOR)
```

That subsequent task **must first** determine the correct authority family and next unused IA identifier from repository governance. **Do not implement** the SQL correction in this PAD.

---

## 18. Program Authority Decisions (PAD-058 / HMIC-085 – HMIC-096)

PAD-058 is **one** supplement ID covering the following resolutions (single-ID successor precedent; not a 12-ID block).

### PAD-058 / HMIC-085 — Successor file-specific Option C permitted

**RESOLVED:** A file-specific HMIC successor may select **Option C** for HMD-010. PAD-039 – PAD-057 do **not** contain sufficient *file-specific* authority for `mv.meeting_id`.

### PAD-058 / HMIC-086 — Prior-grant coverage

**RESOLVED:** HMIR restoration grants (HMD-002 / 004 / 006 / 007 / 008) **do not** apply. PAD-051 / HMD-003 finance reconstruction **does not** apply. PAD-053 / HMD-005 enum reconstruction **does not** apply. PAD-057 / HMD-009 hiring reconstruction **does not** apply.

### PAD-058 / HMIC-087 — Defect identifier

**RESOLVED:** Remediation policy is allocated to **HMD-010**. HMD-009 remains independently **OPEN / OPTION B / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING**. PAD-057 / HMIC-075 continues to keep `hiring_candidates` **inside HMD-009**. **HMD-011+ not allocated.**

### PAD-058 / HMIC-088 — Classification

**RESOLVED:** **ORIGINAL HISTORICAL SQL / SCHEMA-ASSUMPTION DEFECT** · subtype **ORIGINAL CLEAN-REPLAY WRONG-COLUMN ASSUMPTION ON EXISTING TABLE**. Source-integrity of the failing reference: **REJECTED**. Theory A missing-schema-origin: **REJECTED / NOT PROVEN**.

### PAD-058 / HMIC-089 — Object and later-table immutability

**RESOLVED:** Analysis is locked to the pre-`20260409190000` legacy `public.meeting_votes`. Later replacement `meeting_id` is **not** historical origin. HMD-009 reconstruction file remains **immutable**.

### PAD-058 / HMIC-090 — Selected model and exact bind

**RESOLVED:** **Option C**. Exactly one future statement: replace L280–283 `WHERE mv.meeting_id = m.id` with the proven path `mv.agenda_item_id → meeting_agenda_items.id → meeting_agenda_items.meeting_id → meetings.id`, keeping `SET property_id = m.property_id` and `mv.property_id IS NULL`. Canonical construct in §13.1.

### PAD-058 / HMIC-091 — Prohibited substitutions

**RESOLVED:** Naive `mv.meeting_id` → `mv.agenda_item_id` **prohibited**. `ADD meeting_id` **prohibited**. Whole-file replace, `8c30eb2` comment restoration, L284 edit, and HMD-009 edits **prohibited**.

### PAD-058 / HMIC-092 — Rejected alternatives

**RESOLVED:** Option A source restoration, Option B reconstruction, Option D forward-fix, Option E target quarantine, fake history = **REJECTED**. Option F additional forensics = **NOT REQUIRED**.

### PAD-058 / HMIC-093 — Distinctness

**RESOLVED:** HMD-001 through HMD-009 remain as locked in §15. Same target filename does **not** merge HMD-009 and HMD-010.

### PAD-058 / HMIC-094 — Implementation still separate

**RESOLVED:** This PAD is **not** Implementation Authorization. Target SQL **not edited**. Reconstruction **not created**. IA **not issued**.

### PAD-058 / HMIC-095 — LOCAL-016 / LOCAL-017 / BCR / RU

**RESOLVED:** LOCAL-016 immutable failed · attempts **1** · retry **NOT AUTHORIZED**. LOCAL-017 **not issued**. BCR pins **unchanged** (LOCAL-016 / IA-016, read-only). RU-1.4 **not authorized**.

### PAD-058 / HMIC-096 — Quarantine / baseline / EIR

**RESOLVED:** Global quarantine remains exactly `20260314195641_add_demo_data.sql` · count **1**. Database baseline **not verified**. EIR / Acceptance / Certification **not issued**. Final commit path **blocked**.

---

## 19. Issuance checklist

| ID | Check | Result |
|----|--------|--------|
| HMIC8-I01 | Decision-008 unused before this file | **PASS** |
| HMIC8-I02 | PAD-058 unused / not reserved | **PASS** |
| HMIC8-I03 | HMIC-085 – HMIC-096 unused | **PASS** |
| HMIC8-I04 | HMD-010 distinct / forensic complete / not HMD-009 extension | **PASS** |
| HMIC8-I05 | LOCAL-016 immutable failed facts match | **PASS** |
| HMIC8-I06 | Target hashes / origin contains `mv.meeting_id` | **PASS** |
| HMIC8-I07 | Pre-target `meeting_id` absent; no pre-target ALTER | **PASS** |
| HMIC8-I08 | Historical join path proven from 20260320 FKs | **PASS** |
| HMIC8-I09 | Theory A rejected; Theory B supported | **PASS** |
| HMIC8-I10 | Option C cardinality / tenant semantics proven | **PASS** |
| HMIC8-I11 | Quarantine remains count 1 | **PASS** |
| HMIC8-I12 | No migration / BCR / DB / commit in this issuance | **PASS** |
| HMIC8-I13 | Implementation not authorized | **PASS** |
| HMIC8-I14 | PAD-059+ not allocated | **PASS** |

---

## 20. Decision immutability

```
PAD-058                                                    = ISSUED / IMMUTABLE
IMPLEMENTATION                                             = NOT AUTHORIZED
TARGET SQL                                                 = NOT EDITED
RECONSTRUCTION FILE                                        = NOT CREATED
```

---

**End of document — PAD-058 · HMIC-085 – HMIC-096 · HMD-010 — v1.0 — 2026-08-30**
