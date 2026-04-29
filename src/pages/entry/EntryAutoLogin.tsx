import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
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
  const didNavigate = useRef(false);

  useEffect(() => {
    if (!token) {
      setError(zh ? '链接无效：缺少 token。' : 'Invalid link: missing token.');
      return;
    }

    let cancelled = false;

    void consumeEntryTokenOnce(token)
      .then(async (payload) => {
        if (cancelled) return;

        // Establish the Supabase session using the one-time tokens
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: payload.access_token,
          refresh_token: payload.refresh_token,
        });

        if (cancelled) return;

        if (sessionErr) {
          setError(
            sessionErr.message || (zh ? '无法建立登录会话。' : 'Could not establish session.'),
          );
          return;
        }

        // Navigate immediately after session is established.
        // Must happen before any cancelled / didNavigate guard because setSession fires an
        // auth state change that can trigger App.tsx cleanup (cancelled = true).

        // Coalesce camelCase and snake_case — backend may return either
        const finalRedirect = payload.final_redirect || '/';
        const propertyId = payload.propertyId;
        const unitNo = payload.unitNo;
        const reason = payload.reason;
        const kind = payload.kind;

        // Persist property context for auto_approved and already_member before navigating
        if (kind === 'auto_approved' || kind === 'already_member') {
          persistPropertyId(propertyId);
          setCurrentPropertyId(propertyId);
        }

        const params = new URLSearchParams();
        if (propertyId) params.set('propertyId', propertyId);
        if (unitNo) params.set('unitNo', unitNo);
        if (reason) params.set('reason', reason);
        if (kind) params.set('kind', kind);

        const paramStr = params.toString();
        const target = paramStr
          ? finalRedirect.includes('?')
            ? `${finalRedirect}&${paramStr}`
            : `${finalRedirect}?${paramStr}`
          : finalRedirect;

        navigate(target, {
          replace: true,
          state: {
            propertyId,
            unitNo,
            reason,
            reviewFlag: reason,
            kind,
          },
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || (zh ? '入楼链接无效或已使用。' : 'This entry link is invalid or has already been used.'));
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <Link to="/" className="flex items-center gap-2 text-slate-800 font-semibold">
          <Building2 className="h-6 w-6 text-emerald-600" />
          ClearStrata
        </Link>
        <button
          type="button"
          onClick={toggleLanguage}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          {zh ? 'English' : '中文'}
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          {error ? (
            <>
              <Building2 className="h-10 w-10 text-slate-400 mx-auto mb-4" />
              <p className="text-red-600 text-sm mb-4">{error}</p>
              <Link
                to="/entry"
                className="text-emerald-700 text-sm font-medium hover:underline"
              >
                {zh ? '重新扫码入楼' : 'Try scanning again'}
              </Link>
            </>
          ) : (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mx-auto mb-4" />
              <p className="text-slate-700 text-sm">
                {zh ? '正在验证身份并进入系统…' : 'Verifying your entry and signing in…'}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
