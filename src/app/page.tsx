import Link from "next/link";
import { ArrowRight, Inbox, TriangleAlert } from "lucide-react";
import { Marquee } from "@/components/Marquee";
import { ReleaseCard } from "@/components/ReleaseCard";
import { Orb, ProductTag, STATUS_ICON, SplitWord } from "@/components/ui";
import { fmtShort } from "@/lib/format";
import { listProducts, listRoadmap, listShippedForStats, recentActivity } from "@/lib/releases";
import { avg, daysToShip, shippedWithin } from "@/lib/stats";
import { STATUS_LABEL, type Status } from "@/lib/types";

export const dynamic = "force-dynamic";

const COLUMNS: { status: Status; hint: string }[] = [
  { status: "PLANNED", hint: "Scoped, not started" },
  { status: "IN_PROGRESS", hint: "Being built" },
  { status: "IN_REVIEW", hint: "QA and sign-off" },
  { status: "SHIPPED", hint: "Last 3 weeks" },
];

const pad = (n: number) => String(n).padStart(2, "0");

export default async function RoadmapPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const [all, products, shipped, activity] = await Promise.all([listRoadmap(), listProducts(), listShippedForStats(), recentActivity(12)]);
  const releases = product ? all.filter((r) => r.product_slug === product) : all;
  const rolledBack = releases.filter((r) => r.status === "ROLLED_BACK");
  const inFlight = all.filter((r) => ["PLANNED", "IN_PROGRESS", "IN_REVIEW"].includes(r.status)).length;
  const last30 = shippedWithin(shipped, 30).length;
  const avgDays = Math.round(avg(shippedWithin(shipped, 365).map(daysToShip)));
  const countFor = (slug?: string) =>
    (slug ? all.filter((r) => r.product_slug === slug) : all).filter((r) => r.status !== "SHIPPED" && r.status !== "ROLLED_BACK").length;

  return (
    <>
      <section className="hero">
        <div className="hero-dark">
          <div className="dots" aria-hidden />
          <div className="bars" aria-hidden>
            <span />
            <span />
          </div>
          <div className="hero-copy wrap-left reveal">
            <p className="kicker">Live roadmap</p>
            <SplitWord solid="road" outline="map" />
            <p className="hero-lede">What we&apos;re building, what&apos;s next, and what just shipped across Beacon, Inkwell and Relay.</p>
          </div>
        </div>
        <div className="hero-studio">
          <Orb className="orb-hero" />
          <Orb className="orb-corner" />
          <div className="tags">
            <div className="tag-box reveal" style={{ "--i": 1 } as React.CSSProperties}>
              <span className="tag-num">{pad(inFlight)}</span>
              <span className="tag-cap">in flight</span>
            </div>
            <div className="tag-box tag-hot reveal" style={{ "--i": 2 } as React.CSSProperties}>
              <span className="tag-num">{pad(last30)}</span>
              <span className="tag-cap">shipped · 30 days</span>
            </div>
            <div className="tag-box reveal" style={{ "--i": 3 } as React.CSSProperties}>
              <span className="tag-num">
                {avgDays}
                <small>d</small>
              </span>
              <span className="tag-cap">avg time to ship</span>
            </div>
          </div>
        </div>
      </section>

      <Marquee items={activity} />

      <div className="wrap section">
        <nav className="segmented" aria-label="Filter by product">
          <Link href="/" className={!product ? "on" : ""}>
            All products <span className="seg-count">{countFor()}</span>
          </Link>
          {products.map((p) => (
            <Link key={p.id} href={`/?product=${p.slug}`} className={product === p.slug ? "on" : ""}>
              <ProductTag id={p.id} name={p.name} /> <span className="seg-count">{countFor(p.slug)}</span>
            </Link>
          ))}
        </nav>

        {rolledBack.map((r) => (
          <Link key={r.id} href={`/releases/${r.id}`} className="alert alert-rollback">
            <TriangleAlert aria-hidden size={18} strokeWidth={2.5} />
            <span>
              <strong>Rolled back</strong> {r.product_name} v{r.version}, {r.title}
            </span>
            <span className="alert-meta">
              {fmtShort(r.updated_at)} · timeline <ArrowRight aria-hidden size={14} />
            </span>
          </Link>
        ))}

        <div className="board">
          {COLUMNS.map(({ status, hint }) => {
            const col = releases.filter((r) => r.status === status);
            if (status === "SHIPPED") col.sort((a, b) => (b.shipped_at ?? "").localeCompare(a.shipped_at ?? ""));
            const Icon = STATUS_ICON[status];
            return (
              <section key={status} className={`column col-${status.toLowerCase()}`} aria-label={STATUS_LABEL[status]}>
                <header className="column-head">
                  <span className="column-icon">
                    <Icon aria-hidden size={16} strokeWidth={2.5} />
                  </span>
                  <h2>{status === "SHIPPED" ? "Shipped" : STATUS_LABEL[status]}</h2>
                  <span className="column-count">{pad(col.length)}</span>
                  <span className="hint">{hint}</span>
                </header>
                <div className="column-body">
                  {col.length ? (
                    col.map((r, i) => <ReleaseCard key={r.id} r={r} index={i} />)
                  ) : (
                    <p className="column-empty">
                      <Inbox aria-hidden size={20} />
                      Nothing here
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
