import { useState, useEffect, useCallback } from 'react';
import { FileText, Upload, AlertCircle, ExternalLink, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';
import { fetchMeetingSupportingDocuments } from '@/features/meetings/meetingDocumentsRead';

interface MeetingDocument {
  id: string;
  meeting_id: string;
  document_type: string;
  title_en: string;
  title_zh?: string;
  document_url: string;
  uploaded_by: string;
  uploaded_at: string;
  file_size_bytes?: number;
  mime_type?: string;
}

interface Props {
  meetingId: string;
  isCouncil: boolean;
  /** Parent may re-fetch derived state (e.g. meeting archive 02 list). */
  onDocumentsChanged?: () => void;
  /** Optional section heading (default: Documents / 会议文件). */
  titleEn?: string;
  titleZh?: string;
  /** When true, omit title row — use inside a modal that already has a heading (upload bar still shown for council). */
  omitOuterTitle?: boolean;
}

const docTypeLabels: Record<string, Record<'en' | 'zh', string>> = {
  agenda: { en: 'Agenda', zh: '议程' },
  background: { en: 'Background', zh: '背景资料' },
  minutes: { en: 'Minutes', zh: '会议纪要' },
  report: { en: 'Report', zh: '报告' },
  other: { en: 'Other', zh: '其他' },
};

export function MeetingDocumentsSection({
  meetingId,
  isCouncil,
  onDocumentsChanged,
  titleEn,
  titleZh,
  omitOuterTitle = false,
}: Props) {
  const { currentPropertyId } = useProperty();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const l = language === 'en';
  const mt = (en: string | undefined, zh: string | undefined) => {
    if (l) return en || zh || '';
    return zh || en || '';
  };
  const [documents, setDocuments] = useState<MeetingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newDoc, setNewDoc] = useState({
    document_type: 'agenda',
    title_en: '',
    title_zh: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!currentPropertyId) {
      return;
    }
    try {
      setLoading(true);
      const { rows, error } = await fetchMeetingSupportingDocuments(currentPropertyId, meetingId);
      if (error) throw error;
      setDocuments(rows as MeetingDocument[]);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }, [meetingId, currentPropertyId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const uploadDocument = async () => {
    if (!user || !currentPropertyId || !selectedFile || !newDoc.title_en) {
      setUploadError(t('doc_fill_title_file'));
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `meetings/${meetingId}/${Date.now()}.${fileExt}`;

      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (storageError) {
        setUploadError(l ? `Upload failed: ${storageError.message}` : `上传失败：${storageError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

      const {
        data: authData,
      } = await supabase.auth.getUser();

      console.log('MEETING DOC DEBUG', {
        authUser: authData?.user?.email,
        authUid: authData?.user?.id,
        currentPropertyId,
        meetingId,
        insertPayload: {
          property_id: currentPropertyId,
          meeting_id: meetingId,
          document_type: newDoc.document_type,
          title_en: newDoc.title_en || null,
          title_zh: newDoc.title_zh || null,
          uploaded_by: authData?.user?.id,
        },
      });

      const { data, error } = await supabase
        .from('meeting_documents')
        .insert({
          property_id: currentPropertyId,
          meeting_id: meetingId,
          document_type: newDoc.document_type,
          title_en: newDoc.title_en,
          title_zh: newDoc.title_zh || null,
          document_url: urlData.publicUrl,
          uploaded_by: user.id,
          file_size_bytes: selectedFile.size,
          mime_type: selectedFile.type,
        })
        .select();

      if (error) {
        setUploadError(l ? `Save failed: ${error.message}` : `保存失败：${error.message}`);
        return;
      }
      if (!data || data.length === 0) {
        setUploadError(t('doc_save_denied'));
        return;
      }

      setShowUploadForm(false);
      setNewDoc({ document_type: 'agenda', title_en: '', title_zh: '' });
      setSelectedFile(null);
      await loadDocuments();
      onDocumentsChanged?.();
    } catch (error: any) {
      setUploadError(
        l
          ? `Upload failed: ${error?.message || 'Unknown error'}`
          : `上传失败：${error?.message || '未知错误'}`,
      );
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const deleteDocument = async (doc: MeetingDocument) => {
    if (!currentPropertyId) return;
    setDeletingId(doc.id);
    try {
      const urlParts = doc.document_url.split('/documents/');
      if (urlParts.length > 1) {
        const storagePath = decodeURIComponent(urlParts[urlParts.length - 1]);
        await supabase.storage.from('documents').remove([storagePath]);
      }

      const { error } = await supabase
        .from('meeting_documents')
        .delete()
        .eq('id', doc.id)
        .eq('property_id', currentPropertyId);

      if (error) throw error;
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      onDocumentsChanged?.();
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-clearstrata-ui-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const uploadTriggerButton =
    isCouncil && !showUploadForm ? (
      <button
        type="button"
        onClick={() => setShowUploadForm(true)}
        className="flex items-center gap-1.5 text-sm bg-clearstrata-ui-primary text-white px-3 py-1.5 rounded-lg hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive transition-colors"
      >
        <Upload size={16} />
        {l ? 'Upload' : '上传文件'}
      </button>
    ) : null;

  return (
    <div>
      {omitOuterTitle ? (
        uploadTriggerButton ? <div className="mb-3 flex justify-end">{uploadTriggerButton}</div> : null
      ) : (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {l
              ? `${titleEn ?? 'Documents'} (${documents.length})`
              : `${titleZh ?? '会议文件'} (${documents.length})`}
          </h3>
          {uploadTriggerButton}
        </div>
      )}

      {showUploadForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">{l ? 'Upload file' : '上传文件'}</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{l ? 'Type' : '文件类型'}</label>
              <select
                value={newDoc.document_type}
                onChange={(e) => setNewDoc({ ...newDoc, document_type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent"
              >
                <option value="agenda">{docTypeLabels.agenda[language]}</option>
                <option value="background">{docTypeLabels.background[language]}</option>
                <option value="minutes">{docTypeLabels.minutes[language]}</option>
                <option value="report">{docTypeLabels.report[language]}</option>
                <option value="other">{docTypeLabels.other[language]}</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l ? 'Title (English) *' : '标题 (English) *'}</label>
                <input
                  type="text"
                  value={newDoc.title_en}
                  onChange={(e) => setNewDoc({ ...newDoc, title_en: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l ? 'Title (Chinese)' : '标题 (中文)'}</label>
                <input
                  type="text"
                  value={newDoc.title_zh}
                  onChange={(e) => setNewDoc({ ...newDoc, title_zh: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{l ? 'File *' : '选择文件 *'}</label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-clearstrata-ui-primary/10 file:text-clearstrata-ui-primary hover:file:bg-clearstrata-ui-primary/20"
              />
            </div>

            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">{uploadError}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={uploadDocument}
                disabled={uploading}
                className="bg-clearstrata-ui-primary text-white px-4 py-2 text-sm rounded-lg hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {uploading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {uploading ? (l ? 'Uploading...' : '上传中...') : (l ? 'Upload' : '确认上传')}
              </button>
              <button
                onClick={() => { setShowUploadForm(false); setUploadError(null); }}
                className="bg-gray-200 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-300 transition-colors"
              >
                {l ? 'Cancel' : '取消'}
              </button>
            </div>
          </div>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-500">{l ? 'No documents yet' : '暂无文件'}</p>
          {isCouncil && (
            <p className="text-sm text-gray-400 mt-1">{l ? 'Click "Upload" to add meeting documents' : '点击"上传文件"添加会议相关文件'}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900 truncate">
                  {mt(doc.title_en, doc.title_zh)}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-0.5 rounded">
                    {docTypeLabels[doc.document_type]?.[language] || doc.document_type}
                  </span>
                  {doc.file_size_bytes && <span>{formatFileSize(doc.file_size_bytes)}</span>}
                  <span>{new Date(doc.uploaded_at).toLocaleDateString(l ? 'en-US' : 'zh-CN')}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={doc.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-clearstrata-ui-primary hover:text-clearstrata-ui-primaryHover p-2 rounded-lg hover:bg-clearstrata-ui-primary/10 transition-colors"
                  title={l ? 'Open file' : '查看文件'}
                >
                  <ExternalLink size={18} />
                </a>
                {confirmDeleteId === doc.id ? (
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      onClick={() => deleteDocument(doc)}
                      disabled={deletingId === doc.id}
                      className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {deletingId === doc.id ? (l ? 'Deleting...' : '删除中...') : (l ? 'Confirm' : '确认')}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs bg-gray-200 text-gray-700 px-2.5 py-1 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      {l ? 'Cancel' : '取消'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(doc.id)}
                    className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title={l ? 'Delete file' : '删除文件'}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
