export type UserRole =
    | 'admin'
    | 'director'
    | 'inspector'
    | 'utp'
    | 'convivencia'
    | 'dupla'
    | 'docente'
    | 'estudiante'
    | 'centro_alumnos'

export type InstitutionPlan = 'demo' | 'basic' | 'pro'

export type EmotionType = 'muy_bien' | 'bien' | 'neutral' | 'mal' | 'muy_mal'

export type EnergyLevel = 'explosiva' | 'inquieta' | 'regulada' | 'apatica'

export type IncidentSeverity = 'moderada' | 'severa'

export type PaecStatus = 'borrador' | 'activo' | 'en_revision' | 'cerrado'

export interface Institution {
    id: string
    name: string
    rbd?: string
    plan: InstitutionPlan
    active: boolean
}

export interface User {
    id: string
    institution_id: string
    role: UserRole
    name: string
    last_name?: string
    email: string
    avatar_url?: string
    active: boolean
}

export interface Student {
    id: string
    institution_id: string
    user_id?: string
    course_id?: string
    name: string
    last_name: string
    rut?: string
    active: boolean
}

export interface Course {
    id: string
    institution_id: string
    name: string
    level: string
    section?: string
    year: number
}
