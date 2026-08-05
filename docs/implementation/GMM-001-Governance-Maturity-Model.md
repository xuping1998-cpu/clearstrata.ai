# GMM-001 — Governance Maturity Model

| Field | Value |
|-------|-------|
| **Identifier** | GMM-001 |
| **Title** | Governance Maturity Model |
| **Type** | Governance Standard |
| **Status** | **Approved** |
| **Version** | **v1.0** |
| **Approved** | 2026-08-05 |
| **Authority** | [`ENGINEERING-GOVERNANCE-v1.3.md`](ENGINEERING-GOVERNANCE-v1.3.md) · [`CES-010-Documentation-and-Knowledge-Engineering-Standard.md`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md) |
| **Production Effect** | **None** |

**Applies to:** Engineering Governance · CES · EPS · Blueprint · Implementation Plans · Implementation Units · Engineering Review · Acceptance · Certification · RC Programs

**Related:** [`Engineering-Governance-Rule-Index.md`](Engineering-Governance-Rule-Index.md) · [`EPS-001-Engineering-Phase-Documentation-Standard.md`](EPS-001-Engineering-Phase-Documentation-Standard.md) · [`CES-010-Documentation-and-Knowledge-Engineering-Standard.md`](CES-010-Documentation-and-Knowledge-Engineering-Standard.md)

> **Scope lock:** This standard defines governance **maturity vocabulary and assessment** only. It does **not** define engineering implementation, authorize code changes, or modify Blueprint, IA, CDR, or RC.

---

## 1. Purpose

Establish a permanent **Governance Maturity Model** for Engineering Governance.

GMM-001 provides a common vocabulary for assessing the maturity of:

- Engineering standards (CES, EPS, …)
- Governance rules (GR-x)
- Documentation standards
- Engineering processes

---

## 2. Maturity levels

| Level | Name | Definition |
|-------|------|------------|
| **GMM-1** | **Draft** | Concept proposed. Not yet adopted. No mandatory implementation. |
| **GMM-2** | **Pilot** | Successfully used within **one** engineering initiative. Evidence exists. May still evolve. |
| **GMM-3** | **Adopted** | Approved for general engineering use. Referenced by multiple standards. Stable enough for production governance. |
| **GMM-4** | **Standard** | Organization-wide engineering standard. Expected for all new work. Changes require governance review. |
| **GMM-5** | **Institutionalized** | Long-term constitutional governance. Referenced by multiple engineering programs. Changes require formal governance revision. |

### Level progression (informative)

```
GMM-1 Draft
    ↓
GMM-2 Pilot
    ↓
GMM-3 Adopted
    ↓
GMM-4 Standard
    ↓
GMM-5 Institutionalized
```

**Rule:** A governance artifact **may** remain at a lower level indefinitely when scope is intentionally narrow (e.g. pilot-only rules).

---

## 3. Maturity assessment

### 3.1 What is assessed

Governance maturity evaluates the **governance artifact** — not the engineering implementation.

| Assessed | Not assessed |
|----------|--------------|
| Rule or standard adoption breadth | Whether E-01 code is deployed |
| Evidence of use in completion records | Production runtime behavior |
| Cross-standard references | CITM implementation status |
| Stability and review requirements | Milestone delivery dates |

### 3.2 Assessment criteria

| Criterion | Questions |
|-----------|-----------|
| **Adoption** | How many engineering initiatives apply this artifact? |
| **Evidence** | Do completion, certification, or ledger records cite it? |
| **Stability** | Has the artifact changed since last major use? |
| **Cross-reference** | Is it linked from other approved standards? |
| **Mandatory scope** | Is compliance required for new work? |

### 3.3 Assessment authority

| Field | Rule |
|-------|------|
| **Who assigns maturity** | GMM-001 only — via this document or approved GMM revision |
| **Rule Index** | [`Engineering-Governance-Rule-Index.md`](Engineering-Governance-Rule-Index.md) **shall not** define maturity internally |
| **Updates** | Maturity reassessment **may** occur at governance version approval or program close |

---

## 4. Applies to

| Artifact type | Examples |
|---------------|----------|
| **Engineering Governance** | GR-x rules · Governance version documents |
| **CES** | CES-001 … CES-010 |
| **EPS** | EPS-001 Engineering Phase Documentation |
| **Blueprint** | M2-S3 Snapshot Freeze Design |
| **Implementation Plans** | E-01 Implementation Plan |
| **Implementation Units** | IU completion discipline |
| **Engineering Review** | ER-001 |
| **Acceptance / Certification** | Acceptance Report · Project Certification |
| **RC Programs** | RC-011 Migration Reconciliation |

---

## 5. Initial maturity assignments — Governance Rules (GR-x)

*Assessed 2026-08-05. Governance artifact maturity only.*

| Rule ID | Rule Name | Maturity | Rationale |
|---------|-----------|----------|-----------|
| **GR-1** | Authoritative Source Rule | **GMM-4 Standard** | Organization-wide; CES-010 DOC-7; all E-01 IUs |
| **GR-2** | Document Priority Rule | **GMM-4 Standard** | CES-010 DOC-6; binding conflict resolution |
| **GR-3** | Phase Completion Single Source Rule | **GMM-4 Standard** | EPS-001 mandatory metadata; E-01 Phases 1–4 |
| **GR-4** | Phase Certification Separation Rule | **GMM-4 Standard** | EPS-001 boundary rule; E-01 Phase certifications |
| **GR-5** | IU Completion Mandatory Rule | **GMM-3 Adopted** | CES-010 DOC-1; stable; M2-S3 primary evidence |
| **GR-6** | Verification Status Rule | **GMM-3 Adopted** | v1.2; referenced across IUs; newer than GR-1–4 |
| **GR-7** | Deferred Ownership Rule | **GMM-2 Pilot** | First implementation: E-01 Phase 5 / IU-5.3 Ledger |
| **GR-8** | Ownership Closure Rule | **GMM-2 Pilot** | First implementation: E-01 Phase 5 / IU-5.3 Ledger |

**Reference implementation (GR-7 / GR-8):** [`E-01-IU-5.3-CITM-Evidence-Closure.md`](E-01-IU-5.3-CITM-Evidence-Closure.md)

---

## 6. Suggested maturity — related standards (informative)

| Artifact | Suggested maturity | Notes |
|----------|-------------------|-------|
| **CES-010** | GMM-4 | Documentation standard; multiple E-01 references |
| **EPS-001** | GMM-2 | First reference: E-01 Phase 4 |
| **Engineering Governance v1.3** | GMM-3 | Active; GR-7/GR-8 piloting |
| **Engineering-Governance-Rule-Index** | GMM-2 | First registry; v1.0 |

*Informative only — formal reassessment at next GMM revision or governance version.*

---

## 7. Permanent rules (GMM-1 … GMM-3)

| # | Rule |
|---|------|
| **GMM-1** | Governance maturity **shall** be determined **only** by GMM-001 |
| **GMM-2** | The Governance Rule Index **shall not** define maturity internally |
| **GMM-3** | Maturity assessment **shall** evaluate governance artifacts, not engineering implementation |

---

## Document control

| Field | Value |
|-------|-------|
| **Version** | v1.0 |
| **Status** | Approved |
| **Supersedes** | Ad hoc maturity descriptions prior to GMM-001 |
| **Modifies Blueprint / IA-001 / Governance** | **No** |
| **Production changed by this document** | **No** |

**Related:** [`ENGINEERING-GOVERNANCE-v1.3.md`](ENGINEERING-GOVERNANCE-v1.3.md) · [`Engineering-Governance-Rule-Index.md`](Engineering-Governance-Rule-Index.md)
