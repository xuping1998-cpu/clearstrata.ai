import type { GovernanceMatterCategory } from '@/lib/community/governanceMatterModel';

export type ConstitutionalPrincipleRef = {
  article: string;
  principle_en: string;
  principle_zh: string;
};

const CATEGORY_BASIS: Record<GovernanceMatterCategory, ConstitutionalPrincipleRef[]> = {
  property_management: [
    { article: 'Article II', principle_en: 'Discussion Before Decision', principle_zh: '先讨论后决策' },
    { article: 'Article I', principle_en: 'Transparent Governance', principle_zh: '透明治理' },
  ],
  budget: [
    { article: 'Article I', principle_en: 'Transparent Governance', principle_zh: '透明治理' },
    { article: 'Article IV', principle_en: 'Evidence Before Opinion', principle_zh: '先证据后意见' },
  ],
  major_repair: [
    { article: 'Article II', principle_en: 'Discussion Before Decision', principle_zh: '先讨论后决策' },
    { article: 'Article IV', principle_en: 'Evidence Before Opinion', principle_zh: '先证据后意见' },
  ],
  procurement: [
    { article: 'Article I', principle_en: 'Transparent Governance', principle_zh: '透明治理' },
    { article: 'Article IV', principle_en: 'Evidence Before Opinion', principle_zh: '先证据后意见' },
  ],
  special_general_meeting: [
    { article: 'Article II', principle_en: 'Discussion Before Decision', principle_zh: '先讨论后决策' },
    { article: 'Article V', principle_en: 'Public by Default', principle_zh: '默认公开' },
    { article: 'Article VI', principle_en: 'Owner Participation', principle_zh: '业主参与' },
  ],
  annual_general_meeting: [
    { article: 'Article II', principle_en: 'Discussion Before Decision', principle_zh: '先讨论后决策' },
    { article: 'Article VI', principle_en: 'Governance Lifecycle', principle_zh: '治理生命周期' },
  ],
  council_proposal: [
    { article: 'Article II', principle_en: 'Discussion Before Decision', principle_zh: '先讨论后决策' },
    { article: 'Article VI', principle_en: 'Governance Lifecycle', principle_zh: '治理生命周期' },
  ],
  owner_proposal: [
    { article: 'Article II', principle_en: 'Discussion Before Decision', principle_zh: '先讨论后决策' },
    { article: 'Article V', principle_en: 'Public by Default', principle_zh: '默认公开' },
  ],
  bylaw_amendment: [
    { article: 'Article II', principle_en: 'Discussion Before Decision', principle_zh: '先讨论后决策' },
    { article: 'Article VI', principle_en: 'Community Governance', principle_zh: '社区治理' },
  ],
  policy_proposal: [
    { article: 'Article II', principle_en: 'Discussion Before Decision', principle_zh: '先讨论后决策' },
    { article: 'Article V', principle_en: 'Public by Default', principle_zh: '默认公开' },
  ],
  emergency_matter: [
    { article: 'Article II', principle_en: 'Discussion Before Decision', principle_zh: '先讨论后决策' },
    { article: 'Article III', principle_en: 'AI Assists, People Decide', principle_zh: 'AI 协助，人做决定' },
  ],
  other: [
    { article: 'Article II', principle_en: 'Discussion Before Decision', principle_zh: '先讨论后决策' },
    { article: 'Article III', principle_en: 'AI Assists, People Decide', principle_zh: 'AI 协助，人做决定' },
  ],
};

/** Constitutional basis for a governance matter category (FD-001). */
export function constitutionalBasisForCategory(category: GovernanceMatterCategory): ConstitutionalPrincipleRef[] {
  return CATEGORY_BASIS[category] ?? CATEGORY_BASIS.other;
}

export function formatConstitutionalPrinciple(ref: ConstitutionalPrincipleRef, langEn: boolean): string {
  const principle = langEn ? ref.principle_en : ref.principle_zh;
  return `${ref.article} — ${principle}`;
}
