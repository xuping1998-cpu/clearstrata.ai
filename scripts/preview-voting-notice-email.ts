/**
 * Phase 7J-Preview: local Voting Notice HTML preview (no Resend, no DB, no Edge invoke).
 *
 * Usage: npx tsx scripts/preview-voting-notice-email.ts
 * Output: tmp/voting-notice-preview.html
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildVotingNoticeEmailHtml } from '../supabase/functions/send-meeting-invite/votingNoticeEmailHtml.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outPath = join(root, 'tmp', 'voting-notice-preview.html');

const APP_BASE = 'https://app.clearstrata.ai';
const meetingId = '652350ca-84c3-4580-9a86-c66182dc7e0f';
const votingPath = `/meetings/${meetingId}#owner-voting`;
const inviteLink = `${APP_BASE}${votingPath}`;
const signInUrl = `${APP_BASE}/login?redirect=${encodeURIComponent(votingPath)}`;
const logoUrl = `${APP_BASE}/logo-email.png`;

const html = buildVotingNoticeEmailHtml({
  recipientNameZh: '许平',
  recipientNameEn: 'Xu Ping',
  meetingTitleZh: '特別業主大會',
  meetingTitleEn: 'Special General Meeting',
  propertyNameZh: 'BCS3736',
  propertyNameEn: 'BCS3736',
  votingDeadlineZh: '2026/7/3 08:59',
  votingDeadlineEn: 'Jul 3, 2026 08:59',
  inviteLink,
  signInUrl,
  logoUrl,
});

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html, 'utf8');

const logoMatch = html.match(/<img[^>]+src="([^"]+)"/);
const ctaMatch = html.match(
  /<a href="([^"]*#owner-voting)"[^>]*>进入会议投票/,
);

console.log('[preview-voting-notice] wrote', outPath);
console.log('[preview-voting-notice] logo src:', logoMatch?.[1] ?? '(not found)');
console.log('[preview-voting-notice] CTA href:', ctaMatch?.[1] ?? '(not found)');
console.log('[preview-voting-notice] has 投票已开放:', html.includes('投票已开放'));
console.log('[preview-voting-notice] no email sent (local HTML only)');
