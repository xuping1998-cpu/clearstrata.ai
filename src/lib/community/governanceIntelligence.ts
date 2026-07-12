import { daysUntilIso } from '@/lib/community/governanceMatterModel';
import {
  matterStatusToWorkspaceStage,
} from '@/lib/community/governanceLifecycleModel';
import type { GovernanceMatterDashboardRow } from '@/lib/community/governanceMatterModel';

/** UIP-012 — deterministic governance intelligence (no AI, no DB). */

export type GovernanceCockpitActionType =
  | 'review_discussion'
  | 'generate_cda'
  | 'prepare_resolution'
  | 'schedule_meeting'
  | 'open_voting'
  | 'archive';

export type GovernanceCockpitAction = {
  matterId: string;
  matterTitle: string;
  actionType: GovernanceCockpitActionType;
  priority: number;
  priorityTier?: number;
  sortAge?: number;
  titleEn: string;
  titleZh: string;
  reasonEn: string;
  reasonZh: string;
  constitutionReasonEn?: string;
  constitutionReasonZh?: string;
  isUrgent?: boolean;
};

export type CockpitMatterContext = {
  hasCdaReport: boolean;
};

export type CockpitMetrics = {
  todaysActions: number;
  deadlinesApproaching: number;
  awaitingCda: number;
  awaitingResolution: number;
  awaitingMeeting: number;
  awaitingVoting: number;
  governanceHealth?: GovernanceHealth;
  brief?: GovernanceBriefLine[];
};

export type GovernanceHealthLevel = 'excellent' | 'good' | 'needs_attention' | 'at_risk';

export type GovernanceHealth = {
  level: GovernanceHealthLevel;
  labelEn: string;
  labelZh: string;
  score: number;
  stalledCount: number;
  overdueCount: number;
  meetingBacklog: number;
};

export type MatterReadiness = {
  displayEn: string;
  displayZh: string;
  percent?: number;
};

export type AttentionSignal = {
  key: string;
  labelEn: string;
  labelZh: string;
};

export type MatterIntelligence = {
  matterId: string;
  readiness: MatterReadiness;
  attentionSignals: AttentionSignal[];
  bottleneckDays: number | null;
  bottleneckRecommendationEn: string | null;
  bottleneckRecommendationZh: string | null;
  priorityTier: number;
  sortAge: number;
};

export type GovernanceBriefLine = { en: string; zh: string };

export type GovernanceIntelligenceBundle = {
  brief: GovernanceBriefLine[];
  health: GovernanceHealth;
  actions: GovernanceCockpitAction[];
  metrics: CockpitMetrics;
  matterById: Record<string, MatterIntelligence>;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** GI-002 priority tiers — lower number = higher priority. */
export const PRIORITY_TIER = {
  voting_closing_soon: 1,
  meeting_waiting: 2,
  resolution_ready: 3,
  consultation_completed: 4,
  discussion_overdue: 5,
  new_discussion: 6,
  publish_result: 7,
  other: 8,
} as const;

function daysSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso?.trim()) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((now - t) / MS_PER_DAY);
}

function isVotingClosingSoon(matter: GovernanceMatterDashboardRow): boolean {
  if (!['meeting', 'voting'].includes(matter.status)) return false;
  const days = daysUntilIso(matter.discussion_deadline);
  return days != null && days <= 1;
}

function isDiscussionOverdue(matter: GovernanceMatterDashboardRow): boolean {
  if (matter.status !== 'discussion') return false;
  const days = daysUntilIso(matter.discussion_deadline);
  if (days != null && days <= 0) return true;
  const age = daysSince(matter.created_at);
  return age != null && age > 14;
}

function isStalled(matter: GovernanceMatterDashboardRow): boolean {
  if (matter.status === 'archived' || matter.status === 'draft') return false;
  const anchor = matter.last_revision_at || matter.created_at;
  const age = daysSince(anchor);
  if (age == null) return false;
  if (['discussion', 'public_consultation'].includes(matter.status)) return age >= 14;
  if (['resolution_draft', 'council_review'].includes(matter.status)) return age >= 21;
  if (matter.status === 'meeting' && matter.meeting_id && !matter.voting_id) return age >= 14;
  return false;
}

/** GI-003 + GI-008 — one recommended action per matter with constitutional basis. */
export function inferNextBestAction(
  matter: GovernanceMatterDashboardRow,
  ctx: CockpitMatterContext,
): GovernanceCockpitAction | null {
  const status = matter.status;
  const hasResolution = Boolean(matter.resolution_id);
  const hasMeeting = Boolean(matter.meeting_id);
  const hasVoting = Boolean(matter.voting_id);
  const constitution = constitutionBasisForAction;

  if (status === 'archived') return null;

  if (status === 'decision' || status === 'execution') {
    const basis = constitution('archive', status);
    return {
      matterId: matter.id,
      matterTitle: matter.title,
      actionType: 'archive',
      priority: 0,
      priorityTier: PRIORITY_TIER.publish_result,
      sortAge: Date.parse(matter.created_at),
      titleEn: 'Publish result',
      titleZh: '公布结果',
      reasonEn: 'Voting closed — ready for Community Memory',
      reasonZh: '投票已结束 — 可归档至社区记忆',
      constitutionReasonEn: basis.en,
      constitutionReasonZh: basis.zh,
    };
  }

  if (hasMeeting && !hasVoting && (status === 'meeting' || status === 'voting')) {
    const basis = constitution('open_voting', status);
    return {
      matterId: matter.id,
      matterTitle: matter.title,
      actionType: 'open_voting',
      priority: 0,
      priorityTier: isVotingClosingSoon(matter)
        ? PRIORITY_TIER.voting_closing_soon
        : PRIORITY_TIER.meeting_waiting,
      sortAge: Date.parse(matter.created_at),
      titleEn: 'Open voting',
      titleZh: '开放投票',
      reasonEn: 'Meeting linked; voting not yet open',
      reasonZh: '会议已关联；投票尚未开放',
      constitutionReasonEn: basis.en,
      constitutionReasonZh: basis.zh,
      isUrgent: isVotingClosingSoon(matter),
    };
  }

  if (hasResolution && !hasMeeting) {
    const basis = constitution('schedule_meeting', status);
    return {
      matterId: matter.id,
      matterTitle: matter.title,
      actionType: 'schedule_meeting',
      priority: 0,
      priorityTier: PRIORITY_TIER.meeting_waiting,
      sortAge: Date.parse(matter.created_at),
      titleEn: 'Schedule meeting',
      titleZh: '排定会议',
      reasonEn: 'Resolution ready — schedule meeting',
      reasonZh: '决议已就绪 — 待排会议',
      constitutionReasonEn: basis.en,
      constitutionReasonZh: basis.zh,
    };
  }

  if (['resolution_draft', 'council_review'].includes(status)) {
    const basis = constitution('prepare_resolution', status);
    return {
      matterId: matter.id,
      matterTitle: matter.title,
      actionType: 'prepare_resolution',
      priority: 0,
      priorityTier: PRIORITY_TIER.resolution_ready,
      sortAge: Date.parse(matter.created_at),
      titleEn: 'Prepare Community Resolution',
      titleZh: '准备社区决议',
      reasonEn: 'Resolution stage — draft or council review',
      reasonZh: '决议阶段 — 草案或业委会审议',
      constitutionReasonEn: basis.en,
      constitutionReasonZh: basis.zh,
    };
  }

  if (status === 'public_consultation') {
    const basis = constitution('prepare_resolution', status);
    const tier =
      matter.comment_count > 0
        ? PRIORITY_TIER.consultation_completed
        : PRIORITY_TIER.new_discussion;
    return {
      matterId: matter.id,
      matterTitle: matter.title,
      actionType: 'prepare_resolution',
      priority: 0,
      priorityTier: tier,
      sortAge: Date.parse(matter.created_at),
      titleEn: 'Prepare Community Resolution',
      titleZh: '准备社区决议',
      reasonEn:
        matter.comment_count > 0
          ? 'Public consultation completed — prepare resolution'
          : 'Public consultation open — gather input first',
      reasonZh:
        matter.comment_count > 0
          ? '公开征求意见已完成 — 准备决议'
          : '公开征求意见进行中 — 先收集意见',
      constitutionReasonEn: basis.en,
      constitutionReasonZh: basis.zh,
    };
  }

  if (status === 'discussion') {
    if (!ctx.hasCdaReport) {
      const basis = constitution('generate_cda', status);
      const tier = isDiscussionOverdue(matter)
        ? PRIORITY_TIER.discussion_overdue
        : PRIORITY_TIER.new_discussion;
      return {
        matterId: matter.id,
        matterTitle: matter.title,
        actionType: 'generate_cda',
        priority: 0,
        priorityTier: tier,
        sortAge: Date.parse(matter.created_at),
        titleEn: 'Generate CDA report',
        titleZh: '生成 CDA 报告',
        reasonEn: matter.comment_count > 0
          ? `${matter.comment_count} comment${matter.comment_count === 1 ? '' : 's'} — generate deliberation analysis`
          : 'Discussion open — generate CDA when ready',
        reasonZh:
          matter.comment_count > 0
            ? `已有 ${matter.comment_count} 条评论 — 生成议事分析`
            : '讨论进行中 — 适时生成议事助手报告',
        constitutionReasonEn: basis.en,
        constitutionReasonZh: basis.zh,
        isUrgent: isDiscussionOverdue(matter),
      };
    }
    const basis = constitution('review_discussion', status);
    return {
      matterId: matter.id,
      matterTitle: matter.title,
      actionType: 'review_discussion',
      priority: 0,
      priorityTier: isDiscussionOverdue(matter)
        ? PRIORITY_TIER.discussion_overdue
        : PRIORITY_TIER.new_discussion,
      sortAge: Date.parse(matter.created_at),
      titleEn: 'Review discussion',
      titleZh: '审议讨论',
      reasonEn: 'CDA available — review before consultation',
      reasonZh: '议事助手报告已就绪 — 审议后进入征求意见',
      constitutionReasonEn: basis.en,
      constitutionReasonZh: basis.zh,
      isUrgent: isDiscussionOverdue(matter),
    };
  }

  return null;
}

/** GI-008 — constitutional chain (existing governance model only). */
export function constitutionBasisForAction(
  actionType: GovernanceCockpitActionType,
  status: GovernanceMatterDashboardRow['status'],
): { en: string; zh: string } {
  const chainEn = 'Discussion → Consultation → Resolution → Meeting → Voting → Archive';
  const chainZh = '讨论 → 征求意见 → 决议 → 会议 → 投票 → 归档';

  const byAction: Record<GovernanceCockpitActionType, { en: string; zh: string }> = {
    review_discussion: {
      en: `Current stage: ${status}. ${chainEn}`,
      zh: `当前阶段：${status}。${chainZh}`,
    },
    generate_cda: {
      en: `Discussion must be analyzed before consultation. ${chainEn}`,
      zh: `讨论须经议事助手分析后再进入征求意见。${chainZh}`,
    },
    prepare_resolution: {
      en: `Public consultation completed or resolution drafting required. ${chainEn}`,
      zh: `公开征求意见已完成或需起草决议。${chainZh}`,
    },
    schedule_meeting: {
      en: `Resolution approved — meeting required before voting. ${chainEn}`,
      zh: `决议已就绪 — 投票前须排定会议。${chainZh}`,
    },
    open_voting: {
      en: `Meeting held — voting must open before decision. ${chainEn}`,
      zh: `会议已关联 — 决策前须开放投票。${chainZh}`,
    },
    archive: {
      en: `Decision recorded — matter moves to Community Memory. ${chainEn}`,
      zh: `决议已记录 — 事项进入社区记忆。${chainZh}`,
    },
  };

  return byAction[actionType];
}

/** GI-004 — readiness display (rules only). */
export function computeMatterReadiness(
  matter: GovernanceMatterDashboardRow,
  ctx: CockpitMatterContext,
): MatterReadiness {
  const stage = matterStatusToWorkspaceStage(matter.status);

  if (stage === 'discussion') {
    let percent = 25;
    if (matter.comment_count > 0) percent += 25;
    if (ctx.hasCdaReport) percent += 15;
    if (matter.discussion_deadline) percent += 10;
    percent = Math.min(percent, 90);
    return {
      displayEn: `${percent}%`,
      displayZh: `${percent}%`,
      percent,
    };
  }

  if (stage === 'consultation') {
    return {
      displayEn: matter.comment_count > 0 ? '100%' : '75%',
      displayZh: matter.comment_count > 0 ? '100%' : '75%',
      percent: matter.comment_count > 0 ? 100 : 75,
    };
  }

  if (stage === 'resolution') {
    return { displayEn: 'Ready', displayZh: '就绪' };
  }

  if (stage === 'meeting') {
    return { displayEn: 'Waiting', displayZh: '等待中' };
  }

  if (stage === 'voting') {
    return { displayEn: 'In Progress', displayZh: '进行中' };
  }

  if (stage === 'execution' || stage === 'archived') {
    return { displayEn: 'Complete', displayZh: '已完成' };
  }

  return { displayEn: 'Draft', displayZh: '草稿' };
}

/** GI-005 — subtle attention signals. */
export function detectAttentionSignals(
  matter: GovernanceMatterDashboardRow,
  ctx: CockpitMatterContext,
): AttentionSignal[] {
  const signals: AttentionSignal[] = [];
  const age = daysSince(matter.created_at);

  if (matter.status === 'discussion' && age != null && age > 14) {
    signals.push({
      key: 'discussion_stale',
      labelEn: 'Discussion >14 days',
      labelZh: '讨论超过14天',
    });
  }

  if (matter.status === 'public_consultation' && matter.comment_count === 0) {
    signals.push({
      key: 'consultation_no_comments',
      labelEn: 'No consultation comments',
      labelZh: '征求意见尚无评论',
    });
  }

  if (
    ['resolution_draft', 'council_review'].includes(matter.status) &&
    daysSince(matter.last_revision_at) != null &&
    daysSince(matter.last_revision_at)! > 21
  ) {
    signals.push({
      key: 'resolution_inactive',
      labelEn: 'Resolution inactive',
      labelZh: '决议长期无进展',
    });
  }

  if (matter.meeting_id && !matter.voting_id && matter.status === 'meeting') {
    signals.push({
      key: 'meeting_no_voting',
      labelEn: 'Meeting — voting not open',
      labelZh: '会议已排 — 投票未开放',
    });
  }

  if (isVotingClosingSoon(matter)) {
    signals.push({
      key: 'voting_closing',
      labelEn: 'Voting closes within 24h',
      labelZh: '投票24小时内截止',
    });
  }

  if (
    ['discussion', 'public_consultation'].includes(matter.status) &&
    !ctx.hasCdaReport &&
    matter.comment_count > 0
  ) {
    signals.push({
      key: 'cda_pending',
      labelEn: 'CDA not generated',
      labelZh: '尚未生成议事助手',
    });
  }

  return signals;
}

/** GI-006 — bottleneck stagnation recommendation. */
export function detectBottleneck(
  matter: GovernanceMatterDashboardRow,
  pendingAction: GovernanceCockpitAction | null,
): {
  days: number | null;
  recommendationEn: string | null;
  recommendationZh: string | null;
} {
  const anchor = matter.last_revision_at || matter.created_at;
  const days = daysSince(anchor);

  if (days == null || !pendingAction) {
    return { days: null, recommendationEn: null, recommendationZh: null };
  }

  if (matter.status === 'discussion' && days >= 28 && pendingAction.actionType === 'generate_cda') {
    return {
      days,
      recommendationEn: 'Discussion active 28+ days — recommend Generate CDA',
      recommendationZh: '讨论已进行28天以上 — 建议生成议事助手',
    };
  }

  if (
    matter.resolution_id &&
    !matter.meeting_id &&
    days >= 21 &&
    pendingAction.actionType === 'schedule_meeting'
  ) {
    return {
      days,
      recommendationEn: 'Resolution exists 21+ days — recommend Schedule Meeting',
      recommendationZh: '决议已存在21天以上 — 建议排定会议',
    };
  }

  if (
    (matter.status === 'decision' || matter.status === 'execution') &&
    pendingAction.actionType === 'archive'
  ) {
    return {
      days,
      recommendationEn: 'Meeting/voting ended — recommend Publish Result',
      recommendationZh: '会议/投票已结束 — 建议公布结果',
    };
  }

  return { days: days >= 14 ? days : null, recommendationEn: null, recommendationZh: null };
}

/** GI-007 — property-level health (documented rules). */
export function computeGovernanceHealth(
  matters: GovernanceMatterDashboardRow[],
  cdaByMatterId: Record<string, boolean>,
): GovernanceHealth {
  const active = matters.filter((m) => m.status !== 'archived' && m.status !== 'draft');
  let stalledCount = 0;
  let overdueCount = 0;
  let meetingBacklog = 0;

  for (const m of active) {
    if (isStalled(m)) stalledCount += 1;
    const deadlineDays = daysUntilIso(m.discussion_deadline);
    if (deadlineDays != null && deadlineDays <= 0) overdueCount += 1;
    if (m.resolution_id && !m.meeting_id) meetingBacklog += 1;
  }

  let score = 100;
  score -= stalledCount * 12;
  score -= overdueCount * 15;
  score -= meetingBacklog * 8;
  score = Math.max(0, Math.min(100, score));

  let level: GovernanceHealthLevel = 'excellent';
  if (score < 40 || overdueCount >= 3) level = 'at_risk';
  else if (score < 65 || stalledCount >= 3) level = 'needs_attention';
  else if (score < 85 || stalledCount >= 1) level = 'good';

  const labels: Record<GovernanceHealthLevel, { en: string; zh: string }> = {
    excellent: { en: 'Excellent', zh: '优秀' },
    good: { en: 'Good', zh: '良好' },
    needs_attention: { en: 'Needs Attention', zh: '需要关注' },
    at_risk: { en: 'At Risk', zh: '存在风险' },
  };

  return {
    level,
    labelEn: labels[level].en,
    labelZh: labels[level].zh,
    score,
    stalledCount,
    overdueCount,
    meetingBacklog,
  };
}

/** GI-001 — Today's Governance Brief (deterministic). */
export function buildTodaysGovernanceBrief(
  matters: GovernanceMatterDashboardRow[],
  actions: GovernanceCockpitAction[],
  cdaByMatterId: Record<string, boolean>,
): GovernanceBriefLine[] {
  const active = matters.filter((m) => m.status !== 'archived' && m.status !== 'draft');
  const readyForCda = active.filter(
    (m) => ['discussion', 'public_consultation'].includes(m.status) && !cdaByMatterId[m.id],
  ).length;
  const resolutionReady = active.filter(
    (m) =>
      m.resolution_id ||
      ['resolution_draft', 'council_review'].includes(m.status) ||
      (m.status === 'public_consultation' && m.comment_count > 0),
  ).length;
  const meetingsWaiting = active.filter((m) => m.resolution_id && !m.meeting_id).length;
  const votingSoon = actions.filter((a) => a.priorityTier === PRIORITY_TIER.voting_closing_soon).length;

  const lines: GovernanceBriefLine[] = [
    {
      en: `Today — ${active.length} active matter${active.length === 1 ? '' : 's'}`,
      zh: `今日 — ${active.length} 项进行中事项`,
    },
    {
      en: `${readyForCda} ready for CDA`,
      zh: `${readyForCda} 项待生成议事助手`,
    },
    {
      en: `${resolutionReady} resolution ready`,
      zh: `${resolutionReady} 项决议就绪`,
    },
    {
      en: `${meetingsWaiting} meeting${meetingsWaiting === 1 ? '' : 's'} waiting`,
      zh: `${meetingsWaiting} 项待排会议`,
    },
    votingSoon > 0
      ? {
          en: `${votingSoon} voting deadline${votingSoon === 1 ? '' : 's'} within 24h`,
          zh: `${votingSoon} 项投票24小时内截止`,
        }
      : {
          en: 'No voting deadlines today',
          zh: '今日无投票截止',
        },
  ];

  return lines;
}

function analyzeMatter(
  matter: GovernanceMatterDashboardRow,
  ctx: CockpitMatterContext,
  pending: GovernanceCockpitAction | null,
): MatterIntelligence {
  const bottleneck = detectBottleneck(matter, pending);
  return {
    matterId: matter.id,
    readiness: computeMatterReadiness(matter, ctx),
    attentionSignals: detectAttentionSignals(matter, ctx),
    bottleneckDays: bottleneck.days,
    bottleneckRecommendationEn: bottleneck.recommendationEn,
    bottleneckRecommendationZh: bottleneck.recommendationZh,
    priorityTier: pending?.priorityTier ?? PRIORITY_TIER.other,
    sortAge: Date.parse(matter.created_at),
  };
}

export function buildGovernanceIntelligenceBundle(
  matters: GovernanceMatterDashboardRow[],
  cdaByMatterId: Record<string, boolean>,
): GovernanceIntelligenceBundle {
  const active = matters.filter((m) => m.status !== 'archived');
  const actions: GovernanceCockpitAction[] = [];
  const matterById: Record<string, MatterIntelligence> = {};

  for (const matter of active) {
    const ctx: CockpitMatterContext = { hasCdaReport: cdaByMatterId[matter.id] ?? false };
    const pending = inferNextBestAction(matter, ctx);
    if (pending) {
      actions.push({
        ...pending,
        priority: pending.priorityTier * 1000 + pending.sortAge,
      });
    }
    matterById[matter.id] = analyzeMatter(matter, ctx, pending);
  }

  actions.sort(
    (a, b) =>
      (a.priorityTier ?? PRIORITY_TIER.other) - (b.priorityTier ?? PRIORITY_TIER.other) ||
      (a.sortAge ?? 0) - (b.sortAge ?? 0) ||
      a.matterTitle.localeCompare(b.matterTitle),
  );

  const health = computeGovernanceHealth(matters, cdaByMatterId);
  const brief = buildTodaysGovernanceBrief(matters, actions, cdaByMatterId);

  const activeNonDraft = matters.filter((m) => m.status !== 'archived' && m.status !== 'draft');
  const metrics: CockpitMetrics = {
    todaysActions: actions.length,
    deadlinesApproaching: activeNonDraft.filter((m) => {
      const d = daysUntilIso(m.discussion_deadline);
      return d != null && d <= 2;
    }).length,
    awaitingCda: activeNonDraft.filter(
      (m) => ['discussion', 'public_consultation'].includes(m.status) && !cdaByMatterId[m.id],
    ).length,
    awaitingResolution: activeNonDraft.filter((m) => !m.resolution_id).length,
    awaitingMeeting: activeNonDraft.filter((m) => m.resolution_id && !m.meeting_id).length,
    awaitingVoting: activeNonDraft.filter((m) => m.meeting_id && !m.voting_id).length,
    governanceHealth: health,
    brief,
  };

  return { brief, health, actions, metrics, matterById };
}

export function nextBestActionLabel(
  action: GovernanceCockpitAction | null,
  langEn: boolean,
): string | null {
  if (!action) return null;
  return langEn ? action.titleEn : action.titleZh;
}
