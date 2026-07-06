import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProperty } from '@/contexts/PropertyContext';
import { ConstitutionalDeliberationAssistantPanel } from '@/components/community-deliberation/ConstitutionalDeliberationAssistantPanel';
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
  fetchGovernanceMattersForDashboard,
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

  const revisionLabels = useMemo(() => {
    return revisions.map((r) => ({
      ...r,
      label: r.change_kind.replace(/_/g, ' '),
    }));
  }, [revisions]);

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
          {en ? 'Back to Community Deliberation' : '返回社区议事厅'}
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
        ← {en ? 'Community Deliberation' : '社区议事厅'}
      </Link>

      <header className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {governanceMatterCategoryLabel(matter.category, en)} · {governanceMatterStatusLabel(matter.status, en)}
        </p>
        <h1 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{matter.title}</h1>
        {matter.description ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{matter.description}</p>
        ) : null}
      </header>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <ConstitutionalDeliberationAssistantPanel
        langEn={en}
        category={matter.category}
        report={cdaReport}
        loading={cdaLoading}
        generating={cdaGenerating}
        canRequestAnalysis={canCouncil}
        onRequestAnalysis={() => void handleRequestCdaAnalysis()}
      />

      <section className="mt-6 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">{en ? 'Community Resolution' : '社区决议'}</h2>
        {linkedResolution ? (
          <div className="mt-2">
            <p className="text-sm text-gray-700">{linkedResolution.title}</p>
            <Link
              to={communityResolutionDetailUrl(linkedResolution.id, propertyId)}
              className="mt-2 inline-block text-sm font-semibold text-clearstrata-brand-900 hover:underline"
            >
              {en ? 'View resolution →' : '查看决议 →'}
            </Link>
            {linkedResolution.meeting_id ? (
              <Link
                to={`/meetings/${encodeURIComponent(linkedResolution.meeting_id)}`}
                className="mt-1 block text-sm font-semibold text-clearstrata-brand-900 hover:underline"
              >
                {en ? 'Linked meeting →' : '关联会议 →'}
              </Link>
            ) : null}
          </div>
        ) : canCouncil ? (
          <div className="mt-2">
            <p className="text-xs text-gray-600">
              {en
                ? 'Prepare a Community Resolution from this matter before scheduling a meeting.'
                : '排会前，请基于本事项准备社区决议。'}
            </p>
            <button
              type="button"
              disabled={resolutionSubmitting}
              onClick={() => void handleCreateResolution()}
              className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {en ? 'Prepare resolution' : '准备决议'}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            {en ? 'No resolution prepared yet.' : '尚未准备决议。'}
          </p>
        )}
      </section>

      {canCouncil ? (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
          <h2 className="text-sm font-bold text-gray-900">{en ? 'Council — revise matter' : '业委会 — 修订事项'}</h2>
          <div className="mt-3 space-y-3">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as GovernanceMatterRow['status'])}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {GOVERNANCE_MATTER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {governanceMatterStatusLabel(s, en)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleCouncilSave()}
              className="rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-60"
            >
              {en ? 'Save revision' : '保存修订'}
            </button>
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">{en ? 'Owner discussion' : '业主讨论'}</h2>
        <p className="mt-1 text-xs text-gray-600">
          {en ? 'Comments are immutable and publicly traceable.' : '评论不可修改，公开可追溯。'}
        </p>
        <ul className="mt-4 space-y-3">
          {comments.length === 0 ? (
            <li className="text-sm text-gray-500">{en ? 'No comments yet.' : '暂无评论。'}</li>
          ) : (
            comments.map((c) => (
              <li key={c.id} className="rounded-lg bg-gray-50 px-3 py-2.5">
                <p className="text-sm text-gray-800">{c.body}</p>
                <p className="mt-1 text-[11px] text-gray-500">{new Date(c.created_at).toLocaleString()}</p>
              </li>
            ))
          )}
        </ul>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            rows={3}
            placeholder={en ? 'Participate in discussion…' : '参与讨论…'}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={submitting || !commentBody.trim()}
            onClick={() => void handlePostComment()}
            className="shrink-0 rounded-lg border border-clearstrata-ui-softBorder bg-white px-4 py-2 text-sm font-semibold text-clearstrata-brand-900 hover:bg-clearstrata-brand-50 disabled:opacity-60"
          >
            {en ? 'Post comment' : '发表评论'}
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">{en ? 'Revision history' : '修订历史'}</h2>
        <ol className="mt-3 space-y-2 border-l-2 border-clearstrata-brand-200 pl-4">
          {revisionLabels.map((r) => (
            <li key={r.id} className="text-sm">
              <span className="font-semibold text-gray-900">
                {en ? 'Revision' : '修订'} {r.revision_no}
              </span>
              <span className="text-gray-600"> — {r.label}</span>
              <span className="block text-[11px] text-gray-500">{new Date(r.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      </section>

      <button
        type="button"
        className="mt-6 text-sm text-gray-600 hover:text-gray-900"
        onClick={() => navigate(-1)}
      >
        {en ? 'Back' : '返回'}
      </button>
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
  const propertyId = currentPropertyId ?? '';
  const canCouncil = isCouncilGovernanceRole(roleInProperty);

  const [matters, setMatters] = useState<GovernanceMatterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!propertyReady || !propertyId.trim()) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const rows = await fetchGovernanceMattersForDashboard(propertyId.trim());
        setMatters(rows);
      } finally {
        setLoading(false);
      }
    })();
  }, [propertyId, propertyReady]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{en ? 'Community Deliberation' : '社区议事厅'}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {en ? 'Governance matters — structured constitutional discussion.' : '治理事项 — 结构化宪章讨论。'}
          </p>
        </div>
        {canCouncil ? (
          <Link
            to={`/community-deliberation/new?${new URLSearchParams({ propertyId }).toString()}`}
            className="rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover"
          >
            {en ? 'New matter' : '新建事项'}
          </Link>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-gray-500">{en ? 'Loading…' : '加载中…'}</p>
      ) : matters.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">{en ? 'No active governance matters.' : '暂无进行中的治理事项。'}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {matters.map((m) => (
            <li key={m.id}>
              <Link
                to={governanceMatterDetailUrl(m.id, propertyId)}
                className="block rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-clearstrata-brand-200"
              >
                <p className="font-semibold text-gray-900">{m.title}</p>
                <p className="mt-0.5 text-xs text-gray-600">
                  {governanceMatterStatusLabel(m.status, en)} · {governanceMatterCategoryLabel(m.category, en)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
