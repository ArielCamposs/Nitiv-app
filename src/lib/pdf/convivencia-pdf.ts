import jsPDF from "jspdf"
import { addPdfLogoHeader } from "./pdf-logos"

const BOX_PAD = 4
const TITLE_BAR_H = 9
const LINE_H = 5
const BOX_GAP = 6

/** Barra de los cuadros en PDF (todos en gris, sin color por estado). */
function getStatusBarColor(resolved: boolean, status?: string): [number, number, number] {
    // Usar siempre un gris claro homogéneo para todos los estados
    return [226, 232, 240]   // slate-200 gris
}

/** Dibuja una línea con etiqueta en negrita y valor en normal (si tiene "Etiqueta: valor"). */
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
    if (valueLines.length === 0) return y + lineH
    doc.text(valueLines[0], x + labelW, y)
    let currentY = y
    for (let i = 1; i < valueLines.length; i++) {
        currentY += lineH
        doc.text(valueLines[i], x, currentY)
    }
    return currentY + lineH
}

/** Cuadro con título en barra y contenido en líneas "Etiqueta: valor". titleBarColor: RGB opcional para la barra. */
function addBoxedSection(
    doc: jsPDF,
    y: number,
    margin: number,
    pageHeight: number,
    pageWidth: number,
    title: string,
    content: string[],
    titleBarColor?: [number, number, number]
): number {
    const innerW = pageWidth - margin * 2 - BOX_PAD * 2
    const x = margin + BOX_PAD
    doc.setFontSize(10)
    let totalContentH = 0
    for (const line of content) {
        if (line.includes(": ")) {
            const value = line.slice(line.indexOf(": ") + 2)
            doc.setFont("helvetica", "normal")
            const valueW = innerW - doc.getTextWidth(line.slice(0, line.indexOf(": ") + 2))
            const valueLines = value ? doc.splitTextToSize(value, valueW) : []
            totalContentH += Math.max(1, valueLines.length) * LINE_H
        } else {
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

    doc.setFillColor(...(titleBarColor ?? [241, 245, 249]))
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

/** Cuadro con título en barra y un párrafo de texto (sin etiquetas). titleBarColor: RGB opcional. */
function addBoxedParagraph(
    doc: jsPDF,
    y: number,
    margin: number,
    pageHeight: number,
    pageWidth: number,
    title: string,
    paragraph: string,
    titleBarColor?: [number, number, number]
): number {
    const innerW = pageWidth - margin * 2 - BOX_PAD * 2
    const x = margin + BOX_PAD
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(51, 65, 85)
    const lines = doc.splitTextToSize(paragraph || "Sin contenido", innerW)
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

    doc.setFillColor(...(titleBarColor ?? [241, 245, 249]))
    doc.rect(boxLeft, y, boxW, TITLE_BAR_H, "F")
    doc.setDrawColor(226, 232, 240)
    doc.line(boxLeft, y + TITLE_BAR_H, boxLeft + boxW, y + TITLE_BAR_H)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text(title, boxLeft + BOX_PAD, y + 6)

    let textY = y + BOX_PAD + TITLE_BAR_H + BOX_PAD
    for (const line of lines) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        doc.setTextColor(51, 65, 85)
        doc.text(line, x, textY)
        textY += LINE_H
    }

    return y + boxH + BOX_GAP
}

export function buildConvivenciaPdf(
    record: any,
    reporterName: string,
    institutionName?: string,
    institutionLogoBase64?: string | null,
    nitivLogoBase64?: string | null
) {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    })

    const margin = 20
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    let yPos = margin

    yPos = addPdfLogoHeader(doc, margin, pageWidth, institutionLogoBase64 ?? null, nitivLogoBase64 ?? null)

    const statusBarColor = getStatusBarColor(!!record.resolved, record.status)

    const incidentDate = record.incident_date
        ? new Date(record.incident_date).toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" })
        : "No registrada"

    let studentsText = "Ninguno"
    const involvedList = record.convivencia_record_students?.map((s: any) => s.students).filter(Boolean)
    if (involvedList && involvedList.length > 0) {
        studentsText = involvedList.map((s: any) => {
            const courseData = s.courses ?? s.course
            const course = courseData ? ` — ${courseData.name}${courseData.section ? " " + courseData.section : ""}` : ""
            const rut = s.rut ? ` (${s.rut})` : ""
            return `${s.last_name}, ${s.name}${course}${rut}`
        }).join(" | ")
    }

    // Cuadro 1: Datos del registro
    const headerContent: string[] = []
    if (institutionName) headerContent.push(`Establecimiento: ${institutionName}`)
    headerContent.push(
        `Caso: ${record.type || "Sin clasificar"}`,
        `Fecha y hora: ${incidentDate}`,
        `Gravedad: ${record.severity?.toUpperCase() || "N/A"}`,
        `Lugar: ${record.location || "No especificado"}`,
        `Estado: ${record.resolved ? "Resuelto" : record.status || "Abierto"}`,
        `Involucrados: ${studentsText}`,
        `Registrado por: ${reporterName}`
    )
    yPos = addBoxedSection(doc, yPos, margin, pageHeight, pageWidth, "1. Datos del registro", headerContent, statusBarColor)

    // Cuadro 2: Descripción del evento
    yPos = addBoxedParagraph(doc, yPos, margin, pageHeight, pageWidth, "2. Descripción del evento", record.description || "Sin descripción", statusBarColor)

    // Cuadro 3: Acciones inmediatas (si hay)
    if (record.actions_taken && record.actions_taken.length > 0) {
        const actionsText = record.actions_taken.map((a: string) => `• ${a}`).join("\n")
        yPos = addBoxedParagraph(doc, yPos, margin, pageHeight, pageWidth, "3. Acciones inmediatas tomadas", actionsText, statusBarColor)
    }

    // Cuadro: Acuerdos / Resolución (si hay)
    if (record.agreements?.trim()) {
        const sectionTitle = record.actions_taken?.length ? "4. Acuerdos / Resolución" : "3. Acuerdos / Resolución"
        yPos = addBoxedParagraph(doc, yPos, margin, pageHeight, pageWidth, sectionTitle, record.agreements.trim(), statusBarColor)
    }

    // Cuadro: Notas de resolución (si hay)
    if (record.resolution_notes?.trim()) {
        yPos = addBoxedParagraph(doc, yPos, margin, pageHeight, pageWidth, "Notas de resolución de caso", record.resolution_notes.trim(), statusBarColor)
    }

    // Footer
    const pageCount = (doc.internal as any).getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(148, 163, 184)
        doc.text(`Generado el ${new Date().toLocaleString("es-CL")} - Pagina ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: "center" })
    }

    return doc
}

// Informe de estadisticas de registros de convivencia
export interface ConvivenciaStatsPdfData {
    institutionName?: string
    statusCounts: { abiertos: number; seguimiento: number; cerrados: number }
    last30: number
    lastWeek: number
    weekPct: number | null
    weekDiff: number
    topTypeLabel: string | null
    gravesLast30: number
    resolutionRate: number
    resolvedCount: number
    totalRecords: number
    trendVsPrev: number | null
    severityDist: { label: string; count: number }[]
    daysHeatmap: { name: string; count: number }[]
    byLocation: { name: string; count: number }[]
    involvedStats: { avg: number; soloUno: number; dosOMas: number }
    weeklyData: { semana: string; casos: number }[]
    pieData: { name: string; value: number }[]
    topReincidentStudents: { name: string; last_name: string; count: number }[]
    topActionsTaken: { name: string; count: number }[]
}

function newPageIfNeeded(doc: jsPDF, yPos: number, margin: number, needSpace: number = 20) {
    if (yPos + needSpace > doc.internal.pageSize.height - margin) {
        doc.addPage()
        return margin
    }
    return yPos
}

export function buildConvivenciaStatsPdf(
    data: ConvivenciaStatsPdfData,
    institutionLogoBase64?: string | null,
    nitivLogoBase64?: string | null
): jsPDF {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const margin = 18
    const pageWidth = doc.internal.pageSize.width
    let y = margin

    y = addPdfLogoHeader(doc, margin, pageWidth, institutionLogoBase64 ?? null, nitivLogoBase64 ?? null)

    if (data.institutionName) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        doc.setTextColor(100, 116, 139)
        doc.text(data.institutionName, margin, y)
        y += 8
    }

    // TÍTULO PRINCIPAL DEL INFORME
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(30, 41, 59)
    doc.text("INFORME DE ESTADISTICAS DE CONVIVENCIA", margin, y)
    y += 8

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text(`Generado el ${new Date().toLocaleString("es-CL")}`, margin, y)
    y += 10

    const pageHeight = doc.internal.pageSize.height

    // 1. ESTADO DE CASOS
    const estadoContent: string[] = [
        `Abiertos (requieren atencion): ${data.statusCounts.abiertos}`,
        `En seguimiento: ${data.statusCounts.seguimiento}`,
        `Cerrados / Resueltos: ${data.statusCounts.cerrados}`,
    ]
    y = addBoxedSection(
        doc,
        y,
        margin,
        pageHeight,
        pageWidth,
        "1. ESTADO DE CASOS",
        estadoContent
    )

    // 2. RESUMEN DEL PERIODO
    const resumenContent: string[] = [
        `Casos ultimos 30 dias: ${data.last30}`,
        ...(data.trendVsPrev !== null
            ? [`Variacion vs 30 dias anteriores: ${data.trendVsPrev >= 0 ? "+" : ""}${data.trendVsPrev}%`]
            : []),
        `Casos esta semana: ${data.lastWeek}`,
        ...(data.weekPct !== null
            ? [`Variacion vs semana pasada: ${data.weekDiff >= 0 ? "+" : ""}${data.weekPct}%`]
            : []),
        `Tipo mas frecuente (30 dias): ${data.topTypeLabel || "-"}`,
        `Casos graves (30 dias): ${data.gravesLast30}`,
    ]
    y = addBoxedSection(
        doc,
        y,
        margin,
        pageHeight,
        pageWidth,
        "2. RESUMEN DEL PERIODO",
        resumenContent
    )

    // 3. TASA DE RESOLUCION
    const tasaContent: string[] = [
        `Casos resueltos: ${data.resolvedCount} de ${data.totalRecords}`,
        `Porcentaje: ${data.resolutionRate}%`,
    ]
    y = addBoxedSection(
        doc,
        y,
        margin,
        pageHeight,
        pageWidth,
        "3. TASA DE RESOLUCION",
        tasaContent
    )

    // 4. DISTRIBUCION POR GRAVEDAD
    const gravedadContent: string[] = data.severityDist.map(s => {
        const pct = data.totalRecords > 0 ? Math.round((s.count / data.totalRecords) * 100) : 0
        return `${s.label}: ${s.count} (${pct}%)`
    })
    if (gravedadContent.length > 0) {
        y = addBoxedSection(
            doc,
            y,
            margin,
            pageHeight,
            pageWidth,
            "4. DISTRIBUCION POR GRAVEDAD",
            gravedadContent
        )
    }

    // 5. CASOS POR DIA (LUN - VIE)
    const diasContent: string[] = data.daysHeatmap.map(d => `${d.name}: ${d.count}`)
    if (diasContent.length > 0) {
        y = addBoxedSection(
            doc,
            y,
            margin,
            pageHeight,
            pageWidth,
            "5. CASOS POR DIA (LUN - VIE)",
            diasContent
        )
    }

    // 6. LUGARES CON MAS CASOS
    if (data.byLocation.length > 0) {
        const locContent: string[] = data.byLocation.slice(0, 8).map(loc => {
            const pct = data.totalRecords > 0 ? Math.round((loc.count / data.totalRecords) * 100) : 0
            return `${loc.name}: ${loc.count} (${pct}%)`
        })
        y = addBoxedSection(
            doc,
            y,
            margin,
            pageHeight,
            pageWidth,
            "6. LUGARES CON MAS CASOS",
            locContent
        )
    }

    // 7. INVOLUCRADOS POR CASO
    const invContent: string[] = [
        `Promedio de personas por caso: ${data.involvedStats.avg}`,
        `Casos con 1 involucrado: ${data.involvedStats.soloUno}`,
        `Casos con 2 o mas involucrados: ${data.involvedStats.dosOMas}`,
    ]
    y = addBoxedSection(
        doc,
        y,
        margin,
        pageHeight,
        pageWidth,
        "7. INVOLUCRADOS POR CASO",
        invContent
    )

    // 8. EVOLUCION SEMANAL
    if (data.weeklyData.length > 0) {
        const evoContent: string[] = data.weeklyData.map(w => `${w.semana}: ${w.casos}`)
        y = addBoxedSection(
            doc,
            y,
            margin,
            pageHeight,
            pageWidth,
            "8. EVOLUCION SEMANAL (ULTIMAS 6 SEMANAS)",
            evoContent
        )
    }

    // 9. DISTRIBUCION POR TIPO (30 DIAS)
    if (data.pieData.length > 0) {
        const tipoContent: string[] = data.pieData.map(p => `${p.name}: ${p.value}`)
        y = addBoxedSection(
            doc,
            y,
            margin,
            pageHeight,
            pageWidth,
            "9. DISTRIBUCION POR TIPO (30 DIAS)",
            tipoContent
        )
    }

    // 10. ESTUDIANTES REINCIDENTES
    if (data.topReincidentStudents.length > 0) {
        const reincContent: string[] = data.topReincidentStudents.map((s, i) =>
            `${i + 1}. ${s.last_name}, ${s.name}: ${s.count} casos`
        )
        y = addBoxedSection(
            doc,
            y,
            margin,
            pageHeight,
            pageWidth,
            "10. ESTUDIANTES REINCIDENTES (TOP 5)",
            reincContent
        )
    }

    // 11. MEDIDAS Y ACCIONES MAS FRECUENTES
    if (data.topActionsTaken.length > 0) {
        const accionesContent: string[] = data.topActionsTaken.map((a, i) =>
            `${i + 1}. ${a.name}: ${a.count} veces`
        )
        y = addBoxedSection(
            doc,
            y,
            margin,
            pageHeight,
            pageWidth,
            "11. MEDIDAS Y ACCIONES MAS FRECUENTES",
            accionesContent
        )
    }

    // Footer en todas las paginas
    const totalPages = (doc.internal as any).getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text(
            `Estadisticas de Convivencia - Pagina ${i} de ${totalPages} - ${new Date().toLocaleDateString("es-CL")}`,
            pageWidth / 2,
            doc.internal.pageSize.height - 10,
            { align: "center" }
        )
    }

    return doc
}
