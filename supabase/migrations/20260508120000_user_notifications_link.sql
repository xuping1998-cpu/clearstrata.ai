ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS link text;

COMMENT ON COLUMN public.user_notifications.link IS 'Optional in-app path or URL; used by UserNotificationToast navigation.';
