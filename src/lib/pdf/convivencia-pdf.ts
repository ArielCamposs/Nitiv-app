import jsPDF from "jspdf"

export function buildConvivenciaPdf(record: any, reporterName: string) {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
    })

    const margin = 20
    const pageWidth = doc.internal.pageSize.width
    const contentWidth = pageWidth - margin * 2
    let yPos = margin

    // Helpers
    const addCategory = (text: string) => {
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(79, 70, 229) // indigo-600
        doc.text(text.toUpperCase(), margin, yPos)
        yPos += 8
    }

    const addTitle = (text: string) => {
        doc.setFont("helvetica", "bold")
        doc.setFontSize(18)
        doc.setTextColor(30, 41, 59) // slate-800
        const lines = doc.splitTextToSize(text, contentWidth)
        doc.text(lines, margin, yPos)
        yPos += (lines.length * 8) + 5

        doc.setDrawColor(226, 232, 240) // slate-200
        doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3)
        yPos += 5
    }

    const addSectionHeader = (text: string) => {
        if (yPos + 15 > doc.internal.pageSize.height - margin) {
            doc.addPage()
            yPos = margin
        }
        yPos += 4
        doc.setFont("helvetica", "bold")
        doc.setFontSize(12)
        doc.setTextColor(15, 23, 42) // slate-900
        doc.text(text, margin, yPos)
        yPos += 6
    }

    const addField = (label: string, value: string) => {
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(71, 85, 105) // slate-600
        doc.text(`${label}:`, margin, yPos)

        doc.setFont("helvetica", "normal")
        doc.setTextColor(15, 23, 42) // slate-900
        const textX = margin + 35
        const lines = doc.splitTextToSize(value, contentWidth - 35)

        if (yPos + (lines.length * 5) > doc.internal.pageSize.height - margin) {
            doc.addPage()
            yPos = margin
            doc.setFont("helvetica", "bold")
            doc.setTextColor(71, 85, 105)
            doc.text(`${label} (cont):`, margin, yPos)
            doc.setFont("helvetica", "normal")
            doc.setTextColor(15, 23, 42)
        }

        doc.text(lines, textX, yPos)
        yPos += (lines.length * 5) + 2
    }

    const addParagraph = (text: string) => {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        doc.setTextColor(71, 85, 105) // slate-600

        const lines = doc.splitTextToSize(text, contentWidth)
        if (yPos + (lines.length * 5) > doc.internal.pageSize.height - margin) {
            doc.addPage()
            yPos = margin
        }
        doc.text(lines, margin, yPos)
        yPos += (lines.length * 5) + 4
    }

    // --- Build Document ---
    addCategory("Registro de Convivencia Escolar")
    addTitle(`Caso: ${record.type || 'Sin clasificar'}`)

    const incidentDate = record.incident_date
        ? new Date(record.incident_date).toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" })
        : "No registrada"

    addField("Fecha/Hora", incidentDate)
    addField("Gravedad", record.severity?.toUpperCase() || "N/A")
    addField("Lugar", record.location || "No especificado")
    addField("Estado", record.resolved ? "Resuelto" : record.status || "Abierto")

    // Involved students
    let studentsText = "Ninguno"
    const involvedList = record.convivencia_record_students?.map((s: any) => s.students).filter(Boolean)
    if (involvedList && involvedList.length > 0) {
        studentsText = involvedList.map((s: any) => `${s.last_name}, ${s.name} ${s.rut ? `(${s.rut})` : ''}`).join(" | ")
    }
    addField("Involucrados", studentsText)

    yPos += 4
    addSectionHeader("Descripcion del Evento")
    addParagraph(record.description || "Sin descripcion")

    if (record.actions_taken && record.actions_taken.length > 0) {
        addSectionHeader("Acciones Inmediatas Tomadas")
        record.actions_taken.forEach((action: string) => {
            addParagraph(`- ${action}`)
        })
    }

    if (record.agreements) {
        addSectionHeader("Acuerdos / Resolucion")
        addParagraph(record.agreements)
    }

    if (record.resolution_notes) {
        addSectionHeader("Notas de Resolucion de Caso")
        addParagraph(record.resolution_notes)
    }

    yPos += 10
    addField("Registrado por", reporterName)

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

export function buildConvivenciaStatsPdf(data: ConvivenciaStatsPdfData): jsPDF {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const margin = 18
    const pageWidth = doc.internal.pageSize.width
    const contentWidth = pageWidth - margin * 2
    let y = margin

    const title = (text: string, fontSize: number = 14) => {
        y = newPageIfNeeded(doc, y, margin, 25)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(fontSize)
        doc.setTextColor(30, 41, 59)
        doc.text(text, margin, y)
        y += fontSize * 0.5 + 4
    }

    const section = (text: string) => {
        y = newPageIfNeeded(doc, y, margin, 18)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(11)
        doc.setTextColor(51, 65, 85)
        doc.text(text, margin, y)
        y += 6
    }

    const row = (label: string, value: string, indent: number = 0) => {
        const labelW = 70 - indent
        const valX = margin + 72
        const valW = pageWidth - margin - valX
        y = newPageIfNeeded(doc, y, margin, 12)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        doc.setTextColor(71, 85, 105)
        const labelLines = doc.splitTextToSize(label, labelW)
        doc.text(labelLines, margin + indent, y)
        doc.setTextColor(15, 23, 42)
        const valueLines = doc.splitTextToSize(String(value), valW)
        doc.text(valueLines, valX, y)
        y += Math.max(labelLines.length * 5, valueLines.length * 5) + 3
    }

    // Titulo del informe
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.setTextColor(79, 70, 229)
    doc.text("Informe de Estadisticas", margin, y)
    y += 6
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text("Registros de Convivencia Escolar", margin, y)
    y += 6
    doc.setDrawColor(226, 232, 240)
    doc.line(margin, y, pageWidth - margin, y)
    y += 10

    doc.setFontSize(9)
    doc.setTextColor(148, 163, 184)
    doc.text(`Generado el ${new Date().toLocaleString("es-CL")}`, margin, y)
    y += 12

    // 1. Estado de casos
    section("1. Estado de casos (periodo)")
    row("Abiertos (requieren atencion)", String(data.statusCounts.abiertos))
    row("En seguimiento", String(data.statusCounts.seguimiento))
    row("Cerrados / Resueltos", String(data.statusCounts.cerrados))
    y += 4

    // 2. Resumen numerico
    section("2. Resumen del periodo")
    row("Casos ultimos 30 dias", String(data.last30))
    if (data.trendVsPrev !== null) {
        row("Variacion vs 30 dias anteriores", `${data.trendVsPrev >= 0 ? "+" : ""}${data.trendVsPrev}%`)
    }
    row("Casos esta semana", String(data.lastWeek))
    if (data.weekPct !== null) {
        row("Variacion vs semana pasada", `${data.weekDiff >= 0 ? "+" : ""}${data.weekPct}%`)
    }
    row("Tipo mas frecuente (30 dias)", data.topTypeLabel || "-")
    row("Casos graves (30 dias)", String(data.gravesLast30))
    y += 4

    // 3. Tasa de resolucion
    section("3. Tasa de resolucion")
    row("Casos resueltos", `${data.resolvedCount} de ${data.totalRecords}`)
    row("Porcentaje", `${data.resolutionRate}%`)
    y += 4

    // 4. Distribucion por gravedad
    section("4. Distribucion por gravedad")
    data.severityDist.forEach(s => {
        const pct = data.totalRecords > 0 ? Math.round((s.count / data.totalRecords) * 100) : 0
        row(s.label, `${s.count} (${pct}%)`, 4)
    })
    y += 4

    // 5. Dias de la semana
    section("5. Casos por dia (Lun - Vie)")
    data.daysHeatmap.forEach(d => {
        row(d.name, String(d.count), 4)
    })
    y += 4

    // 6. Lugares
    if (data.byLocation.length > 0) {
        section("6. Lugares donde ocurren mas casos")
        data.byLocation.slice(0, 8).forEach(loc => {
            const pct = data.totalRecords > 0 ? Math.round((loc.count / data.totalRecords) * 100) : 0
            row(loc.name, `${loc.count} (${pct}%)`, 4)
        })
        y += 4
    }

    // 7. Involucrados
    section("7. Involucrados por caso")
    row("Promedio de personas por caso", String(data.involvedStats.avg))
    row("Casos con 1 involucrado", String(data.involvedStats.soloUno))
    row("Casos con 2 o mas involucrados", String(data.involvedStats.dosOMas))
    y += 4

    // 8. Evolucion semanal
    if (data.weeklyData.length > 0) {
        section("8. Evolucion semanal (ultimas 6 semanas)")
        data.weeklyData.forEach(w => {
            row(w.semana, String(w.casos), 4)
        })
        y += 4
    }

    // 9. Tipos (pie)
    if (data.pieData.length > 0) {
        section("9. Distribucion por tipo (30 dias)")
        data.pieData.forEach(p => {
            row(p.name, String(p.value), 4)
        })
        y += 4
    }

    // 10. Estudiantes reincidentes
    if (data.topReincidentStudents.length > 0) {
        section("10. Estudiantes reincidentes (top 5)")
        data.topReincidentStudents.forEach((s, i) => {
            row(`${i + 1}. ${s.last_name}, ${s.name}`, `${s.count} casos`, 4)
        })
        y += 4
    }

    // 11. Acciones mas frecuentes
    if (data.topActionsTaken.length > 0) {
        section("11. Medidas y acciones mas frecuentes")
        data.topActionsTaken.forEach((a, i) => {
            const lines = doc.splitTextToSize(a.name, contentWidth - 55)
            y = newPageIfNeeded(doc, y, margin, lines.length * 5 + 4)
            doc.setFont("helvetica", "normal")
            doc.setFontSize(10)
            doc.setTextColor(71, 85, 105)
            doc.text(`${i + 1}.`, margin + 4, y)
            doc.setTextColor(15, 23, 42)
            doc.text(lines, margin + 12, y)
            y += (lines.length * 5) + 2
            doc.setFontSize(9)
            doc.setTextColor(100, 116, 139)
            doc.text(`${a.count} veces`, margin + 12, y)
            y += 6
        })
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
