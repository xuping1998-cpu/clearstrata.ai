import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useProperty } from '../../contexts/PropertyContext';

const DEFAULT_PROPERTY_ID = '497a907d-8df2-4e62-8859-66de6449c5c2';

function scanJoinPropertyId(): string {
  const v = import.meta.env.VITE_JOIN_PROPERTY_AUTO_PROPERTY_ID as string | undefined;
  return (v && v.trim()) || DEFAULT_PROPERTY_ID;
}

export function BindUnitPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshMemberships } = useProperty();
  const [unit, setUnit] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = searchParams.get('unit');
    if (u) setUnit(u);
  }, [searchParams]);

  const handleJoin = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('请先登录');
        setLoading(false);
        return;
      }

      const trimmed = unit.trim();
      if (!trimmed) {
        alert('请填写房号');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('join_property_auto', {
        p_property_id: scanJoinPropertyId(),
        p_user_id: user.id,
        p_unit_no: trimmed,
      });

      if (error) {
        alert('进入失败：' + error.message);
        setLoading(false);
        return;
      }

      const row = data as { ok?: boolean; error?: string } | null;
      if (row && typeof row.ok === 'boolean' && row.ok === false) {
        alert('进入失败：' + (row.error ?? 'unknown'));
        setLoading(false);
        return;
      }

      try {
        await refreshMemberships();
      } catch {
        /* ignore refresh errors */
      }

      navigate('/welcome');
    } finally {
      setLoading(false);
    }
  }, [navigate, refreshMemberships, unit]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">确认你的房号</h1>
      <input
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        placeholder="例如 319"
        className="border border-gray-200 rounded-xl px-4 py-3 mb-6 w-72 max-w-full text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
      />
      <button
        type="button"
        onClick={() => void handleJoin()}
        disabled={loading}
        className="rounded-xl bg-[#1D9E75] text-white px-8 py-3 text-sm font-semibold shadow-sm hover:bg-[#178a66] disabled:opacity-50 disabled:pointer-events-none transition-colors"
      >
        {loading ? '进入中…' : '进入我的物业'}
      </button>
    </div>
  );
}
