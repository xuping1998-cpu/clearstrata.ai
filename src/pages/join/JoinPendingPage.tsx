import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { getJoinStatus } from '../../lib/joinStatus';
import { supabase } from '../../lib/supabase';

export default function JoinPendingPage() {
  const { session, user } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();
  const { setCurrentPropertyId, refreshMemberships } = useProperty();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [propertyName, setPropertyName] = useState<string | null>(null);

  const resolveAndRoute = useCallback(async () => {
    if (!user?.id) return;
    await refreshMemberships();
    const status = await getJoinStatus(user.id);
    if (status.type === 'member') {
      setCurrentPropertyId(status.propertyId);
      navigate('/', { replace: true });
      return;
    }
    if (status.type === 'rejected') {
      navigate('/join/rejected', { replace: true });
      return;
    }
    if (status.type !== 'pending') {
      navigate('/', { replace: true });
      return;
    }
    const { data: prop } = await supabase.from('properties').select('name').eq('id', status.propertyId).maybeSingle();
    setPropertyName((prop as { name?: string } | null)?.name ?? null);
  }, [user?.id, navigate, refreshMemberships, setCurrentPropertyId]);

  useEffect(() => {
    if (!session || !user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refreshMemberships();
      if (cancelled) return;
      const status = await getJoinStatus(user.id);
      if (cancelled) return;
      if (status.type === 'member') {
        setCurrentPropertyId(status.propertyId);
        navigate('/', { replace: true });
        return;
      }
      if (status.type === 'rejected') {
        navigate('/join/rejected', { replace: true });
        return;
      }
      if (status.type !== 'pending') {
        navigate('/', { replace: true });
        return;
      }
      const { data: prop } = await supabase.from('properties').select('name').eq('id', status.propertyId).maybeSingle();
      if (!cancelled) {
        setPropertyName((prop as { name?: string } | null)?.name ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, user?.id, navigate, refreshMemberships, setCurrentPropertyId]);

  const onRefresh = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      await resolveAndRoute();
    } finally {
      setRefreshing(false);
    }
  };

  if (!session) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-[#1D9E75] animate-spin" aria-hidden />
        <p className="mt-4 text-sm text-gray-500">{en ? 'Loading…' : '加载中…'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 py-10 text-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900">{en ? 'Application submitted' : '申请已提交'}</h1>
        <p className="mt-2 text-gray-600 text-sm">
          {en ? 'Please wait for the property administrator to review.' : '请等待物业管理员审核'}
        </p>

        <div className="mt-6 text-sm text-gray-600 space-y-2 text-left rounded-xl bg-gray-50 px-4 py-3">
          <p>
            <span className="text-gray-500">{en ? 'Property' : '物业'}：</span>
            {propertyName ?? (en ? '—' : '—')}
          </p>
          <p>
            <span className="text-gray-500">{en ? 'Status' : '当前状态'}：</span>
            {en ? 'Under review' : '审核中'}
          </p>
          <p>
            <span className="text-gray-500">{en ? 'Expected' : '预计时间'}：</span>
            {en ? 'Within 24 hours' : '24 小时内'}
          </p>
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={() => void onRefresh()}
          className="mt-8 inline-flex items-center justify-center gap-2 w-full sm:w-auto min-w-[200px] px-6 py-3 rounded-xl bg-[#1D9E75] text-white font-semibold hover:bg-[#178a66] disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          {en ? 'Refresh status' : '刷新状态'}
        </button>

        <p className="mt-6 text-xs text-gray-400">
          <Link to="/" className="text-[#1D9E75] hover:underline">
            {en ? 'Back to home' : '返回首页'}
          </Link>
        </p>
      </div>
    </div>
  );
}
