-- ============================================================================
-- MCAS-Life Row Level Security (RLS) Implementation
-- ============================================================================
-- This script enables RLS and creates policies to ensure users can only
-- access their own health data, complying with HIPAA/GDPR requirements.
-- ============================================================================

-- Enable RLS on all user-related tables
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcas_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_food_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies for USERS table
-- ============================================================================
-- Users can only see their own user record

CREATE POLICY "Users can view own profile"
  ON users
  FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  USING (auth.uid()::text = id::text);

-- ============================================================================
-- RLS Policies for MCAS_PROFILES table
-- ============================================================================
-- Users can only access their own MCAS profile

CREATE POLICY "Users can view own MCAS profile"
  ON mcas_profiles
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own MCAS profile"
  ON mcas_profiles
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own MCAS profile"
  ON mcas_profiles
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- ============================================================================
-- RLS Policies for USER_PREFERENCES table
-- ============================================================================

CREATE POLICY "Users can view own preferences"
  ON user_preferences
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own preferences"
  ON user_preferences
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- ============================================================================
-- RLS Policies for USER_SESSIONS table
-- ============================================================================

CREATE POLICY "Users can view own sessions"
  ON user_sessions
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own sessions"
  ON user_sessions
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own sessions"
  ON user_sessions
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- ============================================================================
-- RLS Policies for FOODS table (SIGHI database)
-- ============================================================================
-- All authenticated users can view foods (public SIGHI data)
-- Only users can create custom foods (with created_by_user_id)

CREATE POLICY "Anyone can view foods"
  ON foods
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert custom foods"
  ON foods
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by_user_id IS NULL
    OR auth.uid()::text = created_by_user_id::text
  );

CREATE POLICY "Users can update own custom foods"
  ON foods
  FOR UPDATE
  USING (auth.uid()::text = created_by_user_id::text);

CREATE POLICY "Users can delete own custom foods"
  ON foods
  FOR DELETE
  USING (auth.uid()::text = created_by_user_id::text);

-- ============================================================================
-- RLS Policies for APPROVED_FOODS table (Safe foods list)
-- ============================================================================

CREATE POLICY "Users can view own approved foods"
  ON approved_foods
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own approved foods"
  ON approved_foods
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own approved foods"
  ON approved_foods
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own approved foods"
  ON approved_foods
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- RLS Policies for PERSONAL_FOOD_RATINGS table
-- ============================================================================

CREATE POLICY "Users can view own food ratings"
  ON personal_food_ratings
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own food ratings"
  ON personal_food_ratings
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own food ratings"
  ON personal_food_ratings
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own food ratings"
  ON personal_food_ratings
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- RLS Policies for FOOD_DIARY_ENTRIES table (Meal tracking)
-- ============================================================================

CREATE POLICY "Users can view own meal entries"
  ON food_diary_entries
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own meal entries"
  ON food_diary_entries
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own meal entries"
  ON food_diary_entries
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own meal entries"
  ON food_diary_entries
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- RLS Policies for SYMPTOM_ENTRIES table (Symptom tracking)
-- ============================================================================

CREATE POLICY "Users can view own symptoms"
  ON symptom_entries
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own symptoms"
  ON symptom_entries
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own symptoms"
  ON symptom_entries
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own symptoms"
  ON symptom_entries
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- RLS Policies for SUPPLEMENT_ENTRIES table (Supplement tracking)
-- ============================================================================

CREATE POLICY "Users can view own supplements"
  ON supplement_entries
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own supplements"
  ON supplement_entries
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own supplements"
  ON supplement_entries
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own supplements"
  ON supplement_entries
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- RLS Policies for HEALTH_METRICS table (Daily health tracking)
-- ============================================================================

CREATE POLICY "Users can view own health metrics"
  ON health_metrics
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own health metrics"
  ON health_metrics
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own health metrics"
  ON health_metrics
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own health metrics"
  ON health_metrics
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- RLS Policies for TRIGGER_ANALYSES table (AI correlation results)
-- ============================================================================

CREATE POLICY "Users can view own trigger analyses"
  ON trigger_analyses
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "System can insert trigger analyses"
  ON trigger_analyses
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own trigger analyses"
  ON trigger_analyses
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- RLS Policies for SAVED_RECIPES table
-- ============================================================================

CREATE POLICY "Users can view own recipes"
  ON saved_recipes
  FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own recipes"
  ON saved_recipes
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own recipes"
  ON saved_recipes
  FOR UPDATE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own recipes"
  ON saved_recipes
  FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- RLS Policies for SYMPTOM_TEMPLATES table (Public templates)
-- ============================================================================
-- All authenticated users can view symptom templates

CREATE POLICY "Anyone can view symptom templates"
  ON symptom_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- RLS Policies for SYSTEM_SETTINGS table (Admin only)
-- ============================================================================
-- Only allow viewing for now (admin operations would need special role)

CREATE POLICY "Authenticated users can view system settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- Grant necessary permissions
-- ============================================================================

-- Grant authenticated users access to all tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- Verification queries
-- ============================================================================

-- To verify RLS is enabled, run:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- To view all policies, run:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public';

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================
--
-- 1. This script assumes you're using Supabase's auth.uid() function
--    If using a different auth system, modify the policies accordingly
--
-- 2. For backend API access with service role key, RLS will be bypassed
--    Make sure to use this key ONLY in backend code, never in frontend
--
-- 3. Test thoroughly after applying these policies
--
-- 4. Consider adding additional policies for:
--    - Shared recipes (if users can share)
--    - Expert/doctor access (if you implement expert network)
--    - Admin access (for support/moderation)
-- ============================================================================
