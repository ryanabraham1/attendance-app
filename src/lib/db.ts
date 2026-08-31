import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { AttendanceEntry, Member, Practice } from "@/lib/types";

let client: NeonQueryFunction<false, false> | null = null;

function database() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }
  client ??= neon(process.env.DATABASE_URL);
  return client;
}

export async function listMembers(includeInactive = false) {
  const sql = database();
  return (await sql`
    select id, name, group_name, role, active, created_at
    from members
    where ${includeInactive} or active = true
    order by active desc, name asc
  `) as Member[];
}

export async function listPractices() {
  const sql = database();
  return (await sql`
    select id, title, starts_at, focus, created_at
    from practices
    order by starts_at desc
  `) as Practice[];
}

export async function getPractice(id: string) {
  const sql = database();
  const rows = (await sql`
    select id, title, starts_at, focus, created_at
    from practices where id = ${id} limit 1
  `) as Practice[];
  return rows[0] ?? null;
}

export async function getAttendanceForPractice(practiceId: string) {
  const sql = database();
  return (await sql`
    select member_id, status, note
    from attendance where practice_id = ${practiceId}
  `) as AttendanceEntry[];
}

export async function createMember(input: { name: string; group: string; role: string }) {
  const sql = database();
  await sql`
    insert into members (name, group_name, role)
    values (${input.name}, ${input.group}, ${input.role})
  `;
}

export async function setMemberActive(id: string, active: boolean) {
  const sql = database();
  await sql`update members set active = ${active} where id = ${id}`;
}

export async function createPractice(input: { title: string; startsAt: string; focus: string }) {
  const sql = database();
  const rows = (await sql`
    insert into practices (title, starts_at, focus)
    values (${input.title}, ${input.startsAt}, ${input.focus})
    returning id
  `) as { id: string }[];
  return rows[0].id;
}

export async function savePracticeAttendance(practiceId: string, entries: AttendanceEntry[]) {
  const sql = database();
  await sql.transaction(
    entries.map((entry) => sql`
      insert into attendance (practice_id, member_id, status, note, checked_at)
      values (${practiceId}, ${entry.member_id}, ${entry.status}, ${entry.note}, now())
      on conflict (practice_id, member_id)
      do update set status = excluded.status, note = excluded.note, checked_at = now()
    `),
  );
}

export async function getDashboardData() {
  const sql = database();
  const [counts, recentPractices, missing, attention] = await Promise.all([
    sql`
      select
        (select count(*)::int from members where active) as active_members,
        (select count(*)::int from practices) as practices,
        coalesce(round(100.0 * sum(case when a.status in ('present','late') then 1 else 0 end)
          / nullif(sum(case when a.status in ('present','late','absent') then 1 else 0 end), 0), 0), 0)::int as team_rate
      from attendance a
    `,
    sql`
      select p.id, p.title, p.starts_at, p.focus,
        count(a.member_id)::int as marked,
        count(*) filter (where a.status = 'present')::int as present,
        count(*) filter (where a.status = 'late')::int as late,
        count(*) filter (where a.status = 'excused')::int as excused,
        count(*) filter (where a.status = 'absent')::int as absent
      from practices p
      left join attendance a on a.practice_id = p.id
      group by p.id
      order by p.starts_at desc
      limit 5
    `,
    sql`
      select m.id, m.name, m.group_name, p.id as practice_id, p.title, p.starts_at, a.note
      from attendance a
      join members m on m.id = a.member_id
      join practices p on p.id = a.practice_id
      where a.status = 'absent'
      order by p.starts_at desc, m.name
      limit 8
    `,
    sql`
      select m.id, m.name, m.group_name,
        count(*) filter (where a.status = 'absent')::int as absences,
        count(*) filter (where a.status = 'late')::int as lates,
        coalesce(round(100.0 * count(*) filter (where a.status in ('present','late'))
          / nullif(count(*) filter (where a.status in ('present','late','absent')), 0), 0), 100)::int as rate
      from members m
      join attendance a on a.member_id = m.id
      where m.active
      group by m.id
      having count(*) filter (where a.status = 'absent') > 0
      order by rate asc, absences desc, m.name
      limit 6
    `,
  ]);

  return {
    counts: (counts as { active_members: number; practices: number; team_rate: number }[])[0],
    recentPractices: recentPractices as Array<Practice & { marked: number; present: number; late: number; excused: number; absent: number }>,
    missing: missing as Array<{ id: string; name: string; group_name: string; practice_id: string; title: string; starts_at: string; note: string }>,
    attention: attention as Array<{ id: string; name: string; group_name: string; absences: number; lates: number; rate: number }>,
  };
}

export async function getMemberReports() {
  const sql = database();
  return (await sql`
    select m.id, m.name, m.group_name, m.role,
      count(a.*)::int as recorded,
      count(*) filter (where a.status = 'present')::int as present,
      count(*) filter (where a.status = 'late')::int as late,
      count(*) filter (where a.status = 'excused')::int as excused,
      count(*) filter (where a.status = 'absent')::int as absent,
      coalesce(round(100.0 * count(*) filter (where a.status in ('present','late'))
        / nullif(count(*) filter (where a.status in ('present','late','absent')), 0), 0), 100)::int as rate,
      coalesce(json_agg(json_build_object(
        'title', p.title, 'starts_at', p.starts_at, 'status', a.status, 'note', a.note
      ) order by p.starts_at desc) filter (where a.status in ('absent','late')), '[]') as exceptions
    from members m
    left join attendance a on a.member_id = m.id
    left join practices p on p.id = a.practice_id
    where m.active
    group by m.id
    order by rate asc, m.name
  `) as Array<{
    id: string; name: string; group_name: string; role: string; recorded: number;
    present: number; late: number; excused: number; absent: number; rate: number;
    exceptions: Array<{ title: string; starts_at: string; status: string; note: string }>;
  }>;
}

