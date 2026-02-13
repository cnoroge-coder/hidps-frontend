"use client";
import { useState, useEffect } from 'react';
import { Bell, FileWarning, Shield, Users, Trash2, X, CheckCircle } from 'lucide-react';
import AgentSelector from '@/components/AgentSelector';
import { useAgent } from '@/lib/agent-context';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type Alert = Database['public']['Tables']['alerts']['Row'];
type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

const alertTypes = [
    { name: 'All', icon: Bell },
    { name: 'firewall', displayName: 'Firewall', icon: Shield },
    { name: 'login', displayName: 'Login', icon: Users },
    { name: 'file_monitoring', displayName: 'File Monitoring', icon: FileWarning },
    { name: 'process', displayName: 'Process', icon: Bell },
];

const getSeverityStyling = (severity: number) => {
    switch (severity) {
        case 4: return 'bg-red-500/20 text-red-400 border-red-500/30'; // Critical
        case 3: return 'bg-orange-500/20 text-orange-400 border-orange-500/30'; // High
        case 2: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'; // Medium
        default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30'; // Low
    }
};

const getSeverityName = (severity: number): Severity => {
    switch (severity) {
        case 4: return 'Critical';
        case 3: return 'High';
        case 2: return 'Medium';
        default: return 'Low';
    }
}


// Static mock alerts as fallback
const mockAlerts: Alert[] = [
  {
    id: 'mock-1',
    agent_id: 'demo',
    title: 'High CPU Usage Detected',
    description: 'CPU usage exceeded 85% for more than 5 minutes',
    alert_type: 'system',
    severity: 3,
    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    resolved: false,
    resolved_by: null,
    resolved_at: null,
  },
  {
    id: 'mock-2',
    agent_id: 'demo',
    title: 'Unauthorized File Access Attempt',
    description: 'File /etc/shadow was accessed by unauthorized process',
    alert_type: 'file_monitoring',
    severity: 4,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    resolved: false,
    resolved_by: null,
    resolved_at: null,
  },
  {
    id: 'mock-3',
    agent_id: 'demo',
    title: 'Failed SSH Login Attempts',
    description: '5 failed SSH login attempts from IP 192.168.1.100',
    alert_type: 'login',
    severity: 3,
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    resolved: false,
    resolved_by: null,
    resolved_at: null,
  },
  {
    id: 'mock-4',
    agent_id: 'demo',
    title: 'Firewall Rule Added',
    description: 'New firewall rule added: Allow port 8080/tcp',
    alert_type: 'firewall',
    severity: 1,
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    resolved: true,
    resolved_by: 'admin',
    resolved_at: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
  },
  {
    id: 'mock-5',
    agent_id: 'demo',
    title: 'Configuration File Modified',
    description: 'File /etc/nginx/nginx.conf was modified',
    alert_type: 'file_monitoring',
    severity: 2,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    resolved: false,
    resolved_by: null,
    resolved_at: null,
  },
  {
    id: 'mock-6',
    agent_id: 'demo',
    title: 'Suspicious Process Detected',
    description: 'Unknown process with high network activity detected',
    alert_type: 'process',
    severity: 3,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    resolved: false,
    resolved_by: null,
    resolved_at: null,
  },
];

// --- MAIN ALERTS PAGE COMPONENT ---
export default function AlertsPage() {
  const { selectedAgent } = useAgent();
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const supabase = createClient();

  useEffect(() => {
    if (!selectedAgent) {
      // Use mock data when no agent selected
      setAlerts(mockAlerts);
      return;
    }

    const fetchAlerts = async () => {
      let query = supabase.from('alerts').select('*').eq('agent_id', selectedAgent.id);
      
      if (activeFilter !== 'All') {
        query = query.eq('alert_type', activeFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching alerts:', error);
        // Use mock data on error
        setAlerts(mockAlerts);
      } else {
        console.log('Fetched alerts:', data);
        setAlerts(data.length > 0 ? data : mockAlerts);
      }
    };

    fetchAlerts();

    // Set up real-time subscription
    const channel = supabase
      .channel(`alerts:agent_id=eq.${selectedAgent.id}`)
      .on<Alert>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `agent_id=eq.${selectedAgent.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Alert> | any) => {
          console.log('New alert inserted:', payload.new);
          // Only add if it matches the current filter or filter is 'All'
          if (activeFilter === 'All' || payload.new.alert_type === activeFilter) {
            setAlerts((current) => [payload.new, ...current]);
          }
        }
      )
      .on<Alert>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
          filter: `agent_id=eq.${selectedAgent.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Alert> | any) => {
          console.log('Alert updated:', payload.new);
          setAlerts((current) =>
            current.map((alert) => (alert.id === payload.new.id ? payload.new : alert))
          );
          // Update selected alert if it's the one being viewed
          if (selectedAlert?.id === payload.new.id) {
            setSelectedAlert(payload.new);
          }
        }
      )
      .on<Alert>(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'alerts',
          filter: `agent_id=eq.${selectedAgent.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Alert> | any) => {
          console.log('Alert deleted:', payload.old);
          setAlerts((current) => current.filter((alert) => alert.id !== payload.old.id));
          // Close modal if the deleted alert is being viewed
          if (selectedAlert?.id === payload.old.id) {
            setSelectedAlert(null);
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or when selectedAgent/activeFilter changes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedAgent, activeFilter, supabase]);

  const handleResolve = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { error } = await supabase
      .from('alerts')
      .update({ 
        resolved: true, 
        resolved_by: session.user.id, 
        resolved_at: new Date().toISOString() 
      })
      .eq('id', id);
    
    if (error) {
      console.error('Error resolving alert:', error);
    }
    // No need to update state here - real-time subscription will handle it
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('alerts').delete().eq('id', id);
    
    if (error) {
      console.error('Error deleting alert:', error);
    }
    // No need to update state here - real-time subscription will handle it
  };

  const filteredAlerts = alerts;

  return (
    <>
      {/* Main Content */}
      
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">Security Alerts</h2>
            <p className="text-slate-400">Monitor, manage, and respond to threats in real-time.</p>
          </div>
          <AgentSelector />
        </header>

        {/* Filter Tabs */}
        <div className="flex items-center border-b border-slate-800 mb-6">
            {alertTypes.map(type => (
                <button 
                    key={type.name}
                    onClick={() => setActiveFilter(type.name)}
                    className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-medium transition-colors
                        ${activeFilter === type.name 
                            ? 'border-blue-500 text-blue-400' 
                            : 'border-transparent text-slate-500 hover:text-slate-300'}`
                    }
                >
                    <type.icon size={16} />
                    {type.displayName || type.name}
                </button>
            ))}
        </div>

        {/* Alerts List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredAlerts.map(alert => (
                <div 
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className={`bg-slate-900 rounded-xl border-l-4 p-5 cursor-pointer transition-all hover:bg-slate-800/50 ${getSeverityStyling(alert.severity)} ${alert.resolved ? 'opacity-50' : ''}`}
                >
                    <div className="flex justify-between items-start">
                        <h3 className="font-bold text-white pr-4">{alert.title}</h3>
                        <span className="text-xs text-slate-500 whitespace-nowrap">{new Date(alert.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-2 truncate">{alert.message}</p>
                </div>
            ))}
            {filteredAlerts.length === 0 && <p className="text-slate-500">No alerts for this category.</p>}
        </div>

        {/* Alert Detail Modal */}
        {selectedAlert && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl">
                   <header className="flex justify-between items-center p-6 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <span className={`p-2 h-fit rounded-full ${getSeverityStyling(selectedAlert.severity)}`}><Bell size={20}/></span>
                            <div>
                                <h2 className="text-xl font-bold text-white">{selectedAlert.title}</h2>
                                <p className="text-sm text-slate-500">{new Date(selectedAlert.created_at).toUTCString()}</p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedAlert(null)} className="p-2 rounded-full hover:bg-slate-800"><X size={20}/></button>
                   </header>
                   <div className="p-6">
                        <p className="text-slate-300">{selectedAlert.message}</p>
                   </div>
                   <footer className="p-6 border-t border-slate-800 flex justify-end gap-4">
                        <button onClick={() => handleDelete(selectedAlert.id)} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"><Trash2 size={16}/> Delete</button>
                        {!selectedAlert.resolved && 
                            <button onClick={() => handleResolve(selectedAlert.id)} className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20"><CheckCircle size={16}/> Resolve Alert</button>
                        }
                   </footer>
                </div>
            </div>
        )}
      
    </>
  );
}