import { supabase } from '@/lib/supabase';
import { getTrialDaysRemaining } from '@/lib/subscription';
import { scorePropertyLeadPriority, type PriorityLevel, type TrialStateForPriority } from '@/features/admin/scorePropertyLeadPriority';

export type PrioritizedPropertyLead = {
  propertyId: string | null;
  propertyName: string;
  contactName: string;
  email: string;
  selectedPlan: string | null;
  leadStatus: string | null;
  trialState: TrialStateForPriority;
  daysRemaining: number | null;
  trialEndsAt: string | null;
  leadCreatedAt: string | null;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  scoreBreakdown: string[];
};

export type PlatformOverview = {
  metrics: {
    newTrials7d: number;
    expiringTrials7d: number;
    expiredTrials: number;
    newLeads7d: number;
    pendingLeads: number;
    wonLeads: number;
  };
  prioritizedPropertyLeads: PrioritizedPropertyLead[];
  recentLeads: Array<{
    id: string;
    propertyName: string;
    name: string;
    email: string;
    selectedPlan: string | null;
    status: string;
    source: string | null;
    createdAt: string;
    priorityScore: number;
    priorityLevel: PriorityLevel;
  }>;
};

function isMissingColumnOrTable(err: unknown): boolean {
  const msg = String((err as any)?.message ?? '').toLowerCase();
  return (
    (msg.includes('column') && msg.includes('does not exist')) ||
    msg.includes('does not exist') ||
    msg.includes('undefined table') ||
    msg.includes('42p01')
  );
}

async function countSafe(
  table: 'properties' | 'leads',
  builder: (q: any) => any,
): Promise<number> {
  try {
    let q = supabase.from(table).select('id', { count: 'exact', head: true }) as any;
    q = builder(q);
    const { count, error } = await q;
    if (error) {
      if (isMissingColumnOrTable(error)) return 0;
      console.warn('[platform-overview] count', table, error);
      return 0;
    }
    return typeof count === 'number' ? count : 0;
  } catch (e) {
    console.warn('[platform-overview] count exception', table, e);
    return 0;
  }
}

type LeadRow = {
  id: string;
  created_at: string;
  property_id: string | null;
  property_name: string | null;
  building: string | null;
  name: string;
  email: string;
  selected_plan: string | null;
  status: string | null;
  source: string | null;
  subscription_status_snapshot: string | null;
  trial_ends_at_snapshot: string | null;
};

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function parseDateSafe(ts: string | null | undefined): Date | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function trialStateFromPropertyRow(p: {
  subscription_status?: string | null;
  trial_ends_at?: string | null;
}): { trialState: TrialStateForPriority; daysRemaining: number | null; trialEndsAt: string | null } {
  const endsAt = p.trial_ends_at == null ? null : String(p.trial_ends_at);
  const st = String(p.subscription_status ?? '').toLowerCase();
  if (st !== 'trial' || !endsAt) {
    return { trialState: 'unknown', daysRemaining: null, trialEndsAt: endsAt };
  }
  const days = getTrialDaysRemaining(endsAt);
  if (days <= 0) return { trialState: 'expired', daysRemaining: days, trialEndsAt: endsAt };
  if (days <= 7) return { trialState: 'expiring', daysRemaining: days, trialEndsAt: endsAt };
  return { trialState: 'active', daysRemaining: days, trialEndsAt: endsAt };
}

function trialStateFromLeadSnapshot(lead: LeadRow): { trialState: TrialStateForPriority; daysRemaining: number | null; trialEndsAt: string | null } {
  const endsAt = lead.trial_ends_at_snapshot == null ? null : String(lead.trial_ends_at_snapshot);
  const st = String(lead.subscription_status_snapshot ?? '').toLowerCase();
  if (st !== 'trial' || !endsAt) return { trialState: 'unknown', daysRemaining: null, trialEndsAt: endsAt };
  const days = getTrialDaysRemaining(endsAt);
  if (days <= 0) return { trialState: 'expired', daysRemaining: days, trialEndsAt: endsAt };
  if (days <= 7) return { trialState: 'expiring', daysRemaining: days, trialEndsAt: endsAt };
  return { trialState: 'active', daysRemaining: days, trialEndsAt: endsAt };
}

function latestLeadByProperty(leads: LeadRow[]): Map<string, LeadRow> {
  const m = new Map<string, LeadRow>();
  for (const r of leads) {
    const pid = r.property_id ? String(r.property_id) : '';
    if (!pid) continue;
    if (!m.has(pid)) m.set(pid, r);
  }
  return m;
}

async function fetchActivityByPropertyId(propertyIds: string[]): Promise<Map<string, boolean>> {
  const uniq = Array.from(new Set(propertyIds.map((x) => String(x)).filter(Boolean)));
  const out = new Map<string, boolean>();
  for (const id of uniq) out.set(id, false);
  if (uniq.length === 0) return out;

  const mark = (pid: string | null | undefined) => {
    if (!pid) return;
    const k = String(pid);
    if (out.has(k)) out.set(k, true);
  };

  const probe = async (table: 'invoices' | 'property_members' | 'community_notifications') => {
    for (const part of chunk(uniq, 80)) {
      try {
        const { data, error } = await (supabase.from(table).select('property_id').in('property_id', part).limit(800) as any);
        if (error) {
          if (isMissingColumnOrTable(error)) return;
          console.warn('[platform-overview] activity', table, error);
          return;
        }
        for (const row of (data ?? []) as Array<{ property_id?: string | null }>) {
          mark(row.property_id ?? null);
        }
      } catch (e) {
        console.warn('[platform-overview] activity exception', table, e);
        return;
      }
    }
  };

  await probe('invoices');
  await probe('property_members');
  await probe('community_notifications');
  return out;
}

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const now = new Date();
  const isoNow = now.toISOString();
  const iso7dAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const iso7dLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const iso30dLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Metrics: properties.* (trial) + leads.*
  const newTrials7d = await (async () => {
    const byStarted = await countSafe('properties', (q) =>
      q.eq('subscription_status', 'trial').gte('trial_started_at', iso7dAgo),
    );
    const byCreated = await countSafe('properties', (q) =>
      q.eq('subscription_status', 'trial').gte('created_at', iso7dAgo),
    );

    // If trial_started_at column exists but is NULL for many rows, byStarted may be 0 even when trials exist.
    // Use max() heuristic: if started is 0 but created is >0, prefer created.
    if (byStarted > 0) return byStarted;
    if (byCreated > 0) return byCreated;

    // If both are 0, detect missing column on trial_started_at filter and fallback to created.
    try {
      const { error } = await (supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('subscription_status', 'trial')
        .gte('trial_started_at', iso7dAgo) as any);
      if (error && isMissingColumnOrTable(error)) {
        return byCreated;
      }
    } catch {
      /* ignore */
    }

    return byStarted;
  })();

  const expiringTrials7d = await countSafe('properties', (q) =>
    q.eq('subscription_status', 'trial').gt('trial_ends_at', isoNow).lte('trial_ends_at', iso7dLater),
  );

  const expiredTrials = await countSafe('properties', (q) =>
    q.eq('subscription_status', 'trial').lte('trial_ends_at', isoNow),
  );

  const newLeads7d = await countSafe('leads', (q) => q.gte('created_at', iso7dAgo));
  const pendingLeads = await countSafe('leads', (q) => q.eq('status', 'new'));
  const wonLeads = await countSafe('leads', (q) => q.eq('status', 'won'));

  // Recent leads list
  const recentLeads: PlatformOverview['recentLeads'] = await (async () => {
    try {
      const { data, error } = await (supabase
        .from('leads')
        .select(
          'id,created_at,property_id,property_name,building,name,email,selected_plan,status,source,subscription_status_snapshot,trial_ends_at_snapshot',
        )
        .order('created_at', { ascending: false })
        .limit(10) as any);
      if (error) {
        if (isMissingColumnOrTable(error)) return [];
        console.warn('[platform-overview] recent leads', error);
        return [];
      }
      const rows = (data ?? []) as Array<Record<string, any>>;
      return rows.map((r) => {
        const lead: LeadRow = {
          id: String(r.id ?? ''),
          created_at: String(r.created_at ?? ''),
          property_id: r.property_id == null || r.property_id === '' ? null : String(r.property_id),
          property_name: r.property_name == null ? null : String(r.property_name),
          building: r.building == null ? null : String(r.building),
          name: String(r.name ?? ''),
          email: String(r.email ?? ''),
          selected_plan: r.selected_plan == null ? null : String(r.selected_plan),
          status: r.status == null ? null : String(r.status),
          source: r.source == null ? null : String(r.source),
          subscription_status_snapshot:
            r.subscription_status_snapshot == null ? null : String(r.subscription_status_snapshot),
          trial_ends_at_snapshot: r.trial_ends_at_snapshot == null ? null : String(r.trial_ends_at_snapshot),
        };
        const snapTrial = trialStateFromLeadSnapshot(lead);
        const scored = scorePropertyLeadPriority({
          trialState: snapTrial.trialState,
          daysRemaining: snapTrial.daysRemaining,
          leadStatus: lead.status,
          selectedPlan: lead.selected_plan,
          leadCreatedAt: lead.created_at,
          hasLead: true,
          hasActivity: false,
        });
        return {
          id: String(r.id ?? ''),
          propertyName: String(r.property_name ?? r.building ?? '') || '—',
          name: String(r.name ?? ''),
          email: String(r.email ?? ''),
          selectedPlan: r.selected_plan == null ? null : String(r.selected_plan),
          status: String(r.status ?? 'new'),
          source: r.source == null ? null : String(r.source),
          createdAt: String(r.created_at ?? ''),
          priorityScore: scored.priorityScore,
          priorityLevel: scored.priorityLevel,
        };
      });
    } catch (e) {
      console.warn('[platform-overview] recent leads exception', e);
      return [];
    }
  })();

  const prioritizedPropertyLeads: PrioritizedPropertyLead[] = await (async () => {
    try {
      const { data: leadsData, error: leadsErr } = await (supabase
        .from('leads')
        .select(
          'id,created_at,property_id,property_name,building,name,email,selected_plan,status,source,subscription_status_snapshot,trial_ends_at_snapshot',
        )
        .order('created_at', { ascending: false })
        .limit(800) as any);
      if (leadsErr) {
        if (isMissingColumnOrTable(leadsErr)) return [];
        console.warn('[platform-overview] prioritized leads', leadsErr);
        return [];
      }
      const leadRows = (leadsData ?? []) as LeadRow[];
      const latestByPid = latestLeadByProperty(leadRows);

      const propertyIdsFromLeads = Array.from(latestByPid.keys());

      const { data: propsData, error: propsErr } = await (supabase
        .from('properties')
        .select('id,name,subscription_status,trial_ends_at')
        .eq('subscription_status', 'trial')
        .not('trial_ends_at', 'is', null)
        .lte('trial_ends_at', iso30dLater)
        .order('trial_ends_at', { ascending: true })
        .limit(400) as any);

      const urgentPropertyIds: string[] = [];
      if (!propsErr && Array.isArray(propsData)) {
        for (const p of propsData as Array<{ id: string }>) {
          urgentPropertyIds.push(String(p.id));
        }
      }

      const propertyIdSet = new Set<string>([...propertyIdsFromLeads, ...urgentPropertyIds]);
      const propertyIds = Array.from(propertyIdSet);

      const propById = new Map<
        string,
        { id: string; name?: string | null; subscription_status?: string | null; trial_ends_at?: string | null }
      >();
      if (propertyIds.length > 0) {
        for (const part of chunk(propertyIds, 120)) {
          const { data, error } = await (supabase
            .from('properties')
            .select('id,name,subscription_status,trial_ends_at')
            .in('id', part) as any);
          if (error) {
            if (isMissingColumnOrTable(error)) break;
            console.warn('[platform-overview] properties batch', error);
            break;
          }
          for (const row of (data ?? []) as any[]) {
            propById.set(String(row.id), row);
          }
        }
      }

      type Candidate = {
        propertyId: string | null;
        propertyName: string;
        contactName: string;
        email: string;
        selectedPlan: string | null;
        leadStatus: string | null;
        leadCreatedAt: string | null;
        trialState: TrialStateForPriority;
        daysRemaining: number | null;
        trialEndsAt: string | null;
        hasLead: boolean;
      };

      const candidates: Candidate[] = [];

      for (const pid of propertyIds) {
        const lead = latestByPid.get(pid) ?? null;
        const p = propById.get(pid);
        const propTrial = p ? trialStateFromPropertyRow(p) : { trialState: 'unknown' as const, daysRemaining: null, trialEndsAt: null };
        const leadTrial = lead ? trialStateFromLeadSnapshot(lead) : { trialState: 'unknown' as const, daysRemaining: null, trialEndsAt: null };

        let trialState: TrialStateForPriority = propTrial.trialState;
        let daysRemaining: number | null = propTrial.daysRemaining;
        let trialEndsAt: string | null = propTrial.trialEndsAt;

        if (trialState === 'unknown' && leadTrial.trialState !== 'unknown') {
          trialState = leadTrial.trialState;
          daysRemaining = leadTrial.daysRemaining;
          trialEndsAt = leadTrial.trialEndsAt;
        }

        const propertyName =
          String(p?.name ?? lead?.property_name ?? lead?.building ?? '').trim() || '—';
        const contactName = lead ? String(lead.name ?? '') : '';
        const email = lead ? String(lead.email ?? '') : '';
        const selectedPlan = lead?.selected_plan == null ? null : String(lead.selected_plan);
        const leadStatus = lead?.status == null ? null : String(lead.status);
        const leadCreatedAt = lead?.created_at ?? null;
        const hasLead = Boolean(lead);

        if (!hasLead) {
          const urgentTrial =
            trialState === 'expired' || trialState === 'expiring' || (typeof daysRemaining === 'number' && daysRemaining > 0 && daysRemaining <= 30);
          if (!urgentTrial) continue;
        }

        candidates.push({
          propertyId: pid,
          propertyName,
          contactName,
          email,
          selectedPlan,
          leadStatus,
          leadCreatedAt,
          trialState,
          daysRemaining,
          trialEndsAt,
          hasLead,
        });
      }

      // Standalone leads (no property_id): still actionable in the queue
      for (const r of leadRows) {
        if (r.property_id) continue;
        const snapTrial = trialStateFromLeadSnapshot(r);
        candidates.push({
          propertyId: null,
          propertyName: (r.property_name ?? r.building ?? '').trim() || '—',
          contactName: String(r.name ?? ''),
          email: String(r.email ?? ''),
          selectedPlan: r.selected_plan == null ? null : String(r.selected_plan),
          leadStatus: r.status == null ? null : String(r.status),
          leadCreatedAt: r.created_at ?? null,
          trialState: snapTrial.trialState,
          daysRemaining: snapTrial.daysRemaining,
          trialEndsAt: snapTrial.trialEndsAt,
          hasLead: true,
        });
      }

      const deduped: Candidate[] = (() => {
        const m = new Map<string, Candidate>();
        for (const c of candidates) {
          const key = c.propertyId ? `pid:${c.propertyId}` : `solo:${String(c.email)}|${String(c.leadCreatedAt ?? '')}`;
          if (!m.has(key)) m.set(key, c);
        }
        return Array.from(m.values());
      })();

      const activity = await fetchActivityByPropertyId(deduped.map((c) => c.propertyId).filter(Boolean) as string[]);

      const scored = deduped.map((c) => {
        const hasActivity = c.propertyId ? Boolean(activity.get(String(c.propertyId))) : false;
        const s = scorePropertyLeadPriority({
          trialState: c.trialState,
          daysRemaining: c.daysRemaining,
          leadStatus: c.leadStatus,
          selectedPlan: c.selectedPlan,
          leadCreatedAt: c.leadCreatedAt,
          hasLead: c.hasLead,
          hasActivity,
        });
        return {
          ...c,
          priorityScore: s.priorityScore,
          priorityLevel: s.priorityLevel,
          scoreBreakdown: s.scoreBreakdown,
        };
      });

      scored.sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;

        const ra = a.trialState === 'expired' ? 0 : a.trialState === 'expiring' ? 1 : 2;
        const rb = b.trialState === 'expired' ? 0 : b.trialState === 'expiring' ? 1 : 2;
        if (ra !== rb) return ra - rb;

        const da = typeof a.daysRemaining === 'number' ? a.daysRemaining : 999999;
        const db = typeof b.daysRemaining === 'number' ? b.daysRemaining : 999999;
        if (da !== db) return da - db;

        const ta = parseDateSafe(a.leadCreatedAt)?.getTime();
        const tb = parseDateSafe(b.leadCreatedAt)?.getTime();
        const aTs = typeof ta === 'number' ? ta : -1;
        const bTs = typeof tb === 'number' ? tb : -1;
        if (bTs !== aTs) return bTs - aTs;

        const ea = parseDateSafe(a.trialEndsAt)?.getTime();
        const eb = parseDateSafe(b.trialEndsAt)?.getTime();
        const aEnd = typeof ea === 'number' ? ea : 9e15;
        const bEnd = typeof eb === 'number' ? eb : 9e15;
        if (aEnd !== bEnd) return aEnd - bEnd;

        return String(a.propertyName).localeCompare(String(b.propertyName));
      });

      return scored.slice(0, 10);
    } catch (e) {
      console.warn('[platform-overview] prioritized exception', e);
      return [];
    }
  })();

  return {
    metrics: {
      newTrials7d,
      expiringTrials7d,
      expiredTrials,
      newLeads7d,
      pendingLeads,
      wonLeads,
    },
    prioritizedPropertyLeads,
    recentLeads,
  };
}

