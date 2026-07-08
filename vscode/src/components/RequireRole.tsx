import { Navigate } from 'react-router-dom';
import { useAuthStore, type UserRole } from '../store/authStore';

export function roleHome(role: UserRole | undefined): string {
  if (role === 'specialist') return '/admin/mi-turno';
  if (role === 'receptionist') return '/admin/recepcion';
  return '/admin/dashboard';
}

/** Redirige al home según el rol del usuario (para la ruta índice de /admin). */
export function RoleHome() {
  const user = useAuthStore((s) => s.user);
  return <Navigate to={roleHome(user?.role)} replace />;
}

/**
 * Restringe una ruta a los roles indicados. Si el rol del usuario no está
 * permitido, lo redirige a su página principal.
 */
export default function RequireRole({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);

  if (!user) return null; // ProtectedRoute ya garantiza que haya sesión

  if (!roles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return <>{children}</>;
}
