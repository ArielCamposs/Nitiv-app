import { ConvivenciaSELClient } from "@/components/convivencia-sel/ConvivenciaSELClient"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function ConvivenciaSELPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect("/login")

    return <ConvivenciaSELClient homeHref="/convivencia" />
}
