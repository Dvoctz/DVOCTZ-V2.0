import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function checkFix() {
  const { data, error } = await supabase.from("fixtures").select("id").limit(1);
  console.log("Fixtures:", data);
}

checkFix();
