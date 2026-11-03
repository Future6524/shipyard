import Link from "next/link";
import { Inbox, RotateCcw, Search, X } from "lucide-react";
import { ProductTag, SplitWord, StatusPill } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { productColor } from "@/lib/palette";
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

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });
const yearFmt = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "UTC" });

function groupByMonth(rows: Release[]) {
  const groups: { key: string; month: string; year: string; rows: Release[] }[] = [];
  for (const r of rows) {
    const d = new Date(r.shipped_at!);
    const key = r.shipped_at!.slice(0, 7);
    if (groups.at(-1)?.key !== key) groups.push({ key, month: monthFmt.format(d), year: yearFmt.format(d), rows: [] });
    groups.at(-1)!.rows.push(r);
  }
  return groups;
}

export default async function ChangelogPage({ searchParams }: { searchParams: Promise<Search> }) {
  const products = await listProducts();
  const f = parse(await searchParams, products.map((p) => p.slug));
  const rows = await listChangelog(f);

  // Removable chips for each active filter: each links to the same query minus that key.
  const params = Object.entries(f).filter(([, v]) => v) as [keyof ChangelogFilters, string][];
  const without = (key: string) => {
    const qs = new URLSearchParams(params.filter(([k]) => k !== key) as [string, string][]).toString();
    return qs ? `/changelog?${qs}` : "/changelog";
  };
  const chipLabel = (k: keyof ChangelogFilters, v: string) =>
    k === "q"
      ? `“${v}”`
      : k === "product"
        ? products.find((p) => p.slug === v)?.name
        : k === "status"
          ? v === "ALL" ? "Shipped + rolled back" : "Rolled back"
          : k === "from"
            ? `From ${fmtDate(v)}`
            : k === "to"
              ? `To ${fmtDate(v)}`
              : "Oldest first";

  return (
    <>
      <section className="band">
        <div className="dots" aria-hidden />
        <div className="wrap band-inner reveal">
          <p className="kicker">Archive</p>
          <SplitWord solid="change" outline="log" />
          <p className="hero-lede">Everything we&apos;ve shipped, month by month.</p>
        </div>
      </section>

      <div className="wrap section">
        <form className="filters" method="get" role="search">
          <label className="field grow search-field">
            <span>Search</span>
            <span className="input-icon">
              <Search aria-hidden size={16} strokeWidth={2.5} />
              <input type="search" name="q" defaultValue={f.q} placeholder="Feature, version or keyword" />
            </span>
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
          <button className="btn btn-primary">Apply</button>
        </form>

        <div className="result-bar" aria-live="polite">
          <span className="result-count">
            <strong>{String(rows.length).padStart(2, "0")}</strong> release{rows.length === 1 ? "" : "s"}
          </span>
          {params.map(([k, v]) => (
            <Link key={k} href={without(k)} className="chip-x" aria-label={`Remove filter ${chipLabel(k, v)}`}>
              {chipLabel(k, v)} <X aria-hidden size={13} strokeWidth={3} />
            </Link>
          ))}
          {params.length > 1 && (
            <Link href="/changelog" className="clear-link">
              Clear all
            </Link>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="empty">
            <Inbox aria-hidden size={28} />
            <p>No releases match these filters.</p>
            <Link href="/changelog" className="btn btn-ghost">
              Clear filters
            </Link>
          </div>
        ) : (
          groupByMonth(rows).map((g) => (
            <section key={g.key} className="cl-month">
              <h2 className="cl-month-title">
                <span className="outline">{g.month}</span> <span className="cl-year">{g.year}</span>
              </h2>
              <ul className="cl-list">
                {g.rows.map((r, i) => (
                  <li key={r.id}>
                    <Link
                      href={`/releases/${r.id}`}
                      className="cl-entry reveal"
                      style={{ "--accent": productColor(r.product_id - 1), "--i": i } as React.CSSProperties}
                    >
                      <div className="cl-meta">
                        <span className="version version-lg">v{r.version}</span>
                        <time dateTime={r.shipped_at!}>{fmtDate(r.shipped_at)}</time>
                      </div>
                      <div className="cl-content">
                        <div className="cl-kicker">
                          <ProductTag id={r.product_id} name={r.product_name} />
                          {r.status === "ROLLED_BACK" && <StatusPill status="ROLLED_BACK" size="sm" />}
                          {r.rollback_count > 0 && r.status === "SHIPPED" && (
                            <span className="tag-muted">
                              <RotateCcw aria-hidden size={12} /> Re-shipped after rollback
                            </span>
                          )}
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
      </div>
    </>
  );
}
