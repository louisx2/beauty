import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
  Scissors,
  Zap
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import NextSessionModal from '../components/NextSessionModal';
import ClientAutocomplete from '../components/ClientAutocomplete';
import { useServiceStore } from '../store/serviceStore';
import { useStaffStore } from '../store/staffStore';
import { useClientStore } from '../store/clientStore';
import toast, { Toaster, resolveValue } from 'react-hot-toast';
import './AdminLayout.css';

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const navSections = [
  {
    label: 'Principal',
    items: [
      { to: '/admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
      { action: 'walkin',       icon: <Zap size={20} style={{ color: '#fbbf24' }} />, label: 'Atender Ahora' },
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
      { to: '/admin/equipo', icon: <UserCog size={20} />,     label: 'Personal' },
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

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { appointments, fetchAppointments, initRealtime, cleanupRealtime } = useAppointmentStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Walk-in modal state
  const [showWalkin, setShowWalkin] = useState(false);
  const { staff, fetchStaff } = useStaffStore();
  const { services, clientPackages, fetchAll: fetchServices } = useServiceStore();
  const { clients, addClient } = useClientStore();
  const [walkinForm, setWalkinForm] = useState({ 
    clientId: null as string | null,
    clientName: '', 
    clientPhone: '',
    service: '', 
    employee: '' 
  });
  const [walkinError, setWalkinError] = useState('');

  // Packages of selected client
  const activePackages = useMemo(() => {
    if (!walkinForm.clientId) return [];
    return clientPackages.filter(p => p.clientId === walkinForm.clientId && p.status === 'active' && p.totalSessions > p.usedSessions);
  }, [walkinForm.clientId, clientPackages]);

  useEffect(() => { 
    fetchAppointments(); 
    fetchStaff();
    fetchServices();
    initRealtime();
    return () => cleanupRealtime();
  }, [fetchAppointments, fetchStaff, fetchServices, initRealtime, cleanupRealtime]);

  // Redirect non-admin roles to their home pages
  useEffect(() => {
    if (user?.role === 'specialist') {
      const adminOnly = ['/admin', '/admin/dashboard', '/admin/clientes', '/admin/servicios', '/admin/paquetes', '/admin/equipo', '/admin/ajustes', '/admin/reportes'];
      if (adminOnly.includes(location.pathname)) navigate('/admin/mi-turno', { replace: true });
    }
    if (user?.role === 'receptionist') {
      const receptionistForbidden = ['/admin', '/admin/dashboard', '/admin/reportes', '/admin/ajustes', '/admin/equipo'];
      if (receptionistForbidden.includes(location.pathname)) navigate('/admin/recepcion', { replace: true });
    }
  }, [user?.role, location.pathname, navigate]);

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

  const handleWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinForm.clientName.trim() || !walkinForm.service || !walkinForm.employee) {
      setWalkinError('Todos los campos son obligatorios');
      return;
    }
    try {
      let finalClientId = walkinForm.clientId;
      let finalPhone = walkinForm.clientPhone || '0000000000';

      // If it's a new client, create them automatically
      if (!finalClientId) {
        const newClient = await addClient({
          name: walkinForm.clientName.trim(),
          phone: walkinForm.clientPhone.trim() || '0000000000',
          email: null,
          cedula: null,
          skin_type: null,
          allergies: null,
          notes: 'Registrada por Walk-in',
          source: 'manual'
        });
        if (newClient) {
          finalClientId = newClient.id;
        }
      }

      const now = new Date();
      await useAppointmentStore.getState().addAppointment({
        client_id: finalClientId,
        clientName: walkinForm.clientName.trim(),
        clientPhone: finalPhone,
        service: walkinForm.service,
        employee: walkinForm.employee,
        date: today,
        time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
        duration: 45,
        status: 'in_progress',
        notes: walkinForm.service.startsWith('Paquete:') ? 'Consumo de sesión por Walk-in' : 'Walk-in (Sin cita)',
        source: 'manual'
      });
      toast.success('Cliente atendido inmediatamente');
      setShowWalkin(false);
      setWalkinForm({ clientId: null, clientName: '', clientPhone: '', service: '', employee: '' });
    } catch (error) {
      toast.error('Error al registrar');
    }
  };

  return (
    <div className="admin">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
        }}
      >
        {(t) => (
          <div style={{
            opacity: t.visible ? 1 : 0,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            background: t.type === 'error' ? '#fee2e2' : 'white',
            color: t.type === 'error' ? '#ef4444' : '#1f2937',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: `1px solid ${t.type === 'error' ? '#fca5a5' : '#e5e7eb'}`
          }}>
            {t.type === 'success' && <CheckCircle2 size={20} color="#10b981" />}
            {t.type === 'error' && <AlertCircle size={20} color="#ef4444" />}
            <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>
              {resolveValue(t.message, t)}
            </div>
            <button 
              onClick={() => toast.dismiss(t.id)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'inherit', opacity: 0.5 }}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </Toaster>
      {/* Sidebar */}
      <aside className={`admin__sidebar ${sidebarOpen ? 'admin__sidebar--open' : ''}`}>
        <div className="admin__sidebar-header">
          <div className="admin__brand">
            <span className="admin__brand-icon">N</span>
            <div>
              <span className="admin__brand-name">Anadsll</span>
              <span className="admin__brand-sub">
              {user?.role === 'specialist'   ? 'Panel Especialista' :
               user?.role === 'receptionist' ? 'Recepción' :
               'Sistema Admin'}
            </span>
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
          {user?.role === 'specialist' ? (
            /* ── Specialist nav ── */
            <div className="admin__nav-section">
              <span className="admin__nav-label">Mi trabajo</span>
              <NavLink to="/admin/mi-turno" className={({ isActive }) => `admin__nav-link ${isActive ? 'admin__nav-link--active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <Scissors size={20} /><span>Mi Turno</span>
              </NavLink>
              <NavLink to="/admin/citas" className={({ isActive }) => `admin__nav-link ${isActive ? 'admin__nav-link--active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <CalendarDays size={20} /><span>Mis Citas</span>
              </NavLink>
            </div>
          ) : user?.role === 'receptionist' ? (
            /* ── Receptionist nav ── */
            <>
              <div className="admin__nav-section">
                <span className="admin__nav-label">Recepción</span>
                <NavLink to="/admin/recepcion" className={({ isActive }) => `admin__nav-link ${isActive ? 'admin__nav-link--active' : ''}`} onClick={() => setSidebarOpen(false)}>
                  <LayoutDashboard size={20} /><span>Panel</span>
                </NavLink>
                <button
                  className="admin__nav-link"
                  style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)', cursor: 'pointer', textAlign: 'left', border: 'none', width: '100%', fontFamily: 'Outfit' }}
                  onClick={() => { setSidebarOpen(false); setShowWalkin(true); }}
                >
                  <Zap size={20} />
                  <span>Atender Ahora</span>
                </button>
                <NavLink to="/admin/citas" className={({ isActive }) => `admin__nav-link ${isActive ? 'admin__nav-link--active' : ''}`} onClick={() => setSidebarOpen(false)}>
                  <CalendarDays size={20} /><span>Citas</span>
                </NavLink>
                <NavLink to="/admin/clientes" className={({ isActive }) => `admin__nav-link ${isActive ? 'admin__nav-link--active' : ''}`} onClick={() => setSidebarOpen(false)}>
                  <Users size={20} /><span>Clientas</span>
                </NavLink>
              </div>
              <div className="admin__nav-section">
                <span className="admin__nav-label">Catálogo</span>
                <NavLink to="/admin/paquetes" className={({ isActive }) => `admin__nav-link ${isActive ? 'admin__nav-link--active' : ''}`} onClick={() => setSidebarOpen(false)}>
                  <Package size={20} /><span>Paquetes</span>
                </NavLink>
              </div>
            </>
          ) : (
            /* ── Admin / Receptionist nav ── */
            navSections.map((section) => {
              if (section.label === 'Configuración' && user?.role !== 'admin') return null;
              if (section.label === 'Análisis' && user?.role !== 'admin') return null;
              return (
                <div className="admin__nav-section" key={section.label}>
                  <span className="admin__nav-label">{section.label}</span>
                  {section.items.map((item) => {
                    if ((item as any).action === 'walkin') {
                      return (
                        <button
                          key="walkin"
                          className="admin__nav-link"
                          style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)', cursor: 'pointer', textAlign: 'left', border: 'none', width: '100%', fontFamily: 'Outfit' }}
                          onClick={() => { setSidebarOpen(false); setShowWalkin(true); }}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </button>
                      );
                    }
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to as string}
                        className={({ isActive }) =>
                          `admin__nav-link ${isActive ? 'admin__nav-link--active' : ''}`
                        }
                        onClick={() => setSidebarOpen(false)}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              );
            })
          )}
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
                  {user?.role === 'admin'        ? 'Administradora' :
                   user?.role === 'receptionist' ? 'Recepcionista'  : 'Especialista'}
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
      <NextSessionModal />

      {/* Walk-in Modal */}
      {showWalkin && (
        <div className="modal-overlay" onClick={() => setShowWalkin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>⚡ Atender Ahora (Walk-in)</h2>
              <button className="modal__close" onClick={() => setShowWalkin(false)}>✕</button>
            </div>
            <form onSubmit={handleWalkinSubmit} className="modal__form" style={{ padding: 24 }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 20, fontSize: '0.9rem' }}>
                Registra a un cliente que llegó sin cita y pásalo a "En Curso" inmediatamente.
              </p>
              
              <div className="modal__field">
                <label>Clienta</label>
                <ClientAutocomplete
                  clients={clients}
                  value={walkinForm.clientName}
                  onChange={(text) => setWalkinForm({...walkinForm, clientName: text, clientId: null})}
                  onSelect={(c) => setWalkinForm({...walkinForm, clientName: c.name, clientId: c.id, clientPhone: c.phone})}
                  placeholder="Buscar o escribir nueva clienta..."
                />
              </div>

              {!walkinForm.clientId && walkinForm.clientName && (
                <div className="modal__field">
                  <label>Teléfono (Nueva Clienta)</label>
                  <input 
                    placeholder="Teléfono de la clienta nueva"
                    value={walkinForm.clientPhone}
                    onChange={e => setWalkinForm({...walkinForm, clientPhone: formatPhone(e.target.value)})}
                    maxLength={12}
                  />
                </div>
              )}

              <div className="modal__field">
                <label>Servicio o Paquete</label>
                <select value={walkinForm.service} onChange={e => setWalkinForm({...walkinForm, service: e.target.value})}>
                  <option value="">Selecciona qué le harás...</option>
                  <optgroup label="Servicios">
                    {services.filter(s => s.active).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </optgroup>
                  {activePackages.length > 0 && (
                    <optgroup label="Paquetes de la Clienta">
                      {activePackages.map(p => (
                        <option key={p.id} value={`Paquete: ${p.packageName}`}>
                          Consumir {p.packageName} ({p.totalSessions - p.usedSessions} disp.)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="modal__field">
                <label>Especialista</label>
                <select value={walkinForm.employee} onChange={e => setWalkinForm({...walkinForm, employee: e.target.value})}>
                  <option value="">Selecciona empleada...</option>
                  {staff.filter(s => s.active && s.role === 'specialist').map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              {walkinError && <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{walkinError}</p>}

              <div className="modal__actions" style={{ marginTop: 24 }}>
                <div style={{ flex: 1 }} />
                <button type="button" className="modal__cancel-btn" onClick={() => setShowWalkin(false)}>Cancelar</button>
                <button type="submit" className="modal__submit-btn" style={{ background: '#3b82f6', color: 'white' }}>Empezar Servicio</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
