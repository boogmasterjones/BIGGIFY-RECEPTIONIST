import { Skel } from '@/components/skeleton';

export default function Loading() {
  return (
    <div>
      <Skel className="h-7 w-24 mb-2" />
      <Skel className="h-4 w-80 mb-6" />
      <div className="rounded-2xl bg-white border border-[#ece3ca] divide-y divide-neutral-50">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skel className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1">
              <Skel className="h-4 w-40 mb-2" />
              <Skel className="h-3 w-64" />
            </div>
            <Skel className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
