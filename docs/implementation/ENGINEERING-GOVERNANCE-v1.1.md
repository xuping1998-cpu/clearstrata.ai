# Engineering Governance v1.1

| Field | Value |
|-------|-------|
| **Version** | **v1.1** |
| **Type** | Engineering Governance Update |
| **Status** | **Approved** |
| **Approved** | 2026-07-27 |
| **Supersedes** | Engineering documentation practice prior to Authoritative Source requirement |
| **Authority** | [`CES-010-Documentation-and-Knowledge-Engineering-Standard.md`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) |
| **Production effect** | **None** |

---

## Authoritative Source

| Field | Value |
|-------|-------|
| **Implementation Plan** | [`E-01-Implementation-Plan.md`](E-01-Implementation-Plan.md) |
| **Revision** | v1.0 |
| **Verified** | **YES** |

---

## 1. Summary

Engineering Governance **v1.1** introduces:

1. A mandatory **Authoritative Source** section on specified engineering documents.
2. A fixed **document priority order** when conversation guidance conflicts with approved records.

This update does **not** modify Blueprint, IA-001, CDR, RC, application code, SQL, or migrations.

---

## 2. Mandatory Authoritative Source section

The following document types **shall** include **Authoritative Source**:

| Document type | Example |
|---------------|---------|
| Implementation Plan (task / phase) | `E-01-Implementation-Plan.md` |
| IU Completion | `E-01-IU-2.1-Completion.md` |
| Phase Completion | `E-01-Phase-1-Completion.md` |
| Boundary Check | Phase boundary status records |
| Verification Review | Read-only IU verification reviews |

**Required fields:**

| Field | Rule |
|-------|------|
| **Implementation Plan** | Path to the governing task Implementation Plan |
| **Revision** | Implementation Plan revision (e.g. `v1.0`) |
| **Verified** | `YES` when document content was checked against that revision; otherwise `NO` with explanation |

When a new Implementation Plan revision is approved, all dependent documents **shall** update the **Revision** field on next touch or at phase close.

---

## 3. Document priority order (binding)

When conversation guidance conflicts with approved engineering documents, priority **shall** be:

```
1. Approved Engineering Blueprint
        ↓
2. Approved Implementation Plan
        ↓
3. Approved Engineering Review
        ↓
4. Approved IU Scope (authorized IU prompt / completion scope)
        ↓
5. Conversation guidance
```

**Rule:** Conversation guidance **must not** override approved governance documents.

Encoded in [`CES-010`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) as **DOC-6** and cross-referenced in [`CES-001`](CES-001-Engineering-Standard.md).

---

## 4. Single source — Phase Completion and Certification (v1.1.1)

For every Phase:

- Exactly **one** authoritative **Phase Completion** document **shall** exist.
- Phase certification **shall** use one of:
  - **Form A:** Embedded as the final section of the Phase Completion document, or
  - **Form B:** A dedicated `{Task}-Phase-{n}-Certification.md` containing **approval metadata only**.
- Certification documents **must not** duplicate technical summaries (deliverables, verification, architecture, IU summaries, boundary findings) already in the Phase Completion document.

Encoded in [`CES-010`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) as **DOC-8** and **DOC-9**.

---

## 5. Templates updated (v1.1)

| Template | Path |
|----------|------|
| IU Completion | [`templates/IU-Completion-Template.md`](templates/IU-Completion-Template.md) |
| Phase Completion | [`templates/Phase-Completion-Template.md`](templates/Phase-Completion-Template.md) |
| Phase Certification | [`templates/Phase-Certification-Template.md`](templates/Phase-Certification-Template.md) |
| Boundary Check | [`templates/Boundary-Check-Template.md`](templates/Boundary-Check-Template.md) |
| Verification Review | [`templates/Verification-Review-Template.md`](templates/Verification-Review-Template.md) |

---

## 6. E-01 backfill (v1.1)

Existing E-01 engineering records updated with **Authoritative Source** (Implementation Plan **v1.0**, Verified **YES**):

- [`E-01-Implementation-Plan.md`](E-01-Implementation-Plan.md) — revision registered
- [`E-01-Phase-1-Completion.md`](E-01-Phase-1-Completion.md)
- [`E-01-Phase-1-Certification.md`](E-01-Phase-1-Certification.md)
- [`E-01-Phase-2-Completion.md`](E-01-Phase-2-Completion.md)
- [`E-01-Phase-2-Certification.md`](E-01-Phase-2-Certification.md)
- [`E-01-IU-1.1-Completion.md`](E-01-IU-1.1-Completion.md)
- [`E-01-IU-1.1C-Completion.md`](E-01-IU-1.1C-Completion.md)
- [`E-01-IU-2.1-Completion.md`](E-01-IU-2.1-Completion.md)
- [`E-01-IU-1.1C-Deployment-Readiness.md`](E-01-IU-1.1C-Deployment-Readiness.md)

---

**Standard:** [`CES-010-Documentation-and-Knowledge-Engineering-Standard.md`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) (v1.1.1)
