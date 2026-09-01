import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { isLead } from "@/lib/auth";

export const metadata = { title: "Lead sign in" };

export default async function LoginPage() {
  if (await isLead()) redirect("/dashboard");
  return <main className="login-page">
    <section className="login-panel">
      <p className="login-kicker">Team 3256</p>
      <h1>Enter the code</h1>
      <LoginForm />
    </section>
  </main>;
}
