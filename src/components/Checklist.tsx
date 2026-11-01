import { fmtDate } from "@/lib/format";
import type { ChecklistItem } from "@/lib/types";

/** Read-only checklist. The admin page renders its own toggleable version. */
export function Checklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="checklist">
      {items.map((it) => (
        <li key={it.id} className={it.done ? "done" : ""}>
          <span className="box" aria-hidden>
            {it.done ? "✓" : ""}
          </span>
          <span className="sr-only">{it.done ? "Done: " : "Open: "}</span>
          <span className="label">
            {it.label}
            {it.done && it.toggled_by && (
              <span className="by">
                {it.toggled_by} · {fmtDate(it.toggled_at)}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
