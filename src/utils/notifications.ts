export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export function showNotification(
  title: string,
  options?: NotificationOptions
): void {
  if (Notification.permission === 'granted') {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        const payload: NotificationOptions & { vibrate?: number[] } = {
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200],
          ...options,
        };
        registration.showNotification(title, payload);
      });
    } else {
      new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options,
      });
    }
  }
}

export function checkNotificationSupport(): {
  supported: boolean;
  permission: NotificationPermission | null;
} {
  if (!('Notification' in window)) {
    return { supported: false, permission: null };
  }

  return {
    supported: true,
    permission: Notification.permission,
  };
}
