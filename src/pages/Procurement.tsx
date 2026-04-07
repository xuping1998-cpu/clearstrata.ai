import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Clock, Eye, ArrowLeft, ShoppingCart, Briefcase, CheckCircle, AlertCircle, Wrench, Camera, FileText, Star, XCircle, Send, Loader2, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';
import {
  NewJobModal, AddQuoteModal, ApproveQuoteModal, PMCompleteModal,
  InspectionModal, ManagerListModal, AddManagerModal, RatingModal,
} from './procurement/ProcurementModals';
import { AiPricingPanel, getTrafficLight, TrafficLightBadge } from './procurement/AiPricingPanel';
import { VendorSearchPanel } from './procurement/VendorSearchPanel';
import { getCategoryLabel } from './procurement/VendorRegistry';

interface ProcurementJob {
  id: string;
  title_en: string;
  title_zh?: string;
  description_en: string;
  description_zh?: string;
  estimated_budget: number;
  status: string;
  created_at: string;
  job_type: 'maintenance' | 'procurement';
  priority?: string;
  category?: string;
  unit_number?: string;
  /** manager_tasks.id */
  task_id?: string | null;
  /** 展示用 */
  linkedTaskTitle?: string;
  selected_quote_id?: string;
  assigned_manager_id?: string;
  pm_completion_notes?: string;
  pm_completed_at?: string;
  inspection_result?: string;
  inspection_notes?: string;
  approved_cost?: number;
  ai_estimate_low?: number;
  ai_estimate_high?: number;
  ai_estimate_reasoning?: string;
  ai_material_calc?: string;
  quotes?: ProcurementQuote[];
  manager?: { full_name_en: string; full_name_zh: string };
}

interface ProcurementQuote {
  id: string;
  vendor_name: string;
  vendor_contact: string;
  quoted_amount: number;
  description_en?: string;
  description_zh?: string;
}

interface PropertyManager {
  id: string;
  full_name_en: string;
  full_name_zh: string;
  email: string;
  phone: string;
  status: string;
}

const STATUS_CONFIG: Record<string, { en: string; zh: string; color: string; icon: string }> = {
  collecting_quotes: { en: 'Collecting Quotes', zh: '收集报价中', color: 'bg-yellow-100 text-yellow-800', icon: 'clock' },
  pending_approval: { en: 'Pending Approval', zh: '待审批', color: 'bg-orange-100 text-orange-800', icon: 'clock' },
  pm_executing: { en: 'PM Executing', zh: '物业经理执行中', color: 'bg-blue-100 text-blue-800', icon: 'wrench' },
  pending_inspection: { en: 'Pending Inspection', zh: '待验收', color: 'bg-amber-100 text-amber-800', icon: 'eye' },
  inspection_passed: { en: 'Inspection Passed', zh: '验收通过', color: 'bg-emerald-100 text-emerald-800', icon: 'check' },
  inspection_failed: { en: 'Inspection Failed', zh: '验收不通过', color: 'bg-red-100 text-red-800', icon: 'x' },
  approved: { en: 'Approved', zh: '已批准', color: 'bg-green-100 text-green-800', icon: 'check' },
  completed: { en: 'Completed', zh: '已完成', color: 'bg-gray-100 text-gray-800', icon: 'check' },
  cancelled: { en: 'Cancelled', zh: '已取消', color: 'bg-gray-100 text-gray-600', icon: 'x' },
};

const WORKFLOW_STEPS = [
  { key: 'collecting_quotes', en: 'Collect Quotes', zh: '收集报价' },
  { key: 'pm_executing', en: 'PM Executing', zh: '物业执行' },
  { key: 'pending_inspection', en: 'Inspection', zh: '验收' },
  { key: 'inspection_passed', en: 'Invoice & Pay', zh: '发票付款' },
  { key: 'completed', en: 'Done', zh: '完成' },
];

function getStepIndex(status: string): number {
  if (status === 'collecting_quotes' || status === 'pending_approval') return 0;
  if (status === 'pm_executing' || status === 'approved') return 1;
  if (status === 'pending_inspection' || status === 'inspection_failed') return 2;
  if (status === 'inspection_passed') return 3;
  if (status === 'completed') return 4;
  return 0;
}

function StatusIcon({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.collecting_quotes;
  switch (cfg.icon) {
    case 'clock': return <Clock size={16} />;
    case 'wrench': return <Wrench size={16} />;
    case 'eye': return <Eye size={16} />;
    case 'check': return <CheckCircle size={16} />;
    case 'x': return <XCircle size={16} />;
    default: return <AlertCircle size={16} />;
  }
}

export function Procurement() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { profile } = useAuth();
  const { currentPropertyId, roleInProperty } = useProperty();
  const [jobs, setJobs] = useState<ProcurementJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertyManagers, setPropertyManagers] = useState<PropertyManager[]>([]);

  const [modal, setModal] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<ProcurementJob | null>(null);

  const l = language === 'en';
  const isCouncil =
    roleInProperty === 'council' ||
    roleInProperty === 'property_admin' ||
    roleInProperty === 'admin';

  const loadJobs = async () => {
    if (!profile || !currentPropertyId) return;
    setLoading(true);
    try {
      const { data: jobsData } = await supabase
        .from('procurement_jobs')
        .select('*, manager:property_managers!procurement_jobs_assigned_manager_id_fkey(full_name_en, full_name_zh)')
        .eq('property_id', currentPropertyId)
        .order('created_at', { ascending: false });

      const jobsWithQuotes = await Promise.all(
        (jobsData || []).map(async (job) => {
          const { data: quotesData } = await supabase
            .from('procurement_quotes')
            .select('*')
            .eq('job_id', job.id)
            .order('quoted_amount', { ascending: true });
          return { ...job, quotes: quotesData || [] };
        })
      );
      const taskIds = [
        ...new Set(
          jobsWithQuotes.map((j) => j.task_id).filter((x): x is string => Boolean(x))
        ),
      ];
      const taskTitleMap = new Map<string, string>();
      if (taskIds.length > 0) {
        const { data: mt } = await supabase.from('manager_tasks').select('id, title').in('id', taskIds);
        for (const t of mt ?? []) taskTitleMap.set(t.id, t.title || '—');
      }
      setJobs(
        jobsWithQuotes.map((j) => ({
          ...j,
          linkedTaskTitle: j.task_id ? taskTitleMap.get(j.task_id) : undefined,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPropertyManagers = async () => {
    if (!currentPropertyId) {
      setPropertyManagers([]);
      return;
    }
    const { data } = await supabase
      .from('property_managers')
      .select('*')
      .eq('property_id', currentPropertyId)
      .eq('status', 'active')
      .order('full_name_en');
    setPropertyManagers(data || []);
  };

  const markCompleted = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    const now = new Date().toISOString();
    await supabase.from('procurement_jobs').update({ status: 'completed', completed_at: now }).eq('id', jobId);

    if (job) {
      const selectedQuote = job.quotes?.find(q => q.id === job.selected_quote_id);
      if (selectedQuote) {
        await supabase.from('price_history').insert({
          property_id: currentPropertyId!,
          job_id: jobId,
          job_type: job.job_type,
          category: job.category || '',
          title: job.title_zh || job.title_en,
          description: job.description_zh || job.description_en,
          final_price: selectedQuote.quoted_amount,
          vendor_name: selectedQuote.vendor_name,
          completed_at: now,
        });
      }
    }

    loadJobs();
  };

  const deleteJob = async (jobId: string) => {
    const { error: auditError } = await supabase
      .from('procurement_audit_log')
      .insert({
        property_id: currentPropertyId!,
        job_id: jobId,
        action: 'DELETE',
        performed_by: profile?.id,
      });
    if (auditError) {
      alert(l ? `Failed to write audit log: ${auditError.message}` : `写入审计日志失败：${auditError.message}`);
      return;
    }

    const { error } = await supabase.from('procurement_jobs').delete().eq('id', jobId);
    if (error) {
      alert(l ? `Failed to delete: ${error.message}` : `删除失败：${error.message}`);
      return;
    }
    loadJobs();
  };

  const resendToPM = async (jobId: string) => {
    await supabase.from('procurement_jobs').update({
      status: 'pm_executing',
      inspection_result: null,
      inspection_notes: null,
      inspected_by: null,
      inspected_at: null,
      pm_completion_notes: null,
      pm_completed_at: null,
    }).eq('id', jobId);
    loadJobs();
  };

  useEffect(() => {
    if (profile && currentPropertyId) {
      void loadJobs();
      void loadPropertyManagers();
    }
  }, [profile, currentPropertyId]);

  const openModal = (name: string, job?: ProcurementJob) => {
    if (job) setSelectedJob(job);
    setModal(name);
  };
  const closeModal = () => { setModal(null); };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-[#1D9E75]" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors">
          <ArrowLeft size={20} />
          {l ? 'Back to Dashboard' : '返回仪表板'}
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{l ? 'Procurement & Maintenance' : '采购维修'}</h1>
            <p className="text-gray-600 mt-2">
              {l
                ? 'Quotes & vendor selection live here. Upload the final invoice and run approval in Financial Reports → Invoice Management.'
                : '报价录入、比价、业委会批准在本页完成；正式发票请至「财务报表 → 发票管理」上传与审批。'}
            </p>
          </div>
          {isCouncil && (
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => openModal('managers')} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <Briefcase size={20} />
                {l ? 'Property Managers' : '物业经理'}
              </button>
              <button onClick={() => openModal('newJob')} className="flex items-center gap-2 bg-[#1D9E75] text-white px-4 py-2 rounded-lg hover:bg-[#178a66] transition-colors">
                <Plus size={20} />
                {l ? 'New Request' : '新建申请'}
              </button>
            </div>
          )}
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">{l ? 'No requests' : '暂无申请'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} language={language} isCouncil={isCouncil}
              onOpenModal={openModal} onMarkCompleted={markCompleted} onResendToPM={resendToPM} onDelete={deleteJob} />
          ))}
        </div>
      )}

      {modal === 'newJob' && (
        <NewJobModal language={language} profile={profile}
          onClose={closeModal} onCreated={loadJobs} />
      )}
      {modal === 'addQuote' && selectedJob && (
        <AddQuoteModal language={language} profile={profile} selectedJob={selectedJob}
          onClose={closeModal} onAdded={loadJobs} />
      )}
      {modal === 'approveQuote' && selectedJob && (
        <ApproveQuoteModal language={language} profile={profile} selectedJob={selectedJob}
          propertyManagers={propertyManagers} onClose={closeModal} onApproved={loadJobs}
          onAddManager={() => { closeModal(); setTimeout(() => openModal('addManager'), 100); }} />
      )}
      {modal === 'pmComplete' && selectedJob && (
        <PMCompleteModal language={language} selectedJob={selectedJob}
          onClose={closeModal} onCompleted={loadJobs} />
      )}
      {modal === 'inspection' && selectedJob && (
        <InspectionModal language={language} profile={profile} selectedJob={selectedJob}
          onClose={closeModal} onInspected={loadJobs} />
      )}
      {modal === 'managers' && (
        <ManagerListModal language={language} propertyManagers={propertyManagers}
          onClose={closeModal} onAddManager={() => { closeModal(); setTimeout(() => openModal('addManager'), 100); }} />
      )}
      {modal === 'addManager' && (
        <AddManagerModal language={language} onClose={closeModal} onAdded={() => { loadPropertyManagers(); closeModal(); }} />
      )}
      {modal === 'rating' && selectedJob && (
        <RatingModal language={language} selectedJob={selectedJob} onClose={closeModal} onDone={loadJobs} />
      )}
    </div>
  );
}

function JobCard({
  job, language, isCouncil, onOpenModal, onMarkCompleted, onResendToPM, onDelete,
}: {
  job: ProcurementJob;
  language: string;
  isCouncil: boolean;
  onOpenModal: (name: string, job?: ProcurementJob) => void;
  onMarkCompleted: (id: string) => void;
  onResendToPM: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const l = language === 'en';
  const sc = STATUS_CONFIG[job.status] || STATUS_CONFIG.collecting_quotes;
  const stepIdx = getStepIndex(job.status);
  const selectedQuote = job.quotes?.find(q => q.id === job.selected_quote_id);

  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${job.job_type === 'maintenance' ? 'border-orange-500' : 'border-[#1D9E75]'}`}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className={`px-2 py-1 rounded text-xs font-semibold ${job.job_type === 'maintenance' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                {job.job_type === 'maintenance' ? (l ? 'Maintenance' : '维修') : (l ? 'Procurement' : '采购')}
              </span>
              {job.category && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
                  {getCategoryLabel(job.category, language)}
                </span>
              )}
              <h3 className="text-xl font-semibold text-gray-900">
                {l ? job.title_en : job.title_zh || job.title_en}
              </h3>
            </div>
            {job.task_id && job.linkedTaskTitle ? (
              <div className="mb-2 text-sm">
                <span className="text-gray-500">{l ? 'Linked task: ' : '关联任务：'}</span>
                <Link
                  to={`/property-admin/tasks/${job.task_id}`}
                  className="font-medium text-[#1D9E75] hover:underline"
                >
                  {job.linkedTaskTitle}
                </Link>
              </div>
            ) : null}
            <p className="text-gray-600 text-sm mb-3">{l ? job.description_en : job.description_zh || job.description_en}</p>
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="text-gray-700">
                {l ? 'Budget' : '预算'}: <span className="text-[#1D9E75] font-semibold">${job.estimated_budget?.toLocaleString()}</span>
              </span>
              {selectedQuote && (
                <span className="text-gray-700">
                  {l ? 'Approved' : '批准价'}: <span className="font-semibold text-blue-700">${selectedQuote.quoted_amount.toLocaleString()}</span>
                  <span className="text-gray-500 ml-1">({selectedQuote.vendor_name})</span>
                </span>
              )}
              {job.manager && (
                <span className="text-gray-700">
                  {l ? 'PM' : '物业经理'}: <span className="font-medium">{l ? job.manager.full_name_en : job.manager.full_name_zh}</span>
                </span>
              )}
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${sc.color}`}>
            <StatusIcon status={job.status} />
            {l ? sc.en : sc.zh}
          </span>
        </div>

        <WorkflowStepper currentStep={stepIdx} language={language} failed={job.status === 'inspection_failed'} />
      </div>

      {job.status === 'collecting_quotes' && (
        <div className="px-6 pb-4">
          <AiPricingPanel
            jobId={job.id}
            title={job.title_zh || job.title_en}
            description={job.description_zh || job.description_en}
            jobType={job.job_type}
            category={job.category || ''}
            estimatedBudget={job.estimated_budget || 0}
            language={language}
            aiEstimateLow={job.ai_estimate_low}
            aiEstimateHigh={job.ai_estimate_high}
            aiEstimateReasoning={job.ai_estimate_reasoning}
            aiMaterialCalc={job.ai_material_calc}
          />

          <VendorSearchPanel
            jobId={job.id}
            jobTitle={job.title_zh || job.title_en}
            jobDescription={job.description_zh || job.description_en}
            category={job.category || ''}
            language={language}
          />

          {(job.quotes?.length || 0) > 0 && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="font-semibold text-gray-900 text-sm">供应商报价</h4>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(job.quotes?.length || 0) >= 3 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                  {job.quotes?.length || 0} / 3
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {job.quotes?.map((quote, idx) => {
                  const hasEstimate = job.ai_estimate_low && job.ai_estimate_high;
                  const light = hasEstimate
                    ? getTrafficLight(quote.quoted_amount, job.ai_estimate_low!, job.ai_estimate_high!)
                    : null;

                  return (
                    <div key={quote.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-500">供应商 {idx + 1}</span>
                        <div className="flex items-center gap-1.5">
                          {light && <TrafficLightBadge light={light} language={language} />}
                          {idx === 0 && <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">最低价</span>}
                        </div>
                      </div>
                      <div className="font-medium text-gray-900 text-sm">{quote.vendor_name}</div>
                      <div className="text-lg font-bold text-[#1D9E75] mt-1">${quote.quoted_amount.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <div className="px-6 pb-5 flex flex-wrap gap-2">
        {isCouncil && job.status === 'collecting_quotes' && (
          <button onClick={() => onOpenModal('addQuote', job)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#1D9E75] bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <Plus size={16} />
            {l ? 'Add Quote' : '添加报价'}
          </button>
        )}

        {isCouncil && job.status === 'collecting_quotes' && (job.quotes?.length || 0) >= 1 && (
          <button onClick={() => onOpenModal('approveQuote', job)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors">
            <Send size={16} />
            {l ? 'Approve & Notify PM' : '批准并通知物业经理'}
          </button>
        )}

        {job.status === 'pm_executing' && (
          <button onClick={() => onOpenModal('pmComplete', job)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Camera size={16} />
            {l ? 'Upload Photos & Mark Complete' : '上传照片并标记完工'}
          </button>
        )}

        {isCouncil && job.status === 'pending_inspection' && (
          <button onClick={() => onOpenModal('inspection', job)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
            <Eye size={16} />
            {l ? 'Inspect Work' : '验收'}
          </button>
        )}

        {isCouncil && job.status === 'inspection_failed' && (
          <button onClick={() => onResendToPM(job.id)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            <Wrench size={16} />
            {l ? 'Send Back to PM for Rework' : '退回物业经理重做'}
          </button>
        )}

        {job.status === 'inspection_passed' && (
          <>
            <Link
              to="/finance?tab=invoices"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <FileText size={16} />
              {l ? 'Open Finance → Invoices' : '财务报表 · 上传/审批发票'}
            </Link>
            {isCouncil && (
              <button onClick={() => onMarkCompleted(job.id)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                <CheckCircle size={16} />
                {l ? 'Mark Completed' : '标记完成'}
              </button>
            )}
          </>
        )}

        {job.status === 'completed' && (
          <button onClick={() => onOpenModal('rating', job)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
            <Star size={16} />
            {l ? 'Rate Vendor' : '评价供应商'}
          </button>
        )}

        {isCouncil && (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors ml-auto">
            <Trash2 size={16} />
            {l ? 'Delete' : '删除'}
          </button>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="px-6 pb-5">
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium">
              {l ? 'Are you sure you want to delete this request?' : '确定删除此工单吗？'}
            </p>
            <div className="flex items-center gap-2 ml-4 shrink-0">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                {l ? 'Cancel' : '取消'}
              </button>
              <button onClick={() => { setShowDeleteConfirm(false); onDelete(job.id); }}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                {l ? 'Confirm Delete' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkflowStepper({ currentStep, language, failed }: { currentStep: number; language: string; failed?: boolean }) {
  const l = language === 'en';
  return (
    <div className="flex items-center gap-1 mt-4 mb-2">
      {WORKFLOW_STEPS.map((step, idx) => {
        const isActive = idx === currentStep;
        const isDone = idx < currentStep;
        const isFailed = failed && idx === currentStep;

        let dotColor = 'bg-gray-300';
        let lineColor = 'bg-gray-200';
        let textColor = 'text-gray-400';

        if (isDone) { dotColor = 'bg-[#1D9E75]'; lineColor = 'bg-[#1D9E75]'; textColor = 'text-[#1D9E75]'; }
        else if (isFailed) { dotColor = 'bg-red-500'; textColor = 'text-red-600'; }
        else if (isActive) { dotColor = 'bg-[#1D9E75] ring-4 ring-green-100'; textColor = 'text-gray-900 font-semibold'; }

        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-3 h-3 rounded-full transition-all ${dotColor}`} />
              <span className={`text-[10px] mt-1 text-center leading-tight ${textColor}`}>
                {l ? step.en : step.zh}
              </span>
            </div>
            {idx < WORKFLOW_STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 -mt-3 ${isDone ? lineColor : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
