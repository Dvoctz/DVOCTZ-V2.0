import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function checkTriggers() {
  const { data, error } = await supabase.from("information_schema.triggers").select("*");
  console.log("data:", data, "error:", error);
}

checkTriggers();
