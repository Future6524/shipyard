import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Checklist } from "@/components/Checklist";
import { FileList, Timeline } from "@/components/Timeline";
import { Avatar, Due, ProductTag, StatusPill } from "@/components/ui";
import { daysBetween, fmtDate } from "@/lib/format";
import { getRelease } from "@/lib/releases";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getRelease(Number((await params).id));
  return { title: data ? `${data.release.product_name} ${data.release.version}` : "Release not found" };
}

export default async function ReleasePage({ params }: Props) {
  const data = await getRelease(Number((await params).id));
  if (!data) notFound();
  const { release: r, checklist, events, files } = data;
  const shipDays = r.first_shipped_at ? Math.round(daysBetween(r.started_at ?? r.created_at, r.first_shipped_at)) : null;

  return (
    <article>
      <Link href={r.status === "SHIPPED" ? "/changelog" : "/"} className="back">
        ← {r.status === "SHIPPED" ? "Changelog" : "Roadmap"}
      </Link>

      <header className="release-head">
        <div className="release-kicker">
          <ProductTag id={r.product_id} name={r.product_name} />
          <span className="version">v{r.version}</span>
          <StatusPill status={r.status} />
        </div>
        <h1>{r.title}</h1>
      </header>

      <dl className="meta">
        <div>
          <dt>Owner</dt>
          <dd className="owner">
            <Avatar name={r.owner} size={22} /> {r.owner}
          </dd>
        </div>
        <div>
          <dt>Target date</dt>
          <dd>
            {fmtDate(r.target_date)} {r.status !== "SHIPPED" && r.status !== "ROLLED_BACK" && <Due r={r} />}
          </dd>
        </div>
        <div>
          <dt>{r.status === "SHIPPED" ? "Shipped" : r.first_shipped_at ? "First shipped" : "Started"}</dt>
          <dd>{r.first_shipped_at ? fmtDate(r.shipped_at) : fmtDate(r.started_at)}</dd>
        </div>
        <div>
          <dt>Time to ship</dt>
          <dd>{shipDays != null ? `${shipDays} days` : "—"}</dd>
        </div>
      </dl>

      <div className="release-layout">
        <div className="release-main">
          <section className="card">
            <h2 className="card-title">About this release</h2>
            <div className="prose">
              {r.description.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">
              Timeline <span className="count">{events.length}</span>
            </h2>
            <Timeline events={events} />
          </section>
        </div>

        <aside className="release-side">
          <section className="card">
            <h2 className="card-title">
              Checklist{" "}
              <span className="count">
                {r.items_done}/{r.items_total}
              </span>
            </h2>
            {checklist.length ? <Checklist items={checklist} /> : <p className="muted">No checklist items.</p>}
          </section>
          {files.length > 0 && (
            <section className="card">
              <h2 className="card-title">
                Attachments <span className="count">{files.length}</span>
              </h2>
              <FileList files={files} />
            </section>
          )}
          <p className="fineprint">
            Created by {r.created_by} on {fmtDate(r.created_at)}. This page is generated from the release's audit log,
            which can only be appended to.
          </p>
        </aside>
      </div>
    </article>
  );
}
