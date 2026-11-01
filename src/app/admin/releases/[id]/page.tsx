import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { FileInput } from "@/components/FileInput";
import { Timeline } from "@/components/Timeline";
import { Due, ProductTag, Progress, StatusPill } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { getRelease } from "@/lib/releases";
import { requireAdmin } from "@/lib/session";
import { STATUS_LABEL, TRANSITIONS } from "@/lib/types";
import { changeAction } from "../../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">) {
  const data = await getRelease(Number((await params).id));
  return { title: data ? `Manage ${data.release.product_name} ${data.release.version}` : "Release not found" };
}

const MOVE_LABEL: Record<string, string> = {
  "PLANNED>IN_PROGRESS": "Start work",
  "IN_PROGRESS>IN_REVIEW": "Send to review",
  "IN_PROGRESS>PLANNED": "Move back to planned",
  "IN_REVIEW>SHIPPED": "Ship it",
  "IN_REVIEW>IN_PROGRESS": "Send back to in progress",
  "SHIPPED>ROLLED_BACK": "Roll back",
  "ROLLED_BACK>IN_PROGRESS": "Resume work",
};

export default async function AdminReleasePage({ params, searchParams }: Props) {
  await requireAdmin();
  const data = await getRelease(Number((await params).id));
  if (!data) notFound();
  const { created } = await searchParams;
  const { release: r, checklist, events } = data;
  const moves = TRANSITIONS[r.status];
  const open = r.items_total - r.items_done;
  const locked = r.status === "SHIPPED";
  const hidden = (kind: string) => (
    <>
      <input type="hidden" name="releaseId" value={r.id} />
      <input type="hidden" name="kind" value={kind} />
    </>
  );

  return (
    <>
      <Link href="/admin" className="back">
        ← Releases
      </Link>
      <header className="release-head">
        <div className="release-kicker">
          <ProductTag id={r.product_id} name={r.product_name} />
          <span className="version">v{r.version}</span>
          <StatusPill status={r.status} />
          <span className="spacer" />
          <Link href={`/releases/${r.id}`} className="btn btn-ghost btn-sm">
            Public page ↗
          </Link>
        </div>
        <h1>{r.title}</h1>
      </header>
      {created && <p className="alert alert-ok">Release created. It&apos;s now on the public roadmap as Planned.</p>}

      <div className="admin-release">
        <div className="admin-controls">
          <section className="card">
            <h2 className="card-title">Status</h2>
            <ActionForm action={changeAction} submit="Update status" key={`s-${events.length}`}>
              {hidden("STATUS")}
              <div className="moves" role="radiogroup" aria-label="New status">
                {moves.map((to, i) => (
                  <label key={to} className="move">
                    <input type="radio" name="to" value={to} defaultChecked={i === 0} />
                    <span>
                      {MOVE_LABEL[`${r.status}>${to}`] ?? STATUS_LABEL[to]}
                      <span className="muted small"> → {STATUS_LABEL[to]}</span>
                    </span>
                  </label>
                ))}
              </div>
              {moves.includes("SHIPPED") && open > 0 && (
                <label className="override">
                  <input type="checkbox" name="override" />
                  <span>
                    Ship with {open} open checklist item{open === 1 ? "" : "s"}. This is noted in the audit log.
                  </span>
                </label>
              )}
              <label className="field">
                <span>{moves.includes("ROLLED_BACK") ? "Reason (required for rollbacks)" : "Note (optional)"}</span>
                <textarea name="note" rows={2} />
              </label>
            </ActionForm>
          </section>

          <section className="card">
            <h2 className="card-title">
              Checklist <Progress done={r.items_done} total={r.items_total} />
            </h2>
            {locked && <p className="muted small">The checklist is locked once a release ships.</p>}
            <ul className="checklist admin-checklist">
              {checklist.map((it) => (
                <li key={it.id} className={it.done ? "done" : ""}>
                  {locked ? (
                    <span className="check-static">
                      <span className="box" aria-hidden>{it.done ? "✓" : ""}</span>
                      <span className="label">{it.label}</span>
                    </span>
                  ) : (
                    <ActionForm
                      action={changeAction}
                      className="toggle-form"
                      submitClass="check-btn"
                      submit={
                        <>
                          <span className="box" aria-hidden>{it.done ? "✓" : ""}</span>
                          <span className="label">
                            <span className="sr-only">{it.done ? "Reopen: " : "Mark done: "}</span>
                            {it.label}
                          </span>
                        </>
                      }
                    >
                      {hidden("TOGGLE")}
                      <input type="hidden" name="itemId" value={it.id} />
                      <input type="hidden" name="done" value={it.done ? "0" : "1"} />
                    </ActionForm>
                  )}
                  {it.done && it.toggled_by && (
                    <span className="by">
                      {it.toggled_by} · {fmtDate(it.toggled_at)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {!locked && (
              <ActionForm action={changeAction} className="inline-form" submit="Add" submitClass="btn btn-ghost btn-sm" key={`i-${events.length}`}>
                {hidden("ITEM_ADDED")}
                <input name="label" placeholder="New checklist item" maxLength={140} required aria-label="New checklist item" />
              </ActionForm>
            )}
          </section>

          <section className="card">
            <h2 className="card-title">Owner and target date</h2>
            <ActionForm action={changeAction} className="inline-form" submit="Reassign" submitClass="btn btn-ghost btn-sm" key={`o-${events.length}`}>
              {hidden("OWNER")}
              <label className="field grow">
                <span>Owner</span>
                <input name="owner" defaultValue={r.owner} required maxLength={60} />
              </label>
            </ActionForm>
            <ActionForm action={changeAction} className="inline-form" submit="Change date" submitClass="btn btn-ghost btn-sm" key={`d-${events.length}`}>
              {hidden("TARGET_DATE")}
              <label className="field grow">
                <span>
                  Target date <Due r={r} />
                </span>
                <input type="date" name="targetDate" defaultValue={r.target_date ?? ""} />
              </label>
            </ActionForm>
          </section>

          <section className="card">
            <h2 className="card-title">Comment or attach files</h2>
            <ActionForm action={changeAction} submit="Add to timeline" key={`n-${events.length}`}>
              {hidden("NOTE")}
              <label className="field">
                <span>Comment</span>
                <textarea name="note" rows={3} />
              </label>
              <FileInput />
            </ActionForm>
          </section>
        </div>

        <section className="card">
          <h2 className="card-title">
            Audit log <span className="count">{events.length}</span>
          </h2>
          <p className="muted small log-hint">Entries are permanent. Corrections are made by adding a new entry.</p>
          <Timeline events={events} />
        </section>
      </div>
    </>
  );
}
