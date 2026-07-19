import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProperty } from '@/contexts/PropertyContext';
import { CommunityResolutionContextCard } from '@/components/community-resolution/CommunityResolutionContextCard';
import { formatConstitutionalPrinciple } from '@/lib/community/constitutionalBasis';
import {
  communityResolutionCouncilStatusLabel,
} from '@/lib/community/communityResolutionModel';
import {
  governanceMatterDetailUrl,
  isCouncilGovernanceRole,
  type GovernanceMatterRow,
} from '@/lib/community/governanceMatterModel';
import {
  fetchCommunityResolutionRevisions,
  fetchCommunityResolutionContext,
} from '@/features/community-resolutions/communityResolutionsApi';
import { loadCommunityResolutionGovernanceBundle } from '@/features/community-resolutions/communityResolutionGovernanceBundle';
import type {
  CommunityResolutionRevisionRow,
  CommunityResolutionRow,
} from '@/lib/community/communityResolutionModel';
import {
  buildGovernanceMeetingEditorNavigation,
  canShowScheduleGovernanceMeeting,
  GOVERNANCE_MEETING_NAVIGATION_DEFAULTS,
  resolveGovernanceLinkedMeetingId,
} from '@/lib/meetings/governanceMeetingNavigation';

export function CommunityResolutionDetailPage() {
  const { resolutionId } = useParams<{ resolutionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId, roleInProperty, ready: propertyReady } = useProperty();

  const propertyId = searchParams.get('propertyId')?.trim() || currentPropertyId || '';
  const canCouncil = isCouncilGovernanceRole(roleInProperty);
  const [resolution, setResolution] = useState<CommunityResolutionRow | null>(null);
  const [matter, setMatter] = useState<GovernanceMatterRow | null>(null);
  const [matterLoadError, setMatterLoadError] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<CommunityResolutionRevisionRow[]>([]);
  const [contextBundle, setContextBundle] = useState<Awaited<
    ReturnType<typeof fetchCommunityResolutionContext>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const rid = resolutionId?.trim();
    const pid = propertyId.trim();
    if (!propertyReady || !pid || !rid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void (async () => {
      try {
        const [bundle, rev, ctx] = await Promise.all([
          loadCommunityResolutionGovernanceBundle({ propertyId: pid, resolutionId: rid }),
          fetchCommunityResolutionRevisions(pid, rid),
          fetchCommunityResolutionContext(pid, rid, en),
        ]);
        if (cancelled) return;
        if (!bundle) {
          setResolution(null);
          setMatter(null);
          setMatterLoadError(null);
          setError(en ? 'Resolution not found' : '未找到决议');
          return;
        }
        setResolution(bundle.resolution);
        setMatter(bundle.matter);
        setMatterLoadError(bundle.matterLoadError);
        setRevisions(rev);
        setContextBundle(ctx);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resolutionId, propertyId, propertyReady, en]);

  const linkedMeetingId =
    resolution && matter
      ? resolveGovernanceLinkedMeetingId({ matter, resolution })
      : resolution?.meeting_id?.trim() || null;

  const showScheduleMeeting =
    resolution &&
    matter &&
    canShowScheduleGovernanceMeeting({
      canCouncil,
      matter,
      resolution,
      activePropertyId: propertyId.trim(),
    });

  function handleScheduleMeeting() {
    if (!resolution || !matter || !propertyId.trim()) return;
    if (
      !canShowScheduleGovernanceMeeting({
        canCouncil,
        matter,
        resolution,
        activePropertyId: propertyId.trim(),
      })
    ) {
      return;
    }
    const navigation = buildGovernanceMeetingEditorNavigation({
      matter,
      resolution,
      meetingType: GOVERNANCE_MEETING_NAVIGATION_DEFAULTS.meetingType,
      initiationType: GOVERNANCE_MEETING_NAVIGATION_DEFAULTS.initiationType,
    });
    navigate(navigation.pathname, { state: navigation.state });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-clearstrata-ui-primary border-t-transparent" />
      </div>
    );
  }

  if (!resolution) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-red-700">{error ?? (en ? 'Not found' : '未找到')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
        {en ? 'Community Resolution' : '社区决议'} ·{' '}
        {communityResolutionCouncilStatusLabel(resolution.council_review_status, en)}
      </p>
      <h1 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">{resolution.title}</h1>

      {resolution.executive_summary ? (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
          {resolution.executive_summary}
        </p>
      ) : null}

      {contextBundle ? (
        <div className="mt-4">
          <CommunityResolutionContextCard bundle={contextBundle} langEn={en} compact />
        </div>
      ) : null}

      {resolution.constitutional_basis?.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900">{en ? 'Constitutional Basis' : '宪章依据'}</h2>
          <ul className="mt-2 space-y-1">
            {resolution.constitutional_basis.map((ref, i) => (
              <li key={i} className="text-sm text-gray-800">
                {formatConstitutionalPrinciple(ref, en)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {resolution.governance_matter_id ? (
        <p className="mt-4 text-sm">
          <Link
            to={governanceMatterDetailUrl(resolution.governance_matter_id, propertyId)}
            className="font-semibold text-clearstrata-brand-900 hover:underline"
          >
            {en ? '← Origin governance matter' : '← 来源治理事项'}
          </Link>
        </p>
      ) : null}

      {matterLoadError ? (
        <p className="mt-3 text-sm text-amber-800">
          {en
            ? 'The source Governance Matter could not be loaded, so the meeting cannot be scheduled yet.'
            : '无法载入来源治理事项，因此暂时无法安排会议。'}
        </p>
      ) : null}

      {linkedMeetingId ? (
        <p className="mt-2 text-sm">
          <Link
            to={`/meetings/${encodeURIComponent(linkedMeetingId)}`}
            className="font-semibold text-clearstrata-brand-900 hover:underline"
          >
            {en ? 'Linked meeting →' : '关联会议 →'}
          </Link>
        </p>
      ) : null}

      {showScheduleMeeting ? (
        <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm">
          <p className="text-sm text-gray-700">
            {en
              ? 'The Community Resolution is ready. Schedule a meeting to create the formal agenda.'
              : '社区决议已准备完成，可安排会议并生成正式议程。'}
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            className="mt-3"
            onClick={handleScheduleMeeting}
          >
            {en ? 'Schedule Meeting' : '安排会议'}
          </Button>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">{en ? 'Revision history' : '修订历史'}</h2>
        <ol className="mt-3 space-y-2 border-l-2 border-emerald-200 pl-4">
          {revisions.map((r) => (
            <li key={r.id} className="text-sm">
              <span className="font-semibold text-gray-900">
                {en ? 'Revision' : '修订'} {r.revision_no}
              </span>
              <span className="text-gray-600"> — {r.change_kind.replace(/_/g, ' ')}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-6 border-t border-gray-200 pt-3 text-[11px] text-gray-600">
        {en
          ? 'Generated through deliberation · Reviewed by Council · Decision by vote'
          : '源于议事 · 业委会审议 · 投票决定'}
      </footer>
    </div>
  );
}
