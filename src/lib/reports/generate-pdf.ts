import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// ── Reporte ficha individual estudiante ──
export function generateStudentPDF(data: {
    student: { name: string; last_name: string; rut?: string; courseName: string }
    emotions: { date: string; emotion: string; intensity: number; stress: number | null; anxiety: number | null; reflection?: string }[]
    incidents: { folio: string; type: string; severity: string; date: string; resolved: boolean }[]
    hasPaec: boolean
    alerts: { type: string; description: string; date: string; resolved: boolean }[]
}) {
    const doc = new jsPDF()
    const today = new Date().toLocaleDateString("es-CL")

    // Header
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Nitiv — Ficha Individual", 14, 20)

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(120)
    doc.text(`Generado el ${today}`, 14, 27)

    // Datos del estudiante
    doc.setTextColor(0)
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Datos del estudiante", 14, 40)

    autoTable(doc, {
        startY: 44,
        head: [["Campo", "Valor"]],
        body: [
            ["Nombre", `${data.student.name} ${data.student.last_name}`],
            ["RUT", data.student.rut ?? "No registrado"],
            ["Curso", data.student.courseName],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: 14, right: 14 },
    })

    // Resumen de bienestar y seguimiento
    const totalEmotions = data.emotions.length
    const negativeEmotions = data.emotions.filter(e => e.emotion === "mal" || e.emotion === "muy_mal").length
    const pctNegative = totalEmotions > 0 ? Math.round((negativeEmotions / totalEmotions) * 100) : 0
    const totalIncidents = data.incidents.length
    const openIncidents = data.incidents.filter(i => !i.resolved).length
    const totalAlerts = data.alerts.length
    const openAlerts = data.alerts.filter(a => !a.resolved).length

    const yResumen = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Resumen de bienestar y seguimiento", 14, yResumen)

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
        margin: { left: 14, right: 14 },
    })

    // Registros emocionales
    const y1 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Registros emocionales recientes", 14, y1)

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
        margin: { left: 14, right: 14 },
    })

    // DEC
    const y2 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Registros DEC", 14, y2)

    const SEVERITY_LABEL: Record<string, string> = {
        leve: "Leve", grave: "Grave", muy_grave: "Muy grave",
    }

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
        margin: { left: 14, right: 14 },
    })

    // PAEC
    const y3 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Alertas generadas", 14, y3)

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
        margin: { left: 14, right: 14 },
    })

    // Footer
    const pageCount = (doc as any).getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
            `Nitiv — Documento confidencial — Página ${i} de ${pageCount}`,
            14, doc.internal.pageSize.height - 10
        )
    }

    doc.save(`ficha_${data.student.last_name}_${data.student.name}.pdf`)
}

// ── Reporte clima del curso ──
export function generateClimatePDF(data: {
    courseName: string
    weeks: { semana: string; promedio: number | null; registros: number }[]
    students: { name: string; hasPaec: boolean; alertCount: number; incidentCount: number; lastEmotion: string }[]
}) {
    const doc = new jsPDF()
    const today = new Date().toLocaleDateString("es-CL")

    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Nitiv — Reporte de Clima del Curso", 14, 20)

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(120)
    doc.text(`Curso: ${data.courseName} — Generado el ${today}`, 14, 27)

    doc.setTextColor(0)
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Tendencia de energía — últimas 4 semanas", 14, 40)

    const SCORE_LABEL: Record<number, string> = {
        4: "Regulada", 3: "Inquieta", 2: "Apática", 1: "Explosiva",
    }

    autoTable(doc, {
        startY: 44,
        head: [["Semana", "Promedio", "Clima predominante", "Registros"]],
        body: data.weeks.map(w => [
            w.semana,
            w.promedio !== null ? `${w.promedio}/4` : "Sin datos",
            w.promedio !== null ? (SCORE_LABEL[Math.round(w.promedio)] ?? "—") : "—",
            w.registros.toString(),
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: 14, right: 14 },
    })

    const y1 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Seguimiento de estudiantes (PAEC, alertas, DEC)", 14, y1)

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
        margin: { left: 14, right: 14 },
    })

    const pageCount = (doc as any).getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
            `Nitiv — Documento confidencial — Página ${i} de ${pageCount}`,
            14, doc.internal.pageSize.height - 10
        )
    }

    doc.save(`clima_${data.courseName.replace(/\s/g, "_")}.pdf`)
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
}) {
    const doc = new jsPDF()
    const today = new Date().toLocaleDateString("es-CL")

    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Nitiv — Reporte Institucional", 14, 20)

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(120)
    doc.text(`${data.institutionName} — Generado el ${today}`, 14, 27)

    doc.setTextColor(0)
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Resumen general", 14, 40)

    autoTable(doc, {
        startY: 44,
        head: [["Indicador", "Valor"]],
        body: [
            ["Total estudiantes activos", data.totalStudents.toString()],
            ["Alertas sin resolver", data.totalAlerts.toString()],
            ["DEC pendientes", data.totalIncidents.toString()],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: 14, right: 14 },
    })

    const y1 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Registros negativos por mes", 14, y1)

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
        margin: { left: 14, right: 14 },
    })

    const y2 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.setFont("helvetica", "bold")
    doc.text("Clima por curso", 14, y2)

    autoTable(doc, {
        startY: y2 + 4,
        head: [["Curso", "Clima predominante", "Registros docentes"]],
        body: data.courses.map(c => [c.courseName, c.label, c.registros.toString()]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 30, 30] },
        margin: { left: 14, right: 14 },
    })

    // Alertas por tipo
    if (data.alertsByType && data.alertsByType.length > 0) {
        const y3 = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(13)
        doc.setFont("helvetica", "bold")
        doc.text("Alertas por tipo", 14, y3)

        autoTable(doc, {
            startY: y3 + 4,
            head: [["Tipo", "Total", "Abiertas"]],
            body: data.alertsByType.map(a => [a.type, a.total.toString(), a.open.toString()]),
            styles: { fontSize: 10 },
            headStyles: { fillColor: [30, 30, 30] },
            margin: { left: 14, right: 14 },
        })
    }

    // DEC por severidad
    if (data.decBySeverity && data.decBySeverity.length > 0) {
        const y4 = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(13)
        doc.setFont("helvetica", "bold")
        doc.text("DEC por severidad", 14, y4)

        autoTable(doc, {
            startY: y4 + 4,
            head: [["Severidad", "Total", "Abiertos"]],
            body: data.decBySeverity.map(d => [d.severity, d.total.toString(), d.open.toString()]),
            styles: { fontSize: 10 },
            headStyles: { fillColor: [30, 30, 30] },
            margin: { left: 14, right: 14 },
        })
    }

    // Cursos en mayor riesgo
    if (data.topRiskCourses && data.topRiskCourses.length > 0) {
        const y5 = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(13)
        doc.setFont("helvetica", "bold")
        doc.text("Cursos en mayor riesgo", 14, y5)

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
            margin: { left: 14, right: 14 },
        })
    }

    const pageCount = (doc as any).getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(
            `Nitiv — Documento confidencial — Página ${i} de ${pageCount}`,
            14, doc.internal.pageSize.height - 10
        )
    }

    doc.save(`reporte_institucional_${today.replace(/\//g, "-")}.pdf`)
}
