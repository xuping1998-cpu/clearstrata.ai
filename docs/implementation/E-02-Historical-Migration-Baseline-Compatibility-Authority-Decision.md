# E-02 Program Authority Decision — Historical Migration Baseline Compatibility

| Field | Value |
|-------|-------|
| **Document Type** | **Program Authority Decision (Supplement)** |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Parent Authority** | [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) v1.0 (PAD-001 – PAD-010) |
| **Direct Predecessor Supplement** | [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025) |
| **Supplement ID** | **PAD-026 – PAD-038** |
| **Authority Question Register** | **HMBC-001 – HMBC-018** |
| **Status** | **APPROVED WITH CONDITIONS** |
| **Authority Level** | Program Authority |
| **Effective Date** | 2026-08-22 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) |
| **Production Effect** | **None** |

> **Authority path finding:** Filename `E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md` is **authority-safe** when classified as a **Program Authority Decision supplement** continuing **PAD-026 – PAD-038** under the existing [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) document class — mirroring the established precedent of [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011 – PAD-025). It is **not** a new governance tier. Operational quarantined application remains a separate **Database Application Authorization** record (successor DBA — see PAD-030 / PAD-038).

> **Scope lock:** Establishes **Historical Migration Baseline Compatibility Authority** and a **Declared Historical Migration Quarantine** mechanism for the **E-02 local disposable executable evidence baseline only**. Does **not** apply migrations · does **not** quarantine anything at runtime · does **not** implement a replay artifact · does **not** amend any DBA · does **not** modify the historical migration file · does **not** close the historical migration defect · does **not** authorize runtime execution · does **not** collect evidence · does **not** reclassify EIR · does **not** authorize production.

```
HISTORICAL MIGRATION BASELINE COMPATIBILITY AUTHORITY = ESTABLISHED (THIS SUPPLEMENT)
DECLARED HISTORICAL MIGRATION QUARANTINE              = AUTHORIZED IN PRINCIPLE (LOCAL E-02 EVIDENCE ONLY)
QUARANTINE IMPLEMENTATION                             = NOT YET AUTHORIZED / NOT IMPLEMENTED
QUARANTINED MIGRATION                                 = 20260314195641_add_demo_data.sql (EXACTLY ONE)
HISTORICAL MIGRATION FILE                             = UNCHANGED / IMMUTABLE
HISTORICAL MIGRATION DEFECT                           = OPEN (HMD-001)
E-02-DBA-LOCAL-001                                    = NOT SUFFICIENT / NOT CONSUMED
FULL_REPOSITORY_MIGRATION_REPLAY (UNQUALIFIED)        = RETIRED FOR E-02 BASELINE
OPTION E (COMPATIBILITY PREREQUISITE STATE)           = REJECTED FOR E-02 BASELINE UNBLOCKING
DATABASE APPLICATION                                  = APPLICATION_FAILED / NOT COMPLETED
RU-1.4 RUNTIME EXECUTION                              = NOT AUTHORIZED
EIR PASS RECLASSIFICATION                             = NONE
THIS PAD                                              ≠ DATABASE APPLICATION AUTHORIZATION
THIS PAD                                              ≠ QUARANTINE IMPLEMENTATION AUTHORIZATION
THIS PAD                                              ≠ PRODUCTION DEPLOYMENT AUTHORIZATION
```

---

## 1. Purpose

Resolve the authority gap surfaced by the completed read-only forensic investigation and the D-vs-E remediation review: whether the **E-02 local disposable executable evidence baseline** may **declare and quarantine** a confirmed **non-E02, data-only, replay-defective** historical migration without treating the result as a false `FULL_REPOSITORY_MIGRATION_REPLAY`.

This supplement **does not** itself authorize any database mutation, any quarantine implementation, or any DBA amendment.

---

## 2. Authoritative inputs consumed

| Input | Role |
|-------|------|
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) v1.0 | Parent Program Authority (PAD-001 – PAD-010) · PAD-008 historical immutability |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011 – PAD-025 · DAA-011 apply-failure policy · PAD-016 baseline scope |
| [`E-02-Database-Application-Authorization.md`](E-02-Database-Application-Authorization.md) | `E-02-DBA-LOCAL-001` · `baselineMode = FULL_REPOSITORY_MIGRATION_REPLAY` (§6/§11) · §17 "do not skip migration" |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md) | `APPLICATION_FAILED` · authorization **NOT CONSUMED** · Attempt-1 Docker failure (immutable) |
| [`E-02-Executable-Remediation-Plan.md`](E-02-Executable-Remediation-Plan.md) | RU chain · RU-1.4 scope · immutability constraints |
| [`E-02-RU-1.1-Completion.md`](E-02-RU-1.1-Completion.md) · [`E-02-RU-1.2-Completion.md`](E-02-RU-1.2-Completion.md) · [`E-02-RU-1.3-Completion.md`](E-02-RU-1.3-Completion.md) | Repository IMPLEMENTED · DB NOT APPLIED · runtime NOT VERIFIED |
| [`E-02-RU-1.4-Implementation.md`](E-02-RU-1.4-Implementation.md) · [`E-02-RU-1.4-Design-Review.md`](E-02-RU-1.4-Design-Review.md) · [`E-02-RU-1.4-Implementation-Review.md`](E-02-RU-1.4-Implementation-Review.md) · [`E-02-RU-1.4-Implementation-Authorization.md`](E-02-RU-1.4-Implementation-Authorization.md) | Harness only · consumed · execution blocked |
| Repository forensic evidence (read-only, this stage) | Root cause · data-only classification · zero downstream dependency · RU-1.4 independence |

### 2.1 Consumed forensic findings (established; not reopened)

| # | Finding |
|---|---------|
| A | Historical replay fails at `supabase/migrations/20260314195641_add_demo_data.sql` — FK `owner_info_user_id_fkey → profiles(id)` violated |
| B | Root cause = **LEGACY_DEMO_MIGRATION_WITH_EXTERNAL_STATE_DEPENDENCY** |
| C | Missing deterministic prerequisite = `auth.users` **and** `profiles` rows for `a35ef381-2e80-425d-be09-ad1a9e829b3c` (both required — the `handle_new_user`/`on_auth_user_created` trigger is introduced later at `20261217160000`, so no auto-profile creation at replay of `20260314195641`) |
| D | No migration or seed creates that identity; `supabase/seed.sql` does not exist; seed runs **after** migrations |
| E | The failing migration is **DATA ONLY** — no schema DDL / functions / policies / triggers / indexes |
| F | **No downstream migration depends** on its rows (child IDs are `gen_random_uuid()`; only hard-coded ID appears solely in this file) |
| G | RU-1.4 harness (`tests/e02/**`, `scripts/verification/e02/**`) has **zero** dependency on demo data or the legacy UUID (synthetic identities only; baseline verifier inspects only `owner_vote_primary_freeze_audits` + `execute_owner_vote_atomic_freeze_commit`) |
| H | Option E has **no supported local-only pre-migration mechanism** |
| I | Option D is technically viable but **outside** current `E-02-DBA-LOCAL-001` |

---

## 3. Primary Program Authority question (HMBC-001)

**Question:** May the E-02 local executable evidence baseline declare and quarantine a confirmed non-E02 historical demo-data migration that is replay-defective, data-only, irrelevant to E-02 schema/runtime evidence, has zero downstream migration dependency, and is immutable as a historical record — **without** treating that quarantine as a false `FULL_REPOSITORY_MIGRATION_REPLAY`?

**Choices considered:**

| Option | Assessment |
|--------|------------|
| **A. NO — chain must replay literally; E-02 stays blocked until the migration is remediated** | **REJECTED** — needlessly couples E-02 evidence to an unrelated historical demo-data defect; the migration is proven irrelevant to E-02 objects |
| **B. YES — establish DECLARED BASELINE QUARANTINE authority for LOCAL DISPOSABLE E-02 evidence only** | **SELECTED** |
| **C. YES — but only through a different governed baseline model (e.g., snapshot)** | **REJECTED** — no repository snapshot exists; a snapshot baseline would hide migration-application behavior (see PAD-029) |
| **D. AUTHORITY GAP REMAINS** | **NOT SELECTED** — evidence sufficient to decide |

**Formal answer (HMBC-001):**

```
Selected = B
A DECLARED HISTORICAL MIGRATION QUARANTINE is authorized IN PRINCIPLE
for the E-02 LOCAL DISPOSABLE executable evidence baseline ONLY,
provided the exact declared boundaries in this supplement are met,
and provided a successor Database Application Authorization implements it.
This PAD establishes the mechanism; it does not implement or execute it.
```

**Decision:** **APPROVED WITH CONDITIONS** (see PAD-026 – PAD-038 and §16 conditions).

---

## 4. Governance tier finding

| Concept | Tier? | Role |
|---------|-------|------|
| **Program Authority Decision** | Existing | Establishes mechanisms · resolves authority gaps (PAD-026 – PAD-038 here) |
| **Historical Migration Baseline Compatibility Authority** | **Mechanism name** — not a standalone tier above Program Authority |
| **Declared Historical Migration Quarantine** | **Policy mechanism** — expressed operationally through a successor **Database Application Authorization** (existing document class) |
| **Historical Migration Chain Defect (HMD)** | **Defect register entry** — not a new tier; long-term remediation owner path **to be established** (PAD-032) |

```
Do not create a new decision hierarchy.
Mechanism (PAD) → Quarantine Policy (this PAD) → Successor DBA → Governed Replay Artifact (authorized later) → Application → Baseline Verify → REA → Evidence
```

---

## 5. Program Authority Decisions (PAD-026 – PAD-038)

### PAD-026 — HMBC-001: Declared quarantine permitted

**RESOLVED: YES (Option B) — APPROVED WITH CONDITIONS.**

A confirmed non-E02, data-only, replay-defective historical migration **may** be declared and quarantined from the **E-02 local disposable executable evidence baseline**. The quarantine is a **baseline execution policy** — it is **not** deletion, repair, "mark applied", global ignore, or any production change.

---

### PAD-027 — HMBC-002 / HMBC-006: Historical immutability + exact allowlist

**RESOLVED:**

- **HMBC-002 — Immutability preserved: YES.** `supabase/migrations/20260314195641_add_demo_data.sql` **MUST NOT** be modified, renamed, moved, hidden, or deleted. It remains part of repository history. Quarantine affects **only** E-02 local baseline execution policy.
- **HMBC-006 — Exact allowlist = one file: YES.** The authorized quarantine set is **EXACTLY**:

```
quarantinedMigrations = [ 20260314195641_add_demo_data.sql ]
```

**Prohibited:** wildcards · directory-wide demo exclusion · any automatic "skip failing migrations" behavior · quarantining a second migration without new Program Authority.

---

### PAD-028 — HMBC-003 / HMBC-004 / HMBC-007: Full-replay term retired · replacement term · deterministic artifact

**RESOLVED:**

- **HMBC-003 — Does quarantine break literal `FULL_REPOSITORY_MIGRATION_REPLAY`? YES (execution-chain sense).** The historical **file** is preserved (immutability intact), but the historical **execution chain** no longer runs one declared node. Unqualified `FULL_REPOSITORY_MIGRATION_REPLAY` is therefore **no longer truthful** for the quarantined baseline and is **RETIRED** for E-02 baseline use.
- **HMBC-004 — Replacement baseline term (canonical):**

```
Canonical token : E02_DECLARED_BASELINE_REPLAY
Full expansion  : FULL_REPOSITORY_SCHEMA_BASELINE_REPLAY
                  WITH DECLARED NON-E02 LEGACY-DATA QUARANTINE
```

The term **must explicitly show that exactly one declared migration is not executed.** Do **not** continue using unqualified `FULL_REPOSITORY_MIGRATION_REPLAY` after quarantine.

- **HMBC-007 — Governed replay artifact must be deterministic: YES.** Any future artifact implementing the quarantine must be deterministic, ordered, fail-closed, and reproducible from a fresh clone (no manual steps).

---

### PAD-029 — HMBC-005 / HMBC-008 / HMBC-009 / HMBC-010: Rejected mechanisms

**RESOLVED — the following are REJECTED as the quarantine/unblocking mechanism:**

| ID | Mechanism | Disposition | Reason |
|----|-----------|-------------|--------|
| **HMBC-005** | **Option E — fabricate `auth.users` + `profiles` prerequisite state** | **REJECTED for E-02 baseline unblocking** | No native pre-migration hook; seed runs after migrations; requires **both** `auth.users` + `profiles`; couples to brittle Auth internal schema; a mid-history compatibility migration would mutate the historical chain and could leak a demo identity into production; **zero** E-02 evidence benefit |
| **HMBC-008** | `supabase migration repair` | **REJECTED** | Metadata-only; does not affect a fresh `db reset` (which re-runs all SQL); would falsify applied history; not reproducible for clean baseline |
| **HMBC-009** | Temporary rename / move / manual hide / manual delete | **REJECTED** | Working-tree mutation; not reproducible; hidden execution divergence; violates PAD-027 immutability |
| **HMBC-010** | Schema snapshot / pg dump replacing replay | **REJECTED as primary fix** | No repository snapshot exists; would hide migration-application behavior; would not prove RU-1.1/RU-1.2 apply from scratch. Only a future Program Authority may redesign the evidence baseline to a snapshot model |

**Do not implement Option E. Do not use repair. Do not rename/move. Do not snapshot.**

---

### PAD-030 — HMBC-011 / HMBC-012: Current DBA insufficiency · amend vs successor

**RESOLVED:**

- **HMBC-011 — Current DBA sufficient? NO.** `E-02-DBA-LOCAL-001` mandates `baselineMode = FULL_REPOSITORY_MIGRATION_REPLAY` (§6/§11) and §17 explicitly forbids "Skip migration." A declared quarantine is **outside** its authorization. It **must not** be silently reused unchanged. Its status remains **NOT CONSUMED**.
- **HMBC-012 — Amend vs successor: ISSUE SUCCESSOR (Option B).** A **successor Database Application Authorization** — proposed ID **`E-02-DBA-LOCAL-002`** — shall be issued for the quarantined baseline, preserving `E-02-DBA-LOCAL-001` and its evidence **immutable**. Rationale: the baseline contract **term itself** changes materially (`FULL_REPOSITORY_MIGRATION_REPLAY` → `E02_DECLARED_BASELINE_REPLAY`); per PAD-013 granularity (environment + migration-set + baseline scope) and PAD-008 immutability, a new record is cleaner than mutating a record whose evidence already recorded `APPLICATION_FAILED`.

**This PAD does not create `E-02-DBA-LOCAL-002`.** It names it as the next authorized document (PAD-038).

---

### PAD-031 — HMBC-013: Failure-evidence preservation model

**RESOLVED — Option C (locked):**

| Rule | Value |
|------|-------|
| `E-02-Database-Application-Evidence-E-02-DBA-LOCAL-001.md` | **IMMUTABLE** — preserves Attempt-1 (Docker unavailable) exactly as issued |
| Attempt-2 (Docker available → FK failure at `20260314195641`) | Recorded as a **governed forensic finding** feeding this PAD and **HMD-001**; it does **not** overwrite the LOCAL-001 evidence record |
| Future evidence | A **new evidence file tied to the successor DBA** — pattern `E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md` — created only when that DBA executes |

```
No overwrite of historical evidence.
Each authorization gets its own immutable evidence record.
```

---

### PAD-032 — HMBC-014 / HMBC-018 (defect): Historical Migration Chain Defect (HMD-001)

**RESOLVED:**

- **HMBC-014 — Separate historical migration defect must remain OPEN: YES.**

| Field | Value |
|-------|-------|
| **Defect ID** | **HMD-001** |
| **Target** | `supabase/migrations/20260314195641_add_demo_data.sql` |
| **Classification** | **LEGACY_DEMO_MIGRATION_WITH_EXTERNAL_STATE_DEPENDENCY** / **HISTORICAL_REPLAY_DEFECT** |
| **Attribution** | **NOT RU-1.1 · NOT RU-1.2 · NOT RU-1.3 · NOT RU-1.4** |
| **Status** | **OPEN** — remains open even if the E-02 local baseline later succeeds via quarantine |
| **Long-term remediation** | Separate from E-02 evidence unblocking; **DEFERRED** (options may include self-contained demo data, moving demo data to a governed seed/demo-fixture layer, or a forward compatibility-cleanup migration — **not decided here**; historical file remains immutable unless future authority decides otherwise) |

- **Defect governance owner / path finding:** Candidate class = **Historical Database Baseline Remediation / Migration Chain Governance**. No existing repository document type is confirmed for this class. Therefore:

```
HMD-001 DEFECT DOCUMENT PATH = AUTHORITY TO BE ESTABLISHED
```

Do **not** invent a new engineering phase and do **not** guess the path.

---

### PAD-033 — HMBC-015 / HMBC-016: Production boundary · RU-1.4 boundary

**RESOLVED:**

- **HMBC-015 — Quarantine affects production? NO.** The declared quarantine is **LOCAL E-02 EVIDENCE ONLY**. It **must not** change production deployment, remote migration execution, shared staging, production migration history, production auth users, or production demo data. **PCQ-010 remains OPEN.**
- **HMBC-016 — RU-1.4 requires modification? NO.** The RU-1.4 harness is **IMPLEMENTED / UNCHANGED / no harness defect**. No harness amendment is required by this PAD. Only if a future governed replay artifact technically needs a small invocation boundary may a narrowly-scoped RU-1.4 touch be considered — **not** authorized here.

---

### PAD-034 — HMBC-017: Evidence-claim boundary

**RESOLVED — HMBC-017: Does successful quarantined replay prove full repository migration health? NO.**

A quarantined baseline **may** prove (only because the quarantined migration is proven irrelevant to these objects): RU-1.1 table application · RU-1.2 RPC application · RLS/grants · Primary Audit schema · immutability · C9 runtime behavior · atomic envelope · ownership/reconciliation · EIR-048/054 · RU-1.4 executable evidence.

It **must NOT** be represented as proving: all historical migrations replay cleanly · historical demo subsystem correctness · full-repository clean-replay certification.

```
E02_DECLARED_BASELINE_REPLAY PASS ≠ FULL REPOSITORY MIGRATION HEALTH
HMD-001 remains OPEN regardless of E-02 baseline outcome.
```

---

### PAD-035 — Governed replay artifact authority (artifact class)

**RESOLVED — artifact class = C (new baseline-compatibility implementation artifact).**

If (and only if) the successor DBA authorizes it, the quarantine shall be implemented by a **deterministic governed local baseline-replay artifact** — a **new baseline-compatibility implementation artifact**, distinct from RU-1.4 harness (option B rejected: RU-1.4 is unaffected) and not folded into generic DBA tooling as a blanket capability (option A rejected).

Required behavior (specification only — **not** implemented here):

| Requirement | Rule |
|-------------|------|
| Reads repository migration files | ✓ |
| Excludes **exactly one** authority-declared migration | ✓ (allowlist = PAD-027 set) |
| Executes remaining chain in timestamp order | ✓ |
| Records quarantine explicitly in a manifest | ✓ (see PAD-036) |
| Never edits/moves/renames/deletes the migration file | ✓ |
| Operates **LOCAL_DISPOSABLE only** | ✓ |
| Fails closed if the quarantine set differs from authority | ✓ |
| Fails closed on any drift (see PAD-037 preconditions) | ✓ |
| Produces manifest + evidence for the successor DBA | ✓ |

**Creation and authorization of this artifact are deferred to the successor DBA + separate implementation authorization. Not authorized by this PAD.**

---

### PAD-036 — Manifest semantics (HMBC-derived)

Any future quarantined-baseline application **must** produce a manifest stating at least:

```
baselineMode        : E02_DECLARED_BASELINE_REPLAY
quarantinedMigrations: [ 20260314195641_add_demo_data.sql ]
quarantineReason     : HISTORICAL_DEMO_EXTERNAL_STATE_DEPENDENCY
quarantineAuthority  : E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision (PAD-026–PAD-038)
migrationFileModified: false
historicalDefectOpen : true            # HMD-001
e02SchemaImpact      : none
downstreamDependency : none_found
target               : LOCAL_DISPOSABLE_SUPABASE
```

**No hidden exclusion.** The manifest must make the single quarantine explicit and auditable. **No secrets.**

---

### PAD-037 — Quarantine preconditions (fail-closed)

Before any future quarantined replay, the artifact **must** verify (else **STOP** and return to governance):

- [ ] File still exists at `supabase/migrations/20260314195641_add_demo_data.sql`
- [ ] File name/identity matches authority (PAD-027)
- [ ] File remains **data-only** (no schema/function/policy/trigger/index) — content/hash reference matches approved baseline
- [ ] **No downstream dependency** has appeared since this decision
- [ ] Quarantine count **= 1**
- [ ] Target is **local disposable**
- [ ] Repository migrations otherwise **unchanged** vs the successor DBA's recorded reference

If any assumption drifts: **STOP · do not execute · return to Program Authority.**

---

### PAD-038 — Next authorized document

**RESOLVED — HMBC-018:**

| Priority | Next document |
|----------|---------------|
| **1** | **Successor Database Application Authorization** — `E-02-Database-Application-Authorization-Local-Evidence.md` (or amended-successor path per governance) · Authorization ID **`E-02-DBA-LOCAL-002`** · `baselineMode = E02_DECLARED_BASELINE_REPLAY` · declared quarantine of exactly `20260314195641_add_demo_data.sql` · governed replay artifact class C · manifest (PAD-036) · preconditions (PAD-037) · baseline verifier mandate · failure policy |
| **2** (only after `APPLIED_AND_BASELINE_VERIFIED`) | [`E-02-RU-1.4-Runtime-Execution-Authorization.md`](E-02-RU-1.4-Runtime-Execution-Authorization.md) (`E-02-RU-1.4-REA`) |
| **Not next** | The replay artifact itself · any db reset · RU-1.4 evidence suite · HMD-001 remediation |

**This PAD creates neither the successor DBA nor the artifact.**

---

## 6. Migration classification (explicit)

| Property | Value |
|----------|-------|
| **Classification** | `NON_E02_LEGACY_DEMO_DATA` / `HISTORICAL_REPLAY_DEFECT` |
| `DATA_ONLY` | **TRUE** |
| `SCHEMA_OBJECTS` | **NONE** |
| `FUNCTIONS` | **NONE** |
| `POLICIES` | **NONE** |
| `TRIGGERS` | **NONE** (anonymous `DO $$` blocks only) |
| `INDEXES` | **NONE** |
| `DOWNSTREAM_DEPENDENCY` | **NONE FOUND** |
| `RU-1.4 DEPENDENCY` | **NONE** |
| `LEGACY_UUID DEPENDENCY` | **NONE** (occurs only in this file) |

---

## 7. Option E disposition (formal)

```
OPTION E (supply auth.users + profiles prerequisite state) = REJECTED FOR E-02 BASELINE UNBLOCKING
```

Reasons: no native pre-migration hook · seed runs after migrations · requires both `auth.users` + `profiles` · `auth.users` internal-schema coupling · a mid-history compatibility migration would mutate the historical chain · production leakage risk · no E-02 evidence benefit. **Do not implement E.**

---

## 8. Historical immutability (locked)

```
DO NOT MODIFY:  supabase/migrations/20260314195641_add_demo_data.sql
Historical file  = PRESERVED
Historical chain = executes minus one DECLARED node (local E-02 baseline only)
Historical defect (HMD-001) = OPEN
```

---

## 9. Remote non-production & production boundary

| Boundary | Rule |
|----------|------|
| Production | Quarantine has **no** effect; production deployment/migration/auth/demo data **unchanged**; **PCQ-010 OPEN** |
| Remote non-production / shared staging | Quarantine authority does **not** automatically apply; a **separate** target-specific authorization is required |
| Local disposable | The **only** environment class in scope for this quarantine |

---

## 10. Baseline verifier · REA · EIR / Acceptance boundaries

| Item | Rule |
|------|------|
| `verify:e02:baseline` | **Mandatory after** quarantined application; **migration quarantine ≠ baseline verified** |
| REA | Still **separate**; even after a corrected baseline, RU-1.4 runtime requires [`E-02-RU-1.4-Runtime-Execution-Authorization.md`](E-02-RU-1.4-Runtime-Execution-Authorization.md); **no** automatic advance |
| EIR | **No EIR PASS reclassification** by this PAD |
| Acceptance / Project Certification | **No change**; both remain blocked; HMD-001 stays open even if the E-02 local baseline later succeeds |

---

## 11. HMBC-001 – HMBC-018 register

| ID | Question | Result |
|----|----------|--------|
| **HMBC-001** | May the non-E02 defective migration be quarantined from the E-02 local baseline? | **YES — Option B (declared quarantine, local E-02 only)** |
| **HMBC-002** | Does quarantine preserve historical file immutability? | **YES** |
| **HMBC-003** | Does quarantine break literal `FULL_REPOSITORY_MIGRATION_REPLAY`? | **YES (execution-chain); file preserved** |
| **HMBC-004** | Replacement baseline term? | **`E02_DECLARED_BASELINE_REPLAY`** |
| **HMBC-005** | Is Option E rejected? | **YES — REJECTED** |
| **HMBC-006** | Must quarantine be exact allowlist = one file? | **YES — exactly `20260314195641_add_demo_data.sql`** |
| **HMBC-007** | Must a governed replay artifact be deterministic? | **YES** |
| **HMBC-008** | Can `supabase migration repair` be used? | **NO** |
| **HMBC-009** | Can temporary rename/move be used? | **NO** |
| **HMBC-010** | Can schema snapshot replace replay? | **NO (not as primary fix)** |
| **HMBC-011** | Does current DBA remain sufficient? | **NO** |
| **HMBC-012** | Amend DBA or successor DBA? | **SUCCESSOR — `E-02-DBA-LOCAL-002`** |
| **HMBC-013** | How is previous failed evidence preserved? | **Option C — LOCAL-001 evidence immutable; new evidence file per successor DBA** |
| **HMBC-014** | Must separate historical migration defect remain open? | **YES — HMD-001 OPEN** |
| **HMBC-015** | Does quarantine affect production? | **NO** |
| **HMBC-016** | Does RU-1.4 require modification? | **NO** |
| **HMBC-017** | Does quarantined replay prove full repository migration health? | **NO** |
| **HMBC-018** | Exact next governance document? | **Successor DBA `E-02-DBA-LOCAL-002` (PAD-038)** |

---

## 12. Preserved items (no change by this PAD)

| Item | Status |
|------|--------|
| **TG-1 / TG-2 / TG-3** | **OPEN** |
| **PCQ-010 / PCQ-011 / PCQ-012** | **OPEN** |
| **EIR classifications / EIR-048 / EIR-054** | **UNCHANGED** |
| **E-02 Acceptance** | **ACCEPTANCE_BLOCKED** |
| **E-02 Project Certification** | **NOT ISSUED** |
| **Runtime COMMITTED** | **NOT CERTIFIED** |
| **Executable Final COMMIT Path** | **BLOCKED** |
| **RU-1.1 / RU-1.2 / RU-1.3** | Repository IMPLEMENTED · DB NOT APPLIED · runtime NOT VERIFIED |
| **RU-1.4 harness** | IMPLEMENTED · unchanged · runtime NOT AUTHORIZED |
| **E-03 / E-04** | BLOCKED / NOT STARTED |

---

## 13. Current status effect

| Item | After this supplement |
|------|------------------------|
| **Historical Migration Baseline Compatibility Authority** | **ESTABLISHED** |
| **Declared Historical Migration Quarantine** | **AUTHORIZED IN PRINCIPLE** (local E-02 evidence only) |
| **Quarantined migration** | `20260314195641_add_demo_data.sql` (exactly one) |
| **Quarantine implementation** | **NOT YET AUTHORIZED / NOT IMPLEMENTED** |
| **Historical migration file** | **UNCHANGED / IMMUTABLE** |
| **HMD-001 historical defect** | **OPEN** |
| **`E-02-DBA-LOCAL-001`** | **NOT SUFFICIENT / NOT CONSUMED** |
| **Database Application** | **APPLICATION_FAILED / NOT COMPLETED** |
| **RU-1.4 Runtime Execution** | **NOT AUTHORIZED** |
| **EIR / Acceptance / Certification** | **UNCHANGED / BLOCKED** |
| **Next governance action** | Issue successor DBA **`E-02-DBA-LOCAL-002`** (PAD-038) |

---

## 14. Prohibited work confirmation

This supplement performed **no**: migration edit · migration rename/move/delete · SQL · replay-script implementation · harness change · package change · Docker/Supabase command · db reset · migration repair · schema snapshot · database connection · tests · DBA execution · REA · RU-1.4 runtime · EIR update · Acceptance update · Certification · E-03 · E-04. Only this authority decision document and [`README.md`](README.md) were written.

---

## 15. Decision taxonomy

```
DECISION = APPROVED WITH CONDITIONS
```

Quarantine is safe **only** with the exact declared boundaries: single-file allowlist (PAD-027), data-only precondition + fail-closed drift checks (PAD-037), local-disposable only (PAD-033), explicit manifest (PAD-036), retired terminology (PAD-028), successor DBA (PAD-030), and HMD-001 kept open (PAD-032).

---

## 16. Lock statement

```
HISTORICAL MIGRATION BASELINE COMPATIBILITY AUTHORITY = ESTABLISHED
BASELINE COMPATIBILITY DECISION                       = APPROVED WITH CONDITIONS
DECLARED QUARANTINE                                   = AUTHORIZED IN PRINCIPLE (LOCAL E-02 EVIDENCE ONLY)
QUARANTINED MIGRATION                                 = 20260314195641_add_demo_data.sql
QUARANTINE ALLOWLIST                                  = EXACTLY ONE FILE · NO WILDCARD
HISTORICAL MIGRATION FILE                             = UNCHANGED / IMMUTABLE
OPTION D (DECLARED EXCLUSION)                          = ADOPTED IN PRINCIPLE
OPTION E (PREREQUISITE STATE)                          = REJECTED
MIGRATION REPAIR                                      = REJECTED
RENAME / MOVE / HIDE / DELETE                          = REJECTED
SCHEMA SNAPSHOT (PRIMARY FIX)                          = REJECTED
FULL_REPOSITORY_MIGRATION_REPLAY (UNQUALIFIED)        = RETIRED FOR E-02 BASELINE
REPLACEMENT BASELINE TERM                             = E02_DECLARED_BASELINE_REPLAY
E-02-DBA-LOCAL-001                                    = NOT SUFFICIENT / NOT CONSUMED
DBA DISPOSITION                                       = SUCCESSOR E-02-DBA-LOCAL-002
FAILURE EVIDENCE MODEL                                = LOCAL-001 IMMUTABLE · NEW EVIDENCE PER SUCCESSOR DBA
HISTORICAL MIGRATION DEFECT                           = HMD-001 OPEN (NOT RU-1.1/1.2/1.3/1.4)
HMD-001 DEFECT DOCUMENT PATH                          = AUTHORITY TO BE ESTABLISHED
GOVERNED REPLAY ARTIFACT CLASS                        = C (NEW BASELINE-COMPATIBILITY ARTIFACT · DEFERRED)
RU-1.4 HARNESS                                        = UNCHANGED / NO DEFECT
QUARANTINED REPLAY PROVES FULL MIGRATION HEALTH       = NO
DATABASE APPLICATION                                  = APPLICATION_FAILED / NOT COMPLETED
RU-1.1 DEFECT                                         = NO
RU-1.2 DEFECT                                         = NO
RU-1.4 HARNESS DEFECT                                 = NO
QUARANTINE IMPLEMENTATION                             = NOT IMPLEMENTED
DATABASE COMMANDS                                     = NONE
EIR PASS RECLASSIFICATION                             = NONE
RUNTIME COMMITTED                                     = NOT CERTIFIED
FINAL COMMIT PATH                                     = BLOCKED
PCQ-010 / PCQ-011 / PCQ-012                           = OPEN
NEXT                                                  = AUTHORITY-SELECTED SUCCESSOR DBA (E-02-DBA-LOCAL-002)
DO NOT MODIFY HISTORICAL MIGRATIONS
DO NOT RE-RUN DB RESET
DO NOT RUN RU-1.4 EVIDENCE SUITE
```

---

**End of document — PAD-026 – PAD-038 · HMBC-001 – HMBC-018 — v1.0 — 2026-08-22**
