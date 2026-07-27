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
├── implementation/        ← Slice design + implementation authorization + CES-001 + CES-002 + CES-003
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

**Engineering standard:** All slice designs must comply with [`CES-001`](implementation/CES-001-Engineering-Standard.md), [`CES-002`](implementation/CES-002-Database-Engineering-Standard.md) where database work applies, and [`CES-003`](implementation/CES-003-Frontend-Engineering-Standard.md) where frontend work applies — including **CITM** and the five required sections (Objective, Design, Migration, Verification, Constitutional Compliance).

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

When adding or approving a **slice design**, also verify **CES-001** compliance (CITM + five sections), **CES-002** for database objects, and **CES-003** for frontend objects.

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
- [ ] Database objects comply with **CES-002** (schema, migration, RPC, trigger, audit, snapshot)
- [ ] Frontend objects comply with **CES-003** (routes, pages, components, hooks, permissions, state, localization)
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

### CES-002 — Database Engineering Standard

| Field | Value |
|-------|-------|
| **Record** | [`CES-002-Database-Engineering-Standard.md`](implementation/CES-002-Database-Engineering-Standard.md) |
| **Status** | **Approved** |
| **Authority** | ClearStrata Constitutional Governance Committee |
| **Production effect** | **None** |
| **Parent** | CES-001 |

Governs every future **database** artifact: tables, views, indexes, constraints, migrations, RPCs, triggers, functions, audit tables, snapshot tables, schedulers, and storage schema.

**Database philosophy:** The database implements the approved constitutional model; it does not redefine constitutional decisions; production convenience never overrides constitutional correctness.

**Database CITM:** Every table, RPC, trigger, and migration must appear in the CITM — no row, not authorized.

**Covers:** Schema standards · Migration standard · RPC standard · Trigger standard · Audit standard · Snapshot standard

### CES-003 — Frontend Engineering Standard

| Field | Value |
|-------|-------|
| **Record** | [`CES-003-Frontend-Engineering-Standard.md`](implementation/CES-003-Frontend-Engineering-Standard.md) |
| **Status** | **Approved** |
| **Authority** | ClearStrata Constitutional Governance Committee |
| **Production effect** | **None** |
| **Parent** | CES-001 |

Governs every future **frontend** artifact: React pages, components, hooks, routes, permissions, UI state, workflows, and localization.

**Frontend philosophy:** Frontend reflects constitutional truth; it does not become the source of truth; business rules belong to approved constitutional contracts.

**UI CITM:** Every page, route, component, permission, and workflow must appear in the CITM — no row, not authorized.

**Covers:** Routing · Pages · Components · Hooks · Permissions · State machines · Localization (Chinese + English)

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

**M2 Slice 3** is the first slice required to fully comply with CES-001, CES-002 (database), and CES-003 (frontend), and serves as the reference for all future slices.

---

## 22. Governance Framework Freeze

**Governance Framework Version 1.0** is **Approved** and **frozen** as of 2026-06-24.

**Record:** [`GOVERNANCE-FREEZE-v1.0.md`](GOVERNANCE-FREEZE-v1.0.md)

The governance architecture defined by:

- Founding Constitution
- RC (Requirement Constitution)
- CDR (Constitutional Decision Records)
- CES (Engineering Constitution)
- Document Governance (this standard)
- Document Authority Order
- Engineering Slice Standard
- CITM (Constitutional Implementation Traceability Matrix)

is considered **Governance Framework Version 1.0**.

**Framework evolution shall be exceptional rather than continuous.**

Future evolution follows:

```
Investigation
    ↓
New CDR
    ↓
Approval
    ↓
Framework Update
```

Future work should **prioritize implementation** under the approved framework rather than redesigning governance documentation.

**Existing approved constitutional documents shall not be rewritten** to reflect later architectural decisions.

---

## 23. Governance Stability Principle

The governance framework is intentionally designed to evolve **more slowly** than engineering implementation.

| Layer | Expected evolution rate |
|-------|-------------------------|
| **Governance** (Founding · RC · CDR · DOCUMENT-GOVERNANCE) | Slow · exceptional |
| **Engineering Constitution** (CES) | Slow · new standards via approval |
| **Slice Design** | Per milestone slice |
| **Implementation** | Continuous under authorization |

**Engineering implementation is expected to evolve continuously.** Approved constitutional records should **remain stable**. Framework evolution shall be **exceptional rather than routine**.

### Principles

1. **Governance stability** — The framework exists so engineering can move fast *within* clear boundaries.
2. **Implementation velocity** — Slice design and code iterate; governance does not redesign per sprint.
3. **Record permanence** — Approved RC, CDR, and CES are not rewritten to match later implementation.
4. **Production is not authority** — Production behavior is evidence for gaps; it does not override Approved CDR.
5. **Exceptional framework change** — Governance updates require the full constitutional path, not ad hoc edits.

### Required path for future governance changes

```
Investigation
    ↓
New CDR
    ↓
Governance Approval
    ↓
Framework Update
```

**Production behavior SHALL NOT become constitutional authority.**

**Approved constitutional records SHALL NOT be rewritten** to reflect later implementation.

**Record:** [`GOVERNANCE-FREEZE-v1.0.md`](GOVERNANCE-FREEZE-v1.0.md) · **Era:** [`eras/Engineering-Implementation-Era-v1.0.md`](eras/Engineering-Implementation-Era-v1.0.md) · **Working convention:** [`WORKING-WITH-CURSOR.md`](WORKING-WITH-CURSOR.md)

---

## 24. Framework Boundary Rule

The Governance Framework exists to **support engineering**, not to become an engineering product itself.

If a new engineering task can be completed **within the existing Governance Framework**, the framework **SHALL NOT** be expanded.

New **RC**, **CDR**, **CES**, or governance documents shall only be introduced when an **actual architectural gap** cannot be resolved using the existing framework.

**Engineering shall adapt to the framework.**

The framework shall evolve **only when constitutionally necessary**.

---

## 25. Versioning Policy

The Governance Framework follows **independent lifecycle policies** by layer.

| Layer | Version | Expected change rate | Revision type |
|-------|---------|----------------------|---------------|
| **Governance Framework** | v1.x | **Very low** | Major constitutional evolution only |
| **Engineering Constitution (CES)** | v1.x | **Low** | Incremental engineering standards |
| **Slice Design** | Feature-specific | **Medium** | Per feature |
| **Implementation** | — | **Continuous** | Ongoing authorized engineering |
| **Verification** | — | **Continuous** | Ongoing validation and QA |
| **Production** | — | **Continuous** | Ongoing deployed behavior (evidence only) |

The **stability of the Governance Framework** allows implementation to evolve rapidly without repeatedly redesigning governance.

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
