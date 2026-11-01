import Link from "next/link";
import { Avatar, Due, ProductTag, Progress, StatusPill } from "@/components/ui";
import { isEphemeralDb } from "@/lib/db";
import { ago } from "@/lib/format";
import { listAllReleases, recentActivity } from "@/lib/releases";
import { requireAdmin } from "@/lib/session";
import { STATUS_LABEL, type Status } from "@/lib/types";
import { logout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

function describe(a: Awaited<ReturnType<typeof recentActivity>>[number]) {
  switch (a.kind) {
    case "CREATED": return "created";
    case "STATUS": return `moved ${a.from_value ? STATUS_LABEL[a.from_value as Status] + " → " : ""}${STATUS_LABEL[a.status]}`;
    case "CHECKED": return `ticked “${a.item_label}”`;
    case "UNCHECKED": return `reopened “${a.item_label}”`;
    case "ITEM_ADDED": return `added “${a.item_label}”`;
    case "OWNER": return "reassigned";
    case "TARGET_DATE": return "changed the target date of";
    case "ATTACHMENT": return "attached files to";
    case "NOTE": return "commented on";
  }
}

export default async function AdminPage() {
  const me = await requireAdmin();
  const [releases, activity] = await Promise.all([listAllReleases(), recentActivity(14)]);
  const active = releases.filter((r) => r.status !== "SHIPPED");
  const shipped = releases.filter((r) => r.status === "SHIPPED");

  return (
    <>
      <section className="page-head">
        <div>
          <h1>Releases</h1>
          <p className="lede">Signed in as {me}. Every change you make is logged under this name.</p>
        </div>
        <div className="head-actions">
          <Link href="/admin/new" className="btn btn-primary">
            + New release
          </Link>
          <form action={logout}>
            <button className="btn btn-ghost">Sign out</button>
          </form>
        </div>
      </section>

      {isEphemeralDb() && (
        <p className="alert alert-warn">
          No TURSO_DATABASE_URL is set, so this deployment uses a temporary database that resets on cold start.
        </p>
      )}

      <div className="admin-grid">
        <div>
          <ReleaseTable title="Active" rows={active} />
          <ReleaseTable title="Shipped" rows={shipped} />
        </div>
        <aside className="card activity">
          <h2 className="card-title">Recent activity</h2>
          <ol>
            {activity.map((a) => (
              <li key={a.id}>
                <Avatar name={a.actor} size={22} />
                <span>
                  <strong>{a.actor}</strong> {describe(a)}{" "}
                  <Link href={`/admin/releases/${a.release_id}`}>
                    {a.product_name} {a.version}
                  </Link>
                  <span className="muted small"> · {ago(a.created_at)}</span>
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </>
  );
}

function ReleaseTable({ title, rows }: { title: string; rows: Awaited<ReturnType<typeof listAllReleases>> }) {
  return (
    <section className="admin-section">
      <h2 className="section-title">
        {title} <span className="count">{rows.length}</span>
      </h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Release</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Checklist</th>
              <th>Target</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/releases/${r.id}`} className="row-link">
                    <ProductTag id={r.product_id} name={r.product_name} /> <span className="version">v{r.version}</span>
                    <span className="row-title">{r.title}</span>
                  </Link>
                </td>
                <td>
                  <StatusPill status={r.status} />
                </td>
                <td className="nowrap">{r.owner}</td>
                <td>{r.items_total ? <Progress done={r.items_done} total={r.items_total} /> : <span className="muted">—</span>}</td>
                <td className="nowrap">
                  <Due r={r} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
