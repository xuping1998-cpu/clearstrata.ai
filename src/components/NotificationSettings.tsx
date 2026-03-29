import { useState, useEffect } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  requestNotificationPermission,
  checkNotificationSupport,
} from '../utils/notifications';

export function NotificationSettings() {
  const { language } = useLanguage();
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null
  );
  const [supported, setSupported] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const { supported: isSupported, permission: currentPermission } =
      checkNotificationSupport();
    setSupported(isSupported);
    setPermission(currentPermission);
  }, []);

  const handleEnableNotifications = async () => {
    setRequesting(true);
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    setRequesting(false);
  };

  if (!supported) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-start gap-3">
          <BellOff className="text-gray-400 mt-0.5" size={20} />
          <div>
            <h3 className="font-medium text-gray-900 mb-1">
              {language === 'en'
                ? 'Notifications Not Supported'
                : '不支持通知'}
            </h3>
            <p className="text-sm text-gray-600">
              {language === 'en'
                ? 'Your browser does not support notifications'
                : '您的浏览器不支持通知功能'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (permission === 'granted') {
    return (
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <div className="flex items-start gap-3">
          <div className="bg-green-100 rounded-full p-1">
            <Check className="text-green-600" size={16} />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">
              {language === 'en' ? 'Notifications Enabled' : '通知已启用'}
            </h3>
            <p className="text-sm text-gray-600">
              {language === 'en'
                ? 'You will receive notifications for important updates'
                : '您将收到重要更新的通知'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
        <div className="flex items-start gap-3">
          <BellOff className="text-red-400 mt-0.5" size={20} />
          <div>
            <h3 className="font-medium text-gray-900 mb-1">
              {language === 'en' ? 'Notifications Blocked' : '通知已被阻止'}
            </h3>
            <p className="text-sm text-gray-600">
              {language === 'en'
                ? 'To enable notifications, please update your browser settings'
                : '要启用通知，请更新您的浏览器设置'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-start gap-3">
        <Bell className="text-[#1D9E75] mt-0.5" size={20} />
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">
            {language === 'en' ? 'Enable Notifications' : '启用通知'}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {language === 'en'
              ? 'Get notified about votes, maintenance updates, and important announcements'
              : '接收投票、维护更新和重要公告的通知'}
          </p>
          <button
            onClick={handleEnableNotifications}
            disabled={requesting}
            className="px-4 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors disabled:opacity-50 text-sm"
          >
            {requesting
              ? language === 'en'
                ? 'Requesting...'
                : '请求中...'
              : language === 'en'
              ? 'Enable Notifications'
              : '启用通知'}
          </button>
        </div>
      </div>
    </div>
  );
}
