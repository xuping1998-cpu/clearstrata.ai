# RC-009 — Governance Journey QA

## Project One Release Candidate · End-to-End Validation

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | RC-009 |
| **Document Title** | Governance Journey QA |
| **Document Type** | Release Candidate Record (RC) |
| **Status** | ACTIVE — **RELEASE GATE: FAIL** |
| **Version** | 1.0 |
| **Authority** | CDS-001, RC-001 … RC-008, GP-005, GP-006, GPA-001, GPA-002, GDS-001 |
| **Effective Date** | 2026-07-14 |
| **Classification** | Project One RC — Final QA |
| **Owner** | ClearStrata Project One |
| **Related Documents** | UIP-011, UIP-012, UIP-013, BF-001, BF-002, GRFC-001 |
| **Repository Location** | `docs/projects/RC-009_Governance_Journey_QA.md` |

---

## QA environment

| Item | Value |
|------|-------|
| **Codebase audit** | Local workspace `G:\clearstrata202603\clearstrata开发软件\project` |
| **Target domain** | `clearstrataaiserena.vercel.app` (test business domain per domain-entry-flow-lock) |
| **Live journey execution** | **Not completed** — no QA test-property credentials or explicit approval to create `[RC-009 QA]` matter in this session |
| **Migrations required** | `20261704120000_governance_matters.sql`, `20261704130000_governance_matter_cda.sql`, `20261706120000_community_resolutions.sql`, `20261707120000_governance_matter_subscriptions.sql` |
| **Edge function** | `constitutional-deliberation-assistant` (CDA generation) |
| **Automated checks** | `npx tsc --noEmit` ✓ · `npm run build` ✓ · `npm run lint` — pre-existing repo-wide palette/rule failures outside Project One scope |

---

## Test property and accounts

| Role | Status |
|------|--------|
| Council test account | **Not provisioned in this session** |
| Owner test account | **Not provisioned in this session** |
| Manager / Admin / Lawyer / Auditor / Viewer | **Matrix derived from RLS + client guards (code audit)** |
| QA Matter `[RC-009 QA] Project One Governance Journey` | **Not created** — live J1–J12 blocked |

**Disposition:** Live journey QA requires Council + Owner sessions on an approved test property. Re-run J1–J20 after P1 fixes and credential provisioning.

---

## Journey execution summary

| Journey | Method | Result | Notes |
|---------|--------|--------|-------|
| **J1** Matter Creation | Code audit | **Partial pass** | `submitting` guard + Button `loading`; RLS council-only insert; `PermissionState` for non-council |
| **J2** Owner Visibility | Code audit | **Partial pass** | Hub/detail tenant SELECT; council edit UI gated by `isCouncilGovernanceRole` |
| **J3** Owner Comment | Code audit | **Partial pass** | Immutable trigger; `commentSubmitting` guard; no UI moderation |
| **J4** Follow | Code audit | **Partial pass** | UNIQUE subscription; independent loaders (BF-002) |
| **J5** Council Revision | Code audit | **Partial pass** | Append-only revisions via DB trigger; `revisionSubmitting` |
| **J6** Stage Transition | Code audit | **Partial pass** | Single `updateGovernanceMatter` source; manual council status updates |
| **J7** CDA | Code audit | **Partial pass** | Edge fn + append-only reports; `cdaGenerating`; advisory disclosure in UI |
| **J8** Resolution | Code audit | **Partial pass** | `createCommunityResolutionFromMatter`; sets `resolution_draft` |
| **J9** Meeting Integration | Code audit | **FAIL (P1)** | Prefill navigates correctly; **no caller** for `updateCommunityResolution({ meetingId })` or agenda resolution link on save |
| **J10** Voting Integration | Code audit | **FAIL (P1)** | Cockpit navigates to `#owner-voting`; **`linkOwnerVoteResolutionToCommunityResolution` unused** — matter `voting_id` / status not updated from governance flow |
| **J11** Archive | Code audit | **Partial pass** | `DestructiveConfirmDialog`; `archiveSubmitting`; sets `archived` + `archived_at` |
| **J12** Timeline | Code audit | **Partial pass** | Client projection from revisions/CDA/resolutions/comments; gaps for vote outcomes, auto meeting events |
| **J13** Intelligence | Code audit | **Pass** | Deterministic `governanceIntelligence.ts`; one NBA per matter; no false legal authority |
| **J14** RC-004–008 | Code audit | **Partial pass** | State/interaction/a11y/motion primitives wired on pilot; live keyboard/mobile/reduced-motion not exercised |
| **J15** Error injection | Not run | **Deferred** | Requires live session |
| **J16** Concurrency | Code audit | **Partial pass** | UI guards present; BF-002 hub isolation; CDA/resolution lack DB idempotency |
| **J17** Permission matrix | Code audit | **Complete** | See below |
| **J18** Bilingual | Code audit | **Partial pass** | Cockpit/feedback/tabs bilingual; live truncation not verified |
| **J19** Mobile | Code audit | **Partial pass** | Responsive cockpit/hub layout; live 200% zoom not verified |
| **J20** SSGT | Code audit | **Partial pass** | Single tables per entity; projection-only timeline; integration gaps break projection sync |

---

## Role / permission matrix

Legend: **V** visible · **E** enabled (client) · **B** backend permitted (RLS/RPC) · **T** timeline event · **Pub** public to owners

| Action | Owner | Council | Manager | Prop Admin | Admin | Lawyer/Auditor/Viewer* |
|--------|-------|---------|---------|------------|-------|-------------------------|
| Create Matter | — | V/E/B | — | V/E/B | V/E/B | — |
| View Matter | V/B | V/B | V/B | V/B | V/B | V/B† |
| Comment | V/E/B | V/E/B | V/E/B | V/E/B | V/E/B | —‡ |
| Follow | V/E/B | V/E/B | V/E/B | V/E/B | V/E/B | V/E/B† |
| Revise Matter | — | V/E/B | — | V/E/B | V/E/B | — |
| Generate CDA | — | V/E§ | — | V/E§ | V/E§ | — |
| Prepare Resolution | — | V/E/B | — | V/E/B | V/E/B | — |
| Schedule Meeting | — | V/E¶ | — | V/E¶ | V/E¶ | — |
| Open Voting | — | V/nav¶ | — | V/nav¶ | V/nav¶ | — |
| View Results | V§§ | V | V | V | V | V† |
| Archive | — | V/E/B | — | V/E/B | V/E/B | — |

\* Lawyer/Auditor/Viewer: active membership assumed; no special governance UI paths found.  
† Tenant SELECT if `user_property_ids()` includes property.  
‡ RLS comment insert roles exclude lawyer/auditor/viewer unless role aliased to owner.  
§ Edge function council/admin/property_admin check.  
¶ Meeting/Voting engines enforce their own permissions; governance handoff incomplete (P1).  
§§ Via meeting detail / public resolution visibility rules.

---

## Authoritative data verification (J20)

| Entity | Authoritative table | UI projection | Finding |
|--------|---------------------|---------------|---------|
| Matter | `governance_matters` | Hub, Cockpit, Dashboard card | ✓ Single source |
| Comment | `governance_matter_comments` | Discussion tab, timeline | ✓ Immutable |
| Revision | `governance_matter_revisions` | History, timeline | ✓ Append-only trigger |
| CDA | `governance_matter_cda_reports` | CDA tab | ✓ Append-only; not status authority |
| Resolution | `community_resolutions` | Resolution tab/detail | ✓ Linked via `resolution_id` |
| Meeting | `meetings` + agenda | Meeting editor/detail | ⚠ Link-back not wired from governance save |
| Vote | `owner_vote_resolutions` | Meeting `#owner-voting` | ⚠ Governance `voting_id` not set from UI |
| Timeline | **Projection** (`governanceTimelineModel.ts`) | Timeline tab | ✓ Rebuildable; gaps when status not advanced |
| Notifications | delivery tables | — | Not governance truth |

**Parallel truth risk:** Cockpit intelligence may recommend “Schedule Meeting” / “Open Voting” while matter `status` remains `resolution_draft` after meeting exists — **P1 projection contradiction**.

---

## Timeline integrity (J12)

**Expected events (when journey completes):** matter_created → discussion → comment_posted → consultation → cda_generated → resolution_created → meeting_scheduled → voting_opened → result → archived.

**Gaps recorded (not fabricated):**

| Event | Status |
|-------|--------|
| Follow/subscribe | Not in timeline (by design) |
| Meeting scheduled (from Meeting save) | **Gap** — status may not advance without manual update |
| Voting opened/closed from Owner Vote engine | **Gap** — link API unused |
| Owner vote outcome | **Gap** — no read from ballot tables |
| Comment moderation | **Gap** — RPC exists, no UI |

---

## Governance Intelligence (J13)

**Implementation:** `src/lib/community/governanceIntelligence.ts` → `GovernanceCockpitPanel`, `WorkspacePipelineMatterCard`.

| Check | Result |
|-------|--------|
| NBA matches stage | ✓ Deterministic rules |
| Does not skip workflow | ✓ |
| No false legal authority | ✓ Advisory CDA styling (RC-003) |
| Owner cannot see cockpit | ✓ `/council/workspace` PermissionState |
| Empty queue honest | ✓ `governance.cockpitNoActions` empty state |

**Caveat:** Recommendations assume `meeting_id` / `voting_id` on matter — may mis-rank when integration gap leaves fields null.

---

## RC-004–008 cross-check (J14)

| Layer | Finding |
|-------|---------|
| **State** | `pageStateModel` + `LoadingState`/`EmptyState`/`PermissionState` on pilot routes |
| **Interaction** | Per-action loading flags; `useGovernanceFeedback`; archive confirm dialog |
| **Accessibility** | WAI-ARIA tabs; landmarks; queue `aria-label`; live-region toasts (RC-007) |
| **Motion** | Canonical `motionClasses` on pilot primitives (RC-008) |

**Regression fixed during RC-009:** `GovernanceCockpitPanel` missing empty-state imports (would ReferenceError on empty queue). `LoadingState` duplicate `cn` import removed.

---

## Issue log

### P0 — Release blockers

*None identified in code audit after cockpit empty-state fix.*

### P1 — Major

| ID | Issue | Route / area | Evidence |
|----|-------|--------------|----------|
| **RC009-P1-001** | Meeting save does not call `updateCommunityResolution({ meetingId })` or link agenda item — matter stays `resolution_draft`, cockpit/Timeline disagree | J9, Cockpit, Timeline | `updateCommunityResolution` only defined in `communityResolutionsApi.ts`; no callers; `MeetingEditor.tsx` consumes prefill only |
| **RC009-P1-002** | `linkOwnerVoteResolutionToCommunityResolution` never called — governance matter `voting_id` and `status: voting` not set from Project One handoff | J10, Cockpit | Grep: zero callers outside API file |
| **RC009-P1-003** | **Live end-to-end journey not executed** — cannot certify J1–J20 on staging with QA Matter | All routes | No test credentials / QA matter in session |

### P2 — Moderate

| ID | Issue | Notes |
|----|-------|-------|
| RC009-P2-001 | CDA generation not idempotent — each invoke appends report row | Append-only by design; council should confirm before re-run |
| RC009-P2-002 | No duplicate Resolution DB constraint — stale UI could double-create | UI hides button when `linkedResolution` loaded |
| RC009-P2-003 | Timeline missing vote outcome events | Requires voting engine projection |
| RC009-P2-004 | Comment moderation RPC has no UI | Manager/council capability unused |
| RC009-P2-005 | `OwnerParticipationPanel` TypeScript errors | `tsconfig.app.json` strict; build still passes via project references |

### P3 — Minor

| ID | Issue |
|----|-------|
| RC009-P3-001 | `GovernanceHubPanel` unused `Button` import |
| RC009-P3-002 | `CouncilWorkspacePage` prefill `initiation_type: 'council'` TS mismatch with `MeetingInitiationType` |
| RC009-P3-003 | UIP-006/UIP-007 still PLANNED — integration polish deferred |

---

## Fixes applied during RC-009

| Fix | Severity addressed | Files |
|-----|-------------------|-------|
| Add missing `getEmptyStateContent`, `TabEmptyState`, `stateText` imports to cockpit panel | P0/P1 white-screen risk on empty queue | `GovernanceCockpitPanel.tsx` |
| Remove duplicate `cn` import in LoadingState | Build hygiene | `LoadingState.tsx` |

---

## Retest results

| Item | Result |
|------|--------|
| Cockpit empty queue render | **Code fix applied** — live retest pending |
| `npx tsc --noEmit` | **Pass** (exit 0) |
| `npm run build` | **Pass** |
| Live J1–J20 | **Not run** |

---

## Deferred known issues

- P1-001, P1-002 — require GRFC or BF + Meeting editor integration (architecture touch)
- P1-003 — live QA session with provisioned accounts
- P2 moderation UI, timeline vote projection — post-v1.0 or RC-010 prep
- UIP-006/UIP-007 meeting/voting experience polish

---

## QA data disposition

No QA Matter created. No production rows altered. When live QA runs:

1. Create `[RC-009 QA] Project One Governance Journey` on approved test property only.
2. Archive after journey complete; do not delete revision/comment/CDA audit rows.
3. Document final matter UUID in this record.

---

## Automated verification

```
npx tsc --noEmit  → exit 0
npm run build     → exit 0 (Vite production build)
npm run lint      → exit 1 (pre-existing non–Project One palette violations)
```

No new test framework added. No focused regression tests added (no existing test runner).

---

## Final release-gate decision

**FAIL**

| Gate criterion | Status |
|----------------|--------|
| Full Council journey | ✗ Meeting/voting integration incomplete |
| Full Owner journey | ✗ Not live-tested |
| Matter reaches final historical state | ✗ Not live-tested |
| No P0 | ✓ |
| No P1 | ✗ Three P1 items |
| Timeline ↔ records agree | ✗ Projection gaps at meeting/voting |
| Role matrix confirmed | ✓ Code audit |
| zh/en, desktop/mobile, keyboard, reduced motion | ✗ Live matrix not run |
| TypeScript + build | ✓ |

**RC-010 cannot begin** until P1-001, P1-002 resolved and P1-003 live journey passes.

---

## Recommendation for RC-010

1. **BF or GRFC-scoped fix** for meeting save link-back (`updateCommunityResolution`, agenda `community_resolution_id`, matter `status: meeting`).
2. **Wire voting link** at appropriate Meeting/Voting milestone (`linkOwnerVoteResolutionToCommunityResolution`).
3. **Execute live QA** on test property with Council + Owner accounts; complete verification matrix.
4. **Retest timeline** after integration fixes.
5. **Register milestone** in Repository Hall only after release gate passes.

---

## Permanent Principle

一个治理功能，并不是页面能够运行就算完成。只有当：正确的人能够执行正确的操作，操作产生正确的权威记录，所有界面都讲述同一个事实，而完整历史始终可以追溯，这个功能才真正完成。

---

**END OF RC-009**
