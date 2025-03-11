/*
  # Manga Management Schema

  1. New Tables
    - `mangas`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text)
      - `cover_url` (text)
      - `author` (text)
      - `status` (enum: ongoing, completed)
      - `rating` (decimal)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `created_by` (uuid, references profiles)

    - `chapters`
      - `id` (uuid, primary key)
      - `manga_id` (uuid, references mangas)
      - `number` (integer)
      - `title` (text)
      - `pages` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `genres`
      - `id` (uuid, primary key)
      - `name` (text, unique)

    - `manga_genres`
      - `manga_id` (uuid, references mangas)
      - `genre_id` (uuid, references genres)
      - Primary key (manga_id, genre_id)

  2. Security
    - Enable RLS on all tables
    - Admins can manage all content
    - Public can read published content
    - Authors can manage their own content
*/

-- Create manga status enum
CREATE TYPE manga_status AS ENUM ('ongoing', 'completed');

-- Create mangas table
CREATE TABLE IF NOT EXISTS mangas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_url text,
  author text,
  status manga_status DEFAULT 'ongoing',
  rating decimal DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(user_id) ON DELETE SET NULL
);

-- Create chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manga_id uuid REFERENCES mangas(id) ON DELETE CASCADE,
  number integer NOT NULL,
  title text,
  pages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(manga_id, number)
);

-- Create genres table
CREATE TABLE IF NOT EXISTS genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

-- Create manga_genres junction table
CREATE TABLE IF NOT EXISTS manga_genres (
  manga_id uuid REFERENCES mangas(id) ON DELETE CASCADE,
  genre_id uuid REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (manga_id, genre_id)
);

-- Enable RLS
ALTER TABLE mangas ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE manga_genres ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_mangas_updated_at
  BEFORE UPDATE ON mangas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chapters_updated_at
  BEFORE UPDATE ON chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

-- Mangas policies
CREATE POLICY "Anyone can read mangas"
  ON mangas FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage all mangas"
  ON mangas
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

CREATE POLICY "Authors can manage their own mangas"
  ON mangas
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Chapters policies
CREATE POLICY "Anyone can read chapters"
  ON chapters FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage all chapters"
  ON chapters
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

CREATE POLICY "Authors can manage chapters of their mangas"
  ON chapters
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mangas
      WHERE id = chapters.manga_id
      AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mangas
      WHERE id = chapters.manga_id
      AND created_by = auth.uid()
    )
  );

-- Genres policies
CREATE POLICY "Anyone can read genres"
  ON genres FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage genres"
  ON genres
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

-- Manga_genres policies
CREATE POLICY "Anyone can read manga_genres"
  ON manga_genres FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage manga_genres"
  ON manga_genres
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

CREATE POLICY "Authors can manage manga_genres for their mangas"
  ON manga_genres
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mangas
      WHERE id = manga_genres.manga_id
      AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mangas
      WHERE id = manga_genres.manga_id
      AND created_by = auth.uid()
    )
  );

-- Insert some default genres
INSERT INTO genres (name) VALUES
  ('Action'),
  ('Adventure'),
  ('Comedy'),
  ('Drama'),
  ('Fantasy'),
  ('Horror'),
  ('Mystery'),
  ('Romance'),
  ('Sci-Fi'),
  ('Slice of Life'),
  ('Sports'),
  ('Supernatural'),
  ('Thriller')
ON CONFLICT (name) DO NOTHING;