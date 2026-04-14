import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  demoUnitDraftKey,
  setStoredDemoInviteCode,
} from '@/lib/demoProperty/demoStorage';

type ResolveInvite = { ok?: boolean; reason?: string; property_id?: string; property_name?: string };

function errMsg(error: string | undefined): string {
  switch (error) {
    case 'not_authenticated':
      return '无法建立会话，请刷新页面或登录后再试。';
    case 'invalid_arguments':
      return '请填写房号。';
    case 'invalid_code':
      return '邀请码无效。';
    case 'inactive_code':
      return '该邀请码已停用。';
    case 'expired':
      return '邀请码已过期。';
    case 'exhausted':
      return '邀请码使用次数已达上限。';
    case 'unit_claimed':
      return '该房号已绑定其他用户，请联系业委会。';
    case 'unit_not_whitelisted':
      return '该房号未列入业委会白名单，请联系业委会添加后再试。';
    default:
      return error ? `操作失败：${error}` : '操作失败，请稍后重试。';
  }
}

/**
 * 扫码落地页：`/join/:code`。海报与演示转化入口。
 */
export function JoinCodeScanPage() {
  const { code: rawCode } = useParams<{ code: string }>();
  const code = rawCode?.trim() ?? '';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromDemo = searchParams.get('from') === 'demo';

  const [unit, setUnit] = useState('');
  const [checkingCode, setCheckingCode] = useState(true);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [propertyName, setPropertyName] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const ownerSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = searchParams.get('unit')?.trim();
    if (q) {
      setUnit(q);
      return;
    }
    if (code) {
      const draft = sessionStorage.getItem(demoUnitDraftKey(code))?.trim();
      if (draft) {
        setUnit(draft);
        return;
      }
      const legacy = sessionStorage.getItem(`scan_join_unit_${code}`)?.trim();
      if (legacy) setUnit(legacy);
    }
  }, [searchParams, code]);

  useEffect(() => {
    if (!code) return;
    const t = window.setTimeout(() => {
      try {
        const u = unit.trim();
        if (u) sessionStorage.setItem(demoUnitDraftKey(code), u);
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(t);
  }, [unit, code]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!code) {
        if (!cancelled) {
          setCodeError('链接中缺少邀请码。');
          setCheckingCode(false);
        }
        return;
      }
      const { data, error } = await supabase.rpc('resolve_public_invite_code', { p_code: code });
      if (cancelled) return;
      if (error) {
        console.error('resolve_public_invite_code', error);
        setCodeError('无法校验邀请码，请检查网络后重试。');
        setCheckingCode(false);
        return;
      }
      const row = data as ResolveInvite;
      if (!row?.ok) {
        setCodeError(
          row?.reason === 'expired'
            ? '邀请码已过期。'
            : row?.reason === 'exhausted'
              ? '邀请码已用尽。'
              : '邀请码无效或已停用。',
        );
        setCheckingCode(false);
        return;
      }
      setPropertyName(typeof row.property_name === 'string' ? row.property_name : null);
      setCheckingCode(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setSubmitError(null);
      const u = unit.trim();
      if (!code || !u) {
        setSubmitError('请输入房号。');
        return;
      }

      setSubmitting(true);
      try {
        let { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          const anon = await supabase.auth.signInAnonymously();
          if (anon.error) {
            console.error('signInAnonymously', anon.error);
            setSubmitError(
              anon.error.message?.includes('anonymous') || anon.error.message?.includes('Anonymous')
                ? '当前环境未开启匿名登录：请在 Supabase Authentication → Providers 中启用 Anonymous sign-in，或使用普通账号登录后再访问本链接。'
                : `无法建立匿名会话：${anon.error.message}`,
            );
            return;
          }
          session = anon.data.session;
        }

        if (!session?.user) {
          setSubmitError('未获取到用户信息，请重试。');
          return;
        }

        const { data, error } = await supabase.rpc('demo_marketing_scan_join', {
          p_invite_code: code,
          p_unit_no: u,
        });

        if (error) {
          console.error('demo_marketing_scan_join', error);
          setSubmitError(error.message || '加入失败');
          return;
        }

        const payload = data as { ok?: boolean; error?: string; property_id?: string };
        if (!payload?.ok) {
          setSubmitError(errMsg(payload?.error));
          return;
        }

        const pid = payload.property_id as string | undefined;
        if (!pid) {
          setSubmitError('未返回物业信息。');
          return;
        }

        sessionStorage.setItem(`scan_join_unit_${code}`, u);
        navigate(`/demo-overview?propertyId=${encodeURIComponent(pid)}&unit=${encodeURIComponent(u)}`, {
          replace: true,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [code, unit, navigate],
  );

  if (checkingCode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4">
        <div className="h-12 w-12 rounded-full border-4 border-emerald-400/30 border-t-emerald-400 animate-spin" />
        <p className="mt-4 text-sm text-slate-400">正在校验邀请码…</p>
      </div>
    );
  }

  if (codeError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4 text-center">
        <p className="text-lg font-medium text-white">{codeError}</p>
        <p className="mt-2 max-w-md text-sm text-slate-400">请向业委会索取有效二维码或邀请链接。</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12 flex flex-col items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight text-white">🏢 欢迎加入本物业</h1>
        {propertyName ? (
          <p className="mt-2 text-center text-sm text-slate-400">{propertyName}</p>
        ) : null}

        {fromDemo ? (
          <div className="mt-5 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p className="font-semibold text-amber-50">你当前看到的是演示系统</p>
            <p className="mt-1 leading-relaxed text-amber-100/90">
              输入真实房号后，可查看你所在楼的真实费用数据。演示数据不会写入业委会台账。
            </p>
          </div>
        ) : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => ownerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="rounded-xl bg-emerald-500 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.98]"
          >
            我是本楼业主
            <span className="mt-0.5 block text-xs font-normal opacity-90">输入房号进入</span>
          </button>
          <Link
            to="/demo-property"
            onClick={() => setStoredDemoInviteCode(code)}
            className="flex flex-col items-center justify-center rounded-xl border border-white/20 bg-white/5 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-white/10"
          >
            我先看看系统
            <span className="mt-0.5 block text-xs font-normal text-slate-300">进入 Demo 楼</span>
          </Link>
        </div>

        <div ref={ownerSectionRef} className="mt-10 scroll-mt-8">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
            业主 · 输入房号查看本楼支出
          </p>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div>
              <label htmlFor="unit" className="block text-sm font-medium text-slate-300">
                请输入您的房号
              </label>
              <input
                id="unit"
                type="text"
                inputMode="text"
                autoComplete="off"
                placeholder="例如 304"
                value={unit}
                onChange={(ev) => setUnit(ev.target.value)}
                className="mt-2 w-full rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-center text-lg font-semibold text-white placeholder:text-slate-600 outline-none ring-emerald-400/40 focus:border-emerald-400/50 focus:ring-2"
              />
            </div>

            {submitError ? <p className="text-center text-sm text-red-400">{submitError}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full overflow-hidden rounded-xl bg-emerald-500 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition active:scale-[0.98] hover:bg-emerald-400 disabled:opacity-60 disabled:active:scale-100"
            >
              <span className={submitting ? 'opacity-0' : ''}>立即查看本楼花费</span>
              {submitting ? (
                <span className="absolute inset-0 flex items-center justify-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  处理中…
                </span>
              ) : null}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
