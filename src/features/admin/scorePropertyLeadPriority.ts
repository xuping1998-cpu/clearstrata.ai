export type PriorityLevel = 'high' | 'medium' | 'low';

export type TrialStateForPriority = 'active' | 'expiring' | 'expired' | 'unknown';

export function scorePropertyLeadPriority(input: {
  trialState: TrialStateForPriority;
  daysRemaining: number | null;
  leadStatus: string | null;
  selectedPlan: string | null;
  leadCreatedAt: string | null;
  hasLead: boolean;
  hasActivity?: boolean;
}): {
  priorityScore: number;
  priorityLevel: PriorityLevel;
  scoreBreakdown: string[];
} {
  const breakdown: string[] = [];
  let score = 0;

  // Base trial urgency
  if (input.trialState === 'expired') {
    score += 50;
    breakdown.push('试用已过期 +50');
  } else if (input.trialState === 'expiring') {
    score += 30;
    breakdown.push('试用 7 天内到期 +30');
  } else if (input.trialState === 'active') {
    const d = input.daysRemaining;
    if (typeof d === 'number' && d > 7 && d <= 30) {
      score += 10;
      breakdown.push('试用 8~30 天内到期 +10');
    }
  }

  // Lead presence + status
  if (input.hasLead) {
    score += 20;
    breakdown.push('有 lead +20');
  }

  const st = String(input.leadStatus ?? '').toLowerCase();
  if (st === 'new') {
    score += 20;
    breakdown.push('lead 为 new +20');
  } else if (st === 'contacted') {
    score += 10;
    breakdown.push('lead 为 contacted +10');
  } else if (st === 'qualified') {
    score += 15;
    breakdown.push('lead 为 qualified +15');
  } else if (st === 'won') {
    score += 0;
    breakdown.push('lead 为 won +0');
  } else if (st === 'lost') {
    score -= 20;
    breakdown.push('lead 为 lost -20');
  }

  // Plan intent
  const plan = String(input.selectedPlan ?? '').toLowerCase();
  if (plan === 'pro') {
    score += 15;
    breakdown.push('选择 pro +15');
  } else if (plan === 'standard') {
    score += 10;
    breakdown.push('选择 standard +10');
  } else if (plan === 'starter') {
    score += 5;
    breakdown.push('选择 starter +5');
  }

  // Recency
  const created = input.leadCreatedAt ? new Date(input.leadCreatedAt) : null;
  if (created && !Number.isNaN(created.getTime())) {
    const ageMs = Date.now() - created.getTime();
    const days = ageMs / (1000 * 60 * 60 * 24);
    if (days <= 3) {
      score += 20;
      breakdown.push('最近 7 天内提交 lead +10');
      breakdown.push('最近 3 天内提交 lead（额外）+10');
    } else if (days <= 7) {
      score += 10;
      breakdown.push('最近 7 天内提交 lead +10');
    }
  }

  // Optional activity bonus (reserved hook)
  if (input.hasActivity) {
    score += 10;
    breakdown.push('有基础活跃行为 +10');
  }

  const priorityLevel: PriorityLevel =
    score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

  return { priorityScore: score, priorityLevel, scoreBreakdown: breakdown };
}
