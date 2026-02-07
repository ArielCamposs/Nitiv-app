-- Migration: Enable shared activities access for psychologists
-- This migration updates RLS policies to allow psychologists to manage school activities

-- Drop existing policies for school_activities
DROP POLICY IF EXISTS "Teachers create activities" ON school_activities;
DROP POLICY IF EXISTS "Teachers view activities for their courses" ON school_activities;
DROP POLICY IF EXISTS "Teachers update their activities" ON school_activities;
DROP POLICY IF EXISTS "Teachers delete their activities" ON school_activities;

-- Create new policies that allow both teachers and psychologists to manage activities

-- Allow teachers and psychologists to create activities
CREATE POLICY "Teachers and psychologists create activities"
  ON school_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid() AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'professional')
  );

-- Allow teachers to view activities for their courses
-- Allow psychologists to view all activities from their institution
CREATE POLICY "Teachers and psychologists view activities"
  ON school_activities FOR SELECT
  TO authenticated
  USING (
    -- Teachers can see activities for their courses
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher' AND
      EXISTS (
        SELECT 1 FROM teacher_courses tc
        WHERE tc.course_id = school_activities.course_id
        AND tc.teacher_id = auth.uid()
      )
    )
    OR
    -- Psychologists can see all activities from their institution
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'professional' AND
      (SELECT institution_id FROM profiles WHERE id = auth.uid()) = 
      (SELECT institution_id FROM courses WHERE id = school_activities.course_id)
    )
    OR
    -- Admins can see all activities from their institution
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
    )
  );

-- Allow teachers and psychologists to update activities
CREATE POLICY "Teachers and psychologists update activities"
  ON school_activities FOR UPDATE
  TO authenticated
  USING (
    -- Teachers can update their own activities
    (
      teacher_id = auth.uid() AND
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
    )
    OR
    -- Psychologists can update all activities from their institution
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'professional' AND
      (SELECT institution_id FROM profiles WHERE id = auth.uid()) = 
      (SELECT institution_id FROM courses WHERE id = school_activities.course_id)
    )
    OR
    -- Admins can update all activities
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
    )
  );

-- Allow teachers and psychologists to delete activities
CREATE POLICY "Teachers and psychologists delete activities"
  ON school_activities FOR DELETE
  TO authenticated
  USING (
    -- Teachers can delete their own activities
    (
      teacher_id = auth.uid() AND
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
    )
    OR
    -- Psychologists can delete all activities from their institution
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'professional' AND
      (SELECT institution_id FROM profiles WHERE id = auth.uid()) = 
      (SELECT institution_id FROM courses WHERE id = school_activities.course_id)
    )
    OR
    -- Admins can delete all activities
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
    )
  );
