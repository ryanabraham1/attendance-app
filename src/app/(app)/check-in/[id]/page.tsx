import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { AttendanceBoard } from "@/components/attendance-board";
import { requireLead, scopedGroup } from "@/lib/auth";
import { getAttendanceForPractice, getPractice, listMembers } from "@/lib/db";
import { formatPracticeDate } from "@/lib/format";

export default async function CheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireLead();
  const group = scopedGroup(session);
  const [practice, members, existing] = await Promise.all([getPractice(id), listMembers(false, group), getAttendanceForPractice(id, group)]);
  if (!practice) notFound();
  return <div className="page-wrap checkin-page"><header className="page-header split-header"><div><Link className="back-link" href="/practices"><ArrowLeft size={15} />All practices</Link><p className="eyebrow"><ClipboardCheck size={14} /> {group ? `${group} check-in` : "Attendance sheet"}</p><h1>{practice.title}</h1><p>{formatPracticeDate(practice.starts_at)}{group ? ` · ${group} only` : ""}</p></div><div className="sheet-id"><small>SESSION ID</small><strong>{practice.id.slice(0, 8).toUpperCase()}</strong></div></header>{members.length ? <AttendanceBoard practiceId={practice.id} members={members} existing={existing} /> : <section className="empty-callout"><div><h2>{group ? `No active ${group} members` : "The roster is empty"}</h2><p>Add active members before taking attendance.</p></div><Link className="button button-primary" href="/members">Add members</Link></section>}</div>;
}
