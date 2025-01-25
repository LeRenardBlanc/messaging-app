/*
  # Add username field to profiles table

  1. Changes
    - Add username field to profiles table
    - Add unique constraint on username
    - Add check constraint for valid usernames
    - Update existing policies

  2. Security
    - Username must be unique
    - Username must contain only letters, numbers, and underscores
    - Username length must be between 3 and 20 characters
*/

-- Add username field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;

-- Add unique constraint
ALTER TABLE profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);

-- Add check constraint for valid username format
ALTER TABLE profiles ADD CONSTRAINT profiles_username_check 
  CHECK (
    username ~ '^[a-zA-Z0-9_]{3,20}$'
  );

-- Update policies to include username in search
CREATE POLICY "Users can search by username"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Create index for username searches
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles (username);

-- Function to ensure username uniqueness case-insensitive
CREATE OR REPLACE FUNCTION check_username_unique()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE LOWER(username) = LOWER(NEW.username)
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Username already exists';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for username uniqueness check
CREATE TRIGGER ensure_username_unique
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_username_unique();