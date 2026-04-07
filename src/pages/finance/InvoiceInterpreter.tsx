import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

// 直接在前端解析 PDF，不依赖任何后端服务
export default function InvoiceInterpreter() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 加载 PDF.js（从 CDN 引入，无需本地安装）
  const loadPdfJs = async () => {
    if (window.pdfjsLib) return window.pdfjsLib;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    await new Promise(resolve => {
      script.onload = resolve;
      document.head.appendChild(script);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    return window.pdfjsLib;
  };

  // 解析 PDF 文本
  const parsePdf = async (file: File): Promise<string> => {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(' ');
    }
    return fullText;
  };

  // 处理文件上传（只在前端解析，不发送到后端）
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage('正在解析 PDF...');

    try {
      // 只在前端解析，不调用后端
      const text = await parsePdf(file);
      setMessage(`解析成功！文本内容：${text.slice(0, 200)}...`);
      alert('解析成功！（内容已打印在控制台）');
      console.log('完整解析结果：', text);
    } catch (err: any) {
      setMessage(`解析失败：${err.message}`);
      alert(`解析失败：${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">发票 AI 识别</h2>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileUpload}
        disabled={loading}
        className="mb-4"
      />
      {loading && <p className="text-blue-500">处理中...</p>}
      {message && <p className="text-gray-700">{message}</p>}
    </div>
  );
}

// 声明全局变量
declare global {
  interface Window {
    pdfjsLib: any;
  }
}