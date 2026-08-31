# E-02 HMD-006 — Owner Bulletin Notifications Forensic Investigation

## Post-Creation Source Corruption · `20260331161000_owner_bulletin_notifications.sql`

| Field | Value |
|-------|-------|
| **Document Type** | Forensic Investigation Record (governance) — **not** a Program Authority Decision |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Defect** | **HMD-006** |
| **Target** | `supabase/migrations/20260331161000_owner_bulletin_notifications.sql` |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-012.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-012.md) · run `local-012-20260828a` |
| **Status** | **FORENSIC INVESTIGATION COMPLETE** |
| **Classification** | **HISTORICAL SOURCE-INTEGRITY DEFECT** · subtype **POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION** |
| **Effective Date** | 2026-08-28 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-HMD-006-Owner-Bulletin-Notifications-Forensic-Investigation.md`](E-02-HMD-006-Owner-Bulletin-Notifications-Forensic-Investigation.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized** | **NO** |

> **Authority path finding: YES.** Filename follows the existing HMD-named governance-record pattern (`E-02-HMD-003-Historical-Finance-Schema-Origin-Reconstruction-Design.md`). This is a **forensic investigation record**, not a PAD. **PAD-054 is not allocated. Not invented.** Highest issued HMIC/HFSO PAD remains **PAD-053**. Highest allocated HMD remains **HMD-005** before this record. **HMD-006 is the next unused identifier.** No HMD-006 existed before this investigation. **Not a new governance tier.** **Not Implementation Authorization.** **Not a DBA.** **Not LOCAL-013.**

> **Scope lock:** Classifies the LOCAL-012 first-failing migration. This record **does not** restore SQL · **does not** edit the target · **does not** create reconstruction · **does not** expand quarantine · **does not** retry LOCAL-012 · **does not** issue LOCAL-013 · **does not** issue PAD-054 · **does not** issue HMIR-IA-003 · **does not** run database/Supabase/Docker.

```
HMD-006                                            = OPEN / FORENSIC INVESTIGATION COMPLETE /
                                                       HISTORICAL SOURCE-INTEGRITY DEFECT /
                                                       POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION
TARGET                                             = 20260331161000_owner_bulletin_notifications.sql
CURRENT == ORIGIN                                  = NO
PROVEN ORIGIN                                      = 9f9af80a2b5b8b3c84e2ddd4942fc07ef3379de7
CORRUPTING COMMIT                                  = 8c30eb2f657847dc0767201149190eef8d610475
EXACT HISTORICAL SOURCE AVAILABLE                  = YES
SOURCE CORRUPTION                                  = SUPPORTED
ORIGINAL-DESIGN PARSER DEFECT                      = REJECTED
TRANSACTION-BOUNDARY HYPOTHESIS                    = REJECTED
MISSING-PREREQUISITE HYPOTHESIS                    = REJECTED
RESTORATION ELIGIBLE                               = YES (NOT PERFORMED)
RECONSTRUCTION                                     = NOT INDICATED
FORWARD-FIX AS CLEAN-REPLAY REMEDY                 = REJECTED
QUARANTINE                                         = NOT AUTHORIZED
PROGRAM AUTHORITY                                  = NOT ISSUED
IMPLEMENTATION AUTHORITY                           = NOT ISSUED
LOCAL-012                                          = APPLICATION_FAILED / EVIDENCE IMMUTABLE / NO RETRY
HMD-005                                            = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                       IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-003                                            = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                       IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
```

---

## 1. LOCAL-012 evidence gate

Verified against immutable evidence. **No material discrepancy.**

| Field | Observed |
|-------|----------|
| LOCAL-012 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Attempts | **1** |
| evidenceRunId | `local-012-20260828a` |
| Executed | **63** |
| Highest applied | `20260331150000_activation_profiles_status_rls.sql` |
| First failing | `20260331161000_owner_bulletin_notifications.sql` |
| Error | `syntax error at or near "物业经理"` |
| Preserve/handoff | **NOT REACHED** (`CLEANED_AFTER_FAILURE`) |
| Baseline verifier | **NOT RUN** |
| Retry | **NOT AUTHORIZED** |

---

## 2. HMD-005 / HMD-003 preservation

LOCAL-012 proved HMD-005 reconstruction `20260329102500` and target `20260329103000` **REACHED / APPLIED**. Prior error `unsafe use of new value "admin" of enum type user_role` **NOT REPRODUCED**.

```
HMD-005 = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
```

**Not CLOSED.** Later failure does **not** reopen HMD-005.

W2 / April HARD / July S1 **NOT REACHED**.

```
HMD-003 = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
```

---

## 3. Target identification

| Item | Value |
|------|--------|
| Path | `supabase/migrations/20260331161000_owner_bulletin_notifications.sql` |
| Timestamp prefix | `20260331161000` |
| Worktree vs HEAD | **CLEAN** (`git status --porcelain` empty for this path; `git hash-object` equals `HEAD`) |
| Current file hash | git blob **`4c8c7063f5430d608358f1e38df3c25c52d3a0ef`** |
| Origin blob | `2c3d63b2d0e2598f3df64f2a0fce341e8a886d35` (`9f9af80a`) |
| Statement count | **21** top-level statements (2× `DO` · `CREATE TABLE` · `CREATE INDEX` · `ALTER TABLE` · 2× `CREATE FUNCTION` · 2× `DROP TRIGGER` · 2× `CREATE TRIGGER` · 4× `DROP POLICY` · 4× `CREATE POLICY` · 2× `GRANT`). Naive `;` count is 41 because inner PL/pgSQL / policy SQL also uses semicolons. |
| Failing statement | `CREATE TABLE IF NOT EXISTS public.notifications` · `CONSTRAINT notifications_author_role_display_check` |
| Failing line | **52** |

BCR applies each migration file as one `client.query(sql)`. Parse fails inside this file; the file is **not** recorded applied.

---

## 4. Token `物业经理` — occurrences

| Line | Construct | Context | Parser status |
|------|-----------|---------|----------------|
| **52** | `CHECK (author_role IN ('业委?, '物业经理'))` | table constraint; intended two single-quoted literals | **FAILING OCCURRENCE** — after the second `'`, `物业经理` is a **bare SQL token** |
| **89** | `WHEN 'manager' THEN '物业经理'` | inside `AS $$` … `$$` function body | well-formed quoted literal; **not reached** because CREATE TABLE fails first |

Comments also contain damaged CJK (`title_en, ?.` · `防伪?`) and do **not** drive this parser error.

The error text `syntax error at or near "物业经理"` matches **line 52**, not line 89.

---

## 5. Static parser defect

Intended origin (commit `9f9af80a`):

```sql
CHECK (author_role IN ('业委会', '物业经理'))
```

Current executable text:

```sql
CHECK (author_role IN ('业委?, '物业经理'))
```

Quote-boundary analysis of the current CHECK list:

1. `'` opens string 1.
2. `业委` then `?` remain inside string 1 (**no closing quote** after the damaged council label).
3. `, ` remain inside string 1.
4. The `'` before `物业经理` **closes string 1**.
5. `物业经理` is therefore **unquoted**.
6. PostgreSQL reports `syntax error at or near "物业经理"`.

This is a **malformed / truncated first literal**, not a missing schema object and not a transaction-boundary enum error.

Line 88 has the same truncated council label inside PL/pgSQL (`THEN '业委?`) and would also be invalid if the CREATE TABLE succeeded. It is a **second corrupted fragment in the same file**, not the first parser stop.

---

## 6. Git origin forensics

| Event | Commit | Date | Effect |
|-------|--------|------|--------|
| **Origin / introduce file** | `9f9af80a2b5b8b3c84e2ddd4942fc07ef3379de7` | 2026-03-31 | `feat(owner-info): add strata notices board with Supabase RLS` — **valid** `'业委会'` literals |
| **Corrupting change** | `8c30eb2f657847dc0767201149190eef8d610475` | 2026-04-10 | `fix dashboard + homepage layout + budget rpc` — **replaces** `'业委会'` with `'业委?` in this file (and sibling notification migrations); also damages two comment CJK sequences; adds trailing blanks |

```
ORIGIN COMMIT     = 9f9af80a2b5b8b3c84e2ddd4942fc07ef3379de7
CURRENT == ORIGIN = NO
```

**Material parser-relevant differences** (`git diff 9f9af80a..HEAD` on this file):

| Location | Origin | Current |
|----------|--------|---------|
| L4 comment | `title_en, …).` | `title_en, ?.` |
| L10 comment | `(防伪造)` | `(防伪?` |
| L52 CHECK | `IN ('业委会', '物业经理')` | `IN ('业委?, '物业经理')` |
| L88 CASE | `THEN '业委会'` | `THEN '业委?` |
| EOF | no extra blanks | trailing blank lines added |

Application display copy still uses **`业委会`** (`src/pages/owner-info/OwnerNotificationsSection.tsx`). That is **not** historical SQL origin; it corroborates intended display text only (**INFERRED WITH EVIDENCE**).

---

## 7. Hypothesis results

| ID | Hypothesis | Result |
|----|------------|--------|
| **A** | Current source corrupted after proven origin | **SUPPORTED** — origin SQL is valid; `8c30eb2` introduced the malformed literals |
| **B** | Already invalid at proven origin | **REJECTED** — origin contains `'业委会'` with matching quotes |
| **C** | Transaction-boundary compatibility (HMD-005 pattern) | **REJECTED** — this is a **parse** error; it cannot depend on prior-transaction enum commit state |
| **D** | Missing historical schema prerequisite | **REJECTED** — observed error is not “relation/type/column/function does not exist” |
| Encoding | Invalid UTF-8 / smart quotes / BOM as the immediate parser cause | **NOT THE IMMEDIATE CAUSE** — HEAD blob is valid UTF-8 without BOM. Line 52 fragment `IN ('业委?, '物业经理')` codepoints after `IN (` are `U+0027` `U+4E1A` `U+59D4` **`U+003F QUESTION MARK`** `U+002C` `U+0020` `U+0027` then `物业经理` `U+0027`. There is **no** closing quote after the damaged council label. Unicode curly quotes / BOM / invalid UTF-8 are **not** present. The `8c30eb2` edit is consistent with **CJK truncation / replacement** of `会` (and comment `…` / `造`) by ASCII `?` during an unrelated dashboard commit. **Do not normalize in this task.** |

Same-commit sibling contamination (**not this HMD target**): `20260331180000_announcements_created_by_inbox_fanout.sql` and `20260401140000_notifications_trigger_service_role_insert.sql` also lost `'业委会'` → `'业委?` in `8c30eb2`. They were **not reached**. Successor Program Authority **may** consider them; this forensic ID **does not expand** HMD-006’s target.

---

## 8. Eligibility

| Remedy class | Finding |
|--------------|---------|
| Exact historical source available | **YES** — commit `9f9af80a` · blobs above |
| Restoration eligible | **YES** — not performed |
| Reconstruction | **NOT INDICATED** — exact origin exists; HMD-005 reconstruction pattern does not apply |
| Forward-fix as clean-replay remedy | **REJECTED** — this historical file cannot parse, so later migrations cannot be reached |
| Quarantine | **NOT AUTHORIZED** — locked to `20260314195641_add_demo_data.sql` / COUNT 1 |

---

## 9. Classification / distinctness

**HMD-006 = HISTORICAL SOURCE-INTEGRITY DEFECT (POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION).**

Same **class** as HMD-002 / HMD-004 (later commit damaged historical SQL). **Different file.** Not HMD-001 (demo quarantine). Not HMD-003 (finance schema-origin). Not HMD-005 (origin-valid enum commit-boundary).

| Pair | Relation |
|------|----------|
| vs HMD-001 | **DISTINCT** |
| vs HMD-002 | **DISTINCT** (related class: post-creation literal corruption) |
| vs HMD-003 | **DISTINCT** |
| vs HMD-004 | **DISTINCT** (related class: post-creation literal corruption) |
| vs HMD-005 | **DISTINCT** — HMD-005 runtime proof **stands** |

---

## 10. Remediation options (not selected / not authorized)

### OPTION A — EXACT HISTORICAL SOURCE RESTORATION

- **Evidence:** origin `9f9af80a` contains the exact intended literals.
- **Scope (parser-minimum):** restore L52 `IN ('业委会', '物业经理')` and L88 `THEN '业委会'`. Comment L4/L10 restorations match origin integrity (HMD-002/004 style) but are not required for this parse error.
- **Trailing blanks:** non-semantic; do **not** treat as the defect; do not “clean up” unless a later PAD says otherwise.
- **Historical truth:** restore proven origin text; do not invent SQL.
- **Replay effect:** this file should parse; later sibling `'业委?` copies may still fail if unchanged.
- **Risk:** file-specific restore leaves `20260331180000` / `20260401140000` contaminated until separately decided.
- **Target changes:** **YES** (literal restore only, if later authorized).
- **New migration:** **NO**.
- **Separate PAD:** **YES** (PAD-032 / HMIC restoration class; **PAD-054 not issued here**).
- **Separate IA:** **YES** (future HMIR-class IA; **not issued**).

### OPTION B — GOVERNED COMPATIBILITY RECONSTRUCTION

**NOT INDICATED.** Exact origin exists. Do not force HMD-005’s model.

### OPTION C — OTHER

**NOT SELECTED.** No replay-engine or quarantine remedy is supported.

```
FORENSIC RECOMMENDATION = OPTION A
PROGRAM AUTHORITY       = NOT ISSUED
IMPLEMENTATION AUTHORITY = NOT ISSUED
RUNTIME SUCCESSOR       = NOT ISSUED
```

---

## 11. Locks

```
E-02-DBA-LOCAL-012                 = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-012 ATTEMPTS                 = 1
LOCAL-012 RETRY                    = NOT AUTHORIZED
LOCAL-013                          = NOT ISSUED
DATABASE BASELINE VERIFIED         = NO
RU-1.1 / RU-1.2                    = NOT APPLIED
RU-1.4                             = RUNTIME NOT AUTHORIZED
EIR / ACCEPTANCE / CERTIFICATION   = NONE / BLOCKED / NOT ISSUED
FINAL COMMIT PATH                  = BLOCKED
NEXT                               = HMD-006 PROGRAM AUTHORITY DECISION
```

---

**End of document — E-02 HMD-006 Forensic Investigation — v1.0 — 2026-08-28**
