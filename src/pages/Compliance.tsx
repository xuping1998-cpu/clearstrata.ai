import { useState, useEffect } from 'react';
import { Plus, FileText, AlertTriangle, CheckCircle, X, Upload, Loader2, MessageCircle, Send, Trash2, ChevronDown, ChevronUp, Pencil, ExternalLink } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';
import { BackButton } from '../components/BackButton';
import { ComplianceContractSummaryCard } from '../components/compliance/ComplianceContractSummaryCard';
import {
  ComplianceContractEditModal,
  type ContractEditFormState,
} from '../components/compliance/ComplianceContractEditModal';
import {
  COMPLIANCE_CONTRACT_TYPE_OPTIONS,
  getContractTypeLabel,
  type ComplianceContractType,
} from '../lib/compliance/complianceContractType';
import {
  buildContractDescriptionZh,
  CONTRACT_STATUS_BADGE_CLASS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_SUMMARY_FIELD_LABELS,
  contractStatusToDocStatus,
  EMPTY_COMPLIANCE_CONTRACT_META,
  normalizeComplianceContractMeta,
  parseContractDescription,
  resolveContractStatus,
  suggestContractStatus,
  type ComplianceContractMeta,
  type ComplianceContractStatus,
  type ContractSummaryFieldKey,
} from '../lib/compliance/complianceContractMeta';

interface ComplianceDoc {
  id: string;
  title_en: string;
  title_zh?: string;
  category: string;
  description_en?: string;
  description_zh?: string;
  expiry_date?: string;
  status: string;
  document_url?: string;
  created_at: string;
  uploaded_by?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const DOC_CATEGORIES = [
  { value: 'contracts', label: { en: 'Contracts', zh: '合同' } },
  { value: 'insurance', label: { en: 'Insurance', zh: '保险' } },
  { value: 'bylaw', label: { en: 'Bylaws', zh: '章程' } },
  { value: 'financial', label: { en: 'Engineering Reports', zh: '工程报告' } },
  { value: 'safety', label: { en: 'Safety', zh: '安全' } },
  { value: 'legal', label: { en: 'Compliance', zh: '法规文件' } },
  { value: 'meeting_archive', label: { en: 'Meeting Archives', zh: '会议存档' } },
  { value: 'other', label: { en: 'Others', zh: '其他' } },
] as const;

function normalizeDocCategory(category: string): string {
  if (category === 'contract') return 'contracts';
  return category;
}

function isContractDocCategory(category: string): boolean {
  return normalizeDocCategory(category) === 'contracts';
}

export function Compliance() {
  const { language, t } = useLanguage();
  const l = language === 'en';
  const { profile } = useAuth();
  const { isDemoMode } = useProperty();

  const [docs, setDocs] = useState<ComplianceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newDoc, setNewDoc] = useState({
    title_en: '',
    title_zh: '',
    category: '',
    contract_type: '' as ComplianceContractType | '',
    description_en: '',
    description_zh: '',
    expiry_date: '',
  });
  const [showAiChat, setShowAiChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [contractSummary, setContractSummary] = useState<ComplianceContractMeta>(
    () => ({ ...EMPTY_COMPLIANCE_CONTRACT_META }),
  );
  const [showContractSummaryForm, setShowContractSummaryForm] = useState(false);
  const [editingContractDoc, setEditingContractDoc] = useState<ComplianceDoc | null>(null);
  const [savingContractEdit, setSavingContractEdit] = useState(false);

  const resetContractSummaryForm = () => {
    setContractSummary({ ...EMPTY_COMPLIANCE_CONTRACT_META });
    setShowContractSummaryForm(false);
  };

  const patchContractSummary = (key: ContractSummaryFieldKey, value: string) => {
    setContractSummary((prev) => ({ ...prev, [key]: value }));
  };

  const loadDocs = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('compliance_docs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocs(data || []);
    } catch (error) {
      console.error('Error loading compliance docs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDemoMode) return;
    loadDocs();
  }, [profile, isDemoMode]);

  const compressImage = async (file: File, quality: number = 0.6, maxDimension: number = 1600): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize if too large
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const showCompressionHelp = (fileType: string, currentSize: number) => {
    const sizeMB = (currentSize / 1024 / 1024).toFixed(2);

    let helpText = '';

    if (fileType.startsWith('image/')) {
      helpText = language === 'zh'
        ? `图片文件太大（${sizeMB}MB），无法压缩到 50MB 以下！\n\n建议：\n\n方案1：使用专业图片压缩工具\n• TinyPNG (https://tinypng.com)\n• Compressor.io (https://compressor.io)\n• ImageOptim (桌面应用，推荐)\n\n方案2：转换为 PDF 格式\n• 图片转 PDF 可以大幅减小文件大小\n• 使用 iLovePDF: https://www.ilovepdf.com/zh-cn/jpg_to_pdf\n\n方案3：降低分辨率\n• 使用 Photoshop、GIMP 等工具\n• 将分辨率降至 1920x1080 或更低\n• 保存为 JPEG 格式，质量设为 60-70%\n\n方案4：分割文件\n• 如果是多页文档，考虑分成多个文件上传`
        : `Image file too large (${sizeMB}MB), cannot compress below 50MB!\n\nSuggestions:\n\nOption 1: Use professional image compression\n• TinyPNG (https://tinypng.com)\n• Compressor.io (https://compressor.io)\n• ImageOptim (desktop app, recommended)\n\nOption 2: Convert to PDF format\n• Image to PDF can significantly reduce size\n• Use iLovePDF: https://www.ilovepdf.com/jpg_to_pdf\n\nOption 3: Reduce resolution\n• Use Photoshop, GIMP, etc.\n• Lower resolution to 1920x1080 or less\n• Save as JPEG with 60-70% quality\n\nOption 4: Split the file\n• If multi-page document, upload as separate files`;
    } else {
      helpText = language === 'zh'
        ? `文件超过 50MB 限制（当前：${sizeMB}MB）！\n\n推荐的在线压缩工具：\n\n1. iLovePDF (https://www.ilovepdf.com/zh-cn/compress_pdf)\n   - 免费、快速、安全\n   - 支持批量压缩\n\n2. Smallpdf (https://smallpdf.com/cn/compress-pdf)\n   - 高质量压缩\n   - 保护文档质量\n\n3. PDF24 Tools (https://tools.pdf24.org/zh/compress-pdf)\n   - 完全免费\n   - 本地处理，更安全\n\n使用步骤：\n1. 访问以上任一网站\n2. 上传您的文件\n3. 选择"强压缩"模式\n4. 下载压缩后的文件\n5. 返回这里重新上传`
        : `File exceeds 50MB limit (current: ${sizeMB}MB)!\n\nRecommended online compression tools:\n\n1. iLovePDF (https://www.ilovepdf.com/compress_pdf)\n   - Free, fast, secure\n   - Batch compression support\n\n2. Smallpdf (https://smallpdf.com/compress-pdf)\n   - High-quality compression\n   - Maintains document quality\n\n3. PDF24 Tools (https://tools.pdf24.org/en/compress-pdf)\n   - Completely free\n   - Local processing for security\n\nSteps:\n1. Visit any website above\n2. Upload your file\n3. Select "Strong compression"\n4. Download compressed file\n5. Return here to upload`;
    }

    alert(helpText);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Compliance file select triggered', e.target.files);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sizeMB = file.size / 1024 / 1024;
      console.log('File selected:', file.name, 'Size:', sizeMB.toFixed(2), 'MB');

      setSelectedFile(file);

      if (file.size > 50 * 1024 * 1024) {
        const isImage = file.type.startsWith('image/');

        if (isImage) {
          alert(language === 'zh'
            ? `注意：此图片文件为 ${sizeMB.toFixed(2)}MB，超过 50MB 限制。\n\n系统会尝试自动压缩，但可能无法达到要求。\n\n如果上传失败，请使用外部工具压缩后再上传。`
            : `Warning: This image is ${sizeMB.toFixed(2)}MB, exceeding the 50MB limit.\n\nThe system will attempt automatic compression, but may not succeed.\n\nIf upload fails, please use external tools to compress before uploading.`
          );
        } else {
          alert(language === 'zh'
            ? `警告：此文件为 ${sizeMB.toFixed(2)}MB，超过 50MB 限制。\n\n请使用在线压缩工具压缩后再上传。`
            : `Warning: This file is ${sizeMB.toFixed(2)}MB, exceeding the 50MB limit.\n\nPlease compress it using online tools before uploading.`
          );
        }
      } else if (file.type.startsWith('image/') && file.size > 10 * 1024 * 1024) {
        console.log(`Large image selected: ${sizeMB.toFixed(2)}MB - will be automatically compressed`);
      }
    }
  };

  const handleUpload = async () => {
    if (!profile || !selectedFile) {
      alert(language === 'zh' ? '请选择文件' : 'Please select a file');
      return;
    }

    if (!newDoc.title_zh.trim()) {
      alert(language === 'zh' ? '请输入文档标题' : 'Please enter document title');
      return;
    }

    if (!newDoc.category) {
      alert(language === 'zh' ? '请选择类别' : 'Please select a category');
      return;
    }

    if (newDoc.category === 'contracts' && !newDoc.contract_type) {
      alert(language === 'zh' ? '请选择合同类型' : 'Please select a contract type');
      return;
    }

    setUploading(true);
    try {
      let fileToUpload = selectedFile;
      const maxSize = 50 * 1024 * 1024;
      const isImage = selectedFile.type.startsWith('image/');

      console.log('Initial file size:', selectedFile.size, 'bytes (', (selectedFile.size / 1024 / 1024).toFixed(2), 'MB)');

      if (selectedFile.size > maxSize) {
        console.log('File exceeds 50MB limit');

        if (isImage) {
          console.log('Attempting aggressive image compression...');

          try {
            const attempts = [
              { quality: 0.3, size: 1200, label: '1st' },
              { quality: 0.2, size: 1000, label: '2nd' },
              { quality: 0.15, size: 800, label: '3rd' },
              { quality: 0.1, size: 600, label: '4th' },
              { quality: 0.05, size: 400, label: '5th' },
            ];

            for (const attempt of attempts) {
              fileToUpload = await compressImage(selectedFile, attempt.quality, attempt.size);
              console.log(`${attempt.label} compression (quality=${attempt.quality}, size=${attempt.size}):`,
                fileToUpload.size, 'bytes (', (fileToUpload.size / 1024 / 1024).toFixed(2), 'MB)');

              if (fileToUpload.size <= maxSize) {
                alert(language === 'zh'
                  ? `图片已压缩：${(selectedFile.size / 1024 / 1024).toFixed(2)}MB → ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`
                  : `Image compressed: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB → ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`
                );
                break;
              }
            }

            if (fileToUpload.size > maxSize) {
              console.log('Still exceeds limit after all compression attempts');
              showCompressionHelp(selectedFile.type, fileToUpload.size);
              setUploading(false);
              return;
            }
          } catch (compressError) {
            console.error('Compression error:', compressError);
            showCompressionHelp(selectedFile.type, selectedFile.size);
            setUploading(false);
            return;
          }
        } else {
          showCompressionHelp(selectedFile.type, selectedFile.size);
          setUploading(false);
          return;
        }
      } else if (isImage && selectedFile.size > 5 * 1024 * 1024) {
        console.log('Compressing image for better performance...');
        try {
          fileToUpload = await compressImage(selectedFile, 0.7, 1600);
          console.log('Compressed from', selectedFile.size, 'to', fileToUpload.size);
        } catch (compressError) {
          console.error('Compression error (non-critical):', compressError);
        }
      }

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `compliance/${fileName}`;

      console.log('Uploading file:', filePath);

      console.log('File size:', fileToUpload.size, 'bytes (', (fileToUpload.size / 1024 / 1024).toFixed(2), 'MB)');
      console.log('File type:', fileToUpload.type);

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('documents')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        });

      console.log('Upload response:', { uploadError, uploadData });

      if (uploadError) {
        console.error('Upload error details:', {
          message: uploadError.message,
          error: uploadError,
        });

        let errorMessage = language === 'zh' ? '上传失败：' : 'Upload failed: ';
        if (uploadError.message.includes('row-level security')) {
          errorMessage += language === 'zh' ? '权限不足' : 'Permission denied';
        } else if (uploadError.message.includes('size')) {
          errorMessage += language === 'zh' ? '文件太大' : 'File too large';
        } else if (uploadError.message.includes('duplicate')) {
          errorMessage += language === 'zh' ? '文件已存在' : 'File already exists';
        } else {
          errorMessage += uploadError.message;
        }

        alert(errorMessage);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      console.log('File uploaded, public URL:', publicUrl);

      const expiryDate = newDoc.expiry_date || null;
      let status = 'valid';

      if (expiryDate) {
        const daysUntilExpiry = Math.floor(
          (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry < 0) {
          status = 'expired';
        } else if (daysUntilExpiry <= 30) {
          status = 'expiring';
        }
      }

      const isContractUpload = newDoc.category === 'contracts';
      const contractMetaForUpload = isContractUpload
        ? normalizeComplianceContractMeta({
            ...contractSummary,
            contractType: newDoc.contract_type || contractSummary.contractType,
          })
        : null;
      const contractLedgerStatus = isContractUpload
        ? suggestContractStatus(contractMetaForUpload ?? {})
        : null;

      const descriptionZh = isContractUpload
        ? buildContractDescriptionZh({
            userDescription: newDoc.description_zh.trim() || null,
            contractType: newDoc.contract_type || null,
            meta: {
              ...contractMetaForUpload!,
              status: contractLedgerStatus!,
            },
          })
        : newDoc.description_zh.trim() || null;

      const docStatus = isContractUpload && contractLedgerStatus
        ? contractStatusToDocStatus(contractLedgerStatus)
        : status;

      const { error: dbError } = await supabase
        .from('compliance_docs')
        .insert({
          title_en: newDoc.title_en.trim() || null,
          title_zh: newDoc.title_zh,
          category: newDoc.category,
          description_en: newDoc.description_en.trim() || null,
          description_zh: descriptionZh,
          expiry_date: expiryDate,
          status: docStatus,
          document_url: publicUrl,
          uploaded_by: profile.id,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('Document saved successfully');

      setShowUploadModal(false);
      setSelectedFile(null);
      setNewDoc({
        title_en: '',
        title_zh: '',
        category: '',
        contract_type: '',
        description_en: '',
        description_zh: '',
        expiry_date: '',
      });
      resetContractSummaryForm();
      await loadDocs();
      alert(language === 'zh' ? '上传成功！' : 'Upload successful!');
    } catch (error: unknown) {
      console.error('Error uploading document:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : (() => {
              try {
                return typeof error === 'string' ? error : JSON.stringify(error);
              } catch {
                return String(error);
              }
            })();
      alert(`${language === 'zh' ? '上传失败：' : 'Upload failed: '}${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const normalized = normalizeDocCategory(category);
    const found = DOC_CATEGORIES.find((c) => c.value === normalized);
    if (!found) return category;
    return l ? found.label.en : found.label.zh;
  };

  const handleSaveContractEdit = async (form: ContractEditFormState) => {
    if (!editingContractDoc) return;

    setSavingContractEdit(true);
    try {
      const meta = normalizeComplianceContractMeta({
        ...form.summary,
        contractType: form.contract_type || form.summary.contractType,
        status: form.status,
      });
      const descriptionZh = buildContractDescriptionZh({
        userDescription: form.description_zh.trim() || null,
        contractType: form.contract_type || null,
        meta,
      });

      const { error } = await supabase
        .from('compliance_docs')
        .update({
          title_zh: form.title_zh.trim(),
          title_en: form.title_en.trim() || null,
          description_zh: descriptionZh,
          description_en: form.description_en.trim() || null,
          status: contractStatusToDocStatus(form.status),
        })
        .eq('id', editingContractDoc.id);

      if (error) throw error;

      setEditingContractDoc(null);
      await loadDocs();
    } catch (error) {
      console.error('Error saving contract edit:', error);
      alert(language === 'zh' ? '保存失败，请重试' : 'Failed to save changes. Please try again.');
    } finally {
      setSavingContractEdit(false);
    }
  };

  const getContractStatusBadge = (
    meta: ComplianceContractMeta | null,
    contractType: string | null,
  ): { status: ComplianceContractStatus; label: string; badgeClass: string } => {
    const normalized = normalizeComplianceContractMeta({
      ...(meta ?? {}),
      contractType: meta?.contractType || contractType || '',
    });
    const status = resolveContractStatus(normalized);
    return {
      status,
      label: l ? CONTRACT_STATUS_LABELS[status].en : CONTRACT_STATUS_LABELS[status].zh,
      badgeClass: CONTRACT_STATUS_BADGE_CLASS[status],
    };
  };

  const getStatusInfo = (doc: ComplianceDoc) => {
    if (doc.status === 'expired') {
      return {
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        label: language === 'zh' ? '已过期' : 'Expired',
      };
    }
    if (doc.expiry_date) {
      const daysUntilExpiry = Math.floor(
        (new Date(doc.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry <= 30) {
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          label: language === 'zh' ? '即将到期' : 'Expiring Soon',
        };
      }
    }
    return {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      label: language === 'zh' ? '有效' : 'Valid',
    };
  };

  const filteredDocs = selectedCategory === 'all'
    ? docs
    : docs.filter((doc) => normalizeDocCategory(doc.category) === selectedCategory);

  const categories = [
    { value: 'all', label: { en: 'All', zh: '全部' } },
    ...DOC_CATEGORIES,
  ];

  const stats = {
    total: docs.length,
    valid: docs.filter(d => d.status === 'valid').length,
    expiring: docs.filter(d => d.status === 'expiring').length,
    expired: docs.filter(d => d.status === 'expired').length,
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/legal-assistant`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [...chatMessages, { role: 'user', content: userMessage }],
          language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: language === 'zh'
          ? '抱歉，发生错误。请稍后重试。'
          : 'Sorry, an error occurred. Please try again later.'
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    setDeleting(true);
    try {
      const doc = docs.find(d => d.id === docId);
      if (doc?.document_url) {
        const urlParts = doc.document_url.split('/documents/');
        if (urlParts[1]) {
          await supabase.storage.from('documents').remove([urlParts[1]]);
        }
      }

      const { error } = await supabase
        .from('compliance_docs')
        .delete()
        .eq('id', docId);

      if (error) throw error;
      await loadDocs();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert(language === 'zh' ? '删除失败，请重试' : 'Delete failed, please try again');
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  if (isDemoMode) {
    const en = language === 'en';
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
        <p>
          {en
            ? 'Demo mode: legal & contract documents are hidden. Register to access permitted content.'
            : '演示模式：法规合同文件含管理资料，不在此展示。注册加入后可按权限查看。'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <BackButton />

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('compliance_title')}
          </h1>
          <p className="text-gray-600">
            {l
              ? 'Central registry for service contracts, insurance, bylaws, engineering reports and compliance records.'
              : '集中管理合同、保险、章程、工程报告与法规文件，支撑采购授权与发票审核治理。'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {language === 'zh' ? '总文件' : 'Total Documents'}
                </p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="text-[#1D9E75]" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {language === 'zh' ? '有效' : 'Valid'}
                </p>
                <p className="text-3xl font-bold text-green-600">{stats.valid}</p>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {language === 'zh' ? '即将到期' : 'Expiring'}
                </p>
                <p className="text-3xl font-bold text-orange-600">{stats.expiring}</p>
              </div>
              <AlertTriangle className="text-orange-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {language === 'zh' ? '已过期' : 'Expired'}
                </p>
                <p className="text-3xl font-bold text-red-600">{stats.expired}</p>
              </div>
              <AlertTriangle className="text-red-600" size={32} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-[#1D9E75] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {l ? cat.label.en : cat.label.zh}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowAiChat(true)}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <MessageCircle size={20} />
              {l ? 'AI Legal Assistant' : 'AI 法规助手'}
            </button>
            <button
              onClick={() => {
                setNewDoc((prev) => ({
                  ...prev,
                  category: selectedCategory === 'contracts' ? 'contracts' : prev.category,
                }));
                setShowUploadModal(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178562] transition-colors font-medium"
            >
              <Plus size={20} />
              {l ? 'Upload document' : '上传文件'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1D9E75] mx-auto"></div>
            <p className="text-gray-600 mt-4">{language === 'zh' ? '加载中...' : 'Loading...'}</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">
              {language === 'zh' ? '没有文件' : 'No documents found'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocs.map((doc) => {
              const statusInfo = getStatusInfo(doc);
              const StatusIcon = statusInfo.icon;
              const parsed = parseContractDescription(doc.description_zh);
              const visibleDescriptionZh = parsed.visibleText;
              const visibleDescriptionEn = doc.description_en;
              const isContractDoc = isContractDocCategory(doc.category);
              const contractStatusBadge = isContractDoc
                ? getContractStatusBadge(parsed.meta, parsed.contractType)
                : null;
              const displayTitle = language === 'zh'
                ? (doc.title_zh || doc.title_en)
                : (doc.title_en || doc.title_zh);

              return (
                <div key={doc.id} className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-[#1D9E75] hover:shadow-md transition-shadow relative">
                  {isContractDoc ? (
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                      {doc.document_url ? (
                        <a
                          href={doc.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-[#1D9E75] hover:bg-emerald-50 rounded-lg transition-colors font-medium"
                          title={language === 'zh' ? '查看文件' : 'View file'}
                        >
                          <ExternalLink size={16} />
                          {language === 'zh' ? '查看文件' : 'View file'}
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setEditingContractDoc(doc)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-gray-600 hover:text-[#1D9E75] hover:bg-emerald-50 rounded-lg transition-colors font-medium"
                        title={language === 'zh' ? '编辑合同' : 'Edit contract'}
                      >
                        <Pencil size={16} />
                        {language === 'zh' ? '编辑合同' : 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(doc.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={language === 'zh' ? '删除' : 'Delete'}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(doc.id)}
                      className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={language === 'zh' ? '删除' : 'Delete'}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}

                  <div className={`flex items-start justify-between mb-3 ${isContractDoc ? 'pr-56' : 'pr-10'}`}>
                    <div className="min-w-0 flex-1">
                      {!isContractDoc ? (
                        <div className="flex items-center gap-2">
                          <FileText className="text-[#1D9E75]" size={20} />
                          <span className="text-xs font-semibold text-gray-500 uppercase">
                            {getCategoryLabel(doc.category)}
                          </span>
                        </div>
                      ) : null}
                      <h3 className={`text-lg font-bold text-gray-900 ${isContractDoc ? '' : 'mt-2'}`}>
                        {displayTitle}
                      </h3>
                      {isContractDoc ? (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {parsed.contractType ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800">
                              {getContractTypeLabel(parsed.contractType, l)}
                            </span>
                          ) : null}
                          {contractStatusBadge ? (
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${contractStatusBadge.badgeClass}`}
                            >
                              {contractStatusBadge.label}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {!isContractDoc ? (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bgColor} flex-shrink-0`}>
                        <StatusIcon className={statusInfo.color} size={16} />
                        <span className={`text-sm font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {isContractDoc ? (
                    <ComplianceContractSummaryCard
                      meta={normalizeComplianceContractMeta({
                        ...(parsed.meta ?? {}),
                        contractType: parsed.meta?.contractType || parsed.contractType || '',
                      })}
                      languageEn={l}
                    />
                  ) : null}

                  {(visibleDescriptionEn || visibleDescriptionZh) && (
                    <p className="text-gray-600 mb-4">
                      {l
                        ? (visibleDescriptionEn || visibleDescriptionZh)
                        : (visibleDescriptionZh || visibleDescriptionEn)}
                    </p>
                  )}

                  {!isContractDoc ? (
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      {doc.expiry_date && (
                        <span>
                          {language === 'zh' ? '到期日期: ' : 'Expires: '}
                          {new Date(doc.expiry_date).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')}
                        </span>
                      )}
                      {doc.document_url && (
                        <a
                          href={doc.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1D9E75] hover:underline font-medium"
                        >
                          {language === 'zh' ? '查看文件' : 'View file'}
                        </a>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  {language === 'zh' ? '上传合规文件' : 'Upload Compliance Document'}
                </h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    resetContractSummaryForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'zh' ? '文档标题*' : 'Document Title*'}
                  </label>
                  <input
                    type="text"
                    value={newDoc.title_zh}
                    onChange={(e) => setNewDoc({ ...newDoc, title_zh: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-[#1D9E75] outline-none"
                    placeholder={language === 'zh' ? '请输入文档标题（支持中英文）' : 'Enter document title (Chinese/English supported)'}
                    autoFocus
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'zh' ? '英文标题（可选）' : 'English Title (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={newDoc.title_en}
                    onChange={(e) => setNewDoc({ ...newDoc, title_en: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-[#1D9E75] outline-none"
                    placeholder={language === 'zh' ? '如需要可填写英文标题' : 'Optional English title'}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'zh' ? '类别*' : 'Category*'}
                  </label>
                  <select
                    value={newDoc.category}
                    onChange={(e) =>
                      setNewDoc({
                        ...newDoc,
                        category: e.target.value,
                        contract_type: e.target.value === 'contracts' ? newDoc.contract_type : '',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                    required
                  >
                    <option value="">
                      {l ? '-- Select category --' : '-- 请选择类别 --'}
                    </option>
                    {DOC_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {l ? cat.label.en : cat.label.zh}
                      </option>
                    ))}
                  </select>
                </div>

                {newDoc.category === 'contracts' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {l ? 'Contract type*' : '合同类型*'}
                    </label>
                    <select
                      value={newDoc.contract_type}
                      onChange={(e) => {
                        const ct = e.target.value as ComplianceContractType;
                        setNewDoc({ ...newDoc, contract_type: ct });
                        if (ct) patchContractSummary('contractType', ct);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                      required
                    >
                      <option value="">{l ? '-- Select contract type --' : '-- 请选择合同类型 --'}</option>
                      {COMPLIANCE_CONTRACT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {l ? opt.label.en : opt.label.zh}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {newDoc.category === 'contracts' ? (
                  <div className="rounded-xl border border-sky-200 bg-slate-50/80 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowContractSummaryForm((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-sky-900 hover:bg-sky-50/80 transition-colors"
                    >
                      <span>{l ? 'Contract summary (optional)' : '合同摘要（可选）'}</span>
                      {showContractSummaryForm ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {showContractSummaryForm ? (
                      <div className="px-4 pb-4 pt-1 border-t border-sky-100 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(
                          [
                            'vendorName',
                            'startDate',
                            'endDate',
                            'autoRenewal',
                            'terminationNotice',
                            'fixedFee',
                            'escalationClause',
                            'serviceScope',
                            'extraCharges',
                          ] as ContractSummaryFieldKey[]
                        ).map((key) => {
                          const labels = CONTRACT_SUMMARY_FIELD_LABELS[key];
                          const isWide = key === 'serviceScope' || key === 'extraCharges';
                          const isDate = key === 'startDate' || key === 'endDate';
                          return (
                            <label
                              key={key}
                              className={`block text-sm ${isWide ? 'md:col-span-2' : ''}`}
                            >
                              <span className="font-medium text-gray-700">
                                {l ? labels.en : labels.zh}
                              </span>
                              {isDate ? (
                                <input
                                  type="date"
                                  value={contractSummary[key]}
                                  onChange={(e) => patchContractSummary(key, e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                />
                              ) : key === 'serviceScope' || key === 'extraCharges' || key === 'escalationClause' ? (
                                <textarea
                                  value={contractSummary[key]}
                                  onChange={(e) => patchContractSummary(key, e.target.value)}
                                  rows={2}
                                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={contractSummary[key]}
                                  onChange={(e) => patchContractSummary(key, e.target.value)}
                                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                />
                              )}
                            </label>
                          );
                        })}
                        <p className="md:col-span-2 text-xs text-slate-500 leading-relaxed">
                          {l
                            ? 'Contract type is taken from the required selector above. Summary fields are stored with the document for manual contract ledger tracking.'
                            : '合同类型取自上方必填选项。摘要字段将随文档保存，用于人工建立合同台账。'}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'zh' ? '描述（英文）' : 'Description (English)'}
                  </label>
                  <textarea
                    value={newDoc.description_en}
                    onChange={(e) => setNewDoc({ ...newDoc, description_en: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                    placeholder={language === 'zh' ? '输入英文描述' : 'Enter English description'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'zh' ? '描述（中文）' : 'Description (Chinese)'}
                  </label>
                  <textarea
                    value={newDoc.description_zh}
                    onChange={(e) => setNewDoc({ ...newDoc, description_zh: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                    placeholder={language === 'zh' ? '输入中文描述' : 'Enter Chinese description'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'zh' ? '到期日期' : 'Expiry Date'}
                  </label>
                  <input
                    type="date"
                    value={newDoc.expiry_date}
                    onChange={(e) => setNewDoc({ ...newDoc, expiry_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'zh' ? '文件*' : 'Document*'}
                  </label>
                  <label
                    htmlFor="file-upload"
                    className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#1D9E75] transition-colors cursor-pointer"
                  >
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    />
                    <Upload className="mx-auto text-gray-400 mb-2" size={48} />
                    {selectedFile ? (
                      <>
                        <p className="text-sm text-gray-900 font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          {selectedFile.size > 2000 * 1024 * 1024 && (
                            <span className="text-red-600 ml-2">
                              ({language === 'zh' ? '超过 2GB 限制' : 'Exceeds 2GB limit'})
                            </span>
                          )}
                          {selectedFile.type.startsWith('image/') && selectedFile.size > 1 * 1024 * 1024 && (
                            <span className="text-blue-600 ml-2">
                              ({language === 'zh' ? '将自动压缩' : 'Will be compressed'})
                            </span>
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600 mb-1">
                          {language === 'zh' ? '点击上传文件' : 'Click to upload file'}
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF, DOC, DOCX, XLS, XLSX, JPG, PNG ({language === 'zh' ? '最大 50MB' : 'Max 50MB'})
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {language === 'zh' ? '图片超过 1MB 将自动压缩' : 'Images over 1MB will be auto-compressed'}
                        </p>
                      </>
                    )}
                  </label>
                </div>

                {(!newDoc.title_zh.trim() || !selectedFile) && !uploading && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    {!newDoc.title_zh.trim() && !selectedFile
                      ? (language === 'zh' ? '请填写文档标题并选择文件' : 'Please enter document title and select a file')
                      : !selectedFile
                      ? (language === 'zh' ? '请选择文件' : 'Please select a file')
                      : (language === 'zh' ? '请填写文档标题' : 'Please enter document title')
                    }
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      resetContractSummaryForm();
                    }}
                    disabled={uploading}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {language === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!newDoc.title_zh.trim() || !selectedFile || uploading}
                    className="flex-1 px-6 py-3 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178562] transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {uploading && <Loader2 className="animate-spin" size={20} />}
                    {uploading
                      ? (language === 'zh' ? '处理中...' : 'Processing...')
                      : (language === 'zh' ? '上传' : 'Upload')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ComplianceContractEditModal
          open={editingContractDoc != null}
          doc={editingContractDoc}
          languageEn={l}
          saving={savingContractEdit}
          onClose={() => setEditingContractDoc(null)}
          onSave={handleSaveContractEdit}
        />

        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Trash2 className="text-red-600" size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {language === 'zh' ? '确认删除' : 'Confirm Delete'}
                </h3>
              </div>
              <p className="text-gray-600 mb-6">
                {language === 'zh' ? '确定删除此文件吗？' : 'Are you sure you want to delete this file?'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                >
                  {language === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  onClick={() => handleDeleteDoc(deleteConfirmId)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting && <Loader2 className="animate-spin" size={16} />}
                  {language === 'zh' ? '确定' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAiChat && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full h-[600px] flex flex-col">
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <MessageCircle className="text-white" size={24} />
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      AI法规助手
                    </h2>
                    <p className="text-blue-100 text-sm">
                      {language === 'zh' ? '询问任何法律问题' : 'Ask any legal questions'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAiChat(false)}
                  className="text-white hover:text-blue-100 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="mx-auto text-gray-300 mb-4" size={64} />
                    <p className="text-gray-500 mb-4">
                      {language === 'zh'
                        ? '您好！我是AI法律助手。您可以向我咨询关于物业管理、法规合规、保险等方面的问题。'
                        : 'Hello! I am your AI Legal Assistant. Ask me questions about property management, compliance, insurance, and more.'}
                    </p>
                    <div className="max-w-md mx-auto text-left bg-white rounded-lg p-4 space-y-2">
                      <p className="font-semibold text-gray-700 mb-2">
                        {language === 'zh' ? '示例问题：' : 'Example questions:'}
                      </p>
                      <button
                        onClick={() => setChatInput(language === 'zh'
                          ? '业主委员会会议需要多少人出席才有效？'
                          : 'How many people need to attend a strata meeting for it to be valid?')}
                        className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded transition-colors text-gray-700"
                      >
                        {language === 'zh'
                          ? '• 业主委员会会议需要多少人出席才有效？'
                          : '• How many people need to attend a strata meeting for it to be valid?'}
                      </button>
                      <button
                        onClick={() => setChatInput(language === 'zh'
                          ? '物业保险应该包括哪些内容？'
                          : 'What should strata insurance cover?')}
                        className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded transition-colors text-gray-700"
                      >
                        {language === 'zh'
                          ? '• 物业保险应该包括哪些内容？'
                          : '• What should strata insurance cover?'}
                      </button>
                      <button
                        onClick={() => setChatInput(language === 'zh'
                          ? '如何处理邻里纠纷？'
                          : 'How do I handle a dispute with a neighbor?')}
                        className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded transition-colors text-gray-700"
                      >
                        {language === 'zh'
                          ? '• 如何处理邻里纠纷？'
                          : '• How do I handle a dispute with a neighbor?'}
                      </button>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-800 shadow-sm border border-gray-200'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
                      <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin text-blue-600" size={16} />
                        <span className="text-gray-600">
                          {language === 'zh' ? '思考中...' : 'Thinking...'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder={language === 'zh' ? '输入您的法律问题...' : 'Type your legal question...'}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    disabled={chatLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || chatLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                  >
                    <Send size={20} />
                    {language === 'zh' ? '发送' : 'Send'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {language === 'zh'
                    ? '⚠️ 此信息仅供参考，不构成法律建议。请咨询专业律师获取具体法律意见。'
                    : '⚠️ This is general information only, not legal advice. Consult a qualified lawyer for specific legal advice.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
