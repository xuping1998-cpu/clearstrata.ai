# ClearStrata Governance Documentation Pyramid (CGDP)

| Field | Value |
|-------|-------|
| **Title** | ClearStrata Governance Documentation Pyramid (CGDP) |
| **Version** | 1.0 |
| **Status** | Official |
| **Authority** | Founding Constitution (FD) — [`docs/founding/FD-Founding-Constitution.md`](../founding/FD-Founding-Constitution.md) · RC000 Appendix B |
| **Constitutional status** | RC000 Appendix B |

---

## Purpose

The **ClearStrata Governance Documentation Pyramid (CGDP)** defines the **permanent knowledge architecture** of the ClearStrata Platform.

Every document, governance decision, architectural decision, requirement, milestone, and implementation **belongs to one layer** of this pyramid.

The pyramid guarantees that every decision remains:

- **Traceable**
- **Explainable**
- **Constitutionally consistent**
- **Historically auditable**

---

## LEVEL 0 — Founding Constitution (FD)

**Question answered:** Why does ClearStrata exist?

**Authority:** **Highest constitutional authority** in the ClearStrata documentation hierarchy.

**Contains:** Vision · Mission · Founding Philosophy · Long-term Purpose · System Vision · Founding Principles

**Official reference:** [`docs/founding/FD-Founding-Constitution.md`](../founding/FD-Founding-Constitution.md)

**Historical reference:** [`docs/00_ClearStrata_Constitution.md`](../00_ClearStrata_Constitution.md) (FD-001 — Founding Documents Registry)

This layer changes only by **extraordinary constitutional amendment**.

RC000 **derives from** FD. FD defines **WHY**. RC000 defines **HOW**.

The Founding Constitution **begins** with the permanent **North Star** and **concludes** with the **Constitutional Closing**.

These define the enduring **purpose** and **values** of the ClearStrata Platform.

**North Star reference:** [`docs/founding/NORTH-STAR.md`](../founding/NORTH-STAR.md)

---

## LEVEL 1 — Platform Constitution (RC000)

**Question answered:** How should the platform evolve?

**Authority:** Derives from **LEVEL 0 (FD)**. Governs every layer below RC000.

**Contains:** Community Governance Operating System · CDGL · Core Values · Governance Principles · Constitutional Rules

**Reference:** [`docs/rc/RC000-clearstrata-constitution.md`](../rc/RC000-clearstrata-constitution.md)

---

## LEVEL 2 — Governance Decision Records (GDR)

**Question answered:** What governance policies has the platform adopted?

**Examples**

- Owners always retain voting rights.
- Council members are owners first.
- Every approved Resolution remains publicly visible.

**Governance policies. Not architecture.**

---

## LEVEL 3 — Architecture Decision Records (ADR)

**Question answered:** How should the platform be architected?

**Examples**

- Meeting owns Formal Resolution.
- Snapshot Freeze is the legal immutability boundary.
- Owner Voting consumes frozen Meeting Resolutions.

**Architecture only. No implementation.**

---

## LEVEL 4 — Requirement Changes (RC)

**Question answered:** What functionality changes?

**Examples:** RC009 · RC010 · RC011 · RC012 · RC013

Requirements **implement ADR**.

Requirements **never redefine architecture**.

---

## LEVEL 5 — Milestones (M)

**Question answered:** What has officially been completed?

**Examples:** M1 · M1.5 · M2 · M3

Milestones **permanently record** architectural evolution.

**Baseline Locked** milestones become **official references**.

**Reference:** RC000 Appendix A (MGS) — [`Milestone-Governance-Standard.md`](Milestone-Governance-Standard.md)

---

## LEVEL 6 — Implementation

**Question answered:** How is the platform implemented?

**Contains:** Frontend · Backend · Database · API · Edge Functions · Cursor Rules · Tests · Deployments

**Implementation always follows the upper layers. Never the reverse.**

---

## Governance Flow

```
Founding Constitution (FD)     ← WHY (highest authority)
        ↓
RC000 Constitution             ← HOW
        ↓
Governance Decisions (GDR)
        ↓
Architecture Decisions (ADR)
        ↓
Requirement Changes (RC)
        ↓
Milestones (M)
        ↓
Implementation
```

---

## Constitutional Dependency Rule

Every lower layer **depends upon** the layer above.

| Layer | Cannot redefine |
|-------|-----------------|
| Implementation | Milestones |
| Milestones | Requirements |
| Requirements | Architecture |
| Architecture | Governance Decisions |
| Governance Decisions | RC000 |
| RC000 | Founding Constitution |

---

## Evolution Rule

The pyramid **grows downward**.

Knowledge is **added**.

History is **never erased**.

Architectural evolution occurs through **new constitutional records**, not by rewriting history.

---

## AI Governance Rule

Every AI agent participating in ClearStrata development **must reason from the top of the pyramid downward**.

**Required order**

```
FD
  ↓
RC000
  ↓
GDR
  ↓
ADR
  ↓
RC
  ↓
Milestone
  ↓
Implementation
```

**No AI agent may skip a layer.**

---

## CGDP Rule 1 — Layer Scope

A document may define **only its own layer**.

It must **never redefine** a higher layer.

| Document | May | Must not |
|----------|-----|----------|
| RC | Implement ADR | Redefine ADR |
| ADR | Interpret GDR | Redefine GDR |
| GDR | Interpret RC000 | Redefine RC000 |
| RC000 | Follow FD | Contradict FD |

---

## CGDP Rule 2 — Traceability to RC000

Every architectural evolution must be **traceable back to RC000**.

---

## CGDP Rule 3 — Traceability to RC

Every implementation must be **traceable back to an RC**.

---

## CGDP Rule 4 — Milestone Recording

Every **completed RC** must be recorded by a **Milestone**.

---

## CGDP Rule 5 — Baseline Locked Milestones

**Baseline Locked** milestones become **permanent historical references**.

Future milestones **may extend** them but **never rewrite** them.

---

## Foundation Era

The **Foundation Era** consists of:

| Milestone | Title |
|-----------|-------|
| **M1** | Constitution Established |
| **M1.5** | Constitution Complete |

(See also [`M1.5-Governance-Knowledge-Architecture-Established.md`](../milestones/M1.5-Governance-Knowledge-Architecture-Established.md) for CGDP establishment.)

The Foundation Era establishes the **permanent constitutional framework** of the ClearStrata Platform.

**All future milestones** belong to the **Constitutional Implementation Era** (beginning with **M2**).

---

## Related methodology

- **CGE** — [`CGE-Constitutional-Governance-Engineering.md`](CGE-Constitutional-Governance-Engineering.md)
- **MGS** — RC000 Appendix A · [`Milestone-Governance-Standard.md`](Milestone-Governance-Standard.md)

---

## Final Principle

ClearStrata evolves through **constitutional governance**.

Every governance policy, every architecture decision, every requirement, every milestone, and every implementation strengthens the **Community Governance Operating System**.

**CGDP is the permanent knowledge architecture of the ClearStrata Platform.**
