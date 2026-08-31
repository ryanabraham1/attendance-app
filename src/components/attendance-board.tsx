"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Clock3, Save, ShieldCheck, UserX } from "lucide-react";
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
  const initial = Object.fromEntries(members.map((member) => {
    const saved = existing.find((entry) => entry.member_id === member.id);
    return [member.id, { status: saved?.status ?? "unmarked", note: saved?.note ?? "" }];
  })) as EntryState;
  const [entries, setEntries] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState(existing.length ? "Loaded saved attendance" : "Nothing saved yet");
  const unmarked = useMemo(() => Object.values(entries).filter((entry) => entry.status === "unmarked").length, [entries]);

  function updateStatus(memberId: string, status: AttendanceStatus) {
    setEntries((current) => ({ ...current, [memberId]: { ...current[memberId], status } }));
    setMessage("Unsaved changes");
  }

  function markEveryonePresent() {
    setEntries((current) => Object.fromEntries(Object.entries(current).map(([id, entry]) => [id, { ...entry, status: "present" }])) as EntryState);
    setMessage("Unsaved changes");
  }

  function submit() {
    if (unmarked) {
      setMessage(`Mark all ${unmarked} remaining member${unmarked === 1 ? "" : "s"} before saving.`);
      return;
    }
    const payload = members.map((member) => ({ member_id: member.id, status: entries[member.id].status as AttendanceStatus, note: entries[member.id].note }));
    startTransition(async () => {
      try {
        const result = await saveAttendance(practiceId, JSON.stringify(payload));
        setMessage(`Saved ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(result.savedAt))}`);
      } catch {
        setMessage("Attendance could not be saved. Check the connection and try again.");
      }
    });
  }

  return (
    <div className="attendance-board">
      <div className="board-toolbar">
        <button type="button" className="button button-secondary" onClick={markEveryonePresent}><Check size={17} />Mark everyone here</button>
        <div className="save-cluster">
          <span className={unmarked ? "save-note warning" : "save-note"}>{unmarked ? `${unmarked} unmarked` : message}</span>
          <button type="button" className="button button-primary" onClick={submit} disabled={pending || !members.length}>
            <Save size={17} />{pending ? "Saving…" : "Save attendance"}
          </button>
        </div>
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
                <button type="button" key={value} className={entries[member.id].status === value ? `selected ${value}` : value} onClick={() => updateStatus(member.id, value)}>
                  <Icon size={15} aria-hidden="true" />{label}
                </button>
              ))}
            </div>
            <input className="note-input" aria-label={`Note for ${member.name}`} placeholder="Add note…" value={entries[member.id].note}
              onChange={(event) => { setEntries((current) => ({ ...current, [member.id]: { ...current[member.id], note: event.target.value } })); setMessage("Unsaved changes"); }} />
          </section>
        ))}
      </div>
    </div>
  );
}
