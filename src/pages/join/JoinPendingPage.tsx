import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { getJoinStatus } from '../../lib/joinStatus';
import { supabase } from '../../lib/supabase';

type JoinPendingLocationState = {
  propertyId?: string;
  propertyName?: string | null;
  unitNo?: string;
  reviewFlag?: string;
  message?: string | null;
};

type PendingInfo = {
  propertyId?: string;
  propertyName?: string | null;
  unitNo?: string | null;
  reviewFlag?: string | null;
  reviewReason?: string | null;
};

export default function JoinPendingPage() {
  const { session, user } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setCurrentPropertyId, refreshMemberships } = useProperty();

  // ── Source 1: location.state (passed by older navigate calls)
  const entryState = (location.state as JoinPendingLocationState | null) ?? null;

  // ── Source 2: URL query params (e.g. ?unitNo=414&reason=unit_occupied)
  const qUnitNo = searchParams.get('unitNo') || searchParams.get('unit_no') || null;
  const qReason = searchParams.get('reason') || searchParams.get('reviewFlag') || null;
  const qPropertyId = searchParams.get('propertyId') || searchParams.get('property_id') || null;

  const hasImmediateInfo = useMemo(
    () =>
      Boolean(
        entryState?.propertyId ||
          entryState?.propertyName ||
          entryState?.unitNo ||
          entryState?.reviewFlag ||
          qUnitNo ||
          qReason ||
          qPropertyId,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Display state (merged from all sources)
  const [pending, setPending] = useState<PendingInfo>({
    propertyId: entryState?.propertyId ?? qPropertyId ?? undefined,
    propertyName: entryState?.propertyName ?? null,
    unitNo: entryState?.unitNo ?? qUnitNo ?? null,
    reviewFlag: entryState?.reviewFlag ?? qReason ?? null,
    reviewReason: null,
  });

  const [loading, setLoading] = useState(!hasImmediateInfo);
  const [refreshing, setRefreshing] = useState(false);
  // Prevents double-query when user.id becomes available after session race
  const didQueryRef = useRef(false);

  // ── Initial load: query join_requests directly (no membership dependency).
  // Depends on user?.id so it re-runs after EntryAutoLogin's setSession propagates.
  useEffect(() => {
    // If we already have display info, nothing to load
    if (hasImmediateInfo) {
      setLoading(false);
      return;
    }

    // Wait for session to propagate — effect re-runs when user.id becomes available
    if (!user?.id) return;

    // Prevent running twice (React StrictMode / user.id reference changing)
    if (didQueryRef.current) return;
    didQueryRef.current = true;

    let cancelled = false;

    // Hard 5-second timeout — loading never hangs forever
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        console.warn('[JoinPendingPage] 5s timeout, forcing loading=false');
        setLoading(false);
      }
    }, 5000);

    (async () => {
      try {
        // SELECT must include review_flag so isOccupied works correctly
        const { data: jr, error: jrErr } = await supabase
          .from('join_requests')
          .select('property_id, unit_no, review_flag, review_reason, full_name, email, status, created_at')
          .eq('user_id', user.id)
          .in('status', ['pending', 'submitted', 'under_review', 'reviewing'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        if (jrErr) console.error('[JoinPendingPage] join_requests query error', jrErr);

        if (jr) {
          type JrRow = {
            property_id?: string;
            unit_no?: string;
            review_flag?: string;
            review_reason?: string;
          };
          const row = jr as JrRow;
          const propId = row.property_id;
          const unitNo = row.unit_no ?? null;
          const reviewFlag = row.review_flag ?? null;
          const reviewReason = row.review_reason ?? null;

          // Load property name
          let propName: string | null = null;
          if (propId) {
            const { data: prop } = await supabase
              .from('properties')
              .select('name')
              .eq('id', propId)
              .maybeSingle();
            if (!cancelled) propName = (prop as { name?: string } | null)?.name ?? null;
          }

          if (!cancelled) {
            setPending((prev) => ({
              ...prev,
              propertyId: propId ?? prev.propertyId,
              propertyName: propName ?? prev.propertyName,
              unitNo: unitNo ?? prev.unitNo,
              // Store review_flag and review_reason separately — do NOT conflate them
              reviewFlag: reviewFlag ?? prev.reviewFlag,
              reviewReason: reviewReason ?? prev.reviewReason,
            }));
          }
        }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  // Re-run when user.id becomes available after session race condition
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Refresh: check if approved/rejected, or reload pending info
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
    if (status.type === 'pending') {
      const { data: prop } = await supabase
        .from('properties')
        .select('name')
        .eq('id', status.propertyId)
        .maybeSingle();
      setPending((prev) => ({
        ...prev,
        propertyId: status.propertyId,
        propertyName: (prop as { name?: string } | null)?.name ?? prev.propertyName,
      }));
    }
  }, [user?.id, navigate, refreshMemberships, setCurrentPropertyId]);

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

  // ── Determine display values (state > query params > db result, all merged in `pending`)
  // Use the exact logic specified: check both review_flag and review_reason for 'occupied'
  const flag = String(pending.reviewFlag ?? '').toLowerCase();
  const reasonText = String(pending.reviewReason ?? '').toLowerCase();
  const isOccupied =
    flag === 'unit_occupied' ||
    flag.includes('occupied') ||
    reasonText.includes('occupied');

  const statusDetail: string | null = (() => {
    // Explicit message from navigation state
    const stateMsg = entryState?.message?.trim();
    if (stateMsg) return stateMsg;

    // unit_occupied — specific required message
    if (isOccupied) {
      return en
        ? 'This unit is already linked to another resident. Your application has been submitted for council review.'
        : '该房号已被其他业主绑定。你的申请已提交给理事会审核，请等待确认。';
    }

    if (flag === 'not_in_whitelist' || flag === 'non_whitelist') {
      return en
        ? 'This unit is not on the whitelist. Your request was sent to the council for review.'
        : '该房号未在本物业白名单中，申请已提交给业委会审核。';
    }
    if (flag === 'duplicate_unit_pending') {
      return en
        ? 'This unit already has an application under review. Your request was also sent to the council.'
        : '该房号已有申请正在审核，你的申请也已提交给业委会处理。';
    }
    if (flag === 'unit_change_request') {
      return en
        ? 'Your unit change request has been submitted to the council for review.'
        : '你的换房申请已提交给业委会审核。';
    }
    return null;
  })();

  // Property: show name if available, otherwise fall back to first 8 chars of property_id
  const displayPropertyName =
    pending.propertyName ??
    (pending.propertyId ? pending.propertyId.slice(0, 8) + '…' : null);
  const displayUnitNo = pending.unitNo ?? null;

  // ── Loading screen (max 5 seconds)
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-clearstrata-ui-primary animate-spin" aria-hidden />
        <p className="mt-4 text-sm text-gray-500">{en ? 'Loading…' : '加载中…'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 py-10 text-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {en ? 'Application submitted' : '申请已提交'}
        </h1>
        <p className="mt-2 text-gray-600 text-sm">
          {statusDetail != null
            ? statusDetail
            : en
              ? 'Your application has been submitted. Please wait for the council to review.'
              : '申请已提交，请等待理事会审核。'}
        </p>

        <div className="mt-6 text-sm text-gray-600 space-y-2 text-left rounded-xl bg-gray-50 px-4 py-3">
          <p>
            <span className="text-gray-500">{en ? 'Property' : '物业'}：</span>
            {displayPropertyName ?? '—'}
          </p>
          {displayUnitNo ? (
            <p>
              <span className="text-gray-500">{en ? 'Unit' : '房号'}：</span>
              {displayUnitNo}
            </p>
          ) : null}
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
          className="mt-8 inline-flex items-center justify-center gap-2 w-full sm:w-auto min-w-[200px] px-6 py-3 rounded-xl bg-clearstrata-ui-primary text-white font-semibold hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <RefreshCw className="w-5 h-5" />
          )}
          {en ? 'Refresh status' : '刷新状态'}
        </button>

        <p className="mt-6 text-xs text-gray-400">
          <Link to="/" className="text-clearstrata-ui-primary hover:underline">
            {en ? 'Back to home' : '返回首页'}
          </Link>
        </p>
      </div>
    </div>
  );
}
