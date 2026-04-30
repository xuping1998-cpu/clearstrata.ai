import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
  reason?: string;
  reviewFlag?: string;
  kind?: string;
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
  const { setCurrentPropertyId, refreshMemberships } = useProperty();

  // ── Source 1: location.state
  const entryState = (location.state as JoinPendingLocationState | null) ?? null;

  // ── Source 2: URL query params — read directly from location.search for reliability
  const params = new URLSearchParams(location.search);
  const qPropertyId = params.get('propertyId') ?? params.get('property_id') ?? null;
  const qPropertyName = params.get('propertyName') ?? null;
  const qUnitNo = params.get('unitNo') ?? params.get('unit_no') ?? null;
  const qReason = params.get('reason') ?? params.get('reviewFlag') ?? null;
  const qKind = params.get('kind') ?? null;

  // Hardcoded property name fallback for known property IDs (avoids an extra DB round-trip)
  const KNOWN_PROPERTY_NAMES: Record<string, string> = {
    '497a907d-8df2-4e62-8859-66de6449c5c2': 'BCS3736',
  };

  const hasUrlParams = Boolean(qPropertyId || qUnitNo || qReason);

  // ── Display state — URL params win over location.state; DB fills any remaining gaps
  const [pending, setPending] = useState<PendingInfo>({
    propertyId: qPropertyId ?? entryState?.propertyId ?? undefined,
    propertyName: entryState?.propertyName ?? null,
    unitNo: qUnitNo ?? entryState?.unitNo ?? null,
    reviewFlag: qReason ?? entryState?.reviewFlag ?? entryState?.reason ?? null,
    reviewReason: null,
  });

  // If URL params are present, never show a loading spinner — show content immediately
  const [loading, setLoading] = useState(!hasUrlParams);
  const [refreshing, setRefreshing] = useState(false);
  const didQueryRef = useRef(false);

  // ── Step 1: If URL params exist, dismiss loading immediately (no DB query needed)
  useEffect(() => {
    if (hasUrlParams) {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Step 2: If no URL params, query join_requests once user session is available
  useEffect(() => {
    if (hasUrlParams) return;
    if (!user?.id) return;
    if (didQueryRef.current) return;
    didQueryRef.current = true;

    let cancelled = false;

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        console.warn('[JoinPendingPage] 5s timeout, forcing loading=false');
        setLoading(false);
      }
    }, 5000);

    (async () => {
      try {
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

  // ── Determine display values
  // isOccupied uses exact string matching only — no includes()
  const isOccupied =
    qReason === 'unit_occupied' ||
    qKind === 'unit_occupied' ||
    entryState?.reason === 'unit_occupied' ||
    entryState?.reviewFlag === 'unit_occupied' ||
    pending.reviewFlag === 'unit_occupied';

  const dbFlag = pending.reviewFlag ?? '';
  const statusDetail: string | null = (() => {
    const stateMsg = entryState?.message?.trim();
    if (stateMsg) return stateMsg;

    if (isOccupied) {
      return en
        ? 'This unit is already linked to another resident. Your application has been submitted for council review.'
        : '该房号已被其他业主绑定。你的申请已提交给理事会审核，请等待确认。';
    }
    if (dbFlag === 'not_in_whitelist' || dbFlag === 'non_whitelist') {
      return en
        ? 'This unit is not on the whitelist. Your request was sent to the council for review.'
        : '该房号未在本物业白名单中，申请已提交给业委会审核。';
    }
    if (dbFlag === 'duplicate_unit_pending') {
      return en
        ? 'This unit already has an application under review. Your request was also sent to the council.'
        : '该房号已有申请正在审核，你的申请也已提交给业委会处理。';
    }
    if (dbFlag === 'unit_change_request' || entryState?.reviewFlag === 'unit_change_request' || qReason === 'unit_change_request') {
      return en
        ? 'Your unit change request has been submitted to the council for review.'
        : '你的换房申请已提交给业委会审核。';
    }
    return null;
  })();

  // Property name priority: state > URL query > DB > known UUID map > —
  const resolvedPropertyId = qPropertyId ?? entryState?.propertyId ?? pending.propertyId ?? null;
  const displayPropertyName =
    entryState?.propertyName ??
    qPropertyName ??
    pending.propertyName ??
    (resolvedPropertyId ? (KNOWN_PROPERTY_NAMES[resolvedPropertyId] ?? null) : null);
  const displayUnitNo = qUnitNo ?? pending.unitNo ?? null;

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
        <div className="flex justify-center mb-5">
          <img
            src="/clearstrata-hero-logo.png"
            alt="ClearStrata"
            className="w-20 h-auto object-contain"
          />
        </div>
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
