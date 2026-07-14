import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, ButtonLink } from '@/components/ui/Button';
import { GovernanceFeedbackHost } from '@/components/ui/feedback/GovernanceFeedbackHost';
import { useGovernanceFeedback } from '@/hooks/useGovernanceFeedback';
import type { GovernanceFeedbackKey } from '@/lib/ui/governanceFeedbackMessages';
import { INTERACTION_LINK } from '@/lib/ui/interactionClasses';
import {
  ArchivedState,
  ContextualEmptyState,
  ErrorState,
  LoadingState,
  PartialStateBanner,
  PermissionState,
  sanitizeUserErrorMessage,
} from '@/components/ui/state';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProperty } from '@/contexts/PropertyContext';
import { useAuth } from '@/contexts/AuthContext';
import { GovernanceLifecycleFeed } from '@/components/community-deliberation/GovernanceLifecycleFeed';
import { GovernanceLifecycleTimeline } from '@/components/community-deliberation/GovernanceLifecycleTimeline';
import {
  GovernanceHubPanel,
  computeCouncilActionSummary,
} from '@/components/community-deliberation/GovernanceHubPanel';
import { OwnerParticipationPanel, type ParticipationCountState } from '@/components/community-deliberation/OwnerParticipationPanel';
import {
  mergeDeliberationBullets,
  partitionBullets,
} from '@/components/dashboard/ImportantUpdatesDashboardCard';
import { useImportantUpdatesBullets } from '@/hooks/useImportantUpdatesBullets';
import { useGovernanceMatterDashboard } from '@/hooks/useGovernanceMatterDashboard';
import { meetingsNavHref } from '@/lib/meetingPermissions';
import { GovernanceMatterDetailTabs } from '@/components/community-deliberation/GovernanceMatterDetailTabs';
import { GovernanceMatterFollowButton } from '@/components/community-deliberation/GovernanceMatterFollowButton';
import {
  GOVERNANCE_MATTER_CATEGORIES,
  GOVERNANCE_MATTER_STATUSES,
  governanceMatterCategoryLabel,
  governanceMatterDetailUrl,
  governanceMattersListUrl,
  type GovernanceHubView,
  governanceMatterStatusLabel,
  isCouncilGovernanceRole,
  type GovernanceMatterCommentRow,
  type GovernanceMatterDashboardRow,
  type GovernanceMatterRevisionRow,
  type GovernanceMatterRow,
} from '@/lib/community/governanceMatterModel';
import {
  addGovernanceMatterComment,
  createGovernanceMatter,
  fetchGovernanceMatterById,
  fetchGovernanceMatterComments,
  fetchGovernanceMatterIdsWithUserComments,
  fetchGovernanceMatterRevisions,
  fetchGovernanceMattersByIds,
  fetchGovernanceMattersForCouncilWorkspace,
  fetchSubscribedGovernanceMatterIds,
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
  const location = useLocation();
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId, roleInProperty, ready: propertyReady } = useProperty();
  const feedback = useGovernanceFeedback();

  const propertyId = searchParams.get('propertyId')?.trim() || currentPropertyId || '';
  const canCouncil = isCouncilGovernanceRole(roleInProperty);

  const [matter, setMatter] = useState<GovernanceMatterRow | null>(null);
  const [revisions, setRevisions] = useState<GovernanceMatterRevisionRow[]>([]);
  const [comments, setComments] = useState<GovernanceMatterCommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);
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

  const feedbackKey = (location.state as { governanceFeedbackKey?: GovernanceFeedbackKey } | null)
    ?.governanceFeedbackKey;

  useEffect(() => {
    if (!feedbackKey) return;
    feedback.notifySuccess(feedbackKey);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- consume navigation state once
  }, [feedbackKey]);

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
    if (!matter || !propertyId.trim() || commentSubmitting || !commentBody.trim()) return;
    setCommentSubmitting(true);
    setError(null);
    try {
      const row = await addGovernanceMatterComment(propertyId.trim(), matter.id, commentBody);
      setComments((prev) => [...prev, row]);
      setCommentBody('');
      feedback.notifySuccess('commentPosted');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to post comment';
      setError(msg);
      feedback.notifyError(msg);
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handleCouncilSave() {
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
      const rev = await fetchGovernanceMatterRevisions(propertyId.trim(), matter.id);
      setRevisions(rev);
      feedback.notifySuccess('revisionSaved');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update matter';
      setError(msg);
      feedback.notifyError(msg);
    } finally {
      setRevisionSubmitting(false);
    }
  }

  async function handleRequestCdaAnalysis() {
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
      feedback.notifySuccess('cdaGenerated');
    } catch (e) {
      const msg = e instanceof Error ? e.message : en ? 'CDA analysis failed' : '议事助手分析失败';
      setError(msg);
      feedback.notifyError(msg);
    } finally {
      setCdaGenerating(false);
    }
  }

  async function handleCreateResolution() {
    if (!matter || !propertyId.trim() || resolutionSubmitting) return;
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
      feedback.notifySuccess('resolutionCreated');
      navigate(communityResolutionDetailUrl(row.id, propertyId.trim()));
    } catch (e) {
      const msg = e instanceof Error ? e.message : en ? 'Failed to create resolution' : '创建决议失败';
      setError(msg);
      feedback.notifyError(msg);
    } finally {
      setResolutionSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState langEn={en} variant="page" label={en ? 'Loading matter…' : '正在加载事项…'} />;
  }

  if (!matter) {
    const notFound = error?.includes('not found') || error?.includes('未找到');
    if (notFound) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-8">
          <ContextualEmptyState
            langEn={en}
            contentKey="governance.matterNotFound"
            propertyId={propertyId}
          />
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <ErrorState
          langEn={en}
          title={sanitizeUserErrorMessage(error, {
            en: 'Unable to load this governance matter.',
            zh: '无法加载此治理事项。',
          })}
          onRetry={() => window.location.reload()}
        />
        <Link
          to={governanceMattersListUrl(propertyId)}
          className={`mt-4 inline-block text-sm font-semibold text-clearstrata-brand-900 ${INTERACTION_LINK}`}
        >
          {en ? 'Back to Governance Hub' : '返回治理中心'}
        </Link>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <GovernanceFeedbackHost langEn={en} items={feedback.items} onDismiss={feedback.dismiss} />
      <nav aria-label={en ? 'Breadcrumb' : '导航'}>
        <Link
          to={governanceMattersListUrl(propertyId)}
          className={`text-sm font-semibold text-clearstrata-brand-900 ${INTERACTION_LINK}`}
        >
          ← {en ? 'Governance Hub' : '治理中心'}
        </Link>
      </nav>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {governanceMatterCategoryLabel(matter.category, en)} · {governanceMatterStatusLabel(matter.status, en)}
        </p>
        <h1 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{matter.title}</h1>
        <GovernanceMatterFollowButton
          propertyId={propertyId}
          matterId={matter.id}
          langEn={en}
        />
        <div className="mt-3">
          <GovernanceLifecycleTimeline status={matter.status} langEn={en} />
        </div>
      </header>

      {matter.status === 'archived' ? <ArchivedState langEn={en} className="mt-4" /> : null}

      {error ? (
        <ErrorState
          langEn={en}
          title={sanitizeUserErrorMessage(error, {
            en: 'This action could not be completed.',
            zh: '无法完成此操作。',
          })}
          compact
          className="mt-4"
        />
      ) : null}

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
        commentSubmitting={commentSubmitting}
        revisionSubmitting={revisionSubmitting}
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
    </main>
  );
}

export function GovernanceMatterCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId, roleInProperty, ready: propertyReady } = useProperty();
  const feedback = useGovernanceFeedback();
  const titleRef = useRef<HTMLInputElement>(null);

  const propertyId = searchParams.get('propertyId')?.trim() || currentPropertyId || '';
  const canCouncil = isCouncilGovernanceRole(roleInProperty);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<(typeof GOVERNANCE_MATTER_CATEGORIES)[number]>('other');
  const [status, setStatus] = useState<(typeof GOVERNANCE_MATTER_STATUSES)[number]>('discussion');
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (propertyReady && !canCouncil) {
    return (
      <PermissionState
        langEn={en}
        title={{
          en: 'Only council may create governance matters.',
          zh: '仅业委会可创建治理事项。',
        }}
        description={{
          en: 'Contact your strata council if you believe you should have access.',
          zh: '如您认为应有权限，请联系业委会。',
        }}
      />
    );
  }

  async function handleCreate() {
    if (!propertyId.trim() || submitting) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      const msg = en ? 'Title is required.' : '请填写标题。';
      setTitleError(msg);
      titleRef.current?.focus();
      return;
    }
    setTitleError(null);
    setSubmitting(true);
    setError(null);
    try {
      const row = await createGovernanceMatter({
        propertyId: propertyId.trim(),
        title: trimmedTitle,
        description,
        category,
        status,
      });
      const feedbackKey: GovernanceFeedbackKey =
        status === 'public_consultation' ? 'matterPublished' : 'matterCreated';
      navigate(governanceMatterDetailUrl(row.id, propertyId.trim()), {
        state: { governanceFeedbackKey: feedbackKey },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create matter';
      setError(msg);
      feedback.notifyError(msg);
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <GovernanceFeedbackHost langEn={en} items={feedback.items} onDismiss={feedback.dismiss} />
      <h1 className="text-xl font-bold text-gray-900">{en ? 'New governance matter' : '新建治理事项'}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {en ? 'Community Deliberation — every discussion belongs to one matter.' : '社区议事厅 — 每项讨论必须属于一个治理事项。'}
      </p>
      <form
        className="mt-6 space-y-3"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void handleCreate();
        }}
      >
        <div>
          <label htmlFor="matter-create-title" className="block text-sm font-semibold text-gray-800">
            {en ? 'Title' : '标题'}
            <span className="text-red-600" aria-hidden>
              {' '}
              *
            </span>
          </label>
          <input
            id="matter-create-title"
            ref={titleRef}
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError && e.target.value.trim()) setTitleError(null);
            }}
            placeholder={en ? 'Title' : '标题'}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? 'matter-title-error' : undefined}
            className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
              titleError ? 'border-red-400 focus-visible:ring-red-300' : 'border-gray-300'
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clearstrata-ui-primary/40`}
          />
          {titleError ? (
            <p id="matter-title-error" className="mt-1 text-sm text-red-700" role="alert">
              {titleError}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="matter-create-description" className="block text-sm font-semibold text-gray-800">
            {en ? 'Description' : '说明'}
          </label>
          <textarea
            id="matter-create-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder={en ? 'Description' : '说明'}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clearstrata-ui-primary/40"
          />
        </div>
        <div>
          <label htmlFor="matter-create-category" className="block text-sm font-semibold text-gray-800">
            {en ? 'Category' : '类别'}
          </label>
          <select
            id="matter-create-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clearstrata-ui-primary/40"
          >
          {GOVERNANCE_MATTER_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {governanceMatterCategoryLabel(c, en)}
            </option>
          ))}
        </select>
        </div>
        <div>
          <label htmlFor="matter-create-status" className="block text-sm font-semibold text-gray-800">
            {en ? 'Initial status' : '初始状态'}
          </label>
          <select
            id="matter-create-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clearstrata-ui-primary/40"
          >
          {GOVERNANCE_MATTER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {governanceMatterStatusLabel(s, en)}
            </option>
          ))}
        </select>
        </div>
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" size="md" loading={submitting} disabled={!title.trim()}>
          {en ? 'Create matter' : '创建事项'}
        </Button>
      </form>
    </main>
  );
}

export function GovernanceMattersHubPage() {
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId, roleInProperty, ready: propertyReady } = useProperty();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const propertyId = currentPropertyId ?? '';
  const canCouncil = isCouncilGovernanceRole(roleInProperty);

  const viewParam = searchParams.get('view')?.trim() ?? '';
  const hubView: GovernanceHubView | null =
    viewParam === 'subscribed' || viewParam === 'comments' ? viewParam : null;

  const [allMatters, setAllMatters] = useState<GovernanceMatterRow[]>([]);
  const [commentedMatterCount, setCommentedMatterCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [subscribedMatterIds, setSubscribedMatterIds] = useState<string[]>([]);
  const [commentedMatterIds, setCommentedMatterIds] = useState<string[]>([]);
  const [personalFilterMatters, setPersonalFilterMatters] = useState<GovernanceMatterDashboardRow[]>([]);

  const [feedLoading, setFeedLoading] = useState(true);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [personalFilterLoading, setPersonalFilterLoading] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState<string | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [personalFilterError, setPersonalFilterError] = useState<string | null>(null);

  const [commentsCountState, setCommentsCountState] = useState<ParticipationCountState>('idle');
  const [followingCountState, setFollowingCountState] = useState<ParticipationCountState>('idle');
  const [participationRetryToken, setParticipationRetryToken] = useState(0);
  const lastParticipationPropertyRef = useRef<string | null>(null);

  const retryParticipationLoads = useCallback(() => {
    setParticipationRetryToken((t) => t + 1);
  }, []);

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
    const requestedPropertyId = propertyId.trim();
    let cancelled = false;
    setFeedLoading(true);
    void (async () => {
      try {
        const rows = await fetchGovernanceMattersForCouncilWorkspace(requestedPropertyId);
        if (cancelled || requestedPropertyId !== propertyId.trim()) return;
        setAllMatters(rows);
      } finally {
        if (!cancelled) setFeedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId, propertyReady]);

  useEffect(() => {
    if (!propertyReady || !propertyId.trim() || !user?.id) {
      setSubscriptionsLoading(false);
      setCommentsLoading(false);
      setCommentsCountState('idle');
      setFollowingCountState('idle');
      setSubscriptionsError(null);
      setCommentsError(null);
      setSubscribedMatterIds([]);
      setCommentedMatterIds([]);
      setFollowingCount(0);
      setCommentedMatterCount(0);
      return;
    }

    const requestedPropertyId = propertyId.trim();
    if (lastParticipationPropertyRef.current !== requestedPropertyId) {
      lastParticipationPropertyRef.current = requestedPropertyId;
      setSubscribedMatterIds([]);
      setCommentedMatterIds([]);
      setFollowingCount(0);
      setCommentedMatterCount(0);
    }
    let cancelled = false;

    const loadSubscriptions = async () => {
      setSubscriptionsLoading(true);
      setSubscriptionsError(null);
      setFollowingCountState('loading');
      try {
        const ids = await fetchSubscribedGovernanceMatterIds(requestedPropertyId);
        if (cancelled || requestedPropertyId !== propertyId.trim()) return;
        setSubscribedMatterIds(ids);
        setFollowingCount(ids.length);
        setFollowingCountState('ok');
      } catch (e) {
        if (cancelled || requestedPropertyId !== propertyId.trim()) return;
        const msg = e instanceof Error ? e.message : 'Subscription load failed';
        console.error('[GOVERNANCE HUB] subscriptions load failed', {
          propertyId: requestedPropertyId,
          error: msg,
        });
        setSubscriptionsError(msg);
        setFollowingCountState('error');
      } finally {
        if (!cancelled) setSubscriptionsLoading(false);
      }
    };

    const loadComments = async () => {
      setCommentsLoading(true);
      setCommentsError(null);
      setCommentsCountState('loading');
      try {
        const ids = await fetchGovernanceMatterIdsWithUserComments(requestedPropertyId);
        if (cancelled || requestedPropertyId !== propertyId.trim()) return;
        setCommentedMatterIds(ids);
        setCommentedMatterCount(ids.length);
        setCommentsCountState('ok');
      } catch (e) {
        if (cancelled || requestedPropertyId !== propertyId.trim()) return;
        const msg = e instanceof Error ? e.message : 'Commented matters load failed';
        console.error('[GOVERNANCE HUB] commented matters load failed', {
          propertyId: requestedPropertyId,
          error: msg,
        });
        setCommentsError(msg);
        setCommentsCountState('error');
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    };

    void loadSubscriptions();
    void loadComments();

    return () => {
      cancelled = true;
    };
  }, [propertyId, propertyReady, user?.id, participationRetryToken]);

  useEffect(() => {
    if (!hubView || !propertyReady || !propertyId.trim()) {
      setPersonalFilterMatters([]);
      setPersonalFilterLoading(false);
      setPersonalFilterError(null);
      return;
    }

    const matterIds = hubView === 'subscribed' ? subscribedMatterIds : commentedMatterIds;
    const idsLoading = hubView === 'subscribed' ? subscriptionsLoading : commentsLoading;
    const idsError = hubView === 'subscribed' ? subscriptionsError : commentsError;

    if (idsLoading) return;

    if (idsError) {
      setPersonalFilterMatters([]);
      setPersonalFilterLoading(false);
      setPersonalFilterError(null);
      return;
    }

    if (matterIds.length === 0) {
      setPersonalFilterMatters([]);
      setPersonalFilterLoading(false);
      setPersonalFilterError(null);
      return;
    }

    const requestedPropertyId = propertyId.trim();
    let cancelled = false;
    setPersonalFilterLoading(true);
    setPersonalFilterError(null);

    void (async () => {
      try {
        const rows = await fetchGovernanceMattersByIds(requestedPropertyId, matterIds);
        if (cancelled || requestedPropertyId !== propertyId.trim()) return;
        setPersonalFilterMatters(rows);
      } catch (e) {
        if (cancelled || requestedPropertyId !== propertyId.trim()) return;
        const msg = e instanceof Error ? e.message : 'Personal filter matters load failed';
        console.error('[GOVERNANCE HUB] personal filter matters load failed', {
          propertyId: requestedPropertyId,
          view: hubView,
          error: msg,
        });
        setPersonalFilterError(msg);
        setPersonalFilterMatters([]);
      } finally {
        if (!cancelled) setPersonalFilterLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    hubView,
    propertyId,
    propertyReady,
    subscribedMatterIds,
    commentedMatterIds,
    subscriptionsLoading,
    commentsLoading,
    subscriptionsError,
    commentsError,
  ]);

  const filteredMatters = hubView ? personalFilterMatters : allMatters;

  const filterViewLoading = useMemo(() => {
    if (!hubView) return false;
    if (hubView === 'subscribed') {
      if (subscriptionsLoading) return true;
      if (subscriptionsError) return false;
      if (subscribedMatterIds.length > 0 && personalFilterLoading) return true;
      return false;
    }
    if (commentsLoading) return true;
    if (commentsError) return false;
    if (commentedMatterIds.length > 0 && personalFilterLoading) return true;
    return false;
  }, [
    hubView,
    subscriptionsLoading,
    subscriptionsError,
    subscribedMatterIds.length,
    commentsLoading,
    commentsError,
    commentedMatterIds.length,
    personalFilterLoading,
  ]);

  const filterViewError = useMemo(() => {
    if (!hubView) return null;
    if (hubView === 'subscribed') {
      return subscriptionsError ?? personalFilterError;
    }
    return commentsError ?? personalFilterError;
  }, [hubView, subscriptionsError, commentsError, personalFilterError]);

  const filterTitle = useMemo(() => {
    if (!hubView) return null;
    if (hubView === 'subscribed') return en ? 'Following' : '关注事项';
    return en ? 'My Comments' : '我的评论';
  }, [hubView, en]);

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

  const nonDraftMatters = useMemo(
    () => allMatters.filter((m) => m.status !== 'draft'),
    [allMatters],
  );

  const hubInitialLoading = !hubView && loading;
  const hubFirstTimeEmpty =
    !hubView && !hubInitialLoading && nonDraftMatters.length === 0 && notices.length === 0;

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
          <ButtonLink
            to={`/community-deliberation/new?${new URLSearchParams({ propertyId }).toString()}`}
            variant="primary"
            size="md"
          >
            {en ? '+ Publish Governance Matter' : '+ 发布治理事项'}
          </ButtonLink>
        ) : null}
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main aria-labelledby="governance-feed-heading">
          <h2 id="governance-feed-heading" className="text-xs font-bold uppercase tracking-wide text-gray-500">
            {hubView ? filterTitle : en ? 'Governance Activity' : '治理动态'}
          </h2>
          {hubView ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
              <span>{en ? 'Filtered view' : '筛选视图'}</span>
              <Link
                to={governanceMattersListUrl(propertyId)}
                className="font-semibold text-clearstrata-brand-900 hover:underline"
              >
                {en ? 'Show all matters' : '显示全部事项'}
              </Link>
            </div>
          ) : null}
          <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/40 p-4">
            {hubInitialLoading ? (
              <LoadingState
                langEn={en}
                variant="hub"
                label={en ? 'Loading governance hub…' : '正在加载治理中心…'}
              />
            ) : hubFirstTimeEmpty ? (
              <ContextualEmptyState
                langEn={en}
                contentKey={
                  canCouncil ? 'governance.firstTimeEmptyCouncil' : 'governance.firstTimeEmptyOwner'
                }
                canCouncil={canCouncil}
                propertyId={propertyId}
              />
            ) : hubView ? (
              filterViewLoading ? (
                <LoadingState
                  langEn={en}
                  variant="filteredFeed"
                  label={en ? 'Loading your matters…' : '正在加载您的事项…'}
                />
              ) : filterViewError ? (
                <ErrorState
                  langEn={en}
                  title={sanitizeUserErrorMessage(filterViewError, {
                    en: 'We could not load your matters. Please try again.',
                    zh: '暂时无法加载您的事项，请稍后重试。',
                  })}
                  onRetry={retryParticipationLoads}
                />
              ) : filteredMatters.length === 0 ? (
                <ContextualEmptyState
                  langEn={en}
                  contentKey={
                    hubView === 'subscribed' ? 'governance.noFollowing' : 'governance.noComments'
                  }
                  propertyId={propertyId}
                />
              ) : (
                <GovernanceLifecycleFeed
                  langEn={en}
                  loading={false}
                  matters={filteredMatters}
                  notices={[]}
                  propertyId={propertyId}
                  canCouncil={canCouncil}
                  personalFilterView
                />
              )
            ) : (
              <GovernanceLifecycleFeed
                langEn={en}
                loading={false}
                matters={filteredMatters}
                notices={notices}
                propertyId={propertyId}
                canCouncil={canCouncil}
              />
            )}
          </div>
        </main>

        <aside className="lg:sticky lg:top-4 lg:self-start" aria-labelledby="governance-participation-heading">
          <h2 id="governance-participation-heading" className="sr-only">
            {canCouncil
              ? en
                ? 'Council governance panel'
                : '业委会治理面板'
              : en
                ? 'My governance participation'
                : '我的治理参与'}
          </h2>
          {!canCouncil && (subscriptionsError || commentsError) ? (
            <PartialStateBanner
              langEn={en}
              failures={[
                subscriptionsError
                  ? {
                      id: 'subscriptions',
                      message: {
                        en: 'Following list is temporarily unavailable.',
                        zh: '关注列表暂时不可用。',
                      },
                    }
                  : null,
                commentsError
                  ? {
                      id: 'comments',
                      message: {
                        en: 'Comment history is temporarily unavailable.',
                        zh: '评论记录暂时不可用。',
                      },
                    }
                  : null,
              ].filter((f): f is NonNullable<typeof f> => Boolean(f))}
              className="mb-3"
            />
          ) : null}
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
              commentedMatterCount={commentedMatterCount}
              commentsCountState={commentsCountState}
              followingCount={followingCount}
              followingCountState={followingCountState}
              roleInProperty={roleInProperty}
              activeMatterCount={ownerAttention.activeMatterCount}
              votingMatterCount={ownerAttention.votingMatterCount}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
