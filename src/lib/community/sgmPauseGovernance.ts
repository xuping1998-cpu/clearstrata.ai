import { supabase } from '@/lib/supabase';

export const SGM_PAUSE_ANNOUNCEMENT_TITLE_ZH = '特别业主大会暂停通知';
export const SGM_PAUSE_ANNOUNCEMENT_TITLE_EN = 'SGM Pause Notice';

export const SGM_PAUSE_BODY_ZH = `本次特别业主大会暂缓推进。
会议、提名、讨论及正式投票安排暂停。
后续会议安排将另行通知。`;

export const SGM_PAUSE_BODY_EN = `This Special General Meeting has been temporarily paused.
The meeting, nominations, discussion, and formal voting process have been suspended.
Further meeting arrangements will be announced separately.`;

export const SGM_PAUSE_NOTIFICATION_TYPE = 'sgm_pause';
export const SGM_PAUSE_MEETING_MARKER_PREFIX = 'clearstrata-sgm-pause-meeting-id:';

export function sgmPauseMeetingMarker(meetingId: string): string {
  return `<!--${SGM_PAUSE_MEETING_MARKER_PREFIX}${meetingId.trim()}-->`;
}

export function buildSgmPauseAnnouncementContent(meetingId: string): string {
  return `${SGM_PAUSE_BODY_ZH}\n\n---\n\n${SGM_PAUSE_BODY_EN}\n\n${sgmPauseMeetingMarker(meetingId)}`;
}

export function buildSgmPauseNotificationMessage(meetingId: string): string {
  return `${SGM_PAUSE_BODY_ZH}\n\n---\n\n${SGM_PAUSE_BODY_EN}\n\n${sgmPauseMeetingMarker(meetingId)}`;
}

export function isSgmPauseAnnouncementTitle(title: string | null | undefined): boolean {
  const t = String(title ?? '').trim();
  return t === SGM_PAUSE_ANNOUNCEMENT_TITLE_ZH || t === SGM_PAUSE_ANNOUNCEMENT_TITLE_EN;
}

export function displaySgmPauseAnnouncementTitle(langEn: boolean): string {
  return langEn ? SGM_PAUSE_ANNOUNCEMENT_TITLE_EN : SGM_PAUSE_ANNOUNCEMENT_TITLE_ZH;
}

export function isArchivedSgmMeeting(meeting: {
  meeting_type?: string | null;
  status?: string | null;
}): boolean {
  return (
    String(meeting.meeting_type ?? '').trim().toLowerCase() === 'sgm' &&
    String(meeting.status ?? '').trim().toLowerCase() === 'archived'
  );
}

export function isEligibleSgmPauseArchiveContext(params: {
  meetingType: string | null | undefined;
  meetingStatus: string | null | undefined;
  snapshotFrozenAt: string | null | undefined;
  ovStatus: string | null | undefined;
}): boolean {
  if (String(params.meetingType ?? '').trim().toLowerCase() !== 'sgm') return false;
  if (String(params.meetingStatus ?? '').trim().toLowerCase() !== 'archived') return false;
  if (String(params.snapshotFrozenAt ?? '').trim()) return false;
  if (String(params.ovStatus ?? '').trim().toLowerCase() === 'closed') return false;
  return true;
}

export function shouldTriggerSgmPauseOnArchiveTransition(params: {
  priorStatus: string | null | undefined;
  nextStatus: string | null | undefined;
  meetingType: string | null | undefined;
  snapshotFrozenAt: string | null | undefined;
  ovStatus: string | null | undefined;
}): boolean {
  const prior = String(params.priorStatus ?? '').trim().toLowerCase();
  const next = String(params.nextStatus ?? '').trim().toLowerCase();
  if (prior === 'archived' || next !== 'archived') return false;
  return isEligibleSgmPauseArchiveContext({
    meetingType: params.meetingType,
    meetingStatus: next,
    snapshotFrozenAt: params.snapshotFrozenAt,
    ovStatus: params.ovStatus,
  });
}

export type SgmPauseNoticeResult = {
  ok: boolean;
  skippedFully: boolean;
  announcementCreated: boolean;
  memberNotificationsSent: number;
  emailNotificationsSent: number;
  emailFailures: number;
  partialEmailFailure: boolean;
  reason?: string;
  error?: string;
};

export function buildSgmPauseNoticeToast(result: SgmPauseNoticeResult, langEn: boolean): string | null {
  if (result.skippedFully) {
    return langEn
      ? 'Meeting paused; pause notice already exists — no resend.'
      : '会议已暂停，暂停通知已存在，无需重复发送。';
  }
  if (result.partialEmailFailure) {
    return langEn
      ? 'Meeting paused and announcement published; some emails failed — please retry later.'
      : '会议已暂停，公告已发布；部分邮件发送失败，请稍后重试。';
  }
  if (result.ok && (result.announcementCreated || result.memberNotificationsSent > 0)) {
    return langEn
      ? 'Meeting paused; announcement and notifications sent to members.'
      : '会议已暂停，公告及通知已发送给成员。';
  }
  if (result.reason === 'not_eligible') return null;
  if (result.error) {
    return langEn
      ? `Meeting paused, but pause notice failed: ${result.error}`
      : `会议已暂停，但暂停通知发送失败：${result.error}`;
  }
  return null;
}

/** Idempotent backfill / archive trigger — announcement + in-app + email via server API. */
export async function ensureAndSendSgmPauseNoticeForMeeting(params: {
  meetingId: string;
  propertyId: string;
}): Promise<SgmPauseNoticeResult> {
  const meetingId = params.meetingId.trim();
  const propertyId = params.propertyId.trim();
  if (!meetingId || !propertyId) {
    return {
      ok: false,
      skippedFully: false,
      announcementCreated: false,
      memberNotificationsSent: 0,
      emailNotificationsSent: 0,
      emailFailures: 0,
      partialEmailFailure: false,
      error: 'meetingId and propertyId are required',
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return {
      ok: false,
      skippedFully: false,
      announcementCreated: false,
      memberNotificationsSent: 0,
      emailNotificationsSent: 0,
      emailFailures: 0,
      partialEmailFailure: false,
      error: 'not_authenticated',
    };
  }

  try {
    const res = await fetch('/api/ensure-and-send-sgm-pause-notice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ property_id: propertyId, meeting_id: meetingId }),
    });

    const payload = (await res.json().catch(() => ({}))) as Partial<SgmPauseNoticeResult> & {
      error?: string;
      reason?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        skippedFully: false,
        announcementCreated: false,
        memberNotificationsSent: 0,
        emailNotificationsSent: 0,
        emailFailures: 0,
        partialEmailFailure: false,
        error: payload.error ?? `HTTP ${res.status}`,
      };
    }

    return {
      ok: Boolean(payload.ok ?? true),
      skippedFully: Boolean(payload.skippedFully),
      announcementCreated: Boolean(payload.announcementCreated),
      memberNotificationsSent: Number(payload.memberNotificationsSent ?? 0),
      emailNotificationsSent: Number(payload.emailNotificationsSent ?? 0),
      emailFailures: Number(payload.emailFailures ?? 0),
      partialEmailFailure: Boolean(payload.partialEmailFailure),
      reason: payload.reason,
      error: payload.error,
    };
  } catch (e) {
    return {
      ok: false,
      skippedFully: false,
      announcementCreated: false,
      memberNotificationsSent: 0,
      emailNotificationsSent: 0,
      emailFailures: 0,
      partialEmailFailure: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
