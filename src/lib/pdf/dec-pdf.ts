import jsPDF from "jspdf"
import { addPdfLogoHeader } from "./pdf-logos"

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

const BOX_PAD = 4
const TITLE_BAR_H = 9
const LINE_H = 5
const BOX_GAP = 6

/** Parsea el campo context del DEC en líneas "Etiqueta: valor" (solo las que vienen del formulario). */
function parseDecContext(context: string | null): string[] {
    if (!context?.trim()) return []
    const segments = context.split(". ").map((s) => s.trim()).filter(Boolean)
    const result: string[] = []
    for (const seg of segments) {
        if (seg.includes(" | ")) {
            for (const part of seg.split(" | ")) {
                const idx = part.indexOf(": ")
                if (idx !== -1) result.push(`${part.slice(0, idx + 1)} ${part.slice(idx + 2)}`)
            }
        } else {
            const idx = seg.indexOf(": ")
            if (idx !== -1) result.push(`${seg.slice(0, idx + 1)} ${seg.slice(idx + 2)}`)
        }
    }
    return result
}

/** Dibuja una línea con etiqueta en negrita y valor en normal (si la línea tiene "Etiqueta: valor"). */
function drawLabelValueLine(
    doc: jsPDF,
    line: string,
    x: number,
    y: number,
    innerW: number,
    lineH: number
): number {
    const colonIdx = line.indexOf(": ")
    if (colonIdx === -1) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        doc.setTextColor(51, 65, 85)
        const wrapped = doc.splitTextToSize(line, innerW)
        doc.text(wrapped, x, y)
        return y + wrapped.length * lineH
    }
    const label = line.slice(0, colonIdx + 2)
    const value = line.slice(colonIdx + 2)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text(label, x, y)
    const labelW = doc.getTextWidth(label)
    const valueW = innerW - labelW
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(51, 65, 85)
    const valueLines = value ? doc.splitTextToSize(value, valueW) : []
    if (valueLines.length === 0) {
        return y + lineH
    }
    doc.text(valueLines[0], x + labelW, y)
    let currentY = y
    for (let i = 1; i < valueLines.length; i++) {
        currentY += lineH
        doc.text(valueLines[i], x, currentY)
    }
    return currentY + lineH
}

/** Dibuja una sección dentro de un cuadro con título en barra (estilo ficha). Etiquetas en negrita. */
function addBoxedSection(
    doc: jsPDF,
    y: number,
    margin: number,
    pageHeight: number,
    pageWidth: number,
    title: string,
    content: string[]
): number {
    const innerW = pageWidth - margin * 2 - BOX_PAD * 2
    const x = margin + BOX_PAD
    doc.setFontSize(10)
    let totalContentH = 0
    for (const line of content) {
        if (line.includes(": ")) {
            const label = line.slice(0, line.indexOf(": ") + 2)
            const value = line.slice(line.indexOf(": ") + 2)
            doc.setFont("helvetica", "bold")
            const labelW = doc.getTextWidth(label)
            doc.setFont("helvetica", "normal")
            const valueW = innerW - labelW
            const valueLines = value ? doc.splitTextToSize(value, valueW) : []
            totalContentH += Math.max(1, valueLines.length) * LINE_H
        } else {
            doc.setFont("helvetica", "normal")
            const wrapped = doc.splitTextToSize(line, innerW)
            totalContentH += wrapped.length * LINE_H
        }
    }
    const boxH = BOX_PAD + TITLE_BAR_H + BOX_PAD + totalContentH + BOX_PAD

    if (y + boxH > pageHeight - margin) {
        doc.addPage()
        y = margin
    }

    const boxLeft = margin
    const boxW = pageWidth - margin * 2

    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.3)
    doc.rect(boxLeft, y, boxW, boxH)

    doc.setFillColor(241, 245, 249)
    doc.rect(boxLeft, y, boxW, TITLE_BAR_H, "F")
    doc.setDrawColor(226, 232, 240)
    doc.line(boxLeft, y + TITLE_BAR_H, boxLeft + boxW, y + TITLE_BAR_H)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text(title, boxLeft + BOX_PAD, y + 6)

    let textY = y + BOX_PAD + TITLE_BAR_H + BOX_PAD
    for (const line of content) {
        textY = drawLabelValueLine(doc, line, x, textY, innerW, LINE_H)
    }

    return y + boxH + BOX_GAP
}

/** Dibuja una sección de “tags” (lista de ítems) en un cuadro. */
function addBoxedTags(
    doc: jsPDF,
    y: number,
    margin: number,
    pageHeight: number,
    pageWidth: number,
    title: string,
    items: string[] | null
): number {
    const text = items?.length ? items.join(", ") : "No registrado"
    const innerW = pageWidth - margin * 2 - BOX_PAD * 2
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    const lines = doc.splitTextToSize(text, innerW)
    const contentH = lines.length * LINE_H
    const boxH = BOX_PAD + TITLE_BAR_H + BOX_PAD + contentH + BOX_PAD

    if (y + boxH > pageHeight - margin) {
        doc.addPage()
        y = margin
    }

    const boxLeft = margin
    const boxW = pageWidth - margin * 2

    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.3)
    doc.rect(boxLeft, y, boxW, boxH)

    doc.setFillColor(241, 245, 249)
    doc.rect(boxLeft, y, boxW, TITLE_BAR_H, "F")
    doc.setDrawColor(226, 232, 240)
    doc.line(boxLeft, y + TITLE_BAR_H, boxLeft + boxW, y + TITLE_BAR_H)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text(title, boxLeft + BOX_PAD, y + 6)

    let textY = y + BOX_PAD + TITLE_BAR_H + BOX_PAD
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(71, 85, 105)
    for (const line of lines) {
        doc.text(line, boxLeft + BOX_PAD, textY)
        textY += LINE_H
    }

    return y + boxH + BOX_GAP
}

/** Cuadro para la cabecera (Ficha DEC, folio, fecha, severidad, estado). Etiquetas en negrita. */
function addHeaderBox(
    doc: jsPDF,
    y: number,
    margin: number,
    pageWidth: number,
    data: DecPdfData,
    institutionName?: string
): number {
    const severityLabel = SEVERITY_LABELS[data.severity] ?? data.severity
    const dateStr = new Date(data.incident_date).toLocaleDateString("es-CL", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
    const lineHeight = 6
    const pad = 5
    const titleH = 12
    const boxLeft = margin
    const boxW = pageWidth - margin * 2
    const innerW = boxW - pad * 2

    const headerLines: { label: string; value: string }[] = []
    if (institutionName) headerLines.push({ label: "", value: institutionName })
    headerLines.push(
        { label: "Folio: ", value: data.folio ?? "—" },
        { label: "Fecha: ", value: dateStr },
        { label: "Severidad: ", value: severityLabel },
        { label: "Estado: ", value: data.resolved ? "Resuelto" : "En seguimiento" }
    )
    doc.setFontSize(10)
    let headerContentH = 0
    for (const { label, value } of headerLines) {
        if (label) {
            doc.setFont("helvetica", "bold")
            const labelW = doc.getTextWidth(label)
            doc.setFont("helvetica", "normal")
            const valueLines = doc.splitTextToSize(value, innerW - labelW)
            headerContentH += Math.max(1, valueLines.length) * lineHeight
        } else {
            headerContentH += lineHeight
        }
    }
    const boxH = pad + titleH + pad + headerContentH + pad

    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.3)
    doc.rect(boxLeft, y, boxW, boxH)

    doc.setFillColor(241, 245, 249)
    doc.rect(boxLeft, y, boxW, titleH, "F")
    doc.setDrawColor(226, 232, 240)
    doc.line(boxLeft, y + titleH, boxLeft + boxW, y + titleH)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text("Ficha DEC", boxLeft + pad, y + 8)

    let textY = y + pad + titleH + pad
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    for (const { label, value } of headerLines) {
        if (label) {
            doc.setFont("helvetica", "bold")
            doc.setTextColor(30, 41, 59)
            doc.text(label, boxLeft + pad, textY)
            const labelW = doc.getTextWidth(label)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(100, 116, 139)
            const valueLines = doc.splitTextToSize(value, innerW - labelW)
            const numLines = Math.max(1, valueLines.length)
            if (valueLines.length > 0) {
                doc.text(valueLines[0], boxLeft + pad + labelW, textY)
                for (let i = 1; i < valueLines.length; i++) {
                    textY += lineHeight
                    doc.text(valueLines[i], boxLeft + pad, textY)
                }
            }
            textY += numLines * lineHeight
        } else {
            doc.setFont("helvetica", "bold")
            doc.setTextColor(30, 41, 59)
            doc.text(value, boxLeft + pad, textY)
            textY += lineHeight
        }
    }

    return y + boxH + BOX_GAP
}

export function buildDecPdf(
    data: DecPdfData,
    institutionName?: string,
    institutionLogoBase64?: string | null,
    nitivLogoBase64?: string | null
): jsPDF {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const margin = 18
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let y = margin

    y = addPdfLogoHeader(doc, margin, pageWidth, institutionLogoBase64 ?? null, nitivLogoBase64 ?? null)
    y = addHeaderBox(doc, y, margin, pageWidth, data, institutionName)

    const student = data.student
    const studentName = student ? `${student.name ?? ""} ${student.last_name ?? ""}`.trim() : "—"
    y = addBoxedSection(doc, y, margin, pageHeight, pageWidth, "1. Identificación del estudiante", [
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
    const contextBaseLines = [
        `Fecha y hora de inicio: ${new Date(data.incident_date).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
        `Hora de término: ${endTimeStr}`,
        `Lugar: ${data.location ?? "No registrado"}`,
        `Tipo de incidente: ${TYPE_LABELS[data.type] ?? data.type}`,
        `Reportado por: ${reporterName}`,
    ]
    const parsedContext = parseDecContext(data.context).map((line) =>
        line.replace(/^(personas|Nº aprox\. personas):/, "N° de personas:")
    )
    const contextLines =
        parsedContext.length > 0
            ? [...contextBaseLines, ...parsedContext]
            : data.context?.trim()
                ? [...contextBaseLines, `Contexto adicional: ${data.context.trim()}`]
                : contextBaseLines
    y = addBoxedSection(doc, y, margin, pageHeight, pageWidth, "2. Contexto del incidente", contextLines)

    y = addBoxedTags(doc, y, margin, pageHeight, pageWidth, "3. Conductas observadas", data.conduct_types)
    y = addBoxedTags(doc, y, margin, pageHeight, pageWidth, "4. Situaciones desencadenantes", data.triggers)
    y = addBoxedTags(doc, y, margin, pageHeight, pageWidth, "5. Acciones realizadas", data.actions_taken)

    if (data.description) {
        y = addBoxedSection(doc, y, margin, pageHeight, pageWidth, "6. Observaciones adicionales", [data.description])
    }

    if (data.recipients?.length) {
        const recLines: string[] = []
        for (const r of data.recipients) {
            const name = r.users ? `${r.users.name ?? ""} ${r.users.last_name ?? ""}`.trim() : r.role ?? "—"
            const status = r.seen ? `Visto ${r.seen_at ? new Date(r.seen_at).toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}` : "Pendiente"
            recLines.push(`${name} (${r.role ?? ""}) — ${status}`)
        }
        y = addBoxedSection(doc, y, margin, pageHeight, pageWidth, "7. Notificados del caso", recLines)
    }

    // Firmas: quien reporta el caso y apoderado/a
    const sigBlockH = 28
    const sigYNeeded = y + sigBlockH * 2 + BOX_GAP
    if (sigYNeeded > pageHeight - margin) {
        doc.addPage()
        y = margin
    }
    const sigLineW = 55
    const sigLineH = 2
    doc.setDrawColor(148, 163, 184)
    doc.setLineWidth(0.4)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)

    const reporterLabel = data.reporter ? `${data.reporter.name ?? ""} ${data.reporter.last_name ?? ""}`.trim() : "Quien reporta el caso"
    doc.text("Firma: Quien reporta el caso", margin, y + 5)
    doc.rect(margin, y + 6, sigLineW, sigLineH)
    doc.setFontSize(8)
    doc.text(reporterLabel, margin, y + 14)

    const guardianLabel = data.student?.guardian_name?.trim() || "Apoderado/a"
    doc.text("Firma: Apoderado/a", margin, y + 5 + sigBlockH)
    doc.rect(margin, y + 6 + sigBlockH, sigLineW, sigLineH)
    doc.setFontSize(8)
    doc.text(guardianLabel, margin, y + 14 + sigBlockH)

    return doc
}
