import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Plus } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import {
  EmptyState,
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
  const [busy, setBusy] = useState(false);
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
    else if (actionType === 'schedule_meeting') handleScheduleMeeting();
    else if (actionType === 'open_voting') handleViewVoting();
    else if (actionType === 'archive') void handleArchive();
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
    if (!matter || !propertyId.trim()) return;
    setBusy(true);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleCdaRefresh() {
    if (!matter || !propertyId.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const report = await requestCdaAnalysis({
        propertyId: propertyId.trim(),
        matterId: matter.id,
        language: en ? 'en' : 'zh',
      });
      setCdaReport(report);
      setCdaByMatterId((prev) => ({ ...prev, [matter.id]: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'CDA failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateResolution() {
    if (!matter || !propertyId.trim()) return;
    setBusy(true);
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resolution failed');
    } finally {
      setBusy(false);
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

  async function handleArchive() {
    if (!matter || !propertyId.trim()) return;
    setBusy(true);
    try {
      await updateGovernanceMatter({
        propertyId: propertyId.trim(),
        matterId: matter.id,
        status: 'archived',
      });
      await Promise.all([loadMatterDetail(), loadMatters()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Archive failed');
    } finally {
      setBusy(false);
    }
  }

  function handleQueueAction(matterId: string, actionType: GovernanceCockpitActionType) {
    selectMatter(matterId);
    setPendingQueueAction({ matterId, actionType });
  }

  async function handlePostComment() {
    if (!matter || !propertyId.trim() || !commentBody.trim()) return;
    setBusy(true);
    try {
      const row = await addGovernanceMatterComment(propertyId.trim(), matter.id, commentBody);
      setComments((prev) => [...prev, row]);
      setCommentBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comment failed');
    } finally {
      setBusy(false);
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
        <LoadingState langEn={en} variant="pipeline" label={en ? 'Loading workspace…' : '正在加载工作台…'} />
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

  const pipelineSection = (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:order-1">
      <div className="border-b border-gray-100 px-3 py-2">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {en ? 'Governance Pipeline' : '治理流程'}
        </p>
      </div>
      <div className="overflow-x-auto border-b border-gray-100 px-2 py-2">
        <div className="flex min-w-max flex-wrap gap-1">
          {PIPELINE_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStageFilter(filter)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
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
            <EmptyState
              langEn={en}
              title={en ? 'No matters in this stage' : '该阶段暂无事项'}
              description={
                en
                  ? 'Publish a governance matter or choose another pipeline filter.'
                  : '发布治理事项，或选择其他流程筛选。'
              }
              action={{
                label: { en: 'Publish Governance Matter', zh: '发布治理事项' },
                to: `/community-deliberation/new?${new URLSearchParams({ propertyId }).toString()}`,
              }}
              compact
            />
          </div>
        ) : (
          <ul className="space-y-2">
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
              ? 'Council Workspace — what must be done next.'
              : '业委会工作台 — 下一步必须完成什么。'}
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

      <div className="relative mt-3 flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:min-h-[calc(100vh-12rem)] lg:grid-cols-[280px_minmax(0,1fr)_300px]">
        {detailRefreshing ? <RefreshingOverlay langEn={en} className="z-20" /> : null}
        <div className="hidden min-h-0 lg:block lg:row-span-2">{pipelineSection}</div>

        {matter ? (
          <header className="order-1 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm lg:order-2 lg:col-start-2 lg:rounded-b-none lg:border-b-0 lg:shadow-md">
            <div className="border-b border-gray-100 px-4 py-3 lg:border-b-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                {en ? 'Current Matter' : '当前事项'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-500">{governanceMatterCategoryLabel(matter.category, en)}</span>
                <span className={lifecycleStageBadgeClass(matter.status)}>
                  {governanceMatterStatusLabel(matter.status, en)}
                </span>
              </div>
              <h2 className="mt-1 text-2xl font-bold leading-tight text-gray-900">{matter.title}</h2>
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
          </header>
        ) : (
          <main className="order-1 rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:order-2 lg:col-start-2">
            <p className="text-sm text-gray-500">{en ? 'Select a governance matter.' : '请选择治理事项。'}</p>
          </main>
        )}

        <div className="order-2 min-h-0 lg:order-3 lg:col-start-3 lg:row-start-1">
          <GovernanceCockpitPanel
            langEn={en}
            metrics={cockpitMetrics}
            actions={cockpitActions}
            health={cockpitHealth}
            brief={cockpitBrief}
            onQueueAction={handleQueueAction}
          />
        </div>

        {matter ? (
          <div className="order-3 flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:order-2 lg:col-start-2 lg:-mt-px lg:rounded-t-none lg:border-t-0 lg:pt-0">
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <GovernanceMatterDetailTabs
                langEn={en}
                matter={matter}
                propertyId={propertyId}
                canCouncil
                comments={comments}
                revisions={revisions}
                cdaReport={cdaReport}
                cdaLoading={false}
                cdaGenerating={busy}
                linkedResolution={linkedResolution}
                commentBody={commentBody}
                onCommentBodyChange={setCommentBody}
                onPostComment={() => void handlePostComment()}
                submitting={busy}
                editTitle={editTitle}
                editDescription={editDescription}
                editStatus={editStatus}
                onEditTitleChange={setEditTitle}
                onEditDescriptionChange={setEditDescription}
                onEditStatusChange={setEditStatus}
                onCouncilSave={() => void handleSaveRevision()}
                onRequestCdaAnalysis={() => void handleCdaRefresh()}
                onCreateResolution={() => void handleCreateResolution()}
                resolutionSubmitting={busy}
                includeDetailsTab
                defaultTab="details"
                requestedTab={requestedTab}
                onRequestedTabHandled={() => setRequestedTab(null)}
                compactLayout
              />
            </div>
          </div>
        ) : null}

        <details className="order-4 lg:hidden" open={pipelineOpen}>
          <summary
            className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold marker:content-none"
            onClick={() => setPipelineOpen((v) => !v)}
          >
            {en ? 'Governance Pipeline' : '治理流程'}
            <ChevronDown className="h-4 w-4" aria-hidden />
          </summary>
          <div className="mt-2 max-h-64 overflow-y-auto">{pipelineSection}</div>
        </details>
      </div>
    </div>
  );
}
