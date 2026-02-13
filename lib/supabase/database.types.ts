export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string
          created_at: string
          name: string
          owner_id: string
          last_seen: string
          is_online: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          owner_id: string
          last_seen?: string
          is_online?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          owner_id?: string
          last_seen?: string
          is_online?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "agents_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      agent_users: {
        Row: {
          created_at: string
          agent_id: string
          user_id: string
          role: string
        }
        Insert: {
          created_at?: string
          agent_id: string
          user_id: string
          role: string
        }
        Update: {
          created_at?: string
          agent_id?: string
          user_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_users_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_users_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      monitored_files: {
        Row: {
          id: string
          created_at: string
          agent_id: string
          file_path: string
          added_by: string
        }
        Insert: {
          id?: string
          created_at?: string
          agent_id: string
          file_path: string
          added_by: string
        }
        Update: {
          id?: string
          created_at?: string
          agent_id?: string
          file_path?: string
          added_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitored_files_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitored_files_added_by_fkey"
            columns: ["added_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      alerts: {
        Row: {
          id: string
          created_at: string
          resolved_at: string | null
          agent_id: string
          title: string
          message: string
          alert_type: string
          severity: number
          resolved: boolean
          resolved_by: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          resolved_at?: string | null
          agent_id: string
          title: string
          message: string
          alert_type: string
          severity: number
          resolved?: boolean
          resolved_by?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          resolved_at?: string | null
          agent_id?: string
          title?: string
          message?: string
          alert_type?: string
          severity?: number
          resolved?: boolean
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      agent_stats: {
        Row: {
          created_at: string
          agent_id: string
          is_installed: boolean
          cpu_usage: number
          ram_usage: number
          storage_usage: number
          firewall_enabled: boolean
        }
        Insert: {
          created_at?: string
          agent_id: string
          is_installed?: boolean
          cpu_usage?: number
          ram_usage?: number
          storage_usage?: number
          firewall_enabled?: boolean
        }
        Update: {
          created_at?: string
          agent_id?: string
          is_installed?: boolean
          cpu_usage?: number
          ram_usage?: number
          storage_usage?: number
          firewall_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "agent_stats_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
