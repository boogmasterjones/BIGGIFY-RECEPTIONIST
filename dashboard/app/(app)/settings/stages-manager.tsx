'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addStage, updateStage, deleteStage, moveStage } from './stages-actions';

export type Stage = { id: string; name: string; color: string; position: number };

export default function StagesManager({
  businessId,
  stages,
}: {
  businessId: string;
  stages: Stage[];
}) {
  const router = useRouter();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#4a3fd6');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    router.refresh();
  }

  async function onAdd() {
    if (!newName.trim()) return;
    setBusy(true);
    await addStage(businessId, newName, newColor);
    setNewName('');
    setBusy(false);
    refresh();
  }

  return (
    <section className="rounded-2xl bg-white border border-[#ece3ca] p-6">
      <div className="font-bold text-lg mb-1">Job stages</div>
      <p className="text-sm text-neutral-400 mb-4">
        Your pipeline. Rename, recolor, reorder, or add stages — this is what shows on the Jobs
        board.
      </p>

      <div className="space-y-2 mb-5">
        {stages.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <input
              type="color"
              defaultValue={s.color}
              onBlur={(e) => {
                if (e.target.value !== s.color) updateStage(s.id, s.name, e.target.value).then(refresh);
              }}
              className="w-9 h-9 rounded border border-neutral-200 p-0.5 cursor-pointer shrink-0"
              title="Color"
            />
            <input
              defaultValue={s.name}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== s.name)
                  updateStage(s.id, e.target.value, s.color).then(refresh);
              }}
              className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#CF0000]"
            />
            <button
              onClick={() => moveStage(s.id, 'up').then(refresh)}
              disabled={i === 0}
              className="w-8 h-8 grid place-items-center rounded text-neutral-400 hover:bg-[#FFF6E1] disabled:opacity-30"
              title="Move up"
            >
              ↑
            </button>
            <button
              onClick={() => moveStage(s.id, 'down').then(refresh)}
              disabled={i === stages.length - 1}
              className="w-8 h-8 grid place-items-center rounded text-neutral-400 hover:bg-[#FFF6E1] disabled:opacity-30"
              title="Move down"
            >
              ↓
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete stage "${s.name}"?`)) deleteStage(s.id).then(refresh);
              }}
              className="w-8 h-8 grid place-items-center rounded text-neutral-300 hover:text-[#CF0000]"
              title="Delete"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-neutral-100 pt-4">
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="w-9 h-9 rounded border border-neutral-200 p-0.5 cursor-pointer shrink-0"
        />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New stage name"
          className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-[#CF0000]"
        />
        <button
          onClick={onAdd}
          disabled={busy || !newName.trim()}
          className="rounded-full bg-[#CF0000] text-white font-bold px-4 py-2 text-sm disabled:opacity-50"
        >
          Add stage
        </button>
      </div>
    </section>
  );
}
