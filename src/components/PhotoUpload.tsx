import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';

export const MAX_QUOTE_ATTACHMENTS = 10;

const QUOTE_TITLE_EXT_RE = /\.(pdf|png|jpe?g|webp|heic|heif)$/i;

/** Strip extension / pasted temp prefix for auto job title from attachment name. */
export function cleanQuoteAttachmentBaseName(fileName: string): string {
  const raw = fileName.trim();
  if (!raw) return '';
  let base = raw.replace(QUOTE_TITLE_EXT_RE, '').trim();
  if (/^pasted-quote-(screenshot|file)-\d+$/i.test(base)) return '';
  return base;
}

const QUOTE_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

export type AttachmentItem = {
  url: string;
  name: string;
  isPdf: boolean;
};

interface PhotoUploadProps {
  jobId?: string;
  photoType: 'request' | 'completion' | 'verification';
  onPhotosUploaded?: (urls: string[]) => void;
  maxPhotos?: number;
  /** `quote_attachments`: images + PDF, paste screenshots, procurement new-job modal. */
  variant?: 'default' | 'quote_attachments';
  /**
   * When false (default for quote_attachments), upload only accumulates pending files.
   * OCR / job creation / vendor search must be triggered by the parent button — never here.
   */
  autoProcess?: boolean;
  /** Quote modal: full attachment list (urls + original display names) whenever items change. */
  onQuoteAttachmentsChange?: (items: AttachmentItem[]) => void;
  /**
   * Optional post-upload hook — only invoked when autoProcess is true.
   * Procurement quote packages must keep autoProcess false.
   */
  onUploadProcess?: (items: AttachmentItem[]) => void | Promise<void>;
}

function isAllowedDefaultImage(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext);
}

function normalizePastedFile(file: File, mimeHint?: string): File {
  const name = file.name?.trim() ?? '';
  const hasRealName =
    name.length > 0 &&
    !/^image\.(png|jpe?g|webp)$/i.test(name) &&
    !/^blob$/i.test(name);
  if (hasRealName) return file;

  const pdf = isPdfFile(file) || (mimeHint || '').toLowerCase() === 'application/pdf';
  const ts = Date.now();
  const synthetic = pdf
    ? `pasted-quote-file-${ts}.pdf`
    : `pasted-quote-screenshot-${ts}.png`;
  return new File([file], synthetic, {
    type: file.type || mimeHint || (pdf ? 'application/pdf' : 'image/png'),
  });
}

function collectClipboardFiles(e: ClipboardEvent, quoteMode: boolean): File[] {
  const cd = e.clipboardData;
  if (!cd) return [];

  const out: File[] = [];

  if (cd.files?.length) {
    for (let i = 0; i < cd.files.length; i++) {
      const f = cd.files[i];
      if (!f) continue;
      if (quoteMode ? isAllowedQuoteAttachment(f) : isAllowedDefaultImage(f)) {
        out.push(normalizePastedFile(f));
      }
    }
    if (out.length > 0) return out;
  }

  for (let i = 0; i < cd.items.length; i++) {
    const item = cd.items[i];
    if (item.kind !== 'file') continue;
    const type = (item.type || '').toLowerCase();
    const allowed = quoteMode
      ? type.startsWith('image/') || type === 'application/pdf'
      : type.startsWith('image/');
    if (!allowed) continue;
    const blob = item.getAsFile();
    if (!blob) continue;
    out.push(normalizePastedFile(blob, item.type));
  }

  return out;
}

function isPdfFile(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return type === 'application/pdf' || ext === 'pdf';
}

function isAllowedQuoteAttachment(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (isPdfFile(file)) return true;
  if (QUOTE_ALLOWED_MIME.has(type)) return true;
  if (type.startsWith('image/')) return true;
  return ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext);
}

function fileNameFromUrl(url: string, index: number): string {
  try {
    const base = url.split('?')[0]?.split('/').pop();
    if (base) return decodeURIComponent(base);
  } catch {
    /* ignore */
  }
  return `attachment-${index + 1}`;
}

export function PhotoUpload({
  jobId,
  photoType,
  onPhotosUploaded,
  maxPhotos = 5,
  variant = 'default',
  autoProcess,
  onQuoteAttachmentsChange,
  onUploadProcess,
}: PhotoUploadProps) {
  const { currentPropertyId } = useProperty();
  const { language } = useLanguage();
  const isQuoteAttachments = variant === 'quote_attachments';
  const shouldAutoProcess = autoProcess ?? !isQuoteAttachments;
  const [uploading, setUploading] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const attachmentsRef = useRef(attachments);
  const uploadedPhotosRef = useRef(uploadedPhotos);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    uploadedPhotosRef.current = uploadedPhotos;
  }, [uploadedPhotos]);

  const displayItems: AttachmentItem[] = isQuoteAttachments
    ? attachments
    : uploadedPhotos.map((url, index) => ({
        url,
        name: fileNameFromUrl(url, index),
        isPdf: /\.pdf($|\?)/i.test(url),
      }));

  const attachmentCount = displayItems.length;

  const publishQuoteAttachments = useCallback(
    (items: AttachmentItem[]) => {
      onPhotosUploaded?.(items.map((a) => a.url));
      onQuoteAttachmentsChange?.(items);
      if (shouldAutoProcess && onUploadProcess) {
        void onUploadProcess(items);
      }
    },
    [onPhotosUploaded, onQuoteAttachmentsChange, onUploadProcess, shouldAutoProcess],
  );

  const notifyParent = useCallback(
    (items: AttachmentItem[]) => {
      if (isQuoteAttachments) {
        publishQuoteAttachments(items);
      } else {
        onPhotosUploaded?.(items.map((a) => a.url));
      }
    },
    [isQuoteAttachments, publishQuoteAttachments, onPhotosUploaded],
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const allowed = isQuoteAttachments
        ? files.filter((f) => isAllowedQuoteAttachment(f))
        : files.filter((f) => isAllowedDefaultImage(f));

      if (allowed.length === 0) {
        if (isQuoteAttachments) {
          alert(
            language === 'en'
              ? 'Only image or PDF quote materials are supported.'
              : '仅支持图片或 PDF 报价资料。',
          );
        }
        return;
      }

      const currentCount = isQuoteAttachments
        ? attachmentsRef.current.length
        : uploadedPhotosRef.current.length;
      const overLimit = currentCount + allowed.length > maxPhotos;

      if (overLimit) {
        alert(
          language === 'en'
            ? `Maximum ${maxPhotos} attachments allowed`
            : isQuoteAttachments
              ? `最多上传${maxPhotos}个附件`
              : `最多上传${maxPhotos}张照片`,
        );
        return;
      }

      setUploading(true);

      try {
        const newItems: AttachmentItem[] = [];

        for (const file of allowed) {
          const fileExt = isPdfFile(file)
            ? 'pdf'
            : (file.name.split('.').pop() || 'bin').toLowerCase();
          const storageName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `procurement-photos/${storageName}`;

          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file, {
              contentType: file.type || (isPdfFile(file) ? 'application/pdf' : undefined),
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from('documents').getPublicUrl(filePath);

          newItems.push({
            url: publicUrl,
            name: file.name,
            isPdf: isPdfFile(file),
          });

          if (jobId && currentPropertyId) {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              await supabase.from('procurement_photos').insert({
                property_id: currentPropertyId,
                job_id: jobId,
                photo_url: publicUrl,
                photo_type: photoType,
                uploaded_by: user.id,
              });
            }
          }
        }

        if (newItems.length === 0) return;

        if (isQuoteAttachments) {
          setAttachments((prev) => {
            const next = [...prev, ...newItems];
            publishQuoteAttachments(next);
            return next;
          });
        } else {
          const newUrls = newItems.map((i) => i.url);
          setUploadedPhotos((prev) => {
            const next = [...prev, ...newUrls];
            notifyParent(
              next.map((url, index) => ({
                url,
                name: fileNameFromUrl(url, index),
                isPdf: /\.pdf($|\?)/i.test(url),
              })),
            );
            return next;
          });
        }
      } catch (error) {
        console.error('Error uploading photos:', error);
        alert(
          language === 'en'
            ? isQuoteAttachments
              ? 'Failed to upload attachments'
              : 'Failed to upload photos'
            : isQuoteAttachments
              ? '附件上传失败'
              : '照片上传失败',
        );
      } finally {
        setUploading(false);
      }
    },
    [
      attachments.length,
      uploadedPhotos.length,
      maxPhotos,
      language,
      isQuoteAttachments,
      jobId,
      currentPropertyId,
      photoType,
      notifyParent,
      publishQuoteAttachments,
    ],
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    await processFiles(files);
  };

  const removeAt = (index: number) => {
    if (isQuoteAttachments) {
      setAttachments((prev) => {
        const next = prev.filter((_, i) => i !== index);
        publishQuoteAttachments(next);
        return next;
      });
    } else {
      setUploadedPhotos((prev) => {
        const next = prev.filter((_, i) => i !== index);
        notifyParent(
          next.map((url, i) => ({
            url,
            name: fileNameFromUrl(url, i),
            isPdf: /\.pdf($|\?)/i.test(url),
          })),
        );
        return next;
      });
    }
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const pastedFiles = collectClipboardFiles(e, isQuoteAttachments);
      if (pastedFiles.length === 0) return;
      e.preventDefault();
      void processFiles(pastedFiles);
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isQuoteAttachments, processFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    if (!isQuoteAttachments) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isQuoteAttachments) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    void processFiles(files);
  };

  const labelTitle = language === 'en' ? 'Upload Photos' : '上传照片';

  const counterText = isQuoteAttachments
    ? language === 'en'
      ? `Attachments (${attachmentCount}/${maxPhotos})`
      : `附件（${attachmentCount}/${maxPhotos}）`
    : `(${attachmentCount}/${maxPhotos})`;

  const uploadHint = isQuoteAttachments
    ? language === 'en'
      ? 'Click to upload, drag files here, or paste screenshot / PDF'
      : '点击上传文件，拖入文件，或直接粘贴截图 / PDF'
    : language === 'en'
      ? 'Click to upload photos'
      : '点击上传照片';

  const helperText = isQuoteAttachments
    ? language === 'en'
      ? 'Screenshots, PDFs, and images supported. You can upload multiple files at once.'
      : '支持截图粘贴、PDF 和图片，可一次上传多个文件。'
    : null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {isQuoteAttachments ? (
          <span>{counterText}</span>
        ) : (
          <>
            {labelTitle}
            <span className="text-gray-500 ml-2">{counterText}</span>
          </>
        )}
      </label>

      {helperText ? <p className="text-xs text-gray-500 mb-2">{helperText}</p> : null}

      <div className="space-y-3">
        {attachmentCount < maxPhotos && (
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              dragOver && isQuoteAttachments
                ? 'border-clearstrata-ui-primary bg-clearstrata-ui-soft/40'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
              {uploading ? (
                <div className="w-8 h-8 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 text-center px-4">{uploadHint}</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={isQuoteAttachments ? 'image/*,.pdf,application/pdf' : 'image/*'}
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </div>
        )}

        {displayItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {displayItems.map((item, index) => (
              <div key={`${item.url}-${index}`} className="relative group">
                {item.isPdf ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-32 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 px-2 hover:border-red-300 hover:bg-red-50/40 transition-colors"
                    title={item.name}
                  >
                    <FileText className="w-10 h-10 text-red-600 shrink-0" />
                    <p className="text-xs text-gray-700 text-center line-clamp-2 break-all underline-offset-2 hover:underline">
                      {item.name}
                    </p>
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">PDF</span>
                  </a>
                ) : (
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-full h-32 object-cover rounded-lg border border-gray-200"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={language === 'en' ? 'Remove attachment' : '删除附件'}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
