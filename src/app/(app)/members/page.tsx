import { UserMinus, UserPlus } from "lucide-react";
import { addMember, changeMemberStatus } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { listMembers } from "@/lib/db";

export const metadata = { title: "Members" };

export default async function MembersPage() {
  const members = await listMembers(true);
  return <div className="page-wrap"><header className="page-header"><p className="eyebrow">Roster</p><h1>Team members</h1><p>Only active members appear on new practice check-in sheets.</p></header><div className="two-column">
    <section className="panel form-panel"><div className="panel-head"><div><p className="eyebrow"><UserPlus size={14} /> Add member</p><h2>Grow the roster</h2></div></div><form action={addMember} className="stack-form"><label>Full name<input name="name" required placeholder="Jordan Lee" /></label><label>Subteam<input name="group" required placeholder="Design, Build, Software…" /></label><label>Role<input name="role" required placeholder="Member, lead, mentor…" /></label><SubmitButton pendingText="Adding…"><UserPlus size={17} />Add member</SubmitButton></form></section>
    <section className="panel roster-panel"><div className="panel-head"><div><p className="eyebrow">{members.filter((member) => member.active).length} active</p><h2>Current roster</h2></div></div>{members.length ? <div className="member-list">{members.map((member) => <article key={member.id} className={!member.active ? "inactive" : ""}><span className="member-avatar">{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{member.name}</strong><small>{member.group_name} · {member.role}</small></div><form action={changeMemberStatus}><input type="hidden" name="id" value={member.id} /><input type="hidden" name="active" value={String(!member.active)} /><button className="icon-text-button" type="submit">{member.active ? <><UserMinus size={15} />Archive</> : <><UserPlus size={15} />Restore</>}</button></form></article>)}</div> : <div className="panel-empty"><UserPlus size={28} /><h3>No members yet</h3><p>Add the first person using the form.</p></div>}</section>
  </div></div>;
}
