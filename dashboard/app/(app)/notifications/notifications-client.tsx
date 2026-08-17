'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { markRead, markAllRead, deleteNotification } from './actions';

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

const TYPE_ICON: Record<string, string> = {
  new_lead: '📞',
  new_message: '✉️',
  appointment_booked: '📅',
  callback_requested: '↩️',
  job_updated: '🧰',
  default: '🔔',
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsClient({ initial }: { initial: Notification[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const unread = initial.filter((n) => !n.read_at).length;
  const list = filter === 'unread' ? initial.filter((n) => !n.read_at) : initial;

  async function onRead(n: Notification) {
    if (n.read_at) return;
    await markRead(n.id);
    router.refresh();
  }
  async function onReadAll() {
    await markAllRead();
    router.refresh();
  }
  async function onDelete(id: string) {
    await deleteNotification(id);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
          <p className="text-neutral-500 text-sm">
            {unread > 0 ? `${unread} unread` : 'You’re all caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-[#ece3ca] bg-white text-sm overflow-hidden">
            {(['all', 'unread'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3.5 py-1.5 font-semibold capitalize ${
                  filter === k ? 'bg-[#CF0000] text-white' : 'text-neutral-500'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          {unread > 0 && (
            <button onClick={onReadAll} className="rounded-full border border-[#ece3ca] bg-white px-4 py-1.5 text-sm font-semibold text-neutral-600 hover:text-[#CF0000]">
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-[#ece3ca] overflow-hidden">
        {list.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet. New calls, messages, and bookings from your receptionist will show up here.'}
          </div>
        ) : (
          <ul>
            {list.map((n) => {
              const icon = TYPE_ICON[n.type] || TYPE_ICON.default;
              return (
                <li
                  key={n.id}
                  onClick={() => onRead(n)}
                  className={`group flex gap-3 px-5 py-3.5 border-b border-neutral-50 cursor-pointer transition ${
                    n.read_at ? 'hover:bg-[#FFFBF0]' : 'bg-[#FFF6E1]/60 hover:bg-[#FFF6E1]'
                  }`}
                >
                  <div className="text-lg leading-none mt-0.5">{icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!n.read_at && <span className="w-2 h-2 rounded-full bg-[#CF0000] shrink-0" />}
                      <span className={`text-sm ${n.read_at ? 'font-medium text-neutral-700' : 'font-bold'}`}>{n.title}</span>
                    </div>
                    {n.body && <p className="text-sm text-neutral-500 mt-0.5">{n.body}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-neutral-400 whitespace-nowrap">{timeAgo(n.created_at)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(n.id);
                      }}
                      className="text-neutral-200 group-hover:text-[#CF0000] text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
