import { fmtBytes, fmtDate, fmtDateTime } from "@/lib/format";
import type { ReleaseEvent, Status } from "@/lib/types";
import { Avatar, StatusPill } from "./ui";

const ICON: Record<ReleaseEvent["kind"], string> = {
  CREATED: "✦",
  STATUS: "→",
  CHECKED: "✓",
  UNCHECKED: "↺",
  ITEM_ADDED: "+",
  OWNER: "⇄",
  TARGET_DATE: "◷",
  ATTACHMENT: "⎙",
  NOTE: "❝",
};

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
          {who} moved it {e.from_value && <StatusPill status={e.from_value as Status} />} → <StatusPill status={e.status} />
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

/** The release's audit log, newest first. Entries are rendered exactly as recorded. */
export function Timeline({ events }: { events: ReleaseEvent[] }) {
  return (
    <ol className="timeline">
      {[...events].reverse().map((e) => (
        <li key={e.id} className={`tl tl-${e.kind.toLowerCase()} ${e.kind === "STATUS" ? `tl-to-${e.status.toLowerCase()}` : ""}`}>
          <span className="tl-icon" aria-hidden>
            {ICON[e.kind]}
          </span>
          <div className="tl-body">
            <div className="tl-line">
              <Avatar name={e.actor} size={20} />
              <span className="tl-text">
                <Summary e={e} />
              </span>
              <time className="tl-time" dateTime={e.created_at} title={fmtDateTime(e.created_at)}>
                {fmtDateTime(e.created_at)}
              </time>
            </div>
            {e.note && <p className="tl-note">{e.note}</p>}
            {e.files.length > 0 && <FileList files={e.files} />}
          </div>
        </li>
      ))}
    </ol>
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
          <span aria-hidden>📄</span> {f.name} <span className="muted">{fmtBytes(f.size)}</span>
        </a>
      ))}
    </div>
  );
}

