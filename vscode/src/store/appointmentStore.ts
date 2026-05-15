import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Appointment {
  id: string;
  client_id: string | null;
  clientName: string;
  clientPhone: string;
  service: string;
  employee: string;
  date: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
  notes: string | null;
  source: string;
  createdAt: string;
}

function mapRow(r: Record<string, unknown>): Appointment {
  return {
    id: r.id as string,
    client_id: (r.client_id as string) ?? null,
    clientName: r.client_name as string,
    clientPhone: r.client_phone as string,
    service: r.service as string,
    employee: r.employee as string,
    date: r.date as string,
    time: ((r.time as string) ?? '').slice(0, 5),
    duration: r.duration as number,
    status: r.status as AppointmentStatus,
    notes: (r.notes as string) ?? null,
    source: r.source as string,
    createdAt: r.created_at as string,
  };
}

interface AppointmentState {
  appointments: Appointment[];
  loading: boolean;
  fetchAppointments: () => Promise<void>;
  addAppointment: (appt: Omit<Appointment, 'id' | 'createdAt' | 'client_id'>) => Promise<Appointment | null>;
  updateAppointment: (id: string, data: Partial<Appointment>) => Promise<boolean>;
  updateStatus: (id: string, status: AppointmentStatus) => Promise<boolean>;
  deleteAppointment: (id: string) => Promise<boolean>;
  autoMarkNoShow: () => Promise<number>;
  getByDate: (date: string) => Appointment[];
  getByDateRange: (start: string, end: string) => Appointment[];
}

export const useAppointmentStore = create<AppointmentState>()((set, get) => ({
  appointments: [],
  loading: false,

  fetchAppointments: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) {
        toast.error('Error al cargar citas');
        console.error('[appointments] fetch error:', error);
      } else {
        set({ appointments: (data ?? []).map(mapRow) });
      }
    } catch (err) {
      toast.error('Error de conexión al cargar citas');
      console.error('[appointments] network error:', err);
    } finally {
      set({ loading: false });
    }
  },

  addAppointment: async (appt) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          client_name: appt.clientName,
          client_phone: appt.clientPhone,
          service: appt.service,
          employee: appt.employee,
          date: appt.date,
          time: appt.time,
          duration: appt.duration,
          status: appt.status,
          notes: appt.notes ?? '',
          source: appt.source,
        })
        .select()
        .single();

      if (error) {
        console.error('[appointments] insert error:', error);
        return null;
      }

      const mapped = mapRow(data as Record<string, unknown>);
      set((s) => ({ appointments: [...s.appointments, mapped] }));
      return mapped;
    } catch (err) {
      console.error('[appointments] insert network error:', err);
      return null;
    }
  },

  updateAppointment: async (id, updates) => {
    const db: Record<string, unknown> = {};
    if (updates.clientName !== undefined) db.client_name = updates.clientName;
    if (updates.clientPhone !== undefined) db.client_phone = updates.clientPhone;
    if (updates.service !== undefined) db.service = updates.service;
    if (updates.employee !== undefined) db.employee = updates.employee;
    if (updates.date !== undefined) db.date = updates.date;
    if (updates.time !== undefined) db.time = updates.time;
    if (updates.duration !== undefined) db.duration = updates.duration;
    if (updates.status !== undefined) db.status = updates.status;
    if (updates.notes !== undefined) db.notes = updates.notes;
    if (updates.source !== undefined) db.source = updates.source;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .update(db)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[appointments] update error:', error);
        return false;
      }

      set((s) => ({
        appointments: s.appointments.map((a) =>
          a.id === id ? mapRow(data as Record<string, unknown>) : a
        ),
      }));
      return true;
    } catch (err) {
      console.error('[appointments] update network error:', err);
      return false;
    }
  },

  updateStatus: async (id, status) => {
    // Optimistic update
    set((s) => ({
      appointments: s.appointments.map((a) => (a.id === id ? { ...a, status } : a)),
    }));

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) {
        // Rollback — re-fetch to restore correct state
        console.error('[appointments] status update error:', error);
        await get().fetchAppointments();
        toast.error('Error al actualizar el estado');
        return false;
      }

      return true;
    } catch (err) {
      console.error('[appointments] status update network error:', err);
      await get().fetchAppointments();
      toast.error('Error de conexión');
      return false;
    }
  },

  deleteAppointment: async (id) => {
    const backup = get().appointments;
    set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) }));

    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id);

      if (error) {
        set({ appointments: backup });
        console.error('[appointments] delete error:', error);
        toast.error('Error al eliminar la cita');
        return false;
      }

      return true;
    } catch (err) {
      set({ appointments: backup });
      console.error('[appointments] delete network error:', err);
      toast.error('Error de conexión al eliminar');
      return false;
    }
  },

  autoMarkNoShow: async () => {
    const now = new Date();
    const pendingIds: string[] = [];

    for (const a of get().appointments) {
      if (a.status !== 'pending' && a.status !== 'confirmed') continue;
      const [h, m] = a.time.split(':').map(Number);
      const apptEnd = new Date(`${a.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
      apptEnd.setMinutes(apptEnd.getMinutes() + a.duration + 30);
      if (now > apptEnd) pendingIds.push(a.id);
    }

    if (pendingIds.length === 0) return 0;

    try {
      await supabase
        .from('appointments')
        .update({ status: 'no_show' })
        .in('id', pendingIds);

      set((s) => ({
        appointments: s.appointments.map((a) =>
          pendingIds.includes(a.id) ? { ...a, status: 'no_show' as AppointmentStatus } : a
        ),
      }));
    } catch (err) {
      console.error('[appointments] autoMarkNoShow error:', err);
    }

    return pendingIds.length;
  },

  getByDate: (date) => get().appointments.filter((a) => a.date === date),
  getByDateRange: (start, end) =>
    get().appointments.filter((a) => a.date >= start && a.date <= end),
}));
