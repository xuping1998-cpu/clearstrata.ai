# RC-001 — Design Freeze

## Project One Release Candidate · Foundation Layer

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | RC-001 |
| **Document Title** | Design Freeze |
| **Document Type** | Release Candidate Record (RC) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [CDS-001](../design-system/CDS-001_ClearStrata_Design_System.md), [GP-005](../Principles/GP-005_Shared_Governance_Space.md), [GP-006](../Principles/GP-006_Governance_Experience.md) |
| **Effective Date** | 2026-07-13 |
| **Classification** | Project One RC — Foundation |
| **Owner** | ClearStrata Project One |
| **Related Documents** | RC-002, RC-003, CDS-001, UIP-011, UIP-012, UIP-013, GPA-001, GRFC-001 |
| **Repository Location** | `docs/projects/RC-001_Design_Freeze.md` |

---

## Purpose

Establish a **Design Freeze** for Project One Release Candidate work. This pass improves visual and interaction consistency **without** redefining governance architecture, workflows, or data authority.

This is the **first code adoption phase** of [CDS-001](../design-system/CDS-001_ClearStrata_Design_System.md).

---

## Allowed During RC (no GRFC required)

- Shared UI primitives (`Button`, lifecycle presentation utilities)
- Design tokens and spacing/typography consistency
- Accessibility: focus-visible, disabled, loading, aria labels
- Empty/error-state visual corrections
- Replacement of duplicated inline button/badge styles
- Visual hierarchy improvements on approved governance surfaces

---

## Not Allowed Without GRFC Approval

- New major pages or navigation models
- New governance workflows or lifecycle stages
- New database tables, API contracts, RLS, or permission models
- New AI authority or architectural layers
- Global application rewrites outside the pilot scope

---

## Pilot Scope (this pass)

| Surface | Route |
|---------|-------|
| Home Governance Hub card | `/` |
| Governance Hub | `/community-deliberation` |
| Matter detail timeline | `/community-deliberation/:matterId` |
| Council Cockpit | `/council/workspace` |

**Out of scope:** Finance, Procurement, Meetings, Voting (standalone), Owner Information, Property Settings, Authentication, email templates.

---

## Repository Rule

Project One RC work must improve consistency and stability **without redefining** the approved governance architecture (GPA-001, GPA-002, GDS-001, GRFC-001).

---

## Permanent Principle

A design system becomes real only when shared standards begin replacing repeated decisions.

设计系统真正开始生效，不是因为写完了一份文档，而是因为共享标准开始取代重复、零散的设计决定。

---

**END OF RC-001**
