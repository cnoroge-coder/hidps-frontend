"use client";
import { useState, useEffect, useMemo } from 'react';
import { Bell, Shield, Cpu, MemoryStick, HardDrive } from 'lucide-react';
import AgentSelector from '@/components/AgentSelector';
import { useAgent } from '@/lib/agent-context';
import { useWebSocket } from '@/lib/websocket-context';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import DailyReportsWidget from '@/components/DailyReportsWidget';

type Alert = Database['public']['Tables']['alerts']['Row'];
type AgentStats = Database['public']['Tables']['agent_stats']['Row'];

const ResourceUsage = ({ icon: Icon, title, value, color }: { icon: React.ElementType, title: string, value: number, color: string }) => (
  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon size={18} />
        <span className="font-medium">{title}</span>
      </div>
      <span className="font-bold text-white">{value.toFixed(1)}%</span>
    </div>
    <div className="w-full bg-slate-800 rounded-full h-2.5">
      <div className={`${color} h-2.5 rounded-full`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const StatusIndicator = ({ label, isOnline }: { label: string, isOnline: boolean }) => (
  <div className="flex items-center gap-2 text-sm">
    <span className="relative flex h-3 w-3">
      {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
      <span className={`relative inline-flex rounded-full h-3 w-3 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
    </span>
    <span className="text-slate-400">{label}:</span>
    <span className={isOnline ? "text-green-400" : "text-red-400"}>
      {isOnline ? 'Online' : 'Offline'}
    </span>
  </div>
);

export default function DashboardPage() {
  const { selectedAgent } = useAgent();
  const { logs } = useWebSocket();
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!selectedAgent) return;

    const fetchAgentStats = async () => {
      const { data } = await supabase
        .from('agent_stats')
        .select('*')
        .eq('agent_id', selectedAgent.id)
        .single();

      if (data) setAgentStats(data);
    };

    fetchAgentStats();

    const channel = supabase
      .channel(`agent_stats:agent_id=eq.${selectedAgent.id}`)
      .on<AgentStats>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_stats',
          filter: `agent_id=eq.${selectedAgent.id}`,
        },
        (payload) => setAgentStats(payload.new as AgentStats)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedAgent, supabase]);

  useEffect(() => {
    if (!selectedAgent) return;

    const fetchAlerts = async () => {
      const { data } = await supabase
        .from('alerts')
        .select('*')
        .eq('agent_id', selectedAgent.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (data) setRecentAlerts(data);
    };

    fetchAlerts();
  }, [selectedAgent, supabase]);

  const recentLogs = useMemo(() => {
    if (!selectedAgent) return [];
    return logs
      .filter(log => log.agent_id === selectedAgent.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3);
  }, [logs, selectedAgent]);

  const cpu = Number(agentStats?.cpu_usage ?? 0);
  const ram = Number(agentStats?.ram_usage ?? 0);
  const storage = Number(agentStats?.storage_usage ?? 0);
  const firewallEnabled = selectedAgent?.firewall_enabled ?? false;

  return (
    <>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h2 className="text-3xl font-bold text-white">Dashboard</h2>
        <div className="flex items-center gap-4">
          <StatusIndicator label="Agent Status" isOnline={selectedAgent?.is_online || false} />
          <AgentSelector />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <ResourceUsage icon={Cpu} title="CPU Usage" value={cpu} color="bg-cyan-500" />
        <ResourceUsage icon={MemoryStick} title="RAM Usage" value={ram} color="bg-purple-500" />
        <ResourceUsage icon={HardDrive} title="Storage" value={storage} color="bg-amber-500" />
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-slate-400" />
            <span className="font-medium text-slate-400">Firewall</span>
          </div>
          <span className={`font-bold px-3 py-1 rounded-full ${
            firewallEnabled
              ? 'text-green-400 bg-green-500/10'
              : 'text-red-400 bg-red-500/10'
          }`}>
            {firewallEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Alerts */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h3 className="text-xl font-bold text-white mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            {recentAlerts.map(alert => (
              <div key={alert.id} className="flex gap-4 p-3 rounded-lg hover:bg-slate-800/50">
                <div className="mt-1 p-2 h-fit rounded-full bg-red-500/20 text-red-400">
                  <Bell size={16} />
                </div>
                <div>
                  <p className="font-semibold text-white">{alert.title}</p>
                  <p className="text-sm text-slate-400">{alert.message}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(alert.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Logs */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h3 className="text-xl font-bold text-white mb-4">Recent Logs</h3>
          <div className="font-mono text-xs text-slate-400 space-y-2">
            {recentLogs.map((log, index) => (
              <div key={index} className="p-2 rounded hover:bg-slate-800/50">
                <p className="text-slate-500">
                  {new Date(log.timestamp).toLocaleString()}
                </p>
                <p className="text-cyan-400">{log.service}</p>
                <p className="text-slate-300">{log.message}</p>
              </div>
            ))}
            {recentLogs.length === 0 && (
              <p className="text-slate-500">No recent logs.</p>
            )}
          </div>
        </div>

        {/* Daily Reports - REPLACED WITH WIDGET */}
        {selectedAgent && (
          <DailyReportsWidget agentId={selectedAgent.id} />
        )}
      </div>
    </>
  );
}