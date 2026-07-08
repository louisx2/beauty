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
import { useClientStore } from '../../store/clientStore';
import ClientAutocomplete from '../../components/ClientAutocomplete';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Phone,
  MessageCircle,
  X,
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
  Edit2,
  CalendarClock,
  Trash2,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format12h } from '../../lib/timeFormat';
import { notifyStatusChange } from '../../lib/whatsapp';
import SaveClientModal from '../../components/SaveClientModal';
import './Appointments.css';

//  Formatters & validators 
function capitalizeName(val: string) {
  return val.replace(/\b\w/g, (c) => c.toUpperCase());
}
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
interface ApptErrors {
  clientName?: string;
  clientPhone?: string;
  service?: string;
  employee?: string;
  date?: string;
}
function validateAppt(form: typeof emptyForm, isEditing: boolean): ApptErrors {
  const e: ApptErrors = {};
  if (!form.clientName.trim()) e.clientName = 'El nombre es requerido';
  if (!form.clientPhone.trim()) {
    e.clientPhone = 'El teléfono es requerido';
  } else if (form.clientPhone.replace(/\D/g, '').length < 10) {
    e.clientPhone = 'Teléfono inválido (10 dígitos)';
  }
  if (!form.service) e.service = 'Selecciona un servicio';
  if (!form.employee) e.employee = 'Selecciona una empleada';
  if (!form.date) {
    e.date = 'La fecha es requerida';
  } else if (!isEditing && form.date < getToday()) {
    e.date = 'No puedes agendar citas en fechas pasadas';
  }
  return e;
}

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; class: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendiente', class: 'badge--amber', icon: <AlertCircle size={14} /> },
  confirmed: { label: 'Confirmada', class: 'badge--green', icon: <CheckCircle2 size={14} /> },
  in_progress: { label: 'En Proceso', class: 'badge--blue', icon: <PlayCircle size={14} /> },
  completed: { label: 'Completada', class: 'badge--emerald', icon: <CheckCircle2 size={14} /> },
  cancelled: { label: 'Cancelada', class: 'badge--red', icon: <XCircle size={14} /> },
  no_show: { label: 'No Asistio', class: 'badge--gray', icon: <Ban size={14} /> },
};

const STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
  no_show: [],
};

const ALL_HOURS = Array.from({ length: 11 }, (_, i) => {
  const h = i + 8;
  return `${String(h).padStart(2, '0')}:00`;
}).flatMap((h) => [h, h.replace(':00', ':30')]);

function getAvailableHours(dateStr: string): string[] {
  const today = new Date().toISOString().split('T')[0];
  if (dateStr !== today) return ALL_HOURS;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return ALL_HOURS.filter((h) => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + mm > nowMinutes;
  });
}

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

const emptyForm: Omit<Appointment, 'id' | 'createdAt'> = {
  client_id: null,
  clientName: '',
  clientPhone: '',
  service: '',
  employee: '',
  date: getToday(),
  time: '09:00',
  duration: 45,
  status: 'pending',
  notes: '',
  source: 'manual',
};

export default function Appointments() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    appointments, 
    fetchAppointments,
    addAppointment, 
    updateAppointment, 
    updateStatus, 
    deleteAppointment,
    autoMarkNoShow 
  } = useAppointmentStore();
  const { staff, fetchStaff } = useStaffStore();
  const { services, fetchAll: fetchServices } = useServiceStore();
  const { clients, fetchClients } = useClientStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchAppointments().then(() => autoMarkNoShow());
    fetchStaff();
    fetchServices();
    fetchClients();
  }, [fetchAppointments, autoMarkNoShow, fetchStaff, fetchServices, fetchClients]);

  const activeEmployees = useMemo(() => staff.filter((m) => m.active && m.role === 'specialist').map((m) => m.name), [staff]);
  const activeServices = useMemo(() => services.filter((s) => s.active).map((s) => s.name), [services]);

  const [selectedDate, setSelectedDate] = useState(getToday());
  const [view, setView] = useState<'day' | 'week' | 'all'>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [apptErrors, setApptErrors] = useState<ApptErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null);
  const [savingClientFor, setSavingClientFor] = useState<Appointment | null>(null);

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

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, date: selectedDate });
    setApptErrors({});
    setShowModal(true);
  };

  const openEdit = (appt: Appointment) => {
    setEditingId(appt.id);
    setForm({
      client_id: appt.client_id || null,
      clientName: appt.clientName,
      clientPhone: appt.clientPhone,
      service: appt.service,
      employee: appt.employee,
      date: appt.date,
      time: appt.time,
      duration: appt.duration,
      status: appt.status,
      notes: appt.notes,
      source: appt.source,
    });
    setApptErrors({});
    setShowModal(true);
  };

  // Highlight and open appointment from notification query parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlightId = params.get('highlight');
    if (highlightId && appointments.length > 0) {
      const appt = appointments.find((a) => a.id === highlightId);
      if (appt) {
        setView('day');
        setSelectedDate(appt.date);
        openEdit(appt);
        navigate('/admin/citas', { replace: true });
      }
    }
  }, [location.search, appointments, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateAppt(form, !!editingId);
    if (Object.keys(errs).length > 0) { setApptErrors(errs); return; }
    setSubmitting(true);
    try {
      const payload = { ...form, clientName: form.clientName.trim(), clientPhone: form.clientPhone.trim() };
      if (editingId) {
        const original = appointments.find((a) => a.id === editingId);
        if (original && (original.date !== payload.date || original.time !== payload.time)) {
          if (!window.confirm(`¿Estás segura de que deseas mover la cita a la nueva fecha y hora (${formatDate(payload.date)} a las ${format12h(payload.time)})?`)) {
            setSubmitting(false);
            return;
          }
        }
        const ok = await updateAppointment(editingId, payload);
        if (ok) {
          toast.success('Cita actualizada correctamente');
          setShowModal(false);
        } else {
          toast.error('No se pudo actualizar la cita. Intenta de nuevo.');
        }
      } else {
        const created = await addAppointment(payload);
        if (created) {
          toast.success('Cita creada correctamente');
          setShowModal(false);
        } else {
          toast.error('No se pudo crear la cita. Intenta de nuevo.');
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Ocurrio un error inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsApp = (appt: Appointment) => {
    const phone = appt.clientPhone.replace(/[^0-9]/g, '');
    const msg = `Hola ${appt.clientName}, le recordamos su cita:\n\n Fecha: ${formatDate(appt.date)}\n Hora: ${format12h(appt.time)}\n Servicio: ${appt.service}\n\nLa esperamos en Anadsll Beauty Esthetic!`;
    window.open(`https://wa.me/1${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleReschedule = (appt: Appointment) => {
    if (!window.confirm(`¿Estás segura de que deseas reprogramar (mover) la cita de ${appt.clientName}?`)) return;
    setEditingId(appt.id);
    setForm({
      client_id: appt.client_id || null,
      clientName: appt.clientName,
      clientPhone: appt.clientPhone,
      service: appt.service,
      employee: appt.employee,
      date: appt.date,
      time: appt.time,
      duration: appt.duration,
      status: appt.status,
      notes: appt.notes,
      source: appt.source,
    });
    setShowModal(true);
  };

  const handleCancel = (appt: Appointment) => {
    if (appt.status === 'cancelled' || appt.status === 'completed') return;
    if (!window.confirm(`¿Estás segura de que deseas cancelar la cita de ${appt.clientName}?`)) return;
    updateStatus(appt.id, 'cancelled');
    notifyStatusChange(appt, 'cancelled');
  };

  return (
    <div className="appts">
      {/* Header */}
      <div className="appts__header">
        <div>
          <h1 className="appts__title">Gestion de Citas</h1>
          <p className="appts__subtitle">Agenda y administra todas las citas del salon</p>
        </div>
        {user?.role !== 'specialist' && (
          <button className="appts__add-btn" onClick={openCreate} id="btn-new-appointment">
            <Plus size={18} /> Nueva Cita
          </button>
        )}
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
            <span className="appts__current-date" style={{ marginLeft: 0 }}>Todas las Fechas</span>
          )}
        </div>

        <div className="appts__view-toggle">
          <button className={`appts__view-btn ${view === 'day' ? 'appts__view-btn--active' : ''}`} onClick={() => setView('day')}>Da</button>
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
            <p>No hay citas {view === 'day' ? 'para este da' : view === 'week' ? 'esta semana' : 'registradas'}</p>
          </div>
        ) : (
          filteredAppointments.map((appt) => (
            <div className={`appt-card appt-card--${appt.status}`} key={appt.id}>
              <div className="appt-card__time-col">
                <span className="appt-card__time">{format12h(appt.time)}</span>
                <span className="appt-card__duration"><Clock size={12} /> {appt.duration} min</span>
              </div>

              <div className="appt-card__body" onClick={() => openEdit(appt)}>
                <div className="appt-card__top">
                  <h4 className="appt-card__client">{appt.clientName}</h4>
                  <div className="appt-card__status-wrap" style={{ position: 'relative' }}>
                    <button
                      className={`badge ${STATUS_CONFIG[appt.status].class}`}
                      onClick={(e) => { e.stopPropagation(); setShowStatusMenu(showStatusMenu === appt.id ? null : appt.id); }}
                      id={`status-btn-${appt.id}`}
                    >
                      {STATUS_CONFIG[appt.status].icon}
                      {STATUS_CONFIG[appt.status].label}
                    </button>

                    {showStatusMenu === appt.id && STATUS_TRANSITIONS[appt.status].length > 0 && (
                      <div className="appt-card__status-menu" onClick={(e) => e.stopPropagation()}>
                        {STATUS_TRANSITIONS[appt.status].map((s) => (
                          <button
                            key={s}
                            className="appt-card__status-option"
                            onClick={() => {
                              if (s === 'cancelled' && !window.confirm(`¿Estás segura de que deseas cancelar la cita de ${appt.clientName}?`)) return;
                              updateStatus(appt.id, s);
                              setShowStatusMenu(null);
                              notifyStatusChange(appt, s);
                            }}
                          >
                            {STATUS_CONFIG[s].icon}
                            {STATUS_CONFIG[s].label}
                          </button>
                        ))}
                        {!appt.client_id && user?.role !== 'specialist' && (
                          <button className="status-menu__item" onClick={() => { setSavingClientFor(appt); setShowStatusMenu(null); }} style={{ color: '#60a5fa', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 8 }}>
                            <Save size={16} /> Guardar Clienta
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="appt-card__details">
                  <span><Sparkles size={13} /> {appt.service}</span>
                  <span><User size={13} /> {appt.employee}</span>
                  {(view === 'week' || view === 'all') && <span><Calendar size={13} /> {new Date(appt.date + 'T12:00:00').toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' })}</span>}
                </div>

                {appt.notes && (
                  <div className="appt-card__notes">
                    <FileText size={12} /> {appt.notes}
                  </div>
                )}
              </div>

              <div className="appt-card__actions">
                <button
                  className="appt-card__action-btn appt-card__action-btn--wa"
                  onClick={(e) => { e.stopPropagation(); handleWhatsApp(appt); }}
                  title="Enviar recordatorio por WhatsApp"
                >
                  <MessageCircle size={16} />
                </button>
                <a
                  href={`tel:${appt.clientPhone}`}
                  className="appt-card__action-btn"
                  onClick={(e) => e.stopPropagation()}
                  title="Llamar"
                >
                  <Phone size={16} />
                </a>
                {appt.status === 'confirmed' && (
                  <>
                    <button
                      className="appt-card__action-btn appt-card__action-btn--success"
                      onClick={(e) => { e.stopPropagation(); updateStatus(appt.id, 'in_progress'); }}
                      title="Llego / Iniciar"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <button
                      className="appt-card__action-btn appt-card__action-btn--dianger"
                      onClick={(e) => { e.stopPropagation(); updateStatus(appt.id, 'no_show'); notifyStatusChange(appt, 'no_show'); }}
                      title="No Asistio"
                    >
                      <Ban size={16} />
                    </button>
                  </>
                )}
                {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                  <>
                    <button
                      className="appt-card__action-btn appt-card__action-btn--reschedule"
                      onClick={(e) => { e.stopPropagation(); handleReschedule(appt); }}
                      title="Mover / Reprogramar"
                    >
                      <CalendarClock size={16} />
                    </button>
                    <button
                      className="appt-card__action-btn appt-card__action-btn--cancel"
                      onClick={(e) => { e.stopPropagation(); handleCancel(appt); }}
                      title="Cancelar Cita"
                    >
                      <XCircle size={16} />
                    </button>
                  </>
                )}
                <button
                  className="appt-card__action-btn"
                  onClick={(e) => { e.stopPropagation(); openEdit(appt); }}
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Create/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setApptErrors({}); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingId ? 'Editar Cita' : 'Nueva Cita'}</h2>
              <button className="modal__close" onClick={() => { setShowModal(false); setApptErrors({}); }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal__form" id="appointment-form" noValidate>
              <div className="modal__row">
                <div className="modal__field">
                  <label><User size={14} /> Nombre de la Clienta *</label>
                  <ClientAutocomplete
                    clients={clients}
                    value={form.clientName}
                    onChange={(text) => {
                      setForm({ ...form, clientName: capitalizeName(text), client_id: null });
                      setApptErrors({ ...apptErrors, clientName: undefined });
                    }}
                    onSelect={(c) => {
                      setForm({ ...form, clientName: c.name, clientPhone: c.phone, client_id: c.id });
                      setApptErrors({ ...apptErrors, clientName: undefined, clientPhone: undefined });
                    }}
                    required
                  />
                  {apptErrors.clientName && <span className="field-error"><AlertCircle size={12} /> {apptErrors.clientName}</span>}
                </div>
                <div className="modal__field">
                  <label><Phone size={14} /> Telfono *</label>
                  <input
                    type="tel"
                    placeholder="829-000-0000"
                    value={form.clientPhone}
                    maxLength={12}
                    className={apptErrors.clientPhone ? 'input--error' : ''}
                    onChange={(e) => { setForm({ ...form, clientPhone: formatPhone(e.target.value) }); setApptErrors({ ...apptErrors, clientPhone: undefined }); }}
                  />
                  {apptErrors.clientPhone && <span className="field-error"><AlertCircle size={12} /> {apptErrors.clientPhone}</span>}
                </div>
              </div>

              <div className="modal__field">
                <label><Sparkles size={14} /> Servicio *</label>
                <select value={form.service} className={apptErrors.service ? 'input--error' : ''} onChange={(e) => { setForm({ ...form, service: e.target.value }); setApptErrors({ ...apptErrors, service: undefined }); }}>
                  <option value="">Seleccionar servicio</option>
                  {activeServices.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {apptErrors.service && <span className="field-error"><AlertCircle size={12} /> {apptErrors.service}</span>}
              </div>

              <div className="modal__field">
                <label><User size={14} /> Empleada *</label>
                <select value={form.employee} className={apptErrors.employee ? 'input--error' : ''} onChange={(e) => { setForm({ ...form, employee: e.target.value }); setApptErrors({ ...apptErrors, employee: undefined }); }}>
                  <option value="">Seleccionar empleada</option>
                  {activeEmployees.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                {apptErrors.employee && <span className="field-error"><AlertCircle size={12} /> {apptErrors.employee}</span>}
              </div>

              <div className="modal__row">
                <div className="modal__field">
                  <label><Calendar size={14} /> Fecha *</label>
                  <input
                    type="date"
                    value={form.date}
                    min={editingId ? undefined : getToday()}
                    className={apptErrors.date ? 'input--error' : ''}
                    onChange={(e) => { setForm({ ...form, date: e.target.value }); setApptErrors({ ...apptErrors, date: undefined }); }}
                  />
                  {apptErrors.date && <span className="field-error"><AlertCircle size={12} /> {apptErrors.date}</span>}
                </div>
                <div className="modal__field">
                  <label><Clock size={14} /> Hora</label>
                  <select value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>
                    {getAvailableHours(form.date).map((h) => <option key={h} value={h}>{format12h(h)}</option>)}
                  </select>
                </div>
                <div className="modal__field">
                  <label><Clock size={14} /> Duracin</label>
                  <select value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>120 min</option>
                  </select>
                </div>
              </div>

              <div className="modal__field">
                <label><FileText size={14} /> Notas</label>
                <textarea
                  placeholder="Observaciones, alergias, sesin #..."
                  rows={3}
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="modal__actions">
                {editingId && user?.role !== 'specialist' && (
                  <button
                    type="button"
                    className="modal__delete-btn"
                    onClick={async () => {
                      if (!window.confirm('Eliminar esta cita permanentemente?')) return;
                      const ok = await deleteAppointment(editingId);
                      if (ok) {
                        toast.success('Cita eliminada');
                        setShowModal(false);
                      } else {
                        toast.error('No se pudo eliminar. Intenta de nuevo.');
                      }
                    }}
                  >
                    Eliminar Cita
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <button type="button" className="modal__cancel-btn" onClick={() => { setShowModal(false); setApptErrors({}); }}>Cancelar</button>
                <button type="submit" className="modal__submit-btn" id="appointment-submit" disabled={submitting}>
                  {submitting ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {savingClientFor && (
        <SaveClientModal appointment={savingClientFor} onClose={() => setSavingClientFor(null)} />
      )}
    </div>
  );
}
