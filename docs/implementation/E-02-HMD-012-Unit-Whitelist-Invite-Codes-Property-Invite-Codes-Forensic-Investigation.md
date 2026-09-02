# E-02 HMD-012 — Unit Whitelist Invite Codes Property-Invite-Codes Forensic Investigation

## Clean-Replay Missing `public.property_invite_codes` Before Target · `20260409150000_unit_whitelist_invite_codes.sql`

| Field | Value |
|-------|-------|
| **Document Type** | Forensic Investigation Record (governance) — **not** a Program Authority Decision |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Defect** | **HMD-012** |
| **Target** | `supabase/migrations/20260409150000_unit_whitelist_invite_codes.sql` |
| **Controlling runtime evidence** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-018.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-018.md) · Event 2 · run `local-018-20260901a` |
| **Status** | **FORENSIC INVESTIGATION COMPLETE** |
| **Classification** | **MISSING HISTORICAL PREREQUISITE / SCHEMA-ORIGIN DEFECT** · subtype **ORIGINAL CLEAN-REPLAY FORWARD REFERENCE TO TABLE CREATED ONLY LATER** |
| **Effective Date** | 2026-09-01 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-HMD-012-Unit-Whitelist-Invite-Codes-Property-Invite-Codes-Forensic-Investigation.md`](E-02-HMD-012-Unit-Whitelist-Invite-Codes-Property-Invite-Codes-Forensic-Investigation.md) |
| **Production Effect** | **None** |
| **Executable Work Authorized** | **NO** |

> **Authority path finding: YES.** Highest allocated HMD before this record is **HMD-011**. **HMD-012 is the next unused identifier.** No HMD-012 existed before this investigation. **Not a PAD.** **Not Implementation Authorization.** **Not LOCAL-019.** **Not a merge into HMD-009 / HMD-010 / HMD-011.**

```
HMD-012                                            = OPEN / FORENSIC INVESTIGATION COMPLETE /
                                                       DISTINCT /
                                                       MISSING HISTORICAL PREREQUISITE /
                                                       SCHEMA-ORIGIN DEFECT
TARGET                                             = 20260409150000_unit_whitelist_invite_codes.sql
FAILING STATEMENT                                  = Stmt 1 — ALTER TABLE public.property_invite_codes (L9–11)
MISSING OBJECT                                     = public.property_invite_codes (TABLE)
RUNTIME ERROR                                      = relation "public.property_invite_codes" does not exist
TARGET ORIGIN COMMIT                               = 3ae74e2a1be01079087b47dbc84b38f048009f9b ("whitelist")
TARGET ORIGIN BLOB                                 = a2cd966530fee806bd61eb772e45a87949cdd0ae
CURRENT BLOB                                       = 38d5271d109724ed0c70300ab23f6257811066cd
CURRENT == TARGET ORIGIN (substantive)             = YES (trailing whitespace only)
FIRST TIMESTAMPED CREATE                           = 20260509120000_property_invite_codes.sql (executable index 112)
CREATE BEFORE TARGET                               = NO
RELATION EXISTS BEFORE TARGET (clean replay)       = NO
NON-TIMESTAMPED create_property_invite_system.sql  = EXISTS but NOT IN BCR EXECUTABLE REPLAY
SOURCE CORRUPTION OF FAILING DEPENDENCY          = REJECTED (dependency in origin)
TRANSACTION-BOUNDARY                               = REJECTED
PARSER / ENCODING                                  = REJECTED
SEARCH_PATH                                        = REJECTED (explicit public.)
RLS / PERMISSION                                   = REJECTED (relation does not exist)
FORWARD-FIX AS CLEAN REPLAY REMEDY                 = INSUFFICIENT (replay stops at index 80)
TARGET QUARANTINE                                  = NOT AUTHORIZED
RECONSTRUCTION ELIGIBILITY                         = FORENSICALLY ELIGIBLE (NOT AUTHORIZED / NOT CREATED)
RESTORATION ELIGIBILITY                            = NOT INDICATED (no earlier timestamped CREATE)
PROGRAM AUTHORITY                                  = NOT ISSUED
LOCAL-018                                          = APPLICATION_FAILED / EVIDENCE IMMUTABLE / attempts 1 / NO RETRY
LOCAL-019                                          = NOT ISSUED
```

---

## 1. LOCAL-018 evidence gate

| Field | Observed |
|-------|----------|
| LOCAL-018 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| Event 1 | **BLOCKED** (Docker) · apply **NOT STARTED** · attempts **0** |
| Event 2 | pre-stateful **PASS** · single `--apply` · attempts **1** |
| evidenceRunId | `local-018-20260901a` |
| Manifest | `tests/e02/evidence/local-018-20260901a/bcr-replay-manifest.json` |
| Executed | **79** |
| Highest applied | `20260409140000_vendor_risk_signals.sql` (executable index **79**) |
| First failing | `20260409150000_unit_whitelist_invite_codes.sql` |
| Executable index | **80** |
| Error | `relation "public.property_invite_codes" does not exist` |
| Preserve/handoff | **NOT REACHED** |
| Baseline verifier | **NOT RUN** |

**Prior HMD successes preserved:** HMD-010 / HMD-011 target `20260405120000` **REACHED / APPLIED** at index **74** · prior `mv.meeting_id` / `mqt.meeting_id` errors **NOT REPRODUCED**.

---

## 2. Failing statement

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

Subsequent statements (indexes, view `invitation_codes`, functions, `submit_join_request` patch, trigger) also reference `property_invite_codes` but replay **never reached** them.

---

## 3. Target identity

| Field | Value |
|-------|-------|
| Path | `supabase/migrations/20260409150000_unit_whitelist_invite_codes.sql` |
| Current blob | `38d5271d109724ed0c70300ab23f6257811066cd` |
| Worktree | matches HEAD (substantive); dirty only vs older commits |
| Origin commit | `3ae74e2` (*whitelist*) |
| Origin blob | `a2cd966530fee806bd61eb772e45a87949cdd0ae` |
| Substantive delta origin→current | **NONE** (EOF whitespace) |

Target header documents physical table `public.property_invite_codes` and unit-whitelist semantics from introduction.

---

## 4. `property_invite_codes` lifecycle (timestamped executable replay)

| Question | Answer |
|----------|--------|
| A. CREATE TABLE in timestamped migrations? | **YES** — `20260509120000_property_invite_codes.sql` |
| B. First creating migration | **`20260509120000_property_invite_codes.sql`** |
| C. Before `20260409150000`? | **NO** |
| D. After target? | **YES** (~32 executable migrations later) |
| E. Historically deleted/renamed? | **NO** timestamped DROP/RENAME before target |
| F. No creation at all? | **REJECTED** — creation exists but **after** target |

**Executable index map:**

| Index | Migration |
|-------|-----------|
| **80** | `20260409150000_unit_whitelist_invite_codes.sql` (**FAIL**) |
| **112** | `20260509120000_property_invite_codes.sql` (**first CREATE**) |

**Clean-replay answer:** `PROPERTY_INVITE_CODES EXISTS IMMEDIATELY BEFORE TARGET = **NO**`

---

## 5. Non-timestamped artifact

`supabase/migrations/create_property_invite_system.sql` contains `CREATE TABLE IF NOT EXISTS public.property_invite_codes` with a **different** early schema (`auto_approve`, no `label`/`is_active` parity with later migration).

BCR `--plan` lists this file under `nonTimestampedSqlFiles`. Governed replay uses **timestamped** migrations only (**287** discovered · **286** executable · quarantine **1**). This file is **not** applied in clean replay and **does not** establish the relation before index **80**.

---

## 6. Proven later table shape (`20260509120000`)

Minimum columns created before target ALTER expects base table:

- `id`, `property_id`, `code`, `label`, `used_count`, `max_uses`, `is_active`, `created_at`
- Target then adds: `unit_no`, `role` (with check constraint)

Target dependency shape: existing table with core invite-code columns; ALTER adds whitelist columns.

---

## 7. Related naming (not substitutes)

| Object | Relationship |
|--------|----------------|
| `property_invites` | **Distinct** legacy invite table (used in same target file) |
| `property_direct_invites` | **Distinct** directed-invite table |
| `invitation_codes` | **VIEW** created **in target** over `property_invite_codes` — not a substitute base table |

Failure is **not** a wrong-table name for an existing similarly named relation.

---

## 8. Distinctness

| Defect | Distinction |
|--------|-------------|
| **HMD-009** | Different target file (`20260405120000`) · missing `hiring_jobs` · index **74** · reconstruction **pre-target** |
| **HMD-010** | Wrong-column on **existing** `meeting_votes` · same multi-tenant file · **resolved** at LOCAL-018 |
| **HMD-011** | Wrong-column on **existing** `meeting_quota_tracker` · same multi-tenant file · **resolved** at LOCAL-018 |
| **HMD-012** | **Different migration** · missing **entire table** · index **80** · forward reference to later CREATE |

Same general class (clean-replay prerequisite) ≠ same defect.

---

## 9. Remediation eligibility (analysis only)

| Path | Result |
|------|--------|
| **Forward fix** | **INSUFFICIENT** — replay cannot reach index **112** without passing index **80** |
| **Target quarantine** | **NOT AUTHORIZED** — would hide executable defect; global quarantine remains demo-data only |
| **Exact source restoration** | **NOT INDICATED** — no earlier timestamped CREATE to restore |
| **Pre-target reconstruction** | **FORENSICALLY ELIGIBLE** — minimum semantic need: base `public.property_invite_codes` table consistent with later `20260509120000` before target ALTER (not authorized here) |
| **PAD / IA / Completion** | **NOT ISSUED** |

---

## 10. Locks (unchanged by this investigation)

| Item | State |
|------|-------|
| HMD-009 | OPEN / **RUNTIME REPLAY VERIFIED** at LOCAL-018 checkpoint (recon+target applied · `hiring_jobs` not reproduced) · **not CLOSED** |
| HMD-010 | OPEN / IMPLEMENTATION COMPLETED / **RUNTIME REPLAY VERIFIED** · **not CLOSED** |
| HMD-011 | OPEN / IMPLEMENTATION COMPLETED / HOSCC COMPLETION COMPLETED / **RUNTIME REPLAY VERIFIED** · **not CLOSED** |
| HMD-003 | OPEN / W2 + April HARD **APPLIED** · July S1 **NOT REACHED** · RUNTIME PENDING |
| LOCAL-018 | APPLICATION_FAILED / attempts **1** / **NO RETRY** |
| DATABASE BASELINE | **NOT VERIFIED** |
| LOCAL-019 | **NOT ISSUED** |

---

## 11. Next governance action

```
NEXT = PROGRAM AUTHORITY DECISION
       (only if remediation path is established from this forensic record)
```

**Do not** repair · **do not** retry LOCAL-018 · **do not** issue LOCAL-019 automatically.
