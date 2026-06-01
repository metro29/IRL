-- Phase 4 hardening: notification source clarity, dedicated chat storage bucket

-- ─── Notifications: triggers are the ONLY source; helper is internal ─────────

COMMENT ON FUNCTION public.create_notification(UUID, public.notification_type, TEXT, TEXT, JSONB) IS
  'INTERNAL ONLY — not an RPC. Called exclusively by trg_notify_* trigger functions.';

COMMENT ON TABLE public.notifications IS
  'Rows are inserted only via create_notification() from database triggers. Clients may SELECT and UPDATE read only.';

-- Belt-and-suspenders: no direct INSERT policy for clients (default deny)

-- ─── Chat images: separate bucket (not proofs) ───────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat',
  'chat',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "proofs_upload_chat" ON storage.objects;

CREATE POLICY "chat_upload_group_member"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.is_group_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE POLICY "chat_read_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'chat');
