"use client";
import { Plus, UserPlus, Shield, Download } from 'lucide-react';
import AgentSelector from '@/components/AgentSelector';
import { useAgent } from '@/lib/agent-context';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';

// --- MAIN AGENTS COMPONENT ---
export default function AgentsPage() {
  const { agents, selectedAgent } = useAgent();
  const [user, setUser] = useState<User | null>(null);
  const [agentStats, setAgentStats] = useState<Map<string, { is_installed: boolean }>>(new Map());
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    }
    getUser();
  }, [supabase]);

  useEffect(() => {
    const fetchAgentStats = async () => {
      const { data, error } = await supabase
        .from('agent_stats')
        .select('agent_id, is_installed');
      
      if (error) {
        console.error('Error fetching agent stats:', error);
      } else {
        const statsMap = new Map(data.map(stat => [stat.agent_id, { is_installed: stat.is_installed }]));
        setAgentStats(statsMap);
      }
    };
    fetchAgentStats();
  }, []);

  return (
    <>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-white">Agents</h2>
          {selectedAgent && <span className="text-slate-400">({selectedAgent.name} selected)</span>}
        </div>
        <div className="flex items-center gap-4">
          <AgentSelector />
          <Link href="/agent-setup" className="flex items-center gap-2 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600">
            <Plus size={20} />
            Add Agent
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => {
          const stats = agentStats.get(agent.id);
          const isInstalled = stats?.is_installed || false;

          return (
            <div key={agent.id} className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Shield size={24} className="text-slate-400" />
                  <h3 className="text-xl font-bold text-white">{agent.name}</h3>
                </div>
              </div>
              <div className="mt-6">
                {user?.id === agent.owner_id && (
                  isInstalled ? (
                    <Link href={`/agents/${agent.id}/add-user`} className="flex items-center gap-2 w-full justify-center bg-slate-800 text-slate-300 py-2 px-4 rounded-lg hover:bg-slate-700">
                      <UserPlus size={18} />
                      Add Users
                    </Link>
                  ) : (
                    <Link href={`/agents/${agent.id}/install`} className="flex items-center gap-2 w-full justify-center bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700">
                      <Download size={18} />
                      Install Agent
                    </Link>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
