import Link from "next/link";
import { ArrowRight, CalendarPlus, ClipboardCheck } from "lucide-react";
import { addPractice } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { listPractices } from "@/lib/db";
import { requireLead, scopedGroup } from "@/lib/auth";
import { formatPracticeDate } from "@/lib/format";

export const metadata = { title: "Practices" };

export default async function PracticesPage() {
  const session = await requireLead();
  const group = scopedGroup(session);
  const practices = await listPractices();
  return <div className="page-wrap"><header className="page-header"><p className="eyebrow">{group ? `${group} session log` : "Session log"}</p><h1>Practices</h1><p>{group ? `Open a practice to check in only your ${group} members.` : "Start now or reopen an earlier practice."}</p></header><div className="two-column">
    <section className="panel quick-start-panel"><CalendarPlus size={28} /><p className="eyebrow">New practice</p><h2>Ready when you are.</h2><p>{group ? `This check-in will show only the ${group} roster.` : "The active roster starts absent. Tap Here as each person arrives."}</p><form action={addPractice}><SubmitButton className="button button-primary start-practice-button" pendingText="Starting…"><ClipboardCheck size={19} />Start practice</SubmitButton></form></section>
    <section className="panel roster-panel"><div className="panel-head"><div><p className="eyebrow">{practices.length} total</p><h2>Practice history</h2></div></div>{practices.length ? <div className="practice-list">{practices.map((practice) => <Link href={`/check-in/${practice.id}`} key={practice.id}><span className="practice-date"><strong>{new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", day: "2-digit" }).format(new Date(practice.starts_at))}</strong><small>{new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short" }).format(new Date(practice.starts_at)).toUpperCase()}</small></span><span><strong>{practice.title}</strong><small>{formatPracticeDate(practice.starts_at)}</small></span><ArrowRight size={17} /></Link>)}</div> : <div className="panel-empty"><CalendarPlus size={28} /><h3>No practices yet</h3><p>Tap Start practice when the team begins.</p></div>}</section>
  </div></div>;
}
