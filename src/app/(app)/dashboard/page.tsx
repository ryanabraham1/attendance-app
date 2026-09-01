import Link from "next/link";
import { ArrowRight, CalendarPlus, CheckCircle2, ClipboardCheck, TriangleAlert, UserX, Users } from "lucide-react";
import { addPractice } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { getDashboardData } from "@/lib/db";
import { formatPracticeDate } from "@/lib/format";

export const metadata = { title: "Overview" };

export default async function DashboardPage() {
  const data = await getDashboardData();
  const latest = data.recentPractices[0];
  return <div className="page-wrap">
    <header className="page-header split-header"><div><p className="eyebrow">Lead overview</p><h1>Who needs a follow-up?</h1><p>Attendance exceptions first. Team-wide numbers second.</p></div><form action={addPractice}><SubmitButton pendingText="Starting…"><CalendarPlus size={17} />Start practice</SubmitButton></form></header>

    {data.counts.active_members === 0 ? <section className="empty-callout"><Users size={28} /><div><h2>Build your roster first</h2><p>Add team members, then create a practice and start checking people in.</p></div><Link href="/members" className="button button-secondary">Add members<ArrowRight size={16} /></Link></section> : <section className="stat-strip" aria-label="Team attendance summary">
      <div className="stat-primary"><span className="stat-value">{data.counts.team_rate}%</span><span><strong>team attendance</strong><small>Excused absences excluded</small></span></div>
      <div><Users size={18} /><span><strong>{data.counts.active_members}</strong><small>Active members</small></span></div>
      <div><ClipboardCheck size={18} /><span><strong>{data.counts.practices}</strong><small>Practices tracked</small></span></div>
      <div><UserX size={18} /><span><strong>{data.missing.length}</strong><small>Recent misses</small></span></div>
    </section>}

    <div className="dashboard-grid">
      <section className="panel exception-panel"><div className="panel-head"><div><p className="eyebrow"><TriangleAlert size={14} /> Attendance watch</p><h2>Members to check in with</h2></div><Link href="/reports">Full report<ArrowRight size={15} /></Link></div>
        {data.attention.length ? <div className="attention-list">{data.attention.map((member) => <article key={member.id}><span className="member-avatar">{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{member.name}</strong><small>{member.group_name}</small></div><div className="absence-count"><strong>{member.absences}</strong><small>missed</small></div><div className={`rate-chip ${member.rate < 75 ? "low" : ""}`}>{member.rate}%</div></article>)}</div> : <div className="panel-empty"><CheckCircle2 size={28} /><h3>No attendance concerns yet</h3><p>Members with missed practices will appear here.</p></div>}
      </section>

      <section className="panel"><div className="panel-head"><div><p className="eyebrow">Latest session</p><h2>{latest?.title ?? "No practices yet"}</h2></div>{latest && <Link href={`/check-in/${latest.id}`}>Open<ArrowRight size={15} /></Link>}</div>
        {latest ? <><p className="practice-time">{formatPracticeDate(latest.starts_at)}</p><div className="session-meter"><span style={{ width: `${data.counts.active_members ? Math.min(100, (latest.marked / data.counts.active_members) * 100) : 0}%` }} /></div><div className="session-counts"><span><i className="dot present" />{latest.present} here</span><span><i className="dot late" />{latest.late} late</span><span><i className="dot excused" />{latest.excused} excused</span><span><i className="dot absent" />{latest.absent} absent</span></div></> : <div className="panel-empty"><CalendarPlus size={28} /><h3>Create your first practice</h3><p>Each practice becomes a permanent attendance record.</p><Link href="/practices" className="button button-secondary">Create practice</Link></div>}
      </section>
    </div>

    <section className="panel full-panel"><div className="panel-head"><div><p className="eyebrow">Absence log</p><h2>What people missed</h2></div></div>
      {data.missing.length ? <div className="absence-table" role="table">{data.missing.map((item) => <div role="row" key={`${item.id}-${item.practice_id}`}><div><strong>{item.name}</strong><small>{item.group_name}</small></div><div><strong>{item.title}</strong><small>{formatPracticeDate(item.starts_at, true)}</small></div><p>{item.note || "No note added"}</p><span className="status-pill absent">Absent</span></div>)}</div> : <div className="table-empty">No unexcused absences have been recorded.</div>}
    </section>
  </div>;
}
