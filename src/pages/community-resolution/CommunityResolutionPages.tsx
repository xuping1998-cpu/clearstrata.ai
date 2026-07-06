import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProperty } from '@/contexts/PropertyContext';
import { CommunityResolutionContextCard } from '@/components/community-resolution/CommunityResolutionContextCard';
import { formatConstitutionalPrinciple } from '@/lib/community/constitutionalBasis';
import {
  communityResolutionCouncilStatusLabel,
  communityResolutionDetailUrl,
} from '@/lib/community/communityResolutionModel';
import { governanceMatterDetailUrl } from '@/lib/community/governanceMatterModel';
import {
  fetchCommunityResolutionById,
  fetchCommunityResolutionRevisions,
} from '@/features/community-resolutions/communityResolutionsApi';
import type {
  CommunityResolutionRevisionRow,
  CommunityResolutionRow,
} from '@/lib/community/communityResolutionModel';
import { fetchCommunityResolutionContext } from '@/features/community-resolutions/communityResolutionsApi';

export function CommunityResolutionDetailPage() {
  const { resolutionId } = useParams<{ resolutionId: string }>();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId, ready: propertyReady } = useProperty();

  const propertyId = searchParams.get('propertyId')?.trim() || currentPropertyId || '';
  const [resolution, setResolution] = useState<CommunityResolutionRow | null>(null);
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
        const [res, rev, ctx] = await Promise.all([
          fetchCommunityResolutionById(pid, rid),
          fetchCommunityResolutionRevisions(pid, rid),
          fetchCommunityResolutionContext(pid, rid, en),
        ]);
        if (cancelled) return;
        setResolution(res);
        setRevisions(rev);
        setContextBundle(ctx);
        if (!res) setError(en ? 'Resolution not found' : '未找到决议');
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

      {resolution.meeting_id ? (
        <p className="mt-2 text-sm">
          <Link
            to={`/meetings/${encodeURIComponent(resolution.meeting_id)}`}
            className="font-semibold text-clearstrata-brand-900 hover:underline"
          >
            {en ? 'Linked meeting →' : '关联会议 →'}
          </Link>
        </p>
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
