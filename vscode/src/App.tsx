import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import LandingPage from './pages/LandingPage';
import BookingPage from './pages/BookingPage';
import ClientPortal from './pages/ClientPortal';
import Login from './pages/Login';
import AdminLayout from './pages/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load admin pages to prevent import-time errors from blocking the landing page
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Appointments = lazy(() => import('./pages/admin/Appointments'));
const Clients = lazy(() => import('./pages/admin/Clients'));
const Services = lazy(() => import('./pages/admin/Services'));
const SessionPackages = lazy(() => import('./pages/admin/SessionPackages'));
const Staff = lazy(() => import('./pages/admin/Staff'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const Reports = lazy(() => import('./pages/admin/Reports'));

function AdminFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="login__spinner" style={{ width: 32, height: 32 }} />
    </div>
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
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Suspense fallback={<AdminFallback />}><Dashboard /></Suspense>} />
          <Route path="citas" element={<Suspense fallback={<AdminFallback />}><Appointments /></Suspense>} />
          <Route path="clientes" element={<Suspense fallback={<AdminFallback />}><Clients /></Suspense>} />
          <Route path="servicios" element={<Suspense fallback={<AdminFallback />}><Services /></Suspense>} />
          <Route path="paquetes" element={<Suspense fallback={<AdminFallback />}><SessionPackages /></Suspense>} />
          <Route path="empleadas" element={<Suspense fallback={<AdminFallback />}><Staff /></Suspense>} />
          <Route path="ajustes" element={<Suspense fallback={<AdminFallback />}><Settings /></Suspense>} />
          <Route path="reportes" element={<Suspense fallback={<AdminFallback />}><Reports /></Suspense>} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
