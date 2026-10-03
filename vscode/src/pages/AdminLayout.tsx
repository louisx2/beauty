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
  Zap,
  Volume2,
  Check,
  Trash2,
  CreditCard
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import NextSessionModal from '../components/NextSessionModal';
import ClientAutocomplete from '../components/ClientAutocomplete';
import AvisoSuscripcion from '../components/AvisoSuscripcion';
import { useServiceStore } from '../store/serviceStore';
import { useStaffStore } from '../store/staffStore';
import { useClientStore } from '../store/clientStore';
import toast, { Toaster, resolveValue } from 'react-hot-toast';
import { useNotificationStore } from '../store/notificationStore';
import { playNotificationSound } from '../lib/sound';
import './AdminLayout.css';
import { fechaLocal } from '../lib/fechas';
import { atiendeClientas } from '../lib/quienAtiende';

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

interface ItemNav {
  /** ruta, o 'ahora' para el botón de Atender ahora (abre el formulario de clienta sin cita) */
  to: string;
  icono: ReactNode;
  etiqueta: string;
  /** nombre corto para la barra inferior del teléfono */
  corto?: string;
}
interface SeccionNav { titulo: string; items: ItemNav[] }

const AHORA = 'ahora';
const inicio: ItemNav = { to: '/admin/dashboard', icono: <LayoutDashboard size={20} />, etiqueta: 'Inicio' };
const ahora: ItemNav = { to: AHORA, icono: <Zap size={20} />, etiqueta: 'Atender ahora', corto: 'Atender' };
const citas: ItemNav = { to: '/admin/citas', icono: <CalendarDays size={20} />, etiqueta: 'Citas' };
const clientas: ItemNav = { to: '/admin/clientes', icono: <Users size={20} />, etiqueta: 'Clientas' };
const paquetes: ItemNav = { to: '/admin/paquetes', icono: <Package size={20} />, etiqueta: 'Paquetes' };
const recepcion: ItemNav = { to: '/admin/recepcion', icono: <LayoutDashboard size={20} />, etiqueta: 'Recepción' };
const miTurno: ItemNav = { to: '/admin/mi-turno', icono: <Scissors size={20} />, etiqueta: 'Mi turno' };
const misCitas: ItemNav = { to: '/admin/citas', icono: <CalendarDays size={20} />, etiqueta: 'Mis citas' };
const misReportes: ItemNav = { to: '/admin/reportes', icono: <BarChart3 size={20} />, etiqueta: 'Mis reportes', corto: 'Reportes' };

// Cada rol ve solo lo suyo. Los nombres del menú son los mismos títulos de cada pantalla.
const MENU: Record<'admin' | 'receptionist' | 'specialist', SeccionNav[]> = {
  admin: [
    { titulo: 'Día a día', items: [inicio, ahora, citas, clientas] },
    { titulo: 'Negocio', items: [
      { to: '/admin/servicios', icono: <Sparkles size={20} />, etiqueta: 'Servicios' },
      paquetes,
      { to: '/admin/equipo', icono: <UserCog size={20} />, etiqueta: 'Equipo' },
      { to: '/admin/reportes', icono: <BarChart3 size={20} />, etiqueta: 'Reportes' },
    ] },
    { titulo: 'Cuenta', items: [
      { to: '/admin/ajustes', icono: <SettingsIcon size={20} />, etiqueta: 'Ajustes' },
      { to: '/admin/suscripcion', icono: <CreditCard size={20} />, etiqueta: 'Mi suscripción' },
    ] },
  ],
  receptionist: [{ titulo: 'Día a día', items: [recepcion, ahora, citas, clientas, paquetes] }],
  specialist: [{ titulo: 'Mi trabajo', items: [miTurno, misCitas, misReportes] }],
};

// Barra inferior del teléfono: lo de todos los días a un toque; "Más" abre el menú completo.
const BARRA: Record<'admin' | 'receptionist' | 'specialist', ItemNav[]> = {
  admin: [inicio, citas, ahora, clientas],
  receptionist: [recepcion, citas, ahora, clientas],
  specialist: [miTurno, misCitas, misReportes],
};

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days} d`;
}

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { fetchAppointments, initRealtime, cleanupRealtime } = useAppointmentStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const rol = user?.role === 'specialist' || user?.role === 'receptionist' ? user.role : 'admin';
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
      const adminOnly = ['/admin', '/admin/dashboard', '/admin/clientes', '/admin/servicios', '/admin/paquetes', '/admin/equipo', '/admin/ajustes', '/admin/suscripcion'];
      if (adminOnly.includes(location.pathname)) navigate('/admin/mi-turno', { replace: true });
    }
    if (user?.role === 'receptionist') {
      const receptionistForbidden = ['/admin', '/admin/dashboard', '/admin/reportes', '/admin/ajustes', '/admin/equipo', '/admin/suscripcion'];
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

  // Inactivity timeout to expire session
  useEffect(() => {
    const rememberMe = localStorage.getItem('sb_remember_me') === 'true';
    const timeoutDuration = rememberMe ? 4 * 60 * 60 * 1000 : 15 * 60 * 1000;

    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(handleAutoLogout, timeoutDuration);
    };

    const handleAutoLogout = async () => {
      try {
        toast.error('Sesión expirada por inactividad.');
        await logout();
        navigate('/admin/login', { replace: true });
      } catch (error) {
        console.error('Auto logout error:', error);
      }
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [logout, navigate]);

  const { notifications, markAsRead, markAllAsRead, clearAll, soundProfile, setSoundProfile } = useNotificationStore();
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const today = fechaLocal();

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
      <aside id="admin-menu" className={`admin__sidebar ${sidebarOpen ? 'admin__sidebar--open' : ''}`}>
        <div className="admin__sidebar-header">
          <div className="admin__brand">
            <img
              src="/brand/icono-blanco.png"
              alt=""
              aria-hidden="true"
              className="admin__brand-icon"
              width={38}
              height={38}
            />
            <div>
              <span className="admin__brand-name">Anadsll</span>
              <span className="admin__brand-sub">
              {rol === 'specialist' ? 'Especialista' : rol === 'receptionist' ? 'Recepción' : 'Administración'}
            </span>
            </div>
          </div>
          <button
            className="admin__sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="admin__nav" aria-label="Menú principal">
          {MENU[rol].map((seccion) => (
            <div className="admin__nav-section" key={seccion.titulo}>
              <span className="admin__nav-label">{seccion.titulo}</span>
              {seccion.items.map((item) => item.to === AHORA ? (
                <button
                  key={AHORA}
                  type="button"
                  className="admin__nav-link admin__nav-link--ahora"
                  onClick={() => { setSidebarOpen(false); setShowWalkin(true); }}
                >
                  {item.icono}
                  <span>{item.etiqueta}</span>
                </button>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `admin__nav-link ${isActive ? 'admin__nav-link--active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icono}
                  <span>{item.etiqueta}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin__sidebar-footer">
          <button className="admin__logout" onClick={handleLogout} id="admin-logout">
            <LogOut size={18} />
            <span>Cerrar sesión</span>
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
              aria-label="Abrir menú"
              aria-controls="admin-menu"
              aria-expanded={sidebarOpen}
            >
              <Menu size={22} />
            </button>
          </div>

          <div className="admin__header-right">
            <button
              className="admin__notification admin__theme-toggle"
              onClick={toggleTheme}
              aria-label="Cambiar tema"
              id="admin-theme-toggle"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                className="admin__notification"
                aria-label="Notificaciones"
                id="admin-notifications"
                onClick={() => setNotifOpen((v) => !v)}
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="admin__notification-dot" />}
              </button>

              {notifOpen && (
                <div className="admin__notif-panel">
                  <div className="admin__notif-header">
                    <span>Notificaciones</span>
                    <div className="admin__notif-actions">
                      <button
                        onClick={(e) => { e.stopPropagation(); playNotificationSound(soundProfile); }}
                        className="admin__notif-btn"
                        title="Probar sonido"
                      >
                        <Volume2 size={13} />
                      </button>
                      {unreadCount > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                          className="admin__notif-btn"
                          title="Marcar todo como leído"
                        >
                          <Check size={13} />
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); clearAll(); }}
                          className="admin__notif-btn admin__notif-btn--danger"
                          title="Limpiar todo"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="admin__notif-sound-selector">
                    <span>Sonido de alerta:</span>
                    <select
                      value={soundProfile}
                      onChange={(e) => {
                        const newProfile = e.target.value as any;
                        setSoundProfile(newProfile);
                        playNotificationSound(newProfile);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="chime">Clásico 🔔</option>
                      <option value="glass">Cristalino 💎</option>
                      <option value="bell">Campana 🛎️</option>
                      <option value="pop">Burbuja Pop 🫧</option>
                      <option value="cosmic">Cósmico 🚀</option>
                    </select>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="admin__notif-empty">
                      <CheckCircle2 size={24} />
                      <span>Sin alertas recientes</span>
                    </div>
                  ) : (
                    <div className="admin__notif-list">
                      {notifications.map((n) => {
                        let iconEl = <AlertCircle size={14} />;
                        if (n.type === 'new_appt') iconEl = <CalendarDays size={14} />;
                        else if (n.type === 'no_show') iconEl = <AlertCircle size={14} />;
                        else if (n.type === 'completed') iconEl = <CheckCircle2 size={14} />;
                        else if (n.type === 'rescheduled') iconEl = <Clock size={14} />;

                        return (
                          <div
                            key={n.id}
                            className={`admin__notif-item admin__notif-item--${n.type} ${!n.read ? 'admin__notif-item--unread' : ''}`}
                            onClick={() => {
                              markAsRead(n.id);
                              setNotifOpen(false);
                              navigate(`/admin/citas?highlight=${n.appointmentId}`);
                            }}
                          >
                            <div className="admin__notif-icon">
                              {iconEl}
                            </div>
                            <div className="admin__notif-text">
                              <strong>{n.text}</strong>
                              <span>{n.sub}</span>
                              <span className="admin__notif-time">{formatTimeAgo(n.timestamp)}</span>
                            </div>
                            {!n.read && <span className="admin__notif-unread-dot" />}
                          </div>
                        );
                      })}
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
          {user?.role === 'admin' && <AvisoSuscripcion />}
          <Outlet />
        </div>
      </div>
      {/* Barra inferior (solo en el teléfono): lo diario a un toque y "Más" para el menú completo */}
      <nav className="admin__barra" aria-label="Accesos rápidos">
        {BARRA[rol].map((item) => item.to === AHORA ? (
          <button key={AHORA} type="button" className="admin__barra-item admin__barra-item--ahora" onClick={() => setShowWalkin(true)}>
            <span className="admin__barra-ahora">{item.icono}</span>
            <span>{item.corto ?? item.etiqueta}</span>
          </button>
        ) : (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `admin__barra-item${isActive ? ' admin__barra-item--activo' : ''}`}>
            {item.icono}
            <span>{item.corto ?? item.etiqueta}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className="admin__barra-item"
          onClick={() => setSidebarOpen(true)}
          aria-controls="admin-menu"
          aria-expanded={sidebarOpen}
        >
          <Menu size={20} />
          <span>Más</span>
        </button>
      </nav>

      <NextSessionModal />

      {/* Walk-in Modal */}
      {showWalkin && (
        <div className="modal-overlay" onClick={() => setShowWalkin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Atender ahora</h2>
              <button className="modal__close" onClick={() => setShowWalkin(false)}>✕</button>
            </div>
            <form onSubmit={handleWalkinSubmit} className="modal__form" style={{ padding: 24 }}>
              <p className="walkin__nota">
                Para una clienta que llegó sin cita: queda registrada y su servicio empieza de una vez.
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
                  <label>Teléfono (clienta nueva)</label>
                  <input
                    placeholder="Teléfono de la clienta nueva"
                    value={walkinForm.clientPhone}
                    onChange={e => setWalkinForm({...walkinForm, clientPhone: formatPhone(e.target.value)})}
                    maxLength={12}
                  />
                </div>
              )}

              <div className="modal__field">
                <label>Servicio o paquete</label>
                <select value={walkinForm.service} onChange={e => setWalkinForm({...walkinForm, service: e.target.value})}>
                  <option value="">Selecciona qué le harás...</option>
                  <optgroup label="Servicios">
                    {services.filter(s => s.active).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </optgroup>
                  {activePackages.length > 0 && (
                    <optgroup label="Paquetes de la clienta">
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
                  <option value="">Selecciona la especialista...</option>
                  {staff.filter(s => s.active && atiendeClientas(s)).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              {walkinError && <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{walkinError}</p>}

              <div className="modal__actions" style={{ marginTop: 24 }}>
                <div style={{ flex: 1 }} />
                <button type="button" className="modal__cancel-btn" onClick={() => setShowWalkin(false)}>Cancelar</button>
                <button type="submit" className="modal__submit-btn">Empezar servicio</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
