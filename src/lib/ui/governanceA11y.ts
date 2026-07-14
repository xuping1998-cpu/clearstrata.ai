import type { GovernanceCockpitActionType } from '@/lib/community/governanceIntelligence';

/** Contextual queue action label for screen readers (RC-007G). */
export function cockpitQueueActionAriaLabel(
  actionType: GovernanceCockpitActionType,
  matterTitle: string,
  langEn: boolean,
): string {
  const title = matterTitle.trim();
  const en: Record<GovernanceCockpitActionType, string> = {
    review_discussion: `Continue discussion for “${title}”`,
    generate_cda: `Generate CDA report for “${title}”`,
    prepare_resolution: `Prepare community resolution for “${title}”`,
    schedule_meeting: `Schedule meeting for “${title}”`,
    open_voting: `Open voting for “${title}”`,
    archive: `Archive governance matter “${title}”`,
  };
  const zh: Record<GovernanceCockpitActionType, string> = {
    review_discussion: `继续讨论「${title}」`,
    generate_cda: `为「${title}」生成 CDA 报告`,
    prepare_resolution: `为「${title}」准备社区决议`,
    schedule_meeting: `为「${title}」安排会议`,
    open_voting: `为「${title}」开启投票`,
    archive: `归档治理事项「${title}」`,
  };
  return langEn ? en[actionType] : zh[actionType];
}
