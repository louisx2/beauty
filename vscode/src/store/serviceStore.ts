import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { soloFecha } from '../lib/fechas';

export type ServiceCategory = 'laser' | 'facial' | 'corporal' | 'belleza' | 'medicina';

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
  totalPrice: number;
  amountPaid: number;
  status: 'active' | 'completed' | 'cancelled';
}

export interface PackagePayment {
  id: string;
  clientId: string;
  packageId: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  notes: string;
  createdAt: string;
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
    // en la base es fecha con hora: aquí solo el día (en la hora del salón)
    purchasedAt: soloFecha(r.purchased_at),
    notes: r.notes || '',
    totalPrice: Number(r.total_price || 0),
    amountPaid: Number(r.amount_paid || 0),
    status: r.status || 'active',
  };
}

function mapPayment(r: any): PackagePayment {
  return {
    id: r.id,
    clientId: r.client_id,
    packageId: r.package_id,
    amount: Number(r.amount),
    paymentMethod: r.payment_method,
    notes: r.notes || '',
    createdAt: r.created_at,
  };
}

interface ServiceState {
  services: Service[];
  packages: SessionPackage[];
  clientPackages: ClientPackage[];
  payments: PackagePayment[];
  loading: boolean;

  fetchAll: () => Promise<void>;
  // Los que guardan dicen si se guardó (el error ya se avisó): la pantalla no dice "listo" si no fue así.
  addService: (s: Omit<Service, 'id'>) => Promise<Service | null>;
  updateService: (id: string, data: Partial<Service>) => Promise<boolean>;
  deleteService: (id: string) => Promise<boolean>;

  addPackage: (p: Omit<SessionPackage, 'id'>) => Promise<boolean>;
  updatePackage: (id: string, data: Partial<SessionPackage>) => Promise<boolean>;
  deletePackage: (id: string) => Promise<boolean>;

  sellPackage: (cp: Omit<ClientPackage, 'id' | 'status'>) => Promise<ClientPackage | null>;
  useSession: (clientPackageId: string) => Promise<boolean>;
  updateClientPackage: (id: string, data: { usedSessions?: number; notes?: string; status?: string }) => Promise<boolean>;
  deleteClientPackage: (id: string) => Promise<boolean>;

  addPayment: (p: Omit<PackagePayment, 'id' | 'createdAt'>) => Promise<boolean>;
  fetchPayments: (packageId: string) => Promise<PackagePayment[]>;
}

export const useServiceStore = create<ServiceState>()((set, get) => ({
  services: [],
  packages: [],
  clientPackages: [],
  payments: [],
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
    if (error || !data) {
      console.error("Error al crear servicio:", error);
      toast.error('No se pudo crear el servicio');
      return null;
    }
    const nuevo = mapService(data);
    set((st) => ({ services: [...st.services, nuevo] }));
    return nuevo;
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
    if (error || !data) {
      toast.error('No se pudo guardar el servicio');
      console.error(error);
      return false;
    }
    set((st) => ({ services: st.services.map((s) => s.id === id ? mapService(data) : s) }));
    return true;
  },

  deleteService: async (id) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) {
      // 23503: lo usa un paquete (o algo más que lo nombra); se puede desactivar en su lugar
      toast.error(error.code === '23503' ? 'Este servicio está en un paquete: desactívalo en lugar de eliminarlo' : 'No se pudo eliminar el servicio');
      return false;
    }
    set((st) => ({ services: st.services.filter((s) => s.id !== id) }));
    return true;
  },

  addPackage: async (p) => {
    const { data, error } = await supabase.from('session_packages').insert({
      service_id: p.serviceId, name: p.name, sessions: p.sessions,
      price: p.price, active: p.active,
    }).select('*, services(name)').single();
    if (error || !data) {
      console.error("Error al crear paquete:", error);
      toast.error('No se pudo crear el paquete');
      return false;
    }
    set((st) => ({ packages: [...st.packages, mapPkg(data)] }));
    return true;
  },

  updatePackage: async (id, updates) => {
    const db: any = {};
    if (updates.name !== undefined) db.name = updates.name;
    if (updates.serviceId !== undefined) db.service_id = updates.serviceId;
    if (updates.sessions !== undefined) db.sessions = updates.sessions;
    if (updates.price !== undefined) db.price = updates.price;
    if (updates.active !== undefined) db.active = updates.active;

    const { data, error } = await supabase.from('session_packages').update(db).eq('id', id).select('*, services(name)').single();
    if (error || !data) {
      toast.error('No se pudo guardar el paquete');
      return false;
    }
    set((st) => ({ packages: st.packages.map((p) => p.id === id ? mapPkg(data) : p) }));
    return true;
  },

  deletePackage: async (id) => {
    const { error } = await supabase.from('session_packages').delete().eq('id', id);
    if (error) {
      // 23503: ya se vendió a alguna clienta; se puede dejar de vender (desactivarlo) en su lugar
      toast.error(error.code === '23503' ? 'Este paquete ya se vendió: desactívalo para no venderlo más' : 'No se pudo eliminar el paquete');
      return false;
    }
    set((st) => ({ packages: st.packages.filter((p) => p.id !== id) }));
    return true;
  },

  sellPackage: async (cp) => {
    const { data, error } = await supabase.from('client_packages').insert({
      client_id: cp.clientId, package_id: cp.packageId,
      total_sessions: cp.totalSessions, used_sessions: 0, notes: cp.notes,
      total_price: cp.totalPrice, amount_paid: cp.amountPaid, status: 'active',
    }).select('*, clients(name), session_packages(name, services(name))').single();
    if (!error && data) {
      const newCp = mapClientPkg(data);
      set((st) => ({ clientPackages: [newCp, ...st.clientPackages] }));
      return newCp;
    }
    return null;
  },

  useSession: async (id) => {
    const cp = get().clientPackages.find((c) => c.id === id);
    if (!cp || cp.usedSessions >= cp.totalSessions) return false;

    const { data, error } = await supabase.from('client_packages')
      .update({ used_sessions: cp.usedSessions + 1 })
      .eq('id', id).select('*, clients(name), session_packages(name, services(name))').single();
    if (error || !data) {
      toast.error('No se pudo descontar la sesión');
      return false;
    }
    set((st) => ({ clientPackages: st.clientPackages.map((c) => c.id === id ? mapClientPkg(data) : c) }));
    return true;
  },

  updateClientPackage: async (id, data) => {
    const db: any = {};
    if (data.usedSessions !== undefined) db.used_sessions = data.usedSessions;
    if (data.notes !== undefined) db.notes = data.notes;
    if (data.status !== undefined) db.status = data.status;
    const { data: row, error } = await supabase.from('client_packages')
      .update(db).eq('id', id)
      .select('*, clients(name), session_packages(name, services(name))').single();
    if (error || !row) {
      toast.error('No se pudo guardar el paquete');
      return false;
    }
    set((st) => ({ clientPackages: st.clientPackages.map((c) => c.id === id ? mapClientPkg(row) : c) }));
    return true;
  },

  deleteClientPackage: async (id) => {
    const { error } = await supabase.from('client_packages').delete().eq('id', id);
    if (error) {
      toast.error('No se pudo eliminar el paquete');
      return false;
    }
    set((st) => ({ clientPackages: st.clientPackages.filter((c) => c.id !== id) }));
    return true;
  },

  addPayment: async (p) => {
    const { data, error } = await supabase.from('payments').insert({
      client_id: p.clientId,
      package_id: p.packageId,
      amount: p.amount,
      payment_method: p.paymentMethod,
      notes: p.notes,
    }).select().single();

    if (error) {
      console.error(error);
      toast.error('Error al registrar abono');
      return false;
    }

    // Actualizar client_package amount_paid local y remoto
    const cp = get().clientPackages.find(c => c.id === p.packageId);
    if (cp) {
      const newAmountPaid = cp.amountPaid + p.amount;
      let newStatus = cp.status;
      // if (newAmountPaid >= cp.totalPrice && cp.usedSessions >= cp.totalSessions) {
      //   newStatus = 'completed';
      // }
      const { error: errSuma } = await supabase.from('client_packages').update({ amount_paid: newAmountPaid }).eq('id', p.packageId);
      if (errSuma) toast.error('El abono quedó anotado, pero no se pudo sumar a lo pagado. Recarga la página.');
      set(st => ({
        clientPackages: st.clientPackages.map(c => c.id === p.packageId ? { ...c, amountPaid: newAmountPaid, status: newStatus } : c),
        payments: [mapPayment(data), ...st.payments],
      }));
    }
    return true;
  },

  fetchPayments: async (packageId) => {
    const { data, error } = await supabase.from('payments').select('*').eq('package_id', packageId).order('created_at', { ascending: false });
    if (!error && data) {
      const mapped = data.map(mapPayment);
      set(st => {
        // merge sin duplicados
        const others = st.payments.filter(p => p.packageId !== packageId);
        return { payments: [...mapped, ...others] };
      });
      return mapped;
    }
    return [];
  },
}));
