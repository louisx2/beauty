import { create } from 'zustand';
import { supabase } from '../lib/supabase';

/**
 * Bloqueos de horario: vacaciones, dia libre, almuerzo o cierre del salon.
 * staffId null  = aplica a todo el salon (feriado, cierre por mantenimiento).
 * startTime null = todo el dia.
 */
export interface ScheduleBlock {
  id: string;
  staffId: string | null;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  reason: string;
  createdAt: string;
}

function mapRow(r: any): ScheduleBlock {
  return {
    id: r.id,
    staffId: r.staff_id || null,
    startDate: r.start_date,
    endDate: r.end_date,
    startTime: r.start_time ? String(r.start_time).slice(0, 5) : null,
    endTime: r.end_time ? String(r.end_time).slice(0, 5) : null,
    reason: r.reason || '',
    createdAt: r.created_at,
  };
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Indica si un tramo (fecha + hora de inicio + duracion) choca con algun bloqueo.
 * Un bloqueo de todo el dia tapa cualquier hora de esa fecha.
 */
export function isBlocked(
  blocks: ScheduleBlock[],
  staffId: string | null,
  date: string,
  startMinutes: number,
  durationMin: number,
): ScheduleBlock | null {
  const endMinutes = startMinutes + durationMin;
  for (const b of blocks) {
    if (date < b.startDate || date > b.endDate) continue;
    // Un bloqueo del salon (staffId null) aplica a todo el mundo.
    if (b.staffId && b.staffId !== staffId) continue;
    if (!b.startTime || !b.endTime) return b;
    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);
    if (startMinutes < bEnd && endMinutes > bStart) return b;
  }
  return null;
}

interface BlockState {
  blocks: ScheduleBlock[];
  loading: boolean;
  fetchBlocks: () => Promise<void>;
  addBlock: (b: Omit<ScheduleBlock, 'id' | 'createdAt'>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
}

export const useBlockStore = create<BlockState>()((set) => ({
  blocks: [],
  loading: false,

  fetchBlocks: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('schedule_blocks')
      .select('*')
      .order('start_date', { ascending: true });
    if (error) {
      set({ loading: false });
      throw new Error(error.message);
    }
    set({ blocks: (data || []).map(mapRow), loading: false });
  },

  addBlock: async (b) => {
    const { data, error } = await supabase
      .from('schedule_blocks')
      .insert({
        staff_id: b.staffId,
        start_date: b.startDate,
        end_date: b.endDate,
        start_time: b.startTime,
        end_time: b.endTime,
        reason: b.reason,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (data) set((st) => ({ blocks: [...st.blocks, mapRow(data)] }));
  },

  deleteBlock: async (id) => {
    const { error } = await supabase.from('schedule_blocks').delete().eq('id', id);
    if (error) throw new Error(error.message);
    set((st) => ({ blocks: st.blocks.filter((b) => b.id !== id) }));
  },
}));
