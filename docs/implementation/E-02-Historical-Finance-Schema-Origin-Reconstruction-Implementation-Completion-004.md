# E-02 — Historical Finance Schema-Origin Reconstruction — Implementation Completion-004

## HMD-012 Pre-Target Schema-Origin Reconstruction · `public.property_invite_codes`

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Completion Checkpoint (repository) |
| **Completion ID** | **E-02-HFSOR-IMPLEMENTATION-COMPLETION-004** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Consumes** | **E-02-HFSOR-IA-004** — [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-004.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-004.md) |
| **Policy authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-011.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-011.md) (**PAD-061** · HMIC-121 – HMIC-132) |
| **Predecessor Completions** | [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion.md) (**E-02-HFSOR-IA** · HMD-003 · **COMPLETED WITH NOTES** · **immutable**) · [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-002.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-002.md) (**E-02-HFSOR-IMPLEMENTATION-COMPLETION-002** · HMD-005 · **COMPLETED WITH NOTES** · **immutable**) · [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-003.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-003.md) (**E-02-HFSOR-IMPLEMENTATION-COMPLETION-003** · HMD-009 · **COMPLETED WITH NOTES** · **immutable**) |
| **Forensic record** | [`E-02-HMD-012-Unit-Whitelist-Invite-Codes-Property-Invite-Codes-Forensic-Investigation.md`](E-02-HMD-012-Unit-Whitelist-Invite-Codes-Property-Invite-Codes-Forensic-Investigation.md) |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-018.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-018.md) · Event 2 · run `local-018-20260901a` |
| **Defect** | **HMD-012** |
| **Completion status** | **COMPLETED WITH NOTES** |
| **Effective Date** | 2026-09-01 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-004.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-004.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **NO** |

> **Completion class:** This record certifies **only** that **E-02-HFSOR-IA-004** was consumed by a bounded **PRE-TARGET SCHEMA-ORIGIN RECONSTRUCTION** of **exactly one** new repository migration establishing **exactly one** base table (`public.property_invite_codes`) from the IA §8 / later-canonical CREATE body, that the file matches the IA path/timestamp/structural contract, that the HMD-012 target and later canonical CREATE remain **immutable / unchanged**, and that static verification (`--plan` · `npm run build` · source inspection) passed during implementation. It **does NOT** certify Postgres runtime validity, clean replay, reconstruction `REACHED/APPLIED`, target `REACHED/APPLIED`, non-reproduction of the LOCAL-018 `property_invite_codes` error, HMD-003 runtime resolution, LOCAL-019, baseline verification, RU-1.4, EIR PASS, Runtime COMMITTED, Acceptance, or Project Certification.

> **Authority path finding: YES.** Filename `E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-004.md` is **authority-safe** as the next successor **Implementation Completion** in the established **HFSOR Completion** family (`…-Completion.md` · `…-Completion-002.md` · `…-Completion-003.md` · **this `…-Completion-004.md`**). ID **`E-02-HFSOR-IMPLEMENTATION-COMPLETION-004`**. Highest previously issued numbered HFSOR Completion is **003** (HMD-009). **004 is the next unused identifier.** No HFSOR Completion-004 existed before this issuance. Completion-004 was **not reserved**. No HFSOR Completion-005+ exists. This family is **distinct** from HMIR Completions, HOSCC Completions, and BCR Completions. This is **not** a DBA, **not** a BCR IA, **not** LOCAL-019, and **not** runtime proof.

```
E-02 HFSOR IMPLEMENTATION COMPLETION-004             = COMPLETED WITH NOTES
E-02-HFSOR-IA-004                                    = CONSUMED
PAD-061                                              = ISSUED / IMMUTABLE
HMIC RANGE                                           = HMIC-121 – HMIC-132
SELECTED POLICY                                      = OPTION B — PRE-TARGET SCHEMA-ORIGIN RECONSTRUCTION
HISTORICAL RECONSTRUCTION ≠ SOURCE RESTORATION       = LOCKED
TARGET                                               = 20260409150000_unit_whitelist_invite_codes.sql
TARGET                                               = IMMUTABLE / UNCHANGED
LATER CANONICAL CREATE                               = 20260509120000_property_invite_codes.sql
LATER CANONICAL CREATE                               = IMMUTABLE / UNCHANGED
RECONSTRUCTION                                       = supabase/migrations/20260409145900_hmd012_reconstruct_property_invite_codes.sql
RECONSTRUCTION COUNT                                 = EXACTLY 1
OBJECT COUNT                                         = EXACTLY 1
  public.property_invite_codes
CREATE TABLE BODY                                    = IA §8 EXACT (20260509120000 L3–L13)
unit_no / role                                       = ABSENT (TARGET-OWNED)
RLS / POLICIES / INDEXES / GRANTS                    = 0
DATA / BACKFILL                                      = NONE
HMD-012 ATTRIBUTABLE MIGRATION EDIT COUNT            = 0 (reconstruction file only; new)
HMD-012                                              = OPEN / SCHEMA-ORIGIN DEFECT /
                                                       RECONSTRUCTION IMPLEMENTED /
                                                       IMPLEMENTATION COMPLETED /
                                                       IMPLEMENTATION COMPLETION COMPLETED /
                                                       RUNTIME REPLAY VERIFICATION PENDING
QUARANTINE                                           = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
BCR                                                  = UNCHANGED / STILL PINNED LOCAL-018 / IA-018
PLAN                                                 = PLAN_OK
BUILD                                                = PASS
LOCAL-018                                            = APPLICATION_FAILED / EVIDENCE IMMUTABLE / attempts 1 / NO RETRY
LOCAL-019                                            = NOT ISSUED
DATABASE BASELINE VERIFIED                           = NO
RU-1.4                                               = RUNTIME NOT AUTHORIZED
EIR PASS                                             = NONE
RUNTIME COMMITTED                                    = NOT CERTIFIED
FINAL COMMIT PATH                                    = BLOCKED
THIS COMPLETION                                      ≠ DBA · ≠ BCR IA · ≠ RUNTIME PROOF
NEXT                                                 = SUCCESSOR RUNTIME GOVERNANCE /
                                                       LOCAL-019 ELIGIBILITY + BCR RETARGET AUTHORITY
EXECUTABLE WORK                                      = NONE
```

---

## 1. Authoritative inputs (read)

[`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-004.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-004.md) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-011.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-011.md) · [`E-02-HMD-012-Unit-Whitelist-Invite-Codes-Property-Invite-Codes-Forensic-Investigation.md`](E-02-HMD-012-Unit-Whitelist-Invite-Codes-Property-Invite-Codes-Forensic-Investigation.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-018.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-018.md) · reconstruction SQL · target SQL · later canonical CREATE SQL · [`README.md`](README.md).

**This Completion does not re-implement reconstruction and does not modify migrations.**

---

## 2. Scope

| Certified | Not certified |
|-----------|----------------|
| **E-02-HFSOR-IA-004 CONSUMED** | Postgres runtime SQL validity |
| Exactly one authorized reconstruction migration | Successful clean replay |
| Exact path / timestamp / one-table base contract | Reconstruction `REACHED / APPLIED` |
| IA §8 CREATE body (later-canonical L3–L13) | Target `REACHED / APPLIED` |
| No `unit_no` / `role` / RLS / policies / indexes / grants | Prior `property_invite_codes` error `NOT REPRODUCED` |
| Target / later CREATE immutable | HMD-012 **CLOSED** or runtime verified |
| HMD-012 attributable edits = new file only | LOCAL-019 issuance or execution |
| Quarantine unchanged (count = 1) | Database baseline verification |
| BCR unchanged · pin LOCAL-018 / IA-018 | RU-1.1 / RU-1.2 / RU-1.4 |
| `--plan` PLAN_OK · build PASS (implementation evidence) | EIR / Acceptance / Certification |

---

## 3. Controlling authorities

| Record | Role |
|--------|------|
| PAD-061 | **ISSUED / IMMUTABLE** — OPTION B · **PRE-TARGET SCHEMA-ORIGIN RECONSTRUCTION** |
| **E-02-HFSOR-IA-004** | **CONSUMED** |
| **HMD-012** | Missing `public.property_invite_codes` before `20260409150000` · **DISTINCT** from HMD-009–011 |

---

## 4. Pre-issuance gate result

Verified read-only. **No migration edit. No `--apply`. Plan/build not re-run** (implementation evidence reused per Completion-003 precedent).

| Gate | Result |
|------|--------|
| A. HFSOR Completion-004 path absent before issuance | **PASS** |
| B. Completion **004** next unused in HFSOR family | **PASS** |
| C. Distinct from HMIR / HOSCC / BCR Completions | **PASS** |
| D. PAD-061 ISSUED / IMMUTABLE · HMD-012 | **PASS** |
| E. E-02-HFSOR-IA-004 **CONSUMED** · scope matches | **PASS** |
| F. Reconstruction at `20260409145900_hmd012_reconstruct_property_invite_codes.sql` | **PASS** |
| G. Ordering: `09140000` < `09145900` < `09150000` < `20260509120000` | **PASS** |
| H. Object count **1** · migration count **1** | **PASS** |
| I. CREATE body matches IA §8 / `20260509120000` L3–L13 | **PASS** |
| J. `unit_no` / `role` **ABSENT** | **PASS** |
| K. RLS / policies / indexes / grants **0** | **PASS** |
| L. Target blob `38d5271d109724ed0c70300ab23f6257811066cd` · unchanged | **PASS** |
| M. Later CREATE present · `CREATE TABLE IF NOT EXISTS` intact | **PASS** |
| N. Quarantine count **1** | **PASS** |
| O. BCR pin LOCAL-018 / IA-018 unchanged | **PASS** |
| P. Plan PLAN_OK · 288 discovered · 287 executable · failures `[]` | **PASS** (implementation evidence) |
| Q. Build PASS · vite 5.4.21 · 3333 modules · 24.14s | **PASS** (implementation evidence) |
| R. No DB / Supabase / Docker / `--apply` | **PASS** |
| S. LOCAL-018 immutable · LOCAL-019 not issued | **PASS** |

**STOP does not apply.** This Completion may issue.

---

## 5. Reconstruction certification

```
AUTHORIZED PATH MATCH      = YES
AUTHORIZED TIMESTAMP MATCH = YES
PATH                       = supabase/migrations/20260409145900_hmd012_reconstruct_property_invite_codes.sql
COUNT                      = EXACTLY 1
OBJECT COUNT               = EXACTLY 1
```

Executable statement (comments omitted):

1. `CREATE TABLE IF NOT EXISTS public.property_invite_codes ( … IA §8 body … );`

| Item | Finding |
|------|---------|
| CREATE TABLE count | **1** |
| Body vs `20260509120000` L3–L13 | **SEMANTICALLY EQUAL** |
| `unit_no` | **ABSENT** |
| `role` | **ABSENT** |
| ENABLE RLS | **0** |
| CREATE POLICY | **0** |
| CREATE INDEX | **0** |
| GRANT | **0** |
| DATA | **0** |

### Base column matrix

| Column | Type | Nullability | Default | Certified |
|--------|------|-------------|---------|-----------|
| `id` | `uuid` | NOT NULL (PK) | `gen_random_uuid()` | **YES** |
| `property_id` | `uuid` | NOT NULL | — | **YES** |
| `code` | `text` | NOT NULL | — | **YES** |
| `label` | `text` | NOT NULL | `''` | **YES** |
| `used_count` | `int` | NOT NULL | `0` | **YES** |
| `max_uses` | `int` | NOT NULL | `1` | **YES** |
| `is_active` | `boolean` | NOT NULL | `true` | **YES** |
| `created_at` | `timestamptz` | NOT NULL | `now()` | **YES** |

### Constraint matrix

| Constraint | Certified |
|------------|-----------|
| `PRIMARY KEY (id)` | **YES** |
| `FK property_id → public.properties(id) ON DELETE CASCADE` | **YES** |
| `UNIQUE (code)` · `property_invite_codes_code_unique` | **YES** |
| `CHECK (used_count >= 0)` | **YES** |
| `CHECK (max_uses >= 0)` | **YES** |

---

## 6. Immutability certification

| File | HMD-012 edit |
|------|----------------|
| `20260409150000_unit_whitelist_invite_codes.sql` | **NONE** · blob `38d5271d…` |
| `20260509120000_property_invite_codes.sql` | **NONE** |
| BCR `replay-e02-declared-baseline.ts` | **NONE** · pins LOCAL-018 / IA-018 |

Pre-existing repository lineage outside HMD-012 scope is **not** certified or reopened by this Completion.

---

## 7. Plan ordering certification (implementation evidence)

| Migration | Status | Executable index |
|-----------|--------|------------------|
| `20260409145900_hmd012_reconstruct_property_invite_codes.sql` | DISCOVERED / EXECUTABLE / NOT QUARANTINED | **80** |
| `20260409150000_unit_whitelist_invite_codes.sql` | DISCOVERED / EXECUTABLE / NOT QUARANTINED | **81** |
| `20260509120000_property_invite_codes.sql` | DISCOVERED / EXECUTABLE / NOT QUARANTINED | **113** |
| `20260406000000_hmd003_reconstruct_invoice_ai_audits.sql` (W2) | DISCOVERED / EXECUTABLE | **76** |
| `20260409120000_invoice_ai_audit_results…` (April HARD) | DISCOVERED / EXECUTABLE | **77** |
| `20260711120000_invoice_ai_audit_v1.sql` (July S1) | DISCOVERED / EXECUTABLE | **148** |

```
PLAN RESULT              = PLAN_OK
FAILURES                 = []
migrationCountDiscovered = 288
executable count         = 287
quarantineCount          = 1
```

Plan discovery **does not** certify runtime execution.

---

## 8. Build certification (implementation evidence)

```
BUILD       = PASS
EXIT CODE   = 0
VITE        = 5.4.21
MODULES     = 3333
DURATION    = 24.14s (non-normative)
```

---

## 9. Runtime boundary

```
DATABASE      = NONE
SUPABASE      = NONE
DOCKER        = NONE
--apply       = NONE
LOCAL-018     = APPLICATION_FAILED / EVIDENCE IMMUTABLE / attempts 1 / NO RETRY
LOCAL-019     = NOT ISSUED
RUNTIME PROOF = NONE for HMD-012 reconstruction
```

---

## 10. HMD / baseline locks

| Item | State |
|------|-------|
| **HMD-012** | OPEN / COMPLETION COMPLETED / **RUNTIME PENDING** · **not CLOSED** |
| HMD-009 / HMD-010 / HMD-011 | OPEN / RUNTIME REPLAY VERIFIED |
| HMD-005 – HMD-008 | OPEN / RUNTIME REPLAY VERIFIED |
| HMD-003 | OPEN / RUNTIME PENDING · W2 + April HARD APPLIED · July S1 NOT REACHED |
| DATABASE BASELINE | NOT VERIFIED |
| RU-1.4 | NOT AUTHORIZED |
| EIR / Acceptance / Certification | NONE / BLOCKED / NOT ISSUED |

---

## 11. IA consumption certification

**E-02-HFSOR-IA-004 = CONSUMED** — all authorized implementation conditions satisfied. IA is **not** reopened.

---

## 12. Exact next action

```
NEXT = SUCCESSOR RUNTIME GOVERNANCE
       LOCAL-019 ELIGIBILITY REVIEW
       + SEPARATE BCR RETARGET AUTHORITY (if eligible)
```

**Do not** issue LOCAL-019 in this Completion. **Do not** retry LOCAL-018.

---

**End of document — E-02-HFSOR-IMPLEMENTATION-COMPLETION-004 · HMD-012 · v1.0 — 2026-09-01**
