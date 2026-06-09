import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AnnouncementPriority } from '@/lib/supabase';
import type { ImportantUpdatesBullet } from '@/components/dashboard/ImportantUpdatesDashboardCard';
import {
  evaluateOwnerVoteOwnerNavigationGate,
  fetchMeetingAgendaSummariesForMeetingIds,
  fetchOwnerVoteMeetingMetaForCouncilMeeting,
  getMeetingsByPropertyAndYear,
  meetingTitleZhFirst,
  type MeetingRow,
  type OwnerVoteMeetingLite,
} from '@/features/meetings/api';
import { extractElectionAgendaMeta } from '@/features/meetings/electionAgendaModel';
import { isOwnerVotingMeeting } from '@/features/meetings/ownerVotingCouncil';

const ACTION_PRIORITY = 100;
const MAX_BULLETS = 5;
const MAX_ANNOUNCEMENTS = 3;

function announcementPriorityScore(p: AnnouncementPriority): number {
  if (p === 'urgent') return 80;
  if (p === 'important') return 60;
  return 30;
}

function formatVoteOpenDate(iso: string | null | undefined, langEn: boolean): string {
  if (!iso?.trim()) return langEn ? 'soon' : '即将';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return langEn ? 'soon' : '即将';
  return d.toLocaleDateString(langEn ? 'en-CA' : 'zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function votingDetailUrl(propertyId: string, councilMeetingId: string): string {
  const qs = new URLSearchParams({ propertyId, source: 'voting' });
  return `/voting/${encodeURIComponent(councilMeetingId)}?${qs.toString()}`;
}

function votingHubUrl(propertyId: string): string {
  return `/voting?${new URLSearchParams({ propertyId }).toString()}`;
}

type PendingVoteEntry = {
  councilMeeting: MeetingRow;
  ovMeeting: OwnerVoteMeetingLite;
  canVoteNow: boolean;
  opensSoon: boolean;
};

function buildAgendaCountsByMeetingId(
  rows: Awaited<ReturnType<typeof fetchMeetingAgendaSummariesForMeetingIds>>['rows'],
): { electionByMeeting: Record<string, number>; resolutionByMeeting: Record<string, number> } {
  const electionByMeeting: Record<string, number> = {};
  const resolutionByMeeting: Record<string, number> = {};
  for (const row of rows) {
    const mid = String(row.meeting_id ?? '').trim();
    if (!mid) continue;
    if (extractElectionAgendaMeta(row.description_zh ?? '').meta?.agenda_type === 'council_election') {
      electionByMeeting[mid] = (electionByMeeting[mid] ?? 0) + 1;
    } else if (row.requires_vote) {
      resolutionByMeeting[mid] = (resolutionByMeeting[mid] ?? 0) + 1;
    }
  }
  return { electionByMeeting, resolutionByMeeting };
}

async function fetchPendingVoteBullet(
  propertyId: string,
  userId: string,
  langEn: boolean,
): Promise<ImportantUpdatesBullet | null> {
  const fiscalYear = new Date().getFullYear();
  const { meetings, error: meetingsErr } = await getMeetingsByPropertyAndYear(propertyId, fiscalYear);
  if (meetingsErr) throw meetingsErr;

  const votingMeetings = meetings.filter(isOwnerVotingMeeting);
  if (!votingMeetings.length) return null;

  const meetingIds = votingMeetings.map((m) => String(m.id).trim()).filter(Boolean);
  const { rows: agendaRows, error: agendaErr } = await fetchMeetingAgendaSummariesForMeetingIds(
    propertyId,
    meetingIds,
  );
  if (agendaErr) throw agendaErr;

  const { electionByMeeting, resolutionByMeeting } = buildAgendaCountsByMeetingId(agendaRows);

  const metaResults = await Promise.all(
    votingMeetings.map(async (councilMeeting) => {
      const meta = await fetchOwnerVoteMeetingMetaForCouncilMeeting({ propertyId, meeting: councilMeeting });
      if (meta.error) throw meta.error;
      return { councilMeeting, meta };
    }),
  );

  const ovIds = metaResults
    .map((r) => r.meta.meeting?.id?.trim())
    .filter((id): id is string => !!id);

  if (!ovIds.length) return null;

  const { data: eligibleRows, error: eligErr } = await supabase
    .from('owner_vote_voter_snapshot')
    .select('meeting_id')
    .eq('user_id', userId)
    .in('meeting_id', ovIds)
    .eq('is_eligible', true);

  if (eligErr) throw new Error(eligErr.message);

  const eligibleOvIds = new Set(
    (eligibleRows ?? []).map((r: { meeting_id: string }) => String(r.meeting_id)),
  );

  const pending: PendingVoteEntry[] = [];

  for (const { councilMeeting, meta } of metaResults) {
    const ov = meta.meeting;
    if (!ov?.id || !eligibleOvIds.has(ov.id)) continue;

    const councilId = String(councilMeeting.id).trim();
    const electionAgendaCount = electionByMeeting[councilId] ?? 0;
    const resolutionCount = meta.resolutionCount || (resolutionByMeeting[councilId] ?? 0);

    const gate = evaluateOwnerVoteOwnerNavigationGate({
      ov,
      eligibleCount: meta.eligibleCount,
      resolutionCount,
      electionAgendaCount,
    });

    if (gate.ok) {
      pending.push({ councilMeeting, ovMeeting: ov, canVoteNow: true, opensSoon: false });
    } else if (gate.reason === 'too_early') {
      pending.push({ councilMeeting, ovMeeting: ov, canVoteNow: false, opensSoon: true });
    }
  }

  if (!pending.length) return null;

  const voteNow = pending.filter((p) => p.canVoteNow);
  const targets = voteNow.length > 0 ? voteNow : pending.filter((p) => p.opensSoon);
  if (!targets.length) return null;

  if (targets.length === 1) {
    const t = targets[0];
    const title = meetingTitleZhFirst(t.councilMeeting);
    const text = t.canVoteNow
      ? langEn
        ? 'You have 1 voting item to complete'
        : '你有 1 项待投票事项'
      : langEn
        ? `${title || 'Meeting'} voting opens ${formatVoteOpenDate(t.ovMeeting.voting_opens_at, true)}`
        : `${title || '会议'}将于 ${formatVoteOpenDate(t.ovMeeting.voting_opens_at, false)} 开放投票`;

    return {
      id: `vote-${t.councilMeeting.id}`,
      text,
      kind: 'action',
      actionUrl: votingDetailUrl(propertyId, String(t.councilMeeting.id)),
      source: 'vote',
      priority: ACTION_PRIORITY,
      createdAt: t.ovMeeting.voting_opens_at ?? t.councilMeeting.created_at ?? undefined,
    };
  }

  const actionableCount = voteNow.length > 0 ? voteNow.length : targets.length;
  return {
    id: 'vote-pending-multiple',
    text: langEn
      ? `You have ${actionableCount} voting items to complete`
      : `你有 ${actionableCount} 项待投票事项`,
    kind: 'action',
    actionUrl: votingHubUrl(propertyId),
    source: 'vote',
    priority: ACTION_PRIORITY,
    createdAt: new Date().toISOString(),
  };
}

async function fetchAnnouncementBullets(propertyId: string): Promise<ImportantUpdatesBullet[]> {
  const { data, error } = await supabase
    .from('community_notifications')
    .select('id, title, priority, created_at')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  type Row = { id: string; title: string; priority: AnnouncementPriority; created_at: string };

  const sorted = [...(data as Row[])].sort((a, b) => {
    const pa = announcementPriorityScore(a.priority);
    const pb = announcementPriorityScore(b.priority);
    if (pb !== pa) return pb - pa;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return sorted.slice(0, MAX_ANNOUNCEMENTS).map((row) => ({
    id: `announcement-${row.id}`,
    text: row.title,
    kind: 'notice' as const,
    actionUrl: '/owner-info?tab=announcements',
    source: 'announcement' as const,
    priority: announcementPriorityScore(row.priority),
    createdAt: row.created_at,
  }));
}

function mergeAndSortBullets(items: ImportantUpdatesBullet[]): ImportantUpdatesBullet[] {
  return [...items]
    .sort((a, b) => {
      const aAction = a.kind === 'action' ? 1 : 0;
      const bAction = b.kind === 'action' ? 1 : 0;
      if (bAction !== aAction) return bAction - aAction;

      const ap = a.priority ?? 0;
      const bp = b.priority ?? 0;
      if (bp !== ap) return bp - ap;

      const at = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (bt !== at) return bt - at;

      return 0;
    })
    .slice(0, MAX_BULLETS);
}

export type UseImportantUpdatesBulletsParams = {
  propertyId: string | null | undefined;
  userId: string | null | undefined;
  propertyReady: boolean;
  langEn: boolean;
};

export function useImportantUpdatesBullets({
  propertyId,
  userId,
  propertyReady,
  langEn,
}: UseImportantUpdatesBulletsParams) {
  const [bullets, setBullets] = useState<ImportantUpdatesBullet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!propertyReady || !propertyId?.trim() || !userId?.trim()) {
      setBullets([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pid = propertyId.trim();
      const uid = userId.trim();

      const [voteBullet, announcementBullets] = await Promise.all([
        fetchPendingVoteBullet(pid, uid, langEn),
        fetchAnnouncementBullets(pid),
      ]);

      const merged: ImportantUpdatesBullet[] = [];
      if (voteBullet) merged.push(voteBullet);
      merged.push(...announcementBullets);

      setBullets(mergeAndSortBullets(merged));
    } catch (e) {
      console.error('[useImportantUpdatesBullets]', e);
      setError(e instanceof Error ? e.message : 'Failed to load important updates');
      setBullets([]);
    } finally {
      setLoading(false);
    }
  }, [propertyId, userId, propertyReady, langEn]);

  useEffect(() => {
    void load();
  }, [load]);

  return { bullets, loading, error };
}
