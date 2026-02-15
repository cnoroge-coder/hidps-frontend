"use client";
import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import AgentSelector from '@/components/AgentSelector';
import { useAgent } from '@/lib/agent-context';
import { useWebSocket } from '@/lib/websocket-context';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type MonitoredFile = Database['public']['Tables']['monitored_files']['Row'];
type Alert = Database['public']['Tables']['alerts']['Row'];

// Static mock data as fallback
const mockMonitoredFiles: MonitoredFile[] = [
  {
    id: 'mock-file-1',
    agent_id: 'demo',
    file_path: '/etc/passwd',
    added_by: 'admin',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'mock-file-2',
    agent_id: 'demo',
    file_path: '/etc/shadow',
    added_by: 'admin',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'mock-file-3',
    agent_id: 'demo',
    file_path: '/var/log/auth.log',
    added_by: 'admin',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
  {
    id: 'mock-file-4',
    agent_id: 'demo',
    file_path: '/etc/nginx/nginx.conf',
    added_by: 'admin',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
  },
];

const mockAlerts: Alert[] = [
  {
    id: 'mock-alert-1',
    agent_id: 'demo',
    title: 'File Modified',
    message: 'File modified: /etc/passwd',
    alert_type: 'file_monitoring',
    severity: 3,
    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    resolved: false,
    resolved_by: null,
    resolved_at: null,
  },
  {
    id: 'mock-alert-2',
    agent_id: 'demo',
    title: 'File Created',
    message: 'New file created: /tmp/suspicious.sh',
    alert_type: 'file_monitoring',
    severity: 2,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    resolved: false,
    resolved_by: null,
    resolved_at: null,
  },
  {
    id: 'mock-alert-3',
    agent_id: 'demo',
    title: 'File Deleted',
    message: 'File deleted: /var/log/important.log',
    alert_type: 'file_monitoring',
    severity: 3,
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    resolved: false,
    resolved_by: null,
    resolved_at: null,
  },
];

// --- MAIN FILE MONITORING PAGE COMPONENT ---
export default function FileMonitoringPage() {
  const { selectedAgent } = useAgent();
  const { sendCommand, logs } = useWebSocket();
  const [monitoredFiles, setMonitoredFiles] = useState<MonitoredFile[]>(mockMonitoredFiles);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [newFilePath, setNewFilePath] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (!selectedAgent) {
      // Use mock data when no agent selected
      setMonitoredFiles(mockMonitoredFiles);
      setAlerts(mockAlerts);
      return;
    }

    const fetchMonitoredFiles = async () => {
      const { data, error } = await supabase
        .from('monitored_files')
        .select('*')
        .eq('agent_id', selectedAgent.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching monitored files:', error);
        setMonitoredFiles(mockMonitoredFiles);
      } else {
        setMonitoredFiles(data.length > 0 ? data : mockMonitoredFiles);
      }
    };

    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('agent_id', selectedAgent.id)
        .eq('alert_type', 'file_monitoring')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching file monitoring alerts:', error);
        setAlerts(mockAlerts);
      } else {
        setAlerts(data.length > 0 ? data : mockAlerts);
      }
    };

    fetchMonitoredFiles();
    fetchAlerts();

    // Set up real-time subscription
    const channel = supabase
      .channel(`monitored_files:agent_id=eq.${selectedAgent.id}`)
      .on<MonitoredFile>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'monitored_files',
          filter: `agent_id=eq.${selectedAgent.id}`,
        },
        (payload: RealtimePostgresChangesPayload<MonitoredFile>) => {
          console.log('New file inserted:', payload.new);
          setMonitoredFiles((current : any) => [payload.new, ...current]);
        }
      )
      .on<MonitoredFile>(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'monitored_files',
          filter: `agent_id=eq.${selectedAgent.id}`,
        },
        (payload: RealtimePostgresChangesPayload<MonitoredFile>) => {
          console.log('File deleted:', payload.old);
          setMonitoredFiles((current : any) => 
            current.filter((f : any) => f.id !== (payload.old as any).id)
          );
        }
      )
      .on<MonitoredFile>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'monitored_files',
          filter: `agent_id=eq.${selectedAgent.id}`,
        },
        (payload: RealtimePostgresChangesPayload<MonitoredFile>) => {
          console.log('File updated:', payload.new);
          setMonitoredFiles((current : any) =>
            current.map((f : any) => (f.id === (payload.new as any).id ? payload.new : f))
          );
        }
      )
      .subscribe();

    // Set up real-time subscription for alerts
    const alertsChannel = supabase
      .channel(`alerts:agent_id=eq.${selectedAgent.id}`)
      .on<Alert>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `agent_id=eq.${selectedAgent.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Alert>) => {
          if (payload.new.alert_type === 'file_monitoring') {
            console.log('New file monitoring alert:', payload.new);
            setAlerts((current) => [payload.new, ...current.slice(0, 9)]); // Keep only 10
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount or when selectedAgent changes
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(alertsChannel);
    };
  }, [selectedAgent, supabase]);

  const handleAddFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newFilePath.trim() === '' || !selectedAgent) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const newFile = {
      agent_id: selectedAgent.id,
      file_path: newFilePath.trim(),
      added_by: session.user.id,
    };

    const { error } = await supabase.from('monitored_files').insert(newFile);

    // Send command to agent to start monitoring
    if (!error) {
      sendCommand(selectedAgent.id, 'monitor_file', {
        path: newFilePath.trim()
      });
    }

    if (error) {
      console.error('Error adding file:', error);
    } else {
      // No need to update state here - real-time subscription will handle it
      setNewFilePath('');
    }
  };

  const handleRemoveFile = async (id: string) => {
    // Get the file path before deleting
    const fileToRemove = monitoredFiles.find(f => f.id === id);
    if (fileToRemove) {
      sendCommand(selectedAgent.id, 'unmonitor_file', {
        path: fileToRemove.file_path
      });
    }

    const { error } = await supabase.from('monitored_files').delete().eq('id', id);
    
    if (error) {
      console.error('Error deleting file:', error);
    }
    // No need to update state here - real-time subscription will handle it
  };

  return (
    <>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">File Integrity Monitoring</h2>
          <p className="text-slate-400">Manage and monitor critical files for unauthorized changes.</p>
        </div>
        <AgentSelector />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Monitored Files List */}
        <div className="lg:col-span-2">
          <form onSubmit={handleAddFile} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              placeholder="/path/to/critical/file"
              className="flex-grow px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg">
              <Plus size={18}/> Add File
            </button>
          </form>

          <div className="bg-slate-900 rounded-xl border border-slate-800">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-sm text-slate-400">
                  <th className="p-4">File Path</th>
                  <th className="p-4">Date Added</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {monitoredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-500">
                      No monitored files yet. Add one to get started.
                    </td>
                  </tr>
                ) : (
                  monitoredFiles.map(file => (
                    <tr key={file.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="p-4 font-mono text-cyan-400">{file.file_path}</td>
                      <td className="p-4 text-slate-500">{new Date(file.created_at).toLocaleDateString()}</td>
                      <td className="p-4">
                        <button 
                          onClick={() => handleRemoveFile(file.id)} 
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-full"
                        >
                          <Trash2 size={16}/>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent File Activity */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h3 className="text-xl font-bold text-white mb-4">Recent File Activity</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedAgent ? (
              <>
                {/* Show alerts */}
                {alerts.map((alert) => (
                  <div key={`alert-${alert.id}`} className="bg-red-900/20 border border-red-500/30 p-3 rounded-lg">
                    <div className="flex justify-between items-start">
                      <p className="text-red-400 font-mono text-sm">{alert.title}: {alert.message}</p>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {new Date(alert.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
                {/* Show logs */}
                {logs
                  .filter(log => log.agent_id === selectedAgent.id && log.type === 'file_monitoring')
                  .slice(0, 10)
                  .map((logEntry, index) => (
                    <div key={`log-${index}`} className="bg-slate-800 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <p className="text-cyan-400 font-mono text-sm">{logEntry.message}</p>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {new Date(logEntry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                }
              </>
            ) : (
              <p className="text-slate-400">Select an agent to view file activity</p>
            )}
            {selectedAgent && alerts.length === 0 && logs.filter(log => log.agent_id === selectedAgent.id && log.type === 'file_monitoring').length === 0 && (
              <p className="text-slate-400">No recent file activity</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}