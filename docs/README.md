# ClearStrata Documentation Index

**Governance standard:** [`DOCUMENT-GOVERNANCE.md`](DOCUMENT-GOVERNANCE.md)

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
| **Eras** | [`eras/`](eras/) | Constitutional development phases |
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

## Engineering standards

| Standard | Purpose |
|----------|---------|
| [**CES-001**](implementation/CES-001-Engineering-Standard.md) | Permanent engineering standard — traceability, slice structure, discipline |
| [**CITM**](implementation/CES-001-Engineering-Standard.md#2-constitutional-implementation-traceability-matrix-citm) | Constitutional Implementation Traceability Matrix — required in every slice |
| [**Slice Design Template**](implementation/templates/Slice-Design-Template.md) | Standard structure for all future slice designs |

**Rule:** M2 Slice 3 shall be the first CES-001-compliant slice design (reference implementation for M3+).

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
