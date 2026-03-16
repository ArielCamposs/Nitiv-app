/**
 * Convierte una URL de imagen (PNG, JPEG o SVG) a data URL PNG base64 para usar en jsPDF.
 * Si se pasa maxWidthPx, se redimensiona manteniendo proporción y con suavizado para evitar pixelación.
 */
export async function loadImageAsPngBase64(url: string, maxWidthPx?: number): Promise<string | null> {
    try {
        const res = await fetch(url, { mode: "cors" })
        const blob = await res.blob()
        return new Promise((resolve) => {
            const img = new Image()
            const blobUrl = URL.createObjectURL(blob)
            img.onload = () => {
                try {
                    let w = img.naturalWidth
                    let h = img.naturalHeight
                    if (maxWidthPx != null && w > maxWidthPx) {
                        h = Math.round((h * maxWidthPx) / w)
                        w = maxWidthPx
                    }
                    const canvas = document.createElement("canvas")
                    canvas.width = w
                    canvas.height = h
                    const ctx = canvas.getContext("2d")
                    if (!ctx) {
                        URL.revokeObjectURL(blobUrl)
                        resolve(null)
                        return
                    }
                    ctx.imageSmoothingEnabled = true
                    ctx.imageSmoothingQuality = "high"
                    ctx.drawImage(img, 0, 0, w, h)
                    resolve(canvas.toDataURL("image/png"))
                } catch {
                    resolve(null)
                } finally {
                    URL.revokeObjectURL(blobUrl)
                }
            }
            img.onerror = () => {
                URL.revokeObjectURL(blobUrl)
                resolve(null)
            }
            img.crossOrigin = "anonymous"
            img.src = blobUrl
        })
    } catch {
        return null
    }
}

/** Máximo ancho en píxeles para el logo del colegio en PDF (evita imágenes gigantes y mejora nitidez). */
const INSTITUTION_LOGO_MAX_WIDTH_PX = 80

/**
 * Carga el logo de la institución optimizado para cabecera de PDF (tamaño controlado y suavizado).
 */
export async function loadInstitutionLogoForPdf(url: string): Promise<string | null> {
    return loadImageAsPngBase64(url, INSTITUTION_LOGO_MAX_WIDTH_PX)
}

/** Logo Nitiv en PDFs: 3 ft. Fallback a otros si no está disponible. */
const NITIV_LOGO_PATHS = ["/3 ft.svg", "/logo.svg"]

/** Carga el logo de Nitiv desde la ruta pública. */
export async function loadNitivLogoBase64(): Promise<string | null> {
    for (const path of NITIV_LOGO_PATHS) {
        try {
            const data = await loadImageAsPngBase64(path)
            if (data) return data
        } catch {
            continue
        }
    }
    return null
}
