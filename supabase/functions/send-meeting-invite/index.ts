/**
 * Meeting invitation emails via Resend.
 *
 * Secrets (Supabase Dashboard → Project Settings → Edge Functions → Secrets):
 * - APP_BASE_URL (optional): public app origin; path/query stripped. Empty/unset or marketing host
 *   `clearstrata.ai` / `www.clearstrata.ai` → https://app.clearstrata.ai (production app).
 * - RESEND_API_KEY (required)
 * - From address is fixed in code: ClearStrata <noreply@clearstrata.ai> (must be verified in Resend).
 * Redeploy after changing secrets: `supabase functions deploy send-meeting-invite`
 * Auth: do not rely on `Authorization` user JWT (ES256 can cause 401 at the gateway).
 * Use `supabase/config.toml` `[functions.send-meeting-invite] verify_jwt = false` and call
 * `invoke` with the anon key in `Authorization` from the app. DB access uses service role only.
 *
 * Product: until Resend production access is enabled, use only Resend-approved test recipients
 * to verify the flow; external addresses will get RESEND_TESTING_RESTRICTION until domain is verified.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APP_BASE_DEFAULT_ORIGIN = "https://app.clearstrata.ai";

/** Public web origin for email links; never points marketing `clearstrata.ai` at test app. */
function normalizeAppBaseUrl(raw?: string | null): string {
  const value = (raw ?? "").trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!value) return APP_BASE_DEFAULT_ORIGIN;

  const withProtocol =
    value.startsWith("http://") || value.startsWith("https://")
      ? value
      : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "clearstrata.ai" || host === "www.clearstrata.ai") {
      return "https://app.clearstrata.ai";
    }

    return url.origin;
  } catch {
    console.warn("[send-meeting-invite] invalid APP_BASE_URL:", raw);
    return APP_BASE_DEFAULT_ORIGIN;
  }
}

/** Request body: snake_case or camelCase (invoke from app uses camelCase). */
interface InviteRequestBody {
  meeting_id?: string;
  meetingId?: string;
  user_id?: string;
  userId?: string;
  property_id?: string;
  propertyId?: string;
  locale?: "en" | "zh";
  user_email?: string;
}

const ELECTION_FIXED_PHASE_DAYS = 7;
const REMOTE_WRITTEN_V3_PARTICIPATION_DAYS = 14;
const WRITTEN_REMOTE_META_START = "<!--clearstrata-written-remote\n";
const WRITTEN_REMOTE_META_END = "\n-->";

type MeetingFormatUi = "in_person" | "live_remote" | "hybrid" | "written_remote";

type WrittenRemoteMeta = {
  v?: number;
  mode?: string;
  public_notice_close_at?: string;
  discussion_closes_at?: string;
  voting_open_at?: string;
  voting_close_at?: string;
  participation_open_at?: string;
  participation_close_at?: string;
  nomination_open_at?: string;
  nomination_close_at?: string;
};

type FormalNoticeIsoWindow = { openIso: string; closeIso: string };

type InviteEmailFieldRow = {
  labelZh: string;
  labelEn: string;
  valueZh: string;
  valueEn: string;
};

/** First non-empty time string: `start_time` → `meeting_time` → `scheduled_at` (DB canonical). */
function pickMeetingStartRaw(meeting: Record<string, unknown>): string | null {
  const start_time = meeting["start_time"];
  const meeting_time = meeting["meeting_time"];
  const scheduled_at = meeting["scheduled_at"];

  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null;

  return str(start_time) || str(meeting_time) || str(scheduled_at);
}

function addDaysIso(fromIso: string, days: number): string {
  const base = new Date(fromIso);
  if (Number.isNaN(base.getTime())) return new Date().toISOString();
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function deriveCouncilElectionCanonFromScheduledAt(scheduledIso: string | null | undefined) {
  const t = scheduledIso?.trim();
  if (!t) return null;
  const base = new Date(t);
  if (Number.isNaN(base.getTime())) return null;
  const publicNoticeOpenIso = base.toISOString();
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

function deriveRemoteWrittenV3CanonFromScheduledAt(scheduledIso: string | null | undefined) {
  const t = scheduledIso?.trim();
  if (!t) return null;
  const base = new Date(t);
  if (Number.isNaN(base.getTime())) return null;
  const publicNoticeOpenIso = base.toISOString();
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

function deriveAgmSgmCanonDisplayWindows(
  scheduledIso: string | null | undefined,
  hasElectionAgenda: boolean,
) {
  const full = deriveCouncilElectionCanonFromScheduledAt(scheduledIso);
  if (!full) return null;
  if (hasElectionAgenda) return full;
  const votingOpenIso = full.publicNoticeCloseIso;
  const votingCloseIso = addDaysIso(votingOpenIso, ELECTION_FIXED_PHASE_DAYS);
  return {
    ...full,
    nominationOpenIso: null as string | null,
    nominationCloseIso: null as string | null,
    votingOpenIso,
    votingCloseIso,
  };
}

function extractWrittenRemoteMeta(descriptionZh: string | null | undefined): {
  meta: WrittenRemoteMeta | null;
} {
  const s = descriptionZh ?? "";
  const i = s.lastIndexOf(WRITTEN_REMOTE_META_START);
  if (i < 0) return { meta: null };
  const end = s.indexOf(WRITTEN_REMOTE_META_END, i + WRITTEN_REMOTE_META_START.length);
  if (end < 0) return { meta: null };
  const raw = s.slice(i + WRITTEN_REMOTE_META_START.length, end).trim();
  try {
    const o = JSON.parse(raw) as WrittenRemoteMeta;
    return { meta: o && typeof o === "object" ? o : null };
  } catch {
    return { meta: null };
  }
}

function isWrittenRemoteV3Meta(meta: WrittenRemoteMeta | null): boolean {
  if (!meta) return false;
  const v = Number(meta.v);
  const mode = String(meta.mode ?? "").trim().toLowerCase();
  if (v !== 3) return false;
  return mode === "remote_written" || mode === "written_remote";
}

function isWrittenRemoteV3Meeting(meeting: Record<string, unknown>): boolean {
  const desc = typeof meeting.description_zh === "string" ? meeting.description_zh : "";
  return isWrittenRemoteV3Meta(extractWrittenRemoteMeta(desc).meta);
}

function meetingFormatUiFromRow(meeting: Record<string, unknown>): MeetingFormatUi {
  const fmt = String(meeting.meeting_format ?? "").trim().toLowerCase();
  if (fmt === "in_person") return "in_person";
  if (fmt === "electronic") return "live_remote";
  if (fmt === "written_remote" || fmt === "remote_written") return "written_remote";
  if (fmt === "hybrid") {
    const desc = typeof meeting.description_zh === "string" ? meeting.description_zh : "";
    if (extractWrittenRemoteMeta(desc).meta) return "written_remote";
    return "hybrid";
  }
  return "hybrid";
}

function isWrittenRemoteUi(ui: MeetingFormatUi): boolean {
  return ui === "written_remote";
}

function isStrictAgmOrSgmMeeting(meeting: Record<string, unknown>): boolean {
  const mt = String(meeting.meeting_type ?? "").trim().toLowerCase();
  return mt === "agm" || mt === "sgm";
}

function councilWrittenRemoteWindows(meeting: Record<string, unknown>) {
  const ui = meetingFormatUiFromRow(meeting);
  const empty = () => ({
    publicNoticeOpens: null as string | null,
    publicNoticeCloses: null as string | null,
    nominationOpens: null as string | null,
    nominationCloses: null as string | null,
    votingOpens: null as string | null,
    votingCloses: null as string | null,
  });
  if (!isWrittenRemoteUi(ui)) return empty();

  const scheduled = typeof meeting.scheduled_at === "string" ? meeting.scheduled_at : null;

  if (isWrittenRemoteV3Meeting(meeting)) {
    const v3 = deriveRemoteWrittenV3CanonFromScheduledAt(scheduled);
    if (v3) {
      return {
        publicNoticeOpens: v3.publicNoticeOpenIso,
        publicNoticeCloses: v3.publicNoticeCloseIso,
        nominationOpens: v3.nominationOpenIso,
        nominationCloses: v3.nominationCloseIso,
        votingOpens: v3.votingOpenIso,
        votingCloses: v3.votingCloseIso,
      };
    }
  }

  const canon = deriveCouncilElectionCanonFromScheduledAt(scheduled);
  if (canon) {
    return {
      publicNoticeOpens: canon.publicNoticeOpenIso,
      publicNoticeCloses: canon.publicNoticeCloseIso,
      nominationOpens: null,
      nominationCloses: null,
      votingOpens: null,
      votingCloses: null,
    };
  }

  const { meta } = extractWrittenRemoteMeta(
    typeof meeting.description_zh === "string" ? meeting.description_zh : "",
  );
  const open = scheduled?.trim() ? scheduled : null;
  const closeRaw = (meta?.public_notice_close_at || meta?.discussion_closes_at || null)?.trim() ||
    null;
  return {
    publicNoticeOpens: open,
    publicNoticeCloses: closeRaw,
    nominationOpens: null,
    nominationCloses: null,
    votingOpens: meta?.voting_open_at?.trim() || null,
    votingCloses: meta?.voting_close_at?.trim() || null,
  };
}

function councilMeetingVotingWindowFallback(meeting: Record<string, unknown>) {
  const ui = meetingFormatUiFromRow(meeting);
  if (isWrittenRemoteUi(ui)) {
    if (isWrittenRemoteV3Meeting(meeting)) {
      const v3 = deriveRemoteWrittenV3CanonFromScheduledAt(
        typeof meeting.scheduled_at === "string" ? meeting.scheduled_at : null,
      );
      if (v3) return { votingOpens: v3.votingOpenIso, votingCloses: v3.votingCloseIso };
    }
    const canon = deriveCouncilElectionCanonFromScheduledAt(
      typeof meeting.scheduled_at === "string" ? meeting.scheduled_at : null,
    );
    if (canon) {
      return { votingOpens: canon.votingOpenIso, votingCloses: canon.votingCloseIso };
    }
  }
  const vo = typeof meeting.voting_open_at === "string" && meeting.voting_open_at.trim()
    ? meeting.voting_open_at.trim()
    : null;
  const vc = typeof meeting.voting_close_at === "string" && meeting.voting_close_at.trim()
    ? meeting.voting_close_at.trim()
    : null;
  if (vo || vc) return { votingOpens: vo, votingCloses: vc };
  const w = councilWrittenRemoteWindows(meeting);
  if (w.votingOpens || w.votingCloses) {
    return { votingOpens: w.votingOpens, votingCloses: w.votingCloses };
  }
  if (w.publicNoticeOpens || w.publicNoticeCloses) {
    return {
      votingOpens: w.publicNoticeOpens ?? w.publicNoticeCloses,
      votingCloses: w.publicNoticeCloses ?? w.publicNoticeOpens,
    };
  }
  return { votingOpens: null, votingCloses: null };
}

function deriveFormalNoticeTimelineWindows(
  meeting: Record<string, unknown>,
  opts: {
    hasElectionAgenda: boolean;
    ownerVoteVotingOpens?: string | null;
    ownerVoteVotingCloses?: string | null;
  },
) {
  const pair = (
    open: string | null | undefined,
    close: string | null | undefined,
  ): FormalNoticeIsoWindow | null => {
    const o = open?.trim();
    const c = close?.trim();
    if (!o || !c) return null;
    return { openIso: o, closeIso: c };
  };

  if (isWrittenRemoteV3Meeting(meeting)) {
    const v3 = deriveRemoteWrittenV3CanonFromScheduledAt(
      typeof meeting.scheduled_at === "string" ? meeting.scheduled_at : null,
    );
    if (!v3) {
      return { participation: null, publicNotice: null, nomination: null, voting: null };
    }
    const window = pair(v3.publicNoticeOpenIso, v3.publicNoticeCloseIso);
    return {
      participation: window,
      publicNotice: window,
      nomination: opts.hasElectionAgenda ? window : null,
      voting: window,
    };
  }

  if (isStrictAgmOrSgmMeeting(meeting)) {
    const disp = deriveAgmSgmCanonDisplayWindows(
      typeof meeting.scheduled_at === "string" ? meeting.scheduled_at : null,
      opts.hasElectionAgenda,
    );
    if (!disp) {
      return { participation: null, publicNotice: null, nomination: null, voting: null };
    }
    const publicNotice = pair(disp.publicNoticeOpenIso, disp.publicNoticeCloseIso);
    const voting = pair(disp.votingOpenIso, disp.votingCloseIso);
    const remoteWritten = isWrittenRemoteUi(meetingFormatUiFromRow(meeting));
    return {
      participation: remoteWritten ? (publicNotice ?? voting) : null,
      publicNotice,
      nomination: opts.hasElectionAgenda && disp.nominationOpenIso && disp.nominationCloseIso
        ? pair(disp.nominationOpenIso, disp.nominationCloseIso)
        : null,
      voting,
    };
  }

  const disc = councilWrittenRemoteWindows(meeting);
  let noticeOpen = disc.publicNoticeOpens?.trim() || null;
  let noticeClose = disc.publicNoticeCloses?.trim() || null;
  if (!noticeOpen && !noticeClose && typeof meeting.scheduled_at === "string" &&
    meeting.scheduled_at.trim()) {
    const canon = deriveCouncilElectionCanonFromScheduledAt(meeting.scheduled_at);
    if (canon) {
      noticeOpen = canon.publicNoticeOpenIso;
      noticeClose = canon.publicNoticeCloseIso;
    }
  }

  const fb = councilMeetingVotingWindowFallback(meeting);
  const voteOpen = opts.ownerVoteVotingOpens?.trim() || fb.votingOpens || null;
  const voteClose = opts.ownerVoteVotingCloses?.trim() || fb.votingCloses || null;

  return {
    participation: isWrittenRemoteUi(meetingFormatUiFromRow(meeting))
      ? pair(noticeOpen, noticeClose)
      : null,
    publicNotice: pair(noticeOpen, noticeClose),
    nomination: pair(disc.nominationOpens, disc.nominationCloses),
    voting: pair(voteOpen, voteClose),
  };
}

function formatWhenZhFromDate(startTime: Date): string {
  return `${startTime.getFullYear()}年${startTime.getMonth() + 1}月${startTime.getDate()}日 ${startTime.getHours()}:${
    String(startTime.getMinutes()).padStart(2, "0")
  }`;
}

function formatWhenEnFromDate(startTime: Date): string {
  return startTime.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatInstantBilingual(iso: string | null | undefined): { zh: string; en: string } {
  if (!iso?.trim()) return { zh: "暂未设置", en: "Not set" };
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return { zh: "暂未设置", en: "Not set" };
  return { zh: formatWhenZhFromDate(d), en: formatWhenEnFromDate(d) };
}

function formatWindowSpanBilingual(window: FormalNoticeIsoWindow | null): { zh: string; en: string } {
  if (!window) return { zh: "暂未设置", en: "Not set" };
  const open = formatInstantBilingual(window.openIso);
  const close = formatInstantBilingual(window.closeIso);
  return {
    zh: `${open.zh} · ${close.zh}`,
    en: `${open.en} · ${close.en}`,
  };
}

function resolveMeetingTitles(m: Record<string, unknown>): { titleZh: string; titleEn: string } {
  const zh = typeof m.title_zh === "string" && m.title_zh.trim() ? m.title_zh.trim() : "";
  const en = typeof m.title_en === "string" && m.title_en.trim() ? m.title_en.trim() : "";
  const generic = typeof m.title === "string" && m.title.trim() ? m.title.trim() : "";
  return {
    titleZh: zh || generic || en || "会议通知",
    titleEn: en || generic || zh || "Meeting Invitation",
  };
}

function meetingFormatLabelBilingual(meeting: Record<string, unknown>): { zh: string; en: string } {
  const ui = meetingFormatUiFromRow(meeting);
  if (isWrittenRemoteUi(ui)) {
    return { zh: "远程书面会议", en: "Remote Written Meeting" };
  }
  if (ui === "in_person") return { zh: "现场会议", en: "In-Person Meeting" };
  if (ui === "live_remote") return { zh: "线上直播", en: "Live Remote Meeting" };
  return { zh: "混合会议", en: "Hybrid Meeting" };
}

function locationLabelBilingual(meeting: Record<string, unknown>): { zh: string; en: string } {
  if (isWrittenRemoteUi(meetingFormatUiFromRow(meeting))) {
    return { zh: "线上", en: "Online" };
  }
  const loc = typeof meeting.location === "string" && meeting.location.trim()
    ? meeting.location.trim()
    : "";
  if (loc) return { zh: loc, en: loc };
  return { zh: "待确认", en: "To be confirmed" };
}

function durationLabelBilingual(meeting: Record<string, unknown>): { zh: string; en: string } | null {
  const raw = meeting.duration_minutes ?? meeting.duration;
  const n = typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : null;
  if (n === null) return null;
  return { zh: `${n} 分钟`, en: `${n} minutes` };
}

function buildInviteEmailFields(
  meeting: Record<string, unknown>,
  opts: {
    hasElectionAgenda: boolean;
    ownerVoteVotingOpens?: string | null;
    ownerVoteVotingCloses?: string | null;
  },
): InviteEmailFieldRow[] {
  const titles = resolveMeetingTitles(meeting);
  const remoteWritten = isWrittenRemoteUi(meetingFormatUiFromRow(meeting));
  const startRaw = pickMeetingStartRaw(meeting);
  const when = formatInstantBilingual(startRaw);
  const timeline = deriveFormalNoticeTimelineWindows(meeting, opts);
  const fields: InviteEmailFieldRow[] = [
    {
      labelZh: "会议",
      labelEn: "Meeting",
      valueZh: titles.titleZh,
      valueEn: titles.titleEn,
    },
    {
      labelZh: "组织者",
      labelEn: "Organizer",
      valueZh: "ClearStrata 团队",
      valueEn: "ClearStrata Team",
    },
  ];

  if (remoteWritten) {
    const fmt = meetingFormatLabelBilingual(meeting);
    fields.push({
      labelZh: "会议形式",
      labelEn: "Meeting Format",
      valueZh: fmt.zh,
      valueEn: fmt.en,
    });
    const loc = locationLabelBilingual(meeting);
    fields.push({
      labelZh: "地点",
      labelEn: "Location",
      valueZh: loc.zh,
      valueEn: loc.en,
    });
    if (startRaw) {
      fields.push({
        labelZh: "时间",
        labelEn: "Date & Time",
        valueZh: when.zh,
        valueEn: when.en,
      });
    }
    const participation = formatWindowSpanBilingual(timeline.participation);
    fields.push({
      labelZh: "参与期间",
      labelEn: "Participation Period",
      valueZh: participation.zh,
      valueEn: participation.en,
    });
    const publicNotice = formatWindowSpanBilingual(timeline.publicNotice);
    fields.push({
      labelZh: "公示与讨论期",
      labelEn: "Public Notice & Discussion Period",
      valueZh: publicNotice.zh,
      valueEn: publicNotice.en,
    });
    if (opts.hasElectionAgenda && timeline.nomination) {
      const nomination = formatWindowSpanBilingual(timeline.nomination);
      fields.push({
        labelZh: "提名期",
        labelEn: "Nomination Period",
        valueZh: nomination.zh,
        valueEn: nomination.en,
      });
    }
    const voting = formatWindowSpanBilingual(timeline.voting);
    fields.push({
      labelZh: "投票期",
      labelEn: "Voting Period",
      valueZh: voting.zh,
      valueEn: voting.en,
    });
    return fields;
  }

  if (startRaw) {
    fields.push({
      labelZh: "时间",
      labelEn: "Date & Time",
      valueZh: when.zh,
      valueEn: when.en,
    });
  }
  const duration = durationLabelBilingual(meeting);
  if (duration) {
    fields.push({
      labelZh: "时长",
      labelEn: "Duration",
      valueZh: duration.zh,
      valueEn: duration.en,
    });
  }
  const fmt = meetingFormatLabelBilingual(meeting);
  fields.push({
    labelZh: "会议形式",
    labelEn: "Meeting Format",
    valueZh: fmt.zh,
    valueEn: fmt.en,
  });
  const loc = locationLabelBilingual(meeting);
  fields.push({
    labelZh: "地点",
    labelEn: "Location",
    valueZh: loc.zh,
    valueEn: loc.en,
  });
  return fields;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Bilingual invitation HTML; all copy from params (plain HTML, no Resend `data`). */
interface InviteEmailHtmlParams {
  recipientNameZh: string;
  recipientNameEn: string;
  fields: InviteEmailFieldRow[];
  inviteLink: string;
  signInUrl: string;
  logoUrl: string;
}

function renderInviteFieldRows(fields: InviteEmailFieldRow[]): string {
  return fields.map((row, index) => {
    const safe = {
      labelZh: escapeHtml(row.labelZh),
      labelEn: escapeHtml(row.labelEn),
      valueZh: escapeHtml(row.valueZh),
      valueEn: escapeHtml(row.valueEn),
    };
    const border = index < fields.length - 1 ? "border-bottom:1px solid #e5e7eb;" : "";
    return `<tr><td style="padding:12px 0;${border}">
      <p style="margin:0 0 6px;color:#6b7280;font-size:12px;font-weight:600;">${safe.labelZh} / ${safe.labelEn}</p>
      <p style="margin:0 0 2px;color:#111827;font-size:15px;">${safe.valueZh}</p>
      <p style="margin:0;color:#374151;font-size:14px;">${safe.valueEn}</p>
    </td></tr>`;
  }).join("");
}

function buildEmailHtml(p: InviteEmailHtmlParams): string {
  const {
    recipientNameZh,
    recipientNameEn,
    fields,
    inviteLink,
    signInUrl,
    logoUrl,
  } = p;

  const safe = {
    recipientNameZh: escapeHtml(recipientNameZh),
    recipientNameEn: escapeHtml(recipientNameEn),
    logoUrl: escapeHtml(logoUrl),
  };

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>会议邀请 / Meeting Invitation</title>
</head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f9fc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 12px rgba(0,0,0,0.04);">
          <tr>
            <td style="background:#16a34a;padding:16px 20px;text-align:center;">
              <div style="margin-bottom:12px;">
                <img
                  src="${safe.logoUrl}"
                  alt="ClearStrata"
                  style="height:48px;object-fit:contain;display:block;margin:0 auto;"
                />
              </div>
              <div style="font-size:22px;font-weight:600;color:#ffffff;">
                会议邀请 / Meeting Invitation
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.65;">
                ${safe.recipientNameZh} 您好，
              </p>
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65;">
                Hello ${safe.recipientNameEn},
              </p>
              <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.65;">
                您已被邀请参加以下会议，请查看会议详情并进入会议页面参与。
              </p>
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65;">
                You are invited to the following meeting. Please review the details and enter the meeting page to participate.
              </p>
              <table role="presentation" width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 22px;">
                ${renderInviteFieldRows(fields)}
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;">
                <tr>
                  <td align="center" style="padding:0 0 12px;">
                    <a href="${inviteLink}" style="display:inline-block;background:#1D9E75;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;">进入会议 / Enter Meeting</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
                如果按钮无法打开，请复制以下链接：<br />
                If the button does not open, copy this link:<br />
                <a href="${inviteLink}" style="color:#1D9E75;word-break:break-all;">${inviteLink}</a>
              </p>
              <p style="margin:16px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
                仅登录：<a href="${signInUrl}" style="color:#1D9E75;word-break:break-all;">${signInUrl}</a><br />
                Sign in only: <a href="${signInUrl}" style="color:#1D9E75;word-break:break-all;">${signInUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #f3f4f6;background:#fafafa;">
              <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">
                此邮件由 ClearStrata 自动发送。<br />
                This email was sent automatically by ClearStrata.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** JSON API responses (always CORS + Content-Type for browser invoke). */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

/** Unified JSON body for clients: always includes ok, message, detail. */
function apiResponse(
  ok: boolean,
  message: string,
  detail: unknown,
  status: number,
): Response {
  return json({ ok, message, detail }, status);
}

/** Plain JSON.stringify(err) drops Error fields; use this for logs + response detail. */
function unknownToSerializable(err: unknown): unknown {
  if (err instanceof Error) {
    const base: Record<string, unknown> = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
    const withCause = err as Error & { cause?: unknown };
    if (withCause.cause !== undefined) {
      base.cause = unknownToSerializable(withCause.cause);
    }
    return base;
  }
  if (err !== null && typeof err === "object") {
    try {
      return JSON.parse(JSON.stringify(err)) as unknown;
    } catch {
      return { value: String(err) };
    }
  }
  return { value: String(err) };
}

function sendEmailFailedResponse(
  message: string,
  detail: unknown,
  status: number,
): Response {
  return json(
    {
      ok: false,
      message,
      detail: unknownToSerializable(detail),
    },
    status,
  );
}

async function upsertInvitationDelivery(
  supabaseAdmin: ReturnType<typeof createClient>,
  params: {
    meeting_id: string;
    property_id: string;
    recipient_user_id: string;
    email: string;
    delivery_status: "sent" | "failed";
  },
) {
  const { error } = await supabaseAdmin.from("meeting_invitations").upsert(
    {
      meeting_id: params.meeting_id,
      property_id: params.property_id,
      recipient_user_id: params.recipient_user_id,
      email: params.email,
      delivery_channel: "email",
      delivery_status: params.delivery_status,
      sent_at: params.delivery_status === "sent" ? new Date().toISOString() : null,
    },
    { onConflict: "meeting_id,recipient_user_id" },
  );
  if (error) {
    console.error("send-meeting-invite: invitation upsert failed", error);
  }
  return { error };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("🚨 FUNCTION START", new Date().toISOString());
    console.log("SEND_MEETING_INVITE_VERSION = 2026-04-17-01");
    console.log("SENTINEL_SCHEDULED_AT_ONLY_BUILD");

    const missingEnv: string[] = [];
    if (!Deno.env.get("RESEND_API_KEY")?.trim()) missingEnv.push("RESEND_API_KEY");
    if (!Deno.env.get("SUPABASE_URL")?.trim()) missingEnv.push("SUPABASE_URL");
    if (!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim()) {
      missingEnv.push("SUPABASE_SERVICE_ROLE_KEY");
    }
    if (missingEnv.length > 0) {
      const name = missingEnv[0];
      console.error("[send-meeting-invite] missing env:", missingEnv);
      return apiResponse(false, `missing env var: ${name}`, { missing: missingEnv }, 503);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY")!.trim();

    let raw: InviteRequestBody;
    try {
      raw = (await req.json()) as InviteRequestBody;
    } catch (e) {
      console.error("[send-meeting-invite] Invalid JSON body", e);
      return apiResponse(false, "Invalid JSON body", null, 400);
    }

    const meeting_id = String(raw.meeting_id ?? raw.meetingId ?? "").trim();
    const user_id = String(raw.user_id ?? raw.userId ?? "").trim();
    const property_id = String(raw.property_id ?? raw.propertyId ?? "").trim();
    const locale: "en" | "zh" = raw.locale === "en" ? "en" : "zh";

    console.log("[send-meeting-invite] params", {
      meeting_id,
      property_id,
      user_id,
      locale,
    });

    if (!meeting_id || !user_id) {
      return apiResponse(false, "meeting_id and user_id are required", null, 400);
    }
    if (!property_id) {
      return apiResponse(false, "property_id is required", null, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [{ data: meeting, error: meetingErr }, { data: profile, error: profileErr }] =
      await Promise.all([
        supabaseAdmin.from("meetings").select(
          "id, property_id, title_en, title_zh, meeting_type, description_zh, scheduled_at, duration_minutes, is_virtual, meeting_link, location, meeting_format, voting_open_at, voting_close_at, created_by",
        ).eq("id", meeting_id).eq("property_id", property_id)
          .maybeSingle(),
        supabaseAdmin.from("profiles").select("full_name_en, full_name_zh, email").eq("id", user_id)
          .maybeSingle(),
      ]);

    if (meetingErr) {
      console.error("[send-meeting-invite] meeting query error", meetingErr);
      return apiResponse(false, "Meeting query failed", meetingErr, 500);
    }
    if (!meeting) {
      return apiResponse(false, "Meeting not found", null, 404);
    }

    const [{ count: invitationCount, error: invErr }, { count: memberCount, error: memErr }] =
      await Promise.all([
        supabaseAdmin
          .from("meeting_invitations")
          .select("id", { count: "exact", head: true })
          .eq("meeting_id", meeting_id)
          .eq("property_id", property_id)
          .eq("recipient_user_id", user_id),
        supabaseAdmin
          .from("property_members")
          .select("user_id", { count: "exact", head: true })
          .eq("property_id", property_id)
          .eq("user_id", user_id)
          .eq("status", "active"),
      ]);

    if (invErr || memErr) {
      return apiResponse(false, "Authorization check failed", { invErr, memErr }, 500);
    }
    const okInvite = (invitationCount ?? 0) > 0;
    const okMember = (memberCount ?? 0) > 0;
    if (!okInvite && !okMember) {
      return apiResponse(
        false,
        "Recipient is not invited to this meeting and is not an active member of this property.",
        { code: "FORBIDDEN" },
        403,
      );
    }

    if (profileErr || !profile || !profile.email) {
      return apiResponse(false, "User profile or email not found", { profileErr }, 404);
    }

    const recipientNameZh = profile.full_name_zh?.trim() ||
      profile.full_name_en?.trim() ||
      "业主";
    const recipientNameEn = profile.full_name_en?.trim() ||
      profile.full_name_zh?.trim() ||
      "Owner";

    const normalizedBaseUrl = normalizeAppBaseUrl(Deno.env.get("APP_BASE_URL"));
    const logoUrl = `${normalizedBaseUrl}/logo-email.png`;

    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error: tokenInsErr } = await supabaseAdmin.from("invite_tokens").insert({
      user_id,
      meeting_id,
      token: inviteToken,
      expires_at: expiresAt,
    });
    if (tokenInsErr) {
      console.error("[send-meeting-invite] invite_tokens insert failed", tokenInsErr);
      return apiResponse(false, "Could not create invite token", { detail: tokenInsErr.message }, 500);
    }

    const meetingMagicUrl = `${normalizedBaseUrl}/invite?token=${inviteToken}`;
    const signInUrl =
      `${normalizedBaseUrl}/login?redirect=${
        encodeURIComponent(`/meetings/${meeting_id}?entry=invite`)
      }`;
    const inviteLink = meetingMagicUrl;

    console.log("[MeetingInviteEmail] inviteToken", inviteToken);
    console.log("[MeetingInviteEmail] meetingMagicUrl", meetingMagicUrl);

    console.log("[send-meeting-invite] base url debug:", {
      raw: Deno.env.get("APP_BASE_URL"),
      normalizedBaseUrl,
      meetingMagicUrl,
      signInUrl,
      logoUrl,
    });

    console.log("meeting raw:", meeting);

    const m = meeting as Record<string, unknown>;

    const [{ count: electionAgendaCount, error: electionAgendaErr }, { data: ovMeetingId }] =
      await Promise.all([
        supabaseAdmin
          .from("meeting_agenda_items")
          .select("id", { count: "exact", head: true })
          .eq("meeting_id", meeting_id)
          .like("description_zh", "%clearstrata-election-agenda%"),
        supabaseAdmin.rpc("_archive_resolve_owner_vote_meeting_id", {
          p_property_id: property_id,
          p_council_meeting_id: meeting_id,
        }),
      ]);

    if (electionAgendaErr) {
      console.warn("[send-meeting-invite] election agenda count failed (non-fatal)", electionAgendaErr);
    }

    let ownerVoteVotingOpens: string | null = null;
    let ownerVoteVotingCloses: string | null = null;
    const resolvedOvId = typeof ovMeetingId === "string" ? ovMeetingId : null;
    if (resolvedOvId) {
      const { data: ovRow } = await supabaseAdmin
        .from("owner_vote_meetings")
        .select("voting_opens_at, voting_closes_at")
        .eq("id", resolvedOvId)
        .maybeSingle();
      if (ovRow) {
        ownerVoteVotingOpens = typeof ovRow.voting_opens_at === "string"
          ? ovRow.voting_opens_at
          : null;
        ownerVoteVotingCloses = typeof ovRow.voting_closes_at === "string"
          ? ovRow.voting_closes_at
          : null;
      }
    }

    const inviteFields = buildInviteEmailFields(m, {
      hasElectionAgenda: (electionAgendaCount ?? 0) > 0,
      ownerVoteVotingOpens,
      ownerVoteVotingCloses,
    });

    console.log("[send-meeting-invite] email fields", {
      normalizedBaseUrl,
      meetingMagicUrl,
      signInUrl,
      logoUrl,
      remoteWritten: isWrittenRemoteUi(meetingFormatUiFromRow(m)),
      inviteFieldCount: inviteFields.length,
    });

    const htmlTemplate = buildEmailHtml({
      recipientNameZh,
      recipientNameEn,
      fields: inviteFields,
      inviteLink,
      signInUrl,
      logoUrl,
    });

    const email = profile.email as string;
    const meetingId = meeting_id;
    const propertyId = property_id;

    console.log("payload:", {
      meetingId,
      propertyId,
      email,
    });

    const resend = new Resend(resendApiKey);

    try {
      console.log("📨 sending email to:", email);

      // Resend only applies `data` when using their template system; plain `html` is sent as-is.
      const res = await resend.emails.send({
        from: "ClearStrata <noreply@clearstrata.ai>",
        to: email,
        subject: "会议邀请 / Meeting Invitation",
        html: htmlTemplate,
      });

      console.log("✅ resend success", res);

      if (res.error) {
        const errPayload = res.error as Record<string, unknown>;
        console.error("❌ resend error FULL", JSON.stringify(res.error, null, 2));

        const resendName =
          typeof errPayload.name === "string" ? errPayload.name : "";
        const resendMessage =
          typeof errPayload.message === "string"
            ? errPayload.message
            : JSON.stringify(errPayload);
        const msgLower = resendMessage.toLowerCase();
        const isTestingRecipientRestriction =
          resendName === "validation_error" &&
          /testing email|only send|verify a domain|can only send/i.test(msgLower);

        await supabaseAdmin.from("invite_tokens").delete().eq("token", inviteToken);
        await upsertInvitationDelivery(supabaseAdmin, {
          meeting_id,
          property_id,
          recipient_user_id: user_id,
          email,
          delivery_status: "failed",
        });

        if (isTestingRecipientRestriction) {
          return sendEmailFailedResponse(
            "Resend is in test mode: only allowed recipients can receive mail until production access is enabled.",
            {
              code: "RESEND_TESTING_RESTRICTION",
              message_zh: "当前邮箱发送受限，请先完成邮件服务正式发送权限开通",
              message_en:
                "Email sending is restricted. Verify your domain in Resend and enable production sending, or use an allowed test recipient until then.",
              resend: res.error,
            },
            502,
          );
        }

        return sendEmailFailedResponse(
          `Resend rejected the request: ${resendMessage}`,
          { code: "RESEND_API_ERROR", resend: res.error },
          502,
        );
      }

      const emailId = res.data?.id;
      const { error: invDeliveryErr } = await upsertInvitationDelivery(supabaseAdmin, {
        meeting_id,
        property_id,
        recipient_user_id: user_id,
        email,
        delivery_status: "sent",
      });
      if (!invDeliveryErr) {
        const noticeSentIso = new Date().toISOString();
        const { error: noticeSentErr } = await supabaseAdmin
          .from("meetings")
          .update({ notice_sent_at: noticeSentIso })
          .eq("id", meeting_id)
          .is("notice_sent_at", null);
        if (noticeSentErr) {
          console.warn("[send-meeting-invite] meetings.notice_sent_at update failed (non-fatal)", noticeSentErr);
        }
      }
      console.log("[send-meeting-invite] success", { email_id: emailId });
      return apiResponse(true, "Email sent", { email_id: emailId }, 200);
    } catch (err) {
      console.error("❌ resend error FULL", JSON.stringify(unknownToSerializable(err), null, 2));
      console.error("❌ resend error raw object", err);

      await supabaseAdmin.from("invite_tokens").delete().eq("token", inviteToken);
      await upsertInvitationDelivery(supabaseAdmin, {
        meeting_id,
        property_id,
        recipient_user_id: user_id,
        email,
        delivery_status: "failed",
      });

      return sendEmailFailedResponse("Failed to send email", err, 500);
    }
  } catch (err) {
    const serial = unknownToSerializable(err);
    console.error("[send-meeting-invite] unhandled", JSON.stringify(serial, null, 2), err);
    return apiResponse(
      false,
      "Unexpected error while sending invitation",
      { code: "INTERNAL_ERROR", detail: serial },
      500,
    );
  }
});
