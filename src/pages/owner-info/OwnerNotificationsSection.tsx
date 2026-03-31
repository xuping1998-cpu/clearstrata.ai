import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';

export interface StrataNotificationRow {
  id: string;
  title: string;
  content: string;
  author_name: string;
  author_role: string;
  created_at: string;
}

function formatDate(iso: string, language: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(language === 'en' ? 'en-CA' : 'zh-CN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function roleLabel(role: string, en: boolean) {
  if (role === '业委会') return en ? 'Strata council' : '业委会';
  if (role === '物业经理') return en ? 'Property manager' : '物业经理';
  return role;
}

export function OwnerNotificationsSection() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';

  const [rows, setRows] = useState<StrataNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const canPublish = profile?.role === 'council' || profile?.role === 'manager';

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, content, author_name, author_role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('notifications load', error);
      setRows([]);
    } else {
      setRows((data as StrataNotificationRow[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setModal('create');
  };

  const openEdit = (row: StrataNotificationRow) => {
    setEditingId(row.id);
    setTitle(row.title);
    setContent(row.content);
    setModal('edit');
  };

  const closeModal = () => {
    setModal(null);
    setEditingId(null);
    setTitle('');
    setContent('');
  };

  const submit = async () => {
    const t = title.trim();
    const c = content.trim();
    if (!t || !c) {
      alert(en ? 'Please enter title and content.' : '请填写标题和内容。');
      return;
    }
    setSaving(true);
    try {
      if (modal === 'create') {
        const { error } = await supabase.from('notifications').insert({ title: t, content: c });
        if (error) throw error;
      } else if (modal === 'edit' && editingId) {
        const { error } = await supabase.from('notifications').update({ title: t, content: c }).eq('id', editingId);
        if (error) throw error;
      }
      closeModal();
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(en ? `Save failed: ${msg}` : `保存失败：${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(en ? 'Delete this notice?' : '确定删除此通知？')) return;
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(en ? `Delete failed: ${msg}` : `删除失败：${msg}`);
    }
  };

  return (
    <section
      aria-labelledby="owner-notifications-heading"
      className="mb-10 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-[#1D9E75]/10 to-transparent px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1D9E75]/15 text-[#1D9E75]">
            <Megaphone size={22} aria-hidden />
          </div>
          <div>
            <h2 id="owner-notifications-heading" className="text-lg font-bold text-gray-900">
              {en ? 'Notices & announcements' : '通知公告'}
            </h2>
            <p className="text-sm text-gray-500">{en ? 'Updates from council and property management' : '业委会与物业发布的公告'}</p>
          </div>
        </div>
        {canPublish && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#188a66] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-2"
          >
            <Plus size={18} aria-hidden />
            {en ? 'Post notice' : '发布通知'}
          </button>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <p className="text-center text-gray-500 py-8">{en ? 'Loading…' : '加载中…'}</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-gray-500 py-10 rounded-lg bg-gray-50 border border-dashed border-gray-200">
            {en ? 'No notices yet.' : '暂无通知。'}
          </p>
        ) : (
          <ul className="space-y-4">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 transition hover:border-[#1D9E75]/30 hover:bg-white"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-gray-900 pr-2">{row.title}</h3>
                  {canPublish && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded-md p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                        aria-label={en ? 'Edit' : '编辑'}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(row.id)}
                        className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                        aria-label={en ? 'Delete' : '删除'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{row.content}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span className="font-medium text-gray-600">{row.author_name}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-gray-200">
                    {roleLabel(row.author_role, en)}
                  </span>
                  <time dateTime={row.created_at}>{formatDate(row.created_at, language)}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {modal === 'create' ? (en ? 'Post notice' : '发布通知') : en ? 'Edit notice' : '编辑通知'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label={en ? 'Close' : '关闭'}
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
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
                  rows={6}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] resize-y"
                  maxLength={8000}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3 bg-gray-50 rounded-b-xl">
              <button
                type="button"
                onClick={closeModal}
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
                {saving
                  ? en
                    ? 'Saving…'
                    : '保存中…'
                  : modal === 'edit'
                    ? en
                      ? 'Save'
                      : '保存'
                    : en
                      ? 'Publish'
                      : '发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
