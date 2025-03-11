/*
  # Add comments table and fix manga ID handling

  1. New Tables
    - `comments`
      - `id` (uuid, primary key)
      - `manga_id` (uuid, foreign key to mangas)
      - `chapter` (integer)
      - `user_id` (uuid, foreign key to users)
      - `user_email` (text)
      - `content` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `comments` table
    - Add policies for:
      - Anyone can read comments
      - Authenticated users can create comments
      - Users can manage their own comments
*/

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manga_id uuid NOT NULL REFERENCES mangas(id) ON DELETE CASCADE,
  chapter integer NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read comments"
  ON comments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own comments"
  ON comments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS comments_manga_chapter_idx ON comments (manga_id, chapter);