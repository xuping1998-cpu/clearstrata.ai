# System Architecture

**Constitution Reference:** Article I (traceability), Article VI (lifecycle), Article VII (memory)  
**Authority:** Subordinate to [`00_ClearStrata_Constitution.md`](00_ClearStrata_Constitution.md)

---

## Architectural Intent

ClearStrata architecture exists to **support transparent community governance at scale** — multi-property, multi-role, long-lived records.

Technology serves governance. Governance serves communities.

---

## High-Level Shape

```
┌─────────────────────────────────────────────────────────┐
│  Clients (Web PWA, future channels)                      │
│  React + TypeScript + Vite                               │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Vercel serverless API routes (privileged operations)      │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Supabase (single instance)                                │
│  Auth · Postgres · RLS · Storage · RPC                     │
└───────────────────────────────────────────────────────────┘
```

---

## Core Architectural Commitments

### 1. Single source of truth (governance memory)

Business governance state lives in **Postgres** with auditable history.  
Client state is ephemeral; **archives and votes are not**.

### 2. Property isolation

One Supabase instance; **isolation by `property_id`**.  
See [`SAAS_SYSTEM_CONSTRAINTS.md`](SAAS_SYSTEM_CONSTRAINTS.md).

### 3. One implementation per real flow

No parallel entry/join/vote flows for the same business path.  
See [`DOMAIN_AND_ENTRY_FLOW.md`](DOMAIN_AND_ENTRY_FLOW.md) and `.cursor/rules/domain-entry-flow-lock.mdc`.

### 4. Lifecycle-aligned modules

| Domain | Primary lifecycle phases |
|--------|-------------------------|
| Meetings & voting | Discuss → Meet → Vote → Archive |
| Announcements & notices | Discover → Discuss → Archive |
| Finance & procurement | Resolve → Execute → Audit |
| Council actions | Discover → Execute → Audit |
| Join & membership | Discover → Audit (access gate) |

### 5. Server-side enforcement for irreversible actions

Email fan-out, cross-user notifications, privileged writes, and idempotent governance actions run through **API routes or RPCs** with service role where appropriate — never solely from untrusted client logic.

---

## Domain Split (Production Target)

| Domain | Role |
|--------|------|
| `www.clearstrata.ai` | Marketing, read-only demo — **no business writes** |
| `app.clearstrata.ai` | Real login, entry, governance, admin |

During testing: use designated test app domain; do not mix marketing domain into real flows.

---

## Documentation Map

| Layer | Document |
|-------|----------|
| Constitution | `00_ClearStrata_Constitution.md` |
| Identity & tenancy | `SAAS_SYSTEM_CONSTRAINTS.md` |
| Entry flow | `DOMAIN_AND_ENTRY_FLOW.md` |
| Data & audit | `06_Data_Governance.md` |
| AI | `04_AI_Principles.md` |
| Decisions | `ADR/` |

---

## Architecture Decision Records

Significant structural choices require an ADR in [`ADR/`](ADR/) with **Constitution Reference** in the opening section.

---

## Non-Goals

Architecture must not optimize for:

- Hiding governance history for convenience
- Bypassing RLS for developer speed in production paths
- Duplicate workflows that fragment community memory
