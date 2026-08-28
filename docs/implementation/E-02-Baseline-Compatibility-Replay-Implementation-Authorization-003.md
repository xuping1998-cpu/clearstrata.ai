# E-02 — Baseline Compatibility Replay Artifact — Implementation Authorization (Successor)

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Authorization (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Artifact** | Governed Baseline-Compatibility Replay Artifact (class C) — **runtime launcher + apply→verify→cleanup lifecycle remediation** |
| **Authorization ID** | **E-02-BCR-IA-003** |
| **Predecessors** | **E-02-BCR-IA** ([`…-Implementation-Authorization.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md)) · **E-02-BCR-IA-002** ([`…-Implementation-Authorization-002.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md)) — both **CONSUMED / HISTORICAL / IMMUTABLE** |
| **Design authority** | [`E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment-002.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment-002.md) (BCR-CB-002 · BCR-CB-003 · BCR-CB-004 · CBD2-Q01–Q18 · CBD2-I1–I18) |
| **Status** | **Approved With Conditions** |
| **Authority Level** | Implementation Authorization (repository implementation only) |
| **Effective Date** | 2026-08-23 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md) |
| **Production Effect** | **None** |

> **Authority path finding:** `E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md` is **authority-safe** as a **successor Implementation Authorization** within the BCR document family, using a distinct `-003` filename so the predecessors `E-02-BCR-IA` and `E-02-BCR-IA-002` remain immutable — mirroring the `E-02-DBA-LOCAL-001 → -002 → -003` and `E-02-BCR-IA → -002` successor-filename precedent. ID **`E-02-BCR-IA-003`** parallels the series. **Not a new governance tier.**

> **Document class:** Bounded successor **Implementation Authorization** for **repository code implementation only**. It **does not** authorize running the artifact, database application, `supabase init`/`start`/`status`/`stop`, auxiliary project creation at runtime, migration apply, baseline verification against a live DB, RU-1.4 runtime, REA, EIR reclassification, Acceptance, or Certification. Runtime execution is governed by a future successor DBA (`E-02-DBA-LOCAL-004`, **not issued**).

```
SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION = E-02-BCR-IA-003
DECISION                                   = APPROVED WITH CONDITIONS
PREDECESSORS (E-02-BCR-IA / -IA-002)        = CONSUMED / HISTORICAL / IMMUTABLE
AUTHORIZED ACTION                          = IMPLEMENT BCR-CB-002 / BCR-CB-003 / BCR-CB-004 REMEDIATION IN REPOSITORY
ARTIFACT EXECUTION                         = NOT AUTHORIZED BY THIS IA
CB-B ARCHITECTURE                          = RETAINED (not reopened)
WINDOWS CLI LAUNCHER                       = ComSpec/cmd.exe /d /s /c + npx supabase + allowlisted subcommand + shell:false
NON-WINDOWS CLI LAUNCHER                    = DIRECT npx / shell:false
LAUNCHER COMMAND COVERAGE                   = init / start / status / stop
SUCCESS APPLY                              = MANIFEST WRITTEN → AUX ENVIRONMENT PRESERVED → BASELINE VERIFICATION PENDING
FAILURE                                     = DIAGNOSTIC CAPTURE + BEST-EFFORT AUTO-CLEANUP
BASELINE VERIFIER                          = SEPARATE DBA STEP (CL-D / CL-E REJECTED)
DBA BASELINE AUTHORITY                     = E02_BASELINE_VERIFICATION_AUTHORIZED (distinct from RU-1.4)
DB URL                                      = DISCOVERED ON DEMAND / NOT PERSISTED
DBA AUTHORIZATION ID                        = E02_DBA_AUTHORIZATION_ID (exact-pinned to E-02-DBA-LOCAL-004)
NEW DEPENDENCIES                            = NONE EXPECTED / NONE AUTHORIZED
QUARANTINE                                  = EXACTLY 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION                        = UNCHANGED / IMMUTABLE
BCR-CB-002 / 003 / 004                      = DESIGN REMEDIATION DEFINED / IMPLEMENTATION AUTHORIZED / RUNTIME PENDING
```

---

## 1. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment-002.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment-002.md) | **Direct design authority** — BCR-CB-002/003/004 · launcher · lifecycle · verifier gate · authorizationId model · CBD2-Q/I |
| [`E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md) | Predecessor amendment — BCR-CB-001 · CB-B (immutable; retained) |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md) | Predecessor **E-02-BCR-IA-002** — CB-B repository contract (CONSUMED; **not reopened**) |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization.md) | Predecessor **E-02-BCR-IA** — original contract (CONSUMED; **not reopened**) |
| [`E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion.md) | CB-B repository completion (COMPLETED WITH NOTES) |
| [`E-02-Database-Application-Authorization-LOCAL-003.md`](E-02-Database-Application-Authorization-LOCAL-003.md) | LOCAL-003 DBA — **NOT CONSUMED / FAILED** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md) | **APPLICATION_FAILED** at `supabase init` spawn — empirical basis for BCR-CB-002; §17 note = basis for BCR-CB-003 |
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | PAD-026–PAD-038 · quarantine · artifact class C · HMD-001 |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011–PAD-025 · manifest · apply-failure policy |
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) | Program locus · immutability |
| Repository (read-only) | `scripts/verification/e02/replay-e02-declared-baseline.ts` · `scripts/verification/e02/verify-db-baseline.ts` · `scripts/verification/e02/environment-guard.ts` · `package.json` · `package-lock.json` |

No new Program Authority Decision required — every governing principle is preserved (single-file quarantine, truthful omit-not-fabricate history, local-disposable only, no Option E, no snapshot, no migration repair, historical migration immutable, platform-history preservation).

---

## 2. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-BCR-IA-003** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Authorized action** | Implement the **BCR-CB-002 / BCR-CB-003 / BCR-CB-004** remediation + narrow runtime DBA authorizationId model in the repository |
| **Predecessors** | `E-02-BCR-IA` / `E-02-BCR-IA-002` — CONSUMED / HISTORICAL / **not modified or reopened** |
| **Artifact execution** | **NOT AUTHORIZED** by this IA (governed by future `E-02-DBA-LOCAL-004`) |
| **BCR-CB-002/003/004** | DESIGN REMEDIATION DEFINED → **IMPLEMENTATION AUTHORIZED** → runtime verification **PENDING** |
| **CB-B architecture** | **RETAINED** — not reopened |

This task performed **authorization issuance only**.

---

## 3. Authorized purpose

Authorize repository implementation of **exactly**:

- **A. BCR-CB-002** — cross-platform Supabase CLI launcher remediation (Windows `ComSpec`/`cmd.exe` intermediary; non-Windows direct `npx`; `shell:false`).
- **B. BCR-CB-003** — successful apply → **preserved** auxiliary environment → external DBA baseline verification → **explicit** cleanup lifecycle (manifest before hand-off; failure = best-effort auto-cleanup after diagnostics).
- **C. BCR-CB-004** — DBA baseline-verifier authorization **separated** from RU-1.4 runtime authorization (`E02_BASELINE_VERIFICATION_AUTHORIZED`).
- **D.** narrow runtime DBA `authorizationId` model (`E02_DBA_AUTHORIZATION_ID`, exact-pinned) — **no** per-execution source editing.

**Do NOT redesign CB-B architecture.**

---

## 4. CB-B architecture (retained completely)

```
fresh auxiliary local Supabase project per run · auxiliary migrations = 0 ·
Supabase CLI/platform-owned auth/storage/platform baseline ·
real repository supabase/migrations authoritative source · exactly one-file quarantine ·
truthful application history · platform histories preserved
```

**No architectural reopening.** Only launcher mechanics, apply→verify→cleanup lifecycle, verifier gate, and the authorizationId identity model are amended.

---

## 5. BCR-CB-002 — authorized cross-platform launcher

**Windows (SP-D) — authorized exactly:**

```
spawnSync(process.env.ComSpec ?? 'cmd.exe',
  ['/d', '/s', '/c', 'npx', 'supabase', subcommand, ...internalArgs], {
    cwd, shell: false, encoding: 'utf8', windowsHide: true,
    maxBuffer: <bounded>, timeout: <bounded>
  })
```

**Non-Windows (SP-A) — authorized exactly:**

```
spawnSync('npx',
  ['supabase', subcommand, ...internalArgs], {
    cwd, shell: false, encoding: 'utf8', windowsHide: true,
    maxBuffer: <bounded>, timeout: <bounded>
  })
```

The single existing `runSupabaseCli()` (currently `spawnSync('npx.cmd', …, {shell:false})`) is replaced by this platform-branched contract.

---

## 6. Launcher allowlist (locked)

Hard-code **exactly**:

```
init | start | status | stop
```

**No** generic command proxy · **no** arbitrary subcommand · **no** operator-supplied command fragments. A subcommand outside the allowlist → **STOP**.

---

## 7. Launcher error semantics (locked)

Implementation must explicitly distinguish:

```
PROCESS_DID_NOT_START   (res.error present / res.status === null)
PROCESS_EXITED_NONZERO  (res.status numeric > 0)
```

If `res.error` exists, surface its actual `name` / `message` / `code` (including `EINVAL`, `ENOENT`, timeout-like conditions). **Do not mask as generic "status 1".**

---

## 8. Shell policy (locked)

`shell:false` on **both** platforms is the preferred and authorized path. The Windows shell intermediary is **explicit** (`process.env.ComSpec ?? 'cmd.exe'`) with array args only. **`shell:true` (SP-E) is NOT AUTHORIZED as a primary path.** If implementation proves the preferred path impossible, **STOP → governance** (do not silently adopt `shell:true`).

---

## 9. Command coverage (locked)

The launcher remediation must apply **uniformly** to `init`, `start`, `status`, and `stop`. **No one-off `init` patch.** (`stop` portability is required by the §17 cleanup contract.)

---

## 10. Dependencies

**No new dependency authorized.** Do **not** add or pin the `supabase` package; do **not** modify `package.json` / `package-lock.json`. If a new dependency proves necessary → **STOP → governance** (not authorized here).

---

## 11. BCR-CB-003 — authorized success hand-off lifecycle

```
CREATE AUX → START PLATFORM BASELINE → GOVERNED REPLAY → PERSIST MANIFEST →
PRESERVE AUX ENVIRONMENT → EXTERNAL DBA BASELINE VERIFIER → DBA EVIDENCE → EXPLICIT CLEANUP
```

On a successful **DBA-preserve** apply, the auxiliary DB **must remain running**.

---

## 12. Preserve mode (locked)

Authorize a **`--preserve-environment`** mode valid **ONLY** for DBA-authorized execution — **not** a generic convenience behavior. Required joint gates:

```
valid apply authority (E02_BCR_APPLY_AUTHORIZED=true)
+ validated exact DBA authorization ID (§24–§25)
+ environmentClass = LOCAL_DISPOSABLE_SUPABASE
+ cleanBaseMode = CB-B (AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS)
```

Any missing/invalid gate → **STOP**.

---

## 13. Default apply behavior (locked)

Outside an authorized preserve flow, default apply **may** retain safe auto-cleanup behavior. Implementation must **not** accidentally leave local stacks running by default.

---

## 14. Failure cleanup (locked)

On apply **failure**: capture diagnostics/result **first**, persist the failure manifest if possible, **then** best-effort cleanup. Cleanup warnings preserved. **Cleanup failure must not falsify the underlying application result.**

---

## 15. Success manifest ordering (locked)

Mandatory:

```
application result finalized → manifest persisted → hand-off state established
→ NO cleanup when preserve mode active
```

The current `finally cleanup → manifest later` ordering **must be replaced**.

---

## 16. Environment hand-off state (locked)

A successful preserved apply must produce, and the manifest must **truthfully expose**:

```
APPLICATION_REPLAY_COMPLETE + AUXILIARY_DB_RUNNING + MANIFEST_WRITTEN + BASELINE_VERIFICATION_PENDING
```

---

## 17. Explicit cleanup mode (locked)

Authorize a separate deterministic **`--cleanup`** operation using deterministic internal/run metadata. The cleanup target must be recoverable from **non-secret** identifiers: `runId` · `auxiliaryWorkdir` · `auxiliaryProjectRef`. **Do not persist DB secrets.** The operation must be **fail-closed**.

---

## 18. Cleanup safety (locked)

Cleanup may target **only** the known local disposable auxiliary workdir/project. **No** global `supabase stop` · **no** repo-workdir stop · **no** remote target · **no** production · **no** arbitrary operator workdir. `supabase stop` is workdir-scoped via the portable launcher (§5–§9).

---

## 19. Cleanup result (locked)

Track `cleanupRequired` · `cleanupCompleted` · `cleanupWarnings`. Environment disposition must become exactly one of:

```
RUNNING_FOR_BASELINE_VERIFY | CLEANED_AFTER_FAILURE | CLEANED_AFTER_VERIFY
```

**No fabricated state.**

---

## 20. BCR-CB-004 — baseline verifier authority

Authorize remediation of `scripts/verification/e02/verify-db-baseline.ts` so **baseline-only** verification no longer requires `E02_RUNTIME_EXECUTION_AUTHORIZED`. That flag remains **RU-1.4 runtime-specific**.

---

## 21. DBA baseline-verification gate (locked)

Add a narrowly-scoped gate:

```
E02_BASELINE_VERIFICATION_AUTHORIZED=true   (or exact Design-Amendment-002-approved equivalent)
```

It authorizes **ONLY** `verify:e02:baseline`. It does **NOT** authorize: `verify:e02` · `verify:e02:concurrency` · `test:e02` · `test:e02:integration` · RPC invocation · destructive fixtures · RU-1.4 runtime evidence.

---

## 22. Environment safety during baseline verify (locked)

The baseline verifier must still require existing local safety conditions as applicable: `E02_ALLOW_DESTRUCTIVE_TESTS` · `E02_EVIDENCE_ENV=local` · local target validation. **Separating authority must not weaken environment protection.**

---

## 23. DB target hand-off (locked)

Do **NOT** persist `DATABASE_URL` / `SUPABASE_URL` / credentials in manifest or evidence. The DBA executor re-discovers the current local target via:

```
supabase status --workdir <preserved aux> --output json
```

then sets **runtime-only** verifier env.

---

## 24. Authorization-ID model (locked)

Authorize removal of the per-attempt source-edit requirement. Introduce:

```
E02_DBA_AUTHORIZATION_ID   (for the DBA execution / preserve path)
```

narrowly pinned. Under this implementation generation, the expected future value is **`E-02-DBA-LOCAL-004`**. The artifact must **NOT** accept arbitrary DBA IDs.

---

## 25. Authorization-ID validation (locked)

Rules:

- The DBA apply/preserve path **requires** the variable.
- The exact value must match the implementation-pinned expected authority **`E-02-DBA-LOCAL-004`**.
- Wrong / missing value → **STOP**.
- The manifest records **only** the validated value.
- **No** operator-selected generic DBA.
- **Plan mode** may display `expectedDbaAuthorizationId = E-02-DBA-LOCAL-004`.
- **No source edit** required at LOCAL-004 execution.

---

## 26. Existing `AUTHORIZATION_ID` constant (disposition)

The current source constant carries execution authority (last edited `→ E-02-DBA-LOCAL-003`). Preferred disposition: **replace execution-authority semantics with the validated runtime ID (§24–§25)**, preserving any static artifact metadata (e.g. `artifactAuthorizationId = E-02-BCR-IA-003`) **separately** if needed. **Do not leave ambiguous dual authority** — the runtime `E02_DBA_AUTHORIZATION_ID` is the sole DBA execution authority for the apply/preserve path.

---

## 27. Manifest additions (authorized)

```
cliLauncherMode                 : WINDOWS_CMD_C | DIRECT_NPX
cliLauncherPlatform             : <process.platform>
auxiliaryEnvironmentDisposition : RUNNING_FOR_BASELINE_VERIFY | CLEANED_AFTER_FAILURE | CLEANED_AFTER_VERIFY
baselineVerificationPending     : boolean
cleanupRequired                 : boolean
cleanupCompleted                : boolean
bcrCb002Status                  : IMPLEMENTED_RUNTIME_PENDING | RUNTIME_VERIFIED (future)
bcrCb003Status                  : IMPLEMENTED_RUNTIME_PENDING | RUNTIME_VERIFIED (future)
bcrCb004Status                  : IMPLEMENTED_RUNTIME_PENDING | RUNTIME_VERIFIED (future)
validatedDbaAuthorizationId     : <exact validated value, e.g. E-02-DBA-LOCAL-004>
```

Preserve all existing fields (`cleanBaseMode`, `auxiliaryWorkdir` sanitized, `auxiliaryProjectRef`, `auxiliaryMigrationCountBeforeStart`, `platformBaselineReady`, `applicationMigrationHistoryInitiallyEmpty`, `realRepositoryMigrationSource`, `freshAuxiliaryProject`, `platformHistoryPreserved`, `bcrCb001Status`, `authorizationId`/`artifactAuthorizationId`, quarantine set/count, ru11/ru12, result, timestamps, `migrationFileModified=false`, `commandTemplates`, `cleanupWarnings`). **No secrets.**

---

## 28. Plan mode (locked)

`--plan` remains **READ ONLY**: no stateful Supabase command · no DB · no operational temp environment. Plan should expose: launcher strategy · platform · expected DBA authorization ID · preserve-environment requirement · cleanup model · `baselineVerificationPending` semantics · defect statuses. No auxiliary directory created in plan.

---

## 29. Exact authorized source file scope

| # | Path | Change | Notes |
|---|------|--------|-------|
| 1 | `scripts/verification/e02/replay-e02-declared-baseline.ts` | **MODIFY** | Launcher (§5–§9) · preserve/cleanup lifecycle (§11–§19) · manifest-before-hand-off (§15) · runtime DBA ID validation (§24–§26) · manifest fields (§27) |
| 2 | `scripts/verification/e02/verify-db-baseline.ts` | **MODIFY** | DBA baseline gate (§20–§22) · remove RU-1.4 flag requirement from baseline-only command · retain env/local-target protections |

**`scripts/verification/e02/environment-guard.ts` is NOT authorized** for modification unless implementation proves it strictly unavoidable — in which case the exact diff must be justified and **returned to governance** before editing (current expectation: **unchanged**).

**No wildcard.** **Prohibited paths:** `supabase/migrations/**` · `src/**` · `package.json` / `package-lock.json` · RU-1.4 harness/tests (`tests/e02/**`) · governance docs · `.gitignore` · broad wildcards.

---

## 30. Replay artifact — authorized changes only

Allowed **only** for: launcher portability · preserve-success lifecycle · manifest-before-hand-off · explicit cleanup · runtime DBA ID validation · new lifecycle/defect manifest fields.

**No change to:** quarantine · migration enumeration · deterministic ordering · data-only guard · downstream UUID guard · truthful history-adapter semantics · RU-1.1 (`20261729120000`) / RU-1.2 (`20261821120000`) migration logic.

---

## 31. Baseline verifier — authorized changes only

Allowed **only** for: the DBA-specific baseline authority gate · removal of the RU-1.4 runtime-flag requirement from the baseline-only command · retention of environment/local-target protections. **No** expansion into runtime integration · RPC execution · tests · fixtures.

---

## 32. Static verification allowance

After implementation, **non-DB** only: `npm run build` · read-only `--plan` · unit/pure inspection if DB-free · non-mutating `--help` inspection. **No** `supabase init`/`start`/`status`/`stop` · **no** DB connection · **no** BCR `--apply` · **no** baseline verifier against a DB · **no** LOCAL-004.

---

## 33. Implementation completion gate (static)

- [ ] Only authorized source files changed (§29: files #1 and #2)
- [ ] Windows SP-D implemented (ComSpec/cmd.exe /d /s /c)
- [ ] Non-Windows SP-A preserved (direct npx)
- [ ] Command allowlist exact (init/start/status/stop)
- [ ] `res.error` surfaced (start-failure vs non-zero-exit distinguished)
- [ ] init/start/status/stop covered
- [ ] No `shell:true` primary path
- [ ] No new dependencies
- [ ] Preserve mode implemented (DBA-gated)
- [ ] Success environment retained
- [ ] Manifest written **before** success hand-off
- [ ] Failure auto-cleanup preserved (after diagnostics)
- [ ] Explicit `--cleanup` implemented
- [ ] No global cleanup target
- [ ] DB URLs not persisted
- [ ] DBA baseline gate added (`E02_BASELINE_VERIFICATION_AUTHORIZED`)
- [ ] RU-1.4 flag not required for baseline-only command
- [ ] Runtime DBA ID exact-pinned (`E-02-DBA-LOCAL-004`)
- [ ] No per-run source-authority edit required
- [ ] Quarantine / history semantics unchanged
- [ ] `--plan` PASS
- [ ] `npm run build` PASS
- [ ] No DB / stateful Supabase execution
- [ ] Defects (CB-002/003/004) still runtime pending (not marked resolved)

---

## 34. BCR-CB-002 status after implementation

If repository implementation succeeds → **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING.** Do **NOT** mark resolved until the LOCAL-004 launcher succeeds for init/start/status/stop.

---

## 35. BCR-CB-003 status after implementation

If implementation succeeds → **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING.** Runtime proof requires: successful replay + environment remains alive + baseline verifier uses it + explicit cleanup afterward.

---

## 36. BCR-CB-004 status after implementation

If implementation succeeds → **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING.** Runtime proof requires the baseline verifier to run under DBA-specific authorization **without** RU-1.4 REA.

---

## 37. BCR-CB-001

Remain **IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING.** LOCAL-004 must prove complete CB-B acquisition/replay.

---

## 38. LOCAL-003

Preserve **FAILED / NOT CONSUMED / IMMUTABLE.** No retry.

---

## 39. LOCAL-004

Required after: **IA-003 → implementation → successor Completion.** **Not authorized now.** Expected future authorization `docs/implementation/E-02-Database-Application-Authorization-LOCAL-004.md` (ID `E-02-DBA-LOCAL-004`).

---

## 40. Successor completion path (authority-safe)

After repository implementation, issue a **successor** completion checkpoint — authority-safe path **`docs/implementation/E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion-002.md`** (BCR completion family; predecessor Completion remains immutable). **Not created now.**

---

## 41. HMD-001

Remain **OPEN** (CB-B does not repair it).

---

## 42. RU-1.4

Remain **HARNESS IMPLEMENTED · RUNTIME NOT AUTHORIZED · EVIDENCE NOT COLLECTED · no REA.**

---

## 43. EIR / Acceptance / Certification

**No change.** EIR PASS = **NONE** · Acceptance = **ACCEPTANCE_BLOCKED** · Project Certification = **NOT ISSUED** · Runtime COMMITTED = **NOT CERTIFIED** · Final COMMIT Path = **BLOCKED**.

---

## 44. Risks (runtime — NOT closed at IA issuance)

Windows `cmd.exe` argument quoting (paths with spaces / non-ASCII repo path) · `ComSpec` availability · `npx` version drift (unpinned CLI) · preserved-stack leakage · cleanup target mismatch · baseline verifier connecting to the wrong stack · authorizationId spoofing · DBA/RU-1.4 authority bleed · manifest/environment mismatch · cleanup-warning misclassification. **No runtime risk is closed at IA issuance.**

---

## 45. Authorization decision

```
E-02-BCR-IA-003  = APPROVED WITH CONDITIONS
AUTHORIZED ACTION = IMPLEMENT BCR-CB-002 / BCR-CB-003 / BCR-CB-004 REMEDIATION IN REPOSITORY
RUNTIME           = NONE
```

Valid only if implementation matches Design Amendment-002 + the predecessor CB-B amendment + Historical Migration PAD + Database Application PAD + the BCR authority chain. Any deviation involving a new quarantine · migration modification · platform-schema fabrication · snapshot · raw Docker/Postgres · new dependency · remote target · `shell:true` primary path · arbitrary DBA ID · verifier authority merged with RU-1.4 → **STOP → governance**.

---

## 46. Current project effect

```
BCR-CB-002 = DESIGN REMEDIATION DEFINED / IMPLEMENTATION AUTHORIZED / RUNTIME OPEN
BCR-CB-003 = DESIGN REMEDIATION DEFINED / IMPLEMENTATION AUTHORIZED / RUNTIME OPEN
BCR-CB-004 = DESIGN REMEDIATION DEFINED / IMPLEMENTATION AUTHORIZED / RUNTIME OPEN
CB-B       = RETAINED
E-02-BCR-IA-003 = APPROVED WITH CONDITIONS (issued; not yet implemented)
LOCAL-004  = NOT ISSUED
```

No runtime status changes.

---

## 47. Governance chain

```
E-02-BCR-IA-003 (this document)
  → IMPLEMENT BCR-CB-002/003/004 REMEDIATION (authorized files §29)
  → E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion-002.md
  → SUCCESSOR DBA E-02-DBA-LOCAL-004 (application-execution authority)
  → LOCAL-004 EXECUTION → npm run verify:e02:baseline (under E02_BASELINE_VERIFICATION_AUTHORIZED)
  → E-02-Database-Application-Evidence-E-02-DBA-LOCAL-004.md
  → E-02-RU-1.4-REA ONLY IF APPLIED_AND_BASELINE_VERIFIED
```

---

## 48. Prohibited work in this task (confirmation)

No source edit · no verifier edit · no environment-guard edit · no package change · no migration · no Supabase command · no Docker · no DB · no LOCAL-004 · no successor Completion · no REA · no EIR/Acceptance/Certification change. Only this record and [`README.md`](README.md) were written.

---

## 49. Lock statement

```
SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION = E-02-BCR-IA-003
DECISION                                   = APPROVED WITH CONDITIONS
PREDECESSORS (E-02-BCR-IA / -IA-002)        = CONSUMED / HISTORICAL / IMMUTABLE
AUTHORIZED ACTION                          = IMPLEMENT BCR-CB-002 / 003 / 004 REMEDIATION
AUTHORIZED FILES                           = replay-e02-declared-baseline.ts + verify-db-baseline.ts (environment-guard NOT authorized)
ARTIFACT EXECUTION                         = NOT AUTHORIZED BY THIS IA
CB-B ARCHITECTURE                          = RETAINED
WINDOWS CLI LAUNCHER                       = ComSpec/cmd.exe /d /s /c + npx supabase + ALLOWLIST + shell:false
NON-WINDOWS CLI LAUNCHER                    = DIRECT npx / shell:false
LAUNCHER COMMAND COVERAGE                   = init / start / status / stop
LAUNCHER ERROR SURFACING                    = res.error surfaced (did-not-start vs non-zero-exit)
SUCCESS APPLY                              = MANIFEST WRITTEN + AUX ENVIRONMENT PRESERVED + BASELINE VERIFICATION PENDING
FAILURE                                     = DIAGNOSTIC CAPTURE + BEST-EFFORT AUTO-CLEANUP
CLEANUP MODEL                               = --preserve-environment (DBA-gated) + --cleanup (deterministic)
MANIFEST WRITE                              = BEFORE CLEANUP / HAND-OFF
BASELINE VERIFIER                          = SEPARATE DBA STEP (CL-D / CL-E REJECTED)
DBA BASELINE AUTHORITY                     = E02_BASELINE_VERIFICATION_AUTHORIZED / DISTINCT FROM RU-1.4
DB URL                                      = DISCOVERED ON DEMAND / NOT PERSISTED
DBA AUTHORIZATION ID                        = E02_DBA_AUTHORIZATION_ID / EXACT-PINNED TO E-02-DBA-LOCAL-004
NEW DEPENDENCIES                            = NONE
QUARANTINE                                  = EXACTLY 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION                        = UNCHANGED
APPLICATION HISTORY                         = TRUTHFUL
PLATFORM HISTORIES                          = PRESERVED
BCR-CB-001                                  = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-002 / 003 / 004                       = DESIGN REMEDIATION DEFINED / IMPLEMENTATION AUTHORIZED / RUNTIME PENDING
LOCAL-003                                   = FAILED / NOT CONSUMED / IMMUTABLE
LOCAL-004                                   = REQUIRED / NOT ISSUED
HMD-001                                     = OPEN
RU-1.4 RUNTIME                              = NOT AUTHORIZED
EIR PASS                                    = NONE
RUNTIME COMMITTED                           = NOT CERTIFIED
FINAL COMMIT PATH                           = BLOCKED
NEXT                                        = IMPLEMENT IA-003 REMEDIATION UNDER E-02-BCR-IA-003
DO NOT MODIFY MIGRATIONS · NO DATABASE COMMANDS · NO SOURCE MODIFICATION IN THIS TASK
```

---

**End of document — E-02-BCR-IA-003 — v1.0 — 2026-08-23**
