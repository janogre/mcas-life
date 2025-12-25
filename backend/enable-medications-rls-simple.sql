-- Enable Row Level Security on medications tables
-- Since this app uses JWT auth at application level (not Supabase Auth),
-- we create permissive policies that allow the backend to manage access

-- ==================== MEDICATIONS_CATALOG ====================
-- Enable RLS on medications_catalog
ALTER TABLE medications_catalog ENABLE ROW LEVEL SECURITY;

-- Policy: Allow backend full read access (catalog is public for authenticated users)
-- Backend authenticateToken middleware already verifies user
CREATE POLICY "medications_catalog_select_policy" ON medications_catalog
  FOR SELECT
  USING (true);

-- Policy: Only allow INSERT/UPDATE/DELETE via backend service
CREATE POLICY "medications_catalog_modify_policy" ON medications_catalog
  FOR ALL
  USING (current_user = 'postgres');

-- ==================== USER_MEDICATIONS ====================
-- Enable RLS on user_medications
ALTER TABLE user_medications ENABLE ROW LEVEL SECURITY;

-- Policy: Backend can read all user_medications
-- (Backend's authenticateToken middleware filters by user_id in application code)
CREATE POLICY "user_medications_select_policy" ON user_medications
  FOR SELECT
  USING (true);

-- Policy: Backend can insert user_medications
CREATE POLICY "user_medications_insert_policy" ON user_medications
  FOR INSERT
  WITH CHECK (true);

-- Policy: Backend can update user_medications
CREATE POLICY "user_medications_update_policy" ON user_medications
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Backend can delete user_medications
CREATE POLICY "user_medications_delete_policy" ON user_medications
  FOR DELETE
  USING (true);

-- Note: The actual authorization is handled at the application level via
-- authenticateToken middleware which validates JWT tokens and ensures users
-- can only access their own data through filtered queries (user_id = req.user.userId)
