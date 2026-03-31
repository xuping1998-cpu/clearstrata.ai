/*
  # Notification attachments: DB columns + notifications storage bucket

  - notifications.file_url, file_name (optional single attachment)
  - Public bucket `notifications`, 10MB limit, common doc/image MIME types
  - storage.objects RLS: public read; council/manager may write (matches publish role)
  - Fan-out trigger also fires when file_url changes
*/

-- ---------------------------------------------------------------------------
-- 1) Table columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_name text;

-- ---------------------------------------------------------------------------
-- 2) Storage bucket
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notifications',
  'notifications',
  true,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 3) Storage RLS (storage.objects)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read notifications bucket" ON storage.objects;
CREATE POLICY "Public read notifications bucket"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'notifications');

DROP POLICY IF EXISTS "Council manager admin insert notifications storage" ON storage.objects;
DROP POLICY IF EXISTS "Council manager insert notifications storage" ON storage.objects;
CREATE POLICY "Council manager insert notifications storage"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'notifications'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('council', 'manager')
    )
  );

DROP POLICY IF EXISTS "Council manager admin update notifications storage" ON storage.objects;
DROP POLICY IF EXISTS "Council manager update notifications storage" ON storage.objects;
CREATE POLICY "Council manager update notifications storage"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'notifications'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('council', 'manager')
    )
  )
  WITH CHECK (
    bucket_id = 'notifications'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('council', 'manager')
    )
  );

DROP POLICY IF EXISTS "Council manager admin delete notifications storage" ON storage.objects;
DROP POLICY IF EXISTS "Council manager delete notifications storage" ON storage.objects;
CREATE POLICY "Council manager delete notifications storage"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'notifications'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('council', 'manager')
    )
  );

-- ---------------------------------------------------------------------------
-- 4) Fan-out when attachment changes
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_notifications_fanout_update ON public.notifications;
CREATE TRIGGER trg_notifications_fanout_update
  AFTER UPDATE OF title, content, file_url ON public.notifications
  FOR EACH ROW
  WHEN (
    OLD.title IS DISTINCT FROM NEW.title
    OR OLD.content IS DISTINCT FROM NEW.content
    OR OLD.file_url IS DISTINCT FROM NEW.file_url
  )
  EXECUTE FUNCTION public.fanout_owner_announcement_inbox();
