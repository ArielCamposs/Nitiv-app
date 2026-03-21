-- Estudiantes a los que aplica cada intervención (casos con varios involucrados desde convivencia)
ALTER TABLE public.student_case_actions
  ADD COLUMN IF NOT EXISTS participant_student_ids JSONB DEFAULT NULL;

COMMENT ON COLUMN public.student_case_actions.participant_student_ids IS 'UUIDs de estudiantes participantes en la intervención (selección cuando el registro de convivencia tiene más de un involucrado)';
