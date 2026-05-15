import { useState } from 'react';
import {
  Phone, Search, Calendar, Clock, User, Sparkles,
  XCircle, CheckCircle2, AlertCircle, MessageCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import './MyAppointments.css';

interface AppointmentRow {
  id: string;
  client_name: string;
  client_phone: string;
  service: string;
  employee: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  notes: string | null;
  source: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendiente', color: '#f59e0b', icon: <Clock size={14} /> },
  confirmed: { label: 'Confirmada', color: '#10b981', icon: <CheckCircle2 size={14} /> },
  in_progress: { label: 'En progreso', color: '#6366f1', icon: <Sparkles size={14} /> },
  completed: { label: 'Completada', color: '#64748b', icon: <CheckCircle2 size={14} /> },
  cancelled: { label: 'Cancelada', color: '#ef4444', icon: <XCircle size={14} /> },
  no_show: { label: 'No asistió', color: '#dc2626', icon: <AlertCircle size={14} /> },
};

function canCancel(dateStr: string, timeStr: string): boolean {
  const apptDate = new Date(`${dateStr}T${timeStr}`);
  return apptDate.getTime() - Date.now() > 12 * 60 * 60 * 1000;
}

function isPast(dateStr: string, timeStr: string): boolean {
  return new Date(`${dateStr}T${timeStr}`) < new Date();
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-DO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function MyAppointments() {
  const [phone, setPhone] = useState('');
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone) return;

    setLoading(true);
    setSearched(true);

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('client_phone', cleanPhone)
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (error) {
      console.error('[my-appointments] search error:', error);
      toast.error('Error al buscar tus citas. Intenta de nuevo.');
    } else if (data && data.length > 0) {
      setAppointments(data as AppointmentRow[]);
      setClientName(data[0].client_name);
    } else {
      setAppointments([]);
      setClientName('');
    }

    setLoading(false);
  };

  const handleCancel = async (id: string) => {
    setConfirmCancelId(id);
  };

  const confirmCancel = async () => {
    const id = confirmCancelId;
    if (!id) return;
    setConfirmCancelId(null);
    setCancellingId(id);

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('client_phone', phone.trim()); // Safety: only cancel if phone matches

    if (error) {
      console.error('[my-appointments] cancel error:', error);
      toast.error(
        'No se pudo cancelar la cita. Por favor contáctanos por WhatsApp para ayudarte.'
      );
    } else {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a))
      );
      toast.success('Cita cancelada correctamente.');
    }

    setCancellingId(null);
  };

  const upcoming = appointments.filter(
    (a) =>
      !isPast(a.date, a.time) &&
      a.status !== 'cancelled' &&
      a.status !== 'completed' &&
      a.status !== 'no_show'
  );
  const past = appointments.filter(
    (a) =>
      isPast(a.date, a.time) ||
      a.status === 'cancelled' ||
      a.status === 'completed' ||
      a.status === 'no_show'
  );

  return (
    <section className="my-appts" id="mis-citas">
      <Toaster position="top-center" />
      <div className="my-appts__inner">
        <span className="section-tag">Mis Citas</span>
        <h2 className="my-appts__title">
          Consulta tus <span className="gradient-text">citas</span>
        </h2>
        <p className="my-appts__subtitle">
          Ingresa tu número de teléfono para ver tus próximas citas y tu historial.
        </p>

        {/* Search */}
        <form className="my-appts__search glass" onSubmit={handleSearch} id="track-form">
          <div className="my-appts__search-input">
            <Phone size={18} />
            <input
              type="tel"
              placeholder="Tu número de teléfono (ej. 829-555-1001)"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              required
              id="track-phone"
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            id="track-submit"
          >
            <Search size={16} />
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {/* Results */}
        {searched && !loading && (
          <div className="my-appts__results animate-fade-up">
            {appointments.length === 0 ? (
              <div className="my-appts__empty">
                <AlertCircle size={40} />
                <h3>No encontramos citas</h3>
                <p>
                  No hay citas registradas con el número <strong>{phone}</strong>. Si crees que es
                  un error, contáctanos por WhatsApp.
                </p>
                <a
                  href={`https://wa.me/18293224014?text=${encodeURIComponent(
                    `Hola, no encuentro mis citas con el número ${phone}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ marginTop: 16 }}
                >
                  <MessageCircle size={16} /> Contactar por WhatsApp
                </a>
              </div>
            ) : (
              <>
                <div className="my-appts__welcome">
                  <h3>¡Hola, {clientName}! 👋</h3>
                  <p>
                    {upcoming.length} cita{upcoming.length !== 1 ? 's' : ''} próxima
                    {upcoming.length !== 1 ? 's' : ''} · {past.length} en historial
                  </p>
                </div>

                {/* Upcoming */}
                {upcoming.length > 0 && (
                  <div className="my-appts__section">
                    <h4 className="my-appts__section-title">
                      <Calendar size={16} /> Próximas Citas
                    </h4>
                    <div className="my-appts__list">
                      {upcoming.map((a) => {
                        const st = STATUS_LABELS[a.status] ?? STATUS_LABELS.pending;
                        const cancelable = canCancel(a.date, a.time);
                        return (
                          <div
                            className={`my-appt-card my-appt-card--upcoming my-appt-card--${a.status}`}
                            key={a.id}
                          >
                            <div className="my-appt-card__date-col">
                              <span className="my-appt-card__day">
                                {new Date(`${a.date}T12:00:00`).getDate()}
                              </span>
                              <span className="my-appt-card__month">
                                {new Date(`${a.date}T12:00:00`).toLocaleDateString('es-DO', {
                                  month: 'short',
                                })}
                              </span>
                            </div>
                            <div className="my-appt-card__info">
                              <strong>{a.service}</strong>
                              <span>
                                <User size={13} /> {a.employee}
                              </span>
                              <span>
                                <Clock size={13} /> {a.time?.slice(0, 5)} · {a.duration} min
                              </span>
                              <span className="my-appt-card__full-date">
                                {formatDate(a.date)}
                              </span>
                            </div>
                            <div className="my-appt-card__right">
                              <span
                                className="my-appt-card__status"
                                style={{ background: `${st.color}18`, color: st.color }}
                              >
                                {st.icon} {st.label}
                              </span>
                              {cancelable && a.status !== 'cancelled' && (
                                <button
                                  className="my-appt-card__cancel"
                                  onClick={() => handleCancel(a.id)}
                                  disabled={cancellingId === a.id}
                                  id={`cancel-${a.id}`}
                                >
                                  <XCircle size={14} />
                                  {cancellingId === a.id ? 'Cancelando...' : 'Cancelar Cita'}
                                </button>
                              )}
                              {!cancelable && a.status !== 'cancelled' && (
                                <span className="my-appt-card__no-cancel">
                                  <AlertCircle size={12} /> No cancelable (menos de 12h)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* History */}
                {past.length > 0 && (
                  <div className="my-appts__section">
                    <h4 className="my-appts__section-title">
                      <Clock size={16} /> Historial
                    </h4>
                    <div className="my-appts__list">
                      {past.map((a) => {
                        const st = STATUS_LABELS[a.status] ?? STATUS_LABELS.completed;
                        return (
                          <div
                            className={`my-appt-card my-appt-card--past my-appt-card--${a.status}`}
                            key={a.id}
                          >
                            <div className="my-appt-card__date-col my-appt-card__date-col--past">
                              <span className="my-appt-card__day">
                                {new Date(`${a.date}T12:00:00`).getDate()}
                              </span>
                              <span className="my-appt-card__month">
                                {new Date(`${a.date}T12:00:00`).toLocaleDateString('es-DO', {
                                  month: 'short',
                                })}
                              </span>
                            </div>
                            <div className="my-appt-card__info">
                              <strong>{a.service}</strong>
                              <span>
                                <User size={13} /> {a.employee}
                              </span>
                              <span>
                                <Clock size={13} /> {a.time?.slice(0, 5)} · {a.duration} min
                              </span>
                            </div>
                            <div className="my-appt-card__right">
                              <span
                                className="my-appt-card__status"
                                style={{ background: `${st.color}18`, color: st.color }}
                              >
                                {st.icon} {st.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div