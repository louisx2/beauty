import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

/** La base todavía no tiene la columna del cumpleaños (falta correr supabase/migration_cumpleanos.sql). */
const sinColumnaCumple = (error: { code?: string; message?: string } | null, datos: object) =>
  !!error && 'birthday' in datos && (error.code === 'PGRST204' || /birthday/.test(error.message ?? ''));
const AVISO_CUMPLE = 'Se guardó todo menos el cumpleaños: falta activarlo en la base de datos (avísale a soporte).';

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
  /** cumpleaños (opcional), "AAAA-MM-DD"; con el año 1904 si no se sabe el año (ver clientes/cumples.ts) */
  birthday?: string | null;
  /** dirección (opcional): calle, sector o barrio */
  address?: string | null;
}

interface ClientState {
  clients: Client[];
  loading: boolean;
  error: string | null;
  fetchClients: () => Promise<void>;
  addClient: (c: Omit<Client, 'id' | 'created_at'>) => Promise<Client | null>;
  /** true si se guardó (el error ya se avisó) */
  updateClient: (id: string, data: Partial<Client>) => Promise<boolean>;
  deleteClient: (id: string) => Promise<boolean>;
}

export const useClientStore = create<ClientState>()((set) => ({
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
    let { data, error } = await supabase
      .from('clients')
      .insert(c)
      .select()
      .single();
    if (sinColumnaCumple(error, c)) {
      const { birthday: _sinCumple, ...resto } = c;
      void _sinCumple;
      ({ data, error } = await supabase.from('clients').insert(resto).select().single());
      if (!error) toast(AVISO_CUMPLE, { icon: '⚠️', duration: 7000 });
    }
    if (error) {
      console.error("Error al crear clienta:", error);
      toast.error('Error al crear clienta');
      return null;
    } else if (data) {
      set((s) => ({ clients: [data, ...s.clients] }));
      toast.success('Clienta creada exitosamente');
      return data;
    }
    return null;
  },

  updateClient: async (id, updates) => {
    let { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (sinColumnaCumple(error, updates)) {
      const { birthday: _sinCumple, ...resto } = updates;
      void _sinCumple;
      ({ data, error } = await supabase.from('clients').update(resto).eq('id', id).select().single());
      if (!error) toast(AVISO_CUMPLE, { icon: '⚠️', duration: 7000 });
    }
    if (error) {
      console.error("Error al actualizar clienta:", error);
      toast.error('Error al actualizar clienta');
      return false;
    }
    if (data) {
      set((s) => ({
        clients: s.clients.map((c) => (c.id === id ? data : c)),
      }));
      toast.success('Clienta actualizada');
    }
    return true;
  },

  deleteClient: async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar clienta');
      console.error(error);
      return false;
    }
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }));
    toast.success('Clienta eliminada');
    return true;
  },
}));
