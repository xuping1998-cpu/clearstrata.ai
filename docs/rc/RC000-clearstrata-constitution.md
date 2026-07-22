# RC000 — ClearStrata Constitution

## Supreme Design Principle of the ClearStrata Platform

| Field | Value |
|-------|-------|
| **Document** | RC000 |
| **Title** | ClearStrata Constitution |
| **Version** | 1.0 |
| **Status** | Official |
| **Owner** | ClearStrata Architecture |

> **Immutability:** Do not modify this document unless explicitly instructed through a constitutional amendment process.

---

## Purpose

This document is the highest design principle of the ClearStrata platform.

It is not a feature specification.  
It is not a technical implementation.

It defines the philosophy, governance model, and architectural principles that every future feature (RC) must follow.

**If any future design conflicts with RC000, RC000 always takes precedence.**

---

## Platform Positioning

ClearStrata is **NOT** a Property Management System.

ClearStrata is an **AI-Powered Community Governance Operating System (Community GOS)**.

Its purpose is to help communities achieve:

- Self-Governance
- Self-Supervision
- Continuous Improvement

Property management is only one application running on this operating system.

---

## Vision

Empower every community to govern itself with transparency, democracy, and accountability.

让每一个社区都拥有公开、民主、负责的自治能力。

---

## Mission

**Business Mission**

让每一笔支出干净透明。  
Every expense clean and transparent.

**Governance Mission**

- 让每一个问题都有公开讨论。
- 让每一个决定都有民主表决。
- 让每一项决议都有公开执行。
- 让每一次执行都可以公开问责。

---

## Core Values

### Transparency

Everything should be traceable.  
Everything should be searchable.  
Everything should be auditable.

### Democracy

Every stakeholder has the opportunity to participate.  
Every important decision should be discussed.  
Every formal decision should be voted on.

### Accountability

Every approved resolution must have:

- Owner
- Timeline
- Execution
- Review

### Continuous Improvement

Governance never ends.  
Every completed cycle should improve the community.

---

## Core Governance Model

**ClearStrata Democratic Governance Loop (CDGL)**

```
Issue
  ↓
Governance
  ↓
Meeting
  ↓
Voting
  ↓
Execution
  ↓
Accountability
  ↓
Continuous Improvement
  ↓
New Issue
```

This governance loop is the theoretical foundation of the platform.

Every module must strengthen this loop.  
No module should bypass this loop.

---

## Responsibilities of Each Layer

### 1. Issue

**Purpose:** Discover problems.

**Examples:** AI detects anomalies · financial risks · legal risks · owner complaints · council proposals · audit findings · manager reports

**Output:** Matter

### 2. Governance

**Purpose:** Understand the problem.

**Contains:** Facts · Evidence · Discussion · AI Analysis · Council responses

**Governance NEVER creates formal resolutions.**

### 3. Meeting

**Purpose:** Create solutions.

Meeting is the **only** place where formal Resolutions are authored.

Meeting allows (until Snapshot Freeze):

- Add Resolution
- Edit Resolution
- Delete Resolution
- Merge Resolution
- Split Resolution
- Reorder Resolution

### 4. Voting

**Purpose:** Make democratic decisions.

**Voting NEVER edits Resolutions.**  
Voting only determines whether a Resolution is approved.

### 5. Execution

**Purpose:** Turn approved Resolutions into actions.

Execution includes: Tasks · Responsible persons · Timeline · Budget · Procurement · Contracts · Invoices · Completion

Execution must remain transparent.

### 6. Accountability

**Purpose:** Verify whether the Resolution achieved its intended outcome.

Every completed Resolution enters Review.

- If successful: Archive.
- If unsuccessful: Create a new Governance Matter.

Governance never stops.

---

## Governance Principles

1. **Issues belong to Governance.**
2. **Formal Resolutions belong to Meetings.**
3. **Voting never edits Resolutions.**
4. **Snapshot Freeze creates legal immutability.** After Freeze, Resolution content cannot change.
5. **Every approved Resolution must enter Execution.**
6. **Every Execution must be reviewed.**
7. **Every Review can generate a new Governance Matter.**

---

## Community Governance Operating System

```
Community Governance OS
  ↓
Governance
  ↓
Meeting
  ↓
Voting
  ↓
Execution
  ↓
Accountability
  ↓
Continuous Improvement
```

All future modules are applications running on this operating system.

Examples: Financial Governance · Legal Governance · Procurement Governance · AI Governance · Robot Governance · Facility Governance · Community Discussion · Future AI Assistants · Future Robotics

All must follow the same governance loop.

---

## RC Development Rules

Every future RC must answer two questions.

**Question 1:** Which layer of CDGL does this RC belong to?

Examples:

- RC009 — Governance → Meeting
- RC010 — Meeting
- RC011 — Execution
- RC012 — Accountability

**Question 2:** Does this RC violate RC000?

If **YES** — the design must be revised.

---

## Long-Term Roadmap

```
RC000  Platform Constitution
  ↓
RC009  Governance Bridge (completed)
  ↓
RC010  Meeting Resolution Authoring Before Snapshot
  ↓
RC011  Execution Center
  ↓
RC012  Accountability Center
  ↓
RC013  Continuous Improvement
  ↓
Future — AI Governance · Robot Governance · Legal Governance · Financial Governance · Global Community Governance
```

---

## Platform Declaration

Every issue deserves to be heard.  
Every solution deserves to be discussed.  
Every decision deserves to be voted on.  
Every resolution deserves to be executed.  
Every execution deserves to be accountable.

Governance is not a single vote.  
Governance is a continuous cycle.

---

## Final Principle

ClearStrata does not simply manage properties.  
ClearStrata empowers communities to govern themselves.

Every feature developed in the future should strengthen this mission.  
Nothing should weaken it.

**This document is the Constitution of the ClearStrata Platform. All future architecture and development decisions shall follow RC000.**

---

## RC010 Alignment Decision

**Status:** Official · **Effective:** Architecture decision recorded under RC000

### Official name

**RC010 — Meeting Resolution Authoring Before Snapshot**

### Layer assignment

RC010 belongs exclusively to the **Meeting** layer of CDGL.

### Authoring boundary

- **Formal resolutions are authored only inside Meeting.**
- **Governance** may create and discuss **Matters** but **must never author formal resolutions.**
- **Voting** must **never edit resolution text** — it only records approval or rejection of frozen motions.

### Legal immutability boundary

**Snapshot Freeze** is the legal immutability boundary.

Before Snapshot Freeze, Council may add, edit, delete, and reorder Meeting Resolutions.  
After Snapshot Freeze, resolution content must not change.

### Canonical data object (new governance flows)

**`meeting_agenda_items`** (resolution / `requires_vote` agenda rows) are the **canonical source** for new Meeting Resolutions.

### Legacy compatibility

**`community_resolutions`** remain **legacy-compatible and read-only** for existing historical flows.

They **must not** be used as the authoring source for new governance flows.

### Retired design

Any earlier RC010 plan proposing a Governance **「决议 / Resolution」** authoring tab is **retired** and **must not be implemented**.

The product issue (Matter title presented as formal resolution) is resolved by **not authoring resolutions in Governance**, not by adding a richer Governance draft editor.
