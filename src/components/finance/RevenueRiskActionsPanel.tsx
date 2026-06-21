import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/budget/dashboardApi';
import { listBudgetRiskAlerts } from '../../features/finance/budgetRiskAlertsApi';
import {
  createManualCouncilAction,
  listNonCompletedActionTitles,
  type CouncilActionPriority,
} from '../../features/finance/councilActionsApi';

type Lang = 'en' | 'zh';

export type RevenueRiskActionsPanelProps = {
  propertyId: string | null;
  fiscalYear?: number;
  language: Lang;
  /** Council / admin / property_admin can create actions. */
  canManage: boolean;
  onActionCreated?: () => void;
};

type RevenueRisk = {
  key: string;
  /** Display heading on the card. */
  heading: string;
  /** Secondary detail line on the card. */
  detail: string;
  priority: CouncilActionPriority;
  /** Title actually written to council_actions. */
  title: string;
  description: string;
  alert_category: string | null;
  /** All title variants (en/zh) considered the "same" action for dedup. */
  dedupeTitles: string[];
};

// council_actions.action_type CHECK forbids 'financial_risk'; 'revenue_collection'
// is the allowed value used for revenue alerts, so we route these risks there.
const REVENUE_ACTION_TYPE = 'revenue_collection' as const;

const REVENUE_BUDGET_ARREARS_RATIO = 0.05;
const ARREARS_UNITS_RATIO = 0.1;

export function RevenueRiskActionsPanel({
  propertyId,
  fiscalYear,
  language,
  canManage,
  onActionCreated,
}: RevenueRiskActionsPanelProps) {
  const en = language === 'en';
  const year = fiscalYear ?? new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [risks, setRisks] = useState<RevenueRisk[]>([]);
  const [openTitles, setOpenTitles] = useState<Set<string>>(new Set());
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [alerts, ledgerRes, reconRes, unitRes, titles] = await Promise.all([
      listBudgetRiskAlerts(propertyId, year),
      supabase
        .from('ledger_transactions')
        .select('user_id, balance, transaction_date')
        .eq('property_id', propertyId)
        .order('transaction_date', { ascending: false }),
      supabase
        .from('budget_revenue_reconciliation')
        .select('budget_amount')
        .eq('property_id', propertyId)
        .eq('fiscal_year', year),
      supabase
        .from('unit_whitelist')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId)
        .eq('is_active', true),
      listNonCompletedActionTitles(propertyId),
    ]);

    // Owner ledger: latest running balance per owner
    const ledgerRows = ledgerRes.data ?? [];
    const latestByUser = new Map<string, number>();
    for (const t of ledgerRows) {
      const uid = String(t.user_id);
      if (!latestByUser.has(uid)) latestByUser.set(uid, Number(t.balance ?? 0));
    }
    let outstanding = 0;
    let arrearsUnits = 0;
    latestByUser.forEach((balance) => {
      if (balance > 0) {
        outstanding += balance;
        arrearsUnits += 1;
      }
    });

    const agmRevenueBudget = (reconRes.data ?? []).reduce(
      (sum, r) => sum + Number(r.budget_amount ?? 0),
      0,
    );
    const totalUnits = unitRes.count ?? 0;

    const next: RevenueRisk[] = [];

    // Risk 1 — budget collection low/critical (from budget_risk_alerts)
    const revAlert = alerts.find(
      (a) =>
        a.alert_type === 'REVENUE_COLLECTION_LOW' ||
        a.alert_type === 'REVENUE_COLLECTION_CRITICAL',
    );
    if (revAlert) {
      const category = revAlert.budget_category ?? 'Strata Fees';
      const pct = revAlert.percent_value;
      const pctText = pct == null ? '—' : `${pct.toFixed(1)}%`;
      const titleZh = `收入收缴偏低：${category}`;
      const titleEn = `Revenue collection low: ${category}`;
      next.push({
        key: 'collection_low',
        heading: en ? 'Revenue collection low' : '收入收缴偏低',
        detail: en
          ? `${category} · budget realization ${pctText}`
          : `${category} · 预算执行率 ${pctText}`,
        priority: 'high',
        title: en ? titleEn : titleZh,
        description: en
          ? `Budget realization for ${category} is ${pctText} (AGM revenue budget vs mapped bank credits).`
          : `${category} 预算执行率为 ${pctText}（AGM 收入预算 vs 银行入账）。`,
        alert_category: category,
        dedupeTitles: [titleZh, titleEn],
      });
    }

    // Risk 2 — total arrears too high vs AGM revenue budget
    if (agmRevenueBudget > 0 && outstanding > agmRevenueBudget * REVENUE_BUDGET_ARREARS_RATIO) {
      const titleZh = '欠费总额过高';
      const titleEn = 'Total arrears too high';
      next.push({
        key: 'arrears_total',
        heading: en ? 'Total arrears too high' : '欠费总额过高',
        detail: en
          ? `Current arrears ${formatCurrency(outstanding, language)}`
          : `当前欠费 ${formatCurrency(outstanding, language)}`,
        priority: 'high',
        title: en ? titleEn : titleZh,
        description: en
          ? `Owner arrears total ${formatCurrency(outstanding, language)}, exceeding 5% of the AGM revenue budget ${formatCurrency(agmRevenueBudget, language)}.`
          : `业主欠费总额 ${formatCurrency(outstanding, language)}，已超过 AGM 收入预算 ${formatCurrency(agmRevenueBudget, language)} 的 5%。`,
        alert_category: null,
        dedupeTitles: [titleZh, titleEn],
      });
    }

    // Risk 3 — too many units in arrears vs total units
    if (totalUnits > 0 && arrearsUnits > totalUnits * ARREARS_UNITS_RATIO) {
      const titleZh = '欠费单位过多';
      const titleEn = 'Too many units in arrears';
      next.push({
        key: 'arrears_units',
        heading: en ? 'Too many units in arrears' : '欠费单位过多',
        detail: en
          ? `Units in arrears ${arrearsUnits} / ${totalUnits}`
          : `欠费单位 ${arrearsUnits} / ${totalUnits}`,
        priority: 'medium',
        title: en ? titleEn : titleZh,
        description: en
          ? `${arrearsUnits} of ${totalUnits} units are in arrears, exceeding 10% of total units.`
          : `${totalUnits} 个单位中有 ${arrearsUnits} 个欠费，已超过总单位数的 10%。`,
        alert_category: null,
        dedupeTitles: [titleZh, titleEn],
      });
    }

    setRisks(next);
    setOpenTitles(titles);
    setLoading(false);
  }, [propertyId, year, en, language]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (risk: RevenueRisk) => {
    if (!propertyId) return;
    setCreatingKey(risk.key);
    setMessage(null);
    const { error, existing } = await createManualCouncilAction(
      {
        propertyId,
        title: risk.title,
        description: risk.description,
        action_type: REVENUE_ACTION_TYPE,
        priority: risk.priority,
        alert_type: null,
        alert_category: risk.alert_category,
      },
      risk.dedupeTitles,
    );
    setCreatingKey(null);

    if (error) {
      setMessage(error);
      return;
    }
    setOpenTitles((prev) => {
      const nextSet = new Set(prev);
      risk.dedupeTitles.forEach((t) => nextSet.add(t));
      return nextSet;
    });
    setMessage(
      existing
        ? en
          ? 'An in-progress council action already exists.'
          : '已存在进行中的业委会行动。'
        : en
          ? 'Council action created.'
          : '业委会行动已创建。',
    );
    onActionCreated?.();
  };

  const hasOpenAction = (risk: RevenueRisk) =>
    risk.dedupeTitles.some((t) => openTitles.has(t));

  if (loading) {
    return (
      <section className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {en ? 'Loading revenue risk actions…' : '正在加载收入风险行动…'}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-amber-500" aria-hidden />
        <h3 className="text-base font-semibold text-gray-900">
          {en ? 'Revenue Risk Actions' : '收入风险行动'}
        </h3>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {en
          ? 'Turn revenue risks into council actions: assign a manager, collect feedback, then council reviews and closes.'
          : '将收入风险转化为业委会行动：分配经理、收集反馈，再由业委会审核关闭。'}
      </p>

      {message ? <p className="mt-3 text-sm text-violet-800">{message}</p> : null}

      {risks.length === 0 ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm">
          <ShieldCheck size={16} className="text-emerald-600" aria-hidden />
          <span className="text-emerald-800">
            {en ? 'No revenue risks detected.' : '暂无收入风险。'}
          </span>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {risks.map((risk) => {
            const open = hasOpenAction(risk);
            return (
              <div
                key={risk.key}
                className="flex flex-col justify-between rounded-xl border border-gray-200 bg-gray-50/60 p-4"
              >
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{risk.heading}</h4>
                  <p className="mt-1 text-sm text-gray-600">{risk.detail}</p>
                </div>
                <div className="mt-3">
                  {open ? (
                    <span className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500">
                      {en ? 'In-progress action exists' : '已存在进行中的业委会行动'}
                    </span>
                  ) : canManage ? (
                    <button
                      type="button"
                      disabled={creatingKey === risk.key}
                      onClick={() => void handleCreate(risk)}
                      className="w-full rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {creatingKey === risk.key
                        ? en
                          ? 'Creating…'
                          : '创建中…'
                        : en
                          ? 'Create Council Action'
                          : '创建业委会行动'}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
