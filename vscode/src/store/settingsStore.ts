import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Settings {
  id: number;
  deposit_amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  whatsapp_number: string;
}

interface SettingsState {
  settings: Settings | null;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<Settings>) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: null,
  loading: false,

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (!error && data) {
        set({ settings: data });
      } else {
        // Fallback default settings if table is empty or doesn't exist yet
        set({ 
          settings: {
            id: 1,
            deposit_amount: 500,
            bank_name: 'Banco Popular',
            account_number: '123456789',
            account_name: 'Anadsll Beauty Esthetic',
            whatsapp_number: '18293224014'
          } 
        });
      }
    } catch {
      console.error('Error fetching settings');
    } finally {
      set({ loading: false });
    }
  },

  updateSettings: async (newSettings) => {
    set({ loading: true });
    try {
      const { error } = await supabase
        .from('settings')
        .update(newSettings)
        .eq('id', 1);
        
      if (!error) {
        set((state) => ({
          settings: state.settings ? { ...state.settings, ...newSettings } : null
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      set({ loading: false });
    }
  }
}));
