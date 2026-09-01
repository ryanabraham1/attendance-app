import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AttendanceEntry, Member, Practice } from "@/lib/types";

let client: SupabaseClient | null = null;

function database() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be configured.");
  }
  client ??= createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}

function resultOrThrow<T>(result: { data: T | null; error: { message: string } | null }) {
  if (result.error) throw new Error(`Supabase query failed: ${result.error.message}`);
  if (result.data === null) throw new Error("Supabase query returned no data.");
  return result.data;
}

export async function listMembers(includeInactive = false, groupName?: string) {
  let query = database()
    .from("members")
    .select("id,name,group_name,role,active,created_at")
    .order("active", { ascending: false })
    .order("name", { ascending: true });
  if (!includeInactive) query = query.eq("active", true);
  if (groupName) query = query.eq("group_name", groupName);
  return resultOrThrow(await query) as Member[];
}

export async function listPractices() {
  const result = await database()
    .from("practices")
    .select("id,title,starts_at,focus,created_at")
    .order("starts_at", { ascending: false });
  return resultOrThrow(result) as Practice[];
}

export async function getPractice(id: string) {
  const result = await database()
    .from("practices")
    .select("id,title,starts_at,focus,created_at")
    .eq("id", id)
    .maybeSingle();
  if (result.error) throw new Error(`Supabase query failed: ${result.error.message}`);
  return result.data as Practice | null;
}

export async function getAttendanceForPractice(practiceId: string, groupName?: string) {
  let query = database()
    .from("attendance")
    .select("member_id,status,note")
    .eq("practice_id", practiceId);
  if (groupName) {
    const members = await listMembers(true, groupName);
    if (!members.length) return [];
    query = query.in("member_id", members.map((member) => member.id));
  }
  return resultOrThrow(await query) as AttendanceEntry[];
}

export async function createMember(input: { name: string; group: string; role: string }) {
  const result = await database().from("members").insert({
    name: input.name,
    group_name: input.group,
    role: input.role,
  });
  if (result.error) throw new Error(`Could not create member: ${result.error.message}`);
}

export async function setMemberActive(id: string, active: boolean) {
  const result = await database().from("members").update({ active }).eq("id", id);
  if (result.error) throw new Error(`Could not update member: ${result.error.message}`);
}

export async function createPractice(input: { title: string; startsAt: string; focus: string }) {
  const result = await database()
    .from("practices")
    .insert({ title: input.title, starts_at: input.startsAt, focus: input.focus })
    .select("id")
    .single();
  return resultOrThrow(result).id as string;
}

export async function savePracticeAttendance(practiceId: string, entries: AttendanceEntry[]) {
  const now = new Date().toISOString();
  const rows = entries.map((entry) => ({
    practice_id: practiceId,
    member_id: entry.member_id,
    status: entry.status,
    note: entry.note,
    checked_at: now,
  }));
  const result = await database()
    .from("attendance")
    .upsert(rows, { onConflict: "practice_id,member_id" });
  if (result.error) throw new Error(`Could not save attendance: ${result.error.message}`);
}

type JoinedAttendance = {
  member_id: string;
  practice_id: string;
  status: AttendanceEntry["status"];
  note: string;
  members: { id: string; name: string; group_name: string } | null;
  practices: { id: string; title: string; starts_at: string } | null;
};

export async function getDashboardData(groupName?: string) {
  const db = database();
  const [membersResult, practicesResult, attendanceResult, countResult] = await Promise.all([
    db.from("members").select("id,name,group_name").eq("active", true).order("name"),
    db.from("practices").select("id,title,starts_at,focus,created_at").order("starts_at", { ascending: false }).limit(5),
    db.from("attendance").select("member_id,practice_id,status,note,members(id,name,group_name),practices(id,title,starts_at)"),
    db.from("practices").select("id", { count: "exact", head: true }),
  ]);

  const allMembers = resultOrThrow(membersResult) as Array<{ id: string; name: string; group_name: string }>;
  const members = groupName ? allMembers.filter((member) => member.group_name === groupName) : allMembers;
  const practices = resultOrThrow(practicesResult) as Practice[];
  const allAttendance = resultOrThrow(attendanceResult) as unknown as JoinedAttendance[];
  const attendance = groupName
    ? allAttendance.filter((entry) => entry.members?.group_name === groupName)
    : allAttendance;
  if (countResult.error) throw new Error(`Supabase query failed: ${countResult.error.message}`);

  const eligible = attendance.filter((entry) => ["present", "late", "absent"].includes(entry.status));
  const attended = eligible.filter((entry) => entry.status === "present" || entry.status === "late").length;
  const teamRate = eligible.length ? Math.round((attended / eligible.length) * 100) : 0;

  const recentPractices = practices.map((practice) => {
    const entries = attendance.filter((entry) => entry.practice_id === practice.id);
    return {
      ...practice,
      marked: entries.length,
      present: entries.filter((entry) => entry.status === "present").length,
      late: entries.filter((entry) => entry.status === "late").length,
      excused: entries.filter((entry) => entry.status === "excused").length,
      absent: entries.filter((entry) => entry.status === "absent").length,
    };
  });

  const missing = attendance
    .filter((entry) => entry.status === "absent" && entry.members && entry.practices)
    .sort((a, b) => new Date(b.practices!.starts_at).getTime() - new Date(a.practices!.starts_at).getTime())
    .slice(0, 8)
    .map((entry) => ({
      id: entry.members!.id,
      name: entry.members!.name,
      group_name: entry.members!.group_name,
      practice_id: entry.practices!.id,
      title: entry.practices!.title,
      starts_at: entry.practices!.starts_at,
      note: entry.note,
    }));

  const attention = members
    .map((member) => {
      const entries = attendance.filter((entry) => entry.member_id === member.id);
      const rated = entries.filter((entry) => ["present", "late", "absent"].includes(entry.status));
      const present = rated.filter((entry) => entry.status === "present" || entry.status === "late").length;
      return {
        ...member,
        absences: entries.filter((entry) => entry.status === "absent").length,
        lates: entries.filter((entry) => entry.status === "late").length,
        rate: rated.length ? Math.round((present / rated.length) * 100) : 100,
      };
    })
    .filter((member) => member.absences > 0)
    .sort((a, b) => a.rate - b.rate || b.absences - a.absences || a.name.localeCompare(b.name))
    .slice(0, 6);

  return {
    counts: { active_members: members.length, practices: countResult.count ?? 0, team_rate: teamRate },
    recentPractices,
    missing,
    attention,
  };
}

type ReportAttendance = {
  member_id: string;
  status: AttendanceEntry["status"];
  note: string;
  practices: { title: string; starts_at: string } | null;
};

export async function getMemberReports(groupName?: string) {
  const db = database();
  const [membersResult, attendanceResult] = await Promise.all([
    db.from("members").select("id,name,group_name,role").eq("active", true).order("name"),
    db.from("attendance").select("member_id,status,note,practices(title,starts_at)"),
  ]);
  const allMembers = resultOrThrow(membersResult) as Array<{ id: string; name: string; group_name: string; role: string }>;
  const members = groupName ? allMembers.filter((member) => member.group_name === groupName) : allMembers;
  const memberIds = new Set(members.map((member) => member.id));
  const attendance = (resultOrThrow(attendanceResult) as unknown as ReportAttendance[])
    .filter((entry) => memberIds.has(entry.member_id));

  return members.map((member) => {
    const entries = attendance.filter((entry) => entry.member_id === member.id);
    const rated = entries.filter((entry) => ["present", "late", "absent"].includes(entry.status));
    const attended = rated.filter((entry) => entry.status === "present" || entry.status === "late").length;
    return {
      ...member,
      recorded: entries.length,
      present: entries.filter((entry) => entry.status === "present").length,
      late: entries.filter((entry) => entry.status === "late").length,
      excused: entries.filter((entry) => entry.status === "excused").length,
      absent: entries.filter((entry) => entry.status === "absent").length,
      rate: rated.length ? Math.round((attended / rated.length) * 100) : 100,
      exceptions: entries
        .filter((entry) => (entry.status === "absent" || entry.status === "late") && entry.practices)
        .sort((a, b) => new Date(b.practices!.starts_at).getTime() - new Date(a.practices!.starts_at).getTime())
        .map((entry) => ({
          title: entry.practices!.title,
          starts_at: entry.practices!.starts_at,
          status: entry.status,
          note: entry.note,
        })),
    };
  }).sort((a, b) => a.rate - b.rate || a.name.localeCompare(b.name));
}
