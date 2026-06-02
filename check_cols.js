import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function checkCols() {
  const { data, error } = await supabase.from("fixtures").select("*").limit(1);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  }
}
checkCols();
