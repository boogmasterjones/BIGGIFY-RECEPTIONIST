'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Business, Role } from '@/lib/data';
import CommandPalette, { type Command } from '@/components/command-palette';

type NavItem = { href: string; label: string; icon: string; show: boolean; badge?: number };

export default function Shell({
  business,
  role,
  isSuperAdmin,
  children,
}: {
  business: Business;
  role: Role | null;
  isSuperAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const f = business.features || {};
  const canManage = role === 'owner' || role === 'admin' || isSuperAdmin;

  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (localStorage.getItem('biggify_sidebar_collapsed') === '1') setCollapsed(true);
  }, []);

  // ⌘K / Ctrl-K command palette
  const [cmdOpen, setCmdOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Unread notification count for the sidebar badge. Refetches on navigation and
  // whenever the notifications page signals a change (mark-read / read-all / delete).
  const [unread, setUnread] = useState(0);
  const [notifTick, setNotifTick] = useState(0);
  useEffect(() => {
    const h = () => setNotifTick((t) => t + 1);
    window.addEventListener('biggify:notifications-changed', h);
    return () => window.removeEventListener('biggify:notifications-changed', h);
  }, []);
  useEffect(() => {
    if (!business.features?.notifications) return;
    let active = true;
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .is('read_at', null)
      .then(({ count }) => {
        if (active) setUnread(count || 0);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, business.id, notifTick]);
  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem('biggify_sidebar_collapsed', next ? '1' : '0');
      return next;
    });
  }

  // Every module is gated by the business's feature flags — a client only sees
  // what their plan includes, so it feels like software built just for them.
  const nav: NavItem[] = [
    { href: '/', label: 'Home', icon: '🏠', show: true },
    { href: '/contacts', label: 'Contacts', icon: '👥', show: !!f.contacts },
    { href: '/jobs', label: 'Jobs', icon: '🧰', show: !!f.jobs },
    { href: '/appointments', label: 'Appointments', icon: '📅', show: !!f.appointments || !!f.calendar },
    { href: '/calls', label: 'Calls', icon: '📞', show: !!f.receptionist },
    { href: '/notifications', label: 'Notifications', icon: '🔔', show: !!f.notifications, badge: unread },
    { href: '/money', label: 'Money', icon: '💳', show: !!f.invoicing },
    { href: '/statistics', label: 'Statistics', icon: '📊', show: !!f.statistics },
    { href: '/settings', label: 'Settings', icon: '⚙️', show: canManage },
    { href: '/admin', label: 'Biggify Admin', icon: '🛡️', show: isSuperAdmin },
  ];

  // Command palette entries: jump to any page + quick-create actions.
  const commands: Command[] = [
    ...nav.filter((n) => n.show).map((n) => ({ id: `nav-${n.href}`, label: n.label, icon: n.icon, href: n.href, group: 'Go to' })),
    ...(f.jobs ? [{ id: 'new-job', label: 'New job', icon: '🧰', href: '/jobs?new=1', group: 'Create' }] : []),
    ...(f.contacts ? [{ id: 'new-contact', label: 'New contact', icon: '👥', href: '/contacts?new=1', group: 'Create' }] : []),
    ...(f.appointments || f.calendar ? [{ id: 'new-appt', label: 'New appointment', icon: '📅', href: '/appointments?new=1', group: 'Create' }] : []),
  ];

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-[#FFF6E1] text-neutral-900">
      <aside
        className={`${collapsed ? 'w-16' : 'w-64'} shrink-0 bg-white border-r border-[#ece3ca] sticky top-0 h-screen flex flex-col p-3 transition-[width] duration-200`}
      >
        {/* Header: co-branding + collapse toggle */}
        <div className="flex items-center gap-2 px-1 pt-1 pb-3 border-b border-neutral-100 mb-2 min-h-[52px]">
          {!collapsed && (
            <div className="flex-1 min-w-0">
              {business.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={business.logo_url} alt={business.name} className="h-7" />
              ) : (
                <div className="font-extrabold text-base leading-tight truncate">{business.name}</div>
              )}
              <div className="text-[10px] text-neutral-400 mt-0.5">
                Powered by <span className="text-[#CF0000] font-bold">BIGG</span>ify
              </div>
            </div>
          )}
          <button
            onClick={toggle}
            title={collapsed ? 'Expand' : 'Collapse'}
            className="shrink-0 w-7 h-7 grid place-items-center rounded-md text-neutral-400 hover:bg-[#FFF6E1] hover:text-neutral-700"
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          <button
            onClick={() => setCmdOpen(true)}
            title="Search (⌘K)"
            className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 mb-1 text-sm text-neutral-400 border border-[#ece3ca] bg-[#FFFBF0] hover:text-neutral-700 hover:border-[#e0d4b0] transition ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <span className="text-[14px]">🔍</span>
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Search…</span>
                <kbd className="text-[10px] font-bold text-neutral-400 border border-neutral-200 rounded px-1.5 py-0.5 bg-white">⌘K</kbd>
              </>
            )}
          </button>
          {nav
            .filter((n) => n.show)
            .map((n) => {
              const active = n.href === '/' ? pathname === '/' : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  title={collapsed ? n.label : undefined}
                  className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    collapsed ? 'justify-center' : ''
                  } ${active ? 'bg-[#CF0000] text-white' : 'text-neutral-600 hover:bg-[#FFF6E1]'}`}
                >
                  <span className="text-[15px] relative">
                    {n.icon}
                    {collapsed && n.badge ? (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#CF0000] text-white text-[10px] font-bold grid place-items-center">
                        {n.badge > 9 ? '9+' : n.badge}
                      </span>
                    ) : null}
                  </span>
                  {!collapsed && <span className="flex-1">{n.label}</span>}
                  {!collapsed && n.badge ? (
                    <span
                      className={`min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold grid place-items-center ${
                        active ? 'bg-white text-[#CF0000]' : 'bg-[#CF0000] text-white'
                      }`}
                    >
                      {n.badge > 99 ? '99+' : n.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
        </nav>

        <button
          onClick={signOut}
          title="Sign out"
          className={`mt-3 text-sm text-neutral-400 hover:text-neutral-700 px-3 py-2 ${
            collapsed ? 'text-center' : 'text-left'
          }`}
        >
          {collapsed ? '⎋' : 'Sign out'}
        </button>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="mx-auto max-w-5xl p-8">{children}</div>
      </main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} commands={commands} />
    </div>
  );
}
