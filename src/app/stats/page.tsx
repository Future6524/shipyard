import { PackageCheck, Target, Timer, Undo2 } from "lucide-react";
import { HBars, StackedColumns, type Series } from "@/components/Charts";
import { Orb, Ring, SplitWord } from "@/components/ui";
import { OTHER_COLOR, PRODUCT_COLORS } from "@/lib/palette";
import { listProducts, listShippedForStats } from "@/lib/releases";
import { avg, daysToShip, median } from "@/lib/stats";
import type { Release } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stats" };

const monthKey = (iso: string) => iso.slice(0, 7);
const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const monthLong = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function StatsPage() {
  const [products, shipped] = await Promise.all([listProducts(), listShippedForStats()]);

  // Last 12 calendar months, oldest first.
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1)));
  const keys = months.map((m) => m.toISOString().slice(0, 7));
  const inWindow = shipped.filter((r) => keys.includes(monthKey(r.first_shipped_at!)));

  // Identity color follows the product (by id), never its rank. Past three products, fold into "Other".
  const named = products.filter((p) => p.id <= PRODUCT_COLORS.length);
  const groupOf = (r: Release) => (r.product_id <= PRODUCT_COLORS.length ? r.product_name : "Other");
  const groups = [
    ...named.map((p) => ({ name: p.name, color: PRODUCT_COLORS[p.id - 1] })),
    ...(products.length > PRODUCT_COLORS.length ? [{ name: "Other", color: OTHER_COLOR }] : []),
  ];

  const series: Series[] = groups.map((g) => ({
    ...g,
    values: keys.map((k) => inWindow.filter((r) => groupOf(r) === g.name && monthKey(r.first_shipped_at!) === k).length),
  }));

  const durations = inWindow.map(daysToShip);
  const onTime = inWindow.filter((r) => r.target_at_ship && r.first_shipped_at!.slice(0, 10) <= r.target_at_ship);
  const withTarget = inWindow.filter((r) => r.target_at_ship);
  const onTimeRate = withTarget.length ? onTime.length / withTarget.length : 0;
  const rolledBack = inWindow.filter((r) => r.rollback_count > 0);

  const perProduct = groups
    .map((g) => {
      const rs = inWindow.filter((r) => groupOf(r) === g.name);
      const ds = rs.map(daysToShip);
      return { ...g, n: rs.length, avg: Math.round(avg(ds)), median: Math.round(median(ds)), min: Math.round(Math.min(...ds)), max: Math.round(Math.max(...ds)) };
    })
    .filter((g) => g.n > 0);

  const totals = keys.map((_, i) => series.reduce((a, s) => a + s.values[i], 0));
  const busiest = totals.indexOf(Math.max(...totals));

  return (
    <>
      <section className="hero hero-stats">
        <div className="hero-dark">
          <div className="dots" aria-hidden />
          <div className="hero-copy wrap-left reveal">
            <p className="kicker">Last 12 months</p>
            <SplitWord solid="ship" outline="rate" />
            <p className="hero-lede">How fast and how reliably we ship, start of work to first release.</p>
          </div>
        </div>
        <div className="hero-studio">
          <Orb className="orb-hero" />
          <div className="tag-box tag-xl reveal" style={{ "--i": 1 } as React.CSSProperties}>
            <span className="tag-num">
              {Math.round(avg(durations))}
              <small>days</small>
            </span>
            <span className="tag-cap">average time to ship · median {Math.round(median(durations))}d</span>
          </div>
        </div>
      </section>

      <div className="wrap section">
        <section className="kpis">
          <div className="kpi reveal" style={{ "--i": 0 } as React.CSSProperties}>
            <span className="kpi-icon">
              <PackageCheck aria-hidden size={18} strokeWidth={2.5} />
            </span>
            <span className="kpi-label">Releases shipped</span>
            <span className="kpi-value">{inWindow.length}</span>
            <span className="kpi-sub">busiest: {monthLong.format(months[busiest])}</span>
          </div>
          <div className="kpi reveal" style={{ "--i": 1 } as React.CSSProperties}>
            <span className="kpi-icon">
              <Target aria-hidden size={18} strokeWidth={2.5} />
            </span>
            <span className="kpi-label">On time</span>
            <span className="kpi-value kpi-with-ring">
              {Math.round(onTimeRate * 100)}%
              <Ring value={onTimeRate} size={40} label={`${onTime.length} of ${withTarget.length} on time`} />
            </span>
            <span className="kpi-sub">
              {onTime.length} of {withTarget.length} by their target date
            </span>
          </div>
          <div className="kpi reveal" style={{ "--i": 2 } as React.CSSProperties}>
            <span className="kpi-icon">
              <Timer aria-hidden size={18} strokeWidth={2.5} />
            </span>
            <span className="kpi-label">Fastest ship</span>
            <span className="kpi-value">
              {durations.length ? Math.round(Math.min(...durations)) : 0}
              <small>d</small>
            </span>
            <span className="kpi-sub">slowest {durations.length ? Math.round(Math.max(...durations)) : 0} days</span>
          </div>
          <div className="kpi reveal" style={{ "--i": 3 } as React.CSSProperties}>
            <span className="kpi-icon kpi-icon-warn">
              <Undo2 aria-hidden size={18} strokeWidth={2.5} />
            </span>
            <span className="kpi-label">Rolled back</span>
            <span className="kpi-value">{rolledBack.length}</span>
            <span className="kpi-sub">{inWindow.length ? Math.round((rolledBack.length / inWindow.length) * 100) : 0}% of shipped releases</span>
          </div>
        </section>

        <div className="chart-grid">
          <section className="card">
            <h2 className="chart-title">Releases shipped per month</h2>
            <p className="chart-sub">By product, counted in the month each release first shipped.</p>
            <StackedColumns labels={months.map((m) => monthLabel.format(m))} series={series} unit="releases" />
            <details className="data-table">
              <summary>Show data table</summary>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      {series.map((s) => (
                        <th key={s.name} className="num">
                          {s.name}
                        </th>
                      ))}
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((m, i) => (
                      <tr key={keys[i]}>
                        <td>{monthLong.format(m)}</td>
                        {series.map((s) => (
                          <td key={s.name} className="num">
                            {s.values[i]}
                          </td>
                        ))}
                        <td className="num">{totals[i]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          <section className="card">
            <h2 className="chart-title">Average time to ship</h2>
            <p className="chart-sub">Days from starting work to first ship, by product.</p>
            <HBars
              unit="days"
              data={perProduct.map((p) => ({
                label: p.name,
                color: p.color,
                value: p.avg,
                detail: `${p.n} releases · median ${p.median}d · range ${p.min}–${p.max}d`,
              }))}
            />
            <div className="table-wrap summary-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="num">Releases</th>
                    <th className="num">Median</th>
                    <th className="num">Range</th>
                  </tr>
                </thead>
                <tbody>
                  {perProduct.map((p) => (
                    <tr key={p.name}>
                      <td>
                        <span className="swatch" style={{ background: p.color }} aria-hidden /> {p.name}
                      </td>
                      <td className="num">{p.n}</td>
                      <td className="num">{p.median}d</td>
                      <td className="num">
                        {p.min}–{p.max}d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
