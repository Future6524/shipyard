import { daysBetween } from "./format";
import type { Release } from "./types";

/** Days from starting work (or creation, if it never went in progress) to first ship. */
export const daysToShip = (r: Release) => daysBetween(r.started_at ?? r.created_at, r.first_shipped_at!);

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Shipped releases whose first ship falls in the trailing `days` window. */
export const shippedWithin = (rows: Release[], days: number) => {
  const since = Date.now() - days * 86_400_000;
  return rows.filter((r) => r.first_shipped_at && Date.parse(r.first_shipped_at) >= since);
};
