begin;

-- Fold any existing same-day practices into the earliest record for that
-- Pacific calendar day. When the same member was marked more than once, keep
-- their most recently saved status and note.
create temporary table practice_merge_map on commit drop as
select
  id as duplicate_id,
  first_value(id) over (
    partition by ((starts_at at time zone 'America/Los_Angeles')::date)
    order by created_at, id
  ) as canonical_id
from public.practices;

insert into public.attendance (practice_id, member_id, status, note, checked_at)
select distinct on (mapping.canonical_id, attendance.member_id)
  mapping.canonical_id,
  attendance.member_id,
  attendance.status,
  attendance.note,
  attendance.checked_at
from public.attendance as attendance
join practice_merge_map as mapping
  on mapping.duplicate_id = attendance.practice_id
where mapping.duplicate_id <> mapping.canonical_id
order by mapping.canonical_id, attendance.member_id, attendance.checked_at desc
on conflict (practice_id, member_id) do update
set
  status = excluded.status,
  note = excluded.note,
  checked_at = excluded.checked_at
where excluded.checked_at > public.attendance.checked_at;

delete from public.practices as practices
using practice_merge_map as mapping
where practices.id = mapping.duplicate_id
  and mapping.duplicate_id <> mapping.canonical_id;

alter table public.practices
  add column practice_date date
  generated always as ((starts_at at time zone 'America/Los_Angeles')::date) stored;

alter table public.practices
  add constraint practices_one_per_pacific_day unique (practice_date);

commit;
