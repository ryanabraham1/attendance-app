import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { listPractices } from "@/lib/db";
import { requireLead, scopedGroup } from "@/lib/auth";
import { formatPracticeDate, pacificDateKey } from "@/lib/format";
import { DeletePracticeButton } from "@/components/delete-practice-button";

export const metadata = { title: "Practices" };

export default async function PracticesPage() {
  const session = await requireLead();
  const group = scopedGroup(session);
  const practices = await listPractices();
  const today = pacificDateKey();
  return <div className="page-wrap"><header className="page-header"><p className="eyebrow">{group ? `${group} history` : "Attendance history"}</p><h1>Past meetings</h1><p>One attendance record per day. Open any day to review or correct it.</p></header>
    <section className="panel roster-panel"><div className="panel-head"><div><p className="eyebrow">{practices.length} meeting{practices.length === 1 ? "" : "s"}</p><h2>Meeting history</h2>{session.role === "admin" && <p className="panel-help">Deleting a past meeting also deletes its attendance records.</p>}</div></div>{practices.length ? <div className="practice-list">{practices.map((practice) => <article key={practice.id}><Link href={`/check-in/${practice.id}`}><span className="practice-date"><strong>{new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", day: "2-digit" }).format(new Date(practice.starts_at))}</strong><small>{new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short" }).format(new Date(practice.starts_at)).toUpperCase()}</small></span><span><strong>{practice.title}</strong><small>{formatPracticeDate(practice.starts_at)}</small></span><ArrowRight size={17} /></Link>{session.role === "admin" && pacificDateKey(practice.starts_at) < today && <DeletePracticeButton id={practice.id} meetingTitle={`${practice.title} on ${formatPracticeDate(practice.starts_at)}`} />}</article>)}</div> : <div className="panel-empty"><CalendarDays size={28} /><h3>No meetings yet</h3><p>The first one starts when you mark someone here.</p></div>}</section>
  </div>;
}
