# UI Design Principles

**Constitution Reference:** Article I (transparent, traceable), Article V (public by default), Platform Motto  
**Authority:** Subordinate to [`00_ClearStrata_Constitution.md`](00_ClearStrata_Constitution.md)

---

## Design North Star

**Transparency Builds Trust.**  
**Participation Builds Community.**

UI must make governance **visible**, **understandable**, and **actionable** — not obscure it behind admin-only complexity.

---

## Principles

### 1. Governance visibility (Article I)

Important decisions appear where members expect them:

- Dashboard / home: what needs attention now — layout per [PR-001 — Governance Dashboard](Governance_Dashboard.md)
- Owner Info / announcements: official notices
- Meetings & voting: agenda, status, outcomes
- Audit trails: who acted, when (for authorized viewers)

Never hide material governance state in debug-only UI or internal markers visible to users.

### 2. Discussion before decision (Article II)

UI flow should reflect:

```
Inform → Discuss (where applicable) → Decide → Record outcome
```

Avoid UI that jumps straight to irreversible actions without context.

### 3. Clear authority (Article III)

Show **who** can act and **what** AI drafted vs what humans approved.

- Label AI-generated summaries
- Disable or hide actions the current role cannot lawfully take
- Do not mimic human approval with automated UI defaults

### 4. Evidence first (Article IV)

When presenting recommendations (finance, compliance, votes):

- Show supporting data before narrative
- Link to source documents/records
- Avoid opinion-only banners without context

### 5. Public by default (Article V)

Member-facing surfaces default to **shared property context**.  
Personal vs community channels must be visually distinct (e.g. personal notifications vs community announcements).

### 6. Lifecycle clarity (Article VI)

Use consistent status language across modules:

`draft → open → closed → archived` (and domain-specific substates)

Users should always know **which phase** a matter is in.

### 7. Memory and history (Article VII)

- History lists are durable and sortable
- Archived content remains readable (not deleted from UI)
- Bilingual copy where the product serves EN/ZH communities

---

## Accessibility and Inclusion

Participation requires access:

- Readable typography and contrast
- Mobile-friendly voting and notices
- Plain language alongside formal governance terms

---

## Anti-Patterns

| Do not | Why |
|--------|-----|
| Expose internal implementation markers in user UI | Breaks trust (Article I) |
| Use global toasts for personal governance items in wrong channel | Confuses public vs private |
| Optimize UI for staff-only at expense of owner understanding | Harms participation |
| Dark-pattern urgency on non-urgent governance | Undermines trust |

---

## Constitution Review (UI section)

For new UI, answer in [`templates/Constitution_Review_Template.md`](templates/Constitution_Review_Template.md):

- What is **public** vs **confidential**?
- How does the user see **audit** trail?
- What **memory** persists after the screen closes?

---

## Related Documents

- [`01_Product_Vision.md`](01_Product_Vision.md)
- [`04_AI_Principles.md`](04_AI_Principles.md)
- Design tokens: `src` Tailwind / ClearStrata UI palette rules
