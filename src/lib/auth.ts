import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "pitboard_session";

export type LeadSession =
  | { role: "admin"; group: null }
  | { role: "subteam"; group: string };

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

function subteamCodes() {
  const value = process.env.SUBTEAM_LEAD_CODES;
  if (!value) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("SUBTEAM_LEAD_CODES must be a JSON object that maps subteam names to access codes.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("SUBTEAM_LEAD_CODES must be a JSON object that maps subteam names to access codes.");
  }

  return Object.entries(parsed).map(([group, code]) => {
    if (!group.trim() || typeof code !== "string" || !code.trim()) {
      throw new Error("Every SUBTEAM_LEAD_CODES entry needs a subteam name and a non-empty code.");
    }
    return { group: group.trim(), code: code.trim() };
  });
}

export function authenticateLeadCode(value: string): LeadSession | null {
  const adminCode = process.env.LEAD_ACCESS_CODE;
  if (adminCode && codesMatch(value, adminCode)) return { role: "admin", group: null };

  const match = subteamCodes().find(({ code }) => codesMatch(value, code));
  return match ? { role: "subteam", group: match.group } : null;
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
    if (payload.role === "subteam" && typeof payload.group === "string" && payload.group) {
      return { role: "subteam", group: payload.group };
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
