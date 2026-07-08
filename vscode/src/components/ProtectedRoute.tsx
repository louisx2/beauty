import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        height: '100vh',
        background: '#2A1F1A',
        fontFamily: "'Outfit', sans-serif"
      }}>
        <style>{`
          @keyframes spin-loader {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(197, 168, 128, 0.15)',
          borderTopColor: '#C5A880',
          borderRadius: '50%',
          animation: 'spin-loader 0.8s linear infinite'
        }} />
        <span style={{ color: '#C5A880', fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>Cargando panel...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
