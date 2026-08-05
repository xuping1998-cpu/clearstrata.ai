# Engineering Governance — Rule Index

| Field | Value |
|-------|-------|
| **Type** | Governance Rule Registry |
| **Status** | **Approved** |
| **Version** | **v1.0** |
| **Authority** | [`ENGINEERING-GOVERNANCE-v1.3.md`](ENGINEERING-GOVERNANCE-v1.3.md) |
| **Production effect** | **None** |

> **Authoritative registry** for all Engineering Governance Rules (**GR-x**). When this index conflicts with a governance version document on rule metadata, **this index is authoritative for GR identifiers and status**. **Governance maturity** is assigned **only** by [`GMM-001-Governance-Maturity-Model.md`](GMM-001-Governance-Maturity-Model.md) — not in this index.

---

## 1. Governance Rule Index

| Rule ID | Rule Name | Version Introduced | Current Status | Applies To | Authoritative Source | Reference Implementation |
|---------|-----------|-------------------|----------------|------------|----------------------|------------------------|
| **GR-1** | Authoritative Source Rule | v1.1 | **Active** | Implementation Plans · IU Completion · Phase Completion · Boundary Check · Verification Review | [`ENGINEERING-GOVERNANCE-v1.1.md`](ENGINEERING-GOVERNANCE-v1.1.md) §2 · [`CES-010` DOC-7](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) | [`E-01-Phase-4-Completion.md`](E-01-Phase-4-Completion.md) |
| **GR-2** | Document Priority Rule | v1.1 | **Active** | All engineering documents when guidance conflicts | [`ENGINEERING-GOVERNANCE-v1.1.md`](ENGINEERING-GOVERNANCE-v1.1.md) §3 · [`CES-010` DOC-6](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) | [`CES-010` §3](CES-010-Documentation-and-Knowledge-Engineering-Standard.md#3-document-priority-when-guidance-conflicts-v11) |
| **GR-3** | Phase Completion Single Source Rule | v1.1.1 | **Active** | Phase Completion records | [`ENGINEERING-GOVERNANCE-v1.1.md`](ENGINEERING-GOVERNANCE-v1.1.md) §4 · [`CES-010` DOC-8](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) | [`E-01-Phase-4-Completion.md`](E-01-Phase-4-Completion.md) |
| **GR-4** | Phase Certification Separation Rule | v1.1.1 | **Active** | Phase Certification records | [`ENGINEERING-GOVERNANCE-v1.1.md`](ENGINEERING-GOVERNANCE-v1.1.md) §4 · [`CES-010` DOC-9](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) | [`E-01-Phase-4-Certification.md`](E-01-Phase-4-Certification.md) |
| **GR-5** | IU Completion Mandatory Rule | CES-010 v1.0 | **Active** | Implementation Units | [`CES-010` DOC-1](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) | [`E-01-IU-4.1-Completion.md`](E-01-IU-4.1-Completion.md) |
| **GR-6** | Verification Status Rule | v1.2 | **Active** | IU Completion · Verification reviews | [`ENGINEERING-GOVERNANCE-v1.2.md`](ENGINEERING-GOVERNANCE-v1.2.md) · [`CES-010` DOC-10](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) | [`E-01-IU-3.2-Completion.md`](E-01-IU-3.2-Completion.md) §8 |
| **GR-7** | Deferred Ownership Rule | v1.3 | **Active** | Blueprint · Work Breakdown · CITM · Acceptance Matrix · Evidence Ledger · Phase/Project acceptance | [`ENGINEERING-GOVERNANCE-v1.3.md`](ENGINEERING-GOVERNANCE-v1.3.md) §2 | [`E-01-IU-5.3-CITM-Evidence-Closure.md`](E-01-IU-5.3-CITM-Evidence-Closure.md) |
| **GR-8** | Ownership Closure Rule | v1.3 | **Active** | Evidence Ledger · Acceptance · Completion · Certification | [`ENGINEERING-GOVERNANCE-v1.3.md`](ENGINEERING-GOVERNANCE-v1.3.md) §3 | [`E-01-IU-5.3-CITM-Evidence-Closure.md`](E-01-IU-5.3-CITM-Evidence-Closure.md) |
| **GR-9** | — | — | **Reserved** | — | — | — |
| **GR-10** | — | — | **Reserved** | — | — | — |
| **GR-11** | — | — | **Reserved** | — | — | — |

---

## 2. Status definitions

| Status | Meaning |
|--------|---------|
| **Active** | Rule is in force |
| **Superseded** | Replaced by a newer rule; retained for audit reference only |
| **Deprecated** | Scheduled for retirement; do not apply to new work |
| **Reserved** | Identifier allocated; no rule content defined |

---

## 3. Applies To (GR-7 / GR-8 scope)

The following artifact types **shall** comply with GR-7 and GR-8 when recording Deferred, Partially Accepted, or ownership remainder:

| Artifact |
|----------|
| Engineering Blueprint (CITM) |
| Engineering Work Breakdown |
| Implementation Plans |
| Implementation Units |
| Engineering Evidence Ledger |
| Acceptance Matrix |
| Phase Completion |
| Phase Certification |
| Acceptance Report |
| Project Certification |

GR-1 through GR-6 apply per their individual **Applies To** column above.

---

## 4. Rule summaries (active rules)

### GR-1 — Authoritative Source Rule
Every specified completion and plan document **shall** cite Implementation Plan revision and Verified flag.

### GR-2 — Document Priority Rule
Blueprint → Implementation Plan → Engineering Review → IU Scope → conversation. Conversation **must not** override approved documents.

### GR-3 — Phase Completion Single Source Rule
Exactly **one** authoritative Phase Completion record **shall** exist per phase.

### GR-4 — Phase Certification Separation Rule
Phase Certification **shall** contain approval metadata only; **must not** duplicate Phase Completion technical content.

### GR-5 — IU Completion Mandatory Rule
Every completed IU **shall** produce exactly one IU Completion record.

### GR-6 — Verification Status Rule
Verification gates **shall** use only **Passed**, **Pending**, or **N/A**. **N/A** **must not** bypass required verification.

### GR-7 — Deferred Ownership Rule
Every Deferred item **shall** identify exactly one future Owner. Deferred without ownership is a **Governance Defect**.

### GR-8 — Ownership Closure Rule
Deferred Owner remains responsible until Engineering Evidence records **Accepted** or **Partially Accepted** closure under the owning milestone.

---

## 5. Rule history (by governance version)

### Engineering Governance v1.1 (2026-07-27)

| Change | Rules |
|--------|-------|
| **Added** | **GR-1** Authoritative Source · **GR-2** Document Priority |
| **Modified** | — |
| **Retired** | — |

*GR-3 and GR-4 encoded in v1.1.1 (CES-010); registered in this index at index v1.0 backfill.*

### CES-010 v1.1.1 (2026-07-28)

| Change | Rules |
|--------|-------|
| **Added** | **GR-3** Phase Completion Single Source · **GR-4** Phase Certification Separation |
| **Modified** | — |
| **Retired** | — |

### Engineering Governance v1.2 (2026-07-29)

| Change | Rules |
|--------|-------|
| **Added** | **GR-6** Verification Status (**N/A** state) |
| **Modified** | — |
| **Retired** | — |

### CES-010 v1.0 (2026-07-27)

| Change | Rules |
|--------|-------|
| **Added** | **GR-5** IU Completion Mandatory |
| **Modified** | — |
| **Retired** | — |

### Engineering Governance v1.3 (2026-08-03)

| Change | Rules |
|--------|-------|
| **Added** | **GR-7** Deferred Ownership · **GR-8** Ownership Closure |
| **Modified** | — |
| **Retired** | — |
| **Reserved** | **GR-9** · **GR-10** · **GR-11** |

---

## 6. Index maintenance

| Field | Rule |
|-------|------|
| **New rule** | Assign next **GR-x**; set Status **Active**; record in Rule History |
| **Supersede** | Set old rule **Superseded**; link to replacement GR |
| **Reserve** | Set Status **Reserved** until content approved |

**Maintainer:** Update this index when a new [`ENGINEERING-GOVERNANCE-v*.md`](ENGINEERING-GOVERNANCE-v1.3.md) version is approved.

---

## Document control

| Field | Value |
|-------|-------|
| **Registry version** | v1.0 |
| **Approved** | 2026-08-03 |
| **Parent** | [`ENGINEERING-GOVERNANCE-v1.3.md`](ENGINEERING-GOVERNANCE-v1.3.md) |
| **Production effect** | None |
