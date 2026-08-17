import { Skel } from '@/components/skeleton';

export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skel className="h-7 w-40 mb-2" />
          <Skel className="h-4 w-56" />
        </div>
        <Skel className="h-10 w-24 rounded-full" />
      </div>
      <div className="rounded-2xl bg-white border border-[#ece3ca] p-4">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skel key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
