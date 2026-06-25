import {
  isSgmPauseAnnouncementTitle,
  SGM_PAUSE_ANNOUNCEMENT_TITLE_BILINGUAL,
  SGM_PAUSE_NOTIFICATION_TYPE,
} from '@/lib/community/sgmPauseGovernance';

/** Matches `<!--clearstrata-sgm-pause-meeting-id:...-->` in stored notification bodies. */
const SGM_PAUSE_MARKER_RE = /<!--\s*clearstrata-sgm-pause-meeting-id:[^>]*-->\s*/gi;

export function stripSgmPauseMarker(text: string | null | undefined): string {
  return String(text ?? '')
    .replace(SGM_PAUSE_MARKER_RE, '')
    .trim();
}

export function displayUserNotificationTitle(
  type: string | null | undefined,
  title: string | null | undefined,
  langEn: boolean,
): string {
  const t = String(title ?? '').trim();
  if (String(type ?? '').toLowerCase() === SGM_PAUSE_NOTIFICATION_TYPE) {
    if (isSgmPauseAnnouncementTitle(t)) {
      return SGM_PAUSE_ANNOUNCEMENT_TITLE_BILINGUAL;
    }
    return t || SGM_PAUSE_ANNOUNCEMENT_TITLE_BILINGUAL;
  }
  return t || (langEn ? 'Notification' : '通知');
}

export function displayUserNotificationMessage(
  type: string | null | undefined,
  message: string | null | undefined,
): string {
  const body = String(message ?? '').trim();
  if (String(type ?? '').toLowerCase() === SGM_PAUSE_NOTIFICATION_TYPE) {
    return stripSgmPauseMarker(body);
  }
  return body;
}

/** Types shown in Owner Info → Personal notifications (user_notifications). */
export const PERSONAL_USER_NOTIFICATION_TYPES = [SGM_PAUSE_NOTIFICATION_TYPE] as const;

export function isPersonalUserNotificationType(type: string | null | undefined): boolean {
  return PERSONAL_USER_NOTIFICATION_TYPES.includes(
    String(type ?? '').toLowerCase() as (typeof PERSONAL_USER_NOTIFICATION_TYPES)[number],
  );
}

/** Types that should not appear as global unread toasts (shown in Owner Info instead). */
export const TOAST_EXCLUDED_USER_NOTIFICATION_TYPES = [
  'direct_message',
  SGM_PAUSE_NOTIFICATION_TYPE,
] as const;
