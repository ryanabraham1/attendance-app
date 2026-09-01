import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { LEAD_GROUPS, type LeadGroup } from "@/lib/types";

const COOKIE_NAME = "pitboard_session";

export type LeadSession =
  | { role: "admin"; group: null }
  | { role: "subteam"; group: LeadGroup };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not configured.");
    return new TextEncoder().encode("development-only-attendance-session-secret");
  }
  return new TextEncoder().encode(value);
}

function codesMatch(value: string, expected: string) {
  const inputBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return inputBuffer.length === expectedBuffer.length && timingSafeEqual(inputBuffer, expectedBuffer);
}

export function authenticateLeadCode(value: string, group: LeadGroup | null): LeadSession | null {
  const adminCode = process.env.LEAD_ACCESS_CODE;
  if (!adminCode || !codesMatch(value, adminCode)) return null;
  return group ? { role: "subteam", group } : { role: "admin", group: null };
}

export async function createLeadSession(session: LeadSession) {
  const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(secret());
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function getLeadSession(): Promise<LeadSession | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role === "admin") return { role: "admin", group: null };
    if (payload.role === "subteam" && LEAD_GROUPS.some((group) => group === payload.group)) {
      return { role: "subteam", group: payload.group as LeadGroup };
    }
    return null;
  } catch {
    return null;
  }
}

export async function isLead() {
  return (await getLeadSession()) !== null;
}

export async function requireLead(): Promise<LeadSession> {
  const session = await getLeadSession();
  if (!session) redirect("/login");
  return session;
}

export function scopedGroup(session: LeadSession) {
  return session.role === "subteam" ? session.group : undefined;
}

export async function deleteLeadSession() {
  (await cookies()).delete(COOKIE_NAME);
}
