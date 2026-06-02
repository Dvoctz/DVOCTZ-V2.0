import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

async function checkUndef() {
  try {
    const p = supabase.from("fixtures").update({
      my_field: undefined
    }).eq("id", 1);
    console.log("Promise returned:", p);
    const { error } = await p;
    console.log("Awaited error:", error);
  } catch (err) {
    console.log("CAUGHT EXCEPTION:", err);
  }
}
checkUndef();
