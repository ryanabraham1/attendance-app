"use client";

import { useActionState, useState } from "react";
import { ArrowRight } from "lucide-react";
import { login, type LoginState } from "@/app/actions";
import { LEAD_GROUPS } from "@/lib/types";

const initialState: LoginState = { error: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  const [selectedGroup, setSelectedGroup] = useState("");
  return (
    <form action={action} className="login-form">
      <fieldset className="scope-picker">
        <legend>Roster</legend>
        <div>
          {LEAD_GROUPS.map((group) => <label key={group}>
            <input name="group" type="radio" value={group} required checked={selectedGroup === group} onChange={() => setSelectedGroup(group)} />
            <span>{group}</span>
          </label>)}
          <label className="all-team-option">
            <input name="group" type="radio" value="all" required checked={selectedGroup === "all"} onChange={() => setSelectedGroup("all")} />
            <span>All team <small>Admin view</small></span>
          </label>
        </div>
      </fieldset>
      <label className="sr-only" htmlFor="code">Access code</label>
      <input className="code-input" id="code" name="code" type="password" inputMode="numeric" autoComplete="current-password" required placeholder="Shared lead code" />
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="button button-primary button-wide" disabled={pending}>
        {pending ? "Opening…" : "Open roster"}<ArrowRight aria-hidden="true" size={20} />
      </button>
    </form>
  );
}
