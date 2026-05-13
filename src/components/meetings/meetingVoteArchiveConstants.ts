/**
 * Phase 1: static 「00 使用说明」copy (frontend only; no persistence).
 */

export const MEETING_VOTE_ARCHIVE_CARD_CLASSIFICATION_NOTE = {
  zh: '会后将按 AGM / SGM / Minutes 分类归档至「法律法规」。',
  en: 'After the meeting, records are filed under AGM, SGM, or Minutes within Legal & regulatory governance.',
} as const;

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
    '法律法规项下「会议档案」长期分类（AGM / SGM / Minutes）',
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
      body:
        '会议材料在法律法规侧归入「会议档案」，并按下级分类 AGM、SGM、Minutes 留存；全体业主可依权限查阅。',
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
    '法律档案归档（法律法规 → 会议档案 → AGM / SGM / Minutes）',
  ],
  legalArchiveTitle: '法律法规侧归档分类（产品口径）：',
  legalArchiveTree:
    '法律法规\n' +
    '└── 会议档案\n' +
    '    ├── AGM：年度大会完整档案\n' +
    '    ├── SGM：特别大会完整档案（含理事会召集与业主联署发起）\n' +
    '    └── Minutes：普通会议纪要、理事会会议纪要及其它非 AGM、SGM 的会议记录',
  legalArchiveRouting:
    '会议结束后：AGM 归入 AGM；SGM 归入 SGM（含理事会发起或业主联署发起的特别大会）；其它会议纪要归入 Minutes。下列 00–06 为单次会议内整理目录，与实际入卷分列，便于物业与律师校对。',
  dirTitle: '本会议内固定目录（00–06）：',
  dirIntro: '以下为当前会议工作台固定目录，与「法律法规 → 会议档案 → AGM / SGM / Minutes」的长期分类相互配合。',
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

/** 02 支持文件 — 读取 meeting_documents（无则展示空态） */
export const MEETING_VOTE_ARCHIVE_SUPPORTING_DOCUMENTS = {
  row02: { id: '02', zh: '支持文件', en: 'Supporting documents' },
  emptyStatus: { zh: '暂无支持文件', en: 'No supporting documents' },
  attached: (n: number, zh: boolean) =>
    zh ? `已附文件 · ${n} 个` : `Attached · ${n} file${n === 1 ? '' : 's'}`,
  zh: {
    modalTitle: '支持文件',
    listHeading: '文件列表',
    colName: '文件名',
    colType: '类型',
    openLink: '打开 / 下载',
  },
  en: {
    modalTitle: 'Supporting documents',
    listHeading: 'Files',
    colName: 'Name',
    colType: 'Type',
    openLink: 'Open / download',
  },
} as const;

/** 01 正式会议通知 — 自动草案预览（仅前端展示，不入库） */
export const MEETING_VOTE_ARCHIVE_FORMAL_NOTICE = {
  placeholderRows: [
    { id: '03', zh: '讨论记录', en: 'Discussion archive' },
    { id: '04', zh: '投票记录', en: 'Voting record' },
    { id: '05', zh: '决议结果', en: 'Resolution report' },
    { id: '06', zh: '会议纪要', en: 'Minutes' },
  ] as const,
  row01: { id: '01', zh: '正式会议通知', en: 'Formal notice' },
  status: {
    zh: '已生成 · 自动草案',
    en: 'Generated · Auto draft',
  },
  notSet: { zh: '暂未设置', en: 'Not set' },
  zh: {
    modalTitle: '正式会议通知',
    docTitle: '正式会议通知',
    intro: '本通知用于告知全体业主本次远程书面会议及电子投票事项。',
    meetingName: '会议名称：',
    meetingType: '会议类型：',
    meetingFormat: '会议形式：',
    meetingDate: '会议日期：',
    publicNotice: '公示 / 讨论期：',
    votingPeriod: '投票期：',
    description: '会议说明：',
    topics: '议题与决议：',
    resolutionCount: '决议数',
    electionCount: '选举数',
    participation: '业主参与方式：',
    participationBody:
      '业主可通过 ClearStrata 平台查看资料、参与讨论，并在投票开启后进行电子投票。',
  },
  en: {
    modalTitle: 'Formal Notice',
    docTitle: 'Formal Notice',
    intro: 'This notice informs all owners of this remote written meeting and electronic voting.',
    meetingName: 'Meeting name:',
    meetingType: 'Meeting type:',
    meetingFormat: 'Meeting format:',
    meetingDate: 'Meeting date:',
    publicNotice: 'Public notice / discussion period:',
    votingPeriod: 'Voting period:',
    description: 'Meeting description:',
    topics: 'Agenda & resolutions:',
    resolutionCount: 'Formal resolutions',
    electionCount: 'Election items',
    participation: 'How owners participate:',
    participationBody:
      'Owners may review materials and participate in discussion on the ClearStrata platform, and cast electronic votes once voting opens.',
  },
} as const;
