# E-02 — Historical Migration Integrity Restoration — Implementation Authorization (Successor)

| Field | Value |
|-------|-------|
| **Document Type** | **Implementation Authorization** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-HMIR-IA-002** |
| **Policy authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md) (**PAD-052** · HMIC-013 – HMIC-024) |
| **Predecessor IA** | [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md) (**E-02-HMIR-IA** · HMD-002 · **CONSUMED** · **file-specific; does not cover this target**) |
| **Defect** | **HMD-004** |
| **Status** | **Approved With Conditions / Not Yet Consumed** |
| **Authority Level** | Implementation Authorization (repository forensic restoration only) |
| **Effective Date** | 2026-08-27 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-002.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-002.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **Future repository-only restoration task · NOT this issuance** |

> **Authority path finding: YES.** Filename `E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization-002.md` is **authority-safe** as the next successor in the existing **HMIR IA** family. ID **`E-02-HMIR-IA-002`**. Distinct filename keeps **E-02-HMIR-IA** (HMD-002) **immutable**. This is **not** a new governance tier, **not** a new PAD, **not** PAD-053, **not** a DBA, **not** a BCR IA, **not** a reconstruction IA, **not** a forward-fix authority, **not** a runtime authority, **not** a REA, **not** an EIR.
>
> **Pre-issuance gates (this issuance — read-only):** PAD-052 **ISSUED** · HMD-004 class **HISTORICAL MIGRATION SOURCE-INTEGRITY CORRUPTION** · SF-A · content authority **`bc48068db008d03b3c93d60646169737de7bc363`** · target **`20260320045054_enhance_dispute_resolution_system.sql`** · policy **EXACT HISTORICAL SOURCE RESTORATION** · reconstruction / forward-fix / quarantine / fake history **REJECTED** · HMD-004 was **OPEN / SOURCE RESTORATION SELECTED / IMPLEMENTATION NOT YET AUTHORIZED** · HMD-002 **DISTINCT** · HMD-003 **DEPENDENT BUT DISTINCT** · LOCAL-010 **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** · LOCAL-010 retry **NOT AUTHORIZED** · LOCAL-011 **not issued** · quarantine **exactly one** · no later PAD/IA supersedes PAD-052. **No gate failed.**

> **Document class:** Bounded **repository forensic restoration** authorization only. This record **does not** restore the file · **does not** apply migrations · **does not** run BCR · **does not** issue LOCAL-011 · **does not** authorize RU-1.4.

```
FORENSIC RESTORATION IMPLEMENTATION AUTHORIZATION = E-02-HMIR-IA-002
DECISION                                          = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PAD-052                                           = ISSUED / IMMUTABLE (POLICY CONSUMED FOR IA ISSUANCE ONLY)
SELECTED POLICY                                   = EXACT HISTORICAL SOURCE RESTORATION
RESTORATION MODEL                                 = BOUNDED PROVEN FRAGMENTS ONLY
SF CLASSIFICATION                                 = SF-A
TARGET                                            = supabase/migrations/20260320045054_enhance_dispute_resolution_system.sql
AUTHORIZED SOURCE FILE COUNT                      = 1
AUTHORIZED RESTORATIONS                           = EXACTLY FOUR LITERALS
CONTENT AUTHORITY                                 = bc48068db008d03b3c93d60646169737de7bc363
WHOLE-FILE RESTORE                                = NOT AUTHORIZED
RECONSTRUCTION / FORWARD-FIX / QUARANTINE         = REJECTED
FAKE HISTORY                                      = REJECTED
RESTORATION EXECUTED                              = NO
HMD-004                                           = OPEN / SOURCE RESTORATION SELECTED / IMPLEMENTATION AUTHORIZED / RUNTIME REPLAY VERIFICATION PENDING
HMD-001                                           = OPEN / DISTINCT
HMD-002                                           = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT
HMD-003                                           = OPEN / DEPENDENT BUT DISTINCT / RUNTIME REPLAY VERIFICATION PENDING
QUARANTINE                                        = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
LOCAL-010                                         = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-010 RETRY                                   = NOT AUTHORIZED
LOCAL-011                                         = NOT AUTHORIZED
THIS IA                                           ≠ DBA · ≠ BCR IA · ≠ PAD · ≠ REA
NEXT                                              = IMPLEMENT E-02-HMIR-IA-002 (REPOSITORY ONLY)
```

---

## 1. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-002.md) | **Direct policy authority** — PAD-052 · HMD-004 |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision.md) | Class precedent (HMIC-001) · **not** executable grant for this file |
| [`E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md`](E-02-Historical-Migration-Integrity-Restoration-Implementation-Authorization.md) | Family precedent · **HMD-002 only** · **CONSUMED** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-010.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-010.md) | LOCAL-010 **APPLICATION_FAILED** · evidence **immutable** |

**This IA consumes PAD-052 for implementation authorization only.** Restoration is **not performed** in this issuance task.

---

## 2. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-HMIR-IA-002** |
| **Decision** | **APPROVED WITH CONDITIONS / NOT YET CONSUMED** |
| **Authorized future action** | Forensic restore of **exactly four** corrupted SQL string literals to `bc48068` content |
| **Not authorized** | Whole-file restore · rewrite · reconstruction · forward-fix · second quarantine · BCR retarget · LOCAL-011 · DB/Supabase/Docker · RU-1.4 |
| **Execution this task** | **NOT PERFORMED** |

---

## 3. Purpose

Authorize **one future** repository-only task:

```
CURRENT CORRUPTED FRAGMENT  →  EXACT bc48068 HISTORICAL TEXT
(exactly four proven literals)
```

Purpose = **EXACT HISTORICAL SOURCE-INTEGRITY RESTORATION**.

**Not:** reconstruction · modernization · refactor · cleanup · equivalent SQL · AI-generated correction · `migration repair` · compatibility migration · quarantine expansion · schema redesign.

---

## 4. Defect

| Field | Value |
|-------|-------|
| **ID** | **HMD-004** |
| **Pre-issuance status** | **OPEN / SOURCE RESTORATION SELECTED / IMPLEMENTATION NOT YET AUTHORIZED** |
| **Post-issuance status** | **OPEN / SOURCE RESTORATION SELECTED / IMPLEMENTATION AUTHORIZED / RUNTIME REPLAY VERIFICATION PENDING** |
| **Classification** | HISTORICAL MIGRATION SOURCE-INTEGRITY CORRUPTION · SF-A · POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION / encoding-truncation |
| **HMD-001** | **OPEN / DISTINCT** |
| **HMD-002** | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / DISTINCT** — **do not reopen** |
| **HMD-003** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING / DEPENDENT BUT DISTINCT** — **do not modify W1/W2** |

HMD-004 **must not** be marked restored, resolved, CLOSED, or runtime-verified by this IA. No repository restoration has happened yet.

---

## 5. Exact future source scope

**May modify (future implementation only):**

1. `supabase/migrations/20260320045054_enhance_dispute_resolution_system.sql`

**Expected intentional migration write count = 1 file.**

**Must not create/modify:** helper files · second migrations · generated copies · W1 · W2 · HMD-002 restored file · quarantine file · BCR artifact · guard · verifier · package/test/app source.

---

## 6. Content authority

```
CONTENT AUTHORITY =
  bc48068db008d03b3c93d60646169737de7bc363:
  supabase/migrations/20260320045054_enhance_dispute_resolution_system.sql
```

No current-production schema. No later migration as replacement content. No semantic guess. No “equivalent SQL”. No AI-invented wording.

---

## 7. Exact bounded restoration set — EXACTLY FOUR

Future implementation **must re-verify** each current/origin pair immediately before writing. If any current fragment no longer matches the expected corrupted pre-state, or if `bc48068` cannot be read, or if origin text differs from this table: **STOP → GOVERNANCE**. Do not force replacement. **No fifth fragment. No automatic HMD-005.**

| Region | Current pre-state (HEAD / working tree at issuance) | Authorized `bc48068` text | Class |
|--------|------------------------------------------------------|---------------------------|-------|
| **1 — L554** | `'纠纷已创?,` | `'纠纷已创建',` | **PROVEN SOURCE CORRUPTION / PARSER-BREAKING / RESTORE** |
| **2 — L571** | `'状态从 ' \|\| OLD.status \|\| ' 变更?' \|\| NEW.status,` | `'状态从 ' \|\| OLD.status \|\| ' 变更为 ' \|\| NEW.status,` | **PROVEN SOURCE CORRUPTION / TRUNCATED CJK / RESTORE** |
| **3 — L588** | `'纠纷已升级至业委?,` | `'纠纷已升级至业委会',` | **PROVEN SOURCE CORRUPTION / PARSER-BREAKING / RESTORE** |
| **4 — L624** | `'纠纷已解?,` | `'纠纷已解决',` | **PROVEN SOURCE CORRUPTION / PARSER-BREAKING / RESTORE** |

Authorized fragment count = **4**.

---

## 8. Explicit exclusions

**DO NOT TOUCH:**

- L556 `jsonb_build_object('category', NEW.category, 'priority', NEW.priority)`
- any line already identical to `bc48068`
- trailing blank lines (HEAD L649–L652 vs origin)
- CRLF/LF-only differences
- indentation, whitespace, comments, unrelated CJK
- SQL formatting, function structure, column references
- commas/quotes **outside** the four authorized fragments

**No formatting sweep. No whole-file restoration.**

Replacing the entire current migration with the `bc48068` blob is **PROHIBITED** (PAD-052 bounded-fragments selection).

---

## 9. Historical immutability exception

Default: historical migrations remain immutable.

This IA creates **only** this narrow exception:

```
TARGET                 = 20260320045054_enhance_dispute_resolution_system.sql
AUTHORIZED DIFFERENCES = exactly four proven corrupted fragments
CONTENT AUTHORITY      = bc48068
```

Nothing else. After implementation, historical immutability **resumes**. This IA does **not** establish a general right to edit historical migrations and does **not** reuse `E-02-HMIR-IA` (HMD-002).

---

## 10. Rejected remedies

| Remedy | Disposition |
|--------|-------------|
| Reconstruction | **REJECTED** |
| Forward-fix / later patch migration / pre-frontier reconstruction | **REJECTED** |
| Quarantine of `20260320045054` / W1 / W2 / HMD-002 file | **REJECTED** |
| Fake history / record-as-applied / skip / repair-as-applied | **REJECTED** |

The restored file must later **execute normally** in a fresh governed replay. Source restoration **is not** runtime evidence.

---

## 11. Quarantine lock

```
quarantinedMigrations = [ 20260314195641_add_demo_data.sql ]
quarantineCount       = 1
```

`20260320045054` remains **in** the execution chain. Count **must not** change.

---

## 12. Future implementation task (authorized; not executed here)

1. Re-check pre-state of the four fragments.
2. Re-read exact four `bc48068` fragments.
3. Replace **exactly** those four corrupted current fragments.
4. Verify no fifth semantic change.
5. Verify post-change fragments equal `bc48068`.
6. Verify no unrelated line-ending/formatting churn.
7. Static syntax checks (the known four literals no longer unclosed/truncated as listed).
8. DB-free BCR `--plan` → `PLAN_OK`.
9. `npm run build` if applicable → PASS.
10. Minimal README update after successful implementation.

**NO DB. NO Supabase. NO Docker. NO LOCAL-011.**

### 12.1 Static verification must prove

A–Q as specified by issuance task: exactly four fragments changed · each equals `bc48068` · L556 untouched · trailing/CR out of scope · no whole-file restore · filename/version/order unchanged · quarantine count 1 · W1/W2 unchanged · HMD-002 file unchanged · BCR/guard/verifier unchanged · known parser defects at the four literals removed · `--plan` PLAN_OK · build PASS if applicable.

No runtime proof may be claimed.

### 12.2 Implementation STOP conditions

STOP → GOVERNANCE if: pre-state mismatch · `bc48068` unreadable · origin differs from this IA/PAD-052 table · a fifth corruption would need change · exact fragment restore requires another semantic edit · whole-file normalization would be required · migration order or quarantine count would change · W1/W2 differ unexpectedly · authority superseded.

**No improvisation.**

---

## 13. Future Completion (reserved; not created)

```
docs/implementation/E-02-Historical-Migration-Integrity-Restoration-Implementation-Completion-002.md
```

May certify **only** repository restoration + static verification.

**Must not** certify: LOCAL-011 · runtime replay · database baseline · HMD-004 closure · HMD-003 closure · RU-1.4.

---

## 14. LOCAL-010 / LOCAL-011

```
LOCAL-010       = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-010 RETRY = NOT AUTHORIZED
LOCAL-011       = NOT AUTHORIZED
```

Restoration does **not** reopen LOCAL-010. LOCAL-011 may be considered **only after** IA-002 is implemented, static verification passes, and Completion-002 is issued. Successor DBA/BCR order then follows existing pin-retarget precedent. **No BCR retarget in this task.**

---

## 15. Package / verifier / guard / source lock

**Not authorized:** `verify-db-baseline.ts` · environment guard · replay artifact · `package.json` / lockfile · tests · application source · Supabase functions · generated types.

---

## 16. Success conditions (future implementation)

All must hold:

1. Correct migration file only  
2. Exactly four corruptions restored  
3. Every restored value proven from `bc48068`  
4. No inferred / new wording  
5. No fifth textual/semantic change  
6. Path / timestamp unchanged  
7. L556 untouched  
8. Trailing blanks / CRLF not “fixed”  
9. Quarantine count = 1  
10. No DB / Supabase / Docker  

---

## 17. Lock

```
E-02-HMIR-IA-002     = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PAD-052              = ISSUED / IMMUTABLE
HMD-004              = OPEN / SOURCE RESTORATION SELECTED / IMPLEMENTATION AUTHORIZED / RUNTIME REPLAY VERIFICATION PENDING
TARGET               = 20260320045054_enhance_dispute_resolution_system.sql
AUTHORIZED FRAGMENTS = 4
WHOLE-FILE RESTORE   = NOT AUTHORIZED
LOCAL-011            = NOT AUTHORIZED
RU-1.4               = RUNTIME NOT AUTHORIZED
NEXT                 = IMPLEMENT E-02-HMIR-IA-002 (REPOSITORY ONLY)
EXECUTABLE WORK      = NONE (this issuance)
```

---

**End of document — E-02-HMIR-IA-002 · HMD-004 · v1.0 — 2026-08-27**
