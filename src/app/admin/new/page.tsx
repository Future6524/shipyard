import Link from "next/link";
import { listProducts } from "@/lib/releases";
import { requireAdmin } from "@/lib/session";
import { NewReleaseForm } from "./NewReleaseForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New release" };

export default async function NewReleasePage() {
  const me = await requireAdmin();
  const products = await listProducts();
  return (
    <>
      <section className="band band-admin">
        <div className="dots" aria-hidden />
        <div className="wrap band-inner reveal">
          <Link href="/admin" className="back back-light">
            ← Releases
          </Link>
          <h1 className="band-title">New release</h1>
          <p className="hero-lede">It starts as Planned. Everything after this is recorded in its audit log.</p>
        </div>
      </section>
      <div className="wrap section">
        <NewReleaseForm products={products.map((p) => ({ id: p.id, name: p.name }))} defaultOwner={me} />
      </div>
    </>
  );
}
