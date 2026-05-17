import { useCallback, useEffect, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';

export const MAX_QUOTE_ATTACHMENTS = 10;

const QUOTE_ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

type AttachmentItem = {
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
}

function isTextInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return (el as HTMLElement).isContentEditable;
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
}: PhotoUploadProps) {
  const { currentPropertyId } = useProperty();
  const { language } = useLanguage();
  const isQuoteAttachments = variant === 'quote_attachments';
  const [uploading, setUploading] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const displayItems: AttachmentItem[] = isQuoteAttachments
    ? attachments
    : uploadedPhotos.map((url, index) => ({
        url,
        name: fileNameFromUrl(url, index),
        isPdf: /\.pdf($|\?)/i.test(url),
      }));

  const attachmentCount = displayItems.length;

  const notifyParent = useCallback(
    (items: AttachmentItem[]) => {
      onPhotosUploaded?.(items.map((a) => a.url));
    },
    [onPhotosUploaded],
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const currentCount = isQuoteAttachments ? attachments.length : uploadedPhotos.length;
      if (currentCount + files.length > maxPhotos) {
        alert(
          language === 'en'
            ? `Maximum ${maxPhotos} attachments allowed`
            : isQuoteAttachments
              ? `最多上传${maxPhotos}个附件`
              : `最多上传${maxPhotos}张照片`,
        );
        return;
      }

      if (isQuoteAttachments) {
        const invalid = files.filter((f) => !isAllowedQuoteAttachment(f));
        if (invalid.length > 0) {
          alert(
            language === 'en'
              ? 'Only image or PDF quote materials are supported.'
              : '仅支持图片或 PDF 报价资料。',
          );
          return;
        }
      }

      setUploading(true);

      try {
        const newItems: AttachmentItem[] = [];

        for (const file of files) {
          if (isQuoteAttachments && !isAllowedQuoteAttachment(file)) continue;

          const fileExt = isPdfFile(file)
            ? 'pdf'
            : (file.name.split('.').pop() || 'bin').toLowerCase();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `procurement-photos/${fileName}`;

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

        if (isQuoteAttachments) {
          setAttachments((prev) => {
            const next = [...prev, ...newItems];
            notifyParent(next);
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
        notifyParent(next);
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
    if (!isQuoteAttachments) return;

    const onPaste = (e: ClipboardEvent) => {
      if (isTextInputFocused()) return;
      const items = e.clipboardData?.items;
      if (!items?.length) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;
        const blob = item.getAsFile();
        if (!blob) continue;
        pastedFiles.push(
          new File([blob], `pasted-quote-screenshot-${Date.now()}.png`, {
            type: blob.type || 'image/png',
          }),
        );
      }

      if (pastedFiles.length === 0) return;
      e.preventDefault();
      void processFiles(pastedFiles);
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [isQuoteAttachments, processFiles]);

  const labelTitle = language === 'en' ? 'Upload Photos' : '上传照片';

  const counterText = isQuoteAttachments
    ? language === 'en'
      ? `Attachments (${attachmentCount}/${maxPhotos})`
      : `附件（${attachmentCount}/${maxPhotos}）`
    : `(${attachmentCount}/${maxPhotos})`;

  const uploadHint = isQuoteAttachments
    ? language === 'en'
      ? 'Click to upload files, or paste a screenshot'
      : '点击上传文件，或直接粘贴截图'
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
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
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
              type="file"
              className="hidden"
              accept={isQuoteAttachments ? 'image/*,.pdf,application/pdf' : 'image/*'}
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>
        )}

        {displayItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {displayItems.map((item, index) => (
              <div key={`${item.url}-${index}`} className="relative group">
                {item.isPdf ? (
                  <div className="w-full h-32 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 px-2">
                    <FileText className="w-10 h-10 text-red-600 shrink-0" />
                    <p className="text-xs text-gray-700 text-center line-clamp-2 break-all" title={item.name}>
                      {item.name}
                    </p>
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">PDF</span>
                  </div>
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
