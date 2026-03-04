const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
    envFile.split('\n')
        .filter(line => line.includes('='))
        .map(line => {
            const parts = line.split('=');
            const key = parts.shift().trim();
            const val = parts.join('=').trim().replace(/^"|"$/g, '');
            return [key, val];
        })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { data, error } = await supabase
        .from("activity_evaluations")
        .select('id, rating, feedback, created_at, session_id, users (id, name, last_name)');

    if (error) {
        console.error("ERROR JSON:", JSON.stringify(error, null, 2));
    } else {
        console.log("SUCCESS:", JSON.stringify(data, null, 2));
    }
}
test();
