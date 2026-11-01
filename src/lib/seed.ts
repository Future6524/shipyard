import type { Client, Transaction } from "@libsql/client";
import { mulberry32, renderMockScreenshot } from "./mock-screenshot";
import { PRODUCT_COLORS } from "./palette";
import type { EventKind, Status } from "./types";

/*
 * Roughly a year of fictional release history for three fictional products.
 * Every status change, checklist tick, reassignment and slip is replayed through
 * the audit log in chronological order, exactly as the app would record it.
 */

type Flow = [daysAgo: number, status: Status, note?: string][];

interface Spec {
  v: string;
  title: string;
  desc: string;
  owner: string;
  created: number; // days ago
  flow: Flow;
  target?: number; // active releases: days from today (negative = overdue)
  late?: boolean; // shipped releases: shipped after the target date
  slip?: number; // days the target moved out mid-flight
  handoff?: [daysAgo: number, to: string];
  notes?: [daysAgo: number, text: string][];
  qaBounce?: boolean; // a checklist item is unticked then re-ticked
  extraItem?: string; // item added to the checklist after creation
}

interface ProductSpec {
  slug: string;
  name: string;
  tagline: string;
  mobile?: boolean;
  team: string[];
  checklist: string[];
  releases: Spec[];
}

const WEB_CHECKS = ["Feature flag configured", "QA regression pass", "Docs updated", "Changelog entry written", "Staging sign-off"];
const MOBILE_CHECKS = ["QA on iOS", "QA on Android", "Crash-free beta ≥ 99.5%", "App Store submission", "Play Store submission", "Release notes localized"];

const P = (s: number, r: number, ship: number): Flow => [
  [s, "IN_PROGRESS"],
  [r, "IN_REVIEW"],
  [ship, "SHIPPED"],
];

const PRODUCTS: ProductSpec[] = [
  {
    slug: "beacon",
    name: "Beacon",
    tagline: "Uptime monitoring and status pages",
    team: ["Priya Raman", "Tom Okafor", "Marcus Bell"],
    checklist: WEB_CHECKS,
    releases: [
      { v: "2.15.0", title: "Scheduled maintenance windows", owner: "Priya Raman", created: 330, flow: P(322, 305, 300), late: true,
        desc: "Schedule maintenance in advance, suppress alerts during the window, and announce it automatically on the status page." },
      { v: "2.16.0", title: "Slack and Teams alert routing", owner: "Tom Okafor", created: 300, flow: P(292, 280, 276),
        desc: "Route alerts to specific Slack or Microsoft Teams channels per monitor, with escalation after a configurable delay." },
      { v: "2.17.0", title: "Custom domains for status pages", owner: "Marcus Bell", created: 270, flow: P(262, 238, 233), slip: 10,
        desc: "Serve status pages from your own domain with automatic TLS certificates. CNAME verification runs in the background.",
        notes: [[250, "Certificate provisioning is slower than expected on some registrars; moving the date out."]] },
      { v: "2.18.0", title: "Multi-region checks", owner: "Priya Raman", created: 230, flow: P(220, 205, 200),
        desc: "Run every check from up to five regions and only alert when a quorum agrees, cutting false positives from regional blips." },
      { v: "2.19.0", title: "Incident templates", owner: "Tom Okafor", created: 195, flow: P(190, 178, 175),
        desc: "Save reusable incident updates so on-call engineers can post a clear first update in seconds." },
      { v: "2.20.0", title: "SAML single sign-on", owner: "Marcus Bell", created: 175, flow: P(168, 140, 134), late: true, extraItem: "Security review signed off",
        desc: "SAML 2.0 SSO with Okta, Azure AD and Google Workspace, plus just-in-time user provisioning." },
      { v: "2.21.0", title: "Response-time SLOs", owner: "Priya Raman", created: 130, flow: P(122, 105, 101),
        desc: "Define latency and availability objectives per monitor and track error-budget burn on a new SLO dashboard." },
      { v: "2.22.0", title: "Status page theming", owner: "Tom Okafor", created: 100, flow: P(90, 70, 66),
        desc: "Brand colors, logo, favicon and a dark theme for public status pages." },
      { v: "2.23.0", title: "Heartbeat monitors", owner: "Marcus Bell", created: 62, flow: P(55, 40, 37),
        desc: "Monitor cron jobs and background workers by expecting a ping on a schedule. Alert when a heartbeat goes missing." },
      { v: "2.24.0", title: "Audit log export", owner: "Priya Raman", created: 35, flow: P(30, 18, 15),
        desc: "Export the workspace audit log as CSV or stream it to S3 for compliance teams." },
      { v: "3.0.0", title: "New alerting engine", owner: "Tom Okafor", created: 44, flow: [[28, "IN_PROGRESS"]], target: 20, slip: 14, handoff: [20, "Marcus Bell"],
        desc: "A rewrite of alert evaluation: deduplication, flapping detection and per-team routing rules in one engine.",
        notes: [[21, "Dedup logic needs another pass after load testing; pushing the date two weeks."], [9, "Load test at 10x current volume is green."]] },
      { v: "2.25.0", title: "Terraform provider", owner: "Priya Raman", created: 14, flow: [[9, "IN_PROGRESS"], [2, "IN_REVIEW"]], target: 3,
        desc: "Manage monitors, alert channels and status pages as code with an official Terraform provider." },
      { v: "3.1.0", title: "On-call schedules", owner: "Marcus Bell", created: 6, flow: [], target: 56,
        desc: "Rotations, overrides and handoff reminders, so alerts reach whoever is on call." },
    ],
  },
  {
    slug: "inkwell",
    name: "Inkwell",
    tagline: "Collaborative docs for product teams",
    team: ["Lena Fischer", "Diego Morales", "Hana Kim"],
    checklist: WEB_CHECKS,
    releases: [
      { v: "1.4.0", title: "Comments and mentions", owner: "Lena Fischer", created: 320, flow: P(310, 292, 288),
        desc: "Inline comments on any selection, @mentions with email notifications, and resolve/reopen threads." },
      { v: "1.5.0", title: "Offline mode", owner: "Diego Morales", created: 290, flow: P(280, 250, 244), late: true, slip: 7,
        desc: "Keep editing without a connection. Changes sync and merge automatically when you're back online." },
      { v: "1.6.0", title: "Version history", owner: "Hana Kim", created: 240, flow: P(232, 214, 210),
        desc: "Browse every saved version of a doc, compare any two side by side, and restore with one click." },
      { v: "1.7.0", title: "Table editing", owner: "Lena Fischer", created: 205, flow: P(198, 180, 176),
        desc: "Resizable columns, header rows, cell alignment and keyboard navigation inside tables." },
      { v: "1.8.0", title: "Templates gallery", owner: "Diego Morales", created: 170, flow: P(160, 146, 142),
        desc: "Start from PRD, RFC, retro and meeting-note templates, or publish your own to the workspace." },
      { v: "1.9.0", title: "Real-time cursors", owner: "Hana Kim", created: 140, qaBounce: true,
        flow: [[132, "IN_PROGRESS"], [112, "IN_REVIEW"], [108, "SHIPPED"],
          [107, "ROLLED_BACK", "Sync conflicts corrupted table cells for docs with more than 20 concurrent editors. Rolled back while we fix the merge logic."],
          [106, "IN_PROGRESS", "Fixing CRDT merge for table cells."], [96, "IN_REVIEW"], [94, "SHIPPED", "Re-shipped with the merge fix and a 50-editor load test."]],
        desc: "See collaborators' cursors and selections live, with presence avatars in the toolbar." },
      { v: "1.10.0", title: "Markdown import and export", owner: "Lena Fischer", created: 90, flow: P(84, 70, 66),
        desc: "Import .md files with front matter, and export any doc to clean Markdown." },
      { v: "1.11.0", title: "Page analytics", owner: "Diego Morales", created: 60, flow: P(52, 38, 35),
        desc: "View counts, readers and average read time for every published page." },
      { v: "1.12.0", title: "Workspace search", owner: "Hana Kim", created: 30, flow: P(24, 12, 9),
        desc: "Full-text search across every doc you can access, with filters for author, folder and date." },
      { v: "2.0.0", title: "Permissions overhaul", owner: "Lena Fischer", created: 48, flow: [[25, "IN_PROGRESS"]], target: -2, slip: 12,
        desc: "Folder-level permissions, guest access and permission inheritance, replacing the per-doc sharing model.",
        notes: [[13, "Migration for legacy share links is the long pole. Revised target agreed with support."]] },
      { v: "1.13.0", title: "PDF export", owner: "Diego Morales", created: 11, flow: [], target: 30,
        desc: "Export docs to paginated PDF with headers, footers and a table of contents." },
    ],
  },
  {
    slug: "relay",
    name: "Relay",
    tagline: "Mobile app for field service teams",
    mobile: true,
    team: ["Sam Whitaker", "Aiko Tanaka", "Jonas Berg"],
    checklist: MOBILE_CHECKS,
    releases: [
      { v: "4.0.0", title: "Redesigned job list", owner: "Sam Whitaker", created: 335, flow: P(325, 300, 292), late: true,
        desc: "A faster job list with grouping by site, swipe actions and a map toggle." },
      { v: "4.1.0", title: "Photo annotations", owner: "Aiko Tanaka", created: 285, flow: P(276, 258, 254),
        desc: "Draw arrows, circles and notes on job photos before attaching them to a report." },
      { v: "4.2.0", title: "Offline sync v2", owner: "Jonas Berg", created: 250, flow: P(240, 216, 210),
        desc: "Background sync with conflict resolution, so technicians can work a full shift without signal." },
      { v: "4.3.0", title: "Barcode scanning", owner: "Sam Whitaker", created: 200,
        flow: [[192, "IN_PROGRESS"], [172, "IN_REVIEW"], [168, "SHIPPED"], [166, "ROLLED_BACK", "Camera crash on Android 12 devices with the legacy camera API. Pulled from the Play Store; fix ships as 4.3.1."]],
        desc: "Scan part and asset barcodes to log them against a job." },
      { v: "4.3.1", title: "Barcode scanning (hotfix)", owner: "Sam Whitaker", created: 166, flow: P(166, 161, 159),
        desc: "Re-release of barcode scanning with a CameraX fallback for Android 12." },
      { v: "4.4.0", title: "Route planning", owner: "Aiko Tanaka", created: 150, flow: P(140, 118, 112), slip: 9,
        desc: "Optimized daily routes across assigned jobs, with live ETA updates sent to customers." },
      { v: "4.5.0", title: "Signature capture", owner: "Jonas Berg", created: 105, flow: P(98, 84, 80),
        desc: "Collect customer sign-off on the device; signatures are embedded in the job report PDF." },
      { v: "4.6.0", title: "Dark mode", owner: "Aiko Tanaka", created: 75, flow: P(68, 52, 49),
        desc: "A full dark theme that follows the system setting, tuned for outdoor readability at night." },
      { v: "4.7.0", title: "Notification preferences", owner: "Sam Whitaker", created: 44,
        flow: [[38, "IN_PROGRESS"], [26, "IN_REVIEW"], [22, "SHIPPED"], [6, "ROLLED_BACK", "iOS 19 permission prompt loops on first launch for some users. Rolled back via phased release pause; 4.7.1 in progress."]],
        desc: "Choose which job events send push notifications, with quiet hours." },
      { v: "4.7.1", title: "Notification preferences (fix)", owner: "Jonas Berg", created: 5, flow: [[4, "IN_PROGRESS"]], target: 4,
        desc: "Fixes the permission prompt loop on iOS 19 and re-enables notification preferences." },
      { v: "4.8.0", title: "Timesheets", owner: "Aiko Tanaka", created: 21, flow: [[15, "IN_PROGRESS"], [3, "IN_REVIEW"]], target: 6,
        desc: "Clock in and out per job, with weekly timesheets submitted for manager approval." },
      { v: "5.0.0", title: "Tablet layout", owner: "Sam Whitaker", created: 9, flow: [], target: 62,
        desc: "A two-pane layout for iPad and Android tablets with the job list and detail side by side." },
    ],
  },
];

const DAY = 86_400_000;
const isoDate = (t: number) => new Date(t).toISOString().slice(0, 10);

interface Ev {
  t: number;
  kind: EventKind;
  actor: string;
  status?: Status;
  owner?: string;
  target?: string | null;
  item?: number; // checklist index
  note?: string;
  files?: { name: string; mime: string; data: Uint8Array }[];
}

export async function seed(client: Client) {
  const nowT = Date.now();
  const at = (daysAgo: number, rand: () => number) => {
    // a working-hours timestamp on that day, never in the future
    const d = new Date(nowT - daysAgo * DAY);
    d.setUTCHours(8 + Math.floor(rand() * 9), Math.floor(rand() * 60), Math.floor(rand() * 60), 0);
    return Math.min(d.getTime(), nowT - 60_000);
  };
  const enc = new TextEncoder();
  const tx = await client.transaction("write");
  try {
    for (const [pi, p] of PRODUCTS.entries()) {
      const created0 = isoDate(nowT - 400 * DAY);
      const pid = Number(
        (await tx.execute({ sql: "INSERT INTO products (slug, name, tagline, created_at) VALUES (?, ?, ?, ?)", args: [p.slug, p.name, p.tagline, created0] }))
          .lastInsertRowid,
      );

      for (const [ri, s] of p.releases.entries()) {
        const rand = mulberry32((pi + 1) * 1000 + ri);
        const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
        const creator = pick(p.team);
        const evs: Ev[] = [];
        const createdT = at(s.created, rand);

        // Target date: shipped releases land a few days either side of their target.
        const firstShip = s.flow.find((f) => f[1] === "SHIPPED");
        let finalTarget: string;
        if (firstShip) {
          const shipT = nowT - firstShip[0] * DAY;
          finalTarget = isoDate(shipT + (s.late ? -(2 + Math.floor(rand() * 5)) : Math.floor(rand() * 5)) * DAY);
        } else {
          finalTarget = isoDate(nowT + (s.target ?? 30) * DAY);
        }
        const initialTarget = s.slip ? isoDate(Date.parse(finalTarget) - s.slip * DAY) : finalTarget;

        const items = [...p.checklist];
        const screenshot = (title: string, seedN: number) => ({
          name: `${p.slug}-${s.v}-${title.toLowerCase().replace(/\W+/g, "-")}.svg`,
          mime: "image/svg+xml",
          data: enc.encode(renderMockScreenshot({ seed: seedN, product: p.name, title: s.title, accent: PRODUCT_COLORS[pi], mobile: p.mobile })),
        });

        evs.push({
          t: createdT,
          kind: "CREATED",
          actor: creator,
          files: s.flow.length < 2 ? [screenshot("design mock", ri * 7 + pi)] : [],
        });

        // Status flow, with screenshots attached when a release goes to review.
        for (const [d, status, note] of s.flow) {
          const t = at(d, rand);
          evs.push({ t, kind: "STATUS", actor: status === "IN_REVIEW" ? pick(p.team) : s.owner, status, note });
          if (status === "IN_REVIEW") {
            const files = [screenshot("staging", ri * 13 + pi + 1 + d)];
            evs.push({ t: t + 30 * 60_000, kind: "ATTACHMENT", actor: s.owner, note: "Staging build for review.", files });
          }
          if (status === "SHIPPED" && rand() < 0.4) {
            const md = `# ${p.name} ${s.v}: ${s.title}\n\n${s.desc}\n\n## Upgrade notes\n\nNo action required. The change is enabled for all workspaces.\n`;
            evs.push({ t: t + 45 * 60_000, kind: "ATTACHMENT", actor: s.owner, note: "Final release notes.", files: [{ name: "release-notes.md", mime: "text/markdown", data: enc.encode(md) }] });
          }
        }

        if (s.extraItem) {
          items.push(s.extraItem);
          const startD = s.flow[0]?.[0] ?? s.created;
          evs.push({ t: at(startD - 2, rand), kind: "ITEM_ADDED", actor: s.owner, item: items.length - 1 });
        }

        // Checklist ticks happen between starting work and first review/ship.
        const start = s.flow.find((f) => f[1] === "IN_PROGRESS");
        if (start) {
          const endD = s.flow.find((f) => f[1] === "IN_REVIEW")?.[0] ?? 0;
          const lastStatus = s.flow[s.flow.length - 1][1];
          const share = firstShip ? 1 : lastStatus === "IN_REVIEW" ? 0.75 : 0.35;
          const tickCount = Math.round(items.length * share);
          const span = Math.max(1, start[0] - endD);
          for (let i = 0; i < tickCount; i++) {
            const d = start[0] - span * ((i + 0.5 + rand() * 0.4) / tickCount);
            evs.push({ t: at(Math.max(endD + 0.1, d), rand), kind: "CHECKED", actor: pick(p.team), item: i });
          }
          if (s.qaBounce) {
            const reviewD = s.flow.find((f, i) => f[1] === "IN_REVIEW" && i > 2)?.[0] ?? endD;
            evs.push({ t: at(106, rand) + 3_600_000, kind: "UNCHECKED", actor: s.owner, item: 1 });
            evs.push({ t: at(reviewD + 1, rand), kind: "CHECKED", actor: pick(p.team), item: 1 });
          }
        }

        if (s.slip) {
          const startD = s.flow[0]?.[0] ?? s.created;
          const lastD = s.flow[s.flow.length - 1]?.[0] ?? 0;
          const d = s.notes?.find((n) => /date|target|push|moving/i.test(n[1]))?.[0] ?? Math.round((startD + lastD) / 2);
          evs.push({ t: at(d, rand) + 60_000, kind: "TARGET_DATE", actor: s.owner, target: finalTarget });
        }
        if (s.handoff) evs.push({ t: at(s.handoff[0], rand), kind: "OWNER", actor: s.owner, owner: s.handoff[1], note: `${s.handoff[1]} takes over while ${s.owner.split(" ")[0]} is on leave.` });
        for (const [d, text] of s.notes ?? []) evs.push({ t: at(d, rand), kind: "NOTE", actor: s.owner, note: text });

        // Nothing may precede the CREATED entry (same-day starts can draw an earlier hour).
        for (const e of evs) if (e.kind !== "CREATED") e.t = Math.max(e.t, createdT + 60_000);
        evs.sort((a, b) => a.t - b.t || (a.kind === "CREATED" ? -1 : b.kind === "CREATED" ? 1 : 0));

        // Insert release + checklist, then replay events tracking the snapshot.
        const iso = (t: number) => new Date(t).toISOString();
        const rid = Number(
          (
            await tx.execute({
              sql: "INSERT INTO releases (product_id, version, title, description, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)",
              args: [pid, s.v, s.title, s.desc, creator, iso(createdT)],
            })
          ).lastInsertRowid,
        );
        const itemIds: number[] = [];
        const base = s.extraItem ? items.length - 1 : items.length;
        for (let i = 0; i < base; i++) {
          itemIds.push(Number((await tx.execute({ sql: "INSERT INTO checklist_items (release_id, label, created_at) VALUES (?, ?, ?)", args: [rid, items[i], iso(createdT)] })).lastInsertRowid));
        }

        let status: Status = "PLANNED";
        let owner = s.owner;
        let target: string | null = initialTarget;
        for (const e of evs) {
          let from: string | null = null;
          if (e.kind === "ITEM_ADDED") {
            itemIds.push(Number((await tx.execute({ sql: "INSERT INTO checklist_items (release_id, label, created_at) VALUES (?, ?, ?)", args: [rid, items[e.item!], iso(e.t)] })).lastInsertRowid));
          }
          if (e.kind === "STATUS") [from, status] = [status, e.status!];
          if (e.kind === "OWNER") [from, owner] = [owner, e.owner!];
          if (e.kind === "TARGET_DATE") [from, target] = [target, e.target!];
          const eid = Number(
            (
              await tx.execute({
                sql: `INSERT INTO release_events (release_id, kind, actor, status, owner, target_date, from_value, item_id, note, created_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [rid, e.kind, e.actor, status, owner, target, from, e.item != null ? itemIds[e.item] : null, e.note ?? null, iso(e.t)],
              })
            ).lastInsertRowid,
          );
          for (const f of e.files ?? []) {
            await tx.execute({
              sql: "INSERT INTO files (release_id, event_id, name, mime, size, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
              args: [rid, eid, f.name, f.mime, f.data.byteLength, f.data, iso(e.t)],
            });
          }
        }
      }
    }
    await tx.commit();
  } finally {
    tx.close();
  }
}
