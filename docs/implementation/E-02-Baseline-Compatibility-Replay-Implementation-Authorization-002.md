# E-02 — Baseline Compatibility Replay Artifact — Implementation Authorization (Successor)

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Authorization (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Artifact** | Governed Baseline-Compatibility Replay Artifact (class C) — **CB-B clean-base redesign** |
| **Authorization ID** | **E-02-BCR-IA-002** |
| **Predecessor** | **E-02-BCR-IA** — [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md) · **CONSUMED / HISTORICAL / IMMUTABLE** |
| **Design authority** | [`E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md) (BCR-CB-001 · CB-B) |
| **Status** | **Approved With Conditions** |
| **Authority Level** | Implementation Authorization (repository implementation only) |
| **Effective Date** | 2026-08-22 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md) |
| **Production Effect** | **None** |

> **Authority path finding:** `E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md` is **authority-safe** as a **successor Implementation Authorization** within the BCR document family, using a distinct `-002` filename so the predecessor `E-02-BCR-IA` remains immutable — mirroring the `E-02-DBA-LOCAL-001 → -LOCAL-002` successor-filename precedent. ID **`E-02-BCR-IA-002`** parallels `E-02-BCR-IA` / `E-02-RU-1.4-IA`. **Not a new governance tier.**

> **Document class:** Bounded successor **Implementation Authorization** for **repository code implementation only**. It **does not** authorize running the artifact, database application, `supabase start`/`db start`, auxiliary project creation at runtime, migration apply, baseline verification, RU-1.4 runtime, REA, EIR reclassification, Acceptance, or Certification. Runtime execution is governed by a future successor DBA (`E-02-DBA-LOCAL-003`, not issued).

```
SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION = E-02-BCR-IA-002
DECISION                                   = APPROVED WITH CONDITIONS
PREDECESSOR E-02-BCR-IA                     = CONSUMED / HISTORICAL / IMMUTABLE
AUTHORIZED ACTION                          = IMPLEMENT CB-B CLEAN-BASE REDESIGN IN REPOSITORY
ARTIFACT EXECUTION                         = NOT AUTHORIZED BY THIS IA
CLEAN-BASE MODEL                           = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS (CB-B)
AUXILIARY PROJECT                          = FRESH LOCAL DISPOSABLE PER RUN
AUXILIARY MIGRATIONS                       = EMPTY (count = 0)
PLATFORM BASELINE                          = SUPABASE CLI / PLATFORM OWNED
REAL REPOSITORY MIGRATIONS                 = AUTHORITATIVE APPLICATION REPLAY SOURCE
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION                       = UNCHANGED / IMMUTABLE
APPLICATION HISTORY                        = TRUTHFUL (omit-not-fabricate)
PLATFORM HISTORIES                         = PRESERVED
OPTION E / RAW POSTGRES / SNAPSHOT / REPAIR = REJECTED
NEW DEPENDENCIES                           = NONE EXPECTED / NONE AUTHORIZED
BCR-CB-001                                 = DESIGN REMEDIATION DEFINED / IMPLEMENTATION AUTHORIZED / RUNTIME PENDING
```

---

## 1. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md) | **Direct design authority** — CB-B · CBQ-001–015 · CBI-1–15 · BCR-CB-001 |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md) | Predecessor **E-02-BCR-IA** — original contract (CONSUMED; **not reopened**) |
| [`E-02-Baseline-Compatibility-Replay-Completion.md`](E-02-Baseline-Compatibility-Replay-Completion.md) | Repository completion of the original artifact (core logic statically verified) |
| [`E-02-Database-Application-Authorization-LOCAL-002.md`](E-02-Database-Application-Authorization-LOCAL-002.md) | LOCAL-002 DBA — **NOT CONSUMED / FAILED**; execution contract for the (future) successor DBA |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md) | **APPLICATION_FAILED** at clean-base stage — empirical basis |
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | PAD-026–PAD-038 · quarantine · artifact class C · HMD-001 |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011–PAD-025 · manifest · apply-failure policy |
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) · [`E-02-Executable-Remediation-Plan.md`](E-02-Executable-Remediation-Plan.md) | Program locus · immutability |
| Repository (read-only) | `scripts/verification/e02/replay-e02-declared-baseline.ts` · `environment-guard.ts` · `config.toml` · `package.json` · `supabase/migrations/` |

No new Program Authority Decision required — every governing principle is preserved.

---

## 2. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-BCR-IA-002** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Authorized action** | Implement the **CB-B clean-base redesign** of the governed replay artifact in the repository |
| **Predecessor** | `E-02-BCR-IA` — CONSUMED / HISTORICAL / **not modified or reopened** |
| **Artifact execution** | **NOT AUTHORIZED** by this IA (governed by future `E-02-DBA-LOCAL-003`) |
| **BCR-CB-001** | DESIGN REMEDIATION DEFINED → **IMPLEMENTATION AUTHORIZED** → runtime verification **PENDING** |

This task performed **authorization issuance only**.

---

## 3. Authorized purpose

Replace only the defective BCR **environment acquisition + clean-base acquisition** stage — repo-workdir `supabase start`/`db start` → auto migration replay → HMD-001 failure → teardown — with **CB-B**: fresh auxiliary local Supabase project + empty auxiliary migrations + public `--workdir` + platform baseline initialization + governed replay from the **real** repository migrations.

---

## 4. Authorized CB-B design sequence (implementation contract)

1. Create a fresh **OS-temp auxiliary working directory** (unique run identity, sanitized name).
2. Initialize a local Supabase project there via supported public CLI (`supabase init`).
3. Assert auxiliary `supabase/migrations` exists **and** timestamped count = **0**.
4. Start auxiliary local Supabase via the public global **`--workdir`**.
5. CLI/image initializes platform baseline (`auth`, `storage`, roles, extensions, platform histories).
6. **No repository application migration executes** during auxiliary startup.
7. Obtain **local-only** DB connection details.
8. Hand the local target to the governed BCR replay artifact.
9. Replay migrations from the **REAL repository** `supabase/migrations/`.
10. Quarantine **exactly** `20260314195641_add_demo_data.sql`.
11. Record **only** actually executed application migrations (truthful).
12. Baseline verifier runs **only later** under the successor DBA (`E-02-DBA-LOCAL-003`), not by this artifact/IA.

---

## 5. Locked implementation conditions

| # | Condition |
|---|-----------|
| §5 Fresh-per-run | **MANDATORY fresh auxiliary project per run**; **no** environment reuse (repo migrations add storage policies/bucket rows/auth trigger; not all idempotent across replays) |
| §6 Auxiliary boundary | TEMPORARY · LOCAL · DISPOSABLE · UNLINKED; no remote/production/shared-staging ref; **no `supabase link`**; no modification to repo `config.toml`/`migrations`/linkage |
| §7 Auxiliary migrations | dir exists **and** timestamped count = 0; if ≠ 0 → **STOP** (no delete-and-continue, no copy-filtered repo migrations, no symlinked filtered tree) |
| §8 Real migration source | authoritative replay source = `<repository>/supabase/migrations/`; auxiliary workdir is **never** the application migration authority |
| §9 Quarantine | exactly `20260314195641_add_demo_data.sql`; one; no wildcard; no second; no auto-expansion; logic unchanged |
| §10 Historical immutability | no edit/rename/move/delete/patch/comment-out/copy-over; historical migration **unchanged** |
| §11 Application history | omit-not-fabricate: executed → recorded; quarantined → not executed → not recorded; **no fake applied status; no migration repair** |
| §12 Platform history | BCR must **NOT** modify `auth.schema_migrations` / `storage.migrations` / platform-owned histories; may manage **only** `supabase_migrations.schema_migrations` |
| §13 Platform baseline | CLI/images own `auth`/`auth.users`/`storage`/`storage.objects`/`storage.buckets`/extensions/roles/platform histories; **no manual construction** |
| §14 Public reset semantics | existing `DROP/CREATE public` + `DROP/CREATE supabase_migrations` may remain **only after** the auxiliary platform baseline is up; **do not** expand reset to `auth`/`storage`/platform histories |
| §19 Public CLI only | authorize only `supabase init`, global `--workdir`, local start behavior; **no** docker-compose hacks, undocumented no-migrate flags, container internals, raw Postgres, or manual auth/storage init |
| §23 Source separation | maintain explicit distinct `auxiliaryWorkdir` / `realRepositoryRoot` / `realRepositoryMigrationDir`; if `auxiliaryWorkdir == repositoryRoot` → **STOP** |
| §32 No tree copying | **do not** copy all repo migrations to temp then remove the quarantine (a modified tree); read the real repo migration dir directly |

---

## 6. Environment guard scope

The DB now belongs to an auxiliary workdir. The guard must be **retained and strengthened, not weakened**. Required checks: local-only target · auxiliary workdir identity · `repo workdir != auxiliary workdir` · no remote project ref · no production ref · no shared staging · apply opt-in (`E02_BCR_APPLY_AUTHORIZED=true`) · fresh auxiliary project · auxiliary migrations count = 0 · real repo migrations path resolved independently. Fail closed on any remote/production/unknown detection.

---

## 7. Exact authorized source file scope

| # | Path | Change | Notes |
|---|------|--------|-------|
| 1 | `scripts/verification/e02/replay-e02-declared-baseline.ts` | **MODIFY** | Add CB-B auxiliary-project acquisition + amended env guard + augmented manifest; retain all valid core logic |
| 2 *(conditional)* | `scripts/verification/e02/auxiliary-local-project.ts` | **CREATE — only if strictly necessary** | Permitted **only** if temp-workdir orchestration cannot remain clear/safe in file #1; if used, it is a helper of the artifact only |

**Strong preference: file #1 only.** No wildcard/directory authorization. No other source file may change.

**§17 environment-guard.ts finding:** **PREFER UNCHANGED.** `environment-guard.ts` already enforces local-host + no-production-denylist + `requireDatabaseUrl`. The CB-B-specific checks (auxiliary identity, `repo != aux workdir`, empty-migrations, apply opt-in, fresh-project) are **artifact-level** and belong in file #1 which **consumes** the guard read-only. **Editing `environment-guard.ts` is NOT authorized** unless implementation proves CB-B cannot be made safe without a precise, enumerated guard change — in which case the exact diff must be justified and returned to governance before editing (not pre-authorized here).

**Prohibited paths:** `supabase/migrations/**` · `src/**` · `package.json` / `package-lock.json` · RU-1.4 harness/tests · governance docs · `.gitignore` · broad wildcards.

---

## 8. Dependency finding

**No new dependency expected or authorized.** Node built-ins (`fs`/`path`/`os`) + `tsx` + `pg` + Supabase CLI (`npx supabase`) suffice. No `package.json`/lockfile change; no upgrade. If a new dependency proves necessary → **STOP → governance** (not authorized here).

---

## 9. Temp-workdir contract

OS temp directory · unique sanitized run identity · **no repository modification** · no persistent remote link · cleanup after the run lifecycle · **cleanup failure must not erase the evidence result** · cleanup must not mutate the repository.

---

## 10. Command construction

Deterministic; **no** shell interpolation of untrusted values; **no** arbitrary operator-supplied workdir; **no** arbitrary Supabase project selection; **no** remote target flag.

---

## 11. Startup validation contract (prepared, not executed under this IA)

After auxiliary startup, future runtime logic must verify: `platformBaselineReady = true` · auth schema exists · storage schema exists · application migration history initially empty · auxiliary migration count remained 0 · no repository application migration executed. Implementation may **prepare** these checks; it must **not execute** them under this IA task.

---

## 12. Manifest amendment (authorized additions)

```
cleanBaseMode                          : AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
auxiliaryWorkdir                       : <sanitized, evidence-safe>
auxiliaryProjectRef                    : <local synthetic / non-secret, if safe>
auxiliaryMigrationCountBeforeStart     : 0
platformBaselineReady                  : boolean
applicationMigrationHistoryInitiallyEmpty : boolean
realRepositoryMigrationSource          : supabase/migrations (repo-relative)
freshAuxiliaryProject                  : true
platformHistoryPreserved               : true
bcrCb001Status                         : DESIGN_REMEDIATED_RUNTIME_PENDING
```

Retains all existing manifest fields. **No secrets.**

---

## 13. Retained BCR core (do not rewrite unless required for CB-B integration)

Migration enumeration · deterministic ordering · exact one-file quarantine + allowlist guards · data-only guard · downstream UUID dependency guard · truthful omit-not-fabricate history adapter · `schema_migrations` dynamic-column adapter · manifest base · failure policy · RU-1.1 (`20261729120000`) / RU-1.2 (`20261821120000`) tracking.

---

## 14. Rejected mechanisms (unchanged)

| Mechanism | Status |
|-----------|--------|
| Option E (auth.users/profiles fabrication · seed · demo account · compatibility migration) | **REJECTED** |
| Raw Postgres | **REJECTED** |
| Raw Docker stack (as primary) | **REJECTED** |
| Platform-baseline snapshot | **REJECTED** |
| `supabase migration repair` | **REJECTED** |
| Copy repo migrations to temp then remove quarantine (modified tree) | **REJECTED** |
| Plain repo-workdir `supabase start`/`db start` as clean base (CB-F) | **REJECTED** (fails before control) |

---

## 15. Static verification allowance (this artifact)

After implementation, **non-DB** only: `npm run build` · `npm run typecheck`/`lint` (if applicable) · source inspection · `--plan` pure read-only · temp-path planning/unit logic **without** Supabase execution. **No** DB connection, `supabase start`/`db start`, Docker, or LOCAL-003 execution under this IA.

---

## 16. Implementation completion gate (static)

- [ ] Only authorized files changed (file #1, and #2 only if justified)
- [ ] CB-B auxiliary path implemented
- [ ] Auxiliary project fresh per run
- [ ] Empty-migrations assertion (count = 0)
- [ ] Public `--workdir` used (no undocumented flag)
- [ ] Real repo migration source remains authoritative
- [ ] No migration copying/filtering
- [ ] Platform histories untouched
- [ ] Application history truthful (omit-not-fabricate)
- [ ] Exact quarantine unchanged
- [ ] Environment guard retained/strengthened (guard file preferably unchanged)
- [ ] Manifest augmented (§12)
- [ ] No new dependency
- [ ] `npm run build` PASS
- [ ] No DB commands executed
- [ ] BCR-CB-001 runtime still pending (not marked resolved)

---

## 17. Post-implementation completion — path finding

After repository implementation, issue a **successor/amendment completion checkpoint** — authority-safe path **`docs/implementation/E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion.md`** (BCR completion family; mirrors `E-02-Baseline-Compatibility-Replay-Completion.md`). Not created here.

---

## 18. Governance chain

```
E-02-BCR-IA-002 (this document)
  → IMPLEMENT CB-B REDESIGN (authorized files §7)
  → E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion.md
  → SUCCESSOR DBA E-02-DBA-LOCAL-003 (application-execution authority)
  → LOCAL-003 EXECUTION → npm run verify:e02:baseline
  → E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md
  → E-02-RU-1.4-REA ONLY IF APPLIED_AND_BASELINE_VERIFIED
```

---

## 19. Preserved boundaries / status ledger

| Item | Status |
|------|--------|
| `E-02-BCR-IA` (predecessor) | **CONSUMED / HISTORICAL / IMMUTABLE** |
| `E-02-DBA-LOCAL-001` / `-002` evidence | **IMMUTABLE** — not reclassified |
| `E-02-DBA-LOCAL-002` | **NOT CONSUMED / EXECUTION FAILED** — not retried |
| `E-02-DBA-LOCAL-003` | **REQUIRED / NOT ISSUED** (future runtime authority) |
| HMD-001 | **OPEN** (CB-B does not repair it) |
| RU-1.4 | harness implemented · runtime **NOT AUTHORIZED** · evidence NOT collected · no REA |
| EIR | **No PASS** |
| Acceptance | **ACCEPTANCE_BLOCKED** |
| Project Certification | **NOT ISSUED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Executable Final COMMIT Path | **BLOCKED** |

---

## 20. Authorization conditions (validity)

Valid only if implementation matches the Clean-Base Design Amendment + Historical Migration PAD + BCR authority chain. Any deviation involving a new quarantine · migration modification · platform-schema fabrication · snapshot · raw Docker/Postgres · new dependency · remote target → **STOP → governance**.

---

## 21. Current project effect

```
BCR-CB-001         = DESIGN REMEDIATION DEFINED / IMPLEMENTATION AUTHORIZED / RUNTIME OPEN
CB-B Implementation = AUTHORIZED TO BEGIN
E-02-BCR-IA-002    = APPROVED WITH CONDITIONS (issued; not yet implemented)
LOCAL-003          = NOT ISSUED
```
No runtime status changes.

---

## 22. Prohibited work in this task (confirmation)

No artifact edit · no environment-guard edit · no package/migration change · no Docker/Supabase/DB command · no temp project creation · no LOCAL-002 retry · no LOCAL-003/completion creation · no tests · no REA · no EIR/Acceptance/Certification change. Only this record and [`README.md`](README.md) were written.

---

## 23. Lock statement

```
SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION = E-02-BCR-IA-002
DECISION                                   = APPROVED WITH CONDITIONS
PREDECESSOR E-02-BCR-IA                     = CONSUMED / HISTORICAL / IMMUTABLE
AUTHORIZED ACTION                          = IMPLEMENT CB-B CLEAN-BASE REDESIGN
AUTHORIZED FILES                           = replay-e02-declared-baseline.ts (+ ≤1 helper only if justified)
ARTIFACT EXECUTION                         = NOT AUTHORIZED BY THIS IA
CLEAN-BASE MODEL                           = AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
AUXILIARY PROJECT                          = FRESH LOCAL DISPOSABLE PER RUN
AUXILIARY MIGRATIONS                       = EMPTY (count = 0)
PLATFORM BASELINE                          = SUPABASE CLI / PLATFORM OWNED
REAL REPOSITORY MIGRATIONS                 = AUTHORITATIVE SOURCE
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION                       = UNCHANGED
APPLICATION HISTORY                        = TRUTHFUL
PLATFORM HISTORY                           = PRESERVED
NEW DEPENDENCIES                           = NONE
OPTION E / RAW POSTGRES / SNAPSHOT / REPAIR / TREE-COPY = REJECTED
ENVIRONMENT GUARD FILE                     = PREFERABLY UNCHANGED (edit not pre-authorized)
BCR-CB-001                                 = DESIGN REMEDIATION DEFINED / IMPLEMENTATION AUTHORIZED / RUNTIME PENDING
LOCAL-002                                  = FAILED / NOT CONSUMED / IMMUTABLE
LOCAL-003                                  = REQUIRED / NOT ISSUED
HMD-001                                    = OPEN
RU-1.4 RUNTIME                             = NOT AUTHORIZED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = IMPLEMENT CB-B REDESIGN UNDER E-02-BCR-IA-002
DO NOT MODIFY MIGRATIONS · NO DATABASE COMMANDS · NO SOURCE MODIFICATION IN THIS TASK
```

---

**End of document — E-02-BCR-IA-002 — v1.0 — 2026-08-22**
