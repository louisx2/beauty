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

// Map DB row to app shape
function mapRow(r: any): Appointment {
  return {
    id: r.id,
    client_id: r.client_id,
    clientName: r.client_name,
    clientPhone: r.client_phone,
    service: r.service,
    employee: r.employee,
    date: r.date,
    time: r.time?.slice(0, 5) || r.time, // "09:00:00" -> "09:00"
    duration: r.duration,
    status: r.status as AppointmentStatus,
    notes: r.notes,
    source: r.source,
    createdAt: r.created_at,
  };
}

interface AppointmentState {
  appointments: Appointment[];
  loading: boolean;
  fetchAppointments: () => Promise<void>;
  addAppointment: (appt: Omit<Appointment, 'id' | 'createdAt' | 'client_id'>) => Promise<void>;
  updateAppointment: (id: string, data: Partial<Appointment>) => Promise<void>;
  updateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
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
      if (!error && data) {
        set({ appointments: data.map(mapRow), loading: false });
      } else {
        if (error) toast.error('Error al cargar citas');
        set({ loading: false });
      }
    } catch (err) {
      toast.error('Error de conexión');
      set({ loading: false });
    }
  },

  addAppointment: async (appt) => {
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
        notes: appt.notes || '',
        source: appt.source,
      })
      .select()
      .single();
    if (error) {
      toast.error('Error al crear la cita');
      console.error(error);
    } else if (data) {
      set((s) => ({ appointments: [...s.appointments, mapRow(data)] }));
      toast.success('Cita creada exitosamente');
    }
  },

  updateAppointment: async (id, updates) => {
    const dbUpdates: any = {};
    if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName;
    if (updates.clientPhone !== undefined) dbUpdates.client_phone = updates.clientPhone;
    if (updates.service !== undefined) dbUpdates.service = updates.service;
    if (updates.employee !== undefined) dbUpdates.employee = updates.employee;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.time !== undefined) dbUpdates.time = updates.time;
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.source !== undefined) dbUpdates.source = updates.source;

    const { data, error } = await supabase
      .from('appointments')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      toast.error('Error al actualizar la cita');
      console.error(error);
    } else if (data) {
      set((s) => ({
        appointments: s.appointments.map((a) => (a.id === id ? mapRow(data) : a)),
      }));
      toast.success('Cita actualizada');
    }
  },

  updateStatus: async (id, status) => {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      toast.error('Error al actualizar el estado');
      console.error(error);
    } else if (data) {
      set((s) => ({
        appointments: s.appointments.map((a) => (a.id === id ? mapRow(data) : a)),
      }));
      toast.success('Estado actualizado');
    }
  },

  deleteAppointment: async (id) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar la cita');
      console.error(error);
    } else {
      set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) }));
      toast.success('Cita eliminada');
    }
  },

  autoMarkNoShow: async () => {
    const now = new Date();
    const state = get();
    let count = 0;
    const ids: string[] = [];

    state.appointments.forEach((a) => {
      if (a.status !== 'pending' && a.status !== 'confirmed') return;
      const [hours, minutes] = a.time.split(':').map(Number);
      const apptEnd = new Date(`${a.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
      apptEnd.setMinutes(apptEnd.getMinutes() + a.duration + 30);
      if (now > apptEnd) {
        ids.push(a.id);
        count++;
      }
    });

    if (ids.length > 0) {
      await supabase
        .from('appointments')
        .update({ status: 'no_show' })
        .in('id', ids);

      set((s) => ({
        appointments: s.appointments.map((a) =>
          ids.includes(a.id) ? { ...a, status: 'no_show' as AppointmentStatus } : a
        ),
      }));
    }
    return count;
  },

  getByDate: (date) => get().appointments.filter((a) => a.date === date),
  getByDateRange: (start, end) => get().appointments.filter((a) => a.date >= start && a.date <= end),
}));
