import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Megaphone, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAnnouncementInbox } from '../../contexts/AnnouncementInboxContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';

export interface StrataNotificationRow {
  id: string;
  title: string;
  content: string;
  author_name: string;
  author_role: string;
  created_at: string;
  created_by: string | null;
}

const CONTENT_COLLAPSE_LEN = 280;
const CONTENT_COLLAPSE_LINES = 5;

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

function shouldCollapseContent(text: string) {
  if (text.length > CONTENT_COLLAPSE_LEN) return true;
  const lines = text.split('\n').length;
  return lines > CONTENT_COLLAPSE_LINES;
}

export function OwnerNotificationsSection() {
  const { profile } = useAuth();
  const { refreshAnnouncementInbox } = useAnnouncementInbox();
  const { language } = useLanguage();
  const en = language === 'en';

  const [rows, setRows] = useState<StrataNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const canPublish = profile?.role === 'council' || profile?.role === 'manager';

  const canModifyRow = (row: StrataNotificationRow) => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    if (!row.created_by) return false;
    return row.created_by === profile.id;
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, content, author_name, author_role, created_at, created_by')
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

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      await supabase
        .from('user_inbox_notifications')
        .update({ read: true })
        .eq('user_id', profile.id)
        .eq('type', 'owner_announcement')
        .eq('read', false);
      await refreshAnnouncementInbox();
    })();
  }, [profile?.id, refreshAnnouncementInbox]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
    if (!t || !content.trim()) {
      alert(en ? 'Please enter title and content.' : '请填写标题和内容。');
      return;
    }
    const body = content.replace(/\s+$/u, '');
    setSaving(true);
    try {
      if (modal === 'create') {
        const { error } = await supabase.from('notifications').insert({ title: t, content: body });
        if (error) throw error;
      } else if (modal === 'edit' && editingId) {
        const { error } = await supabase.from('notifications').update({ title: t, content: body }).eq('id', editingId);
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
    if (!confirm(en ? 'Delete this notice? This cannot be undone.' : '确定删除此通知？此操作不可撤销。')) return;
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
      id="owner-notices"
      aria-labelledby="owner-notifications-heading"
      className="mb-10 scroll-mt-24 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
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
            {en ? 'Post new notice' : '发布新通知'}
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
            {rows.map((row) => {
              const long = shouldCollapseContent(row.content);
              const expanded = expandedIds.has(row.id);
              const showModify = canModifyRow(row);
              return (
                <li
                  key={row.id}
                  className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 transition hover:border-[#1D9E75]/30 hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-gray-900 pr-2">{row.title}</h3>
                    {showModify && (
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
                  <div className="mt-2">
                    <p
                      className={`whitespace-pre-wrap text-sm leading-relaxed text-gray-700 ${
                        long && !expanded ? 'line-clamp-5 max-h-[7.5rem] overflow-hidden' : ''
                      }`}
                    >
                      {row.content}
                    </p>
                    {long && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(row.id)}
                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#1D9E75] hover:text-[#188a66]"
                      >
                        {expanded ? (
                          <>
                            <ChevronUp size={16} aria-hidden />
                            {en ? 'Show less' : '收起'}
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} aria-hidden />
                            {en ? 'Show full content' : '展开全文'}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="font-medium text-gray-600">{row.author_name}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-gray-200">
                      {roleLabel(row.author_role, en)}
                    </span>
                    <time dateTime={row.created_at}>{formatDate(row.created_at, language)}</time>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                {modal === 'create' ? (en ? 'Post new notice' : '发布新通知') : en ? 'Edit notice' : '编辑通知'}
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
                  rows={10}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75] resize-y min-h-[200px] font-sans"
                  maxLength={8000}
                  placeholder={en ? 'Supports multiple lines.' : '支持换行输入'}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3 bg-gray-50 rounded-b-xl shrink-0">
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
