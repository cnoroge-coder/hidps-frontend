"use client";

import Link from 'next/link';
import { 
  LayoutDashboard, 
  BarChart, 
  FileCog, 
  AlertTriangle, 
  History, 
  Settings, 
  LogOut, 
  ChevronsLeft, 
  ChevronsRight,
  Users,
  Bell,
  BookText,
  Shield,
  FileWarning,
  UserCircle,
  Network,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';

const navItems = [
    { href: '/dashboard', icon: BarChart, label: 'Dashboard' },
    { href: '/agents', icon: Users, label: 'Agents' },
    { href: '/alerts', icon: Bell, label: 'Alerts' },
    { href: '/network', icon: Network, label: 'Network' },
    { href: '/logs', icon: BookText, label: 'Logs' },
    { href: '/firewall', icon: Shield, label: 'Firewall' },
    { href: '/file-monitoring', icon: FileWarning, label: 'File Monitoring' },
  ];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside 
      className={`bg-slate-900 flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      <div className={`flex items-center p-6 border-b border-slate-800 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && <h1 className="text-xl font-bold text-white whitespace-nowrap flex items-center gap-2"><Shield size={28} /> Sentinel</h1>}
        <button onClick={onToggle} className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg">
          {isCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href} 
            className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-800 hover:text-white rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''} ${
                pathname === item.href
                  ? 'bg-blue-500/10 text-blue-300'
                  : 'text-slate-400'
              }`}
            title={isCollapsed ? item.label : ''}
          >
            <item.icon size={20} />
            {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Link 
          href="/profile" 
          className={`flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? 'Profile' : ''}
        >
          <UserCircle size={20} />
          {!isCollapsed && <span className="whitespace-nowrap">Profile</span>}
        </Link>
        <button 
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-colors ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
        </button>
      </div>
    </aside>
  );
}