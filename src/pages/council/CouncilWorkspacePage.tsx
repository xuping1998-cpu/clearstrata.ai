import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Plus } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { DestructiveConfirmDialog } from '@/components/ui/feedback/DestructiveConfirmDialog';
import { GovernanceFeedbackHost } from '@/components/ui/feedback/GovernanceFeedbackHost';
import { useGovernanceFeedback } from '@/hooks/useGovernanceFeedback';
import { ARCHIVE_CONFIRM } from '@/lib/ui/governanceFeedbackMessages';
import { INTERACTION_SELECTABLE } from '@/lib/ui/interactionClasses';
import {
  ContextualEmptyState,
  ErrorState,
  LoadingState,
  PermissionState,
  RefreshingOverlay,
  sanitizeUserErrorMessage,
} from '@/components/ui/state';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProperty } from '@/contexts/PropertyContext';
import { CockpitLifecycleTimeline } from '@/components/community-deliberation/CockpitLifecycleTimeline';
import { GovernanceCockpitPanel } from '@/components/community-deliberation/GovernanceCockpitPanel';
import {
  GovernanceMatterDetailTabs,
  type MatterDetailTab,
} from '@/components/community-deliberation/GovernanceMatterDetailTabs';
import { WorkspacePipelineMatterCard } from '@/components/community-deliberation/WorkspacePipelineMatterCard';
import { lifecycleFilterActiveClass, lifecycleStageBadgeClass } from '@/lib/community/governanceLifecycleColors';
import { nextConstitutionalStep } from '@/lib/community/governanceLifecycleModel';
import {
  buildGovernanceIntelligenceBundle,
  countMattersForPipelineFilter,
  matterMatchesPipelineFilter,
  PIPELINE_FILTERS,
  pipelineFilterLabel,
  type GovernanceCockpitActionType,
} from '@/lib/community/governanceCockpitPriority';
import {
  governanceMatterCategoryLabel,
  governanceMatterStatusLabel,
  governanceMattersListUrl,
  isCouncilGovernanceRole,
  type GovernanceMatterCommentRow,
  type GovernanceMatterDashboardRow,
  type GovernanceMatterRevisionRow,
  type GovernanceMatterRow,
} from '@/lib/community/governanceMatterModel';
import type { GovernanceMatterCdaReportRow } from '@/lib/community/cdaReportModel';
import type { CommunityResolutionRow } from '@/lib/community/communityResolutionModel';
import {
  addGovernanceMatterComment,
  fetchGovernanceMatterById,
  fetchGovernanceMatterComments,
  fetchGovernanceMatterRevisions,
  fetchGovernanceMattersForCouncilWorkspace,
  updateGovernanceMatter,
} from '@/features/governance-matters/governanceMattersApi';
import {
  fetchLatestCdaReport,
  requestCdaAnalysis,
} from '@/features/governance-matters/governanceMatterCdaApi';
import {
  createCommunityResolutionFromMatter,
  fetchCommunityResolutionByMatterId,
} from '@/features/community-resolutions/communityResolutionsApi';
import type { MeetingEditorDraftPrefill } from '@/lib/meetings/meetingEditorPrefill';
import type { WorkspaceLifecycleStage } from '@/lib/community/governanceLifecycleModel';
import { matterStatusToWorkspaceStage } from '@/lib/community/governanceLifecycleModel';

export function CouncilWorkspacePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId, roleInProperty, ready: propertyReady } = useProperty();

  const propertyId = currentPropertyId ?? '';
  const canCouncil = isCouncilGovernanceRole(roleInProperty);
  const selectedMatterId = searchParams.get('matterId')?.trim() ?? '';

  const [matters, setMatters] = useState<GovernanceMatterDashboardRow[]>([]);
  const [matter, setMatter] = useState<GovernanceMatterRow | null>(null);
  const [revisions, setRevisions] = useState<GovernanceMatterRevisionRow[]>([]);
  const [comments, setComments] = useState<GovernanceMatterCommentRow[]>([]);
  const [cdaReport, setCdaReport] = useState<GovernanceMatterCdaReportRow | null>(null);
  const [linkedResolution, setLinkedResolution] = useState<CommunityResolutionRow | null>(null);
  const [cdaByMatterId, setCdaByMatterId] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [detailRefreshing, setDetailRefreshing] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);
  const [cdaGenerating, setCdaGenerating] = useState(false);
  const [resolutionSubmitting, setResolutionSubmitting] = useState(false);
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);
  const [queueLoadingKey, setQueueLoadingKey] = useState<string | null>(null);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<WorkspaceLifecycleStage | 'all'>('all');
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [requestedTab, setRequestedTab] = useState<MatterDetailTab | null>(null);
  const [pendingQueueAction, setPendingQueueAction] = useState<{
    matterId: string;
    actionType: GovernanceCockpitActionType;
  } | null>(null);

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<GovernanceMatterRow['status']>('discussion');

  const feedback = useGovernanceFeedback();
  const actionBusy =
    commentSubmitting ||
    revisionSubmitting ||
    cdaGenerating ||
    resolutionSubmitting ||
    archiveSubmitting ||
    Boolean(queueLoadingKey);

  const loadMatters = useCallback(async () => {
    if (!propertyId.trim()) return;
    const rows = await fetchGovernanceMattersForCouncilWorkspace(propertyId.trim());
    setMatters(rows);
    if (!selectedMatterId && rows.length > 0) {
      setSearchParams({ propertyId, matterId: rows[0]!.id }, { replace: true });
    }
  }, [propertyId, selectedMatterId, setSearchParams]);

  const loadCdaFlags = useCallback(async (rows: GovernanceMatterDashboardRow[]) => {
    const pid = propertyId.trim();
    if (!pid) return;
    const candidates = rows.filter((m) =>
      ['discussion', 'public_consultation'].includes(m.status),
    );
    const entries = await Promise.all(
      candidates.map(async (m) => {
        try {
          const report = await fetchLatestCdaReport(pid, m.id);
          return [m.id, Boolean(report)] as const;
        } catch {
          return [m.id, false] as const;
        }
      }),
    );
    setCdaByMatterId(Object.fromEntries(entries));
  }, [propertyId]);

  const loadMatterDetail = useCallback(async () => {
    const pid = propertyId.trim();
    const mid = selectedMatterId;
    if (!pid || !mid) {
      setMatter(null);
      return;
    }
    const [m, rev, com, cda, res] = await Promise.all([
      fetchGovernanceMatterById(pid, mid),
      fetchGovernanceMatterRevisions(pid, mid),
      fetchGovernanceMatterComments(pid, mid),
      fetchLatestCdaReport(pid, mid),
      fetchCommunityResolutionByMatterId(pid, mid),
    ]);
    setMatter(m);
    setRevisions(rev);
    setComments(com);
    setCdaReport(cda);
    setLinkedResolution(res);
    if (m) {
      setEditTitle(m.title);
      setEditDescription(m.description ?? '');
      setEditStatus(m.status);
      setCdaByMatterId((prev) => ({ ...prev, [m.id]: Boolean(cda) }));
    }
  }, [propertyId, selectedMatterId]);

  useEffect(() => {
    if (!propertyReady || !propertyId.trim()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        await loadMatters();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load matters');
      } finally {
        setLoading(false);
      }
    })();
  }, [propertyReady, propertyId, loadMatters]);

  useEffect(() => {
    if (!matters.length) return;
    void loadCdaFlags(matters);
  }, [matters, loadCdaFlags]);

  useEffect(() => {
    if (!propertyReady || !selectedMatterId) return;
    if (matter) setDetailRefreshing(true);
    void loadMatterDetail()
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load matter');
      })
      .finally(() => {
        setDetailRefreshing(false);
      });
  }, [propertyReady, selectedMatterId, loadMatterDetail]);

  useEffect(() => {
    if (!pendingQueueAction || matter?.id !== pendingQueueAction.matterId) return;
    const { actionType } = pendingQueueAction;
    setPendingQueueAction(null);

    const tabFor: Partial<Record<GovernanceCockpitActionType, MatterDetailTab>> = {
      review_discussion: 'discussion',
      generate_cda: 'cda',
      prepare_resolution: 'resolution',
      schedule_meeting: 'resolution',
      open_voting: 'resolution',
      archive: 'details',
    };
    const tab = tabFor[actionType];
    if (tab) setRequestedTab(tab);

    if (actionType === 'generate_cda') void handleCdaRefresh();
    else if (actionType === 'schedule_meeting') {
      setQueueLoadingKey(null);
      handleScheduleMeeting();
    } else if (actionType === 'open_voting') {
      setQueueLoadingKey(null);
      handleViewVoting();
    } else if (actionType === 'archive') void handleArchive();
    else setQueueLoadingKey(null);
  }, [matter?.id, pendingQueueAction]);

  const filteredMatters = useMemo(
    () => matters.filter((m) => matterMatchesPipelineFilter(m, stageFilter)),
    [matters, stageFilter],
  );

  const intelligenceBundle = useMemo(
    () => buildGovernanceIntelligenceBundle(matters, cdaByMatterId),
    [matters, cdaByMatterId],
  );

  const cockpitActions = intelligenceBundle.actions;
  const cockpitMetrics = intelligenceBundle.metrics;
  const cockpitHealth = intelligenceBundle.health;
  const cockpitBrief = intelligenceBundle.brief;
  const matterIntelById = intelligenceBundle.matterById;

  const actionByMatterId = useMemo(() => {
    const map: Record<string, (typeof cockpitActions)[number]> = {};
    for (const a of cockpitActions) {
      if (!map[a.matterId]) map[a.matterId] = a;
    }
    return map;
  }, [cockpitActions]);

  const nextStep = matter
    ? nextConstitutionalStep({
        stage: matterStatusToWorkspaceStage(matter.status),
        hasResolution: !!linkedResolution,
        hasMeeting: !!(linkedResolution?.meeting_id ?? matter.meeting_id),
        hasVoting: !!(linkedResolution?.owner_vote_resolution_id ?? matter.voting_id),
        langEn: en,
      })
    : '';

  function selectMatter(matterId: string) {
    setSearchParams({ propertyId, matterId });
  }

  async function handleSaveRevision() {
    if (!matter || !propertyId.trim() || revisionSubmitting) return;
    setRevisionSubmitting(true);
    setError(null);
    try {
      const updated = await updateGovernanceMatter({
        propertyId: propertyId.trim(),
        matterId: matter.id,
        title: editTitle,
        description: editDescription,
        status: editStatus,
      });
      setMatter(updated);
      await Promise.all([loadMatterDetail(), loadMatters()]);
      feedback.notifySuccess('revisionSaved');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setError(msg);
      feedback.notifyError(msg);
    } finally {
      setRevisionSubmitting(false);
      setQueueLoadingKey(null);
    }
  }

  async function handleCdaRefresh() {
    if (!matter || !propertyId.trim() || cdaGenerating) return;
    setCdaGenerating(true);
    setError(null);
    try {
      const report = await requestCdaAnalysis({
        propertyId: propertyId.trim(),
        matterId: matter.id,
        language: en ? 'en' : 'zh',
      });
      setCdaReport(report);
      setCdaByMatterId((prev) => ({ ...prev, [matter.id]: true }));
      feedback.notifySuccess('cdaGenerated');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'CDA failed';
      setError(msg);
      feedback.notifyError(msg);
    } finally {
      setCdaGenerating(false);
      setQueueLoadingKey(null);
    }
  }

  async function handleCreateResolution() {
    if (!matter || !propertyId.trim() || resolutionSubmitting) return;
    setResolutionSubmitting(true);
    try {
      const row = await createCommunityResolutionFromMatter({
        propertyId: propertyId.trim(),
        governanceMatterId: matter.id,
        title: matter.title,
        executiveSummary: matter.description,
        matterCategory: matter.category,
        cdaReportId: cdaReport?.id ?? null,
      });
      setLinkedResolution(row);
      await loadMatters();
      feedback.notifySuccess('resolutionCreated');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Resolution failed';
      setError(msg);
      feedback.notifyError(msg);
    } finally {
      setResolutionSubmitting(false);
      setQueueLoadingKey(null);
    }
  }

  function handleScheduleMeeting() {
    if (!matter || !linkedResolution) return;
    const prefill: MeetingEditorDraftPrefill = {
      source: 'governance_resolution',
      meeting_type: 'sgm',
      initiation_type: 'council',
      title_en: linkedResolution.title,
      title_zh: linkedResolution.title,
      description_en: linkedResolution.executive_summary ?? matter.description ?? '',
      description_zh: linkedResolution.executive_summary ?? matter.description ?? '',
      governance_matter_id: matter.id,
      community_resolution_id: linkedResolution.id,
      agenda_items: [
        {
          title_en: linkedResolution.title,
          title_zh: linkedResolution.title,
          kind: 'resolution',
          vote_rule: 'simple_majority',
          description_en: linkedResolution.executive_summary ?? '',
          description_zh: linkedResolution.executive_summary ?? '',
        },
      ],
    };
    navigate('/meetings/new', { state: { meetingDraftPrefill: prefill } });
  }

  function handleViewVoting() {
    const meetingId = linkedResolution?.meeting_id ?? matter?.meeting_id;
    if (meetingId) navigate(`/meetings/${encodeURIComponent(meetingId)}#owner-voting`);
  }

  function handleArchive() {
    if (!matter || !propertyId.trim() || archiveSubmitting) return;
    setArchiveConfirmOpen(true);
  }

  async function handleArchiveConfirmed() {
    if (!matter || !propertyId.trim() || archiveSubmitting) return;
    setArchiveConfirmOpen(false);
    setArchiveSubmitting(true);
    try {
      await updateGovernanceMatter({
        propertyId: propertyId.trim(),
        matterId: matter.id,
        status: 'archived',
      });
      await Promise.all([loadMatterDetail(), loadMatters()]);
      feedback.notifySuccess('matterArchived');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Archive failed';
      setError(msg);
      feedback.notifyError(msg);
    } finally {
      setArchiveSubmitting(false);
      setQueueLoadingKey(null);
    }
  }

  function handleArchiveCancel() {
    setArchiveConfirmOpen(false);
    setQueueLoadingKey(null);
  }

  function handleQueueAction(matterId: string, actionType: GovernanceCockpitActionType) {
    if (queueLoadingKey || actionBusy) return;
    setQueueLoadingKey(`${matterId}:${actionType}`);
    selectMatter(matterId);
    setPendingQueueAction({ matterId, actionType });
  }

  async function handlePostComment() {
    if (!matter || !propertyId.trim() || !commentBody.trim() || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      const row = await addGovernanceMatterComment(propertyId.trim(), matter.id, commentBody);
      setComments((prev) => [...prev, row]);
      setCommentBody('');
      feedback.notifySuccess('commentPosted');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Comment failed';
      setError(msg);
      feedback.notifyError(msg);
    } finally {
      setCommentSubmitting(false);
    }
  }

  if (propertyReady && !canCouncil) {
    return (
      <PermissionState
        langEn={en}
        title={{
          en: 'Council Workspace is for council members only.',
          zh: '业委会工作台仅业委会成员可用。',
        }}
        description={{
          en: 'Open Governance Hub to follow community matters as an owner.',
          zh: '业主可在治理中心关注社区事项。',
        }}
      />
    );
  }

  if (loading && matters.length === 0) {
    return (
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4">
        <LoadingState
          langEn={en}
          variant="cockpit"
          label={en ? 'Loading governance cockpit…' : '正在加载治理驾驶舱…'}
        />
      </div>
    );
  }

  if (!loading && matters.length === 0) {
    return (
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4">
        <header className="border-b border-gray-200 pb-4">
          <Link
            to={governanceMattersListUrl(propertyId)}
            className="text-sm font-semibold text-clearstrata-brand-900 hover:underline"
          >
            ← {en ? 'Governance Hub' : '治理中心'}
          </Link>
          <h1 className="mt-2 text-xl font-bold text-gray-900">
            {en ? 'Governance Cockpit' : '治理驾驶舱'}
          </h1>
        </header>
        <div className="mt-6 max-w-lg">
          <ContextualEmptyState
            langEn={en}
            contentKey="governance.cockpitNoMatters"
            canCouncil
            propertyId={propertyId}
          />
        </div>
      </div>
    );
  }

  if (error && matters.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <ErrorState
          langEn={en}
          title={sanitizeUserErrorMessage(error, {
            en: 'Unable to load the governance workspace.',
            zh: '无法加载治理工作台。',
          })}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const pipelineHeadingId = 'governance-pipeline-heading';
  const pipelineFiltersId = 'governance-pipeline-filters';

  const pipelineSection = (
    <aside
      className="flex max-h-[calc(100vh-4rem)] min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-16"
      aria-labelledby={pipelineHeadingId}
    >
      <div className="border-b border-gray-100 px-3 py-2">
        <h2 id={pipelineHeadingId} className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {en ? 'Governance Pipeline' : '治理流程'}
        </h2>
      </div>
      <div className="overflow-x-auto border-b border-gray-100 px-2 py-2">
        <div
          id={pipelineFiltersId}
          role="group"
          aria-label={en ? 'Pipeline stage filters' : '流程阶段筛选'}
          className="flex min-w-max flex-wrap gap-1"
        >
          {PIPELINE_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              aria-pressed={stageFilter === filter}
              onClick={() => setStageFilter(filter)}
              className={`min-h-9 rounded-full px-2.5 py-1.5 text-[11px] font-semibold ${INTERACTION_SELECTABLE} ${
                stageFilter === filter
                  ? lifecycleFilterActiveClass(filter)
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {pipelineFilterLabel(filter, en)} ({countMattersForPipelineFilter(matters, filter)})
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <LoadingState langEn={en} variant="pipeline" />
        ) : filteredMatters.length === 0 ? (
          <div className="p-2">
            <ContextualEmptyState
              langEn={en}
              contentKey="governance.cockpitStageEmpty"
              canCouncil
              propertyId={propertyId}
              compact
              actionOverride={{
                label: { en: 'View all matters', zh: '查看全部事项' },
                onClick: () => setStageFilter('all'),
              }}
            />
          </div>
        ) : (
          <ul className="space-y-2" aria-label={en ? 'Governance matters in pipeline' : '流程中的治理事项'}>
            {filteredMatters.map((m) => (
              <li key={m.id}>
                <WorkspacePipelineMatterCard
                  matter={m}
                  langEn={en}
                  selected={m.id === selectedMatterId}
                  hasCdaReport={cdaByMatterId[m.id] ?? false}
                  intelligence={matterIntelById[m.id]}
                  nextAction={actionByMatterId[m.id] ?? null}
                  onSelect={() => selectMatter(m.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col px-3 py-4 sm:px-4">
      <GovernanceFeedbackHost langEn={en} items={feedback.items} onDismiss={feedback.dismiss} />
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <Link
            to={governanceMattersListUrl(propertyId)}
            className="text-sm font-semibold text-clearstrata-brand-900 hover:underline"
          >
            ← {en ? 'Governance Hub' : '治理中心'}
          </Link>
          <h1 className="mt-2 text-xl font-bold text-gray-900">
            {en ? 'Governance Cockpit' : '治理驾驶舱'}
          </h1>
          <p className="mt-0.5 text-sm text-gray-600">
            {en
              ? 'Council decision and workflow space — what must be done next.'
              : '业委会决策与工作流程空间 — 下一步必须完成什么。'}
          </p>
        </div>
        <ButtonLink
          to={`/community-deliberation/new?${new URLSearchParams({ propertyId }).toString()}`}
          variant="primary"
          size="md"
          leftIcon={<Plus className="h-4 w-4" aria-hidden />}
        >
          {en ? 'Publish Governance Matter' : '发布治理事项'}
        </ButtonLink>
      </header>

      {error && matters.length > 0 ? (
        <ErrorState
          langEn={en}
          title={sanitizeUserErrorMessage(error, {
            en: 'Something went wrong in the workspace.',
            zh: '工作台出现问题。',
          })}
          compact
          className="mt-2"
        />
      ) : null}

      <main className="relative mt-3 flex flex-col gap-3 lg:grid lg:grid-cols-[280px_minmax(0,1fr)_300px] lg:items-start">
        {detailRefreshing ? <RefreshingOverlay langEn={en} className="z-20" /> : null}
        <div className="hidden lg:col-start-1 lg:row-start-1 lg:block">{pipelineSection}</div>

        {matter ? (
          <section
            className="order-1 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:order-2 lg:col-start-2 lg:row-start-1"
            aria-labelledby="cockpit-current-matter-heading"
          >
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                {en ? 'Current Matter' : '当前事项'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">{governanceMatterCategoryLabel(matter.category, en)}</span>
                <span className={lifecycleStageBadgeClass(matter.status)}>
                  {governanceMatterStatusLabel(matter.status, en)}
                </span>
              </div>
              <h2 id="cockpit-current-matter-heading" className="mt-1 text-2xl font-bold leading-tight text-gray-900">
                {matter.title}
              </h2>
              <div className="mt-1.5">
                <CockpitLifecycleTimeline
                  status={matter.status}
                  category={matter.category}
                  hasCdaReport={Boolean(cdaReport)}
                  langEn={en}
                  compact
                />
              </div>
              <p className="mt-2 text-sm text-gray-700">
                <span className="font-medium">{en ? 'Next: ' : '下一步：'}</span>
                {nextStep}
              </p>
            </div>
            <div className="px-4 pb-4">
              <GovernanceMatterDetailTabs
                langEn={en}
                matter={matter}
                propertyId={propertyId}
                canCouncil
                comments={comments}
                revisions={revisions}
                cdaReport={cdaReport}
                cdaLoading={false}
                cdaGenerating={cdaGenerating}
                linkedResolution={linkedResolution}
                commentBody={commentBody}
                onCommentBodyChange={setCommentBody}
                onPostComment={() => void handlePostComment()}
                commentSubmitting={commentSubmitting}
                revisionSubmitting={revisionSubmitting}
                editTitle={editTitle}
                editDescription={editDescription}
                editStatus={editStatus}
                onEditTitleChange={setEditTitle}
                onEditDescriptionChange={setEditDescription}
                onEditStatusChange={setEditStatus}
                onCouncilSave={() => void handleSaveRevision()}
                onRequestCdaAnalysis={() => void handleCdaRefresh()}
                onCreateResolution={() => void handleCreateResolution()}
                resolutionSubmitting={resolutionSubmitting}
                includeDetailsTab
                defaultTab="details"
                requestedTab={requestedTab}
                onRequestedTabHandled={() => setRequestedTab(null)}
                compactLayout
              />
            </div>
          </section>
        ) : (
          <section className="order-1 rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:order-2 lg:col-start-2 lg:row-start-1">
            <ContextualEmptyState
              langEn={en}
              contentKey="governance.cockpitSelectMatter"
              compact
              hideIcon
            />
          </section>
        )}

        <div className="order-2 lg:order-3 lg:col-start-3 lg:row-start-1">
          <GovernanceCockpitPanel
            langEn={en}
            metrics={cockpitMetrics}
            actions={cockpitActions}
            health={cockpitHealth}
            brief={cockpitBrief}
            onQueueAction={handleQueueAction}
            busyQueueKey={queueLoadingKey}
            actionsDisabled={actionBusy}
          />
        </div>

        <details className="order-3 lg:hidden" open={pipelineOpen}>
          <summary
            className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold marker:content-none"
            onClick={() => setPipelineOpen((v) => !v)}
          >
            {en ? 'Governance Pipeline' : '治理流程'}
            <ChevronDown className="h-4 w-4" aria-hidden />
          </summary>
          <div className="mt-2 max-h-64 overflow-y-auto">{pipelineSection}</div>
        </details>
      </main>
      <DestructiveConfirmDialog
        open={archiveConfirmOpen}
        langEn={en}
        title={{ en: 'Archive governance matter?', zh: '归档治理事项？' }}
        message={ARCHIVE_CONFIRM}
        confirmLabel={{ en: 'Archive', zh: '归档' }}
        cancelLabel={{ en: 'Cancel', zh: '取消' }}
        onConfirm={() => void handleArchiveConfirmed()}
        onCancel={handleArchiveCancel}
      />
    </div>
  );
}
