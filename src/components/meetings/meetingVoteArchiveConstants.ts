/**
 * Phase 1: static 「00 使用说明」copy (frontend only; no persistence).
 */

export const MEETING_VOTE_ARCHIVE_GUIDE_ZH = {
  title: 'ClearStrata 远程书面会议与电子投票使用说明',
  subtitle: '适用于 BC Strata 社区治理流程（律师审核版草案）',
  intro: 'ClearStrata 旨在帮助全球分散业主更便捷、更透明地参与物业治理。',
  platformSupportsLabel: '本平台支持：',
  bullets: [
    '年度业主大会（AGM）',
    '特别业主大会（SGM）',
    '业主发起特别大会（Owner Requisitioned SGM）',
    '理事会治理流程（Council Governance）',
    '电子投票（Electronic Voting）',
    '会议纪要归档（Minutes Archiving）',
    '法律治理文件长期保存（Legal Governance Archive）',
  ],
  governanceTitle: '治理原则：',
  principles: [
    {
      num: '1',
      heading: '全体业主参与',
      body:
        '所有已完成平台注册的业主，均可直接参与治理流程。\n业主可通过手机、平板或电脑参与。\n传统纸质代理授权不作为常规参与方式。',
    },
    {
      num: '2',
      heading: '透明治理',
      body:
        '所有会议流程均留痕，包括正式通知、讨论记录、支持文件、投票记录、决议结果和会议纪要。',
    },
    {
      num: '3',
      heading: '长期归档',
      body: '所有会议文件将长期保存。\n所有业主均可查阅历史治理档案。',
    },
  ],
  flowTitle: '标准会议流程：',
  flowSteps: [
    '正式会议通知',
    '公示与讨论期',
    '冻结投票资格名单',
    '电子投票',
    '正式结果确认',
    '会议纪要',
    '法律档案归档',
  ],
  dirTitle: '会议档案目录：',
  dirLines: [
    '00 使用说明 / Guide',
    '01 正式会议通知 / Formal Notice',
    '02 支持文件 / Supporting Documents',
    '03 讨论记录 / Discussion Archive',
    '04 投票记录 / Voting Record',
    '05 决议结果 / Resolution Report',
    '06 会议纪要 / Minutes',
  ],
  pledgeTitle: 'ClearStrata 承诺：',
  pledges: ['让每一位业主参与治理。', '让每一次决议公开透明。', '让每一份治理文件长期可查。'],
} as const;
