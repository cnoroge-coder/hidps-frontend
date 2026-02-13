"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Loader } from 'lucide-react';
import Link from 'next/link';

export default function InstallationConfirmedPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/agents');
    }, 3000); // 3-second delay before redirecting

    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-4 text-center">
      <ShieldCheck className="mx-auto text-emerald-500 w-20 h-20 mb-6 animate-pulse" />
      <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
        Agent Successfully Connected!
      </h1>
      <p className="text-lg text-slate-400 mb-8 max-w-lg">
        Your host is now being monitored by Sentinel HIDS. You are being redirected to your agents page.
      </p>
      <div className="flex items-center justify-center text-slate-500">
        <Loader className="animate-spin mr-3" />
        <span>Redirecting...</span>
      </div>
      <p className="text-slate-600 mt-12">
        If you are not redirected automatically,{' '}
        <Link href="/agents" className="text-blue-500 hover:underline">
          click here
        </Link>.
      </p>
    </div>
  );
}
