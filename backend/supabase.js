// Simple Supabase client initialization
// Uses exactly the env vars the user specified:
//   SUPABASE_PROJECT_URL  -> project base URL (e.g. https://xxxx.supabase.co)
//   SUPABASE_SERVICE_KEY  -> anon or service key (JWT)
// Note: Do NOT expose SUPABASE_SERVICE_KEY to frontend code.

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_PROJECT_URL; // explicit per user request
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // may currently hold anon key

if (!supabaseUrl) {
  throw new Error("SUPABASE_PROJECT_URL env var is required");
}
if (!supabaseKey) {
  throw new Error("SUPABASE_SERVICE_KEY env var is required");
}

const supabase = createClient(supabaseUrl, supabaseKey);
module.exports = supabase;
