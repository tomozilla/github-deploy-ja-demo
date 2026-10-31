import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.5/mod.js";

// Read-only: lists the migrations the database says it has applied.
// Verify JWT is OFF (see config.toml); the function checks for the project's publishable key instead.
// A publishable key is public by design, so this is only an entry ticket, NOT real authentication.
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 1, prepare: false });
const PUBLISHABLE_KEYS: string[] = Object.values(
  JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}"),
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type, authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const key = req.headers.get("apikey") ?? "";
  if (!PUBLISHABLE_KEYS.includes(key)) {
    return new Response(JSON.stringify({ error: "missing or wrong key" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const rows = await sql`
    select version, name from supabase_migrations.schema_migrations order by version`;
  return new Response(JSON.stringify({ applied: rows }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
