-- Vincula registros de convivencia (en seguimiento) con gestión de casos
ALTER TABLE public.student_cases
  ADD COLUMN IF NOT EXISTS convivencia_record_id UUID REFERENCES public.convivencia_records(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_cases_convivencia_record_id
  ON public.student_cases(convivencia_record_id)
  WHERE convivencia_record_id IS NOT NULL;

COMMENT ON COLUMN public.student_cases.convivencia_record_id IS 'Origen: registro de convivencia con estado en seguimiento';
