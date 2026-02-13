"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { createBrowserClient } from "@supabase/ssr";

// Define the shape of the context data
interface WebSocketContextType {
  logs: any[];
  firewallRules: any[];
  isConnected: boolean;
  sendCommand: (agentId: string, command: string, payload: any) => void; // New helper
}

// Create the context with a default value
const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined
);

// Create the provider component
export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [firewallRules, setFirewallRules] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null); // Store socket instance

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, [supabase.auth]);

  useEffect(() => {
    if (!userId) return;

    // Determine the WebSocket protocol
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = process.env.NODE_ENV === 'development' 
      ? 'hidps.simiyuclint.com' 
      : 'hidps.simiyuclint.com';
    const wsUrl = `${protocol}//${host}/?user_id=${userId}`;

    const ws = new WebSocket(wsUrl);
    setSocket(ws); // Save the socket instance

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("WebSocket message received:", message);

        if (message.type === "firewall_sync" || message.type === "firewall_rules_updated") {
          setFirewallRules(message.rules);
        }

        if (message.type === "log_stream") {
          setLogs((prevLogs) => [message.log, ...prevLogs]);
        }

        if (message.type === "firewall_rules") {
          setFirewallRules(message.data);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false)
    };

    // Clean up the connection when the component unmounts
    return () => {
      ws.close();
    };
  }, [userId]);

  const sendCommand = (agentId: string, command: string, payload: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "frontend_command",
        agent_id: agentId,
        command,
        payload
      }));
    }
  };
  const value = {
    logs,
    firewallRules,
    isConnected,
    sendCommand
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Create a custom hook for using the context
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}
