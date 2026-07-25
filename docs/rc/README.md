# ClearStrata RC Specifications

CGDP **LEVEL 4 — Requirement Changes (RC)**.

Requirements **implement ADR**. Requirements **never redefine architecture** or RC000.

**Authority:** RC000 · CGDP

---

## Active / planning

| RC | Title | Status | Record |
|----|-------|--------|--------|
| **RC010** | Meeting Owns Formal Resolutions | **In Progress** (M2) | [`RC010-Meeting-Owns-Formal-Resolutions.md`](RC010-Meeting-Owns-Formal-Resolutions.md) |
| **RC010-A** | Snapshot Constitutional Boundary | **Approved** (M2 Slice 3 prerequisite) | [`RC010-A-Snapshot-Constitutional-Boundary.md`](RC010-A-Snapshot-Constitutional-Boundary.md) |
| **RC010-B** | Production Freeze Contract Recovery | **Completed** | [`RC010-B-Production-Freeze-Contract-Recovery.md`](RC010-B-Production-Freeze-Contract-Recovery.md) |

```
RC010 — In Progress (M2)
├── RC010-A — Snapshot Constitutional Boundary — Approved
├── RC010-B — Production Freeze Contract Recovery — Completed
└── RC010-C — Voting Eligibility Contract — Completed → [`investigations/`](../investigations/RC010-C-Voting-Eligibility-Contract.md)
         ↓
    CDR-001 — Voting Eligibility Decision — Approved → [`cdr/`](../cdr/CDR-001-Voting-Eligibility-Decision.md)
```

**Constitutional decisions:** [`docs/cdr/`](../cdr/) · **Investigations:** [`docs/investigations/`](../investigations/) · **Governance:** [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md)

**Official name:** RC010 — Meeting Resolution Authoring Before Snapshot

**RC000 alignment:** [`RC000-clearstrata-constitution.md`](RC000-clearstrata-constitution.md#rc010-alignment-decision)

---

## Completed (reference)

| RC | Title | Notes |
|----|-------|-------|
| **RC009** | Governance Bridge | Governance → Meeting → Owner Voting (implementation complete) |

---

## Filing convention

```
docs/rc/RC{n}-{short-title}.md
```

Platform constitution: [`RC000-clearstrata-constitution.md`](RC000-clearstrata-constitution.md)
