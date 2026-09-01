import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { isLead } from "@/lib/auth";

export const metadata = { title: "Lead sign in" };

export default async function LoginPage() {
  if (await isLead()) redirect("/members");
  return <main className="login-page">
    <section className="login-panel">
      <p className="login-kicker">Team 3256</p>
      <h1>Pick your crew</h1>
      <p className="login-intro">Choose your group, enter the lead code, and start marking arrivals.</p>
      <LoginForm />
    </section>
  </main>;
}
