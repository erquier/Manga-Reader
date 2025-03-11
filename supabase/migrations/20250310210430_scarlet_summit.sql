/*
  # User Library Schema

  1. New Tables
    - `user_library`
      - `user_id` (uuid, references auth.users)
      - `manga_id` (uuid, references mangas)
      - `status` (enum: reading, completed, planned, on-hold)
      - `current_chapter` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Users can manage their own library entries
    - Public cannot access library entries
*/

-- Create library status enum
CREATE TYPE library_status AS ENUM ('reading', 'completed', 'planned', 'on-hold');

-- Create user_library table
CREATE TABLE IF NOT EXISTS user_library (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  manga_id uuid REFERENCES mangas(id) ON DELETE CASCADE,
  status library_status DEFAULT 'reading',
  current_chapter integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, manga_id)
);

-- Enable RLS
ALTER TABLE user_library ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_user_library_updated_at
  BEFORE UPDATE ON user_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
CREATE POLICY "Users can manage their own library"
  ON user_library
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create view for library entries with manga details
CREATE OR REPLACE VIEW user_library_view AS
SELECT 
  ul.*,
  m.title as manga_title,
  m.cover_url,
  m.author,
  m.status as manga_status,
  m.rating
FROM user_library ul
JOIN mangas m ON ul.manga_id = m.id;