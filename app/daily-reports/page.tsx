"use client";
import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Shield, Users, FileWarning, Bell } from 'lucide-react';
import AgentSelector from '@/components/AgentSelector';
import { useAgent } from '@/lib/agent-context';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import Sidebar from '@/components/Sidebar';

const getSeverityStyling = (severity: number) => {
    switch (severity) {
        case 4: return 'bg-red-500/20 text-red-400 border-red-500/30'; // Critical
        case 3: return 'bg-orange-500/20 text-orange-400 border-orange-500/30'; // High
        case 2: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'; // Medium
        default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30'; // Low
    }
};

type Alert = Database['public']['Tables']['alerts']['Row'];

interface DailyReport {
  date: string;
  totalAlerts: number;
  alertsByType: Record<string, number>;
  topIPs: Array<{ ip: string; count: number }>;
  alerts: Alert[];
}

export default function DailyReportsPage() {
  const { selectedAgent } = useAgent();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!selectedAgent) return;

    const fetchReports = async () => {
      setLoading(true);
      try {
        // Get all alerts for the selected agent
        const { data: alerts, error } = await supabase
          .from('alerts')
          .select('*')
          .eq('agent_id', selectedAgent.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Group alerts by date
        const alertsByDate: Record<string, Alert[]> = {};
        alerts?.forEach(alert => {
          const date = new Date(alert.created_at).toISOString().split('T')[0];
          if (!alertsByDate[date]) alertsByDate[date] = [];
          alertsByDate[date].push(alert);
        });

        // Generate reports
        const dailyReports: DailyReport[] = Object.entries(alertsByDate)
          .map(([date, dayAlerts]) => {
            const alertsByType: Record<string, number> = {};
            const ipCounts: Record<string, number> = {};

            dayAlerts.forEach(alert => {
              // Count by type
              alertsByType[alert.alert_type] = (alertsByType[alert.alert_type] || 0) + 1;

              // Extract IPs from message
              const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
              const ips = alert.message.match(ipRegex) || [];
              ips.forEach(ip => {
                ipCounts[ip] = (ipCounts[ip] || 0) + 1;
              });
            });

            const topIPs = Object.entries(ipCounts)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([ip, count]) => ({ ip, count }));

            return {
              date,
              totalAlerts: dayAlerts.length,
              alertsByType,
              topIPs,
              alerts: dayAlerts
            };
          })
          .sort((a, b) => b.date.localeCompare(a.date));

        setReports(dailyReports);
        if (dailyReports.length > 0 && !selectedDate) {
          setSelectedDate(dailyReports[0].date);
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [selectedAgent, supabase]);

  const selectedReport = reports.find(r => r.date === selectedDate);

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'firewall':
      case 'network':
        return Shield;
      case 'auth_success':
      case 'auth_failure':
      case 'ssh_brute_force':
        return Users;
      case 'file_monitoring':
      case 'integrity':
        return FileWarning;
      default:
        return Bell;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'firewall':
      case 'network':
        return 'Firewall';
      case 'auth_success':
        return 'Login Success';
      case 'auth_failure':
        return 'Login Failure';
      case 'ssh_brute_force':
        return 'SSH Brute Force';
      case 'file_monitoring':
      case 'integrity':
        return 'File Monitoring';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex">
        <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        <div className="flex-1 p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Daily Security Reports</h1>
              <p className="text-slate-400">Comprehensive security summaries for each day</p>
            </div>
            <AgentSelector />
          </div>

          {!selectedAgent ? (
            <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 text-center">
              <Calendar size={48} className="mx-auto text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Agent Selected</h3>
              <p className="text-slate-400">Please select an agent to view daily reports.</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 text-center">
              <TrendingUp size={48} className="mx-auto text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Reports Available</h3>
              <p className="text-slate-400">No security alerts have been generated yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Date Selector */}
              <div className="lg:col-span-1">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <h3 className="text-lg font-semibold text-white mb-4">Select Date</h3>
                  <div className="space-y-2">
                    {reports.map(report => (
                      <button
                        key={report.date}
                        onClick={() => setSelectedDate(report.date)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedDate === report.date
                            ? 'bg-cyan-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <div className="font-medium">
                          {new Date(report.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-sm opacity-75">
                          {report.totalAlerts} alerts
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Report Details */}
              <div className="lg:col-span-3">
                {selectedReport && (
                  <div className="space-y-6">
                    {/* Summary Header */}
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-white">
                          {new Date(selectedReport.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </h2>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-cyan-400">{selectedReport.totalAlerts}</div>
                          <div className="text-sm text-slate-400">Total Alerts</div>
                        </div>
                      </div>
                    </div>

                    {/* Alerts by Type */}
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                      <h3 className="text-xl font-semibold text-white mb-4">Alerts by Type</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(selectedReport.alertsByType).map(([type, count]) => {
                          const Icon = getAlertTypeIcon(type);
                          const severity = getEventSeverity(type);
                          const severityClasses = getSeverityStyling(severity);
                          return (
                            <div key={type} className={`p-4 rounded-lg border ${severityClasses}`}>
                              <div className="flex items-center gap-3">
                                <Icon size={24} className="text-current" />
                                <div>
                                  <div className="font-semibold">{getAlertTypeLabel(type)}</div>
                                  <div className="text-2xl font-bold">{count}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Top IPs */}
                    {selectedReport.topIPs.length > 0 && (
                      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <h3 className="text-xl font-semibold text-white mb-4">Top Source IPs</h3>
                        <div className="space-y-3">
                          {selectedReport.topIPs.map(({ ip, count }, index) => (
                            <div key={ip} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center text-sm font-bold">
                                  {index + 1}
                                </div>
                                <span className="font-mono text-white">{ip}</span>
                              </div>
                              <span className="text-cyan-400 font-semibold">{count} alerts</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Alerts */}
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                      <h3 className="text-xl font-semibold text-white mb-4">Recent Alerts</h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {selectedReport.alerts.slice(0, 20).map(alert => (
                          <div key={alert.id} className="bg-slate-800 p-4 rounded-lg">
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                {React.createElement(getAlertTypeIcon(alert.alert_type), {
                                  size: 16,
                                  className: "text-cyan-400"
                                })}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-white">{alert.title}</span>
                                  <span className="text-xs text-slate-500">
                                    {new Date(alert.created_at).toLocaleTimeString()}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-300">{alert.message}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}