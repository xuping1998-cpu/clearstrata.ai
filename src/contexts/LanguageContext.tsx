import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Language = 'en' | 'zh';

export const LANGUAGE_STORAGE_KEY = 'clearstrata-language';
export const LANGUAGE_USER_STORAGE_KEY = 'clearstrata-language-user-id';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<string, Record<Language, string>> = {
  app_name: { en: 'ClearStrata', zh: '清涟' },

  roles: { en: 'Roles', zh: '角色' },
  owner: { en: 'Owner', zh: '业主' },
  council: { en: 'Council Member', zh: '业委会成员' },
  manager: { en: 'Property Manager', zh: '物业经理' },
  admin: { en: 'System Administrator', zh: '系统管理员' },

  auth_login: { en: 'Login', zh: '登录' },
  auth_signup: { en: 'Sign Up', zh: '注册' },
  auth_logout: { en: 'Logout', zh: '退出' },
  auth_email: { en: 'Email', zh: '邮箱' },
  auth_password: { en: 'Password', zh: '密码' },
  auth_password_placeholder: { en: 'Enter your password', zh: '请输入密码' },
  auth_full_name_en: { en: 'Full Name (English)', zh: '姓名（英文）' },
  auth_full_name_zh: { en: 'Full Name (Chinese)', zh: '姓名（中文）' },
  auth_select_role: { en: 'Select Role', zh: '选择角色' },
  auth_no_account: { en: "Don't have an account?", zh: '还没有账号？' },
  auth_have_account: { en: 'Already have an account?', zh: '已有账号？' },
  auth_forgot_password: { en: 'Forgot password?', zh: '忘记密码？' },
  auth_send_reset_email: { en: 'Send reset email', zh: '发送重置邮件' },
  auth_back_to_login: { en: 'Back to sign in', zh: '返回登录' },
  auth_reset_email_sent: { en: 'Check your inbox for the reset link.', zh: '重置邮件已发送，请查收邮箱' },
  auth_enter_email_required: { en: 'Please enter the email you registered with.', zh: '请输入注册邮箱' },
  auth_password_updated_banner: {
    en: 'Your password has been updated. Please sign in with your new password.',
    zh: '密码已更新，请使用新密码登录',
  },
  auth_password_reset_login_banner: {
    en: 'Your password has been reset. Please sign in again.',
    zh: '密码已重置，请重新登录。',
  },
  auth_slogan: {
    en: 'Strata management, simplified',
    zh: '物业管理，更透明',
  },

  nav_dashboard: { en: 'Dashboard', zh: '首页' },
  nav_pricing: { en: 'Pricing', zh: '定价' },
  nav_contact: { en: 'Contact', zh: '联系' },
  nav_procurement: { en: 'Procurement Inquiry', zh: '采购询价' },
  nav_voting: { en: 'Meetings & Voting', zh: '会议投票' },
  nav_maintenance: { en: 'Maintenance', zh: '维修申请' },
  nav_finance: { en: 'Invoice Review', zh: '发票审核' },
  nav_owner_info: { en: 'Owner Information', zh: '业主信息' },
  nav_review_applications: { en: 'Join requests', zh: '加入申请审核' },
  nav_communication: { en: 'Dispute Resolution', zh: '纠纷调解' },
  nav_disputes: { en: 'Property manager', zh: '物业经理' },
  nav_hiring: { en: 'Property Manager', zh: '物业经理' },
  nav_compliance: { en: 'Compliance & Insurance', zh: '法规保险' },
  nav_group_core: { en: 'Core', zh: '核心业务' },
  nav_group_primary: { en: 'Main', zh: '主导航' },
  nav_group_system: { en: 'System', zh: '系统管理' },
  nav_group_help: { en: 'Help', zh: '帮助中心' },
  nav_help_compliance: { en: 'Laws & regulations', zh: '法律法规' },
  nav_invite_codes: { en: 'Invite codes', zh: '邀请码管理' },
  nav_join_requests: { en: 'Join requests', zh: '加入申请审核' },
  nav_property_admin_sidebar: { en: 'Property settings', zh: '物业设置' },
  nav_people_management: { en: 'People management', zh: '人员管理' },
  nav_property_settings: { en: 'Property settings', zh: '物业设置' },
  nav_audit_log: { en: 'Audit log', zh: '审计日志' },
  nav_meetings_records: { en: 'Meetings & Voting', zh: '会议投票' },

  meetings_page_subtitle: {
    en: 'Remote written meetings support online discussion, agenda voting, and archived results for transparent governance.',
    zh: '远程书面会议支持在线讨论、议程表决与结果归档，保障公开透明。',
  },
  nav_owner_voting: { en: 'Owner Voting', zh: '业主电子表决' },
  meeting_ov_staff_intro: {
    en: 'Create formal resolutions for this AGM/SGM, freeze the eligible-owner list, and tally results using one vote per unit.',
    zh: '为本次 SGM / AGM 创建正式决议、冻结业主资格名单，并按一户一票统计结果。',
  },
  meeting_ov_owner_notice: {
    en: 'This meeting supports electronic voting. Please vote within the voting period.',
    zh: '本次会议支持电子表决。请在规定时间内完成投票。',
  },
  meeting_ov_owner_not_open: {
    en: 'Electronic voting is not yet enabled for this meeting.',
    zh: '本次会议尚未开放电子表决。',
  },
  meeting_ov_go_vote: { en: 'Go vote', zh: '去投票' },
  meeting_ov_enable: { en: 'Enable meeting voting', zh: '启用会议投票' },
  meeting_ov_enabled_toast: { en: 'Electronic voting enabled', zh: '电子表决已启用' },
  meeting_ov_not_enabled: { en: 'Not enabled', zh: '未启用' },
  meeting_ov_freeze: { en: 'Freeze voter list', zh: '冻结名单' },
  meeting_ov_open: { en: 'Open voting', zh: '打开投票' },
  meeting_ov_close: { en: 'Close voting', zh: '关闭投票' },
  meeting_ov_frozen: { en: 'Frozen', zh: '已冻结' },
  meeting_ov_not_frozen: { en: 'Not frozen', zh: '未冻结' },
  meeting_ov_eligible_units: { en: 'Eligible units', zh: '有资格投票户数' },
  meeting_ov_resolution_count: { en: 'Resolutions', zh: '决议数' },
  meeting_ov_need_resolution_and_snapshot: {
    en:
      'Please add at least one voting resolution agenda or council election agenda, then freeze the voter list before opening voting.',
    zh: '请先添加至少一条「表决议程」或「选举议程」，并冻结投票资格名单后再打开表决。',
  },
  meeting_ov_freeze_confirm_open: {
    en:
      'Voting is already open. Re-freezing the list may affect eligibility snapshots. Continue?',
    zh: '投票已经打开，重新冻结名单可能影响资格快照。确定继续吗？',
  },
  meeting_ov_discussion_opens: { en: 'Public notice opens', zh: '公示开放时间' },
  meeting_ov_discussion_closes: { en: 'Public notice closes', zh: '公示截止时间' },
  meeting_ov_meeting_format_row: { en: 'Meeting format', zh: '会议形式' },
  meeting_ov_loading: { en: 'Loading owner voting…', zh: '正在加载业主表决…' },
  meeting_ov_status_label: { en: 'Status', zh: '状态' },
  meeting_ov_vote_opens: { en: 'Voting opens', zh: '投票开放' },
  meeting_ov_vote_closes: { en: 'Voting closes', zh: '投票截止' },
  meeting_ov_snapshot_frozen: { en: 'Snapshot frozen', zh: '冻结名单时间' },
  meeting_ov_eligible_count: { en: 'Eligible voters', zh: '应投户数' },
  meeting_ov_freeze_toast: { en: 'Eligibility list frozen', zh: '投票资格名单已冻结' },
  meeting_ov_need_res_and_freeze: {
    en: 'Add resolutions and freeze the eligibility list first.',
    zh: '请先添加决议并冻结投票资格名单。',
  },
  meeting_ov_open_block_freeze_snap: {
    en: 'Freeze the voting eligibility list before opening.',
    zh: '请先冻结投票资格名单。',
  },
  meeting_ov_open_block_no_eligible: {
    en: 'There are no eligible voting units; voting cannot be opened.',
    zh: '当前没有合资格投票户，不能打开投票。',
  },
  meeting_ov_open_block_no_agenda: {
    en: 'Add at least one resolution agenda or council election agenda first.',
    zh: '请先添加至少一条表决议程或选举议程。',
  },
  meeting_ov_open_block_too_early: {
    en: 'The voting period has not opened yet; you cannot open early.',
    zh: '投票尚未到开放时间，不能提前打开。',
  },
  meeting_ov_open_block_past_close: {
    en: 'The voting deadline has passed; voting cannot be opened.',
    zh: '投票截止时间已过，不能打开投票。',
  },
  meeting_owner_vote_nav_status_not_open: {
    en: 'Owner electronic voting for this meeting is not open yet.',
    zh: '本次会议业主表决尚未开放。',
  },
  meeting_owner_vote_nav_no_meeting: {
    en: 'Owner voting is not set up for this meeting yet.',
    zh: '本次会议尚未启用业主表决。',
  },
  meeting_ov_flow_hint_freeze_snap: {
    en: 'Please freeze the voting eligibility list.',
    zh: '请先冻结投票资格名单。',
  },
  meeting_ov_open_voting: { en: 'Open voting', zh: '打开投票' },
  meeting_ov_close_voting: { en: 'Close voting', zh: '关闭投票' },
  meeting_ov_res_title_placeholder: { en: 'Resolution title', zh: '决议标题' },
  meeting_ov_res_desc_placeholder: { en: 'Resolution description', zh: '决议说明' },
  meeting_ov_res_display_order: { en: 'Display order', zh: '显示顺序' },
  meeting_ov_add_resolution: { en: 'Add resolution', zh: '添加决议' },
  meeting_ov_resolution_added: { en: 'Resolution added', zh: '决议已添加' },
  meeting_ov_yes: { en: 'Yes', zh: '赞成' },
  meeting_ov_no: { en: 'No', zh: '反对' },
  meeting_ov_abstain: { en: 'Abstain', zh: '弃权' },
  meeting_ov_passed: { en: 'Passed', zh: '已通过' },
  meeting_ov_failed: { en: 'Did not meet threshold / pending', zh: '未通过 / 尚未通过' },
  meeting_ov_turnout: { en: 'Turnout', zh: '参与率' },
  meeting_ov_outcome_pending: { en: 'Outcome not determined yet', zh: '结果待定' },

  meeting_ev_status_title: { en: 'Meeting voting workflow', zh: '会议投票流程' },
  meeting_ev_enable: { en: 'Enable meeting voting', zh: '启用会议投票' },
  meeting_ev_freeze_list: { en: 'Freeze voter list', zh: '冻结名单' },
  meeting_ev_open: { en: 'Open voting', zh: '打开投票' },
  meeting_ev_close: { en: 'Close voting', zh: '关闭投票' },
  meeting_ev_eligible_units: { en: 'Eligible units', zh: '有资格投票户数' },
  meeting_ev_resolutions: { en: 'Resolutions', zh: '决议数' },
  meeting_ev_not_frozen: { en: 'Not frozen', zh: '未冻结' },
  meeting_ev_frozen: { en: 'Frozen', zh: '已冻结' },
  meeting_ev_go_vote: { en: 'Go vote', zh: '去投票' },
  meeting_ev_not_enabled_owner: {
    en: 'Electronic voting is not enabled for this meeting yet.',
    zh: '本次会议尚未开放电子表决。',
  },
  meeting_ev_enabled_toast: { en: 'Electronic voting enabled', zh: '电子表决已启用' },
  meeting_ev_freeze_toast: {
    en: 'Voter eligibility list has been frozen',
    zh: '投票资格名单已冻结',
  },
  meeting_ev_open_toast: { en: 'Voting is now open', zh: '投票已打开' },
  meeting_ev_close_toast: { en: 'Voting has been closed', zh: '投票已关闭' },
  meeting_ev_open_prereq: {
    en:
      'Please add vote-required or election agenda items, then freeze the voter eligibility list first.',
    zh: '请先添加「表决议程」或「选举议程」，并冻结投票资格名单。',
  },
  meeting_ev_freeze_confirm_open: {
    en:
      'Voting is already open. Re-freezing the list may affect eligibility snapshots. Continue?',
    zh: '投票已经打开，重新冻结名单可能影响资格快照。确定继续吗？',
  },
  meeting_ev_voting_opens_label: { en: 'Voting opens at', zh: '投票开放时间' },
  meeting_ev_voting_closes_label: { en: 'Voting closes at', zh: '投票截止时间' },
  meeting_ev_status_draft: { en: 'Draft', zh: '草稿' },
  meeting_ev_status_open: { en: 'Voting in progress', zh: '投票中' },
  meeting_ev_status_closed: { en: 'Closed', zh: '已关闭' },
  meeting_ev_status_archived: { en: 'Archived', zh: '已归档' },
  meeting_ev_snapshot_label: { en: 'Voter list frozen', zh: '冻结投票名单' },

  meeting_ov_public_notice_period_label: { en: 'Public Notice Period', zh: '公示期' },

  meeting_ov_discussion_period_label: { en: 'Public Notice Period', zh: '公示期' },
  meeting_ov_voting_period_combined_label: { en: 'Voting period', zh: '投票期' },
  meeting_format_written_remote_display: {
    en: 'Remote Written Meeting',
    zh: '远程书面会议',
  },
  meeting_flow_nomination_period_label: { en: 'Nomination period', zh: '提名期' },

  meeting_nomination_status_not_started: { en: 'Nominations not started', zh: '提名未开始' },
  meeting_nomination_status_open: { en: 'Nominations open', zh: '提名开放中' },
  meeting_nomination_status_closed: { en: 'Nominations closed', zh: '提名已截止' },
  meeting_flow_summary_heading_plain: { en: 'Resolutions & eligible households', zh: '决议数、合资格户数' },
  meeting_flow_summary_heading_full: {
    en: 'Resolutions, candidates & eligible households',
    zh: '决议数、候选人数、合资格户数',
  },
  meeting_flow_summary_line_plain: {
    en: 'Resolutions (formal): {res} · Eligible households: {elig}',
    zh: '决议数 {res} · 合资格户数 {elig}',
  },
  meeting_flow_summary_line_full: {
    en: 'Resolutions (formal): {res} · Candidates: {cand} · Eligible households: {elig}',
    zh: '决议数 {res} · 候选人数 {cand} · 合资格户数 {elig}',
  },

  meeting_list_flow_summary_discussion: { en: 'Public Notice Period', zh: '公示期' },
  meeting_list_flow_summary_public_notice: { en: 'Public Notice Period', zh: '公示期' },
  meeting_list_flow_summary_nomination: { en: 'Nomination period', zh: '提名期' },
  meeting_list_flow_summary_voting_period: { en: 'Voting period', zh: '投票期' },
  meeting_list_flow_summary_counts: {
    en: 'Resolutions {r} · Elections {e}',
    zh: '决议 {r} · 选举 {e}',
  },
  meeting_agenda_generate_formal_vote: { en: 'Generate formal ballot', zh: '生成正式表决' },
  meeting_agenda_formal_vote_created: { en: 'Formal ballot created', zh: '正式表决已创建' },
  meeting_vote_send_meeting_vote_invites: {
    en: 'Send meeting voting invitations',
    zh: '发送会议投票邀请',
  },
  meeting_vote_waiting_tallies_open: {
    en: 'Meeting voting is enabled; results appear after owners cast ballots.',
    zh: '已启用会议投票，等待业主投票后显示结果。',
  },

  meeting_resolution_results_title: { en: 'Resolution Results', zh: '决议结果' },
  meeting_initiation_type: { en: 'Meeting initiation', zh: '会议发起方式' },
  meeting_initiation_council: { en: 'Council initiated', zh: '业委会发起' },
  meeting_initiation_owner_requisitioned: { en: 'Owner requisitioned', zh: '业主联名要求召开' },
  meeting_initiation_annual_required: { en: 'Annual required', zh: '年度法定会议' },
  meeting_total_voting_units: { en: 'Total voting units', zh: '总投票权数' },
  meeting_required_percent: { en: 'Required threshold', zh: '法定门槛' },
  meeting_required_units: { en: 'Required signed units', zh: '所需联名户数' },
  meeting_signed_units: { en: 'Signed units', zh: '已联名户数' },
  meeting_requisition_met: { en: 'SGM threshold met', zh: '已达到召开 SGM 门槛' },
  meeting_requisition_not_met: { en: 'SGM threshold not met', zh: '尚未达到召开 SGM 门槛' },
  meeting_resolution_refresh_results: { en: 'Refresh tallies', zh: '刷新结果' },
  meeting_agenda_edit: { en: 'Edit item', zh: '编辑' },
  meeting_agenda_save: { en: 'Save', zh: '保存' },
  meeting_agenda_cancel: { en: 'Cancel', zh: '取消' },
  meeting_agenda_cannot_remove_vote_has_ballots: {
    en: 'Formal voting has recorded ballots for this item; you cannot disable “vote required”. Close voting and archive separately if needed.',
    zh: '已创建正式表决决议且已有投票记录，不能直接取消表决；请先关闭投票后另行处理或归档。',
  },
  meeting_resolution_threshold: { en: 'Threshold', zh: '表决门槛' },
  meeting_res_threshold_value_majority: { en: 'Majority', zh: '普通多数' },
  meeting_res_threshold_value_three_quarter: { en: '3/4 vote', zh: '3/4 票' },
  meeting_res_threshold_value_unanimous: { en: 'Unanimous', zh: '全票通过' },
  meeting_vote_yes: { en: 'Yes', zh: '赞成' },
  meeting_vote_no: { en: 'No', zh: '反对' },
  meeting_vote_abstain: { en: 'Abstain', zh: '弃权' },
  meeting_vote_cast: { en: 'Cast', zh: '已投' },
  meeting_vote_eligible: { en: 'Eligible', zh: '应投' },
  meeting_vote_participation: { en: 'Participation', zh: '参与率' },
  meeting_vote_passed: { en: 'Passed', zh: '已通过' },
  meeting_vote_failed: { en: 'Failed', zh: '未通过' },
  meeting_vote_pending: { en: 'Not yet passed', zh: '尚未通过' },
  meeting_vote_temporarily_passed: {
    en: 'Currently passing',
    zh: '暂时达到通过条件',
  },
  meeting_vote_not_started: { en: 'Not started', zh: '尚未开始' },
  meeting_vote_not_enabled: {
    en:
      'Meeting voting has not been enabled yet. Enable meeting voting above, then generate formal ballots for agendas that require a vote.',
    zh:
      '本次会议尚未启用会议投票。请先在上方启用会议投票，并为需要表决的议程生成正式表决。',
  },
  meeting_vote_no_resolutions: {
    en:
      'Formal resolutions are not configured yet after enabling meeting voting. Add voting or election agendas, create formal ballots, then open voting.',
    zh:
      '已启用会议投票，尚未配置可用的正式表决项。请确认已添加表决/选举议程、生成正式表决并打开投票。',
  },
  meeting_agenda_type: { en: 'Agenda type', zh: '议程类型' },
  meeting_agenda_type_normal: { en: 'Agenda item', zh: '普通议程' },
  meeting_agenda_type_resolution: { en: 'Voting resolution', zh: '表决议程' },
  meeting_agenda_type_election: { en: 'Election', zh: '选举议程' },
  meeting_election_title: { en: 'Council election', zh: '业委会选举' },
  meeting_election_seats: { en: 'Seats', zh: '应选席位数' },
  meeting_election_max_choices: { en: 'Max choices per unit', zh: '每户最多可选人数' },
  meeting_election_allow_self_nomination: { en: 'Allow self-nomination', zh: '允许自荐' },
  meeting_election_candidates: { en: 'Candidates', zh: '候选人' },
  meeting_election_add_candidate: { en: 'Add candidate', zh: '添加候选人' },
  meeting_election_candidate_name: { en: 'Candidate name', zh: '候选人姓名' },
  meeting_election_candidate_unit: { en: 'Unit', zh: '房号' },
  meeting_election_candidate_statement: { en: 'Statement', zh: '竞选说明' },
  meeting_election_nominated_by: { en: 'Nominated by', zh: '提名人' },
  meeting_election_accepted: { en: 'Accepted nomination', zh: '已接受提名' },
  meeting_election_submit_ballot: { en: 'Submit ballot', zh: '提交选票' },
  meeting_election_selected_too_many: {
    en: 'Too many candidates selected',
    zh: '选择人数超过上限',
  },
  meeting_election_tentative_winner: { en: 'Tentative winner', zh: '暂定当选' },
  meeting_election_winner: { en: 'Elected', zh: '当选' },
  meeting_election_nomination: { en: 'Candidate nomination', zh: '候选人提名' },
  meeting_election_nomination_opens: { en: 'Nomination opens', zh: '提名开放时间' },
  meeting_election_nomination_closes: { en: 'Nomination closes', zh: '提名截止时间' },
  meeting_election_nomination_open: { en: 'Nomination open', zh: '提名开放中' },
  meeting_election_nomination_ended_label: {
    en: 'Nomination period has ended',
    zh: '提名已结束',
  },
  meeting_election_nomination_closed: { en: 'Nomination closed', zh: '提名已截止' },
  meeting_election_self_nominate: { en: 'Nominate myself', zh: '我要报名参选' },
  meeting_election_self_nomination_closed: {
    en: 'Nomination period has closed',
    zh: '提名期已截止',
  },
  meeting_election_vote_after_nomination: {
    en: 'Formal voting will open after the nomination period closes.',
    zh: '提名期尚未截止，正式投票将在提名截止后开放。',
  },
  meeting_election_duplicate_candidate: {
    en: 'This unit already has a candidate',
    zh: '该房号已报名候选人',
  },
  meeting_election_rules_locked: {
    en: 'Election rules cannot be changed after ballots are cast',
    zh: '已有选票后不能修改选举规则',
  },
  meeting_election_invalid_timeline: {
    en:
      'This election schedule no longer matches the required automatic phases (public notice, nomination, and voting are each seven days from the meeting start). Please ask an administrator to fix meeting time and synced fields.',
    zh: '该选举时间安排与系统自动阶段不一致（公示、提名、投票各 7 天，自会议召开时间起）。请管理员修正会议时间及相关同步字段。',
  },
  meeting_election_time_overlap_admin_warn: {
    en: 'Meeting schedule is misconfigured (voting must start strictly after nominations close). Please ask an administrator to fix the times.',
    zh: '当前会议时间配置错误，请管理员修正',
  },
  meeting_election_staff_nomination_before_open: {
    en: 'Nomination has not opened yet. Adding and editing candidates is disabled until nomination opens.',
    zh: '提名尚未开放：在提名开放时间之前不能添加、编辑或删除候选人。',
  },
  meeting_election_staff_nomination_closed_readonly: {
    en: 'Nomination has closed. The candidate list is read-only.',
    zh: '提名已结束：候选人列表为只读，无法添加、编辑或删除。',
  },
  meeting_election_nomination_not_open_owner: {
    en: 'Nomination has not opened yet.',
    zh: '提名尚未开放。',
  },
  meeting_election_persist_nomination_not_open: {
    en: 'Cannot save: nomination is not open yet.',
    zh: '无法保存：提名尚未开放。',
  },
  meeting_election_persist_nomination_closed: {
    en: 'Cannot save: nomination has closed.',
    zh: '无法保存：提名已结束。',
  },
  meeting_agenda_cannot_remove_election_has_ballots: {
    en: 'Election ballots exist for this item; convert back only after resetting ballots (requires admin/backend).',
    zh: '该选举议程已有业主选票记录，无法再改回其它议程类型。',
  },
  meeting_agenda_cannot_make_election_resolution_has_ballots: {
    en: 'This item already has formal resolution ballots; convert to election is blocked.',
    zh: '该议程已有业主大会正式表决选票，无法再改为选举议程。',
  },

  meeting_format_in_person: { en: 'In-person', zh: '线下会议' },
  meeting_format_live_remote: { en: 'Live Remote', zh: '实时远程会议' },
  meeting_format_hybrid: { en: 'Remote Written Meeting', zh: '远程书面会议' },
  meeting_format_written_remote: { en: 'Remote Written Meeting', zh: '远程书面会议' },
  /** MeetingEditor dropdown — two user-visible buckets; values unchanged. */
  meeting_format_editor_option_hybrid: { en: 'Hybrid Meeting', zh: '混合会议' },
  meeting_format_editor_option_written_remote: {
    en: 'Remote Written Meeting (Recommended)',
    zh: '远程书面会议（推荐）',
  },
  meeting_format_editor_legend_written: {
    en: 'Remote Written Meeting (Recommended): the most transparent option and best suited for owners participating asynchronously from anywhere in the world.',
    zh: '远程书面会议（推荐）：最透明，最适合全球业主异步参与。',
  },
  meeting_format_editor_legend_hybrid: {
    en: 'Hybrid Meeting: attend at a fixed time, in person, by Zoom, or both.',
    zh: '混合会议：固定时间参加（现场或 Zoom，或并行）。',
  },

  meeting_time_local: { en: 'Meeting time', zh: '会议时间（本地）' },
  discussion_opens: { en: 'Public notice opens', zh: '公示开放时间' },
  discussion_closes: { en: 'Public notice closes', zh: '公示截止时间' },
  public_notice_opens: { en: 'Public notice opens', zh: '公示开放时间' },
  voting_opens: { en: 'Voting opens', zh: '投票开放时间' },
  voting_closes: { en: 'Voting closes', zh: '投票截止时间' },

  meeting_status_draft: { en: 'Draft', zh: '草稿' },
  meeting_status_active: { en: 'Active', zh: '进行中' },
  meeting_status_closed: { en: 'Closed', zh: '已结束' },
  meeting_status_archived: { en: 'Archived', zh: '已归档' },
  meeting_status_draft_label: { en: 'Draft', zh: '草稿' },
  meeting_status_active_label: { en: 'Active', zh: '进行中' },
  meeting_status_closed_label: { en: 'Closed', zh: '已结束' },
  meeting_status_archived_label: { en: 'Archived', zh: '已归档' },

  vote_not_enabled: { en: 'Not enabled', zh: '未启用' },
  vote_draft: { en: 'Not open yet', zh: '未开启' },
  vote_open: { en: 'Voting open', zh: '投票中' },
  vote_closed: { en: 'Voting closed', zh: '已关闭' },
  vote_archived: { en: 'Archived', zh: '已归档' },

  meeting_written_remote_intro: {
    en:
      'The schedule is automatic from the meeting start: 7-day public notice, 7-day nominations, then 7 days of voting. Owners can review materials and cast votes in the voting window.',
    zh:
      '时间表由「会议召开时间」自动生成：公示 7 天、提名 7 天、投票 7 天。业主可于公示期内查阅资料，并于投票期内完成表决。',
  },
  meeting_written_remote_auto_phases_hint: {
    en: 'Three fixed phases apply: Public Notice Period (7 days) → Nomination Period (7 days) → Voting Period (7 days), each starting immediately after the previous phase ends.',
    zh: '系统固定为三阶段衔接：公示期（7天）→ 提名期（7天）→ 投票期（7天）；每阶段自上一阶段结束时刻起算。',
  },
  meeting_election_phase_public_notice: { en: 'Public Notice Period', zh: '公示期' },
  meeting_election_phase_nomination: { en: 'Nomination period', zh: '提名期' },
  meeting_election_phase_voting: { en: 'Voting period', zh: '投票期' },
  meeting_election_auto_nomination_schedule_title: {
    en: 'Automatic nomination schedule (from meeting start)',
    zh: '提名时间（由会议召开时间自动生成）',
  },
  meeting_election_need_valid_scheduled: {
    en: 'Set a valid meeting start time.',
    zh: '请先设置有效的会议召开时间。',
  },
  meeting_editor_schedule_guard_note: {
    en:
      'When moving beyond draft or sending notices, the system validates required fields (including agenda when applicable).',
    zh: '从草稿进入其他会议状态或发送通知时，系统将校验必填项（含议程等，视流程而定）。',
  },
  meeting_create_notice_ready_sync_missing: {
    en: 'Before sending notices, provide a title, meeting type, meeting format, meeting time, and at least one agenda item.',
    zh: '发送通知前需要标题、会议类型、会议形式、会议时间，并至少添加一条议程。',
  },
  meeting_create_notice_ready_written_missing: {
    en:
      'Written remote meetings need a meeting start time and at least one agenda item after saving. Voting windows are computed automatically.',
    zh: '远程书面会议需填写会议召开时间并在保存后至少添加一条议程；投票起止将由系统自动计算。',
  },
  meeting_create_save_then_agenda_hint: {
    en: 'After saving, add agenda items on the meeting detail page. At least one agenda item is required before sending notices.',
    zh: '保存会议后，请在会议详情中添加议程；发送通知前至少需要一条议程。',
  },

  meeting_status: { en: 'Meeting status', zh: '会议状态' },
  voting_status: { en: 'Voting status', zh: '投票状态' },

  current_property_not_loaded: {
    en: 'Current property context is not loaded',
    zh: '当前物业上下文未加载完成',
  },
  no_manageable_property: {
    en: 'You do not currently have a manageable property',
    zh: '你当前没有可管理的物业',
  },
  select_property: { en: 'Select property', zh: '选择物业' },
  loading_property_context: { en: 'Loading property context…', zh: '正在加载物业上下文…' },
  join_requests_empty_pending: {
    en: 'No pending join requests for this property.',
    zh: '本物业暂无待审核的加入申请。',
  },

  hero_badge: { en: 'ClearStrata.ai', zh: 'ClearStrata.ai' },
  hero_title_1: { en: 'Your community property fees,', zh: '你的小區物業費，' },
  hero_title_2a: { en: 'might cost you up to', zh: '可能多花了' },
  hero_lead: { en: 'Scan to see every expense', zh: '掃碼查看每一筆支出' },
  hero_subline: {
    en: 'Let every owner control spending, and let every expense be clean and transparent.',
    zh: '讓每一位業主掌控花費，讓每一筆支出乾淨透明',
  },
  hero_cta: { en: 'Scan to try now', zh: '立即掃碼體驗' },
  hero_cta_footer: {
    en: 'Free 3-month trial | No install | Easy at first glance',
    zh: '免費試用3個月 ｜ 無需安裝 ｜ 一看就會',
  },
  hero_qr_role1: { en: "Owners' oversight tool", zh: '业主的监督工具' },
  hero_qr_role2: { en: 'Transparent management for strata committees', zh: '业委会的透明管理助手' },
  hero_qr_role3: { en: "Property managers' work log", zh: '物业经理的工作日志' },

  join_invite_submit_btn: { en: 'Submit join request', zh: '提交加入申请' },
  join_invite_success_title: { en: 'Application submitted', zh: '申请已提交' },
  join_invite_success_detail: {
    en: 'Pending admin review. You will get access after approval.',
    zh: '申请已提交，等待审核。通过后您即可访问该物业。',
  },

  admin_review_residents_cta: { en: 'Open People management', zh: '打开「人员管理」' },
  admin_review_residents_hint: {
    en: 'Approve or reject pending accounts under System → People management.',
    zh: '请在「系统管理 → 人员管理」中批准或拒绝待激活账号。',
  },
  admin_pending_residents_banner: {
    en: '{n} pending account activations',
    zh: '有 {n} 个账号待激活',
  },

  user_mgmt_subtitle: {
    en: 'All registered accounts with activation status. Admins can activate sign-ups and assign roles.',
    zh: '全部注册账号及激活状态；管理员可在此审核激活并调整角色。',
  },
  user_mgmt_activation_none: { en: 'No resident record', zh: '无居住人登记' },
  user_mgmt_activation_pending: { en: 'Pending activation', zh: '待审核激活' },
  user_mgmt_activation_active: { en: 'Activated', zh: '已激活' },
  user_mgmt_activation_deregistered: { en: 'Deregistered', zh: '已注销' },
  user_mgmt_unit: { en: 'Unit', zh: '单元' },
  user_mgmt_approve: { en: 'Activate', zh: '批准激活' },
  user_mgmt_reject: { en: 'Reject', zh: '拒绝' },
  user_mgmt_col_activation: { en: 'Activation', zh: '激活状态' },
  user_mgmt_activate_success: { en: 'Account activated successfully.', zh: '已批准激活。' },
  user_mgmt_activate_fail: { en: 'Activation failed.', zh: '激活失败。' },
  user_mgmt_reject_success: { en: 'Registration rejected.', zh: '已拒绝该注册。' },
  user_mgmt_reject_fail: { en: 'Could not reject registration.', zh: '拒绝操作失败。' },
  user_mgmt_profile_partial: {
    en: 'Resident record was updated, but updating the profile failed.',
    zh: '居住人记录已更新，但用户资料未能同步更新。',
  },

  residents_tab_subtitle: {
    en: 'Residents by unit (activated records). Account activation is handled under People management.',
    zh: '按单元查看在册居住人档案；新账号激活请在「系统管理 → 人员管理」中处理。',
  },
  residents_summary_total: { en: 'Total records', zh: '档案总数' },
  residents_summary_active: { en: 'Active', zh: '在册活跃' },
  residents_summary_overdue: { en: 'Fee overdue', zh: '欠费' },

  procurement_title: { en: 'Procurement Inquiry', zh: '采购询价' },
  procurement_new_job: { en: 'New Job', zh: '新建任务' },
  procurement_job_title: { en: 'Job Title', zh: '任务标题' },
  procurement_description: { en: 'Description', zh: '描述' },
  procurement_budget: { en: 'Estimated Budget', zh: '预算' },
  procurement_status: { en: 'Status', zh: '状态' },
  procurement_quotes: { en: 'Quotes', zh: '报价' },
  procurement_add_quote: { en: 'Add Quote', zh: '添加报价' },
  procurement_vendor: { en: 'Vendor Name', zh: '供应商名称' },
  procurement_contact: { en: 'Contact', zh: '联系方式' },
  procurement_amount: { en: 'Quote Amount', zh: '报价金额' },
  procurement_approve: { en: 'Approve', zh: '批准' },
  procurement_public_notice: { en: 'Start Public Notice', zh: '开始公示' },

  vote_title: { en: 'Meetings & Voting Records', zh: '会议投票记录' },
  vote_new: { en: 'New Vote', zh: '发起投票' },
  vote_duration: { en: 'Duration (days)', zh: '持续时间（天）' },
  vote_quorum: { en: 'Quorum %', zh: '法定人数%' },
  vote_yes: { en: 'Yes', zh: '赞成' },
  vote_no: { en: 'No', zh: '反对' },
  vote_cast: { en: 'Cast Vote', zh: '投票' },
  vote_progress: { en: 'Progress', zh: '进度' },
  vote_ends: { en: 'Ends', zh: '结束时间' },

  maintenance_title: { en: 'Maintenance Requests', zh: '维修申请' },
  maintenance_new: { en: 'New Request', zh: '新建申请' },
  maintenance_cost: { en: 'Cost', zh: '费用' },
  maintenance_approve_cost: { en: 'Approve Cost', zh: '批准费用' },
  maintenance_confirm: { en: 'Confirm Completion', zh: '确认完成' },

  finance_title: { en: 'Invoice Review', zh: '发票审核' },
  finance_generate_bills: { en: 'Generate Bills', zh: '生成账单' },
  finance_month: { en: 'Month', zh: '月份' },
  finance_unit_size: { en: 'Unit Size', zh: '单元面积' },
  finance_rate: { en: 'Rate/sqft', zh: '单价/平方英尺' },
  finance_fixed_fee: { en: 'Fixed Fee', zh: '固定费用' },
  finance_repair: { en: 'Repair Expense', zh: '维修费用' },
  finance_total: { en: 'Total', zh: '总计' },

  owner_info_title: { en: 'Owner Management', zh: '业主管理' },
  owner_info_unit: { en: 'Unit Number', zh: '单元号' },
  owner_info_size: { en: 'Unit Size (sqft)', zh: '单元面积（平方英尺）' },
  owner_info_occupancy: { en: 'Occupancy', zh: '居住状态' },
  owner_info_emergency: { en: 'Emergency Contact', zh: '紧急联系人' },
  owner_info_edit: { en: 'Edit', zh: '编辑' },
  owner_info_approve: { en: 'Approve', zh: '批准' },
  owner_info_approve_confirm: { en: 'Approve & Confirm', zh: '批准并确认' },
  owner_info_status_pending: { en: 'Pending Approval', zh: '待审核' },
  owner_info_status_approved: { en: 'Approved', zh: '已审核' },
  owner_info_approved_success: { en: 'Owner information approved successfully', zh: '业主信息已成功审核通过' },
  owner_info_approve_failed: { en: 'Could not approve owner information.', zh: '审核失败，请重试。' },

  compliance_title: { en: 'Compliance & Insurance', zh: '法规保险' },
  compliance_new_doc: { en: 'New Document', zh: '新建文档' },
  compliance_doc_title: { en: 'Document Title', zh: '文档标题' },
  compliance_category: { en: 'Category', zh: '分类' },
  compliance_legal: { en: 'Legal Compliance', zh: '法规合规' },
  compliance_insurance: { en: 'Insurance', zh: '保险' },
  compliance_license: { en: 'License & Permit', zh: '执照许可' },
  compliance_contract: { en: 'Contract', zh: '合同' },
  compliance_expiry: { en: 'Expiry Date', zh: '到期日期' },
  compliance_upload: { en: 'Upload Document', zh: '上传文档' },
  compliance_view: { en: 'View Document', zh: '查看文档' },

  comm_title: { en: 'Communication', zh: '业主沟通' },
  comm_new_post: { en: 'New Post', zh: '新建帖子' },
  comm_category: { en: 'Category', zh: '分类' },
  comm_complaint: { en: 'Complaint', zh: '投诉' },
  comm_suggestion: { en: 'Suggestion', zh: '建议' },
  comm_inquiry: { en: 'Inquiry', zh: '咨询' },
  comm_urgent: { en: 'Urgent', zh: '紧急' },
  comm_reply: { en: 'Reply', zh: '回复' },
  comm_like: { en: 'Like', zh: '点赞' },

  hiring_title: { en: 'Property Manager', zh: '物业经理' },
  hiring_new_job: { en: 'New Job', zh: '新建职位' },
  hiring_probation: { en: 'Probation Period', zh: '试用期' },
  hiring_recommend: { en: 'Recommend Candidate', zh: '推荐候选人' },
  hiring_candidate_name: { en: 'Candidate Name', zh: '候选人姓名' },
  hiring_council_score: { en: 'Council Score', zh: '业委会评分' },
  hiring_owner_score: { en: 'Owner Score', zh: '业主评分' },
  hiring_total_score: { en: 'Total Score', zh: '总分' },

  status_open: { en: 'Open', zh: '开放' },
  status_hired: { en: 'Hired', zh: '已录用' },
  status_closed: { en: 'Closed', zh: '已关闭' },
  status_recommended: { en: 'Recommended', zh: '已推荐' },
  status_interview: { en: 'Interview', zh: '面试中' },
  status_draft: { en: 'Draft', zh: '草稿' },
  status_active: { en: 'Active', zh: '进行中' },
  status_pending: { en: 'Pending', zh: '待处理' },
  status_approved: { en: 'Approved', zh: '已批准' },
  status_completed: { en: 'Completed', zh: '已完成' },
  status_rejected: { en: 'Rejected', zh: '已拒绝' },

  action_save: { en: 'Save', zh: '保存' },
  action_cancel: { en: 'Cancel', zh: '取消' },
  action_submit: { en: 'Submit', zh: '提交' },
  action_delete: { en: 'Delete', zh: '删除' },
  action_edit: { en: 'Edit', zh: '编辑' },
  action_view: { en: 'View', zh: '查看' },
  action_close: { en: 'Close', zh: '关闭' },

  loading: { en: 'Loading...', zh: '加载中...' },
  error: { en: 'Error', zh: '错误' },
  success: { en: 'Success', zh: '成功' },

  meeting_not_found: { en: 'Meeting not found', zh: '未找到该会议' },
  meeting_back_list: { en: 'Back to Meetings & Voting', zh: '返回会议投票' },
  meeting_save_failed: { en: 'Could not save changes. Check your connection or permissions.', zh: '保存失败，请检查网络或权限。' },
  vote_success: { en: 'Vote recorded', zh: '投票成功' },
  vote_failed: { en: 'Vote failed', zh: '投票失败' },
  attendance_signin_failed: { en: 'Sign-in failed', zh: '签到失败，请重试' },
  doc_fill_title_file: { en: 'Enter a title (English) and choose a file', zh: '请填写文件标题并选择文件' },
  doc_save_denied: { en: 'Save failed: insufficient permission', zh: '保存失败：权限不足' },
  agenda_title_required: { en: 'English title is required', zh: '请填写英文标题' },
  meeting_overtime_badge: { en: 'Overtime', zh: '超时' },

  budget_home_title: { en: 'Budget overview', zh: '预算概览' },
  budget_home_subtitle: {
    en: 'Read-only totals from active budget package, committed quotes, and approved invoices.',
    zh: '只读汇总：当前财年生效预算包、已选报价承诺与已批准实际支出。',
  },
  budget_home_fiscal_year: { en: 'Fiscal year', zh: '财年' },
  budget_home_total_budget: { en: 'Total budget', zh: '年度预算合计' },
  budget_home_committed: { en: 'Committed', zh: '已承诺（选中报价）' },
  budget_home_actual: { en: 'Actual (approved)', zh: '实际（已批准）' },
  budget_home_remaining: { en: 'Remaining (budget − actual)', zh: '结余（预算−实际）' },
  budget_home_utilization: { en: 'Utilization vs budget', zh: '相对预算占用' },
  budget_home_util_actual_pct: { en: 'Actual', zh: '实际' },
  budget_home_util_committed_pct: { en: 'Committed', zh: '承诺' },
  budget_home_no_active_package: {
    en: 'No active budget package for this year. Totals may be zero until a package is activated.',
    zh: '本财年暂无「生效中」的预算包；汇总可能为零，请先激活预算包。',
  },
  budget_home_load_error: { en: 'Could not load budget data', zh: '无法加载预算数据' },
  budget_home_load_error_retry: {
    en: 'Could not load budget data. Please try again later.',
    zh: '无法加载预算数据，请稍后重试',
  },
  dashboard_page_h1: { en: 'Finance & risk overview', zh: '财务与风险概览' },
  budget_home_categories: { en: 'Categories (top spend)', zh: '科目（按支出前列）' },
  budget_home_col_category: { en: 'Category', zh: '科目' },
  budget_home_col_budget: { en: 'Budget', zh: '预算' },
  budget_home_col_committed: { en: 'Committed', zh: '承诺' },
  budget_home_col_actual: { en: 'Actual', zh: '实际' },
  budget_home_col_status: { en: 'Status', zh: '状态' },
  budget_home_status_over: { en: 'Over', zh: '超支' },
  budget_home_status_ok: { en: 'OK', zh: '正常' },
  budget_home_alerts: { en: 'Alerts', zh: '提醒' },
};

function readStoredLanguage(): Language | null {
  try {
    const s = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (s === 'zh' || s === 'en') return s;
  } catch {
    /* ignore */
  }
  return null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage() ?? 'en');

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleLanguage = () => {
    setLanguageState((prev) => {
      const next = prev === 'en' ? 'zh' : 'en';
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
