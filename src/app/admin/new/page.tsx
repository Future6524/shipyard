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
      <Link href="/admin" className="back">
        ← Releases
      </Link>
      <section className="page-head">
        <div>
          <h1>New release</h1>
          <p className="lede">It starts as Planned. Everything after this is recorded in its audit log.</p>
        </div>
      </section>
      <NewReleaseForm products={products.map((p) => ({ id: p.id, name: p.name }))} defaultOwner={me} />
    </>
  );
}
