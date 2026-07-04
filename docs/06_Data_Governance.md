# Data Governance

**Constitution Reference:** Article I (auditable), Article V (public by default), Article VII (Community Memory)  
**Authority:** Subordinate to [`00_ClearStrata_Constitution.md`](00_ClearStrata_Constitution.md)

---

## Purpose

Define how ClearStrata **stores**, **protects**, **traces**, and **preserves** community governance data.

---

## Data Is Tenancy-Bound

All tenant business data belongs to exactly one **`property_id`**.

See [`SAAS_SYSTEM_CONSTRAINTS.md`](SAAS_SYSTEM_CONSTRAINTS.md) for identity and isolation rules.

```
auth.uid() → property_members (active) → property_id → all tenant queries
```

Cross-property reads/writes are forbidden except explicit platform-admin design with ADR.

---

## Community Memory (Article VII)

Data classes that embody institutional memory:

| Class | Examples | Retention |
|-------|----------|-----------|
| **Meetings** | Agendas, minutes, archives, vote snapshots | Archive; do not silent-delete |
| **Votes** | Ballots, results, eligibility snapshots | Immutable after close |
| **Resolutions & actions** | Council actions, procurement authorizations | Audit + archive |
| **Notices** | `community_notifications`, governed email delivery logs | Traceable send history |
| **Finance evidence** | Invoices, audit reports, bank matches | Audit trail |
| **Membership history** | Join requests, approvals | Traceable access decisions |

**Prefer append-only or soft-archive over destructive delete** for governance artifacts.

---

## Transparency vs Confidentiality (Article V)

| Public to property members (default) | Restricted |
|--------------------------------------|------------|
| Community announcements | Personal contact details beyond need |
| Meeting notices (non-sealed) | Sealed ballot identity |
| Governance status on dashboard | Legal-privileged counsel notes (if stored) |

Schema and RLS must enforce role-based visibility — not UI-only hiding.

---

## Audit (Article I)

Sensitive operations require:

- **Who** (`created_by`, `triggered_by`, auth context)
- **When** (`created_at`, event timestamps)
- **What** (before/after or immutable event log)
- **Which property** (`property_id`)

Examples: email delivery ledgers, invoice audit logs, council action workflow events.

---

## Archive (Article VI)

Archiving means **frozen, queryable, permanent** — not hidden deletion.

Patterns in this codebase:

- Meeting `status = archived` + snapshot freeze
- Delivery / notification idempotency tables for traceability
- Archive snapshots for owner votes

New modules must define their **archive state** in Constitution Review.

---

## Notifications: Two Channels

| Channel | Table / path | Purpose |
|---------|--------------|---------|
| **Community** | `community_notifications` | Property-wide bulletin |
| **Personal** | `user_notifications`, `notifications` | Individual inbox |

Do not conflate channels — each serves different transparency rules (see UI principles).

---

## Database Change Process

1. Constitution Review for governance impact
2. ADR if structural or cross-cutting
3. Migration in `supabase/migrations/` with comments
4. RLS policies reviewed for Article V
5. Release note: Constitution Compliance

---

## AI and Data (Article III)

AI may read property-scoped data only within authorized RPC/API context.  
AI outputs stored as governance artifacts must record provenance (model, time, source refs) when used for decisions.

---

## Related Documents

- [`03_System_Architecture.md`](03_System_Architecture.md)
- [`02_Governance_Model.md`](02_Governance_Model.md)
- [`SAAS_SYSTEM_CONSTRAINTS.md`](SAAS_SYSTEM_CONSTRAINTS.md)
