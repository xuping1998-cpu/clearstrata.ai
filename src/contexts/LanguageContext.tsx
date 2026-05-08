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
  nav_finance: { en: 'Expense Review', zh: '支出审核' },
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
    en: 'Remote meetings and electronic voting, enabling owners to participate anytime, anywhere, with transparent and fair decisions.',
    zh: '电子投票与远程会议，业主随时随地参与表决，让每一项决议都公正透明。',
  },
  nav_owner_voting: { en: 'Owner Voting', zh: '业主电子表决' },

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

  finance_title: { en: 'Expense Review', zh: '支出审核' },
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
