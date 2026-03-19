CREATE TABLE public.student_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    initial_state TEXT NOT NULL CHECK (initial_state IN ('urgente', 'observacion', 'estable')),
    next_step TEXT,
    next_step_date DATE,
    status TEXT NOT NULL DEFAULT 'en_proceso' CHECK (status IN ('pendiente', 'en_proceso', 'atendido', 'cerrado')),
    responsable_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.student_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cases from their institution" ON public.student_cases
    FOR SELECT USING (
        institution_id IN (
            SELECT institution_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert cases for their institution" ON public.student_cases
    FOR INSERT WITH CHECK (
        institution_id IN (
            SELECT institution_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update cases from their institution" ON public.student_cases
    FOR UPDATE USING (
        institution_id IN (
            SELECT institution_id FROM public.users WHERE id = auth.uid()
        ) AND (
            created_by = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.users
                WHERE id = auth.uid() AND role IN ('dupla', 'convivencia', 'director', 'admin', 'utp', 'inspector')
            )
        )
    );
