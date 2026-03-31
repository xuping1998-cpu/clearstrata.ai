import { useState } from 'react';
import { X } from 'lucide-react';
import { insertStrataNotification, type NotificationPriority } from '../../../lib/strataNotificationsApi';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  strataId: string;
  userId: string;
  language: 'en' | 'zh';
};

export function CreateNotificationModal({ open, onClose, onCreated, strataId, userId, language }: Props) {
  const en = language === 'en';
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setContent('');
    setPriority('normal');
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    const t = title.trim();
    const c = content.trim();
    if (!t || !c) {
      setError(en ? 'Title and content are required.' : '请填写标题和内容。');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await insertStrataNotification({
        title: t,
        content: c,
        priority,
        strata_id: strataId,
        created_by: userId,
      });
      reset();
      onCreated();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">{en ? 'New notification' : '发布通知'}</h3>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label={en ? 'Close' : '关闭'}
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{en ? 'Title' : '标题'}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]"
              maxLength={200}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{en ? 'Content' : '内容'}</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] resize-y min-h-[160px]"
              maxLength={8000}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{en ? 'Priority' : '优先级'}</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as NotificationPriority)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]"
            >
              <option value="normal">{en ? 'Normal' : '普通'}</option>
              <option value="important">{en ? 'Important' : '重要'}</option>
              <option value="urgent">{en ? 'Urgent' : '紧急'}</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3 bg-gray-50 rounded-b-xl shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            {en ? 'Cancel' : '取消'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white hover:bg-[#188a66] disabled:opacity-50"
          >
            {saving ? (en ? 'Publishing…' : '发布中…') : en ? 'Publish' : '发布'}
          </button>
        </div>
      </div>
    </div>
  );
}
