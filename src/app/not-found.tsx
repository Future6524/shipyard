import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <p>That page doesn’t exist.</p>
      <p style={{ marginTop: 10 }}>
        <Link href="/" style={{ color: "var(--indigo-600)", fontWeight: 600 }}>
          Back to the roadmap
        </Link>
      </p>
    </div>
  );
}
