import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProperty } from '@/contexts/PropertyContext';
import { ConstitutionalDeliberationAssistantPanel } from '@/components/community-deliberation/ConstitutionalDeliberationAssistantPanel';
import {
  constitutionalBasisForCategory,
  formatConstitutionalPrinciple,
} from '@/lib/community/constitutionalBasis';
import { communityResolutionDetailUrl } from '@/lib/community/communityResolutionModel';
import {
  matterStatusToWorkspaceStage,
  nextConstitutionalStep,
  WORKSPACE_LIFECYCLE_STAGES,
  workspaceStageLabel,
  type WorkspaceLifecycleStage,
} from '@/lib/community/governanceLifecycleModel';
import {
  governanceMatterCategoryLabel,
  governanceMatterStatusLabel,
  governanceMattersListUrl,
  isCouncilGovernanceRole,
  type GovernanceMatterCommentRow,
  type GovernanceMatterRevisionRow,
  type GovernanceMatterRow,
} from '@/lib/community/governanceMatterModel';
import type { GovernanceMatterCdaReportRow } from '@/lib/community/cdaReportModel';
import {
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

type CenterTab = 'detail' | 'discussion' | 'revisions';

export function CouncilWorkspacePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId, roleInProperty, ready: propertyReady } = useProperty();

  const propertyId = currentPropertyId ?? '';
  const canCouncil = isCouncilGovernanceRole(roleInProperty);
  const selectedMatterId = searchParams.get('matterId')?.trim() ?? '';

  const [matters, setMatters] = useState<(GovernanceMatterRow & { comment_count?: number })[]>([]);
  const [matter, setMatter] = useState<GovernanceMatterRow | null>(null);
  const [revisions, setRevisions] = useState<GovernanceMatterRevisionRow[]>([]);
  const [comments, setComments] = useState<GovernanceMatterCommentRow[]>([]);
  const [cdaReport, setCdaReport] = useState<GovernanceMatterCdaReportRow | null>(null);
  const [linkedResolution, setLinkedResolution] = useState<Awaited<
    ReturnType<typeof fetchCommunityResolutionByMatterId>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [centerTab, setCenterTab] = useState<CenterTab>('detail');
  const [stageFilter, setStageFilter] = useState<WorkspaceLifecycleStage | 'all'>('all');

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<GovernanceMatterRow['status']>('discussion');

  const loadMatters = useCallback(async () => {
    if (!propertyId.trim()) return;
    const rows = await fetchGovernanceMattersForCouncilWorkspace(propertyId.trim());
    setMatters(rows);
    if (!selectedMatterId && rows.length > 0) {
      setSearchParams({ matterId: rows[0]!.id }, { replace: true });
    }
  }, [propertyId, selectedMatterId, setSearchParams]);

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
    if (!propertyReady || !selectedMatterId) return;
    void loadMatterDetail().catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed to load matter');
    });
  }, [propertyReady, selectedMatterId, loadMatterDetail]);

  const workspaceStage = matter ? matterStatusToWorkspaceStage(matter.status) : null;

  const filteredMatters = useMemo(() => {
    if (stageFilter === 'all') return matters;
    return matters.filter((m) => matterStatusToWorkspaceStage(m.status) === stageFilter);
  }, [matters, stageFilter]);

  const constitutionalBasis = matter ? constitutionalBasisForCategory(matter.category) : [];

  const nextStep = matter
    ? nextConstitutionalStep({
        stage: matterStatusToWorkspaceStage(matter.status),
        hasResolution: !!linkedResolution,
        hasMeeting: !!(linkedResolution?.meeting_id ?? matter.meeting_id),
        hasVoting: !!(linkedResolution?.owner_vote_resolution_id ?? matter.voting_id),
        langEn: en,
      })
    : '';

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

  if (propertyReady && !canCouncil) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-sm text-gray-700">
        {en ? 'Council Workspace is for council members only.' : '业委会工作台仅业委会成员可用。'}
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-[1600px] flex-col px-3 py-4 sm:px-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <Link
            to={governanceMattersListUrl(propertyId)}
            className="text-sm font-semibold text-clearstrata-brand-900 hover:underline"
          >
            ← {en ? 'Governance Hub' : '治理中心'}
          </Link>
          <h1 className="mt-2 text-xl font-bold text-gray-900">{en ? 'Council Workspace' : '业委会工作台'}</h1>
          <p className="mt-0.5 text-sm text-gray-600">
            {en
              ? 'Detailed constitutional workflow — opened from Community Deliberation.'
              : '详细宪章流程 — 从社区议事厅治理面板进入。'}
          </p>
        </div>
        <Link
          to={`/community-deliberation/new?${new URLSearchParams({ propertyId }).toString()}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {en ? 'Publish Governance Matter' : '发布治理事项'}
        </Link>
      </header>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setStageFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            stageFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {en ? 'All' : '全部'}
        </button>
        {WORKSPACE_LIFECYCLE_STAGES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStageFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              stageFilter === s ? 'bg-emerald-800 text-white' : 'bg-emerald-50 text-emerald-900'
            }`}
          >
            {workspaceStageLabel(s, en)}
          </button>
        ))}
      </div>

      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-3 grid min-h-0 flex-1 gap-3 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        {/* LEFT — matters list */}
        <aside className="overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
          <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-gray-500">
            {en ? 'My Active Matters' : '进行中的事项'}
          </p>
          {loading ? (
            <p className="p-3 text-sm text-gray-500">{en ? 'Loading…' : '加载中…'}</p>
          ) : filteredMatters.length === 0 ? (
            <p className="p-3 text-sm text-gray-500">{en ? 'No matters.' : '暂无事项。'}</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {filteredMatters.map((m) => {
                const active = m.id === selectedMatterId;
                const stage = matterStatusToWorkspaceStage(m.status);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setSearchParams({ matterId: m.id })}
                      className={`w-full rounded-lg px-2 py-2 text-left text-sm ${
                        active ? 'bg-emerald-100 font-semibold text-emerald-950' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="line-clamp-2">{m.title}</span>
                      <span className="mt-0.5 block text-[11px] text-gray-600">
                        {workspaceStageLabel(stage, en)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* CENTER — matter detail */}
        <main className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {!matter ? (
            <p className="p-6 text-sm text-gray-500">
              {en ? 'Select a governance matter.' : '请选择治理事项。'}
            </p>
          ) : (
            <>
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">
                  {governanceMatterCategoryLabel(matter.category, en)} ·{' '}
                  {governanceMatterStatusLabel(matter.status, en)}
                </p>
                <h2 className="text-lg font-bold text-gray-900">{matter.title}</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['detail', 'discussion', 'revisions'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setCenterTab(tab)}
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                        centerTab === tab ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {tab === 'detail'
                        ? en
                          ? 'Detail'
                          : '详情'
                        : tab === 'discussion'
                          ? en
                            ? 'Discussion'
                            : '讨论'
                          : en
                            ? 'Revision History'
                            : '修订历史'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {centerTab === 'detail' ? (
                  <div className="space-y-4">
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={6}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold"
                    />
                    <p className="text-xs text-gray-500">
                      {en ? 'Documents — upload via matter attachments (coming soon).' : '文件 — 附件上传（即将推出）。'}
                    </p>
                  </div>
                ) : null}

                {centerTab === 'discussion' ? (
                  <ul className="space-y-2">
                    {comments.length === 0 ? (
                      <li className="text-sm text-gray-500">{en ? 'No comments yet.' : '暂无评论。'}</li>
                    ) : (
                      comments.map((c) => (
                        <li key={c.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                          {c.body}
                        </li>
                      ))
                    )}
                  </ul>
                ) : null}

                {centerTab === 'revisions' ? (
                  <ol className="space-y-2 border-l-2 border-emerald-200 pl-4">
                    {revisions.map((r) => (
                      <li key={r.id} className="text-sm">
                        {en ? 'Revision' : '修订'} {r.revision_no} — {r.change_kind.replace(/_/g, ' ')}
                      </li>
                    ))}
                  </ol>
                ) : null}

                {centerTab === 'detail' && matter ? (
                  <div className="mt-4">
                    <ConstitutionalDeliberationAssistantPanel
                      langEn={en}
                      category={matter.category}
                      report={cdaReport}
                      loading={false}
                      generating={busy}
                      canRequestAnalysis
                      onRequestAnalysis={() => void handleCdaRefresh()}
                    />
                  </div>
                ) : null}
              </div>
            </>
          )}
        </main>

        {/* RIGHT — council actions */}
        <aside className="overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {en ? 'Council Actions' : '业委会操作'}
          </p>

          {matter && workspaceStage ? (
            <>
              <div className="mt-3 rounded-lg bg-emerald-50/80 p-3">
                <p className="text-xs font-semibold text-emerald-900">{en ? 'Lifecycle' : '生命周期'}</p>
                <p className="mt-1 text-sm font-bold text-gray-900">{workspaceStageLabel(workspaceStage, en)}</p>
                <p className="mt-2 text-xs text-gray-700">{nextStep}</p>
              </div>

              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-700">{en ? 'Constitutional Basis' : '宪章依据'}</p>
                <ul className="mt-1 space-y-0.5">
                  {constitutionalBasis.map((ref, i) => (
                    <li key={i} className="text-xs text-gray-800">
                      {formatConstitutionalPrinciple(ref, en)}
                    </li>
                  ))}
                </ul>
              </div>

              {cdaReport?.content?.consensus_summary_en || cdaReport?.content?.consensus_summary_zh ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-700">{en ? 'CDA Summary' : '议事助手摘要'}</p>
                  <p className="mt-1 text-xs text-gray-600 line-clamp-4">
                    {en
                      ? cdaReport.content.consensus_summary_en
                      : cdaReport.content.consensus_summary_zh || cdaReport.content.consensus_summary_en}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-2">
                <ActionBtn label={en ? 'New Revision' : '新建修订'} disabled={busy} onClick={() => void handleSaveRevision()} />
                <ActionBtn label={en ? 'Generate CDA Report' : '生成议事助手报告'} disabled={busy} onClick={() => void handleCdaRefresh()} />
                {!linkedResolution ? (
                  <ActionBtn label={en ? 'Create Resolution' : '创建决议'} disabled={busy} onClick={() => void handleCreateResolution()} />
                ) : (
                  <Link
                    to={communityResolutionDetailUrl(linkedResolution.id, propertyId)}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                  >
                    {en ? 'View Resolution' : '查看决议'}
                  </Link>
                )}
                <ActionBtn
                  label={en ? 'Schedule Meeting' : '排定会议'}
                  disabled={!linkedResolution || busy}
                  onClick={handleScheduleMeeting}
                />
                <ActionBtn
                  label={en ? 'Open Voting' : '查看投票'}
                  disabled={!(linkedResolution?.meeting_id ?? matter.meeting_id)}
                  onClick={handleViewVoting}
                />
                <ActionBtn label={en ? 'Archive Matter' : '归档事项'} disabled={busy} onClick={() => void handleArchive()} />
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-gray-500">{en ? 'Select a matter to act.' : '请选择事项。'}</p>
          )}

          <footer className="mt-6 border-t border-gray-100 pt-3 text-[10px] text-gray-500">
            {en
              ? 'Council governs through transparent workflow, not authority alone.'
              : '业委会通过透明流程治理，而非仅凭权力。'}
          </footer>
        </aside>
      </div>

      <p className="mt-2 text-center text-[11px] text-gray-500">
        <Link to={governanceMattersListUrl(propertyId)} className="hover:underline">
          {en ? 'Community Deliberation hub' : '社区议事厅'}
        </Link>
      </p>
    </div>
  );
}

function ActionBtn({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
