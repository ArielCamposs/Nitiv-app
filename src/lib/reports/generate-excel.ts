import * as XLSX from "xlsx"

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

// ── Excel registros emocionales ──
export function generateEmotionsExcel(data: {
    courseName: string
    rows: {
        studentName: string
        date: string
        emotion: string
        intensity: number
        stress: number | null
        anxiety: number | null
        reflection: string | null
    }[]
}) {
    const EMOTION_LABEL: Record<string, string> = {
        muy_bien: "Muy bien", bien: "Bien", neutral: "Neutral",
        mal: "Mal", muy_mal: "Muy mal",
    }

    const ws = XLSX.utils.json_to_sheet(
        data.rows.map(r => ({
            "Estudiante": r.studentName,
            "Fecha": new Date(r.date).toLocaleDateString("es-CL"),
            "Emoción": EMOTION_LABEL[r.emotion] ?? r.emotion,
            "Intensidad": `${r.intensity}/5`,
            "Estrés": r.stress != null ? `${r.stress}/5` : "—",
            "Ansiedad": r.anxiety != null ? `${r.anxiety}/5` : "—",
            "Reflexión": r.reflection ?? "—",
        }))
    )

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Registros emocionales")
    XLSX.writeFile(wb, `emociones_${data.courseName.replace(/\s/g, "_")}.xlsx`)
}

// ── Excel DEC pendientes y resueltos ──
export function generateIncidentsExcel(data: {
    rows: {
        folio: string | null
        studentName: string
        courseName: string
        type: string
        severity: string
        date: string
        resolved: boolean
        reporterName: string
    }[]
}) {
    const SEVERITY_LABEL: Record<string, string> = {
        moderada: "Moderada", severa: "Severa",
        leve: "Leve", grave: "Grave", muy_grave: "Muy grave",
    }

    const ws = XLSX.utils.json_to_sheet(
        data.rows.map(r => ({
            "Folio": r.folio ?? "—",
            "Estudiante": r.studentName,
            "Curso": r.courseName,
            "Tipo": r.type,
            "Severidad": SEVERITY_LABEL[r.severity] ?? r.severity,
            "Fecha": new Date(r.date).toLocaleDateString("es-CL"),
            "Estado": r.resolved ? "Resuelto" : "Pendiente",
            "Reportado por": r.reporterName,
        }))
    )

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Casos DEC")
    const year = new Date().getFullYear()
    const dateStr = new Date().toLocaleDateString("es-CL").replace(/\//g, "-")
    XLSX.writeFile(wb, `Casos_DEC_${year}_${dateStr}.xlsx`)
}

// ── Excel estudiantes en alerta ──
export function generateAlertsExcel(data: {
    rows: {
        studentName: string
        courseName: string
        alertType: string
        description: string | null
        date: string
        resolved: boolean
    }[]
}) {
    const ws = XLSX.utils.json_to_sheet(
        data.rows.map(r => ({
            "Estudiante": r.studentName,
            "Curso": r.courseName,
            "Tipo alerta": r.alertType,
            "Descripción": r.description ?? "—",
            "Fecha": new Date(r.date).toLocaleDateString("es-CL"),
            "Estado": r.resolved ? "Resuelta" : "Pendiente",
        }))
    )

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Alertas")
    const year = new Date().getFullYear()
    const dateStr = new Date().toLocaleDateString("es-CL").replace(/\//g, "-")
    XLSX.writeFile(wb, `Alertas_estudiantes_${year}_${dateStr}.xlsx`)
}
