import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function checkUpdate() {
  const { data, error, count } = await supabase.from("fixtures").update({
    stage: "quarterfinal",
  }).eq("id", 1).select();
  console.log("UPDATE Data: ", data);
  console.log("UPDATE Error: ", error);
}

checkUpdate();
