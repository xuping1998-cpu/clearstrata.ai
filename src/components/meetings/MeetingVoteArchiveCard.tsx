import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, X } from 'lucide-react';
import {
  MEETING_VOTE_ARCHIVE_GUIDE_ZH,
  MEETING_VOTE_ARCHIVE_SUPPORTING_DOCUMENTS,
  MEETING_VOTE_ARCHIVE_FORMAL_NOTICE,
  MEETING_VOTE_ARCHIVE_CARD_CLASSIFICATION_NOTE,
} from '@/components/meetings/meetingVoteArchiveConstants';
import {
  decodeDataTextUrl,
  fetchMeetingArchiveDocuments,
  filterSupportingDocumentsOnly,
  formatArchiveSnapshotViewerBody,
  type MeetingArchiveDocumentRow,
  type MeetingSupportingDocumentRow,
} from '@/features/meetings/meetingDocumentsRead';
import { meetingTitleZhFirst, type MeetingRow, type OwnerVoteMeetingLite } from '@/features/meetings/api';
import { labelMeetingFormatUiDisplay, labelMeetingType, meetingUiStrings } from '@/features/meetings/labels';
import {
  councilMeetingVotingWindowFallback,
  councilWrittenRemoteWindows,
  stripWrittenRemoteMeta,
} from '@/features/meetings/meetingFormatModel';
import { isStrictAgmOrSgmMeeting } from '@/features/meetings/electionAgendaModel';
import { deriveAgmSgmCanonDisplayWindows, deriveCouncilElectionCanonFromScheduledAt } from '@/features/meetings/electionTimelineMath';
import { MeetingDocumentsSection } from '@/pages/meeting/MeetingDocumentsSection';
import { supabase } from '@/lib/supabase';

type ArchiveSlotId = '03' | '04' | '05' | '06';

type ArchiveSlotLanguage = 'en' | 'zh';

type MinutesDraftPayload = {
  ok?: boolean;
  error?: string;
  finalized?: boolean;
  has_draft?: boolean;
  body?: string;
  is_template?: boolean;
  document_id?: string;
};

function getArchiveSlotDisplayTitle(slot: ArchiveSlotId, language: ArchiveSlotLanguage): string {
  switch (slot) {
    case '03':
      return language === 'en' ? '03 Discussion Record' : '03 讨论记录';
    case '04':
      return language === 'en' ? '04 Voting Record' : '04 投票记录';
    case '05':
      return language === 'en' ? '05 Resolution Results' : '05 决议结果';
    case '06':
      return language === 'en' ? '06 Meeting Minutes' : '06 会议纪要';
  }
}

type GenerateFeedback = { kind: 'success' | 'error'; text: string } | null;

type SnapshotViewer = {
  title: string;
  body: string;
} | null;

type Props = {
  languageEn: boolean;
  meeting: MeetingRow;
  /** Council / staff managing meetings — toggles upload + delete inside 02 Supporting documents modal */
  canManageDocuments: boolean;
  /** Meeting id string for `meeting_documents` lookups */
  meetingId: string;
  /** Refresh parent-derived row count after upload/delete in embedded documents UI */
  onSupportingDocumentsChanged: () => void;
  /** Formal notice 01: AGM/SGM voting dates follow canon(scheduled_at); other types may use OV row + fallback */
  ownerVoteMeeting?: OwnerVoteMeetingLite | null;
  resolutionAgendaCount: number;
  electionAgendaCount: number;
  /** Rows from `meeting_documents` (parent lightweight count for 02 badge) */
  supportingDocuments: MeetingSupportingDocumentRow[];
};

function fmtArchiveTs(iso: string | null | undefined, languageEn: boolean): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(languageEn ? 'en-CA' : 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function MeetingVoteArchiveCard({
  languageEn,
  meeting,
  canManageDocuments,
  meetingId,
  onSupportingDocumentsChanged,
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
  const [archiveDocs, setArchiveDocs] = useState<MeetingArchiveDocumentRow[]>([]);
  const [generateBusy, setGenerateBusy] = useState(false);
  const [generateFeedback, setGenerateFeedback] = useState<GenerateFeedback>(null);
  const [snapshotViewer, setSnapshotViewer] = useState<SnapshotViewer>(null);
  const [minutesHasDraft, setMinutesHasDraft] = useState(false);
  const [minutesEditorOpen, setMinutesEditorOpen] = useState(false);
  const [minutesBody, setMinutesBody] = useState('');
  const [minutesLoadBusy, setMinutesLoadBusy] = useState(false);
  const [minutesSaveBusy, setMinutesSaveBusy] = useState(false);
  const [minutesFinalizeBusy, setMinutesFinalizeBusy] = useState(false);
  const [minutesError, setMinutesError] = useState<string | null>(null);
  const g = MEETING_VOTE_ARCHIVE_GUIDE_ZH;
  const fc = MEETING_VOTE_ARCHIVE_FORMAL_NOTICE;
  const sup = MEETING_VOTE_ARCHIVE_SUPPORTING_DOCUMENTS;
  const supCopy = en ? sup.en : sup.zh;
  const c = en ? fc.en : fc.zh;

  const loadArchiveDocs = useCallback(async () => {
    const pid = meeting.property_id?.trim();
    const mid = meeting.id?.trim();
    if (!pid || !mid) {
      setArchiveDocs([]);
      return;
    }
    const { rows, error } = await fetchMeetingArchiveDocuments(pid, mid);
    if (error) {
      console.error('[MeetingVoteArchiveCard] load archive documents', error);
      return;
    }
    setArchiveDocs(rows);
  }, [meeting.id, meeting.property_id]);

  useEffect(() => {
    void loadArchiveDocs();
  }, [loadArchiveDocs]);

  const generated03 = useMemo(
    () => archiveDocs.find((d) => d.title_en?.startsWith('03 ')),
    [archiveDocs],
  );
  const generated04 = useMemo(
    () => archiveDocs.find((d) => d.title_en?.startsWith('04 ')),
    [archiveDocs],
  );
  const generated05 = useMemo(
    () => archiveDocs.find((d) => d.title_en?.startsWith('05 ')),
    [archiveDocs],
  );
  const generated06 = useMemo(
    () => archiveDocs.find((d) => d.title_en?.startsWith('06 ') || d.title_en === '06 Meeting Minutes'),
    [archiveDocs],
  );
  const minutesFinalized = !!generated06;

  const loadMinutesDraftMeta = useCallback(async () => {
    if (!canManageDocuments || !meeting.id?.trim() || minutesFinalized) {
      setMinutesHasDraft(false);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_meeting_minutes_draft', {
        p_meeting_id: meeting.id,
      });
      if (error) throw error;
      const payload = data as MinutesDraftPayload | null;
      if (payload?.ok === false) return;
      setMinutesHasDraft(!!payload?.has_draft);
    } catch (e) {
      console.error('[MeetingVoteArchiveCard] get_meeting_minutes_draft (meta)', e);
    }
  }, [canManageDocuments, meeting.id, minutesFinalized]);

  useEffect(() => {
    if (expanded) void loadMinutesDraftMeta();
  }, [expanded, loadMinutesDraftMeta]);

  const supportingOnly = useMemo(() => {
    if (archiveDocs.length > 0) {
      return filterSupportingDocumentsOnly(archiveDocs);
    }
    return filterSupportingDocumentsOnly(supportingDocuments);
  }, [archiveDocs, supportingDocuments]);

  const docCount = supportingOnly.length;
  const hasSupportingAttachments = docCount > 0;
  const showSupportingDocsAction = hasSupportingAttachments || canManageDocuments;
  const supportingDocsActionLabel = canManageDocuments ? (en ? 'Manage' : '管理') : en ? 'View' : '查看';

  const noticePayload = useMemo(() => {
    const agmSgmStrict = isStrictAgmOrSgmMeeting(meeting);
    const disp = agmSgmStrict
      ? deriveAgmSgmCanonDisplayWindows(meeting.scheduled_at, electionAgendaCount > 0)
      : null;

    let noticeOpenIso: string | null = null;
    let noticeCloseIso: string | null = null;
    let vOpenDisp: string | null = null;
    let vCloseDisp: string | null = null;

    if (agmSgmStrict) {
      if (disp) {
        noticeOpenIso = disp.publicNoticeOpenIso;
        noticeCloseIso = disp.publicNoticeCloseIso;
        vOpenDisp = disp.votingOpenIso;
        vCloseDisp = disp.votingCloseIso;
      }
    } else {
      const disc = councilWrittenRemoteWindows(meeting);
      const dO = disc.publicNoticeOpens?.trim() ? disc.publicNoticeOpens : '';
      const dC = disc.publicNoticeCloses?.trim() ? disc.publicNoticeCloses : '';
      noticeOpenIso = dO || null;
      noticeCloseIso = dC || null;
      if (!dO && !dC && meeting.scheduled_at?.trim()) {
        const canon = deriveCouncilElectionCanonFromScheduledAt(meeting.scheduled_at);
        if (canon) {
          noticeOpenIso = canon.publicNoticeOpenIso;
          noticeCloseIso = canon.publicNoticeCloseIso;
        }
      }
      const fb = councilMeetingVotingWindowFallback(meeting);
      vOpenDisp = ownerVoteMeeting?.voting_opens_at?.trim()
        ? ownerVoteMeeting.voting_opens_at
        : fb.votingOpens ?? null;
      vCloseDisp = ownerVoteMeeting?.voting_closes_at?.trim()
        ? ownerVoteMeeting.voting_closes_at
        : fb.votingCloses ?? null;
    }

    const notSet = en ? fc.notSet.en : fc.notSet.zh;
    const orNotSet = (s: string | null | undefined) => (s?.trim() ? s.trim() : notSet);

    const title =
      meetingTitleZhFirst(meeting)?.trim() ||
      (en ? meetingUiStrings.untitled.en : meetingUiStrings.untitled.zh);
    const typeLabel = orNotSet(labelMeetingType(meeting.meeting_type, en));
    const fd = labelMeetingFormatUiDisplay(meeting, en);
    const formatCore = fd.secondary ? `${fd.primary}\n${fd.secondary}` : fd.primary;
    const formatLabel = orNotSet(formatCore);
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
  }, [meeting, ownerVoteMeeting, en, electionAgendaCount]);

  async function handleGenerateArchive() {
    if (!meeting.id?.trim() || generateBusy) return;
    setGenerateFeedback(null);
    setGenerateBusy(true);
    try {
      const { data, error } = await supabase.rpc('generate_meeting_archive_snapshots', {
        p_meeting_id: meeting.id,
      });
      if (error) throw error;
      const payload = data as { ok?: boolean; error?: string } | null;
      if (payload && payload.ok === false) {
        console.error('[MeetingVoteArchiveCard] generate_meeting_archive_snapshots', payload.error);
        setGenerateFeedback({
          kind: 'error',
          text: en ? 'Failed to generate archive. Please try again.' : '生成失败，请稍后重试。',
        });
        return;
      }
      setGenerateFeedback({
        kind: 'success',
        text: en ? 'Meeting archive generated.' : '会议档案已生成。',
      });
      await loadArchiveDocs();
      onSupportingDocumentsChanged();
    } catch (e) {
      console.error('[MeetingVoteArchiveCard] generate_meeting_archive_snapshots', e);
      setGenerateFeedback({
        kind: 'error',
        text: en ? 'Failed to generate archive. Please try again.' : '生成失败，请稍后重试。',
      });
    } finally {
      setGenerateBusy(false);
    }
  }

  function openArchiveTextDocument(slot: ArchiveSlotId, doc: MeetingArchiveDocumentRow) {
    const url = doc.document_url?.trim() ?? '';
    const title = getArchiveSlotDisplayTitle(slot, en ? 'en' : 'zh');
    if (url.startsWith('data:text/plain')) {
      const raw = decodeDataTextUrl(url);
      setSnapshotViewer({ title, body: formatArchiveSnapshotViewerBody(raw, en) });
      return;
    }
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  function openGeneratedSnapshot(slot: '03' | '04' | '05', doc: MeetingArchiveDocumentRow) {
    openArchiveTextDocument(slot, doc);
  }

  async function openMinutesEditor() {
    if (!meeting.id?.trim() || minutesFinalized) return;
    setMinutesError(null);
    setMinutesEditorOpen(true);
    setMinutesLoadBusy(true);
    try {
      const { data, error } = await supabase.rpc('get_meeting_minutes_draft', {
        p_meeting_id: meeting.id,
      });
      if (error) throw error;
      const payload = data as MinutesDraftPayload | null;
      if (payload?.ok === false) {
        setMinutesError(
          en ? 'Unable to load minutes draft.' : '无法加载会议纪要草稿。',
        );
        return;
      }
      if (payload?.finalized) {
        setMinutesEditorOpen(false);
        await loadArchiveDocs();
        return;
      }
      setMinutesBody(typeof payload?.body === 'string' ? payload.body : '');
      setMinutesHasDraft(!!payload?.has_draft && !payload?.is_template);
    } catch (e) {
      console.error('[MeetingVoteArchiveCard] get_meeting_minutes_draft', e);
      setMinutesError(en ? 'Unable to load minutes draft.' : '无法加载会议纪要草稿。');
    } finally {
      setMinutesLoadBusy(false);
    }
  }

  async function handleSaveMinutesDraft() {
    if (!meeting.id?.trim() || minutesSaveBusy || minutesFinalizeBusy) return;
    const body = minutesBody.trim();
    if (!body) {
      setMinutesError(en ? 'Minutes cannot be empty.' : '纪要内容不能为空。');
      return;
    }
    setMinutesError(null);
    setMinutesSaveBusy(true);
    try {
      const { data, error } = await supabase.rpc('create_or_update_meeting_minutes_draft', {
        p_meeting_id: meeting.id,
        p_body: minutesBody,
      });
      if (error) throw error;
      const payload = data as MinutesDraftPayload | null;
      if (payload?.ok === false) {
        const err = payload.error;
        setMinutesError(
          err === 'already_finalized'
            ? en
              ? 'Minutes are already finalized.'
              : '会议纪要已归档，无法编辑。'
            : en
              ? 'Failed to save draft.'
              : '保存草稿失败。',
        );
        return;
      }
      setMinutesHasDraft(true);
    } catch (e) {
      console.error('[MeetingVoteArchiveCard] create_or_update_meeting_minutes_draft', e);
      setMinutesError(en ? 'Failed to save draft.' : '保存草稿失败。');
    } finally {
      setMinutesSaveBusy(false);
    }
  }

  async function handleFinalizeMinutes() {
    if (!meeting.id?.trim() || minutesSaveBusy || minutesFinalizeBusy) return;
    const body = minutesBody.trim();
    if (!body) {
      setMinutesError(en ? 'Minutes cannot be empty.' : '纪要内容不能为空。');
      return;
    }
    setMinutesError(null);
    setMinutesFinalizeBusy(true);
    try {
      const { data: saveData, error: saveError } = await supabase.rpc(
        'create_or_update_meeting_minutes_draft',
        { p_meeting_id: meeting.id, p_body: minutesBody },
      );
      if (saveError) throw saveError;
      const savePayload = saveData as MinutesDraftPayload | null;
      if (savePayload?.ok === false && savePayload.error !== 'already_finalized') {
        setMinutesError(en ? 'Failed to save draft before finalize.' : '归档前保存草稿失败。');
        return;
      }

      const { data, error } = await supabase.rpc('finalize_meeting_minutes', {
        p_meeting_id: meeting.id,
      });
      if (error) throw error;
      const payload = data as MinutesDraftPayload | null;
      if (payload?.ok === false) {
        setMinutesError(
          payload.error === 'no_draft'
            ? en
              ? 'Save a draft before finalizing.'
              : '请先保存草稿再归档。'
            : en
              ? 'Failed to finalize minutes.'
              : '归档失败。',
        );
        return;
      }
      setMinutesEditorOpen(false);
      setMinutesHasDraft(false);
      await loadArchiveDocs();
      onSupportingDocumentsChanged();
    } catch (e) {
      console.error('[MeetingVoteArchiveCard] finalize_meeting_minutes', e);
      setMinutesError(en ? 'Failed to finalize minutes.' : '归档失败。');
    } finally {
      setMinutesFinalizeBusy(false);
    }
  }

  function renderGeneratedSnapshotRow(slot: '03' | '04' | '05', doc: MeetingArchiveDocumentRow | undefined) {
    const displayTitle = getArchiveSlotDisplayTitle(slot, en ? 'en' : 'zh');
    const generated = !!doc;
    return (
      <li
        key={slot}
        className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 ${
          generated ? 'border-teal-200/80 bg-white' : 'border-gray-100 bg-white/80 text-gray-500'
        }`}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={`font-medium ${generated ? 'text-gray-900' : 'text-gray-700'}`}>
            {displayTitle}
          </span>
          <span
            className={`shrink-0 text-[10px] font-semibold ${
              generated
                ? 'rounded border border-teal-300 bg-teal-50 px-1.5 py-px text-teal-950'
                : 'text-xs text-gray-500'
            }`}
          >
            {generated ? (en ? 'Generated' : '已生成') : en ? 'Pending · No file yet' : '待生成 · 暂无文件'}
          </span>
        </div>
        {generated && doc ? (
          <button
            type="button"
            onClick={() => openGeneratedSnapshot(slot, doc)}
            className="shrink-0 rounded-lg border border-teal-600 bg-teal-700 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-800"
          >
            {en ? 'View' : '查看'}
          </button>
        ) : null}
      </li>
    );
  }

  function renderMinutesRow() {
    const displayTitle = getArchiveSlotDisplayTitle('06', en ? 'en' : 'zh');
    const showView = minutesFinalized && !!generated06;
    const showEdit = canManageDocuments && !minutesFinalized;

    return (
      <li
        className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 ${
          showView ? 'border-teal-200/80 bg-white' : 'border-gray-100 bg-white/80 text-gray-500'
        }`}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={`font-medium ${showView ? 'text-gray-900' : 'text-gray-700'}`}>
            {displayTitle}
          </span>
          <span
            className={`shrink-0 text-[10px] font-semibold ${
              showView
                ? 'rounded border border-teal-300 bg-teal-50 px-1.5 py-px text-teal-950'
                : 'text-xs text-gray-500'
            }`}
          >
            {showView
              ? en
                ? 'Generated'
                : '已生成'
              : en
                ? 'Pending · No file yet'
                : '待生成 · 暂无文件'}
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {showEdit ? (
            <button
              type="button"
              onClick={() => void openMinutesEditor()}
              className="rounded-lg border border-slate-400 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              {minutesHasDraft
                ? en
                  ? 'Continue editing'
                  : '继续编辑'
                : en
                  ? 'Edit minutes'
                  : '编辑纪要'}
            </button>
          ) : null}
          {showView && generated06 ? (
            <button
              type="button"
              onClick={() => openArchiveTextDocument('06', generated06)}
              className="rounded-lg border border-teal-600 bg-teal-700 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-800"
            >
              {en ? 'View' : '查看'}
            </button>
          ) : null}
        </div>
      </li>
    );
  }

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
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canManageDocuments ? (
              <button
                type="button"
                disabled={generateBusy}
                onClick={() => void handleGenerateArchive()}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {generateBusy ? (en ? 'Generating…' : '生成中…') : en ? 'Regenerate' : '重新生成'}
              </button>
            ) : null}
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
            >
              {expanded ? (en ? 'Collapse' : '收起') : en ? 'Expand' : '展开'}
            </button>
          </div>
        </div>
        {canManageDocuments && generateFeedback ? (
          <p
            className={`mt-2 text-xs ${
              generateFeedback.kind === 'success' ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {generateFeedback.text}
          </p>
        ) : null}
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          {en ? MEETING_VOTE_ARCHIVE_CARD_CLASSIFICATION_NOTE.en : MEETING_VOTE_ARCHIVE_CARD_CLASSIFICATION_NOTE.zh}
        </p>

        {expanded ? (
          <div className="mt-3 space-y-3 border-t border-slate-200/80 pt-3">
            <ul className="space-y-2">
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
              {showSupportingDocsAction ? (
                <button
                  type="button"
                  onClick={() => setDocsOpen(true)}
                  className="shrink-0 rounded-lg border border-violet-600 bg-violet-700 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-800"
                >
                  {supportingDocsActionLabel}
                </button>
              ) : null}
            </li>

            {renderGeneratedSnapshotRow('03', generated03)}
            {renderGeneratedSnapshotRow('04', generated04)}
            {renderGeneratedSnapshotRow('05', generated05)}

            {renderMinutesRow()}
            </ul>
          </div>
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

              <h3 className="text-[13px] font-semibold text-gray-900">{g.legalArchiveTitle}</h3>
              <p className="whitespace-pre-wrap rounded-md border border-slate-100 bg-slate-50 px-3 py-2 font-mono text-xs leading-relaxed text-gray-800">
                {g.legalArchiveTree}
              </p>
              <p className="text-sm text-gray-800">{g.legalArchiveRouting}</p>

              <h3 className="text-[13px] font-semibold text-gray-900">{g.dirTitle}</h3>
              <p className="text-sm text-gray-700">{g.dirIntro}</p>
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
                <span className="whitespace-pre-wrap">{noticePayload.formatLabel}</span>
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

      {docsOpen ? (
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
            <div className="max-h-[min(78vh,600px)] overflow-y-auto px-4 py-4 text-sm leading-relaxed text-gray-800">
              <MeetingDocumentsSection
                meetingId={meetingId}
                isCouncil={canManageDocuments}
                titleEn={sup.row02.en}
                titleZh={sup.row02.zh}
                omitOuterTitle
                onDocumentsChanged={() => {
                  void loadArchiveDocs();
                  void onSupportingDocumentsChanged();
                }}
              />
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

      {minutesEditorOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="meeting-vote-archive-minutes-editor-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !minutesSaveBusy && !minutesFinalizeBusy) {
              setMinutesEditorOpen(false);
            }
          }}
        >
          <div
            className="max-h-[min(92vh,720px)] w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
            onMouseDown={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
              <h2 id="meeting-vote-archive-minutes-editor-title" className="text-base font-semibold text-gray-900">
                {getArchiveSlotDisplayTitle('06', en ? 'en' : 'zh')}
              </h2>
              <button
                type="button"
                disabled={minutesSaveBusy || minutesFinalizeBusy}
                onClick={() => setMinutesEditorOpen(false)}
                className="shrink-0 rounded-lg p-1 text-gray-500 hover:bg-gray-200/80 hover:text-gray-800 disabled:opacity-50"
                aria-label={en ? 'Close' : '关闭'}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[min(60vh,520px)] overflow-y-auto px-4 py-4">
              {minutesLoadBusy ? (
                <p className="text-sm text-gray-500">{en ? 'Loading…' : '加载中…'}</p>
              ) : (
                <textarea
                  value={minutesBody}
                  onChange={(e) => setMinutesBody(e.target.value)}
                  rows={18}
                  maxLength={20000}
                  disabled={minutesSaveBusy || minutesFinalizeBusy}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed text-gray-800 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:opacity-60"
                  placeholder={en ? 'Enter meeting minutes…' : '输入会议纪要…'}
                />
              )}
              {minutesError ? <p className="mt-2 text-xs text-red-700">{minutesError}</p> : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3">
              <button
                type="button"
                disabled={minutesLoadBusy || minutesSaveBusy || minutesFinalizeBusy}
                onClick={() => setMinutesEditorOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200/60 disabled:opacity-50"
              >
                {en ? 'Close' : '关闭'}
              </button>
              <button
                type="button"
                disabled={minutesLoadBusy || minutesSaveBusy || minutesFinalizeBusy}
                onClick={() => void handleSaveMinutesDraft()}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {minutesSaveBusy ? (en ? 'Saving…' : '保存中…') : en ? 'Save draft' : '保存草稿'}
              </button>
              <button
                type="button"
                disabled={minutesLoadBusy || minutesSaveBusy || minutesFinalizeBusy}
                onClick={() => void handleFinalizeMinutes()}
                className="rounded-lg border border-teal-600 bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                {minutesFinalizeBusy ? (en ? 'Finalizing…' : '生成中…') : en ? 'Finalize' : '归档生成'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {snapshotViewer ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="meeting-vote-archive-snapshot-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSnapshotViewer(null);
          }}
        >
          <div
            className="max-h-[min(92vh,720px)] w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
            onMouseDown={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
              <h2 id="meeting-vote-archive-snapshot-title" className="text-base font-semibold text-gray-900">
                {snapshotViewer.title}
              </h2>
              <button
                type="button"
                onClick={() => setSnapshotViewer(null)}
                className="shrink-0 rounded-lg p-1 text-gray-500 hover:bg-gray-200/80 hover:text-gray-800"
                aria-label={en ? 'Close' : '关闭'}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[min(78vh,600px)] overflow-y-auto px-4 py-4">
              <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800 font-sans">
                {snapshotViewer.body}
              </pre>
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
              <button
                type="button"
                onClick={() => setSnapshotViewer(null)}
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
