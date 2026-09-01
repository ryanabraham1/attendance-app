import { BarChart3, Check, Clock3, Download, ShieldCheck, UserX } from "lucide-react";
import { getMemberReports } from "@/lib/db";
import { requireLead, scopedGroup } from "@/lib/auth";
import { formatPracticeDate } from "@/lib/format";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const session = await requireLead();
  const group = scopedGroup(session);
  const reports = await getMemberReports(group);
  return <div className="page-wrap"><header className="page-header split-header"><div><p className="eyebrow">{group ? `${group} attendance` : "Attendance analysis"}</p><h1>{group ? `${group} reports` : "Member reports"}</h1><p>Rates count present and late as attended. Excused practices do not affect the percentage.</p></div><a className="button button-secondary" href="/reports/export"><Download size={17} />Export Excel</a></header><section className="panel report-panel">
    {reports.length ? <div className="report-list">{reports.map((member) => <details key={member.id} className={member.rate < 75 ? "at-risk" : ""}><summary><span className="member-avatar">{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span className="report-person"><strong>{member.name}</strong><small>{member.group_name} · {member.role}</small></span><span className="mini-stat"><Check size={14} /><strong>{member.present}</strong><small>here</small></span><span className="mini-stat"><Clock3 size={14} /><strong>{member.late}</strong><small>late</small></span><span className="mini-stat"><ShieldCheck size={14} /><strong>{member.excused}</strong><small>excused</small></span><span className="mini-stat"><UserX size={14} /><strong>{member.absent}</strong><small>missed</small></span><span className={`report-rate ${member.rate < 75 ? "low" : ""}`}><strong>{member.rate}%</strong><small>attendance</small></span></summary><div className="report-detail"><h3>Missed and late practices</h3>{member.exceptions.length ? member.exceptions.map((item, index) => <div className="report-exception" key={`${item.title}-${index}`}><span className={`status-pill ${item.status}`}>{item.status}</span><div><strong>{item.title}</strong><small>{formatPracticeDate(item.starts_at)}</small></div><p>{item.note || "No note added"}</p></div>) : <p className="all-clear">No missed or late practices recorded.</p>}</div></details>)}</div> : <div className="panel-empty"><BarChart3 size={30} /><h3>No report data yet</h3><p>Save attendance for a practice to generate member reports.</p></div>}
  </section></div>;
}
