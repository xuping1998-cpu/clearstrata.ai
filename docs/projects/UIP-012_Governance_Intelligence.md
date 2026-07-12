# UIP-012 — Governance Intelligence

## UI Polish Record · Council Cockpit Intelligence Layer

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | UIP-012 |
| **Document Title** | Governance Intelligence |
| **Document Type** | UI Polish Record (UIP) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [GP-005](../Principles/GP-005_Shared_Governance_Space.md), [GP-006](../Principles/GP-006_Governance_Experience.md), [UIP-011](UIP-011_Governance_Cockpit.md) |
| **Effective Date** | 2026-07-12 |
| **Classification** | UI Polish |
| **Owner** | ClearStrata Project One |
| **Related Documents** | UIP-011, GP-005, GP-006 |
| **Repository Location** | `docs/projects/UIP-012_Governance_Intelligence.md` |

---

## Objective

Evolve `/council/workspace` from displaying governance data to **actively guiding governance work** — a deterministic Governance Assistant.

**Constraints:** No database migration, no new tables, no AI/LLM, no Edge Functions. All intelligence derived from existing `governance_matters` fields and loaded CDA flags.

**Scope:** Council workspace only (GI-010). Owners unchanged.

---

## Implementation Index

| ID | Feature | Implementation |
|----|---------|----------------|
| **GI-001** | Today's Governance Brief | `buildTodaysGovernanceBrief()` — cockpit panel top section |
| **GI-002** | Priority Engine | `PRIORITY_TIER` + sort by tier then `created_at` (oldest first) |
| **GI-003** | Next Best Action | `inferNextBestAction()` — one action per matter |
| **GI-004** | Governance Readiness | `computeMatterReadiness()` — pipeline cards |
| **GI-005** | Attention Signals | `detectAttentionSignals()` — subtle amber badges |
| **GI-006** | Bottleneck Detection | `detectBottleneck()` — stagnation days + recommendation |
| **GI-007** | Governance Health | `computeGovernanceHealth()` — property summary badge |
| **GI-008** | Constitution Awareness | `constitutionBasisForAction()` — "Why?" on queue items |
| **GI-009** | Action Queue | Upgraded ordering via GI-002; existing panel enhanced |
| **GI-010** | Owner Safety | Intelligence only on `/council/workspace` |

---

## Priority Algorithm (GI-002)

| Tier | Condition |
|------|-----------|
| 1 | Voting closing within 24h (`discussion_deadline` ≤ 1 day, meeting/voting stage) |
| 2 | Meeting waiting (`resolution_id` + no `meeting_id`, or open voting pending) |
| 3 | Resolution ready (`resolution_draft`, `council_review`) |
| 4 | Consultation completed (`public_consultation` + comments) |
| 5 | Discussion overdue (>14 days or past `discussion_deadline`) |
| 6 | New discussion / consultation without completion signals |
| 7 | Publish result (`decision`, `execution`) |

Within tier: **oldest `created_at` first**.

---

## Next Best Action (GI-003)

| Stage | Single recommended action |
|-------|---------------------------|
| Discussion | Generate CDA (if no report) → else Review discussion |
| Consultation | Prepare Resolution |
| Resolution draft/review | Prepare Resolution |
| Resolution + no meeting | Schedule Meeting |
| Meeting + no voting | Open Voting |
| Decision / Execution | Publish Result (archive) |
| Archived | None |

---

## Readiness Rules (GI-004)

| Stage | Display |
|-------|---------|
| Discussion | 25–90% (comments, CDA, deadline) |
| Consultation | 75% or 100% (with comments) |
| Resolution | Ready |
| Meeting | Waiting |
| Voting | In Progress |
| Execution / Archive | Complete |

---

## Health Scoring (GI-007)

Start at 100. Subtract:

- Stalled matter: −12 each (discussion/consultation ≥14d inactive, resolution ≥21d, meeting without voting ≥14d)
- Overdue deadline: −15 each (`discussion_deadline` passed)
- Meeting backlog: −8 each (`resolution_id` without `meeting_id`)

| Score | Level |
|-------|-------|
| ≥ 85, no major stalls | Excellent |
| ≥ 65 | Good |
| ≥ 40 | Needs Attention |
| < 40 or ≥3 overdue | At Risk |

---

## Files

| File | Role |
|------|------|
| `src/lib/community/governanceIntelligence.ts` | Intelligence engine |
| `src/lib/community/governanceCockpitPriority.ts` | Re-exports + pipeline filters |
| `src/components/community-deliberation/GovernanceCockpitPanel.tsx` | Brief + health + Why? |
| `src/components/community-deliberation/WorkspacePipelineMatterCard.tsx` | Readiness + attention + NBA |
| `src/pages/council/CouncilWorkspacePage.tsx` | Bundle wiring |

---

## Verification

- `npx tsc --noEmit` — pass
- `npm run build` — pass
- Route: `/council/workspace` (council role)

---

**END OF UIP-012**
