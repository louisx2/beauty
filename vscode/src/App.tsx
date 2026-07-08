import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import LandingPage from './pages/LandingPage';
import BookingPage from './pages/BookingPage';
import ClientPortal from './pages/ClientPortal';
import Login from './pages/Login';
import AdminLayout from './pages/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import RequireRole, { RoleHome } from './components/RequireRole';
import type { UserRole } from './store/authStore';

// Lazy load admin pages to prevent import-time errors from blocking the landing page
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Appointments = lazy(() => import('./pages/admin/Appointments'));
const Clients = lazy(() => import('./pages/admin/Clients'));
const Services = lazy(() => import('./pages/admin/Services'));
const SessionPackages = lazy(() => import('./pages/admin/SessionPackages'));
const Staff = lazy(() => import('./pages/admin/Staff'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const SpecialistView        = lazy(() => import('./pages/specialist/SpecialistView'));
const MyReports             = lazy(() => import('./pages/specialist/MyReports'));
const ReceptionistDashboard = lazy(() => import('./pages/receptionist/ReceptionistDashboard'));

function AdminFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="login__spinner" style={{ width: 32, height: 32 }} />
    </div>
  );
}

function Guard({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  return (
    <RequireRole roles={roles}>
      <Suspense fallback={<AdminFallback />}>{children}</Suspense>
    </RequireRole>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public: Landing Page */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/reservar" element={<BookingPage />} />
        <Route path="/mis-citas" element={<ClientPortal />} />

        {/* Admin: Login */}
        <Route path="/admin/login" element={<Login />} />

        {/* Admin: Protected Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RoleHome />} />
          <Route path="dashboard" element={<Guard roles={['admin']}><Dashboard /></Guard>} />
          <Route path="citas" element={<Guard roles={['admin', 'receptionist', 'specialist']}><Appointments /></Guard>} />
          <Route path="clientes" element={<Guard roles={['admin', 'receptionist']}><Clients /></Guard>} />
          <Route path="servicios" element={<Guard roles={['admin']}><Services /></Guard>} />
          <Route path="paquetes" element={<Guard roles={['admin', 'receptionist']}><SessionPackages /></Guard>} />
          <Route path="equipo" element={<Guard roles={['admin']}><Staff /></Guard>} />
          <Route path="ajustes" element={<Guard roles={['admin']}><Settings /></Guard>} />
          <Route path="reportes" element={<Guard roles={['admin']}><Reports /></Guard>} />
          <Route path="mi-turno"  element={<Guard roles={['admin', 'specialist']}><SpecialistView /></Guard>} />
          <Route path="mis-reportes" element={<Guard roles={['admin', 'specialist']}><MyReports /></Guard>} />
          <Route path="recepcion" element={<Guard roles={['admin', 'receptionist']}><ReceptionistDashboard /></Guard>} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
