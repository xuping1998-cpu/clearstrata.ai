import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Upload, MessageSquare, Loader2, Send, FileText, X, Bot, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ExistingInvoice {
  id: string;
  file_name: string | null;
  vendor_name: string;
  invoice_number: string | null;
  invoice_date: string;
  total_amount: number;
  document_url: string;
  ai_extracted_data: Record<string, unknown> | null;
  status: string;
}

export function InvoiceInterpreter() {
  const { language } = useLanguage();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const [existingInvoices, setExistingInvoices] = useState<ExistingInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ExistingInvoice | null>(null);
  const [fetchingFile, setFetchingFile] = useState(false);

  useEffect(() => {
    loadExistingInvoices();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadExistingInvoices = async () => {
    setLoadingInvoices(true);
    const { data } = await supabase
      .from('invoices')
      .select('id, file_name, vendor_name, invoice_number, invoice_date, total_amount, document_url, ai_extracted_data, status')
      .order('created_at', { ascending: false });
    setExistingInvoices(data || []);
    setLoadingInvoices(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setSelectedInvoice(null);
    setFile(selected);
    setFileMimeType(selected.type);
    setMessages([]);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setFileBase64(base64);
    };
    reader.readAsDataURL(selected);
  };

  const handleSelectExisting = async (invoice: ExistingInvoice) => {
    setShowPicker(false);
    setSelectedInvoice(invoice);
    setFile(null);
    setMessages([]);
    setFetchingFile(true);

    try {
      const resp = await fetch(invoice.document_url);
      if (resp.ok) {
        const blob = await resp.blob();
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          setFileBase64(base64);
          setFileMimeType(blob.type || 'application/pdf');
          setFetchingFile(false);
        };
        reader.onerror = () => {
          setFileBase64(null);
          setFileMimeType(null);
          setFetchingFile(false);
        };
        reader.readAsDataURL(blob);
      } else {
        setFileBase64(null);
        setFileMimeType(null);
        setFetchingFile(false);
      }
    } catch {
      setFileBase64(null);
      setFileMimeType(null);
      setFetchingFile(false);
    }
  };

  const removeSource = () => {
    setFile(null);
    setSelectedInvoice(null);
    setFileBase64(null);
    setFileMimeType(null);
  };

  const hasSource = !!(file || selectedInvoice);

  const sendQuestion = async (directQuestion?: string) => {
    const text = (directQuestion || question).trim();
    if (!text) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoice-interpreter`;

      const body: Record<string, unknown> = {
        question: text,
        language,
      };

      if (fileBase64) {
        body.fileBase64 = fileBase64;
        body.mimeType = fileMimeType || 'application/pdf';
      }

      if (selectedInvoice?.ai_extracted_data) {
        body.invoiceData = selectedInvoice.ai_extracted_data;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `错误：${data.error}` },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'AI服务连接失败。' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  };

  const suggestedQuestions = [
    '这张发票的主要费用是什么？',
    '这个金额跟市场价相比合理吗？',
    '有没有可疑的项目？',
    '用简单的话解释每一项费用。',
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#1D9E75] to-[#178a66] p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Bot size={28} />
            <h2 className="text-xl font-bold">AI发票解读助手</h2>
          </div>
          <p className="text-green-100 text-sm">
            上传发票或从已有记录中选择，用中文提问。AI会用通俗语言解释费用内容，对比历史数据判断金额是否合理，并指出异常项目。
          </p>
        </div>

        <div className="p-6 space-y-4">
          {!hasSource && !fetchingFile ? (
            <>
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-[#1D9E75] transition-all group">
                <Upload size={28} className="text-gray-400 group-hover:text-[#1D9E75] transition-colors mb-2" />
                <p className="text-sm font-medium text-gray-600 group-hover:text-[#1D9E75]">
                  上传新发票（PDF或图片）
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  点击选择文件
                </p>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                />
              </label>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-gray-400">或</span>
                </div>
              </div>

              <div>
                <button
                  onClick={() => setShowPicker(!showPicker)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-xl hover:border-[#1D9E75] hover:bg-gray-50 transition-all text-sm"
                >
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText size={18} className="text-[#1D9E75]" />
                    <span>从已上传发票中选择</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!loadingInvoices && (
                      <span className="text-xs text-gray-400">
                        {existingInvoices.length} 张发票
                      </span>
                    )}
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${showPicker ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {showPicker && (
                  <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {loadingInvoices ? (
                      <div className="flex items-center justify-center p-6">
                        <Loader2 size={20} className="animate-spin text-[#1D9E75]" />
                      </div>
                    ) : existingInvoices.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-400">
                        暂无已上传的发票
                      </div>
                    ) : (
                      existingInvoices.map((inv) => (
                        <button
                          key={inv.id}
                          onClick={() => handleSelectExisting(inv)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1D9E75]/5 transition-colors border-b border-gray-100 last:border-b-0 text-left"
                        >
                          <FileText size={16} className="text-[#1D9E75] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {inv.vendor_name}
                              </span>
                              {inv.invoice_number && (
                                <span className="text-xs text-gray-400">#{inv.invoice_number}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                              <span>{new Date(inv.invoice_date).toLocaleDateString('zh-CN')}</span>
                              <span className="font-medium">${Number(inv.total_amount).toFixed(2)}</span>
                              {inv.file_name && (
                                <span className="truncate max-w-[150px]">{inv.file_name}</span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </>
          ) : fetchingFile ? (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <Loader2 size={20} className="animate-spin text-blue-600 shrink-0" />
              <span className="text-sm text-blue-700">正在加载发票文件...</span>
            </div>
          ) : file ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <FileText size={24} className="text-[#1D9E75]" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB - 新上传文件
                </p>
              </div>
              <button onClick={removeSource} className="p-1 hover:bg-green-100 rounded-lg transition-colors">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
          ) : selectedInvoice ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <CheckCircle2 size={24} className="text-[#1D9E75] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{selectedInvoice.vendor_name}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  {selectedInvoice.invoice_number && <span>#{selectedInvoice.invoice_number}</span>}
                  <span>{new Date(selectedInvoice.invoice_date).toLocaleDateString('zh-CN')}</span>
                  <span className="font-medium">${Number(selectedInvoice.total_amount).toFixed(2)}</span>
                </div>
                {!fileBase64 && (
                  <p className="text-xs text-amber-600 mt-1">
                    文件无法加载，将使用已提取的数据进行分析
                  </p>
                )}
              </div>
              <button onClick={removeSource} className="p-1 hover:bg-green-100 rounded-lg transition-colors">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="min-h-[300px] max-h-[500px] overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare size={40} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                {hasSource ? '发票已就绪，请提问或点击下方快捷问题' : '请先上传发票或从已有记录中选择'}
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#1D9E75] text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm prose-gray max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>h1]:font-bold [&>h2]:font-semibold [&>h3]:font-semibold [&>h1]:mt-3 [&>h2]:mt-2 [&>h3]:mt-2 [&_li]:my-0.5 [&>blockquote]:border-l-[#1D9E75] [&>blockquote]:text-gray-600 [&_strong]:text-gray-900 [&_code]:bg-gray-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-[#1D9E75]" />
                <span className="text-sm text-gray-500">分析中...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="border-t border-gray-200 px-4 pt-3 pb-2">
          <div className="flex flex-wrap gap-2 mb-3">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendQuestion(q)}
                disabled={loading || (!hasSource && !fileBase64)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                  hasSource
                    ? 'bg-white border-gray-200 text-gray-700 hover:bg-[#1D9E75]/5 hover:text-[#1D9E75] hover:border-[#1D9E75]/30'
                    : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                }`}
              >
                {q}
              </button>
            ))}
            {!hasSource && (
              <span className="text-xs text-gray-400 self-center ml-1">
                -- 请先选择发票
              </span>
            )}
          </div>
          <div className="flex items-end gap-3">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="关于这张发票，您想了解什么？"
              rows={2}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent resize-none text-sm"
            />
            <button
              onClick={() => sendQuestion()}
              disabled={loading || !question.trim()}
              className="p-3 bg-[#1D9E75] text-white rounded-xl hover:bg-[#178a66] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
