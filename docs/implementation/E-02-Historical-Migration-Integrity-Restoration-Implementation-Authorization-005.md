# E-02 — Historical Migration Integrity Restoration — Implementation Authorization (Successor)

| Field | Value |
|-------|-------|
| **Document Type** | **Implementation Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-HMIR-IA-005** |
| **Policy authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md) (**PAD-056** · HMIC-061 – HMIC-072) |
| **Forensic record** | [`E-02-HMD-008-Notifications-Trigger-Service-Role-Insert-Forensic-Investigation.md`](E-02-HMD-008-Notifications-Trigger-Service-Role-Insert-Forensic-Investigation.md) |
| **Predecessor IAs** | [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md) (**E-02-HMIR-IA** · HMD-002 · **CONSUMED**) · [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-002.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-002.md) (**E-02-HMIR-IA-002** · HMD-004 · **CONSUMED**) · [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-003.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-003.md) (**E-02-HMIR-IA-003** · HMD-006 · **CONSUMED**) · [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-004.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-004.md) (**E-02-HMIR-IA-004** · HMD-007 · **CONSUMED**) |
| **Defect** | **HMD-008** |
| **Status** | **Approved With Conditions / Not Yet Consumed** |
| **Authority Level** | Implementation Authorization (repository forensic restoration only) |
| **Effective Date** | 2026-08-29 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-005.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-005.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **Future repository-only restoration task · NOT this issuance** |

> **Authority path finding: YES.** Filename `E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-005.md` is **authority-safe** as the next successor in the existing **HMIR IA** family (`…-Authorization.md` · `…-Authorization-002.md` · `…-Authorization-003.md` · `…-Authorization-004.md` · **this `…-Authorization-005.md`**). ID **`E-02-HMIR-IA-005`**. Distinct filename keeps **E-02-HMIR-IA**, **E-02-HMIR-IA-002**, **E-02-HMIR-IA-003**, and **E-02-HMIR-IA-004** **immutable**. Highest issued restoration IA is **E-02-HMIR-IA-004** (**CONSUMED**). **E-02-HMIR-IA-005 is the next unused identifier.** No HMIR-IA-005 document existed before this issuance. HMIR-IA-005 was **not reserved**. HMIR-IA-005 has **not previously been issued or consumed**. No **HMIR-IA-006+** exists or supersedes the sequence. PAD-056 named this family/ID as the expected next document; this issuance **independently confirms** that sequence. **HFSOR-IA / HFSOR-IA-002 are reconstruction and are not this family.** BCR IAs and DBA records are execution/retarget authority, not restoration. A new family name is **not** invented. Consumed IAs are **not** reused.
>
> This is **not** a new governance tier, **not** a new PAD, **not** PAD-057, **not** a DBA, **not** a BCR IA, **not** a reconstruction IA, **not** a forward-fix authority, **not** a runtime authority, **not** a REA, **not** an EIR, **not** an Implementation Completion.

> **Pre-issuance gates (this issuance — read-only):** PAD-056 **ISSUED / IMMUTABLE** · OPTION A · HMIC-061 – HMIC-072 · HMD-008 **OPEN / DISTINCT / HISTORICAL SOURCE-INTEGRITY DEFECT / POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION / OPTION A SELECTED / IMPLEMENTATION NOT AUTHORIZED YET** · target **`20260401140000_notifications_trigger_service_role_insert.sql`** · current blob **`7fcc5f52613989b5204d8991d2b9eeea0c4938d0`** · origin commit **`fa89b72a3ffac65593a724cd1194e7c22f7dd397`** · origin blob **`6eec5c848d60a82d2198d17ebd238f6027e4f710`** · corrupting commit **`8c30eb2f657847dc0767201149190eef8d610475`** · CURRENT == ORIGIN **NO** · target worktree **CLEAN** vs HEAD (`git hash-object` equals HEAD blob) · CURRENT L40 **`WHEN 'council' THEN '业委?`** · CURRENT L67 **`WHEN 'council' THEN '业委?`** · origin L40/L67 **`WHEN 'council' THEN '业委会'`** · reconstruction / forward-fix / quarantine / fake history **REJECTED** · LOCAL-014 **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** · attempts **1** · retry **NOT AUTHORIZED** · LOCAL-015 **not issued** · HMD-007 **RUNTIME REPLAY VERIFIED / not CLOSED** · HMD-006 **RUNTIME REPLAY VERIFIED / not CLOSED** · HMD-005 **RUNTIME REPLAY VERIFIED / not CLOSED** · HMD-003 **RUNTIME PENDING** · quarantine **exactly one**. **No gate failed.**

> **Document class:** Bounded **repository forensic restoration** authorization only. This record **does not** restore the file · **does not** restore L40 · **does not** restore L67 · **does not** apply migrations · **does not** run BCR `--apply` · **does not** retry LOCAL-014 · **does not** issue LOCAL-015 · **does not** authorize RU-1.4.

```
FORENSIC RESTORATION IMPLEMENTATION AUTHORIZATION = E-02-HMIR-IA-005
DECISION                                          = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PAD-056                                           = ISSUED / IMMUTABLE (POLICY CONSUMED FOR IA ISSUANCE ONLY)
SELECTED POLICY                                   = EXACT HISTORICAL SOURCE RESTORATION
RESTORATION MODEL                                 = BOUNDED PROVEN FRAGMENTS ONLY
HISTORICAL TRUTH CLAIM                            = PROVEN SOURCE RESTORATION
TARGET                                            = supabase/migrations/20260401140000_notifications_trigger_service_role_insert.sql
AUTHORIZED SOURCE FILE COUNT                      = EXACTLY 1
AUTHORIZED RESTORATIONS                           = EXACTLY TWO FRAGMENTS (L40 AND L67)
CONTENT AUTHORITY                                 = fa89b72a3ffac65593a724cd1194e7c22f7dd397
CURRENT PRE-STATE BLOB                            = 7fcc5f52613989b5204d8991d2b9eeea0c4938d0
ORIGIN BLOB                                       = 6eec5c848d60a82d2198d17ebd238f6027e4f710
CORRUPTING COMMIT                                 = 8c30eb2f657847dc0767201149190eef8d610475
WHOLE-FILE RESTORE                                = NOT AUTHORIZED
WHITESPACE-ONLY RESTORATION                       = NOT AUTHORIZED
TRAILING BLANK LINE RESTORATION                   = NOT AUTHORIZED
WHITESPACE NORMALIZATION                          = NOT AUTHORIZED
LINE ENDING NORMALIZATION                         = NOT AUTHORIZED
EOF CLEANUP                                       = NOT AUTHORIZED
HMD-006 TARGET                                    = DO NOT EDIT
HMD-007 TARGET                                    = DO NOT EDIT
RECONSTRUCTION / FORWARD-FIX / QUARANTINE         = REJECTED
FAKE HISTORY                                      = REJECTED
RESTORATION EXECUTED                              = NO
HMD-008                                           = OPEN / DISTINCT /
                                                    HISTORICAL SOURCE-INTEGRITY DEFECT /
                                                    POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION /
                                                    OPTION A SELECTED /
                                                    IMPLEMENTATION AUTHORIZED /
                                                    NOT YET IMPLEMENTED
HMD-001                                           = OPEN / DISTINCT
HMD-002                                           = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT
HMD-003                                           = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                    IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
HMD-004                                           = SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED / DISTINCT
HMD-005                                           = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                    IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-006                                           = OPEN / SOURCE INTEGRITY RESTORED /
                                                    IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-007                                           = OPEN / SOURCE INTEGRITY RESTORED /
                                                    IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
QUARANTINE                                        = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
HMD-008 TARGET                                    = NOT QUARANTINED
LOCAL-014                                         = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-014 ATTEMPTS                                = 1
LOCAL-014 RETRY                                   = NOT AUTHORIZED
LOCAL-015                                         = NOT ISSUED
BCR CHANGE                                        = NOT AUTHORIZED
EXPECTED DBA PIN                                  = E-02-DBA-LOCAL-014
ARTIFACT AUTHORITY                                = E-02-BCR-IA-014
THIS IA                                           ≠ DBA · ≠ BCR IA · ≠ PAD · ≠ REA · ≠ COMPLETION
NEXT                                              = IMPLEMENT E-02-HMIR-IA-005 (REPOSITORY ONLY)
```

---

## 1. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md) | **Direct policy authority** — PAD-056 · HMD-008 |
| [`E-02-HMD-008-Notifications-Trigger-Service-Role-Insert-Forensic-Investigation.md`](E-02-HMD-008-Notifications-Trigger-Service-Role-Insert-Forensic-Investigation.md) | Forensic classification · consumed as fact |
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-004.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-004.md) | Family predecessor · **HMD-007 only** · **CONSUMED** |
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-003.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-003.md) | Family predecessor · **HMD-006 only** · **CONSUMED** |
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-002.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-002.md) | Family predecessor · **HMD-004 only** · **CONSUMED** |
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md) | Family predecessor · **HMD-002 only** · **CONSUMED** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-014.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-014.md) | LOCAL-014 **APPLICATION_FAILED** · evidence **immutable** · run `local-014-20260829a` |

**This IA consumes PAD-056 for implementation authorization only.** Restoration is **not performed** in this issuance task.

PAD-055 / `E-02-HMIR-IA-004` remain **file-specific to HMD-007** and **must not** be reused as executable authority for this file. PAD-054 / `E-02-HMIR-IA-003` remain **file-specific to HMD-006**.

---

## 2. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-HMIR-IA-005** |
| **Decision** | **APPROVED WITH CONDITIONS / NOT YET CONSUMED** |
| **Authorized future action** | Forensic restore of **exactly two** proven corrupted fragments (**L40 and L67**) to `fa89b72a` content |
| **Authorized future semantic/source change count** | **EXACTLY 2** |
| **Authorized historical file count** | **EXACTLY 1** |
| **Not authorized** | Whole-file checkout · rewrite · L40-only restore · reconstruction · forward-fix · second quarantine · sibling-file edits · HMD-006 target edits · HMD-007 target edits · trailing-blank cleanup · BCR retarget · LOCAL-014 retry · LOCAL-015 · DB/Supabase/Docker · `--apply` · RU-1.4 · Completion issuance |
| **Execution this task** | **NOT PERFORMED** |

---

## 3. Purpose

Authorize **one future** repository-only task:

```
CURRENT CORRUPTED FRAGMENTS  →  EXACT fa89b72a HISTORICAL TEXT
(exactly two proven fragments: L40 AND L67)
```

Purpose = **EXACT HISTORICAL SOURCE-INTEGRITY RESTORATION**.

Authorized historical truth claim = **PROVEN SOURCE RESTORATION**.

**Not:** reconstruction · compatibility shim · modernization · refactor · cleanup · equivalent SQL · AI-generated correction · `migration repair` · forward-fix · quarantine expansion · schema / policy redesign · invented semantics · L40-only restore.

---

## 4. Defect

| Field | Value |
|-------|-------|
| **ID** | **HMD-008** |
| **Pre-issuance status** | **OPEN / DISTINCT / HISTORICAL SOURCE-INTEGRITY DEFECT / POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION / OPTION A SELECTED / IMPLEMENTATION NOT AUTHORIZED YET** |
| **Post-issuance status** | **OPEN / DISTINCT / HISTORICAL SOURCE-INTEGRITY DEFECT / POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION / OPTION A SELECTED / IMPLEMENTATION AUTHORIZED / NOT YET IMPLEMENTED** |
| **Classification** | HISTORICAL SOURCE-INTEGRITY DEFECT · POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION |
| **HMD-001** | **OPEN / DISTINCT** |
| **HMD-002** | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT** — **do not reopen** |
| **HMD-003** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** — W2 / April HARD / July S1 **NOT REACHED / NOT APPLIED** |
| **HMD-004** | **SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED / DISTINCT** — **do not reopen** |
| **HMD-005** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — **not CLOSED** · **do not downgrade** |
| **HMD-006** | **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — **not CLOSED** · **do not reopen** · target **DO NOT EDIT** |
| **HMD-007** | **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — **not CLOSED** · **do not reopen** · target **DO NOT EDIT** |

HMD-008 **must not** be marked `SOURCE INTEGRITY RESTORED`, resolved, CLOSED, or runtime-verified by this IA. No repository restoration has happened yet. Same corrupting commit as HMD-006 / HMD-007 **does not** merge the defects. HMD-007 authorized **1 file / 1 fragment**; this IA authorizes **1 file / 2 fragments**.

---

## 5. Exact future source scope

**May modify (future implementation only):**

1. `supabase/migrations/20260401140000_notifications_trigger_service_role_insert.sql`

**Expected intentional migration write count = 1 file.**

After successful restoration, a **minimal** `docs/implementation/README.md` ledger update is permitted if required by family precedent. Implementation evidence may be created as established by HMIR precedent. **No Completion document during implementation.**

**Must not create/modify:** sibling migrations · HMD-006 target · HMD-007 target · helper files · second migrations · generated copies · HMD-005 reconstruction/target · W1/W2 · HMD-002/HMD-004 restored files · quarantine file · BCR artifact · guard · verifier · diagnostics · launcher · package/test/app source.

---

## 6. Content authority / pre-state

```
CONTENT AUTHORITY   = fa89b72a3ffac65593a724cd1194e7c22f7dd397
ORIGIN BLOB         = 6eec5c848d60a82d2198d17ebd238f6027e4f710
CURRENT PRE-STATE   = 7fcc5f52613989b5204d8991d2b9eeea0c4938d0
CORRUPTING COMMIT   = 8c30eb2f657847dc0767201149190eef8d610475
PATH                = supabase/migrations/20260401140000_notifications_trigger_service_role_insert.sql
```

Verified at IA issuance: `git hash-object` of the target **equals** `HEAD:` blob `7fcc5f52613989b5204d8991d2b9eeea0c4938d0`. Worktree porcelain for this path is **empty**. Origin blob `git rev-parse fa89b72a:…` equals `6eec5c848d60a82d2198d17ebd238f6027e4f710`.

No current-production schema. No later migration as replacement content. No semantic guess. No “equivalent SQL”. No AI-invented wording. HMD-006 origin `9f9af80a` is **not** content authority for this file. HMD-007 origin `efc3f49e` is **not** content authority for this file. Application display copy is **not** content authority.

If the target blob is no longer `7fcc5f52613989b5204d8991d2b9eeea0c4938d0` at implementation time: **STOP → GOVERNANCE**. Do not overwrite. **IA NOT CONSUMED.**

---

## 7. Exact bounded restoration set — EXACTLY TWO

Future implementation **must re-verify** the current/origin L40 and L67 pairs immediately before writing, using `git show fa89b72a:…` and the current target blob. If either current fragment no longer matches the expected corrupted pre-state, or if `fa89b72a` cannot be read, or if origin text differs from this table: **STOP → GOVERNANCE**. Do not force replacement. **No third fragment. No L40-only restore. No whole-file checkout. No automatic new HMD.**

This IA records the **exact full lines** observed from `git show HEAD:` / `git show fa89b72a:`. Implementation must restore the **entire listed current line** to the **entire listed origin line**. Those lines differ **only** in the authorized corruption. Indentation differs between L40 and L67 and **must be preserved**.

| # | Line | Class | Shorthand current → origin |
|---|------|-------|----------------------------|
| **1** | **L40** | PL/pgSQL CASE branch · **PARSER-BREAKING** (first runtime stop) · **RESTORE** | `THEN '业委?` → `THEN '业委会'` |
| **2** | **L67** | PL/pgSQL CASE branch · **PARSER-BREAKING if reached** · **RESTORE** | `THEN '业委?` → `THEN '业委会'` |

More precisely, restore both malformed return literals:

```
CURRENT = '业委?
ORIGIN  = '业委会'
```

**Copy-paste authority (exact full lines; leading spaces significant):**

Current L40:

```
      WHEN 'council' THEN '业委?
```

Origin L40:

```
      WHEN 'council' THEN '业委会'
```

Current L67:

```
    WHEN 'council' THEN '业委?
```

Origin L67:

```
    WHEN 'council' THEN '业委会'
```

**Code-point proof** of the literal after `THEN ` (both fragments):

| | Opening quote | 业 | 委 | 会 / `?` | Closing quote |
|--|---------------|----|----|----------|---------------|
| Origin | `U+0027` | `U+4E1A` | `U+59D4` | **`U+4F1A`** | **`U+0027`** |
| Current | `U+0027` | `U+4E1A` | `U+59D4` | **`U+003F`** | **absent** |

Meaning: 会 lost; closing `U+0027` lost; ASCII `U+003F` `?` present; file remains valid UTF-8; not an invalid-UTF-8 decode defect.

L41 / L68 `WHEN 'manager' THEN '物业经理'` are **IDENTICAL** to origin and **DO NOT TOUCH**.

Authorized fragment count = **2**.

Method: **narrow fragment / whole-line replacement of these two lines only.**

```
git checkout fa89b72a -- supabase/migrations/20260401140000_notifications_trigger_service_role_insert.sql
```

is **PROHIBITED** (would restore trailing blanks excluded by PAD-056). Whole-file restore from origin blob is **NOT AUTHORIZED**. Out-of-scope bytes/content **must be preserved**.

---

## 8. Explicit exclusions

**DO NOT TOUCH:**

- L41 / L68 `WHEN 'manager' THEN '物业经理'`
- any line already identical to `fa89b72a`
- trailing blank lines (origin ends after `$$;` · current has **four** extra empty blank lines)
- CRLF/LF-only differences
- indentation, unrelated whitespace, file-wide formatting
- SQL structure, function bodies, RLS policies, GRANTs outside L40 and L67
- commas/quotes **outside** the authorized L40 and L67 fragments

**No formatting sweep. No whole-file restoration. Whitespace-only restoration = NOT AUTHORIZED.**

```
TRAILING BLANK LINES         = PRESERVE
WHITESPACE NORMALIZATION     = NOT AUTHORIZED
LINE ENDING NORMALIZATION    = NOT AUTHORIZED
EOF CLEANUP                  = NOT AUTHORIZED
FULL-FILE BYTE EQUALITY      = NOT THE SUCCESS CRITERION
AUTHORIZED FRAGMENT EQUALITY = EXACT ORIGIN (L40 AND L67)
WHITESPACE DIFFERENCE        = PRESERVED / OUTSIDE AUTHORIZED SCOPE
```

If editor/tooling would normalize the whole file, use a narrower edit mechanism. Do not accept line-ending churn as harmless.

### 8.1 Sibling locks — hard exclusion

```
HMD-006 TARGET     = DO NOT EDIT
HMD-007 TARGET     = DO NOT EDIT
```

**Do not edit:**

- `20260331161000_owner_bulletin_notifications.sql`
- `20260331180000_announcements_created_by_inbox_fanout.sql`

Do **not** allocate new HMD IDs in this IA. Do **not** expand Option A to siblings.

---

## 9. Historical immutability exception

Default: historical migrations remain immutable.

This IA creates **only** this narrow exception:

```
TARGET                 = 20260401140000_notifications_trigger_service_role_insert.sql
AUTHORIZED DIFFERENCES = exactly two proven corrupted fragments (L40 AND L67)
CONTENT AUTHORITY      = fa89b72a
```

Nothing else. After implementation, historical immutability **resumes**. This IA does **not** establish a general right to edit historical migrations and does **not** reuse `E-02-HMIR-IA`, `E-02-HMIR-IA-002`, `E-02-HMIR-IA-003`, or `E-02-HMIR-IA-004`.

---

## 10. Rejected remedies

| Remedy | Disposition |
|--------|-------------|
| Compatibility reconstruction / new migration | **REJECTED / NOT INDICATED** |
| Forward-fix / later patch migration | **REJECTED** (historical target fails parse during clean replay) |
| Quarantine of `20260401140000` | **REJECTED / NOT AUTHORIZED** |
| Fake history / record-as-applied / skip / repair-as-applied | **REJECTED** |
| L40-only restore | **REJECTED** (PAD-056 / HMIC-066 requires both fragments) |

The restored file must later **execute normally** in a fresh governed replay. Source restoration **is not** runtime evidence.

---

## 11. Quarantine / BCR lock

```
quarantinedMigrations = [ 20260314195641_add_demo_data.sql ]
quarantineCount       = 1
HMD-008 TARGET        = NOT QUARANTINED
HMD-008 QUARANTINE    = NOT AUTHORIZED
```

`20260401140000` remains **in** the execution chain. Count **must not** change.

```
BCR CHANGE AUTHORIZED = NO
EXPECTED DBA          = E-02-DBA-LOCAL-014
ARTIFACT AUTHORITY    = E-02-BCR-IA-014
```

LOCAL-014 cannot execute again. **Do not retarget to LOCAL-015.** Future HMD-008 restoration **must not retarget BCR**.

---

## 12. Future implementation task (authorized; not executed here)

### 12.1 Pre-edit gates (all required)

A. PAD-056 still **ISSUED / IMMUTABLE** / controlling.  
B. This IA still **APPROVED / NOT YET CONSUMED**.  
C. Target path remains exact.  
D. Target current blob remains **`7fcc5f52613989b5204d8991d2b9eeea0c4938d0`**.  
E. Current L40 remains **`WHEN 'council' THEN '业委?`**.  
F. Current L67 remains **`WHEN 'council' THEN '业委?`**.  
G. Origin commit/blob remain proven as in §6.  
H. Sibling files remain out of scope / unedited.  
I. No superseding authority exists.

Any mismatch: **STOP → GOVERNANCE**. **IMPLEMENTATION = BLOCKED.** **IA = NOT CONSUMED.** Do not restore.

### 12.2 Edit method

1. Re-check current L40/L67 and origin L40/L67.  
2. Replace **exactly** the current L40 line with the origin L40 line (`'业委?` → `'业委会'`).  
3. Replace **exactly** the current L67 line with the origin L67 line (`'业委?` → `'业委会'`).  
4. Do not `git checkout` the entire origin file.  
5. Do not replace the whole file from origin.  
6. Do not normalize trailing blanks / CRLF / indentation / EOF.  
7. Preserve all out-of-scope bytes/content.

### 12.3 Post-edit static proof (all required)

1. Exactly one migration file intentionally changed by the HMD-008 task.  
2. Exactly two authorized source fragments restored.  
3. Actual attributable fragment count = **2**.  
4. Actual attributable semantic change count = **2**.  
5. Target L40 equals **`WHEN 'council' THEN '业委会'`**.  
6. Target L67 equals **`WHEN 'council' THEN '业委会'`**.  
7. Authorized fragments restored = **YES**.  
8. Restored L40 and L67 equal `fa89b72a` **exactly**.  
9. No whitespace normalization.  
10. Trailing blank lines **UNCHANGED**.  
11. No unrelated target changes.  
12. No sibling changes (`20260331161000` and `20260331180000` unedited).  
13. No other migration edits.  
14. BCR unchanged.  
15. Verifier unchanged.  
16. Guard unchanged.  
17. Diagnostics / launcher unchanged.  
18. Quarantine remains exactly one.

**AUTHORIZED FRAGMENT EQUALITY TO ORIGIN = EXACT (L40 AND L67).** Full-file equality to origin is **not** required (whitespace excluded).

Future implementation must distinguish **total worktree diff** from **HMD-008 attributable migration diff**. Expected HMD-008 attributable target diff = **exactly 2 fragment restorations**. Total repository diff need **not** be clean because previously authorized uncommitted governance/migration lineage may exist.

### 12.4 Authorized static commands (only after successful static edit certification)

- DB-free BCR `--plan` → expect `PLAN_OK` · `failures = []`. Current pin `E-02-DBA-LOCAL-014` / `E-02-BCR-IA-014` is **acceptable for static plan** even though LOCAL-014 cannot execute again. Capture actual expected DBA pin · artifact authority · `migrationCountDiscovered` · executable count · `quarantineCount`. Absent unrelated repository change, expected **286 / 285 / 1**. **Do not encode those counts as permanent invariants.**
- Future plan checkpoints: HMD-008 target **DISCOVERED / EXECUTABLE / NOT QUARANTINED**; HMD-007 target **DISCOVERED / EXECUTABLE**; HMD-005 reconstruction **DISCOVERED / EXECUTABLE**; HMD-005 target **DISCOVERED / EXECUTABLE**; HMD-003 W2 **DISCOVERED / EXECUTABLE**; April HARD **DISCOVERED / EXECUTABLE**; July S1 **DISCOVERED / EXECUTABLE**; global quarantine **exactly one demo-data migration**.
- `npm run build` → **PASS**. No DB required.

### 12.5 Runtime prohibition

```
--apply              = NONE
DATABASE EXECUTION   = NONE
STATEFUL SUPABASE    = NONE
DOCKER MUTATION      = NONE
LOCAL-014 RETRY      = NONE
LOCAL-015 EXECUTION  = NONE
RU-1.4               = NONE
```

### 12.6 Implementation STOP conditions

STOP → GOVERNANCE if: pre-state mismatch · `fa89b72a` unreadable · origin differs from this IA/PAD-056 table · a third corruption would need change · exact fragment restore requires another semantic edit · L40-only restore would be required · whole-file normalization would be required · sibling files would be edited · HMD-006 or HMD-007 target would be edited · migration order or quarantine count would change · BCR would be edited · authority superseded.

**No improvisation.**

---

## 13. IA consumption model

This IA may be marked **CONSUMED** only if:

- exact target pre-state matched `7fcc5f52…` and current L40/L67 matched `'业委?`;
- exactly two restorations applied (L40 and L67);
- exactly one historical migration changed;
- restored fragments equal `fa89b72a` exactly;
- whitespace lock preserved (trailing blank lines unchanged);
- sibling exclusion preserved (HMD-006 and HMD-007 targets unedited);
- no unrelated semantic change;
- quarantine unchanged;
- BCR/tooling unchanged;
- DB-free `--plan` `PLAN_OK`;
- build **PASS**;
- no runtime;
- no unauthorized writes.

Otherwise: **IA NOT CONSUMED** · **IMPLEMENTATION NOT CERTIFIED** · **STOP → GOVERNANCE**.

Consumption is recorded by a **later Implementation Completion**, not by this issuance and not automatically during implementation.

After successful implementation and IA consumption, HMD-008 becomes:

```
SOURCE INTEGRITY RESTORED /
IMPLEMENTATION COMPLETED /
IMPLEMENTATION COMPLETION PENDING /
RUNTIME REPLAY VERIFICATION PENDING
```

---

## 14. Future Completion (reserved; not created)

A separate Implementation Completion **is required** after implementation.

**Do not issue it in this IA task. Do not issue it automatically during implementation. Do not allocate its identifier here.**

Expected family: **E-02 Historical Migration Integrity Restoration Implementation Completion**. Highest issued numbered successor is **Completion-004**. Expected next unused filename, **subject to independent sequence verification at Completion issuance**:

```
docs/implementation/E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion-005.md
```

Expected Completion ID family: **E-02-HMIR-IMPLEMENTATION-COMPLETION-005** (**not issued; sequence must be independently verified**).

May certify **only** repository restoration + static verification.

**Must not** certify: LOCAL-015 · runtime replay · database baseline · HMD-008 closure · HMD-003 closure · HMD-005 closure · HMD-006 closure · HMD-007 closure · RU-1.4.

---

## 15. LOCAL-014 / successor DBA

```
E-02-DBA-LOCAL-014 = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-014 ATTEMPTS = 1
LOCAL-014 RETRY    = NOT AUTHORIZED
LOCAL-015          = NOT ISSUED
```

Restoration does **not** reopen LOCAL-014. Successor DBA/BCR order:

```
PAD-056
  → this IA
  → restoration implementation
  → restoration Completion
  → successor DBA governance
  → successor BCR retarget governance
  → future runtime
```

**No shortcut. No BCR retarget in this task. No LOCAL-015 in this task.**

---

## 16. Package / verifier / guard / source lock

**Not authorized:** `replay-e02-declared-baseline.ts` · `verify-db-baseline.ts` · environment guard · diagnostics · launcher · `package.json` / lockfile · tests · application source · Supabase functions · generated types.

---

## 17. Database / RU / certification locks

```
DATABASE BASELINE VERIFIED       = NO
PRESERVE/HANDOFF                 = NOT REACHED
BASELINE VERIFIER                = NOT RUN
RU-1.1 / RU-1.2                  = NOT APPLIED
RU-1.4                           = RUNTIME NOT AUTHORIZED
E02_RUNTIME_EXECUTION_AUTHORIZED = UNSET / FALSE
EIR PASS                         = NONE
ACCEPTANCE                       = BLOCKED
CERTIFICATION                    = NOT ISSUED
RUNTIME COMMITTED                = NOT CERTIFIED
FINAL COMMIT PATH                = BLOCKED
```

---

## 18. Success conditions (future implementation)

All must hold:

1. Correct migration file only  
2. Exactly two corruptions restored (L40 and L67)  
3. Restored lines proven from `fa89b72a`  
4. No inferred / new wording  
5. No third textual/semantic change  
6. Path / timestamp unchanged  
7. L41 / L68 untouched  
8. Trailing blanks / line endings not “fixed”  
9. Siblings unedited (`20260331161000` and `20260331180000`)  
10. Quarantine count = 1  
11. BCR / verifier / guard / diagnostics / launcher unchanged  
12. `--plan` PLAN_OK · build PASS  
13. No DB / Supabase / Docker  

---

## 19. Lock

```
E-02-HMIR-IA-005     = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PAD-056              = ISSUED / IMMUTABLE / OPTION A
HMD-008              = OPEN / DISTINCT /
                       HISTORICAL SOURCE-INTEGRITY DEFECT /
                       POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION /
                       OPTION A SELECTED /
                       IMPLEMENTATION AUTHORIZED /
                       NOT YET IMPLEMENTED
TARGET               = 20260401140000_notifications_trigger_service_role_insert.sql
CURRENT BLOB         = 7fcc5f52613989b5204d8991d2b9eeea0c4938d0
ORIGIN COMMIT        = fa89b72a3ffac65593a724cd1194e7c22f7dd397
ORIGIN BLOB          = 6eec5c848d60a82d2198d17ebd238f6027e4f710
CORRUPTING COMMIT    = 8c30eb2f657847dc0767201149190eef8d610475
AUTHORIZED FILES     = 1
AUTHORIZED FRAGMENTS = 2
AUTHORIZED FRAGMENTS = L40 AND L67 ONLY
CURRENT L40          = WHEN 'council' THEN '业委?
RESTORE L40 TO       = WHEN 'council' THEN '业委会'
CURRENT L67          = WHEN 'council' THEN '业委?
RESTORE L67 TO       = WHEN 'council' THEN '业委会'
WHOLE-FILE RESTORE   = NOT AUTHORIZED
WHITESPACE           = NOT AUTHORIZED
TRAILING BLANK LINES = PRESERVE
HMD-006 TARGET       = DO NOT EDIT
HMD-007 TARGET       = DO NOT EDIT
LOCAL-014            = APPLICATION_FAILED / EVIDENCE IMMUTABLE / attempts 1 / NO RETRY
LOCAL-015            = NOT ISSUED
EXPECTED DBA PIN     = E-02-DBA-LOCAL-014
ARTIFACT AUTHORITY   = E-02-BCR-IA-014
FUTURE DB-FREE PLAN  = AUTHORIZED AFTER SUCCESSFUL STATIC RESTORATION
FUTURE BUILD         = AUTHORIZED
RUNTIME              = NOT AUTHORIZED
RU-1.4               = RUNTIME NOT AUTHORIZED
DATABASE BASELINE    = NOT VERIFIED
NEXT                 = IMPLEMENT E-02-HMIR-IA-005 (REPOSITORY ONLY)
EXECUTABLE WORK      = NONE (this issuance)
```

---

**End of document — E-02-HMIR-IA-005 · HMD-008 · v1.0 — 2026-08-29**
