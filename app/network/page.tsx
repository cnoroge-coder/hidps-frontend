"use client";
import { useState, useEffect } from 'react';
import { Shield, Users, Zap, Network, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import AgentSelector from '@/components/AgentSelector';
import { useAgent } from '@/lib/agent-context';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type Alert = Database['public']['Tables']['alerts']['Row'];

const networkEventTypes = [
    { name: 'All', dbTypes: [], icon: Network },
    { name: 'SSH Logins', dbTypes: ['auth_success', 'auth_failure', 'auth_logout'], icon: Shield },
    { name: 'Brute Force', dbTypes: ['ssh_brute_force'], icon: AlertTriangle },
    { name: 'Port Scans', dbTypes: ['port_scan'], icon: Zap },
    { name: 'Shell Access', dbTypes: ['auth_info'], icon: Users },
];

const getEventIcon = (alertType: string) => {
    switch (alertType) {
        case 'ssh_brute_force': return AlertTriangle;
        case 'port_scan': return Zap;
        case 'auth_success': return CheckCircle;
        case 'auth_failure': return XCircle;
        case 'auth_logout': return CheckCircle; // Same as success for logout
        default: return Clock;
    }
};

const getEventColor = (alertType: string) => {
    switch (alertType) {
        case 'ssh_brute_force': return 'text-red-400 bg-red-500/20 border-red-500/30';
        case 'port_scan': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
        case 'auth_success': return 'text-green-400 bg-green-500/20 border-green-500/30';
        case 'auth_failure': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
        case 'auth_logout': return 'text-blue-400 bg-blue-500/20 border-blue-500/30'; // Blue for logout
        default: return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    }
};

// --- MAIN NETWORK PAGE COMPONENT ---
export default function NetworkPage() {
  const { selectedAgent } = useAgent();
  const [events, setEvents] = useState<Alert[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Alert | null>(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const supabase = createClient();

  // Fetch historical network events
  useEffect(() => {
    if (!selectedAgent) return;

    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('agent_id', selectedAgent.id)
        .in('alert_type', ['ssh_brute_force', 'port_scan', 'auth_success', 'auth_failure', 'auth_info'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching network events:', error);
      } else {
        setEvents(data || []);
      }
    };

    fetchEvents();
  }, [selectedAgent, supabase]);

  // Real-time updates for new network events
  useEffect(() => {
    if (!selectedAgent) return;

    const channel = supabase
      .channel('network-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `agent_id=eq.${selectedAgent.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Alert>) => {
          const newEvent = payload.new;
          if (newEvent && 'alert_type' in newEvent && ['ssh_brute_force', 'port_scan', 'auth_success', 'auth_failure', 'auth_info'].includes(newEvent.alert_type || '')) {
            setEvents(prev => [newEvent, ...prev]);
            setLiveEvents(prev => [newEvent, ...prev.slice(0, 9)]); // Keep last 10 live events
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedAgent, supabase]);

  // Filter events based on active filter
  const filteredEvents = events.filter(event => {
    if (activeFilter === 'All') return true;
    const filterConfig = networkEventTypes.find(type => type.name === activeFilter);
    return filterConfig?.dbTypes.includes(event.alert_type || '') || false;
  });

  const formatEventTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getEventSummary = (event: Alert) => {
    const data = event.resolved ? JSON.parse(JSON.stringify(event)) : event;
    switch (event.alert_type) {
      case 'ssh_brute_force':
        return `Brute force attack from ${data.resolved || 'unknown IP'} with ${data.severity || 0} attempts`;
      case 'port_scan':
        return `Port scan detected from ${data.resolved || 'unknown IP'}`;
      case 'auth_success':
        return `Successful login via ${data.message?.includes('SSH') ? 'SSH' : 'shell'}`;
      case 'auth_failure':
        return `Failed login attempt via ${data.message?.includes('SSH') ? 'SSH' : 'shell'}`;
      default:
        return event.message || 'Network event';
    }
  };

  if (!selectedAgent) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Network className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Select an Agent
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Choose an agent to view network security events
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Network className="h-6 w-6" />
            Network Security
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor SSH logins, brute force attempts, and port scans
          </p>
        </div>
        <AgentSelector />
      </div>

      {/* Live Events Banner */}
      {liveEvents.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-900 dark:text-blue-100">Live Events</span>
          </div>
          <div className="space-y-1">
            {liveEvents.slice(0, 3).map((event, index) => (
              <div key={index} className="text-sm text-blue-800 dark:text-blue-200">
                {formatEventTime(event.created_at || '')}: {getEventSummary(event)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {networkEventTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.name}
              onClick={() => setActiveFilter(type.name)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === type.name
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {type.name}
            </button>
          );
        })}
      </div>

      {/* Events List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Network Events ({filteredEvents.length})
          </h2>

          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Network Events
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Network security events will appear here when detected
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => {
                const Icon = getEventIcon(event.alert_type || '');
                return (
                  <div
                    key={event.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      getEventColor(event.alert_type || '')
                    }`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {event.title || 'Network Event'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              event.severity === 4 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              event.severity === 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {event.severity === 4 ? 'Critical' :
                               event.severity === 3 ? 'High' :
                               event.severity === 2 ? 'Medium' : 'Low'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            {getEventSummary(event)}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>{formatEventTime(event.created_at || '')}</span>
                            <span>{event.alert_type?.replace('_', ' ').toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Event Details
                </h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <p className="text-gray-900 dark:text-white">{selectedEvent.title}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message
                  </label>
                  <p className="text-gray-900 dark:text-white">{selectedEvent.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <p className="text-gray-900 dark:text-white capitalize">
                      {selectedEvent.alert_type?.replace('_', ' ')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Severity
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {selectedEvent.severity === 4 ? 'Critical' :
                       selectedEvent.severity === 3 ? 'High' :
                       selectedEvent.severity === 2 ? 'Medium' : 'Low'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Timestamp
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {formatEventTime(selectedEvent.created_at || '')}
                  </p>
                </div>

                {selectedEvent.resolved && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Resolution
                    </label>
                    <p className="text-gray-900 dark:text-white">{selectedEvent.resolved}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}