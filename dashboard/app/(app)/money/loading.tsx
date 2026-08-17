import { Skel, SkelCard } from '@/components/skeleton';

export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skel className="h-7 w-28 mb-2" />
          <Skel className="h-4 w-64" />
        </div>
        <Skel className="h-10 w-36 rounded-full" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkelCard key={i}>
            <Skel className="h-8 w-24 mb-2" />
            <Skel className="h-4 w-20" />
          </SkelCard>
        ))}
      </div>
      <div className="rounded-2xl bg-white border border-[#ece3ca]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-neutral-50">
            <Skel className="h-4 w-40" />
            <Skel className="h-4 w-20 ml-auto" />
            <Skel className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
