"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { login, type LoginState } from "@/app/actions";

const initialState: LoginState = { error: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  return (
    <form action={action} className="login-form">
      <label className="sr-only" htmlFor="code">Access code</label>
      <input className="code-input" id="code" name="code" type="password" inputMode="numeric" autoComplete="current-password" required autoFocus placeholder="Code" />
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="button button-primary button-wide" disabled={pending}>
        {pending ? "Checking…" : "Enter"}<ArrowRight aria-hidden="true" size={20} />
      </button>
    </form>
  );
}
