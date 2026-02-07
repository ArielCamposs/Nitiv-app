'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AdminBottomNav from '@/components/AdminBottomNav'
import { Users, GraduationCap, UserCheck, Search, Plus, Loader2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { getAllUsers, getUsersByRole, deleteUser } from './actions'

interface User {
    id: string
    full_name: string
    email: string
    role: string
    created_at: string
}

function UsersContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const activeTab = searchParams.get('tab') || 'all'

    useEffect(() => {
        loadUsers()
    }, [activeTab])

    const loadUsers = async () => {
        setLoading(true)
        try {
            let usersData
            if (activeTab === 'all') {
                usersData = await getAllUsers()
            } else if (activeTab === 'students') {
                usersData = await getUsersByRole('student')
            } else if (activeTab === 'teachers') {
                usersData = await getUsersByRole('teacher')
            } else if (activeTab === 'professionals') {
                usersData = await getUsersByRole('professional')
            }
            setUsers(usersData?.users || [])
        } catch (error) {
            console.error('Error loading users:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (userId: string) => {
        setDeleting(true)
        const result = await deleteUser(userId)

        if (result.error) {
            alert('Error al eliminar usuario: ' + result.error)
        } else {
            await loadUsers()
        }

        setDeleting(false)
        setDeleteConfirm(null)
    }

    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const tabs = [
        { id: 'all', label: 'Todos', icon: Users },
        { id: 'students', label: 'Estudiantes', icon: GraduationCap },
        { id: 'teachers', label: 'Profesores', icon: Users },
        { id: 'professionals', label: 'Psicólogos', icon: UserCheck },
    ]

    const getRoleBadge = (role: string) => {
        const badges = {
            student: 'bg-blue-100 text-blue-800',
            teacher: 'bg-green-100 text-green-800',
            professional: 'bg-purple-100 text-purple-800',
            admin: 'bg-red-100 text-red-800',
            superadmin: 'bg-gray-100 text-gray-800'
        }
        return badges[role as keyof typeof badges] || 'bg-gray-100 text-gray-800'
    }

    const getRoleLabel = (role: string) => {
        const labels = {
            student: 'Estudiante',
            teacher: 'Profesor',
            professional: 'Psicólogo',
            admin: 'Administrador',
            superadmin: 'Super Admin'
        }
        return labels[role as keyof typeof labels] || role
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6">
            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <Trash2 className="text-red-600" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Confirmar Eliminación</h3>
                                <p className="text-gray-600 text-sm">Esta acción no se puede deshacer</p>
                            </div>
                        </div>
                        <p className="text-gray-700 mb-6">
                            ¿Estás seguro de que deseas eliminar este usuario? Se eliminarán todos sus datos asociados.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                disabled={deleting}
                                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {deleting ? 'Eliminando...' : 'Eliminar'}
                            </button>
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                disabled={deleting}
                                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-[#475569] mb-2">Gestión de Usuarios</h1>
                        <p className="text-gray-600">Administra usuarios, roles y permisos</p>
                    </div>
                    <Link
                        href="/dashboard/admin/users/create"
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        <Plus size={20} />
                        Crear Usuario
                    </Link>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl p-2 shadow-md border-2 border-gray-100 mb-6">
                    <div className="flex gap-2 overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <Link
                                    key={tab.id}
                                    href={`/dashboard/admin/users?tab=${tab.id}`}
                                    className={`
                                        flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 whitespace-nowrap
                                        ${isActive
                                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }
                                    `}
                                >
                                    <Icon size={20} />
                                    {tab.label}
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-2xl p-4 shadow-md border-2 border-gray-100 mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={searchTerm}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-2xl shadow-md border-2 border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="animate-spin text-blue-500" size={40} />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b-2 border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nombre</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Rol</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Fecha Creación</th>
                                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                                No se encontraron usuarios
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900">{user.full_name || 'Sin nombre'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">{user.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadge(user.role)}`}>
                                                        {getRoleLabel(user.role)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {new Date(user.created_at).toLocaleDateString('es-ES')}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Link
                                                            href={`/dashboard/admin/users/${user.id}/edit`}
                                                            className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-semibold"
                                                        >
                                                            Editar
                                                        </Link>
                                                        <button
                                                            onClick={() => setDeleteConfirm(user.id)}
                                                            className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-semibold"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Summary */}
                {!loading && (
                    <div className="mt-6 text-center text-gray-600">
                        Mostrando {filteredUsers.length} de {users.length} usuarios
                    </div>
                )}
            </div>

            <AdminBottomNav />
        </div>
    )
}

export default function UsersPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#FDFBF7] md:pl-64 pb-24 md:pb-6 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        }>
            <UsersContent />
        </Suspense>
    )
}
