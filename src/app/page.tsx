import Link from "next/link";
import { ReleaseCard } from "@/components/ReleaseCard";
import { ProductTag } from "@/components/ui";
import { fmtShort } from "@/lib/format";
import { listProducts, listRoadmap } from "@/lib/releases";
import { STATUS_LABEL, type Status } from "@/lib/types";

export const dynamic = "force-dynamic";

const COLUMNS: { status: Status; hint: string }[] = [
  { status: "PLANNED", hint: "Scoped, not started" },
  { status: "IN_PROGRESS", hint: "Being built" },
  { status: "IN_REVIEW", hint: "QA and sign-off" },
  { status: "SHIPPED", hint: "Last 3 weeks" },
];

export default async function RoadmapPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const [all, products] = await Promise.all([listRoadmap(), listProducts()]);
  const releases = product ? all.filter((r) => r.product_slug === product) : all;
  const rolledBack = releases.filter((r) => r.status === "ROLLED_BACK");

  return (
    <>
      <section className="page-head">
        <div>
          <h1>Roadmap</h1>
          <p className="lede">What we're building now, what's next, and what just shipped.</p>
        </div>
      </section>

      <nav className="chips" aria-label="Filter by product">
        <Link href="/" className={`chip ${!product ? "on" : ""}`}>
          All products
        </Link>
        {products.map((p) => (
          <Link key={p.id} href={`/?product=${p.slug}`} className={`chip ${product === p.slug ? "on" : ""}`}>
            <ProductTag id={p.id} name={p.name} />
          </Link>
        ))}
      </nav>

      {rolledBack.map((r) => (
        <Link key={r.id} href={`/releases/${r.id}`} className="alert">
          <strong>Rolled back:</strong> {r.product_name} v{r.version}, {r.title}
          <span className="alert-meta">{fmtShort(r.updated_at)} · view timeline →</span>
        </Link>
      ))}

      <div className="board">
        {COLUMNS.map(({ status, hint }) => {
          const col = releases.filter((r) => r.status === status);
          if (status === "SHIPPED") col.sort((a, b) => (b.shipped_at ?? "").localeCompare(a.shipped_at ?? ""));
          return (
            <section key={status} className={`column col-${status.toLowerCase()}`}>
              <header className="column-head">
                <h2>
                  <span className="pill-dot" aria-hidden />
                  {status === "SHIPPED" ? "Recently shipped" : STATUS_LABEL[status]}
                  <span className="count">{col.length}</span>
                </h2>
                <span className="hint">{hint}</span>
              </header>
              <div className="column-body">
                {col.length ? col.map((r) => <ReleaseCard key={r.id} r={r} />) : <p className="column-empty">Nothing here</p>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
