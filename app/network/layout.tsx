"use client";
import { Shield, BarChart, Bell, BookText, UserCircle, LogOut, FileWarning, Users, Network } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import Sidebar from '../../components/Sidebar';
import { useState } from 'react';

export default function NetworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', icon: BarChart, label: 'Dashboard' },
    { href: '/agents', icon: Users, label: 'Agents' },
    { href: '/alerts', icon: Bell, label: 'Alerts' },
    { href: '/network', icon: Network, label: 'Network' },
    { href: '/logs', icon: BookText, label: 'Logs' },
    { href: '/firewall', icon: Shield, label: 'Firewall' },
    { href: '/file-monitoring', icon: FileWarning, label: 'File Monitoring' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-300 font-sans">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <main className="flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}