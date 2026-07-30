# Engineering Governance v1.2

| Field | Value |
|-------|-------|
| **Version** | **v1.2** |
| **Type** | Engineering Governance Update |
| **Status** | **Approved** |
| **Approved** | 2026-07-29 |
| **Supersedes** | [`ENGINEERING-GOVERNANCE-v1.1.md`](ENGINEERING-GOVERNANCE-v1.1.md) — Verification Status states only |
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

Engineering Governance **v1.2** extends the **Verification Status** standard with an official **Not Applicable (N/A)** state.

Prior v1.1 requirements (Authoritative Source, document priority, single-source Phase Completion) remain in force. This update does **not** modify Blueprint, IA-001, CDR, RC, application code, SQL, or migrations.

Encoded in [`CES-010`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) as **DOC-10** (amended) and [§11 Verification Status](CES-010-Documentation-and-Knowledge-Engineering-Standard.md#11-verification-status-v12).

---

## 2. Allowed verification states

Verification Status **shall** use **only** one of the following values for each gate:

| State | Display | Meaning |
|-------|---------|---------|
| **Passed** | ✓ Passed | The verification has been performed and objective evidence exists |
| **Pending** | □ Pending | The verification is required but has not yet been performed |
| **Not Applicable** | **N/A** | The verification does not apply to the scope of this Implementation Unit |

**Rule:** **N/A** **must not** be used to bypass required verification.

Each verification item **shall** be evaluated **independently** per IU scope.

---

## 3. Examples (independent gate evaluation)

### Database-only migration IU

| Gate | Status |
|------|--------|
| Build Verification | **N/A** |
| Database Verification | ✓ **Passed** *(when migration apply + SQL tests executed)* |

### Documentation-only IU

| Gate | Status |
|------|--------|
| Build Verification | **N/A** |
| Database Verification | **N/A** |
| Runtime Verification | **N/A** |

### React UI implementation IU

| Gate | Status |
|------|--------|
| Database Verification | **N/A** |
| Build Verification | ✓ **Passed** *(when `npm run build` executed)* |
| Runtime Verification | □ **Pending** *(until integration or staging)* |

---

## 4. Templates updated (v1.2)

| Template | Path |
|----------|------|
| IU Completion | [`templates/IU-Completion-Template.md`](templates/IU-Completion-Template.md) — §7.1 Verification Status |

---

## 5. Prior governance versions

| Version | Document | Scope |
|---------|----------|-------|
| v1.1 | [`ENGINEERING-GOVERNANCE-v1.1.md`](ENGINEERING-GOVERNANCE-v1.1.md) | Authoritative Source; document priority; single-source Phase Completion |
| v1.1.1 | CES-010 v1.1.1 | Phase certification forms (DOC-8, DOC-9) |
| v1.1.2 | CES-010 v1.1.2 | Verification Status gate table (DOC-10) |
| **v1.2** | This document | **N/A** verification state |

---

**Standard:** [`CES-010-Documentation-and-Knowledge-Engineering-Standard.md`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) (v1.2)
