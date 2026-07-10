import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProperty } from '@/contexts/PropertyContext';
import { useAuth } from '@/contexts/AuthContext';
import { GovernanceLifecycleFeed } from '@/components/community-deliberation/GovernanceLifecycleFeed';
import { GovernanceLifecycleTimeline } from '@/components/community-deliberation/GovernanceLifecycleTimeline';
import {
  GovernanceHubPanel,
  computeCouncilActionSummary,
} from '@/components/community-deliberation/GovernanceHubPanel';
import { OwnerParticipationPanel } from '@/components/community-deliberation/OwnerParticipationPanel';
import {
  mergeDeliberationBullets,
  partitionBullets,
} from '@/components/dashboard/ImportantUpdatesDashboardCard';
import { useImportantUpdatesBullets } from '@/hooks/useImportantUpdatesBullets';
import { useGovernanceMatterDashboard } from '@/hooks/useGovernanceMatterDashboard';
import { meetingsNavHref } from '@/lib/meetingPermissions';
import { supabase } from '@/lib/supabase';
import { GovernanceMatterDetailTabs } from '@/components/community-deliberation/GovernanceMatterDetailTabs';
import {
  GOVERNANCE_MATTER_CATEGORIES,
  GOVERNANCE_MATTER_STATUSES,
  governanceMatterCategoryLabel,
  governanceMatterDetailUrl,
  governanceMattersListUrl,
  governanceMatterStatusLabel,
  isCouncilGovernanceRole,
  type GovernanceMatterCommentRow,
  type GovernanceMatterRevisionRow,
  type GovernanceMatterRow,
} from '@/lib/community/governanceMatterModel';
import {
  addGovernanceMatterComment,
  createGovernanceMatter,
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
import { communityResolutionDetailUrl } from '@/lib/community/communityResolutionModel';
import type { GovernanceMatterCdaReportRow } from '@/lib/community/cdaReportModel';

export function GovernanceMatterDetailPage() {
  const { matterId } = useParams<{ matterId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId, roleInProperty, ready: propertyReady } = useProperty();

  const propertyId = searchParams.get('propertyId')?.trim() || currentPropertyId || '';
  const canCouncil = isCouncilGovernanceRole(roleInProperty);

  const [matter, setMatter] = useState<GovernanceMatterRow | null>(null);
  const [revisions, setRevisions] = useState<GovernanceMatterRevisionRow[]>([]);
  const [comments, setComments] = useState<GovernanceMatterCommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cdaReport, setCdaReport] = useState<GovernanceMatterCdaReportRow | null>(null);
  const [cdaLoading, setCdaLoading] = useState(true);
  const [cdaGenerating, setCdaGenerating] = useState(false);
  const [linkedResolution, setLinkedResolution] = useState<Awaited<
    ReturnType<typeof fetchCommunityResolutionByMatterId>
  > | null>(null);
  const [resolutionSubmitting, setResolutionSubmitting] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<GovernanceMatterRow['status']>('discussion');

  useEffect(() => {
    let cancelled = false;
    const mid = matterId?.trim();
    const pid = propertyId.trim();
    if (!propertyReady || !pid || !mid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [m, rev, com] = await Promise.all([
          fetchGovernanceMatterById(pid, mid),
          fetchGovernanceMatterRevisions(pid, mid),
          fetchGovernanceMatterComments(pid, mid),
        ]);
        if (cancelled) return;
        if (!m) {
          setError(en ? 'Governance matter not found' : '未找到治理事项');
          setMatter(null);
          return;
        }
        setMatter(m);
        setRevisions(rev);
        setComments(com);
        setEditTitle(m.title);
        setEditDescription(m.description ?? '');
        setEditStatus(m.status);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load matter');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matterId, propertyId, propertyReady, en]);

  useEffect(() => {
    let cancelled = false;
    const mid = matterId?.trim();
    const pid = propertyId.trim();
    if (!propertyReady || !pid || !mid || !matter) {
      setCdaLoading(false);
      return;
    }

    setCdaLoading(true);
    void (async () => {
      try {
        const report = await fetchLatestCdaReport(pid, mid);
        if (!cancelled) setCdaReport(report);
      } catch {
        if (!cancelled) setCdaReport(null);
      } finally {
        if (!cancelled) setCdaLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matterId, propertyId, propertyReady, matter?.id]);

  useEffect(() => {
    let cancelled = false;
    const mid = matterId?.trim();
    const pid = propertyId.trim();
    if (!propertyReady || !pid || !mid || !matter) return;

    void (async () => {
      try {
        const res = await fetchCommunityResolutionByMatterId(pid, mid);
        if (!cancelled) setLinkedResolution(res);
      } catch {
        if (!cancelled) setLinkedResolution(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matterId, propertyId, propertyReady, matter?.id]);

  async function handlePostComment() {
    if (!matter || !propertyId.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const row = await addGovernanceMatterComment(propertyId.trim(), matter.id, commentBody);
      setComments((prev) => [...prev, row]);
      setCommentBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCouncilSave() {
    if (!matter || !propertyId.trim()) return;
    setSubmitting(true);
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
      const rev = await fetchGovernanceMatterRevisions(propertyId.trim(), matter.id);
      setRevisions(rev);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update matter');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestCdaAnalysis() {
    if (!matter || !propertyId.trim()) return;
    setCdaGenerating(true);
    setError(null);
    try {
      const report = await requestCdaAnalysis({
        propertyId: propertyId.trim(),
        matterId: matter.id,
        language: en ? 'en' : 'zh',
      });
      setCdaReport(report);
    } catch (e) {
      setError(e instanceof Error ? e.message : en ? 'CDA analysis failed' : '议事助手分析失败');
    } finally {
      setCdaGenerating(false);
    }
  }

  async function handleCreateResolution() {
    if (!matter || !propertyId.trim()) return;
    setResolutionSubmitting(true);
    setError(null);
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
      navigate(communityResolutionDetailUrl(row.id, propertyId.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : en ? 'Failed to create resolution' : '创建决议失败');
    } finally {
      setResolutionSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-clearstrata-ui-primary border-t-transparent" />
      </div>
    );
  }

  if (!matter) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-red-700">{error ?? (en ? 'Not found' : '未找到')}</p>
        <Link to={governanceMattersListUrl(propertyId)} className="mt-4 inline-block text-sm font-semibold text-clearstrata-brand-900">
          {en ? 'Back to Governance Hub' : '返回治理中心'}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <Link
        to={governanceMattersListUrl(propertyId)}
        className="text-sm font-semibold text-clearstrata-brand-900 hover:underline"
      >
        ← {en ? 'Governance Hub' : '治理中心'}
      </Link>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {governanceMatterCategoryLabel(matter.category, en)} · {governanceMatterStatusLabel(matter.status, en)}
        </p>
        <h1 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{matter.title}</h1>
        <div className="mt-3">
          <GovernanceLifecycleTimeline status={matter.status} langEn={en} />
        </div>
      </header>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <GovernanceMatterDetailTabs
        langEn={en}
        matter={matter}
        propertyId={propertyId}
        canCouncil={canCouncil}
        comments={comments}
        revisions={revisions}
        cdaReport={cdaReport}
        cdaLoading={cdaLoading}
        cdaGenerating={cdaGenerating}
        linkedResolution={linkedResolution}
        commentBody={commentBody}
        onCommentBodyChange={setCommentBody}
        onPostComment={() => void handlePostComment()}
        submitting={submitting}
        editTitle={editTitle}
        editDescription={editDescription}
        editStatus={editStatus}
        onEditTitleChange={setEditTitle}
        onEditDescriptionChange={setEditDescription}
        onEditStatusChange={setEditStatus}
        onCouncilSave={() => void handleCouncilSave()}
        onRequestCdaAnalysis={() => void handleRequestCdaAnalysis()}
        onCreateResolution={() => void handleCreateResolution()}
        resolutionSubmitting={resolutionSubmitting}
      />
    </div>
  );
}

export function GovernanceMatterCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId, roleInProperty, ready: propertyReady } = useProperty();

  const propertyId = searchParams.get('propertyId')?.trim() || currentPropertyId || '';
  const canCouncil = isCouncilGovernanceRole(roleInProperty);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<(typeof GOVERNANCE_MATTER_CATEGORIES)[number]>('other');
  const [status, setStatus] = useState<(typeof GOVERNANCE_MATTER_STATUSES)[number]>('discussion');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (propertyReady && !canCouncil) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8 text-sm text-gray-700">
        {en ? 'Only council may create governance matters.' : '仅业委会可创建治理事项。'}
      </div>
    );
  }

  async function handleCreate() {
    if (!propertyId.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const row = await createGovernanceMatter({
        propertyId: propertyId.trim(),
        title,
        description,
        category,
        status,
      });
      navigate(governanceMatterDetailUrl(row.id, propertyId.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create matter');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-xl font-bold text-gray-900">{en ? 'New governance matter' : '新建治理事项'}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {en ? 'Community Deliberation — every discussion belongs to one matter.' : '社区议事厅 — 每项讨论必须属于一个治理事项。'}
      </p>
      <div className="mt-6 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={en ? 'Title' : '标题'}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder={en ? 'Description' : '说明'}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {GOVERNANCE_MATTER_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {governanceMatterCategoryLabel(c, en)}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {GOVERNANCE_MATTER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {governanceMatterStatusLabel(s, en)}
            </option>
          ))}
        </select>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="button"
          disabled={submitting || !title.trim()}
          onClick={() => void handleCreate()}
          className="rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-60"
        >
          {en ? 'Create matter' : '创建事项'}
        </button>
      </div>
    </div>
  );
}

export function GovernanceMattersHubPage() {
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId, roleInProperty, ready: propertyReady } = useProperty();
  const { user } = useAuth();
  const propertyId = currentPropertyId ?? '';
  const canCouncil = isCouncilGovernanceRole(roleInProperty);

  const [allMatters, setAllMatters] = useState<GovernanceMatterRow[]>([]);
  const [ownerCommentCount, setOwnerCommentCount] = useState(0);
  const [feedLoading, setFeedLoading] = useState(true);

  const { bullets: importantUpdatesBullets } = useImportantUpdatesBullets({
    propertyId,
    userId: user?.id,
    propertyReady,
    langEn: en,
    meetingsHref: meetingsNavHref(roleInProperty),
  });

  const { bullets: governanceMatterBullets, hasRealMatters, loading: mattersLoading } =
    useGovernanceMatterDashboard({
      propertyId,
      propertyReady,
      langEn: en,
    });

  useEffect(() => {
    if (!propertyReady || !propertyId.trim()) {
      setFeedLoading(false);
      return;
    }
    setFeedLoading(true);
    void (async () => {
      try {
        const rows = await fetchGovernanceMattersForCouncilWorkspace(propertyId.trim());
        setAllMatters(rows);
      } finally {
        setFeedLoading(false);
      }
    })();
  }, [propertyId, propertyReady]);

  useEffect(() => {
    if (!propertyReady || !propertyId.trim() || !user?.id) return;
    void (async () => {
      const { count } = await supabase
        .from('governance_matter_comments')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId.trim())
        .eq('author_id', user.id)
        .eq('visibility', 'visible');
      setOwnerCommentCount(count ?? 0);
    })();
  }, [propertyId, propertyReady, user?.id]);

  const deliberationBullets = useMemo(() => {
    const notices = importantUpdatesBullets.filter(
      (b) => b.kind === 'notice' || b.source === 'announcement',
    );
    return mergeDeliberationBullets(governanceMatterBullets, notices, en, hasRealMatters);
  }, [governanceMatterBullets, importantUpdatesBullets, en, hasRealMatters]);

  const notices = useMemo(
    () => partitionBullets(deliberationBullets).notices,
    [deliberationBullets],
  );

  const councilSummary = useMemo(() => computeCouncilActionSummary(allMatters), [allMatters]);

  const ownerAttention = useMemo(() => {
    const active = allMatters.filter(
      (m) => m.status !== 'archived' && m.status !== 'draft',
    );
    return {
      activeMatterCount: active.filter((m) =>
        ['discussion', 'public_consultation'].includes(m.status),
      ).length,
      votingMatterCount: active.filter((m) => m.status === 'voting').length,
    };
  }, [allMatters]);

  const loading = feedLoading || mattersLoading;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {en ? 'Governance Hub' : '治理中心'}
            <span className="mt-0.5 block text-sm font-semibold text-clearstrata-brand-800">
              {en ? 'Community Deliberation' : '社区议事厅'}
            </span>
          </h1>
          <p className="mt-1 max-w-xl text-sm text-gray-600">
            {en
              ? 'One community. One governance space. Different responsibilities — not different worlds.'
              : '一个社区。一个治理空间。不同职责 — 而非不同世界。'}
          </p>
        </div>
        {canCouncil ? (
          <Link
            to={`/community-deliberation/new?${new URLSearchParams({ propertyId }).toString()}`}
            className="rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover"
          >
            {en ? '+ Publish Governance Matter' : '+ 发布治理事项'}
          </Link>
        ) : null}
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {en ? 'Governance Feed' : '治理动态'}
          </p>
          <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/40 p-4">
            <GovernanceLifecycleFeed
              langEn={en}
              loading={loading}
              matters={allMatters}
              notices={notices}
              propertyId={propertyId}
              canCouncil={canCouncil}
            />
          </div>
        </main>

        <div className="lg:sticky lg:top-4 lg:self-start">
          {canCouncil ? (
            <GovernanceHubPanel
              langEn={en}
              propertyId={propertyId}
              matters={allMatters}
              summary={councilSummary}
            />
          ) : (
            <OwnerParticipationPanel
              langEn={en}
              propertyId={propertyId}
              commentCount={ownerCommentCount}
              roleInProperty={roleInProperty}
              activeMatterCount={ownerAttention.activeMatterCount}
              votingMatterCount={ownerAttention.votingMatterCount}
            />
          )}
        </div>
      </div>
    </div>
  );
}
