import {
  ArrowRightLeft,
  CalendarClock,
  CheckCheck,
  CircleCheck,
  Download,
  ListPlus,
  MessageSquareQuote,
  Paperclip,
  RotateCcw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { fmtBytes, fmtDate } from "@/lib/format";
import type { ReleaseEvent, Status } from "@/lib/types";
import { Avatar, StatusPill } from "./ui";

const ICON: Record<ReleaseEvent["kind"], LucideIcon> = {
  CREATED: Sparkles,
  STATUS: ArrowRightLeft,
  CHECKED: CircleCheck,
  UNCHECKED: RotateCcw,
  ITEM_ADDED: ListPlus,
  OWNER: ArrowRightLeft,
  TARGET_DATE: CalendarClock,
  ATTACHMENT: Paperclip,
  NOTE: MessageSquareQuote,
};

const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
const time = (iso: string) => `${timeFmt.format(new Date(iso))} UTC`;

function Summary({ e }: { e: ReleaseEvent }) {
  const who = <strong>{e.actor}</strong>;
  switch (e.kind) {
    case "CREATED":
      return (
        <>
          {who} created the release, owned by <strong>{e.owner}</strong>
          {e.target_date && <>, targeting {fmtDate(e.target_date)}</>}
        </>
      );
    case "STATUS":
      return (
        <>
          {who} moved it {e.from_value && <StatusPill status={e.from_value as Status} size="sm" />}
          <span className="arrow" aria-hidden>
            →
          </span>
          <StatusPill status={e.status} size="sm" />
        </>
      );
    case "CHECKED":
      return (
        <>
          {who} ticked off <q>{e.item_label}</q>
        </>
      );
    case "UNCHECKED":
      return (
        <>
          {who} reopened <q>{e.item_label}</q>
        </>
      );
    case "ITEM_ADDED":
      return (
        <>
          {who} added checklist item <q>{e.item_label}</q>
        </>
      );
    case "OWNER":
      return (
        <>
          {who} reassigned it from {e.from_value} to <strong>{e.owner}</strong>
        </>
      );
    case "TARGET_DATE":
      return (
        <>
          {who} moved the target date {e.from_value ? <>from <s>{fmtDate(e.from_value)}</s> </> : null}to{" "}
          <strong>{e.target_date ? fmtDate(e.target_date) : "none"}</strong>
        </>
      );
    case "ATTACHMENT":
      return (
        <>
          {who} attached {e.files.length === 1 ? "a file" : `${e.files.length} files`}
        </>
      );
    case "NOTE":
      return <>{who} commented</>;
  }
}

type Row = { type: "event"; e: ReleaseEvent } | { type: "ticks"; actor: string; events: ReleaseEvent[] };

/**
 * Newest-first, grouped by day. Runs of checklist ticks by one person on one day fold into
 * a single expandable row; every underlying entry is still listed when expanded.
 */
function groupByDay(events: ReleaseEvent[]) {
  const days: { day: string; rows: Row[] }[] = [];
  for (const e of [...events].reverse()) {
    const day = dayFmt.format(new Date(e.created_at));
    if (days.at(-1)?.day !== day) days.push({ day, rows: [] });
    const rows = days.at(-1)!.rows;
    const prev = rows.at(-1);
    if (e.kind === "CHECKED") {
      if (prev?.type === "ticks" && prev.actor === e.actor) {
        prev.events.push(e);
        continue;
      }
      if (prev?.type === "event" && prev.e.kind === "CHECKED" && prev.e.actor === e.actor) {
        rows[rows.length - 1] = { type: "ticks", actor: e.actor, events: [prev.e, e] };
        continue;
      }
    }
    rows.push({ type: "event", e });
  }
  return days;
}

function Entry({ e }: { e: ReleaseEvent }) {
  const Icon = ICON[e.kind];
  return (
    <li className={`tl tl-${e.kind.toLowerCase()} ${e.kind === "STATUS" ? `tl-to-${e.status.toLowerCase()}` : ""}`}>
      <span className="tl-icon" aria-hidden>
        <Icon size={15} strokeWidth={2.5} />
      </span>
      <div className="tl-body">
        <div className="tl-line">
          <Avatar name={e.actor} size={22} />
          <span className="tl-text">
            <Summary e={e} />
          </span>
          <time className="tl-time" dateTime={e.created_at}>
            {time(e.created_at)}
          </time>
        </div>
        {e.note && <blockquote className="tl-note">{e.note}</blockquote>}
        {e.files.length > 0 && <FileList files={e.files} />}
      </div>
    </li>
  );
}

export function Timeline({ events }: { events: ReleaseEvent[] }) {
  return (
    <div className="timeline">
      {groupByDay(events).map(({ day, rows }) => (
        <section key={day} className="tl-day">
          <h3 className="tl-day-label">{day}</h3>
          <ol>
            {rows.map((row) =>
              row.type === "event" ? (
                <Entry key={row.e.id} e={row.e} />
              ) : (
                <li key={row.events[0].id} className="tl tl-checked tl-group">
                  <span className="tl-icon" aria-hidden>
                    <CheckCheck size={15} strokeWidth={2.5} />
                  </span>
                  <details className="tl-body">
                    <summary className="tl-line">
                      <Avatar name={row.actor} size={22} />
                      <span className="tl-text">
                        <strong>{row.actor}</strong> ticked off {row.events.length} items
                      </span>
                      <time className="tl-time" dateTime={row.events[0].created_at}>
                        {time(row.events.at(-1)!.created_at)}–{time(row.events[0].created_at)}
                      </time>
                    </summary>
                    <ul className="tl-sub">
                      {row.events.map((e) => (
                        <li key={e.id}>
                          <CircleCheck aria-hidden size={13} /> <q>{e.item_label}</q>
                          <time dateTime={e.created_at}>{time(e.created_at)}</time>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ),
            )}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function FileList({ files }: { files: ReleaseEvent["files"] }) {
  const images = files.filter((f) => f.mime.startsWith("image/"));
  const others = files.filter((f) => !f.mime.startsWith("image/"));
  return (
    <div className="files">
      {images.length > 0 && (
        <div className="thumbs">
          {images.map((f) => (
            <a key={f.id} href={`/api/files/${f.id}`} target="_blank" rel="noreferrer" className="thumb" title={f.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/files/${f.id}`} alt={f.name} loading="lazy" />
            </a>
          ))}
        </div>
      )}
      {others.map((f) => (
        <a key={f.id} href={`/api/files/${f.id}`} className="file-chip" download={f.name}>
          <Download aria-hidden size={14} strokeWidth={2.5} />
          <span className="file-name">{f.name}</span>
          <span className="muted">{fmtBytes(f.size)}</span>
        </a>
      ))}
    </div>
  );
}
