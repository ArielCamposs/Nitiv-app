/** Persiste cierres recientes para alinear la bandeja si la caché de RSC aún trae datos viejos. */
export const CASE_STATUS_PENDING_KEY = "nitiv:case-status-pending"

export function readPendingCaseStatuses(): Record<string, string> {
    if (typeof window === "undefined") return {}
    try {
        return JSON.parse(sessionStorage.getItem(CASE_STATUS_PENDING_KEY) || "{}") as Record<string, string>
    } catch {
        return {}
    }
}

export function rememberPendingCaseStatus(caseId: string, status: string) {
    try {
        const m = readPendingCaseStatuses()
        m[caseId] = status
        sessionStorage.setItem(CASE_STATUS_PENDING_KEY, JSON.stringify(m))
    } catch {
        /* ignore */
    }
}
