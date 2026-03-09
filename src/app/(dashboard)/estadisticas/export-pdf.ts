import jsPDF from "jspdf"
import autoTable, { RowInput } from "jspdf-autotable"

// Datos completos para el informe PDF (alineado con DashboardData)
export interface PDFReportData {
    institutionName: string
    days: number
    summary: {
        total_emotion_logs: number
        total_incidents: number
        total_activities: number
        low_emotion_courses: number
    }
    convivenciaSummary?: { open: number; closed: number }
    emotionDistribution: { emotion: string; count: number }[]
    courseRisks: {
        course_id: string
        course_name: string
        avg_score: number
        low_students: { student_id: string; name: string; avg_score: number }[]
    }[]
    incidents: {
        byMonth: { month: string; count: number }[]
        bySeverity: { label: string; count: number }[]
        byType: { label: string; count: number }[]
        byCourse: { label: string; count: number }[]
        recent: {
            id: string
            folio: string | null
            type: string
            severity: string
            student_name: string
            course_name: string | null
            incident_date: string
        }[]
    }
    activities: {
        byMonth: { month: string; count: number }[]
        byType: { label: string; count: number }[]
        byCourse: { label: string; count: number }[]
        recent: {
            id: string
            title: string
            start_datetime: string
            activity_type?: string
        }[]
    }
}

const MARGIN = 14
const PAGE_HEIGHT = 297

function newPageIfNeeded(pdf: jsPDF, y: number, need: number): number {
    if (y + need > PAGE_HEIGHT - 20) {
        pdf.addPage()
        return MARGIN
    }
    return y
}

function sectionTitle(pdf: jsPDF, y: number, title: string): number {
    let currentY = newPageIfNeeded(pdf, y, 18)
    pdf.setFontSize(12)
    pdf.setFont("helvetica", "bold")
    pdf.setTextColor(30, 41, 59)
    pdf.text(title, MARGIN, currentY)
    currentY += 7
    pdf.setDrawColor(226, 232, 240)
    pdf.line(MARGIN, currentY, pdf.internal.pageSize.getWidth() - MARGIN, currentY)
    currentY += 8
    return currentY
}

function subTitle(pdf: jsPDF, y: number, title: string): number {
    let currentY = newPageIfNeeded(pdf, y, 12)
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "bold")
    pdf.setTextColor(71, 85, 105)
    pdf.text(title, MARGIN, currentY)
    currentY += 6
    return currentY
}

const EMOTION_LABELS: Record<string, string> = {
    triste: "Triste",
    muy_mal: "Muy mal",
    mal: "Mal",
    neutral: "Neutral",
    bien: "Bien",
    muy_bien: "Muy bien",
}
const SEVERITY_LABELS: Record<string, string> = { moderada: "Moderada", severa: "Severa" }
const TYPE_INCIDENT_LABELS: Record<string, string> = {
    DEC: "DEC",
    agresion_fisica: "Agresion fisica",
    agresion_verbal: "Agresion verbal",
    bullyng: "Bullying",
    acoso: "Acoso",
    consumo: "Consumo",
}
const TYPE_ACTIVITY_LABELS: Record<string, string> = {
    taller: "Taller",
    charla: "Charla",
    evento: "Evento",
    ceremonia: "Ceremonia",
    deportivo: "Deportivo",
    otro: "Otro",
}

function formatMonth(key: string): string {
    const [y, m] = key.split("-").map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString("es-CL", { month: "short", year: "2-digit" })
}

export async function generateStatisticsReport(data: PDFReportData): Promise<jsPDF> {
    const pdf = new jsPDF("p", "mm", "a4")
    const pageWidth = pdf.internal.pageSize.getWidth()
    let y = MARGIN

    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(18)
    pdf.setTextColor(55, 48, 163)
    pdf.text("Informe de Estadisticas", MARGIN, y)
    y += 8

    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(11)
    pdf.setTextColor(30, 41, 59)
    pdf.text(`Institucion: ${data.institutionName}`, MARGIN, y)
    y += 6

    pdf.setFontSize(9)
    pdf.setTextColor(100, 116, 139)
    const rangeLabel =
        data.days === 30 ? "Ultimos 30 dias" : data.days === 90 ? "Ultimos 90 dias" : "Ultimos 365 dias"
    pdf.text(`Periodo: ${rangeLabel}`, MARGIN, y)
    y += 5
    pdf.text(`Generado: ${new Date().toLocaleString("es-CL")}`, MARGIN, y)
    y += 12

    // --------- 1. Resumen ejecutivo ---------
    y = sectionTitle(pdf, y, "1. Resumen ejecutivo")
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(10)
    pdf.setTextColor(51, 65, 85)

    const summaryRows: RowInput[] = [
        ["Registros emocionales", String(data.summary.total_emotion_logs ?? 0)],
        ["Incidentes DEC", String(data.summary.total_incidents ?? 0)],
        ["Actividades realizadas", String(data.summary.total_activities ?? 0)],
        ["Cursos en riesgo (clima bajo)", String(data.summary.low_emotion_courses ?? 0)],
    ]
    autoTable(pdf, {
        head: [["Metrica", "Valor"]],
        body: summaryRows,
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [55, 48, 163], textColor: 255, fontStyle: "bold" },
    })
    y = (pdf as any).lastAutoTable.finalY + 10

    if (data.convivenciaSummary != null) {
        y = newPageIfNeeded(pdf, y, 30)
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(10)
        pdf.text("Registros de convivencia (periodo)", MARGIN, y)
        y += 6
        pdf.setFont("helvetica", "normal")
        pdf.text(`Casos abiertos: ${data.convivenciaSummary.open}  |  Casos cerrados: ${data.convivenciaSummary.closed}`, MARGIN, y)
        y += 10
    }

    // --------- 2. Clima emocional ---------
    y = sectionTitle(pdf, y, "2. Distribucion clima emocional")
    if (data.emotionDistribution.length === 0) {
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(9)
        pdf.setTextColor(100, 116, 139)
        pdf.text("Sin registros emocionales en el periodo.", MARGIN, y)
        y += 10
    } else {
        const emotionRows: RowInput[] = data.emotionDistribution.map((e) => [
            EMOTION_LABELS[e.emotion] ?? e.emotion,
            String(e.count),
        ])
        autoTable(pdf, {
            head: [["Estado emocional", "Cantidad"]],
            body: emotionRows,
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            theme: "grid",
            styles: { fontSize: 9 },
            headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: "bold" },
        })
        y = (pdf as any).lastAutoTable.finalY + 10
    }

    // --------- 3. Cursos en riesgo ---------
    y = sectionTitle(pdf, y, "3. Cursos en riesgo (promedio emocional bajo)")
    if (data.courseRisks.length === 0) {
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(9)
        pdf.setTextColor(100, 116, 139)
        pdf.text("Ningun curso en riesgo en el periodo.", MARGIN, y)
        y += 10
    } else {
        for (const c of data.courseRisks) {
            y = newPageIfNeeded(pdf, y, 35)
            y = subTitle(pdf, y, `${c.course_name}  -  Promedio: ${c.avg_score.toFixed(2)}`)
            if (c.low_students.length === 0) {
                pdf.setFont("helvetica", "normal")
                pdf.setFontSize(9)
                pdf.text("Sin estudiantes con datos suficientes.", MARGIN, y)
                y += 8
            } else {
                const studentRows: RowInput[] = c.low_students.map((s) => [
                    s.name,
                    s.avg_score.toFixed(2),
                ])
                autoTable(pdf, {
                    head: [["Estudiante", "Promedio emocional"]],
                    body: studentRows,
                    startY: y,
                    margin: { left: MARGIN, right: MARGIN },
                    theme: "grid",
                    styles: { fontSize: 9 },
                    headStyles: { fillColor: [244, 63, 94], textColor: 255, fontStyle: "bold" },
                })
                y = (pdf as any).lastAutoTable.finalY + 8
            }
        }
        y += 4
    }

    // --------- 4. Incidentes DEC ---------
    y = sectionTitle(pdf, y, "4. Incidentes DEC")

    y = subTitle(pdf, y, "4.1 Por mes")
    if (data.incidents.byMonth.length === 0) {
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(9)
        pdf.text("Sin datos.", MARGIN, y)
        y += 8
    } else {
        const monthRows: RowInput[] = data.incidents.byMonth.map((m) => [
            formatMonth(m.month),
            String(m.count),
        ])
        autoTable(pdf, {
            head: [["Mes", "Incidentes"]],
            body: monthRows,
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            theme: "grid",
            styles: { fontSize: 9 },
            headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: "bold" },
        })
        y = (pdf as any).lastAutoTable.finalY + 8
    }

    y = subTitle(pdf, y, "4.2 Por severidad")
    if (data.incidents.bySeverity.length === 0) {
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(9)
        pdf.text("Sin datos.", MARGIN, y)
        y += 8
    } else {
        const sevRows: RowInput[] = data.incidents.bySeverity.map((s) => [
            SEVERITY_LABELS[s.label] ?? s.label,
            String(s.count),
        ])
        autoTable(pdf, {
            head: [["Severidad", "Cantidad"]],
            body: sevRows,
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            theme: "grid",
            styles: { fontSize: 9 },
        })
        y = (pdf as any).lastAutoTable.finalY + 8
    }

    y = subTitle(pdf, y, "4.3 Por tipo")
    if ((data.incidents.byType ?? []).length === 0) {
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(9)
        pdf.text("Sin datos.", MARGIN, y)
        y += 8
    } else {
        const typeRows: RowInput[] = (data.incidents.byType ?? []).map((t) => [
            TYPE_INCIDENT_LABELS[t.label] ?? t.label,
            String(t.count),
        ])
        autoTable(pdf, {
            head: [["Tipo", "Cantidad"]],
            body: typeRows,
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            theme: "grid",
            styles: { fontSize: 9 },
        })
        y = (pdf as any).lastAutoTable.finalY + 8
    }

    if ((data.incidents.byCourse ?? []).length > 0) {
        y = subTitle(pdf, y, "4.4 Por curso")
        const courseRows: RowInput[] = (data.incidents.byCourse ?? []).map((c) => [
            c.label,
            String(c.count),
        ])
        autoTable(pdf, {
            head: [["Curso", "Incidentes"]],
            body: courseRows,
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            theme: "grid",
            styles: { fontSize: 9 },
        })
        y = (pdf as any).lastAutoTable.finalY + 8
    }

    y = subTitle(pdf, y, "4.5 Ultimos incidentes registrados")
    if (data.incidents.recent.length === 0) {
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(9)
        pdf.text("Ninguno en el periodo.", MARGIN, y)
        y += 8
    } else {
        const recentRows: RowInput[] = data.incidents.recent.slice(0, 20).map((i) => [
            i.folio ?? i.id.slice(0, 8),
            TYPE_INCIDENT_LABELS[i.type] ?? i.type,
            SEVERITY_LABELS[i.severity] ?? i.severity,
            i.student_name ?? "-",
            i.course_name ?? "-",
            new Date(i.incident_date).toLocaleDateString("es-CL"),
        ])
        autoTable(pdf, {
            head: [["Folio", "Tipo", "Severidad", "Estudiante", "Curso", "Fecha"]],
            body: recentRows,
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            theme: "grid",
            styles: { fontSize: 8 },
            headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: "bold" },
        })
        y = (pdf as any).lastAutoTable.finalY + 10
    }

    // --------- 5. Actividades ---------
    y = sectionTitle(pdf, y, "5. Actividades")

    y = subTitle(pdf, y, "5.1 Por mes")
    if (data.activities.byMonth.length === 0) {
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(9)
        pdf.text("Sin datos.", MARGIN, y)
        y += 8
    } else {
        const actMonthRows: RowInput[] = data.activities.byMonth.map((m) => [
            formatMonth(m.month),
            String(m.count),
        ])
        autoTable(pdf, {
            head: [["Mes", "Actividades"]],
            body: actMonthRows,
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            theme: "grid",
            styles: { fontSize: 9 },
            headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold" },
        })
        y = (pdf as any).lastAutoTable.finalY + 8
    }

    y = subTitle(pdf, y, "5.2 Por tipo")
    if (data.activities.byType.length === 0) {
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(9)
        pdf.text("Sin datos.", MARGIN, y)
        y += 8
    } else {
        const actTypeRows: RowInput[] = data.activities.byType.map((t) => [
            TYPE_ACTIVITY_LABELS[t.label] ?? t.label,
            String(t.count),
        ])
        autoTable(pdf, {
            head: [["Tipo", "Cantidad"]],
            body: actTypeRows,
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            theme: "grid",
            styles: { fontSize: 9 },
        })
        y = (pdf as any).lastAutoTable.finalY + 8
    }

    if ((data.activities.byCourse ?? []).length > 0) {
        y = subTitle(pdf, y, "5.3 Por curso")
        const actCourseRows: RowInput[] = (data.activities.byCourse ?? []).map((c) => [
            c.label,
            String(c.count),
        ])
        autoTable(pdf, {
            head: [["Curso", "Actividades"]],
            body: actCourseRows,
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            theme: "grid",
            styles: { fontSize: 9 },
        })
        y = (pdf as any).lastAutoTable.finalY + 8
    }

    y = subTitle(pdf, y, "5.4 Ultimas actividades")
    if (data.activities.recent.length === 0) {
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(9)
        pdf.text("Ninguna en el periodo.", MARGIN, y)
        y += 8
    } else {
        const actRecentRows: RowInput[] = data.activities.recent.slice(0, 15).map((a) => [
            a.title || "Sin titulo",
            TYPE_ACTIVITY_LABELS[a.activity_type ?? ""] ?? a.activity_type ?? "-",
            new Date(a.start_datetime).toLocaleDateString("es-CL"),
        ])
        autoTable(pdf, {
            head: [["Actividad", "Tipo", "Fecha"]],
            body: actRecentRows,
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            theme: "grid",
            styles: { fontSize: 9 },
            headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold" },
        })
        y = (pdf as any).lastAutoTable.finalY + 10
    }

    // --------- Pie de pagina ---------
    const totalPages = (pdf as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(148, 163, 184)
        const footerY = PAGE_HEIGHT - 10
        pdf.text(
            "Uso interno y confidencial. Prohibida su difusion fuera de la comunidad educativa.",
            MARGIN,
            footerY
        )
        pdf.text(`Pagina ${i} de ${totalPages}`, pageWidth - MARGIN - 25, footerY)
    }

    return pdf
}
