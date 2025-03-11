/*
  # Create storage bucket for manga covers

  1. Storage
    - Create 'covers' bucket for manga cover images
    - Set bucket to public for easy access
  
  2. Security
    - Allow admins to upload and manage covers
    - Allow public access to view covers
*/

-- Create storage bucket for covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload covers
CREATE POLICY "Admins can upload covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'covers' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Allow admins to update covers
CREATE POLICY "Admins can update covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'covers' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Allow public access to view covers
CREATE POLICY "Anyone can view covers"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'covers');