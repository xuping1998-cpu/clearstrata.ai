import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, ImageIcon, Loader2, Paperclip, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getAttachmentTitle, isImageFile } from '../../lib/taskAttachmentUtils';

const BUCKET = 'task-attachments';

const ACCEPT_INPUT =
  'image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf';

export type TaskAttachmentRow = {
  id: string;
  property_id: string;
  task_id: string | null;
  log_id: string | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  uploaded_by: string | null;
  created_at: string;
};

const UPLOAD_CATEGORIES = [
  { value: 'before_photo', zh: '维修前', en: 'Before repair' },
  { value: 'after_photo', zh: '维修后', en: 'After repair' },
  { value: 'quote', zh: '报价单', en: 'Quote' },
  { value: 'invoice', zh: '发票', en: 'Invoice' },
  { value: 'document', zh: '其它文档', en: 'Document' },
  { value: 'other', zh: '其它附件', en: 'Other' },
] as const;

function isAllowedFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const okExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext);
  const okMime =
    !file.type ||
    ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type);
  return okExt && okMime;
}

type Props = {
  taskId: string;
  propertyId: string;
  canUpload: boolean;
  en: boolean;
  /** 附件列表变更后回调（用于刷新父级时间线等） */
  onAttachmentsChange?: () => void;
};

export function TaskAttachmentsSection({ taskId, propertyId, canUpload, en, onAttachmentsChange }: Props) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<TaskAttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>('before_photo');
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: logRows } = await supabase.from('manager_logs').select('id').eq('task_id', taskId);
      const logIds = (logRows ?? []).map((r) => r.id);

      let q = supabase.from('task_attachments').select('*').eq('property_id', propertyId);
      if (logIds.length > 0) {
        q = q.or(`task_id.eq.${taskId},log_id.in.(${logIds.join(',')})`);
      } else {
        q = q.eq('task_id', taskId);
      }
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) {
        console.error('task_attachments load', error);
        setRows([]);
        setLoading(false);
        return;
      }
      const list = (data as TaskAttachmentRow[]) ?? [];
      setRows(list);

      const urlMap: Record<string, string> = {};
      await Promise.all(
        list.map(async (a) => {
          const { data: signed, error: signErr } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(a.file_path, 3600);
          if (!signErr && signed?.signedUrl) urlMap[a.id] = signed.signedUrl;
        }),
      );
      setSignedUrls(urlMap);
    } finally {
      setLoading(false);
    }
  }, [taskId, propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 分组顺序：维修前 → 维修后 → 报价单 → 发票 → 其它文档 → 其它 */
  const groupedByCategory = useMemo(() => {
    const keys = ['before_photo', 'after_photo', 'quote', 'invoice', 'document', 'other'] as const;
    const buckets: Record<(typeof keys)[number], TaskAttachmentRow[]> = {
      before_photo: [],
      after_photo: [],
      quote: [],
      invoice: [],
      document: [],
      other: [],
    };
    for (const a of rows) {
      const raw = (a.category || '').trim();
      const k = keys.includes(raw as (typeof keys)[number]) ? (raw as (typeof keys)[number]) : 'other';
      buckets[k].push(a);
    }
    for (const k of keys) {
      buckets[k].sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime());
    }
    return buckets;
  }, [rows]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !profile?.id) return;
    if (!isAllowedFile(file)) {
      setMsg(en ? 'Only JPG, PNG, WebP, PDF are allowed.' : '仅支持 jpg、jpeg、png、webp、pdf。');
      return;
    }
    setUploading(true);
    setMsg(null);
    const safe = `${Date.now()}_${file.name.replace(/[^\w.\-()]/g, '_')}`;
    const path = `property-${propertyId}/task-${taskId}/${safe}`;

    try {
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) {
        console.error('storage upload', upErr);
        setMsg(en ? `Upload failed: ${upErr.message}` : `上传失败：${upErr.message}`);
        return;
      }

      const { error: insErr } = await supabase.from('task_attachments').insert({
        property_id: propertyId,
        task_id: taskId,
        log_id: null,
        file_name: file.name,
        file_path: path,
        file_type: file.type || null,
        file_size: file.size,
        category: uploadCategory,
        uploaded_by: profile.id,
      });
      if (insErr) {
        console.error('task_attachments insert', insErr);
        await supabase.storage.from(BUCKET).remove([path]);
        setMsg(en ? `Save failed: ${insErr.message}` : `保存记录失败：${insErr.message}`);
        return;
      }
      setMsg(en ? 'Uploaded successfully.' : '上传成功');
      void load();
      onAttachmentsChange?.();
    } catch (err) {
      console.error('upload', err);
      setMsg(en ? 'Upload failed.' : '上传失败，请重试。');
    } finally {
      setUploading(false);
    }
  };

  const openPdf = (a: TaskAttachmentRow) => {
    const url = signedUrls[a.id];
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const CATEGORY_ORDER = ['before_photo', 'after_photo', 'quote', 'invoice', 'document', 'other'] as const;

  const renderCategoryBlock = (cat: (typeof CATEGORY_ORDER)[number]) => {
    const list = groupedByCategory[cat];
    if (list.length === 0) return null;
    const imgs = list.filter((a) => isImageFile(a.file_type, a.file_name));
    const docs = list.filter((a) => !isImageFile(a.file_type, a.file_name));
    return (
      <div key={cat} className="mb-6">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {getAttachmentTitle(cat, en)}
        </h4>
        {imgs.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {imgs.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  const u = signedUrls[a.id];
                  if (u) setPreview({ url: u, name: a.file_name });
                }}
                className="relative h-24 w-24 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
              >
                {signedUrls[a.id] ? (
                  <img src={signedUrls[a.id]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    <ImageIcon size={28} />
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : null}
        {docs.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {docs.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => openPdf(a)}
                  className="flex w-full items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100"
                >
                  <FileText size={18} className="shrink-0 text-red-600" />
                  <span className="truncate">{a.file_name}</span>
                  <span className="ml-auto text-xs text-gray-400">
                    {new Date(a.created_at).toLocaleString(en ? 'en-CA' : 'zh-CN')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  };

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Paperclip className="text-[#1D9E75]" size={22} />
          <h2 className="text-lg font-bold text-gray-900">
            {en ? 'Attachments & site photos' : '附件与现场照片'}
          </h2>
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {en
          ? 'JPG / PNG / WebP / PDF · Max ~15MB · Stored in task-attachments bucket.'
          : '支持 jpg、jpeg、png、webp、pdf，单文件约 15MB 内；存储于 task-attachments。'}
      </p>

      {canUpload ? (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600">
              {en ? 'Category' : '分类'}
            </label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {UPLOAD_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {en ? c.en : c.zh}
                </option>
              ))}
            </select>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#178a66] disabled:opacity-50">
            {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
            {en ? 'Upload' : '上传附件'}
            <input
              type="file"
              accept={ACCEPT_INPUT}
              className="hidden"
              disabled={uploading}
              onChange={(e) => void upload(e)}
            />
          </label>
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">
          {en ? 'Only council / admin / manager / property admin can upload.' : '仅业委会、管理员、物业经理、物业管理员可上传附件。'}
        </p>
      )}

      {msg ? (
        <p
          className={`mt-2 text-sm ${
            /成功|success/i.test(msg) ? 'text-emerald-700' : 'text-red-700'
          }`}
        >
          {msg}
        </p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#1D9E75]" />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">{en ? 'No attachments yet.' : '暂无附件'}</p>
      ) : (
        <div className="mt-6 space-y-2">
          {CATEGORY_ORDER.map((cat) => renderCategoryBlock(cat))}
        </div>
      )}

      {preview ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setPreview(null)}
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <img
            src={preview.url}
            alt={preview.name}
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
