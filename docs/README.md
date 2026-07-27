# ClearStrata Documentation Index

**Governance standard:** [`DOCUMENT-GOVERNANCE.md`](DOCUMENT-GOVERNANCE.md)

**Governance Framework Version 1.0:** [`GOVERNANCE-FREEZE-v1.0.md`](GOVERNANCE-FREEZE-v1.0.md) — **Approved and frozen** (2026-06-24). Current engineering work is focused on **implementation** under the approved framework, not continuous governance redesign.

**Engineering Implementation Era v1.0:** [`eras/Engineering-Implementation-Era-v1.0.md`](eras/Engineering-Implementation-Era-v1.0.md) — governance architecture complete; engineering implementation is the primary activity.

**Working with Cursor:** [`WORKING-WITH-CURSOR.md`](WORKING-WITH-CURSOR.md) — AI collaboration convention (not part of constitutional hierarchy).

**Repository structure map:** [`STRUCTURE.md`](STRUCTURE.md)

---

## Canonical hierarchy

| Category | Path | Purpose |
|----------|------|---------|
| **Constitution** | [`constitution/`](constitution/) | Founding + RC000 (index; historical paths preserved) |
| **RC** | [`rc/`](rc/) | Requirement constitution records |
| **Investigations** | [`investigations/`](investigations/) | Evidence and unknowns |
| **CDR** | [`cdr/`](cdr/) | Approved constitutional architecture decisions |
| **Implementation** | [`implementation/`](implementation/) | Slice design, CES-001, CITM, implementation authorization |
| **Milestones** | [`milestones/`](milestones/) | Bounded work and gates |
| **Releases** | [`releases/`](releases/) | Governance releases |
| **Eras** | [`eras/`](eras/) | Constitutional and engineering development phases |
| **Working convention** | [`WORKING-WITH-CURSOR.md`](WORKING-WITH-CURSOR.md) | AI collaboration — not constitutional hierarchy |
| **Architecture** | [`Architecture/`](Architecture/) | GPA, CGDP, CGE, GRFC, ADR |

---

## Authority order (summary)

```
Founding Constitution
    ↓
Approved RC
    ↓
Approved CDR
    ↓
Approved Milestone / Release contract
    ↓
Authorized Slice Design
    ↓
Implementation Authorization
    ↓
Production behavior (evidence only — does not override approved CDR)
```

Full rules: [`DOCUMENT-GOVERNANCE.md` §4](DOCUMENT-GOVERNANCE.md#4-authority-order)

---

## M2 active chain (FR2)

| Record | Status |
|--------|--------|
| RC010-A | **Approved** |
| RC010-B | **Completed** |
| RC010-C | **Completed** |
| **CDR-001** | **Approved** |
| M2 Slice 3 Design | **Authorized** |
| M2 Slice 3 Implementation | **Not authorized** |

**Constitutional decision:** [`cdr/CDR-001-Voting-Eligibility-Decision.md`](cdr/CDR-001-Voting-Eligibility-Decision.md)

**Known gap:** Production is **not fully compliant** with CDR-001 until authorized implementation — see M2 milestone record.

---

## Engineering Constitution

Permanent engineering standards series (**CES-001 … CES-010**). Index: [`implementation/README.md`](implementation/README.md#engineering-constitution).

```
Engineering Constitution
├── Core Standards
│   ├── CES-001 Engineering Standard          — Approved
│   ├── CES-002 Database Engineering Standard — Approved
│   └── CES-003 Frontend Engineering Standard — Approved
├── Platform Standards
│   ├── CES-004 API / RPC                     — Reserved
│   ├── CES-005 Security                      — Reserved
│   └── CES-006 AI                            — Reserved
├── Quality Standards
│   ├── CES-007 Audit & Compliance            — Reserved
│   ├── CES-008 Testing & Verification        — Reserved
│   └── CES-009 Deployment & Release          — Reserved
└── Governance Standards
    └── CES-010 Documentation & Knowledge     — Reserved
```

**Active standards:** [`CES-001`](implementation/CES-001-Engineering-Standard.md) · [`CES-002`](implementation/CES-002-Database-Engineering-Standard.md) · [`CES-003`](implementation/CES-003-Frontend-Engineering-Standard.md)

**CITM:** [`CES-001` §2](implementation/CES-001-Engineering-Standard.md#2-constitutional-implementation-traceability-matrix-citm) · **Slice template:** [`templates/Slice-Design-Template.md`](implementation/templates/Slice-Design-Template.md)

**Rule:** M2 Slice 3 shall be the first CES-001 + CES-002 + CES-003 compliant slice design (reference implementation for M3+).

**Next engineering document:** [`implementation/M2-S3-Snapshot-Freeze-Design.md`](implementation/M2-S3-Snapshot-Freeze-Design.md) (authorized — not yet created)

---

## Legacy paths (preserved)

| Area | Notes |
|------|-------|
| [`Founding/`](Founding/) | Baseline locked founding documents |
| [`projects/`](projects/) | Feature / UX project records (PR, RC-00x UX, BF, UIP) |
| [`Registry/`](Registry/) | Document registry |
| [`History/`](History/) | Milestone hall of record |
| [`ADR/`](ADR/) | Engineering ADRs |

Do not move historical documents without an approved migration plan.
