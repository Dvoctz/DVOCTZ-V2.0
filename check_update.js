import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function checkUpdate() {
  const { data, error } = await supabase.from("fixtures").update({
    stage: "quarterfinal",
    officiating_team_id: null,
    best_of: 3
  }).eq("id", 1);
  console.log("UPDATE Error: ", error);
}

checkUpdate();
