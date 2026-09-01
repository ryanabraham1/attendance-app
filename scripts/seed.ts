import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
const supabase = createClient(url, secretKey, { auth: { persistSession: false } });
const { count, error: countError } = await supabase.from("members").select("id", { count: "exact", head: true });
if (countError) throw countError;
if ((count ?? 0) > 0) {
  console.log("Seed skipped: the roster already has members.");
  process.exit(0);
}
const { error } = await supabase.from("members").insert([
  { name: "Alex Rivera", group_name: "Build", role: "Member" },
  { name: "Maya Chen", group_name: "Software", role: "Member" },
  { name: "Sam Patel", group_name: "Design", role: "Member" },
  { name: "Jordan Kim", group_name: "Business", role: "Member" },
]);
if (error) throw error;
console.log("Added four fictional members for local testing.");
