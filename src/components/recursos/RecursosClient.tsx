"use client"

import { useState, useMemo, useTransition, useRef, useEffect } from "react"
import {
    Search, FileText, Video, Link2, BookOpen, Star,
    ChevronDown, X, Plus, Pencil, Trash2, ExternalLink,
    Info, File, Image as ImageIcon, Download
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { ResourceFormModal } from "./ResourceFormModal"

// ─── Types ────────────────────────────────────────────────────────────────────
export type RecursoTipo = "pdf" | "video" | "link" | "documento"

export interface Etiqueta { id: string; nombre: string }

export interface Recurso {
    id: string
    title: string
    body: string | null
    tipo: RecursoTipo
    categoria: string
    file_url: string | null
    file_name: string | null
    file_size: number | null
    file_mime: string | null
    destacado: boolean
    rol_destino: string[]
    created_at: string
    updated_at: string
    created_by?: string
    etiquetas: Etiqueta[]
    creator_name?: string
    creator_role?: string
}

interface Props {
    initialResources: Recurso[]
    allEtiquetas: Etiqueta[]
    canUpload: boolean    // docente, dupla, convivencia, admin
    isAdmin: boolean
    userId: string
    institutionId: string
}

// ─── Config ───────────────────────────────────────────────────────────────────
const TIPO_META: Record<RecursoTipo, { label: string; icon: React.ElementType; color: string; bg: string; accent: string }> = {
    pdf: { label: "PDF", icon: FileText, color: "text-red-600", bg: "bg-red-50 border-red-100", accent: "bg-red-400" },
    video: { label: "Video", icon: Video, color: "text-violet-600", bg: "bg-violet-50 border-violet-100", accent: "bg-violet-400" },
    link: { label: "Enlace", icon: Link2, color: "text-blue-600", bg: "bg-blue-50 border-blue-100", accent: "bg-blue-400" },
    documento: { label: "Documento", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100", accent: "bg-emerald-400" },
}

const CATEGORIA_META: Record<string, { label: string; color: string }> = {
    general: { label: "General", color: "bg-slate-100 text-slate-600" },
    socioemocional: { label: "Socioemocional", color: "bg-blue-100 text-blue-700" },
    pedagogico: { label: "Pedagógico", color: "bg-emerald-100 text-emerald-700" },
    orientacion: { label: "Orientación", color: "bg-violet-100 text-violet-700" },
    apoyo_pie: { label: "Apoyo PIE", color: "bg-amber-100 text-amber-700" },
    familia: { label: "Familia", color: "bg-rose-100 text-rose-700" },
}

const ROLE_TABS: { role: string; label: string; dot: string }[] = [
    { role: "director", label: "Dirección", dot: "bg-indigo-500" },
    { role: "utp", label: "UTP", dot: "bg-violet-500" },
    { role: "inspector", label: "Inspectoría", dot: "bg-orange-500" },
    { role: "dupla", label: "Dupla Psicosocial", dot: "bg-blue-500" },
    { role: "convivencia", label: "Convivencia", dot: "bg-teal-500" },
    { role: "docente", label: "Docentes", dot: "bg-emerald-500" },
    { role: "estudiante", label: "Estudiantes", dot: "bg-amber-500" },
    { role: "centro_alumnos", label: "Centro de Alumnos", dot: "bg-rose-500" },
    { role: "admin", label: "Administración", dot: "bg-slate-400" },
]
const getRoleTab = (role?: string) =>
    ROLE_TABS.find(t => t.role === role) ?? { role: role ?? "", label: role ?? "Sin clasificar", dot: "bg-slate-300" }

// ─── Preview panel ────────────────────────────────────────────────────────────
function PreviewPanel({ recurso, onClose }: { recurso: Recurso; onClose: () => void }) {
    const canEmbed = recurso.file_mime === "application/pdf" || (recurso.file_mime?.startsWith("image/") ?? false)
    const isOffice = recurso.file_mime && [
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ].includes(recurso.file_mime)

    const catMeta = CATEGORIA_META[recurso.categoria] ?? CATEGORIA_META.general
    const tipoMeta = TIPO_META[recurso.tipo]
    const Icon = tipoMeta.icon

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            {/* Modal */}
            <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-modal-in">
                {/* Colored accent bar — matches resource tipo */}
                <div className={`h-1.5 w-full shrink-0 ${tipoMeta.accent}`} />
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b shrink-0">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${tipoMeta.bg} ${tipoMeta.color}`}>
                                <Icon className="h-3 w-3" />
                                {tipoMeta.label}
                            </div>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${catMeta.color}`}>
                                {catMeta.label}
                            </span>
                            {recurso.destacado && (
                                <span className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                                    <Star className="h-2.5 w-2.5 fill-amber-400 stroke-amber-400" /> Destacado
                                </span>
                            )}
                        </div>
                        <h2 className="text-base font-semibold text-slate-900 leading-snug">{recurso.title}</h2>
                        {recurso.body && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{recurso.body}</p>}
                        {recurso.creator_name && (
                            <p className="text-[10px] text-slate-400 mt-2">
                                Subido por <strong className="font-medium">{recurso.creator_name}</strong>
                                {recurso.creator_role && ` · ${getRoleTab(recurso.creator_role).label}`}
                                {" · "}{new Date(recurso.created_at).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Preview content */}
                <div className="flex-1 overflow-auto min-h-0">
                    {recurso.file_url ? (
                        <>
                            {/* PDF embed */}
                            {recurso.file_mime === "application/pdf" && (
                                <iframe src={recurso.file_url} className="w-full h-full min-h-[55vh]" title={recurso.title} />
                            )}
                            {/* Image preview */}
                            {recurso.file_mime?.startsWith("image/") && (
                                <div className="p-6 flex items-center justify-center bg-slate-50 min-h-[40vh]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={recurso.file_url} alt={recurso.title} className="max-w-full max-h-[65vh] rounded-xl object-contain shadow" />
                                </div>
                            )}
                            {/* Office files via Google Docs Viewer */}
                            {isOffice && (
                                <iframe
                                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(recurso.file_url)}&embedded=true`}
                                    className="w-full h-full min-h-[60vh]"
                                    title={recurso.title}
                                />
                            )}
                            {/* Fallback: download button */}
                            {!canEmbed && !isOffice && (
                                <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                                    <div className={`flex h-14 w-14 items-center justify-center rounded-full ${tipoMeta.bg}`}>
                                        <Icon className={`h-6 w-6 ${tipoMeta.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">Vista previa no disponible</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Este tipo de archivo no se puede previsualizar.</p>
                                    </div>
                                    <a href={recurso.file_url!} download={recurso.file_name ?? true}
                                        className="flex items-center gap-2 rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors">
                                        <Download className="h-4 w-4" /> Descargar archivo
                                    </a>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                <Info className="h-5 w-5 text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-500">Este recurso no tiene un archivo adjunto.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {recurso.file_url && (
                    <div className="shrink-0 border-t px-6 py-3 flex items-center justify-between">
                        {recurso.file_name && (
                            <span className="text-[10px] text-slate-400 truncate flex-1 mr-4">{recurso.file_name}</span>
                        )}
                        <a href={recurso.file_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 transition-colors shrink-0">
                            <ExternalLink className="h-3.5 w-3.5" /> Abrir en nueva pestaña
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Resource card ────────────────────────────────────────────────────────────
function RecursoCard({ recurso, canEdit, onEdit, onDelete, onPreview }: {
    recurso: Recurso
    canEdit: boolean
    onEdit: (r: Recurso) => void
    onDelete: (id: string) => void
    onPreview: (r: Recurso) => void
}) {
    const meta = TIPO_META[recurso.tipo]
    const Icon = meta.icon
    const catMeta = CATEGORIA_META[recurso.categoria] ?? CATEGORIA_META.general

    return (
        <div
            onClick={() => onPreview(recurso)}
            className="group relative flex flex-col rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
        >
            {/* Top accent bar */}
            <div className={`h-1 w-full ${meta.accent}`} />

            <div className="p-5 flex flex-col gap-3 flex-1">
                {/* Badges row */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${meta.bg} ${meta.color}`}>
                        <Icon className="h-3 w-3" />
                        {meta.label}
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${catMeta.color}`}>
                        {catMeta.label}
                    </span>
                    {recurso.destacado && (
                        <span className="ml-auto flex items-center gap-0.5 text-[9px] font-semibold text-amber-500">
                            <Star className="h-2.5 w-2.5 fill-amber-400 stroke-amber-400" /> Destacado
                        </span>
                    )}
                </div>

                {/* Title + description */}
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">
                        {recurso.title}
                    </h3>
                    {recurso.body && (
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{recurso.body}</p>
                    )}
                </div>

                {/* File name */}
                {recurso.file_name && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                        <File className="h-2.5 w-2.5 shrink-0" />
                        {recurso.file_name}
                    </p>
                )}

                {/* Tags */}
                {recurso.etiquetas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {recurso.etiquetas.map(e => (
                            <span key={e.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                {e.nombre}
                            </span>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400">
                        {new Date(recurso.created_at).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                    </span>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        {canEdit && (
                            <>
                                <button onClick={() => onEdit(recurso)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Editar">
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => onDelete(recurso.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </>
                        )}
                        <span className="text-[10px] font-medium text-indigo-600 group-hover:underline flex items-center gap-0.5">
                            Ver <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function SkeletonCard() {
    return (
        <div className="rounded-2xl border bg-white overflow-hidden animate-pulse">
            <div className="h-1 bg-slate-200" />
            <div className="p-5 space-y-3">
                <div className="flex gap-2"><div className="h-4 w-14 rounded-full bg-slate-100" /><div className="h-4 w-20 rounded-full bg-slate-100" /></div>
                <div className="space-y-1.5"><div className="h-4 w-3/4 rounded bg-slate-100" /><div className="h-3 w-full rounded bg-slate-100" /></div>
                <div className="flex justify-between pt-2 border-t border-slate-100"><div className="h-3 w-16 rounded bg-slate-100" /><div className="h-3 w-10 rounded bg-slate-100" /></div>
            </div>
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function RecursosClient({ initialResources, allEtiquetas, canUpload, isAdmin, userId, institutionId }: Props) {
    const [resources, setResources] = useState<Recurso[]>(initialResources)
    const [activeTab, setActiveTab] = useState("todos")
    const [search, setSearch] = useState("")
    const [tipoFilter, setTipoFilter] = useState<RecursoTipo | "todos">("todos")
    const [tagFilters, setTagFilters] = useState<Set<string>>(new Set())
    const [showTagDropdown, setShowTagDropdown] = useState(false)
    const [editingRecurso, setEditingRecurso] = useState<Recurso | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [previewRecurso, setPreviewRecurso] = useState<Recurso | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const supabase = createClient()

    // ─── Tabs ──────────────────────────────────────────────────────────────────
    const availableTabs = useMemo(() => {
        const rolesWithResources = new Set(resources.map(r => r.creator_role ?? ""))
        const dynamic = ROLE_TABS.filter(t => rolesWithResources.has(t.role))
        return [{ role: "todos", label: "Todos", dot: "bg-slate-400" }, ...dynamic]
    }, [resources])

    // ─── Filter ────────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        return resources.filter(r => {
            const matchTab = activeTab === "todos" || r.creator_role === activeTab
            const matchSearch = !search.trim()
                || r.title.toLowerCase().includes(search.toLowerCase())
                || (r.body ?? "").toLowerCase().includes(search.toLowerCase())
            const matchTipo = tipoFilter === "todos" || r.tipo === tipoFilter
            const matchTags = tagFilters.size === 0 || r.etiquetas.some(e => tagFilters.has(e.id))
            return matchTab && matchSearch && matchTipo && matchTags
        })
    }, [resources, activeTab, search, tipoFilter, tagFilters])

    const destacados = useMemo(() => filtered.filter(r => r.destacado), [filtered])
    const rest = useMemo(() => filtered.filter(r => !r.destacado)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [filtered])

    const isFiltering = search.trim() || tipoFilter !== "todos" || tagFilters.size > 0

    // ─── Handlers ──────────────────────────────────────────────────────────────
    const toggleTag = (id: string) => setTagFilters(prev => {
        const next = new Set(prev)
        if (next.has(id)) { next.delete(id) } else { next.add(id) }
        return next
    })

    const handleSave = (recurso: Recurso) => {
        setResources(prev => {
            const idx = prev.findIndex(r => r.id === recurso.id)
            if (idx >= 0) { const next = [...prev]; next[idx] = recurso; return next }
            return [recurso, ...prev]
        })
        setShowForm(false); setEditingRecurso(null)
    }

    const handleDelete = (id: string) => {
        if (deletingId) return
        setDeletingId(id)
        startTransition(async () => {
            const { error } = await supabase.from("resources").delete().eq("id", id)
            if (error) { toast.error("Error al eliminar el recurso") }
            else { setResources(prev => prev.filter(r => r.id !== id)); toast.success("Recurso eliminado") }
            setDeletingId(null)
        })
    }

    return (
        <div className="space-y-6">
            {/* ─── TABS ─────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none border-b border-slate-200">
                {availableTabs.map(tab => {
                    const isActive = activeTab === tab.role
                    const count = tab.role === "todos"
                        ? resources.length
                        : resources.filter(r => r.creator_role === tab.role).length
                    return (
                        <button key={tab.role} onClick={() => setActiveTab(tab.role)}
                            className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                            {tab.role !== "todos" && <span className={`h-2 w-2 rounded-full ${tab.dot} shrink-0`} />}
                            {tab.label}
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
                                {count}
                            </span>
                            {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />}
                        </button>
                    )
                })}
            </div>

            {/* ─── TOOLBAR ─────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="text" placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition" />
                    {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                    {(["todos", "pdf", "video", "link", "documento"] as const).map(t => (
                        <button key={t} onClick={() => setTipoFilter(t)}
                            className={`rounded-xl px-3 py-2 text-xs font-medium border transition-all ${tipoFilter === t ? "bg-slate-800 text-white border-slate-800 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                            {t === "todos" ? "Todos" : TIPO_META[t].label}
                        </button>
                    ))}
                </div>

                {allEtiquetas.length > 0 && (
                    <div className="relative">
                        <button onClick={() => setShowTagDropdown(p => !p)}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${tagFilters.size > 0 ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                            Etiquetas {tagFilters.size > 0 && <span className="rounded-full bg-indigo-600 text-white px-1.5 py-0.5 text-[10px]">{tagFilters.size}</span>}
                            <ChevronDown className="h-3 w-3" />
                        </button>
                        {showTagDropdown && (
                            <div className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-xl border border-slate-200 bg-white shadow-lg p-2 space-y-0.5">
                                {allEtiquetas.map(e => (
                                    <button key={e.id} onClick={() => toggleTag(e.id)}
                                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-left transition-colors ${tagFilters.has(e.id) ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-700"}`}>
                                        <span className={`h-3 w-3 rounded-sm border flex items-center justify-center shrink-0 ${tagFilters.has(e.id) ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                                            {tagFilters.has(e.id) && <span className="text-white text-[8px]">✓</span>}
                                        </span>
                                        {e.nombre}
                                    </button>
                                ))}
                                {tagFilters.size > 0 && <button onClick={() => setTagFilters(new Set())} className="w-full text-[10px] text-slate-400 hover:text-slate-600 px-3 py-1 text-left">Limpiar</button>}
                            </div>
                        )}
                    </div>
                )}

                {canUpload && (
                    <button onClick={() => { setEditingRecurso(null); setShowForm(true) }}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm transition-all">
                        <Plus className="h-4 w-4" /> Subir recurso
                    </button>
                )}
            </div>

            {/* Active tag chips */}
            {tagFilters.size > 0 && (
                <div className="flex flex-wrap gap-2">
                    {Array.from(tagFilters).map(tId => {
                        const etiq = allEtiquetas.find(e => e.id === tId)
                        if (!etiq) return null
                        return (
                            <button key={tId} onClick={() => toggleTag(tId)}
                                className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-200 transition-colors">
                                {etiq.nombre} <X className="h-2.5 w-2.5" />
                            </button>
                        )
                    })}
                </div>
            )}

            {/* ─── DESTACADOS ───────────────────────────────────────────────── */}
            {destacados.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                        <span className="text-sm font-semibold text-slate-700">Destacados</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {destacados.map(r => (
                            <RecursoCard key={r.id} recurso={r}
                                canEdit={canUpload}
                                onEdit={rec => { setEditingRecurso(rec); setShowForm(true) }}
                                onDelete={handleDelete}
                                onPreview={setPreviewRecurso} />
                        ))}
                    </div>
                </section>
            )}

            {/* ─── MAIN GRID ────────────────────────────────────────────────── */}
            <section className="space-y-3">
                {(destacados.length > 0 || isFiltering) && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">{destacados.length > 0 ? "Más recursos" : "Recursos"}</span>
                        {isFiltering && <span className="text-xs text-slate-400">({filtered.length} resultado{filtered.length !== 1 ? "s" : ""})</span>}
                    </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {isPending && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                    {!isPending && rest.length === 0 && destacados.length === 0 && (
                        <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                <Info className="h-5 w-5 text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-500">
                                {isFiltering
                                    ? "No hay recursos que coincidan con los filtros."
                                    : activeTab !== "todos"
                                        ? `Aún no hay recursos de ${getRoleTab(activeTab).label}.`
                                        : "Aún no hay recursos disponibles."}
                            </p>
                            {canUpload && !isFiltering && (
                                <button onClick={() => { setEditingRecurso(null); setShowForm(true) }}
                                    className="mt-1 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-all">
                                    <Plus className="h-4 w-4" /> Subir el primer recurso
                                </button>
                            )}
                        </div>
                    )}
                    {rest.map(r => {
                        const canEdit = isAdmin || r.created_by === userId
                        return (
                            <RecursoCard key={r.id} recurso={r}
                                canEdit={canEdit && canUpload}
                                onEdit={rec => { setEditingRecurso(rec); setShowForm(true) }}
                                onDelete={handleDelete}
                                onPreview={setPreviewRecurso} />
                        )
                    })}
                </div>
            </section>

            {/* ─── PREVIEW PANEL ────────────────────────────────────────────── */}
            {previewRecurso && (
                <PreviewPanel recurso={previewRecurso} onClose={() => setPreviewRecurso(null)} />
            )}

            {/* ─── FORM MODAL ───────────────────────────────────────────────── */}
            {showForm && canUpload && (
                <ResourceFormModal
                    recurso={editingRecurso}
                    allEtiquetas={allEtiquetas}
                    institutionId={institutionId}
                    onSave={handleSave}
                    onClose={() => { setShowForm(false); setEditingRecurso(null) }}
                />
            )}
        </div>
    )
}
