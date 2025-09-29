-- Fixed Supabase Storage Bucket Setup
-- Run these commands in your Supabase SQL Editor

-- 1. Create the storage bucket (if not exists)
-- Note: You can also do this via the Supabase Dashboard > Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments', 
  'ticket-attachments', 
  true,
  10485760, -- 10MB in bytes
  ARRAY[
    'image/jpeg',
    'image/png', 
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up storage policies for the ticket-attachments bucket
-- Note: RLS is already enabled on storage.objects by default in Supabase

-- Policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated upload to ticket-attachments" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'ticket-attachments' 
  AND auth.role() = 'authenticated'
);

-- Policy to allow users to view all files in the bucket
CREATE POLICY "Allow public read access to ticket-attachments" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'ticket-attachments');

-- Policy to allow authenticated users to update files
CREATE POLICY "Allow authenticated update to ticket-attachments" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'ticket-attachments' 
  AND auth.role() = 'authenticated'
) 
WITH CHECK (
  bucket_id = 'ticket-attachments' 
  AND auth.role() = 'authenticated'
);

-- Policy to allow authenticated users to delete files
CREATE POLICY "Allow authenticated delete from ticket-attachments" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'ticket-attachments' 
  AND auth.role() = 'authenticated'
);

-- 3. Verify the bucket was created
SELECT 
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types,
  created_at 
FROM storage.buckets 
WHERE id = 'ticket-attachments';