import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function checkSchema() {
  const { data, error } = await supabase.rpc("get_schema");
  console.log(data, error);
}

checkSchema();
