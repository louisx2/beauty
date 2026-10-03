import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppointmentStore, type Appointment } from '../../store/appointmentStore';
import { useClientStore } from '../../store/clientStore';
import { useServiceStore } from '../../store/serviceStore';
import { useSettingsStore } from '../../store/settingsStore';
import SaveClientModal from '../../components/SaveClientModal';
import MenuAcciones from '../../components/MenuAcciones';
import {
  Calendar, DollarSign, Users, Package, Clock, AlertCircle,
  CheckCircle2, Bell, MessageCircle, Star, XCircle
} from 'lucide-react';
import { format12h } from '../../lib/timeFormat';
import { ingresosDelMes } from '../../lib/ingresos';
import { accionPrincipal } from './citas/acciones';
import { useAccionesCita } from './citas/useAccionesCita';
import './Dashboard.css';
import { fechaLocal } from '../../lib/fechas';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { appointments, fetchAppointments } = useAppointmentStore();
  const { clients, fetchClients } = useClientStore();
  const { services, clientPackages, fetchAll: fetchServicesAndPackages } = useServiceStore();
  const { settings, fetchSettings } = useSettingsStore();

  const [savingClientFor, setSavingClientFor] = useState<Appointment | null>(null);

  // las mismas acciones que en Citas (cancelar pide confirmación y ofrece avisarle a la clienta)
  const acciones = useAccionesCita({
    editar: (a) => navigate(`/admin/citas?highlight=${a.id}`),
    guardarClienta: setSavingClientFor,
  });

  useEffect(() => {
    fetchAppointments();
    fetchClients();
    fetchServicesAndPackages();
    fetchSettings();
  }, [fetchAppointments, fetchClients, fetchServicesAndPackages, fetchSettings]);

  const todayStr = fechaLocal();
  const thisMonth = todayStr.substring(0, 7);

  // Helper greeting based on time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  // Stats Data
  const stats = useMemo(() => {
    const todays = appointments.filter(a => a.date === todayStr);
    return {
      citasHoy: todays.filter(a => a.status !== 'cancelled').length,
      // lo cobrado en citas completadas del mes (la facturación está apagada: antes esto salía siempre en 0)
      ingresosMes: ingresosDelMes(appointments, services, thisMonth),
      clientasActivas: clients.length,
      paquetesActivos: clientPackages.filter(p => p.status === 'active').length,
      serviciosMes: appointments.filter(a => a.date.startsWith(thisMonth)).length,
      todaysAppts: todays.sort((a, b) => a.time.localeCompare(b.time)),
      pendingAppts: appointments.filter(a => a.date >= todayStr && a.status === 'pending').sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).slice(0, 5)
    };
  }, [appointments, services, clients, clientPackages, todayStr, thisMonth]);

  // Alerts
  const expiringPackages = useMemo(() => {
    return clientPackages
      .filter(p => p.status === 'active' && p.totalSessions - p.usedSessions <= 2)
      .slice(0, 3);
  }, [clientPackages]);

  // Actions formatting
  const handleWhatsApp = (phoneRaw: string, message: string) => {
    const phone = phoneRaw.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/1${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="dashboard">

      {/* ── Hero Banner ── */}
      {settings.show_welcome_card && (
        <div className="dash-hero">
          <h1 className="dash-hero__title">{greeting}, {user?.name.split(' ')[0]} 👋</h1>
          <p className="dash-hero__subtitle">
            {stats.citasHoy > 0
              ? `Tienes ${stats.citasHoy} citas programadas para hoy.`
              : 'No hay citas programadas para hoy.'}
          </p>
        </div>
      )}

      {/* ── Bento Stats ── */}
      {settings.show_stats_cards && (
        <div className="dash-bento">
          {/* Card 1 */}
          <div className="bento-card bento-card--rose">
            <div className="bento-card__sparkline" />
            <div className="bento-card__header">
              <div className="bento-card__icon"><Calendar /></div>
              <div className="bento-card__badge bento-card__badge--neutral">Hoy</div>
            </div>
            <div className="bento-card__value">{stats.citasHoy}</div>
            <div className="bento-card__label">Citas programadas</div>
          </div>

          {/* Card 2 */}
          <div className="bento-card bento-card--green">
            <div className="bento-card__sparkline" />
            <div className="bento-card__header">
              <div className="bento-card__icon"><DollarSign /></div>
              <div className="bento-card__badge bento-card__badge--neutral">Mes</div>
            </div>
            <div className="bento-card__value">RD$ {stats.ingresosMes.toLocaleString('es-DO')}</div>
            <div className="bento-card__label">Ingresos de citas completadas</div>
          </div>

          {/* Card 3 */}
          <div className="bento-card bento-card--lavender">
            <div className="bento-card__sparkline" />
            <div className="bento-card__header">
              <div className="bento-card__icon"><Users /></div>
              <div className="bento-card__badge bento-card__badge--neutral">Total</div>
            </div>
            <div className="bento-card__value">{stats.clientasActivas}</div>
            <div className="bento-card__label">Clientas registradas</div>
          </div>

          {/* Card 4 */}
          <div className="bento-card bento-card--amber">
            <div className="bento-card__sparkline" />
            <div className="bento-card__header">
              <div className="bento-card__icon"><Package /></div>
              <div className="bento-card__badge bento-card__badge--neutral">Vigentes</div>
            </div>
            <div className="bento-card__value">{stats.paquetesActivos}</div>
            <div className="bento-card__label">Paquetes activos</div>
          </div>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="dash-main-grid">

        {/* Left Column (Action Center + Top Services) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Action Center */}
          <div className="dash-panel">
            <div className="dash-panel__header">
              <h2 className="dash-panel__title"><Bell size={20} style={{ color: '#fbbf24' }} /> Centro de acción</h2>
            </div>
            <div className="dash-panel__body" style={{ padding: '20px' }}>
              <div className="action-list">
                {stats.pendingAppts.length === 0 && expiringPackages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                    <CheckCircle2 size={30} style={{ margin: '0 auto 8px', color: '#4ade80', opacity: 0.5 }} />
                    <p>Todo al día. Excelente trabajo.</p>
                  </div>
                )}

                {/* Pending Appointments Alerts */}
                {stats.pendingAppts.map(a => (
                  <div key={a.id} className="action-card action-card--urgent">
                    <div className="action-card__header">
                      <span className="action-card__type"><AlertCircle size={12} /> Por confirmar</span>
                    </div>
                    <p className="action-card__desc">
                      Cita de <strong>{a.clientName}</strong> para {a.date === todayStr ? 'hoy' : `el ${new Date(a.date + 'T12:00:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })}`} a las {format12h(a.time)}.
                    </p>
                    <div className="action-card__actions" style={{ flexWrap: 'wrap' }}>
                      <button className="action-btn action-btn--primary" onClick={() => { const paso = accionPrincipal(a.status); if (paso) acciones.avanzar(a, paso); }}>Confirmar</button>
                      <button className="action-btn action-btn--wa" onClick={() => handleWhatsApp(a.clientPhone, `Hola ${a.clientName}, nos gustaría confirmar su cita de ${a.date === todayStr ? 'hoy' : `el ${new Date(a.date + 'T12:00:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}`} a las ${format12h(a.time)}.`)}>WhatsApp</button>
                      <MenuAcciones
                        etiqueta={`Más acciones para la cita de ${a.clientName}`}
                        items={[
                          { id: 'ver', etiqueta: 'Ver clienta', icono: <Users size={16} aria-hidden="true" />, onSelect: () => navigate('/admin/clientes', { state: { searchName: a.clientName } }) },
                          { id: 'cancelar', etiqueta: 'Cancelar cita', icono: <XCircle size={16} aria-hidden="true" />, peligro: true, onSelect: () => acciones.cancelar(a) },
                        ]}
                      />
                    </div>
                  </div>
                ))}

                {/* Expiring Packages Alerts */}
                {expiringPackages.map(p => (
                  <div key={p.id} className="action-card action-card--alert">
                    <div className="action-card__header">
                      <span className="action-card__type"><Star size={12} /> Paquete por expirar</span>
                    </div>
                    <p className="action-card__desc">
                      El paquete de <strong>{p.clientName}</strong> ({p.packageName}) le quedan {p.totalSessions - p.usedSessions} sesiones.
                    </p>
                      <button
                        className="action-btn action-btn--secondary"
                        onClick={() => navigate('/admin/clientes', { state: { searchName: p.clientName } })}
                      >
                        Ver clienta
                      </button>
                  </div>
                ))}
              </div>
            </div>
          </div>



        </div>

        {/* Right Column (Timeline) */}
        <div className="dash-panel">
          <div className="dash-panel__header">
            <h2 className="dash-panel__title"><Clock size={20} /> Agenda de hoy</h2>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
              {new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <div className="dash-panel__body">
            {stats.todaysAppts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)' }}>
                <Calendar size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <p>No hay citas programadas para hoy.</p>
              </div>
            ) : (
              <div className="dash-timeline">
                {stats.todaysAppts.map(a => (
                  <div key={a.id} className={`timeline-item timeline-item--${a.status}`}>
                    <div className="timeline-item__time">{format12h(a.time)}</div>
                    <div className="timeline-item__node"></div>
                    <div
                      className="timeline-item__card"
                      onClick={() => navigate(`/admin/citas?highlight=${a.id}`)}
                    >
                      <div className="timeline-item__card-header">
                        <div>
                          <div className="timeline-item__client">{a.clientName}</div>
                          <div className="timeline-item__service">{a.service}</div>
                        </div>
                        <MenuAcciones
                          etiqueta={`Acciones para la cita de ${a.clientName}`}
                          items={acciones.itemsDe(a, {
                            conPrincipal: true,
                            extra: [{
                              id: 'recordar',
                              etiqueta: 'Recordar por WhatsApp',
                              icono: <MessageCircle size={16} aria-hidden="true" />,
                              onSelect: () => handleWhatsApp(a.clientPhone, `Hola ${a.clientName}, le recordamos su cita a las ${format12h(a.time)} para ${a.service}.`),
                            }],
                          })}
                        />
                      </div>
                      <div className="timeline-item__meta">
                        <span><Users size={12} /> {a.employee}</span>
                        <span><Clock size={12} /> {a.duration} min</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {savingClientFor && (
        <SaveClientModal appointment={savingClientFor} onClose={() => setSavingClientFor(null)} />
      )}
    </div>
  );
}
