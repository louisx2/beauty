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

async function resolveUser(sessionUser: { id: string; email?: string; user_metadata?: Record<string, string> }) {
  const email = sessionUser.email || '';
  const fallbackName = sessionUser.user_metadata?.name || email.split('@')[0] || 'Admin';

  const basicUser: User = {
    id: sessionUser.id,
    email,
    name: fallbackName,
    role: 'admin',
  };
  useAuthStore.setState({ user: basicUser, isAuthenticated: true, loading: false });

  try {
    const { data: staffData } = await supabase
      .from('staff')
      .select('name, role')
      .ilike('email', email)
      .maybeSingle();

    if (staffData) {
      const current = useAuthStore.getState().user;
      if (current) {
        useAuthStore.setState({
          user: {
            ...current,
            name: staffData.name || current.name,
            role: (staffData.role as User['role']) || 'admin',
          },
        });
      }
    }
  } catch {
    // Keep basic user if staff lookup fails
  }
}

// Handle ALL auth events: INITIAL_SESSION (page load/reload), SIGNED_IN,
// SIGNED_OUT, TOKEN_REFRESHED, etc.
// Supabase fires INITIAL_SESSION on startup with the stored session (or null),
// and TOKEN_REFRESHED whenever it auto-renews the access token.
// Handling all events here means the session is always restored on reload
// and the store stays in sync with Supabase's internal state.
supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    await resolveUser(session.user);
  } else {
    useAuthStore.setState({ user: null, isAuthenticated: false, loading: false });
  }
});
