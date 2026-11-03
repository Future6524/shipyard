import { CalendarDays, CircleDashed, Eye, Hammer, PackageCheck, Undo2, type LucideIcon } from "lucide-react";
import { avatarColor, dueState, initials } from "@/lib/format";
import { productColor } from "@/lib/palette";
import { STATUS_LABEL, type Release, type Status } from "@/lib/types";

export const STATUS_ICON: Record<Status, LucideIcon> = {
  PLANNED: CircleDashed,
  IN_PROGRESS: Hammer,
  IN_REVIEW: Eye,
  SHIPPED: PackageCheck,
  ROLLED_BACK: Undo2,
};

export function StatusPill({ status, size = "md" }: { status: Status; size?: "sm" | "md" }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={`pill pill-${size} st-${status.toLowerCase()}`}>
      <Icon aria-hidden size={size === "sm" ? 12 : 14} strokeWidth={2.5} />
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

export function Avatar({ name, size = 26 }: { name: string; size?: number }) {
  const { bg, fg } = avatarColor(name);
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4, background: bg, color: fg }} title={name} aria-hidden>
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

/** Circular progress for the checklist and on-time KPI. */
export function Ring({ value, size = 44, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${Math.round(value * 100)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className={`ring-fill ${value >= 1 ? "complete" : ""}`}
        strokeDasharray={`${c * Math.min(1, value)} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export function Due({ r }: { r: Pick<Release, "target_date" | "status"> }) {
  const d = dueState(r.target_date, r.status);
  return (
    <span className={`due due-${d.tone}`}>
      <CalendarDays aria-hidden size={13} strokeWidth={2.25} />
      {d.label}
    </span>
  );
}

/** A blurred iridescent orb, the signature motif. Purely decorative. */
export function Orb({ className = "", hue }: { className?: string; hue?: string }) {
  return <span className={`orb ${className}`} style={hue ? ({ "--orb-tint": hue } as React.CSSProperties) : undefined} aria-hidden />;
}

/** Word set half solid, half outlined, as in motion-graphics title cards. */
export function SplitWord({ solid, outline, as: Tag = "h1" }: { solid: string; outline: string; as?: "h1" | "h2" }) {
  return (
    <Tag className="split-word">
      <span className="solid">{solid}</span>
      <span className="outline">{outline}</span>
    </Tag>
  );
}
