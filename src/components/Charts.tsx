"use client";

import { useState } from "react";

export interface Series {
  name: string;
  color: string;
  values: number[];
}

function niceMax(v: number) {
  if (v <= 4) return 4;
  const step = v <= 10 ? 2 : v <= 25 ? 5 : 10;
  return Math.ceil(v / step) * step;
}

/** Stacked columns, one per period. Hovering a column shows its breakdown. */
export function StackedColumns({ labels, series, unit }: { labels: string[]; series: Series[]; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = labels.map((_, i) => series.reduce((a, s) => a + s.values[i], 0));
  // Headroom above the tallest column so its total label clears the plot edge.
  const max = niceMax(Math.max(...totals, 1) * 1.15);
  const ticks = [0, max / 2, max];

  return (
    <div className="chart">
      <Legend series={series} />
      <div className="cols-plot">
        <div className="y-axis" aria-hidden>
          {[...ticks].reverse().map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="cols-area">
          {ticks.map((t) => (
            <div key={t} className="gridline" style={{ bottom: `${(t / max) * 100}%` }} aria-hidden />
          ))}
          <div className="cols" role="list">
            {labels.map((label, i) => {
              const segs = series.filter((s) => s.values[i] > 0);
              return (
                <div
                  key={label}
                  role="listitem"
                  className={`col ${hover === i ? "hover" : ""} ${hover != null && hover !== i ? "dim" : ""}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${label}: ${totals[i]} ${unit}${segs.length ? " — " + segs.map((s) => `${s.name} ${s.values[i]}`).join(", ") : ""}`}
                >
                  <div className="col-stack" style={{ height: `${(totals[i] / max) * 100}%` }}>
                    {totals[i] > 0 && <span className="col-total">{totals[i]}</span>}
                    {segs.map((s, k) => (
                      <div
                        key={s.name}
                        className={`seg ${k === segs.length - 1 ? "top" : ""}`}
                        style={{ flexGrow: s.values[i], background: s.color }}
                      />
                    ))}
                  </div>
                  {hover === i && (
                    <div className={`tooltip ${i > labels.length * 0.6 ? "left" : ""}`} role="tooltip">
                      <strong>{label}</strong>
                      {series.map((s) => (
                        <div key={s.name} className="tt-row">
                          <span className="swatch" style={{ background: s.color }} />
                          <span>{s.name}</span>
                          <span className="tt-val">{s.values[i]}</span>
                        </div>
                      ))}
                      <div className="tt-row tt-total">
                        <span />
                        <span>Total</span>
                        <span className="tt-val">{totals[i]}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="x-axis" aria-hidden>
        {labels.map((l, i) => (
          <span key={l} className={i % 2 ? "odd" : ""}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface BarDatum {
  label: string;
  color: string;
  value: number;
  detail: string;
}

/** Horizontal bars with the value at the tip. */
export function HBars({ data, unit }: { data: BarDatum[]; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  return (
    <div className="chart hbars" role="list">
      {data.map((d, i) => (
        <div
          key={d.label}
          role="listitem"
          className={`hbar-row ${hover != null && hover !== i ? "dim" : ""}`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(null)}
          tabIndex={0}
          aria-label={`${d.label}: ${d.value} ${unit}. ${d.detail}`}
        >
          <span className="hbar-label">
            <span className="swatch" style={{ background: d.color }} aria-hidden />
            {d.label}
          </span>
          <span className="hbar-track">
            <span className="hbar" style={{ width: `${(d.value / max) * 100}%`, background: d.color }} />
            <span className="hbar-val">
              {d.value} {unit}
            </span>
          </span>
          {hover === i && (
            <div className="tooltip hbar-tip" role="tooltip">
              <strong>{d.label}</strong>
              <div>{d.detail}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="legend">
      {series.map((s) => (
        <li key={s.name}>
          <span className="swatch" style={{ background: s.color }} aria-hidden />
          {s.name}
        </li>
      ))}
    </ul>
  );
}
