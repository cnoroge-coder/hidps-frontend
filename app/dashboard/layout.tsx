"use client";
import { Shield, BarChart, Bell, BookText, UserCircle, LogOut, FileWarning, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', icon: BarChart, label: 'Dashboard' },
    { href: '/agents', icon: Users, label: 'Agents' },
    { href: '/alerts', icon: Bell, label: 'Alerts' },
    { href: '/logs', icon: BookText, label: 'Logs' },
    { href: '/firewall', icon: Shield, label: 'Firewall' },
    { href: '/file-monitoring', icon: FileWarning, label: 'File Monitoring' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-300 font-sans">
      <aside className="w-64 bg-slate-900 p-6 flex-col justify-between border-r border-slate-800 hidden md:flex">
        <div>
          <h1 className="text-2xl font-bold text-white mb-10 flex items-center gap-2">
            <Shield size={28} /> Sentinel
          </h1>
          <nav className="space-y-3">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center py-2 px-3 rounded-lg ${
                  pathname === item.href
                    ? 'bg-blue-500/10 text-blue-300'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <item.icon className="mr-3" /> {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div>
          <Link href="/profile" className="flex items-center py-2 px-3 text-slate-400 hover:bg-slate-800 rounded-lg">
            <UserCircle className="mr-3" /> Profile
          </Link>
          <button onClick={handleLogout} className="flex items-center py-2 px-3 text-slate-400 hover:bg-slate-800 rounded-lg w-full">
            <LogOut className="mr-3" /> Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
