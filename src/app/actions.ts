"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createLeadSession, deleteLeadSession, matchesLeadCode, requireLead } from "@/lib/auth";
import {
  createMember as insertMember,
  createPractice as insertPractice,
  savePracticeAttendance,
  setMemberActive,
} from "@/lib/db";
import { pacificLocalToIso } from "@/lib/format";
import { ATTENDANCE_STATUSES } from "@/lib/types";

export type LoginState = { error: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const result = z.object({ code: z.string().min(1) }).safeParse({ code: formData.get("code") });
  if (!result.success || !matchesLeadCode(result.data.code)) {
    return { error: "That access code does not match. Ask a team admin for the current lead code." };
  }
  await createLeadSession();
  redirect("/dashboard");
}

export async function logout() {
  await deleteLeadSession();
  redirect("/login");
}

export async function addMember(formData: FormData) {
  await requireLead();
  const result = z.object({
    name: z.string().trim().min(2).max(80),
    group: z.string().trim().min(2).max(60),
    role: z.string().trim().min(2).max(60),
  }).safeParse({
    name: formData.get("name"),
    group: formData.get("group"),
    role: formData.get("role"),
  });
  if (!result.success) throw new Error("Enter a name, subteam, and role.");
  await insertMember(result.data);
  revalidatePath("/dashboard");
  revalidatePath("/members");
}

export async function changeMemberStatus(formData: FormData) {
  await requireLead();
  const result = z.object({
    id: z.string().uuid(),
    active: z.enum(["true", "false"]),
  }).safeParse({ id: formData.get("id"), active: formData.get("active") });
  if (!result.success) throw new Error("Invalid member update.");
  await setMemberActive(result.data.id, result.data.active === "true");
  revalidatePath("/members");
  revalidatePath("/dashboard");
}

export async function addPractice(formData: FormData) {
  await requireLead();
  const result = z.object({
    title: z.string().trim().min(2).max(80),
    startsAt: z.string().min(1),
    focus: z.string().trim().max(140),
  }).safeParse({
    title: formData.get("title"),
    startsAt: formData.get("startsAt"),
    focus: formData.get("focus") ?? "",
  });
  if (!result.success) throw new Error("Enter a practice name and start time.");
  const id = await insertPractice({ ...result.data, startsAt: pacificLocalToIso(result.data.startsAt) });
  revalidatePath("/dashboard");
  revalidatePath("/practices");
  redirect(`/check-in/${id}`);
}

const attendancePayload = z.array(z.object({
  member_id: z.string().uuid(),
  status: z.enum(ATTENDANCE_STATUSES),
  note: z.string().trim().max(240),
})).min(1);

export async function saveAttendance(practiceId: string, payload: string) {
  await requireLead();
  const id = z.string().uuid().parse(practiceId);
  const entries = attendancePayload.parse(JSON.parse(payload));
  if (new Set(entries.map((entry) => entry.member_id)).size !== entries.length) {
    throw new Error("Duplicate roster entries are not allowed.");
  }
  await savePracticeAttendance(id, entries);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath(`/check-in/${id}`);
  return { ok: true, savedAt: new Date().toISOString() };
}

