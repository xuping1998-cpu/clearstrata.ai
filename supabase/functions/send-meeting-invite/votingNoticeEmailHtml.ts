/** Voting notice HTML template (shared by Edge Function + local preview script). */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type VotingNoticeEmailParams = {
  recipientNameZh: string;
  recipientNameEn: string;
  meetingTitleZh: string;
  meetingTitleEn: string;
  propertyNameZh: string;
  propertyNameEn: string;
  votingDeadlineZh: string;
  votingDeadlineEn: string;
  inviteLink: string;
  signInUrl: string;
  logoUrl: string;
};

export function buildVotingNoticeEmailHtml(p: VotingNoticeEmailParams): string {
  const safe = {
    recipientNameZh: escapeHtml(p.recipientNameZh),
    recipientNameEn: escapeHtml(p.recipientNameEn),
    meetingTitleZh: escapeHtml(p.meetingTitleZh),
    meetingTitleEn: escapeHtml(p.meetingTitleEn),
    propertyNameZh: escapeHtml(p.propertyNameZh),
    propertyNameEn: escapeHtml(p.propertyNameEn),
    votingDeadlineZh: escapeHtml(p.votingDeadlineZh),
    votingDeadlineEn: escapeHtml(p.votingDeadlineEn),
    logoUrl: escapeHtml(p.logoUrl),
    inviteLink: p.inviteLink,
    signInUrl: p.signInUrl,
  };

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>投票已开放 / Voting Is Now Open</title>
</head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f9fc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 12px rgba(0,0,0,0.04);">
          <tr>
            <td style="background:#35C3D6;padding:16px 20px;text-align:center;">
              <div style="margin-bottom:12px;">
                <img src="${safe.logoUrl}" alt="ClearStrata" style="height:48px;object-fit:contain;display:block;margin:0 auto;" />
              </div>
              <div style="font-size:22px;font-weight:600;color:#ffffff;">
                投票已开放 / Voting Is Now Open
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.65;">尊敬的 ${safe.recipientNameZh}：</p>
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65;">Dear ${safe.recipientNameEn},</p>
              <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.65;">本次会议的候选人名单及投票资格名单已确认并冻结。正式投票现已开放。</p>
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65;">The candidate list and voter roll for this meeting have been finalized. Voting is now open.</p>
              <table role="presentation" width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 22px;margin-bottom:20px;">
                <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">会议 / Meeting</p>
                  <p style="margin:0;color:#111827;font-size:15px;">${safe.meetingTitleZh}</p>
                  <p style="margin:0;color:#374151;font-size:14px;">${safe.meetingTitleEn}</p>
                </td></tr>
                <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">物业 / Property</p>
                  <p style="margin:0;color:#111827;font-size:15px;">${safe.propertyNameZh}</p>
                  <p style="margin:0;color:#374151;font-size:14px;">${safe.propertyNameEn}</p>
                </td></tr>
                <tr><td style="padding:8px 0;">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">投票截止 / Voting deadline</p>
                  <p style="margin:0;color:#111827;font-size:15px;">${safe.votingDeadlineZh}</p>
                  <p style="margin:0;color:#374151;font-size:14px;">${safe.votingDeadlineEn}</p>
                </td></tr>
              </table>
              <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.65;">请点击下方按钮进入 ClearStrata 会议投票页面，查看议案及候选人资料，并在截止时间前完成表决。投票截止后，系统将自动统计结果并归档。感谢您的参与。</p>
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65;">Please click the button below to enter the ClearStrata meeting voting page, review the resolutions and candidates, and cast your vote before the deadline. After voting closes, results will be automatically counted and archived. Thank you for your participation.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;">
                <tr>
                  <td align="center" style="padding:0 0 12px;">
                    <a href="${safe.inviteLink}" style="display:inline-block;background:#35C3D6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;">进入会议投票 / Enter Meeting Voting</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
                如果按钮无法打开，请复制以下链接：<br />
                If the button does not open, copy this link:<br />
                <a href="${safe.inviteLink}" style="color:#35C3D6;word-break:break-all;">${safe.inviteLink}</a>
              </p>
              <p style="margin:16px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
                仅登录：<a href="${safe.signInUrl}" style="color:#35C3D6;word-break:break-all;">${safe.signInUrl}</a><br />
                Sign in only: <a href="${safe.signInUrl}" style="color:#35C3D6;word-break:break-all;">${safe.signInUrl}</a>
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
