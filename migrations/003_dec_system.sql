-- Migration: Create DEC (Desregulaciones Emocionales y Conductuales) table
-- This table tracks emotional and behavioral dysregulations with detailed context

CREATE TABLE dec_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Student Information
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES courses(id),
  
  -- Professional who created the record
  professional_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Event Context
  event_date date NOT NULL,
  event_time time NOT NULL,
  location text NOT NULL,
  activity text NOT NULL,
  context_description text NOT NULL,
  
  -- Intervention
  intervening_people text[], -- Array of names of people who intervened
  guardian_contacted boolean DEFAULT false,
  
  -- Incident Details
  incident_types text[] NOT NULL, -- Multiple selection: agresion_verbal, agresion_fisica, destruccion_inmueble, huida, etc.
  intensity_level text CHECK (intensity_level IN ('etapa_2_moderada', 'etapa_3_severa')) NOT NULL,
  
  -- Trigger
  triggering_situations text[] NOT NULL, -- Multiple selection: cambio_rutina, ruido_excesivo, conflicto_pares, etc.
  
  -- Actions Taken
  actions_taken text[] NOT NULL, -- Multiple selection: contencion_verbal, retiro_espacio, contacto_apoderado, etc.
  
  -- Additional Notes
  additional_observations text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE dec_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for DEC records
-- Professionals can view DEC records from their institution
CREATE POLICY "Professionals view DEC records from institution"
  ON dec_records FOR SELECT
  TO authenticated
  USING (
    -- Professional from same institution
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('professional', 'admin') AND
    (SELECT institution_id FROM profiles WHERE id = auth.uid()) = 
    (SELECT institution_id FROM profiles WHERE id = student_id)
  );

-- Professionals can create DEC records
CREATE POLICY "Professionals create DEC records"
  ON dec_records FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_id = auth.uid() AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('professional', 'admin')
  );

-- Professionals can update their own DEC records
CREATE POLICY "Professionals update their DEC records"
  ON dec_records FOR UPDATE
  TO authenticated
  USING (
    professional_id = auth.uid() AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('professional', 'admin')
  );

-- Professionals can delete their own DEC records
CREATE POLICY "Professionals delete their DEC records"
  ON dec_records FOR DELETE
  TO authenticated
  USING (
    professional_id = auth.uid() AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('professional', 'admin')
  );

-- Create indexes for better performance
CREATE INDEX idx_dec_records_student ON dec_records(student_id);
CREATE INDEX idx_dec_records_professional ON dec_records(professional_id);
CREATE INDEX idx_dec_records_date ON dec_records(event_date);
CREATE INDEX idx_dec_records_intensity ON dec_records(intensity_level);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dec_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dec_records_updated_at
  BEFORE UPDATE ON dec_records
  FOR EACH ROW
  EXECUTE FUNCTION update_dec_records_updated_at();
