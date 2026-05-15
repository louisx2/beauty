import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type StaffRole = 'admin' | 'specialist' | 'receptionist';

export const WEEKDAYS = [
  { key: 'lunes',     label: 'Lun' },
  { key: 'martes',    label: 'Mar' },
  { key: 'miercoles', label: 'Mié' },
  { key: 'jueves',    label: 'Jue' },
  { key: 'viernes',   label: 'Vie' },
  { key: 'sabado',    label: 'Sáb' },
  { key: 'domingo',   label: 'Dom' },
];

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  phone: string;
  email: string | null;
  commissionPct: number;
  workingDays: string[];
  workingStart: string;
  workingEnd: string;
  serviceIds: string[];
  active: boolean;
  createdAt: string;
}

export interface StaffStats {
  totalAppointments: number;
  completedAppointments: number;
  upcomingAppointments: number;
  cancelledAppointments: number;
}

function mapRow(r: any): StaffMember {
  return {
    id: r.id,
    name: r.name,
    role: (r.role || 'specialist') as StaffRole,
    phone: r.phone || '',
    email: r.email || null,
    commissionPct: Number(r.commission_pct) || 0,
    workingDays: r.working_days || [],
    workingStart: (r.working_start || '09:00:00').slice(0, 5),
    workingEnd: (r.working_end || '18:00:00').slice(0, 5),
    serviceIds: r.service_ids || [],
    active: r.active ?? true,
    createdAt: r.created_at,
  };
}

interface StaffState {
  staff: StaffMember[];
  loading: boolean;
  fetchStaff: () => Promise<void>;
  addStaff: (s: Omit<StaffMember, 'id' | 'createdAt'>) => Promise<void>;
  updateStaff: (id: string, data: Partial<StaffMember>) => Promise<StaffMember>;
  deleteStaff: (id: string) => Promise<void>;
  fetchStaffStats: (staffName: string) => Promise<StaffStats>;
  getAvailableForService: (serviceId: string, weekday?: string) => StaffMember[];
}

export const useStaffStore = create<StaffState>()((set, get) => ({
  staff: [],
  loading: false,

  fetchStaff: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('name');
    if (error) {
      set({ loading: false });
      throw new Error(error.message);
    }
    set({ staff: (data || []).map(mapRow), loading: false });
  },

  addStaff: async (s) => {
    const { data, error } = await supabase
      .from('staff')
      .insert({
        name: s.name,
        role: s.role,
        phone: s.phone,
        email: s.email,
        commission_pct: s.commissionPct,
        working_days: s.workingDays,
        working_start: s.workingStart,
        working_end: s.workingEnd,
        service_ids: s.serviceIds,
        active: s.active,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (data) {
      set((st) => ({ staff: [...st.staff, mapRow(data)] }));
    }
  },

  updateStaff: async (id, updates) => {
    const db: any = {};
    if (updates.name !== undefined) db.name = updates.name;
    if (updates.role !== undefined) db.role = updates.role;
    if (updates.phone !== undefined) db.phone = updates.phone;
    if (updates.email !== undefined) db.email = updates.email;
    if (updates.commissionPct !== undefined) db.commission_pct = updates.commissionPct;
    if (updates.workingDays !== undefined) db.working_days = updates.workingDays;
    if (updates.workingStart !== undefined) db.working_start = updates.workingStart;
    if (updates.workingEnd !== undefined) db.working_end = updates.workingEnd;
    if (updates.serviceIds !== undefined) db.service_ids = updates.serviceIds;
    if (updates.active !== undefined) db.active = updates.active;

    const { data, error } = await supabase
      .from('staff')
      .update(db)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const mapped = mapRow(data);
    set((st) => ({
      staff: st.staff.map((m) => (m.id === id ? mapped : m)),
    }));
    return mapped;
  },

  deleteStaff: async (id) => {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) throw new Error(error.message);
    set((st) => ({ staff: st.staff.filter((m) => m.id !== id) }));
  },

  fetchStaffStats: async (staffName: string): Promise<StaffStats> => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('appointments')
      .select('status, date')
      .eq('employee', staffName);

    if (error || !data) return { totalAppointments: 0, completedAppointments: 0, upcomingAppointments: 0, cancelledAppointments: 0 };

    return {
      totalAppointments: data.length,
      completedAppointments: data.filter((a) => a.status === 'completed').length,
      upcomingAppointments: data.filter((a) => a.date >= today && a.status !== 'cancelled' && a.status !== 'completed').length,
      cancelledAppointments: data.filter((a) => a.status === 'cancelled' || a.status === 'no_show').length,
    };
  },

  getAvailableForService: (serviceId, weekday) => {
    return get().staff.filter(
      (m) =>
        m.active &&
        (m.serviceIds.length === 0 || m.serviceIds.includes(serviceId)) &&
        (weekday === undefined || m.workingDays.includes(weekday))
    );
  },
}));
