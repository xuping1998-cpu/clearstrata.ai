import { useState, useEffect } from 'react';
import { FileText, Upload, Download, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Document {
  id: string;
  name: string;
  description: string;
  file_path: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
  uploader?: {
    full_name_en: string;
  };
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export function FormsTab() {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  const isCouncil = profile?.role === 'council';

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    const { data } = await supabase
      .from('owner_documents')
      .select(`*, uploader:profiles!owner_documents_uploaded_by_fkey(full_name_en)`)
      .order('created_at', { ascending: false });
    setDocuments(data || []);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `owner-forms/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('owner_documents')
        .insert({
          name: file.name,
          description: '',
          file_path: filePath,
          file_size: file.size,
          uploaded_by: profile.id,
        });

      if (dbError) throw dbError;

      await loadDocuments();
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      alert(`${language === 'en' ? 'Failed to upload document: ' : '上传文档失败：'}${errorMsg}`);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert(language === 'en' ? 'Failed to download document.' : '下载文档失败。');
    }
  };

  const deleteDocument = async (docId: string, filePath: string) => {
    if (!confirm(language === 'en' ? 'Are you sure you want to delete this document?' : '确定要删除此文档吗？')) {
      return;
    }
    try {
      await supabase.storage.from('documents').remove([filePath]);
      await supabase.from('owner_documents').delete().eq('id', docId);
      await loadDocuments();
    } catch {
      alert(language === 'en' ? 'Failed to delete document.' : '删除文档失败。');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {language === 'en' ? 'Documents & Forms' : '文档与表格'}
          </h2>
          <p className="text-gray-600">
            {language === 'en'
              ? 'Upload, access and download important strata documents'
              : '上传、访问和下载重要的物业文档'}
          </p>
        </div>
        <div>
          <button
            onClick={(e) => {
              e.preventDefault();
              (document.getElementById('document-upload-input') as HTMLInputElement)?.click();
            }}
            disabled={uploading}
            type="button"
            className={`flex items-center gap-2 px-4 py-2 bg-[#1D9E75] text-white rounded-lg transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#178a66]'}`}
          >
            <Upload size={20} />
            {uploading
              ? (language === 'en' ? 'Uploading...' : '上传中...')
              : (language === 'en' ? 'Upload Document' : '上传文档')}
          </button>
          <input
            type="file"
            id="document-upload-input"
            onChange={handleFileUpload}
            disabled={uploading}
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          />
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>{language === 'en' ? 'No documents uploaded yet' : '暂无上传的文档'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#1D9E75] hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="bg-blue-100 text-blue-600 p-2 rounded-lg flex-shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1 truncate">{doc.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>-</span>
                      <span>{new Date(doc.created_at).toLocaleDateString(language === 'en' ? 'en-CA' : 'zh-CN')}</span>
                      {doc.uploader && (
                        <>
                          <span>-</span>
                          <span className="truncate">{doc.uploader.full_name_en}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => downloadDocument(doc)}
                    className="p-2 text-[#1D9E75] hover:bg-green-50 rounded-lg transition-colors"
                    title={language === 'en' ? 'Download' : '下载'}
                  >
                    <Download size={18} />
                  </button>
                  {isCouncil && (
                    <button
                      onClick={() => deleteDocument(doc.id, doc.file_path)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={language === 'en' ? 'Delete' : '删除'}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
