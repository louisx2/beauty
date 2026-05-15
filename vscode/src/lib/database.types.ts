export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          name: string;
          phone: string;
          email: string | null;
          cedula: string | null;
          skin_type: string | null;
          allergies: string | null;
          notes: string | null;
          source: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['clients']['Insert']>;
      };
      services: {
        Row: {
          id: string;
          name: string;
          category: string;
          description: string;
          duration: number;
          price: number;
          taxable: boolean;
          has_session: boolean;
          active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['services']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
      };
      session_packages: {
        Row: {
          id: string;
          service_id: string;
          name: string;
          sessions: number;
          price: number;
          active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['session_packages']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['session_packages']['Insert']>;
      };
      client_packages: {
        Row: {
          id: string;
          client_id: string;
          package_id: string;
          total_sessions: number;
          used_sessions: number;
          notes: string | null;
          purchased_at: string;
        };
        Insert: Omit<Database['public']['Tables']['client_packages']['Row'], 'id' | 'purchased_at'> & {
          id?: string;
          purchased_at?: string;
        };
        Update: Partial<Database['public']['Tables']['client_packages']['Insert']>;
      };
      appointments: {
        Row: {
          id: string;
          client_id: string | null;
          client_name: string;
          client_phone: string;
          service: string;
          employee: string;
          date: string;
          time: string;
          duration: number;
          status: string;
          notes: string | null;
          source: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['appointments']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
      };
      invoices: {
        Row: {
          id: string;
          client_id: string | null;
          client_name: string;
          client_cedula: string | null;
          ncf: string;
          ncf_type: string;
          subtotal: number;
          total_itbis: number;
          total: number;
          payment_method: string;
          status: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          taxable: boolean;
          itbis: number;
          total: number;
        };
        Insert: Omit<Database['public']['Tables']['invoice_items']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['invoice_items']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          name: string;
          category: string;
          purchase_price: number;
          sale_price: number;
          stock: number;
          min_stock: number;
          unit: string;
          active: boolean;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      staff: {
        Row: {
          id: string;
          name: string;
          role: string;
          phone: string;
          email: string | null;
          commission_pct: number;
          schedule: string;
          working_days: string[];
          working_start: string;
          working_end: string;
          service_ids: string[];
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['staff']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['staff']['Insert']>;
      };
      ncf_sequences: {
        Row: {
          id: string;
          type: string;
          prefix: string;
          current_number: number;
          range_start: number;
          range_end: number;
        };
        Insert: Omit<Database['public']['Tables']['ncf_sequences']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['ncf_sequences']['Insert']>;
      };
      business_settings: {
        Row: {
          id: string;
          key: string;
          value: string;
        };
        Insert: Omit<Database['public']['Tables']['business_settings']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['business_settings']['Insert']>;
      };
      settings: {
        Row: {
          id: number;
          deposit_amount: number;
          bank_name: string;
          account_number: string;
          account_name: string;
          whatsapp_number: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['settings']['Row']>;
        Update: Partial<Database['public']['Tables']['settings']['Row']>;
      };
    };
  };
};
