import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Checklist } from "@/components/Checklist";
import { StatusStepper } from "@/components/StatusStepper";
import { FileList, Timeline } from "@/components/Timeline";
import { Avatar, Due, Orb, ProductTag, Ring, StatusPill } from "@/components/ui";
import { daysBetween, fmtDate } from "@/lib/format";
import { productColor } from "@/lib/palette";
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
  const firstTarget = events.find((e) => e.kind === "CREATED")?.target_date ?? null;
  const slipped = firstTarget && r.target_date && firstTarget !== r.target_date;
  const cover = r.cover_file_id;
  const accent = productColor(r.product_id - 1);

  return (
    <article style={{ "--accent": accent } as React.CSSProperties}>
      <section className="hero hero-release">
        <div className="hero-dark">
          <div className="dots" aria-hidden />
          <div className="hero-copy wrap-left reveal">
            <Link href={r.status === "SHIPPED" ? "/changelog" : "/"} className="back back-light">
              <ArrowLeft aria-hidden size={15} /> {r.status === "SHIPPED" ? "Changelog" : "Roadmap"}
            </Link>
            <div className="release-kicker">
              <ProductTag id={r.product_id} name={r.product_name} />
              <StatusPill status={r.status} />
            </div>
            <p className="version-xl" aria-label={`Version ${r.version}`}>
              v{r.version}
            </p>
            <h1 className="release-title">{r.title}</h1>
          </div>
        </div>
        <div className="hero-studio">
          <Orb className="orb-hero" hue={accent} />
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="float-shot reveal" src={`/api/files/${cover}`} alt={`${r.product_name} ${r.version} screenshot`} style={{ "--i": 2 } as React.CSSProperties} />
          ) : null}
        </div>
      </section>

      <div className="wrap section">
        <StatusStepper status={r.status} events={events} />

        <dl className="facts">
          <div className="fact reveal" style={{ "--i": 0 } as React.CSSProperties}>
            <dt>Owner</dt>
            <dd className="owner">
              <Avatar name={r.owner} size={30} /> {r.owner}
            </dd>
          </div>
          <div className="fact reveal" style={{ "--i": 1 } as React.CSSProperties}>
            <dt>Target date</dt>
            <dd>
              {fmtDate(r.target_date)}
              {slipped && <s className="slip">{fmtDate(firstTarget)}</s>}
              {r.status !== "SHIPPED" && r.status !== "ROLLED_BACK" && <Due r={r} />}
            </dd>
          </div>
          <div className="fact reveal" style={{ "--i": 2 } as React.CSSProperties}>
            <dt>{r.status === "SHIPPED" ? "Shipped" : r.first_shipped_at ? "First shipped" : "Started"}</dt>
            <dd>{r.first_shipped_at ? fmtDate(r.shipped_at) : fmtDate(r.started_at)}</dd>
          </div>
          <div className="fact fact-num reveal" style={{ "--i": 3 } as React.CSSProperties}>
            <dt>Time to ship</dt>
            <dd>
              {shipDays != null ? (
                <>
                  {shipDays}
                  <small> days</small>
                </>
              ) : (
                "—"
              )}
            </dd>
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
                Checklist
                <span className="card-title-aside">
                  <Ring value={r.items_total ? r.items_done / r.items_total : 0} size={38} label={`${r.items_done} of ${r.items_total} done`} />
                  <span className="mono">
                    {r.items_done}/{r.items_total}
                  </span>
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
              Created by {r.created_by} on {fmtDate(r.created_at)}. This page is generated from the release&apos;s audit log, which can
              only be appended to.
            </p>
          </aside>
        </div>
      </div>
    </article>
  );
}
