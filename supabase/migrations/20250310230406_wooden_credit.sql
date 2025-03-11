/*
  # Add comment subscriptions and notifications

  1. New Tables
    - `comment_subscriptions`
      - `user_id` (uuid, foreign key to users)
      - `manga_id` (uuid, foreign key to mangas)
      - `chapter` (integer)
      - `created_at` (timestamp)
    
    - `comment_notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `comment_id` (uuid, foreign key to comments)
      - `read` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create comment subscriptions table
CREATE TABLE IF NOT EXISTS comment_subscriptions (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  manga_id uuid REFERENCES mangas(id) ON DELETE CASCADE,
  chapter integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, manga_id, chapter)
);

-- Create comment notifications table
CREATE TABLE IF NOT EXISTS comment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE comment_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for comment subscriptions
CREATE POLICY "Users can manage their own subscriptions"
  ON comment_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON comment_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their notifications as read"
  ON comment_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to create notifications for subscribers
CREATE OR REPLACE FUNCTION notify_comment_subscribers()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO comment_notifications (user_id, comment_id)
  SELECT 
    cs.user_id,
    NEW.id
  FROM comment_subscriptions cs
  WHERE cs.manga_id = NEW.manga_id 
    AND cs.chapter = NEW.chapter
    AND cs.user_id != NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new comments
CREATE TRIGGER on_comment_created
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_subscribers();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS comment_subscriptions_user_idx ON comment_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS comment_notifications_user_unread_idx ON comment_notifications (user_id) WHERE NOT read;