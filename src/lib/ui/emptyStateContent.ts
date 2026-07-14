import type { PageStateAction, StateMessage } from '@/lib/ui/pageStateModel';

export type EmptyStateContentKey =
  | 'governance.firstTimeEmptyCouncil'
  | 'governance.firstTimeEmptyOwner'
  | 'governance.stageEmpty'
  | 'governance.filterEmpty'
  | 'governance.noComments'
  | 'governance.noFollowing'
  | 'governance.searchEmpty'
  | 'governance.archivedEmpty'
  | 'governance.permissionLimitedOwner'
  | 'governance.matterDiscussionEmpty'
  | 'governance.matterDiscussionEmptyOwner'
  | 'governance.noResolution'
  | 'governance.noResolutionOwner'
  | 'governance.noCda'
  | 'governance.noCdaOwner'
  | 'governance.noDocuments'
  | 'governance.cockpitNoMatters'
  | 'governance.cockpitStageEmpty'
  | 'governance.cockpitNoActions'
  | 'governance.cockpitSelectMatter'
  | 'governance.dashboardNoMattersOwner'
  | 'governance.dashboardNoMattersCouncil'
  | 'governance.hubMattersNoUpdate'
  | 'governance.matterNotFound';

export type EmptyStateContent = {
  title: StateMessage;
  description?: StateMessage;
  reason?: StateMessage;
  councilAction?: PageStateAction;
  ownerAction?: PageStateAction;
  action?: PageStateAction;
  secondaryAction?: PageStateAction;
};

type ContentContext = {
  propertyId?: string;
  searchQuery?: string;
};

function newMatterUrl(propertyId?: string): string | undefined {
  if (!propertyId?.trim()) return undefined;
  return `/community-deliberation/new?${new URLSearchParams({ propertyId: propertyId.trim() }).toString()}`;
}

function hubUrl(propertyId?: string): string | undefined {
  if (!propertyId?.trim()) return undefined;
  return `/community-deliberation?${new URLSearchParams({ propertyId: propertyId.trim() }).toString()}`;
}

const CONTENT: Record<EmptyStateContentKey, (ctx: ContentContext) => EmptyStateContent> = {
  'governance.firstTimeEmptyCouncil': (ctx) => ({
    title: { en: 'No governance matters yet', zh: '暂无治理事项' },
    description: {
      en: 'Your community has not published any governance matters yet.',
      zh: '当前社区尚未发布治理事项。',
    },
    councilAction: {
      label: { en: 'Publish Governance Matter', zh: '发布治理事项' },
      to: newMatterUrl(ctx.propertyId),
    },
  }),
  'governance.firstTimeEmptyOwner': (ctx) => ({
    title: { en: 'No governance matters yet', zh: '暂无治理事项' },
    description: {
      en: 'There are no community matters to participate in right now.',
      zh: '目前没有需要您参与的治理事项。',
    },
    reason: {
      en: 'Only council may publish governance matters.',
      zh: '仅业委会可发布治理事项。',
    },
    ownerAction: {
      label: { en: 'Open Governance Hub', zh: '进入治理中心' },
      to: hubUrl(ctx.propertyId),
    },
  }),
  'governance.stageEmpty': () => ({
    title: { en: 'No matters in this stage', zh: '当前阶段暂无事项' },
    description: {
      en: 'Other lifecycle stages may still have active matters.',
      zh: '其他生命周期阶段可能仍有进行中的事项。',
    },
  }),
  'governance.filterEmpty': (ctx) => ({
    title: { en: 'No matters match this filter', zh: '没有符合当前筛选条件的治理事项' },
    action: {
      label: { en: 'Clear filter', zh: '清除筛选' },
      to: hubUrl(ctx.propertyId),
    },
  }),
  'governance.noComments': (ctx) => ({
    title: { en: 'No commented matters yet', zh: '暂无评论事项' },
    description: {
      en: 'Open a governance matter and share your view. It will appear here after you comment.',
      zh: '打开治理事项并发表意见后，它将显示在这里。',
    },
    ownerAction: {
      label: { en: 'View governance matters', zh: '查看治理事项' },
      to: hubUrl(ctx.propertyId),
    },
  }),
  'governance.noFollowing': (ctx) => ({
    title: { en: 'No followed matters yet', zh: '暂无关注事项' },
    description: {
      en: 'Open a matter and select Follow Matter to see it here.',
      zh: '打开事项并选择【关注事项】后，它将显示在这里。',
    },
    ownerAction: {
      label: { en: 'View governance matters', zh: '查看治理事项' },
      to: hubUrl(ctx.propertyId),
    },
  }),
  'governance.searchEmpty': (ctx) => ({
    title: {
      en: ctx.searchQuery
        ? `No governance matters match “${ctx.searchQuery}”`
        : 'No matching governance matters',
      zh: ctx.searchQuery
        ? `未找到与「${ctx.searchQuery}」相关的治理事项`
        : '未找到匹配的治理事项',
    },
    action: {
      label: { en: 'Clear search', zh: '清除搜索' },
      onClick: () => {},
    },
  }),
  'governance.archivedEmpty': () => ({
    title: { en: 'No archived matters', zh: '当前尚无已归档治理事项' },
    description: {
      en: 'Archived matters will appear here after council publishes results.',
      zh: '业委会公布结果后，已归档事项将显示在这里。',
    },
  }),
  'governance.permissionLimitedOwner': (ctx) => ({
    title: { en: 'Nothing to participate in yet', zh: '目前没有可参与的治理事项' },
    reason: {
      en: 'Only council may publish governance matters.',
      zh: '仅业委会可发布治理事项。',
    },
    ownerAction: {
      label: { en: 'Open Governance Hub', zh: '进入治理中心' },
      to: hubUrl(ctx.propertyId),
    },
  }),
  'governance.matterDiscussionEmpty': () => ({
    title: { en: 'No owner comments yet', zh: '尚无业主评论' },
    description: {
      en: 'Be the first to share a respectful, traceable view on this matter.',
      zh: '欢迎发表第一条可追溯的业主意见。',
    },
  }),
  'governance.matterDiscussionEmptyOwner': (ctx) => ({
    title: { en: 'No owner comments yet', zh: '尚无业主评论' },
    description: {
      en: 'Share your view below. Comments are public and cannot be edited.',
      zh: '请在下方发表意见。评论公开且不可修改。',
    },
    ownerAction: {
      label: { en: 'Post the first comment', zh: '发表第一条意见' },
      onClick: () => {},
    },
  }),
  'governance.noResolution': (ctx) => ({
    title: { en: 'No community resolution yet', zh: '尚未形成社区决议' },
    description: {
      en: 'Prepare a Community Resolution from this matter before scheduling a meeting.',
      zh: '排会前，请基于本事项准备社区决议。',
    },
    councilAction: {
      label: { en: 'Prepare Community Resolution', zh: '准备社区决议' },
      onClick: () => {},
    },
  }),
  'governance.noResolutionOwner': () => ({
    title: { en: 'No community resolution yet', zh: '尚未形成社区决议' },
    description: {
      en: 'This matter is still in discussion. Council will prepare a resolution when appropriate.',
      zh: '本事项仍在讨论阶段。业委会将在适当时机准备决议。',
    },
  }),
  'governance.noCda': (ctx) => ({
    title: { en: 'No CDA report yet', zh: '尚未生成宪章议事助手分析' },
    description: {
      en: 'Council may request an advisory deliberation summary when discussion begins.',
      zh: '讨论开始后，业委会可请求议事助手摘要。',
    },
    councilAction: {
      label: { en: 'Generate CDA Report', zh: '生成 CDA 报告' },
      onClick: () => {},
    },
  }),
  'governance.noCdaOwner': () => ({
    title: { en: 'No CDA report yet', zh: '尚未生成宪章议事助手分析' },
    description: {
      en: 'Council will generate the advisory report when ready. It is not a legal decision.',
      zh: '业委会将在准备就绪后生成辅助分析报告。该报告不具有法律效力。',
    },
  }),
  'governance.noDocuments': () => ({
    title: { en: 'No supporting documents', zh: '尚无支持文件' },
    description: {
      en: 'Supporting files linked to this matter will appear here.',
      zh: '与本事项关联的支持文件将显示在这里。',
    },
  }),
  'governance.cockpitNoMatters': (ctx) => ({
    title: { en: 'No governance matters yet', zh: '当前尚无治理事项' },
    description: {
      en: 'Publish the first matter to begin council workflow.',
      zh: '发布第一个事项以开始业委会工作流程。',
    },
    councilAction: {
      label: { en: 'Publish Governance Matter', zh: '发布治理事项' },
      to: newMatterUrl(ctx.propertyId),
    },
  }),
  'governance.cockpitStageEmpty': (ctx) => ({
    title: { en: 'No matters in this stage', zh: '当前阶段暂无事项' },
    description: {
      en: 'Try another pipeline filter or view all matters.',
      zh: '请尝试其他流程筛选，或查看全部事项。',
    },
    action: {
      label: { en: 'View all matters', zh: '查看全部事项' },
      to: hubUrl(ctx.propertyId),
    },
  }),
  'governance.cockpitNoActions': () => ({
    title: { en: 'No actions pending today', zh: '今日暂无待办治理事项' },
    description: {
      en: 'All active matters have been advanced to their appropriate current stage.',
      zh: '所有进行中的事项均已推进至当前应有阶段。',
    },
  }),
  'governance.cockpitSelectMatter': () => ({
    title: { en: 'Select a governance matter', zh: '请选择一个治理事项' },
    description: {
      en: 'Choose a matter from the pipeline to review details and next steps.',
      zh: '从流程列表中选择事项，查看详情与下一步。',
    },
  }),
  'governance.dashboardNoMattersOwner': (ctx) => ({
    title: { en: 'Nothing needs your attention', zh: '当前暂无需要参与的治理事项' },
    description: {
      en: 'New community matters will appear here when council publishes them.',
      zh: '业委会发布新事项后，将在此显示。',
    },
    ownerAction: {
      label: { en: 'Open Governance Hub', zh: '进入治理中心' },
      to: hubUrl(ctx.propertyId),
    },
  }),
  'governance.dashboardNoMattersCouncil': (ctx) => ({
    title: { en: 'No governance matters yet', zh: '当前暂无治理事项' },
    description: {
      en: 'Publish the first matter to open community deliberation.',
      zh: '发布第一个事项以开启社区议事。',
    },
    councilAction: {
      label: { en: 'Publish Governance Matter', zh: '发布治理事项' },
      to: newMatterUrl(ctx.propertyId),
    },
  }),
  'governance.hubMattersNoUpdate': () => ({
    title: { en: 'No governance matter updates', zh: '治理事项暂无更新' },
    description: {
      en: 'Official notices below may still apply to the community.',
      zh: '下方正式通知可能仍与社区相关。',
    },
  }),
  'governance.matterNotFound': (ctx) => ({
    title: { en: 'Governance matter not found', zh: '未找到治理事项' },
    description: {
      en: 'This matter may have been removed or you may not have access.',
      zh: '该事项可能已被删除，或您暂无访问权限。',
    },
    action: {
      label: { en: 'Back to Governance Hub', zh: '返回治理中心' },
      to: hubUrl(ctx.propertyId),
    },
  }),
};

export function getEmptyStateContent(
  key: EmptyStateContentKey,
  ctx: ContentContext = {},
): EmptyStateContent {
  return CONTENT[key](ctx);
}

export function resolveEmptyStateActions(
  content: EmptyStateContent,
  canCouncil: boolean,
): { action?: PageStateAction; secondaryAction?: PageStateAction } {
  const primary = canCouncil
    ? content.councilAction ?? content.action
    : content.ownerAction ?? content.action;
  return {
    action: primary,
    secondaryAction: content.secondaryAction,
  };
}

export function hubLifecycleStageEmptyLine(stageLabel: string, langEn: boolean): string {
  return langEn
    ? `No matters are currently in “${stageLabel}”.`
    : `当前没有处于「${stageLabel}」阶段的事项。`;
}
