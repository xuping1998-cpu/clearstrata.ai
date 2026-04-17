import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProperty } from '@/contexts/PropertyContext';

type SetupState = {
  loading: boolean;
  shouldShow: boolean;
  reason?: string;
};

function asMsg(err: unknown): string {
  if (!err) return '';
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string') return o.message;
  }
  return String(err);
}

function looksMissingTable(err: unknown): boolean {
  const msg = asMsg(err).toLowerCase();
  return msg.includes('does not exist') || msg.includes('undefined table') || msg.includes('42p01');
}

function looksMissingColumn(err: unknown): boolean {
  const msg = asMsg(err).toLowerCase();
  return msg.includes('column') && msg.includes('does not exist');
}

async function countSafe(table: string, propertyId: string): Promise<number | null> {
  try {
    const { count, error } = await (supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('property_id', propertyId) as any);
    if (error) {
      if (looksMissingTable(error) || looksMissingColumn(error)) return null;
      console.warn('[setup-checklist] count', table, error);
      return null;
    }
    return typeof count === 'number' ? count : null;
  } catch (e) {
    console.warn('[setup-checklist] count exception', table, e);
    return null;
  }
}

async function fetchPropertyMeta(propertyId: string): Promise<{ created_at?: string; status?: string } | null> {
  // status is optional in schema; try with status first, then without.
  {
    const { data, error } = await (supabase
      .from('properties')
      .select('created_at,status')
      .eq('id', propertyId)
      .maybeSingle() as any);
    if (!error && data) return data as any;
    if (error && looksMissingColumn(error)) {
      // retry without status
    } else if (error) {
      console.warn('[setup-checklist] properties meta', error);
      return null;
    }
  }
  const { data, error } = await (supabase
    .from('properties')
    .select('created_at')
    .eq('id', propertyId)
    .maybeSingle() as any);
  if (error) {
    console.warn('[setup-checklist] properties meta (fallback)', error);
    return null;
  }
  return (data as any) ?? null;
}

function TaskRow({
  title,
  description,
  buttonLabel,
  onGo,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onGo: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-0.5 text-xs text-gray-600">{description}</p>
      </div>
      <button
        type="button"
        onClick={onGo}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-100"
      >
        {buttonLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * 首页“开通任务卡”：只在新物业/试用期/关键数据缺失时展示。
 * - 不依赖 status 字段存在；缺失则降级为“关键数据缺失”判断。
 * - 表缺失时不报错，直接降级为不展示（避免破坏老库）。
 */
export function PropertySetupChecklist() {
  const navigate = useNavigate();
  const { currentPropertyId, isDemoMode, isDemoPropertyMock } = useProperty();

  const [state, setState] = useState<SetupState>({ loading: true, shouldShow: false });

  const pid = useMemo(() => (currentPropertyId ? String(currentPropertyId) : ''), [currentPropertyId]);

  useEffect(() => {
    let cancelled = false;
    if (!pid || isDemoMode || isDemoPropertyMock) {
      setState({ loading: false, shouldShow: false, reason: 'not_applicable' });
      return;
    }

    setState({ loading: true, shouldShow: false });
    void (async () => {
      const meta = await fetchPropertyMeta(pid);
      const invoices = await countSafe('invoices', pid);
      const members = await countSafe('property_members', pid);
      const announcements = await countSafe('community_notifications', pid);

      if (cancelled) return;

      const createdAt = meta?.created_at ? new Date(String(meta.created_at)) : null;
      const isNew =
        createdAt != null && !Number.isNaN(createdAt.getTime())
          ? Date.now() - createdAt.getTime() < 1000 * 60 * 60 * 24 * 14
          : false;
      const isTrial = String(meta?.status ?? '').toLowerCase() === 'trial';

      const hasInvoices = typeof invoices === 'number' ? invoices > 0 : false;
      const hasMoreThanCreator =
        typeof members === 'number' ? members >= 2 : false;
      const hasAnnouncements = typeof announcements === 'number' ? announcements > 0 : false;

      const missingKeyData = !hasInvoices || !hasMoreThanCreator || !hasAnnouncements;

      // If we couldn't read any signals (e.g. missing tables), don't show.
      const anySignalKnown =
        typeof invoices === 'number' || typeof members === 'number' || typeof announcements === 'number' || Boolean(meta);
      if (!anySignalKnown) {
        setState({ loading: false, shouldShow: false, reason: 'no_signals' });
        return;
      }

      const shouldShow = isTrial || isNew || missingKeyData;
      setState({ loading: false, shouldShow, reason: shouldShow ? 'needs_setup' : 'active' });
    })();

    return () => {
      cancelled = true;
    };
  }, [pid, isDemoMode, isDemoPropertyMock]);

  if (state.loading) {
    return (
      <div className="mb-5 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          开通引导加载中…
        </div>
      </div>
    );
  }

  if (!state.shouldShow) return null;

  return (
    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <p className="text-sm font-semibold text-gray-900">你的物业已创建成功</p>
          </div>
          <p className="mt-1 text-sm text-gray-700">再完成以下 3 步，即可开始正式使用</p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:flex-nowrap">
          <button
            type="button"
            onClick={() => navigate('/property-admin/unit-whitelist')}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
          >
            导入房号
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/property-admin/invites')}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
          >
            邀请成员
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/invoices/upload')}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
          >
            上传第一张发票
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

