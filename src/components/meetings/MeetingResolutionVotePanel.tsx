import { useEffect, useMemo, useState } from 'react';
import type { MeetingAgendaRow, MeetingRow, OwnerVoteMeetingLite } from '@/features/meetings/api';
import { ensureOwnerVoteResolutionForMeeting } from '@/features/meetings/api';
import { isRemoveCouncilResolutionVotingAllowed } from '@/features/meetings/electionAgendaModel';
import { silentRegenerateMeetingArchiveVoteSnapshots } from '@/features/meetings/meetingDocumentsRead';
import { supabase } from '@/lib/supabase';

export type OwnerResolutionChoice = 'yes' | 'no' | 'abstain';

export type MeetingResolutionVotePanelProps = {
  agenda: MeetingAgendaRow;
  councilMeeting: MeetingRow;
  ownerVoteMeeting: OwnerVoteMeetingLite | null;
  resolutionId: string | null;
  eligibleUnitNo?: string | null;
  userId?: string | null;
  canEnsureResolution?: boolean;
  languageEn: boolean;
  onUpdated: () => void | Promise<void>;
};

type RpcPayload = { ok?: boolean; error?: string } | null;

function normalizeChoice(raw: string | null | undefined): OwnerResolutionChoice | null {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === 'yes' || s === 'approve' || s === 'for') return 'yes';
  if (s === 'no' || s === 'reject' || s === 'against') return 'no';
  if (s === 'abstain') return 'abstain';
  return null;
}

function choiceLabel(choice: OwnerResolutionChoice, en: boolean): string {
  switch (choice) {
    case 'yes':
      return en ? 'Yes' : '赞成';
    case 'no':
      return en ? 'No' : '反对';
    case 'abstain':
      return en ? 'Abstain' : '弃权';
  }
}

function extractRpcErrCode(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const o = err as Record<string, unknown>;
    return String(o.code ?? o.message ?? o.error ?? JSON.stringify(err));
  }
  return String(err);
}

function voteErrorAlert(code: string, en: boolean): void {
  const lc = code.toLowerCase();
  if (lc.includes('not_eligible')) {
    alert(en ? 'You are not eligible to vote' : '您不是本次会议的合资格投票人');
    return;
  }
  if (lc.includes('voting_not_open') || lc.includes('too_early')) {
    alert(en ? 'Voting is not open yet' : '表决尚未开放');
    return;
  }
  if (lc.includes('voting_closed') || lc.includes('past_close')) {
    alert(en ? 'Voting is closed' : '表决已结束');
    return;
  }
  if (lc.includes('resolution_not_found')) {
    alert(en ? 'Resolution record not found' : '未找到正式表决记录');
    return;
  }
  alert(code || (en ? 'Vote failed' : '表决失败'));
}

export function MeetingResolutionVotePanel({
  agenda,
  councilMeeting,
  ownerVoteMeeting,
  resolutionId: resolutionIdProp,
  eligibleUnitNo,
  userId,
  canEnsureResolution = false,
  languageEn: en,
  onUpdated,
}: MeetingResolutionVotePanelProps) {
  const [resolutionId, setResolutionId] = useState<string | null>(resolutionIdProp);
  const [submittedChoice, setSubmittedChoice] = useState<OwnerResolutionChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [ensureAttempted, setEnsureAttempted] = useState(false);

  useEffect(() => {
    setResolutionId(resolutionIdProp);
  }, [resolutionIdProp]);

  useEffect(() => {
    if (resolutionId || !canEnsureResolution || !ownerVoteMeeting?.id || ensureAttempted) return;
    setEnsureAttempted(true);
    const title =
      agenda.title_zh?.trim() ||
      agenda.title_en?.trim() ||
      (en ? 'Resolution to remove the current council' : '是否罢免现任业委会');
    void (async () => {
      const { id, error } = await ensureOwnerVoteResolutionForMeeting({
        meetingId: ownerVoteMeeting.id!,
        title,
        threshold: 'majority',
        description: null,
        display_order: agenda.sort_order ?? null,
      });
      if (error) {
        console.warn('[MeetingResolutionVotePanel] ensureOwnerVoteResolutionForMeeting', error.message);
        return;
      }
      if (id) {
        setResolutionId(id);
        await onUpdated();
      }
    })();
  }, [
    resolutionId,
    canEnsureResolution,
    ownerVoteMeeting?.id,
    ensureAttempted,
    agenda.title_zh,
    agenda.title_en,
    agenda.sort_order,
    en,
    onUpdated,
  ]);

  useEffect(() => {
    if (!resolutionId || !userId) {
      setSubmittedChoice(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('owner_vote_ballots')
        .select('choice')
        .eq('resolution_id', resolutionId)
        .eq('voter_user_id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn('[MeetingResolutionVotePanel] owner_vote_ballots', error.message);
        setSubmittedChoice(null);
        return;
      }
      setSubmittedChoice(normalizeChoice(data?.choice != null ? String(data.choice) : null));
    })();
    return () => {
      cancelled = true;
    };
  }, [resolutionId, userId]);

  const votingAllowed = useMemo(
    () => isRemoveCouncilResolutionVotingAllowed(new Date(), councilMeeting, ownerVoteMeeting),
    [councilMeeting, ownerVoteMeeting],
  );

  const canSubmit =
    !!resolutionId &&
    !!userId &&
    !!eligibleUnitNo?.trim() &&
    votingAllowed &&
    submittedChoice === null &&
    !busy;

  async function submitChoice(choice: OwnerResolutionChoice) {
    if (!resolutionId || !canSubmit) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('submit_owner_vote', {
        p_resolution_id: resolutionId,
        p_choice: choice,
      });
      if (error) throw error;
      const payload = data as RpcPayload;
      if (payload && typeof payload === 'object' && payload.ok === false) {
        voteErrorAlert(String(payload.error ?? '').toLowerCase(), en);
        return;
      }
      setSubmittedChoice(choice);
      await onUpdated();
      void silentRegenerateMeetingArchiveVoteSnapshots(String(councilMeeting.id));
    } catch (err) {
      voteErrorAlert(extractRpcErrCode(err), en);
    } finally {
      setBusy(false);
    }
  }

  if (!ownerVoteMeeting?.id) {
    return (
      <p className="mt-3 text-sm text-gray-600">
        {en ? 'Electronic voting is not enabled for this meeting yet.' : '本会议尚未启用电子表决。'}
      </p>
    );
  }

  if (!resolutionId && !canEnsureResolution) {
    return (
      <p className="mt-3 text-sm text-gray-600">
        {en ? 'Formal resolution record is not linked yet.' : '正式表决记录尚未关联。'}
      </p>
    );
  }

  if (!resolutionId && canEnsureResolution) {
    return (
      <p className="mt-3 text-sm text-gray-600">
        {en ? 'Preparing resolution record…' : '正在准备表决记录…'}
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3 border-t border-blue-100 pt-4">
      <h4 className="text-sm font-semibold text-gray-900">{en ? 'Cast your vote' : '业主表决'}</h4>

      {submittedChoice ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          {en
            ? `You have submitted your vote (${choiceLabel(submittedChoice, en)}).`
            : `您已提交表决（${choiceLabel(submittedChoice, en)}）。`}
        </p>
      ) : !votingAllowed ? (
        <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          {en ? 'Voting is not open yet.' : '表决尚未开放。'}
        </p>
      ) : !eligibleUnitNo?.trim() ? (
        <p className="text-sm text-gray-600">
          {en ? 'You are not listed as an eligible voter for this meeting.' : '您不在本次会议的合资格投票人名单中。'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(['yes', 'no', 'abstain'] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              disabled={!canSubmit}
              onClick={() => void submitChoice(choice)}
              className="rounded-lg border border-clearstrata-ui-primary bg-white px-4 py-2 text-sm font-medium text-clearstrata-ui-softText hover:bg-clearstrata-ui-primary/10 disabled:opacity-50"
            >
              {choiceLabel(choice, en)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
