import { Check, Undo2 } from "lucide-react";
import { fmtShort } from "@/lib/format";
import { STATUS_LABEL, type ReleaseEvent, type Status } from "@/lib/types";
import { STATUS_ICON } from "./ui";

const PATH: Status[] = ["PLANNED", "IN_PROGRESS", "IN_REVIEW", "SHIPPED"];

/** The release's position on the happy path, dated from the audit log. */
export function StatusStepper({ status, events }: { status: Status; events: ReleaseEvent[] }) {
  // Latest time each status was entered (a rollback can send a release round the loop again).
  const enteredAt = new Map<Status, string>();
  for (const e of events) {
    if (e.kind === "CREATED") enteredAt.set("PLANNED", e.created_at);
    if (e.kind === "STATUS") enteredAt.set(e.status, e.created_at);
  }
  const rolledBack = status === "ROLLED_BACK";
  const current = rolledBack ? PATH.length : PATH.indexOf(status);
  const rollbacks = events.filter((e) => e.kind === "STATUS" && e.status === "ROLLED_BACK");

  return (
    <ol className="stepper" aria-label="Release progress">
      {PATH.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        const Icon = state === "done" ? Check : STATUS_ICON[s];
        return (
          <li key={s} className={`step step-${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="step-dot">
              <Icon aria-hidden size={16} strokeWidth={2.75} />
            </span>
            <span className="step-label">{STATUS_LABEL[s]}</span>
            <span className="step-date">{state !== "todo" && enteredAt.get(s) ? fmtShort(enteredAt.get(s)!) : "—"}</span>
          </li>
        );
      })}
      {rollbacks.length > 0 && (
        <li className={`step step-rollback ${rolledBack ? "step-current" : "step-past"}`}>
          <span className="step-dot">
            <Undo2 aria-hidden size={16} strokeWidth={2.75} />
          </span>
          <span className="step-label">{rolledBack ? "Rolled back" : `Rolled back ×${rollbacks.length}`}</span>
          <span className="step-date">{fmtShort(rollbacks.at(-1)!.created_at)}</span>
        </li>
      )}
    </ol>
  );
}
