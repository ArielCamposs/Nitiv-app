import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

const ACTION_META: Record<string, { label: string; color: string }> = {
    delete_emotional_log: { label: "Eliminó registro emocional", color: "bg-rose-100 text-rose-700" },
    edit_emotional_log: { label: "Editó registro emocional", color: "bg-amber-100 text-amber-700" },
    create_student: { label: "Creó estudiante", color: "bg-emerald-100 text-emerald-700" },
    edit_student: { label: "Editó estudiante", color: "bg-amber-100 text-amber-700" },
    toggle_student_active: { label: "Cambió estado estudiante", color: "bg-slate-100 text-slate-600" },
    reset_student_password: { label: "Cambió contraseña estudiante", color: "bg-indigo-100 text-indigo-700" },
    assign_student_to_course: { label: "Asignó estudiante a curso", color: "bg-sky-100 text-sky-700" },
    remove_student_from_course: { label: "Removió estudiante de curso", color: "bg-orange-100 text-orange-700" },
    create_course: { label: "Creó curso", color: "bg-emerald-100 text-emerald-700" },
    edit_course: { label: "Editó curso", color: "bg-amber-100 text-amber-700" },
    toggle_course_active: { label: "Cambió estado de curso", color: "bg-slate-100 text-slate-600" },
    assign_teacher_to_course: { label: "Asignó docente a curso", color: "bg-sky-100 text-sky-700" },
    remove_teacher_from_course: { label: "Removió docente de curso", color: "bg-orange-100 text-orange-700" },
    create_user: { label: "Creó usuario staff", color: "bg-emerald-100 text-emerald-700" },
    edit_user: { label: "Editó usuario staff", color: "bg-amber-100 text-amber-700" },
    toggle_user_active: { label: "Cambió estado usuario", color: "bg-slate-100 text-slate-600" },
    reset_user_password: { label: "Cambió contraseña usuario", color: "bg-indigo-100 text-indigo-700" },
    edit_institution: { label: "Editó datos de institución", color: "bg-purple-100 text-purple-700" },
}

// Keys translated to Spanish
const FIELD_LABELS: Record<string, string> = {
    name: "Nombre",
    last_name: "Apellido",
    rut: "RUT",
    birthdate: "Fecha de nacimiento",
    email: "Correo electrónico",
    phone: "Teléfono",
    role: "Rol",
    active: "Estado",
    course_id: "Curso",
    guardian_name: "Apoderado",
    guardian_phone: "Teléfono apoderado",
    guardian_email: "Correo apoderado",
    level: "Nivel",
    section: "Sección",
    year: "Año",
    address: "Dirección",
    region: "Región",
    comuna: "Comuna",
    logo_url: "Logo URL",
    plan: "Plan",
    teacherId: "ID Docente",
    studentId: "ID Estudiante",
    courseId: "ID Curso",
    emotion: "Emoción",
    reflection: "Reflexión",
}

function formatValue(key: string, value: unknown): string {
    if (value === null || value === undefined) return "—"
    if (key === "active") return value ? "Activo" : "Inactivo"
    if (key === "birthdate" && typeof value === "string") {
        try { return new Date(value).toLocaleDateString("es-CL") } catch { return String(value) }
    }
    return String(value)
}

function labelForKey(key: string): string {
    return FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

// Renders a list of field → value pairs from a data object
// Keys that should never be shown to the admin (internal IDs, technical fields)
const HIDDEN_KEYS = [
    "id", "institution_id", "course_id", "student_id", "teacher_id",
    "courseId", "studentId", "teacherId", "user_id", "admin_id",
    "entity_id", "reporter_id", "resolved_by",
]

function DataTable({ data, colorClass }: { data: Record<string, unknown>; colorClass: string }) {
    const entries = Object.entries(data).filter(([k]) => !HIDDEN_KEYS.includes(k))
    if (entries.length === 0) return null
    return (
        <div className={`rounded-lg border p-3 space-y-1.5 ${colorClass}`}>
            {entries.map(([key, val]) => (
                <div key={key} className="flex items-start gap-2">
                    <span className="text-[11px] font-medium text-slate-500 w-32 shrink-0">
                        {labelForKey(key)}
                    </span>
                    <span className="text-[11px] text-slate-800 font-medium break-all">
                        {formatValue(key, val)}
                    </span>
                </div>
            ))}
        </div>
    )
}

// Shows only fields that changed (diff between before and after)
function ChangeDiff({ before, after }: { before: Record<string, unknown>; after: Record<string, unknown> }) {
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
        .values()
    const changed = [...allKeys].filter(k => {
        if (HIDDEN_KEYS.includes(k)) return false
        return JSON.stringify(before[k]) !== JSON.stringify(after[k])
    })

    if (changed.length === 0) {
        return <p className="text-[11px] text-slate-400 italic">Sin cambios detectados</p>
    }

    return (
        <div className="space-y-1.5">
            {changed.map(key => (
                <div key={key} className="rounded-lg border border-slate-100 bg-white overflow-hidden">
                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-600">{labelForKey(key)}</span>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-slate-100">
                        <div className="px-3 py-2 bg-rose-50">
                            <p className="text-[10px] text-rose-400 font-semibold mb-0.5">Antes</p>
                            <p className="text-[11px] text-slate-700">{formatValue(key, before[key])}</p>
                        </div>
                        <div className="px-3 py-2 bg-emerald-50">
                            <p className="text-[10px] text-emerald-500 font-semibold mb-0.5">Después</p>
                            <p className="text-[11px] text-slate-700">{formatValue(key, after[key])}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default async function AdminAuditoriaPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
        .from("users").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") redirect("/admin")

    const { data: logs } = await supabase
        .from("admin_audit_logs")
        .select("id, action, entity_type, entity_id, entity_description, before_data, after_data, created_at")
        .eq("admin_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200)

    return (
        <main className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Auditoría de acciones</h1>
                    <p className="text-sm text-slate-500">
                        Registro de todas tus acciones como administrador.
                    </p>
                </div>

                <span className="text-xs text-slate-500">
                    {logs?.length ?? 0} acción{(logs?.length ?? 0) !== 1 ? "es" : ""} registrada{(logs?.length ?? 0) !== 1 ? "s" : ""}
                </span>

                {(logs ?? []).length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center">
                        <p className="text-sm text-slate-400">No hay acciones registradas aún.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {(logs ?? []).map((log) => {
                            const meta = ACTION_META[log.action] ?? { label: log.action, color: "bg-slate-100 text-slate-600" }
                            const hasBoth = log.before_data && log.after_data
                            const hasOnlyAfter = !log.before_data && log.after_data
                            const hasOnlyBefore = log.before_data && !log.after_data

                            return (
                                <Card key={log.id} className="overflow-hidden">
                                    <CardContent className="py-3 px-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1 flex-1 min-w-0">
                                                {/* Header */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge className={`text-[11px] ${meta.color}`}>
                                                        {meta.label}
                                                    </Badge>
                                                    {log.entity_description && (
                                                        <span className="text-sm font-medium text-slate-700 truncate">
                                                            {log.entity_description}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Detail expandable */}
                                                {(log.before_data || log.after_data) && (
                                                    <details className="mt-2 group">
                                                        <summary className="text-[11px] text-slate-400 cursor-pointer hover:text-indigo-500 select-none transition-colors list-none flex items-center gap-1">
                                                            <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                            Ver detalle
                                                        </summary>
                                                        <div className="mt-2 space-y-2">
                                                            {hasBoth ? (
                                                                <>
                                                                    <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Cambios realizados</p>
                                                                    <ChangeDiff
                                                                        before={log.before_data as Record<string, unknown>}
                                                                        after={log.after_data as Record<string, unknown>}
                                                                    />
                                                                </>
                                                            ) : hasOnlyAfter ? (
                                                                <>
                                                                    <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Datos creados</p>
                                                                    <DataTable
                                                                        data={log.after_data as Record<string, unknown>}
                                                                        colorClass="border-emerald-100 bg-emerald-50"
                                                                    />
                                                                </>
                                                            ) : hasOnlyBefore ? (
                                                                <>
                                                                    <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Datos eliminados</p>
                                                                    <DataTable
                                                                        data={log.before_data as Record<string, unknown>}
                                                                        colorClass="border-rose-100 bg-rose-50"
                                                                    />
                                                                </>
                                                            ) : null}
                                                        </div>
                                                    </details>
                                                )}
                                            </div>

                                            <p className="text-xs text-slate-400 shrink-0 text-right">
                                                {new Date(log.created_at).toLocaleDateString("es-CL", {
                                                    day: "2-digit", month: "short", year: "numeric",
                                                })}
                                                <br />
                                                <span className="font-mono">
                                                    {new Date(log.created_at).toLocaleTimeString("es-CL", {
                                                        hour: "2-digit", minute: "2-digit",
                                                    })}
                                                </span>
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        </main>
    )
}
