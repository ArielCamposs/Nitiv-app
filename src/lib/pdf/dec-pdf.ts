import jsPDF from "jspdf"

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

const SEVERITY_LABELS: Record<string, string> = {
    moderada: "Etapa 2 — Moderada",
    severa: "Etapa 3 — Severa",
}

export type DecPdfData = {
    folio: string | null
    type: string
    severity: string
    location: string | null
    context: string | null
    conduct_types: string[] | null
    triggers: string[] | null
    actions_taken: string[] | null
    description: string | null
    guardian_contacted: boolean
    resolved: boolean
    incident_date: string
    end_date: string | null
    student: {
        name?: string
        last_name?: string
        rut?: string
        guardian_name?: string
        guardian_phone?: string
        courses?: { name?: string }
    } | null
    reporter: { name?: string; last_name?: string } | null
    recipients: { role?: string; users?: { name?: string; last_name?: string }; seen?: boolean; seen_at?: string }[]
}

function addSection(doc: jsPDF, y: number, margin: number, pageHeight: number, title: string, content: string[]): number {
    let yPos = y
    if (yPos + 20 > pageHeight - margin) {
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
    for (const line of content) {
        if (yPos + 6 > pageHeight - margin) {
            doc.addPage()
            yPos = margin
        }
        const lines = doc.splitTextToSize(line, contentWidth)
        doc.text(lines, margin, yPos)
        yPos += lines.length * 5 + 2
    }
    return yPos + 4
}

function addTags(doc: jsPDF, y: number, margin: number, pageHeight: number, label: string, items: string[] | null): number {
    let yPos = y
    if (yPos + 18 > pageHeight - margin) {
        doc.addPage()
        yPos = margin
    }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(30, 41, 59)
    doc.text(label, margin, yPos)
    yPos += 7
    doc.setDrawColor(226, 232, 240)
    doc.line(margin, yPos - 2, doc.internal.pageSize.getWidth() - margin, yPos - 2)
    yPos += 4
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(71, 85, 105)
    const text = items?.length ? items.join(", ") : "No registrado"
    const contentWidth = doc.internal.pageSize.getWidth() - margin * 2
    const lines = doc.splitTextToSize(text, contentWidth)
    for (const line of lines) {
        if (yPos + 6 > pageHeight - margin) {
            doc.addPage()
            yPos = margin
        }
        doc.text(line, margin, yPos)
        yPos += 5
    }
    return yPos + 4
}

export function buildDecPdf(data: DecPdfData, institutionName?: string): jsPDF {
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
    doc.text("Ficha DEC", margin, y)
    y += 8

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    if (data.folio) {
        doc.text(`Folio: ${data.folio}`, margin, y)
        y += 5
    }
    const dateStr = new Date(data.incident_date).toLocaleDateString("es-CL", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
    doc.text(dateStr, margin, y)
    y += 6

    const severityLabel = SEVERITY_LABELS[data.severity] ?? data.severity
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(51, 65, 85)
    doc.text(`Severidad: ${severityLabel}`, margin, y)
    y += 5
    doc.text(`Estado: ${data.resolved ? "Resuelto" : "En seguimiento"}`, margin, y)
    y += 10

    const student = data.student
    const studentName = student ? `${student.name ?? ""} ${student.last_name ?? ""}`.trim() : "—"
    y = addSection(doc, y, margin, pageHeight, "1. Identificación del estudiante", [
        `Nombre: ${studentName}`,
        `RUT: ${student?.rut ?? "No registrado"}`,
        `Curso: ${student?.courses?.name ?? "Sin curso"}`,
        `Apoderado: ${student?.guardian_name ?? "No registrado"}`,
        student?.guardian_phone ? `Teléfono apoderado: ${student.guardian_phone}` : "",
        `Apoderado contactado: ${data.guardian_contacted ? "Sí" : "No"}`,
    ].filter(Boolean))

    const reporterName = data.reporter ? `${data.reporter.name ?? ""} ${data.reporter.last_name ?? ""}`.trim() : "Desconocido"
    const endTimeStr = data.end_date
        ? new Date(data.end_date).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
        : "No registrada"
    y = addSection(doc, y, margin, pageHeight, "2. Contexto del incidente", [
        `Fecha y hora de inicio: ${new Date(data.incident_date).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
        `Hora de término: ${endTimeStr}`,
        `Lugar: ${data.location ?? "No registrado"}`,
        `Actividad en curso: ${data.context ?? "No registrada"}`,
        `Tipo de incidente: ${TYPE_LABELS[data.type] ?? data.type}`,
        `Reportado por: ${reporterName}`,
    ])

    y = addTags(doc, y, margin, pageHeight, "3. Conductas observadas", data.conduct_types)
    y = addTags(doc, y, margin, pageHeight, "4. Situaciones desencadenantes", data.triggers)
    y = addTags(doc, y, margin, pageHeight, "5. Acciones realizadas", data.actions_taken)

    if (data.description) {
        y = addSection(doc, y, margin, pageHeight, "6. Observaciones adicionales", [data.description])
    }

    if (data.recipients?.length) {
        if (y + 25 > pageHeight - margin) {
            doc.addPage()
            y = margin
        }
        doc.setFont("helvetica", "bold")
        doc.setFontSize(11)
        doc.setTextColor(30, 41, 59)
        doc.text("7. Notificados del caso", margin, y)
        y += 7
        doc.setDrawColor(226, 232, 240)
        doc.line(margin, y - 2, doc.internal.pageSize.getWidth() - margin, y - 2)
        y += 4
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        doc.setTextColor(71, 85, 105)
        for (const r of data.recipients) {
            if (y + 8 > pageHeight - margin) {
                doc.addPage()
                y = margin
            }
            const name = r.users ? `${r.users.name ?? ""} ${r.users.last_name ?? ""}`.trim() : r.role ?? "—"
            const status = r.seen ? `Visto ${r.seen_at ? new Date(r.seen_at).toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}` : "Pendiente"
            doc.text(`• ${name} (${r.role ?? ""}) — ${status}`, margin, y)
            y += 6
        }
    }

    return doc
}
