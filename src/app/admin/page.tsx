import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { Avatar, Due, ProductTag, Progress, StatusPill } from "@/components/ui";
import { describeActivity } from "@/lib/activity";
import { isEphemeralDb } from "@/lib/db";
import { ago } from "@/lib/format";
import { listAllReleases, recentActivity } from "@/lib/releases";
import { requireAdmin } from "@/lib/session";
import { logout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

const pad = (n: number) => String(n).padStart(2, "0");

export default async function AdminPage() {
  const me = await requireAdmin();
  const [releases, activity] = await Promise.all([listAllReleases(), recentActivity(14)]);
  const active = releases.filter((r) => r.status !== "SHIPPED");
  const shipped = releases.filter((r) => r.status === "SHIPPED");
  const review = releases.filter((r) => r.status === "IN_REVIEW").length;
  const overdue = active.filter((r) => r.target_date && r.target_date < new Date().toISOString().slice(0, 10) && r.status !== "ROLLED_BACK").length;

  return (
    <>
      <section className="band band-admin">
        <div className="dots" aria-hidden />
        <div className="wrap band-inner band-row reveal">
          <div>
            <p className="kicker">Signed in as {me}</p>
            <h1 className="band-title">Releases</h1>
          </div>
          <div className="head-actions">
            <Link href="/admin/new" className="btn btn-hot">
              <Plus aria-hidden size={16} strokeWidth={3} /> New release
            </Link>
            <form action={logout}>
              <button className="btn btn-ghost-light">
                <LogOut aria-hidden size={15} strokeWidth={2.5} /> Sign out
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="wrap section">
        {isEphemeralDb() && (
          <p className="alert alert-warn">No TURSO_DATABASE_URL is set, so this deployment uses a temporary database that resets on cold start.</p>
        )}

        <div className="tags tags-inline">
          <div className="tag-box">
            <span className="tag-num">{pad(active.length)}</span>
            <span className="tag-cap">active</span>
          </div>
          <div className="tag-box tag-hot">
            <span className="tag-num">{pad(review)}</span>
            <span className="tag-cap">in review</span>
          </div>
          <div className="tag-box">
            <span className="tag-num">{pad(overdue)}</span>
            <span className="tag-cap">overdue</span>
          </div>
          <div className="tag-box">
            <span className="tag-num">{pad(shipped.length)}</span>
            <span className="tag-cap">shipped</span>
          </div>
        </div>

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
                  <Avatar name={a.actor} size={26} />
                  <span>
                    <strong>{a.actor}</strong> {describeActivity(a)}{" "}
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
                  <StatusPill status={r.status} size="sm" />
                </td>
                <td className="nowrap">
                  <span className="owner">
                    <Avatar name={r.owner} size={22} /> {r.owner}
                  </span>
                </td>
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
