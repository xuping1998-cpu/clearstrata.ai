# E-02 Program Authority Decision — Historical Migration Integrity / Compatibility (Successor)

## Exact Historical Source Restoration · HMD-007 · `20260331180000_announcements_created_by_inbox_fanout.sql`

| Field | Value |
|-------|-------|
| **Document Type** | **Program Authority Decision (Supplement)** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Parent Authority** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) v1.0 (PAD-001 – PAD-010) |
| **Direct Predecessor Supplement** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md) (**PAD-054** · HMIC-037 – HMIC-048 · HMD-006) |
| **Prior Predecessor Supplements** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md) (**PAD-053** · HMD-005) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md) (**PAD-052** · HMD-004) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) (PAD-039 – PAD-050 · HMD-002) · [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) (PAD-051 · HMD-003) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038 · HMD-001) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025) |
| **Forensic record** | [`E-02-HMD-007-Announcements-Created-By-Inbox-Fanout-Forensic-Investigation.md`](E-02-HMD-007-Announcements-Created-By-Inbox-Fanout-Forensic-Investigation.md) |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-013.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-013.md) · run `local-013-20260828a` |
| **Supplement ID** | **PAD-055** |
| **Authority Question Register** | **HMIC-049 – HMIC-060** |
| **Status** | **APPROVED WITH CONDITIONS — OPTION A (FILE-SPECIFIC SUCCESSOR)** |
| **Selected Policy** | **EXACT HISTORICAL SOURCE RESTORATION** |
| **Defect** | **HMD-007** |
| **Authority Level** | Program Authority |
| **Effective Date** | 2026-08-28 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **NO** |

> **Authority path finding: YES.** Filename `E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md` is **authority-safe** as the next successor in the existing **HMIC** decision family (`Decision.md` · `Decision-002.md` · `Decision-003.md` · `Decision-004.md` · **this Decision-005**). Distinct filename keeps PAD-039 – PAD-050, **PAD-052**, **PAD-053**, and **PAD-054** **immutable**. This is **not** a new governance tier. PAD identifiers are **not** CS/FD registry numbers.
>
> Sequence: Parent PAD-001 – PAD-010 · DAA PAD-011 – PAD-025 · HMBC PAD-026 – PAD-038 · HMIC PAD-039 – PAD-050 · HFSO PAD-051 · HMIC successor PAD-052 · HMIC successor PAD-053 · HMIC successor PAD-054 · **this supplement PAD-055**. Highest previously allocated PAD is **PAD-054**. **PAD-055 is the next unused identifier.** **PAD-055 did not already exist. PAD-055 was not reserved. PAD-055 has not previously been issued.** **No PAD-056+ supersedes the sequence.** **PAD-056+ is not allocated.**
>
> HMIC subsequence: HMIC-001 – HMIC-012 (PAD-039 – PAD-050) · HMIC-013 – HMIC-024 (PAD-052) · HMIC-025 – HMIC-036 (PAD-053) · HMIC-037 – HMIC-048 (PAD-054) · **this register HMIC-049 – HMIC-060**. Highest previously allocated HMIC is **HMIC-048**. **HMIC-049 – HMIC-060 is the next unused 12-clause range.** No HMIC-049+ existed before this issuance.
>
> **Why a new PAD is required (not reflexive):** PAD-039 / HMIC-001 established the **class** (exact historical source restoration after proven later corruption). PAD-054 / HMD-006 operationalized that class **only** for `20260331161000` / **exactly four** fragments and explicitly left `20260331180000` **OUT OF HMD-006 SCOPE**. `E-02-HMIR-IA-003` is **file-specific** and **does not** authorize editing `20260331180000_announcements_created_by_inbox_fanout.sql`. PAD-053 / HMD-005 is a **different class** (enum commit-boundary reconstruction). PAD-032 still requires **future authority** before a historical migration is modified. A file-specific successor PAD is therefore the same kind of gap PAD-054 closed for HMD-006.
>
> **Why this is not a new class:** The defect is the same **`8c30eb2` CJK-truncation family** as HMD-002 / HMD-004 / HMD-006 (truncated zh SQL literals; origin recoverable). **Same corrupting commit ≠ same defect scope.** Reconstruction (HMD-003 / PAD-051 / HMD-005 / PAD-053) is **rejected** as the model. Quarantine / forward-fix / fake history remain **rejected**.

> **Scope lock:** Establishes **Exact Historical Source Restoration** policy for **one** migration and **exactly one** proven corrupted fragment (**L70**). This record **does not** restore any file · **does not** restore trailing blanks · **does not** issue `E-02-HMIR-IA-004` · **does not** retry LOCAL-013 · **does not** create LOCAL-014 · **does not** expand quarantine · **does not** edit sibling migrations · **does not** edit the HMD-006 target · **does not** modify BCR/guard/verifier · **does not** run database/Supabase/Docker · **does not** authorize RU-1.4 · **does not** reclassify EIR / Acceptance / Certification.

```
HISTORICAL MIGRATION INTEGRITY / COMPATIBILITY AUTHORITY-005 = ESTABLISHED (THIS SUPPLEMENT)
DECISION                                                     = APPROVED WITH CONDITIONS — OPTION A
SELECTED POLICY                                              = EXACT HISTORICAL SOURCE RESTORATION
RESTORATION MODEL                                            = EXACT HISTORICAL SOURCE / BOUNDED PROVEN FRAGMENT ONLY
HISTORICAL TRUTH CLAIM                                       = PROVEN SOURCE RESTORATION
TARGET MIGRATION                                             = 20260331180000_announcements_created_by_inbox_fanout.sql
AUTHORIZED HISTORICAL FILE COUNT                             = EXACTLY 1
AUTHORIZED FUTURE RESTORATION SET                            = EXACTLY ONE FRAGMENT (L70)
WHOLE-FILE RESTORE                                           = NOT SELECTED
WHITESPACE-ONLY RESTORATION                                  = NOT REQUIRED / NOT AUTHORIZED
TRAILING BLANK LINE RESTORATION                              = NOT REQUIRED / NOT AUTHORIZED
WHITESPACE NORMALIZATION                                     = NOT AUTHORIZED
SIBLING 20260401140000                                       = FORENSICALLY NOTED / OUT OF HMD-007 SCOPE /
                                                               NOT AUTHORIZED FOR RESTORATION /
                                                               NOT ALLOCATED AS A NEW DEFECT HERE
HMD-006 TARGET                                               = DO NOT EDIT
RECONSTRUCTION                                               = REJECTED / NOT INDICATED
FORWARD-FIX                                                  = REJECTED / INSUFFICIENT FOR CLEAN HISTORICAL REPLAY
QUARANTINE / SKIP                                            = NOT AUTHORIZED
FAKE HISTORY / REPAIR-AS-APPLIED                             = REJECTED
HMD-007                                                      = OPEN / DISTINCT /
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
EXISTING QUARANTINE                                          = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINE COUNT                                             = 1
20260331180000                                               = DO NOT EDIT UNTIL DEDICATED RESTORATION IA
PAD-039 – PAD-050 / E-02-HMIR-IA                             = NOT REUSED AS EXECUTABLE AUTHORITY FOR THIS FILE
PAD-052 / E-02-HMIR-IA-002                                   = NOT REUSED AS EXECUTABLE AUTHORITY FOR THIS FILE
PAD-054 / E-02-HMIR-IA-003                                   = NOT REUSED AS EXECUTABLE AUTHORITY FOR THIS FILE
PAD-053                                                      = ISSUED / IMMUTABLE (reconstruction class unchanged)
PAD-054                                                      = ISSUED / IMMUTABLE (HMD-006 file-specific grant unchanged)
LOCAL-013                                                    = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-013 ATTEMPTS                                           = 1
LOCAL-013 RETRY                                              = NOT AUTHORIZED
LOCAL-014                                                    = NOT ISSUED
BCR EDIT                                                     = NOT AUTHORIZED
RUNTIME                                                      = NOT AUTHORIZED
RESTORATION EXECUTED                                         = NO (POLICY ONLY)
THIS PAD                                                     ≠ IMPLEMENTATION AUTHORIZATION
THIS PAD                                                     ≠ DATABASE APPLICATION AUTHORIZATION
THIS PAD                                                     ≠ PRODUCTION DEPLOYMENT AUTHORIZATION
PAD-056+                                                     = NOT ALLOCATED
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
| [`E-02-HMD-007-Announcements-Created-By-Inbox-Fanout-Forensic-Investigation.md`](E-02-HMD-007-Announcements-Created-By-Inbox-Fanout-Forensic-Investigation.md) | HMD-007 forensic classification · Option A recommended · **consumed as immutable fact** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-013.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-013.md) | LOCAL-013 **APPLICATION_FAILED** · `unterminated quoted string at or near "'"` · evidence **immutable** |

**MANDATORY STOP does not apply.** Forensic hashes match. Target identity matches. PAD sequence is unambiguous. Authority supports issuance of PAD-055.

### 1.1 Pre-gate answers

| Question | Finding |
|----------|---------|
| A. Govern under existing HMIC source-restoration class? | **YES — as a successor file-specific PAD.** Class = PAD-039 / HMIC-001. Operational grant for this file = **absent until this PAD**. |
| B. Do HMD-002 / HMD-004 / HMD-006 implementation authorities cover `20260331180000`? | **NO.** File-specific. **Do not reuse `E-02-HMIR-IA`, `E-02-HMIR-IA-002`, or `E-02-HMIR-IA-003`.** **Do not reopen those defects.** |
| C. Does PAD-053 cover this failure? | **NO.** HMD-005 is a transaction-boundary reconstruction class. Later failure does **not** reopen HMD-005. |
| D. Does PAD-054 cover this file? | **NO.** PAD-054 / HMIC-045 left `20260331180000` **OUT OF HMD-006 SCOPE**. Same corrupting commit **does not** expand that grant. |
| E. New PAD required? | **YES — PAD-055.** Existing PAD-039–054 do **not** contain sufficient *file-specific* authority. |
| F. Target already restored? | **NO.** Current blob `11fe1e93` equals HEAD; L70 still `'业委?`. |

---

## 2. Triggering defect / LOCAL-013

LOCAL-013 governed replay failed at:

```
supabase/migrations/20260331180000_announcements_created_by_inbox_fanout.sql
DATABASE ERROR = unterminated quoted string at or near "'"
parser context includes ELSE r / END; / RETURN NEW; / END;
```

| Field | Locked value |
|-------|----------------|
| LOCAL-013 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Attempts | **1** |
| evidenceRunId | `local-013-20260828a` |
| Executed | **64** |
| Highest applied | `20260331161000_owner_bulletin_notifications.sql` |
| First failing | `20260331180000_announcements_created_by_inbox_fanout.sql` (executable index **65**) |
| Retry | **NOT AUTHORIZED** |
| Successor DBA | **NOT ISSUED** |

Causal static defect: truncated / unclosed PL/pgSQL literal at **L70** (`THEN '业委?`). Quote pairing then offsets through `'物业经理'` and remains open into `ELSE r`. This is **not** HMD-001 · **not** HMD-002 · **not** HMD-003 · **not** HMD-004 · **not** HMD-005 · **not** HMD-006. The seven defects **must not be collapsed**.

This PAD **does not** authorize LOCAL-013 retry.

---

## 3. Locked forensic facts (not reopened)

Verified against the forensic record and current worktree. **No hash/commit mismatch.**

| ID | Fact |
|----|------|
| F1 | Path = `supabase/migrations/20260331180000_announcements_created_by_inbox_fanout.sql` |
| F2 | Current git blob = **`11fe1e935f4d4eeb3047c3dbac18d78e3caf9f2f`** |
| F3 | Worktree = **CLEAN / EQUALS HEAD** |
| F4 | Origin commit = **`efc3f49e27e48725b1aa097a8402dcb8ca42ffb7`** |
| F5 | Origin blob = **`ccb99fb4de63a0a0cc79cdbbdba3240ec5c54f1d`** |
| F6 | CURRENT == ORIGIN = **NO** |
| F7 | Corrupting commit = **`8c30eb2f657847dc0767201149190eef8d610475`** |
| F8 | Same corrupting commit as HMD-006 = **YES** |
| F9 | Same defect scope as HMD-006 = **NO** |
| F10 | Origin commit differs from HMD-006 origin `9f9af80a` = **YES** |
| F11 | File history = **exactly those two commits** |
| F12 | Content-line diffs vs origin = **exactly one**: L70 |
| F13 | Trailing blank-line diffs = origin ends after `);` · current has **four** extra CRLF blank lines (**whitespace only**) |
| F14 | Exact historical source available = **YES** |
| F15 | Source-corruption hypothesis = **SUPPORTED** |
| F16 | Original-design parser defect = **REJECTED** |
| F17 | Transaction-boundary hypothesis = **REJECTED** |
| F18 | Missing-prerequisite hypothesis = **REJECTED** |
| F19 | File remains valid UTF-8; BOM **NONE**; `?` is literal **`U+003F`** (not invalid-UTF-8 decode failure) |

---

## 4. Defect classification

```
CLASS     = HISTORICAL SOURCE-INTEGRITY DEFECT
SUBTYPE   = POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION
REMEDY    = EXACT HISTORICAL SOURCE RESTORATION
TRUTH     = PROVEN SOURCE RESTORATION
```

**Not:** transaction-boundary defect · original-design parser defect · missing schema origin · compatibility reconstruction · hosted-schema origin · forward-fix · fake history · second quarantine · merge into HMD-006.

---

## 5. HMD register / HMD-007

HMD-007 is **already allocated** by the forensic record. This PAD **does not** allocate a new identifier and **does not** duplicate HMD-007.

```
HMD-007 STATUS AFTER THIS PAD =
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
| **Defect ID** | **HMD-007** |
| **Target** | `supabase/migrations/20260331180000_announcements_created_by_inbox_fanout.sql` |
| **Classification** | **HISTORICAL SOURCE-INTEGRITY DEFECT** / **POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION** |
| **Attribution** | **NOT RU-1.1 · NOT RU-1.2 · NOT RU-1.3 · NOT RU-1.4 · NOT HMD-001/002/003/004/005/006** |

---

## 6. Content authority

```
CONTENT AUTHORITY = efc3f49e27e48725b1aa097a8402dcb8ca42ffb7
ORIGIN BLOB       = ccb99fb4de63a0a0cc79cdbbdba3240ec5c54f1d
PATH              = supabase/migrations/20260331180000_announcements_created_by_inbox_fanout.sql
```

- `efc3f49e` is the authoritative historical source for the L70 fragment.
- No backup/export/alternate copy supersedes it.
- Current HEAD / working-tree corruption is **not** authoritative.
- HMD-006 origin `9f9af80a` is **not** content authority for this file.
- Later production / current hosted schema is **not** content authority.
- Manual semantic reconstruction is **prohibited** where exact origin content exists.
- No hand-authored alternative wording. No “equivalent” fix. No formatting cleanup.

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

**Rationale:** authoritative origin exists · origin is syntactically valid · current file was corrupted later by `8c30eb2` · corruption is bounded to L70 plus non-semantic trailing blanks · clean replay cannot parse the current file · a later forward fix cannot be reached · reconstruction is unnecessary · quarantine is unauthorized and semantically wrong.

**Rejected:** reconstruction · forward-fix · quarantine/skip · fake history · synthetic replacement · production back-projection · `migration repair` · commenting-out · recording applied without execution · parser-only patch that invents different wording.

Restoration means: corrupted fragment → **exact `efc3f49e` historical content**. No modernizing SQL. No added constraints/columns. No style sweep.

**Historical truth claim = PROVEN SOURCE RESTORATION.** This restoration **does not invent** new historical behavior. It restores the governed historical migration fragment to exact content proven to have existed at its origin commit.

**No option is performed by this PAD.**

---

## 8. Bounded restoration set

**Whole-file restore is NOT selected.** Full comparison proves **one** parser-relevant / semantic difference plus four trailing CRLF blank lines. Trailing blanks are **not** parser-significant source corruption of SQL tokens (PAD-052 / HMIC-019 · PAD-054 / HMIC-044 precedent).

Purpose of Option A is **source integrity of the proven corrupted fragment**, not byte-identity with origin. Trailing blanks are **outside authorized scope**.

### 8.1 PROVEN SOURCE CORRUPTION — RESTORE (exactly one)

| ID | Line / construct | Parser / semantic effect | Current (HEAD) | Origin (`efc3f49e`) | Type | Option A |
|----|------------------|--------------------------|----------------|---------------------|------|----------|
| **A** | **L70** `WHEN 'council' THEN …` inside `public.notifications_set_author_from_profile()` `AS $$` | **PARSER-BREAKING** (observed unterminated quoted string) | `WHEN 'council' THEN '业委?` | `WHEN 'council' THEN '业委会'` | quote corruption / truncated CJK (`会` + closing `'` → `?`) | **RESTORE** |

More precisely, restore the malformed return literal:

```
CURRENT = '业委?
ORIGIN  = '业委会'
```

**Code-point proof** of the literal after `THEN `:

| | Opening quote | 业 | 委 | 会 / `?` | Closing quote |
|--|---------------|----|----|----------|---------------|
| Origin | `U+0027` | `U+4E1A` | `U+59D4` | **`U+4F1A`** | **`U+0027`** |
| Current | `U+0027` | `U+4E1A` | `U+59D4` | **`U+003F`** | **absent** |

L71 `WHEN 'manager' THEN '物业经理'` is **IDENTICAL** to origin and **DO NOT TOUCH**.

### 8.2 NON-SEMANTIC WHITESPACE — DO NOT TOUCH

| Region | Difference | Disposition |
|--------|------------|-------------|
| **B** trailing blanks | origin ends after `);` · current has **four** extra empty CRLF lines | **DO NOT TOUCH / NOT AUTHORIZED** |
| Indentation / BOM / unrelated SQL | **NONE** in content lines other than A | **N/A** |

```
TRAILING BLANK LINE RESTORATION  = NOT REQUIRED / NOT AUTHORIZED
WHITESPACE-ONLY RESTORATION      = NOT REQUIRED / NOT AUTHORIZED
WHITESPACE NORMALIZATION         = NOT AUTHORIZED
NON-SEMANTIC CRLF/LF DIFFERENCES = PRESERVE
FORMATTING SWEEP                 = PROHIBITED
```

A future IA **must** replace only the authorized L70 fragment with origin text and **must not** normalize the rest of the file to `efc3f49e` bytes. Future certification basis:

```
AUTHORIZED FRAGMENT EQUALITY = EXACT ORIGIN
WHITESPACE DIFFERENCE        = PRESERVED / OUTSIDE AUTHORIZED SCOPE
```

### 8.3 UNRESOLVED — NOT AUTHORIZED

**None** in this target vs `efc3f49e` except the trailing blanks classified in §8.2.

---

## 9. Existing migration edit rule

Historical migrations remain **immutable by default**.

PAD-055 creates a **narrow exception** for:

```
supabase/migrations/20260331180000_announcements_created_by_inbox_fanout.sql
```

**only** within the one proven restoration fragment (L70).

This exception **does not** authorize: arbitrary cleanup · SQL redesign · style changes · refactoring · policy redesign · new schema semantics · later-file changes · sibling-file edits · HMD-006 target edits · trailing-blank cleanup.

```
UNTIL A DEDICATED RESTORATION IA IS ISSUED AND CONSUMED: DO NOT TOUCH.
Forensic evidence ≠ edit authorization.
This PAD ≠ Implementation Authorization.
```

Future IA pre-state **must** be:

```
CURRENT BLOB = 11fe1e935f4d4eeb3047c3dbac18d78e3caf9f2f
WORKTREE     = CLEAN relative to HEAD for this target
CURRENT L70  = WHEN 'council' THEN '业委?
```

If any differs before future implementation: **STOP → GOVERNANCE**.

---

## 10. One-file scope / sibling locks

```
AUTHORIZED HISTORICAL FILE COUNT = EXACTLY 1
AUTHORIZED FILE                  = 20260331180000_announcements_created_by_inbox_fanout.sql
AUTHORIZED SOURCE FRAGMENT COUNT = EXACTLY 1
AUTHORIZED FRAGMENT              = L70 ONLY
```

### 10.1 HMD-006 target

Do **not** edit `20260331161000_owner_bulletin_notifications.sql`.

```
HMD-006 = OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
```

HMD-007 remains **DISTINCT**.

### 10.2 `20260401140000`

Same-commit contamination was forensically noted in `20260401140000_notifications_trigger_service_role_insert.sql`.

```
20260401140000 =
  FORENSICALLY NOTED /
  OUT OF HMD-007 SCOPE /
  NOT AUTHORIZED FOR RESTORATION /
  NOT ALLOCATED AS A NEW DEFECT HERE
```

**Do not** edit it · bundle it · infer it belongs to HMD-007 · allocate a new HMD ID in this PAD. It requires **separate governance** if later pursued. It was **not reached** by LOCAL-013.

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

---

## 12. Quarantine / truthful history / BCR

```
quarantinedMigrations = [ 20260314195641_add_demo_data.sql ]
quarantineCount       = 1
HMD-007 TARGET        = NOT QUARANTINED
HMD-007 QUARANTINE    = REJECTED / NOT AUTHORIZED
```

**Do not** quarantine `20260331180000`. PAD-041 / PAD-027 remain in force. This PAD **does not** authorize quarantine change.

**Rejected:** fake `schema_migrations` · repair-as-applied · skip · comment-out · pretend later migration preserves chronology.

```
BCR CHANGE AUTHORIZED BY THIS PAD = NO
CURRENT BCR                       = EXPECTED DBA E-02-DBA-LOCAL-013
                                    ARTIFACT AUTHORITY E-02-BCR-IA-013
                                    IMPLEMENTATION COMPLETED / STATICALLY CERTIFIED
```

Future HMD-007 restoration implementation **must not retarget BCR**. LOCAL-013 is immutable failed and **cannot** execute again. A future successor BCR retarget / LOCAL-014 requires **separate authority** only after restoration Implementation Authorization → implementation → Completion. **Not issued now.**

---

## 13. Successor chain

```
THIS PAD (PAD-055)                         [ISSUED — policy only]
  → HMD-007 source-restoration Implementation Authorization
       expected family: E-02-HMIR-IA
       expected next unused ID: E-02-HMIR-IA-004
       expected path: E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-004.md
       (file-specific · one fragment · efc3f49e · L70 only · repository-only ·
        no sibling files · no HMD-006 target · no BCR · no DB)
       NOT CREATED HERE — sequence must be independently verified later
  → exact one-fragment restoration
  → corresponding Implementation Completion
  → successor DBA (NOT LOCAL-013 retry; LOCAL-014 not issued here)
  → successor BCR IA retarget only if that later DBA requires it
  → fresh CB-B replay + preserve + verify:e02:baseline
  → E-02-RU-1.4-REA ONLY IF APPLIED_AND_BASELINE_VERIFIED
```

**Not in this chain now:** restoration execution · HMIR-IA-004 · LOCAL-014 · BCR retarget · RU-1.4 · sibling edits · second quarantine.

Future IA **must** be subordinate to this PAD and must specify: exact target file · origin commit/blob · current fragment · restored fragment · file count exactly one · fragment count exactly one · no sibling file edits · no HMD-006 target edit · no BCR edit · no DB · static verification · no runtime · no commit.

Future implementation **must** prove:

```
AUTHORIZED FILES               = 1
ACTUAL CHANGED MIGRATION FILES = 1
AUTHORIZED FRAGMENTS           = 1
ACTUAL RESTORED FRAGMENTS      = 1
L70                            = EXACT ORIGIN
TRAILING BLANK LINES           = UNCHANGED
SIBLING MIGRATIONS             = UNCHANGED
UNRELATED TARGET CHANGES       = NONE
```

- restored L70 equals `efc3f49e` **exactly**;
- no additional migration changed;
- trailing blanks / CRLF **untouched**;
- quarantine remains count 1;
- BCR unchanged (still LOCAL-013 / IA-013 until a later separate retarget);
- DB-free `--plan` remains `PLAN_OK` if authorized later, discovering this file **EXECUTABLE / NOT QUARANTINED**;
- build passes if repository precedent requires it;
- no DB / Supabase / Docker runtime.

---

## 14. Program Authority Decisions (PAD-055 / HMIC-049 – HMIC-060)

PAD-055 is **one** supplement ID covering the following resolutions (PAD-051 / PAD-052 / PAD-053 / PAD-054 single-ID precedent; not a 12-ID block).

### PAD-055 / HMIC-049 — Successor file-specific restoration permitted

**RESOLVED: YES — APPROVED WITH CONDITIONS.**

A historical migration whose original valid fragment is proven at `efc3f49e` and later corrupted by `8c30eb2` **may** be restored **exactly** to that fragment under this PAD. Class authority is HMIC-001; **operational grant is this file only.**

### PAD-055 / HMIC-050 — Prior restoration-grant coverage

**RESOLVED: NO.** HMD-002 / `E-02-HMIR-IA` cover **only** `20260315035847`. HMD-004 / `E-02-HMIR-IA-002` cover **only** `20260320045054`. HMD-006 / `E-02-HMIR-IA-003` cover **only** `20260331161000`. PAD-053 does **not** cover this file. PAD-054 / HMIC-045 left this file **OUT OF HMD-006 SCOPE**.

### PAD-055 / HMIC-051 — Defect identifier

**RESOLVED: HMD-007 (already allocated; not duplicated; not expanded; DISTINCT from HMD-006).** HMD-001 – HMD-006 not merged.

### PAD-055 / HMIC-052 — Content authority

**RESOLVED: `efc3f49e27e48725b1aa097a8402dcb8ca42ffb7` only** for the L70 fragment. Origin blob `ccb99fb4de63a0a0cc79cdbbdba3240ec5c54f1d`. No equivalent wording.

### PAD-055 / HMIC-053 — Whole-file vs bounded fragments

**RESOLVED: EXACT ONE FRAGMENT ONLY (L70).** Whole-file origin restore **not selected**. Future attributable migration diff contains **only** the L70 restoration.

### PAD-055 / HMIC-054 — L70 only

**RESOLVED: RESTORE.** Proven parser-breaking truncated / unclosed literal. Current `WHEN 'council' THEN '业委?` → origin `WHEN 'council' THEN '业委会'`. No other target content authorized.

### PAD-055 / HMIC-055 — Trailing blanks / CRLF

**RESOLVED: DO NOT TOUCH / NOT AUTHORIZED.** Four extra trailing CRLF blank lines are whitespace-only. Future IA preserves current EOF whitespace.

### PAD-055 / HMIC-056 — Sibling / HMD-006 target

**RESOLVED: OUT OF SCOPE.** `20260401140000` = forensically noted / not authorized / not allocated here. `20260331161000` = **DO NOT EDIT**. HMD-006 remains **RUNTIME REPLAY VERIFIED**.

### PAD-055 / HMIC-057 — Reconstruction / forward-fix / quarantine / fake history

**RESOLVED: ALL REJECTED** for this defect. Quarantine count remains **1**. Target remains **NOT QUARANTINED**.

### PAD-055 / HMIC-058 — Successor chain

**RESOLVED:** §13. Next issued document = **HMD-007 source-restoration Implementation Authorization** (expected `E-02-HMIR-IA-004`; **not created here**; sequence must be independently verified later).

### PAD-055 / HMIC-059 — BCR / LOCAL-013 / LOCAL-014 / RU-1.4

**RESOLVED:** No BCR change. LOCAL-013 immutable failure / attempts **1** / no retry. LOCAL-014 **not** issued. RU-1.4 **RUNTIME NOT AUTHORIZED**. This PAD ≠ execution.

### PAD-055 / HMIC-060 — Same corrupting commit / distinct scope

**RESOLVED:** `8c30eb2` is the same corrupting commit as HMD-006. HMD-007 remains a **distinct** defect: different target, different origin commit, PAD-054 sibling lock preserved, no merge.

---

## 15. Invariants

| ID | Invariant |
|----|-----------|
| HMIC5-I1 | HMD-001 remains OPEN; quarantine count remains 1 |
| HMIC5-I2 | HMD-002 remains DISTINCT / runtime verified |
| HMIC5-I3 | HMD-003 remains DISTINCT / runtime pending |
| HMIC5-I4 | HMD-004 remains DISTINCT / runtime verified |
| HMIC5-I5 | HMD-005 remains OPEN / reconstruction implemented / implementation completed / **RUNTIME REPLAY VERIFIED** / **not CLOSED** |
| HMIC5-I6 | HMD-006 remains OPEN / source integrity restored / implementation completed / **RUNTIME REPLAY VERIFIED** / **not CLOSED** / **not reopened** |
| HMIC5-I7 | Future restoration changes only L70 in **exactly one** file |
| HMIC5-I8 | Trailing blanks / CRLF remain untouched |
| HMIC5-I9 | Sibling `20260401140000` and HMD-006 target remain unedited under this PAD |
| HMIC5-I10 | No `migration repair` / fake applied row |
| HMIC5-I11 | LOCAL-013 evidence immutable; attempts = 1; no retry |
| HMIC5-I12 | This PAD ≠ execution / ≠ IA / ≠ DBA |
| HMIC5-I13 | PAD-056+ not allocated |
| HMIC5-I14 | EIR / Acceptance / Certification unchanged |
| HMIC5-I15 | BCR remains LOCAL-013 / IA-013; BCR edit not authorized |

---

## 16. Strongest allowed claim

The recoverable `efc3f49e` L70 source **removes the currently observed plpgsql unterminated-quoted-string defect** in `public.notifications_set_author_from_profile()`.

This PAD **does not** claim: restoration already performed · sibling files repaired · downstream replay success · HMD-003 closed · HMD-005 closed · HMD-006 closed · database baseline verified · LOCAL-014 authorized · Implementation Authorization issued.

---

## 17. Lock

```
PAD-055                                                    = ISSUED / IMMUTABLE
DECISION                                                   = APPROVED WITH CONDITIONS —
                                                             OPTION A /
                                                             EXACT HISTORICAL SOURCE RESTORATION /
                                                             ISSUED /
                                                             IMMUTABLE
HMD-007                                                    = OPEN / DISTINCT /
                                                             FORENSIC INVESTIGATION COMPLETE /
                                                             HISTORICAL SOURCE-INTEGRITY DEFECT /
                                                             POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION /
                                                             OPTION A SELECTED /
                                                             IMPLEMENTATION NOT AUTHORIZED YET
TARGET                                                     = 20260331180000_announcements_created_by_inbox_fanout.sql
CURRENT BLOB                                               = 11fe1e935f4d4eeb3047c3dbac18d78e3caf9f2f
CONTENT AUTHORITY                                          = efc3f49e
ORIGIN BLOB                                                = ccb99fb4de63a0a0cc79cdbbdba3240ec5c54f1d
CORRUPTING COMMIT                                          = 8c30eb2
SAME CORRUPTING COMMIT AS HMD-006                          = YES
SAME DEFECT SCOPE AS HMD-006                               = NO
AUTHORIZED HISTORICAL FILE COUNT                           = EXACTLY 1
AUTHORIZED SOURCE FRAGMENT COUNT                           = EXACTLY 1
AUTHORIZED FRAGMENT                                        = L70 ONLY
CURRENT L70                                                = WHEN 'council' THEN '业委?
RESTORE L70 TO                                             = WHEN 'council' THEN '业委会'
HISTORICAL TRUTH                                           = PROVEN SOURCE RESTORATION
WHITESPACE RESTORATION                                     = NOT AUTHORIZED
TRAILING CRLF BLANK LINES                                  = PRESERVE
20260401140000                                             = OUT OF HMD-007 SCOPE / NOT AUTHORIZED
HMD-006 TARGET                                             = DO NOT EDIT
SOURCE RESTORATION                                         = SELECTED / NOT IMPLEMENTED
20260331180000                                             = DO NOT EDIT UNTIL DEDICATED HMIR IA
LOCAL-013                                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-013 ATTEMPTS                                         = 1
LOCAL-013 RETRY                                            = NOT AUTHORIZED
LOCAL-014                                                  = NOT ISSUED
BCR EDIT                                                   = NOT AUTHORIZED
RUNTIME                                                    = NOT AUTHORIZED
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
NEXT                                                       = HMD-007 HISTORICAL MIGRATION INTEGRITY
                                                             RESTORATION IMPLEMENTATION AUTHORIZATION
EXECUTABLE WORK                                            = NONE
```

---

**End of document — PAD-055 · HMIC-049 – HMIC-060 · HMD-007 — v1.0 — 2026-08-28**
