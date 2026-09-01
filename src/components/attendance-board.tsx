"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Clock3, MessageSquareText, ShieldCheck, UserX } from "lucide-react";
import { saveAttendance } from "@/app/actions";
import type { AttendanceEntry, AttendanceStatus, Member } from "@/lib/types";

const options: Array<{ value: AttendanceStatus; label: string; icon: typeof Check }> = [
  { value: "present", label: "Here", icon: Check },
  { value: "late", label: "Late", icon: Clock3 },
  { value: "excused", label: "Excused", icon: ShieldCheck },
  { value: "absent", label: "Absent", icon: UserX },
];

type EntryState = Record<string, { status: AttendanceStatus | "unmarked"; note: string }>;

export function AttendanceBoard({ practiceId, members, existing }: {
  practiceId: string;
  members: Member[];
  existing: AttendanceEntry[];
}) {
  const memberNames = useMemo(() => new Map(members.map((member) => [member.id, member.name])), [members]);
  const [entries, setEntries] = useState<EntryState>(() => {
    const savedByMember = new Map(existing.map((entry) => [entry.member_id, entry]));
    return Object.fromEntries(members.map((member) => {
      const saved = savedByMember.get(member.id);
      return [member.id, { status: saved?.status ?? "unmarked", note: saved?.note ?? "" }];
    })) as EntryState;
  });
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState(existing.length ? "Changes save automatically" : "Tap a status to begin");
  const unmarked = Object.values(entries).filter((entry) => entry.status === "unmarked").length;

  function updateStatus(memberId: string, status: AttendanceStatus) {
    const previous = entries[memberId];
    const next = { ...previous, status };
    const memberName = memberNames.get(memberId) ?? "Attendance";
    setEntries((current) => ({ ...current, [memberId]: next }));
    setMessage(`Saving ${memberName}…`);
    startTransition(async () => {
      try {
        await saveAttendance(practiceId, JSON.stringify([{ member_id: memberId, status, note: next.note }]));
        setMessage(`${memberName} saved`);
      } catch {
        setEntries((current) => current[memberId].status === status ? { ...current, [memberId]: previous } : current);
        setMessage(`${memberName} was not saved. Tap again to retry.`);
      }
    });
  }

  function markEveryonePresent() {
    const previous = entries;
    const next = Object.fromEntries(Object.entries(entries).map(([id, entry]) => [id, { ...entry, status: "present" }])) as EntryState;
    setEntries(next);
    setMessage("Saving everyone…");
    startTransition(async () => {
      try {
        await saveAttendance(practiceId, JSON.stringify(members.map((member) => ({ member_id: member.id, status: "present", note: next[member.id].note }))));
        setMessage("Everyone is marked here");
      } catch {
        setEntries(previous);
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
    const memberName = memberNames.get(memberId) ?? "Note";
    setMessage(`Saving ${memberName}…`);
    startTransition(async () => {
      try {
        await saveAttendance(practiceId, JSON.stringify([{ member_id: memberId, status: entry.status, note: entry.note }]));
        setMessage(`${memberName} saved`);
      } catch {
        setMessage(`${memberName}'s note was not saved. Try again.`);
      }
    });
  }

  return (
    <div className="attendance-board">
      <div className="board-toolbar">
        <button type="button" className="button button-secondary" onClick={markEveryonePresent} disabled={!members.length}><Check size={17} />Everyone is here</button>
        <span className={unmarked ? "save-note warning" : "save-note"} aria-live="polite">{pending ? "Saving…" : unmarked ? `${unmarked} unmarked` : message}</span>
      </div>
      <div className="roster-list">
        {members.map((member, index) => (
          <section className={`roster-row status-${entries[member.id].status}`} key={member.id}>
            <div className="member-cell">
              <span className="roster-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="member-avatar">{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
              <span><strong>{member.name}</strong><small>{member.group_name} · {member.role}</small></span>
            </div>
            <div className="status-options" role="group" aria-label={`Attendance for ${member.name}`}>
              {options.map(({ value, label, icon: Icon }) => (
                <button type="button" key={value} aria-pressed={entries[member.id].status === value} className={entries[member.id].status === value ? `selected ${value}` : value} onClick={() => updateStatus(member.id, value)}>
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
