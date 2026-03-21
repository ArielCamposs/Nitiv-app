-- Título opcional del evento en registros de convivencia
ALTER TABLE public.convivencia_records
  ADD COLUMN IF NOT EXISTS event_title text;

COMMENT ON COLUMN public.convivencia_records.event_title IS 'Título corto del evento para listados e informes';
