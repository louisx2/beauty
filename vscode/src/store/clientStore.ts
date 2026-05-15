import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface Client {
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
}

interface ClientState {
  clients: Client[];
  loading: boolean;
  error: string | null;
  fetchClients: () => Promise<void>;
  addClient: (c: Omit<Client, 'id' | 'created_at'>) => Promise<void>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
}

export const useClientStore = create<ClientState>()((set, get) => ({
  clients: [],
  loading: false,
  error: null,

  fetchClients: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      set({ error: error.message, loading: false });
      toast.error('Error al cargar clientas');
    } else {
      set({ clients: data || [], loading: false });
    }
  },

  addClient: async (c) => {
    const { data, error } = await supabase
      .from('clients')
      .insert(c)
      .select()
      .single();
    if (error) {
      console.error("Error al crear clienta:", error);
      toast.error('Error al crear clienta');
    } else if (data) {
      set((s) => ({ clients: [data, ...s.clients] }));
      toast.success('Clienta creada exitosamente');
    }
  },

  updateClient: async (id, updates) => {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error("Error al actualizar clienta:", error);
      toast.error('Error al actualizar clienta');
    } else if (data) {
      set((s) => ({
        clients: s.clients.map((c) => (c.id === id ? data : c)),
      }));
      toast.success('Clienta actualizada');
    }
  },

  deleteClient: async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar clienta');
      console.error(error);
    } else {
      set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }));
      toast.success('Clienta eliminada');
    }
  },
}));
