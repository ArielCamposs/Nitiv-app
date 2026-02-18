import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="es">
            <body>
                {children}
                <Toaster richColors position="top-right" />
            </body>
        </html>
    )
}
