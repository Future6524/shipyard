import Link from "next/link";
import { ProductTag, StatusPill } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { listChangelog, listProducts, type ChangelogFilters } from "@/lib/releases";
import type { Release } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Changelog" };

type Search = Record<string, string | string[] | undefined>;

function parse(sp: Search, slugs: string[]): ChangelogFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const date = (k: string) => (/^\d{4}-\d{2}-\d{2}$/.test(one(k)) ? one(k) : undefined);
  const status = one("status");
  return {
    q: one("q").slice(0, 80) || undefined,
    product: slugs.includes(one("product")) ? one("product") : undefined,
    status: status === "ROLLED_BACK" || status === "ALL" ? status : undefined,
    from: date("from"),
    to: date("to"),
    sort: one("sort") === "oldest" ? "oldest" : undefined,
  };
}

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function groupByMonth(rows: Release[]) {
  const groups: { month: string; rows: Release[] }[] = [];
  for (const r of rows) {
    const m = monthFmt.format(new Date(r.shipped_at!));
    if (groups.at(-1)?.month !== m) groups.push({ month: m, rows: [] });
    groups.at(-1)!.rows.push(r);
  }
  return groups;
}

export default async function ChangelogPage({ searchParams }: { searchParams: Promise<Search> }) {
  const products = await listProducts();
  const f = parse(await searchParams, products.map((p) => p.slug));
  const rows = await listChangelog(f);
  const filtered = Object.values(f).some(Boolean);

  return (
    <>
      <section className="page-head">
        <div>
          <h1>Changelog</h1>
          <p className="lede">Everything we've shipped, newest first.</p>
        </div>
      </section>

      <form className="filters" method="get" role="search">
        <label className="field grow">
          <span>Search</span>
          <input type="search" name="q" defaultValue={f.q} placeholder="Feature, version or keyword" />
        </label>
        <label className="field">
          <span>Product</span>
          <select name="product" defaultValue={f.product ?? ""}>
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select name="status" defaultValue={f.status ?? ""}>
            <option value="">Shipped</option>
            <option value="ROLLED_BACK">Rolled back</option>
            <option value="ALL">Both</option>
          </select>
        </label>
        <label className="field">
          <span>Shipped from</span>
          <input type="date" name="from" defaultValue={f.from} />
        </label>
        <label className="field">
          <span>to</span>
          <input type="date" name="to" defaultValue={f.to} />
        </label>
        <label className="field">
          <span>Order</span>
          <select name="sort" defaultValue={f.sort ?? ""}>
            <option value="">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <div className="filter-actions">
          <button className="btn btn-primary">Apply</button>
          {filtered && (
            <Link href="/changelog" className="btn btn-ghost">
              Clear
            </Link>
          )}
        </div>
      </form>

      <p className="result-count" aria-live="polite">
        {rows.length} release{rows.length === 1 ? "" : "s"}
        {filtered ? " match" : ""}
      </p>

      {rows.length === 0 ? (
        <p className="empty">No releases match these filters.</p>
      ) : (
        groupByMonth(rows).map((g) => (
          <section key={g.month} className="cl-month">
            <h2 className="cl-month-title">{g.month}</h2>
            <ul className="cl-list">
              {g.rows.map((r) => (
                <li key={r.id}>
                  <Link href={`/releases/${r.id}`} className="cl-entry">
                    <div className="cl-meta">
                      <time dateTime={r.shipped_at!}>{fmtDate(r.shipped_at)}</time>
                    </div>
                    <div className="cl-content">
                      <div className="cl-kicker">
                        <ProductTag id={r.product_id} name={r.product_name} />
                        <span className="version">v{r.version}</span>
                        {r.status === "ROLLED_BACK" && <StatusPill status="ROLLED_BACK" />}
                        {r.rollback_count > 0 && r.status === "SHIPPED" && <span className="tag-muted">Re-shipped after rollback</span>}
                      </div>
                      <h3>{r.title}</h3>
                      <p>{r.description}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
