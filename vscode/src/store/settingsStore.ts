import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export interface Settings {
  deposit_amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  whatsapp_number: string;
}

const DEFAULTS: Settings = {
  deposit_amount: 500,
  bank_name: 'Banco Popular',
  account_number: '123456789',
  account_name: 'Anadsll Beauty Esthetic',
  whatsapp_number: '18293224014',
};

interface SettingsState {
  settings: Settings;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: DEFAULTS,
  loading: false,

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('deposit_amount, bank_name, account_number, account_name, whatsapp_number')
        .eq('id', 1)
        .maybeSingle();

      if (!error && data) {
        set({ settings: { ...DEFAULTS, ...data } });
      }
      // If table doesn't exist yet, silently keep defaults
    } catch {
      // Keep defaults
    } finally {
      set({ loading: false });
    }
  },

  updateSettings: async (patch) => {
    const previous = get().settings;
    const next = { ...previous, ...patch };

    // Optimistic update — apply immediately, rollback on error
    set({ settings: next });

    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ id: 1, ...next }, { onConflict: 'id' });

      if (error) {
        set({ settings: previous });
        toast.error('Error al guardar configuración');
        console.error('[settings] upsert error:', error);
        return false;
      }

      toast.success('Configuración guardada');
      return true;
    } catch (err) {
      set({ settings: previous });
      toast.error('Error de conexión al guardar');
      console.error('[settings] network error:', err);
      return false;
    }
  },
}));
