# Implementation — Design, standards, and authorization

**Category:** `docs/implementation/`  
**Authority:** [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md) · [`CES-001-Engineering-Standard.md`](CES-001-Engineering-Standard.md)

This folder holds **Engineering Standards**, **Slice Design** records, **Implementation Authorization** records, and **templates**. It does **not** contain application source code or SQL migrations.

---

## Engineering standards

| Standard | Status | Record |
|----------|--------|--------|
| **CES-001** | **Approved** | [`CES-001-Engineering-Standard.md`](CES-001-Engineering-Standard.md) |

### CITM — Constitutional Implementation Traceability Matrix

**Abbreviation:** CITM  
**Full name:** Constitutional Implementation Traceability Matrix

Every engineering item (table, RPC, trigger, function, edge function, UI flow, migration, workflow, background job, scheduler, state machine) **must** appear in the CITM table within a Slice Design.

**Rule:** No CITM row → implementation **not authorized**.

Defined in: [`CES-001-Engineering-Standard.md` §2](CES-001-Engineering-Standard.md#2-constitutional-implementation-traceability-matrix-citm)

### Slice Design Template

| Template | Purpose |
|----------|---------|
| [`templates/Slice-Design-Template.md`](templates/Slice-Design-Template.md) | Required structure for **all** future slice designs |

Every slice **shall** contain: **Objective · Design · Migration · Verification · Constitutional Compliance**

---

## Implementation authority chain

```
RC → Recovery / Investigation → CDR → Slice Design (CES-001) → Implementation Authorization → Engineering → Verification → Release
```

- **Approved CDR** does not authorize code changes.
- **Approved Slice Design** does not authorize code changes.
- **Implementation Authorized** is required before application, schema, or production contract changes.

---

## Current status (M2)

| Slice | Design | Implementation | CES-001 |
|-------|--------|----------------|---------|
| **M2 Slice 3** | **Authorized** ([`CDR-001`](../cdr/CDR-001-Voting-Eligibility-Decision.md)) | **Not authorized** | **First CES-compliant slice** (reference for M3+) |

**M2 Slice 3** shall become the **first** implementation slice fully complying with CES-001. When filed, it becomes the **reference implementation** for all future slices.

Planned paths:

```
docs/implementation/M2-S3-Snapshot-Freeze-Design.md          (not yet created — must use CES-001 + template)
docs/implementation/M2-S3-Implementation-Authorization.md    (not yet created — required before code)
```

---

## Permanent engineering rules (summary)

| # | Rule |
|---|------|
| 1 | Every engineering item must appear in the **CITM** |
| 2 | Every Slice must contain: Objective · Design · Migration · Verification · Constitutional Compliance |
| 3 | No implementation without **Implementation Authorization** |
| 4 | No engineering decision may contradict an **Approved CDR** |
| 5 | Production behavior is **evidence**, not constitutional authority |
| 6 | Constitutional changes: Investigation → CDR → Approval → Updated Slice Design |
| 7 | Historical constitutional records shall **never** be rewritten |

Full rules: [`CES-001-Engineering-Standard.md` §7](CES-001-Engineering-Standard.md#7-permanent-engineering-rules)

---

## Related

| Artifact | Path |
|----------|------|
| Document governance | [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md) |
| Milestone M2 | [`milestones/M2-Meeting-Resolution-Authoring.md`](../milestones/M2-Meeting-Resolution-Authoring.md) |
| CDR-001 | [`cdr/CDR-001-Voting-Eligibility-Decision.md`](../cdr/CDR-001-Voting-Eligibility-Decision.md) |
| Known gaps | M2 § **Known Constitutional Implementation Gaps** |
