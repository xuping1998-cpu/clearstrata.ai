# CDS-001 — ClearStrata Design System

## Long-Term Design Standard · Platform-Wide Visual & Interaction Constitution

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | CDS-001 |
| **Document Title** | ClearStrata Design System |
| **Document Type** | Design Standard (CDS) |
| **Classification** | Long-Term Design Standard |
| **Status** | FOUNDATION |
| **Version** | 1.0 |
| **Authority** | [FD-001 — The ClearStrata Constitution](../00_ClearStrata_Constitution.md), [GP-005](../Principles/GP-005_Shared_Governance_Space.md), [GP-006](../Principles/GP-006_Governance_Experience.md), [GPA-001](../Architecture/GPA-001_Governance_Pyramid_Architecture.md), [GPA-002](../Architecture/GPA-002_Single_Source_of_Governance_Truth.md), [GDS-001](../Architecture/GDS-001_Governance_Data_Standard.md), [GRFC-001](../Architecture/GRFC-001_Governance_Request_for_Change.md) |
| **Effective Date** | 2026-07-13 |
| **Owner** | ClearStrata Platform |
| **Supersedes** | None |
| **Superseded By** | None |
| **Related Documents** | FD-001, GP-005, GP-006, GPA-001, GPA-002, GDS-001, GRFC-001, RM-008, RC-001, RC-002, RC-003, RC-004, RC-005, RC-006, RC-007, RC-008, RC-009, UIP-001 … UIP-013, BF-001, BF-002 |
| **Repository Location** | `docs/design-system/CDS-001_ClearStrata_Design_System.md` |

---

## Purpose

ClearStrata Design System (CDS) defines the long-term **visual**, **interaction**, **language**, **accessibility**, and **component** standards for the entire ClearStrata platform.

CDS is **not** limited to Project One. It governs all future products and modules, including Governance, Finance, Procurement, Meetings, Voting, Owner Information, Property Management, Legal, Audit, AI, and Mobile.

Every screen should **reduce complexity**, make **responsibility clear**, and preserve **trust**.

---

## 1. Design Mission

ClearStrata exists to make governance, finance, responsibility, and community participation **easier to understand**.

The interface must **not** add complexity to already complex governance.

**Permanent Design Mission:** Every screen should reduce governance complexity.

**中文版：** 每一个界面，都应当降低治理复杂度。

---

## 2. Core Design Principles

| # | Principle | Requirement |
|---|-----------|-------------|
| 1 | **Transparency** | Important information visible, traceable, understandable |
| 2 | **Clarity** | User immediately understands what is happening, why it matters, what comes next, what to do |
| 3 | **Consistency** | Same status, action, and concept look and behave the same everywhere |
| 4 | **Professionalism** | Reliable, calm, precise — suitable for legal, financial, governance work |
| 5 | **Efficiency** | Complete important work without unnecessary navigation or repeated input |
| 6 | **Human Dignity** | Technology supports people; does not overwhelm or manipulate |
| 7 | **AI Accountability** | AI identifiable, explainable, reviewable, subordinate to human decision-making |

---

## 3. Design Tokens — Color

Canonical token names (official standard; code migration incremental per §26).

| Token | Canonical role | Current implementation (Project One) |
|-------|----------------|--------------------------------------|
| **Primary** | Primary actions, focus | `clearstrata.ui.primary` → `#22a06b` |
| **Primary Hover** | Hover on primary | `clearstrata.ui.primaryHover` → `#1b8a5c` |
| **Primary Active** | Pressed primary | `clearstrata.ui.primaryActive` → `#176f4c` |
| **Primary Soft** | Soft surfaces | `clearstrata.ui.soft` → `#eefbf5` |
| **Success** | Positive completion | `clearstrata.state.success.*` |
| **Warning** | Attention, consultation | `clearstrata.state.warning.*` |
| **Danger** | Destructive, legal failure | `clearstrata.state.danger.*` |
| **Information** | Neutral guidance | Use `state.neutral` or indigo advisory (CDA) |
| **Neutral** | Draft, archived, metadata | `clearstrata.state.neutral.*`, gray scale |
| **Surface** | Page/card background | `white`, `gray-50` |
| **Border** | Structure | `gray-100`–`gray-200`, `clearstrata.ui.softBorder` |
| **Text Primary** | Headings, primary labels | `gray-900`, `clearstrata-brand-900` |
| **Text Secondary** | Supporting labels | `gray-700` |
| **Text Muted** | Metadata, captions | `gray-500`–`gray-600` |
| **Focus Ring** | Keyboard focus | `focus:ring-clearstrata-ui-primary/40` |

### Brand email color (lake blue)

| Token | Value | Use |
|-------|-------|-----|
| **Brand Email** | `#35C3D6` | Official ClearStrata lake-blue for **email** header, CTA, fallback links |

**Rule:** Lake blue is the email brand identity. In-app primary actions remain **green** (`#22a06b`) where semantically appropriate for governance actions. Do not require every interface action to use lake blue.

*Source:* `supabase/functions/send-*`, `api/ensure-and-send-sgm-pause-notice.ts`

---

## 4. Spacing Tokens

Canonical scale: **4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64** (px)

| Range | Intended use |
|-------|----------------|
| 4–8 | Inline and compact metadata |
| 12–16 | Compact components and cards |
| 20–24 | Standard component spacing |
| 32–48 | Major section spacing |
| 64 | Page-level separation |

**Rule:** Prefer tokens over arbitrary spacing. Tailwind equivalents: `1` `2` `3` `4` `5` `6` `8` `10` `12` `16`.

---

## 5. Radius Tokens

| Token | Semantic use | Typical Tailwind |
|-------|--------------|------------------|
| **radius-xs** | Tiny chips | `rounded` |
| **radius-sm** | Small controls | `rounded-md` |
| **radius-md** | Buttons, inputs | `rounded-lg` |
| **radius-lg** | Cards | `rounded-xl` |
| **radius-xl** | Major panels | `rounded-2xl` |
| **radius-pill** | Badges, lifecycle pills | `rounded-full` |

Document semantic use; do not force a visual rewrite of existing screens.

---

## 6. Shadow and Elevation

| Token | Use |
|-------|-----|
| **shadow-none** | Flat governance surfaces |
| **shadow-xs** | Subtle card lift |
| **shadow-sm** | Standard cards (hub feed) |
| **shadow-md** | Hover elevation (+1 level) |
| **shadow-lg** | Rare modals only |

**Rules:**

- Most governance surfaces use **subtle borders** first
- Avoid excessive card elevation
- Hover may add **one** elevation level
- Destructive or legal significance must **not** be communicated only through shadow
- Avoid “card inside card inside card” clutter

---

## 7. Typography System

| Role | Purpose | Behavior |
|------|---------|----------|
| **Display** | Marketing / hero only | Rare in app |
| **Page Title** | `h1` — must dominate | `text-xl`–`text-2xl font-bold` |
| **Section Title** | Tab panels, major blocks | `text-sm font-bold uppercase tracking-wide` |
| **Card Title** | Matter/resolution titles | `text-sm font-semibold` |
| **Subtitle** | Stage, category lines | `text-xs font-semibold uppercase` |
| **Body** | Primary reading text | `text-sm` |
| **Supporting Text** | Descriptions | `text-sm text-gray-700` |
| **Caption** | Timestamps, hints | `text-xs text-gray-500` |
| **Metadata** | Audit ids, quiet facts | `text-[10px] text-gray-400` |
| **Badge** | Status chips | `text-[10px]–text-xs font-bold uppercase` |
| **Button Label** | Actions | `text-sm font-semibold` |

**Rules:** Page title dominant; selected matter title second; metadata quieter; do not bold every line; bilingual layouts preserve equal dignity; never force awkward truncation across languages.

**Note:** CDS records typography **behavior**, not bundled font files. System fonts via Tailwind defaults.

---

## 8. Color Semantics — Governance Lifecycle

One platform-wide lifecycle color language (semantic tokens; accompany with text always).

| Stage | Semantic color | Notes |
|-------|----------------|-------|
| **Draft** | Neutral Gray | `state.neutral` |
| **Discussion** | Green | Aligns with `clearstrata.ui.primary` |
| **Consultation** | Amber | `state.warning` |
| **CDA / Advisory AI** | Indigo or Violet | Council-only advisory |
| **Resolution** | Blue | Resolution workflow |
| **Meeting** | Purple | Scheduled meeting |
| **Voting** | Orange | Owner voting |
| **Execution** | Teal | Post-decision |
| **Archived** | Gray | Complete |
| **Danger / Legal Failure** | Red | `state.danger` |

**Rules:** Colors carry meaning; status color + text label required; same stage → same token across modules; do not rely on color alone.

*Inventory note:* Lifecycle pills in `GovernanceLifecycleTimeline.tsx` use green primary for current stage; full semantic palette not yet tokenized in `tailwind.config.js` — **RC candidate**.

---

## 9. Layout Standards

| Layout | Structure |
|--------|-----------|
| **Dashboard** | Card-based overview |
| **Governance Hub** | Main feed + role-aware side panel |
| **Governance Cockpit** | Pipeline + Current Matter + Action Queue |
| **Matter Detail** | Header + Lifecycle + Tabs + Content |
| **Finance** | Summary + Ledger + Detail *(planned)* |
| **Procurement** | Request + Evidence + Comparison *(planned)* |
| **Mobile** | Single-column priority order (§20) |

**Rules:** Layout communicates responsibility; one focal area per page; secondary information must not overpower primary task.

| Implementation | Path |
|----------------|------|
| Governance Hub | `GovernanceMatterPages.tsx` (hub), `GovernanceHubPanel.tsx` |
| Cockpit | `CouncilWorkspacePage.tsx` — three columns desktop |
| Matter Detail | `GovernanceMatterPages.tsx` + `GovernanceMatterDetailTabs.tsx` |

---

## 10. Core Components

Document standard families. **Do not duplicate** — reuse existing implementations.

| Family | Existing implementation | Location |
|--------|-------------------------|----------|
| **Button** | Inline Tailwind patterns | Widespread — no shared `Button` yet |
| **Card** | Matter cards, feed cards | `GovernanceMatterCard.tsx`, `WorkspacePipelineMatterCard.tsx` |
| **Panel** | Hub, cockpit, participation | `GovernanceHubPanel.tsx`, `GovernanceCockpitPanel.tsx`, `OwnerParticipationPanel.tsx` |
| **Badge / Status Label** | `StatusBadge` | `src/components/status/StatusBadge.tsx` |
| **Tabs** | Matter detail tabs | `GovernanceMatterDetailTabs.tsx` |
| **Accordion** | Discussion revisions | Chevron collapse in detail tabs |
| **Timeline** | Lifecycle + matter timeline | `GovernanceLifecycleTimeline.tsx`, `GovernanceMatterTimelineTab.tsx` |
| **Progress Indicator** | Stage segments | `GovernanceMatterTimelineTab` current stage bar |
| **Action Queue** | Cockpit queue | `GovernanceCockpitPanel.tsx` |
| **Metric** | Cockpit health | `GovernanceCockpitPanel.tsx` |
| **Banner / Alert** | `StatusAlert` | `src/components/status/StatusAlert.tsx` |
| **Toast** | App-level *(if present)* | Verify per module |
| **Modal / Drawer** | Meeting, voting modals | Module-specific |
| **Empty State** | Inline copy | Hub, timeline, participation panels |
| **Loading Skeleton** | Spinner-heavy today | `animate-spin` + border spinner |
| **Error State** | Red text + retry | Hub loaders post BF-002 |
| **Search / Filter** | Hub views, timeline chips | `view=subscribed`, timeline filter chips |
| **Pagination** | List views | As needed |
| **Document Link** | Timeline attachments | `GovernanceMatterTimelineTab.tsx` |

For each family: define Purpose · When to use · Variants · Do · Do not · Accessibility · Examples in module-specific CDS children (CDS-003+).

---

## 11. Button System

| Variant | Use |
|---------|-----|
| **Primary** | One dominant action — `bg-clearstrata-ui-primary text-white` |
| **Secondary** | Alternate confirm — bordered white |
| **Outline** | Low emphasis bordered |
| **Ghost** | Tertiary / compact |
| **Danger** | Destructive — red, requires confirmation |
| **Link** | Navigation — `text-clearstrata-brand-900 hover:underline` |

**Rules:**

- One dominant primary per context
- Do not place multiple green primaries in a small area
- Labels describe the action
- Avoid generic “Open”, “Proceed”, “Continue”, “Action” when specific labels exist
- Destructive → confirmation
- Loading → disable + progress indicator

| Good | Bad |
|------|-----|
| Generate CDA Report | Open |
| Prepare Resolution | Proceed |
| Schedule Meeting | Continue |
| Open Voting | Action |

---

## 12. Card and Panel Standards

| Type | Represents |
|------|------------|
| **Card** | One item or compact content unit |
| **Panel** | Major working area or responsibility |

**Rules:** Cards ≠ full pages; panels may contain cards; avoid deep nested rounded containers; hide negative status clutter unless relevant; show exceptional badges, not every missing state.

---

## 13. Governance Components

| Component | File | Authoritative data | Roles |
|-----------|------|-------------------|-------|
| **Governance Matter Card** | `GovernanceMatterCard.tsx` | `governance_matters` | All |
| **Governance Lifecycle** | `GovernanceLifecycleTimeline.tsx` | `matter.status` | All |
| **Governance Hub** | `GovernanceHubPanel.tsx`, hub pages | Matters feed | All |
| **Governance Cockpit** | `GovernanceCockpitPanel.tsx`, `CouncilWorkspacePage.tsx` | Matters + intelligence | Council |
| **Council Action Queue** | `GovernanceCockpitPanel.tsx` | `governanceIntelligence.ts` | Council |
| **Owner Participation Panel** | `OwnerParticipationPanel.tsx` | Subscriptions, comments | Owner |
| **Constitutional Basis** | Detail tabs / resolution | `constitutionalBasis.ts` | All (read) |
| **CDA Panel** | `ConstitutionalDeliberationAssistantPanel.tsx` | `governance_matter_cda_reports` | Council |
| **Community Resolution Card** | Resolution tab in detail | `community_resolutions` | Council + owner (public) |
| **Meeting Preparation Context** | Resolution / workspace actions | `meetings` linkage | Council |
| **Voting Context** | Meeting owner vote sections | Voting linkage | Owner + council |
| **Governance Timeline** | `GovernanceMatterTimelineTab.tsx` | Revisions projection | Council full; owner filtered |
| **Governance Evidence** | Timeline `documents[]`, reasons | Linked records | Per [GPA-002](../Architecture/GPA-002_Single_Source_of_Governance_Truth.md) |
| **Governance Health Summary** | `GovernanceCockpitPanel.tsx` | Intelligence bundle | Council |
| **Next Constitutional Step** | `governanceLifecycleModel.ts` | Workflow state | Hub cards, cockpit |

Each must define: purpose · visible roles · authoritative source · primary action · secondary actions · owner/council distinction · mobile behavior (see UIP records).

---

## 14. AI Design Language

### Official labels

| English | 中文 |
|---------|------|
| AI Assistance | AI 协助 |
| AI Analysis | AI 分析 |
| AI Summary | AI 摘要 |
| AI Recommendation | AI 建议 |
| AI Suggested Next Step | AI 建议下一步 |
| AI Risk | AI 风险 |
| AI Confidence | AI 信心 |
| Constitutional Deliberation Assistant | 宪章议事助手 |

**Tagline:** Generated by AI · Reviewed by Community · Decision by People  
**中文版：** 由 AI 生成 · 由社区审阅 · 由人作出决定

**Rules:**

- Never present AI output as a **decision**
- No authoritative language without evidence
- Disclose source and advisory status
- Recommendations link to timeline, evidence, or knowledge ([GPA-001](../Architecture/GPA-001_Governance_Pyramid_Architecture.md))
- No anthropomorphic or manipulative language
- AI confidence not invented without documented method
- UIP-012 intelligence is **deterministic**, not LLM — still labeled as advisory

---

## 15. Interaction Standards

States: Default · Hover · Focus · Pressed · Selected · Disabled · Loading · Success · Warning · Error · Recovered

**Rules:** Visible keyboard focus; links ≠ buttons; no critical actions hover-only; prevent duplicate submission; preserve form content on recoverable errors; success confirms what changed; legal/financial actions show consequences.

**Project One adoption ([RC-006](../projects/RC-006_Interaction_Audit.md)):**

| Concern | Implementation |
|---------|----------------|
| Feedback | `GovernanceFeedbackHost` + `governanceFeedbackMessages.ts` |
| Loading actions | RC-002 `Button` `loading` + `aria-busy` |
| Hover/focus timing | `interactionClasses.ts` (150ms; reduced motion) |
| Destructive confirm | Archive only — `confirmDestructiveAction` |
| Duplicate submit | Per-action flags + cockpit `busyQueueKey` |

**Interaction checklist:** See RC-006 § Interaction checklist.

---

## 16. Loading Standards

| Pattern | Use |
|---------|-----|
| **Skeleton** | Content-heavy pages *(target)* |
| **Inline progress** | Action buttons `disabled:opacity-60` |
| **Compact spinner** | Small isolated actions — `animate-spin` |

**Rules:** No empty state before load completes; distinguish loading / empty / failed; preserve data on safe refetch; **independent features load independently**.

**Cross-reference:** [BF-002](../projects/BF-002_Independent_Governance_Hub_Data_Loading.md)

---

## 17. Empty and Error States

Every empty state answers: **what** · **why** · **what next**

Example empty: 暂无治理事项 — 目前没有需要您参与的事项。

Error must not pretend empty: 暂时无法加载您的评论事项，请稍后重试。

Include **retry** where practical.

---

## 18. Motion System

| Token | Duration | Tailwind | Use |
|-------|----------|----------|-----|
| **Instant** | 75ms | `duration-motion-instant` | Near-immediate (reserved) |
| **Fast** | 150ms | `duration-motion-fast` | Buttons, links, tabs, chevrons |
| **Standard** | 200ms | `duration-motion-standard` | Tab panel opacity |
| **Panel** | 240ms | `duration-motion-panel` | Dialogs, refreshing overlay |
| **Progress** | 280–320ms | `duration-motion-progress` | Lifecycle pills, progress segments |
| **Feedback** | 300–400ms | `duration-motion-feedback` | Toasts |

**Easing:** `ease-motion-enter` (respond/in) · `ease-motion-exit` (out) · `ease-motion-move` (spatial).

**Rules:** Motion communicates state; no decorative delay; no spring/bounce; respect `prefers-reduced-motion`; queue reordering remains understandable; no route-wide transitions.

**Project One adoption ([RC-008](../projects/RC-008_Motion_System.md)):**

| Concern | Implementation |
|---------|----------------|
| Canonical tokens | `tailwind.config.js` + CSS variables in `src/index.css` |
| Class utility | `src/lib/ui/motionClasses.ts` |
| Interaction surfaces | `interactionClasses.ts` delegates to motion tokens |
| Reduced motion | `motion-reduce:transition-none` / `motion-reduce:animate-none` on pilot classes; global `animate-slide-up` disabled |

**Checklist:** See RC-008 § Pilot components migrated.

---

## 19. Accessibility Standard

Require: keyboard navigation · visible focus · semantic HTML · ARIA only where needed · screen-reader labels · color contrast · reduced motion · accessible errors · touch targets · bilingual clarity.

**Rules:** Color never sole status carrier; icon-only buttons need labels; tab order follows visual order; mobile touch-friendly; major UI work includes a11y verification.

**Project One adoption ([RC-007](../projects/RC-007_Accessibility_Audit.md)):**

| Concern | Implementation |
|---------|----------------|
| Landmarks / headings | `<main>`, `<nav>`, `<aside>`, h1–h2 hierarchy on pilot pages |
| Tabs | WAI-ARIA tablist + tabpanel + arrow-key navigation |
| Filters / selection | `aria-pressed`, `aria-current`, contextual card labels |
| Queue actions | `governanceA11y.ts` bilingual `aria-label` with matter title |
| Forms | Visible labels, `<form>` submit, validation ARIA |
| Destructive confirm | `DestructiveConfirmDialog` (native `<dialog>`) |
| Toasts | Item-level `aria-live`; errors assertive |
| Timeline | Semantic lists, filter pressed state, decorative nodes hidden |

**Checklist:** See RC-007 § Accessibility checklist.

---

## 19.1 Project One Release QA

**Authority:** [RC-009](../projects/RC-009_Governance_Journey_QA.md) — Governance Journey QA (final gate before v1.0).

| Gate | Status (2026-07-14) |
|------|---------------------|
| End-to-end Council + Owner journey | **FAIL** — live QA not completed; meeting/voting integration gaps |
| P0 / P1 defects | **FAIL** — P1-001 meeting link-back, P1-002 voting link-back |
| RC-004–008 regression | Partial pass (code audit) |
| TypeScript + production build | Pass |

**Rule:** RC-010 (Project One v1.0 Release) may not begin with open P0 or P1 issues.

---

## 20. Responsive Standards

**Desktop:** Full working layouts.

**Tablet:** Collapse secondary navigation or panels.

**Mobile priority order:**

1. Current Matter or primary task  
2. Current stage  
3. Next action  
4. Primary role action  
5. Main content  
6. Secondary navigation  
7. Metrics and history  

**Rules:** Do not shrink desktop; do not compress three columns; one clear primary action; hide nonessential zero metrics on mobile.

---

## 21. Bilingual Design Standard

- Chinese and English both **complete**
- Neither language decorative only
- Semantically equivalent labels
- Button length tested in both languages
- No mixed fragments unless legally/technically necessary
- Bilingual emails: consistent hierarchy
- No unexpected language switching (`useLanguage()`)

---

## 22. Email Design Standard

| Requirement | Standard |
|-------------|----------|
| **Brand color** | `#35C3D6` header + CTA |
| **Logo** | ClearStrata logo in header |
| **Heading** | Bilingual |
| **Subject** | Clear, specific |
| **CTA** | One primary where applicable |
| **Fallback** | Plain-text link, lake-blue anchor |
| **Layout** | Readable mobile |
| **Links** | No unnecessary duplicates |
| **Legal** | No hidden consequences |
| **Delivery** | Dedup for one-time notices |

**Cross-reference:** [BF-001](../projects/BF-001_SGM_Pause_Notification_Race_Condition.md)

---

## 23. Trust and Safety Patterns

For legal, voting, financial, governance actions:

- Identify who may act  
- Explain binding vs advisory  
- Show current status  
- Preserve audit history ([GDS-001](../Architecture/GDS-001_Governance_Data_Standard.md))  
- Confirm before irreversible actions  
- Never overstate legal effect in UI  
- Distinguish draft · recommendation · approval · final decision  

---

## 24. Repository Governance

Every major new page or component must answer:

1. Which CDS pattern does it use?  
2. Does an existing component satisfy the need?  
3. Are new tokens required?  
4. Is the pattern reusable?  
5. Accessibility compliance?  
6. Bilingual consistency?  
7. Alignment with GP, GPA, GDS?  

**GRFC required for:** new major interaction model · new platform-wide component category · major design-language change · lifecycle semantic changes · AI disclosure language changes.

Small polish → UIP only, no GRFC.

---

## 25. Design System Maintenance

CDS-001 is a **living** long-term standard. Changes must preserve version history, reason, affected components, backward compatibility, and Related Documents.

**Suggested future (register when ready):**

| Number | Title |
|--------|-------|
| CDS-002 | Design Tokens |
| CDS-003 | Core Component Library |
| CDS-004 | Governance UI Patterns |
| CDS-005 | AI Language Standard |
| CDS-006 | Motion and Accessibility Standard |

Do not create automatically in this release.

---

## 26. Adoption Strategy

**No immediate full-app rewrite.**

| Phase | Action |
|-------|--------|
| 1 | Document and inventory current patterns *(this document)* |
| 2 | Identify inconsistencies |
| 3 | Create shared tokens and components |
| 4 | Migrate active modules during normal work |
| 5 | Audit legacy screens before release |

No large visual rewrite solely for CDS compliance.

---

## 27. Acceptance Criteria

- [x] CDS-001 with Document Identity Block  
- [x] Related Documents mandatory field  
- [x] Document Registry updated  
- [x] README index updated  
- [x] Hall of Milestones updated  
- [x] Existing UI and email conventions documented  
- [x] Governance components documented  
- [x] AI disclosure language standardized  
- [x] Accessibility and responsive rules included  
- [x] Adoption process defined  
- [x] No application code changed  
- [x] No database changes  
- [x] No new runtime dependency  

---

## Appendix A — Existing Pattern Inventory (Phase 1)

| Area | Current state |
|------|---------------|
| **Tailwind tokens** | `tailwind.config.js` — brand green, ui primary, state semantic |
| **Email brand** | `#35C3D6` inline in send functions |
| **Status components** | `StatusBadge`, `StatusAlert` |
| **Governance UI** | 14 components in `community-deliberation/` |
| **Primary buttons** | Shared `Button` primitive — [RC-002](../projects/RC-002_Shared_Button_System.md) pilot on governance surfaces |
| **Spacing** | Tailwind scale; not named CDS tokens in code |
| **Lifecycle colors** | `clearstrata.lifecycle.*` tokens + `governanceLifecyclePresentation.ts` — [RC-003](../projects/RC-003_Lifecycle_Design_Tokens.md) |

---

## Appendix B — Recorded Inconsistencies (audit items · CDS-002+)

*Formal Release Candidate records RC-001 … RC-003 are registered separately in [Document_Registry.md](../Registry/Document_Registry.md).*

| ID | Issue | Status | Resolution |
|----|-------|--------|------------|
| **INC-001** | UI primary green vs email lake blue | OPEN | Documented as dual-brand; optional token alias `brand.email` |
| **INC-002** | No shared `Button` component | **ADDRESSED** | [RC-002](../projects/RC-002_Shared_Button_System.md) — `src/components/ui/Button.tsx` |
| **INC-003** | Lifecycle semantic colors incomplete in Tailwind | **ADDRESSED** | [RC-003](../projects/RC-003_Lifecycle_Design_Tokens.md) |
| **INC-004** | Loading uses spinners more than skeletons | **ADDRESSED** | [RC-004](../projects/RC-004_Shared_State_System.md), [RC-005](../projects/RC-005_Skeleton_Empty_State_System.md) |
| **INC-005** | Mixed `rounded-lg` / `rounded-xl` / `rounded-2xl` | OPEN | Map to radius tokens in CDS-002 |
| **INC-006** | Some generic action labels remain | **PARTIAL** | RC-002 cockpit/hub CTAs; RC-005 empty copy; RC-006 governance toasts |

---

## Related Standards

| Standard | Relationship |
|----------|--------------|
| [GPA-001](../Architecture/GPA-001_Governance_Pyramid_Architecture.md) | UI projects pyramid layers |
| [GPA-002](../Architecture/GPA-002_Single_Source_of_Governance_Truth.md) | UI is projection; CDS does not create truth |
| [GDS-001](../Architecture/GDS-001_Governance_Data_Standard.md) | Components bind to canonical entities |
| [GRFC-001](../Architecture/GRFC-001_Governance_Request_for_Change.md) | Major design changes require GRFC |

*Foundational Milestone:* [Repository Hall of Milestones](../History/Milestones.md#layer-1--foundational-milestones) (RM-006)

---

## Permanent Design Inscription

### English

**A trustworthy platform does not merely look consistent. It behaves consistently, explains itself clearly, and treats every person with dignity.**

### 中文

**一个值得信任的平台，不仅应当看起来一致；它还应当始终以一致的方式运行，清楚地解释自己，并尊重每一个人的尊严。**

---

**END OF CDS-001**

| | |
|---|---|
| **Status** | FOUNDATION |
| **Document Number** | CDS-001 |
| **Version** | 1.0 |
| **Classification** | Long-Term Design Standard |
