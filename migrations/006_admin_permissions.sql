-- Admin Permissions Migration
-- Adds RLS policies to allow admins to manage all data within their institution

-- ============================================================================
-- PROFILES TABLE - Admin can manage all users
-- ============================================================================

-- Admins can view all profiles in their institution
CREATE POLICY "Admins view all profiles in institution"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'superadmin')
      AND admin_profile.institution_id = profiles.institution_id
    )
  );

-- Admins can update profiles in their institution
CREATE POLICY "Admins update profiles in institution"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'superadmin')
      AND admin_profile.institution_id = profiles.institution_id
    )
  );

-- Admins can insert profiles in their institution
CREATE POLICY "Admins insert profiles in institution"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'superadmin')
      AND admin_profile.institution_id = institution_id
    )
  );

-- Admins can delete profiles in their institution
CREATE POLICY "Admins delete profiles in institution"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'superadmin')
      AND admin_profile.institution_id = profiles.institution_id
    )
  );

-- ============================================================================
-- ALERTS TABLE - Admin can view and update alerts
-- ============================================================================

CREATE POLICY "Admins view all alerts in institution"
  ON alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      JOIN profiles student_profile ON student_profile.id = alerts.student_id
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'superadmin')
      AND admin_profile.institution_id = student_profile.institution_id
    )
  );

CREATE POLICY "Admins update alerts in institution"
  ON alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      JOIN profiles student_profile ON student_profile.id = alerts.student_id
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'superadmin')
      AND admin_profile.institution_id = student_profile.institution_id
    )
  );

-- ============================================================================
-- MOOD_LOGS TABLE - Admin can view all mood logs
-- ============================================================================

CREATE POLICY "Admins view all mood logs in institution"
  ON mood_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'superadmin')
      AND admin_profile.institution_id = mood_logs.institution_id
    )
  );

-- ============================================================================
-- COURSES TABLE - Admin can manage courses
-- ============================================================================

CREATE POLICY "Admins manage courses in institution"
  ON courses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'superadmin')
      AND admin_profile.institution_id = courses.institution_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'superadmin')
      AND admin_profile.institution_id = institution_id
    )
  );

-- ============================================================================
-- ENROLLMENTS TABLE - Admin can manage enrollments
-- ============================================================================

CREATE POLICY "Admins manage enrollments in institution"
  ON enrollments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      JOIN courses ON courses.id = enrollments.course_id
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'superadmin')
      AND admin_profile.institution_id = courses.institution_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      JOIN courses ON courses.id = course_id
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'superadmin')
      AND admin_profile.institution_id = courses.institution_id
    )
  );

-- ============================================================================
-- CASES TABLE - Admin can view all cases
-- ============================================================================

CREATE POLICY "Admins view all cases in institution"
  ON cases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      JOIN profiles student_profile ON student_profile.id = cases.student_id
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'superadmin')
      AND admin_profile.institution_id = student_profile.institution_id
    )
  );
