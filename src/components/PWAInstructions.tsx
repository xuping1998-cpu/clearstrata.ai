import { Smartphone, Monitor, Share, MoreVertical, Plus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function PWAInstructions() {
  const { language } = useLanguage();

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Smartphone size={20} className="text-[#1D9E75]" />
        {language === 'en' ? 'Install on Mobile' : '在手机上安装'}
      </h3>

      <div className="space-y-6">
        {isIOS && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Smartphone size={16} />
              iOS (iPhone/iPad)
            </div>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-semibold min-w-[20px]">1.</span>
                <span>
                  {language === 'en'
                    ? 'Tap the Share button'
                    : '点击分享按钮'}
                  {' '}
                  <Share size={14} className="inline" />
                  {' '}
                  {language === 'en'
                    ? 'at the bottom of Safari'
                    : '在Safari底部'}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold min-w-[20px]">2.</span>
                <span>
                  {language === 'en'
                    ? 'Scroll down and tap "Add to Home Screen"'
                    : '向下滚动并点击"添加到主屏幕"'}
                  {' '}
                  <Plus size={14} className="inline" />
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold min-w-[20px]">3.</span>
                <span>
                  {language === 'en'
                    ? 'Tap "Add" to confirm'
                    : '点击"添加"确认'}
                </span>
              </li>
            </ol>
          </div>
        )}

        {isAndroid && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Smartphone size={16} />
              Android
            </div>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-semibold min-w-[20px]">1.</span>
                <span>
                  {language === 'en'
                    ? 'Tap the menu button'
                    : '点击菜单按钮'}
                  {' '}
                  <MoreVertical size={14} className="inline" />
                  {' '}
                  {language === 'en'
                    ? 'at the top right'
                    : '在右上角'}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold min-w-[20px]">2.</span>
                <span>
                  {language === 'en'
                    ? 'Select "Add to Home screen" or "Install app"'
                    : '选择"添加到主屏幕"或"安装应用"'}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold min-w-[20px]">3.</span>
                <span>
                  {language === 'en'
                    ? 'Tap "Add" or "Install" to confirm'
                    : '点击"添加"或"安装"确认'}
                </span>
              </li>
            </ol>
          </div>
        )}

        {!isIOS && !isAndroid && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <Monitor size={16} />
              {language === 'en' ? 'Desktop' : '桌面'}
            </div>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex gap-2">
                <span className="font-semibold min-w-[20px]">1.</span>
                <span>
                  {language === 'en'
                    ? 'Click the install button in the address bar'
                    : '点击地址栏中的安装按钮'}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold min-w-[20px]">2.</span>
                <span>
                  {language === 'en'
                    ? 'Or click the Install button above'
                    : '或点击上方的安装按钮'}
                </span>
              </li>
            </ol>
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
        <strong className="text-gray-900">
          {language === 'en' ? 'Note:' : '注意：'}
        </strong>{' '}
        {language === 'en'
          ? 'Once installed, you can launch the app from your home screen just like a native app!'
          : '安装后，您可以像原生应用一样从主屏幕启动应用！'}
      </div>
    </div>
  );
}
