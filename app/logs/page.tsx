"use client";
import { useState, useEffect } from 'react';
import { BookText, Shield, Users, FileWarning, Bell, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import AgentSelector from '@/components/AgentSelector';
import { useAgent } from '@/lib/agent-context';
import { useWebSocket } from '@/lib/websocket-context';

const logTypes = [
    { name: 'All', icon: BookText },
    { name: 'firewall', icon: Shield },
    { name: 'login', icon: Users },
    { name: 'file_monitoring', icon: FileWarning },
    { name: 'process', icon: Bell },
];

// --- MAIN LOGS PAGE COMPONENT ---
export default function LogsPage() {
  const { selectedAgent } = useAgent();
  const { logs, isConnected } = useWebSocket();
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [debugInfo, setDebugInfo] = useState(false);

  const logsPerPage = 50; // Increased from 5 to show more logs

  // Filter logs by selected agent
  const agentLogs = selectedAgent 
    ? logs.filter(log => log.agent_id === selectedAgent.id)
    : logs;

  // Filter logs by type - FIXED: Handle case sensitivity and trim whitespace
  const filteredLogs = activeFilter === 'All' 
    ? agentLogs 
    : agentLogs.filter(l => {
        // Normalize both sides of comparison
        const logType = (l.type || '').toString().toLowerCase().trim();
        const filterType = activeFilter.toLowerCase().trim();
        return logType === filterType;
      });

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  // Debug: Get unique log types in current logs
  const uniqueTypes = [...new Set(agentLogs.map(l => l.type))];
  const typeCounts = logTypes.map(type => ({
    name: type.name,
    count: type.name === 'All' 
      ? agentLogs.length 
      : agentLogs.filter(l => {
          const logType = (l.type || '').toString().toLowerCase().trim();
          return logType === type.name.toLowerCase();
        }).length
  }));

  return (
    <>
      {/* Main Content */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">System Logs</h2>
          <div className="flex items-center gap-2">
            <p className="text-slate-400">Review raw event logs from the Sentinel agent and system services.</p>
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
            <button 
              onClick={() => setDebugInfo(!debugInfo)}
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
      {debugInfo && (
        <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-sm font-bold text-white mb-2">Debug Information</h3>
          <div className="text-xs text-slate-300 space-y-1 font-mono">
            <p><strong>Total logs:</strong> {logs.length}</p>
            <p><strong>Agent logs:</strong> {agentLogs.length}</p>
            <p><strong>Filtered logs:</strong> {filteredLogs.length}</p>
            <p><strong>Active filter:</strong> {activeFilter}</p>
            <p><strong>Unique log types found:</strong> {uniqueTypes.join(', ') || 'None'}</p>
            <div className="mt-2">
              <strong>Sample log types (first 5):</strong>
              {agentLogs.slice(0, 5).map((log, i) => (
                <div key={i} className="ml-2 text-cyan-400">
                  • type: "{log.type}" (length: {(log.type || '').length})
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center border-b border-slate-800 mb-6 overflow-x-auto">
        {logTypes.map(type => {
          const count = typeCounts.find(t => t.name === type.name)?.count || 0;
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

      {/* Logs Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-sm text-slate-400">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Service</th>
                <th className="p-4">Message</th>
                <th className="p-4">Type</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((logEntry, index) => (
                  <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="p-4 text-slate-500 whitespace-nowrap">
                      {new Date(logEntry.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 text-cyan-400">{logEntry.service || 'unknown'}</td>
                    <td className="p-4 text-slate-300 break-words max-w-xl">{logEntry.message}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-slate-700 text-slate-300">
                        {logEntry.type || 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center">
                    <div className="text-slate-500">
                      {activeFilter === 'All' ? (
                        <>
                          <p className="mb-2">No logs to display.</p>
                          <p className="text-sm">Listening for new events from the agent...</p>
                        </>
                      ) : (
                        <>
                          <p className="mb-2">No logs found for type: <strong className="text-blue-400">{activeFilter}</strong></p>
                          <p className="text-sm">Available types: {uniqueTypes.join(', ') || 'None yet'}</p>
                          <button 
                            onClick={() => setActiveFilter('All')}
                            className="mt-3 text-blue-400 hover:text-blue-300 underline text-sm"
                          >
                            Show all logs
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 border-t border-slate-800 text-sm">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1 bg-slate-800 rounded disabled:opacity-50 hover:bg-slate-700 transition"
              >
                Previous
              </button>

              <span className="text-slate-400">
                Page {currentPage} of {totalPages} ({filteredLogs.length} logs)
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1 bg-slate-800 rounded disabled:opacity-50 hover:bg-slate-700 transition"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}