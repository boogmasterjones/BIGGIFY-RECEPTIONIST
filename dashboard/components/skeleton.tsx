/** Skeleton primitives — subtle pulse on a warm neutral, sized via className. */
export function Skel({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[#ece3ca]/70 ${className}`} />;
}

export function SkelCard({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  return <div className={`rounded-2xl bg-white border border-[#ece3ca] p-5 ${className}`}>{children}</div>;
}

/** A page header block (title + subtitle) common to every route. */
export function SkelHeader() {
  return (
    <div className="mb-6">
      <Skel className="h-7 w-52 mb-2" />
      <Skel className="h-4 w-72" />
    </div>
  );
}
