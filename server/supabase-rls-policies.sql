-- Supabase RLS policies for contact_submissions
-- Safe to run multiple times.

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS contact_submissions ENABLE ROW LEVEL SECURITY;

-- Recreate INSERT policies for public form submissions
DROP POLICY IF EXISTS "Allow public form submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Allow public inserts (anon)" ON contact_submissions;
DROP POLICY IF EXISTS "Allow public inserts (authenticated)" ON contact_submissions;

CREATE POLICY "Allow public inserts (anon)"
  ON contact_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public inserts (authenticated)"
  ON contact_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Optional read access for connection checker and admin preview
DROP POLICY IF EXISTS "Allow public reads for diagnostics" ON contact_submissions;
CREATE POLICY "Allow public reads for diagnostics"
  ON contact_submissions
  FOR SELECT
  TO anon, authenticated
  USING (true);
