import { Skel } from '@/components/skeleton';

export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skel className="h-7 w-44 mb-2" />
          <Skel className="h-4 w-56" />
        </div>
        <Skel className="h-8 w-28 rounded-full" />
      </div>
      <div className="rounded-2xl bg-white border border-[#ece3ca] divide-y divide-neutral-50">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-4">
            <Skel className="h-6 w-6 rounded-full shrink-0" />
            <div className="flex-1">
              <Skel className="h-4 w-1/2 mb-2" />
              <Skel className="h-3 w-1/3" />
            </div>
            <Skel className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
