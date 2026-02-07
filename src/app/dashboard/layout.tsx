export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-[#FDFBF7]">
            {/* Sidebar or Navbar placeholder */}
            {children}
        </div>
    )
}
