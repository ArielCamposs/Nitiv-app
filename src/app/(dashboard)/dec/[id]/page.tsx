import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Pencil, ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DecDeleteButton } from "@/components/dec/dec-delete-button"
import { DecPrintPdf } from "@/components/dec/dec-print-pdf"

const SEVERITY_META = {
    moderada: { label: "Etapa 2 — Moderada", color: "bg-amber-100 text-amber-700" },
    severa: { label: "Etapa 3 — Severa", color: "bg-rose-100 text-rose-700" },
}

const TYPE_LABELS: Record<string, string> = {
    DEC: "Desregulación Emocional y Conductual",
    agresion_fisica: "Agresión Física",
    agresion_verbal: "Agresión Verbal",
    bullying: "Bullying",
    acoso: "Acoso",
    consumo: "Consumo",
    autoagresion: "Autoagresión",
    otro: "Otro",
}

async function getDecDetail(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: incident, error } = await supabase
        .from("incidents")
        .select(`
      id,
      folio,
      type,
      severity,
      location,
      context,
      conduct_types,
      triggers,
      actions_taken,
      description,
      guardian_contacted,
      resolved,
      incident_date,
      end_date,
      created_at,
      students (
        id,
        name,
        last_name,
        rut,
        guardian_name,
        guardian_phone,
        courses ( name, level )
      ),
      users!reporter_id (
        id,
        name,
        last_name,
        role
      )
    `)
        .eq("id", id)
        .maybeSingle()

    if (error || !incident) return null

    // Detectar si el usuario actual es admin y nombre de institución (para PDF)
    const profile = user
        ? (await supabase.from("users").select("role, institution_id").eq("id", user.id).single()).data
        : null
    const isAdmin = profile?.role === "admin"
    let institutionName: string | undefined
    let institutionLogoUrl: string | undefined
    if (profile?.institution_id) {
        const { data: inst } = await supabase
            .from("institutions")
            .select("name, logo_url")
            .eq("id", profile.institution_id)
            .maybeSingle()
        institutionName = inst?.name
        institutionLogoUrl = inst?.logo_url ?? undefined
    }

    return {
        incident,
        isAdmin,
        institutionName,
        institutionLogoUrl,
        userRole: profile?.role as string | undefined,
    }
}

/** Parsea el campo context del DEC en líneas etiqueta/valor (solo las que vienen del formulario). */
function parseDecContext(context: string | null): { label: string; value: string }[] {
    if (!context?.trim()) return []
    const segments = context.split(". ").map((s) => s.trim()).filter(Boolean)
    const result: { label: string; value: string }[] = []
    for (const seg of segments) {
        if (seg.includes(" | ")) {
            for (const part of seg.split(" | ")) {
                const idx = part.indexOf(": ")
                if (idx !== -1) result.push({ label: part.slice(0, idx + 1), value: part.slice(idx + 2) })
            }
        } else {
            const idx = seg.indexOf(": ")
            if (idx !== -1) result.push({ label: seg.slice(0, idx + 1), value: seg.slice(idx + 2) })
        }
    }
    return result
}

function SectionBlock({
    title,
    children,
}: {
    title: string
    children: React.ReactNode
}) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}

function TagList({ items }: { items: string[] | null }) {
    if (!items?.length) {
        return <p className="text-sm text-slate-400">No registrado</p>
    }
    return (
        <div className="flex flex-wrap gap-2">
            {items.map((item) => (
                <span
                    key={item}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                >
                    {item}
                </span>
            ))}
        </div>
    )
}

export default async function DecDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const data = await getDecDetail(id)

    if (!data) return notFound()

    const { incident, institutionName, institutionLogoUrl } = data
    const student = incident.students as any
    const reporter = incident.users as any
    const severity = SEVERITY_META[incident.severity as keyof typeof SEVERITY_META]

    const pdfData = {
        folio: incident.folio,
        type: incident.type,
        severity: incident.severity,
        location: incident.location,
        context: incident.context,
        conduct_types: incident.conduct_types,
        triggers: incident.triggers,
        actions_taken: incident.actions_taken,
        description: incident.description,
        guardian_contacted: incident.guardian_contacted ?? false,
        resolved: incident.resolved ?? false,
        incident_date: incident.incident_date,
        end_date: incident.end_date,
        student: student ? { name: student.name, last_name: student.last_name, rut: student.rut, guardian_name: student.guardian_name, guardian_phone: student.guardian_phone, courses: student.courses } : null,
        reporter: reporter ? { name: reporter.name, last_name: reporter.last_name } : null,
        recipients: [],
    }

    const backHref = data.userRole === "convivencia" ? "/convivencia/dec" : data.userRole === "dupla" ? "/dupla/dec" : "/dec"

    return (
        <main className="min-h-screen bg-slate-50 print:bg-white">
            <div id="dec-print-area" className="mx-auto max-w-3xl px-4 py-8 space-y-6 print:py-6 print:max-w-none">

                {/* Botón Atrás — volver al historial (oculto al imprimir) */}
                <div className="print:hidden">
                    <Link
                        href={backHref}
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al historial
                    </Link>
                </div>

                {/* Encabezado con acciones Imprimir / PDF */}
                <div className="flex flex-wrap items-start justify-between gap-4 print:flex print:block">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold text-slate-900 print:text-xl">Ficha DEC</h1>
                            {incident.folio && (
                                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-500 print:bg-slate-100">
                                    {incident.folio}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1 print:text-xs">
                            {new Date(incident.incident_date).toLocaleDateString("es-CL", {
                                weekday: "long",
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                            {incident.end_date && (
                                <>
                                    {" - "}
                                    {new Date(incident.end_date).toLocaleTimeString("es-CL", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </>
                            )}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <DecPrintPdf data={pdfData} institutionName={institutionName} institutionLogoUrl={institutionLogoUrl} />
                        <Badge className={`text-xs ${severity?.color}`}>
                            {severity?.label ?? incident.severity}
                        </Badge>

                        {/* Acciones admin — ocultas al imprimir */}
                        {data.isAdmin && (
                            <div className="print:hidden flex items-center gap-2">
                                <Link href={`/dec/${incident.id}/editar`}>
                                    <Button size="sm" variant="outline" className="gap-1">
                                        <Pencil className="h-3.5 w-3.5" />
                                        Editar
                                    </Button>
                                </Link>
                                <DecDeleteButton
                                    incidentId={incident.id}
                                    folio={incident.folio}
                                    redirectTo="/admin/dec"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Sección 1: Identificación */}
                <SectionBlock title="1. Identificación del estudiante">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                        <div>
                            <p className="text-xs text-slate-400">Nombre</p>
                            <p className="font-medium text-slate-900">
                                {student?.name} {student?.last_name}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">RUT</p>
                            <p className="text-slate-700">{student?.rut ?? "No registrado"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Curso</p>
                            <p className="text-slate-700">
                                {student?.courses?.name ?? "Sin curso"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Apoderado</p>
                            <p className="text-slate-700">
                                {student?.guardian_name ?? "No registrado"}
                            </p>
                        </div>
                        {student?.guardian_phone && (
                            <div>
                                <p className="text-xs text-slate-400">Teléfono apoderado</p>
                                <p className="text-slate-700">{student.guardian_phone}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-slate-400">Apoderado contactado</p>
                            <p className={incident.guardian_contacted ? "text-emerald-600 font-medium" : "text-rose-500"}>
                                {incident.guardian_contacted ? "Sí" : "No"}
                            </p>
                        </div>
                    </div>
                </SectionBlock>

                {/* Sección 2: Contexto */}
                <SectionBlock title="2. Contexto del incidente">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                        <div>
                            <p className="text-xs text-slate-400">Fecha y hora de inicio</p>
                            <p className="text-slate-700">
                                {new Date(incident.incident_date).toLocaleDateString("es-CL", {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Hora de término</p>
                            <p className="text-slate-700">
                                {incident.end_date
                                    ? new Date(incident.end_date).toLocaleTimeString("es-CL", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })
                                    : "No registrada"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Lugar</p>
                            <p className="text-slate-700">{incident.location ?? "No registrado"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Tipo de incidente</p>
                            <p className="text-slate-700">
                                {TYPE_LABELS[incident.type] ?? incident.type}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400">Reportado por</p>
                            <p className="text-slate-700">
                                {reporter ? (
                                    <Link href={`/perfil/${reporter.id}`} className="hover:underline hover:text-indigo-600 transition-colors">
                                        {reporter.name} {reporter.last_name}
                                    </Link>
                                ) : "Desconocido"}
                            </p>
                        </div>
                    </div>
                    {(() => {
                        const contextLines = parseDecContext(incident.context)
                        if (contextLines.length === 0 && incident.context) {
                            return (
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <p className="text-xs text-slate-400">Contexto adicional</p>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap mt-0.5">{incident.context}</p>
                                </div>
                            )
                        }
                        if (contextLines.length > 0) {
                            return (
                                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Detalles del contexto</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
                                        {contextLines.map((line, i) => {
                                            const lbl = line.label.trim().replace(/:$/, "")
                                            const displayLabel =
                                                lbl === "personas" || lbl === "Nº aprox. personas" ? "N° de personas" : line.label
                                            return (
                                                <div key={i}>
                                                    <p className="text-xs text-slate-400">{displayLabel}</p>
                                                    <p className="text-slate-700">{line.value}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        }
                        return null
                    })()}
                </SectionBlock>

                {/* Sección 3: Tipificación */}
                <SectionBlock title="3. Conductas observadas">
                    <TagList items={incident.conduct_types} />
                </SectionBlock>

                {/* Sección 4: Análisis funcional */}
                <SectionBlock title="4. Situaciones desencadenantes">
                    <TagList items={incident.triggers} />
                </SectionBlock>

                {/* Sección 5: Acciones tomadas */}
                <SectionBlock title="5. Acciones realizadas">
                    <TagList items={incident.actions_taken} />
                </SectionBlock>

                {/* Sección 6: Observaciones */}
                {incident.description && (
                    <SectionBlock title="6. Observaciones adicionales">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                            {incident.description}
                        </p>
                    </SectionBlock>
                )}

            </div>
        </main>
    )
}
