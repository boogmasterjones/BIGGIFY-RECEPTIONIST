import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If logged in, go to dashboard
  if (user) {
    redirect('/jobs');
  }

  return (
    <div className="min-h-screen bg-[#FFF6E1] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#ece3ca] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-extrabold tracking-tight">
            <span className="text-[#CF0000]">BIGG</span>
            <span className="text-neutral-900">ify</span>
          </div>
          <Link href="/login" className="rounded-full bg-[#CF0000] text-white font-bold px-6 py-2.5 hover:bg-red-700">
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6">
            <span className="text-[#CF0000]">AI Receptionist</span> for Home Services
          </h1>
          <p className="text-xl text-neutral-600 mb-8">
            Never miss a call. Biggify answers every inquiry, books appointments, and sends follow-ups — so you can focus on the work.
          </p>
          <Link href="/login" className="inline-block rounded-full bg-[#CF0000] text-white font-bold px-8 py-4 text-lg hover:bg-red-700">
            Get started free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#ece3ca] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-sm text-neutral-500">
          © 2026 Biggify. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
