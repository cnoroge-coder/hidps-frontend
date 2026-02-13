"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Download, Terminal, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function InstallAgentPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.agentId as string;
  const supabase = createClient();
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel(`agent_stats:agent_id=eq.${agentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_stats',
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          if ((payload.new as any).is_installed === true) {
            setIsInstalled(true);
            setTimeout(() => {
              router.push('/installation-confirmed');
            }, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, supabase, router]);

  const agentDownloadLink = "/hidps-agent.tar.gz";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        {isInstalled ? (
          <div className="text-center">
            <h1 className="text-4xl font-bold text-green-400">Installation Confirmed!</h1>
            <p className="text-lg text-slate-400 mt-2">Redirecting you to the agents page...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white">Install Your Agent</h1>
              <p className="text-lg text-slate-400 mt-2">Follow the steps below to get your agent online.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-8">
              <div>
                <h2 className="text-2xl font-bold flex items-center mb-4">
                  <Download className="mr-3 text-blue-500" />
                  1. Download the Agent
                </h2>
                <p className="text-slate-400 mb-4">
                  Download the agent package for your Linux distribution.
                </p>
                <a
                  href={agentDownloadLink}
                  download
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                >
                  <Download size={20} />
                  Download Agent (Linux x64)
                </a>
              </div>

              <div>
                <h2 className="text-2xl font-bold flex items-center mb-4">
                  <Terminal className="mr-3 text-green-500" />
                  2. Install & Run
                </h2>
                <p className="text-slate-400 mb-4">
                  Extract the package and run the installation script. You will need root privileges.
                </p>
                <div className="bg-slate-950 p-4 rounded-lg text-sm font-mono border border-slate-700">
                  <p className="text-gray-500"># Unpack the agent</p>
                  <p className="text-slate-300">$ tar -xvzf hidps-agent.tar.gz</p>
                  <br />
                  <p className="text-gray-500"># Navigate into the directory</p>
                  <p className="text-slate-300">$ cd hidps-agent</p>
                  <br />
                  <p className="text-gray-500"># Run the installer with your agent ID</p>
                  <p className="text-slate-300">$ sudo ./install.sh --agent-id {agentId}</p>
                </div>
              </div>

              <div className="text-center pt-6">
                <div className="flex items-center justify-center gap-3 text-lg text-slate-400">
                  <Loader2 className="animate-spin" />
                  Waiting for agent connection...
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
