import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  formatTrialEndDate,
  getTrialDaysRemaining,
  getTrialState,
} from '@/lib/subscription';
import { useProperty } from '@/contexts/PropertyContext';

type PropertyTrialRow = {
  subscription_status?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
};

function asMsg(err: unknown): string {
  if (!err) return '';
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string') return o.message;
    if (typeof o.code === 'string') return `${o.code}`;
  }
  return String(err);
}

function looksMissingColumn(err: unknown): boolean {
  const msg = asMsg(err).toLowerCase();
  return msg.includes('column') && msg.includes('does not exist');
}

function looksMissingTable(err: unknown): boolean {
  const msg = asMsg(err).toLowerCase();
  return msg.includes('does not exist') || msg.includes('undefined table') || msg.includes('42p01');
}

/**
 * 后台 Trial 提示条：
 * - 仅当当前物业为 trial 且存在 trial_ends_at 时展示
 * - 读取失败/列不存在：自动降级为不显示，不影响主页面
 */
export function TrialBanner() {
  const { currentPropertyId, isDemoMode, isDemoPropertyMock } = useProperty();
  const [row, setRow] = useState<PropertyTrialRow | null>(null);

  const pid = useMemo(() => (currentPropertyId ? String(currentPropertyId) : ''), [currentPropertyId]);

  useEffect(() => {
    let cancelled = false;
    if (!pid || isDemoMode || isDemoPropertyMock) {
      setRow(null);
      return;
    }

    setRow(null);
    void (async () => {
      try {
        const { data, error } = await (supabase
          .from('properties')
          .select('subscription_status,trial_started_at,trial_ends_at')
          .eq('id', pid)
          .maybeSingle() as any);
        if (cancelled) return;
        if (error) {
          if (looksMissingColumn(error) || looksMissingTable(error)) return;
          console.warn('[TrialBanner] properties select', error);
          return;
        }
        setRow((data as PropertyTrialRow) ?? null);
      } catch (e) {
        if (!cancelled) console.warn('[TrialBanner] load', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pid, isDemoMode, isDemoPropertyMock]);

  const status = String(row?.subscription_status ?? '').toLowerCase();
  const endsAt = row?.trial_ends_at ?? null;
  const daysLeft = getTrialDaysRemaining(endsAt);

  if (!pid) return null;
  if (status !== 'trial') return null;
  if (!endsAt) return null;

  const state = getTrialState(endsAt, status, 7);
  const expiring = state === 'expiring';
  const expired = state === 'expired';

  const copy = (() => {
    const endText = formatTrialEndDate(endsAt);
    if (expired) {
      return {
        title: '试用已结束，请尽快升级以继续稳定使用',
        body: '本轮仍可继续使用（不做功能锁定）。建议你尽快查看升级方案，避免后续服务调整影响正常使用。',
        cta: '立即查看升级方案',
      };
    }
    if (expiring) {
      return {
        title: '你的免费试用即将结束',
        body: `你的试用还剩 ${daysLeft} 天（到期日 ${endText}）。为避免使用中断，建议你提前查看升级方案。`,
        cta: '准备升级',
      };
    }
    return {
      title: '你正在免费试用 ClearStrata',
      body: `剩余 ${daysLeft} 天（到期日 ${endText}）。现在就开始导入房号、邀请成员、上传发票，充分体验透明管理的价值。`,
      cta: '查看定价',
    };
  })();

  return (
    <div
      className={
        expired
          ? 'mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm'
          : expiring
            ? 'mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-sm'
            : 'mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm'
      }
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {expired || expiring ? (
              <AlarmClock className="h-4 w-4 text-rose-600" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
            )}
            <p className="text-sm font-semibold text-gray-900">{copy.title}</p>
          </div>
          <p className="mt-1 text-sm text-gray-700">{copy.body}</p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            to="/upgrade"
            className={
              expiring || expired
                ? 'inline-flex items-center justify-center rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#178a66] active:scale-[0.99]'
                : 'inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50'
            }
          >
            {copy.cta}
          </Link>
          <Link to="/pricing" className="text-xs font-semibold text-gray-600 hover:text-gray-900">
            查看定价 →
          </Link>
        </div>
      </div>
    </div>
  );
}

