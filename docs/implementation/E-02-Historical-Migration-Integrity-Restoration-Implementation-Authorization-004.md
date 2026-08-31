# E-02 — Historical Migration Integrity Restoration — Implementation Authorization (Successor)

| Field | Value |
|-------|-------|
| **Document Type** | **Implementation Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-HMIR-IA-004** |
| **Policy authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md) (**PAD-055** · HMIC-049 – HMIC-060) |
| **Forensic record** | [`E-02-HMD-007-Announcements-Created-By-Inbox-Fanout-Forensic-Investigation.md`](E-02-HMD-007-Announcements-Created-By-Inbox-Fanout-Forensic-Investigation.md) |
| **Predecessor IAs** | [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md) (**E-02-HMIR-IA** · HMD-002 · **CONSUMED**) · [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-002.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-002.md) (**E-02-HMIR-IA-002** · HMD-004 · **CONSUMED**) · [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-003.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-003.md) (**E-02-HMIR-IA-003** · HMD-006 · **CONSUMED**) |
| **Defect** | **HMD-007** |
| **Status** | **Approved With Conditions / Not Yet Consumed** |
| **Authority Level** | Implementation Authorization (repository forensic restoration only) |
| **Effective Date** | 2026-08-28 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-004.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-004.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **Future repository-only restoration task · NOT this issuance** |

> **Authority path finding: YES.** Filename `E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-004.md` is **authority-safe** as the next successor in the existing **HMIR IA** family (`…-Authorization.md` · `…-Authorization-002.md` · `…-Authorization-003.md` · **this `…-Authorization-004.md`**). ID **`E-02-HMIR-IA-004`**. Distinct filename keeps **E-02-HMIR-IA**, **E-02-HMIR-IA-002**, and **E-02-HMIR-IA-003** **immutable**. Highest issued restoration IA is **E-02-HMIR-IA-003** (**CONSUMED**). **E-02-HMIR-IA-004 is the next unused identifier.** No HMIR-IA-004 document existed before this issuance. HMIR-IA-004 was **not reserved**. HMIR-IA-004 has **not previously been issued or consumed**. No **HMIR-IA-005+** exists or supersedes the sequence. PAD-055 named this family/ID as the expected next document; this issuance **independently confirms** that sequence. **HFSOR-IA is reconstruction and is not this family.** BCR IAs and DBA records are execution/retarget authority, not restoration. A new family name is **not** invented. Consumed IAs are **not** reused.
>
> This is **not** a new governance tier, **not** a new PAD, **not** PAD-056, **not** a DBA, **not** a BCR IA, **not** a reconstruction IA, **not** a forward-fix authority, **not** a runtime authority, **not** a REA, **not** an EIR, **not** an Implementation Completion.

> **Pre-issuance gates (this issuance — read-only):** PAD-055 **ISSUED / IMMUTABLE** · OPTION A · HMIC-049 – HMIC-060 · HMD-007 **OPEN / DISTINCT / HISTORICAL SOURCE-INTEGRITY DEFECT / POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION / OPTION A SELECTED / IMPLEMENTATION NOT AUTHORIZED YET** · target **`20260331180000_announcements_created_by_inbox_fanout.sql`** · current blob **`11fe1e935f4d4eeb3047c3dbac18d78e3caf9f2f`** · origin commit **`efc3f49e27e48725b1aa097a8402dcb8ca42ffb7`** · origin blob **`ccb99fb4de63a0a0cc79cdbbdba3240ec5c54f1d`** · corrupting commit **`8c30eb2f657847dc0767201149190eef8d610475`** · CURRENT == ORIGIN **NO** · target worktree **CLEAN** vs HEAD (`git hash-object` equals HEAD blob) · CURRENT L70 **`WHEN 'council' THEN '业委?`** · origin L70 **`WHEN 'council' THEN '业委会'`** · reconstruction / forward-fix / quarantine / fake history **REJECTED** · LOCAL-013 **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** · attempts **1** · retry **NOT AUTHORIZED** · LOCAL-014 **not issued** · HMD-006 **RUNTIME REPLAY VERIFIED / not CLOSED** · HMD-005 **RUNTIME REPLAY VERIFIED / not CLOSED** · HMD-003 **RUNTIME PENDING** · quarantine **exactly one**. **No gate failed.**

> **Document class:** Bounded **repository forensic restoration** authorization only. This record **does not** restore the file · **does not** restore L70 · **does not** apply migrations · **does not** run BCR `--apply` · **does not** retry LOCAL-013 · **does not** issue LOCAL-014 · **does not** authorize RU-1.4.

```
FORENSIC RESTORATION IMPLEMENTATION AUTHORIZATION = E-02-HMIR-IA-004
DECISION                                          = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PAD-055                                           = ISSUED / IMMUTABLE (POLICY CONSUMED FOR IA ISSUANCE ONLY)
SELECTED POLICY                                   = EXACT HISTORICAL SOURCE RESTORATION
RESTORATION MODEL                                 = BOUNDED PROVEN FRAGMENT ONLY
HISTORICAL TRUTH CLAIM                            = PROVEN SOURCE RESTORATION
TARGET                                            = supabase/migrations/20260331180000_announcements_created_by_inbox_fanout.sql
AUTHORIZED SOURCE FILE COUNT                      = EXACTLY 1
AUTHORIZED RESTORATIONS                           = EXACTLY ONE FRAGMENT (L70)
CONTENT AUTHORITY                                 = efc3f49e27e48725b1aa097a8402dcb8ca42ffb7
CURRENT PRE-STATE BLOB                            = 11fe1e935f4d4eeb3047c3dbac18d78e3caf9f2f
ORIGIN BLOB                                       = ccb99fb4de63a0a0cc79cdbbdba3240ec5c54f1d
CORRUPTING COMMIT                                 = 8c30eb2f657847dc0767201149190eef8d610475
WHOLE-FILE RESTORE                                = NOT AUTHORIZED
WHITESPACE-ONLY RESTORATION                       = NOT AUTHORIZED
TRAILING BLANK LINE RESTORATION                   = NOT AUTHORIZED
WHITESPACE NORMALIZATION                          = NOT AUTHORIZED
LINE ENDING NORMALIZATION                         = NOT AUTHORIZED
EOF CLEANUP                                       = NOT AUTHORIZED
SIBLING 20260401140000                            = FORENSICALLY NOTED / OUT OF HMD-007 SCOPE /
                                                    NOT AUTHORIZED / NOT ALLOCATED
HMD-006 TARGET                                    = DO NOT EDIT
RECONSTRUCTION / FORWARD-FIX / QUARANTINE         = REJECTED
FAKE HISTORY                                      = REJECTED
RESTORATION EXECUTED                              = NO
HMD-007                                           = OPEN / DISTINCT /
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
QUARANTINE                                        = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
HMD-007 TARGET                                    = NOT QUARANTINED
LOCAL-013                                         = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-013 ATTEMPTS                                = 1
LOCAL-013 RETRY                                   = NOT AUTHORIZED
LOCAL-014                                         = NOT ISSUED
BCR CHANGE                                        = NOT AUTHORIZED
EXPECTED DBA PIN                                  = E-02-DBA-LOCAL-013
ARTIFACT AUTHORITY                                = E-02-BCR-IA-013
THIS IA                                           ≠ DBA · ≠ BCR IA · ≠ PAD · ≠ REA · ≠ COMPLETION
NEXT                                              = IMPLEMENT E-02-HMIR-IA-004 (REPOSITORY ONLY)
```

---

## 1. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-005.md) | **Direct policy authority** — PAD-055 · HMD-007 |
| [`E-02-HMD-007-Announcements-Created-By-Inbox-Fanout-Forensic-Investigation.md`](E-02-HMD-007-Announcements-Created-By-Inbox-Fanout-Forensic-Investigation.md) | Forensic classification · consumed as fact |
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-003.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-003.md) | Family predecessor · **HMD-006 only** · **CONSUMED** |
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-002.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-002.md) | Family predecessor · **HMD-004 only** · **CONSUMED** |
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md) | Family predecessor · **HMD-002 only** · **CONSUMED** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-013.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-013.md) | LOCAL-013 **APPLICATION_FAILED** · evidence **immutable** · run `local-013-20260828a` |

**This IA consumes PAD-055 for implementation authorization only.** Restoration is **not performed** in this issuance task.

PAD-054 / `E-02-HMIR-IA-003` remain **file-specific to HMD-006** and **must not** be reused as executable authority for this file.

---

## 2. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-HMIR-IA-004** |
| **Decision** | **APPROVED WITH CONDITIONS / NOT YET CONSUMED** |
| **Authorized future action** | Forensic restore of **exactly one** proven corrupted fragment (**L70**) to `efc3f49e` content |
| **Authorized future semantic/source change count** | **EXACTLY 1** |
| **Authorized historical file count** | **EXACTLY 1** |
| **Not authorized** | Whole-file checkout · rewrite · reconstruction · forward-fix · second quarantine · sibling-file edits · HMD-006 target edits · trailing-blank cleanup · BCR retarget · LOCAL-013 retry · LOCAL-014 · DB/Supabase/Docker · `--apply` · RU-1.4 · Completion issuance |
| **Execution this task** | **NOT PERFORMED** |

---

## 3. Purpose

Authorize **one future** repository-only task:

```
CURRENT CORRUPTED FRAGMENT  →  EXACT efc3f49e HISTORICAL TEXT
(exactly one proven fragment: L70)
```

Purpose = **EXACT HISTORICAL SOURCE-INTEGRITY RESTORATION**.

Authorized historical truth claim = **PROVEN SOURCE RESTORATION**.

**Not:** reconstruction · compatibility shim · modernization · refactor · cleanup · equivalent SQL · AI-generated correction · `migration repair` · forward-fix · quarantine expansion · schema / policy redesign · invented semantics.

---

## 4. Defect

| Field | Value |
|-------|-------|
| **ID** | **HMD-007** |
| **Pre-issuance status** | **OPEN / DISTINCT / HISTORICAL SOURCE-INTEGRITY DEFECT / POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION / OPTION A SELECTED / IMPLEMENTATION NOT AUTHORIZED YET** |
| **Post-issuance status** | **OPEN / DISTINCT / HISTORICAL SOURCE-INTEGRITY DEFECT / POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION / OPTION A SELECTED / IMPLEMENTATION AUTHORIZED / NOT YET IMPLEMENTED** |
| **Classification** | HISTORICAL SOURCE-INTEGRITY DEFECT · POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION |
| **HMD-001** | **OPEN / DISTINCT** |
| **HMD-002** | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT** — **do not reopen** |
| **HMD-003** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** — W2 / April HARD / July S1 **NOT REACHED / NOT APPLIED** |
| **HMD-004** | **SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED / DISTINCT** — **do not reopen** |
| **HMD-005** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — **not CLOSED** · **do not downgrade** |
| **HMD-006** | **OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — **not CLOSED** · **do not reopen** · target **DO NOT EDIT** |

HMD-007 **must not** be marked `SOURCE INTEGRITY RESTORED`, resolved, CLOSED, or runtime-verified by this IA. No repository restoration has happened yet. Same corrupting commit as HMD-006 **does not** merge the defects.

---

## 5. Exact future source scope

**May modify (future implementation only):**

1. `supabase/migrations/20260331180000_announcements_created_by_inbox_fanout.sql`

**Expected intentional migration write count = 1 file.**

After successful restoration, a **minimal** `docs/implementation/README.md` ledger update is permitted if required by family precedent. Implementation evidence may be created as established by HMIR precedent. **No Completion document during implementation.**

**Must not create/modify:** sibling contaminated migrations · HMD-006 target · helper files · second migrations · generated copies · HMD-005 reconstruction/target · W1/W2 · HMD-002/HMD-004 restored files · quarantine file · BCR artifact · guard · verifier · diagnostics · launcher · package/test/app source.

---

## 6. Content authority / pre-state

```
CONTENT AUTHORITY   = efc3f49e27e48725b1aa097a8402dcb8ca42ffb7
ORIGIN BLOB         = ccb99fb4de63a0a0cc79cdbbdba3240ec5c54f1d
CURRENT PRE-STATE   = 11fe1e935f4d4eeb3047c3dbac18d78e3caf9f2f
CORRUPTING COMMIT   = 8c30eb2f657847dc0767201149190eef8d610475
PATH                = supabase/migrations/20260331180000_announcements_created_by_inbox_fanout.sql
```

Verified at IA issuance: `git hash-object` of the target **equals** `HEAD:` blob `11fe1e935f4d4eeb3047c3dbac18d78e3caf9f2f`. Worktree porcelain for this path is **empty**. Origin blob `git rev-parse efc3f49e:…` equals `ccb99fb4de63a0a0cc79cdbbdba3240ec5c54f1d`.

No current-production schema. No later migration as replacement content. No semantic guess. No “equivalent SQL”. No AI-invented wording. HMD-006 origin `9f9af80a` is **not** content authority for this file. Application display copy is **not** content authority.

If the target blob is no longer `11fe1e935f4d4eeb3047c3dbac18d78e3caf9f2f` at implementation time: **STOP → GOVERNANCE**. Do not overwrite. **IA NOT CONSUMED.**

---

## 7. Exact bounded restoration set — EXACTLY ONE

Future implementation **must re-verify** the current/origin L70 pair immediately before writing, using `git show efc3f49e:…` and the current target blob. If the current fragment no longer matches the expected corrupted pre-state, or if `efc3f49e` cannot be read, or if origin text differs from this table: **STOP → GOVERNANCE**. Do not force replacement. **No second fragment. No whole-file checkout. No automatic new HMD.**

This IA records the **exact full lines** observed from `git show HEAD:` / `git show efc3f49e:`. Implementation must restore the **entire listed current line** to the **entire listed origin line**. Those lines differ **only** in the authorized corruption.

| # | Line | Class | Shorthand current → origin |
|---|------|-------|----------------------------|
| **1** | **L70** | PL/pgSQL CASE branch · **PARSER-BREAKING** · **RESTORE** | `THEN '业委?` → `THEN '业委会'` |

More precisely, restore the malformed return literal:

```
CURRENT = '业委?
ORIGIN  = '业委会'
```

**Copy-paste authority (exact full lines; leading spaces significant):**

Current L70:

```
    WHEN 'council' THEN '业委?
```

Origin L70:

```
    WHEN 'council' THEN '业委会'
```

**Code-point proof** of the literal after `THEN `:

| | Opening quote | 业 | 委 | 会 / `?` | Closing quote |
|--|---------------|----|----|----------|---------------|
| Origin | `U+0027` | `U+4E1A` | `U+59D4` | **`U+4F1A`** | **`U+0027`** |
| Current | `U+0027` | `U+4E1A` | `U+59D4` | **`U+003F`** | **absent** |

Meaning: 会 lost; closing `U+0027` lost; ASCII `U+003F` `?` present; file remains valid UTF-8; not an invalid-UTF-8 decode defect.

L71 `WHEN 'manager' THEN '物业经理'` is **IDENTICAL** to origin and **DO NOT TOUCH**.

Authorized fragment count = **1**.

Method: **narrow fragment / whole-line replacement of this one line only.**

```
git checkout efc3f49e -- supabase/migrations/20260331180000_announcements_created_by_inbox_fanout.sql
```

is **PROHIBITED** (would restore trailing blanks excluded by PAD-055). Whole-file restore from origin blob is **NOT AUTHORIZED**. Out-of-scope bytes/content **must be preserved**.

---

## 8. Explicit exclusions

**DO NOT TOUCH:**

- L71 `WHEN 'manager' THEN '物业经理'`
- any line already identical to `efc3f49e`
- trailing blank lines (origin ends after `);` · current has **four** extra empty CRLF lines)
- CRLF/LF-only differences
- indentation, unrelated whitespace, file-wide formatting
- SQL structure, function bodies, RLS policies, GRANTs outside L70
- commas/quotes **outside** the authorized L70 fragment

**No formatting sweep. No whole-file restoration. Whitespace-only restoration = NOT AUTHORIZED.**

```
TRAILING BLANK LINES         = PRESERVE
WHITESPACE NORMALIZATION     = NOT AUTHORIZED
LINE ENDING NORMALIZATION    = NOT AUTHORIZED
EOF CLEANUP                  = NOT AUTHORIZED
FULL-FILE BYTE EQUALITY      = NOT THE SUCCESS CRITERION
AUTHORIZED FRAGMENT EQUALITY = EXACT ORIGIN
WHITESPACE DIFFERENCE        = PRESERVED / OUTSIDE AUTHORIZED SCOPE
```

If editor/tooling would normalize the whole file, use a narrower edit mechanism. Do not accept line-ending churn as harmless.

### 8.1 Sibling locks — hard exclusion

```
HMD-006 TARGET     = DO NOT EDIT
20260401140000     = FORENSICALLY NOTED / OUT OF HMD-007 SCOPE /
                     NOT AUTHORIZED / NOT ALLOCATED
```

**Do not edit:**

- `20260331161000_owner_bulletin_notifications.sql`
- `20260401140000_notifications_trigger_service_role_insert.sql`

Do **not** allocate new HMD IDs in this IA. Do **not** expand Option A to the sibling.

---

## 9. Historical immutability exception

Default: historical migrations remain immutable.

This IA creates **only** this narrow exception:

```
TARGET                 = 20260331180000_announcements_created_by_inbox_fanout.sql
AUTHORIZED DIFFERENCES = exactly one proven corrupted fragment (L70)
CONTENT AUTHORITY      = efc3f49e
```

Nothing else. After implementation, historical immutability **resumes**. This IA does **not** establish a general right to edit historical migrations and does **not** reuse `E-02-HMIR-IA`, `E-02-HMIR-IA-002`, or `E-02-HMIR-IA-003`.

---

## 10. Rejected remedies

| Remedy | Disposition |
|--------|-------------|
| Compatibility reconstruction / new migration | **REJECTED / NOT INDICATED** |
| Forward-fix / later patch migration | **REJECTED** (historical target fails parse during clean replay) |
| Quarantine of `20260331180000` | **REJECTED / NOT AUTHORIZED** |
| Fake history / record-as-applied / skip / repair-as-applied | **REJECTED** |

The restored file must later **execute normally** in a fresh governed replay. Source restoration **is not** runtime evidence.

---

## 11. Quarantine / BCR lock

```
quarantinedMigrations = [ 20260314195641_add_demo_data.sql ]
quarantineCount       = 1
HMD-007 TARGET        = NOT QUARANTINED
HMD-007 QUARANTINE    = NOT AUTHORIZED
```

`20260331180000` remains **in** the execution chain. Count **must not** change.

```
BCR CHANGE AUTHORIZED = NO
EXPECTED DBA          = E-02-DBA-LOCAL-013
ARTIFACT AUTHORITY    = E-02-BCR-IA-013
```

LOCAL-013 cannot execute again. **Do not retarget to LOCAL-014.** Future HMD-007 restoration **must not retarget BCR**.

---

## 12. Future implementation task (authorized; not executed here)

### 12.1 Pre-edit gates (all required)

A. PAD-055 still **ISSUED / IMMUTABLE** / controlling.  
B. This IA still **APPROVED / NOT YET CONSUMED**.  
C. Target path remains exact.  
D. Target current blob remains **`11fe1e935f4d4eeb3047c3dbac18d78e3caf9f2f`**.  
E. Current L70 remains **`WHEN 'council' THEN '业委?`**.  
F. Origin commit/blob remain proven as in §6.  
G. Sibling files remain out of scope / unedited.  
H. No superseding authority exists.

Any mismatch: **STOP → GOVERNANCE**. **IMPLEMENTATION = BLOCKED.** **IA = NOT CONSUMED.** Do not restore.

### 12.2 Edit method

1. Re-check current L70 and origin L70.  
2. Replace **exactly** the current L70 line with the origin L70 line (`'业委?` → `'业委会'`).  
3. Do not `git checkout` the entire origin file.  
4. Do not replace the whole file from origin.  
5. Do not normalize trailing blanks / CRLF / indentation / EOF.  
6. Preserve all out-of-scope bytes/content.

### 12.3 Post-edit static proof (all required)

1. Exactly one migration file intentionally changed by the HMD-007 task.  
2. Exactly one authorized source fragment restored.  
3. Actual attributable fragment count = **1**.  
4. Target L70 equals **`WHEN 'council' THEN '业委会'`**.  
5. Authorized fragment restored = **YES**.  
6. Restored L70 equals `efc3f49e` **exactly**.  
7. No whitespace normalization.  
8. Trailing CRLF blank lines **UNCHANGED**.  
9. No unrelated target changes.  
10. No sibling changes (`20260331161000` and `20260401140000` unedited).  
11. No other migration edits.  
12. BCR unchanged.  
13. Verifier unchanged.  
14. Guard unchanged.  
15. Diagnostics / launcher unchanged.  
16. Quarantine remains exactly one.

**AUTHORIZED FRAGMENT EQUALITY TO ORIGIN = EXACT.** Full-file equality to origin is **not** required (whitespace excluded).

Future implementation must distinguish **total worktree diff** from **HMD-007 attributable migration diff**. Expected HMD-007 attributable target diff = **exactly 1 fragment restoration**. Total repository diff need **not** be clean because previously authorized uncommitted governance/migration lineage may exist.

### 12.4 Authorized static commands (only after successful static edit certification)

- DB-free BCR `--plan` → expect `PLAN_OK` · `failures = []`. Current pin `E-02-DBA-LOCAL-013` / `E-02-BCR-IA-013` is **acceptable for static plan** even though LOCAL-013 cannot execute again. Capture actual expected DBA pin · artifact authority · `migrationCountDiscovered` · executable count · `quarantineCount`. Absent unrelated repository change, expected **286 / 285 / 1**. **Do not encode those counts as permanent invariants.**
- Future plan checkpoints: HMD-007 target **DISCOVERED / EXECUTABLE / NOT QUARANTINED**; HMD-005 reconstruction **DISCOVERED / EXECUTABLE**; HMD-005 target **DISCOVERED / EXECUTABLE**; HMD-003 W2 **DISCOVERED / EXECUTABLE**; April HARD **DISCOVERED / EXECUTABLE**; July S1 **DISCOVERED / EXECUTABLE**; global quarantine **exactly one demo-data migration**.
- `npm run build` → **PASS**. No DB required.

### 12.5 Runtime prohibition

```
--apply              = NONE
DATABASE EXECUTION   = NONE
STATEFUL SUPABASE    = NONE
DOCKER MUTATION      = NONE
LOCAL-013 RETRY      = NONE
LOCAL-014 EXECUTION  = NONE
RU-1.4               = NONE
```

### 12.6 Implementation STOP conditions

STOP → GOVERNANCE if: pre-state mismatch · `efc3f49e` unreadable · origin differs from this IA/PAD-055 table · a second corruption would need change · exact fragment restore requires another semantic edit · whole-file normalization would be required · sibling files would be edited · HMD-006 target would be edited · migration order or quarantine count would change · BCR would be edited · authority superseded.

**No improvisation.**

---

## 13. IA consumption model

This IA may be marked **CONSUMED** only if:

- exact target pre-state matched `11fe1e93…` and current L70 matched `'业委?`;
- exactly one restoration applied (L70 only);
- exactly one historical migration changed;
- restored fragment equals `efc3f49e` exactly;
- whitespace lock preserved (trailing CRLF blanks unchanged);
- sibling exclusion preserved (HMD-006 target and `20260401140000` unedited);
- no unrelated semantic change;
- quarantine unchanged;
- BCR/tooling unchanged;
- DB-free `--plan` `PLAN_OK`;
- build **PASS**;
- no runtime;
- no unauthorized writes.

Otherwise: **IA NOT CONSUMED** · **IMPLEMENTATION NOT CERTIFIED** · **STOP → GOVERNANCE**.

Consumption is recorded by a **later Implementation Completion**, not by this issuance and not automatically during implementation.

After successful implementation and IA consumption, HMD-007 becomes:

```
IMPLEMENTATION COMPLETED / IMPLEMENTATION COMPLETION PENDING
```

---

## 14. Future Completion (reserved; not created)

A separate Implementation Completion **is required** after implementation.

**Do not issue it in this IA task. Do not issue it automatically during implementation. Do not allocate its identifier here.**

Expected family: **E-02 Historical Migration Integrity Restoration Implementation Completion**. Highest issued numbered successor is **Completion-003**. Expected next unused filename, **subject to independent sequence verification at Completion issuance**:

```
docs/implementation/E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion-004.md
```

May certify **only** repository restoration + static verification.

**Must not** certify: LOCAL-014 · runtime replay · database baseline · HMD-007 closure · HMD-003 closure · HMD-005 closure · HMD-006 closure · RU-1.4.

---

## 15. LOCAL-013 / successor DBA

```
E-02-DBA-LOCAL-013 = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-013 ATTEMPTS = 1
LOCAL-013 RETRY    = NOT AUTHORIZED
LOCAL-014          = NOT ISSUED
```

Restoration does **not** reopen LOCAL-013. Successor DBA/BCR order:

```
PAD-055
  → this IA
  → restoration implementation
  → restoration Completion
  → successor DBA governance
  → successor BCR retarget governance
  → future runtime
```

**No shortcut. No BCR retarget in this task. No LOCAL-014 in this task.**

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
2. Exactly one corruption restored (L70)  
3. Restored line proven from `efc3f49e`  
4. No inferred / new wording  
5. No second textual/semantic change  
6. Path / timestamp unchanged  
7. L71 untouched  
8. Trailing blanks / CRLF not “fixed”  
9. Siblings unedited (`20260331161000` and `20260401140000`)  
10. Quarantine count = 1  
11. BCR / verifier / guard / diagnostics / launcher unchanged  
12. `--plan` PLAN_OK · build PASS  
13. No DB / Supabase / Docker  

---

## 19. Lock

```
E-02-HMIR-IA-004     = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PAD-055              = ISSUED / IMMUTABLE / OPTION A
HMD-007              = OPEN / DISTINCT /
                       HISTORICAL SOURCE-INTEGRITY DEFECT /
                       POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION /
                       OPTION A SELECTED /
                       IMPLEMENTATION AUTHORIZED /
                       NOT YET IMPLEMENTED
TARGET               = 20260331180000_announcements_created_by_inbox_fanout.sql
CURRENT BLOB         = 11fe1e935f4d4eeb3047c3dbac18d78e3caf9f2f
ORIGIN COMMIT        = efc3f49e27e48725b1aa097a8402dcb8ca42ffb7
ORIGIN BLOB          = ccb99fb4de63a0a0cc79cdbbdba3240ec5c54f1d
CORRUPTING COMMIT    = 8c30eb2f657847dc0767201149190eef8d610475
AUTHORIZED FILES     = 1
AUTHORIZED FRAGMENTS = 1
AUTHORIZED FRAGMENT  = L70 ONLY
CURRENT L70          = WHEN 'council' THEN '业委?
RESTORE L70 TO       = WHEN 'council' THEN '业委会'
WHOLE-FILE RESTORE   = NOT AUTHORIZED
WHITESPACE           = NOT AUTHORIZED
TRAILING CRLF BLANKS = PRESERVE
20260401140000       = OUT OF SCOPE / NOT AUTHORIZED
HMD-006 TARGET       = DO NOT EDIT
LOCAL-013            = APPLICATION_FAILED / EVIDENCE IMMUTABLE / attempts 1 / NO RETRY
LOCAL-014            = NOT ISSUED
FUTURE DB-FREE PLAN  = AUTHORIZED AFTER SUCCESSFUL STATIC RESTORATION
FUTURE BUILD         = AUTHORIZED
RUNTIME              = NOT AUTHORIZED
RU-1.4               = RUNTIME NOT AUTHORIZED
DATABASE BASELINE    = NOT VERIFIED
NEXT                 = IMPLEMENT E-02-HMIR-IA-004 (REPOSITORY ONLY)
EXECUTABLE WORK      = NONE (this issuance)
```

---

**End of document — E-02-HMIR-IA-004 · HMD-007 · v1.0 — 2026-08-28**
