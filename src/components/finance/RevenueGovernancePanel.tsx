import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Gauge, Loader2, Receipt, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/budget/dashboardApi';

type Lang = 'en' | 'zh';

type ArrearsRow = {
  user_id: string;
  unit_number: string | null;
  owner_name: string;
  balance: number;
  latest_date: string | null;
};

type PaymentRow = {
  id: string;
  user_id: string;
  unit_number: string | null;
  owner_name: string;
  description: string;
  amount: number;
  transaction_date: string;
};

type CollectionRate = {
  label: string;
  percent: number | null;
  budgetAmount: number;
  actualAmount: number;
};

export type RevenueGovernancePanelProps = {
  propertyId: string | null;
  language: Lang;
  /** Council/admin/manager/property_admin only — arrears + payments are sensitive. */
  canSeeArrears: boolean;
};

const STRATA_FEE_HINTS = ['strata fee', 'strata fees', '物业费', '管理费'];

function ownerDisplayName(
  en: boolean,
  profile: { full_name_en?: string | null; full_name_zh?: string | null } | undefined,
): string {
  if (!profile) return en ? 'Unknown' : '未知';
  const enName = profile.full_name_en?.trim() ?? '';
  const zhName = profile.full_name_zh?.trim() ?? '';
  return en ? enName || zhName || 'Unknown' : zhName || enName || '未知';
}

/**
 * Revenue Governance Panel (MVP). Keeps two distinct revenue notions separate:
 *  - Budget collection rate  → budget_revenue_reconciliation (mapped bank credits vs AGM revenue budget)
 *  - Owner arrears           → ledger_transactions latest running balance per owner
 * Read-only; no schema or migration changes.
 */
export function RevenueGovernancePanel({ propertyId, language, canSeeArrears }: RevenueGovernancePanelProps) {
  const en = language === 'en';
  const [loading, setLoading] = useState(true);
  const [collection, setCollection] = useState<CollectionRate | null>(null);
  const [outstanding, setOutstanding] = useState(0);
  const [arrears, setArrears] = useState<ArrearsRow[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentRow[]>([]);
  const [last30Total, setLast30Total] = useState(0);

  const load = useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const fiscalYear = new Date().getFullYear();

    // 1) Budget collection rate (bank-mapped vs AGM revenue budget)
    const { data: reconRows } = await supabase
      .from('budget_revenue_reconciliation')
      .select('category, budget_amount, actual_amount, collection_percent')
      .eq('property_id', propertyId)
      .eq('fiscal_year', fiscalYear);

    if (reconRows && reconRows.length > 0) {
      const strata = reconRows.find((r) =>
        STRATA_FEE_HINTS.includes(String(r.category ?? '').trim().toLowerCase()),
      );
      if (strata) {
        setCollection({
          label: String(strata.category ?? (en ? 'Strata Fees' : '物业费')),
          percent: strata.collection_percent != null ? Number(strata.collection_percent) : null,
          budgetAmount: Number(strata.budget_amount ?? 0),
          actualAmount: Number(strata.actual_amount ?? 0),
        });
      } else {
        const budgetTotal = reconRows.reduce((s, r) => s + Number(r.budget_amount ?? 0), 0);
        const actualTotal = reconRows.reduce((s, r) => s + Number(r.actual_amount ?? 0), 0);
        setCollection({
          label: en ? 'All revenue' : '全部收入',
          percent: budgetTotal > 0 ? Math.round((actualTotal / budgetTotal) * 1000) / 10 : null,
          budgetAmount: budgetTotal,
          actualAmount: actualTotal,
        });
      }
    } else {
      setCollection(null);
    }

    // 2-4) Owner ledger: latest balance per owner + recent payments
    const { data: ledger } = await supabase
      .from('ledger_transactions')
      .select('id, user_id, balance, payment_amount, description, transaction_date')
      .eq('property_id', propertyId)
      .order('transaction_date', { ascending: false });

    const rows = ledger ?? [];

    const latestByUser = new Map<string, { balance: number; date: string | null }>();
    for (const t of rows) {
      const uid = String(t.user_id);
      if (!latestByUser.has(uid)) {
        latestByUser.set(uid, {
          balance: Number(t.balance ?? 0),
          date: t.transaction_date != null ? String(t.transaction_date) : null,
        });
      }
    }

    let outstandingSum = 0;
    const arrearsUsers: { user_id: string; balance: number; latest_date: string | null }[] = [];
    latestByUser.forEach((v, uid) => {
      if (v.balance > 0) {
        outstandingSum += v.balance;
        arrearsUsers.push({ user_id: uid, balance: v.balance, latest_date: v.date });
      }
    });
    setOutstanding(outstandingSum);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    let last30 = 0;
    const paymentRowsRaw = rows.filter((t) => Number(t.payment_amount ?? 0) > 0);
    for (const t of paymentRowsRaw) {
      if (t.transaction_date != null && String(t.transaction_date).slice(0, 10) >= cutoffStr) {
        last30 += Number(t.payment_amount ?? 0);
      }
    }
    setLast30Total(last30);

    if (!canSeeArrears) {
      setArrears([]);
      setRecentPayments([]);
      setLoading(false);
      return;
    }

    const recentRaw = paymentRowsRaw.slice(0, 10);

    const userIds = [
      ...new Set([
        ...arrearsUsers.map((a) => a.user_id),
        ...recentRaw.map((r) => String(r.user_id)),
      ]),
    ];

    const profilesById = new Map<string, { full_name_en?: string | null; full_name_zh?: string | null }>();
    const unitById = new Map<string, string | null>();
    if (userIds.length > 0) {
      const [{ data: profiles }, { data: ownerInfos }] = await Promise.all([
        supabase.from('profiles').select('id, full_name_en, full_name_zh').in('id', userIds),
        supabase
          .from('owner_info')
          .select('user_id, unit_number')
          .eq('property_id', propertyId)
          .in('user_id', userIds),
      ]);
      for (const p of profiles ?? []) profilesById.set(String(p.id), p);
      for (const o of ownerInfos ?? []) unitById.set(String(o.user_id), o.unit_number ?? null);
    }

    setArrears(
      arrearsUsers
        .map((a) => ({
          user_id: a.user_id,
          unit_number: unitById.get(a.user_id) ?? null,
          owner_name: ownerDisplayName(en, profilesById.get(a.user_id)),
          balance: a.balance,
          latest_date: a.latest_date,
        }))
        .sort((a, b) => b.balance - a.balance),
    );

    setRecentPayments(
      recentRaw.map((t) => ({
        id: String(t.id),
        user_id: String(t.user_id),
        unit_number: unitById.get(String(t.user_id)) ?? null,
        owner_name: ownerDisplayName(en, profilesById.get(String(t.user_id))),
        description: String(t.description ?? ''),
        amount: Number(t.payment_amount ?? 0),
        transaction_date: String(t.transaction_date ?? ''),
      })),
    );

    setLoading(false);
  }, [propertyId, en, canSeeArrears]);

  useEffect(() => {
    void load();
  }, [load]);

  const dateFmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(en ? 'en-CA' : 'zh-CN') : '—';

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{en ? 'Revenue Governance' : '收入治理'}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {en
            ? 'Budget collection rate, owner arrears and recent payments to help council follow up on revenue risk.'
            : '汇总预算收缴率、业主欠费与最近收款，帮助业委会跟进收入风险。'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {en ? 'Loading revenue governance…' : '正在加载收入治理…'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Gauge size={16} className="text-clearstrata-ui-primary" aria-hidden />
                {en ? 'Budget Realization' : '预算执行率'}
              </div>
              <div className="mt-2 text-3xl font-bold tabular-nums text-gray-900">
                {collection?.percent != null ? `${collection.percent.toFixed(1)}%` : '—'}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {collection
                  ? `${collection.label} · ${en ? 'AGM budget vs bank credits' : 'AGM预算 vs 银行入账'}`
                  : en
                    ? 'No AGM revenue budget for this year'
                    : '本年度暂无 AGM 收入预算'}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertCircle size={16} className="text-red-500" aria-hidden />
                {en ? 'Total arrears' : '欠费总额'}
              </div>
              <div className="mt-2 text-3xl font-bold tabular-nums text-red-600">
                {formatCurrency(outstanding, language)}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {en ? 'Owner ledger latest balance' : '业主 ledger 最新余额'}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users size={16} className="text-amber-500" aria-hidden />
                {en ? 'Units in arrears' : '欠费单位数'}
              </div>
              <div className="mt-2 text-3xl font-bold tabular-nums text-gray-900">
                {canSeeArrears ? arrears.length : '—'}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {en ? 'Owners with positive balance' : '余额为正的业主单位'}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Receipt size={16} className="text-clearstrata-ui-primary" aria-hidden />
                {en ? 'Recent payments (30d)' : '最近收款（30天）'}
              </div>
              <div className="mt-2 text-3xl font-bold tabular-nums text-gray-900">
                {formatCurrency(last30Total, language)}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {en ? 'Payments received in last 30 days' : '近30天已收款合计'}
              </div>
            </div>
          </div>

          {canSeeArrears ? (
            <>
              {arrears.length === 0 ? (
                <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
                  <span className="font-semibold text-gray-900">
                    {en ? 'Units in Arrears (0)' : '欠费单位（0）'}
                  </span>
                  <span className="text-emerald-700">
                    {en ? '✓ No owners currently in arrears' : '✓ 当前没有欠费业主'}
                  </span>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-200 p-4">
                    <h3 className="text-base font-bold text-gray-900">
                      {en ? `Units in Arrears (${arrears.length})` : `欠费单位（${arrears.length}）`}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-2.5 text-left">{en ? 'Unit' : '单位'}</th>
                          <th className="px-4 py-2.5 text-left">{en ? 'Owner' : '业主'}</th>
                          <th className="px-4 py-2.5 text-right">{en ? 'Arrears balance' : '欠费余额'}</th>
                          <th className="px-4 py-2.5 text-left">{en ? 'Latest entry' : '最新流水日期'}</th>
                          <th className="px-4 py-2.5 text-left">{en ? 'Note' : '备注'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {arrears.map((a) => (
                          <tr key={a.user_id} className="hover:bg-red-50/40">
                            <td className="px-4 py-3 text-gray-700">{a.unit_number || '—'}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{a.owner_name}</td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums text-red-600">
                              {formatCurrency(a.balance, language)}
                            </td>
                            <td className="px-4 py-3 text-gray-600">{dateFmt(a.latest_date)}</td>
                            <td className="px-4 py-3 text-xs text-gray-400">
                              {en ? 'No reminder records linked' : '未接入催缴记录'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {recentPayments.length === 0 ? (
                <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
                  <span className="font-semibold text-gray-900">
                    {en ? 'Recent Payments (0)' : '最近收款（0）'}
                  </span>
                  <span className="text-gray-500">
                    {en ? 'No recent payments recorded' : '暂无最近收款记录'}
                  </span>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-200 p-4">
                    <h3 className="text-base font-bold text-gray-900">
                      {en ? `Recent Payments (${recentPayments.length})` : `最近收款（${recentPayments.length}）`}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="px-4 py-2.5 text-left">{en ? 'Date' : '日期'}</th>
                          <th className="px-4 py-2.5 text-left">{en ? 'Unit' : '单位'}</th>
                          <th className="px-4 py-2.5 text-left">{en ? 'Owner' : '业主'}</th>
                          <th className="px-4 py-2.5 text-left">{en ? 'Description' : '描述'}</th>
                          <th className="px-4 py-2.5 text-right">{en ? 'Amount' : '金额'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {recentPayments.map((p) => (
                          <tr key={p.id} className="hover:bg-emerald-50/40">
                            <td className="px-4 py-3 text-gray-600">{dateFmt(p.transaction_date)}</td>
                            <td className="px-4 py-3 text-gray-700">{p.unit_number || '—'}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">{p.owner_name}</td>
                            <td className="px-4 py-3 text-gray-600">{p.description || '—'}</td>
                            <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-700">
                              {formatCurrency(p.amount, language)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
