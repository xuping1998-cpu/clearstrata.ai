import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProperty } from '@/contexts/PropertyContext';

type ConsumeOk = {
  ok: true;
  access_token: string;
  refresh_token: string;
  final_redirect: string;
  propertyId: string;
  unitNo: string;
  kind: string;
  reason: string | null;
};

// Backend may return camelCase or snake_case field names
type ConsumeResponse = Partial<ConsumeOk> & {
  ok?: boolean;
  message?: string;
  // snake_case variants
  property_id?: string;
  unit_no?: string;
  final_redirect?: string;
};

/** Deduplicates React Strict Mode double-invoke so the token is only consumed once per load. */
const consumePromises = new Map<string, Promise<ConsumeOk>>();

function consumeEntryTokenOnce(token: string): Promise<ConsumeOk> {
  const hit = consumePromises.get(token);
  if (hit) return hit;

  const p = (async (): Promise<ConsumeOk> => {
    const { data, error } = await supabase.functions.invoke<ConsumeResponse>(
      'consume-entry-token',
      { body: { token } },
    );

    if (error) throw new Error(error.message || 'Network error');

    const d = data;
    // Coalesce snake_case fallbacks so we tolerate either naming convention from the backend
    const resolvedPropertyId = d?.propertyId || d?.property_id || '';
    const resolvedFinalRedirect = d?.final_redirect || '';
    if (
      !d ||
      d.ok !== true ||
      !d.access_token ||
      !d.refresh_token ||
      !resolvedFinalRedirect ||
      !resolvedPropertyId
    ) {
      throw new Error(typeof d?.message === 'string' ? d.message : 'Invalid or expired entry link');
    }

    return {
      ok: true,
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      final_redirect: resolvedFinalRedirect,
      propertyId: resolvedPropertyId,
      unitNo: d.unitNo || d.unit_no || '',
      kind: d.kind ?? '',
      reason: d.reason ?? null,
    };
  })();

  consumePromises.set(token, p);
  return p;
}

function persistPropertyId(propertyId: string) {
  try {
    localStorage.setItem('currentPropertyId', propertyId);
    localStorage.setItem('clearstrata-current-property-id', propertyId);
  } catch {
    /* ignore */
  }
}

/**
 * Landing page for QR entry auto-login: `/entry/auto-login?token=…`
 * Consumes a one-time entry_token → establishes Supabase session → navigates to final_redirect.
 */
export function EntryAutoLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const { setCurrentPropertyId } = useProperty();
  const zh = language === 'zh';

  const token = (searchParams.get('token') || '').trim();
  const [error, setError] = useState<string | null>(null);
  // Prevents StrictMode double-invoke from consuming the token twice
  const didConsumeRef = useRef(false);

  useEffect(() => {
    if (didConsumeRef.current) return;
    didConsumeRef.current = true;

    if (!token) {
      setError('invalid_or_used');
      return;
    }

    consumeEntryTokenOnce(token)
      .then(async (payload) => {
        if (!payload?.access_token) return;

        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: payload.access_token,
          refresh_token: payload.refresh_token,
        });

        if (sessionErr) {
          setError('invalid_or_used');
          return;
        }

        // Persist property context for auto_approved and already_member before navigating
        if (payload.kind === 'auto_approved' || payload.kind === 'already_member') {
          persistPropertyId(payload.propertyId);
          setCurrentPropertyId(payload.propertyId);
        }

        const finalRedirect = payload.final_redirect || '/';

        const params = new URLSearchParams();
        if (payload.propertyId) params.set('propertyId', payload.propertyId);
        if (payload.unitNo) params.set('unitNo', payload.unitNo);
        if (payload.reason) params.set('reason', payload.reason);
        if (payload.kind) params.set('kind', payload.kind);

        const paramStr = params.toString();
        const target = paramStr
          ? finalRedirect.includes('?')
            ? `${finalRedirect}&${paramStr}`
            : `${finalRedirect}?${paramStr}`
          : finalRedirect;

        console.log('[FINAL TARGET]', target, payload);

        navigate(target, {
          replace: true,
          state: {
            propertyId: payload.propertyId,
            unitNo: payload.unitNo,
            reason: payload.reason,
            reviewFlag: payload.reason,
            kind: payload.kind,
          },
        });
      })
      .catch(() => {
        // All consume-entry-token errors (non-2xx, expired, already used) show a friendly message
        setError('invalid_or_used');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex flex-col">
      {/* Top nav */}
      <header className="w-full flex items-center justify-between px-6 py-4 bg-white/70 backdrop-blur border-b border-slate-100">
        <Link to="/">
          <img src="/clearstrata-hero-logo.png" alt="ClearStrata" className="h-9 w-auto" />
        </Link>
        <button
          type="button"
          onClick={toggleLanguage}
          className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          {zh ? 'English' : '中文'}
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-10 text-center">
          {/* Card logo */}
          <div className="flex justify-center mb-6">
            <img src="/clearstrata-hero-logo.png" alt="ClearStrata" className="w-28 h-auto" />
          </div>

          {error ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                {zh ? '入楼链接无效或已使用' : 'Entry link invalid or already used'}
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                {zh
                  ? '该入楼链接已失效或已被使用。请重新扫描二维码获取新的入楼链接。'
                  : 'This entry link is invalid or has already been used. Please scan the QR code again.'}
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  to="/entry"
                  className="w-full py-3 rounded-2xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors text-center"
                >
                  {zh ? '重新扫码入楼' : 'Scan QR code again'}
                </Link>
                <Link
                  to="/"
                  className="w-full py-3 rounded-2xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors text-center"
                >
                  {zh ? '返回首页' : 'Back to home'}
                </Link>
              </div>
            </>
          ) : (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mx-auto mb-4" />
              <p className="text-slate-600 text-sm">
                {zh ? '正在验证身份并进入系统…' : 'Verifying your entry and signing in…'}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
