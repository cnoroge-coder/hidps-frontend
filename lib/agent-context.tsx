"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { createClient } from './supabase/client';
import { Database } from './supabase/database.types';

type BaseAgent = Database['public']['Tables']['agents']['Row'];

export type Agent = BaseAgent & {
  firewall_enabled: boolean;
  // Add more if needed later
};

interface AgentContextType {
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;
  agents: Agent[];
  refreshAgents: () => Promise<void>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const supabase = createClient();

  const fetchAgents = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setAgents([]);
      setSelectedAgent(null);
      return;
    }

    const { data, error } = await supabase.from('agents').select('*');
    
    if (error) {
      console.error('Error fetching agents:', error);
      setAgents([]);
    } else if (data) {
      // Map data to include firewall_enabled field
      const mappedAgents: Agent[] = data.map(agent => ({
        ...agent,
        firewall_enabled: (agent as any).firewall_enabled ?? false
      }));
      setAgents(mappedAgents);
      // Only set selected agent if there isn't one already or if current one is no longer in the list
      if (!selectedAgent && mappedAgents.length > 0) {
        setSelectedAgent(mappedAgents.length > 0 ? mappedAgents[0] : null);
      }
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
    <AgentContext.Provider value={{ selectedAgent, setSelectedAgent, agents, refreshAgents: fetchAgents }}>
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