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
    addSectionHeader("Descripción del Evento")
    addParagraph(record.description || "Sin descripción")

    if (record.actions_taken && record.actions_taken.length > 0) {
        addSectionHeader("Acciones Inmediatas Tomadas")
        record.actions_taken.forEach((action: string) => {
            addParagraph(`• ${action}`)
        })
    }

    if (record.agreements) {
        addSectionHeader("Acuerdos / Resolución")
        addParagraph(record.agreements)
    }

    if (record.resolution_notes) {
        addSectionHeader("Notas de Resolución de Caso")
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
        doc.text(`Generado el ${new Date().toLocaleString("es-CL")} - Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: "center" })
    }

    return doc
}
