import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRelations() {
    const { data, error } = await supabase
        .from("activities")
        .select("id, title, created_by, users:created_by(id, name, last_name, role)")
        .order("created_at", { ascending: false })
        .limit(3);

    if (error) {
        console.error("Relation error:", error);
    } else {
        console.log("Success:\n", JSON.stringify(data, null, 2));
    }
}

checkRelations();
