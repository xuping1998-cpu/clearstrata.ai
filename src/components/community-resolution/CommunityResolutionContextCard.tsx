import { Link } from 'react-router-dom';
import {
  formatConstitutionalPrinciple,
} from '@/lib/community/constitutionalBasis';
import {
  communityResolutionDetailUrl,
  type CommunityResolutionContextBundle,
} from '@/lib/community/communityResolutionModel';
import { governanceMatterDetailUrl } from '@/lib/community/governanceMatterModel';

export type CommunityResolutionContextCardProps = {
  bundle: CommunityResolutionContextBundle;
  langEn: boolean;
  compact?: boolean;
};

export function CommunityResolutionContextCard({
  bundle,
  langEn,
  compact = false,
}: CommunityResolutionContextCardProps) {
  const en = langEn;
  const { resolution, matterTitle, matterId, commentCount, revisionCount, cdaSummary } = bundle;
  const pid = resolution.property_id;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-3 text-sm text-gray-800">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">
        {en ? 'Community Resolution — Origin' : '社区决议 — 来源'}
      </p>
      <p className="mt-1 font-semibold text-gray-900">{resolution.title}</p>

      {resolution.executive_summary && !compact ? (
        <p className="mt-2 whitespace-pre-wrap text-gray-700">{resolution.executive_summary}</p>
      ) : null}

      {resolution.constitutional_basis?.length > 0 ? (
        <div className="mt-2">
          <p className="text-xs font-semibold text-emerald-900">{en ? 'Constitutional Basis' : '宪章依据'}</p>
          <ul className="mt-0.5 space-y-0.5">
            {resolution.constitutional_basis.map((ref, i) => (
              <li key={i} className="text-xs text-gray-800">
                {formatConstitutionalPrinciple(ref, en)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <dl className="mt-2 grid gap-1 text-xs text-gray-600">
        {matterId && matterTitle ? (
          <div>
            <dt className="inline font-semibold">{en ? 'Origin Matter: ' : '来源事项：'}</dt>
            <dd className="inline">
              <Link to={governanceMatterDetailUrl(matterId, pid)} className="font-medium text-clearstrata-brand-900 hover:underline">
                {matterTitle}
              </Link>
            </dd>
          </div>
        ) : null}
        {commentCount > 0 ? (
          <div>
            <dt className="inline font-semibold">{en ? 'Discussion: ' : '讨论：'}</dt>
            <dd className="inline">
              {commentCount} {en ? 'comments' : '条评论'}
            </dd>
          </div>
        ) : null}
        {cdaSummary ? (
          <div>
            <dt className="font-semibold">{en ? 'CDA Summary' : '议事助手摘要'}</dt>
            <dd className="mt-0.5 text-gray-700">{cdaSummary}</dd>
          </div>
        ) : null}
        {revisionCount > 0 ? (
          <div>
            <dt className="inline font-semibold">{en ? 'Council Review: ' : '业委会审议：'}</dt>
            <dd className="inline">
              {revisionCount} {en ? 'revisions' : '次修订'}
            </dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-2 text-[11px] text-emerald-900/80">
        {en
          ? 'This resolution organizes deliberation. Only a legitimate vote creates a binding decision.'
          : '本决议整理议事内容。仅合法投票产生具有约束力的决定。'}
      </p>

      {!compact ? (
        <Link
          to={communityResolutionDetailUrl(resolution.id, pid)}
          className="mt-2 inline-block text-xs font-semibold text-clearstrata-brand-900 hover:underline"
        >
          {en ? 'View full resolution' : '查看完整决议'}
        </Link>
      ) : null}
    </div>
  );
}
