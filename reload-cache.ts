import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function reloadCache() {
    const { data, error } = await supabase.rpc('reload_schema', {})
    if (error) {
        // RPC might not exist, alternatively we can try a direct REST call if we had the direct DB connection string
        console.error("RPC error:", error);
    } else {
        console.log("Success:", data);
    }
}

reloadCache();
