DROP POLICY IF EXISTS "service_mailboxes_insert" ON "public"."service_mailboxes";
CREATE POLICY "service_mailboxes_insert" ON "public"."service_mailboxes" FOR INSERT TO authenticated WITH CHECK (
    institution_id = (select institution_id from users where id = auth.uid()) 
    AND (select role from users where id = auth.uid()) NOT IN ('estudiante', 'centro_alumnos')
);
