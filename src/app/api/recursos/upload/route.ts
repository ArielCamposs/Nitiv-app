import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

const ALLOWED_ROLES = ["admin", "docente", "dupla", "convivencia"]
const MAX_SIZE = 50 * 1024 * 1024 // 50 MB

export async function POST(req: NextRequest) {
    try {
        // ── Auth ──────────────────────────────────────────────────────────────
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError) {
            console.error("[recursos/upload] auth error:", authError)
            return NextResponse.json({ error: "Error de autenticación" }, { status: 401 })
        }
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 })
        }

        const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("id, institution_id, role")
            .eq("id", user.id)
            .maybeSingle()

        if (profileError) {
            console.error("[recursos/upload] profile error:", profileError)
            return NextResponse.json({ error: "Error al verificar usuario" }, { status: 500 })
        }
        if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
            return NextResponse.json({ error: "Sin permisos para subir recursos" }, { status: 403 })
        }

        // ── Parse form ────────────────────────────────────────────────────────
        let form: FormData
        try {
            form = await req.formData()
        } catch (e) {
            console.error("[recursos/upload] formData error:", e)
            return NextResponse.json({ error: "No se pudo leer el formulario" }, { status: 400 })
        }

        const file = form.get("file") as File | null
        if (!file || typeof file === "string") {
            return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 })
        }
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: "Archivo demasiado grande (máx. 50 MB)" }, { status: 400 })
        }

        // ── Upload to Supabase Storage ─────────────────────────────────────────
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin"
        const safeName = `${Date.now()}.${ext}`
        const path = `${profile.institution_id}/${user.id}/${safeName}`

        // Convert File → ArrayBuffer → Buffer for reliable upload in Node
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const { error: uploadError } = await supabase
            .storage
            .from("recursos")
            .upload(path, buffer, {
                contentType: file.type || "application/octet-stream",
                upsert: false,
            })

        if (uploadError) {
            console.error("[recursos/upload] storage error:", uploadError.message, uploadError)
            return NextResponse.json({ error: `Error al subir: ${uploadError.message}` }, { status: 500 })
        }

        const { data: publicData } = supabase.storage.from("recursos").getPublicUrl(path)

        return NextResponse.json({
            file_url: publicData.publicUrl,
            file_name: file.name,
            file_size: file.size,
            file_mime: file.type || "application/octet-stream",
        })

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error inesperado"
        console.error("[recursos/upload] unhandled error:", err)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
