# FR2 — Governance Release

| Field | Value |
|-------|-------|
| **Release** | FR2 |
| **Title** | Governance Release |
| **Version** | 1.0 |
| **Status** | **In Progress** |
| **Era** | Constitutional Implementation Era — **Active** |
| **Authority** | RC000 · CGDP · MGS · CGE |

**Preceded by:** [`FR1-Foundation-Release.md`](FR1-Foundation-Release.md) (Baseline Locked)

---

## Release summary

```
FR2
Governance Release
────────────────────
Era
Constitutional Implementation Era
────────────────────
M2
Meeting Resolution Authoring Before Snapshot
────────────────────
RC010
Meeting Owns Formal Resolutions
────────────────────
CDGL
First operational loop closure
────────────────────
Status
In Progress
```

**M2 authorized:** First implementation milestone of the Constitutional Implementation Era (2026).

---

## Objective

Deliver the **first governance implementation release** of the Constitutional Implementation Era.

Transform RC000 layer boundaries into **working product behavior**:

- Governance identifies issues
- Meeting authors formal resolutions
- Voting approves frozen motions
- Execution (future — RC011)

---

## Constitutional basis

| Document | Role |
|----------|------|
| **Founding Constitution** | WHY — communities, trust, transparency |
| **RC000** | HOW — CDGL, Principles 2–4 |
| **RC010 Alignment Decision** | Meeting owns formal resolutions |
| **CGDP** | Traceability FD → RC → M → Implementation |
| **CGE** | Constitution → Architecture → RC → Milestone → Code |

---

## Release contents (target)

| Item | Status | Reference |
|------|--------|-----------|
| **M2** | **In Progress** | [`M2-Meeting-Resolution-Authoring.md`](../milestones/M2-Meeting-Resolution-Authoring.md) |
| **RC010** | **In Progress** | [`RC010-Meeting-Owns-Formal-Resolutions.md`](../rc/RC010-Meeting-Owns-Formal-Resolutions.md) |
| **RC010-A** | **Approved** | [`RC010-A-Snapshot-Constitutional-Boundary.md`](../rc/RC010-A-Snapshot-Constitutional-Boundary.md) |
| **RC010-B** | **Completed** | [`RC010-B-Production-Freeze-Contract-Recovery.md`](../rc/RC010-B-Production-Freeze-Contract-Recovery.md) |
| **RC010-C** | **Completed** | [`RC010-C-Voting-Eligibility-Contract.md`](../investigations/RC010-C-Voting-Eligibility-Contract.md) |
| **CDR-001** | **Approved** | [`CDR-001-Voting-Eligibility-Decision.md`](../cdr/CDR-001-Voting-Eligibility-Decision.md) |
| **M2 Slice 3 Design** | **Authorized** | CDR-001 approval |
| **M2 Slice 3 Implementation** | **Not authorized** | Requires separate Implementation Authorization |
| **Implementation** | **Authorized** (Slice 2) · Slice 3 not authorized | Under CGE + MGS gates per M2 |

---

## CDGL impact

```
Issue / Matter        →  Governance  (identify · discuss)
Formal resolutions    →  Meeting     (author before freeze)  ← FR2 / M2 / RC010
Democratic approval   →  Voting      (frozen motions)
Actions               →  Execution   (RC011 — out of FR2 scope)
```

This release closes the **authoring gap** that caused Matter titles to appear as formal resolutions.

---

## Architecture decisions (current)

| Record | Role |
|--------|------|
| **RC010** | Meeting owns formal resolution authoring before Freeze |
| **RC010-A** | Snapshot Freeze constitutional boundary — dual snapshot model (voter + resolution); Slice 3 prerequisite |
| **RC010-B** | Production freeze contract recovery — live RPC + per-meeting-type workflow matrix |
| **RC010-C** | Production voting eligibility contract recovery — resolution vs election paths |
| **CDR-001** | Constitutional voting eligibility and freeze semantics — **Approved** |

**RC010-A status:** Approved — architecture boundary record.

**RC010-B status:** Completed — production freeze contract recovered; **does not authorize Slice 3 implementation**.

**RC010-C status:** Completed — production eligibility contract recovered; informed CDR-001.

**CDR-001 status:** Approved — M2 Slice 3 **Design authorized**; Slice 3 **Implementation not authorized**. Production **unchanged** and **not fully compliant** with CDR-001 until authorized implementation.

**References:** [`RC010-A-Snapshot-Constitutional-Boundary.md`](../rc/RC010-A-Snapshot-Constitutional-Boundary.md) · [`RC010-B-Production-Freeze-Contract-Recovery.md`](../rc/RC010-B-Production-Freeze-Contract-Recovery.md) · [`RC010-C-Voting-Eligibility-Contract.md`](../investigations/RC010-C-Voting-Eligibility-Contract.md) · [`CDR-001-Voting-Eligibility-Decision.md`](../cdr/CDR-001-Voting-Eligibility-Decision.md) · [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md)

---

## Implementation principles (era)

Every FR2 deliverable shall:

- Follow the Constitution
- Respect architectural boundaries
- Preserve governance integrity
- Remain traceable and accountable
- Strengthen transparency, trust, and communities

**Era declaration:** [`docs/eras/Constitutional-Implementation-Era.md`](../eras/Constitutional-Implementation-Era.md)

---

## Scope

### In FR2

- RC010 / M2 implementation
- Meeting resolution authoring
- Governance authoring removal
- Origin Matter read-only on Meeting
- RC009 bridge preservation
- Legacy compatibility

### Out of FR2

- Execution Center (RC011)
- Accountability Center (RC012)
- Resolution version history (RC010-P2)
- Constitutional document expansion

---

## Acceptance criteria (release gate)

FR2 may move to **Completed** when M2 acceptance criteria are satisfied:

- [ ] All M2 acceptance criteria met
- [ ] CCR passed for implementation
- [ ] No RC000 layer boundary violations
- [ ] Production validation on test property (Council workflow)
- [ ] `tsc` + production build pass

---

## Meaning

**FR2** is the first release where the Constitution becomes the **operating system** of ClearStrata — not only its documentation.

The Constitution is **implemented**, not rewritten.

---

## 時代意義

**FR2** 是憲章實踐時代的第一個治理實現版本。憲章不再只是文件，而是 **可運行的治理規則**。

---

## Implementation scope (current)

**M2 In Progress** — implementation authorized under CGE + MGS gates.

- Application changes proceed per RC010 and M2 acceptance criteria
- Database schema changes only if proven necessary in implementation plan
- Migrations only if proven necessary in implementation plan
- FR2 completes when M2 success criteria and release gate are satisfied

---

## Constitutional compliance (CCR)

- ✓ RC000 compliant (in progress)
- ✓ CGDP Rule 4 — RC recorded by Milestone (M2)
- ✓ Does not redefine FR1 baselines

**Overall result:** Compliant (in progress — pending M2 acceptance)

---

## Next release

**FR3+** (TBD) — likely tied to RC011 Execution or subsequent CDGL layers.

---

## North Star

FR2 shall move the platform closer to:

以智慧、透明與信任，賦能每一個社區。

Empowering every community through intelligence, transparency, and trust.

**Reference:** [`docs/founding/NORTH-STAR.md`](../founding/NORTH-STAR.md)
