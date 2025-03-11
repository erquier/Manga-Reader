/*
  # Add manga reports table

  1. New Tables
    - `manga_reports`
      - `id` (uuid, primary key)
      - `manga_id` (uuid, references mangas)
      - `chapter` (integer)
      - `user_id` (uuid, references users)
      - `issue_type` (text)
      - `description` (text, nullable)
      - `status` (text, default: 'pending')
      - `resolved_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default: now())

  2. Security
    - Enable RLS on `manga_reports` table
    - Add policies for:
      - Authenticated users can create reports
      - Users can view their own reports
      - Admins can manage all reports
*/

-- Create manga reports table
CREATE TABLE IF NOT EXISTS manga_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manga_id uuid REFERENCES mangas(id) ON DELETE CASCADE,
  chapter integer NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_type text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE manga_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can create reports"
  ON manga_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reports"
  ON manga_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reports"
  ON manga_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );