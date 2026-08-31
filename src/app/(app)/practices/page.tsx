import Link from "next/link";
import { ArrowRight, CalendarPlus, ClipboardCheck } from "lucide-react";
import { addPractice } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { listPractices } from "@/lib/db";
import { formatPracticeDate } from "@/lib/format";

export const metadata = { title: "Practices" };

function defaultDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export default async function PracticesPage() {
  const practices = await listPractices();
  return <div className="page-wrap"><header className="page-header"><p className="eyebrow">Session log</p><h1>Practices</h1><p>Create a session, then open its roster to take attendance.</p></header><div className="two-column">
    <section className="panel form-panel"><div className="panel-head"><div><p className="eyebrow"><CalendarPlus size={14} /> New practice</p><h2>Start a session</h2></div></div><form action={addPractice} className="stack-form"><label>Practice name<input name="title" required placeholder="Monday build practice" /></label><label>Date and time <small>Pacific Time</small><input name="startsAt" type="datetime-local" required defaultValue={defaultDate()} /></label><label>Focus <small>Optional</small><input name="focus" placeholder="Drivetrain assembly and CAD review" /></label><SubmitButton pendingText="Creating…"><ClipboardCheck size={17} />Create and take attendance</SubmitButton></form></section>
    <section className="panel roster-panel"><div className="panel-head"><div><p className="eyebrow">{practices.length} total</p><h2>Practice history</h2></div></div>{practices.length ? <div className="practice-list">{practices.map((practice) => <Link href={`/check-in/${practice.id}`} key={practice.id}><span className="practice-date"><strong>{new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", day: "2-digit" }).format(new Date(practice.starts_at))}</strong><small>{new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short" }).format(new Date(practice.starts_at)).toUpperCase()}</small></span><span><strong>{practice.title}</strong><small>{formatPracticeDate(practice.starts_at)} · {practice.focus || "General practice"}</small></span><ArrowRight size={17} /></Link>)}</div> : <div className="panel-empty"><CalendarPlus size={28} /><h3>No practices yet</h3><p>Create the first session using the form.</p></div>}</section>
  </div></div>;
}

