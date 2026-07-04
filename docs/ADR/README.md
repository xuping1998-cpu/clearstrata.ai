# Architecture Decision Records (ADR)

**Authority:** Subordinate to [`00_ClearStrata_Constitution.md`](../00_ClearStrata_Constitution.md)

**Numbering:** Architecture Decision Records use the **AR** prefix per [CS-001 — Repository Document Numbering Standard](../Repository_Document_Numbering_Standard.md).

**Identity block:** Document headers shall follow [CS-002 — Document Identity Block Standard](../Document_Identity_Block_Standard.md).

**Layout:** Section order shall follow [CS-003 — Repository Document Layout Standard](../Repository_Document_Layout_Standard.md).

## Purpose

ADRs record **significant** technical and product-structure decisions so future teams understand **why** — preserving **Community Memory** (Article VII) for the codebase itself.

---

## When to Write an ADR

- New subsystem or cross-cutting pattern
- Database schema that affects governance traceability
- API contract that owners/staff rely on
- AI behavior that affects decisions
- Constitution amendment (Rule 6)
- Anything that would surprise a developer in two years

Minor bug fixes and cosmetic UI do not require ADRs.

---

## Required Format

Every ADR **must** open with:

```markdown
## Constitution Reference
- Article …
- Article …
```

Use [`0001-template.md`](0001-template.md) as the starting point.

Filename: `NNNN-short-title.md` (four-digit sequence, kebab-case title)

---

## Status Values

| Status | Meaning |
|--------|---------|
| Proposed | Under discussion |
| Accepted | In effect |
| Deprecated | Superseded — link to new ADR |
| Superseded by ADR-NNNN | Replaced |

---

## Process

```
Constitution Review (if feature-level)
        ↓
Draft ADR (Proposed)
        ↓
Discussion + PR reference
        ↓
Accepted → merge
        ↓
Archive in this folder permanently
```

Amending the Constitution requires an ADR plus the Rule 6 lifecycle.

---

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-template.md) | ADR template | Template |

*(Add rows as ADRs are accepted.)*

---

## Related

- [`../02_Governance_Model.md`](../02_Governance_Model.md)
- [`../templates/Constitution_Review_Template.md`](../templates/Constitution_Review_Template.md)
