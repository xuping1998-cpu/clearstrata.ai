# Constitutional Decision Records (CDR)

CGDP **LEVEL 3 — Architecture decisions** (constitutional target state).

A **CDR** records an explicit constitutional and architectural **decision**. It is distinct from:

| Type | Role |
|------|------|
| **RC** | Requirement / boundary records |
| **RC010-B** | Production contract recovery (facts) |
| **RC010-C** | Investigation records (facts) |
| **CDR** | **Target constitutional contract** (decisions) |
| **Implementation specs / migrations** | Authorized only after CDR + design gate |

**Authority:** RC000 · CGDP · CGE

---

## Active / approved

| CDR | Title | Status | Record |
|-----|-------|--------|--------|
| **CDR-001** | Voting Eligibility and Freeze Semantics | **Approved** | [`CDR-001-Voting-Eligibility-Decision.md`](CDR-001-Voting-Eligibility-Decision.md) |

**Governance standard:** [`DOCUMENT-GOVERNANCE.md`](../DOCUMENT-GOVERNANCE.md)

---

## Traceability chain (M2 Slice 3)

```
RC010-A — Approved
RC010-B — Completed (recovery)
RC010-C — Completed (investigation)
CDR-001 — Approved (constitutional target)
M2 Slice 3 Design — Authorized
M2 Slice 3 Implementation — Not Authorized
Production — Unchanged; not fully compliant with CDR-001
```

---

## Known Constitutional Implementation Gaps (CDR-001)

**Label:** Known Constitutional Implementation Gap — not described as regression unless historical intent is independently proven.

| Production fact (today) | Approved target (CDR-001) |
|-------------------------|---------------------------|
| `submit_owner_vote` uses **live** `property_members` | **`owner_vote_voter_snapshot`** after Freeze |
| No `snapshot_frozen_at` required for resolution vote submit | Formal voting after completed Freeze |
| V3 **14-day unified** submit window on council `scheduled_at` | **7d authoring → freeze → 7d** formal voting (Owner Requisitioned SGM) |
| Votes bind to **mutable** `owner_vote_resolutions` IDs | **Immutable frozen resolution instrument** |
| Automatic freeze is **client-triggered** | **Server/database primary**; client fallback only |
| `freeze_owner_vote_snapshot` can **rebuild** existing snapshot | **Immutable at freeze** |

**Full table:** [`M2-Meeting-Resolution-Authoring.md` §6c](../milestones/M2-Meeting-Resolution-Authoring.md#6c-known-constitutional-implementation-gaps)

**Clarified by:** CDR-001 · **Implementation gap identified by:** RC010-C

---

## Filing convention

```
docs/cdr/CDR-{nnn}-{short-title}.md
```

**Architecture index:** [`docs/Architecture/README.md`](../Architecture/README.md)
