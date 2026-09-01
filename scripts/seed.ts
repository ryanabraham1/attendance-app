import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type RosterMember = {
  name: string;
  group_name: string;
  role: "Exec" | "Member";
};

const roster: RosterMember[] = [
  { name: "Ryan Abraham", group_name: "Software", role: "Exec" },
  { name: "Alessandra Basso", group_name: "Fab", role: "Member" },
  { name: "Ella Cheng", group_name: "Software", role: "Member" },
  { name: "Bhavya Dash", group_name: "Design", role: "Exec" },
  { name: "Ethan Duong", group_name: "Design", role: "Member" },
  { name: "Arushi Iyer", group_name: "Design", role: "Member" },
  { name: "Jolina Luo", group_name: "Software", role: "Member" },
  { name: "Mikaela Mayr", group_name: "Design", role: "Member" },
  { name: "Devshree Mistry", group_name: "Software", role: "Exec" },
  { name: "Audrey Pfeiffer", group_name: "Unassigned", role: "Member" },
  { name: "Meena Rao", group_name: "Fab", role: "Member" },
  { name: "Samanvay Srivatsa", group_name: "Business", role: "Member" },
  { name: "Sidharth Swaminathan", group_name: "Design", role: "Member" },
  { name: "Pranav Swaminathan", group_name: "Business", role: "Exec" },
  { name: "Eileen Wang", group_name: "Electrical", role: "Member" },
  { name: "Nathan Watson", group_name: "Fab", role: "Member" },
  { name: "Michael Xie", group_name: "Fab", role: "Member" },
  { name: "Jeremy Yip", group_name: "Design", role: "Member" },
  { name: "Isabella Yu", group_name: "Software", role: "Member" },
  { name: "Claire Jiang", group_name: "Design", role: "Member" },
  { name: "Gordon Lee", group_name: "Electrical", role: "Member" },
  { name: "Srikar Vajjhula", group_name: "Electrical", role: "Member" },
  { name: "Vienna Kwan", group_name: "Design", role: "Member" },
  { name: "William Pu", group_name: "Design", role: "Member" },
  { name: "Shaarav Sunil", group_name: "Design", role: "Member" },
  { name: "Charles Fang", group_name: "Design", role: "Member" },
  { name: "Yash Khare", group_name: "Fab", role: "Member" },
  { name: "Ike Kalendra", group_name: "Fab", role: "Member" },
  { name: "Zoe Zhao", group_name: "Fab", role: "Member" },
  { name: "Junqi Zhao", group_name: "Software", role: "Member" },
  { name: "Ashvath Ramesh", group_name: "Software", role: "Member" },
  { name: "Theodora Armanyous", group_name: "Electrical", role: "Member" },
  { name: "John Kim", group_name: "Electrical", role: "Member" },
  { name: "Vishnu Kolar", group_name: "Electrical", role: "Member" },
  { name: "Bella Ye", group_name: "Business", role: "Member" },
  { name: "Catherine Yu", group_name: "Business", role: "Member" },
  { name: "Laura Zhang", group_name: "Business", role: "Member" },
];

const normalizedName = (name: string) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase();

async function main() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required.");

  const supabase = createClient(url, secretKey, { auth: { persistSession: false } });
  const { data: existing, error: listError } = await supabase
    .from("members")
    .select("id,name,group_name,role,active");
  if (listError) throw listError;

  const existingByName = new Map<string, (typeof existing)[number]>();
  for (const member of existing) {
    const key = normalizedName(member.name);
    if (existingByName.has(key)) {
      throw new Error(`Cannot sync roster because multiple members are named ${member.name}.`);
    }
    existingByName.set(key, member);
  }

  const additions = roster.filter((member) => !existingByName.has(normalizedName(member.name)));
  const updates = roster.filter((member) => {
    const current = existingByName.get(normalizedName(member.name));
    return current && (
      current.name !== member.name
      || current.group_name !== member.group_name
      || current.role !== member.role
      || !current.active
    );
  });

  if (additions.length) {
    const { error } = await supabase.from("members").insert(additions);
    if (error) throw error;
  }

  for (const member of updates) {
    const current = existingByName.get(normalizedName(member.name));
    if (!current) continue;
    const { error } = await supabase
      .from("members")
      .update({ ...member, active: true })
      .eq("id", current.id);
    if (error) throw error;
  }

  console.log(
    `Roster synced: ${additions.length} added, ${updates.length} updated, ${roster.length} listed members active.`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
