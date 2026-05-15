import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Product {
  id: string;
  name: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  unit: string;
  active: boolean;
}

function mapProduct(r: any): Product {
  return {
    id: r.id, name: r.name, category: r.category,
    purchasePrice: Number(r.purchase_price), salePrice: Number(r.sale_price),
    stock: r.stock, minStock: r.min_stock, unit: r.unit, active: r.active,
  };
}

interface InventoryState {
  products: Product[];
  loading: boolean;
  fetchProducts: () => Promise<void>;
  addProduct: (p: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (id: string, delta: number) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>()((set, get) => ({
  products: [],
  loading: false,

  fetchProducts: async () => {
    set({ loading: true });
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (!error && data) set({ products: data.map(mapProduct), loading: false });
    else set({ loading: false });
  },

  addProduct: async (p) => {
    const { data, error } = await supabase.from('products').insert({
      name: p.name, category: p.category, purchase_price: p.purchasePrice,
      sale_price: p.salePrice, stock: p.stock, min_stock: p.minStock,
      unit: p.unit, active: p.active,
    }).select().single();
    if (!error && data) set((s) => ({ products: [...s.products, mapProduct(data)] }));
  },

  updateProduct: async (id, updates) => {
    const db: any = {};
    if (updates.name !== undefined) db.name = updates.name;
    if (updates.category !== undefined) db.category = updates.category;
    if (updates.purchasePrice !== undefined) db.purchase_price = updates.purchasePrice;
    if (updates.salePrice !== undefined) db.sale_price = updates.salePrice;
    if (updates.stock !== undefined) db.stock = updates.stock;
    if (updates.minStock !== undefined) db.min_stock = updates.minStock;
    if (updates.unit !== undefined) db.unit = updates.unit;
    if (updates.active !== undefined) db.active = updates.active;

    const { data, error } = await supabase.from('products').update(db).eq('id', id).select().single();
    if (!error && data) set((s) => ({ products: s.products.map((p) => p.id === id ? mapProduct(data) : p) }));
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
  },

  adjustStock: async (id, delta) => {
    const product = get().products.find((p) => p.id === id);
    if (!product) return;
    const newStock = Math.max(0, product.stock + delta);
    const { data, error } = await supabase.from('products').update({ stock: newStock }).eq('id', id).select().single();
    if (!error && data) set((s) => ({ products: s.products.map((p) => p.id === id ? mapProduct(data) : p) }));
  },
}));
