"use client";

import { AgentProvider } from "@/lib/agent-context";
import { WebSocketProvider } from "@/lib/websocket-context";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AgentProvider>
      <WebSocketProvider>{children}</WebSocketProvider>
    </AgentProvider>
  );
}
