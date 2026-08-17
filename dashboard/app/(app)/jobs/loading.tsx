import { Skel } from '@/components/skeleton';

export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skel className="h-7 w-24 mb-2" />
          <Skel className="h-4 w-72" />
        </div>
        <Skel className="h-10 w-28 rounded-full" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, c) => (
          <div key={c} className="w-72 shrink-0 rounded-2xl border border-[#ece3ca] bg-[#FFFBF0] p-2.5">
            <Skel className="h-4 w-24 m-1.5 mb-3" />
            {Array.from({ length: c === 0 ? 3 : 1 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white border border-[#ece3ca] p-3 mb-2">
                <Skel className="h-4 w-32 mb-2" />
                <Skel className="h-3 w-20" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
