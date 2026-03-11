"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PaecSignatures } from "@/components/paec/paec-signatures"
import { PaecSeguimiento } from "@/components/paec/paec-seguimiento"
import { PaecPrintPdf } from "@/components/paec/paec-print-pdf"

type Props = {
    paec: any
    userRole: string
    institutionName?: string
    courseName?: string | null
}

function BoolBadge({ value, label }: { value: boolean; label: string }) {
    if (!value) return null
    return (
        <Badge className="text-[11px] bg-slate-100 text-slate-700">{label}</Badge>
    )
}

function Field({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null
    return (
        <div>
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-slate-800 whitespace-pre-wrap">{value}</p>
        </div>
    )
}

const calcularEdad = (fecha: string | null): number | null => {
    if (!fecha) return null
    const hoy = new Date()
    const nac = new Date(fecha)
    let edad = hoy.getFullYear() - nac.getFullYear()
    const mes = hoy.getMonth() - nac.getMonth()
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--
    return edad
}

export function PaecDetail({ paec, userRole, institutionName, courseName: courseNameProp }: Props) {
    const router = useRouter()
    const supabase = createClient()
    const [signing, setSigning] = useState(false)
    const [courseNameState, setCourseNameState] = useState<string | null>(courseNameProp ?? null)
    const courseName = courseNameProp ?? courseNameState

    const student = paec.students
    const canSign = ["dupla", "director"].includes(userRole)
    const canEdit = ["dupla", "director"].includes(userRole)

    console.log("PAEC Detail Debug:", { userRole, canSign, canEdit })

    // Fetch del curso por separado
    useEffect(() => {
        const fetchCourse = async () => {
            if (!student?.id) return
            const { data } = await supabase
                .from("students")
                .select("courses!course_id(name)")
                .eq("id", paec.student_id)
                .maybeSingle()
            setCourseNameState((data?.courses as any)?.name ?? null)
        }
        fetchCourse()
    }, [paec.student_id])



    const pdfData = {
        student: student ? { name: student.name, last_name: student.last_name, rut: student.rut, birthdate: student.birthdate } : null,
        courseName: courseName ?? undefined,
        guardian_name: paec.guardian_name,
        guardian_relationship: paec.guardian_relationship,
        guardian_phone: paec.guardian_phone,
        guardian_phone_alt: paec.guardian_phone_alt,
        guardian_backup_name: paec.guardian_backup_name,
        data_update_commitment: paec.data_update_commitment,
        professional_1: paec.professional_1,
        professional_2: paec.professional_2,
        professional_3: paec.professional_3,
        strengths: paec.strengths,
        support_routines: paec.support_routines,
        support_anticipation: paec.support_anticipation,
        support_visual_aids: paec.support_visual_aids,
        support_calm_space: paec.support_calm_space,
        support_breaks: paec.support_breaks,
        key_support: paec.key_support,
        trigger_noise: paec.trigger_noise,
        trigger_changes: paec.trigger_changes,
        trigger_orders: paec.trigger_orders,
        trigger_social: paec.trigger_social,
        trigger_sensory: paec.trigger_sensory,
        trigger_other: paec.trigger_other,
        alert_irritability: paec.alert_irritability,
        alert_isolation: paec.alert_isolation,
        alert_crying: paec.alert_crying,
        alert_restlessness: paec.alert_restlessness,
        alert_other: paec.alert_other,
        manifestation_crying: paec.manifestation_crying,
        manifestation_shouting: paec.manifestation_shouting,
        manifestation_opposition: paec.manifestation_opposition,
        manifestation_withdrawal: paec.manifestation_withdrawal,
        manifestation_aggression: paec.manifestation_aggression,
        manifestation_other: paec.manifestation_other,
        strategy_calm_space: paec.strategy_calm_space,
        strategy_accompaniment: paec.strategy_accompaniment,
        strategy_reduce_stimuli: paec.strategy_reduce_stimuli,
        strategy_other: paec.strategy_other,
        strategies_to_avoid: paec.strategies_to_avoid,
        procedure_notes: paec.procedure_notes,
        review_date: paec.review_date,
        active: paec.active,
        representative_signed: paec.representative_signed,
        guardian_signed: paec.guardian_signed,
    }

    return (
        <div className="space-y-6">

            {/* Cabecera */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 print:text-xl">
                        PAEC — {student?.last_name}, {student?.name}
                    </h1>
                    <p className="text-sm text-slate-500 print:text-xs">
                        {courseName ?? "Sin curso"} · RUT: {student?.rut ?? "N/A"}
                    </p>
                </div>
                <PaecPrintPdf data={pdfData} institutionName={institutionName} />
            </div>

            {/* Sección 1: Identificación */}
            <Card>
                <CardHeader><CardTitle>Identificación del estudiante</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <Field label="Nombre completo" value={`${student?.last_name}, ${student?.name}`} />
                    <Field label="RUT" value={student?.rut} />
                    <Field
                        label="Fecha de nacimiento"
                        value={
                            student?.birthdate
                                ? new Date(student.birthdate).toLocaleDateString("es-CL")
                                : null
                        }
                    />
                    <Field
                        label="Edad"
                        value={
                            student?.birthdate
                                ? `${calcularEdad(student.birthdate)} años`
                                : null
                        }
                    />
                    <Field label="Curso" value={courseName} />
                </CardContent>
            </Card>

            {/* Sección 2: Apoderado */}
            <Card>
                <CardHeader><CardTitle>Información de apoderado/a</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <Field label="Nombre" value={paec.guardian_name} />
                    <Field label="Parentesco" value={paec.guardian_relationship} />
                    <Field label="Teléfono principal" value={paec.guardian_phone} />
                    <Field label="Teléfono alternativo" value={paec.guardian_phone_alt} />
                    <Field label="Apoderado suplente" value={paec.guardian_backup_name} />
                    <Field
                        label="Compromiso de datos"
                        value={paec.data_update_commitment ? "Sí" : "No"}
                    />
                </CardContent>
            </Card>

            {/* Sección 3: Equipo */}
            <Card>
                <CardHeader><CardTitle>Equipo de apoyo responsable</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                    {[paec.professional_1, paec.professional_2, paec.professional_3]
                        .filter(Boolean)
                        .map((p: any, i: number) => (
                            <p key={i}>
                                <span className="font-medium">Profesional {i + 1}:</span>{" "}
                                {p.name} {p.last_name} — {p.role}
                            </p>
                        ))}
                    {!paec.professional_1 && !paec.professional_2 && !paec.professional_3 && (
                        <p className="text-slate-400">Sin equipo asignado</p>
                    )}
                </CardContent>
            </Card>

            {/* Sección 4: Eje preventivo */}
            <Card>
                <CardHeader><CardTitle>Eje Preventivo</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <Field label="Fortalezas / intereses" value={paec.strengths} />
                    <div>
                        <p className="font-medium mb-1">Apoyos habituales</p>
                        <div className="flex flex-wrap gap-1">
                            <BoolBadge value={paec.support_routines} label="Rutinas" />
                            <BoolBadge value={paec.support_anticipation} label="Anticipación" />
                            <BoolBadge value={paec.support_visual_aids} label="Apoyos visuales" />
                            <BoolBadge value={paec.support_calm_space} label="Espacio de calma" />
                            <BoolBadge value={paec.support_breaks} label="Pausas" />
                        </div>
                    </div>
                    <Field label="Apoyo clave acordado" value={paec.key_support} />
                </CardContent>
            </Card>

            {/* Sección 5: Gatillantes */}
            <Card>
                <CardHeader><CardTitle>Gatillantes y señales tempranas</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div>
                        <p className="font-medium mb-1">Gatillantes</p>
                        <div className="flex flex-wrap gap-1">
                            <BoolBadge value={paec.trigger_noise} label="Ruido" />
                            <BoolBadge value={paec.trigger_changes} label="Cambios" />
                            <BoolBadge value={paec.trigger_orders} label="Órdenes" />
                            <BoolBadge value={paec.trigger_social} label="Sociales" />
                            <BoolBadge value={paec.trigger_sensory} label="Sensoriales" />
                        </div>
                        {paec.trigger_other && (
                            <p className="mt-1 text-slate-600">Otro: {paec.trigger_other}</p>
                        )}
                    </div>
                    <div>
                        <p className="font-medium mb-1">Señales de alerta</p>
                        <div className="flex flex-wrap gap-1">
                            <BoolBadge value={paec.alert_irritability} label="Irritabilidad" />
                            <BoolBadge value={paec.alert_isolation} label="Aislamiento" />
                            <BoolBadge value={paec.alert_crying} label="Llanto" />
                            <BoolBadge value={paec.alert_restlessness} label="Inquietud" />
                        </div>
                        {paec.alert_other && (
                            <p className="mt-1 text-slate-600">Otro: {paec.alert_other}</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Sección 6: Eje reactivo */}
            <Card>
                <CardHeader><CardTitle>Eje Reactivo</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div>
                        <p className="font-medium mb-1">Manifestación del malestar</p>
                        <div className="flex flex-wrap gap-1">
                            <BoolBadge value={paec.manifestation_crying} label="Llanto" />
                            <BoolBadge value={paec.manifestation_shouting} label="Gritos" />
                            <BoolBadge value={paec.manifestation_opposition} label="Oposición" />
                            <BoolBadge value={paec.manifestation_withdrawal} label="Retraimiento" />
                            <BoolBadge value={paec.manifestation_aggression} label="Agresión" />
                        </div>
                        {paec.manifestation_other && (
                            <p className="mt-1 text-slate-600">Otro: {paec.manifestation_other}</p>
                        )}
                    </div>
                    <div>
                        <p className="font-medium mb-1">Estrategias que ayudan</p>
                        <div className="flex flex-wrap gap-1">
                            <BoolBadge value={paec.strategy_calm_space} label="Espacio de calma" />
                            <BoolBadge value={paec.strategy_accompaniment} label="Acompañamiento" />
                            <BoolBadge value={paec.strategy_reduce_stimuli} label="Disminuir estímulos" />
                        </div>
                        {paec.strategy_other && (
                            <p className="mt-1 text-slate-600">Otro: {paec.strategy_other}</p>
                        )}
                    </div>
                    <Field label="Estrategias a evitar" value={paec.strategies_to_avoid} />
                </CardContent>
            </Card>

            {/* Sección 7: Procedimiento */}
            <Card>
                <CardHeader><CardTitle>Procedimiento ante episodio</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-2">
                    <ol className="list-decimal list-inside text-slate-600 space-y-1">
                        <li>Contener y reducir estímulos</li>
                        <li>Acompañar con adulto de referencia</li>
                        <li>Facilitar regulación</li>
                        <li>Registrar y comunicar</li>
                    </ol>
                    {paec.procedure_notes && (
                        <p className="mt-2 text-slate-700 whitespace-pre-wrap">
                            {paec.procedure_notes}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Firmas */}
            <PaecSignatures paec={paec} userRole={userRole} />

            {/* Seguimiento */}
            <PaecSeguimiento paec={paec} userRole={userRole} />

            {/* Acciones — ocultas al imprimir */}
            <div className="flex justify-between pb-8 print:hidden">
                <Button variant="outline" onClick={() => router.push("/paec")}>
                    Volver al listado
                </Button>
                {canEdit && (
                    <Button onClick={() => router.push(`/paec/${paec.id}/editar`)}>
                        Editar PAEC
                    </Button>
                )}
            </div>

        </div>
    )
}
