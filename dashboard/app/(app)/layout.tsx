import { redirect } from 'next/navigation';
import { getUserAndBusiness } from '@/lib/data';
import Shell from '@/components/shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, business, role, isSuperAdmin } = await getUserAndBusiness();

  if (!user) redirect('/login');

  // Signed in but not yet linked to a business (e.g. right after sign-up).
  if (!business) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#FFF6E1] p-6 text-center">
        <div className="max-w-md rounded-2xl bg-white border border-[#ece3ca] p-8">
          <div className="text-xl font-extrabold mb-2">Almost there</div>
          <p className="text-neutral-600 text-sm">
            Your account isn&apos;t linked to a business yet. Your Biggify admin needs to add you to
            one. (During setup, run the membership SQL from <code>supabase/seed.sql</code>.)
          </p>
        </div>
      </main>
    );
  }

  return (
    <Shell business={business} role={role} isSuperAdmin={isSuperAdmin}>
      {children}
    </Shell>
  );
}
