import { useState, useEffect } from 'react';
import {
  UserMinus,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Resident {
  id: string;
  user_id: string;
  name_en: string;
  name_zh: string | null;
  unit_no: string;
  status: string;
}

interface DeregRequest {
  id: string;
  resident_id: string;
  reason: string;
  requested_date: string;
  effective_date: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  resident?: Resident;
  reviewer?: { full_name_en: string };
}

export function DeregistrationRequest() {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [resident, setResident] = useState<Resident | null>(null);
  const [requests, setRequests] = useState<DeregRequest[]>([]);
  const [allRequests, setAllRequests] = useState<DeregRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const isCouncil = profile?.role === 'council' || profile?.role === 'admin';

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;

    const { data: residentData } = await supabase
      .from('residents')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();

    setResident(residentData);

    if (residentData) {
      const { data: myRequests } = await supabase
        .from('deregistration_requests')
        .select('*')
        .eq('resident_id', residentData.id)
        .order('created_at', { ascending: false });

      setRequests(myRequests || []);
    }

    if (isCouncil) {
      const { data: allReqs } = await supabase
        .from('deregistration_requests')
        .select(`
          *,
          resident:residents!resident_id(id, user_id, name_en, name_zh, unit_no, status),
          reviewer:profiles!deregistration_requests_reviewed_by_fkey(full_name_en)
        `)
        .order('created_at', { ascending: false });

      setAllRequests(allReqs || []);
    }

    setLoading(false);
  };

  const submitRequest = async () => {
    if (!resident || !reason.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('deregistration_requests').insert({
      resident_id: resident.id,
      reason: reason.trim(),
      effective_date: effectiveDate || null,
    });

    if (!error) {
      setReason('');
      setEffectiveDate('');
      setShowForm(false);
      await loadData();
    }
    setSubmitting(false);
  };

  const reviewRequest = async (requestId: string, decision: 'approved' | 'rejected') => {
    if (!profile) return;

    setReviewingId(requestId);
    const { error } = await supabase
      .from('deregistration_requests')
      .update({
        status: decision,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes.trim() || null,
      })
      .eq('id', requestId);

    if (!error && decision === 'approved') {
      const req = allRequests.find((r) => r.id === requestId);
      if (req) {
        await supabase
          .from('residents')
          .update({ status: 'deregistered' })
          .eq('id', req.resident_id);
      }
    }

    setReviewingId(null);
    setReviewNotes('');
    await loadData();
  };

  const statusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle size={16} className="text-green-600" />;
    if (status === 'rejected') return <XCircle size={16} className="text-red-600" />;
    return <Clock size={16} className="text-yellow-600" />;
  };

  const statusLabel = (status: string) => {
    const map: Record<string, { en: string; zh: string; cls: string }> = {
      pending: { en: 'Pending Review', zh: '待审核', cls: 'bg-yellow-100 text-yellow-800' },
      approved: { en: 'Approved', zh: '已批准', cls: 'bg-green-100 text-green-800' },
      rejected: { en: 'Rejected', zh: '已拒绝', cls: 'bg-red-100 text-red-800' },
    };
    const s = map[status] || map.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
        {statusIcon(status)}
        {language === 'en' ? s.en : s.zh}
      </span>
    );
  };

  const hasPendingRequest = requests.some((r) => r.status === 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-[#1D9E75]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Owner's View: Submit Deregistration */}
      {!isCouncil && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserMinus size={20} />
              {language === 'en' ? 'Deregistration Request' : '注销申请'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {language === 'en'
                ? 'Submit a request to deregister from the strata scheme when moving out.'
                : '搬出时提交注销物业注册的申请。'}
            </p>
          </div>

          <div className="p-6">
            {!showForm ? (
              <div>
                {hasPendingRequest ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                    <Clock className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="font-medium text-yellow-900">
                        {language === 'en' ? 'Request Pending' : '申请待审核'}
                      </p>
                      <p className="text-sm text-yellow-700 mt-1">
                        {language === 'en'
                          ? 'You already have a pending deregistration request. The committee will review it shortly.'
                          : '您已有一个待审核的注销申请。业委会将尽快审核。'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowForm(true)}
                    disabled={resident?.status === 'deregistered'}
                    className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserMinus size={18} />
                    {language === 'en' ? 'Request Deregistration' : '申请注销'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <p className="text-sm text-red-800">
                    {language === 'en'
                      ? 'Deregistration is irreversible once approved by the committee. Please ensure all outstanding fees are settled.'
                      : '注销一旦获得业委会批准将不可撤销。请确保所有未结费用已结清。'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'en' ? 'Reason for Deregistration' : '注销原因'} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    rows={3}
                    placeholder={language === 'en' ? 'Please explain your reason...' : '请说明您的注销原因...'}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'en' ? 'Effective Date (Optional)' : '生效日期（选填）'}
                  </label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={submitRequest}
                    disabled={submitting || !reason.trim()}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {language === 'en' ? 'Submit Request' : '提交申请'}
                  </button>
                  <button
                    onClick={() => { setShowForm(false); setReason(''); setEffectiveDate(''); }}
                    className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {language === 'en' ? 'Cancel' : '取消'}
                  </button>
                </div>
              </div>
            )}

            {/* My Request History */}
            {requests.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  {language === 'en' ? 'My Requests' : '我的申请记录'}
                </h4>
                <div className="space-y-2">
                  {requests.map((req) => (
                    <div key={req.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600">
                          {new Date(req.created_at).toLocaleDateString(language === 'en' ? 'en-AU' : 'zh-CN')}
                        </span>
                        {statusLabel(req.status)}
                      </div>
                      <p className="text-sm text-gray-800">{req.reason}</p>
                      {req.review_notes && (
                        <p className="text-xs text-gray-600 mt-1 italic">
                          {language === 'en' ? 'Notes: ' : '备注：'}{req.review_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Council View: Review All Requests */}
      {isCouncil && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserMinus size={20} />
              {language === 'en' ? 'Deregistration Requests' : '注销申请管理'}
            </h3>
          </div>

          {allRequests.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <UserMinus className="mx-auto mb-3 text-gray-400" size={32} />
              {language === 'en' ? 'No deregistration requests' : '暂无注销申请'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {allRequests.map((req) => (
                <div key={req.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {req.resident
                            ? (language === 'en'
                                ? req.resident.name_en
                                : (req.resident.name_zh || req.resident.name_en))
                            : '---'}
                        </span>
                        {req.resident && (
                          <span className="text-sm text-gray-500">
                            {language === 'en' ? 'Unit' : '单元'} {req.resident.unit_no}
                          </span>
                        )}
                        {statusLabel(req.status)}
                      </div>
                      <p className="text-sm text-gray-700">{req.reason}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>
                          {language === 'en' ? 'Requested: ' : '申请日期：'}
                          {new Date(req.requested_date).toLocaleDateString(language === 'en' ? 'en-AU' : 'zh-CN')}
                        </span>
                        {req.effective_date && (
                          <span>
                            {language === 'en' ? 'Effective: ' : '生效日期：'}
                            {new Date(req.effective_date).toLocaleDateString(language === 'en' ? 'en-AU' : 'zh-CN')}
                          </span>
                        )}
                        {req.reviewer && (
                          <span>
                            {language === 'en' ? 'Reviewed by: ' : '审核人：'}
                            {req.reviewer.full_name_en}
                          </span>
                        )}
                      </div>
                      {req.review_notes && (
                        <p className="text-xs text-gray-600 mt-1 italic">
                          {language === 'en' ? 'Notes: ' : '备注：'}{req.review_notes}
                        </p>
                      )}
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <input
                          type="text"
                          placeholder={language === 'en' ? 'Review notes...' : '审核备注...'}
                          value={reviewingId === req.id ? reviewNotes : ''}
                          onFocus={() => setReviewingId(req.id)}
                          onChange={(e) => { setReviewingId(req.id); setReviewNotes(e.target.value); }}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-48 focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75]"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => reviewRequest(req.id, 'approved')}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle size={14} />
                            {language === 'en' ? 'Approve' : '批准'}
                          </button>
                          <button
                            onClick={() => reviewRequest(req.id, 'rejected')}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                          >
                            <XCircle size={14} />
                            {language === 'en' ? 'Reject' : '拒绝'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
