import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'receptionist' | 'specialist';
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  loading: true, // Start loading as true while we check session
  error: null,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        set({ loading: false, error: error.message });
        return false;
      }
      // onAuthStateChange will handle setting user/isAuthenticated
      // Wait for it to fire (max 5s)
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (get().isAuthenticated || !get().loading) {
            clearInterval(check);
            resolve();
          }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(); }, 5000);
      });
      return get().isAuthenticated;
    } catch (err) {
      set({ loading: false, error: 'Error de conexión' });
      return false;
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      // Clear state regardless of whether signOut succeeded (to avoid being stuck)
      set({ user: null, isAuthenticated: false, loading: false });
    }
  },
}));

// onAuthStateChange holds the Supabase storage lock while it fires.
// Any Supabase data query inside the callback (even async) calls getSession()
// internally, which tries to re-acquire the same lock → deadlock for 5s.
// Fix: set auth state SYNCHRONOUSLY inside the callback (no await, no data queries),
// then do the staff lookup OUTSIDE the lock via setTimeout(..., 0).
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    const u = session.user;
    const email = u.email || '';
    const fallbackName = u.user_metadata?.['name'] || email.split('@')[0] || 'Admin';
    // Set authenticated state immediately — releases lock right away
    useAuthStore.setState({
      user: { id: u.id, email, name: fallbackName, role: 'admin' },
      isAuthenticated: true,
      loading: false,
    });
    // Enrich with real name/role from staff table AFTER lock is released
    setTimeout(() => enrichUserFromStaff(u.id, email), 0);
  } else {
    useAuthStore.setState({ user: null, isAuthenticated: false, loading: false });
  }
});

// Look up real name and role from the staff table (runs outside the auth lock)
async function enrichUserFromStaff(userId: string, email: string) {
  try {
    const { data } = await supabase
      .from('staff')
      .select('name, role')
      .ilike('email', email)
      .maybeSingle();

    if (data) {
      const current = useAuthStore.getState().user;
      if (current && current.id === userId) {
        useAuthStore.setState({
          user: {
            ...current,
            name: data.name || current.name,
            role: (data.role as User['role']) || 'admin',
          },
        });
      }
    }
  } catch {
    // Keep fallback name/role if staff lookup fails
  }
}
