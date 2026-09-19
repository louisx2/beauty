// Generado desde la base real de Supabase (no editar a mano).
// Para regenerarlo: Supabase > API Docs > TypeScript, o la herramienta
// "generate typescript types" del MCP de Supabase.
// El archivo anterior estaba escrito a mano y le faltaban tablas, vistas y
// funciones, por eso el cliente perdia los tipos y no avisaba de errores.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string
          created_at: string
          date: string
          duration: number
          employee: string
          id: string
          notes: string | null
          service: string
          source: string
          started_at: string | null
          status: string
          time: string
          tracking_token: string | null
        }
        Insert: {
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string
          created_at?: string
          date: string
          duration?: number
          employee: string
          id?: string
          notes?: string | null
          service: string
          source?: string
          started_at?: string | null
          status?: string
          time: string
          tracking_token?: string | null
        }
        Update: {
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string
          date?: string
          duration?: number
          employee?: string
          id?: string
          notes?: string | null
          service?: string
          source?: string
          started_at?: string | null
          status?: string
          time?: string
          tracking_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: { id: string; key: string; value: string }
        Insert: { id?: string; key: string; value?: string }
        Update: { id?: string; key?: string; value?: string }
        Relationships: []
      }
      client_packages: {
        Row: {
          amount_paid: number
          client_id: string
          id: string
          notes: string | null
          package_id: string
          purchased_at: string
          status: string
          total_price: number
          total_sessions: number
          used_sessions: number
        }
        Insert: {
          amount_paid?: number
          client_id: string
          id?: string
          notes?: string | null
          package_id: string
          purchased_at?: string
          status?: string
          total_price?: number
          total_sessions: number
          used_sessions?: number
        }
        Update: {
          amount_paid?: number
          client_id?: string
          id?: string
          notes?: string | null
          package_id?: string
          purchased_at?: string
          status?: string
          total_price?: number
          total_sessions?: number
          used_sessions?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "session_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          allergies: string | null
          cedula: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          skin_type: string | null
          source: string
        }
        Insert: {
          allergies?: string | null
          cedula?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          skin_type?: string | null
          source?: string
        }
        Update: {
          allergies?: string | null
          cedula?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          skin_type?: string | null
          source?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          itbis: number
          quantity: number
          taxable: boolean
          total: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          itbis?: number
          quantity?: number
          taxable?: boolean
          total?: number
          unit_price: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          itbis?: number
          quantity?: number
          taxable?: boolean
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_cedula: string | null
          client_id: string | null
          client_name: string
          created_at: string
          id: string
          ncf: string
          ncf_type: string
          payment_method: string
          status: string
          subtotal: number
          total: number
          total_itbis: number
        }
        Insert: {
          client_cedula?: string | null
          client_id?: string | null
          client_name: string
          created_at?: string
          id?: string
          ncf: string
          ncf_type: string
          payment_method?: string
          status?: string
          subtotal?: number
          total?: number
          total_itbis?: number
        }
        Update: {
          client_cedula?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string
          id?: string
          ncf?: string
          ncf_type?: string
          payment_method?: string
          status?: string
          subtotal?: number
          total?: number
          total_itbis?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ncf_sequences: {
        Row: {
          current_number: number
          id: string
          prefix: string
          range_end: number
          range_start: number
          type: string
        }
        Insert: {
          current_number?: number
          id?: string
          prefix: string
          range_end?: number
          range_start?: number
          type: string
        }
        Update: {
          current_number?: number
          id?: string
          prefix?: string
          range_end?: number
          range_start?: number
          type?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          package_id: string | null
          payment_method: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          payment_method?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          package_id?: string | null
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "client_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string
          id: string
          min_stock: number
          name: string
          purchase_price: number
          sale_price: number
          stock: number
          unit: string
        }
        Insert: {
          active?: boolean
          category?: string
          id?: string
          min_stock?: number
          name: string
          purchase_price?: number
          sale_price?: number
          stock?: number
          unit?: string
        }
        Update: {
          active?: boolean
          category?: string
          id?: string
          min_stock?: number
          name?: string
          purchase_price?: number
          sale_price?: number
          stock?: number
          unit?: string
        }
        Relationships: []
      }
      schedule_blocks: {
        Row: {
          created_at: string
          end_date: string
          end_time: string | null
          id: string
          reason: string
          staff_id: string | null
          start_date: string
          start_time: string | null
        }
        Insert: {
          created_at?: string
          end_date: string
          end_time?: string | null
          id?: string
          reason?: string
          staff_id?: string | null
          start_date: string
          start_time?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string
          end_time?: string | null
          id?: string
          reason?: string
          staff_id?: string | null
          start_date?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          category: string
          description: string
          duration: number
          has_session: boolean
          id: string
          name: string
          price: number
          staff_ids: string[]
          taxable: boolean
        }
        Insert: {
          active?: boolean
          category: string
          description?: string
          duration?: number
          has_session?: boolean
          id?: string
          name: string
          price?: number
          staff_ids?: string[]
          taxable?: boolean
        }
        Update: {
          active?: boolean
          category?: string
          description?: string
          duration?: number
          has_session?: boolean
          id?: string
          name?: string
          price?: number
          staff_ids?: string[]
          taxable?: boolean
        }
        Relationships: []
      }
      session_packages: {
        Row: {
          active: boolean
          description: string
          id: string
          name: string
          payment_mode: string
          price: number
          service_id: string
          sessions: number
        }
        Insert: {
          active?: boolean
          description?: string
          id?: string
          name: string
          payment_mode?: string
          price: number
          service_id: string
          sessions: number
        }
        Update: {
          active?: boolean
          description?: string
          id?: string
          name?: string
          payment_mode?: string
          price?: number
          service_id?: string
          sessions?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          account_name: string
          account_number: string
          bank_accounts: Json | null
          bank_name: string
          created_at: string | null
          deposit_amount: number
          id: number
          package_deposit_type: string
          package_deposit_value: number
          updated_at: string | null
          whatsapp_number: string
        }
        Insert: {
          account_name?: string
          account_number?: string
          bank_accounts?: Json | null
          bank_name?: string
          created_at?: string | null
          deposit_amount?: number
          id?: number
          package_deposit_type?: string
          package_deposit_value?: number
          updated_at?: string | null
          whatsapp_number?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_accounts?: Json | null
          bank_name?: string
          created_at?: string | null
          deposit_amount?: number
          id?: number
          package_deposit_type?: string
          package_deposit_value?: number
          updated_at?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          active: boolean
          avatar_url: string | null
          commission_pct: number
          email: string | null
          id: string
          name: string
          phone: string
          role: string
          schedule: string
          service_ids: string[]
          working_days: string[]
          working_end: string
          working_start: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          commission_pct?: number
          email?: string | null
          id?: string
          name: string
          phone?: string
          role?: string
          schedule?: string
          service_ids?: string[]
          working_days?: string[]
          working_end?: string
          working_start?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          commission_pct?: number
          email?: string | null
          id?: string
          name?: string
          phone?: string
          role?: string
          schedule?: string
          service_ids?: string[]
          working_days?: string[]
          working_end?: string
          working_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      schedule_blocks_public: {
        Row: {
          end_date: string | null
          end_time: string | null
          id: string | null
          staff_id: string | null
          start_date: string | null
          start_time: string | null
        }
        Insert: {
          end_date?: string | null
          end_time?: string | null
          id?: string | null
          staff_id?: string | null
          start_date?: string | null
          start_time?: string | null
        }
        Update: {
          end_date?: string | null
          end_time?: string | null
          id?: string | null
          staff_id?: string | null
          start_date?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cancel_client_appointment: {
        Args: { p_id: string; p_phone: string }
        Returns: boolean
      }
      cancel_expired_appointments: { Args: never; Returns: number }
      create_staff_user: {
        Args: {
          user_email: string
          user_name: string
          user_password: string
          user_role: string
        }
        Returns: string
      }
      delete_staff_user: { Args: { user_email: string }; Returns: boolean }
      get_busy_slots: {
        Args: { p_date: string; p_employee: string }
        Returns: {
          duration: number
          time: string
        }[]
      }
      get_client_appointments: {
        Args: { p_phone: string }
        Returns: {
          client_name: string
          date: string
          duration: number
          employee: string
          id: string
          notes: string
          service: string
          source: string
          status: string
          time: string
        }[]
      }
      get_next_ncf: { Args: { ncf_type: string }; Returns: string }
      list_staff_logins: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
        }[]
      }
      staff_name: { Args: never; Returns: string }
      staff_role: { Args: never; Returns: string }
      update_staff_user_password: {
        Args: { new_password: string; user_email: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
