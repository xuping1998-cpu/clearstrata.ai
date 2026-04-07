/** 分组/列表用短标题（中文为主，英文用于 UI） */
export function getAttachmentTitle(category?: string | null, en = false): string {
  const c = (category || 'other').trim() || 'other';
  const zh: Record<string, string> = {
    before_photo: '维修前',
    after_photo: '维修后',
    quote: '报价单',
    invoice: '发票',
    document: '其它文档',
    other: '其它附件',
  };
  const eng: Record<string, string> = {
    before_photo: 'Before repair',
    after_photo: 'After repair',
    quote: 'Quote',
    invoice: 'Invoice',
    document: 'Documents',
    other: 'Other',
  };
  return en ? (eng[c] ?? eng.other) : (zh[c] ?? zh.other);
}

/** 时间线事件标题 */
export function getAttachmentEventTitle(category: string | null | undefined, en: boolean): string {
  const c = (category || 'other').trim() || 'other';
  const zh: Record<string, string> = {
    before_photo: '已上传维修前照片',
    after_photo: '已上传维修后照片',
    quote: '已上传报价单',
    invoice: '已上传发票附件',
    document: '已上传文档附件',
    other: '已上传附件',
  };
  const eng: Record<string, string> = {
    before_photo: 'Uploaded before-repair photo',
    after_photo: 'Uploaded after-repair photo',
    quote: 'Uploaded quote',
    invoice: 'Uploaded invoice attachment',
    document: 'Uploaded document',
    other: 'Uploaded attachment',
  };
  return en ? (eng[c] ?? eng.other) : (zh[c] ?? zh.other);
}

export function isImageFile(fileType?: string | null, fileName?: string): boolean {
  const t = (fileType || '').toLowerCase();
  if (t.startsWith('image/')) return true;
  const ext = (fileName || '').split('.').pop()?.toLowerCase() ?? '';
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
}
