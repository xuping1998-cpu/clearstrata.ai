# E-02 — Baseline Compatibility Replay — Clean-Base Design Amendment

| Field | Value |
|-------|-------|
| **Document Type** | Design Amendment (BCR clean-base / environment-acquisition) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Amends (design of)** | Governed Baseline-Compatibility Replay Artifact — [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md) (E-02-BCR-IA, **CONSUMED / historical**) |
| **Defect addressed** | **BCR-CB-001** — BCR clean-base / environment-prep incompatibility |
| **Status** | **Approved With Notes (design remediation defined · runtime verification pending)** |
| **Effective Date** | 2026-08-22 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md) |
| **Production Effect** | **None** |

> **Authority path finding:** `E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md` is **authority-safe** within the existing BCR document family (`E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md` · `E-02-Baseline-Compatibility-Replay-Completion.md`), mirroring the design-review document class precedent ([`E-02-RU-1.4-Design-Review.md`](E-02-RU-1.4-Design-Review.md)). It is a **design amendment**, **not** a new governance tier, **not** a Program Authority Decision, **not** an Implementation Authorization, **not** a DBA. It authorizes **no code, no DB, no execution**.

> **No new Program Authority required:** every governing principle of [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026–PAD-038) and [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011–PAD-025) is **preserved** — single-file quarantine, truthful omit-not-fabricate history, local-disposable only, no Option E, no snapshot, no migration repair, historical migration immutable. CB-B is a refinement of the **environment-acquisition mechanism only**.

```
BCR CLEAN-BASE DESIGN                = APPROVED WITH NOTES
BCR-CB-001                           = DESIGN REMEDIATION DEFINED / RUNTIME VERIFICATION PENDING
BEST OPTION                          = CB-B (disposable auxiliary local Supabase project · empty migrations · --workdir)
CURRENT BCR CORE LOGIC               = RETAINED
CURRENT ENVIRONMENT ACQUISITION      = SUPERSEDED BY CB-B DESIGN
QUARANTINE                           = EXACTLY 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION                 = UNCHANGED
APPLICATION HISTORY                  = TRUTHFUL (omit-not-fabricate)
PLATFORM MIGRATION HISTORIES         = PRESERVED
OPTION E / RAW POSTGRES / SNAPSHOT   = REJECTED
E-02-BCR-IA                          = CONSUMED / HISTORICAL (not reopened)
E-02-DBA-LOCAL-002                   = NOT CONSUMED / EXECUTION FAILED / IMMUTABLE
LOCAL-003                            = REQUIRED / NOT ISSUED
HMD-001                              = OPEN
RU-1.4 RUNTIME                       = NOT AUTHORIZED
```

---

## 1. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md) | E-02-BCR-IA — original artifact contract (**CONSUMED**; amended in design here, not rewritten) |
| [`E-02-Baseline-Compatibility-Replay-Completion.md`](E-02-Baseline-Compatibility-Replay-Completion.md) | Repository implementation completion — clean-base flagged NOT runtime-verified |
| [`E-02-Database-Application-Authorization-LOCAL-002.md`](E-02-Database-Application-Authorization-LOCAL-002.md) | LOCAL-002 DBA (application-mechanism contract; **NOT CONSUMED / FAILED**) |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-002.md) | **APPLICATION_FAILED** at clean-base stage — empirical basis for BCR-CB-001 |
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | PAD-026–PAD-038 · quarantine · artifact class C · HMD-001 |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011–PAD-025 · manifest · apply-failure policy |
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) · [`E-02-Executable-Remediation-Plan.md`](E-02-Executable-Remediation-Plan.md) | Program locus · immutability constraints |
| [`E-02-RU-1.4-Implementation-Authorization.md`](E-02-RU-1.4-Implementation-Authorization.md) · [`E-02-RU-1.4-Implementation-Review.md`](E-02-RU-1.4-Implementation-Review.md) | RU-1.4 harness boundary (unchanged) |

**Consumed design-review findings:** CB-A **UNSUPPORTED** · **CB-B SUPPORTED / BEST** · CB-C **WEAK** · CB-D **UNACCEPTABLE** · CB-E **WEAK / REQUIRES NEW AUTHORITY** · CB-F **UNACCEPTABLE AS-IS**.

---

## 2. Amendment decision

| Field | Value |
|-------|-------|
| **Decision** | **APPROVED WITH NOTES** |
| **Scope** | BCR **environment-acquisition + clean-base acquisition design only** |
| **BCR-CB-001** | **DESIGN REMEDIATION DEFINED** (runtime verification pending successor DBA execution) |
| **Adopted mechanism** | **CB-B** — disposable auxiliary local Supabase project |
| **Code / DB effect** | **None** — this is design authority; implementation requires a successor BCR IA |

No contradiction found with any higher governance layer. CB-B is implementable within existing Program Authority.

---

## 3. Defect formalization — BCR-CB-001

**BCR-CB-001 — BCR clean-base / environment-prep incompatibility.** The current artifact assumes a **live, platform-initialized local Supabase database exists before replay begins**. But repository-workdir `supabase start` / `supabase db start` **apply the repository migration chain before the artifact gains control**, hit **HMD-001** at `20260314195641_add_demo_data.sql`, and **tear down containers/volumes** on failure. Therefore environment acquisition is **not executable** under the existing design.

| BCR-CB-001 is NOT | Reason |
|-------------------|--------|
| HMD-001 | HMD-001 = historical migration external-state (FK) defect; BCR-CB-001 = tooling environment-acquisition/orchestration defect |
| RU-1.1 / RU-1.2 / RU-1.3 defect | Those migrations are valid; not reached |
| RU-1.4 harness defect | Harness unchanged / no defect |

**Closure model:** `DESIGN REMEDIATION DEFINED`. **Must not** be marked `RUNTIME RESOLVED` until a successor DBA execution proves CB-B works end-to-end.

---

## 4. Target clean-base state (locked)

```
PLATFORM_BASELINE_READY
+ APPLICATION_SCHEMA_EMPTY
+ APPLICATION_MIGRATION_HISTORY_EMPTY
+ AUTH_PLATFORM_SCHEMA_PRESENT       (auth schema + auth.users)
+ STORAGE_PLATFORM_SCHEMA_PRESENT    (storage.objects + storage.buckets)
+ PLATFORM_ROLES_AND_EXTENSIONS_READY
+ NO REPOSITORY MIGRATIONS APPLIED
```

This is the hand-off state to the governed replay. **Achievable via CB-B.**

---

## 5. CB-B design (environment acquisition — replaces defective stage)

Design sequence (implementation deferred to successor BCR IA):

1. Create a fresh **temporary working directory** outside repository-controlled migration history (OS temp / clearly disposable path).
2. Initialize an **auxiliary Supabase project** using a supported public CLI mechanism (`supabase init` in the temp dir).
3. Assert the auxiliary `supabase/migrations/` is **empty** (timestamped count = 0).
4. Start the auxiliary Supabase stack via the public global **`--workdir`** pointed at the auxiliary project.
5. Let the CLI/images initialize the **platform baseline** (`auth`, `storage`, extensions, roles, platform internals).
6. Because auxiliary migrations are empty, **no repository application migration executes** during bring-up.
7. Obtain **local-only** connection details for the auxiliary DB.
8. Hand that local target to the **governed BCR artifact**.
9. BCR replays migrations from the **REAL repository** `supabase/migrations/` using existing deterministic logic.
10. Quarantine **exactly** `20260314195641_add_demo_data.sql`.
11. Record **only actually executed** application migrations (truthful).
12. Run the baseline verifier after replay.
13. Destroy the auxiliary project/environment after the evidence lifecycle (never before evidence issuance).

---

## 6. Locked design rules

| # | Rule |
|---|------|
| §6 Auxiliary workdir | TEMPORARY · DISPOSABLE · LOCAL-ONLY · **not** a migration source · **not** a product project · **not** remote/production |
| §7 `--workdir` | Public CLI global only (confirmed present in installed CLI evidence). No undocumented flag, no internal Docker hook, no migration-path hack. If `--workdir` is removed in a future CLI → **STOP → governance** |
| §8 Auxiliary creation | `supabase init` (or equivalent public init) in a temp dir. **No** hand-built config, Docker stack, raw Postgres, or copied auth/storage schemas |
| §9 Empty-migrations precondition | Assert auxiliary `supabase/migrations` exists **and** timestamped count = 0. If any migration present → **STOP** (do not silently delete) |
| §10 Platform baseline authority | CLI/image owns `auth`/`auth.users`/`storage`/`storage.objects`/`storage.buckets`/extensions/roles/platform histories. BCR fabricates **none** of these |
| §11 History systems | **Application:** `supabase_migrations.schema_migrations` (BCR may reset/recreate). **Platform:** `auth.schema_migrations`, `storage.migrations` (BCR must **NOT** touch) |
| §12 Application reset | Existing `DROP/CREATE public` + `DROP/CREATE supabase_migrations` remains as an application-layer step **only**; **FRESH AUXILIARY PROJECT PER RUN is MANDATORY** |
| §13 Internal-schema additive migrations | Confirmed: repo migrations add `CREATE POLICY … ON storage.objects`, `INSERT/UPDATE storage.buckets`, `CREATE TRIGGER on_auth_user_created ON auth.users` — **none create/drop** the auth/storage base schemas. CB-B provides correct prerequisites on a fresh baseline |
| §14 Raw Postgres | **REJECTED** — repo migrations rely on Supabase platform internals (`auth.uid()`, `auth.users`, `storage.objects/buckets`, extensions) |
| §15 Raw Docker stack | **REJECTED as primary** — internal/unsupported/version-coupled |
| §16 Snapshot | **REJECTED** — no platform-baseline snapshot; prior snapshot boundary preserved |
| §17 Option E | **REJECTED** — no auth.users/profiles fabrication, no demo-user pre-seed, no compatibility migration |
| §18 Quarantine | Still **exactly** `20260314195641_add_demo_data.sql`; no second quarantine; HMD-001 scope unchanged |
| §19 Migration source separation | Auxiliary migrations = EMPTY; authoritative replay source = repo `supabase/migrations/`. **No** copying the repo set into the auxiliary workdir and deleting the quarantine; **no** temporary modified migration tree |
| §20 Truthful history | Executed repo migrations → application history; quarantined → not executed → not recorded; platform history untouched; **no fake applied status** |

---

## 7. Environment-guard amendment (design)

The DB now belongs to an auxiliary workdir rather than the repository's local project. Guards must be **adjusted but not weakened**:

- Target host must still be **local** (localhost / 127.0.0.1 / `*.local`).
- Local Docker/Supabase only; **no** remote project ref, **no** production ref, **no** shared staging.
- Expect the **auxiliary project identity** (do not assume the repo project id).
- BCR execution opt-in (`E02_BCR_APPLY_AUTHORIZED=true`) still required.
- Fail closed on any remote/production/unknown detection. Differing workdir is **not** a reason to relax any check.

---

## 8. Temp-directory boundary & cleanup

- Future implementation uses an OS temp / clearly disposable path. It must **not** modify repository `supabase/config.toml`, `supabase/migrations`, or any project link; **no** `supabase link`; **no** remote association.
- Cleanup removes the auxiliary stack + temp workdir **after** the evidence lifecycle. **Cleanup failure must not erase the evidence result**; cleanup must not mutate the repository.

---

## 9. Error policy (fail-closed)

**STOP** (no fallback to plain repo `supabase start`, raw Postgres, raw Docker, Option E, migration repair, or manual SQL) if: auxiliary init fails · auxiliary migrations not empty · auxiliary start applies any application migration · platform baseline missing auth/storage · real repo migration source unresolved · workdir unexpectedly points at the repo · remote target detected · platform version mismatch prevents replay.

---

## 10. Manifest amendment (design)

Future BCR manifest additionally records (no secrets):

```
cleanBaseMode                          : AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS
auxiliaryWorkdir                       : <sanitized, evidence-safe descriptor>
auxiliaryProjectRef                    : <local synthetic / non-secret, if safe>
auxiliaryMigrationCountBeforeStart     : 0
platformBaselineReady                  : true|false
applicationMigrationHistoryInitiallyEmpty : true|false
realRepositoryMigrationSource          : supabase/migrations (repo-relative)
freshAuxiliaryProject                  : true
platformHistoryPreserved               : true
bcrCb001Status                         : DESIGN_REMEDIATION_DEFINED | RUNTIME_VERIFIED (future)
```

Retains all existing manifest fields (authorizationId, baselineMode, quarantine set/count, HMD-001, counts, ru11/ru12, result, timestamps, migrationFileModified=false).

---

## 11. Current BCR artifact disposition

| Component | Disposition |
|-----------|-------------|
| Migration enumeration · deterministic ordering | **RETAIN** |
| Exact one-file quarantine · allowlist guards | **RETAIN** |
| Data-only guard · downstream UUID guard | **RETAIN** |
| Truthful omit-not-fabricate bookkeeping · `schema_migrations` adapter | **RETAIN** |
| Manifest contract | **RETAIN (augment §10)** |
| **Environment acquisition** | **REPLACE** (CB-B) |
| **Clean-base acquisition** | **REPLACE / NARROW** (fresh auxiliary project + retained public/history reset) |

**No full rewrite** unless technically required. `E-02-BCR-IA` is **not reopened**; a successor IA governs the change.

---

## 12. Future implementation file scope (design)

| Path | Expected change |
|------|-----------------|
| `scripts/verification/e02/replay-e02-declared-baseline.ts` | Modify: add CB-B auxiliary-project acquisition + amended env guard + manifest fields |
| *(optional)* one new helper e.g. `scripts/verification/e02/auxiliary-local-project.ts` | **Only if** temp-workdir orchestration cannot remain clear/safe in one file |

**Strong preference: minimal change (single file).** The successor BCR IA must **enumerate the exact allowed files**; no open-ended directory authority.

---

## 13. Dependencies & static verification

- **No new dependency expected** — Node + `tsx` + `pg` + Supabase CLI suffice. If implementation requires a new dependency → **STOP / disclose** in the successor IA (not authorized here).
- **Static verification plan (no DB):** temp-path plan · empty-migrations assertion · real-repo source separation · command construction · manifest augmentation · local-only guard — all unit/pure-logic verifiable; `npm run build`; `--plan` read-only. No DB execution during implementation.

---

## 14. Governance chain

```
BCR CLEAN-BASE DESIGN AMENDMENT (this document)
  → NEW / SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION (CB-B env-acquisition; exact file scope)
  → IMPLEMENT CB-B REDESIGN
  → BCR (amendment) COMPLETION CHECKPOINT
  → SUCCESSOR DBA E-02-DBA-LOCAL-003
  → LOCAL-003 EXECUTION → baseline verifier
  → E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md
  → REA (E-02-RU-1.4-REA) ONLY IF APPLIED_AND_BASELINE_VERIFIED
```

**Successor BCR IA — path finding:** authority-safe form ID **`E-02-BCR-IA-002`**, path **`docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md`** (distinct filename so the original `E-02-BCR-IA` remains immutable — mirrors the `E-02-DBA-LOCAL-001 → -LOCAL-002` successor-filename precedent). Not created here.

---

## 15. Design questions (CBQ)

| ID | Question | Result |
|----|----------|--------|
| CBQ-001 | Is CB-B the authoritative BCR clean-base mechanism? | **YES** |
| CBQ-002 | Must the auxiliary project be fresh every run? | **YES (mandatory)** |
| CBQ-003 | Must auxiliary migrations count be zero? | **YES** |
| CBQ-004 | Is `--workdir` mandatory? | **YES** (public global; STOP→governance if removed) |
| CBQ-005 | May repository migrations be copied/filtered into the auxiliary workdir? | **NO** |
| CBQ-006 | Is the real repository migrations path the authoritative replay source? | **YES** (`supabase/migrations/`) |
| CBQ-007 | May BCR modify platform histories? | **NO** (`auth.schema_migrations`/`storage.migrations` preserved) |
| CBQ-008 | May BCR retain `public` + `supabase_migrations` reset? | **YES**, bounded: application-layer only, on a fresh auxiliary baseline, never touching platform schemas/histories |
| CBQ-009 | Does the environment guard require amendment? | **YES** (auxiliary identity; local-only preserved; not weakened) |
| CBQ-010 | Exact future implementation files allowed? | `replay-e02-declared-baseline.ts` (+ at most one enumerated helper) — locked by successor IA |
| CBQ-011 | Are new dependencies needed? | **NO expected** (else STOP/disclose) |
| CBQ-012 | Can BCR-CB-001 be closed at design stage? | **NO** — design-remediated only; runtime open |
| CBQ-013 | Does LOCAL-002 remain immutable failed history? | **YES** |
| CBQ-014 | Is LOCAL-003 required? | **YES** (materially changed mechanism) |
| CBQ-015 | Does this require a new Program Authority Decision? | **NO** (principles preserved) |

---

## 16. Design invariants (CBI)

| ID | Invariant |
|----|-----------|
| CBI-1 | Platform baseline before application replay |
| CBI-2 | No repository migration before BCR control |
| CBI-3 | Auxiliary migrations empty |
| CBI-4 | Real repository migrations authoritative source |
| CBI-5 | Historical migration immutable |
| CBI-6 | Exactly one quarantine |
| CBI-7 | Application history truthful |
| CBI-8 | Platform histories preserved |
| CBI-9 | Fresh auxiliary environment per run |
| CBI-10 | Local-disposable only |
| CBI-11 | No Option E |
| CBI-12 | No raw Postgres / manual platform fabrication |
| CBI-13 | No snapshot |
| CBI-14 | No migration repair |
| CBI-15 | BCR redesign ≠ runtime proof |

All **HELD** by this design.

---

## 17. Risks (runtime — NOT closed at design stage)

`--workdir` CLI behavior change · temp-directory leakage · container/project-name collision · auxiliary migrations unexpectedly non-empty · platform image/CLI version mismatch · `storage.buckets` non-idempotency on a reused env (mitigated by fresh-per-run) · env-guard false positive/negative · cleanup failure · repository-vs-auxiliary migration-source confusion · platform-vs-application history confusion. Each must be exercised at LOCAL-003 execution; none is resolved here.

---

## 18. Preserved boundaries / status ledger

| Item | Status |
|------|--------|
| `E-02-BCR-IA` | **CONSUMED / HISTORICAL** (not reopened) |
| `E-02-DBA-LOCAL-001` / `-002` evidence | **IMMUTABLE** — not reclassified/overwritten |
| `E-02-DBA-LOCAL-002` | **NOT CONSUMED / EXECUTION FAILED** |
| `E-02-DBA-LOCAL-003` | **REQUIRED / NOT ISSUED** |
| HMD-001 | **OPEN** (CB-B does not repair it) |
| RU-1.4 | Harness implemented · **runtime NOT AUTHORIZED** · evidence NOT collected · no REA |
| EIR | **No PASS** |
| Acceptance | **ACCEPTANCE_BLOCKED** |
| Project Certification | **NOT ISSUED** |
| Runtime COMMITTED | **NOT CERTIFIED** |
| Executable Final COMMIT Path | **BLOCKED** |

---

## 19. Next governance document

**Successor BCR Implementation Authorization** — `E-02-BCR-IA-002` / `E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md` (CB-B env-acquisition; exact file scope; dependency finding; static-verification gate). **Not created in this task.**

---

## 20. Prohibited work in this task (confirmation)

No BCR artifact edit · no source/migration/package change · no Docker/Supabase/DB command · no temp project creation · no LOCAL-002 rerun · no LOCAL-003/BCR-IA creation · no REA · no EIR/Acceptance/Certification change. Only this amendment and [`README.md`](README.md) were written.

---

## 21. Lock statement

```
BCR CLEAN-BASE DESIGN                 = APPROVED WITH NOTES
BCR-CB-001                            = DESIGN REMEDIATION DEFINED / RUNTIME VERIFICATION PENDING
CB-B                                  = AUTHORIZED DESIGN (best option)
AUXILIARY PROJECT                     = FRESH LOCAL DISPOSABLE PER RUN
AUXILIARY MIGRATIONS                  = EMPTY (count = 0)
PLATFORM BASELINE                     = SUPABASE CLI / PLATFORM OWNED
REAL REPOSITORY MIGRATIONS            = AUTHORITATIVE APPLICATION REPLAY SOURCE
QUARANTINE                            = EXACTLY 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION                  = UNCHANGED
APPLICATION HISTORY                   = TRUTHFUL
PLATFORM MIGRATION HISTORIES          = PRESERVED
OPTION E / RAW POSTGRES / SNAPSHOT / REPAIR = REJECTED
CURRENT BCR CORE                      = RETAINED
CURRENT ENVIRONMENT ACQUISITION       = SUPERSEDED BY CB-B DESIGN
E-02-BCR-IA                           = CONSUMED / HISTORICAL
E-02-DBA-LOCAL-002                    = NOT CONSUMED / EXECUTION FAILED / IMMUTABLE EVIDENCE
LOCAL-003                             = REQUIRED / NOT ISSUED
HMD-001                               = OPEN
RU-1.4 RUNTIME                        = NOT AUTHORIZED
EIR PASS                              = NONE
RUNTIME COMMITTED                     = NOT CERTIFIED
FINAL COMMIT PATH                     = BLOCKED
NEXT                                  = SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION (E-02-BCR-IA-002)
DO NOT MODIFY MIGRATIONS · NO DATABASE COMMANDS · NO SOURCE MODIFICATION
```

---

**End of document — E-02 BCR Clean-Base Design Amendment — v1.0 — 2026-08-22**
