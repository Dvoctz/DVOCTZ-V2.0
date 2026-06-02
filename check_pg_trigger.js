import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  // Use anon key? We can't access pg_trigger normally.
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function checkTriggers() {
  const { data, error } = await supabase.from("pg_trigger").select("*").limit(1);
  console.log("data:", data, "error:", error);
}

checkTriggers();
