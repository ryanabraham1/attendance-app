import { ArrowRightLeft, CalendarCheck2, Settings2, UserMinus, UserPlus, Users } from "lucide-react";
import { addMember, changeMemberGroup, changeMemberStatus } from "@/app/actions";
import { AttendanceBoard } from "@/components/attendance-board";
import { SubmitButton } from "@/components/submit-button";
import { requireLead, scopedGroup } from "@/lib/auth";
import { getAttendanceForPractice, getTodayPractice, listMembers } from "@/lib/db";
import { ROSTER_GROUPS } from "@/lib/types";

export const metadata = { title: "Check in" };

export default async function MembersPage() {
  const session = await requireLead();
  const group = scopedGroup(session);
  const [members, today] = await Promise.all([
    listMembers(true, group),
    getTodayPractice(),
  ]);
  const activeMembers = members.filter((member) => member.active);
  const existing = today ? await getAttendanceForPractice(today.id, group) : [];
  const here = existing.filter((entry) => entry.status === "present" || entry.status === "late").length;

  return <div className="page-wrap checkin-page today-page">
    <header className="page-header today-header">
      <div>
        <p className="eyebrow"><CalendarCheck2 size={14} /> Today&apos;s attendance</p>
        <h1>{group ? `${group} check-in` : "Who’s here today?"}</h1>
        <p>Tap <strong>Here</strong> as people arrive. Today&apos;s meeting starts automatically on the first tap.</p>
      </div>
      <div className={`today-tally ${today ? "active" : ""}`} aria-label={`${here} of ${activeMembers.length} members here`}>
        <strong>{here}</strong><span>of {activeMembers.length}<small>{today ? "here today" : "waiting to start"}</small></span>
      </div>
    </header>

    {activeMembers.length ? <AttendanceBoard
      practiceId={today?.id}
      members={activeMembers}
      existing={existing}
      todayMode
    /> : <section className="empty-callout"><Users size={28} /><div><h2>{group ? `No active ${group} members` : "Your roster is empty"}</h2><p>Add someone below, then tap Here when they arrive.</p></div></section>}

    <details className="roster-settings">
      <summary><span><Settings2 size={17} />Manage roster</span><small>Add, remove, restore, or reassign members</small></summary>
      <div className="roster-settings-grid">
        <section className="panel form-panel">
          <div className="panel-head"><div><p className="eyebrow"><UserPlus size={14} /> New member</p><h2>Add someone</h2></div></div>
          <form action={addMember} className="stack-form">
            <label>Full name<input name="name" required placeholder="Jordan Lee" autoComplete="off" /></label>
            {group ? <><input type="hidden" name="group" value={group} /><label>Group<input value={group} readOnly /></label></> : <label>Group<select name="group" required defaultValue="Unassigned">{ROSTER_GROUPS.map((groupName) => <option key={groupName} value={groupName}>{groupName}</option>)}</select></label>}
            <label>Role<input name="role" required placeholder="Member, lead, mentor…" /></label>
            <SubmitButton pendingText="Adding…"><UserPlus size={17} />Add member</SubmitButton>
          </form>
        </section>
        <section className="panel roster-panel">
          <div className="panel-head"><div><p className="eyebrow">{activeMembers.length} active</p><h2>Team roster</h2></div></div>
          {members.length ? <div className="member-list">{members.map((member) => <article key={member.id} className={!member.active ? "inactive" : ""}>
            <div className="member-identity"><span className="member-avatar">{member.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{member.name}</strong><small>{member.group_name} · {member.role}</small></div></div>
            {session.role === "admin" && member.active ? <form action={changeMemberGroup} className="group-assignment-form">
              <input type="hidden" name="id" value={member.id} />
              <label><span className="sr-only">Group for {member.name}</span><select name="group" defaultValue={member.group_name}>{ROSTER_GROUPS.map((groupName) => <option key={groupName} value={groupName}>{groupName}</option>)}</select></label>
              <SubmitButton className="group-save-button" pendingText="Saving…"><ArrowRightLeft size={14} />Move</SubmitButton>
            </form> : null}
            <form action={changeMemberStatus} className="member-status-form"><input type="hidden" name="id" value={member.id} /><input type="hidden" name="active" value={String(!member.active)} /><SubmitButton className={`icon-text-button ${member.active ? "remove" : "restore"}`} pendingText={member.active ? "Removing…" : "Restoring…"}>{member.active ? <><UserMinus size={15} />Remove</> : <><UserPlus size={15} />Restore</>}</SubmitButton></form>
          </article>)}</div> : <div className="panel-empty"><UserPlus size={28} /><h3>No members yet</h3><p>Add the first person using the form.</p></div>}
          <p className="roster-footnote">Removed members stay in attendance history and can be restored at any time.</p>
        </section>
      </div>
    </details>
  </div>;
}
