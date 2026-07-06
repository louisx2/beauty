import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useStaffStore } from '../../store/staffStore';
import { useBillingStore } from '../../store/billingStore';
import { useClientStore } from '../../store/clientStore';
import { useServiceStore } from '../../store/serviceStore';
import { useSettingsStore } from '../../store/settingsStore';
import SaveClientModal from '../../components/SaveClientModal';
import {
  Calendar, DollarSign, Users, Package, Clock, Sparkles, AlertCircle, 
  CheckCircle2, Bell, MessageCircle, BarChart3, Star, MoreVertical
} from 'lucide-react';
import { format12h } from '../../lib/timeFormat';
import toast from 'react-hot-toast';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { appointments, fetchAppointments, updateStatus: updateAppointmentStatus } = useAppointmentStore();
  const { invoices, fetchAll: fetchInvoices } = useBillingStore();
  const { clients, fetchClients } = useClientStore();
  const { clientPackages, fetchAll: fetchServicesAndPackages } = useServiceStore();
  const { settings, fetchSettings } = useSettingsStore();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [savingClientFor, setSavingClientFor] = useState<any>(null);

  useEffect(() => {
    fetchAppointments();
    fetchInvoices();
    fetchClients();
    fetchServicesAndPackages();
    fetchSettings();
  }, [fetchAppointments, fetchInvoices, fetchClients, fetchServicesAndPackages, fetchSettings]);

  // Handle clicking outside to close menus
  useEffect(() => {
    const handleClick = () => setOpenMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
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
    const mInvoices = invoices.filter(i => i.createdAt.startsWith(thisMonth) && i.status !== 'cancelled');
    return {
      citasHoy: todays.length,
      ingresosMes: mInvoices.reduce((acc, inv) => acc + inv.total, 0),
      clientasActivas: clients.filter(c => c.active).length,
      paquetesActivos: clientPackages.filter(p => p.status === 'active').length,
      serviciosMes: appointments.filter(a => a.date.startsWith(thisMonth)).length,
      todaysAppts: todays.sort((a, b) => a.time.localeCompare(b.time)),
      pendingAppts: appointments.filter(a => a.date >= todayStr && a.status === 'pending').sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).slice(0, 5)
    };
  }, [appointments, invoices, clients, clientPackages, todayStr, thisMonth]);

  // Calculate top services
  const topServices = useMemo(() => {
    const counts: Record<string, number> = {};
    const recent = appointments.filter(a => a.date.startsWith(thisMonth));
    recent.forEach(a => { counts[a.service] = (counts[a.service] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const max = sorted.length > 0 ? sorted[0][1] : 1;
    return sorted.map(([name, count]) => ({ name, count, percent: (count / max) * 100 }));
  }, [appointments, thisMonth]);

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
            <div className="bento-card__label">Citas Programadas</div>
          </div>
          
          {/* Card 2 */}
          <div className="bento-card bento-card--green">
            <div className="bento-card__sparkline" />
            <div className="bento-card__header">
              <div className="bento-card__icon"><DollarSign /></div>
              <div className="bento-card__badge bento-card__badge--up">+12%</div>
            </div>
            <div className="bento-card__value">RD$ {stats.ingresosMes.toLocaleString('es-DO')}</div>
            <div className="bento-card__label">Ingresos Brutos (Mes)</div>
          </div>

          {/* Card 3 */}
          <div className="bento-card bento-card--lavender">
            <div className="bento-card__sparkline" />
            <div className="bento-card__header">
              <div className="bento-card__icon"><Users /></div>
              <div className="bento-card__badge bento-card__badge--neutral">Total</div>
            </div>
            <div className="bento-card__value">{stats.clientasActivas}</div>
            <div className="bento-card__label">Clientas Activas</div>
          </div>

          {/* Card 4 */}
          <div className="bento-card bento-card--amber">
            <div className="bento-card__sparkline" />
            <div className="bento-card__header">
              <div className="bento-card__icon"><Package /></div>
              <div className="bento-card__badge bento-card__badge--neutral">Vigentes</div>
            </div>
            <div className="bento-card__value">{stats.paquetesActivos}</div>
            <div className="bento-card__label">Paquetes Activos</div>
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
              <h2 className="dash-panel__title"><Bell size={20} style={{ color: '#fbbf24' }} /> Centro de Acción</h2>
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
                      <span className="action-card__type"><AlertCircle size={12} /> Por Confirmar</span>
                    </div>
                    <p className="action-card__desc">
                      Cita de <strong>{a.clientName}</strong> para el {a.date === todayStr ? 'hoy' : new Date(a.date+'T12:00:00').toLocaleDateString('es-DO', {day:'numeric', month:'short'})} a las {format12h(a.time)}.
                    </p>
                    <div className="action-card__actions" style={{ flexWrap: 'wrap' }}>
                      <button className="action-btn action-btn--primary" onClick={() => { updateAppointmentStatus(a.id, 'confirmed'); toast.success('Cita confirmada'); }}>Confirmar</button>
                      <button className="action-btn action-btn--wa" onClick={() => handleWhatsApp(a.clientPhone, `Hola ${a.clientName}, nos gustaría confirmar su cita para el ${a.date === todayStr ? 'hoy' : a.date}...`)}>WhatsApp</button>
                      <button className="action-btn action-btn--secondary" onClick={() => navigate('/admin/clientes', { state: { searchName: a.clientName } })}>Ver Cliente</button>
                      <button className="action-btn action-btn--secondary" onClick={() => { updateAppointmentStatus(a.id, 'cancelled'); toast.success('Cita cancelada'); }} style={{ color: '#f87171' }}>Cancelar</button>
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
                        Ver Cliente
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
            <h2 className="dash-panel__title"><Clock size={20} /> Agenda de Hoy</h2>
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
                        {/* Actions Menu */}
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === a.id ? null : a.id); }}
                            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openMenu === a.id && (
                            <div style={{ position: 'absolute', right: 0, top: '100%', zIndex: 50, background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 4, width: 140, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
                              {a.status === 'pending' && <button onClick={() => { updateAppointmentStatus(a.id, 'confirmed'); setOpenMenu(null); toast.success('Confirmada'); }} style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', borderRadius: 4, fontSize: '0.85rem' }}>Confirmar</button>}
                              {a.status === 'confirmed' && <button onClick={() => { updateAppointmentStatus(a.id, 'in_progress'); setOpenMenu(null); toast.success('En curso'); }} style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', borderRadius: 4, fontSize: '0.85rem' }}>Iniciar</button>}
                              {a.status === 'in_progress' && <button onClick={() => { updateAppointmentStatus(a.id, 'completed'); setOpenMenu(null); toast.success('Completada'); }} style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: '#4ade80', cursor: 'pointer', borderRadius: 4, fontSize: '0.85rem' }}>Completar</button>}
                              <button onClick={() => { handleWhatsApp(a.clientPhone, `Hola ${a.clientName}, le recordamos su cita a las ${format12h(a.time)} para ${a.service}.`); setOpenMenu(null); }} style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', borderRadius: 4, fontSize: '0.85rem' }}>Recordar (WA)</button>
                              <button onClick={() => { updateAppointmentStatus(a.id, 'cancelled'); setOpenMenu(null); toast.error('Cancelada'); }} style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', borderRadius: 4, fontSize: '0.85rem' }}>Cancelar</button>
                              {!a.client_id && (
                                <button onClick={() => { setSavingClientFor(a); setOpenMenu(null); }} style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'rgba(59,130,246,0.2)', border: 'none', color: '#60a5fa', cursor: 'pointer', borderRadius: 4, fontSize: '0.85rem', marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.05)' }}>💾 Guardar Clienta</button>
                              )}
                            </div>
                          )}
                        </div>
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
