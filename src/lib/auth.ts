import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "pitboard_session";

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not configured.");
    return new TextEncoder().encode("development-only-attendance-session-secret");
  }
  return new TextEncoder().encode(value);
}

export function matchesLeadCode(value: string) {
  const expected = process.env.LEAD_ACCESS_CODE;
  if (!expected) return false;
  const inputBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return inputBuffer.length === expectedBuffer.length && timingSafeEqual(inputBuffer, expectedBuffer);
}

export async function createLeadSession() {
  const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const token = await new SignJWT({ role: "lead" })
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

export async function isLead() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.role === "lead";
  } catch {
    return false;
  }
}

export async function requireLead() {
  if (!(await isLead())) redirect("/login");
}

export async function deleteLeadSession() {
  (await cookies()).delete(COOKIE_NAME);
}

