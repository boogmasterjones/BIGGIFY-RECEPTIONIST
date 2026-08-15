'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Business, Role } from '@/lib/data';

type NavItem = { href: string; label: string; icon: string; show: boolean };

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
    { href: '/notifications', label: 'Notifications', icon: '🔔', show: !!f.notifications },
    { href: '/invoicing', label: 'Invoicing', icon: '💳', show: !!f.invoicing },
    { href: '/statistics', label: 'Statistics', icon: '📊', show: !!f.statistics },
    { href: '/settings', label: 'Settings', icon: '⚙️', show: canManage },
    { href: '/admin', label: 'Biggify Admin', icon: '🛡️', show: isSuperAdmin },
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
          {nav
            .filter((n) => n.show)
            .map((n) => {
              const active = n.href === '/' ? pathname === '/' : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  title={collapsed ? n.label : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    collapsed ? 'justify-center' : ''
                  } ${active ? 'bg-[#CF0000] text-white' : 'text-neutral-600 hover:bg-[#FFF6E1]'}`}
                >
                  <span className="text-[15px]">{n.icon}</span>
                  {!collapsed && n.label}
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
    </div>
  );
}
