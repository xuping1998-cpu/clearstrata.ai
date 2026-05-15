import { addDaysIso } from './ownerVotingCouncil';

/** Fixed 7-day phases: public notice → nomination → voting → results (from meeting start). */
export const ELECTION_FIXED_PHASE_DAYS = 7;

/** Remote written v3: single participation window from meeting start (parallel notice / nomination / voting). */
export const REMOTE_WRITTEN_V3_PARTICIPATION_DAYS = 14;

const DEFAULT_TS_EQUALITY_MS = 90_000;

function msIsoUtc(s?: string | null): number | null {
  const t = s?.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

export type DerivedCouncilElectionCanon = {
  publicNoticeOpenIso: string;
  publicNoticeCloseIso: string;
  nominationOpenIso: string;
  nominationCloseIso: string;
  votingOpenIso: string;
  votingCloseIso: string;
};

export function deriveCouncilElectionCanonFromScheduledAt(
  scheduledIso: string | null | undefined,
): DerivedCouncilElectionCanon | null {
  const t = scheduledIso?.trim();
  if (!t) return null;
  const baseMs = msIsoUtc(t);
  if (baseMs === null) return null;

  const publicNoticeOpenIso = new Date(baseMs).toISOString();
  const publicNoticeCloseIso = addDaysIso(publicNoticeOpenIso, ELECTION_FIXED_PHASE_DAYS);
  const nominationOpenIso = publicNoticeCloseIso;
  const nominationCloseIso = addDaysIso(publicNoticeOpenIso, ELECTION_FIXED_PHASE_DAYS * 2);
  const votingOpenIso = nominationCloseIso;
  const votingCloseIso = addDaysIso(publicNoticeOpenIso, ELECTION_FIXED_PHASE_DAYS * 3);

  return {
    publicNoticeOpenIso,
    publicNoticeCloseIso,
    nominationOpenIso,
    nominationCloseIso,
    votingOpenIso,
    votingCloseIso,
  };
}

/**
 * Remote written v3 only: notice, nomination, and voting all span `[scheduled_at, scheduled_at + 14d]`.
 * Same field names as legacy canon for drop-in use; do not use for v1/v2 written-remote.
 */
export function deriveRemoteWrittenV3CanonFromScheduledAt(
  scheduledIso: string | null | undefined,
): DerivedCouncilElectionCanon | null {
  const t = scheduledIso?.trim();
  if (!t) return null;
  const baseMs = msIsoUtc(t);
  if (baseMs === null) return null;

  const publicNoticeOpenIso = new Date(baseMs).toISOString();
  const closeIso = addDaysIso(publicNoticeOpenIso, REMOTE_WRITTEN_V3_PARTICIPATION_DAYS);
  return {
    publicNoticeOpenIso,
    publicNoticeCloseIso: closeIso,
    nominationOpenIso: publicNoticeOpenIso,
    nominationCloseIso: closeIso,
    votingOpenIso: publicNoticeOpenIso,
    votingCloseIso: closeIso,
  };
}

/** AGM/SGM display-only phases: with election = full 7+7+7; without = notice then voting (no empty nomination week). */
export type AgmSgmCanonDisplayWindows = {
  publicNoticeOpenIso: string;
  publicNoticeCloseIso: string;
  nominationOpenIso: string | null;
  nominationCloseIso: string | null;
  votingOpenIso: string;
  votingCloseIso: string;
};

export function deriveAgmSgmCanonDisplayWindows(
  scheduledIso: string | null | undefined,
  hasElectionAgenda: boolean,
): AgmSgmCanonDisplayWindows | null {
  const full = deriveCouncilElectionCanonFromScheduledAt(scheduledIso);
  if (!full) return null;
  if (hasElectionAgenda) {
    return {
      publicNoticeOpenIso: full.publicNoticeOpenIso,
      publicNoticeCloseIso: full.publicNoticeCloseIso,
      nominationOpenIso: full.nominationOpenIso,
      nominationCloseIso: full.nominationCloseIso,
      votingOpenIso: full.votingOpenIso,
      votingCloseIso: full.votingCloseIso,
    };
  }
  const votingOpenIso = full.publicNoticeCloseIso;
  const votingCloseIso = addDaysIso(votingOpenIso, ELECTION_FIXED_PHASE_DAYS);
  return {
    publicNoticeOpenIso: full.publicNoticeOpenIso,
    publicNoticeCloseIso: full.publicNoticeCloseIso,
    nominationOpenIso: null,
    nominationCloseIso: null,
    votingOpenIso,
    votingCloseIso,
  };
}

/** Compare DB or JSON timestamps that may differ by formatting; default ±90s. */
export function electionTimestampsCanonEqual(
  stored: string | null | undefined,
  canonIso: string,
  toleranceMs: number = DEFAULT_TS_EQUALITY_MS,
): boolean {
  const d1 = msIsoUtc(stored);
  const d2 = msIsoUtc(canonIso);
  if (d1 === null || d2 === null) return false;
  return Math.abs(d1 - d2) <= toleranceMs;
}

export type CouncilElectionLifecyclePhase =
  | 'public_notice'
  | 'nomination'
  | 'voting'
  | 'results_readonly';

export function councilElectionLifecyclePhase(now: Date, canon: DerivedCouncilElectionCanon): CouncilElectionLifecyclePhase {
  const n = now.getTime();
  const tNoticeClose = msIsoUtc(canon.publicNoticeCloseIso);
  const tNomClose = msIsoUtc(canon.nominationCloseIso);
  const tVoteClose = msIsoUtc(canon.votingCloseIso);
  if (tNoticeClose === null || tNomClose === null || tVoteClose === null) {
    return 'results_readonly';
  }
  if (n < tNoticeClose) return 'public_notice';
  if (n < tNomClose) return 'nomination';
  if (n < tVoteClose) return 'voting';
  return 'results_readonly';
}
