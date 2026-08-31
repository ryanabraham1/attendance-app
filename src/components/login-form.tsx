"use client";

import { useActionState } from "react";
import { ArrowRight, KeyRound } from "lucide-react";
import { login, type LoginState } from "@/app/actions";

const initialState: LoginState = { error: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  return (
    <form action={action} className="login-form">
      <label htmlFor="code">Lead access code</label>
      <div className="code-field">
        <KeyRound aria-hidden="true" size={19} />
        <input id="code" name="code" type="password" autoComplete="current-password" required autoFocus placeholder="Enter team code" />
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="button button-primary button-wide" disabled={pending}>
        {pending ? "Checking…" : "Open pit board"}<ArrowRight aria-hidden="true" size={18} />
      </button>
    </form>
  );
}

