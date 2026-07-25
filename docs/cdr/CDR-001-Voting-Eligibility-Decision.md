# CDR-001 — Voting Eligibility and Freeze Semantics Decision

| Field | Value |
|-------|-------|
| **CDR** | CDR-001 |
| **Title** | Voting Eligibility and Freeze Semantics Decision |
| **Type** | Constitutional Decision Record (CDR) |
| **Status** | **Approved** |
| **Milestone** | M2 — Meeting Resolution Authoring |
| **Release** | FR2 — Governance Release |
| **Created** | 2026-06-24 |
| **Approved** | 2026-06-24 |
| **Decision authority** | ClearStrata Constitutional Governance Committee |
| **Parent** | RC010-A · RC010-B · RC010-C |
| **Supersedes** | — (first CDR in this chain) |
| **Superseded by** | — |
| **Implementation authority** | **Slice 3 Design Authorized** · Slice 3 Implementation **Not Authorized** |
| **Production effect** | **None** until separately authorized implementation is completed |

**Evidence chain:**

| Record | Role |
|--------|------|
| [`RC010-A`](../rc/RC010-A-Snapshot-Constitutional-Boundary.md) | Intended constitutional boundary — Approved |
| [`RC010-B`](../rc/RC010-B-Production-Freeze-Contract-Recovery.md) | Production freeze contract (facts) — Completed |
| [`RC010-C`](../investigations/RC010-C-Voting-Eligibility-Contract.md) | Production eligibility contract (facts) — Completed |

---

## Governance approval

| Field | Value |
|-------|-------|
| **Decision authority** | ClearStrata Constitutional Governance Committee |
| **Decision** | **Approved** |
| **Approval date** | 2026-06-24 |
| **Implementation authority** | **M2 Slice 3 Design Authorized** |
| **Implementation status** | **Not Authorized** (Slice 3 code / schema / production) |
| **Production effect** | **None** until separately authorized implementation is completed |

### Approved constitutional contract (binding)

1. **`owner_vote_voter_snapshot`** is the **sole legal voter roll** after Snapshot Freeze.
2. **Owner Requisitioned SGM:** meeting start → up to **7 days** authoring/discussion → **manual early Freeze** permitted at any time during that period → **automatic server-side Freeze at Day 7** if not already frozen → **7 days** formal voting.
3. **Freeze** is a **legal boundary** implemented through an **atomic snapshot event**.
4. **Snapshots are immutable** after Freeze.
5. **Corrections** require a **separate authorized and auditable** constitutional process.
6. **Server/database scheduling** is the **primary** automatic Freeze mechanism.
7. **Manual Council early Freeze** is constitutionally permitted.
8. **Client-side automatic Freeze** may exist **only** as fallback/recovery protection.
9. **Votes bind** to an **immutable frozen resolution instrument** (not mutable row identity alone).
10. **Resolution and election voting** use the **same frozen voter eligibility contract**.

> **Scope lock:** This CDR is constitutionally binding for design and future implementation. It does **not** modify application code, database schema, migrations, production functions, production data, or current production behavior.

---

## 1. Purpose

Define the **constitutional voting eligibility and freeze semantics model** for ClearStrata.

Production today operates **two different eligibility contracts** (RC010-C):

| Path | RPC | Eligibility source (production) |
|------|-----|----------------------------------|
| Resolution voting | `submit_owner_vote` | **Live** `property_members` |
| Election voting | `submit_owner_election_ballot` | **`owner_vote_voter_snapshot`** |

CDR-001 resolves this ambiguity by deciding **one constitutional truth** for UI, RPC, and database — not by documenting production as-is.

---

## 2. Constitutional principles (restated)

These principles govern all decisions in this record.

1. **One Meeting — One Constitutional Truth.**  
   A meeting shall not expose contradictory eligibility or freeze meaning across layers.

2. **One Vote — One Legal Voter Roll.**  
   Formal voting shall reference a single, meeting-bound legal roll at the time of vote.

3. **The legal voter roll shall never be ambiguous.**  
   Eligibility shall not depend on hidden live membership drift after the legal roll is fixed.

4. **A voter must know exactly** why they may vote, why they may not, and **which constitutional record** determines eligibility.

5. **Constitutional rules must be identical across UI, RPC, and Database.**  
   Display gates, server authorization, and persistence rules shall enforce the same contract.

---

## 3. Evidence summary (input only — not the decision)

Facts recovered in RC010-B and RC010-C inform but **do not define** the constitutional target.

| Fact | Source |
|------|--------|
| `freeze_owner_vote_snapshot` builds `owner_vote_voter_snapshot` from live `property_members` at freeze time | RC010-B (production) |
| Production `submit_owner_vote` does **not** read snapshot or `snapshot_frozen_at` | RC010-C (production) |
| Production `submit_owner_election_ballot` requires frozen snapshot eligibility | RC010-C (production) |
| V3 resolution submit bypasses OV open/freeze/window; uses council `scheduled_at..+14d` | RC010-B / RC010-C |
| Client-only auto-freeze is unreliable without page visit | RC010-B |
| RC010-A requires dual snapshot at one freeze event (voter + resolution) | RC010-A |

**Production is not constitutional until aligned.** CDR-001 states the alignment target.

---

## 4. Decision 1 — Authoritative voter roll

### MODEL A — Live membership (`property_members`)

| | |
|--|--|
| **Advantages** | Simple query; always reflects current membership; no freeze prerequisite for submit |
| **Disadvantages** | Post-freeze joins/removals/unit changes alter who may vote; contradicts “legal roll”; UI can show snapshot while RPC accepts live members |
| **Legal implications** | Weak defensibility — “who was entitled at freeze?” is not what the ballot enforces |
| **Operational implications** | Low implementation cost; high dispute risk after membership changes |

### MODEL B — Frozen snapshot (`owner_vote_voter_snapshot`)

| | |
|--|--|
| **Advantages** | Fixed legal roll; auditable; aligns with RC010-A; supports owner trust (“my eligibility was locked”) |
| **Disadvantages** | Requires reliable freeze; must block live membership paths after freeze |
| **Legal implications** | Strong — one roll, one time, one meeting |
| **Operational implications** | Requires RPC/UI alignment and migration from current `submit_owner_vote` |

### MODEL C — Hybrid (snapshot for some voting, live for others)

| | |
|--|--|
| **Advantages** | Matches **current production** without immediate RPC change |
| **Disadvantages** | Violates principles 2, 4, and 5; owners cannot know which rule applies |
| **Risk** | **High** — constitutional inconsistency is the present production defect |
| **Complexity** | Highest long-term — two mental models, two support paths, two audit stories |
| **Legal consistency** | **Unacceptable** as constitutional model |

### **CDR-001 Decision 1 — RECOMMENDED: MODEL B**

**The authoritative legal voter roll for all formal Owner Voting shall be `owner_vote_voter_snapshot` bound to a completed Snapshot Freeze event.**

**Rationale:** Only MODEL B satisfies principles 1–5 and RC010-A. MODEL A is rejected as a constitutional basis because it makes freeze cosmetic for resolution votes. MODEL C is rejected because it encodes today’s production split as policy — that split is a **gap**, not a design.

**Constitutional rule:** After Snapshot Freeze, **`submit_owner_vote` and `submit_owner_election_ballot` shall both require** a matching eligible row in `owner_vote_voter_snapshot` for `(meeting_id, user_id)` (or equivalent unit binding). Live `property_members` may be used **only at freeze time** to **construct** the snapshot, not to **authorize** post-freeze ballots.

---

## 5. Decision 2 — Owner Requisitioned SGM lifecycle

### OPTION A — 7-day authoring → freeze → 7-day formal voting

```
Meeting starts (scheduled_at)
    ↓
7-day authoring / discussion
    ↓
Council may manually Freeze at any time during authoring
    ↓
If nobody freezes → automatic Freeze on Day 7
    ↓
7-day formal voting
    ↓
Voting closes
```

| | |
|--|--|
| **Strengths** | Matches preserved constitutional intent (RC010-A, RC010-B); separates authoring from voting; legally intelligible phases |
| **Weaknesses** | Requires server-reliable auto-freeze and distinct voting window enforcement |

### OPTION B — 14-day unified participation window; freeze independent

| | |
|--|--|
| **Strengths** | Matches **current production** V3 submit window and some UI copy |
| **Weaknesses** | Collapses authoring and voting; freeze becomes optional for submit; contradicts Owner Requisitioned SGM constitutional fact |

### OPTION C — No alternative justified

No third workflow is recommended. Workflow-specific differences for **Council AGM/SGM** (e.g. election nomination phases) remain **within** the same freeze/eligibility principles, not a different eligibility model.

### **CDR-001 Decision 2 — RECOMMENDED: OPTION A**

**Owner Requisitioned SGM shall constitutionally follow Option A.**

**Rationale:** RC010-A and RC010-B preserve this as the canonical Owner Requisitioned workflow. OPTION B is a **production artifact** of V3 submit bypass and 14-day parallel meta — it is **not** adopted as constitutional design. Council may still use different **display** phases for elections on AGM/SGM, but **Owner Requisitioned SGM** retains **7 + freeze + 7** as the binding lifecycle.

**Constitutional timing anchors:**

| Phase | Anchor |
|-------|--------|
| Authoring start | `meetings.scheduled_at` |
| Planned freeze | `owner_vote_meetings.snapshot_freeze_at` (= authoring start + 7 days unless council freezes earlier) |
| Freeze completion | `owner_vote_meetings.snapshot_frozen_at` |
| Formal voting open | After freeze (not before) |
| Formal voting close | Freeze completion + 7 days (distinct from authoring window) |

---

## 6. Decision 3 — Meaning of Freeze

### Options evaluated

| Option | Meaning |
|--------|---------|
| **Administrative Event** | Staff convenience only; no legal lock |
| **Legal Boundary** | Authoring authority ends; voting authority begins |
| **Snapshot Event** | Technical persistence of roll + instrument |
| **Mixed Event** | Partial legal + partial admin |

### **CDR-001 Decision 3 — RECOMMENDED: Legal Boundary implemented as Snapshot Event**

**Snapshot Freeze is a Legal Boundary** — the constitutional handoff from Meeting authoring authority to Voting read-only authority — **implemented as** a **Snapshot Event** that atomically establishes:

- frozen legal voter roll (Voter Snapshot);
- frozen voting instrument (Resolution Snapshot — design in Slice 3);
- `snapshot_frozen_at` as the **completion marker** of that handoff.

Freeze is **not** merely administrative. Administrative actions (manual early freeze, notices) may **trigger** the legal boundary but do not replace it.

---

## 7. Decision 4 — Snapshot semantics

### Options

| Option | Meaning |
|--------|---------|
| **Immutable forever** | No in-place mutation after freeze |
| **Refreshable** | Re-freeze replaces snapshot at will |
| **Partially refreshable** | Some fields frozen, some live |

### **CDR-001 Decision 4 — RECOMMENDED: Immutable at freeze (with separately authorized correction paths only)**

**Voter Snapshot and Resolution Snapshot shall be immutable after the legal Snapshot Freeze event.**

| Criterion | Assessment |
|-----------|------------|
| **Fairness** | Owners rely on a fixed roll and fixed ballot text |
| **Auditability** | Immutable snapshots support archive and dispute review |
| **Legal defensibility** | Strong — “what was voted on” and “who could vote” are stable |
| **Implementation complexity** | Moderate — requires DB/RPC mutation guards |
| **Owner trust** | High when UI, RPC, and DB agree |

**Production note:** Current `freeze_owner_vote_snapshot` **rebuilds** snapshot on repeat call (RC010-B). That behavior is **not** constitutional. Future implementation shall treat repeat freeze as **idempotent no-op** or **explicitly authorized reissue**, not silent refresh.

**Correction after freeze** (adjournment, cancellation, reissue) is **outside** CDR-001 and requires a **separate approved constitutional process**.

---

## 8. Decision 5 — Voting / freeze trigger authority

### Options evaluated

| Option | Reliability |
|--------|-------------|
| **Client** | **Unreliable** — requires browser (RC010-B) |
| **Server** | Reliable if deterministic |
| **Database / scheduler** | Reliable if idempotent and audited |
| **Hybrid** | Recommended pattern |

### **CDR-001 Decision 5 — RECOMMENDED: Hybrid (Server/Database primary; Client display-only; Manual council override)**

| Trigger | Constitutional role |
|---------|---------------------|
| **Server-side scheduler or database job** | **Primary** automatic freeze when planned time reached (workflow-specific rules) |
| **Manual council action** | Permitted **early** freeze during authoring; not for delay past constitutional close without approved process |
| **Client (`useEffect`)** | **May initiate RPC only as a fallback** until scheduler exists; **shall not** be the sole constitutional mechanism |

**Rationale:** RC010-B proved client-only auto-freeze fails when no one opens MeetingDetail. Constitutional Owner Requisitioned SGM **requires** deterministic Day-7 freeze — that requirement **cannot** rest on client alone.

---

## 9. Decision 6 — Resolution instrument

### Options

| Option | Legal meaning |
|--------|---------------|
| **Resolution ID only** | Vote binds to mutable row |
| **Immutable Frozen Resolution** | Vote binds to snapshotted content at freeze |
| **Other** | Not recommended |

### **CDR-001 Decision 6 — RECOMMENDED: Immutable Frozen Resolution instrument**

**A formal resolution vote is legally cast against the Immutable Frozen Resolution instrument presented at Snapshot Freeze**, traceable to source `meeting_agenda_items` and source version — **not** against a live mutable `owner_vote_resolutions` row alone.

**Constitutional minimum fields at freeze:** formal text, title, display order, threshold, voting method, source agenda item id, source version, freeze timestamp.

`owner_vote_resolutions` may remain a **projection or storage carrier** in implementation design, but **must not** be the sole mutable authority post-freeze.

---

## 10. Decision 7 — Consistency (resolution vs election)

### **CDR-001 Decision 7 — RECOMMENDED: Same eligibility contract**

**Resolution Voting and Election Voting shall use the same frozen voter eligibility contract** (`owner_vote_voter_snapshot` after legal freeze).

**Justification:** Principles 2 and 5 require one legal roll per meeting. Election-only snapshot enforcement (production today) is **closer to the constitution** than resolution live membership — the error is **asymmetric enforcement**, not that elections are wrong.

**Post-freeze nomination rules** (live members for nominations before freeze) are **workflow timing** rules, not a second legal voter roll for formal ballots.

---

## 11. Decision 8 — Compatibility

| Artifact | Impact of CDR-001 |
|----------|-------------------|
| **RC009** | **Preserve** bridges, binding marker, MeetingDetail orchestration, ballot submission **shape**. **Align** eligibility and freeze semantics without full Owner Voting redesign. |
| **RC010-A** | CDR-001 **operationalizes** RC010-A decisions A–H as explicit target contract. |
| **RC010-B** | Becomes **gap analysis** vs target; production freeze RPC is starting point, not final semantics. |
| **RC010-C** | Documents **current defect**; CDR-001 defines **remediation direction**. |
| **M2 Slice 3 Design** | **Authorized after CDR-001 approval** (not implementation). |
| **Future M3** | Unaffected directly; inherits single-roll principle for execution/accountability reviews. |

---

## 12. Decision matrix

| Decision | Production today | Constitutional decision (CDR-001) | Migration needed | Implementation impact |
|----------|----------------|-----------------------------------|------------------|------------------------|
| **D1 Authoritative roll** | Hybrid: live members (resolution) + snapshot (election) | **Frozen snapshot only** | **Yes** | `submit_owner_vote` eligibility rewrite; UI alignment |
| **D2 Owner req. SGM lifecycle** | V3 submit: 14d unified; freeze optional for submit | **7d authoring → freeze → 7d voting** | **Yes** | Window enforcement; remove submit bypass as constitutional path |
| **D3 Meaning of freeze** | Partially legal (snapshot exists) but not enforced on submit | **Legal boundary + snapshot event** | **Yes** | Gate all formal ballots on freeze completion |
| **D4 Snapshot mutability** | Re-freeze rebuilds voter snapshot | **Immutable at freeze** | **Yes** | Idempotent freeze; mutation guards |
| **D5 Freeze trigger** | Client `useEffect` primary for auto-freeze | **Server/DB primary; manual early; client fallback** | **Yes** | Scheduler/job; retain manual RPC |
| **D6 Resolution instrument** | Live `resolution_id` / mutable row | **Immutable frozen instrument** | **Yes** | Resolution snapshot storage (Slice 3 design) |
| **D7 Roll consistency** | Different RPC contracts | **Same snapshot contract** | **Yes** | Unify RPC eligibility checks |
| **D8 RC009 preserve** | Working bridges | **Preserve + align** | Partial | Targeted, not redesign |

---

## 13. Risks

### Legal risks

- Continued production operation **contradicts** CDR-001 until implemented — disputes over post-freeze membership changes affecting resolution votes.
- Owner Requisitioned SGM **14-day submit window** without freeze gate weakens “formal voting period” narrative.

### Operational risks

- Server scheduler introduction; monitoring and retry for failed auto-freeze.
- Council training: early manual freeze vs automatic Day-7 freeze.

### Migration risks

- Legacy meetings without snapshot rows or with ballots cast under live membership.
- Need explicit legacy classification (grandfather vs reissue) in Slice 3 design — **not decided here**.

### Backward compatibility

- RC009 historical records and open meetings require **compatibility matrix** in Slice 3 design.
- CDR-001 does **not** authorize breaking production behavior until approved migration plan.

---

## 14. Implementation authority

| Statement | Value |
|-----------|-------|
| **CDR-001 authorizes implementation?** | **No** |
| **CDR-001 authorizes Slice 3 Design?** | **Yes — Approved 2026-06-24** |
| **CDR-001 authorizes production change?** | **No** |
| **Current production behavior** | **Unchanged by this document** |

**Slice 3 Design gate (after CDR-001 approval):**

- [x] Constitutional target contract approved (this CDR — Approved 2026-06-24)
- [ ] `freeze_owner_vote_snapshot` committed to repo (RC010-B prerequisite)
- [ ] Resolution snapshot storage design approved
- [ ] Owner Requisitioned SGM timing enforcement design approved
- [ ] Legacy / migration plan approved
- [ ] RC009 compatibility review completed

**Slice 3 Implementation** remains a **separate** authorization.

---

## 15. Alternatives considered (summary)

| Alternative | Verdict |
|-------------|---------|
| MODEL A — live membership | **Rejected** as constitutional basis |
| MODEL C — hybrid eligibility | **Rejected** — documents production defect, not policy |
| OPTION B — 14-day unified Owner req. SGM | **Rejected** as constitutional lifecycle |
| Freeze as admin-only | **Rejected** |
| Refreshable snapshots | **Rejected** for legal roll and resolution instrument |
| Client-only auto-freeze | **Rejected** as constitutional trigger |
| Resolution ID only | **Rejected** as legal instrument |

---

## 16. Recommended constitutional model (executive)

**One meeting. One freeze. One legal voter roll. One frozen voting instrument. Same rules in UI, RPC, and database.**

For **Owner Requisitioned SGM:** seven days of authoring, council may freeze early, automatic freeze on day seven if not already frozen, seven days of formal voting after freeze — enforced server-side, not by browser alone.

For **all formal Owner Voting:** eligibility = **`owner_vote_voter_snapshot` after `snapshot_frozen_at`**; resolution votes = **immutable frozen instrument**, not live row identity alone.

---

## 17. Constitutional compliance checklist

- [x] One Meeting — One Constitutional Truth (decided)
- [x] One Vote — One Legal Voter Roll (MODEL B)
- [x] Ambiguity removed (reject MODEL C)
- [x] Voter-facing explainability (single eligibility record named)
- [x] UI / RPC / DB alignment required (stated)
- [ ] Production aligned (future implementation)
- [x] Committee approval recorded (2026-06-24)

**Overall:** **Approved** — constitutionally binding; production alignment pending authorized implementation.

---

## 18. Traceability

| Layer | Artifact |
|-------|----------|
| RC000 | Principle 4 — Snapshot Freeze |
| RC010-A | Dual snapshot boundary |
| RC010-B | Production freeze facts |
| RC010-C | Production eligibility facts |
| **CDR-001** | Target constitutional contract (this record) |
| M2 | [`M2-Meeting-Resolution-Authoring.md`](../milestones/M2-Meeting-Resolution-Authoring.md) |
| FR2 | [`FR2-Governance-Release.md`](../releases/FR2-Governance-Release.md) |

---

## 中文版摘要

**CDR-001** 明确宪法目标：**单一法定选民名册**（`owner_vote_voter_snapshot`），**冻结为法律边界**，**决议表决针对不可变冻结文书**，**业主联名 SGM 采用 7 天编制 → 冻结 → 7 天正式投票**，**自动冻结须由服务端/数据库可靠触发**。现行生产环境中决议投票使用 live `property_members`、选举使用 snapshot 的 **混合模式被宪法拒绝**。本记录 **不授权实施**，仅在上级批准后授权 **Slice 3 设计**。
