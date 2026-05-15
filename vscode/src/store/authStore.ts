import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type UserRole = 'admin' | 'receptionist' | 'specialist';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

async function buildUser(sessionUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): Promise<User> {
  const email = sessionUser.email ?? '';
  const fallbackName =
    (sessionUser.user_metadata?.name as string) ||
    email.split('@')[0] ||
    'Admin';

  const base: User = { id: sessionUser.id, email, name: fallbackName, role: 'admin' };

  try {
    const { data } = await supabase
      .from('staff')
      .select('name, role')
      .ilike('email', email)
      .maybeSingle();

    if (data) {
      return {
        ...base,
        name: data.name || base.name,
        role: (data.role as UserRole) || 'admin',
      };
    }
  } catch {
    // Staff lookup failed — keep base user with admin role
  }

  return base;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const msg =
          error.message === 'Invalid login credentials'
            ? 'Credenciales incorrectas. Verifica tu email y contraseña.'
            : error.message;
        set({ error: msg });
        return false;
      }

      if (!data.session?.user) {
        set({ error: 'No se recibió sesión del servidor.' });
        return false;
      }

      const user = await buildUser(data.session.user);
      set({ user, isAuthenticated: true });
      return true;
    } catch {
      set({ error: 'Error de conexión. Verifica tu internet e intenta de nuevo.' });
      return false;
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore signOut errors — always clear local state
    } finally {
      set({ user: null, isAuthenticated: false, loading: false, error: null });
    }
  },
}));

// Restore session on page load and keep in sync with Supabase's internal state.
// INITIAL_SESSION fires on mount with the stored token (or null).
// TOKEN_REFRESHED fires when Supabase auto-renews the access token.
supabase.auth.onAuthStateChange(async (_event, session) => {
  if (session?.user) {
    const user = await buildUser(session.user);
    useAuthStore.setState({ user, isAuthenticated: true, loading: false });
  } else {
    useAuthStore.setState({ user: null, isAuthenticated: false, loading: false });
  }
});
