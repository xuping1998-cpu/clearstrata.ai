import type { StateMessage } from '@/lib/ui/pageStateModel';

export type GovernanceFeedbackKey =
  | 'matterPublished'
  | 'matterCreated'
  | 'commentPosted'
  | 'revisionSaved'
  | 'cdaGenerated'
  | 'resolutionCreated'
  | 'matterArchived'
  | 'actionFailed'
  | 'retryFailed';

export const GOVERNANCE_FEEDBACK: Record<GovernanceFeedbackKey, StateMessage> = {
  matterPublished: {
    en: 'Governance matter published.',
    zh: '治理事项已发布。',
  },
  matterCreated: {
    en: 'Governance matter created.',
    zh: '治理事项已创建。',
  },
  commentPosted: {
    en: 'Your comment was posted.',
    zh: '评论已发表。',
  },
  revisionSaved: {
    en: 'Council revision saved.',
    zh: '业委会修订已保存。',
  },
  cdaGenerated: {
    en: 'CDA report generated.',
    zh: 'CDA 报告已生成。',
  },
  resolutionCreated: {
    en: 'Community resolution created.',
    zh: '社区决议已创建。',
  },
  matterArchived: {
    en: 'Governance matter archived.',
    zh: '治理事项已归档。',
  },
  actionFailed: {
    en: 'Action could not be completed. Please try again.',
    zh: '操作未能完成，请重试。',
  },
  retryFailed: {
    en: 'Retry failed. Check your connection and try again.',
    zh: '重试失败，请检查网络后再试。',
  },
};

export const ARCHIVE_CONFIRM: StateMessage = {
  en: 'Archive this governance matter? This marks it read-only for the community.',
  zh: '归档此治理事项？归档后社区将只能阅读，无法继续推进。',
};
