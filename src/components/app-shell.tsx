import Link from "next/link";
import { BarChart3, CalendarDays, ClipboardCheck, LogOut, Users } from "lucide-react";
import { logout } from "@/app/actions";
import type { LeadSession } from "@/lib/auth";

const links = [
  { href: "/members", label: "Check in", icon: Users },
  { href: "/practices", label: "History", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function AppShell({ children, session }: { children: React.ReactNode; session: LeadSession }) {
  const sessionLabel = session.role === "admin" ? "All-team admin" : `${session.group} lead`;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/members" className="brand" aria-label="Open check-in">
          <span className="brand-mark"><ClipboardCheck size={22} /></span>
          <span><strong>ATTENDANCE</strong><small>TEAM 3256</small></span>
        </Link>
        <nav aria-label="Main navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link href={href} key={href}><Icon size={18} aria-hidden="true" /><span>{label}</span></Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <p><span className="live-dot" />{sessionLabel}</p>
          <form action={logout}><button type="submit"><LogOut size={16} />Sign out</button></form>
        </div>
      </aside>
      <main className="app-main">{children}</main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map(({ href, label, icon: Icon }) => (
          <Link href={href} key={href}><Icon size={19} aria-hidden="true" /><span>{label}</span></Link>
        ))}
      </nav>
    </div>
  );
}
