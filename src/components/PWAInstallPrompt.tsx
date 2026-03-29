import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export function PWAInstallPrompt() {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');

      if (!dismissed || (dismissedTime && Date.now() - parseInt(dismissedTime) > 7 * 24 * 60 * 60 * 1000)) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as NavigatorWithStandalone).standalone === true;

    if (isStandalone) {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 animate-slide-up">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X size={20} />
      </button>

      <div className="flex items-start gap-3">
        <div className="bg-[#1D9E75] rounded-lg p-2">
          <Download className="text-white" size={24} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            {language === 'en' ? 'Install ClearStrata' : '安装 ClearStrata'}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {language === 'en'
              ? 'Install our app for quick access and a better experience'
              : '安装我们的应用程序以快速访问并获得更好的体验'}
          </p>
          <button
            onClick={handleInstall}
            className="w-full px-4 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors font-medium"
          >
            {language === 'en' ? 'Install Now' : '立即安装'}
          </button>
        </div>
      </div>
    </div>
  );
}
