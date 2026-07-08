import { useMemo, useEffect, useState } from 'react';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useServiceStore } from '../../store/serviceStore';
import { useStaffStore } from '../../store/staffStore';
import { useAuthStore } from '../../store/authStore';
import {
  BarChart3, CheckCircle2, XCircle, AlertCircle, CalendarDays,
  Sparkles, DollarSign, Percent, Clock,
} from 'lucide-react';
import { format12h } from '../../lib/timeFormat';
import './MyReports.css';

type Period = 'day' | 'week' | 'month';

function fmtPrice(p: number) {
  return `RD$ ${Math.round(p).toLocaleString('es-DO')}`;
}

function getToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Semana actual de lunes a domingo
function getWeekDates(): string[] {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const temp = new Date(monday);
    temp.setDate(monday.getDate() + i);
    const y = temp.getFullYear();
    const m = String(temp.getMonth() + 1).padStart(2, '0');
    const dayStr = String(temp.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${dayStr}`);
  }
  return dates;
}

const PERIOD_LABELS: Record<Period, string> = {
  day: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
};

export default function MyReports() {
  const { appointments, fetchAppointments } = useAppointmentStore();
  const { services, fetchAll: fetchServices } = useServiceStore();
  const { staff, fetchStaff } = useStaffStore();
  const { user } = useAuthStore();

  const [period, setPeriod] = useState<Period>('week');

  useEffect(() => {
    fetchAppointments();
    fetchServices();
    fetchStaff();
  }, [fetchAppointments, fetchServices, fetchStaff]);

  const myName = user?.name ?? '';

  const me = useMemo(
    () => staff.find((s) => s.name.toLowerCase() === myName.toLowerCase()) ?? null,
    [staff, myName]
  );

  // Solo mis citas (el servidor ya limita los datos, esto cubre el caso admin)
  const myAppts = useMemo(
    () => appointments.filter((a) => a.employee.toLowerCase() === myName.toLowerCase()),
    [appointments, myName]
  );

  const periodAppts = useMemo(() => {
    const today = getToday();
    if (period === 'day') return myAppts.filter((a) => a.date === today);
    if (period === 'week') {
      const dates = getWeekDates();
      return myAppts.filter((a) => dates.includes(a.date));
    }
    const month = today.slice(0, 7);
    return myAppts.filter((a) => a.date.startsWith(month));
  }, [myAppts, period]);

  const completed = useMemo(
    () => periodAppts
      .filter((a) => a.status === 'completed')
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)),
    [periodAppts]
  );

  const stats = useMemo(() => ({
    completed: completed.length,
    cancelled: periodAppts.filter((a) => a.status === 'cancelled').length,
    noShow: periodAppts.filter((a) => a.status === 'no_show').length,
    upcoming: periodAppts.filter((a) => a.status === 'pending' || a.status === 'confirmed').length,
  }), [periodAppts, completed]);

  // Ingresos generados por mis servicios completados (precio de catálogo)
  const revenue = useMemo(
    () => completed.reduce((acc, a) => {
      const svc = services.find((s) => s.name === a.service);
      return acc + (svc ? svc.price : 0);
    }, 0),
    [completed, services]
  );

  const commissionPct = me?.commissionPct ?? 0;
  const commission = revenue * (commissionPct / 100);

  // Desglose por servicio
  const serviceBreakdown = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    completed.forEach((a) => {
      const svc = services.find((s) => s.name === a.service);
      const price = svc ? svc.price : 0;
      if (!map[a.service]) map[a.service] = { count: 0, revenue: 0 };
      map[a.service].count++;
      map[a.service].revenue += price;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [completed, services]);

  const maxCount = Math.max(...serviceBreakdown.map((s) => s.count), 1);

  return (
    <div className="my-reports">

      {/* ── Header ── */}
      <div className="my-reports__header">
        <div>
          <h1 className="my-reports__title">
            <BarChart3 size={24} /> Mis Reportes
          </h1>
          <p className="my-reports__subtitle">
            Resumen de tu trabajo — {PERIOD_LABELS[period].toLowerCase()}
          </p>
        </div>
        <div className="my-reports__periods">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              className={`my-reports__period-btn ${period === p ? 'my-reports__period-btn--active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="my-reports__stats">
        <div className="my-reports__stat my-reports__stat--green">
          <CheckCircle2 size={20} />
          <div>
            <span className="my-reports__stat-val">{stats.completed}</span>
            <span className="my-reports__stat-label">Completadas</span>
          </div>
        </div>
        <div className="my-reports__stat my-reports__stat--blue">
          <CalendarDays size={20} />
          <div>
            <span className="my-reports__stat-val">{stats.upcoming}</span>
            <span className="my-reports__stat-label">Por atender</span>
          </div>
        </div>
        <div className="my-reports__stat my-reports__stat--amber">
          <AlertCircle size={20} />
          <div>
            <span className="my-reports__stat-val">{stats.noShow}</span>
            <span className="my-reports__stat-label">No asistieron</span>
          </div>
        </div>
        <div className="my-reports__stat my-reports__stat--red">
          <XCircle size={20} />
          <div>
            <span className="my-reports__stat-val">{stats.cancelled}</span>
            <span className="my-reports__stat-label">Canceladas</span>
          </div>
        </div>
      </div>

      {/* ── Ingresos / comisión ── */}
      <div className="my-reports__earnings">
        <div className="my-reports__earning-card">
          <DollarSign size={18} />
          <div>
            <span className="my-reports__earning-val">{fmtPrice(revenue)}</span>
            <span className="my-reports__earning-label">Ingresos generados</span>
          </div>
        </div>
        {commissionPct > 0 && (
          <div className="my-reports__earning-card my-reports__earning-card--commission">
            <Percent size={18} />
            <div>
              <span className="my-reports__earning-val">{fmtPrice(commission)}</span>
              <span className="my-reports__earning-label">
                Comisión estimada ({commissionPct}%)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Servicios más realizados ── */}
      <div className="my-reports__section">
        <h2 className="my-reports__section-title">
          <Sparkles size={16} /> Servicios realizados
        </h2>
        {serviceBreakdown.length === 0 ? (
          <div className="my-reports__empty">
            <Sparkles size={28} />
            <p>Aún no tienes servicios completados en este período</p>
          </div>
        ) : (
          <div className="my-reports__breakdown">
            {serviceBreakdown.map((s) => (
              <div key={s.name} className="my-reports__breakdown-row">
                <div className="my-reports__breakdown-info">
                  <strong>{s.name}</strong>
                  <span>{s.count} servicio{s.count !== 1 ? 's' : ''} · {fmtPrice(s.revenue)}</span>
                </div>
                <div className="my-reports__breakdown-bar">
                  <div
                    className="my-reports__breakdown-fill"
                    style={{ width: `${(s.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Historial de completadas ── */}
      <div className="my-reports__section">
        <h2 className="my-reports__section-title">
          <CheckCircle2 size={16} /> Historial · {completed.length} completada{completed.length !== 1 ? 's' : ''}
        </h2>
        {completed.length === 0 ? (
          <div className="my-reports__empty">
            <CalendarDays size={28} />
            <p>Sin citas completadas en este período</p>
          </div>
        ) : (
          <div className="my-reports__history">
            {completed.map((a) => {
              const dateLabel = new Date(a.date + 'T12:00:00').toLocaleDateString('es-DO', {
                weekday: 'short', day: 'numeric', month: 'short',
              });
              return (
                <div key={a.id} className="my-reports__history-row">
                  <div className="my-reports__history-date">
                    <span>{dateLabel}</span>
                    <span className="my-reports__history-time">
                      <Clock size={11} /> {format12h(a.time)}
                    </span>
                  </div>
                  <div className="my-reports__history-info">
                    <strong>{a.clientName}</strong>
                    <span>{a.service}</span>
                    {a.notes && <span className="my-reports__history-notes">📋 {a.notes}</span>}
                  </div>
                  <span className="my-reports__history-badge">Completada</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
