import type { HardSignalCandidate } from './vendorRiskTypes';

const MS_12M = 365 * 24 * 60 * 60 * 1000;

export function normalizeVendorName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

type InvoiceRow = {
  id: string;
  vendor_name: string | null;
  total_amount: number | null;
  category: string | null;
  created_at: string;
};

type JobRow = {
  id: string;
  category: string | null;
  created_at: string | null;
  selected_quote_id: string | null;
};

type QuoteRow = {
  id: string;
  job_id: string;
  vendor_name: string;
  quoted_amount: number | null;
};

function sinceIso(): string {
  return new Date(Date.now() - MS_12M).toISOString();
}

/**
 * 硬信号 1：同类（category）近 12 月价格持续高于中位数。
 */
export function detectVendorPersistentPriceOutlier(invoices: InvoiceRow[]): HardSignalCandidate[] {
  const since = sinceIso();
  const recent = invoices.filter((r) => r.created_at >= since);
  const byCat = new Map<string, InvoiceRow[]>();
  for (const inv of recent) {
    const cat = (inv.category || 'general').trim() || 'general';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat)!.push(inv);
  }

  const out: HardSignalCandidate[] = [];

  for (const [category, rows] of byCat) {
    const amounts = rows.map((r) => Number(r.total_amount) || 0).filter((x) => x > 0);
    if (amounts.length < 8) continue;
    const med = median(amounts);
    const avgAll = mean(amounts);
    if (med <= 0) continue;

    const byVendor = new Map<string, number[]>();
    for (const r of rows) {
      const v = normalizeVendorName(r.vendor_name || '');
      if (!v) continue;
      if (!byVendor.has(v)) byVendor.set(v, []);
      byVendor.get(v)!.push(Number(r.total_amount) || 0);
    }

    for (const [vNorm, amts] of byVendor) {
      if (amts.length < 3) continue;
      const vAvg = mean(amts);
      const gapPct = ((vAvg - med) / med) * 100;
      const aboveMed = amts.filter((a) => a > med).length;
      const ratioAbove = aboveMed / amts.length;
      if (gapPct < 15 || ratioAbove < 0.66) continue;

      const displayName =
        rows.find((r) => normalizeVendorName(r.vendor_name || '') === vNorm)?.vendor_name?.trim() || vNorm;

      out.push({
        vendor_name: displayName,
        signal_type: 'price_outlier_persistent',
        provisional_risk_score: Math.min(92, 55 + Math.min(30, gapPct)),
        evidence_json: {
          vendor_avg_price: Number(vAvg.toFixed(2)),
          category_avg_price: Number(avgAll.toFixed(2)),
          category_median_price: Number(med.toFixed(2)),
          price_gap_percent: Number(gapPct.toFixed(2)),
          sample_count: amts.length,
          categories: [category],
          invoices_above_median_ratio: Number(ratioAbove.toFixed(2)),
          window_months: 12,
        },
      });
    }
  }

  return dedupeByVendorType(out);
}

/**
 * 硬信号 2：支出集中度。
 */
export function detectVendorConcentration(invoices: InvoiceRow[]): HardSignalCandidate[] {
  const since = sinceIso();
  const recent = invoices.filter((r) => r.created_at >= since);
  const byVendor = new Map<string, number>();
  let total = 0;
  for (const r of recent) {
    const v = normalizeVendorName(r.vendor_name || '');
    if (!v) continue;
    const amt = Number(r.total_amount) || 0;
    if (amt <= 0) continue;
    total += amt;
    byVendor.set(v, (byVendor.get(v) ?? 0) + amt);
  }
  if (total < 3000) return [];

  const sorted = [...byVendor.entries()].sort((a, b) => b[1] - a[1]);
  const top3 = sorted.slice(0, 3).reduce((s, [, x]) => s + x, 0);
  const top3Share = (top3 / total) * 100;

  const out: HardSignalCandidate[] = [];
  for (const [vNorm, spend] of sorted) {
    const share = (spend / total) * 100;
    if (share < 32 && top3Share < 78) continue;
    if (share < 28 && top3Share < 85) continue;

    const displayName =
      recent.find((r) => normalizeVendorName(r.vendor_name || '') === vNorm)?.vendor_name?.trim() || vNorm;
    const invCount = recent.filter((r) => normalizeVendorName(r.vendor_name || '') === vNorm).length;

    out.push({
      vendor_name: displayName,
      signal_type: 'vendor_concentration_high',
      provisional_risk_score: Math.min(90, 45 + share * 0.5),
      evidence_json: {
        vendor_share_percent: Number(share.toFixed(2)),
        top3_share_percent: Number(top3Share.toFixed(2)),
        total_spend: Number(total.toFixed(2)),
        vendor_spend: Number(spend.toFixed(2)),
        invoice_count: invCount,
        quote_win_count: null,
        window_months: 12,
      },
    });
    if (out.length >= 6) break;
  }

  return dedupeByVendorType(out);
}

/**
 * 硬信号 3：报价竞争偏弱（单报价项目占比高、重复中标等）。
 */
export function detectWeakQuoteCompetition(
  jobs: JobRow[],
  quotesByJobId: Map<string, QuoteRow[]>,
): HardSignalCandidate[] {
  const since = sinceIso();
  const recentJobs = jobs.filter((j) => (j.created_at || '') >= since);
  if (recentJobs.length < 4) return [];

  let singleQuote = 0;
  const winnerCounts = new Map<string, number>();

  for (const job of recentJobs) {
    const qs = quotesByJobId.get(job.id) ?? [];
    if (qs.length <= 1) {
      singleQuote += 1;
    }
    if (!job.selected_quote_id) continue;
    const win = qs.find((q) => q.id === job.selected_quote_id);
    if (!win) continue;
    const vn = normalizeVendorName(win.vendor_name);
    if (!vn) continue;
    winnerCounts.set(vn, (winnerCounts.get(vn) ?? 0) + 1);
  }

  const totalJobs = recentJobs.length;
  const singleRatio = singleQuote / totalJobs;
  const out: HardSignalCandidate[] = [];

  if (singleRatio >= 0.42 && totalJobs >= 5) {
    let topWinner = '';
    let topW = 0;
    for (const [v, c] of winnerCounts) {
      if (c > topW) {
        topW = c;
        topWinner = v;
      }
    }
    const display =
      recentJobs
        .flatMap((j) => quotesByJobId.get(j.id) ?? [])
        .find((q) => normalizeVendorName(q.vendor_name) === topWinner)?.vendor_name?.trim() || topWinner || '—';

    out.push({
      vendor_name: display,
      signal_type: 'quote_competition_weak',
      provisional_risk_score: Math.min(88, 48 + singleRatio * 40),
      evidence_json: {
        total_jobs: totalJobs,
        single_quote_jobs: singleQuote,
        repeated_winner_count: topW,
        winner_ratio: Number((topW / Math.max(1, totalJobs - singleQuote + topW)).toFixed(2)),
        single_quote_job_ratio: Number(singleRatio.toFixed(2)),
        categories: [...new Set(recentJobs.map((j) => (j.category || 'general').trim()))],
      },
    });
  }

  for (const [vNorm, c] of winnerCounts) {
    if (c < 5) continue;
    const display =
      [...quotesByJobId.values()]
        .flat()
        .find((q) => normalizeVendorName(q.vendor_name) === vNorm)?.vendor_name?.trim() || vNorm;
    out.push({
      vendor_name: display,
      signal_type: 'quote_competition_weak',
      provisional_risk_score: Math.min(85, 50 + c * 2),
      evidence_json: {
        total_jobs: totalJobs,
        single_quote_jobs: singleQuote,
        repeated_winner_count: c,
        winner_ratio: Number((c / totalJobs).toFixed(2)),
        categories: [],
      },
    });
  }

  return dedupeByVendorType(out);
}

/** 名称归一化后的简单相似度（0–1），用于疑似同名。 */
export function vendorNameSimilarity(a: string, b: string): number {
  const x = new Set(normalizeVendorName(a).split(/\s+/).filter(Boolean));
  const y = new Set(normalizeVendorName(b).split(/\s+/).filter(Boolean));
  if (x.size === 0 || y.size === 0) return 0;
  let inter = 0;
  for (const w of x) if (y.has(w)) inter++;
  return inter / Math.max(x.size, y.size);
}

const APPROVAL_AMOUNT_HINT = 10000;

/**
 * 硬信号 4：关系风险模式（仅提示复核，不指控）。
 */
export function detectRelationshipRiskPatterns(
  invoices: InvoiceRow[],
  jobs: JobRow[],
  quotesByJobId: Map<string, QuoteRow[]>,
  priceOutliers: HardSignalCandidate[],
  weakQuotes: HardSignalCandidate[],
): HardSignalCandidate[] {
  const since = sinceIso();
  const recent = invoices.filter((r) => r.created_at >= since);
  const out: HardSignalCandidate[] = [];

  const outlierVendors = new Set(priceOutliers.map((p) => normalizeVendorName(p.vendor_name)));
  const weakVendors = new Set(weakQuotes.map((w) => normalizeVendorName(w.vendor_name)));

  const winnerStreak = new Map<string, number>();
  for (const job of jobs.filter((j) => (j.created_at || '') >= since)) {
    const qs = quotesByJobId.get(job.id) ?? [];
    if (qs.length !== 1 || !job.selected_quote_id) continue;
    const w = qs[0]!;
    const vn = normalizeVendorName(w.vendor_name);
    winnerStreak.set(vn, (winnerStreak.get(vn) ?? 0) + 1);
  }

  for (const [vNorm, n] of winnerStreak) {
    if (n < 4) continue;
    const display =
      recent.find((r) => normalizeVendorName(r.vendor_name || '') === vNorm)?.vendor_name?.trim() || vNorm;
    const patterns: string[] = [
      '同一供应商在多个仅收到单份报价的项目中被选中，数据模式建议人工复核采购流程与文档。',
    ];
    if (outlierVendors.has(vNorm)) {
      patterns.push('该供应商在部分支出类别中价格水平相对同类偏高，建议结合市场比价复核。');
    }
    if (weakVendors.has(vNorm)) {
      patterns.push('该供应商出现在报价竞争偏弱的统计模式中，建议核查是否充分邀请报价。');
    }

    out.push({
      vendor_name: display,
      signal_type: 'relationship_risk_pattern',
      provisional_risk_score: Math.min(
        88,
        52 + n * 3 + (outlierVendors.has(vNorm) ? 10 : 0) + (weakVendors.has(vNorm) ? 8 : 0),
      ),
      evidence_json: {
        patterns_detected: patterns,
        single_quote_wins_12m: n,
        near_threshold_cluster_count: recent.filter((r) => {
          const a = Number(r.total_amount) || 0;
          return a >= APPROVAL_AMOUNT_HINT * 0.85 && a <= APPROVAL_AMOUNT_HINT * 1.05;
        }).length,
        name_similarity_note:
          '若系统中发现名称写法不同但高度相似的供应商，建议在台账中合并核对（本项为模式提示，不构成认定）。',
      },
    });
  }

  /** 金额贴近常见审批阈值的发票占比（模糊项频繁） */
  const vagueVendor = new Map<string, number>();
  for (const r of recent) {
    const a = Number(r.total_amount) || 0;
    if (a < APPROVAL_AMOUNT_HINT * 0.88 || a > APPROVAL_AMOUNT_HINT * 1.08) continue;
    const v = normalizeVendorName(r.vendor_name || '');
    if (!v) continue;
    vagueVendor.set(v, (vagueVendor.get(v) ?? 0) + 1);
  }
  for (const [vNorm, cnt] of vagueVendor) {
    if (cnt < 5) continue;
    const display = recent.find((r) => normalizeVendorName(r.vendor_name || '') === vNorm)?.vendor_name?.trim() || vNorm;
    out.push({
      vendor_name: display,
      signal_type: 'relationship_risk_pattern',
      provisional_risk_score: Math.min(72, 48 + cnt),
      evidence_json: {
        patterns_detected: [
          '存在需要人工复核的关系风险模式：多张发票金额集中在常见审批阈值附近，建议抽查审批链与支持文件。',
          '数据模式显示该供应商值得进一步核查（不代表已存在不当行为）。',
        ],
        near_threshold_invoice_count: cnt,
        reference_threshold: APPROVAL_AMOUNT_HINT,
      },
    });
  }

  return dedupeByVendorType(out);
}

function dedupeByVendorType(cands: HardSignalCandidate[]): HardSignalCandidate[] {
  const seen = new Set<string>();
  const res: HardSignalCandidate[] = [];
  for (const c of cands) {
    const k = `${normalizeVendorName(c.vendor_name)}|${c.signal_type}`;
    if (seen.has(k)) continue;
    seen.add(k);
    res.push(c);
  }
  return res;
}

export function runAllHardDetectors(
  invoices: InvoiceRow[],
  jobs: JobRow[],
  quotes: QuoteRow[],
): HardSignalCandidate[] {
  const quotesByJobId = new Map<string, QuoteRow[]>();
  for (const q of quotes) {
    if (!quotesByJobId.has(q.job_id)) quotesByJobId.set(q.job_id, []);
    quotesByJobId.get(q.job_id)!.push(q);
  }

  const p1 = detectVendorPersistentPriceOutlier(invoices);
  const p2 = detectVendorConcentration(invoices);
  const p3 = detectWeakQuoteCompetition(jobs, quotesByJobId);
  const p4 = detectRelationshipRiskPatterns(invoices, jobs, quotesByJobId, p1, p3);

  const merged = [...p1, ...p2, ...p3, ...p4];
  return dedupeByVendorType(merged);
}
