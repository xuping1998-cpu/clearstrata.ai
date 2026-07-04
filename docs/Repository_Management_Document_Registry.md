# RM-001 — Document Registry

## Repository Management Standard

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | RM-001 |
| **Document Title** | Document Registry |
| **Document Type** | Repository Management (RM) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [The ClearStrata Constitution](00_ClearStrata_Constitution.md) (FD-001) |
| **Effective Date** | 2026-06-29 |
| **Classification** | Repository Management |
| **Owner** | Founding Team |
| **Supersedes** | None |
| **Superseded By** | None |
| **Related Documents** | FD-001, CS-001, CS-002, CS-003, CS-004, FD-REG-001, RM-005 |
| **Repository Location** | `docs/Repository_Management_Document_Registry.md` |

**Governed master index:** [`docs/Registry/Document_Registry.md`](Registry/Document_Registry.md) (**FD-REG-001**)

---

## Purpose

The **Document Registry** is the official **master index** of all permanent repository documents.

It serves as the **single source of truth** for:

- Document numbering
- Document identity
- Lifecycle status
- Repository governance

Every permanent document **must first be registered** in [`Document_Registry.md`](Registry/Document_Registry.md) **before** it is created.

---

## Scope

**In scope:**

- Operational rules for the master registry (FD-REG-001)
- Repository workflow for Cursor and contributors
- Lifecycle and numbering discipline

**Out of scope:**

- Prefix definitions ([CS-001](Repository_Document_Numbering_Standard.md))
- Identity block format ([CS-002](Document_Identity_Block_Standard.md))
- Document layout ([CS-003](Repository_Document_Layout_Standard.md))
- Constitutional registry adoption ([CS-004](Repository_Registry_Standard.md))

**Foundation:** Project Zero

---

## Repository Rules

Every permanent document **shall appear** in the Registry.

The Registry is the **only authoritative source** for permanent document numbering.

**Cursor** shall always consult [`Document_Registry.md`](Registry/Document_Registry.md) before allocating a new document number.

Document numbers:

- Are **permanent**
- Are **unique**
- Are **never reused**
- Are **never renumbered**

**Cancelled** documents retain their identifiers **forever**.

**Historical references** shall remain valid **permanently**.

---

## Repository Workflow

```
Step 1 — Read Document Registry (FD-REG-001)
    ↓
Step 2 — Allocate next available number
    ↓
Step 3 — Update Registry
    ↓
Step 4 — Create document
    ↓
Step 5 — Commit changes
```

**The Registry always comes first.**

---

## Lifecycle

```
RESERVED
    ↓
PLANNED
    ↓
ACTIVE
    ↓
COMPLETED
    ↓
ARCHIVED
    ↓
CANCELLED
```

Only **lifecycle** changes. **Document numbers never change.**

---

## Registry Structure

Categories maintained in [`Document_Registry.md`](Registry/Document_Registry.md):

| Prefix | Category |
|--------|----------|
| **FD** | Founding Documents |
| **CA** | Constitutional Amendments |
| **GP** | Governance Principles |
| **CS** | Constitutional Standards |
| **RM** | Repository Management |
| **GC** | Governance Casebook |
| **CR** | Constitution Reviews |
| **AI** | Artificial Intelligence Standards |
| **AR** | Architecture Records |
| **PR** | Project Records |
| **TM** | Templates |

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [FD-001 — The ClearStrata Constitution](00_ClearStrata_Constitution.md) | Highest authority |
| [CS-004 — Repository Registry Standard](Repository_Registry_Standard.md) | Constitutional registry standard |
| [RM-005 — Repository Governance Resolution](Repository_Governance_Resolution.md) | APPROVED foundation resolution (Project One) |
| [Document Registry (FD-REG-001)](Registry/Document_Registry.md) | Master index *(governed artifact)* |
| [CS-001 — Repository Document Numbering Standard](Repository_Document_Numbering_Standard.md) | Prefix and numbering rules |
| [Founding Documents Registry](Registry/Founding_Documents_Registry.md) | FD narrative history |

---

## Revision History

| Version | Date | Summary | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-29 | Initial adoption — RM-001 repository management standard for Document Registry | Founding Team |

---

## Closing Statement

### Repository Principle

The Repository **remembers** so people do not have to.

**Systems** are more reliable than **memory**.

**Governance** should depend on **institutions**, not **individuals**.

---

### Repository Motto

**Memory** belongs to people.  
**History** belongs to the Repository.  
**Purpose** belongs to the Constitution.  
**Future** belongs to the Community.

---

### 实施规则（中文）

Repository 文档登记册是整个 Repository 所有正式文档 **唯一正式登记来源**。

任何正式文档，**必须先登记，后创建**。不得绕过登记册。

创建任何正式文档前：① 读取 Document Registry · ② 分配下一个编号 · ③ 更新 Registry · ④ 创建文档 · ⑤ 提交 Repository

不得猜测编号。不得重复编号。不得修改历史编号。

---

### Closing Principle

A well-governed repository preserves more than documents. It preserves **trust**.

**中文版：** 一个治理良好的 Repository，保存的不仅是文档。更是 **信任**。

---

**END OF RM-001**

| | |
|---|---|
| **Status** | ACTIVE |
| **Document Number** | RM-001 |
| **Foundation** | Project Zero |
| **Authority** | The ClearStrata Constitution (FD-001) |
| **Effective Date** | 2026-06-29 |
