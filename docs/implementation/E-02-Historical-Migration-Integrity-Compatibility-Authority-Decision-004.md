# E-02 Program Authority Decision — Historical Migration Integrity / Compatibility (Successor)

## Exact Historical Source Restoration · HMD-006 · `20260331161000_owner_bulletin_notifications.sql`

| Field | Value |
|-------|-------|
| **Document Type** | **Program Authority Decision (Supplement)** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Parent Authority** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) v1.0 (PAD-001 – PAD-010) |
| **Direct Predecessor Supplement** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-003.md) (**PAD-053** · HMIC-025 – HMIC-036 · HMD-005) |
| **Prior Predecessor Supplements** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md) (**PAD-052** · HMD-004) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) (PAD-039 – PAD-050 · HMD-002) · [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) (PAD-051 · HMD-003) · [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026 – PAD-038 · HMD-001) · [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025) |
| **Forensic record** | [`E-02-HMD-006-Owner-Bulletin-Notifications-Forensic-Investigation.md`](E-02-HMD-006-Owner-Bulletin-Notifications-Forensic-Investigation.md) |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-012.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-012.md) · run `local-012-20260828a` |
| **Supplement ID** | **PAD-054** |
| **Authority Question Register** | **HMIC-037 – HMIC-048** |
| **Status** | **APPROVED WITH CONDITIONS — OPTION A (FILE-SPECIFIC SUCCESSOR)** |
| **Selected Policy** | **EXACT HISTORICAL SOURCE RESTORATION** |
| **Defect** | **HMD-006** |
| **Authority Level** | Program Authority |
| **Effective Date** | 2026-08-28 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **NO** |

> **Authority path finding: YES.** Filename `E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md` is **authority-safe** as the next successor in the existing **HMIC** decision family (`Decision.md` · `Decision-002.md` · `Decision-003.md` · **this Decision-004**). Distinct filename keeps PAD-039 – PAD-050, **PAD-052**, and **PAD-053** **immutable**. This is **not** a new governance tier. PAD identifiers are **not** CS/FD registry numbers.
>
> Sequence: Parent PAD-001 – PAD-010 · DAA PAD-011 – PAD-025 · HMBC PAD-026 – PAD-038 · HMIC PAD-039 – PAD-050 · HFSO PAD-051 · HMIC successor PAD-052 · HMIC successor PAD-053 · **this supplement PAD-054**. Highest previously allocated PAD is **PAD-053**. **PAD-054 is the next unused identifier.** **PAD-054 did not already exist. PAD-054 was not reserved. No PAD-055+ supersedes the sequence.** **PAD-055+ is not allocated.**
>
> **Why a new PAD is required (not reflexive):** PAD-039 / HMIC-001 established the **class** (exact historical source restoration after proven later corruption). PAD-052 / HMD-004 operationalized that class **only** for `20260320045054` / **exactly four** literals. `E-02-HMIR-IA` / `E-02-HMIR-IA-002` are **file-specific** and **do not** authorize editing `20260331161000_owner_bulletin_notifications.sql`. PAD-053 / HMD-005 is a **different class** (enum commit-boundary reconstruction) and **does not** cover this file. PAD-032 still requires **future authority** before a historical migration is modified. A file-specific successor PAD is therefore the same kind of gap PAD-052 closed for HMD-004.
>
> **Why this is not a new class:** The defect is the same **`8c30eb2` CJK-truncation family** as HMD-002 / HMD-004 (truncated zh SQL literals / comments; origin recoverable). Reconstruction (HMD-003 / PAD-051 / HMD-005 / PAD-053) is **rejected** as the model. Quarantine / forward-fix / fake history remain **rejected**.

> **Scope lock:** Establishes **Exact Historical Source Restoration** policy for **one** migration and **exactly four** proven corrupted fragments (L4 · L10 · L52 · L88). This record **does not** restore any file · **does not** issue `E-02-HMIR-IA-003` · **does not** retry LOCAL-012 · **does not** create LOCAL-013 · **does not** expand quarantine · **does not** edit sibling migrations · **does not** modify BCR/guard/verifier · **does not** run database/Supabase/Docker · **does not** authorize RU-1.4 · **does not** reclassify EIR / Acceptance / Certification.

```
HISTORICAL MIGRATION INTEGRITY / COMPATIBILITY AUTHORITY-004 = ESTABLISHED (THIS SUPPLEMENT)
DECISION                                                     = APPROVED WITH CONDITIONS — OPTION A
SELECTED POLICY                                              = EXACT HISTORICAL SOURCE RESTORATION
RESTORATION MODEL                                            = EXACT HISTORICAL SOURCE / BOUNDED PROVEN FRAGMENTS ONLY
HISTORICAL TRUTH CLAIM                                       = PROVEN SOURCE RESTORATION
TARGET MIGRATION                                             = 20260331161000_owner_bulletin_notifications.sql
AUTHORIZED HISTORICAL FILE COUNT                             = EXACTLY 1
AUTHORIZED FUTURE RESTORATION SET                            = EXACTLY FOUR FRAGMENTS (L4, L10, L52, L88)
WHOLE-FILE RESTORE                                           = NOT SELECTED
WHITESPACE-ONLY RESTORATION                                  = NOT REQUIRED / DO NOT TOUCH
SIBLING CONTAMINATION                                        = FORENSICALLY NOTED / NOT INCLUDED IN HMD-006 RESTORATION SCOPE
RECONSTRUCTION                                               = REJECTED / NOT INDICATED
FORWARD-FIX                                                  = REJECTED
QUARANTINE / SKIP                                            = NOT AUTHORIZED
FAKE HISTORY / REPAIR-AS-APPLIED                             = REJECTED
HMD-006                                                      = OPEN / FORENSIC INVESTIGATION COMPLETE /
                                                               HISTORICAL SOURCE-INTEGRITY DEFECT /
                                                               EXACT SOURCE RESTORATION SELECTED /
                                                               IMPLEMENTATION NOT AUTHORIZED
HMD-001                                                      = OPEN / DISTINCT
HMD-002                                                      = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT
HMD-003                                                      = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                               IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
HMD-004                                                      = SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED / DISTINCT
HMD-005                                                      = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                               IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
EXISTING QUARANTINE                                          = EXACTLY 20260314195641_add_demo_data.sql
QUARANTINE COUNT                                             = 1
20260331161000                                               = DO NOT EDIT UNTIL DEDICATED RESTORATION IA
PAD-039 – PAD-050 / E-02-HMIR-IA                             = NOT REUSED AS EXECUTABLE AUTHORITY FOR THIS FILE
PAD-052 / E-02-HMIR-IA-002                                   = NOT REUSED AS EXECUTABLE AUTHORITY FOR THIS FILE
PAD-053                                                      = ISSUED / IMMUTABLE (reconstruction class unchanged)
LOCAL-012                                                    = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-012 ATTEMPTS                                           = 1
LOCAL-012 RETRY                                              = NOT AUTHORIZED
LOCAL-013                                                    = NOT ISSUED
RESTORATION EXECUTED                                         = NO (POLICY ONLY)
THIS PAD                                                     ≠ IMPLEMENTATION AUTHORIZATION
THIS PAD                                                     ≠ DATABASE APPLICATION AUTHORIZATION
THIS PAD                                                     ≠ PRODUCTION DEPLOYMENT AUTHORIZATION
PAD-055+                                                     = NOT ALLOCATED
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
| [`E-02-HMD-006-Owner-Bulletin-Notifications-Forensic-Investigation.md`](E-02-HMD-006-Owner-Bulletin-Notifications-Forensic-Investigation.md) | HMD-006 forensic classification · Option A recommended · **consumed as immutable fact** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-012.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-012.md) | LOCAL-012 **APPLICATION_FAILED** · `syntax error at or near "物业经理"` · evidence **immutable** |

**MANDATORY STOP does not apply.** Forensic hashes match. PAD sequence is unambiguous. Authority supports issuance of PAD-054.

### 1.1 Pre-gate answers

| Question | Finding |
|----------|---------|
| A. Govern under existing HMIC source-restoration class? | **YES — as a successor file-specific PAD.** Class = PAD-039 / HMIC-001. Operational grant for this file = **absent until this PAD**. |
| B. Do HMD-002 / HMD-004 implementation authorities cover `20260331161000`? | **NO.** File-specific. **Do not reuse `E-02-HMIR-IA` or `E-02-HMIR-IA-002`.** **Do not reopen those defects.** |
| C. Does PAD-053 cover this failure? | **NO.** HMD-005 is a transaction-boundary reconstruction class. Later failure does **not** reopen HMD-005. |
| D. New PAD required? | **YES — PAD-054.** Existing PAD-039–053 do **not** contain sufficient *file-specific* authority. |

---

## 2. Triggering defect / LOCAL-012

LOCAL-012 governed replay failed at:

```
supabase/migrations/20260331161000_owner_bulletin_notifications.sql
DATABASE ERROR = syntax error at or near "物业经理"
```

| Field | Locked value |
|-------|----------------|
| LOCAL-012 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Attempts | **1** |
| evidenceRunId | `local-012-20260828a` |
| Executed | **63** |
| Highest applied | `20260331150000_activation_profiles_status_rls.sql` |
| First failing | `20260331161000_owner_bulletin_notifications.sql` (executable index **64**) |
| Retry | **NOT AUTHORIZED** |
| Successor DBA | **NOT ISSUED** |

Causal static defect: truncated first `IN`-list literal at **L52** (`'业委?` missing closing quote). The reported token `物业经理` is the **second intended literal**, parser-visible as a **bare SQL token**. This is **not** HMD-001 · **not** HMD-002 · **not** HMD-003 · **not** HMD-004 · **not** HMD-005. The six defects **must not be collapsed**.

---

## 3. Locked forensic facts (not reopened)

Verified against the forensic record. **No hash/commit mismatch.**

| ID | Fact |
|----|------|
| F1 | Current git blob = **`4c8c7063f5430d608358f1e38df3c25c52d3a0ef`** |
| F2 | Origin commit = **`9f9af80a2b5b8b3c84e2ddd4942fc07ef3379de7`** |
| F3 | Origin blob = **`2c3d63b2d0e2598f3df64f2a0fce341e8a886d35`** |
| F4 | CURRENT == ORIGIN = **NO** |
| F5 | Corrupting commit = **`8c30eb2f657847dc0767201149190eef8d610475`** |
| F6 | File history = **exactly those two commits** |
| F7 | Content-line diffs vs origin = **exactly four**: L4, L10, L52, L88 |
| F8 | Trailing blank-line diffs = origin **0** trailing blanks · current **4** trailing empty lines (worktree may store those extra lines as CRLF; **non-semantic**) |
| F9 | Exact historical source available = **YES** |
| F10 | Source-corruption hypothesis = **SUPPORTED** |
| F11 | Original-design parser defect = **REJECTED** |
| F12 | Transaction-boundary hypothesis = **REJECTED** |
| F13 | Missing-prerequisite hypothesis = **REJECTED** |

---

## 4. Defect classification

```
CLASS     = HISTORICAL SOURCE-INTEGRITY DEFECT
SUBTYPE   = POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION
REMEDY    = EXACT HISTORICAL SOURCE RESTORATION
TRUTH     = PROVEN SOURCE RESTORATION
```

**Not:** transaction-boundary defect · original-design parser defect · missing schema origin · compatibility reconstruction · hosted-schema origin · forward-fix · fake history · second quarantine.

---

## 5. HMD register / HMD-006

HMD-006 is **already allocated** by the forensic record. This PAD **does not** allocate a new identifier and **does not** duplicate HMD-006.

```
HMD-006 STATUS AFTER THIS PAD =
  OPEN /
  FORENSIC INVESTIGATION COMPLETE /
  HISTORICAL SOURCE-INTEGRITY DEFECT /
  EXACT SOURCE RESTORATION SELECTED /
  IMPLEMENTATION NOT AUTHORIZED
```

**Not** `SOURCE INTEGRITY RESTORED` — the target has **not** been edited. **Not resolved. Not CLOSED.**

| Field | Value |
|-------|-------|
| **Defect ID** | **HMD-006** |
| **Target** | `supabase/migrations/20260331161000_owner_bulletin_notifications.sql` |
| **Classification** | **HISTORICAL SOURCE-INTEGRITY DEFECT** / **POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION** |
| **Attribution** | **NOT RU-1.1 · NOT RU-1.2 · NOT RU-1.3 · NOT RU-1.4 · NOT HMD-001/002/003/004/005** |

---

## 6. Content authority

```
CONTENT AUTHORITY = 9f9af80a2b5b8b3c84e2ddd4942fc07ef3379de7
ORIGIN BLOB       = 2c3d63b2d0e2598f3df64f2a0fce341e8a886d35
PATH              = supabase/migrations/20260331161000_owner_bulletin_notifications.sql
```

- `9f9af80a` is the authoritative historical source for the four fragments.
- No backup/export/alternate copy supersedes it.
- Current HEAD / working-tree corruption is **not** authoritative.
- Application display copy (e.g. `OwnerNotificationsSection.tsx`) **corroborates** intended `'业委会'` text only; it is **not** historical SQL origin.
- Later production / current hosted schema is **not** content authority.
- Manual semantic reconstruction is **prohibited** where exact origin content exists.

---

## 7. Selected remediation policy

```
SELECTED = OPTION A — EXACT HISTORICAL SOURCE RESTORATION
```

**Rationale:** authoritative origin exists · origin is syntactically valid · current file was corrupted later by `8c30eb2` · corruption is bounded and directly provable · clean replay cannot parse the current file · a later forward fix cannot be reached · reconstruction is unnecessary · quarantine is unauthorized and semantically wrong.

**Rejected:** reconstruction · forward-fix · quarantine/skip · fake history · synthetic replacement · production back-projection · `migration repair` · commenting-out · recording applied without execution · parser-only patch that leaves remaining proven corruption.

Restoration means: corrupted fragment → **exact `9f9af80a` historical content**. No modernizing SQL. No added constraints/columns. No style sweep.

**Historical truth claim = PROVEN SOURCE RESTORATION.** This restoration **does not invent** new historical behavior. It restores the governed historical migration to exact content proven to have existed at its origin commit.

---

## 8. Bounded restoration set

**Whole-file restore is NOT selected.** Full comparison proves four content corruptions plus four trailing blank lines. Trailing blanks are **not** parser-significant source corruption of SQL tokens (PAD-052 / HMIC-019 precedent).

Purpose of Option A is **source integrity**, not merely “make parser pass.” Restoring **only L52** would remove the observed `物业经理` error but would leave L88 unclosed/truncated in the **same file**, and would leave L4/L10 comment corruption from the **same corrupting commit**.

### 8.1 PROVEN SOURCE CORRUPTION — RESTORE (exactly four)

| ID | Line / construct | Parser / semantic effect | Current (HEAD) | Origin (`9f9af80a`) | Type | Option A |
|----|------------------|--------------------------|----------------|---------------------|------|----------|
| **A** | **L4** file-header comment | Non-executable. Same-commit CJK/ellipsis truncation. | `title_en, ?.` | `title_en, …).` (`U+2026` ellipsis + `).`) | comment corruption | **RESTORE** |
| **B** | **L10** file-header comment | Non-executable. Same-commit CJK truncation; lost `造` and closing `)`. | `(防伪?` | `(防伪造)` | comment corruption | **RESTORE** |
| **C** | **L52** `CHECK (author_role IN (…))` | **PARSER-BREAKING** (observed `物业经理` cascade) | `IN ('业委?, '物业经理')` | `IN ('业委会', '物业经理')` | quote corruption / truncated CJK (`会` + `'` → `?`) | **RESTORE** |
| **D** | **L88** `WHEN 'council' THEN …` inside `AS $$` | **PARSER-BREAKING if reached** (truncated / unclosed literal) | `THEN '业委?` | `THEN '业委会'` | quote corruption / truncated CJK (`会` + `'` → `?`) | **RESTORE** |

L89 `WHEN 'manager' THEN '物业经理'` is **IDENTICAL** to origin and **DO NOT TOUCH**.

### 8.2 NON-SEMANTIC WHITESPACE — DO NOT TOUCH

| Region | Difference | Disposition |
|--------|------------|-------------|
| **E** trailing blanks | origin ends after `GRANT … service_role;\n` · current has **four** extra empty lines (worktree may show CRLF on those extra lines) | **DO NOT TOUCH** |
| Indentation / BOM / unrelated SQL | **NONE** in content lines other than A–D | **N/A** |

```
WHITESPACE-ONLY RESTORATION      = NOT REQUIRED
NON-SEMANTIC CRLF/LF DIFFERENCES = DO NOT TOUCH
FORMATTING SWEEP                 = PROHIBITED
```

A future IA **must** replace only the four authorized fragments with origin text and **must not** normalize the rest of the file to `9f9af80a` bytes.

### 8.3 Comments / non-executable corruption — explicit decision

L4 and L10 are comments. They do **not** cause the LOCAL-012 parser stop. They **are** proven origin content, changed by the **same** corrupting commit `8c30eb2`, and **no** later legitimate edit superseded them.

Because Option A is **source restoration** rather than a parser-only patch, **L4 and L10 belong in the bounded restoration set.** Leaving them unrestored would leave the historical file non-identical to its authoritative origin on proven corruption, not on legitimate later semantics.

### 8.4 UNRESOLVED — NOT AUTHORIZED

**None** in this target vs `9f9af80a` except the trailing blanks classified in §8.2.

---

## 9. Existing migration edit rule

Historical migrations remain **immutable by default**.

PAD-054 creates a **narrow exception** for:

```
supabase/migrations/20260331161000_owner_bulletin_notifications.sql
```

**only** within the four proven restoration fragments.

This exception **does not** authorize: arbitrary cleanup · SQL redesign · style changes · refactoring · policy redesign · new schema semantics · later-file changes · sibling-file edits.

```
UNTIL A DEDICATED RESTORATION IA IS ISSUED AND CONSUMED: DO NOT TOUCH.
Forensic evidence ≠ edit authorization.
This PAD ≠ Implementation Authorization.
```

---

## 10. One-file scope / sibling contamination

```
AUTHORIZED HISTORICAL FILE COUNT = EXACTLY 1
AUTHORIZED FILE                  = 20260331161000_owner_bulletin_notifications.sql
```

Same-commit contamination was forensically noted in:

- `20260331180000_announcements_created_by_inbox_fanout.sql`
- `20260401140000_notifications_trigger_service_role_insert.sql`

```
SIBLING CONTAMINATION = FORENSICALLY NOTED / NOT INCLUDED IN HMD-006 RESTORATION SCOPE
```

**Do not** edit them · bundle them · infer they belong to HMD-006 · allocate new HMD IDs in this PAD. They require **separate governance** if later pursued. They were **not reached** by LOCAL-012.

---

## 11. Relations

| Defect | Relation |
|--------|----------|
| **HMD-001** | **OPEN / DISTINCT** — quarantine unchanged |
| **HMD-002** | **DISTINCT** — same class (post-creation literal corruption); **grant not reusable**; **do not reopen** |
| **HMD-003** | **DISTINCT** — W1 **REACHED / APPLIED**; W2 / April HARD / July S1 **NOT REACHED**; runtime still **PENDING** |
| **HMD-004** | **DISTINCT** — same class; **grant not reusable**; runtime verified |
| **HMD-005** | **DISTINCT** — reconstruction + target **REACHED / APPLIED**; prior `admin` enum error **NOT REPRODUCED**; **RUNTIME REPLAY VERIFIED**; **not CLOSED**; **not reopened** by this later failure |

---

## 12. Quarantine / truthful history / BCR

```
quarantinedMigrations = [ 20260314195641_add_demo_data.sql ]
quarantineCount       = 1
HMD-006 QUARANTINE    = REJECTED / NOT AUTHORIZED
```

**Do not** quarantine `20260331161000`. PAD-041 / PAD-027 remain in force.

**Rejected:** fake `schema_migrations` · repair-as-applied · skip · comment-out · pretend later migration preserves chronology.

```
BCR CHANGE AUTHORIZED BY THIS PAD = NO
CURRENT BCR PIN                   = EXPECTED DBA E-02-DBA-LOCAL-012
                                    ARTIFACT AUTHORITY E-02-BCR-IA-012
```

LOCAL-012 is immutable failed and **cannot** execute again. A future successor BCR retarget requires **separate authority** only after restoration Implementation Authorization → implementation → Completion. **Not issued now.**

---

## 13. Successor chain

```
THIS PAD (PAD-054)                         [ISSUED — policy only]
  → HMD-006 source-restoration Implementation Authorization
       expected family: E-02-HMIR-IA
       expected next unused ID: E-02-HMIR-IA-003
       expected path: E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-003.md
       (file-specific · four fragments · 9f9af80a · repository-only · no sibling files · no BCR · no DB)
       NOT CREATED HERE
  → exact four-fragment restoration
  → corresponding Implementation Completion
  → successor BCR IA retarget to the next unused DBA pin
       (LOCAL-012 cannot be reused)
  → that BCR Completion
  → successor DBA (NOT LOCAL-012 retry; LOCAL-013 not issued here)
  → fresh CB-B replay + preserve + verify:e02:baseline
  → E-02-RU-1.4-REA ONLY IF APPLIED_AND_BASELINE_VERIFIED
```

**Not in this chain now:** restoration execution · HMIR-IA-003 · LOCAL-013 · BCR retarget · RU-1.4 · sibling edits · second quarantine.

Future IA **must** be subordinate to this PAD and must specify: exact target file · origin commit/blob · current fragments · restored fragments · file count exactly one · no sibling file edits · no BCR edit · no DB · static verification · no runtime · no commit.

Future implementation **must** prove:

- target diff contains **only** the four authorized restorations;
- restored fragments equal `9f9af80a` **exactly**;
- no additional migration changed;
- trailing blanks / CRLF **untouched** except as required to replace the four fragment lines;
- quarantine remains count 1;
- BCR unchanged;
- DB-free `--plan` remains `PLAN_OK` if authorized later;
- build passes if repository precedent requires it;
- no DB / Supabase / Docker runtime.

---

## 14. Program Authority Decisions (PAD-054 / HMIC-037 – HMIC-048)

PAD-054 is **one** supplement ID covering the following resolutions (PAD-051 / PAD-052 / PAD-053 single-ID precedent; not a 12-ID block).

### PAD-054 / HMIC-037 — Successor file-specific restoration permitted

**RESOLVED: YES — APPROVED WITH CONDITIONS.**

A historical migration whose original valid fragments are proven at `9f9af80a` and later corrupted by `8c30eb2` **may** be restored **exactly** to those fragments under this PAD. Class authority is HMIC-001; **operational grant is this file only.**

### PAD-054 / HMIC-038 — Prior restoration-grant coverage

**RESOLVED: NO.** HMD-002 / `E-02-HMIR-IA` cover **only** `20260315035847`. HMD-004 / `E-02-HMIR-IA-002` cover **only** `20260320045054`. PAD-053 does **not** cover this file.

### PAD-054 / HMIC-039 — Defect identifier

**RESOLVED: HMD-006 (already allocated; not duplicated; not expanded).** HMD-001 – HMD-005 not merged.

### PAD-054 / HMIC-040 — Content authority

**RESOLVED: `9f9af80a2b5b8b3c84e2ddd4942fc07ef3379de7` only** for the four fragments. Origin blob `2c3d63b2d0e2598f3df64f2a0fce341e8a886d35`.

### PAD-054 / HMIC-041 — Whole-file vs bounded fragments

**RESOLVED: EXACT FOUR FRAGMENTS ONLY (L4, L10, L52, L88).** Whole-file origin restore **not selected**.

### PAD-054 / HMIC-042 — Comments L4 / L10

**RESOLVED: RESTORE.** Proven `8c30eb2` source corruption of origin comment text; Option A is source integrity, not a parser-only patch.

### PAD-054 / HMIC-043 — L88 (not the first parser stop)

**RESOLVED: RESTORE.** Proven same-commit truncated literal in the same file. Restoring only L52 would leave remaining historical corruption.

### PAD-054 / HMIC-044 — Trailing blanks / CRLF

**RESOLVED: DO NOT TOUCH.** Whitespace-only restoration **NOT REQUIRED**. Future IA preserves current trailing blanks / line endings except as required to replace the four fragment lines.

### PAD-054 / HMIC-045 — Sibling contamination

**RESOLVED: NOTED / OUT OF HMD-006 SCOPE.** `20260331180000` and `20260401140000` are **not** authorized. No automatic new HMD IDs.

### PAD-054 / HMIC-046 — Reconstruction / forward-fix / quarantine / fake history

**RESOLVED: ALL REJECTED** for this defect. Quarantine count remains **1**.

### PAD-054 / HMIC-047 — Successor chain

**RESOLVED:** §13. Next issued document = **HMD-006 source-restoration Implementation Authorization** (expected `E-02-HMIR-IA-003`; **not created here**).

### PAD-054 / HMIC-048 — BCR / LOCAL-012 / LOCAL-013 / RU-1.4

**RESOLVED:** No BCR change. LOCAL-012 immutable failure / no retry. LOCAL-013 **not** authorized. RU-1.4 **RUNTIME NOT AUTHORIZED**. This PAD ≠ execution.

---

## 15. Invariants

| ID | Invariant |
|----|-----------|
| HMIC4-I1 | HMD-001 remains OPEN; quarantine count remains 1 |
| HMIC4-I2 | HMD-002 remains DISTINCT / runtime verified |
| HMIC4-I3 | HMD-003 remains DISTINCT / runtime pending |
| HMIC4-I4 | HMD-004 remains DISTINCT / runtime verified |
| HMIC4-I5 | HMD-005 remains OPEN / reconstruction implemented / implementation completed / **RUNTIME REPLAY VERIFIED** / **not CLOSED** |
| HMIC4-I6 | Future restoration changes only L4, L10, L52, L88 in **exactly one** file |
| HMIC4-I7 | Sibling files remain unedited under this PAD |
| HMIC4-I8 | No `migration repair` / fake applied row |
| HMIC4-I9 | LOCAL-012 evidence immutable; attempts = 1; no retry |
| HMIC4-I10 | This PAD ≠ execution / ≠ IA / ≠ DBA |
| HMIC4-I11 | PAD-055+ not allocated |
| HMIC4-I12 | EIR / Acceptance / Certification unchanged |

---

## 16. Strongest allowed claim

The recoverable `9f9af80a` source **removes the currently observed parser-level defect at/near `物业经理`**, and restoring the four proven fragments removes the additional truncated council-label corruption in the same file.

This PAD **does not** claim: restoration already performed · sibling files repaired · downstream replay success · HMD-003 closed · HMD-005 closed · database baseline verified · LOCAL-013 authorized · Implementation Authorization issued.

---

## 17. Lock

```
PAD-054                                                    = ISSUED / IMMUTABLE
DECISION                                                   = APPROVED WITH CONDITIONS —
                                                             OPTION A /
                                                             EXACT HISTORICAL SOURCE RESTORATION /
                                                             ISSUED /
                                                             IMMUTABLE
HMD-006                                                    = OPEN / FORENSIC INVESTIGATION COMPLETE /
                                                             HISTORICAL SOURCE-INTEGRITY DEFECT /
                                                             EXACT SOURCE RESTORATION SELECTED /
                                                             IMPLEMENTATION NOT AUTHORIZED
TARGET                                                     = 20260331161000_owner_bulletin_notifications.sql
AUTHORIZED HISTORICAL FILE COUNT                           = EXACTLY 1
CONTENT AUTHORITY                                          = 9f9af80a
AUTHORIZED FRAGMENTS                                       = L4, L10, L52, L88
WHITESPACE                                                 = DO NOT TOUCH
SIBLING CONTAMINATION                                      = NOTED / OUT OF HMD-006 SCOPE
SOURCE RESTORATION                                         = SELECTED / NOT IMPLEMENTED
20260331161000                                             = DO NOT EDIT UNTIL E-02-HMIR-IA-003 (or equivalent HMIR successor IA)
LOCAL-012                                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-012 ATTEMPTS                                         = 1
LOCAL-012 RETRY                                            = NOT AUTHORIZED
LOCAL-013                                                  = NOT ISSUED
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
NEXT                                                       = HMD-006 SOURCE RESTORATION IMPLEMENTATION AUTHORIZATION
EXECUTABLE WORK                                            = NONE
```

---

**End of document — PAD-054 · HMIC-037 – HMIC-048 · HMD-006 — v1.0 — 2026-08-28**
