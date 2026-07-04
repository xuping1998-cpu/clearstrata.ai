# AI Principles

**Constitution Reference:** Article III (AI Assists, People Decide), Article IV (Evidence Before Opinion), Article X (Legitimacy Before Intelligence)  
**Authority:** Subordinate to [`00_ClearStrata_Constitution.md`](00_ClearStrata_Constitution.md)

---

## Core Rule (Article III)

**AI assists every decision.**  
**AI never replaces lawful decision makers.**

AI 应协助每一个决策。  
但绝不取代依法拥有决策权的人。

*Rule 9 Commentary:* Whether governance is assisted by humans, AI, or future autonomous systems, the Constitution remains the enduring foundation. See [`00_ClearStrata_Constitution.md`](00_ClearStrata_Constitution.md) — *Governance Beyond Technology*.

**Article X:** Intelligence and capability do not grant authority. Legitimacy governs intelligence; AI serves the Constitution — it is never its author. See Article X — *Legitimacy Before Intelligence*.

---

## What AI May Do

| Category | Examples |
|----------|----------|
| **Summarize** | Discussion threads, meeting minutes drafts, agenda highlights |
| **Structure** | Turn evidence into readable reports (invoice audit, budget variance) |
| **Detect** | Risk signals, missing documents, deadline reminders |
| **Draft** | Notices, emails, resolution language — **for human review** |
| **Navigate** | Help users find records, policies, past votes |

All outputs are **assistive** — labeled as AI-generated where material to a decision.

---

## What AI Must Not Do

- Cast votes or bind a community to a decision
- Approve join requests, invoices, or resolutions without human authority
- Hide or alter audit records
- Present opinion as fact without evidence (Article IV)
- Bypass transparency by acting only in private channels

---

## Evidence Before Opinion (Article IV)

```
Evidence → Discussion → Opinion
```

AI features that influence major matters must:

1. **Cite source data** (documents, ledger rows, meeting records)
2. Separate **facts** from **interpretation**
3. Preserve links to underlying records for audit

---

## Human-in-the-Loop Requirements

| Action | Human role |
|--------|------------|
| Publish notice / announcement | Staff or council approves |
| Send bulk email | Triggered by authorized user; delivery logged |
| Archive meeting / close vote | Authorized role confirms |
| AI audit conclusion | Human review before external reliance |

---

## AI in Constitution Amendment (Rule 6)

Amending the Constitution uses **AI Summary** as an assistive step — not as approver.

---

## AI Assistant Rules (Rule 4)

All repository AI tools (Cursor, Claude, GPT, Gemini) must:

1. Read [`00_ClearStrata_Constitution.md`](00_ClearStrata_Constitution.md) before architecture or code proposals
2. Refuse or redirect designs that violate Articles I–VIII
3. Cite Constitution articles in design discussion
4. Prefer design revision over non-compliant code

Enforced via [`.cursor/rules/clearstrata-constitution.mdc`](../.cursor/rules/clearstrata-constitution.mdc).

---

## Privacy and Security

- AI prompts must not exfiltrate cross-property data
- Property-scoped context only (`property_id` isolation)
- No training on tenant private data without explicit governance approval

---

## Related Documents

- [`02_Governance_Model.md`](02_Governance_Model.md)
- [`06_Data_Governance.md`](06_Data_Governance.md)
- [`05_UI_Design_Principles.md`](05_UI_Design_Principles.md) — presenting AI output to users
