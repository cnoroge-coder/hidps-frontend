"use client";
import { useState, useEffect } from 'react';
import { BookText, Shield, Users, FileWarning, Bell, AlertCircle, CheckCircle } from 'lucide-react';
import AgentSelector from '@/components/AgentSelector';
import { useAgent } from '@/lib/agent-context';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type Alert = Database['public']['Tables']['alerts']['Row'];
type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

// Map frontend display names to backend alert_type values
const alertTypes = [
    { name: 'All', dbTypes: [], icon: BookText },
    { name: 'Firewall', dbTypes: ['firewall', 'network'], icon: Shield },
    { name: 'Login', dbTypes: ['login', 'security'], icon: Users },
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

// --- MAIN LOGS PAGE COMPONENT ---
export default function LogsPage() {
  const { selectedAgent } = useAgent();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const itemsPerPage = 12;
  const supabase = createClient();
  );

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

      // Add pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching alerts:', error);
      } else {
        setAlerts(data || []);
        setTotalAlerts(count || 0);
      }
    };

    fetchAlerts();

    // Set up real-time subscription for new alerts
    const channel = supabase
      .channel(`logs:agent_id=eq.${selectedAgent.id}`)
      .on<Alert>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `agent_id=eq.${selectedAgent.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Alert> | any) => {
          setAlerts((current) => [payload.new, ...current]);
          setTotalAlerts((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedAgent, activeFilter, currentPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  return (
    <>
      {/* Main Content */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Alert Logs</h2>
          <p className="text-slate-400">Complete history of all security alerts and events from the system.</p>
        </div>
        <AgentSelector />
      </header>

      {/* Filter Tabs */}
      <div className="flex items-center border-b border-slate-800 mb-6 overflow-x-auto">
        {alertTypes.map(type => (
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
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <div key={alert.id} className="bg-slate-900 rounded-xl border border-slate-800 p-6 hover:bg-slate-800/50 transition">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <span className={`p-2 rounded-full ${getSeverityStyling(alert.severity)}`}>
                    <Bell size={20} />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">{alert.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${getSeverityStyling(alert.severity)}`}>
                        {getSeverityName(alert.severity)}
                      </span>
                      {alert.resolved && (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                          <CheckCircle size={12} className="inline mr-1" />
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 mb-2">{alert.message}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>{new Date(alert.created_at).toLocaleString()}</span>
                      <span>Type: {alert.alert_type}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500">No alerts found.</p>
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
    </>
  );
}