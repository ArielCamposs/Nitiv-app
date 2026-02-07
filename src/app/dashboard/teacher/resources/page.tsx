import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Lightbulb, ArrowLeft, FileText, BookMarked, Wrench, HelpCircle } from 'lucide-react'
import TeacherBottomNav from '@/components/TeacherBottomNav'
import Link from 'next/link'

export default async function ResourcesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch resources
    const { data: resources } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false })

    // Group by category
    const protocols = resources?.filter(r => r.category === 'protocol') || []
    const guides = resources?.filter(r => r.category === 'guide') || []
    const advice = resources?.filter(r => r.category === 'advice') || []
    const tools = resources?.filter(r => r.category === 'tool') || []
    const other = resources?.filter(r => r.category === 'other') || []

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'protocol': return FileText
            case 'guide': return BookMarked
            case 'advice': return Lightbulb
            case 'tool': return Wrench
            default: return HelpCircle
        }
    }

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'protocol': return 'from-blue-400 to-blue-600'
            case 'guide': return 'from-green-400 to-green-600'
            case 'advice': return 'from-yellow-400 to-yellow-600'
            case 'tool': return 'from-purple-400 to-purple-600'
            default: return 'from-gray-400 to-gray-600'
        }
    }

    const renderResourceSection = (title: string, items: any[], category: string) => {
        if (items.length === 0) return null

        const Icon = getCategoryIcon(category)
        const colorClass = getCategoryColor(category)

        return (
            <section key={category}>
                <h2 className="font-bold text-[#475569] mb-3 text-lg flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                        <Icon size={16} className="text-white" />
                    </div>
                    {title} ({items.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                    {items.map((resource) => (
                        <div key={resource.id} className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100">
                            <h3 className="font-bold text-[#475569] mb-2">{resource.title}</h3>
                            {resource.description && (
                                <p className="text-sm text-gray-600 mb-3">{resource.description}</p>
                            )}
                            {resource.content && (
                                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                                        {resource.content}
                                    </p>
                                </div>
                            )}
                            {resource.file_url && (
                                <a
                                    href={resource.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                                >
                                    Ver archivo →
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        )
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-32 pb-24 md:pb-6">
            <TeacherBottomNav />

            {/* Header */}
            <header className="p-6 bg-gradient-to-br from-white to-[#F8F9FA] shadow-sm mb-6 border-b-2 border-gray-200">
                <Link href="/dashboard/teacher" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3">
                    <ArrowLeft size={16} />
                    Volver al inicio
                </Link>
                <h1 className="text-2xl font-bold text-[#475569] flex items-center gap-2">
                    <Lightbulb className="text-yellow-500" />
                    Recursos para Docentes
                </h1>
                <p className="text-[#64748B]">Protocolos, guías, consejos y herramientas para tu trabajo</p>
            </header>

            <main className="px-6 space-y-8">
                {renderResourceSection('Protocolos', protocols, 'protocol')}
                {renderResourceSection('Guías', guides, 'guide')}
                {renderResourceSection('Consejos', advice, 'advice')}
                {renderResourceSection('Herramientas', tools, 'tool')}
                {renderResourceSection('Otros Recursos', other, 'other')}

                {/* Empty State */}
                {(!resources || resources.length === 0) && (
                    <div className="bg-white rounded-2xl p-12 text-center">
                        <Lightbulb size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="font-medium text-gray-500">No hay recursos disponibles</p>
                        <p className="text-sm text-gray-400 mt-1">Los recursos para docentes aparecerán aquí cuando sean agregados</p>
                    </div>
                )}
            </main>
        </div>
    )
}
