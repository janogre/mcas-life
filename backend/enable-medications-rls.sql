-- Enable Row Level Security on medications tables
-- This ensures users can only access their own medication data

-- ==================== MEDICATIONS_CATALOG ====================
-- Enable RLS on medications_catalog (catalog is read-only for all authenticated users)
ALTER TABLE medications_catalog ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read the medication catalog
CREATE POLICY "medications_catalog_read_policy" ON medications_catalog
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only service role can insert/update/delete catalog entries
CREATE POLICY "medications_catalog_write_policy" ON medications_catalog
  FOR ALL
  TO service_role
  USING (true);

-- ==================== USER_MEDICATIONS ====================
-- Enable RLS on user_medications (users can only see their own medications)
ALTER TABLE user_medications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own medication entries
CREATE POLICY "user_medications_read_policy" ON user_medications
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = (SELECT users.supabase_uid FROM users WHERE users.id = user_medications.user_id)::text);

-- Policy: Users can insert their own medication entries
CREATE POLICY "user_medications_insert_policy" ON user_medications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = (SELECT users.supabase_uid FROM users WHERE users.id = user_medications.user_id)::text);

-- Policy: Users can update their own medication entries
CREATE POLICY "user_medications_update_policy" ON user_medications
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = (SELECT users.supabase_uid FROM users WHERE users.id = user_medications.user_id)::text)
  WITH CHECK (auth.uid()::text = (SELECT users.supabase_uid FROM users WHERE users.id = user_medications.user_id)::text);

-- Policy: Users can delete their own medication entries
CREATE POLICY "user_medications_delete_policy" ON user_medications
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = (SELECT users.supabase_uid FROM users WHERE users.id = user_medications.user_id)::text);

-- Grant necessary permissions to authenticated users
GRANT SELECT ON medications_catalog TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_medications TO authenticated;

-- Service role has full access
GRANT ALL ON medications_catalog TO service_role;
GRANT ALL ON user_medications TO service_role;
