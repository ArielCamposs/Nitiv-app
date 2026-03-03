import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkColors() {
    const { data, error } = await supabase
        .from("activities")
        .select("id, title, title_color, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

    if (error) {
        console.error("Relation error:", error);
    } else {
        console.log("Success:\n", JSON.stringify(data, null, 2));
    }
}

checkColors();
