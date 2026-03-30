-- Agrega las columnas de curso al registro de actividades SEL
ALTER TABLE public.sel_actividad_registros
    ADD COLUMN IF NOT EXISTS curso_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS curso_nombre TEXT;
