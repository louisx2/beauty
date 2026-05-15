import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useAppointmentStore } from '../store/appointmentStore';
import {
  CalendarDays,
  Users,
  Sparkles,
  Package,
  UserCog,
  LogOut,
  Menu,
  X,
  Bell,
  Sun,
  Moon,
  Settings as SettingsIcon,
  LayoutDashboard,
  BarChart3,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import './AdminLayout.css';

const navSections = [
  {
    label: 'Principal',
    items: [
      { to: '/admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
      { to: '/admin/citas',     icon: <CalendarDays size={20} />, label: 'Citas' },
      { to: '/admin/clientes',  icon: <Users size={20} />,       label: 'Clientas' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { to: '/admin/servicios', icon: <Sparkles size={20} />,    label: 'Servicios' },
      { to: '/admin/paquetes',  icon: <Package size={20} />,     label: 'Paquetes' },
    ],
  },
  {
    label: 'Equipo',
    items: [
      { to: '/admin/empleadas', icon: <UserCog size={20} />,     label: 'Empleadas' },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { to: '/admin/reportes', icon: <BarChart3 size={20} />, label: 'Reportes' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { to: '/admin/ajustes', icon: <SettingsIcon size={20} />,  label: 'Ajustes' },
    ],
  },
];

import { Toaster } from 'react-hot-toast';

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { appointments, fetchAppointments } = useAppointmentStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Close notification panel when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const notifications = useMemo(() => {
    const todayAppts = appointments.filter((a) => a.date === today);
    const items: { id: string; type: string; text: string; sub: string }[] = [];
    // Pending appointments today
    todayAppts.filter((a) => a.status === 'pending').forEach((a) => {
      items.push({ id: a.id, type: 'pending', text: `${a.clientName} — ${a.service}`, sub: `Pendiente · ${a.time}` });
    });
    // No-show appointments today
    todayAppts.filter((a) => a.status === 'no_show').forEach((a) => {
      items.push({ id: a.id, type: 'no_show', text: `${a.clientName} no asistió`, sub: `${a.service} · ${a.time}` });
    });
    return items.slice(0, 8);
  }, [appointments, today]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/admin/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="admin">
      <Toaster position="top-right" />
      {/* Sidebar */}
      <aside className={`admin__sidebar ${sidebarOpen ? 'admin__sidebar--open' : ''}`}>
        <div className="admin__sidebar-header">
          <div className="admin__brand">
            <span className="admin__brand-icon">N</span>
            <div>
              <span className="admin__brand-name">Anadsll</span>
              <span className="admin__brand-sub">Sistema Admin</span>
            </div>
          </div>
          <button
            className="admin__sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="admin__nav">
          {navSections.map((section) => {
            if (user?.role === 'specialist' && section.label !== 'Principal') {
              return null;
            }
            // Only admin can see settings
            if (section.label === 'Configuración' && user?.role !== 'admin') {
              return null;
            }

            // Only admin can see Análisis section
            if (section.label === 'Análisis' && user?.role !== 'admin') {
              return null;
            }

            return (
              <div className="admin__nav-section" key={section.label}>
                <span className="admin__nav-label">{section.label}</span>
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `admin__nav-link ${isActive ? 'admin__nav-link--active' : ''}`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="admin__sidebar-footer">
          <button className="admin__logout" onClick={handleLogout} id="admin-logout">
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="admin__overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="admin__main">
        {/* Header */}
        <header className="admin__header">
          <div className="admin__header-left">
            <button
              className="admin__menu-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
          </div>

          <div className="admin__header-right">
            <button
              className="admin__notification admin__theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              id="admin-theme-toggle"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                className="admin__notification"
                aria-label="Notifications"
                id="admin-notifications"
                onClick={() => setNotifOpen((v) => !v)}
              >
                <Bell size={20} />
                {notifications.length > 0 && <span className="admin__notification-dot" />}
              </button>

              {notifOpen && (
                <div className="admin__notif-panel">
                  <div className="admin__notif-header">
                    <span>Notificaciones de hoy</span>
                    {notifications.length > 0 && (
                      <span className="admin__notif-count">{notifications.length}</span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="admin__notif-empty">
                      <CheckCircle2 size={24} />
                      <span>Sin alertas pendientes</span>
                    </div>
                  ) : (
                    <div className="admin__notif-list">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`admin__notif-item admin__notif-item--${n.type}`}
                          onClick={() => { setNotifOpen(false); navigate('/admin/citas'); }}
                        >
                          <div className="admin__notif-icon">
                            {n.type === 'pending' ? <Clock size={14} /> : <AlertCircle size={14} />}
                          </div>
                          <div className="admin__notif-text">
                            <strong>{n.text}</strong>
                            <span>{n.sub}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="admin__user">
              <div className="admin__user-avatar">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="admin__user-info">
                <span className="admin__user-name">{user?.name}</span>
                <span className="admin__user-role">
                  {user?.role === 'admin' ? 'Administradora' : 
                   user?.role === 'receptionist' ? 'Recepcionista' : 'Empleada'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="admin__content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
