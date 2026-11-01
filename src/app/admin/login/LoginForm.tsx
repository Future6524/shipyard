"use client";

import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="form">
      <label className="field">
        <span>Your name</span>
        <input name="name" autoComplete="name" required maxLength={60} placeholder="Shown on every change you make" />
      </label>
      <label className="field">
        <span>Team password</span>
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      {state?.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
