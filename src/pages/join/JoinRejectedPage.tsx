import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Loader2, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { getJoinStatus } from '../../lib/joinStatus';
import { supabase } from '../../lib/supabase';

export default function JoinRejectedPage() {
  const { session, user } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();
  const { setCurrentPropertyId, refreshMemberships } = useProperty();

  const [loading, setLoading] = useState(true);
  const [propertyName, setPropertyName] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);

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
      if (status.type === 'pending') {
        navigate('/join/pending', { replace: true });
        return;
      }
      if (status.type !== 'rejected') {
        navigate('/', { replace: true });
        return;
      }
      setReason(status.reason);
      if (status.propertyId) {
        const { data: prop } = await supabase.from('properties').select('name').eq('id', status.propertyId).maybeSingle();
        if (!cancelled) {
          setPropertyName((prop as { name?: string } | null)?.name ?? null);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, user?.id, navigate, refreshMemberships, setCurrentPropertyId]);

  if (!session) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-[#1D9E75] animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 text-amber-800 mb-4">
          <XCircle className="w-8 h-8" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-gray-900">{en ? 'Application not approved' : '申请未通过'}</h1>
        {propertyName && (
          <p className="text-sm text-gray-500 mt-2">
            {en ? 'Property' : '物业'}：{propertyName}
          </p>
        )}
        {reason?.trim() ? (
          <p className="text-sm text-gray-700 mt-4 text-left rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 break-words">
            {reason}
          </p>
        ) : (
          <p className="text-sm text-gray-600 mt-4">{en ? 'No reason was provided.' : '未提供具体原因。'}</p>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            {en ? 'Home' : '返回首页'}
          </Link>
          <Link
            to="/join"
            className="inline-flex justify-center rounded-xl bg-[#1D9E75] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#178a66]"
          >
            {en ? 'Apply again' : '重新申请'}
          </Link>
        </div>
      </div>
    </div>
  );
}
