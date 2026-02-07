-- Migration: Transform cases to records system
-- This migration enhances the cases table with detailed registration fields

-- First, let's add the new columns to the existing cases table
ALTER TABLE cases 
  ADD COLUMN IF NOT EXISTS record_type text CHECK (record_type IN ('convivencia_escolar', 'acompañamiento_socioemocional', 'incidente', 'entrevista', 'derivacion')),
  ADD COLUMN IF NOT EXISTS record_date date,
  ADD COLUMN IF NOT EXISTS record_time time,
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES courses(id),
  ADD COLUMN IF NOT EXISTS severity text CHECK (severity IN ('baja', 'media', 'alta', 'critica')) DEFAULT 'baja',
  ADD COLUMN IF NOT EXISTS actions text[], -- Array of actions taken
  ADD COLUMN IF NOT EXISTS confidentiality text CHECK (confidentiality IN ('publico', 'restringido', 'confidencial')) DEFAULT 'publico',
  ADD COLUMN IF NOT EXISTS description text; -- Detailed description

-- Update existing records to have default values
UPDATE cases 
SET 
  record_type = 'acompañamiento_socioemocional',
  record_date = CURRENT_DATE,
  record_time = CURRENT_TIME,
  severity = 'baja',
  confidentiality = 'publico'
WHERE record_type IS NULL;

-- Create index for faster queries by confidentiality and type
CREATE INDEX IF NOT EXISTS idx_cases_confidentiality ON cases(confidentiality);
CREATE INDEX IF NOT EXISTS idx_cases_record_type ON cases(record_type);
CREATE INDEX IF NOT EXISTS idx_cases_severity ON cases(severity);

-- Update RLS policies to respect confidentiality levels
-- Drop existing policies
DROP POLICY IF EXISTS "Professionals view their cases" ON cases;
DROP POLICY IF EXISTS "Professionals create cases" ON cases;
DROP POLICY IF EXISTS "Professionals update their cases" ON cases;

-- New policies with confidentiality
CREATE POLICY "Professionals view cases - confidentiality aware"
  ON cases FOR SELECT
  TO authenticated
  USING (
    -- Professional owns the record
    professional_id = auth.uid() 
    OR
    -- Teachers can see public records from their institution
    (
      confidentiality = 'publico' AND
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher' AND
      (SELECT institution_id FROM profiles WHERE id = auth.uid()) = 
      (SELECT institution_id FROM profiles WHERE id = student_id)
    )
    OR
    -- Psychologists can see public and restricted records
    (
      confidentiality IN ('publico', 'restringido') AND
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'professional' AND
      (SELECT institution_id FROM profiles WHERE id = auth.uid()) = 
      (SELECT institution_id FROM profiles WHERE id = student_id)
    )
    OR
    -- Admins can see all records from their institution
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' AND
      (SELECT institution_id FROM profiles WHERE id = auth.uid()) = 
      (SELECT institution_id FROM profiles WHERE id = student_id)
    )
  );

CREATE POLICY "Professionals create cases"
  ON cases FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_id = auth.uid() AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('professional', 'admin')
  );

CREATE POLICY "Professionals update their cases"
  ON cases FOR UPDATE
  TO authenticated
  USING (
    professional_id = auth.uid() AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('professional', 'admin')
  );

CREATE POLICY "Professionals delete their cases"
  ON cases FOR DELETE
  TO authenticated
  USING (
    professional_id = auth.uid() AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('professional', 'admin')
  );
