import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Resident {
  id: string;
  user_id: string;
  unit_no: string;
  name_en: string;
  name_zh: string | null;
  email: string;
  phone: string;
  move_in_date: string | null;
  language_pref: string;
  role: string;
  status: string;
  committee_role: string | null;
  term_start: string | null;
  term_end: string | null;
  strata_fee_status: string;
  created_at: string;
}

type FilterStatus = 'all' | 'active' | 'pending' | 'deregistered';
type FilterRole = 'all' | 'owner' | 'council' | 'manager';
type FilterFee = 'all' | 'current' | 'overdue' | 'prepaid';

export function CommitteeManagement() {
  const { profile } = useAuth();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [filterFee, setFilterFee] = useState<FilterFee>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const isCouncil = profile?.role === 'council' || profile?.role === 'admin';

  useEffect(() => {
    loadResidents();
  }, []);

  const loadResidents = async () => {
    const { data, error } = await supabase
      .from('residents')
      .select('*')
      .order('unit_no');

    if (error) {
      console.error('Error loading residents:', error);
    } else {
      setResidents(data || []);
    }
    setLoading(false);
  };

  const approveResident = async (id: string) => {
    setApprovingId(id);
    const { error } = await supabase
      .from('residents')
      .update({ status: 'active' })
      .eq('id', id);

    if (!error) await loadResidents();
    setApprovingId(null);
  };

  const rejectResident = async (id: string) => {
    setApprovingId(id);
    const { error } = await supabase
      .from('residents')
      .update({ status: 'deregistered' })
      .eq('id', id);

    if (!error) await loadResidents();
    setApprovingId(null);
  };

  const exportCSV = () => {
    const headers = ['单元号', '英文名', '中文名', '邮箱', '电话', '角色', '状态', '缴费状态', '入住日期', '注册日期'];
    const rows = filtered.map((r) => [
      r.unit_no,
      r.name_en,
      r.name_zh || '',
      r.email,
      r.phone,
      r.role,
      r.status,
      r.strata_fee_status,
      r.move_in_date || '',
      r.created_at.split('T')[0],
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `业主列表-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = residents.filter((r) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      r.name_en.toLowerCase().includes(query) ||
      (r.name_zh || '').toLowerCase().includes(query) ||
      r.email.toLowerCase().includes(query) ||
      r.unit_no.toLowerCase().includes(query) ||
      r.phone.includes(query);

    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesRole = filterRole === 'all' || r.role === filterRole;
    const matchesFee = filterFee === 'all' || r.strata_fee_status === filterFee;

    return matchesSearch && matchesStatus && matchesRole && matchesFee;
  });

  const pendingCount = residents.filter((r) => r.status === 'pending').length;

  const roleName = (role: string) => {
    const map: Record<string, string> = {
      owner: '业主',
      council: '业委会',
      manager: '经理',
    };
    return map[role] || role;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-800', label: '活跃' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '待审核' },
      deregistered: { bg: 'bg-gray-100', text: 'text-gray-600', label: '已注销' },
    };
    const s = map[status] || map.pending;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  const feeBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      current: { bg: 'bg-green-100', text: 'text-green-800', label: '正常' },
      overdue: { bg: 'bg-red-100', text: 'text-red-800', label: '逾期' },
      prepaid: { bg: 'bg-blue-100', text: 'text-blue-800', label: '预付' },
    };
    const s = map[status] || map.current;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-[#1D9E75]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="总业主数" value={residents.length} color="text-gray-900" />
        <SummaryCard
          label="活跃"
          value={residents.filter((r) => r.status === 'active').length}
          color="text-green-600"
        />
        <SummaryCard label="待审核" value={pendingCount} color="text-yellow-600" />
        <SummaryCard
          label="欠费"
          value={residents.filter((r) => r.strata_fee_status === 'overdue').length}
          color="text-red-600"
        />
      </div>

      {isCouncil && pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
            <Clock size={18} />
            {pendingCount} 个待审核申请
          </h3>
          <div className="space-y-2">
            {residents
              .filter((r) => r.status === 'pending')
              .map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-lg p-3 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {r.name_zh || r.name_en}
                    </p>
                    <p className="text-xs text-gray-500">
                      单元 {r.unit_no} | {r.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => approveResident(r.id)}
                      disabled={approvingId === r.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {approvingId === r.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCircle size={14} />
                      )}
                      批准
                    </button>
                    <button
                      onClick={() => rejectResident(r.id)}
                      disabled={approvingId === r.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={14} />
                      拒绝
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="按姓名/单元/邮箱搜索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75] transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg transition-colors ${
              showFilters ? 'border-[#1D9E75] text-[#1D9E75] bg-emerald-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter size={18} />
            筛选
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={18} />
            导出
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">状态</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75]"
              >
                <option value="all">全部</option>
                <option value="active">活跃</option>
                <option value="pending">待审核</option>
                <option value="deregistered">已注销</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">角色</label>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as FilterRole)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75]"
              >
                <option value="all">全部</option>
                <option value="owner">业主</option>
                <option value="council">业委会</option>
                <option value="manager">经理</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">缴费状态</label>
              <select
                value={filterFee}
                onChange={(e) => setFilterFee(e.target.value as FilterFee)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75]"
              >
                <option value="all">全部</option>
                <option value="current">正常</option>
                <option value="overdue">逾期</option>
                <option value="prepaid">预付</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  单元号
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  姓名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  联系方式
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  费用
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  入住
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <Users className="mx-auto mb-3 text-gray-400" size={32} />
                    没有匹配的业主
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-[#1D9E75]">{r.unit_no}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {r.name_zh || r.name_en}
                      </p>
                      {r.name_zh && (
                        <p className="text-xs text-gray-500">{r.name_en}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-gray-900">{r.email}</p>
                      {r.phone && <p className="text-xs text-gray-500">{r.phone}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{roleName(r.role)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {statusBadge(r.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell">
                      {feeBadge(r.strata_fee_status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap hidden lg:table-cell text-sm text-gray-600">
                      {r.move_in_date
                        ? new Date(r.move_in_date).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'short',
                          })
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-600">
          {`共 ${filtered.length} / ${residents.length} 位业主`}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
