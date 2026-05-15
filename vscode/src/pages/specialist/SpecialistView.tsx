import { useMemo, useEffect, useState } from 'react';
import { useAppointmentStore, type Appointment } from '../../store/appointmentStore';
import { useAuthStore } from '../../store/authStore';
import {
  Play, CheckCircle2, Clock, Phone, CalendarDays,
  Sparkles, User, RefreshCw, X, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import './SpecialistView.css';

const STATUS_LABELS: Record<string, string> = {
  pending:     'Pendiente',
  confirmed:   'Confirmada',
  in_progress: 'En Curso',
  completed:   'Completada',
  cancelled:   'Cancelada',
  no_show:     'No Asistió',
};

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function waLink(phone: string, name: string): string {
  const p = phone.replace(/[^0-9]/g, '');
  const normalized = p.startsWith('1') ? p : '1' + p;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(`Hola ${name} 👋`)}`;
}

function minutesUntil(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  const apptMinutes = h * 60 + m;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return apptMinutes - nowMinutes;
}

export default function SpecialistView() {
  const { appointments, fetchAppointments, updateStatus, updateAppointment } = useAppointmentStore();
  const { user } = useAuthStore();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
    const iv = setInterval(fetchAppointments, 60_000);
    return () => clearInterval(iv);
  }, [fetchAppointments]);

  const today = new Date().toISOString().split('T')[0];
  const todayLabel = new Date().toLocaleDateString('es-DO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  // All appointments for this specialist
  const myAppts = useMemo(() =>
    appointments
      .filter((a) => a.employee.toLowerCase() === (user?.name ?? '').toLowerCase())
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [appointments, user?.name]
  );

  const todayAppts = useMemo(() => myAppts.filter((a) => a.date === today), [myAppts, today]);

  const inProgress = useMemo(() =>
    todayAppts.find((a) => a.status === 'in_progress') ?? null,
    [todayAppts]
  );

  const queue = useMemo(() =>
    todayAppts.filter((a) => a.status === 'pending' || a.status === 'confirmed'),
    [todayAppts]
  );

  const nextUp = queue[0] ?? null;

  const completedToday = useMemo(() =>
    todayAppts.filter((a) => a.status === 'completed').length,
    [todayAppts]
  );

  const futureAppts = useMemo(() =>
    myAppts.filter((a) => a.date > today && (a.status === 'pending' || a.status === 'confirmed')),
    [myAppts, today]
  );

  // ── Actions ─────────────────────────────────────────────────────

  async function handleStart(id: string) {
    setLoadingId(id);
    const ok = await updateStatus(id, 'in_progress');
    setLoadingId(null);
    if (ok) toast.success('¡Servicio iniciado!');
    else toast.error('Error al iniciar el servicio');
  }

  function openCompleteFlow(appt: Appointment) {
    setCompletingId(appt.id);
    setNoteText(appt.notes ?? '');
  }

  async function confirmComplete(appt: Appointment) {
    setLoadingId(appt.id);
    if (noteText.trim() !== (appt.notes ?? '').trim()) {
      await updateAppointment(appt.id, { notes: noteText.trim() });
    }
    const ok = await updateStatus(appt.id, 'completed');
    setLoadingId(null);
    setCompletingId(null);
    setNoteText('');
    if (ok) toast.success('✅ Servicio marcado como completado');
    else toast.error('Error al completar el servicio');
  }

  // ── Next appointment countdown ───────────────────────────────────
  const nextMinutes = nextUp ? minutesUntil(nextUp.time) : null;

  return (
    <div className="spec-view">

      {/* ── Header ── */}
      <div className="spec-view__header">
        <div>
          <h1 className="spec-view__greeting">
            {timeGreeting()}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="spec-view__date">{todayLabel}</p>
        </div>
        <div className="spec-view__stats">
          <div className="spec-view__stat spec-view__stat--green">
            <CheckCircle2 size={15} />
            <span><strong>{completedToday}</strong> completadas</span>
          </div>
          <div className="spec-view__stat spec-view__stat--amber">
            <Clock size={15} />
            <span><strong>{queue.length}</strong> en cola</span>
          </div>
          {todayAppts.length > 0 && (
            <div className="spec-view__stat">
              <CalendarDays size={15} />
              <span><strong>{todayAppts.length}</strong> hoy</span>
            </div>
          )}
          <button
            className="spec-view__refresh"
            onClick={fetchAppointments}
            title="Actualizar citas"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── Countdown banner ── */}
      {nextMinutes !== null && nextMinutes > 0 && nextMinutes <= 15 && (
        <div className="spec-view__countdown">
          <AlertCircle size={16} />
          Tu próxima cita ({nextUp!.clientName}) comienza en <strong>{nextMinutes} minuto{nextMinutes !== 1 ? 's' : ''}</strong>
        </div>
      )}

      {/* ── EN CURSO card ── */}
      {inProgress && (
        <div className="spec-card spec-card--inprogress">
          <div className="spec-card__badge">
            <span className="spec-card__dot spec-card__dot--pulse" />
            En Curso Ahora
          </div>

          <div className="spec-card__body">
            <div className="spec-card__service">
              <Sparkles size={22} />
              {inProgress.service}
            </div>
            <div className="spec-card__client">
              <User size={16} />
              {inProgress.clientName}
            </div>
            <div className="spec-card__meta">
              <Clock size={14} />
              {inProgress.time} · {inProgress.duration} min
              {inProgress.clientPhone && (
                <a
                  href={waLink(inProgress.clientPhone, inProgress.clientName)}
                  target="_blank"
                  rel="noreferrer"
                  className="spec-card__phone"
                >
                  <Phone size={13} />
                  {inProgress.clientPhone}
                </a>
              )}
            </div>
            {inProgress.notes && (
              <div className="spec-card__notes">
                📋 {inProgress.notes}
              </div>
            )}
          </div>

          {/* Complete flow */}
          <div className="spec-card__actions">
            {completingId === inProgress.id ? (
              <div className="spec-card__confirm-wrap">
                <textarea
                  className="spec-card__notes-input"
                  placeholder="Observaciones del servicio (opcional)..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  autoFocus
                />
                <div className="spec-card__confirm-btns">
                  <button
                    className="spec-card__btn spec-card__btn--complete"
                    onClick={() => confirmComplete(inProgress)}
                    disabled={!!loadingId}
                  >
                    <CheckCircle2 size={16} />
                    {loadingId === inProgress.id ? 'Guardando…' : 'Confirmar Completado'}
                  </button>
                  <button
                    className="spec-card__btn spec-card__btn--dismiss"
                    onClick={() => setCompletingId(null)}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="spec-card__btn spec-card__btn--complete"
                onClick={() => openCompleteFlow(inProgress)}
                disabled={!!loadingId}
              >
                <CheckCircle2 size={16} />
                Marcar como Completado
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── SIGUIENTE card ── */}
      {nextUp && (
        <div className="spec-card spec-card--next">
          <div className="spec-card__badge spec-card__badge--next">
            {inProgress ? 'Próxima en cola' : '↑ Siguiente en cola'}
          </div>

          <div className="spec-card__body">
            <div className="spec-card__service">
              <Sparkles size={22} />
              {nextUp.service}
            </div>
            <div className="spec-card__client">
              <User size={16} />
              {nextUp.clientName}
            </div>
            <div className="spec-card__meta">
              <Clock size={14} />
              {nextUp.time} · {nextUp.duration} min
              {nextMinutes !== null && nextMinutes > 0 && (
                <span className="spec-card__countdown-chip">
                  en {nextMinutes} min
                </span>
              )}
              {nextMinutes !== null && nextMinutes <= 0 && (
                <span className="spec-card__countdown-chip spec-card__countdown-chip--now">
                  ¡Ahora!
                </span>
              )}
              {nextUp.clientPhone && (
                <a
                  href={waLink(nextUp.clientPhone, nextUp.clientName)}
                  target="_blank"
                  rel="noreferrer"
                  className="spec-card__phone"
                >
                  <Phone size={13} />
                  {nextUp.clientPhone}
                </a>
              )}
            </div>
            {nextUp.notes && (
              <div className="spec-card__notes">📋 {nextUp.notes}</div>
            )}
          </div>

          <div className="spec-card__actions">
            <button
              className="spec-card__btn spec-card__btn--start"
              onClick={() => handleStart(nextUp.id)}
              disabled={!!inProgress || !!loadingId}
              title={inProgress ? 'Completa el servicio en curso primero' : ''}
            >
              <Play size={16} />
              {inProgress
                ? 'Completa el servicio actual primero'
                : (loadingId === nextUp.id ? 'Iniciando…' : 'Iniciar Servicio')}
            </button>
          </div>
        </div>
      )}

      {/* ── No appointments today ── */}
      {todayAppts.length === 0 && (
        <div className="spec-view__empty">
          <CalendarDays size={44} />
          <p>No tienes citas asignadas para hoy</p>
          {futureAppts.length > 0 && (
            <span>Tienes {futureAppts.length} cita{futureAppts.length !== 1 ? 's' : ''} próxima{futureAppts.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      )}

      {/* ── Agenda del día ── */}
      {todayAppts.length > 0 && (
        <div className="spec-section">
          <h2 className="spec-section__title">
            <CalendarDays size={16} />
            Agenda de Hoy · {todayAppts.length} cita{todayAppts.length !== 1 ? 's' : ''}
          </h2>
          <div className="spec-list">
            {todayAppts.map((a) => {
              const isDone = ['completed', 'cancelled', 'no_show'].includes(a.status);
              const isActive = a.status === 'in_progress';
              const canStart = (a.status === 'pending' || a.status === 'confirmed') && !inProgress;
              const mins = (a.status === 'pending' || a.status === 'confirmed') ? minutesUntil(a.time) : null;

              return (
                <div
                  key={a.id}
                  className={[
                    'spec-list-item',
                    isActive ? 'spec-list-item--active' : '',
                    isDone  ? 'spec-list-item--done'   : '',
                  ].join(' ')}
                >
                  <div className="spec-list-item__time">{a.time}</div>

                  <div className={`spec-list-item__dot spec-list-item__dot--${a.status}`} />

                  <div className="spec-list-item__info">
                    <strong>{a.clientName}</strong>
                    <span>
                      {a.service} · {a.duration} min
                      {mins !== null && mins > 0 && mins <= 30 && (
                        <em className="spec-list-item__soon"> — en {mins} min</em>
                      )}
                    </span>
                  </div>

                  <span className={`spec-list-item__status spec-list-item__status--${a.status}`}>
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>

                  {canStart && (
                    <button
                      className="spec-list-item__btn"
                      onClick={() => handleStart(a.id)}
                      disabled={!!loadingId}
                    >
                      <Play size={12} />
                      Iniciar
                    </button>
                  )}

                  {isActive && !completingId && (
                    <button
                      className="spec-list-item__btn spec-list-item__btn--complete"
                      onClick={() => openCompleteFlow(a)}
                      disabled={!!loadingId}
                    >
                      <CheckCircle2 size={12} />
                      Completar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Próximas citas (future days) ── */}
      {futureAppts.length > 0 && (
        <div className="spec-section">
          <h2 className="spec-section__title">
            <CalendarDays size={16} />
            Próximas Citas
          </h2>
          <div className="spec-list">
            {futureAppts.slice(0, 12).map((a) => {
              const dateLabel = new Date(a.date + 'T12:00:00').toLocaleDateString('es-DO', {
                weekday: 'short', day: 'numeric', month: 'short',
              });
              return (
                <div key={a.id} className="spec-list-item">
                  <div className="spec-list-item__time">
                    <span>{dateLabel}</span>
                    <span className="spec-list-item__time-sub">{a.time}</span>
                  </div>
                  <div className={`spec-list-item__dot spec-list-item__dot--${a.status}`} />
                  <div className="spec-list-item__info">
                    <strong>{a.clientName}</strong>
                    <span>{a.service} · {a.duration} min</span>
                  </div>
                  <span className={`spec-list-item__status spec-list-item__status--${a.status}`}>
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
