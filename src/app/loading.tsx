/** Skeleton shown while a server page streams in. */
export default function Loading() {
  return (
    <div className="wrap section" aria-busy="true" aria-label="Loading">
      <div className="skeleton skeleton-title" />
      <div className="skeleton-grid">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    </div>
  );
}
