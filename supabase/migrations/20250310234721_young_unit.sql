/*
  # Add admin notifications system

  1. New Tables
    - `admin_notifications`
      - `id` (uuid, primary key)
      - `type` (text)
      - `data` (jsonb)
      - `read` (boolean)
      - `created_at` (timestamptz)

  2. Functions
    - `notify_admins_on_report()`: Trigger function to create notifications when reports are created

  3. Security
    - Enable RLS on `admin_notifications` table
    - Add policies for admin access
*/

-- Create admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  data jsonb NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Admins can manage notifications"
  ON admin_notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create function to notify admins
CREATE OR REPLACE FUNCTION notify_admins_on_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification for admins
  INSERT INTO admin_notifications (type, data)
  VALUES (
    'manga_report',
    jsonb_build_object(
      'report_id', NEW.id,
      'manga_id', NEW.manga_id,
      'chapter', NEW.chapter,
      'issue_type', NEW.issue_type,
      'description', NEW.description
    )
  );

  -- Send email to admins using pg_notify
  PERFORM pg_notify(
    'admin_report_notification',
    json_build_object(
      'report_id', NEW.id,
      'manga_id', NEW.manga_id,
      'chapter', NEW.chapter,
      'issue_type', NEW.issue_type,
      'description', NEW.description
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for manga reports
DROP TRIGGER IF EXISTS on_manga_report_created ON manga_reports;
CREATE TRIGGER on_manga_report_created
  AFTER INSERT ON manga_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_on_report();