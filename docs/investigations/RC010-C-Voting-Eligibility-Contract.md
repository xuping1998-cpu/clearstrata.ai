# RC010-C — Voting Eligibility Contract (Investigation)

| Field | Value |
|-------|-------|
| **Identifier** | RC010-C |
| **Title** | Voting Eligibility Contract |
| **Type** | Investigation |
| **Status** | **Completed** |
| **Parent** | RC010-A — Snapshot Constitutional Boundary |
| **Milestone** | M2 — Meeting Resolution Authoring |
| **Release** | FR2 — Governance Release |
| **Completed** | 2026-06-24 |
| **Superseded for constitutional target by** | [`CDR-001`](../cdr/CDR-001-Voting-Eligibility-Decision.md) (Approved) |
| **Implementation authority** | None |

> **Scope:** Production fact recovery only. This record does **not** authorize changes.

---

## 1. Purpose

Recover the production **voting eligibility contract** for formal Owner Voting, focusing on `submit_owner_vote` vs `submit_owner_election_ballot`.

---

## 2. Executive finding

Production operates **two different eligibility contracts**:

| Path | RPC | Eligibility source (production) |
|------|-----|----------------------------------|
| Resolution voting | `submit_owner_vote` | **Live** `property_members` |
| Election voting | `submit_owner_election_ballot` | **`owner_vote_voter_snapshot`** |

`submit_owner_vote` does **not** read `snapshot_frozen_at` or `owner_vote_voter_snapshot`.

---

## 3. Production `submit_owner_vote` (recovered)

**Source:** Linked Supabase `pg_get_functiondef` (2026-06-24). Matches repo `20261223130000_fix_owner_vote_status_enum.sql`.

| Property | Value |
|----------|-------|
| Signature | `(p_resolution_id uuid, p_choice text)` |
| Returns | `jsonb` `{"ok": true}` |
| Security | `SECURITY DEFINER` |
| Eligibility | Active `property_members` row with `unit_no`; **LIMIT 1**; no role filter |
| V3 bound meetings | Bypass OV open/freeze/window; council `scheduled_at..+14d` |
| Legacy path | Requires OV `status = open` and `[voting_opens_at, voting_closes_at]` |
| Snapshot / freeze | **Not checked** |
| Ballot | UPDATE then INSERT on `(resolution_id, voter_user_id)` |
| Audit | None in RPC |

Historical note: `20260511120000_submit_owner_vote_time_gate.sql` **did** use `owner_vote_voter_snapshot`; production superseded that path.

---

## 4. UI vs RPC

| Layer | Resolution eligibility |
|-------|------------------------|
| UI (`MeetingDetail`, vote panel) | Often gates on **`owner_vote_voter_snapshot`** |
| RPC (`submit_owner_vote`) | **`property_members`** |

Direct RPC can succeed when UI shows ineligible (and vice versa in edge cases).

---

## 5. Freeze enforcement (production)

| Question | Production answer |
|----------|---------------------|
| `snapshot_frozen_at` required for submit? | **No** |
| Post-freeze join | **Can vote** if active member |
| Post-freeze removal | **Cannot vote** if not active |
| Post-freeze unit change | **Uses live unit** at submit time |

---

## 6. Resolution instrument (production)

Votes bind to **`owner_vote_resolutions.id`** (live row). No immutable frozen resolution content in submit path.

---

## 7. Unknowns preserved

- Exact date production dropped snapshot check from `submit_owner_vote`
- Full legacy meeting row audit for pre-v3 contracts

---

## 8. Constitutional follow-on

Facts in this investigation informed **[`CDR-001`](../cdr/CDR-001-Voting-Eligibility-Decision.md) (Approved)**, which defines the **target** contract. Production remains unchanged until authorized implementation.

**Clarified by CDR-001:** eligibility shall converge on frozen snapshot; production gap documented in M2.

---

## 9. Traceability

| Record | Role |
|--------|------|
| RC010-B | Freeze RPC facts |
| **RC010-C** | Eligibility RPC facts (this) |
| CDR-001 | Constitutional decision |
