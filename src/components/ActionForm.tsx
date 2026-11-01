"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/app/admin/actions";

interface Props {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  children: ReactNode;
  submit: ReactNode;
  className?: string;
  submitClass?: string;
  success?: string;
}

/** Wraps a server-action form with pending, error and success feedback. */
export function ActionForm({ action, children, submit, className = "form", submitClass = "btn btn-primary", success }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      {success && state?.ok && !pending && (
        <p className="success" role="status">
          {success}
        </p>
      )}
      <button className={submitClass} disabled={pending}>
        {pending ? "Saving…" : submit}
      </button>
    </form>
  );
}
