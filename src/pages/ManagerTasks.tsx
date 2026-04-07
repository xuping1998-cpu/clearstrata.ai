import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, Loader2, Plus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';

export type ManagerTaskType = 'repair' | 'vendor' | 'invoice_review' | 'dispute';

export type ManagerTaskRow = {
  id: string;
  property_id: string;
  task_type: ManagerTaskType;
  title: string;
  description: string;
  status: string;
  dispute_status: string | null;
  dispute_result: string | null;
  created_at: string;
};

const TASK_TYPES: ManagerTaskType[] = ['repair', 'vendor', 'invoice_review', 'dispute'];

function taskTypeLabel(kind: ManagerTaskType, en: boolean): string {
  const m: Record<ManagerTaskType, [string, string]> = {
    repair: ['Repair', '维修'],
    vendor: ['Vendor', '供应商'],
    invoice_review: ['Invoice review', '发票审核'],
    dispute: ['Dispute', '纠纷调解'],
  };
  return en ? m[kind][0] : m[kind][1];
}

export function ManagerTasks() {
  const { language } = useLanguage();
  const en = language === 'en';
  const { profile } = useAuth();
  const { currentPropertyId } = useProperty();
  const [searchParams, setSearchParams] = useSearchParams();

  const filterType = useMemo(() => {
    const raw = searchParams.get('task_type');
    if (raw && TASK_TYPES.includes(raw as ManagerTaskType)) return raw as ManagerTaskType;
    return 'all' as const;
  }, [searchParams]);

  const [rows, setRows] = useState<ManagerTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    task_type: 'dispute' as ManagerTaskType,
    title: '',
    description: '',
  });

  const load = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoading(true);
    setError(null);
    let q = supabase
      .from('manager_tasks')
      .select(
        'id, property_id, task_type, title, description, status, dispute_status, dispute_result, created_at',
      )
      .eq('property_id', currentPropertyId)
      .order('created_at', { ascending: false });
    if (filterType !== 'all') {
      q = q.eq('task_type', filterType);
    }
    const { data, err } = await q;
    if (err) {
      console.error(err);
      setError(err.message);
      setRows([]);
    } else {
      setRows((data as ManagerTaskRow[]) ?? []);
    }
    setLoading(false);
  }, [currentPropertyId, filterType]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFilter = (next: 'all' | ManagerTaskType) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'all') nextParams.delete('task_type');
    else nextParams.set('task_type', next);
    setSearchParams(nextParams, { replace: true });
  };

  const createTask = async () => {
    if (!profile?.id || !currentPropertyId || !newTask.title.trim()) return;
    setCreating(true);
    const payload: Record<string, unknown> = {
      property_id: currentPropertyId,
      task_type: newTask.task_type,
      title: newTask.title.trim(),
      description: newTask.description.trim() || '—',
      status: 'open',
      created_by: profile.id,
    };
    if (newTask.task_type === 'dispute') {
      payload.dispute_status = 'pending';
    }
    const { error: insErr } = await supabase.from('manager_tasks').insert(payload);
    setCreating(false);
    if (insErr) {
      alert(en ? insErr.message : `创建失败：${insErr.message}`);
      return;
    }
    setShowModal(false);
    setNewTask({ task_type: 'dispute', title: '', description: '' });
    void load();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {en ? 'Property manager tasks' : '物业经理任务'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {en ? 'Tasks and logs in one place — including dispute mediation.' : '任务与日志统一入口，纠纷调解为任务类型之一。'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#178a66]"
        >
          <Plus size={18} />
          {en ? 'New task' : '新建任务'}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            filterType === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {en ? 'All' : '全部'}
        </button>
        {TASK_TYPES.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filterType === k ? 'bg-[#1D9E75] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {taskTypeLabel(k, en)}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#1D9E75]" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          {en ? 'No tasks yet.' : '暂无任务'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-3 font-semibold">{en ? 'Title' : '标题'}</th>
                <th className="px-3 py-3 font-semibold">{en ? 'Type' : '类型'}</th>
                <th className="px-3 py-3 font-semibold">{en ? 'Status' : '状态'}</th>
                <th className="px-3 py-3 font-semibold">{en ? 'Dispute status' : '纠纷状态'}</th>
                <th className="px-3 py-3 font-semibold">{en ? 'Created' : '创建时间'}</th>
                <th className="px-3 py-3 font-semibold">{en ? 'Action' : '操作'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-3 py-2.5 font-medium text-gray-900">{r.title || '—'}</td>
                  <td className="px-3 py-2.5">{taskTypeLabel(r.task_type, en)}</td>
                  <td className="px-3 py-2.5">{r.status}</td>
                  <td className="px-3 py-2.5 text-gray-700">
                    {r.task_type === 'dispute' ? r.dispute_status ?? '—' : '—'}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500">
                    {new Date(r.created_at).toLocaleString(en ? 'en-CA' : 'zh-CN')}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      to={`/property-admin/tasks/${r.id}`}
                      className="font-medium text-[#1D9E75] hover:underline"
                    >
                      {en ? 'View detail' : '查看详情'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">{en ? 'New task' : '新建任务'}</h2>
            <label className="mt-4 block text-sm font-medium text-gray-700">{en ? 'Task type' : '任务类型'}</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={newTask.task_type}
              onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value as ManagerTaskType })}
            >
              {TASK_TYPES.map((k) => (
                <option key={k} value={k}>
                  {taskTypeLabel(k, en)}
                </option>
              ))}
            </select>
            <label className="mt-3 block text-sm font-medium text-gray-700">{en ? 'Title' : '标题'}</label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder={en ? 'Short title' : '简要标题'}
            />
            <label className="mt-3 block text-sm font-medium text-gray-700">{en ? 'Description' : '描述'}</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={4}
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder={en ? 'Details' : '详细说明'}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setShowModal(false)}
              >
                {en ? 'Cancel' : '取消'}
              </button>
              <button
                type="button"
                disabled={creating || !newTask.title.trim()}
                className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void createTask()}
              >
                {creating ? (en ? 'Saving…' : '保存中…') : en ? 'Create' : '创建'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
