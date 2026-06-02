import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function checkTriggers() {
  const { data, error } = await supabase.rpc("rpc_name") // I don't know the rpc to run arbitrary SQL unfortunately using anon key...
}
