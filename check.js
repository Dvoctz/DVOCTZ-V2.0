import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function check() {
  const { data, error } = await supabase.from("fixtures").insert([{
    team1_id: 1,
    team2_id: 2,
    tournament_id: 1,
    stage: "quarterfinal",
    best_of: 3
  }]);
  console.log("INSERT: ", error);
}

check();
