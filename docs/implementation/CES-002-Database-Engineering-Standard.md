# CES-002 — Database Engineering Standard

| Field | Value |
|-------|-------|
| **Identifier** | CES-002 |
| **Title** | Database Engineering Standard |
| **Type** | Engineering Standard |
| **Status** | **Approved** |
| **Authority** | ClearStrata Constitutional Governance Committee |
| **Approved** | 2026-06-24 |
| **Parent** | [`CES-001-Engineering-Standard.md`](CES-001-Engineering-Standard.md) · [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md) |
| **Milestone** | All (M2, M3, M4, M5, …) |
| **Release** | FR2+ |
| **Implementation authority** | None (standard only) |
| **Production effect** | **None** |

**Applies to:** Every future database object — tables, views, indexes, constraints, migrations, RPCs, triggers, functions, audit tables, snapshot tables, schedulers, and storage schema.

**Related:** [`CES-001-Engineering-Standard.md`](CES-001-Engineering-Standard.md) · [`CES-003-Frontend-Engineering-Standard.md`](CES-003-Frontend-Engineering-Standard.md) · [`Slice-Design-Template.md`](templates/Slice-Design-Template.md)

> **Scope lock:** This standard governs database engineering documentation and discipline. It does **not** authorize schema changes, migrations, RPC modifications, or production behavior changes.

---

## 1. Database philosophy

The database **shall** implement the **approved constitutional model** — not current production convenience.

| Principle | Rule |
|-----------|------|
| **Constitutional fidelity** | Schema, RPC, and trigger behavior must align with Approved **RC** and **CDR** |
| **No constitutional redefinition** | The database **shall not** redefine constitutional decisions through implicit behavior |
| **Correctness over convenience** | Production convenience shall **never** override constitutional correctness |
| **Evidence vs authority** | Production behavior is **evidence** for recovery/investigation — not the design target |
| **Property isolation** | Multi-property isolation is by `property_id`; single Supabase instance |
| **Traceability** | Every database object must appear in the **CITM** (see §9) |

When engineering discovers that an approved decision is incorrect, follow CES-001: Investigation → New CDR → Governance Approval → Updated Slice Design. **Never** encode a constitutional change only in SQL.

---

## 2. Schema standards

### 2.1 General rules

- Every table **shall** document its constitutional role in the Slice Design **Design** section.
- Prefer explicit columns over undocumented JSON semantics.
- All tenant-scoped tables **shall** include `property_id` where applicable (RC000 isolation).
- Primary keys **shall** be stable identifiers (`uuid` preferred for domain entities).
- Timestamps **shall** use `timestamptz`; store UTC.
- Soft-delete only when constitutionally required; otherwise prefer explicit status enums.

### 2.2 Tables

| Requirement | Standard |
|-------------|----------|
| **Naming** | `snake_case`; plural nouns for entity tables; prefix domain where helpful (`owner_vote_*`, `governance_*`) |
| **Documentation** | Comment or Slice Design row describing purpose, RC/CDR source, lifecycle |
| **RLS** | Row Level Security enabled on all tenant-scoped tables unless explicitly exempted with CDR justification |
| **Mutability** | Immutability boundaries (e.g. post-freeze) **shall** be enforced at RPC + constraint level, not UI alone |
| **Audit columns** | `created_at`, `updated_at` minimum; actor columns where mutations are governance-significant |

### 2.3 Views

| Requirement | Standard |
|-------------|----------|
| **Purpose** | Read projections only — views **shall not** mutate state |
| **Naming** | `v_{domain}_{purpose}` or documented project convention |
| **Security** | `security_invoker` vs `security_definer` must be explicit and justified |
| **Traceability** | CITM row if view is consumed by RPC, UI, or reports |

### 2.4 Indexes

| Requirement | Standard |
|-------------|----------|
| **Purpose** | Document query/RPC path supported |
| **Naming** | `idx_{table}_{columns}` or project convention |
| **Uniqueness** | Partial indexes allowed when constitutionally scoped (e.g. one active row per key) |
| **Review** | Performance impact noted in Slice Design **Design → Performance** |

### 2.5 Constraints

| Type | Standard |
|------|----------|
| **NOT NULL** | Required for constitutionally mandatory fields |
| **CHECK** | Encode valid state transitions and enum subsets where SQL-enforceable |
| **EXCLUDE / UNIQUE** | Prevent duplicate governance artifacts (e.g. duplicate active ballots) |
| **Naming** | `chk_{table}_{rule}`, `uq_{table}_{columns}` |

### 2.6 Foreign keys

- **Shall** reference canonical parent entities.
- **ON DELETE** behavior must be explicit (`RESTRICT`, `CASCADE`, `SET NULL`) and documented.
- Cross-property FKs **shall not** exist without explicit CDR authorization.

### 2.7 Unique keys

- Enforce one-row-per-constitutional-fact where required (e.g. one freeze event per meeting phase).
- Composite uniqueness **shall** include `property_id` when scoped per property.

### 2.8 Enums

- Prefer PostgreSQL `ENUM` or check-constrained text with documented vocabulary.
- Enum values **shall** match Slice Design state machine — not ad hoc application strings.
- Adding enum values requires migration + CITM update + verification.

### 2.9 JSON columns

- Use only when schema flexibility is constitutionally justified.
- **Shall** document expected keys, types, and versioning in Slice Design.
- **Shall not** store authoritative governance facts solely in undocumented JSON when relational columns suffice.

### 2.10 Audit tables

See §6. Audit tables are append-only unless CDR specifies otherwise.

### 2.11 Snapshot tables

See §7. Snapshot tables are immutable after freeze unless CDR correction policy applies.

---

## 3. Migration standard

Every migration **shall** be documented in the Slice Design **Migration** section and in migration file header comments.

### 3.1 Required migration metadata

| Field | Required content |
|-------|------------------|
| **Purpose** | Why this migration exists; which constitutional gap it closes |
| **Affected objects** | Tables, views, indexes, constraints, RPC, triggers, grants |
| **Compatibility** | Backward compatibility, nullable phases, dual-write periods |
| **Rollback** | SQL or operational steps to revert safely |
| **Verification** | Queries/tests proving success |
| **RC references** | Applicable Approved RC (e.g. RC010-A) |
| **CDR references** | Applicable Approved CDR (e.g. CDR-001) |
| **CITM** | Row(s) linking each affected object |
| **Risk assessment** | Data loss, lock time, partial deploy, rollback failure |

### 3.2 Migration file rules

```
supabase/migrations/{timestamp}_{descriptive_name}.sql
```

- One logical change set per migration when possible.
- **Shall not** mix unrelated constitutional changes.
- Destructive operations (`DROP`, mass `UPDATE`) require explicit risk mitigation in Slice Design.
- Migrations run only under **Implementation Authorization**.

### 3.3 Migration sequence (recommended)

1. Additive schema (new tables/columns, nullable)
2. Backfill / dual-write RPC if needed
3. Enforce constraints (NOT NULL, FK, CHECK)
4. Switch read/write paths (RPC + UI)
5. Remove deprecated objects (separate migration after verification)

### 3.4 Rollback

- Every migration **shall** define rollback strategy before deploy.
- If rollback is impossible, document **forward-only** recovery and require CDR acknowledgment.

---

## 4. RPC standard

Every RPC (Supabase `CREATE OR REPLACE FUNCTION`) **shall** be documented in Slice Design and comply with the following.

### 4.1 Required RPC documentation

| Field | Required content |
|-------|------------------|
| **Purpose** | Constitutional behavior implemented |
| **Authority** | SECURITY DEFINER vs INVOKER; why elevated privileges are needed |
| **Parameters** | Name, type, validation, nullability |
| **Return type** | Shape, error encoding, success contract |
| **Permission model** | Who may call; council vs owner; membership checks |
| **Transaction scope** | Single transaction vs multi-step; isolation expectations |
| **Error contract** | Stable error codes/messages; no silent failure |
| **Audit behavior** | What is logged; audit table targets |
| **Idempotency** | Safe to retry; duplicate-call behavior |
| **Dependencies** | Tables, other RPCs, triggers, snapshots |
| **Verification** | SQL tests, integration tests, manual steps |

### 4.2 RPC design rules

- **Shall** enforce constitutional gates (e.g. freeze complete before formal vote submit).
- **Shall** use snapshot tables for post-freeze eligibility when CDR requires — not live membership alone.
- **Shall not** bypass RLS without documented SECURITY DEFINER justification.
- **Shall** validate `property_id` and caller authorization on every mutating RPC.
- Prefer RPC as the **sole legal mutation path** for governance-significant actions.
- Idempotent freeze/snapshot RPCs **shall not** silently rebuild immutable snapshots unless CDR correction policy allows.

### 4.3 Naming

- `snake_case` verb phrases: `freeze_owner_vote_snapshot`, `submit_owner_vote`
- Prefix by domain when helpful: `owner_vote_*`, `governance_*`

---

## 5. Trigger standard

Every trigger **shall** be documented in Slice Design.

### 5.1 Required trigger documentation

| Field | Required content |
|-------|------------------|
| **Reason** | Why trigger vs RPC/application logic |
| **Event** | `INSERT` / `UPDATE` / `DELETE` (or combination) |
| **Timing** | `BEFORE` / `AFTER` |
| **Dependencies** | Tables, functions invoked |
| **Audit** | Whether trigger writes audit rows |
| **Rollback** | Migration to drop trigger |
| **Performance** | Row volume, index interaction, lock risk |

### 5.2 Trigger rules

- Prefer RPC-enforced invariants over triggers when constitutional logic is complex.
- Triggers **shall not** implement constitutional decisions undocumented in RC/CDR.
- Triggers that mutate other tables **shall** be idempotent-safe or guarded against recursion.
- Avoid triggers on high-volume tables without performance review.

---

## 6. Audit standard

Every **business mutation** of governance significance **shall** define audit behavior.

### 6.1 Required audit fields

| Field | Standard |
|-------|----------|
| **Audit table** | Dedicated append-only table or structured audit log |
| **Actor** | `user_id` / `auth.uid()` or system actor label |
| **Timestamp** | `timestamptz` UTC |
| **Before** | Prior state snapshot (JSON or column diff) where applicable |
| **After** | New state snapshot |
| **Reason** | Human or machine-readable action code |
| **Correlation ID** | Links related mutations (meeting id, freeze event id, request id) |

### 6.2 Audit rules

- Audit rows **shall** be append-only.
- Audit **shall not** be the sole source of authoritative state — it evidences mutations.
- Freeze, vote submit, membership activation, and council actions **shall** emit audit records when implemented under CES-002.
- Audit retention policy documented in Slice Design when non-default.

---

## 7. Snapshot standard

Snapshot tables implement constitutional freeze boundaries (see RC010-A, CDR-001).

### 7.1 Required snapshot documentation

| Field | Required content |
|-------|------------------|
| **Freeze source** | Live tables used to build snapshot (e.g. `property_members`) |
| **Immutable policy** | Whether rows may change after freeze |
| **Correction policy** | Authorized correction path (separate CDR/process only) |
| **Retention** | Lifecycle, archival, legal hold if applicable |
| **Version** | Version column or freeze event id if re-issue allowed |
| **Verification** | Queries proving snapshot matches freeze contract |

### 7.2 Snapshot rules

- **Freeze** is an atomic event — snapshot creation and `snapshot_frozen_at` (or equivalent) **shall** be consistent.
- After freeze, snapshot rows **shall** be immutable unless CDR correction policy explicitly permits re-issue.
- Voter snapshots (`owner_vote_voter_snapshot`) and resolution snapshots **shall** be modeled distinctly when both are required (RC010-A).
- Re-freeze that rebuilds an existing immutable snapshot is a **Known Constitutional Implementation Gap** until closed by authorized implementation (CDR-001).
- Votes **shall** bind to immutable frozen instruments, not mutable live row identity alone (CDR-001).

---

## 8. Scheduler and background database work

Database schedulers (`pg_cron`, Supabase scheduled functions, queue workers) **shall**:

- Appear in CITM with RC/CDR references
- Document timing, timezone, and failure behavior
- Prefer server-side automatic freeze over client-only triggers (CDR-001)
- Emit audit on significant scheduled mutations

---

## 9. Database CITM

Every database engineering artifact **must** appear in the **Constitutional Implementation Traceability Matrix** defined in [`CES-001`](CES-001-Engineering-Standard.md).

### 9.1 Mandatory CITM coverage (database)

| Object type | CITM required |
|-------------|---------------|
| **Table** | Yes |
| **View** | Yes (if used in governance path) |
| **Migration** | Yes |
| **RPC** | Yes |
| **Trigger** | Yes |
| **Function** | Yes (if governance-significant) |
| **Scheduler / job** | Yes |
| **Snapshot table** | Yes |
| **Audit table** | Yes (when introduced for governance mutations) |

### 9.2 CITM row template (database)

| Engineering Item | RC Source | CDR Source | Production Reality | Constitutional Target | Gap | Slice |
|------------------|-----------|------------|--------------------|-----------------------|-----|-------|
| `{table \| rpc \| migration name}` | {RC} | {CDR §} | {current behavior} | {approved target} | {gap or —} | {M{n}-S{k}} |

**Rule:** No CITM row → database implementation **not authorized**.

---

## 10. Verification (database)

Every authorized database change **shall** include verification in Slice Design §4:

| Check | Method |
|-------|--------|
| Schema exists / columns correct | `\d`, `information_schema`, migration verify SQL |
| Constraints enforceable | Insert/update negative tests |
| RPC contract | `SELECT routine_name`, unit/integration tests |
| RLS | Role-based access tests |
| Snapshot immutability | Post-freeze mutation attempts fail |
| Audit emitted | Row count / field checks after mutation |
| Rollback tested | Staging rollback drill when feasible |

---

## 11. Permanent database rules

| # | Rule |
|---|------|
| **DB-1** | Database implements Approved RC/CDR — not undocumented production patterns |
| **DB-2** | Every table, RPC, trigger, and migration appears in **CITM** |
| **DB-3** | Every migration documents purpose, compatibility, rollback, verification, RC/CDR, risks |
| **DB-4** | Every RPC documents authority, permissions, errors, audit, idempotency |
| **DB-5** | Snapshot tables are immutable after freeze unless CDR correction policy applies |
| **DB-6** | Governance mutations emit audit (actor, timestamp, before/after, reason, correlation) |
| **DB-7** | No schema or RPC deploy without **Implementation Authorization** |

---

## 12. Relationship to CES-001

| CES-001 | CES-002 |
|---------|---------|
| Slice structure, CITM, compliance | Database-specific schema, migration, RPC, trigger, audit, snapshot rules |
| Engineering discipline | Database philosophy and object-level standards |

All Slice Design **Design** and **Migration** sections for database work **shall** comply with **both** CES-001 and CES-002.

**M2 Slice 3** database objects (e.g. `owner_vote_voter_snapshot`, `freeze_owner_vote_snapshot`, `submit_owner_vote`) shall be the first database work documented under CES-001 + CES-002 together.

---

## 13. Filing convention

| Kind | Pattern | Example |
|------|---------|---------|
| Database Engineering Standard | `CES-{nnn}-{title}.md` | CES-002 |
| SQL migration | `{timestamp}_{name}.sql` | `supabase/migrations/...` |
| RPC | Documented in Slice Design + CITM | `submit_owner_vote` |

---

**Parent standard:** [`CES-001-Engineering-Standard.md`](CES-001-Engineering-Standard.md) · **Governance:** [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md)
