"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Clock3, MessageSquareText, ShieldCheck, UserX } from "lucide-react";
import { saveAttendance, saveTodayAttendance } from "@/app/actions";
import type { AttendanceEntry, AttendanceStatus, Member } from "@/lib/types";

const options: Array<{ value: AttendanceStatus; label: string; icon: typeof Check }> = [
  { value: "present", label: "Here", icon: Check },
  { value: "late", label: "Late", icon: Clock3 },
  { value: "excused", label: "Excused", icon: ShieldCheck },
  { value: "absent", label: "Absent", icon: UserX },
];

type EntryState = Record<string, { status: AttendanceStatus | "unmarked"; note: string }>;
type SaveEntry = { member_id: string; status: AttendanceStatus; note: string };

export function AttendanceBoard({ practiceId, members, existing, todayMode = false }: {
  practiceId?: string;
  members: Member[];
  existing: AttendanceEntry[];
  todayMode?: boolean;
}) {
  const memberNames = useMemo(() => new Map(members.map((member) => [member.id, member.name])), [members]);
  const [activePracticeId, setActivePracticeId] = useState(practiceId);
  const [initialized, setInitialized] = useState(existing.length > 0);
  const [entries, setEntries] = useState<EntryState>(() => {
    const savedByMember = new Map(existing.map((entry) => [entry.member_id, entry]));
    return Object.fromEntries(members.map((member) => {
      const saved = savedByMember.get(member.id);
      return [member.id, { status: saved?.status ?? "unmarked", note: saved?.note ?? "" }];
    })) as EntryState;
  });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState(existing.length ? "Changes save automatically" : "Tap Here to start today’s meeting");
  const unmarked = Object.values(entries).filter((entry) => entry.status === "unmarked").length;
  const here = Object.values(entries).filter((entry) => entry.status === "present" || entry.status === "late").length;

  async function persist(rows: SaveEntry[]) {
    if (todayMode) {
      const result = await saveTodayAttendance(JSON.stringify(rows));
      setActivePracticeId(result.practiceId);
      return;
    }
    if (!activePracticeId) throw new Error("No meeting selected.");
    await saveAttendance(activePracticeId, JSON.stringify(rows));
  }

  function updateStatus(memberId: string, status: AttendanceStatus) {
    const previousEntries = entries;
    const firstSave = todayMode && !initialized;
    const next = firstSave
      ? Object.fromEntries(Object.entries(entries).map(([id, entry]) => [id, {
          ...entry,
          status: id === memberId ? status : entry.status === "unmarked" ? "absent" : entry.status,
        }])) as EntryState
      : { ...entries, [memberId]: { ...entries[memberId], status } };
    const memberName = memberNames.get(memberId) ?? "Attendance";
    setEntries(next);
    if (firstSave) setInitialized(true);
    setMessage(firstSave ? "Starting today’s meeting…" : `Saving ${memberName}…`);
    startTransition(async () => {
      try {
        await persist([{ member_id: memberId, status, note: next[memberId].note }]);
        const firstStatus = options.find((option) => option.value === status)?.label.toLowerCase() ?? "saved";
        setMessage(firstSave ? `Meeting started · ${memberName} marked ${firstStatus}` : `${memberName} saved`);
      } catch {
        setEntries(previousEntries);
        if (firstSave) setInitialized(false);
        setMessage(`${memberName} was not saved. Tap again to retry.`);
      }
    });
  }

  function markEveryonePresent() {
    const previous = entries;
    const wasInitialized = initialized;
    const next = Object.fromEntries(Object.entries(entries).map(([id, entry]) => [id, { ...entry, status: "present" }])) as EntryState;
    setEntries(next);
    setInitialized(true);
    setMessage(todayMode && !wasInitialized ? "Starting today’s meeting…" : "Saving everyone…");
    startTransition(async () => {
      try {
        await persist(members.map((member) => ({ member_id: member.id, status: "present", note: next[member.id].note })));
        setMessage(todayMode && !wasInitialized ? "Meeting started · everyone is here" : "Everyone is marked here");
      } catch {
        setEntries(previous);
        setInitialized(wasInitialized);
        setMessage("The roster was not saved. Try again.");
      }
    });
  }

  function saveNote(memberId: string) {
    const entry = entries[memberId];
    if (entry.status === "unmarked") {
      setMessage("Choose a status before adding a note.");
      return;
    }
    const status = entry.status;
    const memberName = memberNames.get(memberId) ?? "Note";
    setMessage(`Saving ${memberName}…`);
    startTransition(async () => {
      try {
        await persist([{ member_id: memberId, status, note: entry.note }]);
        setMessage(`${memberName} saved`);
      } catch {
        setMessage(`${memberName}'s note was not saved. Try again.`);
      }
    });
  }

  return (
    <div className="attendance-board">
      <div className="board-toolbar">
        <div className="board-progress"><strong>{here}</strong><span>here<small>{unmarked ? `${unmarked} not marked` : "roster complete"}</small></span></div>
        <button type="button" className="button button-secondary" onClick={markEveryonePresent} disabled={!members.length || pending}><Check size={17} />Everyone is here</button>
        <span className={unmarked ? "save-note warning" : "save-note"} aria-live="polite">{pending ? "Saving…" : message}</span>
      </div>
      <div className="roster-list">
        {members.map((member) => (
          <section className={`roster-row status-${entries[member.id].status}`} key={member.id}>
            <div className="member-cell">
              <span className="member-avatar">{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
              <span><strong>{member.name}</strong><small>{member.group_name} · {member.role}</small></span>
            </div>
            <div className="status-options" role="group" aria-label={`Attendance for ${member.name}`}>
              {options.map(({ value, label, icon: Icon }) => (
                <button type="button" key={value} disabled={pending} aria-pressed={entries[member.id].status === value} className={entries[member.id].status === value ? `selected ${value}` : value} onClick={() => updateStatus(member.id, value)}>
                  <Icon size={15} aria-hidden="true" />{label}
                </button>
              ))}
            </div>
            <details className="note-disclosure">
              <summary><MessageSquareText size={15} />{entries[member.id].note ? "Edit note" : "Note"}</summary>
              <input className="note-input" aria-label={`Note for ${member.name}`} placeholder="Optional note" value={entries[member.id].note}
                onChange={(event) => setEntries((current) => ({ ...current, [member.id]: { ...current[member.id], note: event.target.value } }))}
                onBlur={() => saveNote(member.id)} />
            </details>
          </section>
        ))}
      </div>
    </div>
  );
}
