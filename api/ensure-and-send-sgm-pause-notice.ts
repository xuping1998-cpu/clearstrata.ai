/**
 * Vercel serverless: POST /api/ensure-and-send-sgm-pause-notice
 * Idempotent SGM early-pause governance: community announcement + user_notifications + email.
 */
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  claimSgmPauseDelivery,
  logSgmPauseDeliveryClaimed,
  logSgmPauseDeliveryFailed,
  logSgmPauseDeliverySent,
  logSgmPauseDeliverySkipped,
  markSgmPauseDeliveryFailed,
  markSgmPauseDeliverySent,
} from './_lib/notificationDeliveryClaim';

const TITLE_BILINGUAL = '特别业主大会暂停通知 / SGM Pause Notice';
const TITLE_ZH = '特别业主大会暂停通知';
const TITLE_EN = 'SGM Pause Notice';
const BODY_ZH = `本次特别业主大会暂缓推进。
会议、提名、讨论及正式投票安排暂停。
后续会议安排将另行通知。`;
const BODY_EN = `This Special General Meeting has been temporarily paused.
The meeting, nominations, discussion, and formal voting process have been suspended.
Further meeting arrangements will be announced separately.`;
const NOTIFICATION_TYPE = 'sgm_pause';
const MARKER_PREFIX = 'clearstrata-sgm-pause-meeting-id:';
const RECIPIENT_ROLES = ['owner', 'council', 'manager', 'admin', 'property_admin'] as const;
const APP_BASE_DEFAULT = 'https://app.clearstrata.ai';
const MAX_SGM_PAUSE_EMAIL_ATTEMPTS = 3;

function resendErrorMessage(error: unknown): string {
  if (error == null) return 'Unknown Resend error';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

function meetingMarker(meetingId: string): string {
  return `<!--${MARKER_PREFIX}${meetingId.trim()}-->`;
}

function markerPattern(meetingId: string): string {
  return `%${MARKER_PREFIX}${meetingId.trim()}%`;
}

function announcementContent(meetingId: string): string {
  return `${BODY_ZH}\n---\n${BODY_EN}\n${meetingMarker(meetingId)}`;
}

function notificationMessage(meetingId: string): string {
  return `${BODY_ZH}\n---\n${BODY_EN}\n${meetingMarker(meetingId)}`;
}

function normalizeAppBaseUrl(raw?: string | null): string {
  const cleaned = (raw ?? '').trim();
  if (!cleaned) return APP_BASE_DEFAULT;
  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  try {
    const origin = new URL(withProtocol).origin;
    const host = new URL(origin).hostname.replace(/^www\./i, '').toLowerCase();
    if (host === 'clearstrata.ai' || host === 'www.clearstrata.ai') return APP_BASE_DEFAULT;
    return origin;
  } catch {
    return APP_BASE_DEFAULT;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPauseEmailHtml(params: { openLink: string; logoUrl: string }): string {
  const openLink = escapeHtml(params.openLink);
  const logoUrl = escapeHtml(params.logoUrl);
  return `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ClearStrata SGM Pause Notice</title></head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f9fc;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 12px rgba(0,0,0,0.04);">
        <tr><td style="background:#35C3D6;padding:16px 20px;text-align:center;">
          <div style="margin-bottom:12px;"><img src="${logoUrl}" alt="ClearStrata" style="height:48px;object-fit:contain;display:block;margin:0 auto;" /></div>
          <div style="font-size:22px;font-weight:600;color:#ffffff;">ClearStrata 通知 / Notification</div>
        </td></tr>
        <tr><td style="padding:32px 32px 24px;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:600;">标题 / Title</p>
          <p style="margin:0 0 20px;color:#111827;font-size:16px;font-weight:600;line-height:1.5;">${escapeHtml(TITLE_BILINGUAL)}</p>
          <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:600;">内容 / Message</p>
          <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(BODY_ZH)}</p>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(BODY_EN)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td align="center" style="padding:0 0 12px;">
              <a href="${openLink}" style="display:inline-block;background:#35C3D6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;">查看公告 / View Announcement</a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
            若按钮无法打开：<a href="${openLink}" style="color:#35C3D6;word-break:break-all;">${openLink}</a>
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px 28px;border-top:1px solid #f3f4f6;background:#fafafa;">
          <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">此邮件由 ClearStrata 系统自动发送。</p>
        </td></tr>
      </table>
    </td></tr></table>
</body></html>`;
}

function councilTitleForOvBinding(meeting: {
  title_en?: string | null;
  title_zh?: string | null;
}): string {
  const zh = meeting.title_zh?.trim();
  const en = meeting.title_en?.trim();
  return zh || en || '';
}

function isEligiblePauseArchive(params: {
  meetingType: string;
  meetingStatus: string;
  snapshotFrozenAt: string | null;
  ovStatus: string | null;
}): boolean {
  if (params.meetingType !== 'sgm') return false;
  if (params.meetingStatus !== 'archived') return false;
  if (params.snapshotFrozenAt?.trim()) return false;
  if ((params.ovStatus ?? '').trim().toLowerCase() === 'closed') return false;
  return true;
}

function isValidEmail(email: string): boolean {
  const t = email.trim().toLowerCase();
  return Boolean(t && t.includes('@'));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ ok: false, error: 'Server misconfigured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Missing Authorization Bearer' });
  }

  const accessToken = authHeader.slice('Bearer '.length).trim();
  if (!accessToken) {
    return res.status(401).json({ ok: false, error: 'Missing access token' });
  }

  let body: Record<string, unknown> = {};
  try {
    const raw = req.body;
    body =
      typeof raw === 'string' ? (JSON.parse(raw) as Record<string, unknown>) : (raw as Record<string, unknown>) || {};
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }

  const propertyId = typeof body.property_id === 'string' ? body.property_id.trim() : '';
  const meetingId = typeof body.meeting_id === 'string' ? body.meeting_id.trim() : '';
  if (!propertyId || !meetingId) {
    return res.status(400).json({ ok: false, error: 'property_id and meeting_id are required' });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(accessToken);

  if (userErr || !user) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired session' });
  }

  const { data: pu, error: puErr } = await admin
    .from('property_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .eq('status', 'active')
    .maybeSingle();

  if (puErr || !pu) {
    return res.status(403).json({ ok: false, error: 'No access to this property' });
  }

  const pr = typeof pu.role === 'string' ? pu.role : '';
  if (pr !== 'council' && pr !== 'manager' && pr !== 'admin' && pr !== 'property_admin') {
    return res.status(403).json({ ok: false, error: 'Only staff can send SGM pause notices' });
  }

  const { data: meetingRow, error: meetingErr } = await admin
    .from('meetings')
    .select('id, property_id, meeting_type, status, title_en, title_zh')
    .eq('id', meetingId)
    .eq('property_id', propertyId)
    .maybeSingle();

  if (meetingErr) {
    return res.status(500).json({ ok: false, error: meetingErr.message });
  }
  if (!meetingRow) {
    return res.status(404).json({ ok: false, error: 'Meeting not found' });
  }

  const bindTitle = councilTitleForOvBinding(meetingRow as { title_en?: string; title_zh?: string });
  let ovStatus: string | null = null;
  let ovSnapshotFrozenAt: string | null = null;
  let ownerVoteMeetingId: string | null = null;

  if (bindTitle) {
    const { data: ovRows } = await admin
      .from('owner_vote_meetings')
      .select('id, status, snapshot_frozen_at, created_at')
      .eq('property_id', propertyId)
      .eq('title', bindTitle)
      .order('created_at', { ascending: false })
      .limit(1);

    const ov = ovRows?.[0] as { id?: string; status?: string; snapshot_frozen_at?: string | null } | undefined;
    if (ov) {
      ownerVoteMeetingId = typeof ov.id === 'string' ? ov.id : null;
      ovStatus = typeof ov.status === 'string' ? ov.status : null;
      ovSnapshotFrozenAt = typeof ov.snapshot_frozen_at === 'string' ? ov.snapshot_frozen_at : null;
    }
  }

  const meetingType = String((meetingRow as { meeting_type?: string }).meeting_type ?? '').trim().toLowerCase();
  const meetingStatus = String((meetingRow as { status?: string }).status ?? '').trim().toLowerCase();

  if (
    !isEligiblePauseArchive({
      meetingType,
      meetingStatus,
      snapshotFrozenAt: ovSnapshotFrozenAt,
      ovStatus,
    })
  ) {
    return res.status(200).json({
      ok: true,
      skippedFully: true,
      reason: 'not_eligible',
      announcementCreated: false,
      announcementAlreadyExists: false,
      recipientsCount: 0,
      memberNotificationsCreated: 0,
      memberNotificationsAlreadyExisting: 0,
      emailsSent: 0,
      emailFailures: 0,
      emailsSkippedAlreadySent: 0,
      emailsSkippedMaxAttempts: 0,
      emailAttemptsCreated: 0,
    });
  }

  const { data: markedAnnouncements, error: annMarkerErr } = await admin
    .from('community_notifications')
    .select('id')
    .eq('property_id', propertyId)
    .ilike('content', markerPattern(meetingId))
    .limit(1);

  if (annMarkerErr) {
    return res.status(500).json({ ok: false, error: annMarkerErr.message });
  }

  const { data: legacyAnnouncements, error: annLegacyErr } = await admin
    .from('community_notifications')
    .select('id')
    .eq('property_id', propertyId)
    .ilike('title', `%${TITLE_ZH}%`)
    .limit(1);

  if (annLegacyErr) {
    return res.status(500).json({ ok: false, error: annLegacyErr.message });
  }

  const hasMarkedAnnouncement = (markedAnnouncements ?? []).length > 0;
  const hasLegacyAnnouncement = (legacyAnnouncements ?? []).length > 0;
  const announcementAlreadyExists = hasMarkedAnnouncement || hasLegacyAnnouncement;

  let announcementCreated = false;

  if (!announcementAlreadyExists) {
    const { error: annInsErr } = await admin.from('community_notifications').insert({
      property_id: propertyId,
      title: TITLE_BILINGUAL,
      content: announcementContent(meetingId),
      priority: 'important',
      created_by: user.id,
    });

    if (annInsErr) {
      return res.status(500).json({ ok: false, error: annInsErr.message });
    }
    announcementCreated = true;
  }

  const { data: memberRows, error: memberErr } = await admin
    .from('property_members')
    .select('user_id, role')
    .eq('property_id', propertyId)
    .eq('status', 'active')
    .in('role', [...RECIPIENT_ROLES]);

  if (memberErr) {
    return res.status(500).json({ ok: false, error: memberErr.message });
  }

  const recipientIds = [
    ...new Set(
      (memberRows ?? [])
        .map((row) => String((row as { user_id?: string }).user_id ?? '').trim())
        .filter(Boolean),
    ),
  ];

  const { data: existingNotifications, error: notifSelErr } = await admin
    .from('user_notifications')
    .select('user_id')
    .eq('related_property_id', propertyId)
    .eq('type', NOTIFICATION_TYPE)
    .ilike('message', markerPattern(meetingId));

  if (notifSelErr) {
    return res.status(500).json({ ok: false, error: notifSelErr.message });
  }

  const alreadyNotified = new Set(
    (existingNotifications ?? []).map((row) => String((row as { user_id?: string }).user_id ?? '')),
  );

  const memberNotificationsAlreadyExisting = recipientIds.filter((uid) => alreadyNotified.has(uid)).length;

  const appBase = normalizeAppBaseUrl(process.env.APP_BASE_URL);
  const logoUrl = `${appBase}/logo-email.png`;
  const announcementsLink = `${appBase}/owner-info?tab=announcements&propertyId=${encodeURIComponent(propertyId)}`;
  const emailSubject = `【ClearStrata】${TITLE_BILINGUAL}`;
  const emailHtml = buildPauseEmailHtml({ openLink: announcementsLink, logoUrl });
  const resend = resendKey ? new Resend(resendKey) : null;

  const inAppLink = `/owner-info?tab=announcements&propertyId=${encodeURIComponent(propertyId)}`;
  const messageBody = notificationMessage(meetingId);

  let memberNotificationsCreated = 0;
  let emailsSent = 0;
  let emailFailures = 0;
  let emailsSkippedAlreadySent = 0;
  let emailsSkippedMaxAttempts = 0;
  let emailAttemptsCreated = 0;

  for (const recipientUserId of recipientIds) {
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('email')
      .eq('id', recipientUserId)
      .maybeSingle();

    if (profileErr) {
      emailFailures += 1;
      continue;
    }

    const recipientEmail = String((profile as { email?: string } | null)?.email ?? '').trim();

    if (!isValidEmail(recipientEmail)) {
      continue;
    }

    let claim;
    try {
      claim = await claimSgmPauseDelivery(admin, {
        meetingId,
        propertyId,
        userId: recipientUserId,
        email: recipientEmail,
        maxAttempts: MAX_SGM_PAUSE_EMAIL_ATTEMPTS,
      });
    } catch (claimErr) {
      console.error('[ensure-and-send-sgm-pause-notice] delivery claim failed', {
        recipientUserId,
        error: claimErr instanceof Error ? claimErr.message : String(claimErr),
      });
      emailFailures += 1;
      continue;
    }

    if (!claim.claimed) {
      logSgmPauseDeliverySkipped({
        meetingId,
        userId: recipientUserId,
        reason: claim.reason,
      });
      if (claim.reason === 'already_sent') {
        emailsSkippedAlreadySent += 1;
      } else if (claim.reason === 'max_attempts') {
        emailsSkippedMaxAttempts += 1;
      }
      continue;
    }

    emailAttemptsCreated += 1;
    logSgmPauseDeliveryClaimed({
      meetingId,
      propertyId,
      userId: recipientUserId,
      attemptNo: claim.attemptNo,
      deliveryId: claim.deliveryId,
    });

    if (!alreadyNotified.has(recipientUserId)) {
      const { error: insErr } = await admin.from('user_notifications').insert({
        user_id: recipientUserId,
        type: NOTIFICATION_TYPE,
        title: TITLE_BILINGUAL,
        message: messageBody,
        link: inAppLink,
        related_property_id: propertyId,
        is_read: false,
      });

      if (insErr) {
        const errMsg = insErr.message;
        console.error('[ensure-and-send-sgm-pause-notice] user_notifications insert', {
          recipientUserId,
          error: errMsg,
        });
        await markSgmPauseDeliveryFailed(admin, claim.deliveryId, `user_notifications insert: ${errMsg}`);
        logSgmPauseDeliveryFailed({
          meetingId,
          userId: recipientUserId,
          deliveryId: claim.deliveryId,
          error: errMsg,
        });
        emailFailures += 1;
        continue;
      }

      memberNotificationsCreated += 1;
      alreadyNotified.add(recipientUserId);
    }

    if (!resend) {
      const deliveryError = 'RESEND_API_KEY not configured';
      await markSgmPauseDeliveryFailed(admin, claim.deliveryId, deliveryError);
      logSgmPauseDeliveryFailed({
        meetingId,
        userId: recipientUserId,
        deliveryId: claim.deliveryId,
        error: deliveryError,
      });
      emailFailures += 1;
      continue;
    }

    const mailRes = await resend.emails.send({
      from: 'ClearStrata <noreply@clearstrata.ai>',
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    if (mailRes.error) {
      const deliveryError = resendErrorMessage(mailRes.error);
      await markSgmPauseDeliveryFailed(admin, claim.deliveryId, deliveryError);
      logSgmPauseDeliveryFailed({
        meetingId,
        userId: recipientUserId,
        deliveryId: claim.deliveryId,
        error: deliveryError,
      });
      emailFailures += 1;
      console.error('[ensure-and-send-sgm-pause-notice] Resend failed', {
        recipientUserId,
        attemptNo: claim.attemptNo,
        error: mailRes.error,
      });
      continue;
    }

    try {
      await markSgmPauseDeliverySent(admin, claim.deliveryId);
    } catch (markErr) {
      console.error('[ensure-and-send-sgm-pause-notice] delivery mark sent failed', {
        recipientUserId,
        deliveryId: claim.deliveryId,
        error: markErr instanceof Error ? markErr.message : String(markErr),
      });
      emailFailures += 1;
      continue;
    }

    logSgmPauseDeliverySent({
      meetingId,
      userId: recipientUserId,
      deliveryId: claim.deliveryId,
    });
    emailsSent += 1;
  }

  const skippedFully =
    !announcementCreated &&
    announcementAlreadyExists &&
    memberNotificationsCreated === 0 &&
    memberNotificationsAlreadyExisting === recipientIds.length;

  return res.status(200).json({
    ok: true,
    skippedFully,
    announcementCreated,
    announcementAlreadyExists,
    recipientsCount: recipientIds.length,
    memberNotificationsCreated,
    memberNotificationsAlreadyExisting,
    emailsSent,
    emailFailures,
    emailsSkippedAlreadySent,
    emailsSkippedMaxAttempts,
    emailAttemptsCreated,
    owner_vote_meeting_id: ownerVoteMeetingId,
    meeting_id: meetingId,
    property_id: propertyId,
  });
}
