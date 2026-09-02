# E-02 Program Authority Decision — Historical Migration Integrity / Compatibility (Successor)

## Pre-Target Schema-Origin Reconstruction · HMD-012 · `public.property_invite_codes`

| Field | Value |
|-------|-------|
| **Document Type** | **Program Authority Decision (Supplement)** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Parent Authority** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) v1.0 (PAD-001 – PAD-010) |
| **Direct Predecessor Supplement** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-010.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-010.md) (**PAD-060** · HMIC-109 – HMIC-120 · HMD-011 Option C) |
| **Prior Predecessor Supplements** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-009.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-009.md) (**PAD-059** · HOSCC family) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-008.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-008.md) (**PAD-058** · HMD-010) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md) (**PAD-057** · HMD-009 Option B) · [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-006.md) (**PAD-056** · HMD-008) · plus PAD-055 · PAD-054 · PAD-053 · PAD-052 · PAD-051 · PAD-039–050 · PAD-026–038 · PAD-011–025 |
| **Forensic record** | [`E-02-HMD-012-Unit-Whitelist-Invite-Codes-Property-Invite-Codes-Forensic-Investigation.md`](E-02-HMD-012-Unit-Whitelist-Invite-Codes-Property-Invite-Codes-Forensic-Investigation.md) |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-018.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-018.md) · Event 2 · run `local-018-20260901a` |
| **Supplement ID** | **PAD-061** |
| **Authority Question Register** | **HMIC-121 – HMIC-132** |
| **Status** | **APPROVED WITH CONDITIONS — OPTION B (FILE-SPECIFIC SUCCESSOR)** |
| **Selected Policy** | **PRE-TARGET SCHEMA-ORIGIN RECONSTRUCTION** |
| **Defect** | **HMD-012** |
| **Authority Level** | Program Authority |
| **Effective Date** | 2026-09-01 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-011.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-011.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized By This Record** | **NO** |

> **Authority path finding: YES.** Filename `E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-011.md` is **authority-safe** as the next successor in the existing **HMIC** decision family (`Decision.md` … `Decision-010` · **this Decision-011**). Distinct filename keeps PAD-039 – PAD-060 **immutable**. This is **not** a new governance tier. PAD identifiers are **not** CS/FD registry numbers.
>
> Sequence: Parent PAD-001 – PAD-010 · DAA PAD-011 – PAD-025 · HMBC PAD-026 – PAD-038 · HMIC PAD-039 – PAD-050 · HFSO PAD-051 · HMIC successors PAD-052 – PAD-060 · **this supplement PAD-061**. Highest previously allocated PAD is **PAD-060**. **PAD-061 is the next unused identifier.** **PAD-061 did not already exist. PAD-061 was not reserved. PAD-061 has not previously been issued.** Mentions of “PAD-061+ not allocated” in PAD-060 are **locks**, not reservations. **No PAD-062+ supersedes the sequence.** **PAD-062+ is not allocated.**
>
> HMIC subsequence: HMIC-001 – HMIC-108 (through PAD-059) · HMIC-109 – HMIC-120 (PAD-060) · **this register HMIC-121 – HMIC-132**. Highest previously allocated HMIC is **HMIC-120**. **HMIC-121 – HMIC-132 is the next unused 12-clause range.** No HMIC-121+ existed before this issuance.
>
> **Why a new PAD is required (not reflexive):** PAD-060 / HMD-011 governs **`meeting_quota_tracker` / `mqt.meeting_id`** only. HMD-012 is a **different migration** (`20260409150000`) · **different missing object** (`public.property_invite_codes` entire table) · **different executable index** (**80**). PAD-057 / HMD-009 reconstruction governs **`hiring_jobs`** after an intentional DROP — **not** this forward-reference pattern. PAD-058 / PAD-059 / PAD-060 HOSCC **does not** apply. HMIR restoration **cannot** restore a missing table origin that never existed in the timestamped executable chain. PAD-051 finance reconstruction **does not** cover this relation. A file-specific successor PAD is required to allocate remediation policy for **HMD-012**.
>
> **Why this is not fake history:** The April 9 target authentically ALTERs a table the author assumed existed. The later May 9 migration is the first timestamped executable CREATE. Future reconstruction is a **governed replay compatibility layer** placed **before** the ALTER, not a claim that such a timestamped file existed historically, and not mark-as-applied.

> **Scope lock:** Establishes **Option B — pre-target schema-origin reconstruction** for the LOCAL-018 first failure at `20260409150000_unit_whitelist_invite_codes.sql` / `public.property_invite_codes`. This record **does not** write SQL · **does not** create the reconstruction file · **does not** edit the target · **does not** edit `20260509120000_property_invite_codes.sql` · **does not** issue Implementation Authorization · **does not** retry LOCAL-018 · **does not** issue LOCAL-019 · **does not** expand quarantine · **does not** modify BCR/guard/verifier · **does not** run database/Supabase/Docker · **does not** authorize RU-1.4.

```
HISTORICAL MIGRATION INTEGRITY / COMPATIBILITY AUTHORITY-011 = ESTABLISHED (THIS SUPPLEMENT)
DECISION                                                     = APPROVED WITH CONDITIONS — OPTION B
SELECTED POLICY                                              = PRE-TARGET SCHEMA-ORIGIN RECONSTRUCTION
REMEDIATION MODEL                                            = ONE NEW PRE-TARGET RECONSTRUCTION MIGRATION
                                                               + IMMUTABLE ORIGINAL TARGET
                                                               + IMMUTABLE LATER CREATE
SOURCE CORRUPTION OF FAILING SQL                             = REJECTED
TARGET ALTER == TARGET ORIGIN (substantive)                  = YES
TARGET ORIGIN COMMIT                                         = 3ae74e2a1be01079087b47dbc84b38f048009f9b
TARGET ORIGIN BLOB                                           = a2cd966530fee806bd61eb772e45a87949cdd0ae
CURRENT TARGET BLOB                                          = 38d5271d109724ed0c70300ab23f6257811066cd
EXACT HISTORICAL SOURCE RESTORATION                          = NOT INDICATED / REJECTED AS THIS REMEDY
TARGET EDIT                                                  = REJECTED / NOT AUTHORIZED
LATER CREATE EDIT                                            = REJECTED / NOT AUTHORIZED
FORWARD-FIX                                                  = REJECTED / INSUFFICIENT FOR CLEAN REPLAY
QUARANTINE / SKIP                                            = NOT AUTHORIZED / REJECTED
FAKE HISTORY / REPAIR-AS-APPLIED                             = REJECTED
HMD-012                                                      = OPEN / DISTINCT /
                                                               MISSING HISTORICAL PREREQUISITE /
                                                               SCHEMA-ORIGIN DEFECT /
                                                               ORIGINAL CLEAN-REPLAY FORWARD REFERENCE
                                                               TO TABLE CREATED ONLY LATER /
                                                               OPTION B SELECTED /
                                                               IMPLEMENTATION NOT AUTHORIZED YET
TARGET                                                       = 20260409150000_unit_whitelist_invite_codes.sql
ORIGINAL TARGET                                              = IMMUTABLE / DO NOT EDIT
LATER CREATE                                                 = 20260509120000_property_invite_codes.sql
                                                               IMMUTABLE / DO NOT EDIT (this PAD)
MISSING RELATION                                             = public.property_invite_codes (TABLE)
FIRST EXECUTABLE TIMESTAMPED CREATE                          = 20260509120000 (index 112) AFTER target
AUTHORIZED FUTURE OBJECT COUNT                               = EXACTLY 1
AUTHORIZED FUTURE OBJECT                                     = public.property_invite_codes
AUTHORIZED FUTURE RECONSTRUCTION MIGRATION COUNT             = EXACTLY 1
CONCRETE RECONSTRUCTION TIMESTAMP                            = NOT LOCKED (deferred to IA)
LOCAL-018                                                    = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED /
                                                               EVIDENCE IMMUTABLE
LOCAL-018 ATTEMPTS                                           = 1
LOCAL-018 RETRY                                              = NOT AUTHORIZED
LOCAL-019                                                    = NOT ISSUED
BCR EDIT                                                     = NOT AUTHORIZED
RUNTIME                                                      = NOT AUTHORIZED
RECONSTRUCTION EXECUTED                                      = NO (POLICY ONLY)
THIS PAD                                                     ≠ IMPLEMENTATION AUTHORIZATION
THIS PAD                                                     ≠ DATABASE APPLICATION AUTHORIZATION
PAD-062+                                                     = NOT ALLOCATED
```

---

## 1. Authority / provenance

| Record | Role |
|--------|------|
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) | Parent — PAD-001 – PAD-010 |
| [`E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md`](E-02-Historical-Migration-Integrity-Compatibility-Authority-Decision-007.md) | **PAD-057 ISSUED / IMMUTABLE** · HMD-009 **Option B reconstruction precedent** (different object / pattern) |
| [`E-02-Historical-Finance-Schema-Origin-Policy-Decision.md`](E-02-Historical-Finance-Schema-Origin-Policy-Decision.md) | PAD-051 · HMD-003 finance schema-origin (**not** this relation) |
| [`E-02-HMD-012-Unit-Whitelist-Invite-Codes-Property-Invite-Codes-Forensic-Investigation.md`](E-02-HMD-012-Unit-Whitelist-Invite-Codes-Property-Invite-Codes-Forensic-Investigation.md) | HMD-012 forensic facts — consumed as **immutable classification** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-018.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-018.md) | LOCAL-018 **APPLICATION_FAILED** · evidence **immutable** · run `local-018-20260901a` |
| [`tests/e02/evidence/local-018-20260901a/bcr-replay-manifest.json`](../../tests/e02/evidence/local-018-20260901a/bcr-replay-manifest.json) | Manifest `result=APPLICATION_FAILED` · executed **79** |

**MANDATORY STOP does not apply.** Authority sequence is unambiguous. Forensic hashes match. Clean-replay dependency proven. Authority supports issuance of PAD-061.

---

## 2. Pre-issuance gates (this issuance — read-only)

| ID | Check | Result |
|----|--------|--------|
| A. PAD sequence | Highest issued HMIC Decision = **Decision-010 / PAD-060 / HMIC-109 – HMIC-120**. Decision-011 **absent**. PAD-061 **absent / not reserved**. PAD-062+ **absent**. | **PASS** |
| B. Next unused IDs | PAD-061 · Decision-011 · HMIC-121 – HMIC-132 | **PASS** |
| C. HMD-012 identity | **OPEN / DISTINCT / FORENSIC INVESTIGATION COMPLETE**. No prior repair PAD/IA/Completion. Not merged into HMD-009–011. | **PASS** |
| D. LOCAL-018 immutability | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** · attempts **1** · retry **NOT AUTHORIZED** · run `local-018-20260901a` · executed **79** · highest applied `20260409140000_vendor_risk_signals.sql` · first failing `20260409150000_unit_whitelist_invite_codes.sql` index **80** · error `relation "public.property_invite_codes" does not exist` | **PASS** |
| E. Target identity | Current blob `38d5271d109724ed0c70300ab23f6257811066cd` · origin `3ae74e2` blob `a2cd966530fee806bd61eb772e45a87949cdd0ae` · substantive **EQUAL** (EOF whitespace only) · failing ALTER **in origin** | **PASS** |
| F. Clean-replay dependency | `property_invite_codes` **absent** before index **80** · first timestamped CREATE `20260509120000` at index **112** · **AFTER** target | **PASS** |
| G. Repair authority exists? | **NO** prior HMD-012 PAD/IA | **PASS** |
| H. Later PAD reserved? | **NO** | **PASS** |

---

## 3. LOCAL-018 evidence lock

```
E-02-DBA-LOCAL-018              = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
EVENT 1                         = BLOCKED (Docker) · apply NOT STARTED · attempts 0
EVENT 2                         = single --apply · APPLICATION_FAILED · attempts 1
evidenceRunId                   = local-018-20260901a
Executed migration count        = 79
Highest applied                 = 20260409140000_vendor_risk_signals.sql  (index 79)
First failing                   = 20260409150000_unit_whitelist_invite_codes.sql
First failing executable index  = 80
Exact error                     = relation "public.property_invite_codes" does not exist
Preserve / handoff              = NOT REACHED
Baseline verifier               = NOT RUN
DATABASE BASELINE VERIFIED      = NO
```

**HMD-010 / HMD-011** at index **74** **REACHED / APPLIED** · prior `mv.meeting_id` / `mqt.meeting_id` errors **NOT REPRODUCED**. This issuance **does not** reopen them.

---

## 4. Failing construct

**Statement 1 (runtime failure):**

```sql
ALTER TABLE public.property_invite_codes
  ADD COLUMN IF NOT EXISTS unit_no text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner';
```

| Field | Value |
|-------|-------|
| Lines | **L9–11** |
| Operation | **ALTER TABLE** |
| Required relation | **TABLE** `public.property_invite_codes` |
| Failure mode | Object resolution — relation absent |

The ALTER is **authentic historical source**. The defect is **missing executable schema origin before the ALTER**, not wrong ALTER syntax on an existing table.

---

## 5. Relation lifecycle (timestamped executable replay)

| Index | Migration | Effect |
|-------|-----------|--------|
| **80** | `20260409150000_unit_whitelist_invite_codes.sql` | **FAIL** — ALTER `property_invite_codes` |
| **112** | `20260509120000_property_invite_codes.sql` | **First CREATE** `CREATE TABLE IF NOT EXISTS public.property_invite_codes` |

```
PROPERTY_INVITE_CODES EXISTS IMMEDIATELY BEFORE TARGET = NO
FIRST EXECUTABLE TIMESTAMPED CREATE                    = 20260509120000 (AFTER target)
DISTANCE (executable migrations)                       = 32 later
```

`supabase/migrations/create_property_invite_system.sql` exists but is **not** in BCR executable replay (`nonTimestampedSqlFiles`). It **does not** establish the relation before index **80**.

No timestamped DROP/RENAME of `property_invite_codes` before target.

---

## 6. Proven base table shape (`20260509120000`)

Later historical CREATE (read-only evidence for minimum semantics):

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

Target adds (in target file, **not** in base reconstruction):

- `unit_no text`
- `role text NOT NULL DEFAULT 'owner'` (+ check constraint)

**Shape compatibility:** ALTER is structurally compatible with proven base CREATE.

---

## 7. Related naming (not substitutes)

| Object | Status |
|--------|--------|
| `property_invites` | **Distinct** — used elsewhere in target; **not** a substitute base table |
| `property_direct_invites` | **Distinct** |
| `invitation_codes` | **VIEW** created **in target** over `property_invite_codes` |

---

## 8. Later-create compatibility (future IA must prove)

`20260509120000_property_invite_codes.sql` uses **`CREATE TABLE IF NOT EXISTS`**.

Future Implementation Authorization must independently prove:

1. Exact later CREATE DDL (columns, constraints, indexes, RLS, policies, grants).
2. Whether `IF NOT EXISTS` prevents collision when replay reaches index **112**.
3. That reconstruction base shape matches later CREATE expectations.
4. That target-added `unit_no` / `role` remain compatible through replay.

If later CREATE **cannot** coexist with reconstruction without editing the later file:

```
STOP → GOVERNANCE
```

This PAD **does not** authorize editing `20260509120000`.

---

## 9. Reconstruction window

| Bound | File / timestamp |
|-------|------------------|
| Immediate predecessor | `20260409140000_vendor_risk_signals.sql` (index **79**) |
| Target | `20260409150000_unit_whitelist_invite_codes.sql` (index **80**) |
| Later CREATE | `20260509120000_property_invite_codes.sql` (index **112**) |

```
EARLIEST SAFE RECONSTRUCTION = immediately after 20260409140000
LATEST SAFE RECONSTRUCTION   = immediately before 20260409150000
PREFERRED PLACEMENT          = immediately before the target
```

**Concrete timestamp / filename:** **NOT LOCKED** in this PAD. Implementation Authorization must verify unused timestamp, no ordering collision, and dependency order. PAD-057 HMD-009 precedent assigned a filename in PAD; HMD-012 defers exact timestamp selection to IA after independent collision check.

---

## 10. Evaluated options

| Option | Decision | Reason |
|--------|----------|--------|
| **A** Exact historical source restoration | **REJECTED / NOT INDICATED** | Target substantively equals origin; no corrupted fragment |
| **B** Pre-target schema-origin reconstruction | **SELECTED** | Supplies missing base table before ALTER; preserves target + later CREATE |
| **C** Edit original target (remove/guard ALTER) | **REJECTED** | ALTER is authentic; dependency absence is the failure |
| **D** Forward-fix after target | **REJECTED / INSUFFICIENT** | Replay stops at index **80** |
| **E** Quarantine target | **REJECTED** | Executable defect; not DATA_ONLY |
| **F** Fake history / mark-applied | **REJECTED** |

```
GLOBAL QUARANTINE = EXACTLY 20260314195641_add_demo_data.sql
COUNT             = 1
TARGET QUARANTINE = NOT AUTHORIZED
```

---

## 11. Selected remediation — Option B

```
SELECTED = OPTION B
MODEL    = PRE-TARGET SCHEMA-ORIGIN RECONSTRUCTION
PURPOSE  = establish public.property_invite_codes before the authentic
           historical ALTER so clean replay can execute index 80
           without editing origin SQL or the later CREATE migration
```

### 11.1 Authorized future scope (policy only — no SQL written)

| Item | Authority |
|------|-----------|
| Option name | **OPTION B / PRE-TARGET SCHEMA-ORIGIN RECONSTRUCTION** |
| Implementation family (future) | **E-02-HFSOR-IA** reconstruction family — successor **`E-02-HFSOR-IA-004`** (not issued here) |
| File count | **EXACTLY 1** new migration |
| Object count | **EXACTLY 1** — `public.property_invite_codes` |
| Position | **After** `20260409140000` · **before** `20260409150000` |
| Timestamp / filename | **Deferred to IA** — must prove unused · ordered · no collision |
| Proven base columns (candidate) | `id`, `property_id`, `code`, `label`, `used_count`, `max_uses`, `is_active`, `created_at` per §6 |
| `unit_no` / `role` | **NOT** in reconstruction — target adds them |
| PK | **REQUIRED** (`id uuid PRIMARY KEY`) |
| FK `property_id` | **REQUIRED** (`REFERENCES public.properties`) |
| UNIQUE `code` | **REQUIRED** (`property_invite_codes_code_unique`) |
| CHECK constraints | **REQUIRED** as in proven CREATE (`used_count`, `max_uses`) |
| RLS / policies / grants / indexes | **NOT AUTHORIZED** in PAD — IA must justify each if required before target statements beyond Stmt 1 |
| Data / seed / backfill | **NOT AUTHORIZED** |
| Target after reconstruction | Stmt 1 ALTER **succeeds**; remainder of target file replayable per IA proof |
| Target edit | **NOT AUTHORIZED** |
| Later CREATE edit | **NOT AUTHORIZED** |

**PROVEN TABLE SHAPE ≠ AUTHORIZED FINAL DDL.** Exact DDL belongs in separate Implementation Authorization after later-create compatibility proof.

This is **compatibility reconstruction**, not a historical-source claim.

### 11.2 Immutability locks

```
20260409150000_unit_whitelist_invite_codes.sql     = IMMUTABLE / DO NOT EDIT
20260509120000_property_invite_codes.sql           = IMMUTABLE / DO NOT EDIT (this PAD)
```

---

## 12. Rejected defect classes

| Class | Result |
|-------|--------|
| POST_CREATION_HISTORICAL_MIGRATION_CORRUPTION | **REJECTED** |
| ORIGINAL PARSER DEFECT | **REJECTED** |
| TRANSACTION-BOUNDARY DEFECT | **REJECTED** |
| RLS/PERMISSION DEFECT | **REJECTED** |
| SEARCH-PATH DEFECT | **REJECTED** |
| ORIGINAL HISTORICAL SQL wrong-column on existing table | **REJECTED** (table absent) |

---

## 13. Relations / distinctness locks

| Defect | State |
|--------|-------|
| **HMD-009** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** · **DISTINCT** · do not reopen |
| **HMD-010** | **OPEN / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFIED** · **DISTINCT** |
| **HMD-011** | **OPEN / IMPLEMENTATION COMPLETED / HOSCC COMPLETION COMPLETED / RUNTIME REPLAY VERIFIED** · **DISTINCT** |
| **HMD-005 – HMD-008** | **OPEN / RUNTIME REPLAY VERIFIED** · **DISTINCT** |
| **HMD-003** | **OPEN / RECONSTRUCTION IMPLEMENTED / IMPLEMENTATION COMPLETED / RUNTIME REPLAY VERIFICATION PENDING** |
| **HMD-012** | **this defect** · **not CLOSED** |

```
HMD-003 W2 / APRIL HARD = REACHED / APPLIED (LOCAL-018)
HMD-003 JULY S1         = NOT REACHED / NOT APPLIED
```

Do **not** promote HMD-003 runtime replay verified.

---

## 14. BCR / LOCAL / RU / certification locks

```
BCR DBA PIN (read-only)            = E-02-DBA-LOCAL-018
BCR ARTIFACT AUTHORITY (read-only) = E-02-BCR-IA-018
BCR EDIT                           = NOT AUTHORIZED
LOCAL-018                          = APPLICATION_FAILED / EVIDENCE IMMUTABLE / attempts 1 / NO RETRY
LOCAL-019                          = NOT ISSUED
DATABASE BASELINE VERIFIED         = NO
PRESERVE/HANDOFF                   = NOT REACHED
BASELINE VERIFIER                  = NOT RUN
RU-1.1                             = NOT APPLIED VIA RU PATH
RU-1.2                             = RUNTIME NOT VERIFIED / NOT APPLIED VIA RU PATH
RU-1.4                             = RUNTIME NOT AUTHORIZED
E02_RUNTIME_EXECUTION_AUTHORIZED   = UNSET / FALSE
EIR                                = NONE
ACCEPTANCE                         = BLOCKED
CERTIFICATION                      = NOT ISSUED
RUNTIME COMMITTED                  = NOT CERTIFIED
FINAL COMMIT PATH                  = BLOCKED
```

---

## 15. Implementation authority lock

PAD-061 **selects the model**. It **does not** authorize implementation.

A **separate** future **E-02-HFSOR-IA-004** (or verified next HFSOR IA) must:

- verify PAD-061 issued / immutable;
- verify HMD-012 status and this §11 bind;
- prove exact reconstruction timestamp unused and ordered;
- prove full later-create DDL and `IF NOT EXISTS` compatibility at index **112**;
- authorize exact base-table DDL only;
- forbid target / later-create edits;
- require static verification;
- forbid runtime until later governance.

**Do not create that IA now.**

```
PAD-061
→ HMD-012 Schema-Origin Reconstruction Implementation Authorization (E-02-HFSOR-IA-004)
→ exactly one pre-target reconstruction migration
→ HFSOR Implementation Completion
→ successor BCR/DBA governance as required
→ only then future runtime replay
```

**No automatic LOCAL-019. No LOCAL-018 retry.**

---

## 16. Exact next action

```
NEXT = HMD-012 SCHEMA-ORIGIN RECONSTRUCTION IMPLEMENTATION AUTHORIZATION
       (E-02-HFSOR-IA-004 per HFSOR family numbering)
       after independent verification of PAD-061 §11 bind
       and later-create compatibility at 20260509120000
```

---

## 17. Program Authority Decisions (PAD-061 / HMIC-121 – HMIC-132)

### PAD-061 / HMIC-121 — Successor file-specific Option B permitted

**RESOLVED:** A file-specific HMIC successor may select **Option B** for HMD-012. PAD-060 governs **HMD-011 only**. PAD-057 / HMD-009 **does not** mechanically transfer (different object / pattern).

### PAD-061 / HMIC-122 — Prior-grant coverage

**RESOLVED:** HMIR restoration **does not** apply. PAD-060 HOSCC **does not** apply. PAD-057 reconstruction **does not** own `property_invite_codes`. HMD-009 / HMD-010 / HMD-011 remediation **immutable**.

### PAD-061 / HMIC-123 — Defect identifier

**RESOLVED:** Remediation policy allocated to **HMD-012**. HMD-009 – HMD-011 remain **OPEN** as locked in §13. **HMD-013+ not allocated.**

### PAD-061 / HMIC-124 — Classification

**RESOLVED:** **MISSING HISTORICAL PREREQUISITE / SCHEMA-ORIGIN DEFECT** · subtype **ORIGINAL CLEAN-REPLAY FORWARD REFERENCE TO TABLE CREATED ONLY LATER**. Source corruption: **REJECTED**. Wrong-column on existing table: **REJECTED**. Transaction-boundary / parser / RLS / search_path: **REJECTED**.

### PAD-061 / HMIC-125 — Object semantics lock

**RESOLVED:** Missing object = **`public.property_invite_codes` TABLE**. First executable timestamped CREATE = **`20260509120000`** at index **112** · **AFTER** failing index **80**.

### PAD-061 / HMIC-126 — Selected model and scope bind

**RESOLVED:** **Option B**. **Exactly one** pre-target reconstruction migration · **exactly one** object **`public.property_invite_codes`**. Minimum proven base shape in §6. **`unit_no` / `role`** added by **immutable target**. Exact DDL deferred to IA.

### PAD-061 / HMIC-127 — Later-create compatibility

**RESOLVED:** `20260509120000` **immutable** in this PAD. Future IA must prove **`CREATE TABLE IF NOT EXISTS`** compatibility at index **112**. If incompatible without later-file edit: **STOP → GOVERNANCE**.

### PAD-061 / HMIC-128 — Prohibited acts

**RESOLVED:** Target edit · later CREATE edit · forward-fix · quarantine · fake history · unrelated invite objects **prohibited**.

### PAD-061 / HMIC-129 — Rejected alternatives

**RESOLVED:** Option A · Option C · Option D · Option E = **REJECTED**.

### PAD-061 / HMIC-130 — Distinctness

**RESOLVED:** Same remediation class **≠** same defect. HMD-009 / HMD-010 / HMD-011 remain **DISTINCT**.

### PAD-061 / HMIC-131 — Implementation still separate

**RESOLVED:** This PAD is **not** Implementation Authorization. Reconstruction file **not created**. **`E-02-HFSOR-IA-004` not issued**.

### PAD-061 / HMIC-132 — LOCAL-018 / LOCAL-019 / BCR / RU

**RESOLVED:** LOCAL-018 **immutable**. LOCAL-019 **not issued**. BCR **unchanged**. RU-1.4 **not authorized**. Database baseline **not verified**.

---

**End of document — PAD-061 · HMIC-121 – HMIC-132 · HMD-012 — v1.0 — 2026-09-01**
