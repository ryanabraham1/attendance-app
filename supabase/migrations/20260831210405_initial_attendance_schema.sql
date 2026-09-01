create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_name text not null,
  role text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.practices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  focus text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  practice_id uuid not null references public.practices(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete restrict,
  status text not null check (status in ('present', 'late', 'excused', 'absent')),
  note text not null default '',
  checked_at timestamptz not null default now(),
  primary key (practice_id, member_id)
);

create index if not exists attendance_member_idx on public.attendance(member_id);
create index if not exists practices_starts_at_idx on public.practices(starts_at desc);

alter table public.members enable row level security;
alter table public.practices enable row level security;
alter table public.attendance enable row level security;

revoke all on table public.members, public.practices, public.attendance from anon, authenticated;
grant select, insert, update, delete on table public.members, public.practices, public.attendance to service_role;
