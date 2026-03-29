import { CreditCard as Edit2, Save, X } from 'lucide-react';

interface UserCardProps {
  user: {
    id: string;
    full_name_en: string;
    full_name_zh?: string;
    email: string;
    phone?: string;
  };
  language: 'en' | 'zh';
  isEditing: boolean;
  editForm: {
    full_name_en?: string;
    full_name_zh?: string;
    phone?: string;
  };
  updating: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onFormChange: (field: string, value: string) => void;
  actions?: React.ReactNode;
  /** Role dropdown etc.; only rendered when parent allows (e.g. council / admin). */
  roleSelector?: React.ReactNode;
  className?: string;
}

export function UserCard({
  user,
  language,
  isEditing,
  editForm,
  updating,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onFormChange,
  actions,
  roleSelector,
  className = '',
}: UserCardProps) {
  if (isEditing) {
    return (
      <div className={`p-4 rounded-lg border ${className}`}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {language === 'en' ? 'Full Name (English)' : '姓名（英文）'}
            </label>
            <input
              type="text"
              value={editForm.full_name_en || ''}
              onChange={(e) => onFormChange('full_name_en', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {language === 'en' ? 'Full Name (Chinese)' : '姓名（中文）'}
            </label>
            <input
              type="text"
              value={editForm.full_name_zh || ''}
              onChange={(e) => onFormChange('full_name_zh', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {language === 'en' ? 'Phone Number' : '电话号码'}
            </label>
            <input
              type="tel"
              value={editForm.phone || ''}
              onChange={(e) => onFormChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75] text-sm"
            />
          </div>
          <div className="text-xs text-gray-500">{user.email}</div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={onSaveEdit}
              disabled={updating}
              className="flex items-center gap-1 px-3 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors disabled:opacity-50 text-sm"
            >
              <Save size={16} />
              {updating
                ? (language === 'en' ? 'Saving...' : '保存中...')
                : (language === 'en' ? 'Save' : '保存')}
            </button>
            <button
              onClick={onCancelEdit}
              disabled={updating}
              className="flex items-center gap-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 text-sm"
            >
              <X size={16} />
              {language === 'en' ? 'Cancel' : '取消'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${className}`}>
      <div>
        <div className="font-medium text-gray-900">
          {language === 'en'
            ? user.full_name_en
            : user.full_name_zh || user.full_name_en}
        </div>
        <div className="text-sm text-gray-600">{user.email}</div>
        {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-2 justify-end">
        {roleSelector}
        <button
          onClick={onStartEdit}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title={language === 'en' ? 'Edit User' : '编辑用户'}
        >
          <Edit2 size={18} />
        </button>
        {actions}
      </div>
    </div>
  );
}
