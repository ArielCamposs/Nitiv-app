import { createClient } from '@supabase/supabase-js'

// SOLO usar en Server Actions o API Routes, nunca en el cliente
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)
