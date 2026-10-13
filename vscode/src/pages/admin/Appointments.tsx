import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  useAppointmentStore,
  type Appointment,
  type AppointmentStatus,
} from '../../store/appointmentStore';
import { useStaffStore } from '../../store/staffStore';
import { useServiceStore } from '../../store/serviceStore';
import { useAuthStore } from '../../store/authStore';
import { useAgendarStore } from '../../store/agendarStore';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Phone,
  MessageCircle,
  Filter,
  User,
  Calendar,
  Sparkles,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PlayCircle,
  Ban,
  CalendarOff,
} from 'lucide-react';
import { format12h } from '../../lib/timeFormat';
import { atiendeClientas } from '../../lib/quienAtiende';
import SaveClientModal from '../../components/SaveClientModal';
import ScheduleBlocksModal from '../../components/ScheduleBlocksModal';
import MenuAcciones from '../../components/MenuAcciones';
import { ETIQUETA_ESTADO } from '../../lib/estadosCita';
import { accionPrincipal } from './citas/acciones';
import { useAccionesCita, ICONO_PRINCIPAL } from './citas/useAccionesCita';
import './Appointments.css';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; class: string; icon: React.ReactNode }> = {
  pending: { label: ETIQUETA_ESTADO.pending, class: 'badge--amber', icon: <AlertCircle size={14} /> },
  confirmed: { label: ETIQUETA_ESTADO.confirmed, class: 'badge--green', icon: <CheckCircle2 size={14} /> },
  in_progress: { label: ETIQUETA_ESTADO.in_progress, class: 'badge--blue', icon: <PlayCircle size={14} /> },
  completed: { label: ETIQUETA_ESTADO.completed, class: 'badge--emerald', icon: <CheckCircle2 size={14} /> },
  cancelled: { label: ETIQUETA_ESTADO.cancelled, class: 'badge--red', icon: <XCircle size={14} /> },
  no_show: { label: ETIQUETA_ESTADO.no_show, class: 'badge--gray', icon: <Ban size={14} /> },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getWeekDates(dateStr: string): string[] {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return dt.toISOString().split('T')[0];
  });
}

export default function Appointments() {
  const location = useLocation();
  const navigate = useNavigate();
  const { appointments, fetchAppointments, autoMarkNoShow } = useAppointmentStore();
  const { staff, fetchStaff } = useStaffStore();
  const { fetchAll: fetchServices } = useServiceStore();
  const { user } = useAuthStore();
  const abrirAgendar = useAgendarStore((s) => s.abrir);

  useEffect(() => {
    fetchAppointments().then(() => autoMarkNoShow());
    fetchStaff();
    fetchServices();
  }, [fetchAppointments, autoMarkNoShow, fetchStaff, fetchServices]);

  const activeEmployees = useMemo(() => staff.filter((m) => m.active && atiendeClientas(m)).map((m) => m.name), [staff]);

  const [selectedDate, setSelectedDate] = useState(getToday());
  const [view, setView] = useState<'day' | 'week' | 'all'>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [savingClientFor, setSavingClientFor] = useState<Appointment | null>(null);
  const [showBlocksModal, setShowBlocksModal] = useState(false);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    let list: Appointment[];

    // If specialist, only show their own appointments
    const baseList = user?.role === 'specialist'
      ? appointments.filter((a) => a.employee === user.name)
      : appointments;

    if (view === 'day') {
      list = baseList.filter((a) => a.date === selectedDate);
    } else if (view === 'week') {
      const weekDates = getWeekDates(selectedDate);
      list = baseList.filter((a) => weekDates.includes(a.date));
    } else {
      list = baseList;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const qDigits = q.replace(/\D/g, '');
      list = list.filter(
        (a) =>
          a.clientName.toLowerCase().includes(q) ||
          a.service.toLowerCase().includes(q) ||
          (qDigits && a.clientPhone.replace(/\D/g, '').includes(qDigits))
      );
    }
    if (filterEmployee) {
      list = list.filter((a) => a.employee === filterEmployee);
    }
    if (filterStatus) {
      list = list.filter((a) => a.status === filterStatus);
    }

    return list.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
  }, [appointments, selectedDate, view, searchQuery, filterEmployee, filterStatus, user]);

  // Week dates for week view
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  // Stats for selected date
  const dayStats = useMemo(() => {
    const dayAppts = appointments.filter((a) => a.date === selectedDate);
    return {
      total: dayAppts.length,
      confirmed: dayAppts.filter((a) => a.status === 'confirmed').length,
      pending: dayAppts.filter((a) => a.status === 'pending').length,
      completed: dayAppts.filter((a) => a.status === 'completed').length,
    };
  }, [appointments, selectedDate]);

  // Nueva cita, Editar y Reprogramar abren Agendar: la misma ventana en todo el panel, con las horas libres de verdad.
  const openCreate = () => abrirAgendar({ modo: 'nueva', fecha: selectedDate });
  const openEdit = (appt: Appointment) => abrirAgendar({ modo: 'editar', cita: appt });

  // Lo que pide la dirección: "Mañana" en Hoy abre ese día (?fecha=); una notificación, su cita en Agendar (?highlight=).
  const pide = new URLSearchParams(location.search);
  const idPedido = pide.get('highlight');
  const diaPedido = pide.get('fecha') ?? (idPedido ? appointments.find((a) => a.id === idPedido)?.date : undefined);
  const [visto, setVisto] = useState<string | null>(null);
  if (diaPedido && location.search !== visto) {
    setVisto(location.search);
    setView('day');
    setSelectedDate(diaPedido);
  } else if (!location.search && visto) {
    setVisto(null);
  }
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('highlight');
    if (id) {
      const appt = appointments.find((a) => a.id === id);
      if (!appt && appointments.length === 0) return; // todavía no llegan las citas
      if (appt) abrirAgendar({ modo: 'editar', cita: appt });
    }
    if (id || params.has('fecha')) navigate('/admin/citas', { replace: true });
  }, [location.search, appointments, navigate, abrirAgendar]);

  const handleWhatsApp = (appt: Appointment) => {
    const phone = appt.clientPhone.replace(/[^0-9]/g, '');
    const msg = `Hola ${appt.clientName}, le recordamos su cita:\n\n Fecha: ${formatDate(appt.date)}\n Hora: ${format12h(appt.time)}\n Servicio: ${appt.service}\n\nLa esperamos en Anadsll Beauty Esthetic!`;
    window.open(`https://wa.me/1${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Confirmar / Llegó / Completar, el menú "⋯" y cancelar: lo mismo que en el Dashboard.
  const acciones = useAccionesCita({
    editar: openEdit,
    reprogramar: (appt) => abrirAgendar({ modo: 'reprogramar', cita: appt }),
    guardarClienta: setSavingClientFor,
  });

  return (
    <div className="appts">
      {/* Header */}
      <div className="appts__header">
        <div>
          <h1 className="appts__title">Citas</h1>
          <p className="appts__subtitle">Agenda y administra todas las citas del salón</p>
        </div>
        <div className="appts__header-actions">
          <button className="appts__block-btn" onClick={() => setShowBlocksModal(true)} id="btn-block-schedule">
            <CalendarOff size={18} /> Bloquear horario
          </button>
          <button className="appts__add-btn" onClick={openCreate} id="btn-new-appointment">
            <Plus size={18} /> Nueva cita
          </button>
        </div>
      </div>

      {/* Date Navigation + View Toggle */}
      <div className="appts__controls">
        <div className="appts__date-nav">
          {view !== 'all' ? (
            <>
              <button onClick={() => setSelectedDate(addDays(selectedDate, view === 'day' ? -1 : -7))} className="appts__nav-btn">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setSelectedDate(getToday())} className="appts__today-btn">Hoy</button>
              <button onClick={() => setSelectedDate(addDays(selectedDate, view === 'day' ? 1 : 7))} className="appts__nav-btn">
                <ChevronRight size={18} />
              </button>
              <span className="appts__current-date">{formatDate(selectedDate)}</span>
            </>
          ) : (
            <span className="appts__current-date" style={{ marginLeft: 0 }}>Todas las fechas</span>
          )}
        </div>

        <div className="appts__view-toggle">
          <button className={`appts__view-btn ${view === 'day' ? 'appts__view-btn--active' : ''}`} onClick={() => setView('day')}>Día</button>
          <button className={`appts__view-btn ${view === 'week' ? 'appts__view-btn--active' : ''}`} onClick={() => setView('week')}>Semana</button>
          <button className={`appts__view-btn ${view === 'all' ? 'appts__view-btn--active' : ''}`} onClick={() => setView('all')}>Todo</button>
        </div>
      </div>

      {/* Day Stats (clickable filters) */}
      {view === 'day' && (
        <div className="appts__day-stats">
          <button
            className={`appts__mini-stat ${filterStatus === '' ? 'appts__mini-stat--active' : ''}`}
            onClick={() => setFilterStatus('')}
          >
            <span className="appts__mini-stat-val">{dayStats.total}</span>
            <span>Total</span>
          </button>
          <button
            className={`appts__mini-stat appts__mini-stat--green ${filterStatus === 'confirmed' ? 'appts__mini-stat--active' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'confirmed' ? '' : 'confirmed')}
          >
            <span className="appts__mini-stat-val">{dayStats.confirmed}</span>
            <span>Confirmadas</span>
          </button>
          <button
            className={`appts__mini-stat appts__mini-stat--amber ${filterStatus === 'pending' ? 'appts__mini-stat--active' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'pending' ? '' : 'pending')}
          >
            <span className="appts__mini-stat-val">{dayStats.pending}</span>
            <span>Pendientes</span>
          </button>
          <button
            className={`appts__mini-stat appts__mini-stat--emerald ${filterStatus === 'completed' ? 'appts__mini-stat--active' : ''}`}
            onClick={() => setFilterStatus(filterStatus === 'completed' ? '' : 'completed')}
          >
            <span className="appts__mini-stat-val">{dayStats.completed}</span>
            <span>Completadas</span>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="appts__filters">
        <div className="appts__search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar clienta, servicio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="appts-search"
          />
        </div>
        <div className="appts__filter-group">
          <Filter size={16} />
          {user?.role !== 'specialist' && (
            <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} id="filter-employee">
              <option value="">Todas las empleadas</option>
              {activeEmployees.map((emp) => <option key={emp} value={emp}>{emp}</option>)}
            </select>
          )}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} id="filter-status">
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Week View Header */}
      {view === 'week' && (
        <div className="appts__week-header">
          {weekDates.map((d) => {
            const dt = new Date(d + 'T12:00:00');
            const isToday = d === getToday();
            const count = appointments.filter((a) => a.date === d).length;
            return (
              <button
                key={d}
                className={`appts__week-day ${d === selectedDate ? 'appts__week-day--selected' : ''} ${isToday ? 'appts__week-day--today' : ''}`}
                onClick={() => setSelectedDate(d)}
              >
                <span className="appts__week-day-name">{dt.toLocaleDateString('es-DO', { weekday: 'short' })}</span>
                <span className="appts__week-day-num">{dt.getDate()}</span>
                {count > 0 && <span className="appts__week-day-count">{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Appointment List */}
      <div className="appts__list">
        {filteredAppointments.length === 0 ? (
          <div className="appts__empty">
            <Calendar size={40} />
            <p>No hay citas {view === 'day' ? 'para este día' : view === 'week' ? 'esta semana' : 'registradas'}</p>
          </div>
        ) : (
          filteredAppointments.map((appt) => {
            const paso = accionPrincipal(appt.status);
            return (
            <div className={`appt-card appt-card--${appt.status}`} key={appt.id}>
              <div className="appt-card__time-col">
                <span className="appt-card__time">{format12h(appt.time)}</span>
                <span className="appt-card__duration"><Clock size={12} /> {appt.duration} min</span>
              </div>

              <div className="appt-card__body" onClick={() => openEdit(appt)}>
                <div className="appt-card__top">
                  <h4 className="appt-card__client">{appt.clientName}</h4>
                  <span className={`badge appt-card__estado ${STATUS_CONFIG[appt.status].class}`}>
                    {STATUS_CONFIG[appt.status].icon}
                    {STATUS_CONFIG[appt.status].label}
                  </span>
                </div>

                {appt.services.length > 1 ? (
                  /* Varios servicios: se listan con su hora y quien lo hace,
                     porque pueden ser especialistas distintas. */
                  <div className="appt-card__services">
                    {appt.services.map((l, i) => (
                      <span className="appt-card__service-line" key={l.id ?? i}>
                        <span className="appt-card__service-time">{format12h(l.startTime)}</span>
                        <Sparkles size={12} /> {l.serviceName}
                        <span className="appt-card__service-staff"><User size={12} /> {l.employee}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="appt-card__details">
                    <span><Sparkles size={13} /> {appt.service}</span>
                    <span><User size={13} /> {appt.employee}</span>
                  </div>
                )}

                {(view === 'week' || view === 'all') && (
                  <div className="appt-card__details">
                    <span><Calendar size={13} /> {new Date(appt.date + 'T12:00:00').toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  </div>
                )}

                {appt.notes && (
                  <div className="appt-card__notes">
                    <FileText size={12} /> {appt.notes}
                  </div>
                )}
              </div>

              {/* WhatsApp y Llamar a mano; lo demás en "⋯", con Cancelar al final y separado.
                  El botón con texto es el paso que sigue según el estado (Confirmar, Llegó, Completar). */}
              <div className="appt-card__actions">
                <button
                  type="button"
                  className="appt-card__action-btn appt-card__action-btn--wa"
                  onClick={(e) => { e.stopPropagation(); handleWhatsApp(appt); }}
                  aria-label={`Enviar recordatorio por WhatsApp a ${appt.clientName}`}
                  title="Enviar recordatorio por WhatsApp"
                >
                  <MessageCircle size={18} aria-hidden="true" />
                </button>
                <a
                  href={`tel:${appt.clientPhone}`}
                  className="appt-card__action-btn"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Llamar a ${appt.clientName}`}
                  title="Llamar"
                >
                  <Phone size={18} aria-hidden="true" />
                </a>
                <MenuAcciones etiqueta={`Más acciones para la cita de ${appt.clientName}`} items={acciones.itemsDe(appt)} />
                {paso && (
                  <button
                    type="button"
                    className={`appt-card__principal appt-card__principal--${paso.accion}`}
                    onClick={(e) => { e.stopPropagation(); acciones.avanzar(appt, paso); }}
                  >
                    {ICONO_PRINCIPAL[paso.accion]}
                    {paso.etiqueta}
                  </button>
                )}
              </div>
            </div>
            );
          })
        )}
      </div>

      {savingClientFor && (
        <SaveClientModal appointment={savingClientFor} onClose={() => setSavingClientFor(null)} />
      )}

      {showBlocksModal && (
        <ScheduleBlocksModal defaultDate={selectedDate} onClose={() => setShowBlocksModal(false)} />
      )}
    </div>
  );
}
