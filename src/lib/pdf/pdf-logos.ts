import type jsPDF from "jspdf"

const LOGO_HEADER_H = 14
// Logo del colegio: tamaño reducido para que no se vea pixelado (ancho y alto en mm)
const INSTITUTION_LOGO_W = 12
const INSTITUTION_LOGO_H = 4
const NITIV_LOGO_W = 28
const NITIV_LOGO_H = 10

/**
 * Añade en todos los PDFs la cabecera con logo del colegio (izq) y logo Nitiv (dcha).
 * data URL en base64 (data:image/png;base64,...). Devuelve la posición y donde seguir escribiendo.
 * El logo del colegio se dibuja más pequeño para que no se vea pixelado.
 */
export function addPdfLogoHeader(
    doc: jsPDF,
    margin: number,
    pageWidth: number,
    institutionLogoBase64: string | null,
    nitivLogoBase64: string | null
): number {
    let y = margin
    const halfW = (pageWidth - margin * 2) / 2

    try {
        if (institutionLogoBase64) {
            const w = Math.min(INSTITUTION_LOGO_W, halfW - 4)
            doc.addImage(institutionLogoBase64, "PNG", margin, y, w, INSTITUTION_LOGO_H)
        }
    } catch {
        // Si falla (ej. formato no soportado), se omite
    }
    try {
        if (nitivLogoBase64) {
            const nw = Math.min(NITIV_LOGO_W, halfW - 4)
            doc.addImage(nitivLogoBase64, "PNG", pageWidth - margin - nw, y, nw, NITIV_LOGO_H)
        }
    } catch {
        // Si falla, se omite
    }

    return y + LOGO_HEADER_H
}
