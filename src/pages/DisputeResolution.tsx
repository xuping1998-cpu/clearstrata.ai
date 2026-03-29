import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  X,
  Scale,
  Clock,
  TrendingUp,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Dispute {
  id: string;
  category: string;
  priority: string;
  title_en: string;
  title_zh?: string;
  description_en: string;
  description_zh?: string;
  status: string;
  reporter_id: string;
  respondent_id?: string;
  assigned_manager_id?: string;
  mediator_id?: string;
  related_procurement_job_id?: string;
  response_due_at?: string;
  resolution_due_at?: string;
  first_response_at?: string;
  escalated_at?: string;
  escalation_reason?: string;
  is_escalated: boolean;
  repeat_complaint_count: number;
  repeat_complaint_threshold_reached: boolean;
  noise_frequency?: string;
  noise_duration_minutes?: number;
  noise_time_of_day?: string;
  requested_documents?: string[];
  documents_provided: boolean;
  resolution_en?: string;
  resolution_zh?: string;
  resolved_at?: string;
  created_at: string;
  reporter?: {
    full_name_en: string;
    full_name_zh?: string;
    unit_number?: string;
  };
  respondent?: {
    full_name_en: string;
    full_name_zh?: string;
  };
  mediator?: {
    full_name_en: string;
    full_name_zh?: string;
  };
  assigned_manager?: {
    full_name_en: string;
    full_name_zh?: string;
  };
  messages?: DisputeMessage[];
  evidence?: Evidence[];
  timeline?: TimelineEvent[];
  procurement_job?: {
    title: string;
    status: string;
  };
}

interface DisputeMessage {
  id: string;
  sender_id: string;
  message_en: string;
  message_zh?: string;
  is_internal_note: boolean;
  created_at: string;
  sender?: {
    full_name_en: string;
    full_name_zh?: string;
  };
}

interface Evidence {
  id: string;
  evidence_type: string;
  file_url: string;
  file_name: string;
  description_en?: string;
  created_at: string;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  event_description_en: string;
  event_description_zh?: string;
  created_at: string;
}

export function DisputeResolution() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCouncilOrManager, setIsCouncilOrManager] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  const [showNewDisputeModal, setShowNewDisputeModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'escalated' | 'resolved'>('all');

  const [newDispute, setNewDispute] = useState({
    category: 'noise',
    priority: 'normal',
    title_en: '',
    title_zh: '',
    description_en: '',
    description_zh: '',
    respondent_unit: '',
    noise_frequency: '',
    noise_duration_minutes: 0,
    noise_time_of_day: '',
    requested_documents: [] as string[],
    related_procurement_job_id: '',
  });

  const [newMessage, setNewMessage] = useState({
    message_en: '',
    message_zh: '',
    is_internal_note: false,
  });

  useEffect(() => {
    loadData();
  }, [user, activeTab]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const isAuthorized = profile?.role === 'council' || profile?.role === 'manager';
      setIsCouncilOrManager(isAuthorized);
      setUserRole(profile?.role || '');

      let query = supabase
        .from('disputes')
        .select(`
          *,
          reporter:profiles!reporter_id(full_name_en, full_name_zh),
          respondent:profiles!respondent_id(full_name_en, full_name_zh),
          mediator:profiles!mediator_id(full_name_en, full_name_zh),
          assigned_manager:profiles!assigned_manager_id(full_name_en, full_name_zh),
          procurement_job:procurement_jobs(title, status)
        `)
        .order('created_at', { ascending: false });

      if (activeTab === 'pending') {
        query = query.in('status', ['pending', 'manager_reviewing', 'manager_mediating']);
      } else if (activeTab === 'escalated') {
        query = query.eq('is_escalated', true);
      } else if (activeTab === 'resolved') {
        query = query.in('status', ['resolved', 'closed']);
      }

      const { data: disputesData } = await query;

      if (disputesData) {
        setDisputes(disputesData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDisputeDetails = async (disputeId: string) => {
    try {
      const { data: dispute } = await supabase
        .from('disputes')
        .select(`
          *,
          reporter:profiles!reporter_id(full_name_en, full_name_zh),
          respondent:profiles!respondent_id(full_name_en, full_name_zh),
          mediator:profiles!mediator_id(full_name_en, full_name_zh),
          assigned_manager:profiles!assigned_manager_id(full_name_en, full_name_zh),
          procurement_job:procurement_jobs(title, status)
        `)
        .eq('id', disputeId)
        .single();

      const { data: messages } = await supabase
        .from('dispute_messages')
        .select(`
          *,
          sender:profiles!sender_id(full_name_en, full_name_zh)
        `)
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true });

      const { data: evidence } = await supabase
        .from('dispute_evidence')
        .select('*')
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: false });

      const { data: timeline } = await supabase
        .from('dispute_timeline')
        .select('*')
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true });

      if (dispute) {
        setSelectedDispute({
          ...dispute,
          messages: messages || [],
          evidence: evidence || [],
          timeline: timeline || [],
        });
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error loading dispute details:', error);
    }
  };

  const createDispute = async () => {
    if (!user) return;

    try {
      const disputeData: Record<string, unknown> = {
        reporter_id: user.id,
        category: newDispute.category,
        priority: newDispute.priority,
        title_en: newDispute.title_en,
        title_zh: newDispute.title_zh,
        description_en: newDispute.description_en,
        description_zh: newDispute.description_zh,
        status: 'pending',
      };

      if (newDispute.category === 'noise') {
        disputeData.noise_frequency = newDispute.noise_frequency;
        disputeData.noise_duration_minutes = newDispute.noise_duration_minutes;
        disputeData.noise_time_of_day = newDispute.noise_time_of_day;
      }

      if (newDispute.category === 'transparency') {
        disputeData.requested_documents = newDispute.requested_documents;
      }

      if (newDispute.category === 'unprocessed_request' && newDispute.related_procurement_job_id) {
        disputeData.related_procurement_job_id = newDispute.related_procurement_job_id;
      }

      const { error } = await supabase.from('disputes').insert(disputeData);

      if (error) throw error;

      alert(language === 'en' ? 'Dispute submitted successfully' : '纠纷已提交');
      setShowNewDisputeModal(false);
      resetNewDispute();
      loadData();
    } catch (error) {
      console.error('Error creating dispute:', error);
      alert(language === 'en' ? 'Failed to submit dispute' : '提交失败');
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedDispute) return;

    try {
      const { error } = await supabase.from('dispute_messages').insert({
        dispute_id: selectedDispute.id,
        sender_id: user.id,
        message_en: newMessage.message_en,
        message_zh: newMessage.message_zh,
        is_internal_note: newMessage.is_internal_note,
      });

      if (error) throw error;

      setNewMessage({ message_en: '', message_zh: '', is_internal_note: false });
      loadDisputeDetails(selectedDispute.id);
    } catch (error) {
      console.error('Error sending message:', error);
      alert(language === 'en' ? 'Failed to send message' : '发送失败');
    }
  };

  const updateDisputeStatus = async (disputeId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('disputes')
        .update({
          status: newStatus,
          ...(newStatus === 'manager_reviewing' && { first_response_at: new Date().toISOString() })
        })
        .eq('id', disputeId);

      if (error) throw error;

      loadData();
      if (selectedDispute?.id === disputeId) {
        loadDisputeDetails(disputeId);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const escalateToCouncil = async (disputeId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('disputes')
        .update({
          is_escalated: true,
          escalated_at: new Date().toISOString(),
          escalation_reason: reason,
          status: 'escalated_to_council',
        })
        .eq('id', disputeId);

      if (error) throw error;

      alert(language === 'en' ? 'Escalated to council' : '已升级至业委会');
      loadData();
      if (selectedDispute?.id === disputeId) {
        loadDisputeDetails(disputeId);
      }
    } catch (error) {
      console.error('Error escalating:', error);
    }
  };

  const resolveDispute = async (disputeId: string, resolutionEn: string, resolutionZh: string) => {
    try {
      const { error } = await supabase
        .from('disputes')
        .update({
          status: 'resolved',
          resolution_en: resolutionEn,
          resolution_zh: resolutionZh,
          resolved_at: new Date().toISOString(),
          mediator_id: user?.id,
        })
        .eq('id', disputeId);

      if (error) throw error;

      alert(language === 'en' ? 'Dispute resolved' : '纠纷已解决');
      loadData();
      if (selectedDispute?.id === disputeId) {
        loadDisputeDetails(disputeId);
      }
    } catch (error) {
      console.error('Error resolving dispute:', error);
    }
  };

  const resetNewDispute = () => {
    setNewDispute({
      category: 'noise',
      priority: 'normal',
      title_en: '',
      title_zh: '',
      description_en: '',
      description_zh: '',
      respondent_unit: '',
      noise_frequency: '',
      noise_duration_minutes: 0,
      noise_time_of_day: '',
      requested_documents: [],
      related_procurement_job_id: '',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      manager_reviewing: 'bg-blue-100 text-blue-800',
      manager_mediating: 'bg-purple-100 text-purple-800',
      escalated_to_council: 'bg-orange-100 text-orange-800',
      council_reviewing: 'bg-orange-100 text-orange-800',
      council_ruling: 'bg-red-100 text-red-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      external_referral: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { en: string; zh: string }> = {
      pending: { en: 'Pending', zh: '待处理' },
      manager_reviewing: { en: 'Manager Reviewing', zh: '物业审核中' },
      manager_mediating: { en: 'Manager Mediating', zh: '物业调解中' },
      escalated_to_council: { en: 'Escalated to Council', zh: '已升级至业委会' },
      council_reviewing: { en: 'Council Reviewing', zh: '业委会审核中' },
      council_ruling: { en: 'Council Ruling', zh: '业委会裁决中' },
      resolved: { en: 'Resolved', zh: '已解决' },
      closed: { en: 'Closed', zh: '已关闭' },
      external_referral: { en: 'External Referral', zh: '外部转介' },
    };
    return language === 'en' ? labels[status]?.en || status : labels[status]?.zh || status;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      urgent: 'bg-orange-100 text-orange-800',
      emergency: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { en: string; zh: string }> = {
      noise: { en: 'Noise', zh: '噪音' },
      transparency: { en: 'Transparency', zh: '信息透明' },
      unprocessed_request: { en: 'Unprocessed Request', zh: '未处理需求' },
      neighbor: { en: 'Neighbor', zh: '邻里纠纷' },
      parking: { en: 'Parking', zh: '停车' },
      pet: { en: 'Pet', zh: '宠物' },
      common_area: { en: 'Common Area', zh: '公共区域' },
      owner_vs_council: { en: 'Owner vs Council', zh: '业主vs业委会' },
      renovation: { en: 'Renovation', zh: '装修' },
      other: { en: 'Other', zh: '其他' },
    };
    return language === 'en' ? labels[category]?.en || category : labels[category]?.zh || category;
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{language === 'en' ? 'Loading...' : '加载中...'}</p>
        </div>
      </div>
    );
  }

  const totalDisputes = disputes.length;
  const pendingDisputes = disputes.filter(d => ['pending', 'manager_reviewing', 'manager_mediating'].includes(d.status)).length;
  const escalatedDisputes = disputes.filter(d => d.is_escalated).length;
  const resolvedDisputes = disputes.filter(d => d.status === 'resolved' || d.status === 'closed').length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-[#1D9E75] to-[#178a66] text-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </button>
          <Scale size={32} />
          <h1 className="text-3xl font-bold">
            {language === 'en' ? 'Dispute Resolution' : '纠纷调解'}
          </h1>
        </div>
        <p className="text-white/90 ml-14">
          {language === 'en' ? 'Fair, transparent, and efficient dispute resolution system' : '公正、透明、高效的纠纷解决系统'}
        </p>
      </div>

      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 mb-1">{language === 'en' ? 'Total Disputes' : '总纠纷数'}</p>
            <p className="text-2xl font-bold text-blue-900">{totalDisputes}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-600 mb-1">{language === 'en' ? 'Pending' : '待处理'}</p>
            <p className="text-2xl font-bold text-yellow-900">{pendingDisputes}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm text-orange-600 mb-1">{language === 'en' ? 'Escalated' : '已升级'}</p>
            <p className="text-2xl font-bold text-orange-900">{escalatedDisputes}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 mb-1">{language === 'en' ? 'Resolved' : '已解决'}</p>
            <p className="text-2xl font-bold text-green-900">{resolvedDisputes}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-[#1D9E75] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {language === 'en' ? 'All' : '全部'}
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'bg-[#1D9E75] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {language === 'en' ? 'Pending' : '待处理'}
            </button>
            <button
              onClick={() => setActiveTab('escalated')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'escalated'
                  ? 'bg-[#1D9E75] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {language === 'en' ? 'Escalated' : '已升级'}
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'resolved'
                  ? 'bg-[#1D9E75] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {language === 'en' ? 'Resolved' : '已解决'}
            </button>
          </div>

          <button
            onClick={() => setShowNewDisputeModal(true)}
            className="flex items-center gap-2 bg-[#1D9E75] text-white px-4 py-2 rounded-lg hover:bg-[#178a66] transition-colors"
          >
            <Plus size={20} />
            {language === 'en' ? 'Report Dispute' : '提交纠纷'}
          </button>
        </div>

        {disputes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Scale className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">
              {language === 'en' ? 'No disputes found' : '暂无纠纷记录'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((dispute) => (
              <div
                key={dispute.id}
                className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                  dispute.is_escalated ? 'border-l-4 border-orange-500' : ''
                } ${
                  isOverdue(dispute.response_due_at) && !dispute.first_response_at ? 'border-l-4 border-red-500' : ''
                }`}
                onClick={() => loadDisputeDetails(dispute.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                      {getStatusLabel(dispute.status)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(dispute.priority)}`}>
                      {dispute.priority.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {getCategoryLabel(dispute.category)}
                    </span>
                    {dispute.repeat_complaint_threshold_reached && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                        <TrendingUp size={12} />
                        {language === 'en' ? 'Repeat (5+)' : '重复投诉 (5+)'}
                      </span>
                    )}
                    {dispute.is_escalated && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {language === 'en' ? 'Escalated' : '已升级'}
                      </span>
                    )}
                    {isOverdue(dispute.response_due_at) && !dispute.first_response_at && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {language === 'en' ? 'Overdue' : '已逾期'}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(dispute.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {language === 'en' ? dispute.title_en : dispute.title_zh || dispute.title_en}
                </h3>

                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {language === 'en' ? dispute.description_en : dispute.description_zh || dispute.description_en}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <span>
                      {language === 'en' ? 'Reporter:' : '报告人：'}
                      {language === 'en'
                        ? dispute.reporter?.full_name_en
                        : dispute.reporter?.full_name_zh || dispute.reporter?.full_name_en}
                    </span>
                    {dispute.response_due_at && !dispute.first_response_at && (
                      <span className={`flex items-center gap-1 ${isOverdue(dispute.response_due_at) ? 'text-red-600' : 'text-gray-600'}`}>
                        <Clock size={14} />
                        {language === 'en' ? 'Response due:' : '响应截止：'}
                        {new Date(dispute.response_due_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <button className="flex items-center gap-1 text-[#1D9E75] hover:underline">
                    <Eye size={16} />
                    {language === 'en' ? 'View Details' : '查看详情'}
                  </button>
                </div>

                {dispute.procurement_job && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      {language === 'en' ? 'Related Job:' : '关联工单：'}
                      <span className="font-medium ml-1">{dispute.procurement_job.title}</span>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewDisputeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {language === 'en' ? 'Report Dispute' : '提交纠纷'}
              </h2>
              <button onClick={() => setShowNewDisputeModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'en' ? 'Category' : '类型'}
                  </label>
                  <select
                    value={newDispute.category}
                    onChange={(e) => setNewDispute({ ...newDispute, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  >
                    <option value="noise">{getCategoryLabel('noise')}</option>
                    <option value="transparency">{getCategoryLabel('transparency')}</option>
                    <option value="unprocessed_request">{getCategoryLabel('unprocessed_request')}</option>
                    <option value="neighbor">{getCategoryLabel('neighbor')}</option>
                    <option value="parking">{getCategoryLabel('parking')}</option>
                    <option value="pet">{getCategoryLabel('pet')}</option>
                    <option value="common_area">{getCategoryLabel('common_area')}</option>
                    <option value="owner_vs_council">{getCategoryLabel('owner_vs_council')}</option>
                    <option value="other">{getCategoryLabel('other')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'en' ? 'Priority' : '优先级'}
                  </label>
                  <select
                    value={newDispute.priority}
                    onChange={(e) => setNewDispute({ ...newDispute, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  >
                    <option value="low">{language === 'en' ? 'Low' : '低'}</option>
                    <option value="normal">{language === 'en' ? 'Normal' : '正常'}</option>
                    <option value="urgent">{language === 'en' ? 'Urgent' : '紧急'}</option>
                    <option value="emergency">{language === 'en' ? 'Emergency' : '特急'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'en' ? 'Title (English)' : '标题（英文）'}
                </label>
                <input
                  type="text"
                  value={newDispute.title_en}
                  onChange={(e) => setNewDispute({ ...newDispute, title_en: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  placeholder="Brief title of the dispute"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'en' ? 'Title (Chinese)' : '标题（中文）'}
                </label>
                <input
                  type="text"
                  value={newDispute.title_zh}
                  onChange={(e) => setNewDispute({ ...newDispute, title_zh: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  placeholder="纠纷简要标题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'en' ? 'Description (English)' : '描述（英文）'}
                </label>
                <textarea
                  value={newDispute.description_en}
                  onChange={(e) => setNewDispute({ ...newDispute, description_en: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  placeholder="Describe the dispute in detail..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'en' ? 'Description (Chinese)' : '描述（中文）'}
                </label>
                <textarea
                  value={newDispute.description_zh}
                  onChange={(e) => setNewDispute({ ...newDispute, description_zh: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  placeholder="详细描述纠纷情况..."
                />
              </div>

              {newDispute.category === 'noise' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === 'en' ? 'Frequency' : '频率'}
                      </label>
                      <select
                        value={newDispute.noise_frequency}
                        onChange={(e) => setNewDispute({ ...newDispute, noise_frequency: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                      >
                        <option value="">{language === 'en' ? 'Select...' : '选择...'}</option>
                        <option value="once">{language === 'en' ? 'Once' : '一次'}</option>
                        <option value="occasional">{language === 'en' ? 'Occasional' : '偶尔'}</option>
                        <option value="frequent">{language === 'en' ? 'Frequent' : '频繁'}</option>
                        <option value="daily">{language === 'en' ? 'Daily' : '每天'}</option>
                        <option value="constant">{language === 'en' ? 'Constant' : '持续'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === 'en' ? 'Duration (minutes)' : '持续时间（分钟）'}
                      </label>
                      <input
                        type="number"
                        value={newDispute.noise_duration_minutes}
                        onChange={(e) => setNewDispute({ ...newDispute, noise_duration_minutes: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'en' ? 'Time of Day' : '发生时间'}
                    </label>
                    <input
                      type="text"
                      value={newDispute.noise_time_of_day}
                      onChange={(e) => setNewDispute({ ...newDispute, noise_time_of_day: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                      placeholder="e.g., 10 PM - 2 AM"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={createDispute}
                  disabled={!newDispute.title_en || !newDispute.description_en}
                  className="flex-1 bg-[#1D9E75] text-white py-3 rounded-lg hover:bg-[#178a66] transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {language === 'en' ? 'Submit' : '提交'}
                </button>
                <button
                  onClick={() => setShowNewDisputeModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  {language === 'en' ? 'Cancel' : '取消'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {language === 'en' ? selectedDispute.title_en : selectedDispute.title_zh || selectedDispute.title_en}
              </h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedDispute.status)}`}>
                    {getStatusLabel(selectedDispute.status)}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedDispute.priority)}`}>
                    {selectedDispute.priority.toUpperCase()}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {getCategoryLabel(selectedDispute.category)}
                  </span>
                </div>
                <p className="text-gray-700">
                  {language === 'en' ? selectedDispute.description_en : selectedDispute.description_zh || selectedDispute.description_en}
                </p>
              </div>

              {selectedDispute.messages && selectedDispute.messages.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {language === 'en' ? 'Communication History' : '沟通记录'}
                  </h3>
                  <div className="space-y-3">
                    {selectedDispute.messages.map((message) => (
                      <div key={message.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {language === 'en'
                              ? message.sender?.full_name_en
                              : message.sender?.full_name_zh || message.sender?.full_name_en}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm">
                          {language === 'en' ? message.message_en : message.message_zh || message.message_en}
                        </p>
                        {message.is_internal_note && (
                          <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                            {language === 'en' ? 'Internal Note' : '内部备注'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isCouncilOrManager && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {language === 'en' ? 'Send Message' : '发送消息'}
                  </h3>
                  <div className="space-y-3">
                    <textarea
                      value={newMessage.message_en}
                      onChange={(e) => setNewMessage({ ...newMessage, message_en: e.target.value })}
                      rows={3}
                      placeholder={language === 'en' ? 'Type your message in English...' : '输入英文消息...'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                    />
                    <textarea
                      value={newMessage.message_zh}
                      onChange={(e) => setNewMessage({ ...newMessage, message_zh: e.target.value })}
                      rows={3}
                      placeholder={language === 'en' ? 'Type your message in Chinese...' : '输入中文消息...'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                    />
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newMessage.is_internal_note}
                          onChange={(e) => setNewMessage({ ...newMessage, is_internal_note: e.target.checked })}
                          className="rounded border-gray-300 text-[#1D9E75] focus:ring-[#1D9E75]"
                        />
                        <span className="text-sm text-gray-700">
                          {language === 'en' ? 'Internal note (not visible to parties)' : '内部备注（各方不可见）'}
                        </span>
                      </label>
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.message_en}
                        className="ml-auto px-4 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {language === 'en' ? 'Send' : '发送'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isCouncilOrManager && (
                <div className="flex gap-3 pt-4 border-t">
                  {selectedDispute.status === 'pending' && (
                    <button
                      onClick={() => updateDisputeStatus(selectedDispute.id, 'manager_reviewing')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {language === 'en' ? 'Start Review' : '开始审核'}
                    </button>
                  )}
                  {selectedDispute.status === 'manager_reviewing' && (
                    <button
                      onClick={() => updateDisputeStatus(selectedDispute.id, 'manager_mediating')}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      {language === 'en' ? 'Start Mediation' : '开始调解'}
                    </button>
                  )}
                  {!selectedDispute.is_escalated && (
                    <button
                      onClick={() => escalateToCouncil(selectedDispute.id, 'Manual escalation')}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      {language === 'en' ? 'Escalate to Council' : '升级至业委会'}
                    </button>
                  )}
                  {userRole === 'council' && (
                    <button
                      onClick={() => {
                        const resolutionEn = prompt(language === 'en' ? 'Enter resolution (English):' : '输入解决方案（英文）：');
                        const resolutionZh = prompt(language === 'en' ? 'Enter resolution (Chinese):' : '输入解决方案（中文）：');
                        if (resolutionEn) {
                          resolveDispute(selectedDispute.id, resolutionEn, resolutionZh || '');
                        }
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {language === 'en' ? 'Resolve' : '解决'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
