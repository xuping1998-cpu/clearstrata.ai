# CES-003 — Frontend Engineering Standard

| Field | Value |
|-------|-------|
| **Identifier** | CES-003 |
| **Title** | Frontend Engineering Standard |
| **Type** | Engineering Standard |
| **Status** | **Approved** |
| **Standard version** | **v1.1** |
| **Authority** | ClearStrata Constitutional Governance Committee |
| **Approved** | 2026-06-24 (v1.0) · **v1.1** 2026-07-31 |
| **Parent** | [`CES-001-Engineering-Standard.md`](CES-001-Engineering-Standard.md) · [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md) |
| **Milestone** | All (M2, M3, M4, M5, …) |
| **Release** | FR2+ |
| **Implementation authority** | None (standard only) |
| **Production effect** | **None** |

**Applies to:** Every future frontend artifact — React pages, components, hooks, routes, permissions, UI state, workflows, and localization.

**Related:** [`CES-001-Engineering-Standard.md`](CES-001-Engineering-Standard.md) · [`CES-002-Database-Engineering-Standard.md`](CES-002-Database-Engineering-Standard.md) · [`CDS-001`](../design-system/CDS-001_ClearStrata_Design_System.md) · [`Slice-Design-Template.md`](templates/Slice-Design-Template.md)

> **Scope lock:** This standard governs frontend engineering documentation and discipline. It does **not** authorize application code changes or production behavior changes.

---

## 1. Frontend philosophy

The frontend **shall reflect constitutional truth** — not invent it.

| Principle | Rule |
|-----------|------|
| **Reflect, not define** | UI displays and triggers approved constitutional workflows; it does **not** become the source of truth |
| **Business rules in contracts** | Business rules belong to Approved **RC**, **CDR**, **RPC**, and database contracts — not ad hoc client logic |
| **Server authority** | Eligibility, freeze, vote binding, and permissions are enforced by RPC/database; UI gates are supplementary |
| **No constitutional redefinition** | Frontend **shall not** encode constitutional decisions undocumented in RC/CDR |
| **Production is evidence** | Current UI behavior informs recovery/investigation — not the design target |
| **Traceability** | Every page, route, component, permission, and workflow must appear in **CITM** (see §9) |

When the UI exposes behavior that contradicts an Approved CDR, record a **Known Constitutional Implementation Gap** — do not treat the UI as compliant.

---

## 2. Routing standard

Every route **shall** be documented in Slice Design **Design → UI Flow**.

### 2.1 Required route documentation

| Field | Required content |
|-------|------------------|
| **Purpose** | Constitutional workflow served (e.g. owner entry, join pending, meeting vote) |
| **Authority** | Public, authenticated, council-only, admin, or membership-gated |
| **Permission** | RC/CDR-derived access rule; active membership requirements |
| **Dependencies** | Auth state, `property_id`, query params, bypass rules for entry/login/join |
| **Navigation** | Entry points, redirects, return URLs (e.g. `/login?redirect=`) |
| **Audit impact** | Whether route access or actions emit audit-relevant events |

### 2.2 Routing rules

- Fixed constitutional routes **shall not** be duplicated (`/entry`, `/login`, `/join/pending`, `/join/rejected`, `/`, `/admin/*` per domain-entry-flow-lock).
- Routes that bypass membership guards **shall** be explicitly listed and justified (entry, login, join flows).
- Redirect logic **shall** preserve full query strings where constitutionally required (e.g. entry URL after login).
- Route guards **shall** align with server-side enforcement — guards alone are insufficient for security.

---

## 3. Page standard

Every page **shall** be documented in Slice Design.

### 3.1 Required page documentation

| Field | Required content |
|-------|------------------|
| **Purpose** | User goal and constitutional layer (Governance, Meeting, Voting, Admin) |
| **Inputs** | URL params, context, props, user selections |
| **Outputs** | RPC calls, navigation, displayed state, toasts |
| **Permissions** | Who may view/act; pending vs active membership behavior |
| **Loading** | Skeleton/spinner strategy; dependency on auth/property context |
| **Errors** | User-visible messages; recovery paths; no silent failures |
| **Accessibility** | Headings, landmarks, focus order, forms, dialogs per CDS-001 |

### 3.2 Page rules

- Pages **shall not** depend on undeclared global context for constitutional flows (e.g. `/entry` must not require `currentPropertyId` readiness to render).
- Pages **shall** handle loading, empty, error, and forbidden states explicitly.
- Major pages **shall** include manual UI validation steps in Slice Design **Verification**.

---

## 4. Component standard

Every governance-significant component **shall** be documented when introduced or materially changed.

### 4.1 Required component documentation

| Field | Required content |
|-------|------------------|
| **Responsibility** | Single clear purpose; no hidden constitutional authority |
| **Props** | Typed inputs; required vs optional; constitutional data sources |
| **State** | Local vs lifted vs context; what is derived vs authoritative |
| **Events** | Callbacks, RPC triggers, navigation side effects |
| **Dependencies** | Hooks, context, RPC, child components |
| **Localization** | Translation keys used; no hard-coded business text |
| **Performance** | Memoization, list virtualization, effect frequency where relevant |

### 4.2 Component rules

- Presentational components **shall** receive data via props — not fetch authoritative governance state independently unless documented.
- Components **shall not** duplicate RPC validation logic as the sole enforcement layer.
- Reusable components **shall** follow [`CDS-001`](../design-system/CDS-001_ClearStrata_Design_System.md) for visual, interaction, and accessibility standards.

---

## 5. Hook standard

Hooks encapsulate reusable React logic. Governance hooks **shall** comply with the following.

### 5.1 Hook rules

| Rule | Standard |
|------|----------|
| **Deterministic** | Same inputs produce same behavior; no hidden randomness or race-dependent authority |
| **No business authority** | Hooks **shall not** be the sole enforcer of eligibility, freeze, or vote rules |
| **No hidden mutations** | Side effects (RPC, navigation, storage) must be explicit and documented |
| **Document dependencies** | `useEffect` deps, context requirements, and RPC contracts documented in Slice Design |
| **Naming** | `use{Domain}{Purpose}` — e.g. `useOwnerVoteEligibility` |

### 5.2 Prohibited patterns

- Hooks that auto-freeze or auto-submit votes as **primary** constitutional mechanism (server/database is primary per CDR-001; client may be fallback only).
- Hooks that infer permissions from UI state alone without server confirmation.
- Hooks that persist `currentPropertyId` except where CDR explicitly permits (`auto_approved`, `already_member`).

---

## 6. Permission standard

Every permission **shall** trace through the full stack.

### 6.1 Permission traceability chain

```
RC / CDR (constitutional requirement)
    ↓
Database permission (RLS, role, membership status)
    ↓
RPC validation (authoritative on mutate)
    ↓
UI gate (hide/disable/route redirect)
```

### 6.2 Required permission documentation

| Layer | Document |
|-------|----------|
| **RC source** | Which requirement grants or denies access |
| **CDR source** | Which decision defines eligibility or workflow gate |
| **Database permission** | RLS policy, membership status, council role |
| **UI gate** | Route guard, conditional render, disabled control |
| **RPC validation** | Function that rejects unauthorized calls |

**Rule:** UI gates **shall not** assume permissions. Every gated action **shall** have RPC validation. A UI-only gate is **not** sufficient for governance mutations.

---

## 7. State standard

Every UI workflow with governance significance **shall** define a state machine in Slice Design **Design → State Machine**.

### 7.1 Required state machine documentation

| Field | Required content |
|-------|------------------|
| **States** | Named states (e.g. authoring, frozen, voting_open, submitted) |
| **Transitions** | Events that move between states |
| **Authority** | Who may trigger each transition (owner, council, system/scheduler) |
| **Error recovery** | Invalid transition handling; user messaging |
| **Audit impact** | Whether transition emits audit or aligns with audit table |

### 7.2 State rules

- Client state **shall** reflect server truth after RPC success — optimistic UI requires documented rollback.
- State machines **shall** align with Approved CDR timing (e.g. 7d authoring → freeze → 7d voting for Owner Requisitioned SGM).
- `useEffect`-driven automatic state transitions **shall** be documented as fallback/recovery only when CDR requires server-primary automation.

---

## 8. Localization standard

All user-facing UI **shall** support bilingual presentation.

### 8.1 Required languages

| Language | Requirement |
|----------|-------------|
| **Chinese** | Full support for governance-facing text |
| **English** | Full support for governance-facing text |

### 8.2 Localization rules

| Rule | Standard |
|------|----------|
| **No hard-coded business text** | Governance labels, errors, statuses, and workflow copy use translation keys |
| **Translation keys required** | Every new user-visible string has a key in the i18n catalog |
| **Key naming** | `{domain}.{feature}.{element}` — e.g. `ownerVote.freeze.confirmTitle` |
| **Bilingual clarity** | Per CDS-001 — both languages must convey the same constitutional meaning |
| **Interpolation** | Dynamic values via i18n placeholders — not string concatenation |
| **Audit/display** | Server-stored audit reason codes may be machine keys; UI maps to localized labels |

### 8.3 Exceptions

- Developer-only debug output (non-production).
- Proper nouns and legal identifiers that must not be translated (document in Slice Design).

---

## 9. UI traceability (CITM)

Every frontend engineering artifact **must** appear in the **Constitutional Implementation Traceability Matrix** defined in [`CES-001`](CES-001-Engineering-Standard.md).

### 9.1 Mandatory CITM coverage (frontend)

| Object type | CITM required |
|-------------|---------------|
| **Page** | Yes |
| **Route** | Yes |
| **Component** | Yes (when governance-significant) |
| **Hook** | Yes (when governance-significant) |
| **Permission / UI gate** | Yes |
| **Workflow / state machine** | Yes |
| **Client auto-action** | Yes (e.g. auto-freeze useEffect) |

### 9.2 CITM row template (frontend)

| Engineering Item | RC Source | CDR Source | Production Reality | Constitutional Target | Gap | Slice |
|------------------|-----------|------------|--------------------|-----------------------|-----|-------|
| `{page \| route \| component}` | {RC} | {CDR §} | {current UI behavior} | {approved target} | {gap or —} | {M{n}-S{k}} |

**Rule:** No CITM row → frontend implementation **not authorized**.

---

## 10. Design rules — frontend shall NOT

| Prohibition | Rationale |
|-------------|-----------|
| **Duplicate database authority** | RPC and RLS are authoritative; UI must not be sole source of eligibility or freeze truth |
| **Duplicate constitutional decisions** | RC/CDR define targets; UI implements — does not redefine |
| **Assume permissions** | Membership, council role, and freeze state must be verified server-side |
| **Bypass RPC** | No direct client writes that skip validated RPC for governance mutations |
| **Hard-code business rules** | Timing windows, thresholds, and eligibility belong in documented contracts |
| **Use production UI as design target** | Recovery facts inform gaps — CDR defines target |

---

## 11. Verification (frontend)

Every authorized frontend change **shall** include verification in Slice Design §4:

| Check | Method |
|-------|--------|
| Route guards | Navigate as unauthorized/pending/active user |
| Permission gates | Attempt gated actions; confirm RPC rejection |
| State machine | Manual journey through all states and transitions |
| Localization | Both Chinese and English render correctly |
| Accessibility | Keyboard, focus, screen reader, forms per CDS-001 |
| Regression | Existing flows (entry, login, join, home) unchanged unless in scope |
| Error handling | Network/RPC failure surfaces user-visible recovery |

---

## 12. Permanent frontend rules

| # | Rule |
|---|------|
| **FE-1** | Frontend reflects Approved RC/CDR — not undocumented production UI |
| **FE-2** | Every page, route, component, permission, and workflow appears in **CITM** |
| **FE-3** | Every route documents purpose, authority, permission, dependencies, navigation, audit impact |
| **FE-4** | Every page documents inputs, outputs, permissions, loading, errors, accessibility |
| **FE-5** | Hooks are deterministic; no hidden mutations; no sole business authority |
| **FE-6** | Permissions trace RC/CDR → database → RPC → UI gate |
| **FE-7** | All UI supports Chinese and English via translation keys — no hard-coded business text |
| **FE-8** | No frontend deploy without **Implementation Authorization** |
| **FE-9** | New domain data access **shall** use an approved typed repository or domain service — not direct Supabase table access from React (see §15) |

---

## 13. Relationship to CES-001 and CES-002

| Standard | Scope |
|----------|-------|
| **CES-001** | Slice structure, CITM, compliance, engineering discipline |
| **CES-002** | Database schema, RPC, migration, audit, snapshot |
| **CES-003** | React pages, components, hooks, routes, permissions, state, localization, typed repositories |
| **CES-002 (read alignment)** | Repositories reflect deployed schema and RPC contracts; they do not replace RLS or RPC authority |

All Slice Design **Design** sections for frontend work **shall** comply with **CES-001** and **CES-003**. Where UI triggers database actions, **CES-002** RPC contracts **shall** align.

**M2 Slice 3** frontend work (e.g. `MeetingDetail` freeze UX, vote submit flows, eligibility display) shall be the first frontend work documented under CES-001 + CES-003 together (with CES-002 for RPC alignment).

---

## 14. Filing convention

| Kind | Pattern | Example |
|------|---------|---------|
| Frontend Engineering Standard | `CES-{nnn}-{title}.md` | CES-003 |
| Slice Design UI section | Documented in `M{n}-S{k}-*.md` | M2-S3-Snapshot-Freeze-Design |
| Translation keys | Project i18n catalog | `ownerVote.*` |
| Typed domain repository | `src/lib/{domain}/` | `src/lib/ownerVote/snapshotDomain/` |

---

## 15. Repository First Rule

Frontend application layers **shall** access domain data through an approved typed repository, service, or domain API.

### 15.1 Preferred dependency direction

```
React Page / Component
        ↓
Hook or View Model
        ↓
Typed Repository / Domain Service
        ↓
Supabase Client / RPC / Backend API
```

The following dependency direction is **prohibited** for **new** domain implementation:

```
React Page / Component
        ↓
Direct Supabase table access
```

### 15.2 Purpose

The Repository First Rule exists to provide:

- Strong typing
- Stable domain contracts
- Centralized data mapping
- Testability
- Consistent error handling
- Schema-change isolation
- Legacy compatibility
- Clear separation between UI and persistence

### 15.3 Repository responsibilities

A frontend repository **may**:

- Read domain records
- Map database rows into typed domain models
- Normalize nullable and legacy fields
- Validate returned data shape
- Provide stable query interfaces
- Return explicit typed errors

A repository **shall not** silently become the source of business authority.

### 15.4 Business authority

Business authority **shall** remain in the appropriate approved layer:

- Database constraints
- RLS
- RPC validation
- Backend or domain contract
- Approved state machine

Frontend repositories **shall not**:

- Redefine permissions
- Bypass RPC validation
- Invent eligibility
- Change constitutional workflow rules
- Infer authorization from UI state alone

### 15.5 Read and write separation

Read repositories and mutation services **should** be separated where practical.

| Layer | Permitted operations |
|-------|----------------------|
| **Read repository** | SELECT · Map · Validate · Return |
| **Mutation service** | Authorized writes only through approved RPCs or backend contracts |

React components **shall not** directly perform domain table INSERT, UPDATE, or DELETE operations for **new** implementation work.

### 15.6 Typing standard

Repositories **shall** expose explicit domain types.

Do **not** expose:

- `any`
- Untyped database responses
- Raw Supabase row shapes directly to UI components, unless the row type is itself the approved domain contract

**Preferred example:** `FrozenMeetingBundle` containing Meeting, Freeze Event, Voter Snapshot[], Resolution Snapshot, and Frozen Motion[] — see [`E-01-IU-4.1-Completion.md`](E-01-IU-4.1-Completion.md).

### 15.7 Error handling

Repositories **shall** provide predictable error contracts.

They **shall** distinguish, where applicable:

- Not found
- Unauthorized
- Incomplete legacy data
- Database query failure
- Invalid domain shape
- Partial snapshot state

UI components **shall** render repository results and errors; they **shall not** reinterpret database errors as domain authority.

### 15.8 Legacy compatibility

This rule applies **immediately** to:

- New domain modules
- New repositories
- New pages
- New snapshot integrations
- Material rewrites of existing data-access paths

Existing direct Supabase access is considered **legacy technical debt**.

This standard update does **not** authorize or require a platform-wide refactor. Legacy access **shall** be migrated incrementally through separately authorized implementation work.

### 15.9 Exceptions

Direct Supabase access from a React component is permitted **only** when **all** conditions are met:

1. The access is trivial and non-domain-bearing.
2. No reusable domain contract is involved.
3. No authorization or workflow decision is made.
4. The exception is documented in code review.
5. The access does not create a second source of truth.

An exception **shall not** be used for:

- Voting
- Governance
- Finance
- Procurement
- Membership authority
- Snapshot state
- Legal or audit records

### 15.10 CITM traceability

Every new repository, service, or direct-access exception **shall** map to the applicable CITM row or authorized engineering scope.

A repository with no approved engineering traceability **shall not** be introduced.

### 15.11 E-01 reference implementation

**E-01 Phase 4 / IU-4.1** ([`E-01-IU-4.1-Completion.md`](E-01-IU-4.1-Completion.md)) is the **first reference implementation** of the Repository First Rule.

IU-4.1:

- Creates typed dual-snapshot read models (`FrozenMeetingBundle` and related types)
- Centralizes snapshot reads in `src/lib/ownerVote/snapshotDomain/`
- Remains read-only
- Preserves legacy behavior (`legacy_meeting` read mode)
- Avoids UI and business-rule changes

---

## 16. Revision history

| Version | Date | Note |
|---------|------|------|
| **v1.0** | 2026-06-24 | Initial approved standard |
| **v1.1** | 2026-07-31 | Repository First Rule added for typed domain data access and E-01 Phase 4 reference implementation |

---

**Parent standard:** [`CES-001-Engineering-Standard.md`](CES-001-Engineering-Standard.md) · **Database:** [`CES-002-Database-Engineering-Standard.md`](CES-002-Database-Engineering-Standard.md) · **Governance:** [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md)
