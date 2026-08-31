import { redirect } from "next/navigation";
import { ClipboardCheck, LockKeyhole } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { isLead } from "@/lib/auth";

export const metadata = { title: "Lead sign in" };

export default async function LoginPage() {
  if (await isLead()) redirect("/dashboard");
  return <main className="login-page">
    <section className="login-panel">
      <div className="brand login-brand"><span className="brand-mark"><ClipboardCheck size={22} /></span><span><strong>PITBOARD</strong><small>TEAM 3256</small></span></div>
      <div className="login-copy"><p className="eyebrow"><LockKeyhole size={14} /> Leads only</p><h1>Take attendance.<br /><span>See who needs you.</span></h1><p>One place for the roster, every practice, and the absences that need a follow-up.</p></div>
      <LoginForm />
      <p className="login-foot">Members do not need accounts. A lead checks everyone in.</p>
    </section>
    <aside className="login-rail" aria-label="How Pitboard works">
      <div className="rail-track"><span className="rail-light on" /><span className="rail-light on" /><span className="rail-light off" /><span className="rail-light on" /></div>
      <div><span className="rail-index">01</span><strong>Open a practice</strong><p>Create today’s build, drive, or business session.</p></div>
      <div><span className="rail-index">02</span><strong>Mark the roster</strong><p>Present, late, excused, or absent—in a few taps.</p></div>
      <div><span className="rail-index">03</span><strong>Follow the exceptions</strong><p>See missed practices and attendance rates without a spreadsheet.</p></div>
    </aside>
  </main>;
}

