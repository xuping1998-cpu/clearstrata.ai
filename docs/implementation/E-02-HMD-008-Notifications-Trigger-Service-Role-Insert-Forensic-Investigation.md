# E-02 HMD-008 — Notifications Trigger Service-Role Insert Forensic Investigation

## Post-Creation Source Corruption · `20260401140000_notifications_trigger_service_role_insert.sql`

| Field | Value |
|-------|-------|
| **Document Type** | Forensic Investigation Record (governance) — **not** a Program Authority Decision |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Defect** | **HMD-008** |
| **Target** | `supabase/migrations/20260401140000_notifications_trigger_service_role_insert.sql` |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-014.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-014.md) · run `local-014-20260829a` |
| **Status** | **FORENSIC INVESTIGATION COMPLETE** |
| **Classification** | **HISTORICAL SOURCE-INTEGRITY DEFECT** · subtype **POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION** |
| **Effective Date** | 2026-08-29 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-HMD-008-Notifications-Trigger-Service-Role-Insert-Forensic-Investigation.md`](E-02-HMD-008-Notifications-Trigger-Service-Role-Insert-Forensic-Investigation.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized** | **NO** |

> **Authority path finding: YES.** Filename follows the existing HMD forensic-record pattern (`E-02-HMD-007-Announcements-Created-By-Inbox-Fanout-Forensic-Investigation.md`). This is a **forensic investigation record**, not a PAD. **PAD-056 is not allocated. Not invented.** Highest issued HMIC PAD remains **PAD-055**. Highest allocated HMD remains **HMD-007** before this record. **HMD-008 is the next unused identifier.** No HMD-008 existed before this investigation. HMD-008 was **not reserved**. No HMD-009+ exists. **Not a new governance tier.** **Not Implementation Authorization.** **Not a DBA.** **Not LOCAL-015.** **Not a merge into HMD-006 or HMD-007.**

> **Scope lock:** Classifies the LOCAL-014 first-failing migration. This record **does not** restore SQL · **does not** edit the target · **does not** edit HMD-006 / HMD-007 targets · **does not** create reconstruction · **does not** expand quarantine · **does not** retry LOCAL-014 · **does not** issue LOCAL-015 · **does not** issue PAD-056 · **does not** issue HMIR-IA-005 · **does not** run database/Supabase/Docker.

```
HMD-008                                            = OPEN / FORENSIC INVESTIGATION COMPLETE /
                                                       HISTORICAL SOURCE-INTEGRITY DEFECT /
                                                       POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION
TARGET                                             = 20260401140000_notifications_trigger_service_role_insert.sql
CURRENT == ORIGIN                                  = NO
PROVEN ORIGIN                                      = fa89b72a3ffac65593a724cd1194e7c22f7dd397
ORIGIN BLOB                                        = 6eec5c848d60a82d2198d17ebd238f6027e4f710
CURRENT BLOB                                       = 7fcc5f52613989b5204d8991d2b9eeea0c4938d0
CORRUPTING COMMIT                                  = 8c30eb2f657847dc0767201149190eef8d610475
SAME CORRUPTING COMMIT AS HMD-006 / HMD-007        = YES
SAME DEFECT SCOPE AS HMD-006 / HMD-007             = NO
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
LOCAL-014                                          = APPLICATION_FAILED / EVIDENCE IMMUTABLE / NO RETRY
LOCAL-015                                          = NOT ISSUED
HMD-007                                            = OPEN / SOURCE INTEGRITY RESTORED /
                                                       IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-006                                            = OPEN / SOURCE INTEGRITY RESTORED /
                                                       IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-005                                            = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                       IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-003                                            = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                       IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
```

---

## 1. LOCAL-014 evidence gate

Verified against immutable evidence. **No material discrepancy.** Runtime evidence was **not modified**.

| Field | Observed |
|-------|----------|
| LOCAL-014 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Attempts | **1** |
| Retry | **NOT AUTHORIZED** |
| evidenceRunId | `local-014-20260829a` |
| Manifest | `tests/e02/evidence/local-014-20260829a/bcr-replay-manifest.json` |
| Executed | **68** |
| Highest applied | `20260401120000_strata_feed_notifications.sql` |
| First failing | `20260401140000_notifications_trigger_service_role_insert.sql` |
| Executable index | **69** |
| Target reached / applied | **YES / NO** |
| Error | `syntax error at or near "manager"` |
| Preserve/handoff | **NOT REACHED** (`CLEANED_AFTER_FAILURE`) |
| Baseline verifier | **NOT RUN** |
| DATABASE BASELINE VERIFIED | **NO** |

---

## 2. HMD sequence gate

| ID | Pre-this-record allocation | Notes |
|----|----------------------------|-------|
| HMD-001 | **ALLOCATED / OPEN** | demo-data quarantine target |
| HMD-002 | **ALLOCATED** | meeting templates restoration |
| HMD-003 | **ALLOCATED / OPEN** | finance schema-origin reconstruction · runtime pending |
| HMD-004 | **ALLOCATED** | dispute-resolution restoration |
| HMD-005 | **ALLOCATED / OPEN** | enum commit-boundary reconstruction |
| HMD-006 | **ALLOCATED / OPEN** | owner-bulletin restoration · runtime verified |
| HMD-007 | **ALLOCATED / OPEN** | announcements fan-out restoration · runtime verified |
| HMD-008 | **NOT ALLOCATED / NOT RESERVED** before this record | **allocated here** |
| HMD-009+ | **NONE** | no superseding identifier |

```
HIGHEST ALLOCATED HMD BEFORE THIS RECORD = HMD-007
NEXT UNUSED                              = HMD-008
AMBIGUITY                                = NONE
```

---

## 3. HMD-007 / HMD-006 / HMD-005 / HMD-003 preservation

LOCAL-014 proved HMD-007 target `20260331180000_announcements_created_by_inbox_fanout.sql` **REACHED / APPLIED**. Prior error `unterminated quoted string at or near "'"` **NOT REPRODUCED**.

```
HMD-007 = OPEN / DISTINCT / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
```

**Not CLOSED.** Later failure at `20260401140000` does **not** reopen HMD-007.

HMD-006 target `20260331161000_owner_bulletin_notifications.sql` **REACHED / APPLIED**. Prior `物业经理` parser error **NOT REPRODUCED**.

```
HMD-006 = OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
```

HMD-005 reconstruction `20260329102500` and target `20260329103000` **REACHED / APPLIED**. Prior `admin` enum error **NOT REPRODUCED**.

```
HMD-005 = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
```

W2 / April HARD / July S1 **NOT REACHED / NOT APPLIED**.

```
HMD-003 = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
```

---

## 4. Prior sibling-forensic context

HMD-006 forensic record noted same-commit contamination of this exact file (`'业委会'` → `'业委?` in `8c30eb2`) and classified it:

```
FORENSICALLY NOTED / OUT OF HMD-006 SCOPE
```

HMD-007 forensic / PAD-055 / LOCAL-014 DBA preserved the same file as:

```
FORENSICALLY NOTED / OUT OF HMD-007 SCOPE / NOT ALLOCATED / NOT EDITED
```

Those notes are **not** defect allocation, **not** repair authority, **not** PAD authority, and **not** implementation authority. LOCAL-014 is the first runtime reach of this file. This investigation **allocates a distinct defect**.

---

## 5. Target identification

| Item | Value |
|------|--------|
| Path | `supabase/migrations/20260401140000_notifications_trigger_service_role_insert.sql` |
| Timestamp prefix | `20260401140000` |
| Worktree vs HEAD | **CLEAN** (`git status --porcelain` empty for this path; `git hash-object` equals `HEAD`) |
| Current file hash | git blob **`7fcc5f52613989b5204d8991d2b9eeea0c4938d0`** |
| Origin blob | **`6eec5c848d60a82d2198d17ebd238f6027e4f710`** (`fa89b72a`) |
| Encoding | valid UTF-8 · **no BOM** · **no NUL** · HEAD blob **LF-only** (1818 bytes) · on-disk worktree may show four CR bytes only in the four trailing blanks (1822 bytes; porcelain still CLEAN) |
| Failing object | `CREATE OR REPLACE FUNCTION public.notifications_set_author_from_profile()` |
| Top-level statement | **1** (sole executable statement in the file; filename mentions a trigger, but this migration defines only the function) |
| Failing construct | first PL/pgSQL `CASE r … WHEN 'council' THEN <literal>` inside `AS $$` … `$$` |
| First failing lines | **40–41** |
| Second corrupted fragment | **67** (same literal; not the first parser stop) |

BCR applies each migration file as one `client.query(sql)`. Parse/compile fails inside this file; the file is **not** recorded applied.

---

## 6. Failure fragment

Origin (`fa89b72a`, blob `6eec5c84`), L40 and L67:

```sql
      WHEN 'council' THEN '业委会'
```

```sql
    WHEN 'council' THEN '业委会'
```

Current (HEAD / worktree, blob `7fcc5f52`), L40 and L67:

```sql
      WHEN 'council' THEN '业委?
```

```sql
    WHEN 'council' THEN '业委?
```

Minimum current context of the **first** parser stop (L39–L43):

```sql
    NEW.author_role := CASE r
      WHEN 'council' THEN '业委?
      WHEN 'manager' THEN '物业经理'
      ELSE r
    END;
```

This matches LOCAL-014 `failures[0]`: `syntax error at or near "manager"`.

---

## 7. Static parser defect

The failing function body is dollar-quoted (`AS $$` … `$$`, LANGUAGE plpgsql). PostgreSQL still **compiles** the plpgsql body at `CREATE FUNCTION` time. The plpgsql scanner treats `'` as string delimiters inside that body.

Quote-boundary analysis of **current** L40–L41:

1. `THEN '` **opens** string 1.
2. `业委` then ASCII `?` (`U+003F`) remain inside string 1. **No closing `'`** after the damaged council label.
3. Newline, spaces, and `WHEN ` remain inside string 1.
4. The `'` that should **open** `'manager'` **closes string 1**.
5. The identifier `manager` is now a **bare parser token**.
6. PostgreSQL reports **`syntax error at or near "manager"`**.

`manager` is valid intended data (`WHEN 'manager' THEN '物业经理'`). It becomes syntactically visible only because an **earlier** lost closing quote left string 1 open.

This is **lost closing quote after a truncated CJK literal**, not a missing schema object and not a transaction-boundary enum error.

Why LOCAL-014 reports `"manager"` rather than HMD-007’s unterminated-quoted-string: this function has a **following** `'manager'` quote that **closes** the open string, exposing `manager`. HMD-007’s single CASE sat at end-of-body, so the last quote stayed open until `$$`.

Line 67 has the same truncated council label and would also be invalid if the first CASE compiled. It is a **second corrupted fragment in the same file**, not the first parser stop.

---

## 8. Character / code-point findings

HEAD blob L40 / L67 after `THEN ` (current):

| Sequence | Code points |
|----------|-------------|
| opening quote | `U+0027` |
| 业 | `U+4E1A` |
| 委 | `U+59D4` |
| `?` | **`U+003F` QUESTION MARK** |
| *(no closing quote)* | **absent** |

Origin blob L40 / L67 after `THEN `:

| Sequence | Code points |
|----------|-------------|
| opening quote | `U+0027` |
| 业 | `U+4E1A` |
| 委 | `U+59D4` |
| 会 | **`U+4F1A`** |
| closing quote | **`U+0027`** |

```
ENCODING CLASS =
  valid UTF-8 containing literal U+003F
  (not invalid UTF-8 / not decode failure)
```

No BOM. No Unicode curly quotes. The `8c30eb2` edit is consistent with **CJK truncation / replacement** of `会` **and loss of the closing `'`** during an unrelated dashboard commit. **Do not normalize in this task.**

---

## 9. Git origin forensics

| Event | Commit | Date | Effect |
|-------|--------|------|--------|
| **Origin / introduce file** | `fa89b72a3ffac65593a724cd1194e7c22f7dd397` | 2026-03-31 | `feat(api): create-notification with service role, bypass RLS on publish` — **valid** `'业委会'` literals with matching quotes on **both** CASE branches |
| **Corrupting change** | `8c30eb2f657847dc0767201149190eef8d610475` | 2026-04-10 | `fix dashboard + homepage layout + budget rpc` — **replaces** both `'业委会'` with `'业委?` (lost `会` + closing quote); adds four trailing LF blank lines |

```
TARGET ORIGIN COMMIT = fa89b72a3ffac65593a724cd1194e7c22f7dd397
TARGET ORIGIN BLOB   = 6eec5c848d60a82d2198d17ebd238f6027e4f710
CURRENT BLOB         = 7fcc5f52613989b5204d8991d2b9eeea0c4938d0
CURRENT == ORIGIN    = NO
```

Only **two** commits touch this path. Parent of `8c30eb2` for this path **equals origin blob** `6eec5c84`. Current blob **equals** `8c30eb2` blob `7fcc5f52`. **No later commit** altered this file.

**Target affected by `8c30eb2`? YES.** Complete origin↔current difference set (`git diff fa89b72a..HEAD`):

| Location | Origin | Current | Class |
|----------|--------|---------|-------|
| L40 CASE | `THEN '业委会'` | `THEN '业委?` | **parser-relevant corruption** + **semantic corruption** (display label) |
| L67 CASE | `THEN '业委会'` | `THEN '业委?` | **parser-relevant corruption** + **semantic corruption** (same literal; second fragment) |
| EOF | ends after `$$;` | four extra LF blank lines | **whitespace-only** (not the parser stop) |

**No other origin↔current differences.** No comment-only corruption in this file. No unrelated intentional historical edit after origin except `8c30eb2`.

HMD-006 origin `9f9af80a…` and HMD-007 origin `efc3f49e…` **do not** apply to this file. Origin history **differs**. Corrupting commit **is the same** as HMD-006 / HMD-007 (`8c30eb2`).

---

## 10. Hypothesis results

| ID | Hypothesis | Result |
|----|------------|--------|
| **A** | Current source corrupted after proven origin | **SUPPORTED** — origin SQL is valid; `8c30eb2` introduced the malformed literals |
| **B** | Already invalid at proven origin | **REJECTED** — origin contains `'业委会'` with matching quotes on both CASE branches |
| **C** | Transaction-boundary compatibility (HMD-005 pattern) | **REJECTED** — this is a **parse/compile** error; it cannot depend on prior-transaction enum commit state |
| **D** | Missing historical schema prerequisite | **REJECTED** — observed error is not “relation/type/column/function does not exist”; HMD-006 / HMD-007 applied tables/functions are not implicated by this token error |
| Encoding | Invalid UTF-8 as the immediate parser cause | **REJECTED** — valid UTF-8; literal `U+003F` |

---

## 11. Eligibility

| Remedy class | Finding |
|--------------|---------|
| Exact historical source available | **YES** — commit `fa89b72a` · blob `6eec5c84` · exact origin fragments `THEN '业委会'` at L40 and L67 |
| Restoration eligible | **YES** — not performed · not authorized here |
| Reconstruction | **NOT INDICATED** — exact origin exists; HMD-005 reconstruction pattern does not apply |
| Forward-fix as clean-replay remedy | **REJECTED** — this historical file cannot parse, so later migrations (including W2 / April HARD / July S1) cannot be reached |
| Quarantine | **NOT AUTHORIZED** — locked to `20260314195641_add_demo_data.sql` / COUNT 1 |

---

## 12. Classification / distinctness

**HMD-008 = HISTORICAL SOURCE-INTEGRITY DEFECT (POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION).**

Same **class** as HMD-002 / HMD-004 / HMD-006 / HMD-007 (later commit damaged historical SQL). **Different file. Different origin commit.** Same corrupting commit as HMD-006 / HMD-007 **does not** make this the same defect scope. HMD-006 and HMD-007 explicitly left this file out of restoration scope.

| Pair | Relation |
|------|----------|
| vs HMD-001 | **DISTINCT** |
| vs HMD-002 | **DISTINCT** (related class: post-creation literal corruption) |
| vs HMD-003 | **DISTINCT** |
| vs HMD-004 | **DISTINCT** (related class: post-creation literal corruption) |
| vs HMD-005 | **DISTINCT** — HMD-005 runtime proof **stands** |
| vs HMD-006 | **DISTINCT** — different target · different origin · HMD-006 runtime proof **stands** · prior sibling note is **not** this allocation |
| vs HMD-007 | **DISTINCT** — different target · different origin · HMD-007 runtime proof **stands** · prior sibling note is **not** this allocation |

---

## 13. Remediation options (not selected / not authorized)

### OPTION A — EXACT HISTORICAL SOURCE RESTORATION

- **Evidence:** origin `fa89b72a` contains the exact intended literals.
- **Scope (parser-minimum):** restore L40 and L67 `WHEN 'council' THEN '业委会'`.
- **Trailing blanks:** non-semantic; do **not** treat as the defect; do not “clean up” unless a later PAD says otherwise.
- **Historical truth:** restore proven origin text; do not invent SQL.
- **Replay effect:** this file should parse; later migrations remain unproven until a successor DBA.
- **Target changes:** **YES** (literal restore only, if later authorized).
- **New migration:** **NO**.
- **Separate PAD:** **YES** (PAD-032 / HMIC restoration class; **PAD-056 not issued here**).
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

## 14. Locks

```
E-02-DBA-LOCAL-014                 = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-014 ATTEMPTS                 = 1
LOCAL-014 RETRY                    = NOT AUTHORIZED
LOCAL-015                          = NOT ISSUED
HMD-007                            = OPEN / RUNTIME REPLAY VERIFIED / NOT REOPENED
HMD-006                            = OPEN / RUNTIME REPLAY VERIFIED / NOT REOPENED
HMD-005                            = OPEN / RUNTIME REPLAY VERIFIED
HMD-003                            = OPEN / RUNTIME REPLAY VERIFICATION PENDING
DATABASE BASELINE VERIFIED         = NO
PRESERVE/HANDOFF                   = NOT REACHED
BASELINE VERIFIER                  = NOT RUN
RU-1.1 / RU-1.2                    = NOT APPLIED
RU-1.4                             = RUNTIME NOT AUTHORIZED
E02_RUNTIME_EXECUTION_AUTHORIZED   = UNSET / FALSE
EIR / ACCEPTANCE / CERTIFICATION   = NONE / BLOCKED / NOT ISSUED
FINAL COMMIT PATH                  = BLOCKED
REPAIR                             = NOT AUTHORIZED / NOT PERFORMED
NEXT                               = HMD-008 PROGRAM AUTHORITY DECISION
```

---

**End of document — E-02 HMD-008 Forensic Investigation — v1.0 — 2026-08-29**
