import { Skel } from '@/components/skeleton';

export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skel className="h-7 w-32 mb-2" />
          <Skel className="h-4 w-56" />
        </div>
        <Skel className="h-10 w-32 rounded-full" />
      </div>
      <div className="rounded-2xl bg-white border border-[#ece3ca] overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-neutral-50">
            <Skel className="h-4 w-40" />
            <Skel className="h-4 w-32 ml-auto" />
            <Skel className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
