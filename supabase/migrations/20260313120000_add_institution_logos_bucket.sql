-- Bucket para logos de instituciones (admin sube desde Información de la institución).
-- La app sube vía API /api/admin/institution/logo usando service role.
-- Si el bucket ya existe, ignora el error "duplicate key" o créalo desde Dashboard > Storage:
--   Name: institution-logos, Public: yes, File size limit: 2 MB.

insert into storage.buckets (id, name, public)
values ('institution-logos', 'institution-logos', true);
