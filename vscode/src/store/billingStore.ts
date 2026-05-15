import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type NcfType = 'B01' | 'B02' | 'B04' | 'B14' | 'B15';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mixed';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';

export const NCF_LABELS: Record<NcfType, string> = {
  B01: 'Crédito Fiscal',
  B02: 'Consumidor Final',
  B04: 'Notas de Crédito',
  B14: 'Régimen Especial',
  B15: 'Gubernamental',
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mixed: 'Mixto',
};

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  itbis: number;
  total: number;
}

export interface Invoice {
  id: string;
  clientId: string | null;
  clientName: string;
  clientCedula: string | null;
  ncf: string;
  ncfType: NcfType;
  subtotal: number;
  totalItbis: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: InvoiceStatus;
  createdAt: string;
  items: InvoiceItem[];
}

export interface NcfSequence {
  id: string;
  type: NcfType;
  prefix: string;
  currentNumber: number;
  rangeStart: number;
  rangeEnd: number;
}

function mapInvoice(r: any, items: any[] = []): Invoice {
  return {
    id: r.id, clientId: r.client_id, clientName: r.client_name,
    clientCedula: r.client_cedula, ncf: r.ncf, ncfType: r.ncf_type,
    subtotal: Number(r.subtotal), totalItbis: Number(r.total_itbis),
    total: Number(r.total), paymentMethod: r.payment_method,
    status: r.status, createdAt: r.created_at,
    items: items.map(mapItem),
  };
}

function mapItem(r: any): InvoiceItem {
  return {
    id: r.id, invoiceId: r.invoice_id, description: r.description,
    quantity: r.quantity, unitPrice: Number(r.unit_price),
    taxable: r.taxable, itbis: Number(r.itbis), total: Number(r.total),
  };
}

function mapNcf(r: any): NcfSequence {
  return {
    id: r.id, type: r.type, prefix: r.prefix,
    currentNumber: r.current_number, rangeStart: r.range_start,
    rangeEnd: r.range_end,
  };
}

export function calcItemTotals(unitPrice: number, qty: number, taxable: boolean) {
  const sub = unitPrice * qty;
  const itbis = taxable ? Math.round(sub * 0.18) : 0;
  return { subtotal: sub, itbis, total: sub + itbis };
}

interface BillingState {
  invoices: Invoice[];
  ncfSequences: NcfSequence[];
  loading: boolean;

  fetchAll: () => Promise<void>;
  getNextNcf: (type: NcfType) => Promise<string>;
  createInvoice: (inv: Omit<Invoice, 'id' | 'createdAt'>) => Promise<void>;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
}

export const useBillingStore = create<BillingState>()((set, get) => ({
  invoices: [],
  ncfSequences: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true });
    const [invRes, ncfRes] = await Promise.all([
      supabase.from('invoices').select('*, invoice_items(*)').order('created_at', { ascending: false }),
      supabase.from('ncf_sequences').select('*').order('type'),
    ]);
    const invoices = (invRes.data || []).map((r: any) => mapInvoice(r, r.invoice_items || []));
    set({
      invoices,
      ncfSequences: (ncfRes.data || []).map(mapNcf),
      loading: false,
    });
  },

  getNextNcf: async (type) => {
    // Atomic increment
    const { data, error } = await supabase.rpc('get_next_ncf', { ncf_type: type });
    if (error || !data) {
      // Fallback: manual
      const seq = get().ncfSequences.find((s) => s.type === type);
      if (!seq) return `${type}00000001`;
      const num = seq.currentNumber;
      await supabase.from('ncf_sequences').update({ current_number: num + 1 }).eq('type', type);
      set((s) => ({
        ncfSequences: s.ncfSequences.map((sq) =>
          sq.type === type ? { ...sq, currentNumber: num + 1 } : sq
        ),
      }));
      return `${seq.prefix.slice(0, 3)}${String(num).padStart(8, '0')}`;
    }
    // Refresh sequences
    const { data: seqData } = await supabase.from('ncf_sequences').select('*').order('type');
    if (seqData) set({ ncfSequences: seqData.map(mapNcf) });
    return data as string;
  },

  createInvoice: async (inv) => {
    // Insert invoice
    const { data: invData, error: invErr } = await supabase.from('invoices').insert({
      client_id: inv.clientId, client_name: inv.clientName,
      client_cedula: inv.clientCedula, ncf: inv.ncf,
      ncf_type: inv.ncfType, subtotal: inv.subtotal,
      total_itbis: inv.totalItbis, total: inv.total,
      payment_method: inv.paymentMethod, status: inv.status,
    }).select().single();

    if (invErr || !invData) return;

    // Insert items
    if (inv.items.length > 0) {
      const items = inv.items.map((it) => ({
        invoice_id: invData.id, description: it.description,
        quantity: it.quantity, unit_price: it.unitPrice,
        taxable: it.taxable, itbis: it.itbis, total: it.total,
      }));
      await supabase.from('invoice_items').insert(items);
    }

    // Refetch to get items
    const { data: full } = await supabase.from('invoices')
      .select('*, invoice_items(*)').eq('id', invData.id).single();
    if (full) {
      set((s) => ({ invoices: [mapInvoice(full, full.invoice_items || []), ...s.invoices] }));
    }
  },

  updateInvoiceStatus: async (id, status) => {
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
    if (!error) {
      set((s) => ({
        invoices: s.invoices.map((i) => i.id === id ? { ...i, status } : i),
      }));
    }
  },

  deleteInvoice: async (id) => {
    await supabase.from('invoice_items').delete().eq('invoice_id', id);
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (!error) set((s) => ({ invoices: s.invoices.filter((i) => i.id !== id) }));
  },
}));
