"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { createClient } from './supabase/client';
import { Database } from './supabase/database.types';

// It appears the 'firewall_enabled' property is missing from your Supabase 'agents' table definition.
// To fix this properly, you should add a 'firewall_enabled' column (e.g., of type BOOLEAN) to your 'agents' table in Supabase,
// and then regenerate your 'supabase/database.types.ts' file.
type Agent = Database['public']['Tables']['agents']['Row'] & { firewall_enabled?: boolean; };

interface AgentContextType {
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;
  agents: Agent[];
  refreshAgents: () => Promise<void>;
  deleteAgent: (agentId: string) => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [selectedAgent, setSelectedAgentState] = useState<Agent | null>(() => {
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('selectedAgentId');
      return storedId ? { id: storedId } as Agent : null; // Temporary object, will be replaced
    }
    return null;
  });
  const [agents, setAgents] = useState<Agent[]>([]);
  const supabase = createClient();

  const setSelectedAgent = (agent: Agent | null) => {
    setSelectedAgentState(agent);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedAgentId', agent?.id || '');
    }
  };

  const deleteAgent = (agentId: string) => {
    // Remove from local agents list (not from database)
    setAgents(prev => prev.filter(agent => agent.id !== agentId));
    // If the deleted agent was selected, clear selection
    if (selectedAgent?.id === agentId) {
      setSelectedAgent(null);
    }
  };

  useEffect(() => {
    fetchAgents();
    
    // Optional: Set up real-time subscription to agents table
    const channel = supabase
      .channel('agents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents'
        },
        () => {
          fetchAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AgentContext.Provider value={{ selectedAgent, setSelectedAgent, agents, refreshAgents: fetchAgents, deleteAgent }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}