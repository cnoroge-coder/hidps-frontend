"use client";
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { UserPlus, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAgent } from '@/lib/agent-context';
import { createClient } from '@/lib/supabase/client';

export default function AddUserToAgentPage() {
  const router = useRouter();
  const params = useParams();
  const agentId = params.agentId as string;
  const { agents } = useAgent();
  const agent = agents.find(a => a.id === agentId);
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setFeedback('Please enter an email address.');
      setIsError(true);
      return;
    }

    setIsLoading(true);
    setFeedback('');
    setIsError(false);

    try {
      // Step 1: Find the user by email in the auth.users table
      // Note: We need to use the service role or an RPC function for this
      // Since we can't directly query auth.users from the client, we'll use a workaround
      
      // First, check if this is a real approach - we need to call an edge function or RPC
      // For now, let's create an RPC function approach
      
      const { data: userData, error: userError } = await (supabase.rpc as any)(
        'get_user_id_by_email',
        { user_email: email }
      );

      if (userError) {
        console.error('Error finding user:', userError);
        setFeedback('Could not find user with that email address.');
        setIsError(true);
        setIsLoading(false);
        return;
      }

      if (!userData) {
        setFeedback('No user found with that email address.');
        setIsError(true);
        setIsLoading(false);
        return;
      }

      // Step 2: Check if user already has access
      const { data: existingAccess, error: checkError } = await supabase
        .from('agent_users')
        .select('*')
        .eq('agent_id', agentId)
        .eq('user_id', userData)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking existing access:', checkError);
        setFeedback('An error occurred while checking user access.');
        setIsError(true);
        setIsLoading(false);
        return;
      }

      if (existingAccess) {
        setFeedback('This user already has access to this agent.');
        setIsError(true);
        setIsLoading(false);
        return;
      }

      // Step 3: Add user to agent_users table
      const { error: insertError } = await supabase
        .from('agent_users')
        .insert({
          agent_id: agentId,
          user_id: userData,
          role: 'viewer', // Default role
        });

      if (insertError) {
        console.error('Error adding user:', insertError);
        setFeedback('Failed to add user to agent. You may not have permission.');
        setIsError(true);
        setIsLoading(false);
        return;
      }

      setFeedback(`Successfully added ${email} to ${agent?.name}!`);
      setIsError(false);
      setEmail('');
      
      // Redirect back to agents page after 2 seconds
      setTimeout(() => {
        router.push('/agents');
      }, 2000);

    } catch (error) {
      console.error('Unexpected error:', error);
      setFeedback('An unexpected error occurred.');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!agent) {
    return (
      <div className="text-center text-white">
        <h2 className="text-2xl font-bold">Agent not found</h2>
        <Link href="/agents" className="mt-4 inline-block text-blue-400 hover:text-blue-300">
          Go back to agents list
        </Link>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-8">
        <Link href="/agents" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-4">
          <ArrowLeft size={18} />
          Back to Agents
        </Link>
        <h2 className="text-3xl font-bold text-white">Add User to {agent.name}</h2>
        <p className="text-slate-400">Give a user access to view and manage this agent.</p>
      </header>

      <div className="max-w-md mx-auto bg-slate-900 p-8 rounded-xl border border-slate-800">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              User Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Adding User...
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Add User
                </>
              )}
            </button>
          </div>
        </form>

        {feedback && (
          <p className={`mt-4 text-center text-sm ${isError ? 'text-red-400' : 'text-green-400'}`}>
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}