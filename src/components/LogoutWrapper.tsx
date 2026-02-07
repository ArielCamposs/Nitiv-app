'use client'

import { useRouter } from 'next/navigation'
import UserMenu from './UserMenu'

interface LogoutWrapperProps {
    userName: string
    userRole: string
}

export default function LogoutWrapper({ userName, userRole }: LogoutWrapperProps) {
    const router = useRouter()

    const handleLogout = async () => {
        const response = await fetch('/api/auth/logout', { method: 'POST' })
        if (response.ok) {
            router.push('/login')
            router.refresh()
        }
    }

    return <UserMenu userName={userName} userRole={userRole} onLogout={handleLogout} />
}
