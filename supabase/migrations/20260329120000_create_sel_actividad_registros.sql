-- Tabla de registros de actividades SEL realizadas por docentes
CREATE TABLE public.sel_actividad_registros (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    actividad_id TEXT NOT NULL,
    actividad_nombre TEXT NOT NULL,
    ciclo TEXT NOT NULL,
    eje_casel TEXT NOT NULL,
    tipo TEXT NOT NULL,
    participacion TEXT CHECK (participacion IN ('alta', 'media', 'baja')),
    calificacion INTEGER CHECK (calificacion BETWEEN 1 AND 5),
    observaciones TEXT,
    realizada_en TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índices para búsqueda eficiente
CREATE INDEX idx_sel_registros_institution ON public.sel_actividad_registros(institution_id);
CREATE INDEX idx_sel_registros_created_by ON public.sel_actividad_registros(created_by);
CREATE INDEX idx_sel_registros_actividad_id ON public.sel_actividad_registros(actividad_id);

-- RLS
ALTER TABLE public.sel_actividad_registros ENABLE ROW LEVEL SECURITY;

-- Docente puede ver sus propios registros y los de su institución (dupla, convivencia, director, admin)
CREATE POLICY "sel_registros_select" ON public.sel_actividad_registros
    FOR SELECT USING (
        institution_id IN (
            SELECT institution_id FROM public.users WHERE id = auth.uid()
        )
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.users
                WHERE id = auth.uid()
                AND role IN ('dupla', 'convivencia', 'director', 'admin', 'utp', 'inspector')
            )
        )
    );

-- Solo el docente que creó puede insertar
CREATE POLICY "sel_registros_insert" ON public.sel_actividad_registros
    FOR INSERT WITH CHECK (
        created_by = auth.uid()
        AND institution_id IN (
            SELECT institution_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Solo el docente que creó puede actualizar
CREATE POLICY "sel_registros_update" ON public.sel_actividad_registros
    FOR UPDATE USING (created_by = auth.uid());

-- Solo el docente que creó puede eliminar
CREATE POLICY "sel_registros_delete" ON public.sel_actividad_registros
    FOR DELETE USING (created_by = auth.uid());
