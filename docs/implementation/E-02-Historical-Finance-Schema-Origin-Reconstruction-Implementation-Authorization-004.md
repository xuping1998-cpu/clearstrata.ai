# E-02 — Historical Finance Schema-Origin Reconstruction — Implementation Authorization (Successor)

## HMD-012 Pre-Target Schema-Origin Reconstruction · `public.property_invite_codes`

| Field | Value |
|-------|-------|
| **Document Type** | **Implementation Authorization (Successor)** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Authorization ID** | **E-02-HFSOR-IA-004** |
| **Policy authority** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-011.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-011.md) (**PAD-061** · HMIC-121 – HMIC-132) |
| **Predecessor IAs** | [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization.md) (**E-02-HFSOR-IA** · HMD-003 · **CONSUMED**) · [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-002.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-002.md) (**E-02-HFSOR-IA-002** · HMD-005 · **CONSUMED**) · [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-003.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-003.md) (**E-02-HFSOR-IA-003** · HMD-009 · **CONSUMED**) |
| **Forensic record** | [`E-02-HMD-012-Unit-Whitelist-Invite-Codes-Property-Invite-Codes-Forensic-Investigation.md`](E-02-HMD-012-Unit-Whitelist-Invite-Codes-Property-Invite-Codes-Forensic-Investigation.md) |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-018.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-018.md) · Event 2 · run `local-018-20260901a` |
| **Defect** | **HMD-012** |
| **Status** | **Approved With Conditions — NOT YET CONSUMED** |
| **Authority Level** | Implementation Authorization (repository schema-origin reconstruction only) |
| **Effective Date** | 2026-09-01 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-004.md`](E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-004.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **Future repository-only reconstruction task · NOT this issuance** |
| **Successor Completion (not created)** | `docs/implementation/E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-004.md` |

> **Authority path finding: YES.** Filename `E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-004.md` is **authority-safe** as the next successor in the existing **reconstruction IA** family (**E-02-HFSOR-IA**). ID **`E-02-HFSOR-IA-004`**. Distinct filename keeps **E-02-HFSOR-IA** · **E-02-HFSOR-IA-002** · **E-02-HFSOR-IA-003** **immutable**. This is **not** a new governance tier, **not** a new PAD, **not** a DBA, **not** a BCR IA, **not** a HMIR restoration IA, **not** a forward-fix authority, **not** a runtime authority, **not** an Implementation Completion.
>
> **Family determination / sequence proof (independently verified):** Repository reconstruction IA files:
>
> 1. `E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization.md` — **`E-02-HFSOR-IA`** (HMD-003 · **CONSUMED**). No **`E-02-HFSOR-IA-001`** exists.
> 2. `E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-002.md` — **`E-02-HFSOR-IA-002`** (HMD-005 · **CONSUMED**).
> 3. `E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Authorization-003.md` — **`E-02-HFSOR-IA-003`** (HMD-009 · **CONSUMED** · Completion-003 **COMPLETED WITH NOTES**).
>
> Highest issued reconstruction IA = **E-02-HFSOR-IA-003 CONSUMED**. **E-02-HFSOR-IA-004** is the next unused identifier. No HFSOR-IA-004 document existed before this issuance. HFSOR-IA-004 was **not reserved**. No HFSOR-IA-005+ exists or supersedes the sequence. **E-02-HMIR-IA** through **E-02-HMIR-IA-005** are forensic source restoration — **not** this family.
>
> **Defect distinctness:** HMD-012 is **DISTINCT** from HMD-003 / HMD-005 / HMD-009. This authorization **does not** reopen finance invoices, `user_role`, or `hiring_jobs` remediation.

> **Scope lock:** Authorizes **future** creation of **exactly one** pre-target reconstruction migration for **`public.property_invite_codes`** base table only. This record **does not** create SQL · **does not** create the reconstruction file · **does not** edit target or later CREATE · **does not** apply migrations · **does not** run BCR `--apply` · **does not** issue LOCAL-019 · **does not** authorize RU-1.4.

```
HISTORICAL SCHEMA-ORIGIN RECONSTRUCTION IA       = E-02-HFSOR-IA-004
DECISION                                         = APPROVED WITH CONDITIONS / NOT YET CONSUMED
PAD-061                                          = ISSUED / IMMUTABLE / OPTION B
HMIC RANGE                                       = HMIC-121 – HMIC-132
SELECTED POLICY                                  = OPTION B — PRE-TARGET SCHEMA-ORIGIN RECONSTRUCTION
HISTORICAL RECONSTRUCTION ≠ SOURCE RESTORATION   = LOCKED
TARGET                                           = 20260409150000_unit_whitelist_invite_codes.sql
LATER CREATE                                     = 20260509120000_property_invite_codes.sql
AUTHORIZED RECONSTRUCTION PATH                   = supabase/migrations/20260409145900_hmd012_reconstruct_property_invite_codes.sql
AUTHORIZED TIMESTAMP                             = 20260409145900
RECONSTRUCTION COUNT                             = EXACTLY 1
OBJECT COUNT                                       = EXACTLY 1
OBJECT                                             = public.property_invite_codes
RECONSTRUCTION EXECUTED                            = NO
LATER CREATE IF NOT EXISTS                         = PROVEN YES
LATER MIGRATION COMPATIBILITY                      = PROVEN
HMD-012                                            = OPEN / DISTINCT /
                                                     MISSING HISTORICAL PREREQUISITE /
                                                     SCHEMA-ORIGIN DEFECT /
                                                     OPTION B SELECTED /
                                                     RECONSTRUCTION IMPLEMENTATION AUTHORIZED /
                                                     NOT YET IMPLEMENTED
QUARANTINE                                         = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
LOCAL-018                                          = APPLICATION_FAILED / EVIDENCE IMMUTABLE / attempts 1 / NO RETRY
LOCAL-019                                          = NOT ISSUED
BCR DBA PIN                                        = E-02-DBA-LOCAL-018
BCR ARTIFACT AUTHORITY                             = E-02-BCR-IA-018
BCR EDIT                                           = NOT AUTHORIZED
THIS IA                                            ≠ DBA · ≠ BCR IA · ≠ PAD · ≠ HMIR
IMPLEMENTATION COMPLETION                          = REQUIRED / NOT ISSUED (Completion-004)
```

---

## 1. Pre-issuance gates (this issuance — read-only)

| Condition | Finding |
|-----------|---------|
| PAD-061 ISSUED / IMMUTABLE · Option B · HMIC-121 – HMIC-132 · HMD-012 | **PASS** |
| HMD-012 OPEN / DISTINCT / schema-origin / Option B / implementation not authorized (pre) | **PASS** |
| No HMD-012 repair performed · reconstruction file absent | **PASS** |
| LOCAL-018 APPLICATION_FAILED / attempts 1 / no retry · evidence `local-018-20260901a` | **PASS** |
| LOCAL-019 not issued | **PASS** |
| Target blob `38d5271d` · origin `3ae74e2` blob `a2cd9665` · substantive equal | **PASS** |
| No executable timestamped CREATE before target | **PASS** |
| First later CREATE `20260509120000` · `CREATE TABLE IF NOT EXISTS` | **PASS** |
| Later migration full compatibility survey | **PASS** (§9) |
| Timestamp `20260409145900` unused · ordered · collision-free | **PASS** |
| HFSOR family · highest **IA-003 CONSUMED** · next **IA-004** | **PASS** |
| Quarantine count 1 | **PASS** |

**STOP does not apply.** This IA may issue.

---

## 2. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-HFSOR-IA-004** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Consumption** | **NOT YET CONSUMED** |
| **Authorized future action** | Create **exactly one** reconstruction migration at §6 path, recreating **exactly one** base table per §8–§10 |
| **Not authorized** | Target edit · later CREATE edit · source restoration · forward-fix · quarantine change · LOCAL-018 retry · LOCAL-019 · DB/Supabase/Docker · RU-1.4 · BCR edit |
| **Execution this task** | **NOT PERFORMED** |

---

## 3. Controlling PAD / defect / runtime (immutable)

```
PAD                    = PAD-061
PAD PATH               = docs/implementation/E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-011.md
HMIC                   = HMIC-121 – HMIC-132
DECISION               = APPROVED WITH CONDITIONS — OPTION B /
                         PRE-TARGET SCHEMA-ORIGIN RECONSTRUCTION /
                         ISSUED / IMMUTABLE
HMD                    = HMD-012
CLASS                  = MISSING HISTORICAL PREREQUISITE / SCHEMA-ORIGIN DEFECT
SUBTYPE                = ORIGINAL CLEAN-REPLAY FORWARD REFERENCE
                         TO TABLE CREATED ONLY LATER
SOURCE CORRUPTION      = REJECTED
SOURCE RESTORATION     = REJECTED / NOT AUTHORIZED
```

Triggering runtime (immutable):

```
DBA                    = E-02-DBA-LOCAL-018
evidenceRunId          = local-018-20260901a
LOCAL-018              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
ATTEMPTS               = 1
RETRY                  = NOT AUTHORIZED
TARGET                 = 20260409150000_unit_whitelist_invite_codes.sql
FIRST FAILURE          = Stmt 1 L9–11 ALTER TABLE public.property_invite_codes
ERROR                  = relation "public.property_invite_codes" does not exist
Executed               = 79
Highest applied        = 20260409140000_vendor_risk_signals.sql (index 79)
First failing index    = 80
```

---

## 4. Earlier executable origin proof

Repository search (`CREATE TABLE` / `CREATE TABLE IF NOT EXISTS` on `public.property_invite_codes` in timestamped `supabase/migrations/*.sql`):

| Result | Finding |
|--------|---------|
| Before `20260409150000` | **NONE** |
| First timestamped CREATE | `20260509120000_property_invite_codes.sql` (executable index **112**) |
| `create_property_invite_system.sql` | Non-timestamped · **not** BCR executable · different schema (`role`, `auto_approve`) · **not** historical origin for this chain |

```
EARLIER EXECUTABLE ORIGIN = NONE
RENAME EVIDENCE           = NONE
```

---

## 5. Later CREATE gate

```
LATER CREATE PATH         = supabase/migrations/20260509120000_property_invite_codes.sql
EXECUTABLE INDEX          = 112 (per PAD-061 / forensic evidence; future plan must reconfirm)
EXACT CREATE STATEMENT    = L3–L13 (see §8)
CREATE MODE               = CREATE TABLE IF NOT EXISTS public.property_invite_codes (...)
IF NOT EXISTS             = YES — PROVEN
```

---

## 6. Authorized reconstruction (exactly one file)

```
AUTHORIZED RECONSTRUCTION PATH =
  supabase/migrations/20260409145900_hmd012_reconstruct_property_invite_codes.sql
AUTHORIZED TIMESTAMP           = 20260409145900
RECONSTRUCTION MIGRATION COUNT = EXACTLY 1
AUTHORIZED OBJECT COUNT        = EXACTLY 1
```

**Do not create this file in this issuance task.**

---

## 7. Ordering / collision proof (read-only)

Verified `20260409*` timestamped migrations (lexicographic / BCR order):

| Order | Filename |
|-------|----------|
| 1 | `20260409120000_invoice_ai_audit_results_and_drop_rule_dashboard_rpcs.sql` |
| 2 | `20260409130000_ai_hybrid_audit_flags.sql` |
| 3 | `20260409140000_vendor_risk_signals.sql` |
| **4** | **`20260409145900_hmd012_reconstruct_property_invite_codes.sql`** (**authorized · ABSENT**) |
| 5 | `20260409150000_unit_whitelist_invite_codes.sql` |
| 6 | `20260409190000_meeting_module_three_layer.sql` |

Occupied `2026040914*` prefixes: **only** `20260409140000`. Occupied `20260409145*` / `20260409149*`: **NONE**. Timestamp `20260409145900`: **unused** in repository.

```
ORDERING =
  20260409140000_vendor_risk_signals.sql
    <
  20260409145900_hmd012_reconstruct_property_invite_codes.sql
    <
  20260409150000_unit_whitelist_invite_codes.sql
    <
  20260509120000_property_invite_codes.sql
```

Pattern follows HMD-009 precedent (`20260405115900` immediately before `20260405120000`). **No alternate timestamp is authorized** unless governance reopens scope.

---

## 8. Proven base CREATE (source of truth)

Exact structural contract from `20260509120000_property_invite_codes.sql` **L3–L13** (implementation must copy; no invention):

```sql
CREATE TABLE IF NOT EXISTS public.property_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL DEFAULT '',
  used_count int NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  max_uses int NOT NULL DEFAULT 1 CHECK (max_uses >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_invite_codes_code_unique UNIQUE (code)
);
```

**Authorized future reconstruction content:** **exactly this CREATE TABLE statement** (schema-qualified `public.property_invite_codes` · `IF NOT EXISTS` as proven). **No additional statements** in the reconstruction file unless governance reopens scope.

---

## 9. Later migration compatibility survey (`20260509120000`)

After reconstruction + target (`unit_no` / `role` added) replay, statements on `public.property_invite_codes`:

| Lines | Statement | Classification | Rationale |
|-------|-----------|----------------|-----------|
| L3–L13 | `CREATE TABLE IF NOT EXISTS …` | **COMPATIBLE** | Table exists → CREATE skipped (PostgreSQL `IF NOT EXISTS` no-op) |
| L15–L16 | `CREATE INDEX IF NOT EXISTS idx_property_invite_codes_property_id` | **COMPATIBLE** | `IF NOT EXISTS` · index not created by reconstruction |
| L18 | `ALTER TABLE … ENABLE ROW LEVEL SECURITY` | **COMPATIBLE** | Idempotent enable on existing table |
| L21–L32 | `CREATE POLICY "pic_select_property"` | **COMPATIBLE** | **REQUIRES OBJECT ABSENCE** for policy name — reconstruction does not create policies |
| L34–L45 | `CREATE POLICY "pic_insert_property"` | **COMPATIBLE** | Same |
| L47–L68 | `CREATE POLICY "pic_update_property"` | **COMPATIBLE** | Same |
| L70–L71 | `GRANT … TO authenticated` / `service_role` | **COMPATIBLE** | Re-grant on existing relation |

```
LATER CREATE IF NOT EXISTS           = YES
RECONSTRUCTED BASE COMPATIBLE        = YES (identical CREATE body)
POST-CREATE STATEMENTS COMPATIBLE    = YES
INCOMPATIBLE LATER STATEMENTS        = NONE
```

If unconditional `CREATE TABLE` had been used at L3, Option B would be **BLOCKED**. Observed form is **`CREATE TABLE IF NOT EXISTS`** — mandatory gate **PASS**.

---

## 10. Base column matrix (authorized future shape)

| Column | Type | Nullability | Default | Source |
|--------|------|-------------|---------|--------|
| `id` | `uuid` | NOT NULL (PK) | `gen_random_uuid()` | L4 |
| `property_id` | `uuid` | NOT NULL | — | L5 |
| `code` | `text` | NOT NULL | — | L6 |
| `label` | `text` | NOT NULL | `''` | L7 |
| `used_count` | `int` | NOT NULL | `0` | L8 |
| `max_uses` | `int` | NOT NULL | `1` | L9 |
| `is_active` | `boolean` | NOT NULL | `true` | L10 |
| `created_at` | `timestamptz` | NOT NULL | `now()` | L11 |

---

## 11. Constraint ownership matrix

| Constraint | Proven source | Base reconstruction? | Rationale |
|------------|---------------|----------------------|-----------|
| `PRIMARY KEY (id)` | L4 inline | **YES** | Required by proven CREATE |
| `FK property_id → properties(id) ON DELETE CASCADE` | L5 inline | **YES** | Required by proven CREATE |
| `CHECK (used_count >= 0)` | L8 inline | **YES** | Inline on `used_count` |
| `CHECK (max_uses >= 0)` | L9 inline | **YES** | Inline on `max_uses` |
| `property_invite_codes_code_unique UNIQUE (code)` | L12 table-level | **YES** | Proven UNIQUE on `code` |

**Not authorized in reconstruction:**

| Item | Ownership |
|------|-----------|
| `unit_no` | **TARGET** (`20260409150000` L9–11) |
| `role` | **TARGET** (`20260409150000` L9–11) |
| `property_invite_codes_role_check` | **TARGET** (L13–18) |
| `idx_property_invite_codes_property_id` | **LATER CREATE** (L15–16) |
| RLS enable | **LATER CREATE** (L18) |
| Policies `pic_*` | **LATER CREATE** (L21–68) |
| Grants | **LATER CREATE** (L70–71) |

---

## 12. Substitute / rename lock

```
property_invites          = DISTINCT — not substitute
property_direct_invites   = DISTINCT — not substitute
invitation_codes          = VIEW in target — not substitute base table
RENAME EVIDENCE           = NONE
```

---

## 13. Target compatibility (static)

After authorized reconstruction:

1. `public.property_invite_codes` **exists** as base table.
2. Target Stmt 1 `ALTER TABLE … ADD COLUMN unit_no, role` **can execute** (relation present).
3. Target-owned columns **`unit_no`** / **`role`** remain **target** responsibility — **not** in reconstruction.
4. Subsequent target statements (indexes on `unit_no`, view `invitation_codes`, functions) operate on table that exists with base + target-added columns — compatible with authorized base shape.

No runtime required for this static proof at IA issuance.

---

## 14. Prohibited future acts

```
TARGET EDIT (20260409150000)                              = PROHIBITED
LATER CREATE EDIT (20260509120000)                        = PROHIBITED
unit_no / role IN RECONSTRUCTION                            = PROHIBITED
RLS / POLICIES / INDEXES / GRANTS IN RECONSTRUCTION       = PROHIBITED
DATA / SEED / BACKFILL                                      = PROHIBITED
SECOND TABLE / OBJECT                                       = PROHIBITED
FORWARD-FIX                                                 = PROHIBITED
QUARANTINE CHANGE                                           = PROHIBITED
BCR EDIT                                                    = PROHIBITED
LOCAL-018 RETRY                                             = PROHIBITED
LOCAL-019                                                   = NOT ISSUED
RUNTIME / --apply                                           = PROHIBITED (future implementation)
```

---

## 15. Future implementation authorization (when executed)

Future implementation task may:

- create **exactly one** file at §6 path;
- copy **exactly** §8 CREATE TABLE body;
- leave target and later CREATE **unchanged**;
- run `BCR --plan` (**no** `--apply`);
- run `npm run build`.

Future implementation may **not**: run database · edit BCR · issue LOCAL-019.

### 15.1 Future implementation pre-gates

Before creating migration, reverify: PAD-061 immutable · this IA approved/not consumed · target blob unchanged · later CREATE unchanged · timestamp still unused · BCR pins LOCAL-018 / IA-018 · quarantine count 1.

### 15.2 Future plan requirements

Plan must show:

```
20260409140000 < 20260409145900 < 20260409150000 < 20260509120000
```

Reconstruction: **DISCOVERED / EXECUTABLE / NOT QUARANTINED**. `PLAN_OK` · `failures = []`.

---

## 16. IA consumption rule

This IA becomes **CONSUMED** only if **all** hold:

1. exact authorized path `20260409145900_hmd012_reconstruct_property_invite_codes.sql` created;
2. exactly one new migration;
3. exactly one object `public.property_invite_codes`;
4. exact §8 CREATE TABLE body (no extra statements);
5. no `unit_no` / `role` in reconstruction;
6. target unchanged;
7. later CREATE unchanged;
8. later compatibility preserved;
9. no unrelated migration edits;
10. no BCR edits;
11. quarantine unchanged;
12. `BCR --plan` **PLAN_OK**;
13. `npm run build` **PASS**;
14. no runtime.

Failure: **IA = NOT CONSUMED · STOP → GOVERNANCE**

---

## 17. Successor Completion

```
IMPLEMENTATION COMPLETION = REQUIRED / NOT ISSUED
RESERVED PATH             = E-02-Historical-Finance-Schema-Origin-Reconstruction-Implementation-Completion-004.md
```

**Do not issue Completion in this task.**

---

## 18. HMD / LOCAL / BCR / baseline locks

| Item | State |
|------|-------|
| HMD-009 | OPEN / RUNTIME REPLAY VERIFIED · not reopened |
| HMD-010 | OPEN / RUNTIME REPLAY VERIFIED · not reopened |
| HMD-011 | OPEN / RUNTIME REPLAY VERIFIED · not reopened |
| HMD-005 – HMD-008 | OPEN / RUNTIME REPLAY VERIFIED |
| HMD-003 | OPEN / RUNTIME PENDING · W2 + April HARD APPLIED · July S1 NOT REACHED |
| DATABASE BASELINE | NOT VERIFIED |
| RU-1.4 | NOT AUTHORIZED |
| EIR / Acceptance / Certification | NONE / BLOCKED / NOT ISSUED |

---

## 19. Exact next action

```
NEXT = HMD-012 SCHEMA-ORIGIN RECONSTRUCTION IMPLEMENTATION
       (create 20260409145900_hmd012_reconstruct_property_invite_codes.sql per §8)
```

---

**End of document — E-02-HFSOR-IA-004 · HMD-012 · v1.0 — 2026-09-01**
