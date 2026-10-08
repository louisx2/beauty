import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { deFila, type CambiosHistorial, type EntradaHistorial } from '../lib/historialAnterior';

/**
 * Historial anterior de las clientas (tabla `client_history`). Se carga por clienta al abrir su historial.
 * Las funciones lanzan el error; la pantalla decide qué mensaje mostrar.
 */
interface ClientHistoryState {
  porClienta: Record<string, EntradaHistorial[]>;
  fetchHistorial: (clientId: string) => Promise<void>;
  addEntrada: (clientId: string, cambios: CambiosHistorial) => Promise<void>;
  updateEntrada: (entrada: EntradaHistorial, cambios: CambiosHistorial) => Promise<void>;
  deleteEntrada: (entrada: EntradaHistorial) => Promise<void>;
}

export const useClientHistoryStore = create<ClientHistoryState>()((set) => ({
  porClienta: {},

  fetchHistorial: async (clientId) => {
    const { data, error } = await supabase
      .from('client_history')
      .select('*')
      .eq('client_id', clientId);
    if (error) throw error;
    set((s) => ({ porClienta: { ...s.porClienta, [clientId]: (data || []).map(deFila) } }));
  },

  addEntrada: async (clientId, cambios) => {
    const { data, error } = await supabase
      .from('client_history')
      .insert({ client_id: clientId, ...cambios })
      .select()
      .single();
    if (error) throw error;
    set((s) => ({ porClienta: { ...s.porClienta, [clientId]: [...(s.porClienta[clientId] || []), deFila(data)] } }));
  },

  updateEntrada: async (entrada, cambios) => {
    const { data, error } = await supabase
      .from('client_history')
      .update(cambios)
      .eq('id', entrada.id)
      .select()
      .single();
    if (error) throw error;
    const nueva = deFila(data);
    set((s) => ({
      porClienta: {
        ...s.porClienta,
        [entrada.clientId]: (s.porClienta[entrada.clientId] || []).map((e) => (e.id === entrada.id ? nueva : e)),
      },
    }));
  },

  deleteEntrada: async (entrada) => {
    const { error } = await supabase.from('client_history').delete().eq('id', entrada.id);
    if (error) throw error;
    set((s) => ({
      porClienta: {
        ...s.porClienta,
        [entrada.clientId]: (s.porClienta[entrada.clientId] || []).filter((e) => e.id !== entrada.id),
      },
    }));
  },
}));
