import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { addPdfLogoHeader } from "@/lib/pdf/pdf-logos"

const MARGIN = 14
const PAGE_WIDTH = 210

/** Sanitiza un texto para usarlo en nombre de archivo (sin acentos, sin caracteres inválidos). */
function sanitizeFileNamePart(s: string, maxLen = 40): string {
    const out = String(s ?? "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[\s/\\:*?"<>|°ºª]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, maxLen)
    return out || "sin_nombre"
}

const SEVERITY_LABEL: Record<string, string> = {
    moderada: "Moderada", severa: "Severa",
    leve: "Leve", grave: "Grave", muy_grave: "Muy grave",
}

// ── Reporte ficha individual estudiante ──
export function generateStudentPDF(data: {
    institutionName: string
    student: { name: string; last_name: string; rut?: string; courseName: string }
    emotions: { date: string; emotion: string; intensity: number; stress: number | null; anxiety: number | null; reflection?: string }[]
    incidents: { folio: string; type: string; severity: string; date: string; resolved: boolean }[]
    hasPaec: boolean
    alerts: { type: string; description: string; date: string; resolved: boolean }[]
}, institutionLogoBase64?: string | null, nitivLogoBase64?: string | null) {
    const doc = new jsPDF()
    const today = new Date().toLocaleDateString("es-CL")
    let y = addPdfLogoHeader(doc, MARGIN, PAGE_WIDTH, institutionLogoBase64 ?? null, nitivLogoBase64 ?? null)
    y += 6

    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Nitiv — Ficha Individual", MARGIN, y)
    y += 7
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(120)
    doc.text(`${data.institutionName}`, MARGIN, y)
    y += 6
    doc.text(`Generado el ${today}`, MARGIN, y)
    y += 10

    doc.setTextColor(0)
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Datos del estudiante", MARGIN, y)
    y += 4

    autoTable(doc, {
        startY: y,
        head: [["Campo", "Valor"]],
        body: [
            ["Nombre", `${data.student.name} ${data.student.last_name}`],
            ["RUT", data.student.rut ?? "No registrado"],
            ["Curso", data.student.courseName],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: MARGIN, right: MARGIN },
    })

    // Resumen de bienestar y seguimiento
    const totalEmotions = data.emotions.length
    const negativeEmotions = data.emotions.filter(e => e.emotion === "mal" || e.emotion === "muy_mal").length
    const pctNegative = totalEmotions > 0 ? Math.round((negativeEmotions / totalEmotions) * 100) : 0
    const totalIncidents = data.incidents.length
    const openIncidents = data.incidents.filter(i => !i.resolved).length
    const totalAlerts = data.alerts.length
    const openAlerts = data.alerts.filter(a => !a.resolved).length

    const yResumen = (doc as any).lastAutoTable.finalY + 8
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Resumen de bienestar y seguimiento", MARGIN, yResumen)

    autoTable(doc, {
        startY: yResumen + 4,
        head: [["Indicador", "Valor"]],
        body: [
            ["Registros emocionales en el período", totalEmotions.toString()],
            ["Registros con emoción negativa (mal / muy mal)", `${negativeEmotions} (${pctNegative}%)`],
            ["Registros DEC (total / abiertos)", `${totalIncidents} / ${openIncidents}`],
            ["Alertas (total / abiertas)", `${totalAlerts} / ${openAlerts}`],
            ["PAEC activo", data.hasPaec ? "Sí" : "No"],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: MARGIN, right: MARGIN },
    })

    // Registros emocionales
    const y1 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Registros emocionales recientes", MARGIN, y1)

    const EMOTION_LABEL: Record<string, string> = {
        muy_bien: "Muy bien", bien: "Bien", neutral: "Neutral",
        mal: "Mal", muy_mal: "Muy mal",
    }

    autoTable(doc, {
        startY: y1 + 4,
        head: [["Fecha", "Emoción", "Intensidad", "Estrés", "Ansiedad", "Reflexión"]],
        body: data.emotions.slice(0, 15).map(e => [
            new Date(e.date).toLocaleDateString("es-CL"),
            EMOTION_LABEL[e.emotion] ?? e.emotion,
            `${e.intensity}/5`,
            e.stress != null ? `${e.stress}/5` : "—",
            e.anxiety != null ? `${e.anxiety}/5` : "—",
            e.reflection ? e.reflection.substring(0, 60) + (e.reflection.length > 60 ? "..." : "") : "—",
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: MARGIN, right: MARGIN },
    })

    // DEC
    const y2 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Registros DEC", MARGIN, y2)

    autoTable(doc, {
        startY: y2 + 4,
        head: [["Folio", "Tipo", "Severidad", "Fecha", "Estado"]],
        body: data.incidents.length > 0
            ? data.incidents.map(i => [
                i.folio ?? "—",
                i.type,
                SEVERITY_LABEL[i.severity] ?? i.severity,
                new Date(i.date).toLocaleDateString("es-CL"),
                i.resolved ? "Resuelto" : "Pendiente",
            ])
            : [["Sin registros DEC", "", "", "", ""]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: MARGIN, right: MARGIN },
    })

    // PAEC
    const y3 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Alertas generadas", MARGIN, y3)

    autoTable(doc, {
        startY: y3 + 4,
        head: [["Tipo", "Descripción", "Fecha", "Estado"]],
        body: data.alerts.length > 0
            ? data.alerts.map(a => [
                a.type,
                a.description?.substring(0, 60) ?? "—",
                new Date(a.date).toLocaleDateString("es-CL"),
                a.resolved ? "Resuelta" : "Pendiente",
            ])
            : [["Sin alertas", "", "", ""]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: MARGIN, right: MARGIN },
    })

    // Footer
    const pageCount = (doc as any).getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
            `Nitiv — Documento confidencial — Página ${i} de ${pageCount}`,
            MARGIN, doc.internal.pageSize.height - 10
        )
    }

    const year = new Date().getFullYear()
    const dateStr = today.replace(/\//g, "-")
    const apellido = sanitizeFileNamePart(data.student.last_name, 30)
    const nombre = sanitizeFileNamePart(data.student.name, 30)
    const curso = sanitizeFileNamePart(data.student.courseName, 20)
    doc.save(`Ficha_individual_estudiante_${apellido}_${nombre}_${curso}_${year}_${dateStr}.pdf`)
}

// ── Reporte clima del curso ──
export function generateClimatePDF(data: {
    institutionName: string
    courseName: string
    weeks: { semana: string; promedio: number | null; registros: number }[]
    students: { name: string; hasPaec: boolean; alertCount: number; incidentCount: number; lastEmotion: string }[]
}, institutionLogoBase64?: string | null, nitivLogoBase64?: string | null) {
    const doc = new jsPDF()
    const today = new Date().toLocaleDateString("es-CL")
    let y = addPdfLogoHeader(doc, MARGIN, PAGE_WIDTH, institutionLogoBase64 ?? null, nitivLogoBase64 ?? null)
    y += 6

    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Nitiv — Reporte de Clima del Curso", MARGIN, y)
    y += 7
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(120)
    doc.text(data.institutionName, MARGIN, y)
    y += 6
    doc.text(`Curso: ${data.courseName} — Generado el ${today}`, MARGIN, y)
    y += 10

    doc.setTextColor(0)
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Tendencia de energía — últimas 4 semanas", MARGIN, y)
    y += 4

    const SCORE_LABEL: Record<number, string> = {
        4: "Regulada", 3: "Inquieta", 2: "Apática", 1: "Explosiva",
    }

    autoTable(doc, {
        startY: y,
        head: [["Semana", "Promedio", "Clima predominante", "Registros"]],
        body: data.weeks.map(w => [
            w.semana,
            w.promedio !== null ? `${w.promedio}/4` : "Sin datos",
            w.promedio !== null ? (SCORE_LABEL[Math.round(w.promedio)] ?? "—") : "—",
            w.registros.toString(),
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: MARGIN, right: MARGIN },
    })

    const y1 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Seguimiento de estudiantes (PAEC, alertas, DEC)", MARGIN, y1)

    autoTable(doc, {
        startY: y1 + 4,
        head: [["Estudiante", "PAEC activo", "Alertas abiertas", "DEC abiertos", "Última emoción"]],
        body: data.students.map(s => [
            s.name,
            s.hasPaec ? "Sí" : "No",
            s.alertCount.toString(),
            s.incidentCount.toString(),
            s.lastEmotion,
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: MARGIN, right: MARGIN },
    })

    const pageCount = (doc as any).getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
            `Nitiv — Documento confidencial — Página ${i} de ${pageCount}`,
            MARGIN, doc.internal.pageSize.height - 10
        )
    }

    const year = new Date().getFullYear()
    const dateStr = today.replace(/\//g, "-")
    const curso = sanitizeFileNamePart(data.courseName, 30)
    doc.save(`Reporte_clima_aula_${curso}_${year}_${dateStr}.pdf`)
}

// ── Reporte institucional ──
export function generateInstitutionalPDF(data: {
    institutionName: string
    totalStudents: number
    totalAlerts: number
    totalIncidents: number
    meses: { mes: string; total: number; negativos: number; pct: number }[]
    courses: { courseName: string; label: string; registros: number }[]
    alertsByType?: { type: string; total: number; open: number }[]
    decBySeverity?: { severity: string; total: number; open: number }[]
    topRiskCourses?: { courseName: string; label: string; alerts: number; incidents: number }[]
}, institutionLogoBase64?: string | null, nitivLogoBase64?: string | null) {
    const doc = new jsPDF()
    const today = new Date().toLocaleDateString("es-CL")
    let y = addPdfLogoHeader(doc, MARGIN, PAGE_WIDTH, institutionLogoBase64 ?? null, nitivLogoBase64 ?? null)
    y += 6

    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Nitiv — Reporte Institucional", MARGIN, y)
    y += 7
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(120)
    doc.text(`${data.institutionName} — Generado el ${today}`, MARGIN, y)
    y += 10

    doc.setTextColor(0)
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Resumen general", MARGIN, y)
    y += 4

    autoTable(doc, {
        startY: y,
        head: [["Indicador", "Valor"]],
        body: [
            ["Total estudiantes activos", data.totalStudents.toString()],
            ["Alertas sin resolver", data.totalAlerts.toString()],
            ["DEC pendientes", data.totalIncidents.toString()],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: MARGIN, right: MARGIN },
    })

    const y1 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Registros negativos por mes", MARGIN, y1)

    autoTable(doc, {
        startY: y1 + 4,
        head: [["Mes", "Total registros", "Registros negativos", "% Negativos"]],
        body: data.meses.map(m => [
            m.mes,
            m.total.toString(),
            m.negativos.toString(),
            `${m.pct}%`,
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: MARGIN, right: MARGIN },
    })

    const y2 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Clima por curso", MARGIN, y2)

    autoTable(doc, {
        startY: y2 + 4,
        head: [["Curso", "Clima predominante", "Registros docentes"]],
        body: data.courses.map(c => [c.courseName, c.label, c.registros.toString()]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: MARGIN, right: MARGIN },
    })

    // Alertas por tipo
    if (data.alertsByType && data.alertsByType.length > 0) {
        const y3 = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(13)
        doc.setFont("helvetica", "bold")
        doc.text("Alertas por tipo", MARGIN, y3)

        autoTable(doc, {
            startY: y3 + 4,
            head: [["Tipo", "Total", "Abiertas"]],
            body: data.alertsByType.map(a => [a.type, a.total.toString(), a.open.toString()]),
            styles: { fontSize: 10 },
            headStyles: { fillColor: [30, 30, 30] },
            margin: { left: MARGIN, right: MARGIN },
        })
    }

    // DEC por severidad
    if (data.decBySeverity && data.decBySeverity.length > 0) {
        const y4 = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(13)
        doc.setFont("helvetica", "bold")
        doc.text("DEC por severidad", MARGIN, y4)

        autoTable(doc, {
            startY: y4 + 4,
            head: [["Severidad", "Total", "Abiertos"]],
            body: data.decBySeverity.map(d => [SEVERITY_LABEL[d.severity] ?? d.severity, d.total.toString(), d.open.toString()]),
            styles: { fontSize: 10 },
            headStyles: { fillColor: [30, 30, 30] },
            margin: { left: MARGIN, right: MARGIN },
        })
    }

    // Cursos en mayor riesgo
    if (data.topRiskCourses && data.topRiskCourses.length > 0) {
        const y5 = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(13)
        doc.setFont("helvetica", "bold")
        doc.text("Cursos en mayor riesgo", MARGIN, y5)

        autoTable(doc, {
            startY: y5 + 4,
            head: [["Curso", "Clima", "Alertas", "DEC"]],
            body: data.topRiskCourses.map(c => [
                c.courseName,
                c.label,
                c.alerts.toString(),
                c.incidents.toString(),
            ]),
            styles: { fontSize: 10 },
            headStyles: { fillColor: [30, 30, 30] },
            margin: { left: MARGIN, right: MARGIN },
        })
    }

    const pageCount = (doc as any).getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
            `Nitiv — Documento confidencial — Página ${i} de ${pageCount}`,
            MARGIN, doc.internal.pageSize.height - 10
        )
    }

    const year = new Date().getFullYear()
    const dateStr = today.replace(/\//g, "-")
    doc.save(`Reporte_institucional_${year}_${dateStr}.pdf`)
}
