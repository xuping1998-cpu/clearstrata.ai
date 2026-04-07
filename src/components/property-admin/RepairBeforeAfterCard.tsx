import { FileText } from 'lucide-react';
import type { TaskAttachmentRow } from './TaskAttachmentsSection';
import { isImageFile } from '../../lib/taskAttachmentUtils';

type Props = {
  beforeRow: TaskAttachmentRow;
  afterRow: TaskAttachmentRow;
  beforeUrl?: string;
  afterUrl?: string;
  en: boolean;
  onPreview: (url: string, name: string) => void;
};

export function RepairBeforeAfterCard({
  beforeRow,
  afterRow,
  beforeUrl,
  afterUrl,
  en,
  onPreview,
}: Props) {
  const fmt = (iso: string) => new Date(iso).toLocaleString(en ? 'en-CA' : 'zh-CN');

  const renderSide = (row: TaskAttachmentRow, url: string | undefined, label: string) => {
    const img = isImageFile(row.file_type, row.file_name);
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="text-center text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
        <button
          type="button"
          onClick={() => {
            if (url) {
              if (img) onPreview(url, row.file_name);
              else window.open(url, '_blank', 'noopener,noreferrer');
            }
          }}
          disabled={!url}
          className="group relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1D9E75] disabled:opacity-50"
        >
          {url && img ? (
            <img src={url} alt="" className="h-full w-full object-cover transition group-hover:opacity-95" />
          ) : url && !img ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-gray-500">
              <FileText size={40} className="text-red-600" />
              <span className="line-clamp-2 text-center text-xs">{row.file_name}</span>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-gray-400">—</div>
          )}
        </button>
        <p className="text-center text-[11px] text-gray-400">{fmt(row.created_at)}</p>
      </div>
    );
  };

  return (
    <div className="mt-6 rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">{en ? 'Before & after repair' : '维修前后对比'}</h2>
      <p className="mt-1 text-xs text-gray-500">
        {en ? 'First uploaded before and after photos for this task.' : '本任务首张维修前、首张维修后附件对比。'}
      </p>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-6">
        {renderSide(beforeRow, beforeUrl, en ? 'Before' : '维修前')}
        <div className="hidden w-px shrink-0 bg-gray-200 sm:block" aria-hidden />
        {renderSide(afterRow, afterUrl, en ? 'After' : '维修后')}
      </div>
    </div>
  );
}
