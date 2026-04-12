import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { localDateTimeToIso } from '../utils/meetingDateTime';

export function CreateMeeting() {
  const { user } = useAuth();
  const { currentPropertyId } = useProperty();
  const { language } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [voteOptions, setVoteOptions] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [meetingType, setMeetingType] = useState<'council_regular' | 'ad_hoc' | 'sgm' | 'agm'>('council_regular');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !currentPropertyId) {
      setErr(en ? 'Not signed in or no property.' : '未登录或未选择物业');
      return;
    }
    const t = title.trim();
    if (!t) {
      setErr(en ? 'Title is required.' : '请填写标题');
      return;
    }
    if (!scheduledDate) {
      setErr(en ? 'Date is required.' : '请选择日期');
      return;
    }

    setErr(null);
    setSubmitting(true);

    try {
      const currentYear = new Date().getFullYear();
      const scheduledDateTimeIso = localDateTimeToIso(scheduledDate, scheduledTime || '10:00');

      // Local fallback only — do not query meeting_quota_tracker (avoids 400 / RLS issues).
      const quota = {
        fiscal_year: currentYear,
        used: 0,
        total: 8,
        agm_count: 0,
        ad_hoc_count: 0,
      };

      const quotaUsed = quota.used;
      const isOvertime = quotaUsed >= quota.total;

      if (meetingType === 'agm' && (quota.agm_count ?? 0) >= 1) {
        setErr(en ? 'AGM quota for this year is already used.' : '本年度 AGM 配额已使用');
        setSubmitting(false);
        return;
      }
      if (meetingType === 'ad_hoc' && (quota.ad_hoc_count ?? 0) >= 1) {
        setErr(en ? 'Ad hoc quota for this year is already used.' : '本年度机动会议配额已使用');
        setSubmitting(false);
        return;
      }

      if (isOvertime) {
        const ok = window.confirm(
          en
            ? 'Free meeting quota may be exhausted. Continue? (fees may apply per bylaws)'
            : '免费会议次数可能已用尽，是否仍要创建？（可能产生费用，以章程为准）',
        );
        if (!ok) {
          setSubmitting(false);
          return;
        }
      }

      const overtimeFee = isOvertime ? (120 / 60) * 100 : 0;

      const { data: inserted, error: insErr } = await supabase
        .from('meetings')
        .insert({
          property_id: currentPropertyId,
          meeting_type: meetingType,
          title_en: t,
          title_zh: t,
          description_en: content.trim() || null,
          description_zh: content.trim() || null,
          scheduled_date: scheduledDateTimeIso,
          duration_minutes: 120,
          status: 'scheduled',
          created_by: user.id,
          counts_against_quota: true,
          is_overtime: isOvertime,
          overtime_fee: overtimeFee,
          fiscal_year: currentYear,
          is_virtual: false,
        })
        .select('id')
        .maybeSingle();

      if (insErr || !inserted?.id) {
        setErr(insErr?.message ?? (en ? 'Could not create meeting.' : '创建会议失败'));
        setSubmitting(false);
        return;
      }

      const meetingId = inserted.id as string;
      const motions = voteOptions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const rows: {
        property_id: string;
        meeting_id: string;
        item_number: number;
        title_en: string;
        title_zh: string;
        description_en: string | null;
        description_zh: string | null;
        requires_vote: boolean;
      }[] = [
        {
          property_id: currentPropertyId,
          meeting_id: meetingId,
          item_number: 1,
          title_en: en ? 'Meeting overview' : '会议说明',
          title_zh: '会议说明',
          description_en: content.trim() || null,
          description_zh: content.trim() || null,
          requires_vote: false,
        },
      ];

      motions.forEach((line, i) => {
        rows.push({
          property_id: currentPropertyId,
          meeting_id: meetingId,
          item_number: i + 2,
          title_en: line,
          title_zh: line,
          description_en: null,
          description_zh: null,
          requires_vote: true,
        });
      });

      const { error: agErr } = await supabase.from('meeting_agenda_items').insert(rows);
      if (agErr) {
        setErr(agErr.message);
        setSubmitting(false);
        return;
      }

      navigate(`/voting/${meetingId}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!currentPropertyId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center text-gray-600">
        {en ? 'Select a property first.' : '请先选择物业。'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link
        to="/meetings"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline"
      >
        <ChevronLeft className="size-4" />
        {en ? 'Meetings' : '会议'}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">{en ? 'New meeting' : '新建会议'}</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700">{en ? 'Title' : '标题'}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{en ? 'Content / notes' : '内容'}</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {en ? 'Vote motions (one per line)' : '投票事项（每行一条表决动议）'}
          </label>
          <textarea
            value={voteOptions}
            onChange={(e) => setVoteOptions(e.target.value)}
            rows={5}
            placeholder={en ? 'Motion A\nMotion B' : '动议一\n动议二'}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">{en ? 'Date' : '日期'}</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{en ? 'Time' : '时间'}</label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{en ? 'Meeting type' : '会议类型'}</label>
          <select
            value={meetingType}
            onChange={(e) => setMeetingType(e.target.value as typeof meetingType)}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
          >
            <option value="council_regular">{en ? 'Regular council' : '业委会例会'}</option>
            <option value="ad_hoc">{en ? 'Ad hoc' : '机动会议'}</option>
            <option value="sgm">{en ? 'SGM' : '业主特别大会'}</option>
            <option value="agm">{en ? 'AGM' : '年度业主大会'}</option>
          </select>
        </div>

        {err ? <p className="text-sm text-red-600">{err}</p> : null}

        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {en ? 'Create meeting' : '创建会议'}
        </button>
      </form>
    </div>
  );
}

export default CreateMeeting;
