# E-02 — Historical Migration Integrity Restoration — Implementation Authorization (Successor)

| Field | Value |
|-------|-------|
| **Document Type** | **Implementation Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-HMIR-IA-003** |
| **Policy authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md) (**PAD-054** · HMIC-037 – HMIC-048) |
| **Forensic record** | [`E-02-HMD-006-Owner-Bulletin-Notifications-Forensic-Investigation.md`](E-02-HMD-006-Owner-Bulletin-Notifications-Forensic-Investigation.md) |
| **Predecessor IAs** | [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md) (**E-02-HMIR-IA** · HMD-002 · **CONSUMED**) · [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-002.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-002.md) (**E-02-HMIR-IA-002** · HMD-004 · **CONSUMED**) |
| **Defect** | **HMD-006** |
| **Status** | **Approved With Conditions / Not Yet Consumed** |
| **Authority Level** | Implementation Authorization (repository forensic restoration only) |
| **Effective Date** | 2026-08-28 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-003.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-003.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **Future repository-only restoration task · NOT this issuance** |

> **Authority path finding: YES.** Filename `E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-003.md` is **authority-safe** as the next successor in the existing **HMIR IA** family (`…-Authorization.md` · `…-Authorization-002.md` · **this `…-Authorization-003.md`**). ID **`E-02-HMIR-IA-003`**. Distinct filename keeps **E-02-HMIR-IA** and **E-02-HMIR-IA-002** **immutable**. Highest issued restoration IA is **E-02-HMIR-IA-002** (**CONSUMED**). **E-02-HMIR-IA-003 is the next unused identifier.** No HMIR-IA-003 document existed before this issuance. PAD-054 named this family/ID as the expected next document. **HFSOR-IA is reconstruction and is not this family.** BCR IAs and DBA records are execution/retarget authority, not restoration. A new family name is **not** invented. Consumed IAs are **not** reused.
>
> This is **not** a new governance tier, **not** a new PAD, **not** PAD-055, **not** a DBA, **not** a BCR IA, **not** a reconstruction IA, **not** a forward-fix authority, **not** a runtime authority, **not** a REA, **not** an EIR, **not** an Implementation Completion.

> **Pre-issuance gates (this issuance — read-only):** PAD-054 **ISSUED / IMMUTABLE** · OPTION A · HMD-006 **OPEN / FORENSIC INVESTIGATION COMPLETE / HISTORICAL SOURCE-INTEGRITY DEFECT / EXACT SOURCE RESTORATION SELECTED / IMPLEMENTATION NOT AUTHORIZED** · subtype **POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION** · target **`20260331161000_owner_bulletin_notifications.sql`** · current blob **`4c8c7063f5430d608358f1e38df3c25c52d3a0ef`** · origin commit **`9f9af80a2b5b8b3c84e2ddd4942fc07ef3379de7`** · origin blob **`2c3d63b2d0e2598f3df64f2a0fce341e8a886d35`** · corrupting commit **`8c30eb2f657847dc0767201149190eef8d610475`** · CURRENT == ORIGIN **NO** · target worktree **CLEAN** vs HEAD (`git hash-object` equals HEAD blob) · reconstruction / forward-fix / quarantine / fake history **REJECTED** · LOCAL-012 **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** · attempts **1** · retry **NOT AUTHORIZED** · LOCAL-013 **not issued** · HMD-005 **RUNTIME REPLAY VERIFIED / not CLOSED** · HMD-003 **RUNTIME PENDING** · quarantine **exactly one**. **No gate failed.**

> **Document class:** Bounded **repository forensic restoration** authorization only. This record **does not** restore the file · **does not** apply migrations · **does not** run BCR `--apply` · **does not** issue LOCAL-013 · **does not** authorize RU-1.4.

```
FORENSIC RESTORATION IMPLEMENTATION AUTHORIZATION = E-02-HMIR-IA-003
DECISION                                          = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PAD-054                                           = ISSUED / IMMUTABLE (POLICY CONSUMED FOR IA ISSUANCE ONLY)
SELECTED POLICY                                   = EXACT HISTORICAL SOURCE RESTORATION
RESTORATION MODEL                                 = BOUNDED PROVEN FRAGMENTS ONLY
HISTORICAL TRUTH CLAIM                            = PROVEN SOURCE RESTORATION
TARGET                                            = supabase/migrations/20260331161000_owner_bulletin_notifications.sql
AUTHORIZED SOURCE FILE COUNT                      = EXACTLY 1
AUTHORIZED RESTORATIONS                           = EXACTLY FOUR FRAGMENTS (L4, L10, L52, L88)
CONTENT AUTHORITY                                 = 9f9af80a2b5b8b3c84e2ddd4942fc07ef3379de7
CURRENT PRE-STATE BLOB                            = 4c8c7063f5430d608358f1e38df3c25c52d3a0ef
ORIGIN BLOB                                       = 2c3d63b2d0e2598f3df64f2a0fce341e8a886d35
WHOLE-FILE RESTORE                                = NOT AUTHORIZED
WHITESPACE-ONLY RESTORATION                       = NOT AUTHORIZED
SIBLING CONTAMINATION                             = NOTED / OUT OF HMD-006 SCOPE
RECONSTRUCTION / FORWARD-FIX / QUARANTINE         = REJECTED
FAKE HISTORY                                      = REJECTED
RESTORATION EXECUTED                              = NO
HMD-006                                           = OPEN / HISTORICAL SOURCE-INTEGRITY DEFECT /
                                                    EXACT SOURCE RESTORATION SELECTED /
                                                    IMPLEMENTATION AUTHORIZED /
                                                    NOT IMPLEMENTED
HMD-001                                           = OPEN / DISTINCT
HMD-002                                           = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT
HMD-003                                           = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                    IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
HMD-004                                           = SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED / DISTINCT
HMD-005                                           = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                    IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
QUARANTINE                                        = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
LOCAL-012                                         = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-012 ATTEMPTS                                = 1
LOCAL-012 RETRY                                   = NOT AUTHORIZED
LOCAL-013                                         = NOT ISSUED
BCR CHANGE                                        = NOT AUTHORIZED
THIS IA                                           ≠ DBA · ≠ BCR IA · ≠ PAD · ≠ REA · ≠ COMPLETION
NEXT                                              = IMPLEMENT E-02-HMIR-IA-003 (REPOSITORY ONLY)
```

---

## 1. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-004.md) | **Direct policy authority** — PAD-054 · HMD-006 |
| [`E-02-HMD-006-Owner-Bulletin-Notifications-Forensic-Investigation.md`](E-02-HMD-006-Owner-Bulletin-Notifications-Forensic-Investigation.md) | Forensic classification · consumed as fact |
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-002.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-002.md) | Family predecessor · **HMD-004 only** · **CONSUMED** |
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md) | Family predecessor · **HMD-002 only** · **CONSUMED** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-012.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-012.md) | LOCAL-012 **APPLICATION_FAILED** · evidence **immutable** · run `local-012-20260828a` |

**This IA consumes PAD-054 for implementation authorization only.** Restoration is **not performed** in this issuance task.

---

## 2. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-HMIR-IA-003** |
| **Decision** | **APPROVED WITH CONDITIONS / NOT YET CONSUMED** |
| **Authorized future action** | Forensic restore of **exactly four** proven corrupted fragments to `9f9af80a` content |
| **Authorized future semantic/source change count** | **EXACTLY 4** |
| **Authorized historical file count** | **EXACTLY 1** |
| **Not authorized** | Whole-file checkout · rewrite · reconstruction · forward-fix · second quarantine · sibling-file edits · BCR retarget · LOCAL-013 · DB/Supabase/Docker · `--apply` · RU-1.4 · Completion issuance |
| **Execution this task** | **NOT PERFORMED** |

---

## 3. Purpose

Authorize **one future** repository-only task:

```
CURRENT CORRUPTED FRAGMENT  →  EXACT 9f9af80a HISTORICAL TEXT
(exactly four proven fragments: L4, L10, L52, L88)
```

Purpose = **EXACT HISTORICAL SOURCE-INTEGRITY RESTORATION**.

Authorized historical truth claim = **PROVEN SOURCE RESTORATION**.

**Not:** reconstruction · compatibility shim · modernization · refactor · cleanup · equivalent SQL · AI-generated correction · `migration repair` · forward-fix · quarantine expansion · schema / policy redesign · invented semantics.

---

## 4. Defect

| Field | Value |
|-------|-------|
| **ID** | **HMD-006** |
| **Pre-issuance status** | **OPEN / FORENSIC INVESTIGATION COMPLETE / HISTORICAL SOURCE-INTEGRITY DEFECT / EXACT SOURCE RESTORATION SELECTED / IMPLEMENTATION NOT AUTHORIZED** |
| **Post-issuance status** | **OPEN / HISTORICAL SOURCE-INTEGRITY DEFECT / EXACT SOURCE RESTORATION SELECTED / IMPLEMENTATION AUTHORIZED / NOT IMPLEMENTED** |
| **Classification** | HISTORICAL SOURCE-INTEGRITY DEFECT · POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION |
| **HMD-001** | **OPEN / DISTINCT** |
| **HMD-002** | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFIED / DISTINCT** — **do not reopen** |
| **HMD-003** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** — W2 / April HARD / July S1 **NOT REACHED** |
| **HMD-004** | **SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED / DISTINCT** — **do not reopen** |
| **HMD-005** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** — **not CLOSED** · **do not downgrade** |

HMD-006 **must not** be marked `SOURCE INTEGRITY RESTORED`, resolved, CLOSED, or runtime-verified by this IA. No repository restoration has happened yet.

---

## 5. Exact future source scope

**May modify (future implementation only):**

1. `supabase/migrations/20260331161000_owner_bulletin_notifications.sql`

**Expected intentional migration write count = 1 file.**

After successful restoration, a **minimal** `docs/implementation/README.md` ledger update is permitted if required by family precedent. **No Completion document during implementation.**

**Must not create/modify:** sibling contaminated migrations · helper files · second migrations · generated copies · HMD-005 reconstruction/target · W1/W2 · HMD-002/HMD-004 restored files · quarantine file · BCR artifact · guard · verifier · diagnostics · launcher · package/test/app source.

---

## 6. Content authority / pre-state

```
CONTENT AUTHORITY   = 9f9af80a2b5b8b3c84e2ddd4942fc07ef3379de7
ORIGIN BLOB         = 2c3d63b2d0e2598f3df64f2a0fce341e8a886d35
CURRENT PRE-STATE   = 4c8c7063f5430d608358f1e38df3c25c52d3a0ef
CORRUPTING COMMIT   = 8c30eb2f657847dc0767201149190eef8d610475
PATH                = supabase/migrations/20260331161000_owner_bulletin_notifications.sql
```

Verified at IA issuance: `git hash-object` of the target **equals** `HEAD:` blob `4c8c7063…`. Worktree porcelain for this path is **empty**.

No current-production schema. No later migration as replacement content. No semantic guess. No “equivalent SQL”. No AI-invented wording. Application display copy is **not** content authority.

If the target blob is no longer `4c8c7063f5430d608358f1e38df3c25c52d3a0ef` at implementation time: **STOP → GOVERNANCE**. Do not overwrite.

---

## 7. Exact bounded restoration set — EXACTLY FOUR

Future implementation **must re-verify** each current/origin pair immediately before writing, using `git show 9f9af80a:…` and the current target blob. If any current fragment no longer matches the expected corrupted pre-state, or if `9f9af80a` cannot be read, or if origin text differs from this table: **STOP → GOVERNANCE**. Do not force replacement. **No fifth fragment. No whole-file checkout. No automatic new HMD.**

PAD/forensic shorthand used `title_en, ?.` / `title_en, …).` and `(防伪?` / `(防伪造)`. Those are **correct differing substrings**. This IA records the **exact full lines** observed from `git show HEAD:` / `git show 9f9af80a:`. Implementation must restore the **entire listed current line** to the **entire listed origin line**. Those lines differ **only** in the authorized corruption.

| # | Line | Class | Shorthand current → origin |
|---|------|-------|----------------------------|
| **1** | **L4** | comment / non-executable · proven `8c30eb2` corruption · **RESTORE** | `title_en, ?.` → `title_en, …).` |
| **2** | **L10** | comment / non-executable · proven `8c30eb2` corruption · **RESTORE** | `(防伪?` → `(防伪造)` |
| **3** | **L52** | CHECK constraint · **PARSER-BREAKING** · **RESTORE** | `IN ('业委?, '物业经理')` → `IN ('业委会', '物业经理')` |
| **4** | **L88** | PL/pgSQL CASE branch · truncated/unclosed if reached · **RESTORE** | `THEN '业委?` → `THEN '业委会'` |

**Copy-paste authority (exact full lines; leading spaces significant):**

Current L4:

```
  The legacy `notifications` table was per-user inbox (user_id, title_en, ?.
```

Origin L4:

```
  The legacy `notifications` table was per-user inbox (user_id, title_en, …).
```

Current L10:

```
  - author_name / author_role set by trigger from profiles (防伪?
```

Origin L10:

```
  - author_name / author_role set by trigger from profiles (防伪造)
```

Current L52:

```
  CONSTRAINT notifications_author_role_display_check CHECK (author_role IN ('业委?, '物业经理'))
```

Origin L52:

```
  CONSTRAINT notifications_author_role_display_check CHECK (author_role IN ('业委会', '物业经理'))
```

Current L88:

```
    WHEN 'council' THEN '业委?
```

Origin L88:

```
    WHEN 'council' THEN '业委会'
```

L4 origin uses **U+2026 HORIZONTAL ELLIPSIS** (`…`), not three ASCII dots. Current L4 uses ASCII `?` and also lost the closing `)`.

L52 CHECK semantics **must not** be redesigned. **No** additional role values. **No** policy change.

L88 **must not** redesign PL/pgSQL. L89 `WHEN 'manager' THEN '物业经理'` is **IDENTICAL** to origin and **DO NOT TOUCH**.

Authorized fragment count = **4**.

Method: **narrow fragment / whole-line replacement of these four lines only.**

```
git checkout 9f9af80a -- supabase/migrations/20260331161000_owner_bulletin_notifications.sql
```

is **PROHIBITED** (would restore trailing blanks excluded by PAD-054).

---

## 8. Explicit exclusions

**DO NOT TOUCH:**

- L89 `WHEN 'manager' THEN '物业经理'`
- any line already identical to `9f9af80a`
- trailing blank lines (origin 0 · current 4 extra empty lines; worktree may store extra lines as CRLF)
- CRLF/LF-only differences
- indentation, unrelated whitespace, file-wide formatting
- SQL structure, function bodies, RLS policies, GRANTs outside L4/L10/L52/L88
- commas/quotes **outside** the four authorized fragments

**No formatting sweep. No whole-file restoration. Whitespace-only restoration = NOT AUTHORIZED.**

If editor/tooling would normalize the whole file, use a narrower edit mechanism. Do not accept line-ending churn as harmless.

### 8.1 Sibling contamination — hard exclusion

```
SIBLING CONTAMINATION = FORENSICALLY NOTED / OUT OF HMD-006 SCOPE
```

**Do not edit:**

- `20260331180000_announcements_created_by_inbox_fanout.sql`
- `20260401140000_notifications_trigger_service_role_insert.sql`

Do **not** allocate new HMD IDs in this IA.

---

## 9. Historical immutability exception

Default: historical migrations remain immutable.

This IA creates **only** this narrow exception:

```
TARGET                 = 20260331161000_owner_bulletin_notifications.sql
AUTHORIZED DIFFERENCES = exactly four proven corrupted fragments (L4, L10, L52, L88)
CONTENT AUTHORITY      = 9f9af80a
```

Nothing else. After implementation, historical immutability **resumes**. This IA does **not** establish a general right to edit historical migrations and does **not** reuse `E-02-HMIR-IA` or `E-02-HMIR-IA-002`.

---

## 10. Rejected remedies

| Remedy | Disposition |
|--------|-------------|
| Compatibility reconstruction / new migration | **REJECTED / NOT INDICATED** |
| Forward-fix / later patch migration | **REJECTED** (historical target fails parse during clean replay) |
| Quarantine of `20260331161000` | **REJECTED / NOT AUTHORIZED** |
| Fake history / record-as-applied / skip / repair-as-applied | **REJECTED** |

The restored file must later **execute normally** in a fresh governed replay. Source restoration **is not** runtime evidence.

---

## 11. Quarantine / BCR lock

```
quarantinedMigrations = [ 20260314195641_add_demo_data.sql ]
quarantineCount       = 1
HMD-006 QUARANTINE    = NOT AUTHORIZED
```

`20260331161000` remains **in** the execution chain. Count **must not** change.

```
BCR CHANGE AUTHORIZED = NO
EXPECTED DBA          = E-02-DBA-LOCAL-012
ARTIFACT AUTHORITY    = E-02-BCR-IA-012
```

LOCAL-012 cannot execute again. **Do not retarget to LOCAL-013.**

---

## 12. Future implementation task (authorized; not executed here)

### 12.1 Pre-edit gates (all required)

A. PAD-054 still **ISSUED / IMMUTABLE**.  
B. This IA still **ISSUED / NOT CONSUMED**.  
C. Target current blob remains **`4c8c7063f5430d608358f1e38df3c25c52d3a0ef`**.  
D. Origin commit/blob remain proven as in §6.  
E. All four current corrupted lines still match §7.  
F. Sibling files remain out of scope / unedited.  
G. No superseding authority exists.

Any mismatch: **STOP → GOVERNANCE**. Do not restore.

### 12.2 Edit method

1. Re-check the four current lines and four origin lines.  
2. Replace **exactly** those four current lines with the four origin lines.  
3. Do not `git checkout` the entire origin file.  
4. Do not normalize trailing blanks / CRLF / indentation.

### 12.3 Post-edit static proof (all required)

1. Exactly one migration file intentionally changed.  
2. Exactly four authorized source fragments restored.  
3. L4 equals authorized origin line.  
4. L10 equals authorized origin line.  
5. L52 equals authorized origin line.  
6. L88 equals authorized origin line.  
7. No whitespace normalization.  
8. No unrelated target changes.  
9. No sibling changes.  
10. No other migration edits.  
11. BCR unchanged.  
12. Verifier unchanged.  
13. Guard unchanged.  
14. Diagnostics / launcher unchanged.  
15. Quarantine remains exactly one.

**AUTHORIZED FRAGMENT EQUALITY TO ORIGIN = EXACT.** Full-file equality to origin is **not** required (whitespace excluded).

### 12.4 Authorized static commands

- DB-free BCR `--plan` → expect `PLAN_OK`. Current pin `E-02-DBA-LOCAL-012` / `E-02-BCR-IA-012` is **acceptable for static plan** even though LOCAL-012 cannot execute again. Capture actual `migrationCountDiscovered` / planned executable / `quarantineCount`. Absent unrelated repository change, expected **286 / 285 / 1**. **Do not encode those counts as permanent invariants.**
- `npm run build` → **PASS**. No DB required.

### 12.5 Runtime prohibition

```
--apply              = NONE
DATABASE EXECUTION   = NONE
STATEFUL SUPABASE    = NONE
DOCKER MUTATION      = NONE
LOCAL-012 RETRY      = NONE
LOCAL-013 EXECUTION  = NONE
RU-1.4               = NONE
```

### 12.6 Implementation STOP conditions

STOP → GOVERNANCE if: pre-state mismatch · `9f9af80a` unreadable · origin differs from this IA/PAD-054 table · a fifth corruption would need change · exact fragment restore requires another semantic edit · whole-file normalization would be required · sibling files would be edited · migration order or quarantine count would change · authority superseded.

**No improvisation.**

---

## 13. IA consumption model

This IA may be marked **CONSUMED** only if:

- exact target pre-state matched `4c8c7063…`;
- exactly four restorations applied;
- exactly one historical migration changed;
- restored fragments equal `9f9af80a` exactly;
- whitespace lock preserved;
- sibling exclusion preserved;
- no unrelated semantic change;
- quarantine unchanged;
- BCR/tooling unchanged;
- DB-free `--plan` `PLAN_OK`;
- build **PASS**;
- no runtime;
- no unauthorized writes.

Otherwise: **IA NOT CONSUMED** · **STOP → GOVERNANCE**.

Consumption is recorded by a **later Implementation Completion**, not by this issuance and not automatically during implementation.

---

## 14. Future Completion (reserved; not created)

A separate Implementation Completion **is required** after implementation.

**Do not issue it in this IA task. Do not issue it automatically during implementation.**

Expected family: **E-02 Historical Migration Integrity Restoration Implementation Completion**. Highest issued numbered successor is **Completion-002**. Expected next unused filename, **subject to independent sequence verification at Completion issuance**:

```
docs/implementation/E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion-003.md
```

May certify **only** repository restoration + static verification.

**Must not** certify: LOCAL-013 · runtime replay · database baseline · HMD-006 closure · HMD-003 closure · HMD-005 closure · RU-1.4.

---

## 15. LOCAL-012 / successor DBA

```
E-02-DBA-LOCAL-012 = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-012 ATTEMPTS = 1
LOCAL-012 RETRY    = NOT AUTHORIZED
LOCAL-013          = NOT ISSUED
```

Restoration does **not** reopen LOCAL-012. Successor DBA/BCR order:

```
PAD-054
  → this IA
  → restoration implementation
  → restoration Completion
  → successor DBA governance
  → successor BCR retarget governance
  → future runtime
```

**No shortcut. No BCR retarget in this task.**

---

## 16. Package / verifier / guard / source lock

**Not authorized:** `replay-e02-declared-baseline.ts` · `verify-db-baseline.ts` · environment guard · diagnostics · launcher · `package.json` / lockfile · tests · application source · Supabase functions · generated types.

---

## 17. Database / RU / certification locks

```
DATABASE BASELINE VERIFIED       = NO
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
2. Exactly four corruptions restored  
3. Every restored line proven from `9f9af80a`  
4. No inferred / new wording  
5. No fifth textual/semantic change  
6. Path / timestamp unchanged  
7. L89 untouched  
8. Trailing blanks / CRLF not “fixed”  
9. Siblings unedited  
10. Quarantine count = 1  
11. BCR / verifier / guard / diagnostics / launcher unchanged  
12. `--plan` PLAN_OK · build PASS  
13. No DB / Supabase / Docker  

---

## 19. Lock

```
E-02-HMIR-IA-003     = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PAD-054              = ISSUED / IMMUTABLE
HMD-006              = OPEN / HISTORICAL SOURCE-INTEGRITY DEFECT /
                       EXACT SOURCE RESTORATION SELECTED /
                       IMPLEMENTATION AUTHORIZED /
                       NOT IMPLEMENTED
TARGET               = 20260331161000_owner_bulletin_notifications.sql
AUTHORIZED FRAGMENTS = 4
WHOLE-FILE RESTORE   = NOT AUTHORIZED
WHITESPACE           = NOT AUTHORIZED
SIBLINGS             = OUT OF SCOPE
LOCAL-013            = NOT ISSUED
RU-1.4               = RUNTIME NOT AUTHORIZED
NEXT                 = IMPLEMENT E-02-HMIR-IA-003 (REPOSITORY ONLY)
EXECUTABLE WORK      = NONE (this issuance)
```

---

**End of document — E-02-HMIR-IA-003 · HMD-006 · v1.0 — 2026-08-28**
