import { useMemo, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppointmentStore, type Appointment, type AppointmentStatus } from '../../store/appointmentStore';
import { useServiceStore } from '../../store/serviceStore';
import { useStaffStore } from '../../store/staffStore';
import { useClientStore } from '../../store/clientStore';
import {
  CalendarDays, Plus, Phone, Clock, CheckCircle2, AlertCircle,
  XCircle, Search, MessageCircle, ChevronDown, RefreshCw,
  Users, Scissors, Sparkles, CalendarCheck, UserCheck,
  Timer, Bell, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './ReceptionistDashboard.css';

/* ── helpers ── */
const STATUS_LABELS: Record<string, string> = {
  pending:     'Pendiente',
  confirmed:   'Confirmada',
  in_progress: 'En Curso',
  completed:   'Completada',
  cancelled:   'Cancelada',
  no_show:     'No Asistió',
};

const STATUS_NEXT: Record<string, AppointmentStatus[]> = {
  pending:     ['confirmed', 'cancelled', 'no_show'],
  confirmed:   ['pending',   'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled'],
  completed:   [],
  cancelled:   [],
  no_show:     [],
};

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  return now;
}

function minutesUntil(dateStr: string, timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  const appt = new Date(`${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
  return Math.round((appt.getTime() - now.getTime()) / 60000);
}

function waReminder(appt: Appointment): string {
  const phone = appt.clientPhone.replace(/[^0-9]/g, '');
  const norm  = phone.startsWith('1') ? phone : '1' + phone;
  const dateLabel = new Date(appt.date + 'T12:00:00').toLocaleDateString('es-DO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const msg = `Hola ${appt.clientName} 👋\n\nLe recordamos su cita en *Anadsll Beauty Esthetic*.\n\n📅 *Fecha:* ${dateLabel}\n🕐 *Hora:* ${appt.time}\n💆 *Servicio:* ${appt.service}\n\nPor favor confírmenos su asistencia respondiendo a este mensaje. ¡Gracias! 🌸`;
  return `https://wa.me/${norm}?text=${encodeURIComponent(msg)}`;
}

/* ── Quick booking modal state ── */
interface BookForm {
  clientName: string; clientPhone: string; clientId: string;
  service: string; employee: string; date: string; time: string;
  duration: number; notes: string;
}

const HOURS = Array.from({ length: 11 }, (_, i) => {
  const h = i + 8;
  return [`${String(h).padStart(2,'0')}:00`, `${String(h).padStart(2,'0')}:30`];
}).flat();

function getAvailableHours(dateStr: string): string[] {
  const today = new Date().toISOString().split('T')[0];
  if (dateStr !== today) return HOURS;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return HOURS.filter(h => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + mm > nowMin;
  });
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */
export default function ReceptionistDashboard() {
  const now = useLiveClock();
  const navigate = useNavigate();

  const { appointments, fetchAppointments, updateStatus, addAppointment } = useAppointmentStore();
  const { services, staff: staffList, fetchAll: fetchServices } = useServiceStore();
  const { staff, fetchStaff } = useStaffStore();
  const { clients, fetchClients } = useClientStore();

  const [statusOpen, setStatusOpen]   = useState<string | null>(null);
  const [bookOpen,   setBookOpen]     = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientSuggest, setClientSuggest] = useState(false);
  const [bookSaving,   setBookSaving]  = useState(false);
  const [form, setForm] = useState<BookForm>({
    clientName: '', clientPhone: '', clientId: '',
    service: '', employee: '', date: new Date().toISOString().split('T')[0],
    time: '', duration: 45, notes: '',
  });

  useEffect(() => {
    fetchAppointments();
    fetchServices();
    fetchStaff();
    fetchClients();
    const iv = setInterval(fetchAppointments, 30_000);
    return () => clearInterval(iv);
  }, [fetchAppointments, fetchServices, fetchStaff, fetchClients]);

  /* close dropdowns on outside click */
  useEffect(() => {
    const handler = () => setStatusOpen(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const today = new Date().toISOString().split('T')[0];

  /* ── Stats ── */
  const todayAppts = useMemo(() =>
    appointments.filter(a => a.date === today)
      .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, today]
  );

  const stats = useMemo(() => ({
    pending:     todayAppts.filter(a => a.status === 'pending').length,
    confirmed:   todayAppts.filter(a => a.status === 'confirmed').length,
    in_progress: todayAppts.filter(a => a.status === 'in_progress').length,
    completed:   todayAppts.filter(a => a.status === 'completed').length,
    cancelled:   todayAppts.filter(a => a.status === 'cancelled' || a.status === 'no_show').length,
    total:       todayAppts.length,
  }), [todayAppts]);

  /* ── En sala ahora ── */
  const enSala = useMemo(() =>
    todayAppts.filter(a => a.status === 'in_progress'),
    [todayAppts]
  );

  /* ── Próximas llegadas (pendiente/confirmada, próximas 90 min) ── */
  const proximas = useMemo(() =>
    todayAppts
      .filter(a => (a.status === 'pending' || a.status === 'confirmed'))
      .map(a => ({ ...a, mins: minutesUntil(a.date, a.time) }))
      .filter(a => a.mins > -10 && a.mins <= 90)
      .sort((a, b) => a.mins - b.mins),
    [todayAppts]
  );

  /* ── Pendientes sin confirmar (para recordatorio WA) ── */
  const sinConfirmar = useMemo(() =>
    todayAppts.filter(a => a.status === 'pending'),
    [todayAppts]
  );

  /* ── Upcoming days (tomorrow+) ── */
  const upcomingAppts = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tStr = tomorrow.toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    const eStr = endDate.toISOString().split('T')[0];
    return appointments
      .filter(a => a.date >= tStr && a.date <= eStr && (a.status === 'pending' || a.status === 'confirmed'))
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .slice(0, 8);
  }, [appointments]);

  /* ── Specialists for display ── */
  const specialists = useMemo(() =>
    staff.filter(s => s.role === 'specialist' && s.active),
    [staff]
  );

  /* ── Status change ── */
  const handleStatus = useCallback(async (id: string, status: AppointmentStatus) => {
    setStatusOpen(null);
    await updateStatus(id, status);
    if (status === 'confirmed') toast.success('Cita confirmada ✅');
    else if (status === 'no_show') toast('Marcada como no asistió');
    else if (status === 'cancelled') toast('Cita cancelada');
  }, [updateStatus]);

  /* ── Book form ── */
  const serviceOptions = useMemo(() =>
    services.filter(s => s.active).sort((a, b) => a.name.localeCompare(b.name)),
    [services]
  );

  const staffOptions = useMemo(() => {
    if (!form.service) return specialists;
    const svc = services.find(s => s.name === form.service);
    if (!svc) return specialists;
    return specialists.filter(sp => {
      const stf = staff.find(x => x.name === sp.name);
      return !stf?.serviceIds?.length || stf.serviceIds.includes(svc.id);
    });
  }, [form.service, services, specialists, staff]);

  const availableHours = useMemo(() =>
    getAvailableHours(form.date),
    [form.date]
  );

  const clientMatches = useMemo(() => {
    if (!clientSearch || clientSearch.length < 2) return [];
    const q = clientSearch.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    ).slice(0, 5);
  }, [clients, clientSearch]);

  function selectClient(c: { id: string; name: string; phone: string }) {
    setForm(f => ({ ...f, clientName: c.name, clientPhone: c.phone, clientId: c.id }));
    setClientSearch(c.name);
    setClientSuggest(false);
  }

  function openBook() {
    setForm({
      clientName: '', clientPhone: '', clientId: '',
      service: '', employee: '', date: new Date().toISOString().split('T')[0],
      time: '', duration: 45, notes: '',
    });
    setClientSearch('');
    setBookOpen(true);
  }

  async function handleBook() {
    if (!form.clientName || !form.clientPhone || !form.service || !form.employee || !form.date || !form.time) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    setBookSaving(true);
    const result = await addAppointment({
      clientName: form.clientName,
      clientPhone: form.clientPhone,
      service: form.service,
      employee: form.employee,
      date: form.date,
      time: form.time,
      duration: form.duration,
      status: 'confirmed',
      notes: form.notes || null,
      source: 'manual',
    });
    setBookSaving(false);
    if (result) {
      toast.success('✅ Cita agendada y confirmada');
      setBookOpen(false);
    } else {
      toast.error('Error al guardar la cita');
    }
  }

  /* ─────────────────────── JSX ─────────────────────── */
  const timeStr = now.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="rec">

      {/* ══ HEADER BAR ══ */}
      <div className="rec__topbar">
        <div className="rec__topbar-left">
          <div className="rec__clock">{timeStr}</div>
          <div className="rec__date">{dateStr}</div>
        </div>
        <div className="rec__topbar-right">
          <button className="rec__refresh" onClick={fetchAppointments} title="Actualizar">
            <RefreshCw size={15} />
          </button>
          <button className="rec__btn-primary" onClick={openBook}>
            <Plus size={18} /> Nueva Cita
          </button>
        </div>
      </div>

      {/* ══ STATS ROW ══ */}
      <div className="rec__stats">
        <div className="rec__stat">
          <CalendarDays size={18} className="rec__stat-icon" />
          <div>
            <span className="rec__stat-val">{stats.total}</span>
            <span className="rec__stat-label">Citas hoy</span>
          </div>
        </div>
        <div className="rec__stat rec__stat--amber">
          <Clock size={18} />
          <div>
            <span className="rec__stat-val">{stats.pending}</span>
            <span className="rec__stat-label">Pendientes</span>
          </div>
        </div>
        <div className="rec__stat rec__stat--blue">
          <CalendarCheck size={18} />
          <div>
            <span className="rec__stat-val">{stats.confirmed}</span>
            <span className="rec__stat-label">Confirmadas</span>
          </div>
        </div>
        <div className="rec__stat rec__stat--orange">
          <Timer size={18} />
          <div>
            <span className="rec__stat-val">{stats.in_progress}</span>
            <span className="rec__stat-label">En curso</span>
          </div>
        </div>
        <div className="rec__stat rec__stat--green">
          <CheckCircle2 size={18} />
          <div>
            <span className="rec__stat-val">{stats.completed}</span>
            <span className="rec__stat-label">Completadas</span>
          </div>
        </div>
        {stats.cancelled > 0 && (
          <div className="rec__stat rec__stat--red">
            <XCircle size={18} />
            <div>
              <span className="rec__stat-val">{stats.cancelled}</span>
              <span className="rec__stat-label">Canceladas</span>
            </div>
          </div>
        )}
      </div>

      {/* ══ ALERT: sin confirmar ══ */}
      {sinConfirmar.length > 0 && (
        <div className="rec__alert">
          <Bell size={16} />
          <span>
            <strong>{sinConfirmar.length}</strong> cita{sinConfirmar.length !== 1 ? 's' : ''} de hoy sin confirmar
          </span>
          <div className="rec__alert-actions">
            {sinConfirmar.slice(0, 3).map(a => (
              <a
                key={a.id}
                href={waReminder(a)}
                target="_blank"
                rel="noreferrer"
                className="rec__wa-chip"
              >
                <MessageCircle size={12} /> {a.clientName.split(' ')[0]} {a.time}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="rec__body">
        <div className="rec__col-main">

          {/* ══ EN SALA AHORA ══ */}
          <div className="rec__section">
            <h2 className="rec__section-title">
              <span className="rec__live-dot" /> En Sala Ahora
            </h2>
            {enSala.length === 0 ? (
              <div className="rec__empty-sm">
                <Scissors size={20} />
                <span>Ninguna especialista en servicio actualmente</span>
              </div>
            ) : (
              <div className="rec__sala-grid">
                {enSala.map(a => (
                  <div key={a.id} className="rec__sala-card">
                    <div className="rec__sala-specialist">{a.employee}</div>
                    <div className="rec__sala-client">
                      <UserCheck size={14} /> {a.clientName}
                    </div>
                    <div className="rec__sala-service">
                      <Sparkles size={13} /> {a.service}
                    </div>
                    <div className="rec__sala-time">
                      <Clock size={12} /> Inicio {a.time} · {a.duration} min
                    </div>
                    {a.clientPhone && (
                      <a href={`tel:${a.clientPhone}`} className="rec__sala-phone">
                        <Phone size={12} /> {a.clientPhone}
                      </a>
                    )}
                  </div>
                ))}
                {/* Specialists with no current service */}
                {specialists
                  .filter(sp => !enSala.some(a => a.employee.toLowerCase() === sp.name.toLowerCase()))
                  .map(sp => (
                    <div key={sp.id} className="rec__sala-card rec__sala-card--free">
                      <div className="rec__sala-specialist">{sp.name}</div>
                      <div className="rec__sala-free">Disponible</div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* ══ PRÓXIMAS LLEGADAS ══ */}
          {proximas.length > 0 && (
            <div className="rec__section">
              <h2 className="rec__section-title">
                <ArrowRight size={16} /> Próximas Llegadas — Hoy
              </h2>
              <div className="rec__proximas">
                {proximas.map(a => (
                  <div
                    key={a.id}
                    className={`rec__proxima-row ${a.mins <= 10 ? 'rec__proxima-row--now' : ''}`}
                  >
                    <div className="rec__proxima-time">
                      <strong>{a.time}</strong>
                      <span className={`rec__proxima-mins ${a.mins <= 0 ? 'rec__proxima-mins--late' : ''}`}>
                        {a.mins <= 0
                          ? `¡hace ${Math.abs(a.mins)} min!`
                          : `en ${a.mins} min`}
                      </span>
                    </div>
                    <div className="rec__proxima-info">
                      <strong>{a.clientName}</strong>
                      <span>{a.service} · {a.employee}</span>
                    </div>
                    <div className="rec__proxima-actions">
                      {a.status === 'pending' && (
                        <>
                          <button
                            className="rec__action-btn rec__action-btn--confirm"
                            onClick={() => handleStatus(a.id, 'confirmed')}
                          >
                            <CheckCircle2 size={13} /> Confirmar
                          </button>
                          <a
                            href={waReminder(a)}
                            target="_blank"
                            rel="noreferrer"
                            className="rec__action-btn rec__action-btn--wa"
                          >
                            <MessageCircle size={13} /> WA
                          </a>
                        </>
                      )}
                      {a.status === 'confirmed' && (
                        <span className="rec__badge rec__badge--confirmed">Confirmada ✓</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ AGENDA COMPLETA DE HOY ══ */}
          <div className="rec__section">
            <h2 className="rec__section-title">
              <CalendarDays size={16} />
              Agenda de Hoy
              <span className="rec__section-count">{todayAppts.length}</span>
              <button
                className="rec__section-link"
                onClick={() => navigate('/admin/citas')}
              >
                Ver todo <ArrowRight size={13} />
              </button>
            </h2>

            {todayAppts.length === 0 ? (
              <div className="rec__empty-sm">
                <CalendarDays size={22} />
                <span>No hay citas agendadas para hoy</span>
              </div>
            ) : (
              <div className="rec__agenda">
                {todayAppts.map(a => {
                  const nexts = STATUS_NEXT[a.status] ?? [];
                  return (
                    <div
                      key={a.id}
                      className={`rec__appt rec__appt--${a.status}`}
                    >
                      <div className="rec__appt-time">{a.time}</div>

                      <div className={`rec__appt-bar rec__appt-bar--${a.status}`} />

                      <div className="rec__appt-info">
                        <strong>{a.clientName}</strong>
                        <span>{a.service} · <em>{a.employee}</em> · {a.duration} min</span>
                        {a.notes && <span className="rec__appt-notes">📋 {a.notes}</span>}
                      </div>

                      <div className="rec__appt-right">
                        {a.clientPhone && (
                          <a
                            href={waReminder(a)}
                            target="_blank"
                            rel="noreferrer"
                            className="rec__appt-wa"
                            title="Enviar recordatorio por WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </a>
                        )}

                        {nexts.length > 0 ? (
                          <div
                            className="rec__status-wrap"
                            onClick={e => { e.stopPropagation(); setStatusOpen(statusOpen === a.id ? null : a.id); }}
                          >
                            <div className={`rec__badge rec__badge--${a.status}`}>
                              {STATUS_LABELS[a.status]}
                              <ChevronDown size={12} />
                            </div>
                            {statusOpen === a.id && (
                              <div className="rec__status-menu">
                                {nexts.map(s => (
                                  <button
                                    key={s}
                                    className={`rec__status-opt rec__status-opt--${s}`}
                                    onClick={(e) => { e.stopPropagation(); handleStatus(a.id, s); }}
                                  >
                                    {STATUS_LABELS[s]}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={`rec__badge rec__badge--${a.status}`}>
                            {STATUS_LABELS[a.status]}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ══ SIDEBAR DERECHO ══ */}
        <div className="rec__col-side">

          {/* Especialistas hoy */}
          <div className="rec__side-card">
            <h3 className="rec__side-title"><Users size={15} /> Especialistas</h3>
            {specialists.map(sp => {
              const spAppts = todayAppts.filter(a =>
                a.employee.toLowerCase() === sp.name.toLowerCase()
              );
              const completed  = spAppts.filter(a => a.status === 'completed').length;
              const upcoming   = spAppts.filter(a => a.status === 'pending' || a.status === 'confirmed').length;
              const inProgress = spAppts.find(a => a.status === 'in_progress');
              return (
                <div key={sp.id} className="rec__specialist-row">
                  <div className="rec__specialist-avatar">
                    {sp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="rec__specialist-info">
                    <strong>{sp.name}</strong>
                    <span>
                      {inProgress
                        ? <><span className="rec__dot rec__dot--orange" /> En servicio — {inProgress.clientName}</>
                        : upcoming > 0
                          ? <><span className="rec__dot rec__dot--blue" /> {upcoming} por atender</>
                          : <><span className="rec__dot rec__dot--green" /> Disponible</>
                      }
                    </span>
                    <span className="rec__specialist-done">{completed} completadas hoy</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Próximos días */}
          {upcomingAppts.length > 0 && (
            <div className="rec__side-card">
              <h3 className="rec__side-title"><CalendarDays size={15} /> Próximos 7 días</h3>
              {upcomingAppts.map(a => {
                const dl = new Date(a.date + 'T12:00:00').toLocaleDateString('es-DO', {
                  weekday: 'short', day: 'numeric', month: 'short',
                });
                return (
                  <div key={a.id} className="rec__upcoming-row">
                    <div className="rec__upcoming-date">{dl}</div>
                    <div className="rec__upcoming-info">
                      <strong>{a.clientName}</strong>
                      <span>{a.time} · {a.service.slice(0, 22)}</span>
                    </div>
                    <span className={`rec__badge rec__badge--${a.status} rec__badge--sm`}>
                      {STATUS_LABELS[a.status]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Búsqueda rápida de clientes */}
          <div className="rec__side-card">
            <h3 className="rec__side-title"><Search size={15} /> Buscar Cliente</h3>
            <input
              className="rec__search-input"
              placeholder="Nombre o teléfono..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
            />
            {clientSearch.length >= 2 && clientMatches.length > 0 && (
              <div className="rec__search-results">
                {clientMatches.map(c => (
                  <div key={c.id} className="rec__search-result" onClick={() => navigate('/admin/clientes')}>
                    <strong>{c.name}</strong>
                    <span>{c.phone}</span>
                  </div>
                ))}
              </div>
            )}
            {clientSearch.length >= 2 && clientMatches.length === 0 && (
              <p className="rec__search-none">No encontrado</p>
            )}
          </div>

        </div>
      </div>

      {/* ══ MODAL: NUEVA CITA ══ */}
      {bookOpen && (
        <div className="rec__modal-overlay" onClick={() => setBookOpen(false)}>
          <div className="rec__modal" onClick={e => e.stopPropagation()}>
            <div className="rec__modal-header">
              <h2><Plus size={20} /> Nueva Cita</h2>
              <button className="rec__modal-close" onClick={() => setBookOpen(false)}>✕</button>
            </div>

            <div className="rec__modal-body">
              {/* Cliente */}
              <div className="rec__field">
                <label>Cliente *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="rec__input"
                    placeholder="Buscar o escribir nombre..."
                    value={clientSearch || form.clientName}
                    onChange={e => {
                      setClientSearch(e.target.value);
                      setForm(f => ({ ...f, clientName: e.target.value, clientId: '' }));
                      setClientSuggest(true);
                    }}
                  />
                  {clientSuggest && clientMatches.length > 0 && (
                    <div className="rec__autocomplete">
                      {clientMatches.map(c => (
                        <div key={c.id} className="rec__autocomplete-item" onClick={() => selectClient(c)}>
                          <strong>{c.name}</strong>
                          <span>{c.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rec__field">
                <label>Teléfono *</label>
                <input
                  className="rec__input"
                  placeholder="809-000-0000"
                  value={form.clientPhone}
                  onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
                />
              </div>

              <div className="rec__field-row">
                <div className="rec__field">
                  <label>Servicio *</label>
                  <select
                    className="rec__select"
                    value={form.service}
                    onChange={e => {
                      const svc = services.find(s => s.name === e.target.value);
                      setForm(f => ({
                        ...f,
                        service: e.target.value,
                        duration: svc?.duration ?? 45,
                        employee: '',
                      }));
                    }}
                  >
                    <option value="">Seleccionar...</option>
                    {serviceOptions.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="rec__field">
                  <label>Especialista *</label>
                  <select
                    className="rec__select"
                    value={form.employee}
                    onChange={e => setForm(f => ({ ...f, employee: e.target.value }))}
                  >
                    <option value="">Seleccionar...</option>
                    {staffOptions.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rec__field-row">
                <div className="rec__field">
                  <label>Fecha *</label>
                  <input
                    type="date"
                    className="rec__input"
                    value={form.date}
                    min={today}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value, time: '' }))}
                  />
                </div>

                <div className="rec__field">
                  <label>Hora *</label>
                  <select
                    className="rec__select"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  >
                    <option value="">Seleccionar...</option>
                    {availableHours.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rec__field">
                <label>Notas (opcional)</label>
                <textarea
                  className="rec__textarea"
                  placeholder="Indicaciones especiales, alergias, etc."
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="rec__modal-footer">
              <button className="rec__btn-secondary" onClick={() => setBookOpen(false)}>
                Cancelar
              </button>
              <button className="rec__btn-primary" onClick={handleBook} disabled={bookSaving}>
                {bookSaving ? 'Guardando…' : <><CalendarCheck size={16} /> Confirmar Cita</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
