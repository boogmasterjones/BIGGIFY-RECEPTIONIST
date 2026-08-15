export default function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">{title}</h1>
      <p className="text-neutral-500 mb-6">{note}</p>
      <div className="rounded-2xl bg-white border border-[#ece3ca] p-8 text-center text-neutral-400">
        Full {title.toLowerCase()} module lands in the next build phase.
      </div>
    </div>
  );
}
