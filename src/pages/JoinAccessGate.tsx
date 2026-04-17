import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';
import { resolveUserPropertyAccess } from '../lib/resolveUserPropertyAccess';
import { shouldDeferAutoPropertyRedirects } from '../lib/authRecovery';

/**
 * No active `property_members` membership: may redirect using `join_requests` / invite flow,
 * or show invite / public apply CTAs. Staff join approvals: `/admin/join-requests` (`join_requests`).
 */
export function JoinAccessGate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const en = language === 'en';
  const { refreshMemberships, setCurrentPropertyId } = useProperty();

  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    if (shouldDeferAutoPropertyRedirects()) {
      return;
    }
    setLoading(true);

    await refreshMemberships();
    const result = await resolveUserPropertyAccess(user.id);

    if (result.type === 'single_property') {
      setCurrentPropertyId(result.propertyId);
      navigate('/', { replace: true });
      return;
    }
    if (result.type === 'multi_property') {
      navigate('/select-property', { replace: true });
      return;
    }
    if (result.type === 'pending') {
      navigate('/join/pending', { replace: true });
      return;
    }
    if (result.type === 'rejected') {
      navigate('/join/rejected', { replace: true });
      return;
    }

    setLoading(false);
  }, [user?.id, navigate, refreshMemberships, setCurrentPropertyId]);

  useEffect(() => {
    void load();
  }, [load, location.hash, location.pathname, location.search]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-[#1D9E75] animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="max-w-md text-center text-gray-700">
        <p className="font-semibold text-gray-900">{en ? 'No property access' : '未分配物业访问权限'}</p>
        <p className="text-sm mt-2">
          {en
            ? 'Your account is not linked to any property. Use an invite or apply to join.'
            : '您的账号尚未关联物业。请使用邀请码或提交加入申请。'}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/invite"
            className="inline-flex justify-center rounded-xl bg-[#1D9E75] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#178a66]"
          >
            {en ? 'Join with invite code' : '使用邀请码加入'}
          </Link>
          <Link
            to="/join"
            className="inline-flex justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            {en ? 'Public application' : '公开申请加入物业'}
          </Link>
        </div>
      </div>
    </div>
  );
}
