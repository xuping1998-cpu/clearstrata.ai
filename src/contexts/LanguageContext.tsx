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

  nav_dashboard: { en: 'Dashboard', zh: '首页' },
  nav_procurement: { en: 'Procurement & Maintenance', zh: '采购维修' },
  nav_voting: { en: 'Meeting & Voting', zh: '会议投票' },
  nav_maintenance: { en: 'Maintenance', zh: '维修申请' },
  nav_finance: { en: 'Financial Reports', zh: '财务报表' },
  nav_owner_info: { en: 'Owner Information', zh: '业主信息' },
  nav_communication: { en: 'Dispute Resolution', zh: '纠纷调解' },
  nav_disputes: { en: 'Dispute Resolution', zh: '纠纷调解' },
  nav_hiring: { en: 'Property Manager', zh: '物业经理' },
  nav_compliance: { en: 'Compliance & Insurance', zh: '法规保险' },
  admin_review_residents_cta: { en: 'Open User Management tab', zh: '打开「用户管理」页签' },
  admin_review_residents_hint: {
    en: 'Approve or reject pending accounts under Owner Information → User Management.',
    zh: '请在「业主信息 → 用户管理」中批准或拒绝待激活账号。',
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
    en: 'Residents by unit (activated records). Account activation is handled under User Management.',
    zh: '按单元查看在册居住人档案；新账号激活请在「用户管理」中处理。',
  },
  residents_summary_total: { en: 'Total records', zh: '档案总数' },
  residents_summary_active: { en: 'Active', zh: '在册活跃' },
  residents_summary_overdue: { en: 'Fee overdue', zh: '欠费' },

  procurement_title: { en: 'Procurement & Maintenance', zh: '采购维修' },
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

  vote_title: { en: 'Meeting & Voting Records', zh: '会议投票记录' },
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

  finance_title: { en: 'Financial Reports', zh: '财务报表' },
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
  meeting_back_list: { en: 'Back to meetings', zh: '返回会议列表' },
  meeting_save_failed: { en: 'Could not save changes. Check your connection or permissions.', zh: '保存失败，请检查网络或权限。' },
  vote_success: { en: 'Vote recorded', zh: '投票成功' },
  vote_failed: { en: 'Vote failed', zh: '投票失败' },
  attendance_signin_failed: { en: 'Sign-in failed', zh: '签到失败，请重试' },
  doc_fill_title_file: { en: 'Enter a title (English) and choose a file', zh: '请填写文件标题并选择文件' },
  doc_save_denied: { en: 'Save failed: insufficient permission', zh: '保存失败：权限不足' },
  agenda_title_required: { en: 'English title is required', zh: '请填写英文标题' },
  meeting_overtime_badge: { en: 'Overtime', zh: '超时' },
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
