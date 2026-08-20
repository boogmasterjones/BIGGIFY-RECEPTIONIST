'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fn =
      mode === 'signin'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await fn;
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/home');
    router.refresh();
  }

  return (
    <main className="min-h-screen grid place-items-center bg-[#FFF6E1] p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-[#ece3ca] shadow-[0_20px_50px_-24px_rgba(20,16,80,.35)] p-8">
        <div className="text-2xl font-extrabold tracking-tight mb-1">
          <span className="text-[#CF0000]">BIGG</span>
          <span className="text-neutral-900">ify</span>
        </div>
        <p className="text-sm text-neutral-500 mb-6">Sign in to your dashboard.</p>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-[15px] outline-none focus:border-[#CF0000]"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-[15px] outline-none focus:border-[#CF0000]"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-200 cursor-pointer accent-[#CF0000]"
            />
            <span className="text-neutral-600">Keep me signed in</span>
          </label>
          {error && <p className="text-sm text-[#b00000]">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[#CF0000] text-white font-bold py-2.5 disabled:opacity-60"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="mt-4 text-sm text-neutral-500 hover:text-neutral-800 w-full text-center"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Have an account? Sign in'}
        </button>
      </div>
    </main>
  );
}
