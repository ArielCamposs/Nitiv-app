"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
    X, Star, Loader2, Upload, FileText, Video, Link2,
    BookOpen, File, Image as ImageIcon, Trash2
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Recurso, RecursoTipo } from "./RecursosClient"

// ─── Config ───────────────────────────────────────────────────────────────────
const ALL_ROLES = [
    { value: "estudiante", label: "Estudiantes" },
    { value: "centro_alumnos", label: "Centro de Alumnos" },
    { value: "docente", label: "Docentes" },
    { value: "dupla", label: "Dupla Psicosocial" },
    { value: "convivencia", label: "Convivencia" },
    { value: "inspector", label: "Inspectoría" },
    { value: "utp", label: "UTP" },
    { value: "director", label: "Dirección" },
]

const CATEGORIAS = [
    { value: "general", label: "General", color: "bg-slate-100 text-slate-700" },
    { value: "socioemocional", label: "Socioemocional", color: "bg-blue-100 text-blue-700" },
    { value: "pedagogico", label: "Pedagógico", color: "bg-emerald-100 text-emerald-700" },
    { value: "orientacion", label: "Orientación", color: "bg-violet-100 text-violet-700" },
    { value: "apoyo_pie", label: "Apoyo PIE", color: "bg-amber-100 text-amber-700" },
    { value: "familia", label: "Familia", color: "bg-rose-100 text-rose-700" },
]

const TIPO_BY_MIME: Record<string, RecursoTipo> = {
    "application/pdf": "pdf",
    "application/msword": "documento",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "documento",
    "application/vnd.ms-excel": "documento",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "documento",
    "application/vnd.ms-powerpoint": "documento",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "documento",
}

const ALL_ROLE_VALUES = ALL_ROLES.map(r => r.value)

interface Etiqueta { id: string; nombre: string }

interface Props {
    recurso: Recurso | null
    allEtiquetas: Etiqueta[]
    institutionId: string
    onSave: (r: Recurso) => void
    onClose: () => void
}

interface FormState {
    title: string
    body: string
    tipo: RecursoTipo
    categoria: string
    destacado: boolean
    rol_destino: string[]
    etiqueta_ids: string[]
    new_etiqueta: string
    file: File | null
    // existing file meta (edit mode)
    file_url: string
    file_name: string
    file_size: number | null
    file_mime: string
}

const EMPTY: FormState = {
    title: "", body: "", tipo: "documento", categoria: "general",
    destacado: false, rol_destino: ALL_ROLE_VALUES,
    etiqueta_ids: [], new_etiqueta: "",
    file: null, file_url: "", file_name: "", file_size: null, file_mime: "",
}

function FileSizeLabel({ bytes }: { bytes: number }) {
    if (bytes < 1024) return <>{bytes} B</>
    if (bytes < 1024 * 1024) return <>{(bytes / 1024).toFixed(1)} KB</>
    return <>{(bytes / (1024 * 1024)).toFixed(1)} MB</>
}

function FileIcon({ mime }: { mime: string }) {
    if (mime === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />
    if (mime.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-blue-500" />
    if (mime.startsWith("video/")) return <Video className="h-5 w-5 text-violet-500" />
    return <File className="h-5 w-5 text-slate-400" />
}

export function ResourceFormModal({ recurso, allEtiquetas, institutionId, onSave, onClose }: Props) {
    const [form, setForm] = useState<FormState>(EMPTY)
    const [etiquetas, setEtiquetas] = useState<Etiqueta[]>(allEtiquetas)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    useEffect(() => {
        if (recurso) {
            setForm({
                title: recurso.title, body: recurso.body ?? "",
                tipo: recurso.tipo, categoria: recurso.categoria ?? "general",
                destacado: recurso.destacado, rol_destino: recurso.rol_destino,
                etiqueta_ids: recurso.etiquetas.map(e => e.id), new_etiqueta: "",
                file: null,
                file_url: recurso.file_url ?? "", file_name: recurso.file_name ?? "",
                file_size: recurso.file_size ?? null, file_mime: recurso.file_mime ?? "",
            })
        } else {
            setForm(EMPTY)
        }
    }, [recurso])

    const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
        setForm(prev => ({ ...prev, [field]: value }))

    const handleFileSelect = useCallback((file: File) => {
        const tipo = TIPO_BY_MIME[file.type] ?? (file.type.startsWith("image/") ? "link" : "documento")
        setForm(prev => ({
            ...prev, file, file_name: file.name,
            file_size: file.size, file_mime: file.type,
            tipo,
            // Auto-detect type for pdf
            ...(file.type === "application/pdf" ? { tipo: "pdf" as RecursoTipo } : {}),
        }))
    }, [])

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false)
        const f = e.dataTransfer.files[0]
        if (f) handleFileSelect(f)
    }, [handleFileSelect])

    const removeFile = () => setForm(prev => ({ ...prev, file: null, file_url: "", file_name: "", file_size: null, file_mime: "" }))

    const toggleRole = (role: string) =>
        set("rol_destino", form.rol_destino.includes(role)
            ? form.rol_destino.filter(r => r !== role)
            : [...form.rol_destino, role])

    const toggleAll = () =>
        set("rol_destino", form.rol_destino.length === ALL_ROLE_VALUES.length ? [] : ALL_ROLE_VALUES)

    const toggleEtiqueta = (id: string) =>
        set("etiqueta_ids", form.etiqueta_ids.includes(id)
            ? form.etiqueta_ids.filter(e => e !== id)
            : [...form.etiqueta_ids, id])

    const createEtiqueta = async () => {
        const nombre = form.new_etiqueta.trim()
        if (!nombre) return
        const { data, error } = await supabase
            .from("etiquetas").insert({ nombre, institution_id: institutionId }).select().single()
        if (error) { toast.error("No se pudo crear la etiqueta"); return }
        const etiq = data as Etiqueta
        setEtiquetas(prev => [...prev, etiq])
        set("etiqueta_ids", [...form.etiqueta_ids, etiq.id])
        set("new_etiqueta", "")
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.title.trim()) { toast.error("El título es obligatorio"); return }
        if (form.rol_destino.length === 0) { toast.error("Selecciona al menos un destinatario"); return }

        // Pre-fetch userId before starting save
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) { toast.error("Sesión expirada, inicia sesión de nuevo"); return }

        setSaving(true)
        try {
            let finalFileUrl = form.file_url
            let finalFileName = form.file_name
            let finalFileSize = form.file_size
            let finalFileMime = form.file_mime

            // Upload file if a new one was selected
            if (form.file) {
                setUploading(true)
                const file = form.file
                const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin"
                const safePath = `${institutionId}/${currentUser.id}/${Date.now()}.${ext}`

                const { error: storageError } = await supabase
                    .storage
                    .from("recursos")
                    .upload(safePath, file, { contentType: file.type, upsert: false })

                setUploading(false)
                if (storageError) throw new Error(storageError.message)

                const { data: publicData } = supabase.storage.from("recursos").getPublicUrl(safePath)
                finalFileUrl = publicData.publicUrl
                finalFileName = file.name
                finalFileSize = file.size
                finalFileMime = file.type
            }

            const payload = {
                title: form.title.trim(),
                body: form.body.trim() || null,
                tipo: form.tipo,
                categoria: form.categoria,
                destacado: form.destacado,
                rol_destino: form.rol_destino,
                file_url: finalFileUrl || null,
                file_name: finalFileName || null,
                file_size: finalFileSize,
                file_mime: finalFileMime || null,
                institution_id: institutionId,
                updated_at: new Date().toISOString(),
            }

            let resourceId = recurso?.id

            if (recurso) {
                const { error } = await supabase.from("resources").update(payload).eq("id", recurso.id)
                if (error) throw error
            } else {
                const { data, error } = await supabase
                    .from("resources")
                    .insert({ ...payload, created_by: currentUser.id })
                    .select("id").single()
                if (error) throw error
                resourceId = (data as { id: string }).id
            }

            // Replace pivot tags
            await supabase.from("recurso_etiqueta").delete().eq("resource_id", resourceId!)
            if (form.etiqueta_ids.length > 0) {
                await supabase.from("recurso_etiqueta").insert(
                    form.etiqueta_ids.map(eid => ({ resource_id: resourceId!, etiqueta_id: eid }))
                )
            }

            const saved: Recurso = {
                id: resourceId!,
                ...payload,
                body: payload.body,
                file_url: payload.file_url,
                file_name: payload.file_name,
                file_size: payload.file_size,
                file_mime: payload.file_mime,
                created_at: recurso?.created_at ?? new Date().toISOString(),
                updated_at: payload.updated_at,
                etiquetas: etiquetas.filter(e => form.etiqueta_ids.includes(e.id)),
                creator_role: recurso?.creator_role,
                creator_name: recurso?.creator_name,
            }

            toast.success(recurso ? "Recurso actualizado" : "Recurso publicado")
            onSave(saved)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error al guardar"
            toast.error(msg)
        } finally {
            setSaving(false); setUploading(false)
        }
    }

    const hasFile = form.file || form.file_url

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-base font-semibold text-slate-800">
                        {recurso ? "Editar recurso" : "Subir recurso"}
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Título *</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => set("title", e.target.value)}
                            placeholder="Ej. Guía de regulación emocional para docentes"
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Descripción</label>
                        <textarea
                            value={form.body}
                            onChange={e => set("body", e.target.value)}
                            rows={3}
                            placeholder="¿Para qué sirve este recurso? ¿A quién está dirigido?"
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition resize-none"
                        />
                    </div>

                    {/* File dropzone */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Archivo</label>

                        {hasFile ? (
                            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <FileIcon mime={form.file_mime} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-700 truncate">{form.file_name}</p>
                                    {form.file_size && (
                                        <p className="text-[10px] text-slate-400"><FileSizeLabel bytes={form.file_size} /></p>
                                    )}
                                </div>
                                <button type="button" onClick={removeFile}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ) : (
                            <div
                                onDrop={onDrop}
                                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                                onDragLeave={() => setDragOver(false)}
                                onClick={() => fileInputRef.current?.click()}
                                className={`group flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all ${dragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                            >
                                <Upload className={`h-7 w-7 transition-colors ${dragOver ? "text-indigo-500" : "text-slate-300 group-hover:text-slate-400"}`} />
                                <div>
                                    <p className="text-xs font-medium text-slate-600">Arrastra un archivo o <span className="text-indigo-600">haz clic para seleccionar</span></p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">PDF, Word, Excel, PPT, imágenes — máx. 50 MB</p>
                                </div>
                            </div>
                        )}
                        <input ref={fileInputRef} type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp"
                            className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                        />
                    </div>

                    {/* Tipo (manual override) + Categoría */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tipo de archivo</label>
                            <select value={form.tipo} onChange={e => set("tipo", e.target.value as RecursoTipo)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 transition bg-white">
                                <option value="pdf">PDF</option>
                                <option value="video">Video</option>
                                <option value="link">Enlace</option>
                                <option value="documento">Documento</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Categoría</label>
                            <select value={form.categoria} onChange={e => set("categoria", e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 transition bg-white">
                                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Destacado toggle */}
                    <button type="button" onClick={() => set("destacado", !form.destacado)}
                        className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${form.destacado
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}>
                        <Star className={`h-4 w-4 ${form.destacado ? "fill-amber-400 stroke-amber-400" : "stroke-slate-400"}`} />
                        {form.destacado ? "Marcado como destacado" : "Marcar como destacado"}
                    </button>

                    {/* Roles destino */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-700">Dirigido a *</label>
                            <button type="button" onClick={toggleAll}
                                className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800">
                                {form.rol_destino.length === ALL_ROLE_VALUES.length ? "Quitar todos" : "Seleccionar todos"}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {ALL_ROLES.map(r => (
                                <button key={r.value} type="button" onClick={() => toggleRole(r.value)}
                                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${form.rol_destino.includes(r.value)
                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                        }`}>
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Etiquetas */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">Etiquetas</label>
                        {etiquetas.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {etiquetas.map(e => (
                                    <button key={e.id} type="button" onClick={() => toggleEtiqueta(e.id)}
                                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${form.etiqueta_ids.includes(e.id)
                                            ? "bg-slate-800 border-slate-800 text-white"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                            }`}>
                                        {e.nombre}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-2">
                            <input type="text" value={form.new_etiqueta} onChange={e => set("new_etiqueta", e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); createEtiqueta() } }}
                                placeholder="Nueva etiqueta…"
                                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition" />
                            <button type="button" onClick={createEtiqueta}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition">
                                + Crear
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                        <button type="button" onClick={onClose}
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition shadow-sm">
                            {(saving || uploading) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {uploading ? "Subiendo archivo…" : saving ? "Guardando…" : recurso ? "Guardar cambios" : "Publicar recurso"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
