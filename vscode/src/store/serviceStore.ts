import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export type ServiceCategory = 'laser' | 'facial' | 'corporal' | 'belleza';

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  duration: number;
  price: number;
  taxable: boolean;
  hasSession: boolean;
  active: boolean;
}

export interface SessionPackage {
  id: string;
  name: string;
  serviceId: string;
  serviceName: string;
  sessions: number;
  price: number;
  active: boolean;
}

export interface ClientPackage {
  id: string;
  clientId: string;
  clientName: string;
  packageId: string;
  packageName: string;
  serviceName: string;
  totalSessions: number;
  usedSessions: number;
  purchasedAt: string;
  notes: string;
}

function mapService(r: any): Service {
  return {
    id: r.id, name: r.name, category: r.category,
    description: r.description, duration: r.duration,
    price: Number(r.price), taxable: r.taxable,
    hasSession: r.has_session, active: r.active,
  };
}

function mapPkg(r: any): SessionPackage {
  return {
    id: r.id, name: r.name, serviceId: r.service_id,
    serviceName: r.services?.name || '', sessions: r.sessions,
    price: Number(r.price), active: r.active,
  };
}

function mapClientPkg(r: any): ClientPackage {
  return {
    id: r.id, clientId: r.client_id,
    clientName: r.clients?.name || '',
    packageId: r.package_id,
    packageName: r.session_packages?.name || '',
    serviceName: r.session_packages?.services?.name || '',
    totalSessions: r.total_sessions,
    usedSessions: r.used_sessions,
    purchasedAt: r.purchased_at,
    notes: r.notes || '',
  };
}

interface ServiceState {
  services: Service[];
  packages: SessionPackage[];
  clientPackages: ClientPackage[];
  loading: boolean;

  fetchAll: () => Promise<void>;
  addService: (s: Omit<Service, 'id'>) => Promise<void>;
  updateService: (id: string, data: Partial<Service>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;

  addPackage: (p: Omit<SessionPackage, 'id'>) => Promise<void>;
  updatePackage: (id: string, data: Partial<SessionPackage>) => Promise<void>;
  deletePackage: (id: string) => Promise<void>;

  sellPackage: (cp: Omit<ClientPackage, 'id'>) => Promise<void>;
  useSession: (clientPackageId: string) => Promise<void>;
  deleteClientPackage: (id: string) => Promise<void>;
}

export const useServiceStore = create<ServiceState>()((set, get) => ({
  services: [],
  packages: [],
  clientPackages: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true });
    const [sRes, pRes, cpRes] = await Promise.all([
      supabase.from('services').select('*').order('category'),
      supabase.from('session_packages').select('*, services(name)').order('name'),
      supabase.from('client_packages').select('*, clients(name), session_packages(name, services(name))').order('purchased_at', { ascending: false }),
    ]);
    set({
      services: (sRes.data || []).map(mapService),
      packages: (pRes.data || []).map(mapPkg),
      clientPackages: (cpRes.data || []).map(mapClientPkg),
      loading: false,
    });
  },

  addService: async (s) => {
    const { data, error } = await supabase.from('services').insert({
      name: s.name, category: s.category, description: s.description,
      duration: s.duration, price: s.price, taxable: s.taxable,
      has_session: s.hasSession, active: s.active,
    }).select().single();
    if (error) {
      console.error("Error al crear servicio:", error);
      toast.error('Error al crear servicio');
    } else if (data) {
      set((st) => ({ services: [...st.services, mapService(data)] }));
      toast.success('Servicio creado');
    }
  },

  updateService: async (id, updates) => {
    const db: any = {};
    if (updates.name !== undefined) db.name = updates.name;
    if (updates.category !== undefined) db.category = updates.category;
    if (updates.description !== undefined) db.description = updates.description;
    if (updates.duration !== undefined) db.duration = updates.duration;
    if (updates.price !== undefined) db.price = updates.price;
    if (updates.taxable !== undefined) db.taxable = updates.taxable;
    if (updates.hasSession !== undefined) db.has_session = updates.hasSession;
    if (updates.active !== undefined) db.active = updates.active;

    const { data, error } = await supabase.from('services').update(db).eq('id', id).select().single();
    if (error) {
      toast.error('Error al actualizar servicio');
      console.error(error);
    } else if (data) {
      set((st) => ({ services: st.services.map((s) => s.id === id ? mapService(data) : s) }));
      toast.success('Servicio actualizado');
    }
  },

  deleteService: async (id) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar servicio');
    } else {
      set((st) => ({ services: st.services.filter((s) => s.id !== id) }));
      toast.success('Servicio eliminado');
    }
  },

  addPackage: async (p) => {
    const { data, error } = await supabase.from('session_packages').insert({
      service_id: p.serviceId, name: p.name, sessions: p.sessions,
      price: p.price, active: p.active,
    }).select('*, services(name)').single();
    if (error) {
      console.error("Error al crear paquete:", error);
      toast.error('Error al crear paquete');
    } else if (data) {
      set((st) => ({ packages: [...st.packages, mapPkg(data)] }));
      toast.success('Paquete creado');
    }
  },

  updatePackage: async (id, updates) => {
    const db: any = {};
    if (updates.name !== undefined) db.name = updates.name;
    if (updates.serviceId !== undefined) db.service_id = updates.serviceId;
    if (updates.sessions !== undefined) db.sessions = updates.sessions;
    if (updates.price !== undefined) db.price = updates.price;
    if (updates.active !== undefined) db.active = updates.active;

    const { data, error } = await supabase.from('session_packages').update(db).eq('id', id).select('*, services(name)').single();
    if (error) {
      toast.error('Error al actualizar paquete');
    } else if (data) {
      set((st) => ({ packages: st.packages.map((p) => p.id === id ? mapPkg(data) : p) }));
      toast.success('Paquete actualizado');
    }
  },

  deletePackage: async (id) => {
    const { error } = await supabase.from('session_packages').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar paquete');
    } else {
      set((st) => ({ packages: st.packages.filter((p) => p.id !== id) }));
      toast.success('Paquete eliminado');
    }
  },

  sellPackage: async (cp) => {
    const { data, error } = await supabase.from('client_packages').insert({
      client_id: cp.clientId, package_id: cp.packageId,
      total_sessions: cp.totalSessions, used_sessions: 0, notes: cp.notes,
    }).select('*, clients(name), session_packages(name, services(name))').single();
    if (!error && data) set((st) => ({ clientPackages: [mapClientPkg(data), ...st.clientPackages] }));
  },

  useSession: async (id) => {
    const cp = get().clientPackages.find((c) => c.id === id);
    if (!cp || cp.usedSessions >= cp.totalSessions) return;

    const { data, error } = await supabase.from('client_packages')
      .update({ used_sessions: cp.usedSessions + 1 })
      .eq('id', id).select('*, clients(name), session_packages(name, services(name))').single();
    if (!error && data) {
      set((st) => ({ clientPackages: st.clientPackages.map((c) => c.id === id ? mapClientPkg(data) : c) }));
    }
  },

  deleteClientPackage: async (id) => {
    const { error } = await supabase.from('client_packages').delete().eq('id', id);
    if (!error) set((st) => ({ clientPackages: st.clientPackages.filter((c) => c.id !== id) }));
  },
}));
