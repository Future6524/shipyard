import { dueState, initials } from "@/lib/format";
import { productColor } from "@/lib/palette";
import { STATUS_LABEL, type Release, type Status } from "@/lib/types";

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`pill st-${status.toLowerCase()}`}>
      <span className="pill-dot" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Products are append-only, so id order is stable and maps directly to a palette slot. */
export function ProductTag({ id, name }: { id: number; name: string }) {
  return (
    <span className="product-tag">
      <span className="swatch" style={{ background: productColor(id - 1) }} aria-hidden />
      {name}
    </span>
  );
}

export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }} title={name} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function Progress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="progress" title={`${done} of ${total} checklist items done`}>
      <div className="progress-track" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label="Checklist progress">
        <div className={`progress-fill ${pct === 100 ? "complete" : ""}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-label">
        {done}/{total}
      </span>
    </div>
  );
}

export function Due({ r }: { r: Pick<Release, "target_date" | "status"> }) {
  const d = dueState(r.target_date, r.status);
  return <span className={`due due-${d.tone}`}>{d.label}</span>;
}
