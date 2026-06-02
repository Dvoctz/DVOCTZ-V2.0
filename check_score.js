import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function checkScoreUpdate() {
  const { data, error, count } = await supabase.from("fixtures").update({
    stage: "quarterfinal",
    status: "completed",
    winner_team_id: 2, // pretend team 2 won
    score: {
      sets: [
        { team1Points: 21, team2Points: 10 },
        { team1Points: 21, team2Points: 15 }
      ],
      team1Score: 2,
      team2Score: 0,
    }
  }).eq("id", 51).select();
  console.log("UPDATE Data: ", data);
  console.log("UPDATE Error: ", error);
}

checkScoreUpdate();
