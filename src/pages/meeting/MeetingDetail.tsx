import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Video, Users, FileText, AlertCircle, Upload, UserCheck, X, Pencil } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';
import { localDateTimeToIso } from '../../utils/meetingDateTime';
import { MeetingAgendaSection } from './MeetingAgendaSection';
import { MeetingDocumentsSection } from './MeetingDocumentsSection';
import { MeetingAttendanceSection } from './MeetingAttendanceSection';

interface Meeting {
  id: string;
  meeting_type: 'agm' | 'council_regular' | 'ad_hoc' | 'sgm';
  title_en: string;
  title_zh?: string;
  description_en?: string;
  description_zh?: string;
  scheduled_date: string;
  duration_minutes?: number;
  location?: string;
  is_virtual: boolean;
  meeting_link?: string;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  is_overtime: boolean;
  overtime_fee?: number;
  fiscal_year: number;
  created_by: string;
  created_at: string;
}

const meetingTypeLabelsZh: Record<string, string> = {
  agm: '年度大会 (AGM)',
  council_regular: '业委会例会',
  ad_hoc: '机动会议',
  sgm: '特别大会 (SGM)',
};

const meetingTypeLabelsEn: Record<string, string> = {
  agm: 'AGM',
  council_regular: 'Council Meeting',
  ad_hoc: 'Ad Hoc Meeting',
  sgm: 'SGM',
};

const meetingTypeColors: Record<string, string> = {
  agm: 'bg-purple-100 text-purple-800',
  council_regular: 'bg-blue-100 text-blue-800',
  ad_hoc: 'bg-orange-100 text-orange-800',
  sgm: 'bg-red-100 text-red-800',
};

const statusLabelsZh: Record<string, string> = {
  draft: '草稿',
  scheduled: '已排期',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
};

const statusLabelsEn: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-green-100 text-green-800',
  completed: 'bg-teal-100 text-teal-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { currentPropertyId, roleInProperty, ready: propertyReady } = useProperty();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const l = language === 'en';

  const mt = (en: string | undefined, zh: string | undefined) => {
    if (l) return en || zh || '';
    return zh || en || '';
  };

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCouncil, setIsCouncil] = useState(false);
  const [activeTab, setActiveTab] = useState<'agenda' | 'documents' | 'attendance'>('agenda');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title_en: '',
    title_zh: '',
    description_en: '',
    description_zh: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 120,
    location: '',
    is_virtual: false,
    meeting_link: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadMeeting = useCallback(async () => {
    if (!id || !user) {
      setLoading(false);
      return;
    }
    if (!propertyReady) return;
    if (!currentPropertyId) {
      setMeeting(null);
      setLoading(false);
      return;
    }

    try {
      setIsCouncil(
        roleInProperty === 'council' ||
          roleInProperty === 'manager' ||
          roleInProperty === 'property_admin' ||
          roleInProperty === 'admin',
      );

      const { data: meetingData } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', id)
        .eq('property_id', currentPropertyId)
        .maybeSingle();

      if (meetingData) {
        setMeeting(meetingData);
      } else {
        setMeeting(null);
      }
    } catch (error) {
      console.error('Error loading meeting:', error);
    } finally {
      setLoading(false);
    }
  }, [id, user, currentPropertyId, roleInProperty, propertyReady]);

  useEffect(() => {
    loadMeeting();
  }, [loadMeeting]);

  const openEditModal = () => {
    if (!meeting) return;
    setSaveError(null);
    const d = new Date(meeting.scheduled_date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    setEditForm({
      title_en: meeting.title_en,
      title_zh: meeting.title_zh || '',
      description_en: meeting.description_en || '',
      description_zh: meeting.description_zh || '',
      scheduled_date: `${yyyy}-${mm}-${dd}`,
      scheduled_time: `${hh}:${mi}`,
      duration_minutes: meeting.duration_minutes || 120,
      location: meeting.location || '',
      is_virtual: meeting.is_virtual,
      meeting_link: meeting.meeting_link || '',
    });
    setShowEditModal(true);
  };

  const saveMeeting = async () => {
    if (!meeting || !currentPropertyId || !editForm.title_en || !editForm.scheduled_date) return;
    setSaving(true);
    setSaveError(null);
    try {
      const scheduledIso = localDateTimeToIso(editForm.scheduled_date, editForm.scheduled_time || '00:00');

      const { error } = await supabase
        .from('meetings')
        .update({
          title_en: editForm.title_en,
          title_zh: editForm.title_zh || null,
          description_en: editForm.description_en || null,
          description_zh: editForm.description_zh || null,
          scheduled_date: scheduledIso,
          duration_minutes: editForm.duration_minutes,
          location: editForm.is_virtual ? null : (editForm.location || null),
          is_virtual: editForm.is_virtual,
          meeting_link: editForm.is_virtual ? (editForm.meeting_link || null) : null,
        })
        .eq('id', meeting.id)
        .eq('property_id', currentPropertyId);

      if (error) throw error;
      setShowEditModal(false);
      loadMeeting();
    } catch (error) {
      console.error('Error updating meeting:', error);
      setSaveError(t('meeting_save_failed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 mb-4">{t('meeting_not_found')}</p>
          <button
            onClick={() => navigate('/voting')}
            className="text-[#1D9E75] hover:underline"
          >
            {t('meeting_back_list')}
          </button>
        </div>
      </div>
    );
  }

  const scheduledDate = new Date(meeting.scheduled_date);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-[#1D9E75] to-[#178a66] text-white p-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate('/voting')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            {l ? 'Back to Meetings' : '返回会议列表'}
          </button>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${meetingTypeColors[meeting.meeting_type]}`}>
                  {l ? meetingTypeLabelsEn[meeting.meeting_type] : meetingTypeLabelsZh[meeting.meeting_type]}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[meeting.status]}`}>
                  {l ? statusLabelsEn[meeting.status] : statusLabelsZh[meeting.status]}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                {mt(meeting.title_en, meeting.title_zh)}
              </h1>
              {mt(meeting.description_en, meeting.description_zh) ? (
                <p className="text-white/80 max-w-2xl whitespace-pre-line">
                  {mt(meeting.description_en, meeting.description_zh)}
                </p>
              ) : null}
            </div>
            {isCouncil && (
              <button
                onClick={openEditModal}
                className="shrink-0 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <Pencil size={16} />
                {l ? 'Edit' : '编辑'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 -mt-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Calendar size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{l ? 'Date' : '日期'}</p>
                <p className="text-sm font-medium text-gray-900">
                  {scheduledDate.toLocaleDateString(l ? 'en-US' : 'zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Clock size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{l ? 'Time / Duration' : '时间 / 时长'}</p>
                <p className="text-sm font-medium text-gray-900">
                  {scheduledDate.toLocaleTimeString(l ? 'en-US' : 'zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  {meeting.duration_minutes ? ` / ${meeting.duration_minutes}${l ? 'min' : '分钟'}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                {meeting.is_virtual ? <Video size={20} className="text-orange-600" /> : <MapPin size={20} className="text-orange-600" />}
              </div>
              <div>
                <p className="text-xs text-gray-500">{meeting.is_virtual ? (l ? 'Virtual' : '在线会议') : (l ? 'Location' : '地点')}</p>
                {meeting.is_virtual && meeting.meeting_link ? (
                  <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#1D9E75] hover:underline">
                    {l ? 'Join Meeting' : '加入会议'}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-gray-900">{meeting.location || (l ? 'TBD' : '待定')}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{l ? 'Fiscal Year' : '财政年度'}</p>
                <p className="text-sm font-medium text-gray-900">{meeting.fiscal_year}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              {[
                { key: 'agenda' as const, label: l ? 'Agenda & Voting' : '议题与投票', icon: FileText },
                { key: 'documents' as const, label: l ? 'Documents' : '会议文件', icon: Upload },
                { key: 'attendance' as const, label: l ? 'Attendance' : '出席签到', icon: UserCheck },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 px-4 py-3.5 font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                    activeTab === key
                      ? 'text-[#1D9E75] border-b-2 border-[#1D9E75]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5">
            {activeTab === 'agenda' && (
              <MeetingAgendaSection meetingId={meeting.id} meetingStatus={meeting.status} isCouncil={isCouncil} />
            )}
            {activeTab === 'documents' && (
              <MeetingDocumentsSection meetingId={meeting.id} isCouncil={isCouncil} />
            )}
            {activeTab === 'attendance' && (
              <MeetingAttendanceSection meetingId={meeting.id} isCouncil={isCouncil} />
            )}
          </div>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{l ? 'Edit Meeting' : '编辑会议'}</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Title (English)' : '标题 (English)'}</label>
                  <input
                    type="text"
                    value={editForm.title_en}
                    onChange={(e) => setEditForm({ ...editForm, title_en: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Title (Chinese)' : '标题 (中文)'}</label>
                  <input
                    type="text"
                    value={editForm.title_zh}
                    onChange={(e) => setEditForm({ ...editForm, title_zh: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Description (English)' : '描述 (English)'}</label>
                <textarea
                  value={editForm.description_en}
                  onChange={(e) => setEditForm({ ...editForm, description_en: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Description (Chinese)' : '描述 (中文)'}</label>
                <textarea
                  value={editForm.description_zh}
                  onChange={(e) => setEditForm({ ...editForm, description_zh: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  rows={4}
                />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">{l ? 'Schedule & Location' : '时间与地点'}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Date' : '日期'}</label>
                    <input
                      type="date"
                      value={editForm.scheduled_date}
                      onChange={(e) => setEditForm({ ...editForm, scheduled_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Time' : '时间'}</label>
                    <input
                      type="time"
                      value={editForm.scheduled_time}
                      onChange={(e) => setEditForm({ ...editForm, scheduled_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Duration (minutes)' : '时长（分钟）'}</label>
                <input
                  type="number"
                  value={editForm.duration_minutes}
                  onChange={(e) => setEditForm({ ...editForm, duration_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  min="15"
                  step="15"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit_is_virtual"
                  checked={editForm.is_virtual}
                  onChange={(e) => setEditForm({ ...editForm, is_virtual: e.target.checked })}
                  className="w-5 h-5 text-[#1D9E75] border-gray-300 rounded focus:ring-[#1D9E75]"
                />
                <label htmlFor="edit_is_virtual" className="text-sm text-gray-700">{l ? 'Virtual Meeting' : '在线会议'}</label>
              </div>

              {editForm.is_virtual ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Meeting Link' : '会议链接'}</label>
                  <input
                    type="url"
                    value={editForm.meeting_link}
                    onChange={(e) => setEditForm({ ...editForm, meeting_link: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                    placeholder="https://zoom.us/j/..."
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Location' : '地点'}</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                    placeholder={l ? 'e.g., Clubhouse' : '例如：楼宇会所'}
                  />
                </div>
              )}

              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{saveError}</div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveMeeting}
                  disabled={saving || !editForm.title_en || !editForm.scheduled_date}
                  className="flex-1 bg-[#1D9E75] text-white py-3 rounded-lg hover:bg-[#178a66] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {saving ? (l ? 'Saving...' : '保存中...') : (l ? 'Save Changes' : '保存修改')}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={saving}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                >
                  {l ? 'Cancel' : '取消'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
