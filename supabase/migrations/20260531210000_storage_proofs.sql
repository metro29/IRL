-- Storage bucket for attendance + challenge proof photos

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proofs',
  'proofs',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "proofs_upload_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'proofs'
    AND (storage.foldername(name))[1] IN ('attendance', 'challenges')
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "proofs_read_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'proofs');
