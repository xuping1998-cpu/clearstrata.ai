import { communityResolutionDetailUrl, type CommunityResolutionRow } from '@/lib/community/communityResolutionModel';
import type { GovernanceMatterCdaReportRow } from '@/lib/community/cdaReportModel';
import { HUB_LIFECYCLE_STAGES, type HubLifecycleStage } from '@/lib/community/governanceHubLifecycle';
import {
  governanceMatterDetailUrl,
  governanceMatterStatusLabel,
  type GovernanceMatterCommentRow,
  type GovernanceMatterRevisionRow,
  type GovernanceMatterRow,
  type GovernanceMatterStatus,
} from '@/lib/community/governanceMatterModel';

export type GovernanceTimelinePhase = HubLifecycleStage;

export type GovernanceTimelineActorRole =
  | 'council'
  | 'manager'
  | 'owner'
  | 'lawyer'
  | 'auditor'
  | 'platform'
  | 'system';

export type GovernanceTimelineFilter = 'all' | 'workflow' | 'documents' | 'comments' | 'votes' | 'system';

export type GovernanceTimelineDocument = {
  id: string;
  labelEn: string;
  labelZh: string;
  url: string;
};

export type GovernanceTimelineEvent = {
  id: string;
  at: string;
  entityId: string;
  eventType: string;
  phase: GovernanceTimelinePhase;
  titleEn: string;
  titleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  reasonEn: string | null;
  reasonZh: string | null;
  statusEn: string;
  statusZh: string;
  actorRole: GovernanceTimelineActorRole;
  actorLabelEn: string;
  actorLabelZh: string;
  filterCategory: Exclude<GovernanceTimelineFilter, 'all'>;
  councilOnly: boolean;
  documents: GovernanceTimelineDocument[];
};

export type GovernanceStageDuration = {
  phase: GovernanceTimelinePhase;
  labelEn: string;
  labelZh: string;
  startedAt: string | null;
  completedAt: string | null;
  durationLabelEn: string | null;
  durationLabelZh: string | null;
  isCurrent: boolean;
};

const ACTOR_LABEL_EN: Record<GovernanceTimelineActorRole, string> = {
  council: 'Council',
  manager: 'Manager',
  owner: 'Owner',
  lawyer: 'Lawyer',
  auditor: 'Auditor',
  platform: 'Platform',
  system: 'System Automation',
};

const ACTOR_LABEL_ZH: Record<GovernanceTimelineActorRole, string> = {
  council: '业委会',
  manager: '物业经理',
  owner: '业主',
  lawyer: '律师',
  auditor: '审计',
  platform: '平台',
  system: '系统自动',
};

const PHASE_LABEL_EN: Record<GovernanceTimelinePhase, string> = {
  discussion: 'Discussion',
  consultation: 'Consultation',
  resolution: 'Resolution',
  meeting: 'Meeting',
  voting: 'Voting',
  archive: 'Archive',
};

const PHASE_LABEL_ZH: Record<GovernanceTimelinePhase, string> = {
  discussion: '讨论',
  consultation: '征求意见',
  resolution: '决议',
  meeting: '会议',
  voting: '投票',
  archive: '归档',
};

const INTERNAL_CHANGE_KINDS = new Set([
  'title_updated',
  'description_updated',
  'category_updated',
  'discussion_deadline_updated',
  'matter_updated',
]);

function actorFromChangeKind(changeKind: string, changedBy: string | null): GovernanceTimelineActorRole {
  if (!changedBy && changeKind === 'matter_created') return 'system';
  if (!changedBy) return 'system';
  return 'council';
}

function actorLabel(role: GovernanceTimelineActorRole, langEn: boolean): string {
  return langEn ? ACTOR_LABEL_EN[role] : ACTOR_LABEL_ZH[role];
}

export function statusToTimelinePhase(status: GovernanceMatterStatus | null | undefined): GovernanceTimelinePhase {
  switch (status) {
    case 'public_consultation':
      return 'consultation';
    case 'resolution_draft':
    case 'council_review':
      return 'resolution';
    case 'meeting':
      return 'meeting';
    case 'voting':
      return 'voting';
    case 'decision':
    case 'execution':
    case 'archived':
      return 'archive';
    default:
      return 'discussion';
  }
}

export function matterToCurrentTimelinePhase(matter: GovernanceMatterRow): GovernanceTimelinePhase {
  return statusToTimelinePhase(matter.status);
}

function previousStatusFromSnapshot(snapshot: Record<string, unknown>): GovernanceMatterStatus | null {
  const prev = snapshot.previous;
  if (!prev || typeof prev !== 'object') return null;
  const status = (prev as Record<string, unknown>).status;
  return typeof status === 'string' ? (status as GovernanceMatterStatus) : null;
}

function formatDurationDays(startIso: string, endIso: string, langEn: boolean): string {
  const ms = Math.max(0, new Date(endIso).getTime() - new Date(startIso).getTime());
  const days = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
  return langEn ? `${days} day${days === 1 ? '' : 's'}` : `${days} 天`;
}

function revisionEventMeta(
  revision: GovernanceMatterRevisionRow,
  langEn: boolean,
): Pick<
  GovernanceTimelineEvent,
  | 'titleEn'
  | 'titleZh'
  | 'descriptionEn'
  | 'descriptionZh'
  | 'reasonEn'
  | 'reasonZh'
  | 'statusEn'
  | 'statusZh'
  | 'eventType'
  | 'phase'
  | 'filterCategory'
  | 'councilOnly'
> {
  const en = langEn;
  const status = revision.status;
  const prevStatus = previousStatusFromSnapshot(revision.snapshot);
  const phase = statusToTimelinePhase(status);

  if (revision.change_kind === 'matter_created') {
    return {
      eventType: 'matter_created',
      phase: 'discussion',
      titleEn: 'Discussion Created',
      titleZh: '讨论已创建',
      descriptionEn: 'Governance matter opened for community deliberation.',
      descriptionZh: '治理事项已开放社区议事。',
      reasonEn: 'Council published this matter for deliberation.',
      reasonZh: '业委会发布本事项以供议事。',
      statusEn: 'Recorded',
      statusZh: '已记录',
      filterCategory: 'workflow',
      councilOnly: false,
    };
  }

  if (INTERNAL_CHANGE_KINDS.has(revision.change_kind)) {
    const detail =
      revision.change_kind === 'discussion_deadline_updated'
        ? en
          ? 'Consultation or discussion deadline adjusted.'
          : '讨论或征求意见截止日期已调整。'
        : en
          ? 'Internal matter fields updated by council.'
          : '业委会更新了内部事项字段。';
    return {
      eventType: revision.change_kind,
      phase,
      titleEn: 'Internal Workflow Update',
      titleZh: '内部流程更新',
      descriptionEn: detail,
      descriptionZh: detail,
      reasonEn: en ? 'Council revised matter metadata.' : '业委会修订了事项元数据。',
      reasonZh: en ? 'Council revised matter metadata.' : '业委会修订了事项元数据。',
      statusEn: 'Internal',
      statusZh: '内部',
      filterCategory: 'workflow',
      councilOnly: true,
    };
  }

  if (revision.change_kind === 'status_updated' && status === 'public_consultation') {
    return {
      eventType: 'consultation_opened',
      phase: 'consultation',
      titleEn: 'Public Consultation Opened',
      titleZh: '公开征求意见已开启',
      descriptionEn: 'Owners may submit comments during the consultation window.',
      descriptionZh: '业主可在征求意见期内提交评论。',
      reasonEn: en ? 'Council advanced matter to public consultation.' : '业委会将事项推进至公开征求意见阶段。',
      reasonZh: en ? 'Council advanced matter to public consultation.' : '业委会将事项推进至公开征求意见阶段。',
      statusEn: 'Open',
      statusZh: '进行中',
      filterCategory: 'workflow',
      councilOnly: false,
    };
  }

  if (revision.change_kind === 'status_updated' && prevStatus === 'public_consultation') {
    return {
      eventType: 'consultation_closed',
      phase: 'consultation',
      titleEn: 'Consultation Closed',
      titleZh: '征求意见已结束',
      descriptionEn: 'Public consultation period completed.',
      descriptionZh: '公开征求意见期已结束。',
      reasonEn: 'Public consultation completed.',
      reasonZh: '公开征求意见已完成。',
      statusEn: 'Closed',
      statusZh: '已结束',
      filterCategory: 'workflow',
      councilOnly: false,
    };
  }

  if (revision.change_kind === 'status_updated' && (status === 'resolution_draft' || status === 'council_review')) {
    return {
      eventType: 'resolution_prepared',
      phase: 'resolution',
      titleEn: 'Resolution Prepared',
      titleZh: '决议已准备',
      descriptionEn: 'Community resolution draft entered council workflow.',
      descriptionZh: '社区决议草案已进入业委会流程。',
      reasonEn: en ? 'Council prepared resolution from deliberation.' : '业委会根据议事结果准备决议。',
      reasonZh: en ? 'Council prepared resolution from deliberation.' : '业委会根据议事结果准备决议。',
      statusEn: status ? governanceMatterStatusLabel(status, true) : 'In progress',
      statusZh: status ? governanceMatterStatusLabel(status, false) : '进行中',
      filterCategory: 'workflow',
      councilOnly: false,
    };
  }

  if (revision.change_kind === 'status_updated' && status === 'meeting') {
    return {
      eventType: 'meeting_scheduled',
      phase: 'meeting',
      titleEn: 'Meeting Scheduled',
      titleZh: '会议已安排',
      descriptionEn: 'Governance meeting linked to this matter.',
      descriptionZh: '与本事项关联的治理会议已排定。',
      reasonEn: en ? 'Council scheduled meeting for resolution deliberation.' : '业委会为决议审议排定会议。',
      reasonZh: en ? 'Council scheduled meeting for resolution deliberation.' : '业委会为决议审议排定会议。',
      statusEn: 'Scheduled',
      statusZh: '已排定',
      filterCategory: 'workflow',
      councilOnly: false,
    };
  }

  if (revision.change_kind === 'status_updated' && status === 'voting') {
    return {
      eventType: 'voting_opened',
      phase: 'voting',
      titleEn: 'Voting Opened',
      titleZh: '投票已开启',
      descriptionEn: 'Owner voting is open for this matter.',
      descriptionZh: '本事项已开放业主投票。',
      reasonEn: en ? 'Council opened owner voting after meeting readiness.' : '会议就绪后业委会开放业主投票。',
      reasonZh: en ? 'Council opened owner voting after meeting readiness.' : '会议就绪后业委会开放业主投票。',
      statusEn: 'Open',
      statusZh: '进行中',
      filterCategory: 'votes',
      councilOnly: false,
    };
  }

  if (
    revision.change_kind === 'status_updated' &&
    (status === 'decision' || status === 'execution') &&
    prevStatus === 'voting'
  ) {
    return {
      eventType: 'voting_closed',
      phase: 'voting',
      titleEn: 'Voting Closed',
      titleZh: '投票已结束',
      descriptionEn: 'Owner voting period ended; outcome recorded.',
      descriptionZh: '业主投票期结束；结果已记录。',
      reasonEn: en ? 'Voting window closed per governance workflow.' : '按治理流程关闭投票窗口。',
      reasonZh: en ? 'Voting window closed per governance workflow.' : '按治理流程关闭投票窗口。',
      statusEn: 'Closed',
      statusZh: '已结束',
      filterCategory: 'votes',
      councilOnly: false,
    };
  }

  if (revision.change_kind === 'status_updated' && (status === 'decision' || status === 'execution')) {
    return {
      eventType: 'result_published',
      phase: 'archive',
      titleEn: 'Result Published',
      titleZh: '结果已公布',
      descriptionEn: 'Governance decision published to the community.',
      descriptionZh: '治理决定已向社区公布。',
      reasonEn: en ? 'Council published vote outcome and decision.' : '业委会公布投票结果与决定。',
      reasonZh: en ? 'Council published vote outcome and decision.' : '业委会公布投票结果与决定。',
      statusEn: status ? governanceMatterStatusLabel(status, true) : 'Published',
      statusZh: status ? governanceMatterStatusLabel(status, false) : '已公布',
      filterCategory: 'workflow',
      councilOnly: false,
    };
  }

  if (revision.change_kind === 'status_updated' && status === 'archived') {
    return {
      eventType: 'archived',
      phase: 'archive',
      titleEn: 'Archived',
      titleZh: '已归档',
      descriptionEn: 'Matter recorded in community governance memory.',
      descriptionZh: '事项已记入社区治理档案。',
      reasonEn: en ? 'Council archived completed governance matter.' : '业委会归档已完成的治理事项。',
      reasonZh: en ? 'Council archived completed governance matter.' : '业委会归档已完成的治理事项。',
      statusEn: 'Archived',
      statusZh: '已归档',
      filterCategory: 'workflow',
      councilOnly: false,
    };
  }

  if (revision.change_kind === 'status_updated' && status) {
    return {
      eventType: 'status_updated',
      phase,
      titleEn: 'Status Updated',
      titleZh: '状态已更新',
      descriptionEn: `Matter status set to ${governanceMatterStatusLabel(status, true)}.`,
      descriptionZh: `事项状态更新为${governanceMatterStatusLabel(status, false)}。`,
      reasonEn: en ? 'Council updated governance workflow status.' : '业委会更新了治理流程状态。',
      reasonZh: en ? 'Council updated governance workflow status.' : '业委会更新了治理流程状态。',
      statusEn: governanceMatterStatusLabel(status, true),
      statusZh: governanceMatterStatusLabel(status, false),
      filterCategory: 'workflow',
      councilOnly: false,
    };
  }

  return {
    eventType: revision.change_kind,
    phase,
    titleEn: revision.change_kind.replace(/_/g, ' '),
    titleZh: revision.change_kind.replace(/_/g, ' '),
    descriptionEn: 'Governance workflow event recorded.',
    descriptionZh: '治理流程事件已记录。',
    reasonEn: null,
    reasonZh: null,
    statusEn: 'Recorded',
    statusZh: '已记录',
    filterCategory: 'workflow',
    councilOnly: true,
  };
}

function revisionDocuments(
  revision: GovernanceMatterRevisionRow,
  propertyId: string,
  linkedResolution: CommunityResolutionRow | null,
): GovernanceTimelineDocument[] {
  const docs: GovernanceTimelineDocument[] = [];
  if (revision.meeting_id) {
    docs.push({
      id: `meeting-${revision.meeting_id}`,
      labelEn: 'Meeting Notice',
      labelZh: '会议通知',
      url: `/meetings/${encodeURIComponent(revision.meeting_id)}?propertyId=${encodeURIComponent(propertyId)}`,
    });
  }
  if (linkedResolution && revision.status && ['resolution_draft', 'council_review', 'meeting', 'voting'].includes(revision.status)) {
    docs.push({
      id: `resolution-${linkedResolution.id}`,
      labelEn: 'Resolution PDF',
      labelZh: '决议文件',
      url: communityResolutionDetailUrl(linkedResolution.id, propertyId),
    });
  }
  return docs;
}

export type BuildGovernanceTimelineInput = {
  matter: GovernanceMatterRow;
  propertyId: string;
  revisions: GovernanceMatterRevisionRow[];
  comments: GovernanceMatterCommentRow[];
  cdaReport: GovernanceMatterCdaReportRow | null;
  linkedResolution: CommunityResolutionRow | null;
};

export function buildGovernanceTimelineEvents(input: BuildGovernanceTimelineInput): GovernanceTimelineEvent[] {
  const { matter, propertyId, revisions, comments, cdaReport, linkedResolution } = input;
  const events: GovernanceTimelineEvent[] = [];

  for (const revision of revisions) {
    const meta = revisionEventMeta(revision, true);
    const actorRole = actorFromChangeKind(revision.change_kind, revision.changed_by);
    events.push({
      id: `rev-${revision.id}`,
      at: revision.created_at,
      entityId: revision.id,
      actorRole,
      actorLabelEn: actorLabel(actorRole, true),
      actorLabelZh: actorLabel(actorRole, false),
      documents: meta.councilOnly ? [] : revisionDocuments(revision, propertyId, linkedResolution),
      ...meta,
    });
  }

  if (cdaReport?.created_at) {
    events.push({
      id: `cda-${cdaReport.id}`,
      at: cdaReport.created_at,
      entityId: cdaReport.id,
      eventType: 'cda_generated',
      phase: statusToTimelinePhase(matter.status),
      titleEn: 'CDA Generated',
      titleZh: '议事助手报告已生成',
      descriptionEn: 'Constitutional deliberation assistant report generated from discussion.',
      descriptionZh: '根据讨论生成宪章议事助手报告。',
      reasonEn: 'Council requested deliberation analysis.',
      reasonZh: '业委会请求议事分析。',
      statusEn: 'Generated',
      statusZh: '已生成',
      actorRole: cdaReport.requested_by ? 'council' : 'system',
      actorLabelEn: actorLabel(cdaReport.requested_by ? 'council' : 'system', true),
      actorLabelZh: actorLabel(cdaReport.requested_by ? 'council' : 'system', false),
      filterCategory: 'documents',
      councilOnly: true,
      documents: [
        {
          id: `cda-doc-${cdaReport.id}`,
          labelEn: 'CDA Report',
          labelZh: '议事助手报告',
          url: governanceMatterDetailUrl(matter.id, propertyId),
        },
      ],
    });
  }

  if (linkedResolution?.created_at) {
    events.push({
      id: `res-${linkedResolution.id}`,
      at: linkedResolution.created_at,
      entityId: linkedResolution.id,
      eventType: 'resolution_created',
      phase: 'resolution',
      titleEn: 'Resolution Created',
      titleZh: '社区决议已创建',
      descriptionEn: linkedResolution.title,
      descriptionZh: linkedResolution.title,
      reasonEn: 'Council created community resolution from governance matter.',
      reasonZh: '业委会根据治理事项创建社区决议。',
      statusEn: linkedResolution.status,
      statusZh: linkedResolution.status,
      actorRole: linkedResolution.created_by ? 'council' : 'system',
      actorLabelEn: actorLabel(linkedResolution.created_by ? 'council' : 'system', true),
      actorLabelZh: actorLabel(linkedResolution.created_by ? 'council' : 'system', false),
      filterCategory: 'documents',
      councilOnly: false,
      documents: [
        {
          id: `res-doc-${linkedResolution.id}`,
          labelEn: 'Resolution',
          labelZh: '社区决议',
          url: communityResolutionDetailUrl(linkedResolution.id, propertyId),
        },
      ],
    });
  }

  for (const comment of comments) {
    if (comment.visibility !== 'visible') continue;
    events.push({
      id: `comment-${comment.id}`,
      at: comment.created_at,
      entityId: comment.id,
      eventType: 'comment_posted',
      phase: statusToTimelinePhase(matter.status),
      titleEn: 'Comment Posted',
      titleZh: '评论已发布',
      descriptionEn: comment.body.length > 120 ? `${comment.body.slice(0, 120)}…` : comment.body,
      descriptionZh: comment.body.length > 120 ? `${comment.body.slice(0, 120)}…` : comment.body,
      reasonEn: 'Owner participation during deliberation.',
      reasonZh: '议事期间的业主参与。',
      statusEn: 'Visible',
      statusZh: '可见',
      actorRole: 'owner',
      actorLabelEn: actorLabel('owner', true),
      actorLabelZh: actorLabel('owner', false),
      filterCategory: 'comments',
      councilOnly: false,
      documents: [],
    });
  }

  const seen = new Set<string>();
  const deduped = events.filter((e) => {
    const key = `${e.eventType}-${e.at}-${e.entityId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function filterTimelineEvents(
  events: GovernanceTimelineEvent[],
  filter: GovernanceTimelineFilter,
  canCouncil: boolean,
): GovernanceTimelineEvent[] {
  let visible = canCouncil ? events : events.filter((e) => !e.councilOnly);
  if (filter === 'all') return visible;
  if (filter === 'system') return visible.filter((e) => e.actorRole === 'system');
  return visible.filter((e) => e.filterCategory === filter);
}

export function computeGovernanceStageDurations(
  revisions: GovernanceMatterRevisionRow[],
  matter: GovernanceMatterRow,
): GovernanceStageDuration[] {
  const currentPhase = matterToCurrentTimelinePhase(matter);
  const nowIso = new Date().toISOString();

  const statusTransitions = [...revisions]
    .filter((r) => r.status && (r.change_kind === 'matter_created' || r.change_kind === 'status_updated'))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const phaseWindows: Partial<Record<GovernanceTimelinePhase, { start: string; end: string | null }>> = {};

  for (let i = 0; i < statusTransitions.length; i++) {
    const rev = statusTransitions[i]!;
    const phase = statusToTimelinePhase(rev.status);
    if (!phaseWindows[phase]?.start) {
      phaseWindows[phase] = { start: rev.created_at, end: null };
    }
    const next = statusTransitions[i + 1];
    if (next) {
      phaseWindows[phase] = { start: phaseWindows[phase]!.start, end: next.created_at };
    }
  }

  if (phaseWindows[currentPhase]) {
    phaseWindows[currentPhase]!.end = null;
  } else if (matter.created_at) {
    phaseWindows[currentPhase] = { start: matter.created_at, end: null };
  }

  return HUB_LIFECYCLE_STAGES.map((phase) => {
    const window = phaseWindows[phase];
    const startedAt = window?.start ?? null;
    const completedAt = window?.end ?? null;
    const isCurrent = phase === currentPhase;
    let durationLabelEn: string | null = null;
    let durationLabelZh: string | null = null;
    if (startedAt) {
      const end = completedAt ?? (isCurrent ? nowIso : null);
      if (end) {
        durationLabelEn = formatDurationDays(startedAt, end, true);
        durationLabelZh = formatDurationDays(startedAt, end, false);
      }
    }
    return {
      phase,
      labelEn: PHASE_LABEL_EN[phase],
      labelZh: PHASE_LABEL_ZH[phase],
      startedAt,
      completedAt,
      durationLabelEn,
      durationLabelZh,
      isCurrent,
    };
  });
}

export function timelineProgressFill(matter: GovernanceMatterRow): { filled: number; total: number } {
  const current = matterToCurrentTimelinePhase(matter);
  const idx = HUB_LIFECYCLE_STAGES.indexOf(current);
  const filled = idx >= 0 ? idx + 1 : 1;
  return { filled, total: HUB_LIFECYCLE_STAGES.length };
}

export function phaseLabel(phase: GovernanceTimelinePhase, langEn: boolean): string {
  return langEn ? PHASE_LABEL_EN[phase] : PHASE_LABEL_ZH[phase];
}
