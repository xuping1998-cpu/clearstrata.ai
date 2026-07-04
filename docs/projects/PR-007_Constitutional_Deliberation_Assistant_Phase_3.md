# PR-007 — Constitutional Deliberation Assistant (Phase 3)

## Project One · Project Record

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | PR-007 |
| **Document Title** | Constitutional Deliberation Assistant — Phase 3 |
| **Document Type** | Project Record (PR) |
| **Status** | COMPLETED |
| **Version** | 1.1 |
| **Authority** | [The ClearStrata Constitution](../00_ClearStrata_Constitution.md) (FD-001) |
| **Effective Date** | 2026-07-04 |
| **Classification** | Project Records |
| **Owner** | ClearStrata Project One |
| **Supersedes** | None |
| **Superseded By** | None |
| **Related Documents** | FD-001, GP-002, PR-003, PR-000, RM-001, RM-003, Article II, Article III, Article X, Rule 9 |
| **Repository Location** | `docs/projects/PR-007_Constitutional_Deliberation_Assistant_Phase_3.md` |

---

## Purpose

Phase 3 introduces the **Constitutional Deliberation Assistant (CDA)** — the first constitutional AI inside ClearStrata. CDA improves community deliberation without replacing discussion, Council, or voting.

**Core principle:** Artificial Intelligence assists governance. Artificial Intelligence never governs. People remain the only legitimate decision makers.

---

## Scope

**In scope:**

- Constitutional Basis on every Governance Matter
- CDA panel on matter detail page
- Structured AI analysis: consensus, viewpoints, risks, missing information, draft resolution
- Append-only CDA report storage
- AI transparency disclosure
- Council-triggered analysis refresh

**Out of scope:**

- Voting, approval, or rejection authority for AI
- Modifying owner comments or revision history
- Constitutional interpretation as binding authority
- Meeting / Voting module changes
- Community Memory automation

---

## CDA Responsibilities

| May | Shall Never |
|-----|-------------|
| Summarize discussions | Vote |
| Identify major viewpoints | Approve / reject |
| Detect emerging consensus | Override Council or owners |
| Highlight minority opinions | Modify comments |
| Identify missing information | Modify revision history |
| Detect potential risks | Delete Community Memory |
| Prepare draft resolution | Determine legitimacy |
| Suggest next governance step | Interpret the Constitution |
| Generate meeting / voting briefs (future) | Exercise constitutional authority |

---

## Implementation

### Database

Migration: `supabase/migrations/20261704130000_governance_matter_cda.sql`

- `governance_matter_cda_reports` — append-only AI artifacts

### Edge function

`supabase/functions/constitutional-deliberation-assistant/index.ts`

- Council-only generation
- Loads matter + visible comments server-side
- OpenAI structured JSON output
- Persists immutable report via service role

### Application

| Path | Role |
|------|------|
| `src/lib/community/constitutionalBasis.ts` | Category → constitutional principles |
| `src/lib/community/cdaReportModel.ts` | CDA report types |
| `src/features/governance-matters/governanceMatterCdaApi.ts` | Fetch / request analysis |
| `src/components/community-deliberation/ConstitutionalDeliberationAssistantPanel.tsx` | Matter page panel |
| `src/pages/community-deliberation/GovernanceMatterPages.tsx` | Panel integration |

---

## Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Constitutional Basis displayed | ✓ |
| CDA panel visible | ✓ |
| Consensus summary | ✓ |
| Minority opinions | ✓ |
| Risk detection | ✓ |
| Missing information | ✓ |
| Draft Resolution generation | ✓ |
| AI disclosure | ✓ |
| No decision-making authority | ✓ |
| No editing owner comments | ✓ |

---

## Constitutional Principle

Legitimacy always precedes Intelligence. The Constitution governs AI. AI does not govern the Constitution.

---

## Milestone

| Field | Value |
|-------|-------|
| **Milestone** | **M-004** |
| **Project** | Project One |
| **Title** | Constitutional Deliberation Assistant (Phase 3) |
| **Status** | **COMPLETED** |
| **Project Record** | PR-007 |
| **Git Tag** | `project-one-m-004` |

**Delivery:** Constitutional Basis on governance matters; CDA panel; append-only `governance_matter_cda_reports`; edge function `constitutional-deliberation-assistant`; AI disclosure per Article III and Article X.

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [FD-001 — The ClearStrata Constitution](../00_ClearStrata_Constitution.md) | Article III — AI Assists, People Decide; Article X — Legitimacy Before Intelligence |
| [GP-002 — Community Deliberation](../Community_Deliberation.md) | Module specification — AI role |
| [PR-003 — Phase 2](PR-003_Community_Deliberation_Phase_2.md) | Governance Matter engine |
| [PR-000 — Project Zero Chronicle](../99_Project_Zero_Chronicle.md) | Foundation — *The First Constitutional Intelligence* |
| [RM-001 — Document Registry](../Repository_Management_Document_Registry.md) | Numbering authority |
| [RM-003 — Releases Registry](../Registry/Releases_Registry.md) | M-004 milestone record |

---

## Revision History

| Version | Date | Summary | Author |
|---------|------|---------|--------|
| 1.0 | 2026-07-04 | Phase 3 CDA — model, edge function, panel, API | ClearStrata Project One |
| 1.1 | 2026-07-04 | **Milestone M-004** COMPLETED — registry, commit, tag | ClearStrata Project One |

---

## Closing Statement

Phase 3 does not make ClearStrata more intelligent. Phase 3 makes community governance more understandable, more transparent, and more inclusive. Artificial Intelligence becomes a constitutional assistant, never a constitutional authority.

---

**END OF PR-007**

| | |
|---|---|
| **Status** | COMPLETED |
| **Document Number** | PR-007 |
| **Classification** | Project Record |
| **Authority** | The ClearStrata Constitution (FD-001) |
| **Effective Date** | 2026-07-04 |
| **Milestone** | M-004 COMPLETED — `project-one-m-004` |
