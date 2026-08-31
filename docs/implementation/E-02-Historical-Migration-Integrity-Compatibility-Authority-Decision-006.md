# E-02 Program Authority Decision — Historical Migration Integrity / Compatibility (Successor)

## Exact Historical Source Restoration · HMD-008 · `20260401140000_notifications_trigger_service_role_insert.sql`

| Field | Value |
|-------|-------|
| **Document Type** | **Program Authority Decision (Supplement)** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Parent Authority** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) v1.0 (PAD-001 – PAD-010) |
| **Direct Predecessor Supplement** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md) (**PAD-055** · HMIC-049 – HMIC-060 · HMD-007) |
| **Prior Predecessor Supplements** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md) (**PAD-054** · HMD-006) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md) (**PAD-053** · HMD-005) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md) (**PAD-052** · HMD-004) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) (PAD-039 – PAD-050 · HMD-002) · [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) (PAD-051 · HMD-003) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038 · HMD-001) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025) |
| **Forensic record** | [`E-02-HMD-008-Notifications-Trigger-Service-Role-Insert-Forensic-Investigation.md`](E-02-HMD-008-Notifications-Trigger-Service-Role-Insert-Forensic-Investigation.md) |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-014.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-014.md) · run `local-014-20260829a` |
| **Supplement ID** | **PAD-056** |
| **Authority Question Register** | **HMIC-061 – HMIC-072** |
| **Status** | **APPROVED WITH CONDITIONS — OPTION A (FILE-SPECIFIC SUCCESSOR)** |
| **Selected Policy** | **EXACT HISTORICAL SOURCE RESTORATION** |
| **Defect** | **HMD-008** |
| **Authority Level** | Program Authority |
| **Effective Date** | 2026-08-29 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **NO** |

> **Authority path finding: YES.** Filename `E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md` is **authority-safe** as the next successor in the existing **HMIC** decision family (`Decision.md` · `Decision-002.md` · `Decision-003.md` · `Decision-004.md` · `Decision-005.md` · **this Decision-006**). Distinct filename keeps PAD-039 – PAD-050, **PAD-052**, **PAD-053**, **PAD-054**, and **PAD-055** **immutable**. This is **not** a new governance tier. PAD identifiers are **not** CS/FD registry numbers.
>
> Sequence: Parent PAD-001 – PAD-010 · DAA PAD-011 – PAD-025 · HMBC PAD-026 – PAD-038 · HMIC PAD-039 – PAD-050 · HFSO PAD-051 · HMIC successor PAD-052 · HMIC successor PAD-053 · HMIC successor PAD-054 · HMIC successor PAD-055 · **this supplement PAD-056**. Highest previously allocated PAD is **PAD-055**. **PAD-056 is the next unused identifier.** **PAD-056 did not already exist. PAD-056 was not reserved. PAD-056 has not previously been issued.** **No PAD-057+ supersedes the sequence.** **PAD-057+ is not allocated.**
>
> HMIC subsequence: HMIC-001 – HMIC-012 (PAD-039 – PAD-050) · HMIC-013 – HMIC-024 (PAD-052) · HMIC-025 – HMIC-036 (PAD-053) · HMIC-037 – HMIC-048 (PAD-054) · HMIC-049 – HMIC-060 (PAD-055) · **this register HMIC-061 – HMIC-072**. Highest previously allocated HMIC is **HMIC-060**. **HMIC-061 – HMIC-072 is the next unused 12-clause range.** No HMIC-061+ existed before this issuance.
>
> **Why a new PAD is required (not reflexive):** PAD-039 / HMIC-001 established the **class** (exact historical source restoration after proven later corruption). PAD-055 / HMD-007 operationalized that class **only** for `20260331180000` / **exactly one** fragment (L70) and explicitly left `20260401140000` **OUT OF HMD-007 SCOPE / NOT ALLOCATED**. `E-02-HMIR-IA-004` is **file-specific** and **does not** authorize editing `20260401140000_notifications_trigger_service_role_insert.sql`. PAD-054 / HMD-006 likewise left this file **OUT OF HMD-006 SCOPE**. PAD-053 / HMD-005 is a **different class** (enum commit-boundary reconstruction). PAD-032 still requires **future authority** before a historical migration is modified. A file-specific successor PAD is therefore the same kind of gap PAD-055 closed for HMD-007.
>
> **Why this is not a new class:** The defect is the same **`8c30eb2` CJK-truncation family** as HMD-002 / HMD-004 / HMD-006 / HMD-007 (truncated zh SQL literals; origin recoverable). **Same corrupting commit ≠ same defect scope.** HMD-007 authorized **1 file / 1 fragment**. HMD-008 forensic evidence proves **1 file / 2 fragments**. Reconstruction (HMD-003 / PAD-051 / HMD-005 / PAD-053) is **rejected** as the model. Quarantine / forward-fix / fake history remain **rejected**.

> **Scope lock:** Establishes **Exact Historical Source Restoration** policy for **one** migration and **exactly two** proven corrupted fragments (**L40 and L67**). This record **does not** restore any file · **does not** restore L40 · **does not** restore L67 · **does not** restore trailing blanks · **does not** issue `E-02-HMIR-IA-005` · **does not** retry LOCAL-014 · **does not** create LOCAL-015 · **does not** expand quarantine · **does not** edit sibling migrations · **does not** edit the HMD-006 or HMD-007 targets · **does not** modify BCR/guard/verifier · **does not** run database/Supabase/Docker · **does not** authorize RU-1.4 · **does not** reclassify EIR / Acceptance / Certification.

```
HISTORICAL MIGRATION INTEGRITY / COMPATIBILITY AUTHORITY-006 = ESTABLISHED (THIS SUPPLEMENT)
DECISION                                                     = APPROVED WITH CONDITIONS — OPTION A
SELECTED POLICY                                              = EXACT HISTORICAL SOURCE RESTORATION
RESTORATION MODEL                                            = EXACT HISTORICAL SOURCE / BOUNDED PROVEN FRAGMENTS ONLY
HISTORICAL TRUTH CLAIM                                       = PROVEN SOURCE RESTORATION
TARGET MIGRATION                                             = 20260401140000_notifications_trigger_service_role_insert.sql
AUTHORIZED HISTORICAL FILE COUNT                             = EXACTLY 1
AUTHORIZED FUTURE RESTORATION SET                            = EXACTLY TWO FRAGMENTS (L40 AND L67)
WHOLE-FILE RESTORE                                           = NOT SELECTED / NOT AUTHORIZED
WHITESPACE-ONLY RESTORATION                                  = NOT REQUIRED / NOT AUTHORIZED
TRAILING BLANK LINE RESTORATION                              = NOT REQUIRED / NOT AUTHORIZED
WHITESPACE NORMALIZATION                                     = NOT AUTHORIZED
LINE ENDING NORMALIZATION                                    = NOT AUTHORIZED
HMD-006 TARGET                                               = DO NOT EDIT
HMD-007 TARGET                                               = DO NOT EDIT
RECONSTRUCTION                                               = REJECTED / NOT INDICATED
FORWARD-FIX                                                  = REJECTED / INSUFFICIENT FOR CLEAN HISTORICAL REPLAY
QUARANTINE / SKIP                                            = NOT AUTHORIZED
FAKE HISTORY / REPAIR-AS-APPLIED                             = REJECTED
HMD-008                                                      = OPEN / DISTINCT /
                                                               FORENSIC INVESTIGATION COMPLETE /
                                                               HISTORICAL SOURCE-INTEGRITY DEFECT /
                                                               POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION /
                                                               OPTION A SELECTED /
                                                               IMPLEMENTATION NOT AUTHORIZED YET
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
EXISTING QUARANTINE                                          = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINE COUNT                                             = 1
20260401140000                                               = DO NOT EDIT UNTIL DEDICATED RESTORATION IA
PAD-039 – PAD-050 / E-02-HMIR-IA                             = NOT REUSED AS EXECUTABLE AUTHORITY FOR THIS FILE
PAD-052 / E-02-HMIR-IA-002                                   = NOT REUSED AS EXECUTABLE AUTHORITY FOR THIS FILE
PAD-054 / E-02-HMIR-IA-003                                   = NOT REUSED AS EXECUTABLE AUTHORITY FOR THIS FILE
PAD-055 / E-02-HMIR-IA-004                                   = NOT REUSED AS EXECUTABLE AUTHORITY FOR THIS FILE
PAD-053                                                      = ISSUED / IMMUTABLE (reconstruction class unchanged)
PAD-054                                                      = ISSUED / IMMUTABLE (HMD-006 file-specific grant unchanged)
PAD-055                                                      = ISSUED / IMMUTABLE (HMD-007 file-specific grant unchanged)
LOCAL-014                                                    = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-014 ATTEMPTS                                           = 1
LOCAL-014 RETRY                                              = NOT AUTHORIZED
LOCAL-015                                                    = NOT ISSUED
BCR EDIT                                                     = NOT AUTHORIZED
RUNTIME                                                      = NOT AUTHORIZED
RESTORATION EXECUTED                                         = NO (POLICY ONLY)
THIS PAD                                                     ≠ IMPLEMENTATION AUTHORIZATION
THIS PAD                                                     ≠ DATABASE APPLICATION AUTHORIZATION
THIS PAD                                                     ≠ PRODUCTION DEPLOYMENT AUTHORIZATION
PAD-057+                                                     = NOT ALLOCATED
```

---

## 1. Authority / provenance

| Record | Role |
|--------|------|
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) | Parent — PAD-001 – PAD-010 · PAD-007 remediation loop · PAD-008 historical records |
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | PAD-026 – PAD-038 · DATA_ONLY quarantine · **HMD register (PAD-032)** |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) | PAD-039 – PAD-050 · class Option A · **HMD-002 file-specific grant** |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md) | **PAD-052 ISSUED / IMMUTABLE** · HMD-004 exact source restoration |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md) | **PAD-053 ISSUED / IMMUTABLE** · HMD-005 compatibility reconstruction |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md) | **PAD-054 ISSUED / IMMUTABLE** · HMD-006 exact source restoration · siblings **OUT OF SCOPE** |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md) | **PAD-055 ISSUED / IMMUTABLE** · HMD-007 exact source restoration · this file **OUT OF HMD-007 SCOPE** |
| [`E-02-HMD-008-Notifications-Trigger-Service-Role-Insert-Forensic-Investigation.md`](E-02-HMD-008-Notifications-Trigger-Service-Role-Insert-Forensic-Investigation.md) | HMD-008 forensic classification · Option A recommended · **consumed as immutable fact** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-014.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-014.md) | LOCAL-014 **APPLICATION_FAILED** · `syntax error at or near "manager"` · evidence **immutable** |

**MANDATORY STOP does not apply.** Forensic hashes match. Target identity matches. PAD / HMIC sequence is unambiguous. Authority supports issuance of PAD-056.

### 1.1 Pre-gate answers

| Question | Finding |
|----------|---------|
| A. Govern under existing HMIC source-restoration class? | **YES — as a successor file-specific PAD.** Class = PAD-039 / HMIC-001. Operational grant for this file = **absent until this PAD**. |
| B. Do HMD-002 / HMD-004 / HMD-006 / HMD-007 implementation authorities cover `20260401140000`? | **NO.** File-specific. **Do not reuse `E-02-HMIR-IA`, `E-02-HMIR-IA-002`, `E-02-HMIR-IA-003`, or `E-02-HMIR-IA-004`.** **Do not reopen those defects.** |
| C. Does PAD-053 cover this failure? | **NO.** HMD-005 is a transaction-boundary reconstruction class. Later failure does **not** reopen HMD-005. |
| D. Does PAD-054 cover this file? | **NO.** PAD-054 left `20260401140000` **OUT OF HMD-006 SCOPE**. Same corrupting commit **does not** expand that grant. |
| E. Does PAD-055 cover this file? | **NO.** PAD-055 / HMIC-056 left `20260401140000` **OUT OF HMD-007 SCOPE / NOT ALLOCATED**. HMD-007 authorized **1 file / 1 fragment**. This defect is **1 file / 2 fragments**. |
| F. New PAD required? | **YES — PAD-056.** Existing PAD-039–055 do **not** contain sufficient *file-specific* authority. |
| G. Target already restored? | **NO.** Current blob `7fcc5f52` equals HEAD; L40 and L67 still `'业委?`. |

---

## 2. Triggering defect / LOCAL-014

LOCAL-014 governed replay failed at:

```
supabase/migrations/20260401140000_notifications_trigger_service_role_insert.sql
DATABASE ERROR = syntax error at or near "manager"
```

| Field | Locked value |
|-------|----------------|
| LOCAL-014 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Attempts | **1** |
| evidenceRunId | `local-014-20260829a` |
| Executed | **68** |
| Highest applied | `20260401120000_strata_feed_notifications.sql` |
| First failing | `20260401140000_notifications_trigger_service_role_insert.sql` (executable index **69**) |
| Target reached / applied | **YES / NO** |
| Retry | **NOT AUTHORIZED** |
| Successor DBA | **NOT ISSUED** |

Causal static defect: truncated / unclosed PL/pgSQL literal at **L40** (`THEN '业委?`). The quote that should open `'manager'` closes the wrong string, exposing `manager` as a bare token. **L67** contains the same independently corrupted fragment; runtime first stops at L40. This is **not** HMD-001 · **not** HMD-002 · **not** HMD-003 · **not** HMD-004 · **not** HMD-005 · **not** HMD-006 · **not** HMD-007. The eight defects **must not be collapsed**.

This PAD **does not** authorize LOCAL-014 retry.

---

## 3. Locked forensic facts (not reopened)

Verified against the forensic record and current worktree. **No hash/commit mismatch.**

| ID | Fact |
|----|------|
| F1 | Path = `supabase/migrations/20260401140000_notifications_trigger_service_role_insert.sql` |
| F2 | Current git blob = **`7fcc5f52613989b5204d8991d2b9eeea0c4938d0`** |
| F3 | Worktree = **CLEAN / EQUALS HEAD** (`git hash-object` equals HEAD) |
| F4 | Origin commit = **`fa89b72a3ffac65593a724cd1194e7c22f7dd397`** |
| F5 | Origin blob = **`6eec5c848d60a82d2198d17ebd238f6027e4f710`** |
| F6 | CURRENT == ORIGIN = **NO** |
| F7 | Corrupting commit = **`8c30eb2f657847dc0767201149190eef8d610475`** |
| F8 | Same corrupting commit as HMD-006 = **YES** |
| F9 | Same corrupting commit as HMD-007 = **YES** |
| F10 | Same defect scope as HMD-006 / HMD-007 = **NO** |
| F11 | Origin commit differs from HMD-006 origin `9f9af80a` and HMD-007 origin `efc3f49e` = **YES** |
| F12 | File history = **exactly those two commits** |
| F13 | Content-line diffs vs origin = **exactly two**: L40 and L67 |
| F14 | Trailing blank-line diffs = origin ends after `$$;` · current has **four** extra blank lines (**whitespace only**) |
| F15 | No other origin↔current differences |
| F16 | Exact historical source available = **YES** |
| F17 | Source-corruption hypothesis = **SUPPORTED** |
| F18 | Original-design parser defect = **REJECTED** |
| F19 | Transaction-boundary hypothesis = **REJECTED** |
| F20 | Missing-prerequisite hypothesis = **REJECTED** |
| F21 | File remains valid UTF-8; BOM **NONE**; `?` is literal **`U+003F`** (not invalid-UTF-8 decode failure) |

---

## 4. Defect classification

```
CLASS     = HISTORICAL SOURCE-INTEGRITY DEFECT
SUBTYPE   = POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION
REMEDY    = EXACT HISTORICAL SOURCE RESTORATION
TRUTH     = PROVEN SOURCE RESTORATION
```

**Not:** transaction-boundary defect · original-design parser defect · missing schema origin · compatibility reconstruction · hosted-schema origin · forward-fix · fake history · second quarantine · merge into HMD-006 or HMD-007.

---

## 5. HMD register / HMD-008

HMD-008 is **already allocated** by the forensic record. This PAD **does not** allocate a new identifier and **does not** duplicate HMD-008.

```
HMD-008 STATUS AFTER THIS PAD =
  OPEN /
  DISTINCT /
  FORENSIC INVESTIGATION COMPLETE /
  HISTORICAL SOURCE-INTEGRITY DEFECT /
  POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION /
  OPTION A SELECTED /
  IMPLEMENTATION NOT AUTHORIZED YET
```

**Not** `SOURCE INTEGRITY RESTORED` — the target has **not** been edited. **Not resolved. Not CLOSED.**

| Field | Value |
|-------|-------|
| **Defect ID** | **HMD-008** |
| **Target** | `supabase/migrations/20260401140000_notifications_trigger_service_role_insert.sql` |
| **Classification** | **HISTORICAL SOURCE-INTEGRITY DEFECT** / **POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION** |
| **Attribution** | **NOT RU-1.1 · NOT RU-1.2 · NOT RU-1.3 · NOT RU-1.4 · NOT HMD-001/002/003/004/005/006/007** |

---

## 6. Content authority

```
CONTENT AUTHORITY = fa89b72a3ffac65593a724cd1194e7c22f7dd397
ORIGIN BLOB       = 6eec5c848d60a82d2198d17ebd238f6027e4f710
PATH              = supabase/migrations/20260401140000_notifications_trigger_service_role_insert.sql
```

- `fa89b72a` is the authoritative historical source for the L40 and L67 fragments.
- No backup/export/alternate copy supersedes it.
- Current HEAD / working-tree corruption is **not** authoritative.
- HMD-006 origin `9f9af80a` is **not** content authority for this file.
- HMD-007 origin `efc3f49e` is **not** content authority for this file.
- Later production / current hosted schema is **not** content authority.
- Manual semantic reconstruction is **prohibited** where exact origin content exists.
- No hand-authored alternative wording. No “equivalent” fix. No formatting cleanup. No whole-file checkout.

---

## 7. Selected remediation policy

```
SELECTED = OPTION A — EXACT HISTORICAL SOURCE RESTORATION
```

| Option | Finding |
|--------|---------|
| **A** Exact historical source restoration | **FORENSICALLY ELIGIBLE / SELECTED** |
| **B** Historical reconstruction | **NOT INDICATED** |
| **C** Forward fix | **REJECTED / INSUFFICIENT FOR CLEAN HISTORICAL REPLAY** |
| **D** Quarantine target | **REJECTED / NOT AUTHORIZED** |

**Rationale:** authoritative origin exists · origin is syntactically valid · current file was corrupted later by `8c30eb2` · corruption is bounded to L40 and L67 plus non-semantic trailing blanks · clean replay cannot parse the current file · a later forward fix cannot be reached · reconstruction is unnecessary · quarantine is unauthorized and semantically wrong.

**Rejected:** reconstruction · forward-fix · quarantine/skip · fake history · synthetic replacement · production back-projection · `migration repair` · commenting-out · recording applied without execution · parser-only patch that invents different wording · restore L40 only · whole-file restore.

Restoration means: corrupted fragments → **exact `fa89b72a` historical content**. No modernizing SQL. No added constraints/columns. No style sweep.

**Historical truth claim = PROVEN SOURCE RESTORATION.** This restoration **does not invent** new historical behavior. It restores the governed historical migration fragments to exact content proven to have existed at its origin commit.

**No option is performed by this PAD.**

---

## 8. Bounded restoration set

**Whole-file restore is NOT selected / NOT AUTHORIZED.** Full comparison proves **two** parser-relevant / semantic differences plus four trailing blank lines. Trailing blanks are **not** parser-significant source corruption of SQL tokens (PAD-052 / HMIC-019 · PAD-054 / HMIC-044 · PAD-055 / HMIC-055 precedent).

Purpose of Option A is **source integrity of the proven corrupted fragments**, not byte-identity with origin. Trailing blanks are **outside authorized scope**. Future restoration success criterion is **exact origin fragment equality for L40 and L67**, not full-file byte equality.

### 8.1 PROVEN SOURCE CORRUPTION — RESTORE (exactly two)

| ID | Line / construct | Parser / semantic effect | Current (HEAD) | Origin (`fa89b72a`) | Type | Option A |
|----|------------------|--------------------------|----------------|---------------------|------|----------|
| **A** | **L40** `WHEN 'council' THEN …` inside `public.notifications_set_author_from_profile()` `AS $$` | **PARSER-BREAKING** (observed `syntax error at or near "manager"`) | `WHEN 'council' THEN '业委?` | `WHEN 'council' THEN '业委会'` | quote corruption / truncated CJK (`会` + closing `'` → `?`) | **RESTORE** |
| **B** | **L67** same CASE construct, second function branch | **PARSER-BREAKING if reached** (same malformed literal; runtime first stops at L40) | `WHEN 'council' THEN '业委?` | `WHEN 'council' THEN '业委会'` | same quote / CJK corruption | **RESTORE** |

More precisely, restore both malformed return literals:

```
CURRENT = '业委?
ORIGIN  = '业委会'
```

**Code-point proof** of the literal after `THEN ` (both L40 and L67):

| | Opening quote | 业 | 委 | 会 / `?` | Closing quote |
|--|---------------|----|----|----------|---------------|
| Origin | `U+0027` | `U+4E1A` | `U+59D4` | **`U+4F1A`** | **`U+0027`** |
| Current | `U+0027` | `U+4E1A` | `U+59D4` | **`U+003F`** | **absent** |

L41 / L68 `WHEN 'manager' THEN '物业经理'` are **IDENTICAL** to origin and **DO NOT TOUCH**.

**Do not authorize only L40.** Both fragments are independently corrupted and both must be restored if later implementation is authorized.

### 8.2 NON-SEMANTIC WHITESPACE — DO NOT TOUCH

| Region | Difference | Disposition |
|--------|------------|-------------|
| **C** trailing blanks | origin ends after `$$;` · current has **four** extra empty blank lines | **DO NOT TOUCH / NOT AUTHORIZED** |
| Indentation / BOM / unrelated SQL | **NONE** in content lines other than A and B | **N/A** |

```
TRAILING BLANK LINE RESTORATION  = NOT REQUIRED / NOT AUTHORIZED
WHITESPACE-ONLY RESTORATION      = NOT REQUIRED / NOT AUTHORIZED
WHITESPACE NORMALIZATION         = NOT AUTHORIZED
LINE ENDING NORMALIZATION        = NOT AUTHORIZED
NON-SEMANTIC CRLF/LF DIFFERENCES = PRESERVE
FORMATTING SWEEP                 = PROHIBITED
```

A future IA **must** replace only the authorized L40 and L67 fragments with origin text and **must not** normalize the rest of the file to `fa89b72a` bytes. Future certification basis:

```
AUTHORIZED FRAGMENT EQUALITY = EXACT ORIGIN (L40 AND L67)
WHITESPACE DIFFERENCE        = PRESERVED / OUTSIDE AUTHORIZED SCOPE
```

### 8.3 UNRESOLVED — NOT AUTHORIZED

**None** in this target vs `fa89b72a` except the trailing blanks classified in §8.2.

---

## 9. Existing migration edit rule

Historical migrations remain **immutable by default**.

PAD-056 creates a **narrow exception** for:

```
supabase/migrations/20260401140000_notifications_trigger_service_role_insert.sql
```

**only** within the two proven restoration fragments (L40 and L67).

This exception **does not** authorize: arbitrary cleanup · SQL redesign · style changes · refactoring · policy redesign · new schema semantics · later-file changes · sibling-file edits · HMD-006 target edits · HMD-007 target edits · trailing-blank cleanup · L40-only restore.

```
UNTIL A DEDICATED RESTORATION IA IS ISSUED AND CONSUMED: DO NOT TOUCH.
Forensic evidence ≠ edit authorization.
This PAD ≠ Implementation Authorization.
```

Future IA pre-state **must** be:

```
CURRENT BLOB = 7fcc5f52613989b5204d8991d2b9eeea0c4938d0
WORKTREE     = CLEAN relative to HEAD for this target
CURRENT L40  = WHEN 'council' THEN '业委?
CURRENT L67  = WHEN 'council' THEN '业委?
```

If any differs before future implementation: **STOP → GOVERNANCE**.

---

## 10. One-file / two-fragment scope / sibling locks

```
AUTHORIZED HISTORICAL FILE COUNT     = EXACTLY 1
AUTHORIZED FILE                      = 20260401140000_notifications_trigger_service_role_insert.sql
AUTHORIZED SOURCE FRAGMENT COUNT     = EXACTLY 2
AUTHORIZED FRAGMENTS                 = L40 AND L67 ONLY
```

HMD-007 authorized **1 file / 1 fragment**. HMD-008 **must not** be implemented as a one-fragment restore.

### 10.1 HMD-006 target

Do **not** edit `20260331161000_owner_bulletin_notifications.sql`.

```
HMD-006 = OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
```

HMD-008 remains **DISTINCT**.

### 10.2 HMD-007 target

Do **not** edit `20260331180000_announcements_created_by_inbox_fanout.sql`. LOCAL-014 runtime proof **stands**.

```
HMD-007 = OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
```

HMD-008 remains **DISTINCT**.

---

## 11. Relations

| Defect | Relation |
|--------|----------|
| **HMD-001** | **OPEN / DISTINCT** — quarantine unchanged |
| **HMD-002** | **DISTINCT** — same class (post-creation literal corruption); **grant not reusable**; **do not reopen** |
| **HMD-003** | **DISTINCT** — W2 / April HARD / July S1 **NOT REACHED / NOT APPLIED**; runtime still **PENDING** |
| **HMD-004** | **DISTINCT** — same class; **grant not reusable**; runtime verified |
| **HMD-005** | **DISTINCT** — reconstruction + target **REACHED / APPLIED**; **RUNTIME REPLAY VERIFIED**; **not CLOSED**; **not reopened** |
| **HMD-006** | **DISTINCT** — same corrupting commit `8c30eb2`; **different file**; **different origin**; restoration grant **not reusable**; **RUNTIME REPLAY VERIFIED**; **not CLOSED**; **not reopened** |
| **HMD-007** | **DISTINCT** — same corrupting commit `8c30eb2`; **different file**; **different origin**; **1-fragment grant not reusable**; LOCAL-014 **REACHED / APPLIED**; **RUNTIME REPLAY VERIFIED**; **not CLOSED**; **not reopened** |

---

## 12. Quarantine / truthful history / BCR

```
quarantinedMigrations = [ 20260314195641_add_demo_data.sql ]
quarantineCount       = 1
HMD-008 TARGET        = NOT QUARANTINED
HMD-008 QUARANTINE    = REJECTED / NOT AUTHORIZED
```

**Do not** quarantine `20260401140000`. PAD-041 / PAD-027 remain in force. This PAD **does not** authorize quarantine change.

**Rejected:** fake `schema_migrations` · repair-as-applied · skip · comment-out · pretend later migration preserves chronology.

Current operational BCR (read from `scripts/verification/e02/replay-e02-declared-baseline.ts`; not guessed):

```
BCR CHANGE AUTHORIZED BY THIS PAD = NO
CURRENT BCR DBA PIN               = E-02-DBA-LOCAL-014
CURRENT BCR ARTIFACT AUTHORITY    = E-02-BCR-IA-014
```

That pin is the LOCAL-014 runtime pin. This PAD **does not** retarget BCR. LOCAL-014 is immutable failed and **cannot** execute again. A future successor BCR retarget / LOCAL-015 requires **separate authority** only after restoration Implementation Authorization → implementation → Completion. **Not issued now.**

---

## 13. Successor chain

```
THIS PAD (PAD-056)                         [ISSUED — policy only]
  → HMD-008 source-restoration Implementation Authorization
       expected family: E-02-HMIR-IA
       expected next unused ID: E-02-HMIR-IA-005
       expected path: E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-005.md
       (file-specific · two fragments · fa89b72a · L40 AND L67 only · repository-only ·
        no sibling files · no HMD-006 target · no HMD-007 target · no BCR · no DB)
       NOT CREATED HERE — sequence must be independently verified later
  → exact two-fragment restoration
  → corresponding Implementation Completion
  → successor DBA (NOT LOCAL-014 retry; LOCAL-015 not issued here)
  → successor BCR IA retarget only if that later DBA requires it
  → fresh CB-B replay + preserve + verify:e02:baseline
  → E-02-RU-1.4-REA ONLY IF APPLIED_AND_BASELINE_VERIFIED
```

**Not in this chain now:** restoration execution · HMIR-IA-005 · LOCAL-015 · BCR retarget · RU-1.4 · sibling edits · second quarantine.

Future IA **must** be subordinate to this PAD and must specify: exact target file · origin commit/blob · current fragments · restored fragments · file count exactly one · fragment count exactly two · no sibling file edits · no HMD-006 / HMD-007 target edit · no BCR edit · no DB · static verification · no runtime · no commit.

Future implementation **must** prove:

```
AUTHORIZED FILES               = 1
ACTUAL CHANGED MIGRATION FILES = 1
AUTHORIZED FRAGMENTS           = 2
ACTUAL RESTORED FRAGMENTS      = 2
L40                            = EXACT ORIGIN
L67                            = EXACT ORIGIN
TRAILING BLANK LINES           = UNCHANGED
SIBLING MIGRATIONS             = UNCHANGED
UNRELATED TARGET CHANGES       = NONE
BCR                            = UNCHANGED
```

- restored L40 and L67 equal `fa89b72a` **exactly**;
- no additional migration changed;
- trailing blanks / line endings **untouched**;
- quarantine remains count 1;
- BCR unchanged (still LOCAL-014 / IA-014 until a later separate retarget);
- DB-free `--plan` remains `PLAN_OK` if authorized later, discovering this file **EXECUTABLE / NOT QUARANTINED**;
- build passes if repository precedent requires it;
- no DB / Supabase / Docker runtime.

---

## 14. Program Authority Decisions (PAD-056 / HMIC-061 – HMIC-072)

PAD-056 is **one** supplement ID covering the following resolutions (PAD-051 / PAD-052 / PAD-053 / PAD-054 / PAD-055 single-ID precedent; not a 12-ID block).

### PAD-056 / HMIC-061 — Successor file-specific restoration permitted

**RESOLVED: YES — APPROVED WITH CONDITIONS.**

A historical migration whose original valid fragments are proven at `fa89b72a` and later corrupted by `8c30eb2` **may** be restored **exactly** to those fragments under this PAD. Class authority is HMIC-001; **operational grant is this file only.**

### PAD-056 / HMIC-062 — Prior restoration-grant coverage

**RESOLVED: NO.** HMD-002 / `E-02-HMIR-IA` cover **only** `20260315035847`. HMD-004 / `E-02-HMIR-IA-002` cover **only** `20260320045054`. HMD-006 / `E-02-HMIR-IA-003` cover **only** `20260331161000`. HMD-007 / `E-02-HMIR-IA-004` cover **only** `20260331180000` / **L70**. PAD-053 does **not** cover this file. PAD-054 left this file **OUT OF HMD-006 SCOPE**. PAD-055 / HMIC-056 left this file **OUT OF HMD-007 SCOPE / NOT ALLOCATED**.

### PAD-056 / HMIC-063 — Defect identifier

**RESOLVED: HMD-008 (already allocated; not duplicated; not expanded; DISTINCT from HMD-006 and HMD-007).** HMD-001 – HMD-007 not merged.

### PAD-056 / HMIC-064 — Content authority

**RESOLVED: `fa89b72a3ffac65593a724cd1194e7c22f7dd397` only** for the L40 and L67 fragments. Origin blob `6eec5c848d60a82d2198d17ebd238f6027e4f710`. No equivalent wording. No whole-file checkout.

### PAD-056 / HMIC-065 — Whole-file vs bounded fragments

**RESOLVED: EXACT TWO FRAGMENTS ONLY (L40 AND L67).** Whole-file origin restore **not selected / not authorized**. Future attributable migration diff contains **only** the L40 and L67 restorations.

### PAD-056 / HMIC-066 — L40 and L67

**RESOLVED: RESTORE BOTH.** Proven parser-breaking truncated / unclosed literals. Current `WHEN 'council' THEN '业委?` → origin `WHEN 'council' THEN '业委会'` at **L40 and L67**. L40-only restore **not authorized**. No other target content authorized.

### PAD-056 / HMIC-067 — Trailing blanks / line endings

**RESOLVED: DO NOT TOUCH / NOT AUTHORIZED.** Four extra trailing blank lines are whitespace-only. Whitespace normalization and line-ending normalization **not authorized**. Future IA preserves current EOF whitespace.

### PAD-056 / HMIC-068 — HMD-006 / HMD-007 targets

**RESOLVED: OUT OF SCOPE.** `20260331161000` = **DO NOT EDIT**. `20260331180000` = **DO NOT EDIT**. HMD-006 and HMD-007 remain **RUNTIME REPLAY VERIFIED**.

### PAD-056 / HMIC-069 — Reconstruction / forward-fix / quarantine / fake history

**RESOLVED: ALL REJECTED** for this defect. Quarantine count remains **1**. Target remains **NOT QUARANTINED**.

### PAD-056 / HMIC-070 — Successor chain

**RESOLVED:** §13. Next issued document = **HMD-008 source-restoration Implementation Authorization** (expected `E-02-HMIR-IA-005`; **not created here**; sequence must be independently verified later).

### PAD-056 / HMIC-071 — BCR / LOCAL-014 / LOCAL-015 / RU-1.4

**RESOLVED:** No BCR change. Current pin **E-02-DBA-LOCAL-014** / **E-02-BCR-IA-014**. LOCAL-014 immutable failure / attempts **1** / no retry. LOCAL-015 **not** issued. RU-1.4 **RUNTIME NOT AUTHORIZED**. This PAD ≠ execution.

### PAD-056 / HMIC-072 — Same corrupting commit / distinct scope

**RESOLVED:** `8c30eb2` is the same corrupting commit as HMD-006 and HMD-007. HMD-008 remains a **distinct** defect: different target, different origin commit, different fragment set (2 vs HMD-007’s 1), PAD-054 / PAD-055 sibling locks preserved, no merge.

---

## 15. Invariants

| ID | Invariant |
|----|-----------|
| HMIC6-I1 | HMD-001 remains OPEN; quarantine count remains 1 |
| HMIC6-I2 | HMD-002 remains DISTINCT / runtime verified |
| HMIC6-I3 | HMD-003 remains DISTINCT / runtime pending |
| HMIC6-I4 | HMD-004 remains DISTINCT / runtime verified |
| HMIC6-I5 | HMD-005 remains OPEN / reconstruction implemented / implementation completed / **RUNTIME REPLAY VERIFIED** / **not CLOSED** |
| HMIC6-I6 | HMD-006 remains OPEN / source integrity restored / implementation completed / **RUNTIME REPLAY VERIFIED** / **not CLOSED** / **not reopened** |
| HMIC6-I7 | HMD-007 remains OPEN / source integrity restored / implementation completed / **RUNTIME REPLAY VERIFIED** / **not CLOSED** / **not reopened** |
| HMIC6-I8 | Future restoration changes only L40 and L67 in **exactly one** file |
| HMIC6-I9 | Trailing blanks / line endings remain untouched |
| HMIC6-I10 | HMD-006 and HMD-007 targets remain unedited under this PAD |
| HMIC6-I11 | No `migration repair` / fake applied row |
| HMIC6-I12 | LOCAL-014 evidence immutable; attempts = 1; no retry |
| HMIC6-I13 | This PAD ≠ execution / ≠ IA / ≠ DBA |
| HMIC6-I14 | PAD-057+ not allocated |
| HMIC6-I15 | EIR / Acceptance / Certification unchanged |
| HMIC6-I16 | BCR remains LOCAL-014 / IA-014; BCR edit not authorized |

---

## 16. Strongest allowed claim

The recoverable `fa89b72a` L40 and L67 source **removes the currently observed plpgsql `syntax error at or near "manager"` defect** in `public.notifications_set_author_from_profile()`.

This PAD **does not** claim: restoration already performed · sibling files repaired · downstream replay success · HMD-003 closed · HMD-005 closed · HMD-006 closed · HMD-007 closed · database baseline verified · LOCAL-015 authorized · Implementation Authorization issued.

---

## 17. Lock

```
PAD-056                                                    = ISSUED / IMMUTABLE
DECISION                                                   = APPROVED WITH CONDITIONS —
                                                             OPTION A /
                                                             EXACT HISTORICAL SOURCE RESTORATION /
                                                             ISSUED /
                                                             IMMUTABLE
HMD-008                                                    = OPEN / DISTINCT /
                                                             FORENSIC INVESTIGATION COMPLETE /
                                                             HISTORICAL SOURCE-INTEGRITY DEFECT /
                                                             POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION /
                                                             OPTION A SELECTED /
                                                             IMPLEMENTATION NOT AUTHORIZED YET
TARGET                                                     = 20260401140000_notifications_trigger_service_role_insert.sql
CURRENT BLOB                                               = 7fcc5f52613989b5204d8991d2b9eeea0c4938d0
CONTENT AUTHORITY                                          = fa89b72a
ORIGIN BLOB                                                = 6eec5c848d60a82d2198d17ebd238f6027e4f710
CORRUPTING COMMIT                                          = 8c30eb2
SAME CORRUPTING COMMIT AS HMD-006                          = YES
SAME CORRUPTING COMMIT AS HMD-007                          = YES
SAME DEFECT SCOPE AS HMD-006 / HMD-007                     = NO
AUTHORIZED HISTORICAL FILE COUNT                           = EXACTLY 1
AUTHORIZED SOURCE FRAGMENT COUNT                           = EXACTLY 2
AUTHORIZED FRAGMENTS                                       = L40 AND L67 ONLY
CURRENT L40                                                = WHEN 'council' THEN '业委?
RESTORE L40 TO                                             = WHEN 'council' THEN '业委会'
CURRENT L67                                                = WHEN 'council' THEN '业委?
RESTORE L67 TO                                             = WHEN 'council' THEN '业委会'
HISTORICAL TRUTH                                           = PROVEN SOURCE RESTORATION
WHOLE-FILE RESTORE                                         = NOT AUTHORIZED
WHITESPACE RESTORATION                                     = NOT AUTHORIZED
TRAILING BLANK LINES                                       = PRESERVE
HMD-006 TARGET                                             = DO NOT EDIT
HMD-007 TARGET                                             = DO NOT EDIT
SOURCE RESTORATION                                         = SELECTED / NOT IMPLEMENTED
20260401140000                                             = DO NOT EDIT UNTIL DEDICATED HMIR IA
LOCAL-014                                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-014 ATTEMPTS                                         = 1
LOCAL-014 RETRY                                            = NOT AUTHORIZED
LOCAL-015                                                  = NOT ISSUED
CURRENT BCR DBA PIN                                        = E-02-DBA-LOCAL-014
CURRENT BCR ARTIFACT AUTHORITY                             = E-02-BCR-IA-014
BCR EDIT                                                   = NOT AUTHORIZED
RUNTIME                                                    = NOT AUTHORIZED
HMD-007                                                    = OPEN / SOURCE INTEGRITY RESTORED /
                                                             IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-006                                                    = OPEN / SOURCE INTEGRITY RESTORED /
                                                             IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-005                                                    = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                             IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-003                                                    = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                             IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
DATABASE BASELINE VERIFIED                                 = NO
RU-1.1 / RU-1.2                                            = NOT APPLIED
RU-1.4                                                     = RUNTIME NOT AUTHORIZED
E02_RUNTIME_EXECUTION_AUTHORIZED                           = UNSET / FALSE
EIR / ACCEPTANCE / CERTIFICATION                           = NONE / BLOCKED / NOT ISSUED
RUNTIME COMMITTED                                          = NOT CERTIFIED
FINAL COMMIT PATH                                          = BLOCKED
NEXT                                                       = HMD-008 HISTORICAL MIGRATION INTEGRITY
                                                             RESTORATION IMPLEMENTATION AUTHORIZATION
EXECUTABLE WORK                                            = NONE
```

---

**End of document — PAD-056 · HMIC-061 – HMIC-072 · HMD-008 — v1.0 — 2026-08-29**
