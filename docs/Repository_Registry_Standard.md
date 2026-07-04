# CS-004 — Repository Registry Standard

## Constitutional Standard

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | CS-004 |
| **Document Title** | Repository Registry Standard |
| **Document Type** | Constitutional Standard (CS) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [The ClearStrata Constitution](00_ClearStrata_Constitution.md) (FD-001) |
| **Effective Date** | 2026-06-29 |
| **Classification** | Constitutional Standards |
| **Owner** | Founding Team |
| **Supersedes** | None |
| **Superseded By** | None |
| **Related Documents** | CS-001, CS-002, CS-003, FD-001, FD-REG-001, RM-001, RM-005 |
| **Repository Location** | `docs/Repository_Registry_Standard.md` |

---

## Purpose

The **Repository Registry** is the **single authoritative source** for all permanent document identifiers within the ClearStrata Repository.

Its purpose is to ensure that document numbers are **allocated**, **tracked**, **preserved**, and **never duplicated**.

Repository governance shall rely on the **Registry**, not on memory.

---

## Scope

**In scope:**

- Official registry location and allocation workflow
- Lifecycle states for permanent documents
- Cursor and contributor rules before creating official documents

**Out of scope:**

- Founding Documents narrative history (see [Founding Documents Registry](Registry/Founding_Documents_Registry.md))
- Prefix definitions (see [CS-001](Repository_Document_Numbering_Standard.md))
- Identity block and layout (see [CS-002](Document_Identity_Block_Standard.md), [CS-003](Repository_Document_Layout_Standard.md))

---

## Official Registry

**Create and maintain:**

[`docs/Registry/Document_Registry.md`](Registry/Document_Registry.md) — **FD-REG-001**

This document is the **ONLY authoritative source** for permanent document numbering.

**No official document** may assign its own number without first being **registered**.

---

## Allocation Workflow

Every permanent document shall follow the same workflow:

```
Step 1 — Read docs/Registry/Document_Registry.md
    ↓
Step 2 — Allocate the next available identifier
    ↓
Step 3 — Register the document (update Document_Registry.md)
    ↓
Step 4 — Create the document
    ↓
Step 5 — Commit the document
```

**Number allocation always precedes document creation.**

---

## Repository Rule (Cursor)

Before creating **ANY** official document, Cursor **SHALL**:

1. Read [`docs/Registry/Document_Registry.md`](Registry/Document_Registry.md)
2. Determine the **next available** permanent identifier
3. **Update the Registry** before creating the document file

Cursor **SHALL NEVER** guess, invent, reuse, or skip permanent document numbers.

**The Registry is the only source of truth.**

---

## Document Lifecycle

Every permanent document shall have one lifecycle state:

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
```

A **document number never changes**. Only its **lifecycle** changes.

**Cancelled projects** retain their numbers (e.g. PR-008 → `CANCELLED`, number reserved forever).

---

## Numbering Rules

1. Document numbers are **permanent**.
2. Document numbers are **unique**.
3. Document numbers are **never reused**.
4. Document numbers are **never renumbered**.
5. **Deleted** documents remain **reserved**.
6. **Historical references** remain valid **forever**.
7. **Cancelled** projects retain their numbers.

---

## Registry Categories

| Prefix | Document Type |
|--------|---------------|
| **FD** | Founding Documents |
| **CA** | Constitutional Amendments |
| **GP** | Governance Principles |
| **CS** | Constitutional Standards |
| **GC** | Governance Casebook |
| **CR** | Constitution Reviews |
| **AI** | Artificial Intelligence Standards |
| **AR** | Architecture Records |
| **PR** | Project Records |
| **RM** | Repository Management |
| **TM** | Templates |

See [CS-001](Repository_Document_Numbering_Standard.md) for full prefix governance.

---

## Registry Principle

**Systems** are more reliable than **memory**.

The Repository must **always know its own history**.

---

### 实施规则（中文）

创建任何正式文档之前，Cursor 必须：

1. 读取 `docs/Registry/Document_Registry.md`
2. 获取下一个可用编号
3. 更新 Registry
4. 创建正式文档

不得跳过 Registry。不得猜测编号。不得重复编号。

**Document Registry 是唯一编号来源。**

---

## Cross References

| Document | Relationship |
|----------|--------------|
| [Document Registry (FD-REG-001)](Registry/Document_Registry.md) | Authoritative numbering source *(this standard)* |
| [CS-001 — Repository Document Numbering Standard](Repository_Document_Numbering_Standard.md) | Prefix and numbering rules |
| [Founding Documents Registry](Registry/Founding_Documents_Registry.md) | FD narrative and institutional history |
| [FD-001 — The ClearStrata Constitution](00_ClearStrata_Constitution.md) | Highest authority |

---

## Revision History

| Version | Date | Summary | Author |
|---------|------|---------|--------|
| 1.0 | 2026-06-29 | Initial adoption — Document_Registry.md as sole numbering authority | Founding Team |

---

## Closing Statement

### Repository Motto

**Memory** belongs to people.  
**History** belongs to the Repository.  
**Governance** belongs to the Constitution.

---

**中文版**

记忆，属于个人。  
历史，属于 Repository。  
治理，属于《平台宪章》。

---

**END OF CS-004**

| | |
|---|---|
| **Status** | ACTIVE |
| **Document Number** | CS-004 |
| **Classification** | Constitutional Standard |
| **Authority** | The ClearStrata Constitution |
| **Effective Date** | 2026-06-29 |
