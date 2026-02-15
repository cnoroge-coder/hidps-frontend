"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AgentSetupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [agentName, setAgentName] = useState('');
  const [agentId, setAgentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim()) {
      setError('Agent name is required.');
      return;
    }
    if (!agentId.trim()) {
      setError('Agent ID is required.');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('You must be logged in to add an agent.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Insert into agents table
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .insert({
          id: agentId,
          name: agentName,
          owner_id: user.id,
        })
        .select()
        .single();

      if (agentError) throw agentError;

      // 2. Insert into agent_stats table
      const { error: statsError } = await supabase
        .from('agent_stats')
        .insert({
          agent_id: agentData.id,
        });

      if (statsError) throw statsError;

      router.push('/agents');

    } catch (err: any) {
      console.error('Error adding agent:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white">Add New Agent</h2>
        <p className="text-slate-400">Create a new agent to monitor a host.</p>
      </header>

      <div className="max-w-md bg-slate-900 p-8 rounded-xl border border-slate-800">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="agentId" className="block text-sm font-medium text-slate-300 mb-2">
              Agent ID
            </label>
            <input
              id="agentId"
              name="agentId"
              type="text"
              required
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="e.g., e7c50e2f-17cd-4954-a868-e02e9101172a"
            />
          </div>
          <div>
            <label htmlFor="agentName" className="block text-sm font-medium text-slate-300 mb-2">
              Agent Name
            </label>
            <input
              id="agentName"
              name="agentName"
              type="text"
              required
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="e.g., Production Web Server"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Adding Agent...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Add Agent
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
