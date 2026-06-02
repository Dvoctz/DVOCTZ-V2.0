import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function checkRpc() {
  const { data, error } = await supabase.rpc("exec_sql", { sql: "SELECT trigger_name, event_object_table FROM information_schema.triggers" });
  console.log("exec_sql:", data, error);
}

checkRpc();
