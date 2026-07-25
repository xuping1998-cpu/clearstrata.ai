# RC010-B — Production Freeze Contract Recovery

| Field | Value |
|-------|-------|
| **Title** | RC010-B — Production Freeze Contract Recovery |
| **Type** | Production Contract Recovery Record |
| **Parent** | RC010-A — Snapshot Constitutional Boundary |
| **Milestone** | M2 — Meeting Resolution Authoring |
| **Release** | FR2 — Governance Release |
| **Status** | **Completed** |
| **Implementation authority** | None |

**Parent:** [`RC010-A-Snapshot-Constitutional-Boundary.md`](RC010-A-Snapshot-Constitutional-Boundary.md)

**Prerequisite for:** M2 Slice 3 Design (not Implementation)

> **Scope lock:** Read-only investigation and documentation. No application code, schema, migrations, production data, or production behavior changes.

---

## 1. Record metadata

| Field | Value |
|-------|-------|
| **Title** | RC010-B — Production Freeze Contract Recovery |
| **Type** | Production Contract Recovery Record |
| **Parent** | RC010-A — Snapshot Constitutional Boundary |
| **Milestone** | M2 — Meeting Resolution Authoring |
| **Release** | FR2 — Governance Release |
| **Status** | **Completed** |
| **Implementation authority** | None |

---

## 2. Purpose

Recover and document the **current production freeze contract** before any Snapshot Freeze redesign or Slice 3 implementation.

RC010-B answers:

- What does `freeze_owner_vote_snapshot` actually do in production?
- Who calls it, when, and under which meeting workflows?
- How do meeting types differ in freeze mode, timing, and lifecycle?
- Where do frontend behavior, migration history, and production RPC agree or conflict?

This record is **fact recovery only**. It does not normalize workflows or authorize changes.

---

## 3. Core principle

**Freeze behavior is workflow-specific, not platform-wide.**

凍結方式由會議工作流決定，而不是由平台統一決定。

Each meeting type must be investigated separately. RC010-B does not assume a single freeze model across all remote-written meetings.

---

## 4. Scope and non-scope

### In scope

- Production RPC recovery for `freeze_owner_vote_snapshot`
- All application and database paths that initiate or depend on freeze
- Per-meeting-type freeze workflow matrix
- State transitions, manual vs automatic behavior, historical changes
- RC009 compatibility boundaries
- Contradictions between constitutional intent, code, and production

### Out of scope

- Implementation, schema design, or migration authoring
- Resolution snapshot design (deferred to Slice 3 design after this record)
- Redesign of Owner Requisitioned SGM timing
- Normalization of V3 14-day participation vs 7+7 constitutional model

---

## 5. Known constitutional facts (preserved)

| # | Fact | RC010-B treatment |
|---|------|-------------------|
| 1 | Owner Requisitioned SGM canonical intent: 7d authoring → auto freeze → 7d voting | Documented as **constitutional intent**; compared to observed code/production |
| 2 | Owner Requisitioned SGM automatic freeze is distinct from other workflows | Confirmed in matrix |
| 3 | Council AGM/SGM/Remote/Hybrid may differ | Investigated separately |
| 4 | Other workflows may have shifted from manual to automatic | Historical timeline recorded |
| 5 | Truth must come from code, migrations, and production | Production RPC recovered via linked Supabase project |
| 6 | RC009 bridges must be preserved | §20 |
| 7 | RC010-B does not authorize implementation | §25 |

---

## 6. Evidence sources

| Source | Role | Confidence |
|--------|------|------------|
| **Linked Supabase production DB** (`wqohkxtqozscmwfrryfl`) via `supabase db query --linked` | Authoritative RPC + column metadata | **High** |
| **Repository migrations** (`supabase/migrations/`) | Partial RPC history; no `freeze_owner_vote_snapshot` CREATE | **Partial** |
| **Application code** (`MeetingDetail.tsx`, `OwnerVotingInlineControlBar.tsx`, `MeetingEditor.tsx`, `api.ts`, `meetingFormatModel.ts`) | Triggers, UI gates, timing math | **High** |
| **RC010-A** | Constitutional boundary (parent) | **Normative** |
| **Git history** | Introduction timing of freeze UI and v3 | **Medium** |

**Evidence classification used throughout:**

- **Confirmed by production database**
- **Confirmed by current application code**
- **Confirmed by migration history**
- **Documented intent only**
- **Inference**
- **Unknown**

---

## 7. Production RPC recovery

### 7.1 Recovery status

| Item | Status |
|------|--------|
| Production definition recovered | **Yes** |
| Source | `pg_get_functiondef` on linked Supabase project (2026-06-23 investigation) |
| Present in repository migrations | **No** |
| Overloads found | **No** (single signature) |

### 7.2 Signature and metadata

| Property | Value | Source |
|----------|-------|--------|
| **Name** | `public.freeze_owner_vote_snapshot` | Production |
| **Arguments** | `p_meeting_id uuid` | Production |
| **Returns** | `jsonb` | Production |
| **Language** | `plpgsql` | Production |
| **Security** | `SECURITY DEFINER` | Production |
| **search_path** | `'public'` | Production |
| **Owner** | `postgres` | Production |
| **Comment** | *(null)* | Production |
| **Grants** | `EXECUTE` to `authenticated`, `anon`, `service_role`, `postgres`, `PUBLIC` | Production |

### 7.3 Production function behavior (recovered definition)

**Confirmed by production database.**

1. **Resolve meeting:** Load `property_id` from `owner_vote_meetings` where `id = p_meeting_id`. Raise `meeting_not_found` if missing.
2. **Permission:** Require `public.is_property_vote_staff(v_property_id)` else `permission_denied`.
   - `is_property_vote_staff`: active `property_members` row for `auth.uid()` with role in `council`, `admin`, `property_admin`, `manager`.
3. **Replace voter snapshot:** `DELETE FROM owner_vote_voter_snapshot WHERE meeting_id = p_meeting_id`.
4. **Build eligible set:** From live `property_members`:
   - `status = active`
   - role `owner` or `council`
   - non-empty `unit_no`
   - **One row per unit:** `row_number()` partitioned by property + lower(unit_no), ordered council (1) before owner (2), then `user_id`.
5. **Insert snapshot:** Insert into `owner_vote_voter_snapshot` with `is_eligible = true` for ranked `rn = 1` rows.
   - *(Note: INSERT list does not set `frozen_at`; production table requires `frozen_at NOT NULL` — likely column default `now()`.)*
6. **Mark freeze complete:** `UPDATE owner_vote_meetings SET snapshot_frozen_at = now(), updated_at = now()`.
7. **Audit:** Insert `owner_vote_audit_logs` with `action = 'snapshot_frozen'`, `new_choice = eligible count text`.
8. **Return:** `jsonb_build_object('ok', true, 'meeting_id', 'property_id', 'eligible_units')`.

### 7.4 What production RPC does **not** do

**Confirmed by production database.**

- Does **not** freeze or copy resolution content
- Does **not** update `owner_vote_meetings.status`
- Does **not** set or validate `snapshot_freeze_at`
- Does **not** open or close voting
- Does **not** check whether snapshot was already frozen (re-call deletes and rebuilds snapshot)
- Does **not** use `owner_vote_voter_snapshot` as eligibility source for the freeze operation itself (uses live `property_members`)

### 7.5 Idempotency and atomicity

| Aspect | Observed production behavior | Classification |
|--------|------------------------------|----------------|
| **Transaction** | Single function body (implicit transaction) | Production |
| **Repeat calls** | Deletes prior snapshot rows and re-inserts; updates `snapshot_frozen_at` to new `now()` | Production |
| **Already frozen guard** | None | Production |
| **Partial failure** | Standard PostgreSQL rollback on exception | Inference |
| **Resolution consistency** | Not in scope of this RPC | Production |

### 7.6 Related production objects

| Object | Role |
|--------|------|
| `owner_vote_voter_snapshot` | Frozen voter eligibility store |
| `owner_vote_meetings.snapshot_frozen_at` | Handoff completion marker (voter roll) |
| `owner_vote_meetings.snapshot_freeze_at` | Planned freeze time (not read by this RPC) |
| `owner_vote_audit_logs` | Audit row on freeze |
| `is_property_vote_staff(uuid)` | Permission helper (also referenced in repo migrations) |
| `set_owner_vote_snapshot_freeze_at(uuid, timestamptz)` | Sets planned freeze only; **in repo** `20261324120000_owner_vote_snapshot_freeze_at.sql` |

### 7.7 `owner_vote_voter_snapshot` production columns

**Confirmed by production database.**

| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | NO |
| `meeting_id` | uuid | NO |
| `property_id` | uuid | NO |
| `unit_no` | text | NO |
| `user_id` | uuid | NO |
| `role` | text | NO |
| `is_eligible` | boolean | NO |
| `frozen_at` | timestamptz | NO |
| `created_at` | timestamptz | NO |

---

## 8. Freeze trigger inventory

### 8.1 Direct RPC callers (application)

| # | Source | Route / context | Function | Lines | Meeting types | Mode | Preconditions | Effect | Reachable |
|---|--------|-----------------|----------|-------|---------------|------|---------------|--------|-----------|
| 1 | `src/pages/meeting/MeetingDetail.tsx` | `/meetings/:id`, `/voting/:id` | `useEffect` v3 auto-freeze | 991–1032 | Remote-written **v3** (`isWrittenRemoteV3Meeting`) | **Automatic** (client) | `ovMeta.meeting` exists; `snapshot_frozen_at` empty; `now >= snapshot_freeze_at` (fallback `meetings.scheduled_at`) | RPC + refresh meta | **Active** |
| 2 | `src/pages/meeting/MeetingDetail.tsx` | Same | `handleFreezeOwnerVoteSnapshot` | 2016–2040 | All owner-vote meetings with OV row | **Manual** | Staff; OV exists; council meeting not closed; optional confirm if OV already `open` | RPC; optional open+notice flow | **Active** |
| 3 | `src/components/meetings/MeetingOwnerVoteCouncilSection.tsx` | *(none — component not imported)* | `handleFreeze` | 389–405 | Would be AGM/SGM if mounted | **Manual** | Staff | RPC | **Dead code** |

**Confirmed by current application code.**

### 8.2 RPC argument contract

```typescript
supabase.rpc('freeze_owner_vote_snapshot', { p_meeting_id: ovId })
```

`p_meeting_id` is **`owner_vote_meetings.id`**, not council `meetings.id`.

### 8.3 Database triggers

**Confirmed by production database query.**

| Table | Trigger | Freeze-related |
|-------|---------|----------------|
| `meetings` | `trg_meetings_schedule_guard` | **No** — schedule readiness only |
| `meeting_agenda_items` | `trg_meeting_agenda_items_election_rules` | **No** |
| `owner_vote_meetings` | *(none)* | **No automatic DB freeze** |

### 8.4 Scheduled jobs

| Mechanism | Freeze-related | Evidence |
|-----------|----------------|----------|
| Supabase `pg_cron` | **Not found** | Repo + production trigger query |
| Vercel cron (`vercel.json`) | **No** freeze jobs | `vercel.json` |
| Edge Functions | **No** direct freeze RPC | `send-meeting-invite` reads `snapshot_frozen_at` but does not freeze |
| GitHub Actions | **Not investigated / none found in repo** | Unknown |

### 8.5 RPC-to-RPC calls

**Confirmed by production database + repo migrations.**

No migration or production dependency query found where another RPC calls `freeze_owner_vote_snapshot`.

### 8.6 Dependent behaviors (post-freeze, not triggers)

| Behavior | Depends on freeze | Source |
|----------|-------------------|--------|
| Staff open voting gate | `snapshot_frozen_at` required | `evaluateOwnerVoteOpenGate` — `api.ts` 1969–1971 |
| Voting notice send | frozen + OV `open` | `sendMeetingInvitations` — `api.ts` 1344–1348 |
| V3 owner navigation | frozen snapshot + 14d window | `MeetingDetail.tsx` 742–758 |
| Non-v3 ballot submit | snapshot row + OV open/window | `submit_owner_vote` migrations |
| V3 ballot submit | **Bypasses** OV open/freeze/window; uses council `scheduled_at..+14d` | `20261215120000_remote_written_v3_rpc_gate.sql` |

### 8.7 UI controls (staff)

| Control | Component | Shown when | Meeting scope |
|---------|-----------|------------|---------------|
| Enable electronic voting | `OwnerVotingInlineControlBar` | Non-v3; staff; no OV row | AGM/SGM owner-vote |
| Freeze roll now | `OwnerVotingInlineControlBar` | Non-v3: staff + OV + not closed; **V3: staff fallback** when not frozen | AGM/SGM |
| Open voting | `OwnerVotingInlineControlBar` | Non-v3; OV `draft` | AGM/SGM |
| Close voting | `OwnerVotingInlineControlBar` | Non-v3; OV `open` | AGM/SGM |
| *(hidden)* manual open/freeze/close | V3 primary UI | `hideStaffOvManualLifecycle = isWrittenRemoteV3Meeting` | V3 remote-written |

**Confirmed by current application code** — `OwnerVotingInlineControlBar.tsx` 120–207, 511–527.

### 8.8 Planned freeze time writers (not freeze execution)

| Source | RPC / path | Effect |
|--------|------------|--------|
| `MeetingEditor` save | `syncOwnerVoteMeetingWindowForCouncilMeeting` | Sets `snapshot_freeze_at`, voting window on OV row |
| `MeetingEditor` | `set_owner_vote_snapshot_freeze_at` RPC | Direct planned-time update |
| Default calculation | `resolveOwnerVoteSnapshotFreezeAt` | `voting_closes_at - 7 days` unless user override |

---

## 9. Verified freeze workflow matrix

Identifiers below are **UI meeting kind** values from `MeetingEditor.tsx` (`MeetingKindUi`). Persisted council row uses `meetings.meeting_type` + governance meta + written-remote v3 marker.

| Meeting Type | Exact Identifier | Owner Voting Applicable | Freeze Mode | Trigger | Planned Freeze Source | Actual Freeze Marker | Manual Freeze Available | Automatic Freeze Available | Voting Opens | Voting Closes | Current Evidence | Confidence |
|--------------|------------------|-------------------------|-------------|---------|----------------------|----------------------|-------------------------|----------------------------|--------------|---------------|------------------|------------|
| **Owner Requisitioned SGM** | `owner_sgm_remote` → DB: `meeting_type=sgm`, `initiation_type=owner_requisitioned`, `written_remote` + **v3 meta** on new creates | **Yes** (`isOwnerVotingMeeting`) | **Hybrid** | Client `useEffect` at planned time; staff fallback button | `owner_vote_meetings.snapshot_freeze_at` (default `voting_closes_at - 7d` → **T0+7d** for v3) | `owner_vote_meetings.snapshot_frozen_at` | **Yes** (staff fallback in V3 bar) | **Yes** (client-side; requires page visit) | **Constitutional intent:** T0+7d after freeze. **Code/DB:** OV `voting_opens_at` = T0; **RPC submit:** T0..T0+14d | **Intent:** T0+14d. **OV row / v3 canon:** T0+14d | §10, production RPC, `meetingFormatModel.ts`, `remote_written_v3_rpc_gate.sql` | **High** (timing model conflict flagged) |
| **Council SGM (remote written)** | `council_sgm_remote` → `sgm` + `council_initiated` + written_remote | **Yes** | **Hybrid** if v3 meta; else **Manual** | v3: client auto; legacy: staff button | `snapshot_freeze_at` or legacy fallback `scheduled_at` in auto effect | `snapshot_frozen_at` | **Yes** (non-v3 full staff bar); v3 fallback button | v3 only: client auto | Legacy 7+7+7: T0+14d. v3: T0. | Legacy: T0+21d. v3: T0+14d | §11 | **Medium–High** |
| **Council AGM (remote written)** | `council_agm_remote` → `agm` + written_remote | **Yes** | Same as Council SGM | Same | Same | Same | Same | Same | Same pattern; election agendas add nomination phases in display | Same | §12 | **Medium–High** |
| **Remote Council Meeting** | `council_meeting_remote` → `meeting_type=council`, written_remote | **No** (`isOwnerVotingMeeting` false) | **Not Applicable** | — | — | — | — | — | Council `meeting_votes` / in-meeting ballots (out of OV lifecycle) | — | `ownerVotingCouncil.ts` 99–103 | **High** |
| **Hybrid Council Meeting** | `council_meeting_hybrid` → `meeting_type=council`, `hybrid` | **No** (default) | **Not Applicable** | — | — | — | — | — | In-person / hybrid council voting tables | — | `MeetingEditor.tsx` 263–268 | **High** unless title heuristics falsely match AGM/SGM |

### 9.1 Cross-cutting identifier mapping

**Confirmed by current application code** — `MeetingEditor.tsx` 203–278.

| UI kind | `meetings.meeting_type` | `initiation_type` (governance meta) | `meeting_format` (DB) | V3 detection |
|---------|-------------------------|-------------------------------------|-------------------------|--------------|
| `owner_sgm_remote` | `sgm` | `owner_requisitioned` | `hybrid` *(written_remote UI maps to hybrid DB format)* | New remote written embeds v3 meta |
| `council_sgm_remote` | `sgm` | `council_initiated` | `hybrid` | v3 on new creates |
| `council_agm_remote` | `agm` | `council_initiated` | `hybrid` | v3 on new creates |
| `council_meeting_remote` | `council` | `council_initiated` | `hybrid` | v3 if embedded |
| `council_meeting_hybrid` | `council` | `council_initiated` | `hybrid` | Only if written-remote meta present |

V3 is detected from `description_zh` HTML comment (`clearstrata-written-remote` + `v:3` + `mode`), **not** from `meeting_format` alone.

---

## 10. Owner Requisitioned SGM contract

### 10.1 Identifiers

| Layer | Value | Evidence |
|-------|-------|----------|
| UI kind | `owner_sgm_remote` | Code |
| DB meeting type | `sgm` | Code |
| Initiation | `owner_requisitioned` (governance meta in `description_zh`) | Code |
| Owner voting | **Applicable** | `isOwnerVotingMeeting` |

### 10.2 Question-by-question findings

| # | Question | Answer | Classification |
|---|----------|--------|----------------|
| 1 | Exact identifier | `owner_sgm_remote` / `sgm` + `owner_requisitioned` + remote written v3 | Code |
| 2 | Is freeze automatic? | **Hybrid:** automatic client trigger + manual staff fallback | Code |
| 3 | What starts 7-day authoring? | **Constitutional intent:** meeting start. **Code:** `meetings.scheduled_at` begins public notice lock and participation display | Intent + Code |
| 4 | Start field | **`meetings.scheduled_at`** (not `voting_opens_at` alone) | Code |
| 5 | Planned freeze = start + 7 days? | **Default yes** when `snapshot_freeze_at` synced: `voting_closes_at - 7d` and v3 close = T0+14d → **T0+7d** | Code |
| 6 | Where calculated? | `resolveOwnerVoteSnapshotFreezeAt` (`api.ts` 2253–2275); editor default `defaultSnapshotFreezeLocalFromVotingClose` (`MeetingEditor.tsx` 192–195) | Code |
| 7 | What triggers freeze RPC? | `MeetingDetail` `useEffect` when `now >= snapshot_freeze_at` (fallback `scheduled_at`) | Code |
| 8 | Requires MeetingDetail open? | **Yes** for automatic path | Code |
| 9 | Server-side scheduler? | **No** | Code + Production |
| 10 | Freeze if nobody opens page? | **No** — automatic freeze does not run | Code |
| 11 | Manual freeze visible? | **Yes** — staff “Freeze roll now” fallback on V3 bar (`showManualFreezeNow`) | Code |
| 12 | Council freeze earlier than day 7? | **Yes** — manual RPC allowed; production RPC has no minimum-time guard | Production + Code |
| 13 | Council delay freeze? | **Partially** — can set future `snapshot_freeze_at` before freeze; after missed auto window staff can still manual-freeze late | Code |
| 14 | Voting auto-begin after freeze? | **No** — OV `status` not changed by freeze RPC; V3 does not use staff “open” as primary path | Production + Code |
| 15 | Separate manual open required? | **Non-v3 yes.** **V3:** UI treats participation as automatic; OV may remain `draft` while `submit_owner_vote` bypasses open gate | Code + Migration |
| 16 | What determines 7-day voting close? | **Constitutional intent:** T0+14d. **OV `voting_closes_at` / v3 canon:** T0+14d (full 14d window, not a separate post-freeze 7d slice) | Intent vs Code |
| 17 | True 7 → freeze → 7 match? | **Partially:** freeze timing aligns with **T0+7d** default; voting window in DB/RPC is **T0..T0+14d**, not **T0+7..T0+14d** | **Conflict** |
| 18 | V3 14-day unified window? | **Yes** — `deriveRemoteWrittenV3CanonFromScheduledAt`; `submit_owner_vote` v3 bypass uses `scheduled_at + 14 days` | Code + Migration |
| 19 | Legacy owner requisitioned records? | Pre-v3 written-remote meta (v1/v2) may exist; auto-freeze falls back to `scheduled_at` if `snapshot_freeze_at` missing | Code |

### 10.3 Three-layer summary

| Layer | Owner Requisitioned SGM freeze/vote model |
|-------|----------------------------------------|
| **Constitutional intent** | T0 → 7d authoring → auto freeze → 7d formal voting → close |
| **Current code (freeze)** | Planned freeze **~T0+7d**; auto-freeze client effect; manual fallback |
| **Current production RPC** | Voter roll snapshot only; no resolution freeze; no status open |
| **Legacy** | v1/v2 written-remote meta; fallback freeze trigger uses `scheduled_at` |

---

## 11. Council SGM contract

| # | Question | Answer | Classification |
|---|----------|--------|----------------|
| 1 | Identifier | `council_sgm_remote` / `sgm` + `council_initiated` | Code |
| 2 | OV always created? | **No** — on enable, election save, or resolution sync paths | Code |
| 3 | Originally manual freeze? | **Inference:** pre-v3 staff workflow was manual-first | Git + UI structure |
| 4 | Still manual? | **Yes** for non-v3; **Hybrid** for v3 | Code |
| 5 | Auto `useEffect`? | **Only if** `isWrittenRemoteV3Meeting` | Code |
| 6 | `meeting_format` determines behavior? | **Partially** — v3 detection uses `description_zh` meta, not format alone | Migration comment |
| 7 | `remote_written_v3` applies? | **New remote written creates embed v3** | Code |
| 8 | `snapshot_freeze_at` set how? | Editor sync / `set_owner_vote_snapshot_freeze_at`; default T0+14d close − 7d | Code + Migration |
| 9 | Manual freeze before open? | **Required for non-v3 staff open gate** | Code |
| 10 | Open without freeze? | **Staff gate blocks** (`no_snapshot`); v3 submit bypasses | Code + Migration |
| 11 | Scheduled authoring period? | Display/public notice from canon (7d or 14d v3) | Code |
| 12 | Freeze tied to `scheduled_at`? | Planned freeze derived from voting close (−7d), which derives from `scheduled_at` | Code |
| 13 | Later migration changed workflow? | **Yes** — v3 gate (`20261215120000`); `snapshot_freeze_at` column (`20261324120000`) | Migration history |

---

## 12. Council AGM contract

Council AGM (`council_agm_remote`) follows **Council SGM** patterns with these additions:

| Topic | Finding | Classification |
|-------|---------|----------------|
| Election candidate snapshot | Nominations use `owner_vote_voter_snapshot` when frozen; **20261326120000** moved some eligibility to live `property_members` for nominations | Migration history |
| Resolutions + elections share freeze? | **Same OV meeting row** and single `snapshot_frozen_at` event | Code |
| AGM notice timing | Strict AGM/SGM display uses `deriveAgmSgmCanonDisplayWindows`; v3 uses 14d parallel window | Code |
| Freeze mode | **Hybrid** (v3) / **Manual** (legacy non-v3) | Same as §11 |

---

## 13. Remote Council Meeting contract

| # | Question | Answer |
|---|----------|--------|
| Owner Voting applies? | **No** — `meeting_type = council` fails `isOwnerVotingMeeting` |
| Council-only vote? | **Yes** — `meeting_votes` / council ballots |
| `owner_vote_meetings` created? | **Not via standard OV path** |
| Freeze exists? | **Not Applicable** |
| Other mechanism | Council meeting vote tables |
| Freeze UI hidden? | **Owner vote UI not shown** (`showCouncilOwnerVoteUi` false) |
| Classification | **Not Applicable** |

**Confirmed by current application code.**

---

## 14. Hybrid Council Meeting contract

| # | Question | Answer |
|---|----------|--------|
| Uses Owner Voting? | **No** (default) — `meeting_type=council` |
| Remote ballots? | Product label only unless meeting is reclassified as AGM/SGM |
| Freeze applies? | **Not Applicable** (default) |
| Meeting-day attendance eligibility | Not part of OV snapshot lifecycle in code |
| Workflow | In-person/hybrid council process |
| Reuses remote council behavior? | **Same `council` type** — no OV |
| Implementation completeness | UI kind exists; OV lifecycle **not wired** for generic hybrid council |

**Confirmed by current application code.**

---

## 15. State transition diagrams

Legend: **A** = automatic, **M** = manual staff, **C** = client-side automatic (requires browser).

### 15.1 Owner Requisitioned SGM (v3 — current default)

```
[council meetings]
draft ──M──► scheduled/open ──A/C──► (scheduled_at reached: agenda UI lock)
                    │
                    ├── discussion/authoring (UI; scheduled_at .. ~T0+7d)
                    │
                    ├── snapshot_freeze_at planned (~T0+7d)  [owner_vote_meetings]
                    │
                    ├── C: MeetingDetail useEffect ──► freeze_owner_vote_snapshot (M fallback)
                    │         └── snapshot_frozen_at set [owner_vote_meetings]
                    │
                    ├── participation/voting window (canon T0..T0+14d; RPC submit bypass)
                    │
                    └── close (meeting status / time)

[owner_vote_meetings]
(none/draft) ──M ensure──► draft ──C/M freeze RPC──► draft (still) + snapshot_frozen_at
note: status may remain draft during v3 voting via RPC bypass
```

### 15.2 Council SGM / AGM — legacy non-v3 remote written

```
draft ──M schedule──► scheduled
OV draft ──M enable──► OV draft
OV draft ──M freeze RPC──► snapshot_frozen_at set
OV draft ──M open──► OV open (gate: frozen + eligible + agenda + window)
OV open ──M close──► OV closed
```

### 15.3 Council SGM / AGM — v3 remote written

Same as §15.1 (Hybrid automatic + manual fallback).

### 15.4 Remote / Hybrid council (`meeting_type=council`)

```
No owner_vote_meetings lifecycle — Not Applicable
Council meeting_votes path only
```

---

## 16. Historical change timeline

| Date / Migration | Change | Meeting Types | Previous | New | Still Active? |
|------------------|--------|---------------|----------|-----|---------------|
| `20260511120000_submit_owner_vote_time_gate.sql` | Ballot RPC requires OV open + window; reads `owner_vote_voter_snapshot` | AGM/SGM OV | Live members? | Snapshot-based submit gate | **Yes** (superseded for v3 by later migration) |
| `20261215120000_remote_written_v3_rpc_gate.sql` | `is_remote_written_v3_meeting`; v3 submit bypasses OV open/freeze/window; 14d council window | v3 remote written | 7+7+7 OV gates | Parallel 14d participation | **Yes** |
| `20261324120000_owner_vote_snapshot_freeze_at.sql` | Adds `snapshot_freeze_at`; `set_owner_vote_snapshot_freeze_at` RPC | AGM/SGM OV | Freeze time implicit / `scheduled_at` fallback | Explicit planned freeze column | **Yes** |
| Git `2443ef3` (fixmeeting3) | Introduced freeze UI, `MeetingOwnerVoteCouncilSection`, inline control bar | AGM/SGM | Unknown / minimal | Manual freeze + open/close | **Partially** — section now dead |
| Git `33b4c7e` / v3 migrations | V3 auto-freeze `useEffect`; hide primary manual lifecycle on V3 | v3 remote written | Manual-first staff flow | Hybrid client auto + fallback | **Yes** |
| Production (undated in repo) | `freeze_owner_vote_snapshot` deployed | AGM/SGM OV | — | Voter snapshot RPC | **Yes** — **not in repo migrations** |

---

## 17. Manual freeze reachability

| Meeting Type | Displayed | Hidden | Disabled | Callable | RPC Permits | Restrictions |
|--------------|-----------|--------|----------|----------|-------------|--------------|
| Owner Requisitioned SGM (v3) | Fallback button only (primary manual lifecycle hidden) | Open/Close hidden | When frozen / closed | **Yes** (staff) | **Yes** (`is_property_vote_staff`) | No “already frozen” RPC guard |
| Council SGM/AGM non-v3 | Full “Freeze roll now” | — | When OV closed/archived | **Yes** | **Yes** | Staff only |
| Council SGM/AGM v3 | Same as owner requisitioned | Primary bar hidden | Same | **Yes** | **Yes** | Same |
| Remote/Hybrid council | **N/A** | OV UI absent | — | Direct RPC possible if OV row existed | Would permit | No UI |

**Dead code:** `MeetingOwnerVoteCouncilSection.tsx` exposes manual freeze but is **not imported** anywhere — **not active production UI**.

**Confirmed by current application code.**

---

## 18. Automatic freeze reliability

| # | Question | Owner Requisitioned SGM / v3 | Council SGM/AGM v3 |
|---|----------|-------------------------------|---------------------|
| 1 | Client or server? | **Client** (`useEffect`) | **Client** |
| 2 | Requires page open? | **Yes** | **Yes** |
| 3 | Once per session? | **Once per OV id** (`v3AutoFreezeAttemptedRef`) | Same |
| 4 | Browser closed? | **No freeze until someone opens MeetingDetail** | Same |
| 5 | RPC fails? | Logged; **no retry** (ref blocks retry) | Same |
| 6 | Retry? | **No** automatic retry | Same |
| 7 | Audit event? | **Yes** — `owner_vote_audit_logs.snapshot_frozen` on success | Production RPC |
| 8 | Monitoring? | **None found** | Unknown |
| 9 | Late freeze? | **Yes** — if page opened after planned time, effect runs immediately | Code |
| 10 | Late freeze shifts voting window? | **No** — voting window not recalculated on freeze | Code |
| 11 | Manual fallback? | **Yes** — staff button | Code |
| 12 | Idempotent? | RPC **rebuilds** snapshot; client ref **prevents repeat auto call** without remount | Production + Code |

---

## 19. Current contract vs intended workflow

| Meeting Type | Classification | Notes |
|--------------|----------------|-------|
| Owner Requisitioned SGM | **Partially matches** | Freeze ~T0+7d aligns; voting window is **T0..T0+14d** in RPC/canonical v3, not a distinct post-freeze 7d phase; auto-freeze requires client presence |
| Council SGM (v3) | **Partially matches** | Same v3 model |
| Council SGM (legacy) | **Matches** manual-first staff model more closely | 7+7+7 canon |
| Council AGM | **Partially matches** | Adds election/nomination complexity |
| Remote council | **Not Applicable** | |
| Hybrid council | **Not Applicable** | |

### 19.1 Documented contradictions

| # | Contradiction | Layers |
|---|---------------|--------|
| 1 | **7+7 constitutional phases vs v3 14-day unified participation** | Intent vs `meetingFormatModel.ts` + `remote_written_v3_rpc_gate.sql` |
| 2 | **`scheduled_at` agenda lock vs `snapshot_frozen_at` voter freeze** | `MeetingDetail.tsx` 126–131 vs production RPC |
| 3 | **V3 “automatic participation” copy vs client-only auto-freeze** | UI copy vs `useEffect` reliability |
| 4 | **OV `status=open` for notices vs v3 voting without open** | `sendMeetingInvitations` vs v3 submit bypass |
| 5 | **Production RPC missing from repo** | Production vs migrations |
| 6 | **Re-freeze allowed anytime** | Production RPC vs constitutional immutability (voter roll only) |

---

## 20. RC009 compatibility boundaries

RC010-B preserves (does not propose changes to):

| Boundary | Current anchor |
|----------|----------------|
| Governance → Meeting bridge | P1-001 handoff |
| Governance → Owner Voting sync | `syncGovernanceOwnerVoteLinksFromMeetingState` |
| Council ↔ OV binding marker | `<!--clearstrata-council-meeting-binding-->` |
| MeetingDetail orchestration | Enable, freeze, open, close, notices |
| Automatic voter snapshot (v3 client) | `MeetingDetail.tsx` 991–1032 |
| Manual freeze | Staff RPC + fallback button |
| Owner Requisitioned SGM timing intent | Documented; not redesigned here |
| V3 14-day participation RPC gate | `submit_owner_vote` v3 bypass |
| Ballot submission contracts | `submit_owner_vote`, election ballots |
| Existing V3 compatibility | Remote-written v3 meta detection |

---

## 21. Confirmed facts

1. **Production `freeze_owner_vote_snapshot` recovered** — voter roll only; sets `snapshot_frozen_at`; audit log; no resolution snapshot.
2. **Three application call sites** — two active (`MeetingDetail` auto + manual), one dead (`MeetingOwnerVoteCouncilSection`).
3. **No server-side freeze scheduler** in repo or production triggers.
4. **V3 auto-freeze is client-side** and requires a browser session visiting MeetingDetail.
5. **Meeting kind identifiers** are UI enums mapped to `meetings.meeting_type` + governance meta + v3 HTML comment.
6. **Owner voting applies only to AGM/SGM** (`isOwnerVotingMeeting`), not generic council/hybrid kinds.
7. **`snapshot_freeze_at`** is planned time; **`snapshot_frozen_at`** is actual completion — production freeze RPC does not read planned time.
8. **Manual freeze remains available** for v3 via staff fallback; production RPC allows re-freeze.
9. **V3 submit path bypasses OV open/freeze/window** using council `scheduled_at..+14d`.

---

## 22. Unresolved questions

1. When was `freeze_owner_vote_snapshot` first deployed relative to git history? (**Unknown** — not in migrations)
2. Does `owner_vote_voter_snapshot.frozen_at` default to `now()` on insert? (**Inference** — required NOT NULL, not in INSERT list)
3. Are there production rows with legacy non-v3 owner-requisitioned meetings still on 7+7+7 OV windows? (**Unknown** — needs data audit)
4. Should late client auto-freeze shift `voting_opens_at`/`voting_closes_at`? (**Not implemented** — policy question)
5. Exact historical behavior before `fixmeeting3` commit? (**Partial** — git only)
6. Does any environment lack `snapshot_freeze_at` column? (**Production has it**)

---

## 23. Production contract risks

| Risk | Severity | Evidence |
|------|----------|----------|
| Auto-freeze missed if no staff/browser at freeze time | **High** | Client-only trigger |
| No retry after failed auto-freeze | **High** | `v3AutoFreezeAttemptedRef` |
| RPC absent from repo — drift on redeploy | **High** | Migrations gap |
| Re-freeze replaces voter snapshot without guard | **Medium** | Production RPC |
| Constitutional 7+7 vs v3 14d unified window | **Medium** | Intent vs code |
| `submit_owner_vote` v3 uses live `property_members` for unit lookup | **Medium** | `remote_written_v3_rpc_gate.sql` 190–196 |
| Dead `MeetingOwnerVoteCouncilSection` confuses audits | **Low** | No imports |

---

## 24. Required next decisions

1. Commit recovered `freeze_owner_vote_snapshot` to version control (implementation planning — **not authorized here**).
2. Classify `owner_vote_resolutions` post-freeze (RC010-A open question).
3. Decide whether v3 voting window should remain T0..T0+14d or split T0+7..T0+14d after constitutional review.
4. Decide server-side scheduler vs client auto-freeze for Owner Requisitioned SGM.
5. Decide re-freeze policy (allow vs block after first freeze).
6. Remove or restore `MeetingOwnerVoteCouncilSection` in a future authorized change.

---

## 25. Slice 3 design gate

RC010-B **does not authorize** Slice 3 implementation. Design may proceed when gates are satisfied:

| Gate | RC010-B result |
|------|----------------|
| Production `freeze_owner_vote_snapshot` definition recovered | **[x]** §7 |
| All active freeze triggers identified | **[x]** §8 |
| Meeting type identifiers verified | **[x]** §9 |
| Freeze workflow matrix completed | **[x]** §9 |
| Owner Requisitioned SGM timing verified | **[x]** §10 (conflicts recorded) |
| Council SGM freeze mode verified | **[x]** §11 |
| Council AGM freeze mode verified | **[x]** §12 |
| Remote council applicability verified | **[x]** §13 |
| Hybrid council applicability verified | **[x]** §14 |
| Manual freeze reachability verified | **[x]** §17 |
| Automatic freeze reliability documented | **[x]** §18 |
| Historical changes documented | **[x]** §16 |
| Production contract separated from constitutional intent | **[x]** §19 |
| Remaining unknowns explicitly recorded | **[x]** §22 |

**Slice 3 may move to Design** after RC010-B acceptance and explicit design authorization — **not Implementation**.

---

## 26. Constitutional compliance checklist

- [x] Meeting-type workflows documented separately
- [x] Production RPC recovered before design claims
- [x] RC009 bridges identified and preserved
- [x] Owner Requisitioned SGM automatic freeze intent preserved (not redesigned)
- [x] `scheduled_at` vs `snapshot_frozen_at` distinction documented
- [ ] Resolution content freeze (not in production RPC — future Slice 3 design)
- [ ] Repository contains authoritative freeze RPC migration
- [ ] Server-side reliable auto-freeze
- [x] No implementation authorized by this record alone

---

## 27. Evidence appendix

### 27.1 Production RPC source query

```sql
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'freeze_owner_vote_snapshot';
```

**Project:** linked Supabase `wqohkxtqozscmwfrryfl` (investigation 2026-06-23).

### 27.2 Key code references

| Topic | Path | Lines |
|-------|------|-------|
| V3 auto-freeze | `src/pages/meeting/MeetingDetail.tsx` | 991–1032 |
| Manual freeze handler | `src/pages/meeting/MeetingDetail.tsx` | 2016–2040 |
| Open gate | `src/features/meetings/api.ts` | 1950–1991 |
| Planned freeze sync | `src/features/meetings/api.ts` | 2253–2372 |
| V3 UI lifecycle hide | `src/components/meetings/OwnerVotingInlineControlBar.tsx` | 120–207 |
| Meeting kind identifiers | `src/pages/MeetingEditor.tsx` | 203–278 |
| Owner voting applicability | `src/features/meetings/ownerVotingCouncil.ts` | 99–122 |
| V3 canon / 14d window | `src/features/meetings/electionTimelineMath.ts` | 56–73 |
| V3 submit bypass | `supabase/migrations/20261215120000_remote_written_v3_rpc_gate.sql` | 152–176, 202–222 |
| Planned freeze column | `supabase/migrations/20261324120000_owner_vote_snapshot_freeze_at.sql` | full file |
| Dead manual freeze component | `src/components/meetings/MeetingOwnerVoteCouncilSection.tsx` | 389–405 |

### 27.3 Recovered production function (reference copy)

```sql
CREATE OR REPLACE FUNCTION public.freeze_owner_vote_snapshot(p_meeting_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
-- Recovered from production 2026-06-23. Authoritative copy for design;
-- NOT committed to migrations by RC010-B.
-- See RC010-B §7 for behavioral summary.
$function$;
```

*(Full text stored in investigation transcript; commit to migrations deferred to authorized implementation planning.)*

---

## Status

| Field | Value |
|-------|-------|
| **RC010-B** | **Investigation complete** (read-only) |
| **Slice 3 Design** | **May proceed** after record acceptance |
| **Slice 3 Implementation** | **Not authorized** |

---

## 中文版摘要

**RC010-B** 已从生产数据库恢复 `freeze_owner_vote_snapshot` 的完整定义：该 RPC **仅冻结选民名册**（`owner_vote_voter_snapshot`），设置 `snapshot_frozen_at`，写入审计日志，**不**冻结决议内容、**不**自动打开投票。自动冻结由 **MeetingDetail 客户端 useEffect** 触发，**无服务端调度**；V3 远程书面会议为 **Hybrid（自动 + 人工兜底）**。业主联名 SGM 的 **T0+7d 冻结** 与 **T0..T0+14d 投票窗口** 存在宪章意图与代码/RPC 之间的 **部分冲突**，已记录但不在此 redesign。
