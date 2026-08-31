import { neon } from "@neondatabase/serverless";

const connection = process.env.DATABASE_URL;
if (!connection) throw new Error("DATABASE_URL is required.");
const sql = neon(connection);

await sql.query(`
  create extension if not exists pgcrypto;
  create table if not exists members (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    group_name text not null,
    role text not null,
    active boolean not null default true,
    created_at timestamptz not null default now()
  );
  create table if not exists practices (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    starts_at timestamptz not null,
    focus text not null default '',
    created_at timestamptz not null default now()
  );
  create table if not exists attendance (
    practice_id uuid not null references practices(id) on delete cascade,
    member_id uuid not null references members(id) on delete restrict,
    status text not null check (status in ('present', 'late', 'excused', 'absent')),
    note text not null default '',
    checked_at timestamptz not null default now(),
    primary key (practice_id, member_id)
  );
  create index if not exists attendance_member_idx on attendance(member_id);
  create index if not exists practices_starts_at_idx on practices(starts_at desc);
`);
console.log("Attendance database is ready.");

