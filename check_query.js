import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function checkQuery() {
  const { data, error } = await supabase
    .from("fixtures")
    .select("*, tournaments(name, division, phase), team1:teams!team1_id(name), team2:teams!team2_id(name), winner:teams!winner_team_id(name), players(name), officiating_team:teams!officiating_team_id(name)")
    .limit(1);
  console.log("Error:", error);
}

checkQuery();
