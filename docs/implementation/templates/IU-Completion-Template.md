# {Task}-IU-{phase.unit} — Completion Record

| Field | Value |
|-------|-------|
| **Task** | {E-01} |
| **Phase** | {Phase N} |
| **Implementation Unit** | **IU-{x.x}** — {Title} |
| **Status** | {Completed \| Completed with Follow-up \| Blocked \| Cancelled} |
| **Completed** | {YYYY-MM-DD} |
| **Production effect** | {None until deployed \| Describe if deployed} |

---

## Authoritative Source

| Field | Value |
|-------|-------|
| **Implementation Plan** | [`E-01-Implementation-Plan.md`](../E-01-Implementation-Plan.md) |
| **Revision** | v1.0 |
| **Verified** | **YES** |

---

## 1. Implementation Unit

| Field | Value |
|-------|-------|
| **Engineering task** | {E-01 Snapshot Foundation} |
| **Phase** | {Phase N — {Phase title}} |
| **IU** | **IU-{x.x}** |
| **Title** | {Short title} |

---

## 2. Status

**{Completed}**

<!-- One of: Completed | Completed with Follow-up | Blocked | Cancelled -->

---

## 3. Objective

{Brief description of what this IU implemented — one short paragraph.}

---

## 4. Files Modified

| File | Change |
|------|--------|
| `{path}` | {Added \| Modified \| Deleted} |

{If none: state **No repository files modified.**}

---

## 5. Database Changes

{If applicable, list:}

- **Migration:** `{filename.sql}`
- **Tables:** …
- **Columns:** …
- **Indexes:** …
- **Constraints / FKs:** …
- **RLS / policies:** …

{If not applicable:}

**No database changes.**

---

## 6. Application Changes

{If applicable, list RPC, React, Edge Functions, API modules changed.}

{If not applicable:}

**No application behavior changed.**

---

## 7. Verification

| Check | Result |
|-------|--------|
| **Build** | {Pass / Fail / Not run — reason} |
| **Typecheck** | {Pass / Fail / Pre-existing failures / Not run} |
| **Migration apply** | {Pass on staging / Not yet applied / N/A} |
| **Regression** | {Description or N/A} |
| **Deployment readiness** | {Link to readiness doc or N/A} |

---

## 8. Backward Compatibility

{State whether existing production behavior was preserved. One short paragraph.}

---

## 9. Known Limitations

{List only items intentionally deferred within or because of this IU.}

-

---

## 10. Deferred Work

| Next | Description |
|------|-------------|
| **{IU-x.x}** | {Title and brief scope} |

---

## 11. Authority

| Document | Role |
|----------|------|
| [`M2-S3-Snapshot-Freeze-Design.md`](../M2-S3-Snapshot-Freeze-Design.md) | Blueprint |
| [`M2-S3-Implementation-Authorization.md`](../M2-S3-Implementation-Authorization.md) | IA-001 |
| [`E-01-Implementation-Plan.md`](../E-01-Implementation-Plan.md) | Phase plan |
| [`ER-001-M2-S3-Blueprint-Review.md`](../ER-001-M2-S3-Blueprint-Review.md) | Engineering Review |

---

## Document control

| Field | Value |
|-------|-------|
| **Standard** | [`CES-010-Documentation-and-Knowledge-Engineering-Standard.md`](../CES-010-Documentation-and-Knowledge-Engineering-Standard.md) |
| **Template** | [`IU-Completion-Template.md`](IU-Completion-Template.md) |
