"use client";

import { useAgent } from "@/lib/agent-context";
import { ChevronDown } from "lucide-react";

export default function AgentSelector() {
  const { selectedAgent, setSelectedAgent, agents } = useAgent();

  if (!selectedAgent) {
    return null;
  }

  return (
    <div className="relative">
      <select
        value={selectedAgent.id}
        onChange={(e) => {
          const agent = agents.find((a) => a.id === e.target.value);
          setSelectedAgent(agent || null);
        }}
        className="appearance-none w-full md:w-48 bg-slate-800 border border-slate-700 text-white py-2 px-3 pr-8 rounded-lg focus:outline-none focus:bg-slate-700 focus:border-slate-500"
      >
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
        <ChevronDown size={18} />
      </div>
    </div>
  );
}
