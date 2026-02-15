"use client";
import { useState, useEffect } from 'react';
import { Plus, Trash2, FileWarning, AlertCircle } from 'lucide-react';
import AgentSelector from '@/components/AgentSelector';
import { useAgent } from '@/lib/agent-context';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useWebSocket } from '@/lib/websocket-context';

type MonitoredFile = Database['public']['Tables']['monitored_files']['Row'];

// Helper function to extract clean file information from log messages
function parseFileLogMessage(message: string) {
  // Pattern 1: "Monitored file MODIFIED: /path/to/file"
  const modifiedMatch = message.match(/Monitored file (?:MODIFIED|UPDATED|DELETED|MOVED|being edited): (.+?)(?:\s|$)/);
  if (modifiedMatch) {
    const filepath = modifiedMatch[1].trim();
    const filename = filepath.split('/').pop() || filepath;
    
    if (message.includes('MODIFIED')) {
      return { action: 'Modified', filepath, filename, icon: '📝' };
    } else if (message.includes('UPDATED') || message.includes('saved by editor')) {
      return { action: 'Saved', filepath, filename, icon: '💾' };
    } else if (message.includes('DELETED')) {
      return { action: 'Deleted', filepath, filename, icon: '🗑️' };
    } else if (message.includes('being edited')) {
      return { action: 'Editing', filepath, filename, icon: '✏️' };
    }
  }
  
  // Pattern 2: "New file created in monitored location: /path/to/file"
  const createdMatch = message.match(/New file created in monitored location: (.+?)(?:\s|$)/);
  if (createdMatch) {
    const filepath = createdMatch[1].trim();
    const filename = filepath.split('/').pop() || filepath;
    return { action: 'Created', filepath, filename, icon: '➕' };
  }
  
  // Pattern 3: Check for temp files - skip them
  if (message.includes('.goutputstream') || 
      message.includes('.swp') || 
      message.includes('~') ||
      message.includes('.tmp')) {
    return null; // Skip temp file events
  }
  
  // Fallback: try to extract any file path
  const pathMatch = message.match(/\/[\w\/.-]+/);
  if (pathMatch) {
    const filepath = pathMatch[0];
    const filename = filepath.split('/').pop() || filepath;
    return { action: 'Changed', filepath, filename, icon: '📄' };
  }
  
  return null; // Skip unparseable logs
}

// --- MAIN FILE MONITORING PAGE COMPONENT ---
export default function FileMonitoringPage() {
  const { selectedAgent } = useAgent();
  const { logs, sendCommand } = useWebSocket(); // ADD sendCommand here
  const [monitoredFiles, setMonitoredFiles] = useState<MonitoredFile[]>([]);
  const [newFilePath, setNewFilePath] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (!selectedAgent) return;

    const fetchMonitoredFiles = async () => {
      const { data, error } = await supabase
        .from('monitored_files')
        .select('*')
        .eq('agent_id', selectedAgent.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching monitored files:', error);
      } else {
        setMonitoredFiles(data);
        
        // IMPORTANT: Send monitor_file command for all existing files on page load
        // This ensures the agent starts watching them
        if (sendCommand && data) {
          data.forEach(file => {
            sendCommand(selectedAgent.id, 'monitor_file', { path: file.file_path });
          });
        }
      }
    };

    fetchMonitoredFiles();

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

    // Cleanup subscription on unmount or when selectedAgent changes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedAgent, supabase, sendCommand]); // Add sendCommand to dependencies

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

    if (error) {
      console.error('Error adding file:', error);
    } else {
      // FIXED: Send command to agent via WebSocket to start monitoring
      if (sendCommand) {
        sendCommand(selectedAgent.id, 'monitor_file', { path: newFilePath.trim() });
        console.log('Sent monitor_file command for:', newFilePath.trim());
      }
      setNewFilePath('');
    }
  };

  const handleRemoveFile = async (id: string) => {
    // Find the file to get its path before deleting
    const fileToRemove = monitoredFiles.find(f => f.id === id);
    
    const { error } = await supabase.from('monitored_files').delete().eq('id', id);
    
    if (error) {
      console.error('Error deleting file:', error);
    } else {
      // FIXED: Send command to agent to stop monitoring
      if (sendCommand && fileToRemove && selectedAgent) {
        sendCommand(selectedAgent.id, 'unmonitor_file', { path: fileToRemove.file_path });
        console.log('Sent unmonitor_file command for:', fileToRemove.file_path);
      }
    }
  };

  // Filter logs for file monitoring events for this agent
  const fileLogs = selectedAgent 
    ? logs
        .filter(log => log.agent_id === selectedAgent.id && log.type === 'file_monitoring')
        .map(log => ({
          ...log,
          parsed: parseFileLogMessage(log.message)
        }))
        .filter(log => log.parsed !== null) // Remove unparseable or temp file logs
        .slice(0, 10) // Show last 10 file events
    : [];

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

        {/* Recent File Logs */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FileWarning className="text-yellow-400" size={20} />
            Recent File Events
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {fileLogs.length === 0 ? (
              <p className="text-sm text-slate-500">No file events detected yet.</p>
            ) : (
              fileLogs.map((log, index) => {
                const parsed = log.parsed!;
                return (
                  <div 
                    key={index} 
                    className="p-3 bg-slate-800/50 rounded-lg border-l-2 border-yellow-500"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0">{parsed.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-yellow-400">
                            {parsed.action}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 font-semibold mb-1">
                          {parsed.filename}
                        </p>
                        <p className="text-xs text-slate-400 font-mono break-all">
                          {parsed.filepath}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}