export function formatTimeAgo(dateString: string | null | undefined): string {
    if (!dateString) return "";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    // If it's a future date or basically now
    if (diffMs < 1000) return "justo ahora";

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
        return "justo ahora";
    }

    if (diffMins < 60) {
        return `hace ${diffMins} min`;
    }

    if (diffHours < 24) {
        return `hace ${diffHours} h`;
    }

    if (diffDays === 1) {
        return "hace un día";
    }

    if (diffDays < 7) {
        return `hace ${diffDays} días`;
    }

    // Default formatting for older dates
    return `hace ${diffDays} días`;
}
