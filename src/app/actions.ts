"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticateLeadCode, createLeadSession, deleteLeadSession, requireLead, scopedGroup } from "@/lib/auth";
import {
  createMember as insertMember,
  deletePractice as removePractice,
  getPractice,
  getOrCreateTodayPractice,
  listMembers,
  savePracticeAttendance,
  seedPracticeAttendance,
  setMemberActive,
  setMemberGroup,
} from "@/lib/db";
import { ATTENDANCE_STATUSES, LEAD_GROUPS, ROSTER_GROUPS } from "@/lib/types";
import { pacificDateKey } from "@/lib/format";

export type LoginState = { error: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const result = z.object({
    code: z.string().min(1),
    group: z.union([z.enum(LEAD_GROUPS), z.literal("all")]),
  }).safeParse({ code: formData.get("code"), group: formData.get("group") });
  const session = result.success
    ? authenticateLeadCode(result.data.code, result.data.group === "all" ? null : result.data.group)
    : null;
  if (!session) {
    return { error: "That code does not match. Ask a team admin for the current code." };
  }
  await createLeadSession(session);
  redirect("/members");
}

export async function logout() {
  await deleteLeadSession();
  redirect("/login");
}

export async function addMember(formData: FormData) {
  const session = await requireLead();
  const result = z.object({
    name: z.string().trim().min(2).max(80),
    group: z.enum(ROSTER_GROUPS),
    role: z.string().trim().min(2).max(60),
  }).safeParse({
    name: formData.get("name"),
    group: formData.get("group"),
    role: formData.get("role"),
  });
  if (!result.success) throw new Error("Enter a name, subteam, and role.");
  await insertMember({ ...result.data, group: scopedGroup(session) ?? result.data.group });
  revalidatePath("/dashboard");
  revalidatePath("/members");
}

export async function changeMemberStatus(formData: FormData) {
  const session = await requireLead();
  const result = z.object({
    id: z.string().uuid(),
    active: z.enum(["true", "false"]),
  }).safeParse({ id: formData.get("id"), active: formData.get("active") });
  if (!result.success) throw new Error("Invalid member update.");
  const allowedMembers = await listMembers(true, scopedGroup(session));
  if (!allowedMembers.some((member) => member.id === result.data.id)) {
    throw new Error("You can only manage members in your subteam.");
  }
  await setMemberActive(result.data.id, result.data.active === "true");
  revalidatePath("/members");
  revalidatePath("/dashboard");
}

export async function changeMemberGroup(formData: FormData) {
  const session = await requireLead();
  if (session.role !== "admin") {
    throw new Error("Only the all-team admin can reassign members.");
  }

  const result = z.object({
    id: z.string().uuid(),
    group: z.enum(ROSTER_GROUPS),
  }).safeParse({ id: formData.get("id"), group: formData.get("group") });
  if (!result.success) throw new Error("Choose a valid member and group.");

  const members = await listMembers(true);
  if (!members.some((member) => member.id === result.data.id)) {
    throw new Error("That member is not on the roster.");
  }

  await setMemberGroup(result.data.id, result.data.group);
  revalidatePath("/members");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function addPractice() {
  const session = await requireLead();
  const members = await listMembers(false, scopedGroup(session));
  const practice = await getOrCreateTodayPractice();
  await seedPracticeAttendance(practice.id, members);
  revalidatePath("/dashboard");
  revalidatePath("/practices");
  revalidatePath("/reports");
  redirect(`/check-in/${practice.id}`);
}

export async function deletePastPractice(formData: FormData) {
  const session = await requireLead();
  if (session.role !== "admin") {
    throw new Error("Only the all-team admin can delete meetings.");
  }

  const result = z.object({ id: z.string().uuid() }).safeParse({ id: formData.get("id") });
  if (!result.success) throw new Error("Invalid meeting.");

  const practice = await getPractice(result.data.id);
  if (!practice) return;
  if (pacificDateKey(practice.starts_at) >= pacificDateKey()) {
    throw new Error("Only past meetings can be deleted.");
  }

  await removePractice(practice.id);
  revalidatePath("/dashboard");
  revalidatePath("/members");
  revalidatePath("/practices");
  revalidatePath("/reports");
}

const attendancePayload = z.array(z.object({
  member_id: z.string().uuid(),
  status: z.enum(ATTENDANCE_STATUSES),
  note: z.string().trim().max(240),
})).min(1);

export async function saveAttendance(practiceId: string, payload: string) {
  const session = await requireLead();
  const id = z.string().uuid().parse(practiceId);
  const entries = attendancePayload.parse(JSON.parse(payload));
  if (new Set(entries.map((entry) => entry.member_id)).size !== entries.length) {
    throw new Error("Duplicate roster entries are not allowed.");
  }
  const allowedMemberIds = new Set(
    (await listMembers(false, scopedGroup(session))).map((member) => member.id),
  );
  if (entries.some((entry) => !allowedMemberIds.has(entry.member_id))) {
    throw new Error("You can only save attendance for active members in your subteam.");
  }
  await savePracticeAttendance(id, entries);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath(`/check-in/${id}`);
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function saveTodayAttendance(payload: string) {
  const session = await requireLead();
  const entries = attendancePayload.parse(JSON.parse(payload));
  if (new Set(entries.map((entry) => entry.member_id)).size !== entries.length) {
    throw new Error("Duplicate roster entries are not allowed.");
  }
  const members = await listMembers(false, scopedGroup(session));
  const allowedMemberIds = new Set(members.map((member) => member.id));
  if (entries.some((entry) => !allowedMemberIds.has(entry.member_id))) {
    throw new Error("You can only save attendance for active members in your subteam.");
  }

  const practice = await getOrCreateTodayPractice();
  await seedPracticeAttendance(practice.id, members);
  await savePracticeAttendance(practice.id, entries);
  revalidatePath("/members");
  revalidatePath("/dashboard");
  revalidatePath("/practices");
  revalidatePath("/reports");
  revalidatePath(`/check-in/${practice.id}`);
  return { ok: true, practiceId: practice.id, savedAt: new Date().toISOString() };
}
