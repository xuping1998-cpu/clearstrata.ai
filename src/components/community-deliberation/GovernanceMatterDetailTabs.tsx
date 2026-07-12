import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { ConstitutionalDeliberationAssistantPanel } from '@/components/community-deliberation/ConstitutionalDeliberationAssistantPanel';
import {
  constitutionalBasisForCategory,
  formatConstitutionalPrinciple,
} from '@/lib/community/constitutionalBasis';
import {
  communityResolutionCouncilStatusLabel,
  communityResolutionDetailUrl,
  type CommunityResolutionRow,
} from '@/lib/community/communityResolutionModel';
import {
  GOVERNANCE_MATTER_STATUSES,
  governanceMatterCategoryLabel,
  governanceMatterStatusLabel,
  type GovernanceMatterCommentRow,
  type GovernanceMatterRevisionRow,
  type GovernanceMatterRow,
} from '@/lib/community/governanceMatterModel';
import { GovernanceMatterTimelineTab } from '@/components/community-deliberation/GovernanceMatterTimelineTab';
import type { GovernanceMatterCdaReportRow } from '@/lib/community/cdaReportModel';

export type MatterDetailTab = 'details' | 'discussion' | 'resolution' | 'cda' | 'timeline';

export type GovernanceMatterDetailTabsProps = {
  langEn: boolean;
  matter: GovernanceMatterRow;
  propertyId: string;
  canCouncil: boolean;
  comments: GovernanceMatterCommentRow[];
  revisions: GovernanceMatterRevisionRow[];
  cdaReport: GovernanceMatterCdaReportRow | null;
  cdaLoading: boolean;
  cdaGenerating: boolean;
  linkedResolution: CommunityResolutionRow | null;
  commentBody: string;
  onCommentBodyChange: (value: string) => void;
  onPostComment: () => void;
  submitting: boolean;
  editTitle: string;
  editDescription: string;
  editStatus: GovernanceMatterRow['status'];
  onEditTitleChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onEditStatusChange: (value: GovernanceMatterRow['status']) => void;
  onCouncilSave: () => void;
  onRequestCdaAnalysis: () => void;
  onCreateResolution: () => void;
  resolutionSubmitting: boolean;
  /** Parent may request a tab switch (e.g. cockpit action queue). */
  requestedTab?: MatterDetailTab | null;
  onRequestedTabHandled?: () => void;
  /** Council workspace shows an extra Details tab. */
  includeDetailsTab?: boolean;
  defaultTab?: MatterDetailTab;
  /** Quieter tab chrome for Governance Cockpit center column. */
  compactLayout?: boolean;
};

const TAB_DEFS: { id: MatterDetailTab; en: string; zh: string }[] = [
  { id: 'details', en: 'Details', zh: '详情' },
  { id: 'discussion', en: 'Discussion', zh: '讨论' },
  { id: 'resolution', en: 'Resolution', zh: '决议' },
  { id: 'cda', en: 'CDA', zh: '议事助手' },
  { id: 'timeline', en: 'Timeline', zh: '时间线' },
];

function resolutionWorkflowStatus(
  linkedResolution: CommunityResolutionRow | null,
  langEn: boolean,
): { label: string; tone: 'neutral' | 'draft' | 'review' | 'ready' } {
  const en = langEn;
  if (!linkedResolution) {
    return { label: en ? 'Not Ready' : '尚未就绪', tone: 'neutral' };
  }
  const council = linkedResolution.council_review_status;
  if (council === 'ready_for_meeting' || council === 'scheduled' || linkedResolution.status === 'scheduled') {
    return { label: en ? 'Ready for Meeting' : '待排会 / 已排会', tone: 'ready' };
  }
  if (council === 'in_review' || council === 'revised' || linkedResolution.status === 'council_review') {
    return { label: en ? 'Council Review' : '业委会审议', tone: 'review' };
  }
  return { label: en ? 'Draft' : '草案', tone: 'draft' };
}

const STATUS_TONE_CLASS: Record<string, string> = {
  neutral: 'bg-gray-100 text-gray-800',
  draft: 'bg-amber-100 text-amber-900',
  review: 'bg-violet-100 text-violet-900',
  ready: 'bg-emerald-100 text-emerald-900',
};

export function GovernanceMatterDetailTabs(props: GovernanceMatterDetailTabsProps) {
  const en = props.langEn;
  const {
    matter,
    propertyId,
    canCouncil,
    comments,
    revisions,
    cdaReport,
    cdaLoading,
    cdaGenerating,
    linkedResolution,
    commentBody,
    onCommentBodyChange,
    onPostComment,
    submitting,
    editTitle,
    editDescription,
    editStatus,
    onEditTitleChange,
    onEditDescriptionChange,
    onEditStatusChange,
    onCouncilSave,
    onRequestCdaAnalysis,
    onCreateResolution,
    resolutionSubmitting,
    requestedTab,
    onRequestedTabHandled,
    includeDetailsTab = false,
    defaultTab = 'discussion',
    compactLayout = false,
  } = props;

  const [activeTab, setActiveTab] = useState<MatterDetailTab>(defaultTab);

  const visibleTabs = useMemo(
    () => (includeDetailsTab ? TAB_DEFS : TAB_DEFS.filter((t) => t.id !== 'details')),
    [includeDetailsTab],
  );
  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab);
      onRequestedTabHandled?.();
    }
  }, [requestedTab, onRequestedTabHandled]);

  const resolutionStatus = resolutionWorkflowStatus(linkedResolution, en);
  const constitutionalBasis =
    linkedResolution?.constitutional_basis?.length
      ? linkedResolution.constitutional_basis
      : constitutionalBasisForCategory(matter.category);

  return (
    <div className={compactLayout ? 'mt-2' : 'mt-5'}>
      <div
        className={`flex gap-0.5 overflow-x-auto ${compactLayout ? 'border-b border-gray-100' : 'border-b border-gray-200 pb-px'}`}
        role="tablist"
        aria-label={en ? 'Governance matter sections' : '治理事项分区'}
      >
        {visibleTabs.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
              className={
                compactLayout
                  ? `shrink-0 px-3 py-1.5 text-xs font-semibold transition-colors sm:px-3.5 ${
                      selected
                        ? 'rounded-t-md bg-emerald-800 text-white'
                        : 'text-gray-500 hover:text-gray-800'
                    }`
                  : `shrink-0 rounded-t-lg px-3 py-2 text-sm font-semibold transition-colors sm:px-4 ${
                      selected
                        ? 'border border-b-white border-gray-200 bg-white text-clearstrata-brand-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
              }
            >
              {en ? tab.en : tab.zh}
            </button>
          );
        })}
      </div>

      <div
        className={
          compactLayout
            ? 'pt-3'
            : 'rounded-b-2xl rounded-tr-2xl border border-gray-200 bg-white p-5 shadow-sm'
        }
      >
        {activeTab === 'details' ? (
          <DetailsTab
            en={en}
            matter={matter}
            canCouncil={canCouncil}
            editTitle={editTitle}
            editDescription={editDescription}
            editStatus={editStatus}
            onEditTitleChange={onEditTitleChange}
            onEditDescriptionChange={onEditDescriptionChange}
            onEditStatusChange={onEditStatusChange}
            onCouncilSave={onCouncilSave}
            submitting={submitting}
            compactLayout={compactLayout}
          />
        ) : null}

        {activeTab === 'discussion' ? (
          <DiscussionTab
            en={en}
            matter={includeDetailsTab ? undefined : matter}
            comments={comments}
            commentBody={commentBody}
            onCommentBodyChange={onCommentBodyChange}
            onPostComment={onPostComment}
            submitting={submitting}
            showCouncilRevision={!includeDetailsTab && canCouncil}
            editTitle={editTitle}
            editDescription={editDescription}
            editStatus={editStatus}
            onEditTitleChange={onEditTitleChange}
            onEditDescriptionChange={onEditDescriptionChange}
            onEditStatusChange={onEditStatusChange}
            onCouncilSave={onCouncilSave}
          />
        ) : null}

        {activeTab === 'resolution' ? (
          <ResolutionTab
            en={en}
            matter={matter}
            propertyId={propertyId}
            canCouncil={canCouncil}
            linkedResolution={linkedResolution}
            resolutionStatus={resolutionStatus}
            constitutionalBasis={constitutionalBasis}
            onCreateResolution={onCreateResolution}
            resolutionSubmitting={resolutionSubmitting}
          />
        ) : null}

        {activeTab === 'cda' ? (
          <ConstitutionalDeliberationAssistantPanel
            langEn={en}
            category={matter.category}
            report={cdaReport}
            loading={cdaLoading}
            generating={cdaGenerating}
            canRequestAnalysis={canCouncil}
            onRequestAnalysis={onRequestCdaAnalysis}
            embedded
          />
        ) : null}

        {activeTab === 'timeline' ? (
          <GovernanceMatterTimelineTab
            en={en}
            matter={matter}
            propertyId={propertyId}
            canCouncil={canCouncil}
            revisions={revisions}
            comments={comments}
            cdaReport={cdaReport}
            linkedResolution={linkedResolution}
          />
        ) : null}
      </div>
    </div>
  );
}

function DetailsTab({
  en,
  matter,
  canCouncil,
  editTitle,
  editDescription,
  editStatus,
  onEditTitleChange,
  onEditDescriptionChange,
  onEditStatusChange,
  onCouncilSave,
  submitting,
  compactLayout = false,
}: {
  en: boolean;
  matter: GovernanceMatterRow;
  canCouncil: boolean;
  editTitle: string;
  editDescription: string;
  editStatus: GovernanceMatterRow['status'];
  onEditTitleChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onEditStatusChange: (value: GovernanceMatterRow['status']) => void;
  onCouncilSave: () => void;
  submitting: boolean;
  compactLayout?: boolean;
}) {
  if (compactLayout) {
    return (
      <div className="space-y-3">
        {matter.description ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">{matter.description}</p>
        ) : (
          <p className="text-sm text-gray-500">{en ? 'No description.' : '暂无说明。'}</p>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-gray-700">
            {en ? 'Constitutional basis' : '宪章依据'}
          </summary>
          <ul className="mt-2 space-y-1 pl-1 text-sm text-gray-600">
            {constitutionalBasisForCategory(matter.category).map((ref, i) => (
              <li key={i}>{formatConstitutionalPrinciple(ref, en)}</li>
            ))}
          </ul>
        </details>

        {canCouncil ? (
          <details className="group border-t border-gray-100 pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 marker:content-none">
              <div>
                <p className="text-sm font-bold text-gray-900">{en ? 'Council Revision' : '业委会修订'}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {en
                    ? 'Revisions are permanently recorded.'
                    : '修订会永久记录，不会覆盖历史。'}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-clearstrata-brand-900">
                {en ? 'Expand' : '展开'}
              </span>
            </summary>
            <div className="mt-3 space-y-3">
              <input
                value={editTitle}
                onChange={(e) => onEditTitleChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <textarea
                value={editDescription}
                onChange={(e) => onEditDescriptionChange(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={editStatus}
                onChange={(e) => onEditStatusChange(e.target.value as GovernanceMatterRow['status'])}
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
                onClick={onCouncilSave}
                className="rounded-lg border border-clearstrata-ui-softBorder bg-white px-4 py-2 text-sm font-semibold text-clearstrata-brand-900 hover:bg-clearstrata-brand-50 disabled:opacity-60"
              >
                {en ? 'Save revision' : '保存修订'}
              </button>
            </div>
          </details>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {en ? 'Matter summary' : '事项摘要'}
        </p>
        <p className="mt-1 text-sm font-semibold text-gray-900">
          {governanceMatterCategoryLabel(matter.category, en)} · {governanceMatterStatusLabel(matter.status, en)}
        </p>
      </section>

      <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-indigo-900">
          {en ? 'Constitutional Basis' : '宪章依据'}
        </p>
        <ul className="mt-2 space-y-1">
          {constitutionalBasisForCategory(matter.category).map((ref, i) => (
            <li key={i} className="text-sm text-gray-800">
              {formatConstitutionalPrinciple(ref, en)}
            </li>
          ))}
        </ul>
      </section>

      {canCouncil ? (
        <details className="group rounded-xl border border-amber-200 bg-amber-50/40">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 marker:content-none">
            <div>
              <p className="text-sm font-bold text-gray-900">{en ? 'Council Revision' : '业委会修订'}</p>
              <p className="mt-0.5 text-xs text-amber-900/80">
                {en
                  ? 'Revisions are append-only. Nothing is overwritten.'
                  : '修订会永久记录，不会覆盖历史。'}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-amber-900 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="space-y-3 border-t border-amber-100 px-4 py-4">
            <input
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              value={editDescription}
              onChange={(e) => onEditDescriptionChange(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={editStatus}
              onChange={(e) => onEditStatusChange(e.target.value as GovernanceMatterRow['status'])}
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
              onClick={onCouncilSave}
              className="rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-60"
            >
              {en ? 'Save revision' : '保存修订'}
            </button>
          </div>
        </details>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-gray-700">{matter.description ?? (en ? 'No description.' : '暂无说明。')}</p>
      )}
    </div>
  );
}

function DiscussionTab({
  en,
  matter,
  comments,
  commentBody,
  onCommentBodyChange,
  onPostComment,
  submitting,
  showCouncilRevision = false,
  editTitle = '',
  editDescription = '',
  editStatus = 'discussion',
  onEditTitleChange,
  onEditDescriptionChange,
  onEditStatusChange,
  onCouncilSave,
}: {
  en: boolean;
  matter?: GovernanceMatterRow;
  comments: GovernanceMatterCommentRow[];
  commentBody: string;
  onCommentBodyChange: (value: string) => void;
  onPostComment: () => void;
  submitting: boolean;
  showCouncilRevision?: boolean;
  editTitle?: string;
  editDescription?: string;
  editStatus?: GovernanceMatterRow['status'];
  onEditTitleChange?: (value: string) => void;
  onEditDescriptionChange?: (value: string) => void;
  onEditStatusChange?: (value: GovernanceMatterRow['status']) => void;
  onCouncilSave?: () => void;
}) {
  return (
    <div className="space-y-4">
      {matter ? (
        <>
          <section className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {en ? 'Matter summary' : '事项摘要'}
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {governanceMatterCategoryLabel(matter.category, en)} · {governanceMatterStatusLabel(matter.status, en)}
            </p>
            {matter.description ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{matter.description}</p>
            ) : null}
          </section>
          <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-900">
              {en ? 'Constitutional Basis' : '宪章依据'}
            </p>
            <ul className="mt-2 space-y-1">
              {constitutionalBasisForCategory(matter.category).map((ref, i) => (
                <li key={i} className="text-sm text-gray-800">
                  {formatConstitutionalPrinciple(ref, en)}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
      <section>
        <h2 className="text-sm font-bold text-gray-900">{en ? 'Owner comments' : '业主评论'}</h2>
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
            onChange={(e) => onCommentBodyChange(e.target.value)}
            rows={3}
            placeholder={en ? 'Participate in discussion…' : '参与讨论…'}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={submitting || !commentBody.trim()}
            onClick={onPostComment}
            className="shrink-0 rounded-lg border border-clearstrata-ui-softBorder bg-white px-4 py-2 text-sm font-semibold text-clearstrata-brand-900 hover:bg-clearstrata-brand-50 disabled:opacity-60"
          >
            {en ? 'Post comment' : '发表评论'}
          </button>
        </div>
      </section>

      {showCouncilRevision && onEditTitleChange && onCouncilSave ? (
        <details className="group rounded-xl border border-amber-200 bg-amber-50/40">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 marker:content-none">
            <div>
              <p className="text-sm font-bold text-gray-900">{en ? 'Council Revision' : '业委会修订'}</p>
              <p className="mt-0.5 text-xs text-amber-900/80">
                {en
                  ? 'Revisions are append-only. Nothing is overwritten.'
                  : '修订会永久记录，不会覆盖历史。'}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-amber-900 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="space-y-3 border-t border-amber-100 px-4 py-4">
            <input
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <textarea
              value={editDescription}
              onChange={(e) => onEditDescriptionChange?.(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={editStatus}
              onChange={(e) => onEditStatusChange?.(e.target.value as GovernanceMatterRow['status'])}
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
              onClick={onCouncilSave}
              className="rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-60"
            >
              {en ? 'Save revision' : '保存修订'}
            </button>
          </div>
        </details>
      ) : null}
    </div>
  );
}

function ResolutionTab({
  en,
  matter,
  propertyId,
  canCouncil,
  linkedResolution,
  resolutionStatus,
  constitutionalBasis,
  onCreateResolution,
  resolutionSubmitting,
}: {
  en: boolean;
  matter: GovernanceMatterRow;
  propertyId: string;
  canCouncil: boolean;
  linkedResolution: CommunityResolutionRow | null;
  resolutionStatus: ReturnType<typeof resolutionWorkflowStatus>;
  constitutionalBasis: ReturnType<typeof constitutionalBasisForCategory>;
  onCreateResolution: () => void;
  resolutionSubmitting: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{en ? 'Community Resolution' : '社区决议'}</h2>
            <p className="mt-1 text-xs text-emerald-900/90">
              {en
                ? 'Draft, non-binding until meeting and vote.'
                : '决议草案在会议与投票前不具备最终效力。'}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE_CLASS[resolutionStatus.tone]}`}
          >
            {resolutionStatus.label}
          </span>
        </div>

        {linkedResolution ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-gray-900">{linkedResolution.title}</p>
            {linkedResolution.executive_summary ? (
              <p className="whitespace-pre-wrap text-sm text-gray-700">{linkedResolution.executive_summary}</p>
            ) : null}
            <p className="text-xs text-gray-600">
              {en ? 'Council review: ' : '业委会审议：'}
              {communityResolutionCouncilStatusLabel(linkedResolution.council_review_status, en)}
            </p>
            <Link
              to={communityResolutionDetailUrl(linkedResolution.id, propertyId)}
              className="inline-block text-sm font-semibold text-clearstrata-brand-900 hover:underline"
            >
              {en ? 'View resolution →' : '查看决议 →'}
            </Link>
            {linkedResolution.meeting_id ? (
              <Link
                to={`/meetings/${encodeURIComponent(linkedResolution.meeting_id)}`}
                className="block text-sm font-semibold text-clearstrata-brand-900 hover:underline"
              >
                {en ? 'Linked meeting →' : '关联会议 →'}
              </Link>
            ) : null}
          </div>
        ) : canCouncil ? (
          <div className="mt-4">
            <p className="text-sm text-gray-700">
              {en
                ? 'Prepare a Community Resolution from this matter before scheduling a meeting.'
                : '排会前，请基于本事项准备社区决议。'}
            </p>
            <button
              type="button"
              disabled={resolutionSubmitting}
              onClick={onCreateResolution}
              className="mt-3 rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-60"
            >
              {en ? 'Prepare Resolution' : '准备决议'}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">{en ? 'No resolution prepared yet.' : '尚未准备决议。'}</p>
        )}
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
          {en ? 'Origin & constitutional basis' : '来源与宪章依据'}
        </p>
        <dl className="mt-2 space-y-2 text-sm text-gray-800">
          <div>
            <dt className="font-semibold text-gray-900">{en ? 'Origin matter' : '来源事项'}</dt>
            <dd className="mt-0.5">{matter.title}</dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-900">{en ? 'Constitutional basis' : '宪章依据'}</dt>
            <dd className="mt-1">
              <ul className="space-y-1">
                {constitutionalBasis.map((ref, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    {formatConstitutionalPrinciple(ref, en)}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
