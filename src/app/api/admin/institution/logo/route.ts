import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

        const { data: profile } = await supabase
            .from("users")
            .select("role, institution_id")
            .eq("id", user.id)
            .single()

        if (profile?.role !== "admin" || !profile.institution_id) {
            return NextResponse.json({ error: "Solo un admin puede subir el logo de la institución." }, { status: 403 })
        }

        const formData = await req.formData()
        const file = formData.get("file") as File | null
        if (!file || typeof file === "string") {
            return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 })
        }

        if (!file.type.startsWith("image/") || !ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: "Solo se permiten imágenes (JPEG, PNG, GIF, WebP)." }, { status: 400 })
        }
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: "La imagen no puede superar 2 MB." }, { status: 400 })
        }

        const ext = file.name.split(".").pop()?.toLowerCase() || "png"
        const safeExt = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext) ? ext : "png"
        const filePath = `${profile.institution_id}/logo.${safeExt}`

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { error: uploadError } = await supabaseAdmin.storage
            .from("institution-logos")
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: true,
            })

        if (uploadError) {
            console.error("[institution/logo] upload error:", uploadError)
            return NextResponse.json(
                { error: uploadError.message || "Error al subir el logo. ¿Existe el bucket 'institution-logos' en Storage?" },
                { status: 500 }
            )
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from("institution-logos")
            .getPublicUrl(filePath)

        const { error: updateError } = await supabaseAdmin
            .from("institutions")
            .update({ logo_url: publicUrl })
            .eq("id", profile.institution_id)

        if (updateError) {
            console.error("[institution/logo] update error:", updateError)
            return NextResponse.json({ error: "Error al guardar la URL del logo." }, { status: 500 })
        }

        return NextResponse.json({ logo_url: publicUrl })
    } catch (e) {
        console.error("[institution/logo] error:", e)
        return NextResponse.json({ error: "Error inesperado al subir el logo." }, { status: 500 })
    }
}
