/*
  # Add manga reports system

  1. New Tables
    - `manga_reports`
      - `id` (uuid, primary key)
      - `manga_id` (uuid, foreign key to mangas)
      - `chapter` (integer)
      - `user_id` (uuid, foreign key to users)
      - `issue_type` (text)
      - `description` (text)
      - `status` (text)
      - `created_at` (timestamp)
      - `resolved_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for users and admins
*/

CREATE TABLE IF NOT EXISTS manga_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manga_id uuid REFERENCES mangas(id) ON DELETE CASCADE,
  chapter integer NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_type text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected'))
);

-- Enable RLS
ALTER TABLE manga_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create reports"
  ON manga_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reports"
  ON manga_reports
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can update reports"
  ON manga_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Create indexes
CREATE INDEX manga_reports_manga_idx ON manga_reports (manga_id);
CREATE INDEX manga_reports_status_idx ON manga_reports (status) WHERE status = 'pending';