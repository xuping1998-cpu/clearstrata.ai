# {Identifier} — {Title}

| Field | Value |
|-------|-------|
| **Identifier** | {e.g. M2-S3} |
| **Title** | {Slice title} |
| **Type** | Slice Design |
| **Status** | Draft / Proposed / Approved |
| **Authority** | {Approving authority} |
| **Parent** | {RC · CDR · prior slice} |
| **Milestone** | {e.g. M2} |
| **Release** | {e.g. FR2} |
| **Implementation authority** | None until separate Implementation Authorization |
| **Production effect** | None until separately authorized implementation |
| **Engineering standard** | [CES-001](../CES-001-Engineering-Standard.md) |

> Copy this template for every new slice. Delete instructional comments before submission.

---

## 1. Objective

### Purpose

{Why this slice exists — one paragraph}

### Scope

{What is included}

### Out of Scope

{Explicit exclusions}

### Dependencies

| Dependency | Status | Record |
|------------|--------|--------|
| {e.g. CDR-001} | Approved | {link} |
| {e.g. RC010-B recovery} | Completed | {link} |

### Success Criteria

- [ ] {Measurable outcome 1}
- [ ] {Measurable outcome 2}

### Acceptance Goal

{Milestone/release gate this slice satisfies}

---

## 2. Design

### Architecture

{Layer boundaries, components, data flow diagram or description}

### Workflow

{End-to-end process — authoring → freeze → voting, etc.}

### State Machine

| State | Entry | Exit | Guards |
|-------|-------|------|--------|
| {state} | {trigger} | {trigger} | {conditions} |

### Data Model

| Table / Entity | Change | Purpose |
|----------------|--------|---------|
| {name} | New / Alter / Unchanged | {role} |

### RPC

| RPC | Change | Behavior summary |
|-----|--------|------------------|
| {name} | New / Alter / Unchanged | {summary} |

### API

{Endpoints, contracts, error codes — if applicable}

### UI Flow

{Screens, guards, council vs owner paths}

### Security

{SECURITY DEFINER, RLS, input validation}

### Audit

{Logging fields, audit trail requirements}

### Error Handling

{Failure modes, user messaging, recovery}

### Performance

{Indexing, batching, expected load}

---

## 3. Migration

### Current Production Behavior

{Facts from recovery/investigation — not constitutional target}

### Target Behavior

{Aligned with Approved CDR}

### Compatibility Strategy

{Backward compatibility, feature flags, phased rollout}

### Migration Sequence

1. {Step 1 — e.g. schema}
2. {Step 2 — e.g. RPC}
3. {Step 3 — e.g. UI}

### Deployment Plan

{Environment order, verification gates}

### Rollback Strategy

{How to revert safely}

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| {risk} | Low/Med/High | Low/Med/High | {mitigation} |

---

## 4. Verification

### Unit Tests

| Test | Covers |
|------|--------|
| {test} | {scope} |

### Integration Tests

| Test | Covers |
|------|--------|
| {test} | {scope} |

### Manual Verification

- [ ] {Step}

### SQL Validation

```sql
-- Example validation query
```

### UI Validation

- [ ] {User journey step}

### Regression Checklist

- [ ] {Existing flow that must not break}

### Acceptance Checklist

- [ ] {Milestone criterion}

### Evidence

{Links to test output, query results, screenshots — filled after implementation}

---

## 5. Constitutional Compliance

### CITM — Constitutional Implementation Traceability Matrix

**Required.** Every engineering item in this slice must have a row. No row = not authorized.

| Engineering Item | RC Source | CDR Source | Production Reality | Constitutional Target | Gap | Slice |
|------------------|-----------|------------|--------------------|-----------------------|-----|-------|
| {item} | {RC ref} | {CDR ref} | {current behavior} | {approved target} | {gap or —} | {slice id} |

### Compliance Table

| Constitutional Source | Compliance | Evidence |
|-----------------------|------------|----------|
| RC010-A | Pending / Complete | {description} |
| RC010-B | Pending / Complete | {description} |
| RC010-C | Pending / Complete | {description} |
| CDR-001 | Pending / Complete | {description} |
| {additional RC/CDR} | Pending / Complete | {description} |

### RC Verification

{How this slice satisfies each applicable RC requirement}

### CDR Verification

{How this slice satisfies each applicable CDR decision point}

### Known Gaps

| Gap | Status | Closes when |
|-----|--------|-------------|
| {gap description} | Open / Closed | {implementation step} |

---

**Standard:** [CES-001](../CES-001-Engineering-Standard.md) · **Governance:** [DOCUMENT-GOVERNANCE.md](../../DOCUMENT-GOVERNANCE.md)
