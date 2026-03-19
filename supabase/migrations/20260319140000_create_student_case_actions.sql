CREATE TABLE public.student_case_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES public.student_cases(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('asignacion', 'entrevista_estudiante', 'contacto_familia', 'coordinacion_interna', 'monitoreo', 'derivacion_externa', 'cierre', 'nota')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.student_case_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view case actions for their institution cases" ON public.student_case_actions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.student_cases c
            JOIN public.users u ON c.institution_id = u.institution_id
            WHERE c.id = student_case_actions.case_id AND u.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert actions for their institution cases" ON public.student_case_actions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.student_cases c
            JOIN public.users u ON c.institution_id = u.institution_id
            WHERE c.id = student_case_actions.case_id AND u.id = auth.uid()
        )
    );
