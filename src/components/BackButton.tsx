import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function BackButton() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <button
      onClick={() => navigate('/')}
      className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
    >
      <ArrowLeft size={20} />
      {language === 'en' ? 'Back to Dashboard' : '返回仪表板'}
    </button>
  );
}
