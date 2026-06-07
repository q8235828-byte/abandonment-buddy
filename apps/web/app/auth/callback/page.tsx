'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    const userStr = params.get('user');

    if (!token || !userStr) {
      router.push('/login?error=oauth_failed');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      router.push('/dashboard');
    } catch {
      router.push('/login?error=oauth_failed');
    }
  }, [params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <Loader2 size={32} className="mx-auto animate-spin text-teal-400" />
        <p className="mt-4 text-sm text-slate-400">Signing you in with Google…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 size={32} className="animate-spin text-teal-400" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
