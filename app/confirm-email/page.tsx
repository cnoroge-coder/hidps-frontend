"use client";

import Link from 'next/link';
import { MailCheck } from 'lucide-react';

export default function ConfirmEmailPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 md:p-12 w-full max-w-md text-center">
        <MailCheck className="mx-auto h-16 w-16 text-green-400 mb-6" />
        <h1 className="text-4xl font-bold text-center mb-4">Confirm your email</h1>
        <p className="text-slate-400 mb-8">
            We've sent a confirmation link to your email address. Please click the link to complete your registration.
        </p>
        <Link href="/login" className="text-blue-500 hover:underline">
            Back to Login
        </Link>
      </div>
    </div>
  );
}
