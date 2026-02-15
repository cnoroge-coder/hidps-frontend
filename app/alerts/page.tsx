"use client";
import { useState, useEffect } from 'react';
import { Bell, FileWarning, Shield, Users, Trash2, X, CheckCircle, AlertCircle } from 'lucide-react';
import AgentSelector from '@/components/AgentSelector';
import { useAgent } from '@/lib/agent-context';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type Alert = Database['public']['Tables']['alerts']['Row'];
type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

// Map frontend display names to backend alert_type values
const alertTypes = [
    { name: 'All', dbTypes: [], icon: Bell },
    { name: 'Firewall', dbTypes: ['firewall', 'network'], icon: Shield },
    { name: 'Login', dbTypes: ['auth_success', 'auth_failure', 'ssh_brute_force'], icon: Users },
    { name: 'File Monitoring', dbTypes: ['file_monitoring', 'integrity'], icon: FileWarning },
    { name: 'Process', dbTypes: ['process', 'privilege_escalation'], icon: Bell },
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

// --- MAIN ALERTS PAGE COMPONENT ---
export default function AlertsPage() {
  const { selectedAgent } = useAgent();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [debugMode, setDebugMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const itemsPerPage = 12;
  const supabase = createClient();

  useEffect(() => {
    if (!selectedAgent) return;

    const fetchAlerts = async () => {
      let query = supabase.from('alerts').select('*', { count: 'exact' }).eq('agent_id', selectedAgent.id);
      
      // Filter by alert type if not "All"
      if (activeFilter !== 'All') {
        const filterConfig = alertTypes.find(t => t.name === activeFilter);
        if (filterConfig && filterConfig.dbTypes.length > 0) {
          // Use OR filter for multiple types
          query = query.in('alert_type', filterConfig.dbTypes);
        }
      }

      // Only show unresolved alerts
      query = query.eq('resolved', false);

      // Add pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching alerts:', error);
      } else {
        console.log('Fetched alerts:', data);
        setAlerts(data || []);
        setTotalAlerts(count || 0);
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
          
          // Check if this alert matches the current filter
          const shouldShow = activeFilter === 'All' || 
            alertTypes.find(t => t.name === activeFilter)?.dbTypes.includes(payload.new.alert_type);
          
          if (shouldShow) {
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

  // Get unique alert types in database for debugging
  const uniqueAlertTypes = [...new Set(alerts.map(a => a.alert_type))];
  
  // Count alerts per category
  const getCategoryCount = (categoryName: string) => {
    if (categoryName === 'All') return alerts.length;
    const filterConfig = alertTypes.find(t => t.name === categoryName);
    if (!filterConfig) return 0;
    return alerts.filter(a => filterConfig.dbTypes.includes(a.alert_type || '')).length;
  };

  return (
    <>
      {/* Main Content */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Security Alerts</h2>
          <div className="flex items-center gap-2">
            <p className="text-slate-400">Monitor, manage, and respond to threats in real-time.</p>
            <button 
              onClick={() => setDebugMode(!debugMode)}
              className="flex items-center gap-1 text-xs text-blue-400 bg-blue-900/50 rounded-full px-2 py-0.5 hover:bg-blue-900 cursor-pointer"
            >
              <AlertCircle size={12} />
              Debug
            </button>
          </div>
        </div>
        <AgentSelector />
      </header>

      {/* Debug Info Panel */}
      {debugMode && (
        <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-sm font-bold text-white mb-2">Debug Information</h3>
          <div className="text-xs text-slate-300 space-y-1 font-mono">
            <p><strong>Total alerts:</strong> {alerts.length}</p>
            <p><strong>Active filter:</strong> {activeFilter}</p>
            <p><strong>Unique alert types in DB:</strong> {uniqueAlertTypes.join(', ') || 'None'}</p>
            <div className="mt-2">
              <strong>Type mappings:</strong>
              {alertTypes.filter(t => t.name !== 'All').map(type => (
                <div key={type.name} className="ml-2 text-cyan-400">
                  • {type.name} → [{type.dbTypes.join(', ')}]
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center border-b border-slate-800 mb-6 overflow-x-auto">
        {alertTypes.map(type => {
          const count = getCategoryCount(type.name);
          return (
            <button 
              key={type.name}
              onClick={() => setActiveFilter(type.name)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 text-sm font-medium transition-colors whitespace-nowrap
                ${activeFilter === type.name 
                  ? 'border-blue-500 text-blue-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-300'}`
              }
            >
              <type.icon size={16} />
              <span>{type.name}</span>
              <span className="text-xs opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Alerts List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {alerts.map(alert => (
          <div 
            key={alert.id}
            onClick={() => setSelectedAlert(alert)}
            className={`bg-slate-900 rounded-xl border-l-4 p-5 cursor-pointer transition-all hover:bg-slate-800/50 ${getSeverityStyling(alert.severity)} ${alert.resolved ? 'opacity-50' : ''}`}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-white pr-4">{alert.title}</h3>
              <span className="text-xs text-slate-500 whitespace-nowrap">{new Date(alert.created_at).toLocaleTimeString()}</span>
            </div>
            <p className="text-sm text-slate-400 mt-2 line-clamp-2">{alert.message}</p>
            {debugMode && (
              <p className="text-xs text-cyan-400 mt-2 font-mono">Type: {alert.alert_type}</p>
            )}
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="col-span-full text-center py-8">
            <p className="text-slate-500 mb-2">No alerts for this category.</p>
            {activeFilter !== 'All' && uniqueAlertTypes.length > 0 && (
              <div className="text-sm text-slate-600">
                <p>Available types: {uniqueAlertTypes.join(', ')}</p>
                <button 
                  onClick={() => setActiveFilter('All')}
                  className="mt-2 text-blue-400 hover:text-blue-300 underline"
                >
                  Show all alerts
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalAlerts > itemsPerPage && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-slate-400">
            Page {currentPage} of {Math.ceil(totalAlerts / itemsPerPage)}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(Math.ceil(totalAlerts / itemsPerPage), currentPage + 1))}
            disabled={currentPage === Math.ceil(totalAlerts / itemsPerPage)}
            className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

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
                  {debugMode && (
                    <p className="text-xs text-cyan-400 font-mono mt-1">Type: {selectedAlert.alert_type}</p>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="p-2 rounded-full hover:bg-slate-800"><X size={20}/></button>
            </header>
            <div className="p-6">
              <p className="text-slate-300 whitespace-pre-wrap">{selectedAlert.message}</p>
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