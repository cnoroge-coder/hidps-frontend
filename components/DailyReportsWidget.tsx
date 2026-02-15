"use client";
import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Shield, Clock } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';

type Alert = Database['public']['Tables']['alerts']['Row'];

interface DailyReport {
  date: string;
  totalCritical: number;
  totalHigh: number;
  summary: string;
  topThreats: Alert[];
}

interface DailyReportsWidgetProps {
  agentId: string;
}

export default function DailyReportsWidget({ agentId }: DailyReportsWidgetProps) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!agentId) return;

    const fetchDailyReports = async () => {
      setIsLoading(true);
      
      // Get alerts from last 7 days, grouped by day
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: alerts, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('agent_id', agentId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .gte('severity', 2) // Only Medium and above
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching alerts for reports:', error);
        setIsLoading(false);
        return;
      }

      // Group alerts by day
      const reportsByDay: { [key: string]: DailyReport } = {};
      
      alerts.forEach(alert => {
        const alertDate = new Date(alert.created_at);
        const dateKey = alertDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const displayDate = alertDate.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });

        if (!reportsByDay[dateKey]) {
          reportsByDay[dateKey] = {
            date: displayDate,
            totalCritical: 0,
            totalHigh: 0,
            summary: '',
            topThreats: []
          };
        }

        if (alert.severity === 4) reportsByDay[dateKey].totalCritical++;
        if (alert.severity === 3) reportsByDay[dateKey].totalHigh++;
        
        // Keep top 3 threats for each day
        if (reportsByDay[dateKey].topThreats.length < 3) {
          reportsByDay[dateKey].topThreats.push(alert);
        }
      });

      // Generate summaries
      Object.values(reportsByDay).forEach(report => {
        if (report.totalCritical > 0) {
          report.summary = `${report.totalCritical} critical threat${report.totalCritical > 1 ? 's' : ''} detected.`;
        } else if (report.totalHigh > 0) {
          report.summary = `${report.totalHigh} high-priority alert${report.totalHigh > 1 ? 's' : ''}.`;
        } else {
          report.summary = 'No critical issues.';
        }
      });

      // Convert to array and sort by date (newest first)
      const reportsArray = Object.keys(reportsByDay)
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 3) // Show last 3 days
        .map(key => reportsByDay[key]);

      setReports(reportsArray);
      setIsLoading(false);
    };

    fetchDailyReports();

    // Refresh every 5 minutes
    const interval = setInterval(fetchDailyReports, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [agentId, supabase]);

  if (isLoading) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Daily Reports</h3>
        </div>
        <div className="flex items-center justify-center h-32">
          <p className="text-slate-500">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Daily Reports</h3>
        <Link 
          href="/dashboard/alerts"
          className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          View All
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-3">
            <Shield className="text-green-400" size={24} />
          </div>
          <p className="text-slate-400 text-sm">No reports available</p>
          <p className="text-slate-600 text-xs mt-1">All systems secure</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report, index) => (
            <div 
              key={index}
              className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white mb-1">
                    Summary for {report.date}
                  </h4>
                  <p className="text-xs text-slate-400">{report.summary}</p>
                </div>
                <Link 
                  href="/dashboard/alerts"
                  className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap ml-2"
                >
                  View
                </Link>
              </div>

              {/* Threat counts */}
              {(report.totalCritical > 0 || report.totalHigh > 0) && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-700/50">
                  {report.totalCritical > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-xs text-slate-400">
                        {report.totalCritical} Critical
                      </span>
                    </div>
                  )}
                  {report.totalHigh > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span className="text-xs text-slate-400">
                        {report.totalHigh} High
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Top threats preview */}
              {report.topThreats.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-2">Top Threats:</p>
                  <div className="space-y-1">
                    {report.topThreats.slice(0, 2).map((threat, idx) => (
                      <div key={idx} className="text-xs text-slate-400 truncate flex items-center gap-2">
                        <AlertTriangle className="text-orange-400 flex-shrink-0" size={12} />
                        <span className="truncate">{threat.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}