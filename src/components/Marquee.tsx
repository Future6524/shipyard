import { describeActivity, type Activity } from "@/lib/activity";
import { firstName } from "@/lib/format";

/** A ticker of recent audit entries. The second copy makes the CSS loop seamless. */
export function Marquee({ items }: { items: Activity[] }) {
  if (!items.length) return null;
  const line = items.map((a) => (
    <span key={a.id} className="marquee-item">
      <strong>{firstName(a.actor)}</strong> {describeActivity(a)} <em>{a.product_name} {a.version}</em>
    </span>
  ));
  return (
    <div className="marquee" aria-label="Recent activity">
      <div className="marquee-track">
        <div className="marquee-group">{line}</div>
        <div className="marquee-group" aria-hidden>
          {line}
        </div>
      </div>
    </div>
  );
}
