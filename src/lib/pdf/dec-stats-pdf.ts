import jsPDF from "jspdf"
import { addPdfLogoHeader } from "./pdf-logos"

export type DecStatsPdfData = {
    decsByType: { name: string; count: number; color: string }[]
    decsBySeverity: { name: string; count: number; color: string }[]
    monthlyTrend: { mes: string; decs: number; cierres: number }[]
    topStudentsByDecs: { studentId: string; studentName: string; courseName: string; count: number }[]
    topCourses: { courseName: string; count: number }[]
    totalPeriodDecs: number
    topConductTypes: { name: string; count: number }[]
    topTriggers: { name: string; count: number }[]
    topActions: { name: string; count: number }[]
}

const BOX_PAD = 4
const TITLE_BAR_H = 9
const LINE_H = 5
const BOX_GAP = 6
const BAR_CHART_LABEL_W = 50
const BAR_CHART_BAR_MAX_W = 80
const BAR_H = 4

/** Cuadro con título en barra (estilo ficha DEC). */
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
    doc.setFontSize(10)
    let totalContentH = 0
    for (const line of content) {
        const wrapped = doc.splitTextToSize(line, innerW)
        totalContentH += wrapped.length * LINE_H
    }
    const boxH = BOX_PAD + TITLE_BAR_H + BOX_PAD + totalContentH + BOX_PAD

    if (y + boxH > pageHeight - margin) {
        doc.addPage()
        y = margin
    }

    const boxLeft = margin
    const boxW = pageWidth - margin * 2
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.rect(boxLeft, y, boxW, boxH)
    doc.setFillColor(241, 245, 249)
    doc.rect(boxLeft, y, boxW, TITLE_BAR_H, "F")
    doc.setDrawColor(200, 200, 200)
    doc.line(boxLeft, y + TITLE_BAR_H, boxLeft + boxW, y + TITLE_BAR_H)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.text(title, boxLeft + BOX_PAD, y + 6)

    let textY = y + BOX_PAD + TITLE_BAR_H + BOX_PAD
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    for (const line of content) {
        const wrapped = doc.splitTextToSize(line, innerW)
        doc.text(wrapped, margin + BOX_PAD, textY)
        textY += wrapped.length * LINE_H
    }

    return y + boxH + BOX_GAP
}

/** Dibuja un cuadro con gráfico de barras horizontales (etiqueta + barra proporcional). */
function addBoxedBarChart(
    doc: jsPDF,
    y: number,
    margin: number,
    pageHeight: number,
    pageWidth: number,
    title: string,
    items: { name: string; count: number }[],
    maxCount: number
): number {
    const rowH = BAR_H + 3
    const chartContentH = items.length * rowH + 4
    const boxH = BOX_PAD + TITLE_BAR_H + BOX_PAD + chartContentH + BOX_PAD

    if (y + boxH > pageHeight - margin) {
        doc.addPage()
        y = margin
    }

    const boxLeft = margin
    const boxW = pageWidth - margin * 2
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.rect(boxLeft, y, boxW, boxH)
    doc.setFillColor(241, 245, 249)
    doc.rect(boxLeft, y, boxW, TITLE_BAR_H, "F")
    doc.setDrawColor(200, 200, 200)
    doc.line(boxLeft, y + TITLE_BAR_H, boxLeft + boxW, y + TITLE_BAR_H)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.text(title, boxLeft + BOX_PAD, y + 6)

    let barY = y + BOX_PAD + TITLE_BAR_H + BOX_PAD + 2
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)

    for (const item of items) {
        const label = doc.splitTextToSize(item.name, BAR_CHART_LABEL_W - 2)[0] || item.name.slice(0, 12)
        doc.text(label, margin + BOX_PAD, barY + BAR_H - 1)
        const barW = maxCount > 0 ? (item.count / maxCount) * BAR_CHART_BAR_MAX_W : 0
        if (barW > 0) {
            doc.setFillColor(120, 120, 120)
            doc.rect(margin + BOX_PAD + BAR_CHART_LABEL_W, barY, barW, BAR_H, "F")
        }
        doc.setTextColor(40, 40, 40)
        doc.text(String(item.count), margin + BOX_PAD + BAR_CHART_LABEL_W + BAR_CHART_BAR_MAX_W + 4, barY + BAR_H - 1)
        doc.setTextColor(60, 60, 60)
        barY += rowH
    }

    return y + boxH + BOX_GAP
}

/** Dibuja dos cuadros de barras horizontales uno al lado del otro (misma altura). */
function addTwoBoxedBarChartsSideBySide(
    doc: jsPDF,
    y: number,
    margin: number,
    pageHeight: number,
    pageWidth: number,
    title1: string,
    items1: { name: string; count: number }[],
    maxCount1: number,
    title2: string,
    items2: { name: string; count: number }[],
    maxCount2: number
): number {
    const gap = 6
    const halfW = (pageWidth - margin * 2 - gap) / 2
    const rowH = BAR_H + 3
    const contentH1 = items1.length * rowH + 4
    const contentH2 = items2.length * rowH + 4
    const boxH = BOX_PAD + TITLE_BAR_H + BOX_PAD + Math.max(contentH1, contentH2) + BOX_PAD

    if (y + boxH > pageHeight - margin) {
        doc.addPage()
        y = margin
    }

    const labelW = Math.min(BAR_CHART_LABEL_W, halfW - BOX_PAD * 2 - 20)
    const barMaxW = halfW - BOX_PAD * 2 - labelW - 12

    for (const [col, { title, items, maxCount }] of [
        [0, { title: title1, items: items1, maxCount: maxCount1 }],
        [1, { title: title2, items: items2, maxCount: maxCount2 }],
    ] as const) {
        const boxLeft = margin + col * (halfW + gap)
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.3)
        doc.rect(boxLeft, y, halfW, boxH)
        doc.setFillColor(241, 245, 249)
        doc.rect(boxLeft, y, halfW, TITLE_BAR_H, "F")
        doc.setDrawColor(200, 200, 200)
        doc.line(boxLeft, y + TITLE_BAR_H, boxLeft + halfW, y + TITLE_BAR_H)

        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(30, 30, 30)
        doc.text(title, boxLeft + BOX_PAD, y + 6)

        let barY = y + BOX_PAD + TITLE_BAR_H + BOX_PAD + 2
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(60, 60, 60)
        for (const item of items) {
            const label = doc.splitTextToSize(item.name, labelW - 2)[0] || item.name.slice(0, 10)
            doc.text(label, boxLeft + BOX_PAD, barY + BAR_H - 1)
            const barW = maxCount > 0 ? (item.count / maxCount) * barMaxW : 0
            if (barW > 0) {
                doc.setFillColor(120, 120, 120)
                doc.rect(boxLeft + BOX_PAD + labelW, barY, barW, BAR_H, "F")
            }
            doc.setTextColor(40, 40, 40)
            doc.text(String(item.count), boxLeft + BOX_PAD + labelW + barMaxW + 4, barY + BAR_H - 1)
            doc.setTextColor(60, 60, 60)
            barY += rowH
        }
    }

    return y + boxH + BOX_GAP
}

/** Dibuja un cuadro con gráfico de barras verticales (tendencia mensual) y escala numérica a la izquierda. */
function addBoxedVerticalBarChart(
    doc: jsPDF,
    y: number,
    margin: number,
    pageHeight: number,
    pageWidth: number,
    title: string,
    data: { mes: string; decs: number; cierres: number }[],
    maxVal: number
): number {
    const axisLabelW = 8
    const chartW = pageWidth - margin * 2 - BOX_PAD * 2 - axisLabelW
    const barAreaH = 45
    const labelAreaH = 10
    const boxH = BOX_PAD + TITLE_BAR_H + BOX_PAD + barAreaH + labelAreaH + BOX_PAD

    if (y + boxH > pageHeight - margin) {
        doc.addPage()
        y = margin
    }

    const boxLeft = margin
    const boxW = pageWidth - margin * 2
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.rect(boxLeft, y, boxW, boxH)
    doc.setFillColor(241, 245, 249)
    doc.rect(boxLeft, y, boxW, TITLE_BAR_H, "F")
    doc.setDrawColor(200, 200, 200)
    doc.line(boxLeft, y + TITLE_BAR_H, boxLeft + boxW, y + TITLE_BAR_H)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.text(title, boxLeft + BOX_PAD, y + 6)

    const chartLeft = margin + BOX_PAD + axisLabelW
    const chartBottom = y + BOX_PAD + TITLE_BAR_H + barAreaH
    const n = data.length
    const barGap = 1
    const totalBarW = chartW - (n - 1) * barGap
    const barW = n > 0 ? totalBarW / n - barGap : 0

    doc.setFont("helvetica", "normal")
    doc.setFontSize(6)
    doc.setTextColor(60, 60, 60)

    // Eje Y: números a la izquierda (0, maxVal y opcionalmente valor intermedio)
    const axisLeft = margin + BOX_PAD
    doc.text("0", axisLeft, chartBottom + 1)
    if (maxVal > 0) {
        doc.text(String(maxVal), axisLeft, y + BOX_PAD + TITLE_BAR_H + 2)
        if (maxVal >= 2) {
            const mid = Math.floor(maxVal / 2)
            const midY = chartBottom - (mid / maxVal) * (barAreaH - 2) + 1
            doc.text(String(mid), axisLeft, midY)
        }
    }

    for (let i = 0; i < n; i++) {
        const d = data[i]
        const x = chartLeft + i * (barW + barGap)
        const decH = maxVal > 0 ? (d.decs / maxVal) * (barAreaH - 2) : 0
        const cierreH = maxVal > 0 ? (d.cierres / maxVal) * (barAreaH - 2) : 0
        if (decH > 0) {
            doc.setFillColor(80, 80, 80)
            doc.rect(x, chartBottom - decH, barW / 2, decH, "F")
            doc.setTextColor(40, 40, 40)
            doc.text(String(d.decs), x + barW / 4 - 1, chartBottom - decH - 1)
            doc.setTextColor(60, 60, 60)
        }
        if (cierreH > 0) {
            doc.setFillColor(150, 150, 150)
            doc.rect(x + barW / 2, chartBottom - cierreH, barW / 2, cierreH, "F")
            doc.setTextColor(40, 40, 40)
            doc.text(String(d.cierres), x + (barW * 3) / 4 - 1, chartBottom - cierreH - 1)
            doc.setTextColor(60, 60, 60)
        }
        const mesLabel = d.mes.length > 3 ? d.mes.slice(0, 3) : d.mes
        doc.text(mesLabel, x + barW / 2 - 2, chartBottom + 5)
    }

    return y + boxH + BOX_GAP
}

export function buildDecStatsPdf(
    data: DecStatsPdfData,
    institutionName: string,
    institutionLogoBase64: string | null,
    nitivLogoBase64: string | null
): jsPDF {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const margin = 18
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let y = margin

    y = addPdfLogoHeader(doc, margin, pageWidth, institutionLogoBase64, nitivLogoBase64)

    const year = new Date().getFullYear()
    y = addBoxedSection(doc, y, margin, pageHeight, pageWidth, "Estadísticas DEC", [
        `Institución: ${institutionName}`,
        `Período: Año ${year}`,
        `Total de casos DEC en el período: ${data.totalPeriodDecs}`,
    ])

    const coursesItems = data.topCourses.length > 0
        ? data.topCourses.map((c) => ({ name: c.courseName, count: c.count }))
        : [{ name: "Sin datos en el período.", count: 0 }]
    const severityItems = data.decsBySeverity.filter((d) => d.count > 0).map((d) => ({ name: d.name, count: d.count }))
    const severityForPdf = severityItems.length > 0 ? severityItems : [{ name: "Sin casos en el período.", count: 0 }]
    const maxCourse = Math.max(...coursesItems.map((c) => c.count), 1)
    const maxSev = Math.max(...severityForPdf.map((d) => d.count), 1)
    y = addTwoBoxedBarChartsSideBySide(
        doc,
        y,
        margin,
        pageHeight,
        pageWidth,
        "Cursos con más incidentes DEC",
        coursesItems,
        maxCourse,
        "DECs por severidad",
        severityForPdf,
        maxSev
    )

    const maxTag = Math.max(
        ...data.topConductTypes.map((t) => t.count),
        ...data.topTriggers.map((t) => t.count),
        ...data.topActions.map((t) => t.count),
        1
    )
    if (data.topConductTypes.length > 0) {
        y = addBoxedBarChart(doc, y, margin, pageHeight, pageWidth, "Conductas observadas más registradas", data.topConductTypes, maxTag)
    }
    if (data.topTriggers.length > 0) {
        y = addBoxedBarChart(doc, y, margin, pageHeight, pageWidth, "Situaciones desencadenantes más registradas", data.topTriggers, maxTag)
    }
    if (data.topActions.length > 0) {
        y = addBoxedBarChart(doc, y, margin, pageHeight, pageWidth, "Acciones realizadas más registradas", data.topActions, maxTag)
    }

    const trendMax = Math.max(...data.monthlyTrend.map((m) => Math.max(m.decs, m.cierres)), 1)
    y = addBoxedVerticalBarChart(doc, y, margin, pageHeight, pageWidth, "Tendencia de casos DEC (mensual)", data.monthlyTrend, trendMax)

    const studentsLines: string[] = []
    if (data.topStudentsByDecs.length === 0) {
        studentsLines.push("Sin registros en el período.")
    } else {
        for (const s of data.topStudentsByDecs) {
            studentsLines.push(`${s.studentName} — ${s.courseName} · ${s.count} DEC${s.count !== 1 ? "s" : ""}`)
        }
    }
    y = addBoxedSection(doc, y, margin, pageHeight, pageWidth, "Estudiantes con más DEC", studentsLines)

    return doc
}
