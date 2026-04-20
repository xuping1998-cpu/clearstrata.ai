import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  createMeeting,
  getMeetingDetail,
  noticeReadiness,
  updateMeeting,
  type MeetingFormat,
  type MeetingStatus,
  type MeetingType,
} from '../features/meetings/api';

const defaultForm = {
  meeting_type: 'council' as MeetingType,
  title_en: '',
  title_zh: '',
  description_en: '',
  description_zh: '',
  scheduled_at: '',
  meeting_format: 'hybrid' as MeetingFormat,
  status: 'draft' as MeetingStatus,
};

export function MeetingEditor() {
  const { meetingId } = useParams<{ meetingId?: string }>();
  const isEdit = Boolean(meetingId);
  const { user } = useAuth();
  const { currentPropertyId, ready: propertyReady } = useProperty();
  const { language } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();

  const [form, setForm] = useState(defaultForm);
  const [fiscalYear] = useState(() => new Date().getFullYear());
  const [agendaCount, setAgendaCount] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !meetingId || !currentPropertyId || !user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const bundle = await getMeetingDetail(meetingId, currentPropertyId);
      if (cancelled) return;
      const m = bundle.meeting;
      if (!m) {
        setErr(en ? 'Meeting not found.' : '未找到该会议。');
        setLoading(false);
        return;
      }
      setForm({
        meeting_type: m.meeting_type,
        title_en: m.title_en ?? '',
        title_zh: m.title_zh ?? '',
        description_en: m.description_en ?? '',
        description_zh: m.description_zh ?? '',
        scheduled_at: m.scheduled_at ? m.scheduled_at.slice(0, 16) : '',
        meeting_format: m.meeting_format,
        status: m.status,
      });
      setAgendaCount(bundle.agendaItems.length);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, meetingId, currentPropertyId, user, en]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !currentPropertyId) {
      setErr(en ? 'Not signed in or no property.' : '未登录或未选择物业。');
      return;
    }

    const scheduledIso = form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null;
    const readiness = noticeReadiness(
      {
        meeting_type: form.meeting_type,
        title_en: form.title_en,
        title_zh: form.title_zh,
        scheduled_at: scheduledIso,
        meeting_format: form.meeting_format,
      },
      agendaCount,
    );

    if (form.status === 'scheduled' && !readiness.ok) {
      setErr(
        en
          ? 'Cannot set to scheduled until title, schedule, format, meeting type, and at least one agenda item exist.'
          : '未满足通知就绪条件：需标题、会议时间、形式、类型，且至少一条议程。',
      );
      return;
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
        descriptionZh: form.description_zh || null,
        scheduledAt: scheduledIso,
        meetingFormat: form.meeting_format,
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
      description_zh: form.description_zh || null,
      scheduled_at: scheduledIso,
      meeting_format: form.meeting_format,
      status: form.status,
    });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    navigate(`/meetings/${meetingId}`);
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/meetings" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-clearstrata-brand-800 hover:underline">
        <ChevronLeft className="size-4" />
        {en ? 'Meetings' : '会议'}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">
        {isEdit ? (en ? 'Edit meeting' : '编辑会议') : en ? 'New meeting' : '新建会议'}
      </h1>

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
          <label className="block text-sm font-medium text-gray-700">{en ? 'Scheduled (local)' : '会议时间（本地）'}</label>
          <input
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{en ? 'Meeting format' : '会议形式'}</label>
          <select
            value={form.meeting_format}
            onChange={(e) => setForm((f) => ({ ...f, meeting_format: e.target.value as MeetingFormat }))}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
          >
            <option value="in_person">{en ? 'In person' : '线下'}</option>
            <option value="electronic">{en ? 'Electronic' : '线上'}</option>
            <option value="hybrid">{en ? 'Hybrid' : '混合'}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{en ? 'Status' : '状态'}</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as MeetingStatus }))}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
          >
            <option value="draft">{en ? 'Draft' : '草稿'}</option>
            <option value="scheduled">{en ? 'Scheduled' : '已安排'}</option>
            <option value="open">{en ? 'Open' : '投票中'}</option>
            <option value="closed">{en ? 'Closed' : '已关闭'}</option>
            <option value="archived">{en ? 'Archived' : '已归档'}</option>
          </select>
          {isEdit && (
            <p className="text-xs text-gray-500 mt-1">
              {en ? `Agenda items on file: ${agendaCount}` : `当前议程条数：${agendaCount}`}
            </p>
          )}
        </div>

        <div className="text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-lg p-3">
          {en
            ? 'Moving to “Scheduled” is also blocked by the database until notice-readiness rules pass (same checks as here).'
            : '数据库会在写入“已安排”时再次校验通知就绪条件（与表单规则一致）。'}
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
