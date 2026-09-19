import { create } from 'zustand';
import type { Database, Json } from '../lib/database.types';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { playNotificationSound } from '../lib/sound';
import { useNotificationStore } from './notificationStore';
import { useServiceStore } from './serviceStore';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

/** Un servicio dentro de una cita. Cada uno con su especialista y su hora. */
export interface AppointmentLine {
  id?: string;
  serviceId: string | null;
  serviceName: string;
  employee: string;
  startTime: string;
  duration: number;
  price: number;
}

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
  startedAt: string | null;  // timestamp cuando la especialista inició el servicio
  /** Servicios de la cita. Las columnas service/employee/duration de arriba
   *  son el resumen que mantiene la base: primer servicio, primera
   *  especialista y duración total. */
  services: AppointmentLine[];
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
    startedAt: (r.started_at as string) ?? null,
    services: ((r.appointment_services as Record<string, unknown>[]) ?? [])
      .slice()
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .map((l) => ({
        id: l.id as string,
        serviceId: (l.service_id as string) ?? null,
        serviceName: l.service_name as string,
        employee: l.employee as string,
        startTime: String(l.start_time ?? '').slice(0, 5),
        duration: Number(l.duration ?? 45),
        price: Number(l.price ?? 0),
      })),
  };
}


/** Servicios en el formato que espera save_appointment. Si la pantalla aun no
 *  maneja lineas, se manda el servicio suelto de siempre como linea unica. */
function lineasParaRpc(appt: {
  services?: AppointmentLine[];
  service?: string;
  employee?: string;
  duration?: number;
}): Json {
  const lineas = appt.services && appt.services.length > 0
    ? appt.services
    : [{
        serviceId: null,
        serviceName: appt.service ?? '',
        employee: appt.employee ?? '',
        startTime: '',
        duration: appt.duration ?? 45,
        price: 0,
      } as AppointmentLine];

  return lineas.map((l) => ({
    service_id: l.serviceId,
    service_name: l.serviceName,
    employee: l.employee,
    duration: l.duration,
    price: l.price ?? 0,
  }));
}

interface AppointmentState {
  appointments: Appointment[];
  loading: boolean;
  /** 'conflict' cuando la base rechazo la cita por chocar con otra. */
  lastError: 'conflict' | 'unknown' | null;
  fetchAppointments: () => Promise<void>;
  addAppointment: (appt: Omit<Appointment, 'id' | 'createdAt' | 'client_id'>) => Promise<Appointment | null>;
  updateAppointment: (id: string, data: Partial<Appointment>) => Promise<boolean>;
  updateStatus: (id: string, status: AppointmentStatus) => Promise<boolean>;
  deleteAppointment: (id: string) => Promise<boolean>;
  autoMarkNoShow: () => Promise<number>;
  getByDate: (date: string) => Appointment[];
  getByDateRange: (start: string, end: string) => Appointment[];
  initRealtime: () => void;
  cleanupRealtime: () => void;
  _channel: any | null;

  completedApptForNextSession: Appointment | null;
  promptNextSession: (appt: Appointment) => void;
  clearNextSessionPrompt: () => void;
}

export const useAppointmentStore = create<AppointmentState>()((set, get) => ({
  appointments: [],
  loading: false,
  lastError: null,
  _channel: null,
  completedApptForNextSession: null,

  promptNextSession: (appt) => set({ completedApptForNextSession: appt }),
  clearNextSessionPrompt: () => set({ completedApptForNextSession: null }),

  fetchAppointments: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, appointment_services(*)')
        .order('date', { ascending: false })
        .order('time', { ascending: false });

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
      const { data: newId, error: rpcError } = await supabase.rpc('save_appointment', {
        p_id: null,
        p_client_id: null,
        p_client_name: appt.clientName,
        p_client_phone: appt.clientPhone,
        p_date: appt.date,
        p_time: appt.time,
        p_status: appt.status,
        p_notes: appt.notes ?? '',
        p_source: appt.source,
        p_services: lineasParaRpc(appt),
      });

      if (rpcError) {
        console.error('[appointments] insert error:', rpcError);
        set({ lastError: rpcError.code === '23P01' ? 'conflict' : 'unknown' });
        return null;
      }
      set({ lastError: null });

      const { data, error } = await supabase
        .from('appointments')
        .select('*, appointment_services(*)')
        .eq('id', newId as string)
        .single();

      if (error) {
        console.error('[appointments] insert error:', error);
        set({ lastError: error.code === '23P01' ? 'conflict' : 'unknown' });
        return null;
      }
      set({ lastError: null });

      const mapped = mapRow(data as Record<string, unknown>);
      set((s) => ({ appointments: [...s.appointments, mapped] }));
      useNotificationStore.getState().addNotification({
        type: 'new_appt',
        text: `Nueva cita: ${mapped.clientName}`,
        sub: `${mapped.service} · ${mapped.date} ${mapped.time}`,
        appointmentId: mapped.id
      });
      return mapped;
    } catch (err) {
      console.error('[appointments] insert network error:', err);
      return null;
    }
  },

  updateAppointment: async (id, updates) => {
    const oldAppt = get().appointments.find((a) => a.id === id);
    const db: Database['public']['Tables']['appointments']['Update'] = {};
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
      // Si la pantalla manda servicios, se regraba la cita entera en una sola
      // transaccion: cabecera + lineas. Asi un choque de horario no deja la
      // cita movida y los servicios en el sitio viejo.
      if (updates.services !== undefined) {
        const base = { ...(oldAppt as Appointment), ...updates } as Appointment;
        const { error: rpcError } = await supabase.rpc('save_appointment', {
          p_id: id,
          p_client_id: base.client_id,
          p_client_name: base.clientName,
          p_client_phone: base.clientPhone,
          p_date: base.date,
          p_time: base.time,
          p_status: base.status,
          p_notes: base.notes ?? '',
          p_source: base.source,
          p_services: lineasParaRpc(base),
        });
        if (rpcError) {
          console.error('[appointments] update error:', rpcError);
          set({ lastError: rpcError.code === '23P01' ? 'conflict' : 'unknown' });
          return false;
        }
      }

      const { data, error } = await supabase
        .from('appointments')
        .update(db)
        .eq('id', id)
        .select('*, appointment_services(*)')
        .single();

      if (error) {
        console.error('[appointments] update error:', error);
        set({ lastError: error.code === '23P01' ? 'conflict' : 'unknown' });
        return false;
      }
      set({ lastError: null });

      const mapped = mapRow(data as Record<string, unknown>);
      set((s) => ({
        appointments: s.appointments.map((a) =>
          a.id === id ? mapped : a
        ),
      }));

      if (oldAppt && (oldAppt.date !== mapped.date || oldAppt.time !== mapped.time)) {
        useNotificationStore.getState().addNotification({
          type: 'rescheduled',
          text: `Cita reprogramada: ${mapped.clientName}`,
          sub: `Se movió al ${mapped.date} a las ${mapped.time}`,
          appointmentId: mapped.id
        });
      }

      return true;
    } catch (err) {
      console.error('[appointments] update network error:', err);
      return false;
    }
  },

  updateStatus: async (id, status) => {
    const oldAppt = get().appointments.find((a) => a.id === id);
    const now = new Date().toISOString();
    const extra = status === 'in_progress' ? { started_at: now } : {};

    // Optimistic update
    set((s) => ({
      appointments: s.appointments.map((a) =>
        a.id === id
          ? { ...a, status, ...(status === 'in_progress' ? { startedAt: now } : {}) }
          : a
      ),
    }));

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status, ...extra })
        .eq('id', id);

      if (error) {
        // Rollback — re-fetch to restore correct state
        console.error('[appointments] status update error:', error);
        await get().fetchAppointments();
        toast.error('Error al actualizar el estado');
        return false;
      }

      if (oldAppt) {
        if (status === 'no_show') {
          useNotificationStore.getState().addNotification({
            type: 'no_show',
            text: `${oldAppt.clientName} no asistió`,
            sub: `${oldAppt.service} · ${oldAppt.time}`,
            appointmentId: oldAppt.id
          });
        } else if (status === 'completed') {
          useNotificationStore.getState().addNotification({
            type: 'completed',
            text: `Cita completada por ${oldAppt.employee}`,
            sub: `${oldAppt.clientName} — ${oldAppt.service}`,
            appointmentId: oldAppt.id
          });
        }
      }

      if (status === 'completed') {
        const appt = get().appointments.find(a => a.id === id);
        
        // Auto-discount package session if client has an active package matching this service name
        if (appt && appt.client_id) {
          try {
            const { data: pkgs } = await supabase
              .from('client_packages')
              .select(`
                id, 
                used_sessions, 
                total_sessions, 
                status,
                session_packages (
                  name,
                  services (
                    name
                  )
                )
              `)
              .eq('client_id', appt.client_id)
              .eq('status', 'active');

            if (pkgs && pkgs.length > 0) {
              const matchingPkg = pkgs.find(p => {
                const svcName = p.session_packages?.services?.name;
                return svcName && svcName.toLowerCase().trim() === appt.service.toLowerCase().trim() && p.used_sessions < p.total_sessions;
              });

              if (matchingPkg) {
                const nextUsed = matchingPkg.used_sessions + 1;
                const nextStatus = nextUsed >= matchingPkg.total_sessions ? 'completed' : 'active';
                
                const { error: updErr } = await supabase
                  .from('client_packages')
                  .update({ 
                    used_sessions: nextUsed,
                    status: nextStatus
                  })
                  .eq('id', matchingPkg.id);
                  
                if (!updErr) {
                  toast.success(`Sesión descontada del paquete: ${matchingPkg.session_packages.name} (${nextUsed}/${matchingPkg.total_sessions})`);
                  // Refresh the service store to sync active packages list
                  await useServiceStore.getState().fetchAll();
                }
              }
            }
          } catch (pkgErr) {
            console.error('Error auto-discounting package session:', pkgErr);
          }
        }

        // Prompt for next session if it's a package or if we just want to offer it
        if (appt && (appt.service.toLowerCase().includes('paquete') || appt.notes?.toLowerCase().includes('paquete'))) {
          get().promptNextSession(appt);
        }
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

  initRealtime: () => {
    if (get()._channel) return; // already initialized
    
    const channel = supabase.channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        (payload) => {
          const current = get().appointments;
          if (payload.eventType === 'INSERT') {
            const newAppt = mapRow(payload.new as Record<string, unknown>);
            if (!current.some(a => a.id === newAppt.id)) {
              set({ appointments: [...current, newAppt] });
              playNotificationSound(useNotificationStore.getState().soundProfile);
              toast.success(`Nueva cita online: ${newAppt.clientName} - ${newAppt.service}`, { duration: 5000 });
              
              useNotificationStore.getState().addNotification({
                type: 'new_appt',
                text: `Nueva cita online: ${newAppt.clientName}`,
                sub: `${newAppt.service} · ${newAppt.date} ${newAppt.time}`,
                appointmentId: newAppt.id,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapRow(payload.new as Record<string, unknown>);
            const oldAppt = current.find((a) => a.id === updated.id);
            set({ appointments: current.map((a) => (a.id === updated.id ? updated : a)) });

            if (oldAppt) {
              const statusChanged = oldAppt.status !== updated.status;
              const dateChanged = oldAppt.date !== updated.date || oldAppt.time !== updated.time;

              if (statusChanged && updated.status === 'no_show') {
                playNotificationSound(useNotificationStore.getState().soundProfile);
                toast.error(`Cita No Asistida: ${updated.clientName} - ${updated.service}`, { duration: 5000 });
                
                useNotificationStore.getState().addNotification({
                  type: 'no_show',
                  text: `${updated.clientName} no asistió`,
                  sub: `${updated.service} · ${updated.time}`,
                  appointmentId: updated.id,
                });
              } else if (statusChanged && updated.status === 'completed') {
                playNotificationSound(useNotificationStore.getState().soundProfile);
                toast.success(`Cita Completada por especialista: ${updated.clientName} - ${updated.service}`, { duration: 5000 });
                
                useNotificationStore.getState().addNotification({
                  type: 'completed',
                  text: `Cita completada por ${updated.employee}`,
                  sub: `${updated.clientName} — ${updated.service}`,
                  appointmentId: updated.id,
                });
              } else if (dateChanged) {
                playNotificationSound(useNotificationStore.getState().soundProfile);
                toast(`Cita Reprogramada: ${updated.clientName} se movió al ${updated.date} a las ${updated.time}`, { icon: '📅', duration: 5000 });
                
                useNotificationStore.getState().addNotification({
                  type: 'rescheduled',
                  text: `Cita reprogramada: ${updated.clientName}`,
                  sub: `Se movió al ${updated.date} a las ${updated.time}`,
                  appointmentId: updated.id,
                });
              }
            }
          } else if (payload.eventType === 'DELETE') {
            set({ appointments: current.filter(a => a.id !== payload.old.id) });
          }
        }
      )
      .subscribe();
      
    set({ _channel: channel });
  },

  cleanupRealtime: () => {
    const ch = get()._channel;
    if (ch) {
      supabase.removeChannel(ch);
      set({ _channel: null });
    }
  }
}));
