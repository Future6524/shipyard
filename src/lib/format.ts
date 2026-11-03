import type { Status } from "./types";

const DAY = 86_400_000;
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const shortFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });

export const fmtDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : "—");
export const fmtShort = (iso: string | null) => (iso ? shortFmt.format(new Date(iso)) : "—");
export const fmtDateTime = (iso: string) => `${dateFmt.format(new Date(iso))}, ${timeFmt.format(new Date(iso))} UTC`;

export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d < 60 ? `${d}d ago` : fmtDate(iso);
}

export const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / DAY;

/** How a target date reads for a release that hasn't shipped yet. */
export function dueState(target: string | null, status: Status): { label: string; tone: "late" | "soon" | "ok" | "none" } {
  if (!target) return { label: "No target date", tone: "none" };
  if (status === "SHIPPED" || status === "ROLLED_BACK") return { label: `Target ${fmtShort(target)}`, tone: "none" };
  const today = new Date().toISOString().slice(0, 10);
  const d = Math.round(daysBetween(today, target));
  if (d < 0) return { label: `${-d}d overdue`, tone: "late" };
  if (d === 0) return { label: "Due today", tone: "soon" };
  if (d <= 7) return { label: `Due in ${d}d`, tone: "soon" };
  return { label: `Due ${fmtShort(target)}`, tone: "ok" };
}

export const fmtBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const AVATAR_TONES = [
  ["#0b0b0b", "#ffffff"],
  ["#e0157a", "#ffffff"],
  ["#c6ff3d", "#0b0b0b"],
  ["#2a6be0", "#ffffff"],
  ["#ffffff", "#0b0b0b"],
  ["#ffd400", "#0b0b0b"],
];

/** A stable background + ink pair for a person's avatar, derived from their name. */
export function avatarColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [bg, fg] = AVATAR_TONES[h % AVATAR_TONES.length];
  return { bg, fg };
}

export const firstName = (name: string) => name.split(/\s+/)[0];
