# CES-001 — ClearStrata Engineering Standard

| Field | Value |
|-------|-------|
| **Identifier** | CES-001 |
| **Title** | ClearStrata Engineering Standard |
| **Type** | Engineering Standard |
| **Status** | **Approved** |
| **Authority** | ClearStrata Constitutional Governance Committee |
| **Approved** | 2026-06-24 |
| **Parent** | [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md) |
| **Milestone** | All (M2, M3, M4, M5, …) |
| **Release** | FR2+ |
| **Implementation authority** | None (standard only) |
| **Production effect** | **None** |

**Applies to:** M2 · M3 · M4 · M5 · and **all future engineering work**

**Related:** [`Slice-Design-Template.md`](templates/Slice-Design-Template.md) · [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md)

> **Scope lock:** This standard governs engineering documentation, traceability, and implementation discipline. It does **not** authorize application code, database schema, migrations, production data, or production behavior changes.

---

## 1. Purpose

Establish permanent engineering standards for ClearStrata constitutional implementation:

1. **Constitutional traceability** — every engineering artifact traces to approved requirements and decisions.
2. **Engineering Slice structure** — uniform design documents for all milestone slices.
3. **Implementation discipline** — clear gates between design, authorization, and code.
4. **Constitutional compliance verification** — provable alignment with RC and CDR.

These standards apply to **all** implementation slices across all milestones and releases.

---

## 2. Constitutional Implementation Traceability Matrix (CITM)

### 2.1 Definition

| Abbreviation | Full name |
|--------------|-----------|
| **CITM** | Constitutional Implementation Traceability Matrix |

### 2.2 Purpose

Every engineering artifact must trace directly back to:

```
Requirement (RC)
    ↓
Decision (CDR)
    ↓
Production Gap (Recovery / Investigation)
    ↓
Implementation (Slice Design → Authorization → Engineering)
```

**No engineering work may exist without constitutional traceability.**

### 2.3 Required CITM template

Every Slice Design **shall** include the following table:

| Engineering Item | RC Source | CDR Source | Production Reality | Constitutional Target | Gap | Slice |
|------------------|-----------|------------|--------------------|-----------------------|-----|-------|
| *Example: resolution vote eligibility* | RC010-A | CDR-001 §4 | `submit_owner_vote` uses live `property_members` | `owner_vote_voter_snapshot` after Freeze | Known Constitutional Implementation Gap | M2-S3 |

### 2.4 CITM coverage rules

Every new engineering item of the following types **must** appear in the CITM:

| Category | Examples |
|----------|----------|
| **Table** | New or altered database tables |
| **RPC** | Supabase functions, stored procedures |
| **Trigger** | Database triggers |
| **Function** | Server-side or shared functions |
| **Edge Function** | Supabase Edge Functions |
| **UI Flow** | User-facing workflows and guards |
| **Migration** | SQL migration files |
| **Workflow** | Business process sequences |
| **Background Job** | Scheduled or async jobs |
| **Scheduler** | Cron, pg_cron, server-side timers |
| **State Machine** | Lifecycle states and transitions |

**Rule:** If an engineering item has **no CITM row**, implementation is **NOT authorized**.

---

## 3. Engineering Slice Standard

Every implementation slice **shall** contain exactly the following sections.

### 3.1 Objective

Must define:

- **Purpose** — why this slice exists
- **Scope** — what is included
- **Out of Scope** — explicit exclusions
- **Dependencies** — prerequisite RC, CDR, recovery, prior slices
- **Success Criteria** — measurable outcomes
- **Acceptance Goal** — release/milestone gate alignment

### 3.2 Design

Must define:

- **Architecture** — layer boundaries and component relationships
- **Data Model** — tables, columns, constraints, relationships
- **Workflow** — end-to-end process flow
- **State Machine** — states, transitions, guards
- **RPC** — function signatures, behavior, security
- **API** — endpoints, contracts, error codes
- **UI Flow** — screens, guards, user actions
- **Error Handling** — failure modes and user messaging
- **Permissions** — RLS, roles, council vs owner
- **Security** — SECURITY DEFINER rules, input validation
- **Audit** — logging, traceability fields
- **Performance** — expected load, indexing, batching

### 3.3 Migration

Must define:

- **Current Production Behavior** — facts from recovery/investigation
- **Target Behavior** — aligned with approved CDR
- **Compatibility Strategy** — backward compatibility, feature flags, phased rollout
- **Migration Sequence** — ordered steps (schema → RPC → UI)
- **Rollback Strategy** — how to revert safely
- **Deployment Plan** — environment order, verification gates
- **Risk Assessment** — data loss, downtime, partial-state risks

### 3.4 Verification

Must define:

- **Unit Tests** — isolated function/component tests
- **Integration Tests** — cross-layer behavior
- **Manual Verification** — human QA steps
- **SQL Validation** — queries to confirm schema/RPC state
- **UI Validation** — user journey checks
- **Regression Checklist** — existing flows that must not break
- **Acceptance Checklist** — milestone/release criteria

### 3.5 Constitutional Compliance

Every slice **shall** end with a Constitutional Compliance section (see §5).

**Template:** [`templates/Slice-Design-Template.md`](templates/Slice-Design-Template.md)

---

## 4. Implementation authority chain

Engineering Design **does not** authorize implementation.

### 4.1 Required order

```
RC (Approved requirement)
    ↓
Recovery / Investigation (production facts)
    ↓
CDR (Approved constitutional decision)
    ↓
Slice Design (CES-001 compliant, including CITM)
    ↓
Implementation Authorization (explicit permission)
    ↓
Engineering (code, schema, migrations)
    ↓
Verification (tests, validation, acceptance)
    ↓
Release (FR gate)
```

### 4.2 What does not authorize implementation

| Record | Authorizes implementation? |
|--------|----------------------------|
| Draft / Investigation / Proposed | **No** |
| Completed Recovery | **No** |
| Approved CDR | **No** |
| Approved Slice Design | **No** |
| **Implementation Authorization** | **Yes** |

---

## 5. Constitutional Compliance

Every slice **shall** end with:

### 5.1 Compliance table

| Constitutional Source | Compliance | Evidence |
|-----------------------|------------|----------|
| RC010-A | Pending / Complete | Description |
| RC010-B | Pending / Complete | Description |
| RC010-C | Pending / Complete | Description |
| CDR-001 | Pending / Complete | Description |
| *Additional RC/CDR as applicable* | Pending / Complete | Description |

**Compliance values:**

- **Pending** — design addresses requirement; not yet implemented or verified
- **Complete** — implemented and verified with evidence (test output, SQL query, UI screenshot reference)

### 5.2 Purpose

This section proves that implementation follows the **approved constitutional model**, not current production behavior.

### 5.3 Known Gaps

Any remaining gap between production and approved CDR must be listed explicitly until closed by authorized implementation.

---

## 6. Engineering discipline

### 6.1 Engineering Design shall NOT

- Modify **RC** records
- Modify **CDR** records
- Redefine approved constitutional decisions
- Use **production behavior** as constitutional authority
- Bypass constitutional traceability (CITM)

### 6.2 When an approved decision appears incorrect

Engineering **shall never** modify constitutional decisions directly.

Required workflow:

```
Investigation
    ↓
New CDR (Proposed)
    ↓
Governance Approval
    ↓
Update Slice Design (CITM + compliance)
```

### 6.3 Production behavior rule

Production behavior is **evidence** of current reality. It is **not** constitutional authority. When production conflicts with an Approved CDR, record the gap — do not treat production as the target.

---

## 7. Permanent engineering rules

| Rule | Statement |
|------|-----------|
| **Rule 1** | Every engineering item must appear in the **CITM**. |
| **Rule 2** | Every Slice must contain: **Objective · Design · Migration · Verification · Constitutional Compliance**. |
| **Rule 3** | No implementation without **Implementation Authorization**. |
| **Rule 4** | No engineering decision may contradict an **Approved CDR**. |
| **Rule 5** | Production behavior is **evidence**, not constitutional authority. |
| **Rule 6** | Constitutional changes require: Investigation → CDR → Approval → Updated Slice Design. |
| **Rule 7** | Historical constitutional records shall **never** be rewritten. |

---

## 8. Reference implementation — M2 Slice 3

**M2 Slice 3** shall be the **first** implementation slice fully complying with CES-001.

When filed, `M2-S3-Snapshot-Freeze-Design.md` becomes the **reference implementation** for all future slices (M3, M4, M5, …).

| Field | Value |
|-------|-------|
| **Slice** | M2-S3 |
| **Design status** | Authorized (CDR-001 Approved) |
| **CES-001 compliance** | **Required** for first slice design document |
| **Implementation** | Not authorized until separate Implementation Authorization |

---

## 9. Filing convention

| Kind | Pattern | Example |
|------|---------|---------|
| Engineering Standard | `CES-{nnn}-{title}.md` | CES-001 |
| Slice Design | `M{n}-S{k}-{title}.md` | M2-S3-Snapshot-Freeze-Design |
| Implementation Authorization | `M{n}-S{k}-Implementation-Authorization.md` | M2-S3-Implementation-Authorization |
| Slice Template | `templates/Slice-Design-Template.md` | — |

---

## 10. Indexing

When creating or approving a slice design:

1. Include full **CITM** table
2. Use [`templates/Slice-Design-Template.md`](templates/Slice-Design-Template.md)
3. Update [`implementation/README.md`](README.md)
4. Update active milestone and release indexes
5. Verify **Constitutional Compliance** section is complete before seeking Implementation Authorization

---

**Governance:** [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md) · **Template:** [`templates/Slice-Design-Template.md`](templates/Slice-Design-Template.md)
