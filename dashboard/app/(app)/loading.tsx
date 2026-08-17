import { Skel, SkelCard } from '@/components/skeleton';

export default function Loading() {
  return (
    <div>
      <Skel className="h-7 w-48 mb-2" />
      <Skel className="h-4 w-64 mb-4" />
      <Skel className="h-9 w-80 rounded-full mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkelCard key={i}>
            <Skel className="h-8 w-14 mb-2" />
            <Skel className="h-4 w-24" />
          </SkelCard>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SkelCard>
            <Skel className="h-5 w-40 mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skel key={i} className="h-4 w-full mb-3" />
            ))}
          </SkelCard>
          <SkelCard>
            <Skel className="h-5 w-32 mb-4" />
            <Skel className="h-4 w-full mb-3" />
            <Skel className="h-4 w-3/4" />
          </SkelCard>
        </div>
        <SkelCard>
          <Skel className="h-5 w-24 mb-4" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skel key={i} className="h-4 w-full mb-3" />
          ))}
        </SkelCard>
      </div>
    </div>
  );
}
