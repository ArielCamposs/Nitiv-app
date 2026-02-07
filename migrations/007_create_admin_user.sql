-- Create Admin User
-- IMPORTANTE: Reemplaza los valores entre <> antes de ejecutar

-- Primero, necesitas el UUID de tu institución
-- Ejecuta esto para ver tus instituciones:
-- SELECT id, name FROM institutions;

-- Luego ejecuta este bloque reemplazando los valores:
DO $$
DECLARE
  admin_user_id uuid;
  institution_uuid uuid := '<INSTITUTION_ID>'; -- Reemplaza con el ID de tu institución
  admin_email text := 'admin@ejemplo.com'; -- Reemplaza con el email del admin
  admin_password text := 'Admin123!'; -- Reemplaza con una contraseña segura
  admin_name text := 'Administrador Principal'; -- Reemplaza con el nombre
BEGIN
  -- Crear usuario en auth.users usando la extensión pgcrypto
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    admin_email,
    crypt(admin_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    FALSE,
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO admin_user_id;

  -- Actualizar el perfil
  UPDATE profiles
  SET 
    role = 'admin',
    full_name = admin_name,
    institution_id = institution_uuid
  WHERE id = admin_user_id;

  RAISE NOTICE 'Admin user created successfully with ID: %', admin_user_id;
END $$;
