export type Database = {
    public: {
        Tables: {
            institutions: {
                Row: {
                    id: string
                    name: string
                    slug: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    slug: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    slug?: string
                    created_at?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    institution_id: string | null
                    role: 'student' | 'teacher' | 'professional' | 'admin' | 'superadmin'
                    full_name: string | null
                    avatar_url: string | null
                    metadata: Record<string, any> | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    institution_id?: string | null
                    role?: 'student' | 'teacher' | 'professional' | 'admin' | 'superadmin'
                    full_name?: string | null
                    avatar_url?: string | null
                    metadata?: Record<string, any> | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    institution_id?: string | null
                    role?: 'student' | 'teacher' | 'professional' | 'admin' | 'superadmin'
                    full_name?: string | null
                    avatar_url?: string | null
                    metadata?: Record<string, any> | null
                    created_at?: string
                    updated_at?: string
                }
            }
            mood_logs: {
                Row: {
                    id: string
                    student_id: string
                    institution_id: string
                    score: number
                    tags: string[] | null
                    note: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    student_id: string
                    institution_id: string
                    score: number
                    tags?: string[] | null
                    note?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    student_id?: string
                    institution_id?: string
                    score?: number
                    tags?: string[] | null
                    note?: string | null
                    created_at?: string
                }
            }
            courses: {
                Row: {
                    id: string
                    name: string
                    grade: string | null
                    slug: string | null
                }
            }
            alerts: {
                Row: {
                    id: string
                    student_id: string
                    type: 'mood' | 'academic' | 'attendance'
                    priority: 'low' | 'medium' | 'high'
                    message: string | null
                    is_read: boolean
                    created_at: string
                }
            }
            cases: {
                Row: {
                    id: string
                    student_id: string
                    title: string | null
                    status: string
                    summary: string | null
                    created_at: string
                }
            }
            missions: {
                Row: {
                    id: string
                    title: string
                    description: string | null
                    points_reward: number
                    icon: string | null
                }
            }
            student_missions: {
                Row: {
                    id: string
                    student_id: string
                    mission_id: string
                    status: 'pending' | 'completed'
                    completed_at: string | null
                }
            }
        }
    }
}
