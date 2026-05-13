import { useMemo, useState } from 'react';
import { FileText, X } from 'lucide-react';
import {
  MEETING_VOTE_ARCHIVE_GUIDE_ZH,
  MEETING_VOTE_ARCHIVE_SUPPORTING_DOCUMENTS,
  MEETING_VOTE_ARCHIVE_FORMAL_NOTICE,
} from '@/components/meetings/meetingVoteArchiveConstants';
import type { MeetingSupportingDocumentRow } from '@/features/meetings/meetingDocumentsRead';
import { meetingTitleZhFirst, type MeetingRow, type OwnerVoteMeetingLite } from '@/features/meetings/api';
import { labelFormat, labelMeetingType, meetingUiStrings } from '@/features/meetings/labels';
import {
  councilMeetingVotingWindowFallback,
  councilWrittenRemoteWindows,
  stripWrittenRemoteMeta,
} from '@/features/meetings/meetingFormatModel';
import { deriveCouncilElectionCanonFromScheduledAt } from '@/features/meetings/electionTimelineMath';

type Props = {
  languageEn: boolean;
  meeting: MeetingRow;
  /** Same source as OwnerVotingInlineControlBar voting display when OV row exists */
  ownerVoteMeeting?: OwnerVoteMeetingLite | null;
  resolutionAgendaCount: number;
  electionAgendaCount: number;
  /** Rows from `meeting_documents` (MeetingDocumentsSection query); parent loads once per meeting */
  supportingDocuments: MeetingSupportingDocumentRow[];
};

function fmtArchiveTs(iso: string | null | undefined, languageEn: boolean): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(languageEn ? 'en-CA' : 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
}

function docDisplayTitle(row: MeetingSupportingDocumentRow, languageEn: boolean): string {
  const zh = row.title_zh?.trim();
  const e = row.title_en?.trim();
  if (languageEn) return e || zh || '—';
  return zh || e || '—';
}

function displayFileKind(row: MeetingSupportingDocumentRow, languageEn: boolean): string {
  const mime = (row.mime_type ?? '').toLowerCase();
  const url = (row.document_url ?? '').split('?')[0] ?? '';
  const extMatch = /\.([a-zA-Z0-9]+)$/i.exec(url);
  const ext = (extMatch?.[1] ?? '').toLowerCase();
  if (mime.includes('pdf') || ext === 'pdf') return 'PDF';
  if (
    mime.includes('wordprocessingml') ||
    mime.includes('msword') ||
    ext === 'doc' ||
    ext === 'docx'
  ) {
    return languageEn ? 'Word (DOC/DOCX)' : 'Word（DOC/DOCX）';
  }
  if (
    mime.includes('spreadsheetml') ||
    mime.includes('excel') ||
    mime.includes('csv') ||
    ext === 'xls' ||
    ext === 'xlsx' ||
    ext === 'csv'
  ) {
    return languageEn ? 'Excel (XLS/XLSX)' : 'Excel（XLS/XLSX）';
  }
  if (ext) return ext.toUpperCase();
  if (mime) return mime.split('/').pop()?.slice(0, 24).toUpperCase() ?? '';
  return languageEn ? 'File' : '文件';
}

export function MeetingVoteArchiveCard({
  languageEn,
  meeting,
  ownerVoteMeeting = null,
  resolutionAgendaCount,
  electionAgendaCount,
  supportingDocuments,
}: Props) {
  const en = languageEn;
  /** Collapsed by default — list + 使用说明仅在展开后出现。 */
  const [expanded, setExpanded] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const g = MEETING_VOTE_ARCHIVE_GUIDE_ZH;
  const fc = MEETING_VOTE_ARCHIVE_FORMAL_NOTICE;
  const sup = MEETING_VOTE_ARCHIVE_SUPPORTING_DOCUMENTS;
  const supCopy = en ? sup.en : sup.zh;
  const c = en ? fc.en : fc.zh;
  const docCount = supportingDocuments.length;
  const hasSupportingAttachments = docCount > 0;

  const noticePayload = useMemo(() => {
    const disc = councilWrittenRemoteWindows(meeting);
    const dO = disc.publicNoticeOpens?.trim() ? disc.publicNoticeOpens : '';
    const dC = disc.publicNoticeCloses?.trim() ? disc.publicNoticeCloses : '';
    let noticeOpenIso: string | null = dO || null;
    let noticeCloseIso: string | null = dC || null;
    if (!dO && !dC && meeting.scheduled_at?.trim()) {
      const canon = deriveCouncilElectionCanonFromScheduledAt(meeting.scheduled_at);
      if (canon) {
        noticeOpenIso = canon.publicNoticeOpenIso;
        noticeCloseIso = canon.publicNoticeCloseIso;
      }
    }
    const fb = councilMeetingVotingWindowFallback(meeting);
    const vOpenDisp = ownerVoteMeeting?.voting_opens_at?.trim()
      ? ownerVoteMeeting.voting_opens_at
      : fb.votingOpens ?? null;
    const vCloseDisp = ownerVoteMeeting?.voting_closes_at?.trim()
      ? ownerVoteMeeting.voting_closes_at
      : fb.votingCloses ?? null;

    const notSet = en ? fc.notSet.en : fc.notSet.zh;
    const orNotSet = (s: string | null | undefined) => (s?.trim() ? s.trim() : notSet);

    const title =
      meetingTitleZhFirst(meeting)?.trim() ||
      (en ? meetingUiStrings.untitled.en : meetingUiStrings.untitled.zh);
    const typeLabel = orNotSet(labelMeetingType(meeting.meeting_type, en));
    const formatLabel = orNotSet(
      labelFormat(meeting.meeting_format, en, { descriptionZh: meeting.description_zh }),
    );
    const dateStr =
      fmtArchiveTs(meeting.scheduled_at, en) ??
      notSet;
    const noticeFmt = (iso: string | null) =>
      iso ? fmtArchiveTs(iso, en) ?? notSet : notSet;
    const noticeSpan =
      !noticeOpenIso && !noticeCloseIso
        ? notSet
        : `${noticeFmt(noticeOpenIso)} · ${noticeFmt(noticeCloseIso)}`;
    const voteSpan =
      !vOpenDisp && !vCloseDisp
        ? notSet
        : `${noticeFmt(vOpenDisp)} · ${noticeFmt(vCloseDisp)}`;

    const descZh = meeting.description_zh ? stripWrittenRemoteMeta(meeting.description_zh) : '';
    const descCombined = `${descZh}`.trim() || meeting.description_en?.trim() || '';

    const descDisplay = descCombined ? descCombined : notSet;

    return {
      title,
      typeLabel,
      formatLabel,
      dateStr,
      noticeSpan,
      voteSpan,
      descDisplay,
    };
  }, [meeting, ownerVoteMeeting, en]);

  return (
    <>
      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <FileText className="size-4 shrink-0 text-slate-600" aria-hidden />
            <h3 className="text-base font-semibold text-gray-900">{en ? 'Meeting archive' : '会议档案'}</h3>
            <span className="rounded bg-slate-200/90 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700">
              {en ? 'Fixed folders' : '固定目录'}
            </span>
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
          >
            {expanded ? (en ? 'Collapse' : '收起') : en ? 'Expand' : '展开'}
          </button>
        </div>

        {expanded ? (
          <ul className="mt-3 space-y-2 border-t border-slate-200/80 pt-3">
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200/70 bg-white/90 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-xs font-semibold text-emerald-800">00</span>
                <span className="font-medium text-gray-900">{en ? 'Guide' : '使用说明'}</span>
                <span className="shrink-0 rounded border border-emerald-300 bg-emerald-50 px-1.5 py-px text-[10px] font-semibold uppercase text-emerald-900">
                  {en ? 'Read-only' : '只读'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="shrink-0 rounded-lg border border-emerald-600 bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                {en ? 'View' : '查看'}
              </button>
            </li>

            <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-200/80 bg-white px-3 py-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-sky-900">{fc.row01.id}</span>
                <span className="font-medium text-gray-900">{en ? fc.row01.en : fc.row01.zh}</span>
                <span className="shrink-0 rounded border border-sky-300 bg-sky-50 px-1.5 py-px text-[10px] font-semibold text-sky-950">
                  {en ? fc.status.en : fc.status.zh}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setNoticeOpen(true)}
                className="shrink-0 rounded-lg border border-sky-600 bg-sky-700 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-800"
              >
                {en ? 'View' : '查看'}
              </button>
            </li>

            <li
              className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 ${
                hasSupportingAttachments
                  ? 'border-violet-200/80 bg-white'
                  : 'border-gray-100 bg-white/80 text-gray-500'
              }`}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span
                  className={`font-mono text-xs font-semibold ${
                    hasSupportingAttachments ? 'text-violet-900' : 'text-gray-500'
                  }`}
                >
                  {sup.row02.id}
                </span>
                <span className={`font-medium ${hasSupportingAttachments ? 'text-gray-900' : 'text-gray-700'}`}>
                  {en ? sup.row02.en : sup.row02.zh}
                </span>
                <span
                  className={`shrink-0 text-[10px] font-semibold ${
                    hasSupportingAttachments
                      ? 'rounded border border-violet-300 bg-violet-50 px-1.5 py-px text-violet-950'
                      : 'text-xs text-gray-500'
                  }`}
                >
                  {hasSupportingAttachments
                    ? sup.attached(docCount, !en)
                    : en
                      ? sup.emptyStatus.en
                      : sup.emptyStatus.zh}
                </span>
              </div>
              {hasSupportingAttachments ? (
                <button
                  type="button"
                  onClick={() => setDocsOpen(true)}
                  className="shrink-0 rounded-lg border border-violet-600 bg-violet-700 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-800"
                >
                  {en ? 'View' : '查看'}
                </button>
              ) : null}
            </li>

            {fc.placeholderRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-100 bg-white/80 px-3 py-2 text-gray-500"
              >
                <span className="font-medium text-gray-700">
                  <span className="mr-2 font-mono text-xs">{row.id}</span>
                  {en ? row.en : row.zh}
                </span>
                <span className="text-xs">{en ? 'Pending · No file yet' : '待生成 · 暂无文件'}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {guideOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="meeting-vote-archive-guide-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setGuideOpen(false);
          }}
        >
          <div
            className="max-h-[min(92vh,720px)] w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
            onMouseDown={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
              <div className="min-w-0">
                <h2 id="meeting-vote-archive-guide-title" className="text-base font-semibold text-gray-900">
                  {g.title}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">{g.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="shrink-0 rounded-lg p-1 text-gray-500 hover:bg-gray-200/80 hover:text-gray-800"
                aria-label={en ? 'Close' : '关闭'}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[min(78vh,600px)] space-y-4 overflow-y-auto px-4 py-4 text-sm leading-relaxed text-gray-800">
              {en ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  Reference text below is maintained in Chinese (counsel-draft). UI labels follow your language
                  setting.
                </p>
              ) : null}

              <p>{g.intro}</p>
              <p className="font-medium">{g.platformSupportsLabel}</p>
              <ul className="list-disc space-y-1 pl-5">
                {g.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>

              <h3 className="text-[13px] font-semibold text-gray-900">{g.governanceTitle}</h3>
              {g.principles.map((p) => (
                <div key={p.num}>
                  <p className="font-medium text-gray-900">
                    {p.num}. {p.heading}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap pl-3 text-gray-800">{p.body}</p>
                </div>
              ))}

              <h3 className="text-[13px] font-semibold text-gray-900">{g.flowTitle}</h3>
              <ol className="list-decimal space-y-1 pl-5">
                {g.flowSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              <h3 className="text-[13px] font-semibold text-gray-900">{g.dirTitle}</h3>
              <ul className="space-y-0.5 font-mono text-xs text-gray-800">
                {g.dirLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              <h3 className="text-[13px] font-semibold text-gray-900">{g.pledgeTitle}</h3>
              <ul className="space-y-1">
                {g.pledges.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200/60"
              >
                {en ? 'Close' : '关闭'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {noticeOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="meeting-vote-archive-formal-notice-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setNoticeOpen(false);
          }}
        >
          <div
            className="max-h-[min(92vh,720px)] w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
            onMouseDown={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
              <h2 id="meeting-vote-archive-formal-notice-title" className="text-base font-semibold text-gray-900">
                {c.modalTitle}
              </h2>
              <button
                type="button"
                onClick={() => setNoticeOpen(false)}
                className="shrink-0 rounded-lg p-1 text-gray-500 hover:bg-gray-200/80 hover:text-gray-800"
                aria-label={en ? 'Close' : '关闭'}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[min(78vh,600px)] space-y-3 overflow-y-auto px-4 py-4 text-sm leading-relaxed text-gray-800">
              <p className="text-center text-base font-semibold text-gray-900">{c.docTitle}</p>
              <p>{c.intro}</p>
              <p>
                <span className="font-medium text-gray-900">{c.meetingName}</span>
                <br />
                <span className="whitespace-pre-wrap">{noticePayload.title}</span>
              </p>
              <p>
                <span className="font-medium text-gray-900">{c.meetingType}</span>
                <br />
                {noticePayload.typeLabel}
              </p>
              <p>
                <span className="font-medium text-gray-900">{c.meetingFormat}</span>
                <br />
                {noticePayload.formatLabel}
              </p>
              <p>
                <span className="font-medium text-gray-900">{c.meetingDate}</span>
                <br />
                {noticePayload.dateStr}
              </p>
              <p>
                <span className="font-medium text-gray-900">{c.publicNotice}</span>
                <br />
                {noticePayload.noticeSpan}
              </p>
              <p>
                <span className="font-medium text-gray-900">{c.votingPeriod}</span>
                <br />
                {noticePayload.voteSpan}
              </p>
              <p>
                <span className="font-medium text-gray-900">{c.description}</span>
                <br />
                <span className="whitespace-pre-wrap">{noticePayload.descDisplay}</span>
              </p>
              <p>
                <span className="font-medium text-gray-900">{c.topics}</span>
                <br />
                {c.resolutionCount}：{resolutionAgendaCount}
                <br />
                {c.electionCount}：{electionAgendaCount}
              </p>
              <p className="pt-2 border-t border-gray-100">
                <span className="font-medium text-gray-900">{c.participation}</span>
                <br />
                {c.participationBody}
              </p>
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {en
                  ? 'This is an automatically generated draft for reference only.'
                  : '本文为系统自动生成的草案，仅供参考。'}
              </p>
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
              <button
                type="button"
                onClick={() => setNoticeOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200/60"
              >
                {en ? 'Close' : '关闭'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {docsOpen && hasSupportingAttachments ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="meeting-vote-archive-supporting-docs-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDocsOpen(false);
          }}
        >
          <div
            className="max-h-[min(92vh,720px)] w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
            onMouseDown={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
              <h2 id="meeting-vote-archive-supporting-docs-title" className="text-base font-semibold text-gray-900">
                {supCopy.modalTitle}
              </h2>
              <button
                type="button"
                onClick={() => setDocsOpen(false)}
                className="shrink-0 rounded-lg p-1 text-gray-500 hover:bg-gray-200/80 hover:text-gray-800"
                aria-label={en ? 'Close' : '关闭'}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[min(78vh,600px)] space-y-3 overflow-y-auto px-4 py-4 text-sm leading-relaxed text-gray-800">
              <p className="font-medium text-gray-900">{supCopy.listHeading}</p>
              <ul className="mt-2 space-y-3">
                {supportingDocuments.map((row) => {
                  const name = docDisplayTitle(row, en);
                  const kind = displayFileKind(row, en);
                  const urlOk = !!(row.document_url?.trim());
                  return (
                    <li key={row.id} className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2 gap-y-2">
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-medium text-gray-900">{name}</p>
                          <p className="mt-1 text-xs text-gray-600">
                            {supCopy.colType}：<span className="font-semibold text-gray-800">{kind}</span>
                          </p>
                        </div>
                        <div className="shrink-0">
                          {urlOk ? (
                            <a
                              href={row.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-violet-700 hover:underline"
                            >
                              {supCopy.openLink}
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
              <button
                type="button"
                onClick={() => setDocsOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200/60"
              >
                {en ? 'Close' : '关闭'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
