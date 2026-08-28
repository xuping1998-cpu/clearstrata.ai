# E-02 — Baseline Compatibility Replay Artifact — Implementation Authorization (Successor)

## Diagnostic Observability / Error-Capture Enhancement Only · Repeated Auxiliary `supabase start` Failure

| Field | Value |
|-------|-------|
| **Document Type** | Implementation Authorization (Successor) |
| **Program** | E-02 — Freeze Engine · Executable Remediation Stage |
| **Artifact** | Governed Baseline-Compatibility Replay Artifact (class C) — **diagnostic / error-capture observability only** |
| **Authorization ID** | **E-02-BCR-IA-006** |
| **Predecessors** | **E-02-BCR-IA** · **E-02-BCR-IA-002** · **E-02-BCR-IA-003** · **E-02-BCR-IA-004** · **E-02-BCR-IA-005** — all **CONSUMED / HISTORICAL / IMMUTABLE** |
| **Empirical basis** | [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md) · [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md) |
| **Status** | **Approved With Conditions** |
| **Authority Level** | Implementation Authorization (repository implementation only) |
| **Effective Date** | 2026-08-24 |
| **Revision** | v1.0 |
| **Repository path** | [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md) |
| **Production Effect** | **None** |

> **Authority path finding: YES.** `E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md` is **authority-safe** as the next **successor Implementation Authorization** in the existing BCR IA family (`…-Implementation-Authorization.md` → `-002` → `-003` → `-004` → `-005` → **`-006`**). ID **`E-02-BCR-IA-006`** parallels that series. Distinct filename keeps predecessors **immutable**. **Not a new governance tier.** **Not a Clean-Base Design Amendment.** **Not a DBA.** **Not LOCAL-007.** **Not a PAD.** **Not a quarantine amendment.** **Not a RU-1.4 REA.**

> **Document class:** Bounded successor **Implementation Authorization** for **one future narrow repository diagnostic/error-capture enhancement** of the replay artifact’s allowlisted Supabase CLI process observability (especially `start`). This issuance **does not implement** the enhancement · **does not** modify the artifact · **does not** execute another `supabase start` · **does not** create or authorize LOCAL-007 · **does not** run DB / Supabase / Docker.

```
SUCCESSOR BCR IMPLEMENTATION AUTHORIZATION = E-02-BCR-IA-006
DECISION                                   = APPROVED WITH CONDITIONS
AUTHORIZED PURPOSE                         = DIAGNOSTIC OBSERVABILITY ONLY
PREDECESSORS (E-02-BCR-IA / -002 / -003 / -004 / -005)
                                           = CONSUMED / HISTORICAL / IMMUTABLE
LOCAL-005                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-006                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
DOCKER PRE-WARM (LOCAL-006)                = PASS
COLD WAKE DURING LOCAL-006 APPLY           = NO
REPEATED START FAILURE                     = YES (cold context AND warm context)
ROOT CAUSE                                 = CB-B AUXILIARY PLATFORM START FAILURE / NOT YET CAPTURED
ERROR_CAPTURE_INSUFFICIENT                 = DIAGNOSTIC LIMITATION (stdout discarded; stderr.slice(0,400) only)
NEW BCR-CB DEFECT                          = NOT ALLOCATED
CB-B ARCHITECTURE                          = RETAINED
LAUNCHER SEMANTICS                         = UNCHANGED
STARTUP BEHAVIOR                           = UNCHANGED
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
LOCAL-007                                  = NOT AUTHORIZED BY THIS IA
THIS ISSUANCE                              ≠ IMPLEMENTATION · ≠ SUPABASE START · ≠ LOCAL-007
```

---

## 1. Authority path finding (this issuance)

| Question | Finding |
|----------|---------|
| Successor IA path | **YES** — `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md` |
| Authorization ID | **E-02-BCR-IA-006** |
| Why | Existing BCR IA sequence ends at **E-02-BCR-IA-005 CONSUMED**; LOCAL-006 proves idle-wake is **insufficient** as sole explanation; repeated `supabase start` failure now requires **diagnostic observability** before a successor DBA is justified; same Implementation Authorization class; no new tier |

**Successor Completion path finding (do not create now):**

Clean-Base Implementation Completion naming remains reserved for **CB-B / BCR-CB-00x remediations**. **E-02-BCR-IA-006 is not a clean-base redesign.**

**Authority-safe successor Completion after future implementation** (existing BCR Implementation Completion family):

```
docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Completion-006.md
```

ID parallel: `E-02-BCR-IA-006`. **Not created in this task.**

---

## 2. Authorization basis

| Record | Role |
|--------|------|
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-006.md) | LOCAL-006 **APPLICATION_FAILED** at auxiliary `supabase start` **on a pre-warmed engine** · cold wake **NO** · studio **not observed** · **immutable** |
| [`E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md`](E-02-Database-Application-Evidence-E-02-DBA-LOCAL-005.md) | LOCAL-005 **APPLICATION_FAILED** at auxiliary `supabase start` in a **cold Docker** context · **immutable** |
| [`E-02-Database-Application-Authorization-LOCAL-006.md`](E-02-Database-Application-Authorization-LOCAL-006.md) | Classified `ERROR_CAPTURE_INSUFFICIENT` as diagnostic limitation; instructed governance to consider a diagnostic/error-capture IA **if a warmed-engine start failed again** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Authorization-005.md`](E-02-Baseline-Compatibility-Replay-Implementation-Authorization-005.md) | Predecessor **E-02-BCR-IA-005 CONSUMED / HISTORICAL / IMMUTABLE** |
| [`E-02-Baseline-Compatibility-Replay-Implementation-Completion-005.md`](E-02-Baseline-Compatibility-Replay-Implementation-Completion-005.md) | IA-005 repository completion — **COMPLETED WITH NOTES** · **not reopened** |

---

## 3. Incoming locked state

| Item | Status |
|------|--------|
| LOCAL-005 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-006 | **APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE** |
| LOCAL-006 pre-gate | **PASS** |
| Docker engine pre-warm (LOCAL-006) | **PASS** |
| Cold wake during LOCAL-006 apply | **NO** |
| Aux init | **PASS** |
| Aux migration count | **0** |
| `supabase start` | **PROCESS_EXITED_NONZERO / status=1** |
| Studio startup | **NOT OBSERVED** |
| Studio port 54323 | **NOT PUBLISHED** |
| Platform baseline / governed replay | **NOT REACHED** |
| Executed migrations | **0** |
| HMD-001 | **OPEN / UNRELATED** |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING / NOT REACHED** |
| Quarantine | exactly `20260314195641_add_demo_data.sql` · count **1** |
| RU-1.1 / RU-1.2 | **NOT APPLIED** |
| Database baseline verified | **NO** |
| RU-1.4 | **RUNTIME NOT AUTHORIZED** |

LOCAL-005 and LOCAL-006 **must not** be retried or relabelled successful.

---

## 4. Authorization decision

| Field | Value |
|-------|-------|
| **Authorization ID** | **E-02-BCR-IA-006** |
| **Decision** | **APPROVED WITH CONDITIONS** |
| **Authorized purpose** | **DIAGNOSTIC OBSERVABILITY ONLY** |
| **Implementation this task** | **NOT PERFORMED** |
| **Artifact execution / another `supabase start`** | **NOT AUTHORIZED by this IA** |
| **LOCAL-007** | **NOT AUTHORIZED by this IA** |

This authorization permits a **future repository-only implementation**. It does **not** implement it.

---

## 5. Repeated-failure finding (do not invent root cause)

Repeated auxiliary Supabase startup failure under:

| Attempt | Docker context | Result |
|---------|----------------|--------|
| LOCAL-005 | cold / idle-wake | `supabase start` status=1 |
| LOCAL-006 | already warm (gate PASS; cold wake **NO**) | `supabase start` status=1 |

**Docker cold-wake is no longer sufficient as the sole explanation.**

```
CURRENT CLASSIFICATION
  = CB-B AUXILIARY PLATFORM START FAILURE
    / ROOT CAUSE NOT YET CAPTURED

ERROR_CAPTURE_INSUFFICIENT
  = stdout discarded on PROCESS_EXITED_NONZERO
    + stderr truncated to slice(0, 400)
    + containers/logs destroyed by failure cleanup
    → true CLI/platform error not recoverable from evidence
```

This IA **does not** claim an exact new root cause (studio-internal exception, port collision, image defect, or otherwise).

---

## 6. Defect ID finding (BCR-CB)

**NO NEW BCR-CB DEFECT ALLOCATED.**

Repository precedent allocates **BCR-CB-00x** through **Clean-Base Design Amendments** for **architecture remediations** (CB-B · launcher · lifecycle · verifier gate). LOCAL-006 already classified error-capture insufficiency as:

```
DIAGNOSTIC LIMITATION / NOT A BLOCKING BCR CODE DEFECT
```

This IA authorizes **observability**, not a CB-B redesign and not a new architecture defect. Inventing **BCR-CB-005** here would **misclassify** a diagnostic limitation as a clean-base architecture defect.

**Do not reopen** BCR-CB-001 / 002 / 003 / 004. They remain:

```
IMPLEMENTED IN REPOSITORY / RUNTIME VERIFICATION PENDING
```

Descriptive finding retained: **`ERROR_CAPTURE_INSUFFICIENT`**.

---

## 7. Exact future source scope

**Preferred — modify exactly one source file:**

```
scripts/verification/e02/replay-e02-declared-baseline.ts
```

A second helper file is **not preferred** and is **not authorized unless** existing architecture **strictly requires** diagnostic helper separation. This issuance **does not name or create** a helper. No wildcard. No verifier change.

README may be minimally updated by the **future implementation task** according to precedent.

---

## 8. Authorized diagnostic enhancement

Future implementation may capture, **sanitize**, and persist **bounded** observability around allowlisted Supabase CLI process execution, **especially `start`:**

- child-process stdout  
- child-process stderr  
- `res.error`  
- exit code  
- signal  
- timeout state  
- command subcommand identity  
- start elapsed time  
- explicit truncation metadata  

**Current deficiency (locked):** on non-zero exit, stdout is discarded; failure evidence uses `sanitizeCliText(stderr.slice(0, 400))` as the sole captured CLI text.

Future implementation **must not** keep `stderr.slice(0, 400)` as the **sole** failure evidence.

---

## 9. Output capture contract

Authorize **bounded** capture, for example:

- sanitized stdout excerpt  
- sanitized stderr excerpt  
- head **and** tail sections if a stream is long  
- explicit truncation flags / byte counts  

Exact byte limits must be **conservative and documented in the implementation**. Do **not** persist unlimited child-process output. Do **not** persist secrets.

Suggested conservative ceiling (implementation may choose equal-or-smaller documented limits): **head 8 KiB + tail 8 KiB per stream**, with truncation metadata. Larger limits require **STOP → GOVERNANCE**.

---

## 10. `--debug` authority

A bounded diagnostic mode **may** pass documented Supabase CLI `--debug` **only if all** of the following hold at implementation time:

1. confirmed supported by the **installed** CLI via **non-mutating** `supabase start --help` / `--version`;  
2. applied **only** to the internal allowlisted **`start`** command;  
3. no secrets persisted;  
4. **no** change to startup semantics (`--workdir`, ports, services, config).  

**Undocumented flags are NOT authorized.** If `--debug` output contains credentials or URLs, **sanitize before persistence**.

This issuance **does not** run CLI `--help`. Confirmation is a **future implementation** static check.

---

## 11. Secret sanitization (mandatory)

Diagnostic evidence **MUST** redact:

`DATABASE_URL` · `SUPABASE_URL` · service-role keys · anon keys · JWTs · passwords · tokens · connection strings · credentials.

**Do not** persist environment dumps. **Do not** persist raw `supabase status` JSON containing secrets.

---

## 12. Container-log diagnostic boundary

This IA **does not** itself authorize reading Docker container logs.

If a **future diagnostic DBA / diagnostic execution authorization** explicitly authorizes it, implementation **may** support **read-only, current-auxiliary-project-scoped** log reads **before** failure cleanup destroys containers.

**Not authorized by this IA:** mutating containers · restarting services · manually fixing services · raw Docker orchestration · deleting unrelated containers · querying arbitrary unrelated logs.

Because safe project-scoped log capture is **not** already bounded in the existing artifact, **container-log capture is deferred** to that separate future execution authority.

---

## 13. Failure cleanup order (narrow lifecycle consideration)

Authorize consideration of **one** narrow lifecycle adjustment:

```
On `supabase start` failure:
  capture diagnostics
  → persist failure evidence (sanitized)
  → then perform existing best-effort cleanup
```

**Do not** remove failure cleanup. **Do not** leave failed stacks running by default. Temporary preservation of a failed stack requires a **future diagnostic execution authorization**. Diagnostic evidence **must** be captured **before** containers/logs are destroyed.

Preserve/handoff success path (`RUNNING_FOR_BASELINE_VERIFY`) remains **unchanged**.

---

## 14. Startup behavior / launcher — UNCHANGED

**No authorization** to change:

`supabase init` · `supabase start` semantics · `--workdir` · aux migrations · platform baseline model · launcher executable · ComSpec `/d /s /c` · `npx supabase` · `shell:false` · subcommand allowlist · port mappings · Docker resources · Supabase config · service enable/disable.

Diagnostic only.

---

## 15. CB-B architecture — RETAINED

Retain: `AUXILIARY_LOCAL_SUPABASE_EMPTY_MIGRATIONS` · fresh project · empty migrations · platform-owned baseline · real repository migration source · truthful history · single quarantine · preserve/handoff · baseline verifier separation · explicit cleanup.

**No redesign.**

---

## 16. Quarantine / restored migration / HMD

| Item | Status |
|------|--------|
| Quarantine | exactly `20260314195641_add_demo_data.sql` · count **1** |
| Second quarantine | **NOT AUTHORIZED** |
| `20260315035847_add_meeting_templates_and_attachments.sql` | **NOT QUARANTINED** · **DO NOT TOUCH** |
| Option B | **NOT AUTHORIZED** |
| HMD-001 | **OPEN** · unrelated to start failure |
| HMD-002 | **SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING** · **not CLOSED** |

No migration modifications. No line-ending normalization.

---

## 17. Verifier / environment guard / package / tests

| Path | This IA |
|------|---------|
| `scripts/verification/e02/verify-db-baseline.ts` | **NOT AUTHORIZED FOR MODIFICATION** |
| `scripts/verification/e02/environment-guard.ts` | **NOT AUTHORIZED FOR WEAKENING** |
| `package.json` / lockfile | **NO NEW DEPENDENCY** |
| tests / RU-1.4 harness | **NOT AUTHORIZED FOR MODIFICATION** |

If implementation unexpectedly requires a new dependency: **STOP → GOVERNANCE.**

No remote / production execution.

---

## 18. Static verification authorized for future implementation

**Allowed (DB-free):** source inspection · grep · `git diff` · replay artifact `--plan` · `npm run build` · non-mutating CLI `--help` / `--version` to confirm documented `--debug` support.

**Not allowed during implementation:** `--apply` · operational `--cleanup` · `supabase init/start/status/stop` as operational commands · DB connections · baseline verifier against DB · Docker mutation · LOCAL-006 retry · LOCAL-007 · RU-1.4.

---

## 19. Implementation Completion gate (future)

Future implementation + successor Completion must prove at least:

1. only authorized diagnostic/observability scope changed  
2. CB-B architecture unchanged  
3. launcher executable / ComSpec / `shell:false` / allowlist unchanged  
4. `supabase start` semantics unchanged except authorized diagnostic capture  
5. no retry / sleep / backoff / health-loop / Docker-start logic  
6. stdout and stderr are capturable (sanitized, bounded) on `start` failure  
7. `stderr.slice(0, 400)` is no longer the **sole** failure evidence  
8. truncation metadata present  
9. secrets redacted  
10. no unlimited output persistence  
11. failure cleanup still occurs **after** diagnostic persist  
12. failed stacks are **not** left running by default  
13. quarantine unchanged · count = 1  
14. restored migration untouched  
15. verifier / guard / package / tests unchanged  
16. `--plan` PASS  
17. `npm run build` PASS  
18. no DB / stateful Supabase / Docker in the implementation task  
19. LOCAL-005 / LOCAL-006 remain immutable failed evidence  
20. LOCAL-007 remains **not** authorized by this IA  

---

## 20. Future diagnostic execution gate

**This IA does NOT authorize another `supabase start`.**

After implementation + Completion, governance must **separately** decide whether to issue:

- a successor diagnostic DBA / LOCAL-007, **or**  
- a distinct diagnostic execution authorization  

according to repository precedent.

```
E-02-BCR-IA-006  ≠  LOCAL-007 AUTHORITY
LOCAL-007        = NOT AUTHORIZED NOW
```

Do **not** automatically declare LOCAL-007 authorized by IA-006.

---

## 21. What this IA does NOT authorize

- CB-B architecture change  
- changing Supabase startup behavior  
- retries / backoff / sleeps / health loops  
- Docker startup automation  
- alternate launcher  
- raw Docker / raw Postgres fallback  
- migration / quarantine changes  
- verifier / environment-guard weakening  
- LOCAL-006 retry  
- LOCAL-007 execution  
- RU-1.4 / REA / EIR / Acceptance / Certification change  

---

## 22. Next authorized action (after this issuance)

```
NEXT = IMPLEMENT E-02-BCR-IA-006 DIAGNOSTIC OBSERVABILITY
```

in `scripts/verification/e02/replay-e02-declared-baseline.ts` only. Then issue Completion-006. **Do not** start Supabase in the implementation task.

---

## 23. File-scope verification (this issuance task)

This issuance writes only:

1. `docs/implementation/E-02-Baseline-Compatibility-Replay-Implementation-Authorization-006.md` (this document)  
2. `docs/implementation/README.md` (minimal)

**No** artifact edit · **no** migration edit · **no** verifier/guard/package/test edit · **no** git commit · **no** DB / Supabase / Docker · **no** LOCAL-007.

---

## 24. Lock statement

```
E-02-BCR-IA-006                            = APPROVED WITH CONDITIONS / NOT YET CONSUMED
DECISION                                   = APPROVED WITH CONDITIONS
AUTHORIZED PURPOSE                         = DIAGNOSTIC OBSERVABILITY ONLY
LOCAL-005                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
LOCAL-006                                  = APPLICATION_FAILED / NOT SUCCESSFULLY CONSUMED / EVIDENCE IMMUTABLE
REPEATED START FAILURE                     = YES
DOCKER PRE-WARM                            = PASS (LOCAL-006) / COLD WAKE NO
ROOT CAUSE                                 = CB-B AUXILIARY PLATFORM START FAILURE / NOT YET CAPTURED
ERROR CAPTURE                              = INSUFFICIENT (stdout discarded; stderr 400-char)
CB-B                                       = RETAINED
QUARANTINE                                 = EXACTLY 20260314195641_add_demo_data.sql · COUNT 1
HMD-001                                    = OPEN
HMD-002                                    = SOURCE INTEGRITY RESTORED / RUNTIME REPLAY VERIFICATION PENDING
NEW BCR-CB DEFECT                          = NOT ALLOCATED
DATABASE BASELINE VERIFIED                 = NO
LOCAL-007                                  = NOT AUTHORIZED
RU-1.4                                     = RUNTIME NOT AUTHORIZED
EIR PASS                                   = NONE
RUNTIME COMMITTED                          = NOT CERTIFIED
FINAL COMMIT PATH                          = BLOCKED
NEXT                                       = IMPLEMENT E-02-BCR-IA-006 DIAGNOSTIC OBSERVABILITY
THIS ISSUANCE                              ≠ IMPLEMENTATION · ≠ DATABASE · ≠ LOCAL-007
```

---

**End of document — E-02-BCR-IA-006 — v1.0 — 2026-08-24**
