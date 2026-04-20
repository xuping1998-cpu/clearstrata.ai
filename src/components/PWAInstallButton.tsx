import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export function PWAInstallButton() {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as NavigatorWithStandalone).standalone === true;

    if (isStandalone) {
      setIsInstallable(false);
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
    setIsInstallable(false);
  };

  if (!isInstallable) {
    return null;
  }

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-2 px-3 py-1.5 bg-clearstrata-ui-primary text-white rounded-lg hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive transition-colors text-sm font-medium"
      title={language === 'en' ? 'Install App' : '安装应用'}
    >
      <Download size={16} />
      <span className="hidden sm:inline">
        {language === 'en' ? 'Install' : '安装'}
      </span>
    </button>
  );
}
