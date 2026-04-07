/**
 * Best / low-conversion insight cards for invite analytics.
 * Scoring: best = max(conversion_rate * log(request_count + 1)) among rows with request_count >= 5.
 */

export type InviteInsightRow = {
  kind: string;
  label: string;
  identifier: string;
  request_count: number;
  approved_count: number;
  rejected_count: number;
  conversion_rate: number;
};

/** Rows with enough volume for stable scoring. */
const MIN_REQUESTS = 5;

export function computeBestInviteRow(rows: InviteInsightRow[]): InviteInsightRow | null {
  const eligible = rows.filter((r) => r.request_count >= MIN_REQUESTS);
  if (eligible.length === 0) return null;
  let best: InviteInsightRow | null = null;
  let bestScore = -Infinity;
  for (const r of eligible) {
    const cr = r.conversion_rate ?? 0;
    const score = cr * Math.log(r.request_count + 1);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

const LOW_CONVERSION_THRESHOLD = 0.3;

export function computeLowConversionRow(rows: InviteInsightRow[]): InviteInsightRow | null {
  const eligible = rows
    .filter((r) => r.request_count >= MIN_REQUESTS && (r.conversion_rate ?? 0) < LOW_CONVERSION_THRESHOLD)
    .sort((a, b) => b.request_count - a.request_count);
  return eligible[0] ?? null;
}

function kindLabel(kind: string, en: boolean): string {
  const m: Record<string, [string, string]> = {
    public: ['Public code', '公开邀请码'],
    direct: ['Directed invite', '定向邀请'],
    legacy: ['Classic invite', '经典邀请'],
  };
  const pair = m[kind] ?? [kind, kind];
  return en ? pair[0] : pair[1];
}

type CardProps = {
  en: boolean;
  row: InviteInsightRow | null;
};

export function BestInviteCard({ en, row }: CardProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-emerald-900">🏆 {en ? 'Best entry' : '本月最佳入口'}</h2>
      {!row ? (
        <p className="mt-4 flex-1 text-sm text-emerald-800/80">{en ? 'Not enough data yet.' : '暂无足够数据'}</p>
      ) : (
        <>
          <p className="mt-3 text-lg font-semibold leading-snug text-gray-900">{row.label}</p>
          <p className="mt-1 text-xs text-gray-500">{kindLabel(row.kind, en)}</p>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-700/80">
                {en ? 'Conversion' : '转化率'}
              </div>
              <div className="text-3xl font-bold tabular-nums text-emerald-700">
                {((row.conversion_rate ?? 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {en ? 'Applications' : '申请数'}
              </div>
              <div className="text-xl font-semibold tabular-nums text-gray-900">{row.request_count}</div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-emerald-900/80">
            {en ? 'Brings the most effective users for this period.' : '带来最多有效用户'}
          </p>
        </>
      )}
    </div>
  );
}

export function LowConversionCard({ en, row }: CardProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-amber-900">⚠️ {en ? 'Low conversion' : '低转化入口'}</h2>
      {!row ? (
        <p className="mt-4 flex-1 text-sm text-amber-900/80">{en ? 'No low-conversion entry found.' : '暂无低转化入口'}</p>
      ) : (
        <>
          <p className="mt-3 text-lg font-semibold leading-snug text-gray-900">{row.label}</p>
          <p className="mt-1 text-xs text-gray-500">{kindLabel(row.kind, en)}</p>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-amber-800/90">
                {en ? 'Conversion' : '转化率'}
              </div>
              <div className="text-3xl font-bold tabular-nums text-amber-800">
                {((row.conversion_rate ?? 0) * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {en ? 'Applications' : '申请数'}
              </div>
              <div className="text-xl font-semibold tabular-nums text-gray-900">{row.request_count}</div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-amber-950/85">
            {en
              ? 'Consider improving the entry copy or switching to directed invites.'
              : '建议优化入口文案或改为定向邀请'}
          </p>
        </>
      )}
    </div>
  );
}
