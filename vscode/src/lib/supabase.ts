import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  throw new Error(
    '[Supabase] Faltan credenciales. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env'
  );
}

const customStorage = {
  getItem: (key: string) => {
    const local = localStorage.getItem(key);
    if (local) return local;
    return sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    const remember = localStorage.getItem('sb_remember_me') === 'true';
    if (remember) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    storage: customStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
