import { HBars, StackedColumns, type Series } from "@/components/Charts";
import { daysBetween } from "@/lib/format";
import { OTHER_COLOR, PRODUCT_COLORS } from "@/lib/palette";
import { listProducts, listShippedForStats } from "@/lib/releases";
import type { Release } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stats" };

const monthKey = (iso: string) => iso.slice(0, 7);
const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const monthLong = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/** Days from starting work (or creation, if it never went in progress) to first ship. */
const daysToShip = (r: Release) => daysBetween(r.started_at ?? r.created_at, r.first_shipped_at!);

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

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
  const rolledBack = inWindow.filter((r) => r.rollback_count > 0);

  const perProduct = groups
    .map((g) => {
      const rs = inWindow.filter((r) => groupOf(r) === g.name);
      const ds = rs.map(daysToShip);
      return { ...g, n: rs.length, avg: Math.round(avg(ds)), median: Math.round(median(ds)), min: Math.round(Math.min(...ds)), max: Math.round(Math.max(...ds)) };
    })
    .filter((g) => g.n > 0);

  const busiest = keys.reduce((best, k, i) => (series.reduce((a, s) => a + s.values[i], 0) > series.reduce((a, s) => a + s.values[best], 0) ? i : best), 0);

  return (
    <>
      <section className="page-head">
        <div>
          <h1>Stats</h1>
          <p className="lede">Shipping cadence over the last 12 months.</p>
        </div>
      </section>

      <section className="kpis">
        <div className="kpi kpi-hero">
          <span className="kpi-label">Average time to ship</span>
          <span className="kpi-value">
            {Math.round(avg(durations))}
            <small> days</small>
          </span>
          <span className="kpi-sub">median {Math.round(median(durations))} days, start of work to first ship</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Releases shipped</span>
          <span className="kpi-value">{inWindow.length}</span>
          <span className="kpi-sub">busiest: {monthLong.format(months[busiest])}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">On time</span>
          <span className="kpi-value">{withTarget.length ? Math.round((onTime.length / withTarget.length) * 100) : 0}%</span>
          <span className="kpi-sub">
            {onTime.length} of {withTarget.length} by their target date
          </span>
        </div>
        <div className="kpi">
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
                      <td className="num">{series.reduce((a, s) => a + s.values[i], 0)}</td>
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
          <details className="data-table">
            <summary>Show data table</summary>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="num">Releases</th>
                    <th className="num">Average</th>
                    <th className="num">Median</th>
                    <th className="num">Fastest</th>
                    <th className="num">Slowest</th>
                  </tr>
                </thead>
                <tbody>
                  {perProduct.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td className="num">{p.n}</td>
                      <td className="num">{p.avg}d</td>
                      <td className="num">{p.median}d</td>
                      <td className="num">{p.min}d</td>
                      <td className="num">{p.max}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      </div>
    </>
  );
}
