# ClearStrata Document Governance Standard

| Field | Value |
|-------|-------|
| **Document** | DOCUMENT-GOVERNANCE |
| **Title** | ClearStrata Document Governance Standard |
| **Type** | Governance Standard |
| **Status** | **Approved** |
| **Authority** | ClearStrata Constitutional Governance Committee |
| **Effective** | 2026-06-24 |

This standard defines the **permanent documentation hierarchy**, **authority model**, **status vocabulary**, and **change-control rules** for ClearStrata constitutional and implementation records.

---

## 1. Purpose

Provide one canonical system so that:

- constitutional intent is traceable;
- production facts are not confused with approved decisions;
- implementation is never authorized by accident;
- historical records remain auditable;
- every team member can find the **source of truth** for a given question.

---

## 2. Constitutional document hierarchy

```
docs/
├── constitution/          ← Index: Founding + RC000 (baseline locked)
├── rc/                    ← Requirement constitution records (RC)
├── investigations/        ← Evidence / unknowns (INVESTIGATION)
├── cdr/                   ← Constitutional decision records (CDR)
├── implementation/        ← Slice design + implementation authorization + CES-001
├── milestones/            ← Milestone contracts (M)
├── releases/              ← Release records (FR)
├── eras/                  ← Era records
├── Architecture/          ← Architecture standards (GPA, CGDP, CGE, GRFC, ADR)
├── Founding/              ← Legacy path — preserved (baseline locked)
├── projects/              ← Feature / UX project records — preserved
├── Registry/              ← Master registries — preserved
└── DOCUMENT-GOVERNANCE.md ← This standard
```

**Rule:** New constitutional work uses the canonical categories above. **Do not move** baseline-locked or historical files without an approved repository migration plan.

**Top index:** [`README.md`](README.md) · **Structure map:** [`STRUCTURE.md`](STRUCTURE.md)

---

## 3. Constitution

**Type:** CONSTITUTION

**Defines:** Highest non-negotiable governance principles.

**Includes:**

- Founding Constitution and covenant documents ([`Founding/`](Founding/), indexed via [`constitution/README.md`](constitution/README.md))
- **RC000** platform constitution ([`rc/RC000-clearstrata-constitution.md`](rc/RC000-clearstrata-constitution.md))

**Status:** Baseline Locked documents **must not** be rewritten to reflect later decisions. Later records **clarify**, **supersede implementation targets**, or **identify gaps** — they do not erase history.

---

## 4. Requirement constitution records — RC

**Type:** RC

**Defines:** What the platform constitutionally **must provide**.

**Location:** [`docs/rc/`](rc/)

**Examples:** RC010, RC010-A, RC010-B

**Sub-types (by suffix):**

| Suffix | Role |
|--------|------|
| **RC010** | Primary requirement |
| **RC010-A** | Architecture clarification / boundary |
| **RC010-B** | Production contract **recovery** (facts) |

**RC does not** replace CDR for explicit constitutional target decisions after recovery.

---

## 5. Production contract recovery records

**Type:** RECOVERY (filed under RC when RC-numbered)

**Purpose:** Recover **current production truth** without redesign.

**Rules:**

- State facts with evidence (production RPC, migrations, code line refs).
- Do **not** normalize workflows unless recording observed behavior.
- Do **not** authorize implementation.

**Example:** [`RC010-B-Production-Freeze-Contract-Recovery.md`](rc/RC010-B-Production-Freeze-Contract-Recovery.md) — **Completed**

---

## 6. Investigations

**Type:** INVESTIGATION

**Purpose:** Collect evidence, answer specific questions, preserve unknowns.

**Location:** [`docs/investigations/`](investigations/)

**Rules:**

- No constitutional decisions.
- May inform CDR.
- Status ends at **Completed** or **Superseded**.

**Example:** [`RC010-C-Voting-Eligibility-Contract.md`](investigations/RC010-C-Voting-Eligibility-Contract.md) — **Completed**

---

## 7. Constitutional decision records — CDR

**Type:** CDR

**Purpose:** Make an **explicit constitutional architecture decision** after evidence recovery.

**Location:** [`docs/cdr/`](cdr/)

**Rules:**

- CDR decides **target** contract — not production-as-is.
- **Approved** CDR is constitutionally binding for design and future implementation.
- CDR **does not** change production by itself.

**Example:** [`CDR-001-Voting-Eligibility-Decision.md`](cdr/CDR-001-Voting-Eligibility-Decision.md) — **Approved**

---

## 8. Milestones

**Type:** MILESTONE

**Purpose:** Define a **bounded body of work**, artifacts, gates, and acceptance.

**Location:** [`docs/milestones/`](milestones/)

**Examples:** M1, M1.5, M2

Milestones reference RC, CDR, investigations, and implementation records; they do not replace them.

---

## 9. Slice design records

**Type:** SLICE DESIGN

**Purpose:** Define the **exact implementation design** for a milestone slice (schema approach, RPC changes, UI gates, migration strategy, compatibility matrix).

**Location:** [`docs/implementation/`](implementation/)

**Naming example:** `M2-S3-Snapshot-Freeze-Design.md`

**Engineering standard:** All slice designs must comply with [`CES-001`](implementation/CES-001-Engineering-Standard.md) — including **CITM** (Constitutional Implementation Traceability Matrix) and the five required sections (Objective, Design, Migration, Verification, Constitutional Compliance).

**Template:** [`implementation/templates/Slice-Design-Template.md`](implementation/templates/Slice-Design-Template.md)

**Authorization:** Requires **Approved CDR** (and completed recovery where applicable). Status **Approved** on the design record.

**Does not** authorize code or production changes by itself.

---

## 10. Implementation authorization

**Type:** SLICE AUTHORIZATION

**Purpose:** **Explicitly permit** application code, schema, migration, and production contract changes.

**Location:** [`docs/implementation/`](implementation/)

**Naming example:** `M2-S3-Implementation-Authorization.md`

**Required before:** Any production behavior change intended to align with an approved CDR.

---

## 11. Release records

**Type:** RELEASE

**Purpose:** Group approved capabilities into a **governance release** (FR).

**Location:** [`docs/releases/`](releases/)

**Examples:** FR1 (Baseline Locked), FR2 (In Progress)

---

## 12. Era records

**Type:** ERA

**Purpose:** Record the project’s **constitutional development phase**.

**Location:** [`docs/eras/`](eras/)

**Examples:** Foundation Era (completed), Constitutional Implementation Era (active)

---

## 13. Status vocabulary

Canonical statuses and meanings:

| Status | Meaning |
|--------|---------|
| **Draft** | Work in progress; not submitted for approval |
| **Investigation** | Active fact-finding |
| **Proposed** | Submitted for governance approval |
| **Approved** | Governance-approved; binding for its type |
| **Rejected** | Not approved; do not implement |
| **Superseded** | Replaced by a newer record; preserved for history |
| **Completed** | Investigation or recovery finished (facts recorded) |
| **Blocked** | Cannot proceed until a gate clears |
| **Implementation Authorized** | Explicit permission to change code/schema/production |
| **Implemented** | Changes landed per authorization |
| **Verified** | Implemented and verified against contract |
| **Archived** | Retained for history only |

### Permitted transitions (examples)

```
Draft → Proposed → Approved → Superseded
Investigation → Completed
Recovery (RC010-B) → Completed
Proposed (CDR) → Approved
Slice Design: Draft → Proposed → Approved
Implementation: Approved Design → Implementation Authorized → Implemented → Verified
```

### What does **not** authorize implementation

- Draft
- Investigation
- Completed recovery
- Proposed CDR
- **Approved CDR alone**
- **Approved Slice Design alone**

**Implementation requires** a separate **Implementation Authorized** record.

---

## 14. Approval rules

| Record type | Approving authority |
|-------------|---------------------|
| Founding / RC000 | Baseline locked — amendment via formal constitutional process only |
| RC requirement | Constitutional Governance Committee or delegated RC process |
| CDR | **ClearStrata Constitutional Governance Committee** |
| Milestone / Release | Per MGS / CGE gates |
| Slice Design | Committee or delegated architecture review |
| Implementation Authorization | Committee + release gate |

Approved records must include: **Decision Authority**, **Decision date**, **Implementation authority**, **Production effect**.

---

## 15. Supersession rules

1. **Never delete** approved history.
2. Set **Superseded by** / **Supersedes** links.
3. Use annotations: *Clarified by CDR-001*, *Implementation gap identified by RC010-C*, *Superseded by CDR-001*.
4. Do **not** rewrite RC009 or other completed records to pretend later decisions always existed.

---

## 16. Historical preservation rules

- Baseline locked: Founding Constitution, RC000, CGDP, M1, M1.5, FR1 — **do not rewrite**.
- RC009 and completed bridge work — **preserve**; annotate only.
- Recovery and investigation facts remain valid even after CDR approval (they describe **what was true at recovery time**).

---

## 17. Source-of-truth rules

| Question | Source of truth |
|----------|-----------------|
| What must the platform do? | Approved **RC** + **RC000** |
| What should the platform do (target architecture)? | Approved **CDR** |
| What does production do today? | **Recovery** + **Investigation** + live verification |
| What may engineers implement now? | **Implementation Authorized** record only |
| What is the legal voter roll after freeze? | **CDR-001** (Approved) — not current RPC until implemented |

**Critical rule:** Production behavior is **evidence** of current reality. It **does not override** an approved CDR.

When production conflicts with approved CDR:

1. Record the gap (**Known Constitutional Implementation Gap**).
2. Do **not** silently rewrite history.
3. Do **not** describe production as constitutionally compliant.
4. Require **authorized migration and implementation plan**.

---

## 18. Naming conventions

| Kind | Pattern | Example |
|------|---------|---------|
| RC | `RC{n}` · `RC{n}-{suffix}` | RC010-A |
| CDR | `CDR-{nnn}` | CDR-001 |
| Investigation | `{Parent-ID}-{title}` | RC010-C |
| Milestone | `M{n}` | M2 |
| Slice design | `M{n}-S{k}-{title}` | M2-S3 |
| Release | `FR{n}` | FR2 |
| Recovery (RC) | `RC{n}-{suffix}` | RC010-B |

**Do not** renumber historical records. **Do not** reuse identifiers. **Do not** rename approved records for cosmetic reasons.

### Required metadata block

Every constitutional document should include where applicable:

- Identifier · Title · Type · Status · Authority · Parent · Milestone · Release
- Created date · Approved date
- Supersedes · Superseded by
- Implementation authority · Production effect

---

## 19. Indexing requirements

When adding or approving a constitutional record, update:

1. Category README (`rc/`, `cdr/`, `investigations/`, `implementation/`, etc.)
2. [`docs/README.md`](README.md)
3. Active milestone and release (e.g. M2, FR2)
4. Active era record if phase changes
5. [`STRUCTURE.md`](STRUCTURE.md) if hierarchy changes

When adding or approving a **slice design**, also verify **CES-001** compliance (CITM + five sections).

Indexes **link** to records; they do not duplicate full content.

---

## 20. Change-control checklist

Before merging documentation that affects constitutional contracts:

- [ ] Correct **type** (RC vs Investigation vs CDR vs Implementation)
- [ ] Correct **status** and transitions
- [ ] **Parent** and **traceability** links
- [ ] **Production effect** stated (usually None until implementation)
- [ ] **Gap** recorded if production ≠ approved CDR
- [ ] Indexes updated
- [ ] No baseline-locked document rewritten
- [ ] No implementation implied without **Implementation Authorized**
- [ ] Slice design includes **CITM** per **CES-001**
- [ ] Slice design uses five sections: Objective · Design · Migration · Verification · Constitutional Compliance

---

## 21. Engineering standards

**Type:** ENGINEERING STANDARD

**Purpose:** Permanent rules for constitutional traceability, slice structure, implementation discipline, and compliance verification across **all milestones** (M2, M3, M4, M5, …).

**Location:** [`docs/implementation/`](implementation/)

### CES-001 — ClearStrata Engineering Standard

| Field | Value |
|-------|-------|
| **Record** | [`CES-001-Engineering-Standard.md`](implementation/CES-001-Engineering-Standard.md) |
| **Status** | **Approved** |
| **Authority** | ClearStrata Constitutional Governance Committee |
| **Production effect** | **None** |

### CITM — Constitutional Implementation Traceability Matrix

Every engineering item (table, RPC, trigger, function, edge function, UI flow, migration, workflow, background job, scheduler, state machine) **must** appear in the CITM table within a Slice Design.

**Rule:** No CITM row → implementation **not authorized**.

Trace chain:

```
Requirement (RC) → Decision (CDR) → Production Gap → Implementation
```

### Engineering Slice Standard

Every slice design **shall** contain:

1. **Objective** — purpose, scope, out of scope, dependencies, success criteria, acceptance goal
2. **Design** — architecture, data model, workflow, state machine, RPC, API, UI, security, audit, performance
3. **Migration** — current vs target behavior, compatibility, sequence, rollback, deployment, risks
4. **Verification** — unit/integration tests, manual/SQL/UI validation, regression and acceptance checklists
5. **Constitutional Compliance** — CITM, compliance table, RC/CDR verification, known gaps

**Template:** [`implementation/templates/Slice-Design-Template.md`](implementation/templates/Slice-Design-Template.md)

### Implementation discipline

| Rule | Statement |
|------|-----------|
| Design does not authorize code | **Implementation Authorization** required |
| No CDR contradiction | Engineering cannot override Approved CDR |
| Production is evidence only | Not constitutional authority |
| Constitutional change path | Investigation → CDR → Approval → Updated Slice Design |
| No RC/CDR edits from engineering | Governance process only |

### Constitutional compliance

Every slice ends with a **Constitutional Compliance** section:

| Constitutional Source | Compliance | Evidence |
|-----------------------|------------|----------|
| RC / CDR | Pending / Complete | Description |

### Reference implementation

**M2 Slice 3** is the first slice required to fully comply with CES-001 and serves as the reference for all future slices.

---

## Traceability — M2 Slice 3 example

```
RC010-A (Approved) — boundary
RC010-B (Completed) — freeze production facts
RC010-C (Completed) — eligibility production facts
CDR-001 (Approved) — constitutional target
M2 Slice 3 Design (Authorized)
M2 Slice 3 Implementation (Not Authorized)
Production (unchanged; gap documented)
```

**Index:** [`README.md`](README.md)
