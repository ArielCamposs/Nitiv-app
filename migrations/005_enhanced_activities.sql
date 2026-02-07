-- Migration: Enhanced school activities with comprehensive fields
-- This migration adds new fields and junction tables for multi-select functionality

-- First, add new columns to school_activities table
ALTER TABLE school_activities
  DROP COLUMN IF EXISTS activity_type,
  DROP COLUMN IF EXISTS course_id,
  ADD COLUMN activity_type text CHECK (activity_type IN ('colegio', 'salida_pedagogica', 'entidad_externa')) DEFAULT 'colegio',
  ADD COLUMN status text CHECK (status IN ('planificado', 'en_curso', 'realizada')) DEFAULT 'planificado',
  ADD COLUMN start_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN end_date date,
  DROP COLUMN IF EXISTS activity_date;

-- Rename activity_date to start_date if it exists (for existing data)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'school_activities' AND column_name = 'activity_date'
  ) THEN
    ALTER TABLE school_activities RENAME COLUMN activity_date TO start_date;
  END IF;
END $$;

-- Create junction table for activity responsibles (teachers and psychologists)
CREATE TABLE IF NOT EXISTS activity_responsibles (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references school_activities(id) on delete cascade not null,
  responsible_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(activity_id, responsible_id)
);

-- Create junction table for activity courses
CREATE TABLE IF NOT EXISTS activity_courses (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references school_activities(id) on delete cascade not null,
  course_id uuid references courses(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(activity_id, course_id)
);

-- Enable RLS on new tables
ALTER TABLE activity_responsibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_responsibles
CREATE POLICY "Users view activity responsibles"
  ON activity_responsibles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_activities sa
      WHERE sa.id = activity_responsibles.activity_id
    )
  );

CREATE POLICY "Teachers and psychologists manage activity responsibles"
  ON activity_responsibles FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'professional', 'admin', 'superadmin')
  );

-- RLS Policies for activity_courses
CREATE POLICY "Users view activity courses"
  ON activity_courses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM school_activities sa
      WHERE sa.id = activity_courses.activity_id
    )
  );

CREATE POLICY "Teachers and psychologists manage activity courses"
  ON activity_courses FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'professional', 'admin', 'superadmin')
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_responsibles_activity ON activity_responsibles(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_responsibles_responsible ON activity_responsibles(responsible_id);
CREATE INDEX IF NOT EXISTS idx_activity_courses_activity ON activity_courses(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_courses_course ON activity_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_school_activities_status ON school_activities(status);
CREATE INDEX IF NOT EXISTS idx_school_activities_start_date ON school_activities(start_date);
