import { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Camera, Send, Mail, Phone, CheckCircle, XCircle, Image as ImageIcon, Search, Globe, Loader2, ExternalLink, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProperty } from '../../contexts/PropertyContext';
import { MAX_QUOTE_ATTACHMENTS, PhotoUpload } from '../../components/PhotoUpload';
import { InvoiceUpload } from '../../components/InvoiceUpload';
import { VendorRating } from '../../components/VendorRating';
import { getTrafficLight, TrafficLightBadge } from './AiPricingPanel';
import { SERVICE_CATEGORIES } from './VendorRegistry';

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
  /** 关联 manager_tasks */
  task_id?: string | null;
  selected_quote_id?: string;
  assigned_manager_id?: string;
  pm_completion_notes?: string;
  pm_completed_at?: string;
  inspection_result?: string;
  inspection_notes?: string;
  ai_estimate_low?: number;
  ai_estimate_high?: number;
  ai_estimate_reasoning?: string;
  quotes?: ProcurementQuote[];
  completionPhotos?: { id: string; photo_url: string }[];
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

export interface SearchedVendor {
  company_name: string;
  phone: string;
  website: string;
  address: string;
  description_en: string;
  description_zh: string;
  service_match: string;
}

export function NewJobModal({
  language,
  profile,
  onClose,
  onCreated,
}: {
  language: string;
  profile: any;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { currentPropertyId } = useProperty();
  const l = language === 'en';
  const [error, setError] = useState('');
  const [_requestPhotos, setRequestPhotos] = useState<string[]>([]);
  const [step, setStep] = useState<'form' | 'searching' | 'select_vendors' | 'sending'>('form');
  const [searchedVendors, setSearchedVendors] = useState<SearchedVendor[]>([]);
  const [selectedVendorIdxs, setSelectedVendorIdxs] = useState<Set<number>>(new Set());
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [searchCount, setSearchCount] = useState(0);
  const [newJob, setNewJob] = useState({
    title_en: '', title_zh: '', description_en: '', description_zh: '',
    estimated_budget: '', job_type: 'procurement' as 'maintenance' | 'procurement',
    priority: 'medium', category: '', unit_number: '',
  });
  const [linkedTaskId, setLinkedTaskId] = useState('');
  const [managerTasks, setManagerTasks] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!currentPropertyId) {
      setManagerTasks([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('manager_tasks')
        .select('id, title')
        .eq('property_id', currentPropertyId)
        .order('created_at', { ascending: false })
        .limit(80);
      if (!cancelled) setManagerTasks((data ?? []).map((r) => ({ id: r.id, title: r.title || '—' })));
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPropertyId]);

  const createJobAndSearch = async () => {
    if (!profile || !currentPropertyId) return;
    setError('');
    if (!newJob.title_en && !newJob.title_zh) { setError(l ? 'Please enter a title' : '请输入标题'); return; }
    if (!newJob.description_en && !newJob.description_zh) { setError(l ? 'Please enter a description' : '请输入描述'); return; }

    try {
      const { data, error: insertError } = await supabase.from('procurement_jobs').insert({
        property_id: currentPropertyId,
        posted_by: profile.id,
        title_en: newJob.title_en || newJob.title_zh,
        title_zh: newJob.title_zh || newJob.title_en,
        description_en: newJob.description_en || newJob.description_zh,
        description_zh: newJob.description_zh || newJob.description_en,
        estimated_budget: newJob.estimated_budget ? parseFloat(newJob.estimated_budget) : 0,
        status: 'collecting_quotes',
        job_type: newJob.job_type,
        priority: newJob.priority,
        category: newJob.category,
        unit_number: newJob.unit_number,
        task_id: linkedTaskId.trim() || null,
      }).select().single();

      if (insertError) { setError(l ? `Error: ${insertError.message}` : `错误：${insertError.message}`); return; }
      if (!data) return;

      setCreatedJobId(data.id);
      setStep('searching');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-quotes`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newJob.title_zh || newJob.title_en,
          description: newJob.description_zh || newJob.description_en,
          category: newJob.category,
        }),
      });
      const result = await response.json();

      if (result.success && result.vendors) {
        setSearchedVendors(result.vendors);
        setSearchCount(result.ai_search_count || result.vendors.length);
        const allIdxs = new Set<number>();
        result.vendors.forEach((_: any, idx: number) => allIdxs.add(idx));
        setSelectedVendorIdxs(allIdxs);
        setStep('select_vendors');
      } else {
        setStep('select_vendors');
      }
    } catch {
      setError(l ? 'An unexpected error occurred' : '发生意外错误');
      setStep('form');
    }
  };

  const sendInvitations = async () => {
    if (!createdJobId || !profile || !currentPropertyId) return;
    setStep('sending');
    try {
      const selectedVendors = Array.from(selectedVendorIdxs).map(idx => searchedVendors[idx]).filter(Boolean);
      for (const v of selectedVendors) {
        await supabase.from('procurement_quotes').insert({
          property_id: currentPropertyId,
          job_id: createdJobId,
          task_id: linkedTaskId.trim() || null,
          vendor_name: v.company_name,
          vendor_contact: v.phone || v.website || '',
          quoted_amount: 0,
          description_en: `Quote invitation sent to vendor found via AI web search`,
          description_zh: `已向AI实时搜索到的供应商发送询价邀请`,
          submitted_by: profile.id,
        });
      }
      onClose();
      onCreated();
    } catch {
      setError(l ? 'Failed to send invitations' : '发送询价邀请失败');
      setStep('select_vendors');
    }
  };

  const skipAndClose = () => {
    onClose();
    onCreated();
  };

  const toggleVendor = (idx: number) => {
    setSelectedVendorIdxs(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedVendorIdxs.size === searchedVendors.length) {
      setSelectedVendorIdxs(new Set());
    } else {
      const all = new Set<number>();
      searchedVendors.forEach((_, idx) => all.add(idx));
      setSelectedVendorIdxs(all);
    }
  };

  if (step === 'searching') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-blue-600 animate-pulse" size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {l ? 'AI is Searching for Vendors...' : 'AI 正在搜索供应商...'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {l ? 'Searching web for local Vancouver/UBC area vendors matching your requirements' : '正在搜索温哥华/UBC区域符合需求的本地供应商'}
          </p>
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0ms]" />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    );
  }

  if (step === 'select_vendors' || step === 'sending') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900">
              {l ? 'Select Vendors to Invite' : '选择供应商发送询价'}
            </h2>
            <button onClick={skipAndClose} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {l
              ? `Found ${searchCount} vendor(s) via real-time AI web search. Select which vendors to send quote invitations to.`
              : `通过AI实时网络搜索找到 ${searchCount} 家供应商。请选择要发送询价邀请的供应商。`}
          </p>

          {searchedVendors.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl mb-4">
              <Search className="mx-auto text-gray-300 mb-3" size={36} />
              <p className="text-gray-500 mb-1">{l ? 'No vendors found' : '未搜索到匹配的供应商'}</p>
              <p className="text-xs text-gray-400">{l ? 'You can add quotes manually later' : '您可以稍后手动添加报价'}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <button onClick={toggleAll} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  {selectedVendorIdxs.size === searchedVendors.length
                    ? (l ? 'Deselect All' : '取消全选')
                    : (l ? 'Select All' : '全选')}
                </button>
                <span className="text-xs text-gray-500">
                  {l
                    ? `${selectedVendorIdxs.size} of ${searchedVendors.length} selected`
                    : `已选 ${selectedVendorIdxs.size} / ${searchedVendors.length}`}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="text-blue-600" size={15} />
                  <span className="text-sm font-semibold text-gray-700">
                    {l ? 'Real-time Search Results' : 'AI实时搜索结果'}
                  </span>
                </div>
                <div className="space-y-2">
                  {searchedVendors.map((v, idx) => (
                    <VendorSearchCard
                      key={idx}
                      vendor={v}
                      selected={selectedVendorIdxs.has(idx)}
                      onToggle={() => toggleVendor(idx)}
                      language={language}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2 border-t border-gray-200 mt-4">
            <button
              onClick={sendInvitations}
              disabled={selectedVendorIdxs.size === 0 || step === 'sending'}
              className="flex-1 flex items-center justify-center gap-2 bg-clearstrata-ui-primary text-white py-2.5 rounded-lg hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 'sending' ? (
                <><Loader2 className="animate-spin" size={16} /> {l ? 'Sending...' : '发送中...'}</>
              ) : (
                <><Send size={16} /> {l ? `Send to ${selectedVendorIdxs.size} Vendor(s)` : `向 ${selectedVendorIdxs.size} 家发送询价`}</>
              )}
            </button>
            <button onClick={skipAndClose}
              className="px-6 bg-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-300 transition-colors font-medium">
              {l ? 'Skip' : '跳过'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{l ? 'New Request' : '新建申请'}</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle size={18} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Type' : '类型'}</label>
            <select value={newJob.job_type} onChange={(e) => setNewJob({ ...newJob, job_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent">
              <option value="maintenance">{l ? 'Maintenance Request' : '维修申请'}</option>
              <option value="procurement">{l ? 'Procurement Project' : '采购项目'}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Service Category' : '服务类别'}</label>
            <select
              value={newJob.category}
              onChange={(e) => setNewJob({ ...newJob, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent"
            >
              <option value="">{l ? 'Select category...' : '请选择类别...'}</option>
              {SERVICE_CATEGORIES.map(c => (
                <option key={c.key} value={c.key}>{l ? c.en : c.zh}</option>
              ))}
            </select>
          </div>

          {newJob.job_type === 'maintenance' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Priority' : '优先级'}</label>
                <select value={newJob.priority} onChange={(e) => setNewJob({ ...newJob, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent">
                  <option value="low">{l ? 'Low' : '低'}</option>
                  <option value="medium">{l ? 'Medium' : '中'}</option>
                  <option value="high">{l ? 'High' : '高'}</option>
                  <option value="urgent">{l ? 'Urgent' : '紧急'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Unit Number' : '单元号'}</label>
                <input type="text" value={newJob.unit_number} onChange={(e) => setNewJob({ ...newJob, unit_number: e.target.value })}
                  placeholder={l ? 'e.g., 808' : '例如：808'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Title' : '标题'} (English)</label>
            <input type="text" value={newJob.title_en} onChange={(e) => { setNewJob({ ...newJob, title_en: e.target.value }); setError(''); }}
              placeholder={l ? 'e.g., Replace Thermostat' : '例如：Replace Thermostat'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Title' : '标题'} ({'\u4E2D\u6587'})</label>
            <input type="text" value={newJob.title_zh} onChange={(e) => { setNewJob({ ...newJob, title_zh: e.target.value }); setError(''); }}
              placeholder={l ? 'e.g., 更换恒温器' : '例如：更换恒温器'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Description' : '描述'} (English)</label>
            <textarea value={newJob.description_en} onChange={(e) => { setNewJob({ ...newJob, description_en: e.target.value }); setError(''); }}
              placeholder={l ? 'Describe the issue or requirement...' : '描述问题或需求...'} rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Description' : '描述'} ({'\u4E2D\u6587'})</label>
            <textarea value={newJob.description_zh} onChange={(e) => { setNewJob({ ...newJob, description_zh: e.target.value }); setError(''); }}
              placeholder={l ? '描述问题或需求...' : '描述问题或需求...'} rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Estimated Budget (Optional)' : '预算金额（可选）'}</label>
            <input type="number" value={newJob.estimated_budget} onChange={(e) => { setNewJob({ ...newJob, estimated_budget: e.target.value }); setError(''); }}
              placeholder={l ? 'Leave blank if unknown' : '不清楚可留空'} min="0" step="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {l ? 'Link to manager task (optional)' : '关联物业经理任务（可选）'}
            </label>
            <select
              value={linkedTaskId}
              onChange={(e) => setLinkedTaskId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent"
            >
              <option value="">{l ? '— None —' : '— 不关联 —'}</option>
              {managerTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {l
                ? 'Connects this quote workflow to a task (why we are doing this work).'
                : '将本采购/维修报价流程与任务关联，便于形成「任务 → 报价 → 发票」链路。'}
            </p>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="text-gray-600" size={20} />
              <h3 className="text-sm font-semibold text-gray-900">
                {l ? 'Upload quote materials (optional)' : '上传报价资料（可选）'}
              </h3>
            </div>
            <PhotoUpload
              variant="quote_attachments"
              photoType="request"
              onPhotosUploaded={(urls) => setRequestPhotos(urls)}
              maxPhotos={MAX_QUOTE_ATTACHMENTS}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Search className="text-blue-600 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {l ? 'AI will search for vendors' : 'AI将自动搜索供应商'}
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  {l
                    ? 'After submitting, AI will search the web for local Vancouver vendors matching your requirements. You can then choose which vendors to invite for quotes.'
                    : '提交后，AI将在网上搜索温哥华本地匹配的供应商。您可以选择向哪些供应商发送询价邀请。'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={createJobAndSearch}
              className="flex-1 flex items-center justify-center gap-2 bg-clearstrata-ui-primary text-white py-2.5 rounded-lg hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive transition-colors font-medium">
              <Search size={16} />
              {l ? 'Submit & Search Vendors' : '提交并搜索供应商'}
            </button>
            <button onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-300 transition-colors font-medium">
              {l ? 'Cancel' : '取消'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VendorSearchCard({
  vendor,
  selected,
  onToggle,
  language,
}: {
  vendor: SearchedVendor;
  selected: boolean;
  onToggle: () => void;
  language: string;
}) {
  const l = language === 'en';

  return (
    <label
      className={`block p-3 border-2 rounded-xl cursor-pointer transition-all ${
        selected ? 'border-clearstrata-ui-primary bg-clearstrata-ui-soft/50' : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1 w-4 h-4 text-clearstrata-ui-primary rounded focus:ring-clearstrata-ui-primary shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{vendor.company_name}</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200">
              <Globe size={9} />
              {l ? 'Live search' : '实时搜索'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-1.5">
            {vendor.phone && (
              <span className="flex items-center gap-1">
                <Phone size={11} className="text-gray-400" />
                {vendor.phone}
              </span>
            )}
            {vendor.website && (
              <span className="flex items-center gap-1 truncate max-w-[200px]">
                <ExternalLink size={11} className="text-gray-400 shrink-0" />
                {vendor.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </span>
            )}
            {vendor.address && (
              <span className="truncate max-w-[200px]">{vendor.address}</span>
            )}
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            {l ? vendor.description_en : vendor.description_zh || vendor.description_en}
          </p>
        </div>
      </div>
    </label>
  );
}

export function AddQuoteModal({
  language, profile, selectedJob, onClose, onAdded,
}: {
  language: string; profile: any; selectedJob: ProcurementJob; onClose: () => void; onAdded: () => void;
}) {
  const { currentPropertyId } = useProperty();
  const l = language === 'en';
  const [q, setQ] = useState({ vendor_name: '', vendor_contact: '', quoted_amount: '', description_en: '', description_zh: '' });

  const addQuote = async () => {
    if (!profile || !selectedJob || !currentPropertyId) return;
    const { error } = await supabase.from('procurement_quotes').insert({
      property_id: currentPropertyId,
      job_id: selectedJob.id,
      task_id: selectedJob.task_id ?? null,
      vendor_name: q.vendor_name,
      vendor_contact: q.vendor_contact,
      quoted_amount: parseFloat(q.quoted_amount),
      description_en: q.description_en,
      description_zh: q.description_zh,
      submitted_by: profile.id,
    });
    if (error) { console.error('Error adding quote:', error); return; }
    onClose();
    onAdded();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{l ? 'Add Vendor Quote' : '添加供应商报价'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Vendor Name' : '供应商名称'}</label>
            <input type="text" value={q.vendor_name} onChange={(e) => setQ({ ...q, vendor_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Contact' : '联系人'}</label>
            <input type="text" value={q.vendor_contact} onChange={(e) => setQ({ ...q, vendor_contact: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Quoted Amount ($)' : '报价金额 ($)'}</label>
            <input type="number" value={q.quoted_amount} onChange={(e) => setQ({ ...q, quoted_amount: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Details (Optional)' : '详情（可选）'}</label>
            <textarea value={q.description_en} onChange={(e) => setQ({ ...q, description_en: e.target.value })} rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent" />
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={addQuote} className="flex-1 bg-clearstrata-ui-primary text-white py-2 rounded-lg hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive transition-colors font-medium">
              {l ? 'Add Quote' : '添加报价'}
            </button>
            <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium">
              {l ? 'Cancel' : '取消'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ApproveQuoteModal({
  language, profile, selectedJob, propertyManagers, onClose, onApproved, onAddManager,
}: {
  language: string; profile: any; selectedJob: ProcurementJob;
  propertyManagers: PropertyManager[]; onClose: () => void; onApproved: () => void;
  onAddManager?: () => void;
}) {
  const { currentPropertyId } = useProperty();
  const l = language === 'en';
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('');
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const missingQuote = !selectedQuoteId;
  const missingManager = !selectedManagerId;
  const canSubmit = !missingQuote && !missingManager && !submitting;

  const handleApprove = async () => {
    if (!canSubmit || !profile || !currentPropertyId) return;
    setSubmitting(true);
    try {
      const selectedQuote = selectedJob.quotes?.find(q => q.id === selectedQuoteId);
      const { error } = await supabase
        .from('procurement_jobs')
        .update({
          status: 'pm_executing',
          selected_quote_id: selectedQuoteId,
          assigned_manager_id: selectedManagerId,
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
          approved_cost: selectedQuote?.quoted_amount,
        })
        .eq('property_id', currentPropertyId)
        .eq('id', selectedJob.id);

      if (error) throw error;

      if (selectedJob.task_id) {
        await supabase
          .from('procurement_quotes')
          .update({ task_id: selectedJob.task_id, property_id: currentPropertyId })
          .eq('job_id', selectedJob.id)
          .eq('property_id', currentPropertyId);
      }

      await supabase.from('procurement_quote_notifications').insert({
        property_id: currentPropertyId,
        job_id: selectedJob.id,
        sent_to_manager_id: selectedManagerId,
        sent_by: profile.id,
        message_en: `Approved quote from ${selectedQuote?.vendor_name} ($${selectedQuote?.quoted_amount}). Please arrange execution.`,
        message_zh: `已批准${selectedQuote?.vendor_name}的报价 ($${selectedQuote?.quoted_amount})。请安排施工。`,
      });

      setSuccessMsg(l ? 'Approved! Notification sent to Property Manager.' : '已批准，通知已发送给物业经理');
      setTimeout(() => {
        onClose();
        onApproved();
      }, 1500);
    } catch (err: any) {
      alert(l ? `Error: ${err.message}` : `错误：${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (successMsg) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-clearstrata-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-clearstrata-ui-primary" size={32} />
          </div>
          <p className="text-lg font-semibold text-gray-900">{successMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{l ? 'Approve Quote & Assign PM' : '批准报价并指定物业经理'}</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {l ? 'Step 1: Select a Quote' : '第一步：选择报价'}
          </h3>
          {(!selectedJob.quotes || selectedJob.quotes.length === 0) ? (
            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-xl">
              {l ? 'No quotes available for this job.' : '该工单暂无报价。'}
            </div>
          ) : (
            <div className="space-y-3">
              {selectedJob.quotes.map((quote, idx) => {
                const hasEstimate = selectedJob.ai_estimate_low && selectedJob.ai_estimate_high;
                const light = hasEstimate
                  ? getTrafficLight(quote.quoted_amount, selectedJob.ai_estimate_low!, selectedJob.ai_estimate_high!)
                  : null;

                return (
                  <label key={quote.id}
                    className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedQuoteId === quote.id ? 'border-clearstrata-ui-primary bg-clearstrata-ui-soft shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="quote" value={quote.id} checked={selectedQuoteId === quote.id}
                        onChange={() => setSelectedQuoteId(quote.id)}
                        className="w-5 h-5 text-clearstrata-ui-primary focus:ring-clearstrata-ui-primary" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{quote.vendor_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-clearstrata-ui-primary">${quote.quoted_amount.toLocaleString()}</span>
                            {light && <TrafficLightBadge light={light} language={language} />}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">{quote.vendor_contact}</div>
                        {quote.description_en && (
                          <div className="text-sm text-gray-600 mt-2 bg-white/60 rounded p-2">
                            {l ? quote.description_en : quote.description_zh || quote.description_en}
                          </div>
                        )}
                      </div>
                      {idx === 0 && (
                        <span className="text-xs bg-clearstrata-ui-primary text-white px-2 py-1 rounded-full whitespace-nowrap">
                          最低价
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {l ? 'Step 2: Assign Property Manager' : '第二步：指定物业经理'}
          </h3>
          {propertyManagers.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <p className="text-gray-500 mb-3">{l ? 'No active property managers.' : '没有在职物业经理。'}</p>
              {onAddManager && (
                <button onClick={onAddManager}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-clearstrata-ui-primary text-white rounded-lg hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive transition-colors">
                  <Plus size={16} />
                  {l ? 'Add Property Manager' : '添加物业经理'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {propertyManagers.map((m) => (
                <label key={m.id}
                  className={`block p-3 border-2 rounded-xl cursor-pointer transition-all ${selectedManagerId === m.id ? 'border-clearstrata-ui-primary bg-clearstrata-ui-soft' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="manager" value={m.id} checked={selectedManagerId === m.id}
                      onChange={() => setSelectedManagerId(m.id)}
                      className="w-5 h-5 text-clearstrata-ui-primary focus:ring-clearstrata-ui-primary" />
                    <div>
                      <div className="font-semibold text-gray-900">{l ? m.full_name_en : m.full_name_zh}</div>
                      <div className="text-sm text-gray-500">{m.email} / {m.phone}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {!canSubmit && !submitting && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2 text-amber-800">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div className="text-sm">
                {missingQuote && missingManager && (l ? 'Please select a quote and assign a property manager.' : '请选择一个报价并指定物业经理。')}
                {missingQuote && !missingManager && (l ? 'Please select a quote to approve.' : '请选择一个报价。')}
                {!missingQuote && missingManager && (l ? 'Please assign a property manager.' : '请指定物业经理。')}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleApprove} disabled={!canSubmit}
            className="flex-1 flex items-center justify-center gap-2 bg-clearstrata-ui-primary text-white py-3 rounded-lg hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            <Send size={18} />
            {submitting ? (l ? 'Submitting...' : '提交中...') : (l ? 'Approve & Notify PM' : '批准并通知物业经理')}
          </button>
          <button onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium">
            {l ? 'Cancel' : '取消'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PMCompleteModal({
  language, selectedJob, onClose, onCompleted,
}: {
  language: string; selectedJob: ProcurementJob; onClose: () => void; onCompleted: () => void;
}) {
  const { currentPropertyId } = useProperty();
  const l = language === 'en';
  const [notes, setNotes] = useState('');
  const [_photosUploaded, setPhotosUploaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async () => {
    if (!currentPropertyId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('procurement_jobs')
        .update({
          status: 'pending_inspection',
          pm_completion_notes: notes,
          pm_completed_at: new Date().toISOString(),
        })
        .eq('property_id', currentPropertyId)
        .eq('id', selectedJob.id);
      if (error) throw error;
      onClose();
      onCompleted();
    } catch (err: any) {
      alert(l ? `Error: ${err.message}` : `错误：${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{l ? 'Mark Work Complete' : '标记完工'}</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900">{l ? selectedJob.title_en : selectedJob.title_zh || selectedJob.title_en}</h3>
          <p className="text-sm text-gray-600 mt-1">{l ? selectedJob.description_en : selectedJob.description_zh || selectedJob.description_en}</p>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Camera size={18} />
            {l ? 'Upload Completion Photos (Required)' : '上传完工照片（必须）'}
          </h3>
          <PhotoUpload jobId={selectedJob.id} photoType="completion" onPhotosUploaded={() => setPhotosUploaded(true)} maxPhotos={10} />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">{l ? 'Completion Notes' : '完工说明'}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
            placeholder={l ? 'Describe the work completed, any issues encountered...' : '描述完成的工作、遇到的问题...'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent" />
        </div>

        <div className="flex gap-3">
          <button onClick={handleComplete} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 bg-clearstrata-ui-primary text-white py-3 rounded-lg hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive transition-colors font-medium disabled:opacity-50">
            <CheckCircle size={18} />
            {submitting ? (l ? 'Submitting...' : '提交中...') : (l ? 'Submit Completion' : '提交完工')}
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium">
            {l ? 'Cancel' : '取消'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function InspectionModal({
  language, profile, selectedJob, onClose, onInspected,
}: {
  language: string; profile: any; selectedJob: ProcurementJob; onClose: () => void; onInspected: () => void;
}) {
  const { currentPropertyId } = useProperty();
  const l = language === 'en';
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photos, setPhotos] = useState<{ id: string; photo_url: string }[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentPropertyId) {
        setPhotos([]);
        setLoadingPhotos(false);
        return;
      }
      const { data } = await supabase.from('procurement_photos')
        .select('id, photo_url')
        .eq('property_id', currentPropertyId)
        .eq('job_id', selectedJob.id)
        .eq('photo_type', 'completion');
      if (!cancelled) {
        setPhotos(data || []);
        setLoadingPhotos(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentPropertyId, selectedJob.id]);

  const handleInspection = async (result: 'passed' | 'failed') => {
    if (!profile) return;
    setSubmitting(true);
    try {
      const newStatus = result === 'passed' ? 'inspection_passed' : 'inspection_failed';
      const { error } = await supabase
        .from('procurement_jobs')
        .update({
          status: newStatus,
          inspection_result: result,
          inspection_notes: notes,
          inspected_by: profile.id,
          inspected_at: new Date().toISOString(),
        })
        .eq('property_id', currentPropertyId)
        .eq('id', selectedJob.id);
      if (error) throw error;
      onClose();
      onInspected();
    } catch (err: any) {
      alert(l ? `Error: ${err.message}` : `错误：${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{l ? 'Inspect Completed Work' : '验收完工'}</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900">{l ? selectedJob.title_en : selectedJob.title_zh || selectedJob.title_en}</h3>
          {selectedJob.pm_completion_notes && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{l ? 'PM Completion Notes' : '物业经理完工说明'}</div>
              <p className="text-sm text-gray-700">{selectedJob.pm_completion_notes}</p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ImageIcon size={18} />
            {l ? 'Completion Photos' : '完工照片'}
          </h3>
          {loadingPhotos ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-clearstrata-ui-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
              {l ? 'No completion photos uploaded' : '未上传完工照片'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((p) => (
                <a key={p.id} href={p.photo_url} target="_blank" rel="noopener noreferrer">
                  <img src={p.photo_url} alt="" className="w-full h-40 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">{l ? 'Inspection Notes' : '验收备注'}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder={l ? 'Comments about the work quality...' : '关于工作质量的评价...'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent" />
        </div>

        <div className="flex gap-3">
          <button onClick={() => handleInspection('passed')} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 bg-clearstrata-ui-primary text-white py-3 rounded-lg hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive transition-colors font-medium disabled:opacity-50">
            <CheckCircle size={18} />
            {l ? 'Inspection Passed' : '验收通过'}
          </button>
          <button onClick={() => handleInspection('failed')} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50">
            <XCircle size={18} />
            {l ? 'Inspection Failed' : '验收不通过'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ManagerListModal({
  language, propertyManagers, onClose, onAddManager,
}: {
  language: string; propertyManagers: PropertyManager[]; onClose: () => void; onAddManager: () => void;
}) {
  const l = language === 'en';
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{l ? 'Property Managers' : '物业经理'}</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <div className="mb-4">
          <button onClick={onAddManager}
            className="flex items-center gap-2 bg-clearstrata-ui-primary text-white px-4 py-2 rounded-lg hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive transition-colors">
            <Plus size={20} />
            {l ? 'Add Property Manager' : '添加物业经理'}
          </button>
        </div>
        {propertyManagers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">{l ? 'No property managers found' : '未找到物业经理'}</div>
        ) : (
          <div className="space-y-3">
            {propertyManagers.map((m) => (
              <div key={m.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{l ? m.full_name_en : m.full_name_zh}</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2"><Mail size={16} className="text-gray-400" />{m.email}</div>
                      <div className="flex items-center gap-2"><Phone size={16} className="text-gray-400" />{m.phone}</div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${m.status === 'active' ? 'bg-clearstrata-brand-100 text-clearstrata-brand-800' : 'bg-gray-100 text-gray-800'}`}>
                    {m.status === 'active' ? (l ? 'Active' : '在职') : (l ? 'Inactive' : '离职')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AddManagerModal({
  language, onClose, onAdded,
}: {
  language: string; onClose: () => void; onAdded: () => void;
}) {
  const { currentPropertyId } = useProperty();
  const l = language === 'en';
  const [m, setM] = useState({ full_name_en: '', full_name_zh: '', email: '', phone: '' });

  const add = async () => {
    if (!currentPropertyId) return;
    const { error } = await supabase.from('property_managers').insert({ ...m, status: 'active', property_id: currentPropertyId });
    if (error) { alert(l ? 'Failed to add' : '添加失败'); return; }
    onClose();
    onAdded();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{l ? 'Add Property Manager' : '添加物业经理'}</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Full Name (English)' : '全名（英文）'}</label>
            <input type="text" value={m.full_name_en} onChange={(e) => setM({ ...m, full_name_en: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent" placeholder="John Smith" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Full Name (Chinese)' : '全名（中文）'}</label>
            <input type="text" value={m.full_name_zh} onChange={(e) => setM({ ...m, full_name_zh: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent" placeholder="张三" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Email' : '邮箱'}</label>
            <input type="email" value={m.email} onChange={(e) => setM({ ...m, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent" placeholder="manager@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Phone' : '电话'}</label>
            <input type="tel" value={m.phone} onChange={(e) => setM({ ...m, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent" placeholder="+1 234 567 8900" />
          </div>
          <div className="flex gap-3">
            <button onClick={add} className="flex-1 bg-clearstrata-ui-primary text-white py-2 rounded-lg hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive transition-colors">{l ? 'Submit' : '提交'}</button>
            <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors">{l ? 'Cancel' : '取消'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InvoiceModal({
  language, selectedJob, onClose, onDone,
}: {
  language: string; selectedJob: ProcurementJob; onClose: () => void; onDone: () => void;
}) {
  const l = language === 'en';
  const selectedQuote = selectedJob.quotes?.find(q => q.id === selectedJob.selected_quote_id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{l ? 'Upload Invoice' : '上传发票'}</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-1">{l ? selectedJob.title_en : selectedJob.title_zh || selectedJob.title_en}</h3>
          {selectedQuote && (
            <p className="text-sm text-gray-600">
              {l ? 'Approved vendor' : '批准供应商'}: {selectedQuote.vendor_name} - ${selectedQuote.quoted_amount.toLocaleString()}
            </p>
          )}
        </div>
        <InvoiceUpload jobId={selectedJob.id} quotedAmount={selectedQuote?.quoted_amount} onInvoiceUploaded={() => { onClose(); onDone(); }} />
      </div>
    </div>
  );
}

export function RatingModal({
  language, selectedJob, onClose, onDone,
}: {
  language: string; selectedJob: ProcurementJob; onClose: () => void; onDone: () => void;
}) {
  const l = language === 'en';
  const selectedQuote = selectedJob.quotes?.find(q => q.id === selectedJob.selected_quote_id) || selectedJob.quotes?.[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{l ? 'Rate Vendor' : '评价供应商'}</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        <VendorRating jobId={selectedJob.id} vendorName={selectedQuote?.vendor_name || 'Unknown'} vendorContact={selectedQuote?.vendor_contact}
          onRatingSubmitted={() => { onClose(); onDone(); }} />
      </div>
    </div>
  );
}
