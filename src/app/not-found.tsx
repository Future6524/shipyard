import Link from "next/link";
import { Orb } from "@/components/ui";

export default function NotFound() {
  return (
    <section className="lost">
      <div className="dots" aria-hidden />
      <Orb className="orb-lost" />
      <div className="lost-copy reveal">
        <p className="split-word lost-code" aria-hidden>
          <span className="solid">4</span>
          <span className="outline">0</span>
          <span className="solid">4</span>
        </p>
        <h1>That page doesn&apos;t exist.</h1>
        <Link href="/" className="btn btn-hot">
          Back to the roadmap
        </Link>
      </div>
    </section>
  );
}
