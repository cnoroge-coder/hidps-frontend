"use client";
import { useState, useEffect } from 'react';
import { Shield, ShieldOff, Plus, Trash2, ChevronDown, Wifi, WifiOff, Loader2 } from 'lucide-react';
import AgentSelector from '@/components/AgentSelector';
import { useAgent } from '@/lib/agent-context';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import { useWebSocket } from '@/lib/websocket-context';

type AgentStats = Database['public']['Tables']['agent_stats']['Row'];
type Agent = Database['public']['Tables']['agents']['Row'];

type Policy = 'allow' | 'deny' | 'reject';

// --- MAIN FIREWALL PAGE COMPONENT ---
export default function FirewallPage() {
  const { selectedAgent } = useAgent();
  const { firewallRules, isConnected, sendCommand } = useWebSocket();
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
  const [localFirewallEnabled, setLocalFirewallEnabled] = useState<boolean | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const supabase = createClient();
  
  // State for the new rule form
  const [newRuleAction, setNewRuleAction] = useState<'allow' | 'deny'>('allow');
  const [newRulePort, setNewRulePort] = useState('');
  const [newRuleProtocol, setNewRuleProtocol] = useState<'tcp' | 'udp'>('tcp');
  const [newRuleFrom, setNewRuleFrom] = useState('any');

  const rules = firewallRules; // Use rules from WebSocket

  useEffect(() => {
    if (!selectedAgent) return;

    const fetchAgentStats = async () => {
      const { data, error } = await supabase
        .from('agent_stats')
        .select('*')
        .eq('agent_id', selectedAgent.id)
        .single();

      if (error) {
        console.error('Error fetching agent stats:', error);
      } else {
        setAgentStats(data);
      }
    };

    fetchAgentStats();

    // Subscribe to agent_stats changes
    const statsChannel = supabase
      .channel(`agent_stats:agent_id=eq.${selectedAgent.id}`)
      .on<AgentStats>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_stats',
          filter: `agent_id=eq.${selectedAgent.id}`,
        },
        (payload) => {
          setAgentStats(payload.new as AgentStats);
          // Clear loading when agent reports back
          setIsToggling(false);
        }
      )
      .subscribe();

    // Subscribe to agents table for firewall_enabled changes (this is what backend updates!)
    const agentsChannel = supabase
      .channel(`agents:id=eq.${selectedAgent.id}`)
      .on<Agent>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agents',
          filter: `id=eq.${selectedAgent.id}`,
        },
        (payload) => {
          const newAgent = payload.new as any;
          console.log('Agent firewall status updated:', newAgent.firewall_enabled);
          setLocalFirewallEnabled(newAgent.firewall_enabled ?? false);
          // Clear loading immediately when firewall status changes
          setIsToggling(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statsChannel);
      supabase.removeChannel(agentsChannel);
    };
  }, [selectedAgent, supabase]);

  // Use local state if available (from realtime), otherwise fall back to selectedAgent
  const firewallEnabled = localFirewallEnabled ?? selectedAgent?.firewall_enabled ?? false;
  
  const handleToggleFirewall = async () => {
    if (!selectedAgent) return;

    const newState = !firewallEnabled;
    setIsToggling(true);

    // Send command to agent
    sendCommand(selectedAgent.id, "toggle_firewall", { 
      enabled: newState 
    });

    // Safety timeout - clear after 5 seconds if agent doesn't respond
    setTimeout(() => setIsToggling(false), 5000);
  };

  const handleAddRule = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!selectedAgent || !newRulePort) return;

    // Format for UFW command (e.g., "80/tcp")
    const ruleString = `${newRulePort}/${newRuleProtocol}`;
    
    sendCommand(selectedAgent.id, "add_firewall_rule", {
      rule: ruleString,
      action: newRuleAction
    });

    setNewRulePort(''); // Clear input
  };

  const handleRemoveRule = (index: string) => {
    if (!selectedAgent) return;
    
    // Send the rule number (index) to delete
    sendCommand(selectedAgent.id, "delete_firewall_rule", {
      index: index
    });
  };

  const PolicyDropdown = ({ value, onChange }: { value: Policy, onChange: (v: Policy) => void }) => (
    <div className="relative">
        <select
            value={value}
            onChange={(e) => onChange(e.target.value as Policy)}
            className="appearance-none w-full bg-slate-800 border border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            <option value="allow">Allow</option>
            <option value="deny">Deny</option>
            <option value="reject">Reject</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    </div>
  );

  return (
    <>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Firewall Management</h2>
          <div className="flex items-center gap-2">
            <p className="text-slate-400">Configure and manage UFW (Uncomplicated Firewall) policies and rules.</p>
            {isConnected ? (
              <span className="flex items-center gap-1 text-xs text-green-400 bg-green-900/50 rounded-full px-2 py-0.5">
                <Wifi size={12} />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-red-400 bg-red-900/50 rounded-full px-2 py-0.5">
                <WifiOff size={12} />
                Disconnected
              </span>
            )}
          </div>
        </div>
        <AgentSelector />
      </header>

      <div className="space-y-8">
        {/* Firewall Status & Default Policies */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                <h3 className="text-lg font-semibold text-white mb-4">Firewall Status</h3>
                <button 
                    onClick={handleToggleFirewall}
                    disabled={!isConnected || isToggling}
                    className={`w-full flex items-center justify-center gap-3 py-3 rounded-lg font-semibold transition-colors ${
                        firewallEnabled
                            ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                            : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    } ${(!isConnected || isToggling) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isToggling ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        {firewallEnabled ? <Shield size={20} /> : <ShieldOff size={20} />}
                        {firewallEnabled ? 'Active' : 'Inactive'}
                      </>
                    )}
                </button>
                <p className="text-xs text-slate-600 mt-2 text-center">
                   Debug: {firewallEnabled ? 'Enabled' : 'Disabled'}
                </p>
            </div>
            {/* <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <h3 className="text-lg font-semibold text-white mb-4">Default Incoming</h3>
                 <PolicyDropdown value={defaultIncoming} onChange={(v) => handlePolicyChange('incoming', v)} />
            </div>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <h3 className="text-lg font-semibold text-white mb-4">Default Outgoing</h3>
                 <PolicyDropdown value={defaultOutgoing} onChange={(v) => handlePolicyChange('outgoing', v)} />
            </div> */}
            {/* This firewall is always in "default deny incoming, default allow outgoing" mode. Explain that to the user */}
            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <h3 className="text-lg font-semibold text-white mb-4">Default Policies</h3>
                  <p className="text-slate-400">This firewall operates in a default deny incoming, default allow outgoing mode.</p>
            </div>

        </div>

        {/* Firewall Rules */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h3 className="text-lg font-semibold text-white mb-4">Firewall Rules</h3>
            {/* Add Rule Form */}
            <form onSubmit={handleAddRule} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end mb-6 p-4 bg-slate-950/50 rounded-lg">
                <div className="col-span-2 md:col-span-1">
                    <label className="text-sm font-medium text-slate-400 mb-1 block">Action</label>
                    <select value={newRuleAction} onChange={e => setNewRuleAction(e.target.value as 'allow' | 'deny')} className="w-full bg-slate-800 border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="allow">Allow</option>
                        <option value="deny">Deny</option>
                    </select>
                </div>
                 <div>
                    <label className="text-sm font-medium text-slate-400 mb-1 block">Port</label>
                    <input type="text" placeholder="e.g., 80" value={newRulePort} onChange={e => setNewRulePort(e.target.value)} className="w-full bg-slate-800 border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                 <div>
                    <label className="text-sm font-medium text-slate-400 mb-1 block">Protocol</label>
                     <select value={newRuleProtocol} onChange={e => setNewRuleProtocol(e.target.value as 'tcp' | 'udp')} className="w-full bg-slate-800 border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="tcp">TCP</option>
                        <option value="udp">UDP</option>
                    </select>
                </div>
                 <div>
                    <label className="text-sm font-medium text-slate-400 mb-1 block">From</label>
                    <input type="text" placeholder="any" value={newRuleFrom} onChange={e => setNewRuleFrom(e.target.value)} className="w-full bg-slate-800 border-slate-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <button type="submit" className="col-span-2 md:col-span-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg h-10">
                    <Plus size={18}/> Add Rule
                </button>
            </form>

            {/* Rules Table */}
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-slate-800 text-sm text-slate-400">
                        <th className="p-4">Action</th>
                        <th className="p-4">Port/Service</th>
                        <th className="p-4">Protocol</th>
                        <th className="p-4">From</th>
                        <th className="p-4"></th>
                    </tr>
                </thead>
                <tbody>
                    {rules.map(rule => (
                        <tr key={rule.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                            <td className={`p-4 font-semibold ${rule.action.toLowerCase() === 'allow' ? 'text-green-400' : 'text-red-400'}`}>
                              {rule.action.toUpperCase()}
                            </td>
                            <td className="p-4 font-mono">{rule.to}</td> {/* UFW parsed 'to' */}
                            <td className="p-4 font-mono">{rule.from}</td> {/* UFW parsed 'from' */}
                            <td className="p-4 text-right">
                              <button onClick={() => handleRemoveRule(rule.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full">
                                <Trash2 size={16}/>
                              </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
             {rules.length === 0 && <p className="p-4 text-slate-500">No firewall rules loaded. Waiting for connection...</p>}
        </div>
      </div>
    </>
  );
}