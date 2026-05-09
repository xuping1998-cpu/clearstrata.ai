import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  createMeeting,
  fetchOwnerVoteMeetingMetaForCouncilMeeting,
  getMeetingDetail,
  noticeReadiness,
  updateMeeting,
  type MeetingRow,
  type MeetingStatus,
  type MeetingType,
} from '../features/meetings/api';
import {
  extractWrittenRemoteMeta,
  embedWrittenRemoteMeta,
  meetingFormatUiFromRow,
  dbFormatFromUi,
  isWrittenRemoteUi,
  type MeetingFormatUi,
} from '../features/meetings/meetingFormatModel';
import { isOwnerVotingMeeting } from '../features/meetings/ownerVotingCouncil';

function sliceDatetimeLocal(iso: string | null | undefined): string {
  if (!iso?.trim()) return '';
  return iso.slice(0, 16);
}

function isoFromDatetimeLocal(loc: string): string | null {
  if (!loc.trim()) return null;
  const t = new Date(loc).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(loc).toISOString();
}

function nowDatetimeLocalSlice(): string {
  return sliceDatetimeLocal(new Date().toISOString());
}

/** Add whole days using local calendar date components (datetime-local UX). */
function addDaysDatetimeLocal(loc: string, days: number): string {
  if (!loc.trim()) return '';
  const d = new Date(loc);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const defaultForm = {
  meeting_type: 'council' as MeetingType,
  title_en: '',
  title_zh: '',
  description_en: '',
  description_zh: '',
  scheduled_at: '',
  meeting_format_ui: 'hybrid' as MeetingFormatUi,
  status: 'draft' as MeetingStatus,
  discussion_closes_at: '',
  voting_opens_at: '',
  voting_closes_at: '',
};

export function MeetingEditor() {
  const { meetingId } = useParams<{ meetingId?: string }>();
  const isEdit = Boolean(meetingId);
  const { user } = useAuth();
  const { currentPropertyId, ready: propertyReady } = useProperty();
  const { language, t } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();

  const [form, setForm] = useState(defaultForm);
  const [fiscalYear] = useState(() => new Date().getFullYear());
  const [agendaCount, setAgendaCount] = useState(0);
  const [detailMeeting, setDetailMeeting] = useState<MeetingRow | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [voteLine, setVoteLine] = useState<'loading' | 'none' | string>('loading');

  useEffect(() => {
    if (!isEdit || !meetingId || !currentPropertyId || !user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const bundle = await getMeetingDetail(meetingId, currentPropertyId);
      if (cancelled) return;
      const m = bundle.meeting;
      if (!m) {
        setErr(en ? 'Meeting not found.' : '未找到该会议。');
        setDetailMeeting(null);
        setLoading(false);
        return;
      }
      setDetailMeeting(m);
      const uiFmt = meetingFormatUiFromRow(m);
      const { cleanDescriptionZh, meta } = extractWrittenRemoteMeta(m.description_zh);
      let discClose = '';
      let vOpen = '';
      let vClose = '';
      if (meta?.discussion_closes_at) {
        discClose = sliceDatetimeLocal(meta.discussion_closes_at);
      } else if (isWrittenRemoteUi(uiFmt)) {
        discClose = addDaysDatetimeLocal(sliceDatetimeLocal(m.scheduled_at || new Date().toISOString()), 7);
      }
      if (m.voting_open_at) {
        vOpen = sliceDatetimeLocal(m.voting_open_at);
      } else if (isWrittenRemoteUi(uiFmt)) {
        vOpen = sliceDatetimeLocal(m.scheduled_at ?? new Date().toISOString());
      }
      if (m.voting_close_at) {
        vClose = sliceDatetimeLocal(m.voting_close_at);
      } else if (isWrittenRemoteUi(uiFmt)) {
        vClose = discClose || addDaysDatetimeLocal(sliceDatetimeLocal(m.scheduled_at || new Date().toISOString()), 7);
      }
      let statusMapped: MeetingStatus = m.status === 'scheduled' ? 'open' : m.status;
      if (!(statusMapped === 'draft' || statusMapped === 'open' || statusMapped === 'closed' || statusMapped === 'archived')) {
        statusMapped = 'draft';
      }
      setForm({
        meeting_type: m.meeting_type,
        title_en: m.title_en ?? '',
        title_zh: m.title_zh ?? '',
        description_en: m.description_en ?? '',
        description_zh: cleanDescriptionZh,
        scheduled_at: sliceDatetimeLocal(m.scheduled_at),
        meeting_format_ui: uiFmt,
        status: statusMapped,
        discussion_closes_at: discClose,
        voting_opens_at: vOpen,
        voting_closes_at: vClose,
      });
      setAgendaCount(bundle.agendaItems.length);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, meetingId, currentPropertyId, user, en]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (
        !isEdit ||
        !detailMeeting ||
        !currentPropertyId ||
        !isOwnerVotingMeeting(detailMeeting) ||
        !detailMeeting.property_id ||
        detailMeeting.property_id.trim() !== currentPropertyId.trim()
      ) {
        setVoteLine('none');
        return;
      }
      setVoteLine('loading');
      const res = await fetchOwnerVoteMeetingMetaForCouncilMeeting({
        propertyId: currentPropertyId,
        meeting: detailMeeting,
      });
      if (cancelled) return;
      if (res.error) {
        console.warn('[MeetingEditor] owner vote meta for editor', res.error);
      }
      if (!res.meeting?.id) {
        setVoteLine('none');
        return;
      }
      const s = String(res.meeting.status ?? '').trim().toLowerCase();
      setVoteLine(s || 'draft');
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, detailMeeting, currentPropertyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !currentPropertyId) {
      setErr(en ? 'Not signed in or no property.' : '未登录或未选择物业。');
      return;
    }

    const written = isWrittenRemoteUi(form.meeting_format_ui);
    let discOpenLocal = form.scheduled_at.trim() ? form.scheduled_at : '';
    let discCloseLocal = form.discussion_closes_at.trim() ? form.discussion_closes_at : '';
    let vOpenLoc = form.voting_opens_at.trim() ? form.voting_opens_at : '';
    let vCloseLoc = form.voting_closes_at.trim() ? form.voting_closes_at : '';
    if (written && form.status === 'draft') {
      if (!discOpenLocal) discOpenLocal = nowDatetimeLocalSlice();
      if (!discCloseLocal) discCloseLocal = addDaysDatetimeLocal(discOpenLocal, 7);
      if (!vOpenLoc) vOpenLoc = discOpenLocal;
      if (!vCloseLoc) vCloseLoc = discCloseLocal;
    }

    const scheduledIso = written ? isoFromDatetimeLocal(discOpenLocal) : isoFromDatetimeLocal(form.scheduled_at?.trim() ? form.scheduled_at : '');
    let descriptionZhFinal = form.description_zh;
    let votingOpenIso: string | null = null;
    let votingCloseIso: string | null = null;

    const dbFormat = dbFormatFromUi(form.meeting_format_ui);

    if (written) {
      const dcIso = isoFromDatetimeLocal(discCloseLocal);
      votingOpenIso = isoFromDatetimeLocal(vOpenLoc);
      votingCloseIso = isoFromDatetimeLocal(vCloseLoc);
      if (!scheduledIso || !dcIso || !votingOpenIso || !votingCloseIso) {
        setErr(
          en ? 'Written remote meetings require all four scheduling fields.' : '远程书面会议需填写四项开放/截止时间。',
        );
        return;
      }
      descriptionZhFinal = embedWrittenRemoteMeta(form.description_zh || '', dcIso);
    } else {
      const stripped = extractWrittenRemoteMeta(form.description_zh).cleanDescriptionZh;
      descriptionZhFinal = stripped;
      votingOpenIso = null;
      votingCloseIso = null;
    }

    const readinessMeeting: Partial<MeetingRow> = {
      meeting_type: form.meeting_type,
      title_en: form.title_en,
      title_zh: form.title_zh,
      scheduled_at: scheduledIso,
      meeting_format: dbFormat,
      ...(written
        ? { voting_open_at: votingOpenIso, voting_close_at: votingCloseIso }
        : {}),
    };

    if (form.status !== 'draft') {
      const readiness = noticeReadiness(readinessMeeting, agendaCount, {
        writtenRemote: written,
        discussionClosesIso: written ? isoFromDatetimeLocal(discCloseLocal) : null,
      });
      if (!readiness.ok) {
        const key = written ? 'meeting_create_notice_ready_written_missing' : 'meeting_create_notice_ready_sync_missing';
        setErr(t(key));
        return;
      }
    }

    setErr(null);
    setSaving(true);

    if (!isEdit) {
      const { id, error } = await createMeeting({
        propertyId: currentPropertyId,
        fiscalYear,
        meetingType: form.meeting_type,
        titleEn: form.title_en || null,
        titleZh: form.title_zh || null,
        descriptionEn: form.description_en || null,
        descriptionZh: descriptionZhFinal || null,
        scheduledAt: scheduledIso,
        votingOpenAt: written ? votingOpenIso : undefined,
        votingCloseAt: written ? votingCloseIso : undefined,
        meetingFormat: dbFormat,
        status: form.status,
        createdBy: user.id,
      });
      setSaving(false);
      if (error || !id) {
        setErr(error?.message ?? (en ? 'Create failed.' : '创建失败。'));
        return;
      }
      navigate(`/meetings/${id}`);
      return;
    }

    const { error } = await updateMeeting(meetingId!, currentPropertyId, {
      meeting_type: form.meeting_type,
      title_en: form.title_en || null,
      title_zh: form.title_zh || null,
      description_en: form.description_en || null,
      description_zh: descriptionZhFinal || null,
      scheduled_at: scheduledIso,
      meeting_format: dbFormat,
      status: form.status,
      voting_open_at: votingOpenIso,
      voting_close_at: votingCloseIso,
    });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    navigate(`/meetings/${meetingId}`);
  }

  function voteStatusReadLabel(): string {
    if (!isEdit) return '';
    if (voteLine === 'loading') return en ? '…' : '…';
    if (voteLine === 'none') return t('vote_not_enabled');
    switch (voteLine) {
      case 'draft':
        return t('vote_draft');
      case 'open':
        return t('vote_open');
      case 'closed':
        return t('vote_closed');
      case 'archived':
        return t('vote_archived');
      default:
        return voteLine || t('vote_not_enabled');
    }
  }

  if (!user) {
    return <div className="p-8 text-center text-gray-600">{en ? 'Sign in required.' : '请先登录。'}</div>;
  }

  if (!propertyReady || loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-clearstrata-brand-700" />
      </div>
    );
  }

  if (!currentPropertyId) {
    return <div className="p-8 text-center text-gray-600">{en ? 'Select a property first.' : '请先选择物业。'}</div>;
  }

  const syncTimeModes = !(form.meeting_format_ui === 'written_remote');

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        to="/meetings"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-clearstrata-brand-800 hover:underline"
      >
        <ChevronLeft className="size-4" />
        {t('nav_meetings_records')}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">
        {isEdit ? (en ? 'Edit meeting' : '编辑会议') : en ? 'New meeting' : '新建会议'}
      </h1>

      {form.meeting_format_ui === 'written_remote' ? (
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{t('meeting_written_remote_intro')}</p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700">{en ? 'Meeting type' : '会议类型'}</label>
          <select
            value={form.meeting_type}
            onChange={(e) => setForm((f) => ({ ...f, meeting_type: e.target.value as MeetingType }))}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
          >
            <option value="council">{en ? 'Council' : '业委会'}</option>
            <option value="agm">AGM</option>
            <option value="sgm">SGM</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">{en ? 'Title (English)' : '标题（英）'}</label>
            <input
              value={form.title_en}
              onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{en ? 'Title (Chinese)' : '标题（中）'}</label>
            <input
              value={form.title_zh}
              onChange={(e) => setForm((f) => ({ ...f, title_zh: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">{en ? 'Description (EN)' : '说明（英）'}</label>
            <textarea
              value={form.description_en}
              onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{en ? 'Description (ZH)' : '说明（中）'}</label>
            <textarea
              value={form.description_zh}
              onChange={(e) => setForm((f) => ({ ...f, description_zh: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{en ? 'Meeting format' : '会议形式'}</label>
          <select
            value={form.meeting_format_ui}
            onChange={(e) => {
              const v = e.target.value as MeetingFormatUi;
              setForm((f) => {
                if (!isWrittenRemoteUi(f.meeting_format_ui) && isWrittenRemoteUi(v)) {
                  const discOpen = f.scheduled_at.trim() ? f.scheduled_at : nowDatetimeLocalSlice();
                  const discClose = addDaysDatetimeLocal(discOpen, 7);
                  return {
                    ...f,
                    meeting_format_ui: v,
                    scheduled_at: discOpen,
                    discussion_closes_at: discClose,
                    voting_opens_at: discOpen,
                    voting_closes_at: discClose,
                  };
                }
                if (isWrittenRemoteUi(f.meeting_format_ui) && !isWrittenRemoteUi(v)) {
                  const { cleanDescriptionZh } = extractWrittenRemoteMeta(f.description_zh);
                  return { ...f, meeting_format_ui: v, description_zh: cleanDescriptionZh };
                }
                return { ...f, meeting_format_ui: v };
              });
            }}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
          >
            <option value="in_person">{t('meeting_format_in_person')}</option>
            <option value="live_remote">{t('meeting_format_live_remote')}</option>
            <option value="hybrid">{t('meeting_format_hybrid')}</option>
            <option value="written_remote">{t('meeting_format_written_remote')}</option>
          </select>
        </div>

        {syncTimeModes ? (
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('meeting_time_local')}</label>
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('discussion_opens')}</label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheduled_at: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('discussion_closes')}</label>
              <input
                type="datetime-local"
                value={form.discussion_closes_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discussion_closes_at: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('voting_opens')}</label>
              <input
                type="datetime-local"
                value={form.voting_opens_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, voting_opens_at: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('voting_closes')}</label>
              <input
                type="datetime-local"
                value={form.voting_closes_at}
                onChange={(e) =>
                  setForm((f) => ({ ...f, voting_closes_at: e.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">{t('meeting_status')}</label>
          <select
            value={form.status === 'scheduled' ? 'open' : form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as MeetingStatus }))}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
          >
            <option value="draft">{t('meeting_status_draft_label')}</option>
            <option value="open">{t('meeting_status_active_label')}</option>
            <option value="closed">{t('meeting_status_closed_label')}</option>
            <option value="archived">{t('meeting_status_archived_label')}</option>
          </select>
          {isEdit && (
            <>
              <p className="text-xs text-gray-500 mt-1">
                {en ? `Agenda items on file: ${agendaCount}` : `当前议程条数：${agendaCount}`}
              </p>
              <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                <span className="text-xs font-medium text-gray-600">{t('voting_status')}</span>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {voteLine === 'loading' ? (en ? '…' : '…') : voteStatusReadLabel()}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-2">
          <p>{t('meeting_editor_schedule_guard_note')}</p>
          {!isEdit ? (
            <p className="pt-2 border-t border-amber-200">{t('meeting_create_save_then_agenda_hint')}</p>
          ) : null}
        </div>

        {err ? <p className="text-sm text-red-600">{err}</p> : null}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin inline" /> : null}{' '}
          {en ? 'Save' : '保存'}
        </button>
      </form>
    </div>
  );
}

export default MeetingEditor;
