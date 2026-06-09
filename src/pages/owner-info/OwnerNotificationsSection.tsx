import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Megaphone, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase, type AnnouncementPriority } from '../../lib/supabase';

export interface CommunityNoticeRow {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  created_at: string;
  created_by: string;
  author_name: string;
  /** profiles.role — for display (admin / council / manager / …) */
  creator_role: string;
}

const CONTENT_COLLAPSE_LEN = 280;
const CONTENT_COLLAPSE_LINES = 5;

type CreatorEmbed = {
  full_name_en: string | null;
  full_name_zh: string | null;
  role: string | null;
} | null;

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

function displayAuthorName(c: CreatorEmbed): string {
  if (!c) return '—';
  const zh = typeof c.full_name_zh === 'string' ? c.full_name_zh.trim() : '';
  if (zh !== '') return zh;
  const en = typeof c.full_name_en === 'string' ? c.full_name_en.trim() : '';
  return en !== '' ? en : '—';
}

function roleLabel(role: string, en: boolean): string {
  if (role === 'council') return en ? 'Strata council' : '业委会';
  if (role === 'manager') return en ? 'Property manager' : '物业经理';
  if (role === 'admin') return en ? 'Administrator' : '管理员';
  return role;
}

function priorityLabel(p: AnnouncementPriority, en: boolean): string {
  switch (p) {
    case 'urgent':
      return en ? 'Urgent' : '紧急';
    case 'important':
      return en ? 'Important' : '重要';
    default:
      return en ? 'Normal' : '普通';
  }
}

function shouldCollapseContent(text: string) {
  if (text.length > CONTENT_COLLAPSE_LEN) return true;
  const lines = text.split('\n').length;
  return lines > CONTENT_COLLAPSE_LINES;
}

type CommunityNoticeDbRow = {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  created_at: string;
  created_by: string;
  creator: CreatorEmbed;
};

function mapRows(data: CommunityNoticeDbRow[]): CommunityNoticeRow[] {
  return data.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    priority: r.priority,
    created_at: r.created_at,
    created_by: r.created_by,
    author_name: displayAuthorName(r.creator),
    creator_role: r.creator?.role ?? '',
  }));
}

export function OwnerNotificationsSection() {
  const { profile } = useAuth();
  const { currentPropertyId, roleInProperty } = useProperty();
  const { language } = useLanguage();
  const en = language === 'en';

  const [rows, setRows] = useState<CommunityNoticeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const canPublish =
    roleInProperty === 'council' ||
    roleInProperty === 'manager' ||
    roleInProperty === 'property_admin' ||
    roleInProperty === 'admin';

  const canModifyRow = (row: CommunityNoticeRow) => {
    if (!profile?.id) return false;
    return row.created_by === profile.id;
  };

  const load = useCallback(async () => {
    if (!currentPropertyId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('community_notifications')
      .select(
        `
        id,
        title,
        content,
        priority,
        created_at,
        created_by,
        creator:profiles!community_notifications_created_by_fkey (
          full_name_en,
          full_name_zh,
          role
        )
      `,
      )
      .eq('property_id', currentPropertyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('community_notifications load', error);
      setRows([]);
    } else {
      setRows(mapRows((data as CommunityNoticeDbRow[]) || []));
    }
    setLoading(false);
  }, [currentPropertyId]);

  useEffect(() => {
    void load();
  }, [load]);

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
    setPriority('normal');
    setModal('create');
  };

  const openEdit = (row: CommunityNoticeRow) => {
    setEditingId(row.id);
    setTitle(row.title);
    setContent(row.content);
    setPriority(row.priority);
    setModal('edit');
  };

  const closeModal = () => {
    setModal(null);
    setEditingId(null);
    setTitle('');
    setContent('');
    setPriority('normal');
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
        if (!currentPropertyId) {
          alert(en ? 'No property selected.' : '未选择物业。');
          return;
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          alert(en ? 'Please sign in again.' : '请重新登录。');
          return;
        }
        const res = await fetch('/api/create-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            property_id: currentPropertyId,
            title: t,
            content: body,
            priority,
          }),
        });
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          const msg = payload.error ?? (en ? 'Could not publish announcement.' : '发布公告失败。');
          alert(en ? `Publish failed: ${msg}` : `发布失败：${msg}`);
          return;
        }
      } else if (modal === 'edit' && editingId) {
        if (!currentPropertyId) {
          alert(en ? 'No property selected.' : '未选择物业。');
          return;
        }
        const { error } = await supabase
          .from('community_notifications')
          .update({ title: t, content: body, priority })
          .eq('id', editingId)
          .eq('property_id', currentPropertyId);
        if (error) {
          alert(en ? `Save failed: ${error.message}` : `保存失败：${error.message}`);
          return;
        }
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

  const remove = async (row: CommunityNoticeRow) => {
    if (!currentPropertyId) return;
    if (!confirm(en ? 'Delete this announcement? This cannot be undone.' : '确定删除此公告？此操作不可撤销。')) return;
    try {
      const { error } = await supabase
        .from('community_notifications')
        .delete()
        .eq('id', row.id)
        .eq('property_id', currentPropertyId);
      if (error) throw error;
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(en ? `Delete failed: ${msg}` : `删除失败：${msg}`);
    }
  };

  const priorityChipClass = (p: AnnouncementPriority) => {
    if (p === 'urgent') return 'bg-red-50 text-red-800 ring-red-200';
    if (p === 'important') return 'bg-amber-50 text-amber-900 ring-amber-200';
    return 'bg-gray-100 text-gray-600 ring-gray-200';
  };

  return (
    <section
      id="owner-announcements"
      aria-labelledby="owner-announcements-heading"
      className="mb-10 scroll-mt-24 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-[#1D9E75]/10 to-transparent px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1D9E75]/15 text-[#1D9E75]">
            <Megaphone size={22} aria-hidden />
          </div>
          <div>
            <h2 id="owner-announcements-heading" className="text-lg font-bold text-gray-900">
              {en ? 'Important Announcements' : '重大公告'}
            </h2>
            <p className="text-sm text-gray-500">
              {en
                ? 'View officially published community announcements and notices.'
                : '查看社区正式发布的重要公告与通知。'}
            </p>
          </div>
        </div>
        {canPublish && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#188a66] focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:ring-offset-2"
          >
            <Plus size={18} aria-hidden />
            {en ? 'Publish announcement' : '发布公告'}
          </button>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <p className="text-center text-gray-500 py-8">{en ? 'Loading…' : '加载中…'}</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-gray-500 py-10 rounded-lg bg-gray-50 border border-dashed border-gray-200">
            {en ? 'No announcements yet.' : '暂无公告。'}
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
                    <div className="min-w-0 pr-2">
                      <h3 className="text-base font-semibold text-gray-900">{row.title}</h3>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${priorityChipClass(row.priority)}`}
                      >
                        {priorityLabel(row.priority, en)}
                      </span>
                    </div>
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
                          onClick={() => void remove(row)}
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
                      {roleLabel(row.creator_role, en)}
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
                {modal === 'create'
                  ? en
                    ? 'Publish announcement'
                    : '发布公告'
                  : en
                    ? 'Edit announcement'
                    : '编辑公告'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{en ? 'Priority' : '优先级'}</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]"
                >
                  <option value="normal">{priorityLabel('normal', en)}</option>
                  <option value="important">{priorityLabel('important', en)}</option>
                  <option value="urgent">{priorityLabel('urgent', en)}</option>
                </select>
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
