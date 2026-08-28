# E-02 — Historical Migration Integrity Restoration — Implementation Authorization

| Field | Value |
|-------|-------|
| **Document Type** | **Implementation Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-HMIR-IA** |
| **Policy authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) (**PAD-039 – PAD-050** · HMIC-001 – HMIC-012) |
| **Defect** | **HMD-002** |
| **Status** | **Approved With Conditions** |
| **Authority Level** | Implementation Authorization (repository forensic restoration only) |
| **Effective Date** | 2026-08-23 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md) |
| **Production Effect** | **None** |

> **Authority path finding:** `E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md` is **authority-safe** as an **Implementation Authorization** in the established E-02 IA class (`E-02-*-Implementation-Authorization.md`), matching PAD-049’s proposed family and ID **`E-02-HMIR-IA`**. It is **not** a new Program Authority tier, **not** a new PAD, **not** a DBA, **not** a BCR IA, **not** a quarantine authorization, and **not** a migration-repair authorization.

> **Document class:** Bounded **repository forensic restoration** authorization only. This record **does not** restore the file · **does not** apply migrations · **does not** run BCR · **does not** issue LOCAL-005 · **does not** authorize RU-1.4.

```
FORENSIC RESTORATION IMPLEMENTATION AUTHORIZATION = E-02-HMIR-IA
DECISION                                          = APPROVED WITH CONDITIONS
PAD-039 – PAD-050                                 = POLICY CONSUMED (implementation not performed)
SELECTED POLICY                                   = FORENSIC HISTORICAL SOURCE-INTEGRITY RESTORATION
OPTION B                                          = NOT SELECTED / NOT AUTHORIZED
TARGET                                            = supabase/migrations/20260315035847_add_meeting_templates_and_attachments.sql
AUTHORIZED RESTORATIONS                           = EXACTLY SIX LITERALS
SOURCE OF TRUTH                                   = bc48068 (pre-8c30eb2 original legal content)
RESTORATION EXECUTED                              = NO
HMD-002                                           = OPEN / RESTORATION IMPLEMENTATION AUTHORIZED
HMD-001                                           = OPEN
QUARANTINE                                        = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
BCR REDESIGN                                      = NOT REQUIRED / NOT AUTHORIZED
LOCAL-004                                         = NOT SUCCESSFULLY CONSUMED / IMMUTABLE
LOCAL-005                                         = REQUIRED AFTER COMPLETION / NOT ISSUED
THIS IA                                           ≠ DBA · ≠ BCR IA · ≠ PAD · ≠ REA
```

---

## 1. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) | **Direct policy authority** — PAD-039 – PAD-050 · Option A · HMD-002 |
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | PAD-026 – PAD-038 · single DATA_ONLY quarantine · HMD-001 (not reopened) |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011 – PAD-025 · successor DBA after Completion |
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) | PAD-008 immutability of governance records · PAD-009 E-04 |
| [`E-02-Database-Application-Authorization-LOCAL-004.md`](E-02-Database-Application-Authorization-LOCAL-004.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md) | LOCAL-004 **APPLICATION_FAILED** · evidence **immutable** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md) | BCR IA-003 — **not modified**; quarantine/allowlist **out of scope** |
| Git (read-only, this issuance) | HEAD `afc7a296…` · blob `e27f58f5…` · original `bc48068` · corruption `8c30eb2` |

**This IA consumes PAD-039 – PAD-050 for implementation authorization only.** Restoration is **not performed** in this issuance task.

---

## 2. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-HMIR-IA** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Authorized future action** | Forensic restore of **exactly six** corrupted SQL string literals to `bc48068` content |
| **Not authorized** | Rewrite · repair · second quarantine · BCR change · LOCAL-005 · DB/Supabase/Docker · RU-1.4 |
| **Execution this task** | **NOT PERFORMED** |

---

## 3. Purpose

Authorize **one future** repository task:

```
CURRENT CORRUPTED CONTENT  →  EXACT PROVEN ORIGINAL CONTENT FROM bc48068
```

Purpose = **FORENSIC HISTORICAL SOURCE-INTEGRITY RESTORATION**.

**Not:** rewrite · modernization · refactor · cleanup · SQL improvement · encoding normalization · `migration repair` · compatibility migration · quarantine expansion · schema redesign · data correction.

---

## 4. Defect

| Field | Value |
|-------|-------|
| **ID** | **HMD-002** |
| **Status (this issuance)** | **OPEN / RESTORATION IMPLEMENTATION AUTHORIZED** |
| **Classification** | HISTORICAL SQL SYNTAX DEFECT + HISTORICAL ENCODING/TRUNCATION DEFECT |
| **Also** | POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION · MIXED SCHEMA + DATA |
| **Provenance** | `bc48068` = valid originals · `8c30eb2` = corruption introduced · HEAD retains corrupted form |
| **HMD-001** | **OPEN** · **DISTINCT** · still `20260314195641_add_demo_data.sql` |

HMD-002 **must not** be marked CLOSED merely because the six literals are later edited. After repository restoration: **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING**. Final runtime disposition requires a later authorized fresh replay.

---

## 5. Git provenance verification (this issuance — read-only)

Verified 2026-08-23 against the repository (not memory):

| Check | Result |
|-------|--------|
| Working tree of target file | **CLEAN** (`git status` empty) |
| HEAD | `afc7a29630cdbc4bfbdd5eaebb4bc8842663176e` |
| Current blob | `e27f58f59eb4e356e09bf99e3ed71b3c3ac9c435` |
| Original commit | `bc48068` — six literals **closed** |
| Corruption commit | `8c30eb2f657847dc0767201149190eef8d610475` (parent `e416372b…`) — six endings `…?,` |
| Six before/after pairs | **MATCH** prior forensic finding and PAD-039 table |

**No discrepancy.** Issuance of executable restoration authority **may proceed**.

---

## 6. Exact authorized file scope (future implementation)

**May modify:**

1. `supabase/migrations/20260315035847_add_meeting_templates_and_attachments.sql`
2. `docs/implementation/README.md` (minimal)

**This issuance task** creates only this IA and updates README. **No other path.**

**Prohibited paths:** any other migration · `src/**` · BCR artifact · verifier · `environment-guard.ts` · `package.json` / lockfile · `supabase/config.toml` · tests/harness · other governance docs except the separately sequenced Completion.

---

## 7. Exact six restorations (locked from Git)

Indentation (`    `) is part of the existing line and **must be preserved**. Only the SQL literal body + its closing quote change as shown.

| # | Line | Current HEAD (corrupted) | Restore to (`bc48068`) |
|---|------|--------------------------|------------------------|
| 1 | **118** | `'所有业主参加的年度会议，审查年度绩效并选举业委会成?,` | `'所有业主参加的年度会议，审查年度绩效并选举业委会成员',` |
| 2 | **124** | `'业委会会?,` | `'业委会会议',` |
| 3 | **126** | `'业委会定期会议，讨论和决定小区事?,` | `'业委会定期会议，讨论和决定小区事务',` |
| 4 | **134** | `'为需要业主批准的紧急或特定事项召开的特别会?,` | `'为需要业主批准的紧急或特定事项召开的特别会议',` |
| 5 | **140** | `'紧急会?,` | `'紧急会议',` |
| 6 | **142** | `'需要紧急处理的即时问题的紧急会?,` | `'需要紧急处理的即时问题的紧急会议',` |

Byte-level endings (UTF-8): corrupted `3F 2C` (`?,`) → original final CJK + `27 2C` (`',`).

**Count = 6.** No seventh restoration.

---

## 8. Byte / content preservation rule

Authorized transformation:

```
CURRENT CORRUPTED CONTENT → EXACT PROVEN ORIGINAL CONTENT FROM bc48068
```

**Only** the six proven literal corruptions.

**Prohibit:** whitespace cleanup outside required bytes · indentation change · line reorder · SQL reformatting · quote-style normalization · CRLF/LF normalization as a side effect · BOM add/remove · whole-file encoding conversion · trailing-whitespace cleanup · comment/header edit · timestamp/name change · seed redesign · schema/policy/index/table/column change · English strings · `E'…'` agendas · `DO $$` blocks · unrelated Chinese text.

If the editor would rewrite unrelated bytes: **STOP** and use a byte-preserving / minimal method.

---

## 9. Pre-restoration gate (mandatory, read-only)

Future implementation **must** prove before any edit:

| ID | Check |
|----|--------|
| A | Target path exact |
| B | Timestamp/name `20260315035847_add_meeting_templates_and_attachments.sql` unchanged |
| C | Current six corrupted values still match §7 |
| D | `bc48068` still contains the six valid originals in §7 |
| E | Target file has **no** unrelated working-tree modification |
| F | Quarantine remains exactly `20260314195641_add_demo_data.sql` · count = 1 |
| G | PAD-039–050 and this IA have not been superseded |

Any mismatch: **STOP → governance.** No best-effort restoration.

---

## 10. Post-restoration exact-diff gate

After edit, **before** Completion:

Inspect the exact Git diff of the target migration.

**Required:**

- exactly one historical migration file changed
- exactly six forensic literal restorations
- no other content change
- each restored value equals the `bc48068` counterpart

**Any seventh change or unrelated byte/text: FAIL / STOP.** Do not silently correct.

---

## 11. Static validation (authorized after restore)

**Allowed:** source inspection · lexical quote validation · UTF-8 / BOM / NUL inspection · Git diff / show / blame / log · repository search · parser/static syntax check **only if it does not connect to a DB** · `npm run build` if DB-free.

**Not allowed:** DB connection · `psql` · `supabase start` / `db reset` / migration execution · BCR `--apply` · LOCAL-005 · baseline verifier against a DB · RU-1.4 tests.

Completion **must not** claim runtime SQL execution.

---

## 12. Historical immutability reconciliation

Historical migration immutability remains the **default** governance rule.

This IA does **NOT** establish a general right to edit historical migrations.

PAD-039–050 created a **narrowly bounded exception** for forensic restoration of **proven post-creation corruption**.

Therefore:

- semantic historical migration edits remain **prohibited**
- arbitrary syntax repair remains **prohibited**
- inferred intended text remains **prohibited**
- reconstruction from current business requirements remains **prohibited**
- **only** Git-proven original source restoration is authorized

This exception applies **only** to **HMD-002** and this **exact file / six literals**.

---

## 13. Quarantine boundary

```
quarantinedMigrations = [ 20260314195641_add_demo_data.sql ]
quarantineCount       = 1
baselineMode          = E02_DECLARED_BASELINE_REPLAY   (UNCHANGED)
```

This restoration **MUST NOT**: add `20260315035847_…` to quarantine · remove the existing quarantine · create a second compatibility exception · modify the BCR allowlist · modify baseline mode.

---

## 14. Option B

```
OPTION B = NOT SELECTED / NOT AUTHORIZED
```

`20260315035847_…` is **MIXED SCHEMA + DATA** and contains unrecreated schema objects. Skipping it is **not** semantically equivalent to forensic restoration. This IA **must not** be interpreted as permission to skip the file.

---

## 15. BCR / DBA / verifier

| Item | Status |
|------|--------|
| BCR architecture | **NO REDESIGN REQUIRED** |
| BCR artifact | **NO CHANGE AUTHORIZED** |
| Baseline verifier | **NO CHANGE AUTHORIZED** |
| LOCAL-004 | **FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE EVIDENCE** — do not retry |
| LOCAL-005 | **REQUIRED AFTER restoration Completion** — **NOT ISSUED** by this IA |

---

## 16. Successor Completion

Authority-safe path (IA / Completion precedent: `E-02-*-Implementation-Completion.md`; PAD-049 family):

```
docs/implementation/E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion.md
```

**Not created now.**

The Completion may certify **only**: exact authorized restoration · exact six-change diff · `bc48068` equality for restored values · no unrelated changes · static validation.

It **must not** certify: DB replay · baseline · RU-1.4 · EIR · Runtime COMMITTED · Acceptance · Certification.

---

## 17. Success conditions (future implementation)

All must hold:

1. Correct migration file only  
2. Exactly six corruptions restored  
3. Every restored value proven from `bc48068`  
4. No inferred / new wording  
5. No seventh textual change  
6. Path / timestamp unchanged  
7. File remains valid UTF-8  
8. No BOM / NUL introduced  
9. SQL literal structure statically valid  
10. Quarantine unchanged at count 1  
11. BCR source unchanged  
12. Verifier unchanged  
13. Package files unchanged  
14. No DB / Supabase / Docker execution  
15. HMD-001 remains OPEN  
16. HMD-002 not falsely runtime-closed  
17. LOCAL-004 evidence untouched  
18. RU-1.4 remains unauthorized  

---

## 18. Failure conditions (STOP → governance)

- `bc48068` evidence differs  
- more than six corruptions required  
- another malformed SQL area would need editing  
- restoration requires schema redesign  
- exact original content cannot be proven  
- editing changes unrelated bytes/content  
- target file already has unrelated working-tree changes  
- quarantine would need expansion  
- BCR would need redesign  
- runtime DB action appears necessary to prove restoration correctness  

**No scope expansion inside implementation.**

---

## 19. Governance status after this issuance

```
E-02-HMIR-IA     = APPROVED WITH CONDITIONS / NOT YET CONSUMED
HMD-002          = OPEN / RESTORATION IMPLEMENTATION AUTHORIZED
HMD-001          = OPEN
Quarantine       = EXACTLY 20260314195641_add_demo_data.sql / COUNT 1
LOCAL-004        = FAILED / NOT SUCCESSFULLY CONSUMED / IMMUTABLE
LOCAL-005        = REQUIRED AFTER RESTORATION COMPLETION / NOT ISSUED
BCR              = NO REDESIGN REQUIRED
RU-1.4           = RUNTIME NOT AUTHORIZED
EIR PASS         = NONE
Runtime COMMITTED = NOT CERTIFIED
Final COMMIT path = BLOCKED
```

---

## 20. Exact next action

```
NEXT = IMPLEMENT FORENSIC RESTORATION UNDER E-02-HMIR-IA
```

Then: Restoration Completion → successor DBA (LOCAL-005 family) → fresh CB-B replay → baseline verifier → new evidence → REA **only if** `APPLIED_AND_BASELINE_VERIFIED`.

**Not this task.**

---

## 21. Confirmation — this issuance

No migration edit · no restoration · no DB/Supabase/Docker · no BCR `--apply` · no LOCAL-005 · no Completion · no REA · no quarantine/BCR/verifier/package change. Only this record and [`README.md`](README.md) were written.

---

## 22. Lock statement

```
E-02-HMIR-IA                         = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PAD-039 – PAD-050                    = POLICY AUTHORITY (CONSUMED FOR IA ISSUANCE)
DECISION                             = APPROVED WITH CONDITIONS
RESTORATION                          = AUTHORIZED / NOT EXECUTED
TARGET                               = 20260315035847_add_meeting_templates_and_attachments.sql
AUTHORIZED RESTORATIONS              = 6
SOURCE OF TRUTH                      = bc48068
HMD-002                              = OPEN / RESTORATION IMPLEMENTATION AUTHORIZED
HMD-001                              = OPEN
QUARANTINE                           = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
OPTION B                             = NOT AUTHORIZED
BCR REDESIGN                         = NOT REQUIRED
LOCAL-004                            = NOT SUCCESSFULLY CONSUMED / IMMUTABLE
LOCAL-005                            = NOT ISSUED
DATABASE                             = NO COMMANDS
RU-1.4                               = RUNTIME NOT AUTHORIZED
EIR PASS                             = NONE
RUNTIME COMMITTED                    = NOT CERTIFIED
FINAL COMMIT PATH                    = BLOCKED
NEXT                                 = IMPLEMENT FORENSIC RESTORATION UNDER E-02-HMIR-IA
DO NOT RESTORE IN THIS TASK
DO NOT RUN DATABASE / SUPABASE / DOCKER
```

---

**End of document — E-02-HMIR-IA — v1.0 — 2026-08-23**
