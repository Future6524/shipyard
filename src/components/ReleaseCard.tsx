import Link from "next/link";
import { ago, firstName, fmtShort } from "@/lib/format";
import { productColor } from "@/lib/palette";
import type { Release } from "@/lib/types";
import { Avatar, Due, ProductTag, Progress } from "./ui";

export function ReleaseCard({ r, index = 0 }: { r: Release; index?: number }) {
  return (
    <Link
      href={`/releases/${r.id}`}
      className="rcard reveal"
      style={{ "--accent": productColor(r.product_id - 1), "--i": index } as React.CSSProperties}
    >
      <div className="rcard-top">
        <ProductTag id={r.product_id} name={r.product_name} />
        <span className="version">v{r.version}</span>
      </div>
      <h3 className="rcard-title">{r.title}</h3>
      {r.status !== "SHIPPED" && r.items_total > 0 && <Progress done={r.items_done} total={r.items_total} />}
      <div className="rcard-foot">
        <span className="owner">
          <Avatar name={r.owner} size={24} />
          <span>{firstName(r.owner)}</span>
        </span>
        {r.status === "SHIPPED" ? <span className="due due-ok">Shipped {fmtShort(r.shipped_at)}</span> : <Due r={r} />}
      </div>
      <span className="rcard-updated">Updated {ago(r.updated_at)}</span>
    </Link>
  );
}
