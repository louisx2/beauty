import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
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
} from 'lucide-react';
import { useState } from 'react';
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
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

            <button className="admin__notification" aria-label="Notifications" id="admin-notifications">
              <Bell size={20} />
              <span className="admin__notification-dot" />
            </button>

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
