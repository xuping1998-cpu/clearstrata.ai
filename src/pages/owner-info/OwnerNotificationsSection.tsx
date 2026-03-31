import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, FileText, Megaphone, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAnnouncementInbox } from '../../contexts/AnnouncementInboxContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { createOwnerNotificationViaApi } from '../../lib/createOwnerNotificationApi';
import {
  buildAnnouncementStoragePath,
  getNotificationAttachmentPublicUrl,
  publicUrlToStoragePath,
  removeNotificationStorageObjects,
  uploadNotificationAttachment,
  validateNoticeAttachmentFile,
} from '../../lib/notificationAttachmentUpload';

export interface StrataNotificationRow {
  id: string;
  title: string;
  content: string;
  author_name: string;
  author_role: string;
  created_at: string;
  created_by: string | null;
  file_url: string | null;
  file_name: string | null;
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

function errMsg(code: string, en: boolean): string {
  switch (code) {
    case 'FILE_TOO_LARGE':
      return en ? 'File is too large (max 10 MB).' : '文件过大（最大 10MB）。';
    case 'FILE_TYPE':
      return en
        ? 'Unsupported type. Use PDF, Word, Excel (.xls/.xlsx), or .jpg / .png.'
        : '不支持该格式，请使用 PDF、Word、Excel（.xls/.xlsx）或 .jpg / .png。';
    case 'NOT_SIGNED_IN':
      return en ? 'Please sign in again.' : '请重新登录。';
    case 'NETWORK_ERROR':
      return en ? 'Network error during upload.' : '上传时网络错误。';
    default:
      return code;
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [attachedFileSize, setAttachedFileSize] = useState<number | null>(null);
  const [pendingUploadMeta, setPendingUploadMeta] = useState<{ name: string; size: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Storage path for attachment before this edit (for cleanup on replace/remove). */
  const previousStoragePathRef = useRef<string | null>(null);

  const canPublish = profile?.role === 'council' || profile?.role === 'manager';
  const canUseStorage = profile?.role === 'council' || profile?.role === 'manager';

  const canModifyRow = (row: StrataNotificationRow) => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    if (!row.created_by) return false;
    return row.created_by === profile.id;
  };

  const resetAttachmentState = () => {
    setFileUrl(null);
    setFileName(null);
    setAttachedFileSize(null);
    setPendingUploadMeta(null);
    setDragActive(false);
    setUploadProgress(null);
    setUploadError(null);
    previousStoragePathRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, content, author_name, author_role, created_at, created_by, file_url, file_name')
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
    resetAttachmentState();
    setModal('create');
  };

  const openEdit = (row: StrataNotificationRow) => {
    setEditingId(row.id);
    setTitle(row.title);
    setContent(row.content);
    setFileUrl(row.file_url);
    setFileName(row.file_name);
    setAttachedFileSize(null);
    previousStoragePathRef.current = row.file_url ? publicUrlToStoragePath(row.file_url) : null;
    setUploadProgress(null);
    setUploadError(null);
    setPendingUploadMeta(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setModal('edit');
  };

  const closeModal = () => {
    setModal(null);
    setEditingId(null);
    setTitle('');
    setContent('');
    resetAttachmentState();
  };

  const processAttachmentFile = async (file: File) => {
    if (!profile?.id) return;

    if (!canUseStorage) {
      setUploadError(en ? 'Only council or property manager can upload files.' : '仅业委会或物业经理可上传附件。');
      return;
    }

    const v = validateNoticeAttachmentFile(file);
    if (v) {
      setUploadError(errMsg(v, en));
      return;
    }

    if (modal === 'create' && fileUrl) {
      const oldPath = publicUrlToStoragePath(fileUrl);
      if (oldPath) await removeNotificationStorageObjects([oldPath]);
    }

    setUploadError(null);
    setPendingUploadMeta({ name: file.name, size: file.size });
    setUploadProgress(0);
    const path = buildAnnouncementStoragePath(profile.id, file.name);

    try {
      await uploadNotificationAttachment(file, path, setUploadProgress);
      const publicUrl = getNotificationAttachmentPublicUrl(path);
      setFileUrl(publicUrl);
      setFileName(file.name);
      setAttachedFileSize(file.size);
      setUploadProgress(null);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      setUploadError(raw === 'NETWORK_ERROR' ? errMsg('NETWORK_ERROR', en) : raw);
      setUploadProgress(null);
    } finally {
      setPendingUploadMeta(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onAttachmentFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void processAttachmentFile(file);
  };

  const onDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!canUseStorage || uploadProgress !== null) return;
    const { files } = e.dataTransfer;
    if (files.length > 1) {
      alert(en ? 'Please drop only one file.' : '仅支持单个文件。');
      return;
    }
    const file = files[0];
    if (file) void processAttachmentFile(file);
  };

  const handleRemoveAttachment = async () => {
    if (!fileUrl && !fileName) return;

    if (!canUseStorage) {
      if (profile?.role === 'admin' && modal === 'edit' && editingId) {
        const { error } = await supabase
          .from('notifications')
          .update({ file_url: null, file_name: null })
          .eq('id', editingId);
        if (error) {
          alert(en ? `Failed to remove attachment: ${error.message}` : `移除附件失败：${error.message}`);
          return;
        }
        previousStoragePathRef.current = null;
        await load();
      }
      setFileUrl(null);
      setFileName(null);
      setAttachedFileSize(null);
      setUploadError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const path = fileUrl ? publicUrlToStoragePath(fileUrl) : null;
    if (path) await removeNotificationStorageObjects([path]);

    if (modal === 'edit' && editingId) {
      const { error } = await supabase
        .from('notifications')
        .update({ file_url: null, file_name: null })
        .eq('id', editingId);
      if (error) {
        alert(en ? `Failed to remove attachment: ${error.message}` : `移除附件失败：${error.message}`);
        return;
      }
      previousStoragePathRef.current = null;
      await load();
    }

    setFileUrl(null);
    setFileName(null);
    setAttachedFileSize(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submit = async () => {
    const t = title.trim();
    if (!t || !content.trim()) {
      alert(en ? 'Please enter title and content.' : '请填写标题和内容。');
      return;
    }
    const body = content.replace(/\s+$/u, '');
    const nextUrl = fileUrl?.trim() || null;
    const nextName = nextUrl && fileName?.trim() ? fileName.trim() : null;

    setSaving(true);
    try {
      const prevPath = previousStoragePathRef.current;
      const nextPath = nextUrl ? publicUrlToStoragePath(nextUrl) : null;
      const shouldRemoveOld =
        canUseStorage &&
        prevPath &&
        (nextPath !== prevPath || !nextUrl);

      if (shouldRemoveOld && prevPath) {
        await removeNotificationStorageObjects([prevPath]);
      }

      if (modal === 'create') {
        await createOwnerNotificationViaApi({
          title: t,
          content: body,
          file_url: nextUrl,
          file_name: nextName,
        });
      } else if (modal === 'edit' && editingId) {
        const { error } = await supabase
          .from('notifications')
          .update({ title: t, content: body, file_url: nextUrl, file_name: nextName })
          .eq('id', editingId);
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

  const remove = async (row: StrataNotificationRow) => {
    if (!confirm(en ? 'Delete this notice? This cannot be undone.' : '确定删除此通知？此操作不可撤销。')) return;
    try {
      const p = row.file_url ? publicUrlToStoragePath(row.file_url) : null;
      if (p && canUseStorage) {
        await removeNotificationStorageObjects([p]);
      }
      const { error } = await supabase.from('notifications').delete().eq('id', row.id);
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
                  {row.file_url && row.file_name && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <FileText size={16} className="text-[#1D9E75] shrink-0" aria-hidden />
                      <a
                        href={row.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={row.file_name}
                        className="text-sm font-medium text-[#1D9E75] hover:text-[#188a66] underline break-all"
                      >
                        {en ? 'Download attachment: ' : '下载附件：'}
                        {row.file_name}
                      </a>
                    </div>
                  )}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{en ? 'Attachment' : '附件'}</label>
                <p className="text-xs text-gray-500 mb-3">
                  {en
                    ? 'One file only, max 10 MB: .pdf, .doc, .docx, .xls, .xlsx, .jpg, .png'
                    : '仅 1 个文件，最大 10MB：.pdf、.doc、.docx、.xls、.xlsx、.jpg、.png'}
                </p>

                {modal === 'edit' &&
                  fileUrl &&
                  fileName &&
                  pendingUploadMeta === null &&
                  uploadProgress === null && (
                    <div className="mb-3 rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                      <div className="text-sm font-semibold text-gray-900 break-all">{fileName}</div>
                      {attachedFileSize !== null && (
                        <div className="text-xs text-gray-500">{formatFileSize(attachedFileSize)}</div>
                      )}
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex text-sm font-medium text-[#1D9E75] hover:text-[#188a66] underline"
                      >
                        {en ? 'Download current file' : '下载当前附件'}
                      </a>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {canUseStorage && (
                          <button
                            type="button"
                            disabled={uploadProgress !== null}
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {en ? 'Replace attachment' : '替换附件'}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={uploadProgress !== null}
                          onClick={() => void handleRemoveAttachment()}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {en ? 'Remove attachment' : '移除附件'}
                        </button>
                      </div>
                    </div>
                  )}

                {!canUseStorage && modal === 'edit' && profile?.role === 'admin' && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 mb-3">
                    {en
                      ? 'Only council or property manager can upload or replace files in storage.'
                      : '仅业委会或物业经理可上传或替换存储中的文件。'}
                  </p>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png"
                  className="hidden"
                  onChange={onAttachmentFileInput}
                  disabled={!canUseStorage || uploadProgress !== null}
                />

                {canUseStorage && (
                  <div
                    role="presentation"
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (uploadProgress === null) setDragActive(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragActive(false);
                    }}
                    onDrop={onDropFiles}
                    className={`rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
                      dragActive
                        ? 'border-[#1D9E75] bg-[#1D9E75]/5'
                        : 'border-gray-300 bg-gray-50/80'
                    } ${uploadProgress !== null ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <Upload className="mx-auto mb-2 text-gray-400" size={28} aria-hidden />
                    <p className="text-sm text-gray-600 mb-3">
                      {modal === 'edit' && fileUrl && fileName
                        ? en
                          ? 'Drag a new file here to replace the attachment, or'
                          : '拖拽新文件到此处替换附件，或'
                        : en
                          ? 'Drag a file here, or'
                          : '拖拽文件到此处，或'}
                    </p>
                    <button
                      type="button"
                      disabled={uploadProgress !== null}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {en ? 'Choose file' : '选择文件'}
                    </button>
                  </div>
                )}

                {modal === 'create' && fileName && fileUrl && pendingUploadMeta === null && uploadProgress === null && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 break-all">{fileName}</div>
                      {attachedFileSize !== null && (
                        <div className="text-xs text-gray-500 mt-0.5">{formatFileSize(attachedFileSize)}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemoveAttachment()}
                      className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      {en ? 'Remove' : '移除附件'}
                    </button>
                  </div>
                )}

                {pendingUploadMeta && (
                  <div className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-white p-3">
                    <div className="text-sm font-medium text-gray-900 break-all">{pendingUploadMeta.name}</div>
                    <div className="text-xs text-gray-500">{formatFileSize(pendingUploadMeta.size)}</div>
                  </div>
                )}

                {uploadProgress !== null && (
                  <div className="mt-3 space-y-1">
                    <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1D9E75] transition-all duration-150"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {en ? `Uploading… ${uploadProgress}%` : `上传中… ${uploadProgress}%`}
                    </p>
                  </div>
                )}
                {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
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
                disabled={saving || uploadProgress !== null}
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
