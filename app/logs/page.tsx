"use client";
import { useState } from 'react';
import { BookText, Shield, Users, FileWarning, Bell, Wifi, WifiOff } from 'lucide-react';
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

  const logsPerPage = 5;

  const agentLogs = selectedAgent 
    ? logs.filter(log => log.agent_id === selectedAgent.id)
    : logs;

  const filteredLogs = activeFilter === 'All' 
    ? agentLogs 
    : agentLogs.filter(l => l.type === activeFilter);

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

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
          </div>
        </div>
        <AgentSelector />
      </header>

      {/* Filter Tabs */}
      <div className="flex items-center border-b border-slate-800 mb-6">
        {logTypes.map(type => (
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
            {type.name}
          </button>
        ))}
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
              {paginatedLogs.map((logEntry, index) => (
                <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/50">
                  <td className="p-4 text-slate-500 whitespace-nowrap">{new Date(logEntry.timestamp).toLocaleString()}</td>
                  <td className="p-4 text-cyan-400">{logEntry.service}</td>
                  <td className="p-4 text-slate-300">{logEntry.message}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-xs bg-slate-700 text-slate-300">{logEntry.type}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 border-t border-slate-800 text-sm">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1 bg-slate-800 rounded disabled:opacity-50"
              >
                Previous
              </button>

              <span className="text-slate-400">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1 bg-slate-800 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
          {filteredLogs.length === 0 && <p className="p-4 text-slate-500">No logs to display. Listening for new events...</p>}
        </div>
      </div>
    </>
  );
}
