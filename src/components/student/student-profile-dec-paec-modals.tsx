"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PaecDetail } from "@/components/paec/paec-detail"
import { ExternalLink } from "lucide-react"

const SEVERITY_META: Record<string, { label: string; color: string }> = {
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

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
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
                <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    {item}
                </span>
            ))}
        </div>
    )
}

function DecDetailModalBody({ incident }: { incident: Record<string, any> }) {
    const student = incident.students
    const reporter = incident.users
    const severity = SEVERITY_META[incident.severity as keyof typeof SEVERITY_META]

    return (
        <div className="space-y-4 pr-2">
            <div className="flex flex-wrap items-center gap-2">
                {incident.folio && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-500">
                        {incident.folio}
                    </span>
                )}
                <Badge className={`text-xs ${severity?.color ?? "bg-slate-100"}`}>
                    {severity?.label ?? incident.severity}
                </Badge>
                <Badge variant="outline" className={incident.resolved ? "border-emerald-200 text-emerald-700" : ""}>
                    {incident.resolved ? "Resuelto" : "En seguimiento"}
                </Badge>
            </div>

            <SectionBlock title="1. Identificación del estudiante">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
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
                        <p className="text-slate-700">{student?.courses?.name ?? "Sin curso"}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Apoderado</p>
                        <p className="text-slate-700">{student?.guardian_name ?? "No registrado"}</p>
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

            <SectionBlock title="2. Contexto del incidente">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
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
                        <p className="text-slate-700 break-words">{incident.location ?? "No registrado"}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400">Tipo de incidente</p>
                        <p className="text-slate-700">{TYPE_LABELS[incident.type] ?? incident.type}</p>
                    </div>
                    <div className="sm:col-span-2">
                        <p className="text-xs text-slate-400">Reportado por</p>
                        <p className="text-slate-700">
                            {reporter ? `${reporter.name} ${reporter.last_name}` : "Desconocido"}
                            {reporter?.role && (
                                <span className="text-slate-500 capitalize"> · {reporter.role}</span>
                            )}
                        </p>
                    </div>
                </div>
                {(() => {
                    const contextLines = parseDecContext(incident.context)
                    if (contextLines.length === 0 && incident.context) {
                        return (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <p className="text-xs text-slate-400">Contexto adicional</p>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap break-words mt-0.5">
                                    {incident.context}
                                </p>
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
                                                <p className="text-slate-700 break-words">{line.value}</p>
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

            <SectionBlock title="3. Conductas observadas">
                <TagList items={incident.conduct_types} />
            </SectionBlock>

            <SectionBlock title="4. Situaciones desencadenantes">
                <TagList items={incident.triggers} />
            </SectionBlock>

            <SectionBlock title="5. Acciones realizadas">
                <TagList items={incident.actions_taken} />
            </SectionBlock>

            {incident.description && (
                <SectionBlock title="6. Observaciones adicionales">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{incident.description}</p>
                </SectionBlock>
            )}

            <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                <Link href={`/dec/${incident.id}`}>
                    <ExternalLink className="h-4 w-4" />
                    Abrir ficha DEC en página completa
                </Link>
            </Button>
        </div>
    )
}

export function StudentDecRecordsWithModal({ decRecords }: { decRecords: Record<string, any>[] }) {
    const [openId, setOpenId] = useState<string | null>(null)
    const selected = openId ? decRecords.find((d) => d.id === openId) : null

    return (
        <>
            <div className="space-y-3">
                {decRecords.map((dec) => (
                    <button
                        key={dec.id}
                        type="button"
                        onClick={() => setOpenId(dec.id)}
                        className="w-full text-left border rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-slate-50 hover:border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                        <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-semibold text-sm text-slate-900">{dec.folio}</span>
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] ${
                                        dec.severity === "moderada"
                                            ? "bg-amber-100 text-amber-700 border-amber-200"
                                            : dec.severity === "severa"
                                              ? "bg-rose-100 text-rose-700 border-rose-200"
                                              : "bg-slate-100 text-slate-700"
                                    }`}
                                >
                                    {dec.severity === "moderada"
                                        ? "Etapa 2 — Moderada"
                                        : dec.severity === "severa"
                                          ? "Etapa 3 — Severa"
                                          : dec.severity}
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] ${
                                        dec.resolved
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-amber-50 text-amber-700 border-amber-200"
                                    }`}
                                >
                                    {dec.resolved ? "Resuelto" : "En seguimiento"}
                                </Badge>
                            </div>
                            <p className="text-xs text-slate-500">
                                Fecha:{" "}
                                {new Date(dec.incident_date).toLocaleDateString("es-CL", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                                {dec.end_date && ` - ${new Date(dec.end_date).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`}
                            </p>
                            {dec.location && <p className="text-xs text-slate-500 mt-0.5">Lugar: {dec.location}</p>}
                            <p className="text-[11px] text-indigo-600 font-medium mt-1">Clic para ver ficha completa</p>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                            <p className="text-xs text-slate-400">Reportado por:</p>
                            <p className="text-sm font-medium text-slate-700">
                                {(dec.users as any)?.name} {(dec.users as any)?.last_name}
                            </p>
                            <p className="text-xs text-slate-500 capitalize">{(dec.users as any)?.role}</p>
                        </div>
                    </button>
                ))}
            </div>

            <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="px-6 pt-6 pb-2 shrink-0 border-b">
                        <DialogTitle>Ficha DEC — detalle completo</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[calc(90vh-5rem)] px-6 pb-6">
                        {selected && <DecDetailModalBody incident={selected} />}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    )
}

type PaecModalProps = {
    paec: any
    courseName: string | null
    userRole: string
    institutionName?: string
    institutionLogoUrl?: string
}

export function StudentPaecCardWithModal({
    paec,
    courseName,
    userRole,
    institutionName,
    institutionLogoUrl,
}: PaecModalProps) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Card className="border-violet-200 bg-violet-50/40">
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            📋 Plan de Apoyo Emocional y Conductual (PAEC)
                        </CardTitle>
                        {paec.review_date && (
                            <p className="text-sm text-slate-500 mt-1">
                                Próxima revisión: {new Date(paec.review_date).toLocaleDateString("es-CL")}
                            </p>
                        )}
                    </div>
                    <Button type="button" variant="default" size="sm" className="shrink-0" onClick={() => setOpen(true)}>
                        Ver ficha completa
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-600">
                    <p className="text-xs text-slate-500">
                        Vista resumida. Pulsa el botón para ver todos los apartados del PAEC (apoderado, equipo, gatillantes, estrategias, firmas, seguimiento).
                    </p>
                    {paec.strengths && (
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Fortalezas</p>
                            <p className="text-slate-700 line-clamp-3">{paec.strengths}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="px-6 pt-6 pb-2 shrink-0 border-b">
                        <DialogTitle>PAEC — ficha completa</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[calc(90vh-5rem)] px-6 pb-6">
                        <PaecDetail
                            paec={paec}
                            userRole={userRole}
                            institutionName={institutionName}
                            institutionLogoUrl={institutionLogoUrl}
                            courseName={courseName}
                            embeddedInModal
                        />
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    )
}
