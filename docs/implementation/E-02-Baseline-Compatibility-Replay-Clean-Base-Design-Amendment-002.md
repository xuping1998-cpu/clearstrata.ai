# E-02 — Baseline Compatibility Replay — Clean-Base Design Amendment-002

| Field | Value |
|-------|-------|
| **Document Type** | Design Amendment (Successor) — BCR clean-base runtime launcher + lifecycle |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Amends (design of)** | Governed Baseline-Compatibility Replay Artifact — CB-B clean-base redesign ([`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md), E-02-BCR-IA-002, **CONSUMED**) |
| **Predecessor amendment** | [`E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md) (BCR-CB-001 · CB-B) — **IMMUTABLE / not reopened** |
| **Defects addressed** | **BCR-CB-002** (Windows child-process launcher portability) · **BCR-CB-003** (auxiliary DB lifecycle / baseline-verifier hand-off) · **BCR-CB-004** (baseline-verifier DBA-vs-RU-1.4 gate separation) |
| **Status** | **Approved With Notes (design remediation defined · runtime verification pending)** |
| **Effective Date** | 2026-08-22 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment-002.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment-002.md) |
| **Production Effect** | **None** |

> **Authority path finding:** `E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment-002.md` is **authority-safe** — a **successor design amendment** in the existing BCR document family, mirroring the `-002` successor-filename precedent (`E-02-DBA-LOCAL-001 → -002 → -003`, `E-02-BCR-IA → -002`). The predecessor amendment (`…-Clean-Base-Design-Amendment.md`) remains **immutable**. This is **NOT** a new governance tier, **NOT** a Program Authority Decision, **NOT** an Implementation Authorization, **NOT** a DBA. It authorizes **no code, no DB, no execution**.

> **No new Program Authority required:** every governing principle of [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md), [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) (PAD-026–PAD-038) and [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) (PAD-011–PAD-025) is **preserved** — single-file quarantine, truthful omit-not-fabricate history, local-disposable only, no Option E, no snapshot, no migration repair, historical migration immutable, platform-history preservation. This amendment refines **runtime launcher mechanics and the apply→verify→cleanup lifecycle only**.

```
BCR CLEAN-BASE DESIGN AMENDMENT-002    = APPROVED WITH NOTES
BCR-CB-001                             = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-002                             = DESIGN REMEDIATION DEFINED / RUNTIME VERIFICATION PENDING
BCR-CB-003                             = DESIGN REMEDIATION DEFINED / RUNTIME VERIFICATION PENDING
BCR-CB-004                             = DESIGN REMEDIATION DEFINED / RUNTIME VERIFICATION PENDING
CB-B ARCHITECTURE                      = RETAINED
WINDOWS CLI LAUNCHER                   = ComSpec/cmd.exe /d /s /c + npx supabase + allowlisted subcommand + shell:false
NON-WINDOWS CLI LAUNCHER               = DIRECT npx / shell:false
SUCCESSFUL APPLY ENVIRONMENT           = PRESERVED FOR BASELINE VERIFIER
FAILURE CLEANUP                        = BEST-EFFORT AUTO-CLEANUP AFTER DIAGNOSTIC CAPTURE
BASELINE VERIFIER                      = SEPARATE DBA STEP (CL-D / CL-E REJECTED)
DBA BASELINE AUTHORITY                 = DISTINCT FROM RU-1.4 RUNTIME AUTHORITY
DB URL                                 = DISCOVERED ON DEMAND / NOT PERSISTED
AUTHORIZATION ID                       = NARROW RUNTIME VALUE / NOT ARBITRARY
QUARANTINE                             = EXACTLY 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION                   = UNCHANGED
NEW DEPENDENCY                         = NONE
LOCAL-003                              = FAILED / NOT CONSUMED / IMMUTABLE
LOCAL-004                              = REQUIRED / NOT ISSUED
HMD-001                                = OPEN
RU-1.4 RUNTIME                         = NOT AUTHORIZED
NEXT                                   = SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION (E-02-BCR-IA-003)
```

---

## 1. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Design-Amendment.md) | Predecessor amendment — BCR-CB-001 · CB-B (immutable; amended in design here, not rewritten) |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-002.md) | E-02-BCR-IA-002 — CB-B repository implementation contract (**CONSUMED**) |
| [`E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion.md`](E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion.md) | CB-B repository implementation completion (**COMPLETED WITH NOTES**) |
| [`E-02-Database-Application-Authorization-LOCAL-003.md`](E-02-Database-Application-Authorization-LOCAL-003.md) | LOCAL-003 DBA (CB-B runtime-proof contract; **NOT CONSUMED / FAILED**) |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-003.md) | **APPLICATION_FAILED** at `supabase init` spawn — empirical basis for BCR-CB-002; §17 note = empirical basis for BCR-CB-003 |
| [`E-02-Baseline-Compatibility-Replay-Completion.md`](E-02-Baseline-Compatibility-Replay-Completion.md) | Original artifact completion (not reopened) |
| [`E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md`](E-02-Historical-Migration-Baseline-Compatibility-Authority-Decision.md) | PAD-026–PAD-038 · quarantine · HMD-001 |
| [`E-02-Database-Application-Authority-Decision.md`](E-02-Database-Application-Authority-Decision.md) | PAD-011–PAD-025 · manifest · apply-failure policy |
| [`E-02-Program-Authority-Decision.md`](E-02-Program-Authority-Decision.md) | Program locus · immutability constraints |

**Read-only source inspected (not modified):** `scripts/verification/e02/replay-e02-declared-baseline.ts` · `scripts/verification/e02/verify-db-baseline.ts` · `scripts/verification/e02/environment-guard.ts` · `package.json` · `package-lock.json`.

**Consumed runtime forensic findings (BCR-CB-002/003 read-only investigation):** Node **v24.14.1** / Win32 · `npx` resolves to `…\nodejs\npx.cmd` (batch launcher) · `supabase` is **not** an npm dependency (absent from lockfile / `node_modules/.bin`) → `npx supabase` resolves dynamically & unpinned · **only** child-process usage in the repository is the artifact itself (no reusable cross-platform launcher precedent) · `runApply()` cleanup is in an unconditional `finally` and the manifest is written by `main()` **after** `runApply` returns (i.e. after cleanup).

---

## 2. Amendment decision

| Field | Value |
|-------|-------|
| **Decision** | **APPROVED WITH NOTES** |
| **Scope** | BCR **runtime CLI launcher portability + apply→verify→cleanup lifecycle + authorizationId identity model + baseline-verifier gate separation** — design only |
| **BCR-CB-002** | **DESIGN REMEDIATION DEFINED** (runtime pending successor DBA execution) |
| **BCR-CB-003** | **DESIGN REMEDIATION DEFINED** (runtime pending successor DBA execution) |
| **BCR-CB-004** | **DESIGN REMEDIATION DEFINED** (runtime pending successor DBA execution) |
| **CB-B architecture** | **RETAINED** — not reopened |
| **Code / DB effect** | **None** — implementation requires successor BCR IA (E-02-BCR-IA-003) |

No contradiction found with any higher governance layer. All remediations are implementable within existing Program Authority.

---

## 3. BCR-CB-002 — formal design

**BCR-CB-002 — Windows child-process launcher portability defect.** Observed runtime fact: Node **v24.14.1** + Windows + `spawnSync('npx.cmd', args, { shell:false })` → **EINVAL** (`status = null`, mapped to "status 1"). This is a **launcher-mechanics defect only**; the Supabase CLI and `supabase init` are viable (verified via shell). It occurred **before** `init` / empty-migration validation / `start` / platform baseline / DB connection / governed replay — therefore **CB-B architecture is not disproven**.

| BCR-CB-002 is NOT | Reason |
|-------------------|--------|
| BCR-CB-001 | BCR-CB-001 = clean-base/env-prep architecture (implemented, not yet runtime-proven); BCR-CB-002 = launcher spawn mechanics |
| HMD-001 | HMD-001 = historical demo-migration FK external-state defect; never reached |
| RU-1.x defect | Those migrations valid; not reached |

**Closure model:** `DESIGN REMEDIATION DEFINED`. **Must not** be marked `RUNTIME RESOLVED` until a successor DBA execution proves the portable launcher works end-to-end (init/start/status/stop).

---

## 4. Cross-platform launcher decision (adopted)

**Non-Windows (SP-A) — direct `npx`, no shell:**

```
spawnSync('npx', ['supabase', <subcommand>, ...internalArgs], {
  cwd: <auxiliaryWorkdir>,
  shell: false,
  encoding: 'utf8',
  windowsHide: true,
  maxBuffer: <bounded>,
  timeout: <bounded>
})
```

**Windows (SP-D) — `cmd.exe /d /s /c` via `process.env.ComSpec`, no shell:true:**

```
spawnSync(process.env.ComSpec ?? 'cmd.exe',
  ['/d', '/s', '/c', 'npx', 'supabase', <subcommand>, ...internalArgs], {
  cwd: <auxiliaryWorkdir>,
  shell: false,
  encoding: 'utf8',
  windowsHide: true,
  maxBuffer: <bounded>,
  timeout: <bounded>
})
```

**No `shell:true` in the preferred design.** `cmd.exe` (an `.exe`) may be spawned with `shell:false`; it resolves `npx`/`npx.cmd` internally via `PATHEXT`. Arguments are passed as an **array** (no shell string interpolation).

### 4.1 Launcher option comparison (consumed)

| Option | Windows | Non-Win | Injection | Arg/Exit fidelity | Dep | Disposition |
|--------|---------|---------|-----------|-------------------|-----|-------------|
| SP-A `npx` shell:false | UNACCEPTABLE (ENOENT) | STRONG | STRONG | STRONG | none | **ADOPT (non-Windows)** |
| SP-B `npx.cmd` shell:false | **UNACCEPTABLE (EINVAL — current defect)** | N/A | — | — | none | **REJECT** |
| SP-C `execFile(.cmd)` shell:false | UNACCEPTABLE (EINVAL) | ACCEPTABLE | STRONG | STRONG | none | REJECT (Windows) |
| SP-D `ComSpec /d /s /c npx supabase …` | **STRONG** | N/A | ACCEPTABLE-STRONG | STRONG | none | **ADOPT (Windows)** |
| SP-E `shell:true` fixed contract | STRONG | STRONG | ACCEPTABLE (internal args only) | WEAK-ACCEPTABLE | none | **FALLBACK ONLY (see §37)** |
| SP-F direct pinned CLI binary | STRONG* | STRONG* | STRONG | STRONG | **new dep** | DEFERRED (separate authorization; §9) |
| SP-G Node package API | — | — | — | — | — | UNACCEPTABLE (no public API) |
| SP-H other repo mechanism | — | — | — | — | — | N/A (no precedent) |

\* SP-F strong only if `supabase` is added as a pinned devDependency → new-dependency authorization (not granted here).

---

## 5. Launcher subcommand allowlist (locked)

The launcher accepts **only** a hard-coded Supabase subcommand allowlist:

```
init  |  start  |  status  |  stop
```

**No** arbitrary command execution · **no** operator-supplied command fragments · **no** generic CLI proxy · **no** subcommand outside the allowlist (→ STOP).

---

## 6. Argument safety (locked)

All CLI arguments are **internally generated**. The auxiliary workdir is **not** operator-supplied. Existing prohibitions remain in force: `--workdir` as an operator input → STOP · `E02_AUX_WORKDIR*` env → STOP · arbitrary skip/quarantine/migration/DB flags → STOP. **No** raw shell fragments · **no** metacharacter-bearing operator input · array-args only.

---

## 7. Error surfacing (locked)

The current defect was partially masked as "status 1" because `res.error` was not surfaced. Locked behavior:

- If `res.error` exists → **surface its actual message/code** (e.g. `EINVAL`, `ENOENT`, timeout) and fail closed.
- Result-status handling **must distinguish**: *process did not start* (`res.error` present / `res.status === null`) **vs** *process exited non-zero* (`res.status` numeric > 0).
- Do **not** collapse a launcher spawn failure into a generic exit code.

---

## 8. Command coverage (locked)

The launcher fix must cover **all four** Supabase invocations, not merely `init`:

```
supabase init   ·   supabase start   ·   supabase status   ·   supabase stop
```

The same Windows spawn defect affects `stop`; §14 cleanup depends on `stop` succeeding, so coverage is mandatory.

---

## 9. CLI version determinism (recorded risk)

This amendment continues to use the **npx-resolved** Supabase CLI. **No new dependency** is authorized here. Recorded risk: version determinism remains weaker than a pinned devDependency (installed v2.84.2 vs advertised v2.115.0). If pinning later becomes necessary (SP-F), it requires a **separate authorization** — not granted by this amendment or by E-02-BCR-IA-003 unless explicitly added.

---

## 10. BCR-CB-003 — formal design

**BCR-CB-003 — successful-apply / baseline-verifier / cleanup hand-off defect.** Current implementation:

```
runApply()
  try { … replay … set result }
  finally { cleanupAuxiliary()  → supabase stop + rm temp workdir }
main() writes manifest AFTER runApply() returns  (i.e. AFTER cleanup)
```

Consequence: on **success**, the auxiliary DB is destroyed in the `finally` **before** the manifest is persisted and **before** the separately-authorized `npm run verify:e02:baseline` (a distinct process) can connect. This violates the DBA lifecycle (LOCAL-003 required apply-success → baseline-verify against the same DB). Distinct from BCR-CB-002 (which failed earlier, at `init`).

**Closure model:** `DESIGN REMEDIATION DEFINED`; runtime resolved only when a preserved environment is successfully consumed by the verifier and explicit cleanup follows.

---

## 11. Required success lifecycle (locked)

```
A. Create/start auxiliary environment (CB-B, portable launcher)
B. Governed replay of real repository migrations (quarantine held)
C. Persist BCR manifest/result                     ← BEFORE any success cleanup
D. Auxiliary DB REMAINS RUNNING
E. DBA executor discovers DB target:
     supabase status --workdir <aux> --output json
F. DBA executor runs: npm run verify:e02:baseline
G. Baseline outcome captured in DBA evidence
H. Explicit cleanup (deterministic teardown)
```

**Success hand-off state:**

```
APPLICATION_REPLAY_COMPLETE + AUXILIARY_DB_RUNNING + MANIFEST_WRITTEN + BASELINE_VERIFICATION_PENDING
```

---

## 12. Success cleanup decision — CL-B + CL-C (adopted)

| Option | Disposition |
|--------|-------------|
| CL-A — apply never cleans on success; DBA cleans after | Acceptable component |
| **CL-B — `--preserve-environment`; default auto-clean otherwise** | **ADOPT** |
| **CL-C — apply returns cleanup context; separate `--cleanup` mode keyed by non-secret identifiers** | **ADOPT** |
| CL-D — BCR invokes verifier before cleanup | **REJECT** (§18 — collapses BCR/DBA authority) |
| CL-E — verifier integrated into apply | **REJECT** (§18) |
| CL-F — external orchestrator owns apply+verify+cleanup | Not adopted (DBA executor already orchestrates; redundant surface) |
| CL-G — other | none |

**Adopted model:** default apply behavior remains safe auto-clean; a **DBA-authorized `--preserve-environment`** leaves a *successful* environment running with the manifest persisted; a separate **`--cleanup`** mode performs deterministic teardown after evidence capture. **Not implemented in this task.**

---

## 13. Preserve-environment authority (locked)

`--preserve-environment` is **NOT** a generic operator convenience flag. It is valid **only** under successor DBA execution authority and must require, jointly:

- a **valid DBA authorization identity** (§23–§24),
- **local-disposable** environment class,
- **apply-authorized** execution (`E02_BCR_APPLY_AUTHORIZED=true`).

**No preserve for remote / production / shared / unknown targets** (fail closed).

---

## 14. Cleanup mode (locked)

Deterministic `--cleanup` operation keyed by **non-secret** identifiers only: `runId` · `auxiliaryWorkdir` · `auxiliaryProjectRef`. It must:

- `supabase stop` **scoped to the auxiliary workdir** (portable launcher; **no global stop**),
- remove the auxiliary temp directory,
- record cleanup result/warnings (no repo mutation).

**Do not persist DB credentials.** Cleanup must not mutate the repository.

---

## 15. Success vs failure cleanup (locked)

| Condition | Behavior |
|-----------|----------|
| **Apply FAILURE** | Best-effort cleanup **after** diagnostics/manifest are captured |
| **Apply SUCCESS + preserve** | **Do NOT** cleanup before the verifier (§11 hand-off) |
| **Explicit post-verify `--cleanup`** | Deterministic teardown |

Cleanup failure must be **reported** (`cleanupWarnings`) but must **never** rewrite a truthful prior replay/baseline result.

---

## 16. Manifest write order (fixed by design)

Manifest **must be persisted BEFORE any success-path cleanup decision**. The current `cleanup → (return) → manifest write` ordering is corrected to:

```
replay result finalized → manifest persisted → { preserve hand-off | cleanup }
```

The manifest must exist while the auxiliary DB is alive so the DBA verifier step and any later `--cleanup` can key off it.

---

## 17. Environment disposition (manifest status)

Add manifest fields reflecting **actual** state:

```
auxiliaryEnvironmentDisposition : RUNNING_FOR_BASELINE_VERIFY | CLEANED_AFTER_FAILURE | CLEANED_AFTER_VERIFY
baselineVerificationPending     : true | false
cleanupRequired                 : true | false
cleanupCompleted                : true | false
```

---

## 18. Baseline verifier remains separate (locked)

`npm run verify:e02:baseline` (`scripts/verification/e02/verify-db-baseline.ts`) remains a **SEPARATE DBA STEP**. **Do NOT** move baseline verification inside BCR apply. **CL-D and CL-E are REJECTED.** BCR **database-application** authority and **baseline-verification** authority remain distinct (§14 authority boundary of the investigation).

---

## 19. Baseline DB-target discovery (locked)

The DBA executor **re-discovers** the target from the preserved auxiliary environment:

```
supabase status --workdir <aux> --output json   → DB URL
```

Then sets, **runtime-only**, `DATABASE_URL` (and `SUPABASE_URL` if needed) for the verifier process. **Do NOT persist connection URLs** in manifest or evidence.

---

## 20. BCR-CB-004 — baseline-verifier gate separation

**Secondary finding (formalized as BCR-CB-004).** `verify-db-baseline.ts` currently requires `E02_RUNTIME_EXECUTION_AUTHORIZED` (the **RU-1.4 runtime** flag). But baseline verification is authorized under **DBA** authority, **before** any RU-1.4 REA. Reusing the RU-1.4 flag would **blur DBA baseline authority into RU-1.4 runtime authority**.

**Classification:** **BCR-CB-004 — baseline-verifier DBA-vs-RU-1.4 gate-separation defect.** Distinct from BCR-CB-001/002/003 and HMD-001. Closure: runtime resolved only when the baseline verifier runs under a DBA-scoped gate **without** RU-1.4 REA.

---

## 21. Baseline-verifier authorization model (design)

Introduce a **separate, narrowly-scoped** DBA-baseline gate, e.g.:

```
E02_BASELINE_VERIFICATION_AUTHORIZED=true
```

It must permit **only** `verify:e02:baseline` and must **NOT** imply: RU-1.4 runtime · integration tests · RPC invocation · destructive fixtures · concurrency evidence. **Not implemented here** — locked for E-02-BCR-IA-003.

---

## 22. Guard separation (locked)

Preserve existing environment safety guards (`E02_ALLOW_DESTRUCTIVE_TESTS`, `E02_EVIDENCE_ENV`, local-only validation), but **distinguish** DBA baseline-verification authorization from RU-1.4 runtime execution authorization. **No semantic overloading** of a single flag across both authorities.

---

## 23. AuthorizationId identity model (design)

The current source-edit-per-DBA model (`AUTHORIZATION_ID` `LOCAL-002 → LOCAL-003`) is **brittle** and mildly harms immutability/evidence cleanliness. Adopt a **tightly-scoped runtime variable**:

```
E02_DBA_AUTHORIZATION_ID
```

Implementation under E-02-BCR-IA-003 must require the **exact successor value** pinned by that IA (e.g. `E-02-DBA-LOCAL-004`) or an authority-pinned allowed value. **No arbitrary DBA ID · no generic operator-selected authority.**

---

## 24. AuthorizationId validation rules (locked)

- Variable **required** for the DBA execution path (fallback to constant permitted if IA so specifies).
- **Exact expected value pinned** by the successor IA; malformed / non-matching value → **STOP**.
- **Plan mode** may report the expected value **without execution**.
- Manifest records the **validated** value.
- **No source edit** needed for each future execution attempt.
- Must **never** become an authorization bypass (no arbitrary ID acceptance).

---

## 25. BCR-CB-001 status (unchanged)

**IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING.** BCR-CB-002/003/004 fixes do **not** close BCR-CB-001; only a successful `E-02-DBA-LOCAL-004` end-to-end run can.

---

## 26. HMD-001 (unchanged)

**OPEN / DISTINCT.** No migration change; CB-B does not repair the historical migration.

---

## 27. CB-B architecture — RETAIN (locked)

Still authoritative and **not** reopened:

```
fresh disposable auxiliary project · empty auxiliary migrations (count = 0) ·
platform-owned baseline · real repository migration source · single quarantine ·
truthful application history · platform histories preserved
```

Only launcher mechanics (§3–§9), the apply→verify→cleanup lifecycle (§10–§19), the verifier gate (§20–§22), and the authorizationId model (§23–§24) are amended.

---

## 28. Manifest additions (design)

Justified additions (no secrets; all existing fields preserved):

```
cliLauncherMode                 : WINDOWS_CMD_C | DIRECT_NPX
cliLauncherPlatform             : <process.platform>
auxiliaryEnvironmentDisposition : RUNNING_FOR_BASELINE_VERIFY | CLEANED_AFTER_FAILURE | CLEANED_AFTER_VERIFY
baselineVerificationPending     : true | false
cleanupRequired                 : true | false
cleanupCompleted                : true | false
bcrCb002Status                  : DESIGN_REMEDIATION_DEFINED | IMPLEMENTED_RUNTIME_PENDING | RUNTIME_VERIFIED (future)
bcrCb003Status                  : DESIGN_REMEDIATION_DEFINED | IMPLEMENTED_RUNTIME_PENDING | RUNTIME_VERIFIED (future)
bcrCb004Status                  : DESIGN_REMEDIATION_DEFINED | IMPLEMENTED_RUNTIME_PENDING | RUNTIME_VERIFIED (future)
validatedDbaAuthorizationId     : <exact validated value, e.g. E-02-DBA-LOCAL-004>
```

Retains all predecessor fields (`cleanBaseMode`, `auxiliaryWorkdir` sanitized, `auxiliaryProjectRef`, `auxiliaryMigrationCountBeforeStart`, `platformBaselineReady`, `realRepositoryMigrationSource`, `freshAuxiliaryProject`, `platformHistoryPreserved`, `bcrCb001Status`, `authorizationId`, `artifactAuthorizationId`, quarantine set/count, ru11/ru12, result, timestamps, `migrationFileModified=false`, `commandTemplates`, `cleanupWarnings`).

---

## 29. Plan mode (unchanged posture)

`--plan` remains **read-only**: no stateful Supabase execution · no DB · no temp operational environment. Plan may additionally report: launcher strategy (`cliLauncherMode`/platform) · expected DBA authorization ID · preserve-environment requirement · cleanup strategy · manifest disposition model. No auxiliary directory created in plan.

---

## 30. Future implementation file scope (design)

| Path | Expected change | Necessity |
|------|-----------------|-----------|
| `scripts/verification/e02/replay-e02-declared-baseline.ts` | Portable launcher (§4–§8) · lifecycle preserve/cleanup (§10–§17) · authorizationId runtime model (§23–§24) · manifest fields (§28) | **Required** |
| `scripts/verification/e02/verify-db-baseline.ts` | Replace RU-1.4 gate with DBA-scoped baseline gate (§20–§22) | **Required** |
| `scripts/verification/e02/environment-guard.ts` | Only if the baseline gate cannot be expressed without it | **Only if strictly necessary** |

**No wildcard authorization.** The successor BCR IA (E-02-BCR-IA-003) must enumerate the **exact** allowed files.

---

## 31. Dependencies

**Preferred: NONE.** The launcher fix uses Node stdlib (`child_process`, `os`, `path`, `fs/promises`, `crypto`) + current `npx supabase`. No `package.json`/lockfile change. Any new dependency (e.g. SP-F pinning) → **separate authorization** (§9).

---

## 32. Successor completion (path finding)

After E-02-BCR-IA-003 implementation, a **successor** clean-base implementation completion is required (predecessor Completion remains immutable). Authority-safe path:

```
docs/implementation/E-02-Baseline-Compatibility-Replay-Clean-Base-Implementation-Completion-002.md
```

Not created in this task.

---

## 33. LOCAL-003 (preserved)

**FAILED / NOT CONSUMED / IMMUTABLE.** No retry; evidence not reclassified.

---

## 34. LOCAL-004 (required / not issued)

Required after: **Design Amendment-002 → E-02-BCR-IA-003 → implementation → successor Completion**. Expected future authorization:

```
docs/implementation/E-02-Database-Application-Authorization-LOCAL-004.md   (ID: E-02-DBA-LOCAL-004)
```

**Not created now.**

---

## 35. LOCAL-004 execution contract (informative)

Future `E-02-DBA-LOCAL-004` must prove, sequentially: (1) portable launcher works (Windows + non-Windows); (2) fresh auxiliary `init`; (3) empty migrations; (4) `start`; (5) platform baseline; (6) governed replay succeeds; (7) manifest persists; (8) environment remains running; (9) baseline verifier runs under **DBA-specific** verifier authority (not RU-1.4); (10) baseline **PASS**; (11) evidence captured; (12) explicit cleanup succeeds or warnings recorded. Only then → **APPLIED_AND_BASELINE_VERIFIED**.

---

## 36. Defect closure rules

| Defect | Closure rule |
|--------|--------------|
| **BCR-CB-002** | Design remediated here; **runtime resolved** only when the portable launcher works for init/start/status/stop under LOCAL-004 |
| **BCR-CB-003** | Design remediated here; **runtime resolved** only when the verifier successfully uses the preserved environment and explicit cleanup follows |
| **BCR-CB-004** | Design remediated here; **runtime resolved** only when the baseline verifier runs under the DBA gate without RU-1.4 REA |
| **BCR-CB-001** | **runtime resolved** only when the entire CB-B acquisition/replay works end-to-end |
| **HMD-001** | remains OPEN / distinct (not addressed by CB-B) |

---

## 37. Failure policy (fail-closed)

Still fail closed. **No fallback** to: `shell:true` (unless explicitly approved as a bounded fallback under E-02-BCR-IA-003) · repo-workdir `supabase start` · raw Docker · raw Postgres · Option E · migration repair · manual DB-URL persistence · automatic REA.

> **Note on SP-E:** `shell:true` with a fully-internal fixed argument contract is recorded as an **acceptable fallback only** if SP-D proves non-viable at runtime; the successor IA must explicitly authorize it if used. It is **not** the preferred model.

---

## 38. RU-1.4 boundary (unchanged)

**RUNTIME NOT AUTHORIZED · EVIDENCE NOT COLLECTED.** DBA baseline-verifier authority (§20–§22) must **not** blur into RU-1.4 runtime.

---

## 39. EIR / Acceptance / Certification

**No changes.** EIR PASS = **NONE** · Acceptance = **ACCEPTANCE_BLOCKED** · Project Certification = **NOT ISSUED** · Runtime COMMITTED = **NOT CERTIFIED** · Final COMMIT Path = **BLOCKED**.

---

## 40. Design questions (CBD2-Q)

| ID | Question | Result |
|----|----------|--------|
| CBD2-Q01 | Is CB-B architecture retained? | **YES** |
| CBD2-Q02 | Is SP-D the authoritative Windows launcher? | **YES** |
| CBD2-Q03 | Is non-Windows SP-A retained? | **YES** |
| CBD2-Q04 | Is `shell:true` rejected as preferred? | **YES** (SP-E fallback only, §37) |
| CBD2-Q05 | Must the launcher cover init/start/status/stop? | **YES** |
| CBD2-Q06 | Must the launcher surface `res.error`? | **YES** |
| CBD2-Q07 | Must a successful DBA apply preserve the environment? | **YES** |
| CBD2-Q08 | Is CL-B+CL-C the authoritative cleanup model? | **YES** |
| CBD2-Q09 | Must the manifest write precede cleanup/hand-off? | **YES** |
| CBD2-Q10 | Does the baseline verifier remain external/separate? | **YES** (CL-D/CL-E rejected) |
| CBD2-Q11 | Does the baseline verifier need DBA-specific authorization? | **YES** (BCR-CB-004) |
| CBD2-Q12 | Must the RU-1.4 runtime flag be removed from baseline-only gating? | **YES** |
| CBD2-Q13 | Should DB URLs remain non-persisted? | **YES** |
| CBD2-Q14 | Should authorizationId stop requiring source edits? | **YES** |
| CBD2-Q15 | Is `E02_DBA_AUTHORIZATION_ID` narrowly bound? | **YES** (exact pinned value; no arbitrary ID) |
| CBD2-Q16 | Are new dependencies required? | **NO** |
| CBD2-Q17 | Is LOCAL-004 required? | **YES** |
| CBD2-Q18 | Is a Program Authority Decision required? | **NO** (principles preserved) |

---

## 41. Design invariants (CBD2-I)

| ID | Invariant |
|----|-----------|
| CBD2-I1 | CB-B architecture retained |
| CBD2-I2 | Windows launcher portable (no EINVAL) |
| CBD2-I3 | No generic shell proxy |
| CBD2-I4 | All Supabase commands use one bounded launcher contract |
| CBD2-I5 | Successful environment preserved for the verifier |
| CBD2-I6 | Failure cleanup remains best-effort (after diagnostics) |
| CBD2-I7 | Manifest precedes hand-off / cleanup |
| CBD2-I8 | Baseline verifier remains a separate DBA step |
| CBD2-I9 | DBA baseline authority ≠ RU-1.4 runtime authority |
| CBD2-I10 | DB URL not persisted |
| CBD2-I11 | Explicit cleanup deterministic (non-secret identifiers) |
| CBD2-I12 | No arbitrary DBA authorization ID |
| CBD2-I13 | Quarantine unchanged (exactly one) |
| CBD2-I14 | Application history truthful |
| CBD2-I15 | Platform histories preserved |
| CBD2-I16 | LOCAL-003 immutable |
| CBD2-I17 | LOCAL-004 required |
| CBD2-I18 | Runtime claims remain blocked until proof |

All **HELD** by this design.

---

## 42. Risks (runtime — NOT closed at design stage)

Windows `cmd.exe` argument quoting (paths with spaces / non-ASCII repo path) · `ComSpec` absence/misconfiguration · `npx` version drift (unpinned CLI) · preserved-environment resource leak · cleanup token / workdir mismatch · baseline verifier connecting to the wrong stack · DBA authorization-id spoofing · verifier gate accidentally authorizing RU-1.4 · manifest written but environment lost · cleanup warning misclassified as a DB failure · stale temp-workdir collision · secret leakage in hand-off. Each must be exercised at LOCAL-004 execution; **none is resolved here.**

---

## 43. Design decision

```
E-02 BCR CLEAN-BASE DESIGN AMENDMENT-002 = APPROVED WITH NOTES
BCR-CB-002                               = DESIGN REMEDIATION DEFINED / RUNTIME VERIFICATION PENDING
BCR-CB-003                               = DESIGN REMEDIATION DEFINED / RUNTIME VERIFICATION PENDING
BCR-CB-004                               = DESIGN REMEDIATION DEFINED / RUNTIME VERIFICATION PENDING
CB-B                                     = RETAINED
```

No contradiction found with any higher governance layer.

---

## 44. Next governance document

```
NEXT = docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-003.md
       (Authorization ID: E-02-BCR-IA-003)
```

Path finding: authority-safe `-003` successor in the BCR IA series (predecessor `-002` remains immutable). **Not created in this task.**

---

## 45. Prohibited work in this task (confirmation)

No replay-artifact edit · no verifier edit · no environment-guard edit · no source/migration/package change · no Docker/Supabase/DB command · no temp project creation · no IA-003 · no LOCAL-004 · no REA · no tests · no EIR/Acceptance/Certification change. Only this amendment and [`README.md`](README.md) were written.

---

## 46. Lock statement

```
BCR CLEAN-BASE DESIGN AMENDMENT-002    = APPROVED WITH NOTES
BCR-CB-001                             = IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
BCR-CB-002                             = DESIGN REMEDIATION DEFINED / RUNTIME VERIFICATION PENDING
BCR-CB-003                             = DESIGN REMEDIATION DEFINED / RUNTIME VERIFICATION PENDING
BCR-CB-004                             = DESIGN REMEDIATION DEFINED / RUNTIME VERIFICATION PENDING
CB-B ARCHITECTURE                      = RETAINED
WINDOWS CLI LAUNCHER                   = ComSpec/cmd.exe /d /s /c + npx supabase + allowlisted subcommand + shell:false
NON-WINDOWS CLI LAUNCHER               = DIRECT npx / shell:false
LAUNCHER COMMAND COVERAGE              = init / start / status / stop
LAUNCHER ERROR SURFACING               = res.error surfaced (start-failure vs non-zero-exit distinguished)
SUCCESSFUL APPLY ENVIRONMENT           = PRESERVED FOR BASELINE VERIFIER
CLEANUP MODEL                          = CL-B (--preserve-environment) + CL-C (--cleanup)
FAILURE CLEANUP                        = BEST-EFFORT AUTO-CLEANUP AFTER DIAGNOSTIC CAPTURE
MANIFEST WRITE                         = BEFORE CLEANUP / HAND-OFF
BASELINE VERIFIER                      = SEPARATE DBA STEP (CL-D / CL-E REJECTED)
DBA BASELINE AUTHORITY                 = DISTINCT FROM RU-1.4 RUNTIME AUTHORITY
DB URL                                 = DISCOVERED ON DEMAND / NOT PERSISTED
AUTHORIZATION ID                       = E02_DBA_AUTHORIZATION_ID (narrow / pinned / not arbitrary)
QUARANTINE                             = EXACTLY 20260314195641_add_demo_data.sql
HISTORICAL MIGRATION                   = UNCHANGED
APPLICATION HISTORY                    = TRUTHFUL
PLATFORM MIGRATION HISTORIES           = PRESERVED
NEW DEPENDENCY                         = NONE
LOCAL-003                              = FAILED / NOT CONSUMED / IMMUTABLE
LOCAL-004                              = REQUIRED / NOT ISSUED
HMD-001                                = OPEN
DATABASE BASELINE VERIFIED             = NO
RU-1.4 RUNTIME                         = NOT AUTHORIZED
EIR PASS                               = NONE
RUNTIME COMMITTED                      = NOT CERTIFIED
FINAL COMMIT PATH                      = BLOCKED
NEXT                                   = E-02-BCR-IA-003
DO NOT MODIFY MIGRATIONS · NO DATABASE COMMANDS · NO SOURCE MODIFICATION
```

---

**End of document — E-02 BCR Clean-Base Design Amendment-002 — v1.0 — 2026-08-22**
