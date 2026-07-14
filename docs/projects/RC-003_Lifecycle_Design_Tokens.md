# RC-003 — Lifecycle Design Tokens

## Project One Release Candidate · Foundation Layer

## Document Identity Block

| Field | Value |
|-------|-------|
| **Document Number** | RC-003 |
| **Document Title** | Lifecycle Design Tokens |
| **Document Type** | Release Candidate Record (RC) |
| **Status** | ACTIVE |
| **Version** | 1.0 |
| **Authority** | [CDS-001](../design-system/CDS-001_ClearStrata_Design_System.md), RC-001 |
| **Effective Date** | 2026-07-13 |
| **Classification** | Project One RC — Foundation |
| **Owner** | ClearStrata Project One |
| **Related Documents** | RC-001, RC-002, CDS-001, UIP-013 |
| **Repository Location** | `docs/projects/RC-003_Lifecycle_Design_Tokens.md` |

---

## Objective

Define **canonical lifecycle semantic tokens** and a single presentation projection utility. CDA remains visually **advisory**, not legally authoritative.

---

## Token implementation

**Pattern:** Tailwind theme extension (`clearstrata.lifecycle.*`) — dominant repository pattern.

| File | Role |
|------|------|
| `tailwind.config.js` | `clearstrata.lifecycle.{stage}.{text,surface,border,accent}` |
| `src/lib/community/governanceLifecyclePresentation.ts` | Presentation map + pill/button helpers |

### Stages

| Token | Semantic intent |
|-------|-----------------|
| `draft` | Neutral gray |
| `discussion` | Governance green |
| `consultation` | Amber |
| `cda` | Indigo/violet — **advisory** |
| `resolution` | Blue |
| `meeting` | Purple |
| `voting` | Orange |
| `execution` | Teal |
| `archived` | Neutral gray |
| `danger` | Red |

### Presentation type

```ts
type GovernanceLifecyclePresentation = {
  labelEn: string;
  labelZh: string;
  textClass: string;
  backgroundClass: string;
  borderClass: string;
  accentClass: string;
  advisory?: boolean;
};
```

**Rule:** Presentation only — does not redefine workflow state (`governanceLifecycleModel.ts` remains authoritative).

---

## Pilot migration (this pass)

| Component | Change |
|-----------|--------|
| `GovernanceLifecycleTimeline` | Lifecycle pills via `lifecyclePillClassName` |
| `CockpitLifecycleTimeline` | Advisory CDA checkpoint styling |
| `GovernanceMatterCard` | Stage label + resolution/meeting/voting badges |
| `GovernanceMatterTimelineTab` | Current stage bar, phase strip, event nodes |

---

## CDA advisory treatment

- Dashed ring on advisory-current pills
- Indigo/violet token family (not primary green)
- Labels: **CDA** / **议事助手** — never presented as legal authority

---

**END OF RC-003**
