/*
  # Create storage bucket for manga pages

  1. Storage
    - Create 'pages' bucket for manga chapter pages
    - Set bucket to public for easy access
  
  2. Security
    - Allow admins to upload and manage pages
    - Allow public access to view pages
*/

-- Create storage bucket for pages
INSERT INTO storage.buckets (id, name, public)
VALUES ('pages', 'pages', true)
ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload pages
CREATE POLICY "Admins can upload pages"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pages' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Allow admins to update pages
CREATE POLICY "Admins can update pages"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pages' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Allow public access to view pages
CREATE POLICY "Anyone can view pages"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'pages');