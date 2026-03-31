import { supabase } from './supabase';

const MAX_BYTES = 10 * 1024 * 1024;

/** Allowed extensions: pdf, word, excel, jpg/png only (per product spec). */
const EXT_OK = /\.(pdf|doc|docx|xls|xlsx|jpe?g|png)$/i;

function extensionFromFileName(name: string) {
  const i = name.lastIndexOf('.');
  if (i < 0) return '';
  const ext = name.slice(i).toLowerCase();
  if (ext.length > 15 || !/^\.[a-z0-9]+$/i.test(ext)) return '';
  return ext;
}

/** Path inside bucket `notifications` (no bucket prefix). */
export function buildAnnouncementStoragePath(userId: string, originalName: string) {
  const ext = extensionFromFileName(originalName) || '.bin';
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `announcements/${userId}/${id}${ext}`;
}

export function publicUrlToStoragePath(publicUrl: string): string | null {
  const marker = '/object/public/notifications/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const rest = publicUrl.slice(idx + marker.length).split('?')[0];
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}

export function validateNoticeAttachmentFile(file: File): string | null {
  if (file.size > MAX_BYTES) return 'FILE_TOO_LARGE';
  if (!EXT_OK.test(file.name)) return 'FILE_TYPE';
  return null;
}

/**
 * Upload to `notifications` bucket with XMLHttpRequest for real upload progress.
 */
export async function uploadNotificationAttachment(
  file: File,
  storagePath: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('NOT_SIGNED_IN');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '');
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const objectPath = `notifications/${storagePath.replace(/^\/+/, '')}`;
  const url = `${supabaseUrl}/storage/v1/object/${objectPath}`;

  const formData = new FormData();
  formData.append('cacheControl', '3600');
  formData.append('', file, file.name);

  onProgress(0);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        onProgress(Math.min(99, Math.round((ev.loaded / ev.total) * 100)));
      }
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      let message = xhr.statusText || 'Upload failed';
      try {
        const j = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        message = j.message || j.error || message;
      } catch {
        /* ignore */
      }
      reject(new Error(message));
    });
    xhr.addEventListener('error', () => reject(new Error('NETWORK_ERROR')));
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('apikey', anonKey);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.send(formData);
  });
}

export function getNotificationAttachmentPublicUrl(storagePath: string) {
  const { data } = supabase.storage.from('notifications').getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function removeNotificationStorageObjects(paths: string[]): Promise<void> {
  const cleaned = paths.filter(Boolean);
  if (cleaned.length === 0) return;
  const { error } = await supabase.storage.from('notifications').remove(cleaned);
  if (error) console.error('removeNotificationStorageObjects', error);
}
