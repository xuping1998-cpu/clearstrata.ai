# BF-002 — Independent Governance Hub Data Loading

## Bug Fix Record

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | BF-002 |
| **Document Title** | Independent Governance Hub Data Loading |
| **Document Type** | Bug Fix Record (BF) |
| **Status** | COMPLETED |
| **Version** | 1.0 |
| **Authority** | GP-005, GP-006, UIP-008 |
| **Effective Date** | 2026-07-11 |
| **Classification** | Production Bug Fix |
| **Owner** | ClearStrata Project One |
| **Related Documents** | GP-005, GP-006, UIP-008, `20261707120000_governance_matter_subscriptions.sql` |
| **Repository Location** | `docs/projects/BF-002_Independent_Governance_Hub_Data_Loading.md` |

---

## Problem

`GovernanceMattersHubPage` loaded subscription IDs and commented-matter IDs in one `Promise.all()`. If `fetchSubscribedGovernanceMatterIds` failed (e.g. missing `governance_matter_subscriptions` table), the shared `catch` cleared:

- `subscribedMatterIds`
- `commentedMatterIds`
- `followingCount`
- `commentedMatterCount`

**My Comments** (`view=comments`) appeared empty even when the comment query would succeed.

Additional defects:

- Empty state rendered before comment/subscription loads finished.
- Personal filtered views intersected comment IDs with `allMatters` capped at **100** rows — matters outside the window disappeared while badge count remained > 0.
- Draft matters with comments were skipped by lifecycle partitioning (false empty feed).

---

## Root cause

**Primary:** Cross-feature failure propagation via shared `Promise.all` + single `catch`.

**Secondary:** Premature empty-state UI (no loading gate on filtered views).

**Tertiary:** Client-side intersection with top-100 matter list.

---

## Fix design

### Independent loading (Part A)

Separate async loaders for subscriptions and comments. Each has its own try/catch, error state, and logging:

- `[GOVERNANCE HUB] subscriptions load failed`
- `[GOVERNANCE HUB] commented matters load failed`

Failure in one does not clear successful data from the other.

### Scoped loading states (Part B)

- `subscriptionsLoading` / `commentsLoading`
- `subscriptionsError` / `commentsError`
- `commentsCountState` / `followingCountState` on participation panel

### Empty / loading / error timing (Part C)

Filtered views show spinner while IDs or matter rows load. Empty copy only after successful load with zero IDs. Errors show honest retry UI — not empty-state copy.

### Refetch preservation (Part D)

On retry (`participationRetryToken`), previous counts/IDs are retained until a successful response replaces them. On **property switch**, IDs are cleared before new loads (stale-guard ref).

### Property safety (Part E)

`requestedPropertyId` captured before async work; state updates skipped if property context changed (`cancelled` flag + ID comparison).

### Count semantics (Part F)

**My Comments** badge = distinct governance matters with ≥1 visible comment by current user (matches `view=comments`).

### Top-100 fix (Part G)

`fetchGovernanceMattersByIds(propertyId, matterIds)` loads matter rows for personal filtered views directly — no intersection with the 100-row hub list.

### Draft matters (Part H)

`GovernanceLifecycleFeed` with `personalFilterView` renders a **Draft** section for draft matters in personal views.

---

## Subscription table deployment

Migration file: `supabase/migrations/20261707120000_governance_matter_subscriptions.sql`

**Deploy:** `npx supabase db push` (or equivalent for linked project).

After BF-002, **My Comments does not depend** on this table. Missing table only affects Following/subscription features (isolated error).

---

## Files changed

| File | Change |
|------|--------|
| `src/pages/community-deliberation/GovernanceMatterPages.tsx` | Independent loaders, filter UI states, property guard |
| `src/features/governance-matters/governanceMattersApi.ts` | `fetchGovernanceMattersByIds` |
| `src/components/community-deliberation/OwnerParticipationPanel.tsx` | Loading/error count states |
| `src/components/community-deliberation/GovernanceLifecycleFeed.tsx` | `personalFilterView` + draft section |

---

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| `npm run build` | Pass |

### Manual scenarios

| Scenario | Expected after BF-002 |
|----------|----------------------|
| Subscription fetch fails | My Comments still loads; Following shows isolated error |
| Comment fetch fails | Following still loads; view=comments shows error + retry |
| Commented matter outside top 100 | Appears in view=comments |
| Property switch | No stale cross-property IDs |
| Missing subscription table | Subscription error only |

---

## Engineering principle

Independent features must fail independently. One optional capability must never erase another capability that is working correctly.

---

**END OF BF-002**
