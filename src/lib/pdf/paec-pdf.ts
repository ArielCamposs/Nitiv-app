import jsPDF from "jspdf"

export type PaecPdfData = {
    student: { name?: string; last_name?: string; rut?: string; birthdate?: string } | null
    courseName?: string
    guardian_name?: string | null
    guardian_relationship?: string | null
    guardian_phone?: string | null
    guardian_phone_alt?: string | null
    guardian_backup_name?: string | null
    data_update_commitment?: boolean
    professional_1?: { name?: string; last_name?: string; role?: string } | null
    professional_2?: { name?: string; last_name?: string; role?: string } | null
    professional_3?: { name?: string; last_name?: string; role?: string } | null
    strengths?: string | null
    support_routines?: boolean
    support_anticipation?: boolean
    support_visual_aids?: boolean
    support_calm_space?: boolean
    support_breaks?: boolean
    key_support?: string | null
    trigger_noise?: boolean
    trigger_changes?: boolean
    trigger_orders?: boolean
    trigger_social?: boolean
    trigger_sensory?: boolean
    trigger_other?: string | null
    alert_irritability?: boolean
    alert_isolation?: boolean
    alert_crying?: boolean
    alert_restlessness?: boolean
    alert_other?: string | null
    manifestation_crying?: boolean
    manifestation_shouting?: boolean
    manifestation_opposition?: boolean
    manifestation_withdrawal?: boolean
    manifestation_aggression?: boolean
    manifestation_other?: string | null
    strategy_calm_space?: boolean
    strategy_accompaniment?: boolean
    strategy_reduce_stimuli?: boolean
    strategy_other?: string | null
    strategies_to_avoid?: string | null
    procedure_notes?: string | null
    review_date?: string | null
    active?: boolean
    representative_signed?: boolean
    guardian_signed?: boolean
}

function addSection(
    doc: jsPDF,
    y: number,
    margin: number,
    pageHeight: number,
    title: string,
    lines: string[]
): number {
    let yPos = y
    if (yPos + 18 > pageHeight - margin) {
        doc.addPage()
        yPos = margin
    }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(30, 41, 59)
    doc.text(title, margin, yPos)
    yPos += 7
    doc.setDrawColor(226, 232, 240)
    doc.line(margin, yPos - 2, doc.internal.pageSize.getWidth() - margin, yPos - 2)
    yPos += 4
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(51, 65, 85)
    const contentWidth = doc.internal.pageSize.getWidth() - margin * 2
    for (const line of lines.filter(Boolean)) {
        if (yPos + 6 > pageHeight - margin) {
            doc.addPage()
            yPos = margin
        }
        const wrapped = doc.splitTextToSize(line, contentWidth)
        doc.text(wrapped, margin, yPos)
        yPos += wrapped.length * 5 + 2
    }
    return yPos + 4
}

function boolLabels(
    data: PaecPdfData,
    keys: (keyof PaecPdfData)[],
    labels: Record<string, string>
): string[] {
    const out: string[] = []
    for (const key of keys) {
        const v = data[key]
        if (v === true && labels[key as string]) out.push(labels[key as string])
    }
    return out
}

function edad(birthdate: string | null): number | null {
    if (!birthdate) return null
    const hoy = new Date()
    const nac = new Date(birthdate)
    let e = hoy.getFullYear() - nac.getFullYear()
    const m = hoy.getMonth() - nac.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--
    return e
}

export function buildPaecPdf(data: PaecPdfData, institutionName?: string): jsPDF {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const margin = 18
    const pageHeight = doc.internal.pageSize.getHeight()
    const contentWidth = doc.internal.pageSize.getWidth() - margin * 2
    let y = margin

    if (institutionName) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        doc.setTextColor(100, 116, 139)
        doc.text(institutionName, margin, y)
        y += 7
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(15, 23, 42)
    const studentName = data.student
        ? `${data.student.last_name ?? ""}, ${data.student.name ?? ""}`.trim()
        : "—"
    doc.text("PAEC — Plan de Apoyo Educativo Colaborativo", margin, y)
    y += 8
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(studentName, margin, y)
    y += 6
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(`${data.courseName ?? "Sin curso"} · RUT: ${data.student?.rut ?? "N/A"}`, margin, y)
    y += 10

    const birthStr = data.student?.birthdate
        ? new Date(data.student.birthdate).toLocaleDateString("es-CL")
        : null
    const ageStr = data.student?.birthdate ? `${edad(data.student.birthdate)} años` : null
    y = addSection(doc, y, margin, pageHeight, "1. Identificación del estudiante", [
        `Nombre completo: ${studentName}`,
        `RUT: ${data.student?.rut ?? "No registrado"}`,
        birthStr ? `Fecha de nacimiento: ${birthStr}` : "",
        ageStr ? `Edad: ${ageStr}` : "",
        `Curso: ${data.courseName ?? "Sin curso"}`,
    ])

    y = addSection(doc, y, margin, pageHeight, "2. Información de apoderado/a", [
        `Nombre: ${data.guardian_name ?? "No registrado"}`,
        data.guardian_relationship ? `Parentesco: ${data.guardian_relationship}` : "",
        data.guardian_phone ? `Teléfono principal: ${data.guardian_phone}` : "",
        data.guardian_phone_alt ? `Teléfono alternativo: ${data.guardian_phone_alt}` : "",
        data.guardian_backup_name ? `Apoderado suplente: ${data.guardian_backup_name}` : "",
        `Compromiso de datos: ${data.data_update_commitment ? "Sí" : "No"}`,
    ])

    const pros = [data.professional_1, data.professional_2, data.professional_3].filter(Boolean)
    const teamLines = pros.length
        ? pros.map((p: any, i: number) => `Profesional ${i + 1}: ${p.name ?? ""} ${p.last_name ?? ""} — ${p.role ?? ""}`)
        : ["Sin equipo asignado"]
    y = addSection(doc, y, margin, pageHeight, "3. Equipo de apoyo responsable", teamLines)

    const supports = boolLabels(data, ["support_routines", "support_anticipation", "support_visual_aids", "support_calm_space", "support_breaks"], {
        support_routines: "Rutinas",
        support_anticipation: "Anticipación",
        support_visual_aids: "Apoyos visuales",
        support_calm_space: "Espacio de calma",
        support_breaks: "Pausas",
    })
    y = addSection(doc, y, margin, pageHeight, "4. Eje Preventivo", [
        data.strengths ? `Fortalezas / intereses: ${data.strengths}` : "",
        supports.length ? `Apoyos habituales: ${supports.join(", ")}` : "",
        data.key_support ? `Apoyo clave acordado: ${data.key_support}` : "",
    ])

    const triggers = boolLabels(data, ["trigger_noise", "trigger_changes", "trigger_orders", "trigger_social", "trigger_sensory"], {
        trigger_noise: "Ruido",
        trigger_changes: "Cambios",
        trigger_orders: "Órdenes",
        trigger_social: "Sociales",
        trigger_sensory: "Sensoriales",
    })
    const alerts = boolLabels(data, ["alert_irritability", "alert_isolation", "alert_crying", "alert_restlessness"], {
        alert_irritability: "Irritabilidad",
        alert_isolation: "Aislamiento",
        alert_crying: "Llanto",
        alert_restlessness: "Inquietud",
    })
    y = addSection(doc, y, margin, pageHeight, "5. Gatillantes y señales tempranas", [
        triggers.length ? `Gatillantes: ${triggers.join(", ")}` : "",
        data.trigger_other ? `Otro gatillante: ${data.trigger_other}` : "",
        alerts.length ? `Señales de alerta: ${alerts.join(", ")}` : "",
        data.alert_other ? `Otra señal: ${data.alert_other}` : "",
    ])

    const manifestations = boolLabels(data, ["manifestation_crying", "manifestation_shouting", "manifestation_opposition", "manifestation_withdrawal", "manifestation_aggression"], {
        manifestation_crying: "Llanto",
        manifestation_shouting: "Gritos",
        manifestation_opposition: "Oposición",
        manifestation_withdrawal: "Retraimiento",
        manifestation_aggression: "Agresión",
    })
    const strategies = boolLabels(data, ["strategy_calm_space", "strategy_accompaniment", "strategy_reduce_stimuli"], {
        strategy_calm_space: "Espacio de calma",
        strategy_accompaniment: "Acompañamiento",
        strategy_reduce_stimuli: "Disminuir estímulos",
    })
    y = addSection(doc, y, margin, pageHeight, "6. Eje Reactivo", [
        manifestations.length ? `Manifestación del malestar: ${manifestations.join(", ")}` : "",
        data.manifestation_other ? `Otra manifestación: ${data.manifestation_other}` : "",
        strategies.length ? `Estrategias que ayudan: ${strategies.join(", ")}` : "",
        data.strategy_other ? `Otra estrategia: ${data.strategy_other}` : "",
        data.strategies_to_avoid ? `Estrategias a evitar: ${data.strategies_to_avoid}` : "",
    ])

    const procedureLines = [
        "1. Contener y reducir estímulos",
        "2. Acompañar con adulto de referencia",
        "3. Facilitar regulación",
        "4. Registrar y comunicar",
    ]
    if (data.procedure_notes) procedureLines.push("", data.procedure_notes)
    y = addSection(doc, y, margin, pageHeight, "7. Procedimiento ante episodio", procedureLines)

    if (data.review_date) {
        y = addSection(doc, y, margin, pageHeight, "Próxima revisión", [
            new Date(data.review_date).toLocaleDateString("es-CL"),
        ])
    }

    y = addSection(doc, y, margin, pageHeight, "Firmas", [
        `Firma representante institucional: ${data.representative_signed ? "Sí" : "No"}`,
        `Firma apoderado/a: ${data.guardian_signed ? "Sí" : "No"}`,
    ])

    return doc
}
