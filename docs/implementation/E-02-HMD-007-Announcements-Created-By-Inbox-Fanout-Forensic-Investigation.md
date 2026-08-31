# E-02 HMD-007 — Announcements Created-By Inbox Fan-Out Forensic Investigation

## Post-Creation Source Corruption · `20260331180000_announcements_created_by_inbox_fanout.sql`

| Field | Value |
|-------|-------|
| **Document Type** | Forensic Investigation Record (governance) — **not** a Program Authority Decision |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Defect** | **HMD-007** |
| **Target** | `supabase/migrations/20260331180000_announcements_created_by_inbox_fanout.sql` |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-013.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-013.md) · run `local-013-20260828a` |
| **Status** | **FORENSIC INVESTIGATION COMPLETE** |
| **Classification** | **HISTORICAL SOURCE-INTEGRITY DEFECT** · subtype **POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION** |
| **Effective Date** | 2026-08-28 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-HMD-007-Announcements-Created-By-Inbox-Fanout-Forensic-Investigation.md`](E-02-HMD-007-Announcements-Created-By-Inbox-Fanout-Forensic-Investigation.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized** | **NO** |

> **Authority path finding: YES.** Filename follows the existing HMD forensic-record pattern (`E-02-HMD-006-Owner-Bulletin-Notifications-Forensic-Investigation.md`). This is a **forensic investigation record**, not a PAD. **PAD-055 is not allocated. Not invented.** Highest issued HMIC PAD remains **PAD-054**. Highest allocated HMD remains **HMD-006** before this record. **HMD-007 is the next unused identifier.** No HMD-007 existed before this investigation. HMD-007 was **not reserved**. No HMD-008+ exists. **Not a new governance tier.** **Not Implementation Authorization.** **Not a DBA.** **Not LOCAL-014.** **Not a merge into HMD-006.**

> **Scope lock:** Classifies the LOCAL-013 first-failing migration. This record **does not** restore SQL · **does not** edit the target · **does not** edit `20260401140000…` · **does not** create reconstruction · **does not** expand quarantine · **does not** retry LOCAL-013 · **does not** issue LOCAL-014 · **does not** issue PAD-055 · **does not** issue HMIR-IA-004 · **does not** run database/Supabase/Docker.

```
HMD-007                                            = OPEN / FORENSIC INVESTIGATION COMPLETE /
                                                       HISTORICAL SOURCE-INTEGRITY DEFECT /
                                                       POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION
TARGET                                             = 20260331180000_announcements_created_by_inbox_fanout.sql
CURRENT == ORIGIN                                  = NO
PROVEN ORIGIN                                      = efc3f49e27e48725b1aa097a8402dcb8ca42ffb7
ORIGIN BLOB                                        = ccb99fb4de63a0a0cc79cdbbdba3240ec5c54f1d
CURRENT BLOB                                       = 11fe1e935f4d4eeb3047c3dbac18d78e3caf9f2f
CORRUPTING COMMIT                                  = 8c30eb2f657847dc0767201149190eef8d610475
SAME CORRUPTING COMMIT AS HMD-006                  = YES
SAME DEFECT SCOPE AS HMD-006                       = NO
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
LOCAL-013                                          = APPLICATION_FAILED / EVIDENCE IMMUTABLE / NO RETRY
LOCAL-014                                          = NOT ISSUED
HMD-006                                            = OPEN / SOURCE INTEGRITY RESTORED /
                                                       IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-005                                            = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                       IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
HMD-003                                            = OPEN / RECONSTRUCTION IMPLEMENTED /
                                                       IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
```

---

## 1. LOCAL-013 evidence gate

Verified against immutable evidence. **No material discrepancy.** Runtime evidence was **not modified**.

| Field | Observed |
|-------|----------|
| LOCAL-013 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Attempts | **1** |
| Retry | **NOT AUTHORIZED** |
| evidenceRunId | `local-013-20260828a` |
| Manifest | `tests/e02/evidence/local-013-20260828a/bcr-replay-manifest.json` |
| Executed | **64** |
| Highest applied | `20260331161000_owner_bulletin_notifications.sql` |
| First failing | `20260331180000_announcements_created_by_inbox_fanout.sql` |
| Executable index | **65** |
| Error | `unterminated quoted string at or near "'"` with parser context `ELSE r` / `END;` / `RETURN NEW;` / `END;` |
| Preserve/handoff | **NOT REACHED** (`CLEANED_AFTER_FAILURE`) |
| Baseline verifier | **NOT RUN** |
| DATABASE BASELINE VERIFIED | **NO** |

---

## 2. HMD-006 / HMD-005 / HMD-003 preservation

LOCAL-013 proved HMD-006 target `20260331161000_owner_bulletin_notifications.sql` **REACHED / APPLIED**. Prior error `syntax error at or near "物业经理"` **NOT REPRODUCED**.

```
HMD-006 = OPEN / SOURCE INTEGRITY RESTORED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
```

**Not CLOSED.** Later failure at `20260331180000` does **not** reopen HMD-006.

HMD-005 reconstruction `20260329102500` and target `20260329103000` **REACHED / APPLIED**. Prior `admin` enum error **NOT REPRODUCED**.

```
HMD-005 = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED
```

W2 / April HARD / July S1 **NOT REACHED / NOT APPLIED**.

```
HMD-003 = OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING
```

---

## 3. HMD-006 sibling-note context

HMD-006 forensic record previously noted same-commit contamination of this exact file (`'业委会'` → `'业委?` in `8c30eb2`) and classified it:

```
FORENSICALLY NOTED / OUT OF HMD-006 SCOPE
```

That note is **not** an authorized repair, **not** an HMD-007 allocation, and **not** a merge of this runtime failure into HMD-006. LOCAL-013 is the first runtime reach of this file. This investigation **allocates a distinct defect**.

Sibling `20260401140000_notifications_trigger_service_role_insert.sql` remains **FORENSICALLY NOTED / OUT OF THIS HMD SCOPE / NOT ALLOCATED / NOT EDITED**. If it later becomes the first runtime failure, it may be governed separately.

---

## 4. Target identification

| Item | Value |
|------|--------|
| Path | `supabase/migrations/20260331180000_announcements_created_by_inbox_fanout.sql` |
| Timestamp prefix | `20260331180000` |
| Worktree vs HEAD | **CLEAN** (`git status --porcelain` empty for this path; `git hash-object` equals `HEAD`) |
| Current file hash | git blob **`11fe1e935f4d4eeb3047c3dbac18d78e3caf9f2f`** |
| Origin blob | **`ccb99fb4de63a0a0cc79cdbbdba3240ec5c54f1d`** (`efc3f49e`) |
| Encoding | valid UTF-8 · **no BOM** · **no NUL** · mixed line endings only at trailing blanks (CRLF × 4 at EOF) |
| Failing object | `CREATE OR REPLACE FUNCTION public.notifications_set_author_from_profile()` |
| Failing construct | PL/pgSQL `CASE r … WHEN 'council' THEN <literal>` inside `AS $$` … `$$` |
| Failing line | **70** |

BCR applies each migration file as one `client.query(sql)`. Parse/compile fails inside this file; the file is **not** recorded applied.

---

## 5. Failure fragment

Origin (`efc3f49e`, blob `ccb99fb4`):

```sql
    WHEN 'council' THEN '业委会'
```

Current (HEAD / worktree, blob `11fe1e93`):

```sql
    WHEN 'council' THEN '业委?
```

Surrounding current context (L69–L76), quoted only as needed to match the runtime parser snippet:

```sql
  NEW.author_role := CASE r
    WHEN 'council' THEN '业委?
    WHEN 'manager' THEN '物业经理'
    ELSE r
  END;

  RETURN NEW;
END;
```

This matches LOCAL-013 `failures[0]` context: `ELSE r` / `END;` / `RETURN NEW;` / `END;`.

---

## 6. Static parser defect

The failing function body is dollar-quoted (`AS $$` … `$$`, LANGUAGE plpgsql). PostgreSQL still **compiles** the plpgsql body at `CREATE FUNCTION` time. The plpgsql scanner treats `'` as string delimiters inside that body.

Quote-boundary analysis of **current** L70–L73:

1. `THEN '` **opens** string 1.
2. `业委` then ASCII `?` (`U+003F`) remain inside string 1. **No closing `'`** after the damaged council label.
3. Newline, spaces, and `WHEN ` remain inside string 1.
4. The `'` that should open `'manager'` **closes string 1**.
5. Subsequent `'` pairing is off-by-one.
6. The `'` that should **close** `'物业经理'` instead **opens string N**.
7. No later `'` appears before the body’s `$$`. PostgreSQL reports **unterminated quoted string** at that opening `'`, with following text `ELSE r` / `END;` / `RETURN NEW;` / `END;`.

This is **lost closing quote after a truncated CJK literal**, not a missing schema object and not a transaction-boundary enum error.

---

## 7. Character / code-point findings

HEAD / worktree L70 after `THEN ` (current):

| Sequence | Code points |
|----------|-------------|
| opening quote | `U+0027` |
| 业 | `U+4E1A` |
| 委 | `U+59D4` |
| `?` | **`U+003F` QUESTION MARK** |
| *(no closing quote)* | **absent** |

Origin L70 after `THEN `:

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

## 8. Git origin forensics

| Event | Commit | Date | Effect |
|-------|--------|------|--------|
| **Origin / introduce file** | `efc3f49e27e48725b1aa097a8402dcb8ca42ffb7` | 2026-03-31 | `feat(announcements): author/admin edit, inbox fan-out, banner, collapsible body` — **valid** `'业委会'` literal with matching quotes |
| **Corrupting change** | `8c30eb2f657847dc0767201149190eef8d610475` | 2026-04-10 | `fix dashboard + homepage layout + budget rpc` — **replaces** `'业委会'` with `'业委?` (lost `会` + closing quote); adds trailing CRLF blanks |

```
TARGET ORIGIN COMMIT = efc3f49e27e48725b1aa097a8402dcb8ca42ffb7
TARGET ORIGIN BLOB   = ccb99fb4de63a0a0cc79cdbbdba3240ec5c54f1d
CURRENT BLOB         = 11fe1e935f4d4eeb3047c3dbac18d78e3caf9f2f
CURRENT == ORIGIN    = NO
```

HMD-006 origin commit `9f9af80a…` **does not** apply to this file. Origin history **differs**. Corrupting commit **is the same** as HMD-006 (`8c30eb2`). Parent of `8c30eb2` for this path **equals origin blob** `ccb99fb4`. Current blob **equals** `8c30eb2` blob `11fe1e93`. No later commit altered this file.

**Target affected by `8c30eb2`? YES.** Exact affected fragments:

| Location | Origin | Current | Class |
|----------|--------|---------|-------|
| L70 CASE | `THEN '业委会'` | `THEN '业委?` | **parser-relevant corruption** + **semantic corruption** (display label) |
| EOF | single LF after `);` | four extra CRLF blank lines | **whitespace-only** (not the parser stop) |

**No other origin↔current differences.** No comment-only corruption in this file. No unrelated intentional historical edit after origin except `8c30eb2`.

---

## 9. Hypothesis results

| ID | Hypothesis | Result |
|----|------------|--------|
| **A** | Current source corrupted after proven origin | **SUPPORTED** — origin SQL is valid; `8c30eb2` introduced the malformed literal |
| **B** | Already invalid at proven origin | **REJECTED** — origin contains `'业委会'` with matching quotes |
| **C** | Transaction-boundary compatibility (HMD-005 pattern) | **REJECTED** — this is a **parse/compile** error; it cannot depend on prior-transaction enum commit state |
| **D** | Missing historical schema prerequisite | **REJECTED** — observed error is not “relation/type/column/function does not exist”; prior `ALTER TABLE public.notifications` / HMD-006 applied table are not implicated by this token error |
| Encoding | Invalid UTF-8 as the immediate parser cause | **REJECTED** — valid UTF-8; literal `U+003F` |

---

## 10. Eligibility

| Remedy class | Finding |
|--------------|---------|
| Exact historical source available | **YES** — commit `efc3f49e` · blob `ccb99fb4` · exact origin fragment `THEN '业委会'` |
| Restoration eligible | **YES** — not performed · not authorized here |
| Reconstruction | **NOT INDICATED** — exact origin exists; HMD-005 reconstruction pattern does not apply |
| Forward-fix as clean-replay remedy | **REJECTED** — this historical file cannot parse, so later migrations (including W2 / April HARD / July S1) cannot be reached |
| Quarantine | **NOT AUTHORIZED** — locked to `20260314195641_add_demo_data.sql` / COUNT 1 |

---

## 11. Classification / distinctness

**HMD-007 = HISTORICAL SOURCE-INTEGRITY DEFECT (POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION).**

Same **class** as HMD-002 / HMD-004 / HMD-006 (later commit damaged historical SQL). **Different file. Different origin commit.** Same corrupting commit as HMD-006 **does not** make this the same defect scope. HMD-006 explicitly left this file out of restoration scope.

| Pair | Relation |
|------|----------|
| vs HMD-001 | **DISTINCT** |
| vs HMD-002 | **DISTINCT** (related class: post-creation literal corruption) |
| vs HMD-003 | **DISTINCT** |
| vs HMD-004 | **DISTINCT** (related class: post-creation literal corruption) |
| vs HMD-005 | **DISTINCT** — HMD-005 runtime proof **stands** |
| vs HMD-006 | **DISTINCT** — different target · different origin · HMD-006 runtime proof **stands** · prior sibling note is **not** this allocation |

---

## 12. Remediation options (not selected / not authorized)

### OPTION A — EXACT HISTORICAL SOURCE RESTORATION

- **Evidence:** origin `efc3f49e` contains the exact intended literal.
- **Scope (parser-minimum):** restore L70 `WHEN 'council' THEN '业委会'`.
- **Trailing blanks:** non-semantic; do **not** treat as the defect; do not “clean up” unless a later PAD says otherwise.
- **Historical truth:** restore proven origin text; do not invent SQL.
- **Replay effect:** this file should parse; later sibling `20260401140000` may still fail if unchanged.
- **Target changes:** **YES** (literal restore only, if later authorized).
- **New migration:** **NO**.
- **Separate PAD:** **YES** (PAD-032 / HMIC restoration class; **PAD-055 not issued here**).
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

## 13. Locks

```
E-02-DBA-LOCAL-013                 = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-013 ATTEMPTS                 = 1
LOCAL-013 RETRY                    = NOT AUTHORIZED
LOCAL-014                          = NOT ISSUED
HMD-006                            = OPEN / RUNTIME REPLAY VERIFIED / NOT REOPENED
HMD-005                            = OPEN / RUNTIME REPLAY VERIFIED
HMD-003                            = OPEN / RUNTIME REPLAY VERIFICATION PENDING
20260401140000                     = FORENSICALLY NOTED / OUT OF THIS HMD SCOPE / NOT ALLOCATED
DATABASE BASELINE VERIFIED         = NO
PRESERVE/HANDOFF                   = NOT REACHED
BASELINE VERIFIER                  = NOT RUN
RU-1.1 / RU-1.2                    = NOT APPLIED
RU-1.4                             = RUNTIME NOT AUTHORIZED
E02_RUNTIME_EXECUTION_AUTHORIZED   = UNSET / FALSE
EIR / ACCEPTANCE / CERTIFICATION   = NONE / BLOCKED / NOT ISSUED
FINAL COMMIT PATH                  = BLOCKED
REPAIR                             = NOT AUTHORIZED / NOT PERFORMED
NEXT                               = HMD-007 PROGRAM AUTHORITY DECISION
```

---

**End of document — E-02 HMD-007 Forensic Investigation — v1.0 — 2026-08-28**
