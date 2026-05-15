import { useEffect, useMemo } from 'react';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useClientStore } from '../../store/clientStore';
import { useServiceStore } from '../../store/serviceStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useBillingStore } from '../../store/billingStore';
import {
  CalendarDays,
  DollarSign,
  Users,
  Package,
  TrendingUp,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import './Dashboard.css';

function fmtPrice(p: number) { return `RD$ ${p.toLocaleString('es-DO')}`; }

function getToday() { return new Date().toISOString().split('T')[0]; }

const statusMap: Record<string, { label: string; className: string }> = {
  confirmed: { label: 'Confirmada', className: 'badge--green' },
  pending: { label: 'Pendiente', className: 'badge--amber' },
  completed: { label: 'Completada', className: 'badge--blue' },
  cancelled: { label: 'Cancelada', className: 'badge--red' },
  no_show: { label: 'No asistió', className: 'badge--gray' },
  in_progress: { label: 'En curso', className: 'badge--blue' },
};

export default function Dashboard() {
  const { appointments, fetchAppointments } = useAppointmentStore();
  const { clients, fetchClients } = useClientStore();
  const { clientPackages, fetchAll: fetchServices } = useServiceStore();
  const { products, fetchProducts } = useInventoryStore();
  const { invoices, fetchAll: fetchBilling } = useBillingStore();

  useEffect(() => {
    fetchAppointments();
    fetchClients();
    fetchServices();
    fetchProducts();
    fetchBilling();
  }, [fetchAppointments, fetchClients, fetchServices, fetchProducts, fetchBilling]);

  const today = getToday();
  const thisMonth = new Date().toISOString().slice(0, 7);

  // Today's appointments
  const todayAppts = useMemo(
    () => appointments.filter((a) => a.date === today).sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, today]
  );

  // This month's revenue
  const monthRevenue = useMemo(() => {
    return invoices
      .filter((i) => i.createdAt.startsWith(thisMonth) && i.status === 'paid')
      .reduce((a, i) => a + i.total, 0);
  }, [invoices, thisMonth]);

  // Stats
  const stats = useMemo(() => [
    {
      label: 'Citas Hoy',
      value: String(todayAppts.length),
      change: `${todayAppts.filter(a => a.status === 'confirmed').length} confirmadas`,
      up: todayAppts.length > 0,
      icon: <CalendarDays size={22} />,
      color: 'rose',
    },
    {
      label: 'Ingresos del Mes',
      value: fmtPrice(monthRevenue),
      change: `${invoices.filter(i => i.createdAt.startsWith(thisMonth) && i.status === 'paid').length} facturas`,
      up: monthRevenue > 0,
      icon: <DollarSign size={22} />,
      color: 'green',
    },
    {
      label: 'Clientas Activas',
      value: String(clients.length),
      change: 'registradas',
      up: true,
      icon: <Users size={22} />,
      color: 'lavender',
    },
    {
      label: 'Paquetes Activos',
      value: String(clientPackages.filter(cp => cp.usedSessions < cp.totalSessions).length),
      change: `${clientPackages.filter(cp => cp.totalSessions - cp.usedSessions === 1).length} por vencer`,
      up: false,
      icon: <Package size={22} />,
      color: 'amber',
    },
  ], [todayAppts, monthRevenue, invoices, clients, clientPackages, thisMonth]);

  // Top services (by appointment count this month)
  const topServices = useMemo(() => {
    const monthAppts = appointments.filter((a) => a.date.startsWith(thisMonth));
    const counts: Record<string, number> = {};
    monthAppts.forEach((a) => { counts[a.service] = (counts[a.service] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = sorted[0]?.[1] || 1;
    return sorted.map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / max) * 100),
    }));
  }, [appointments, thisMonth]);

  // Alerts
  const alerts = useMemo(() => {
    const items: { type: string; message: string; icon: React.ReactNode }[] = [];
    // Low stock
    products.filter(p => p.stock <= p.minStock && p.active).forEach((p) => {
      items.push({ type: 'stock', message: `${p.name} — Solo quedan ${p.stock} unidades`, icon: <AlertTriangle size={16} /> });
    });
    // Last session packages
    clientPackages.filter(cp => cp.totalSessions - cp.usedSessions === 1).forEach((cp) => {
      items.push({ type: 'session', message: `${cp.clientName} — Le queda 1 sesión de ${cp.packageName}`, icon: <Package size={16} /> });
    });
    return items.slice(0, 5);
  }, [products, clientPackages]);

  return (
    <div className="dashboard">
      <div className="dashboard__top">
        <div>
          <h1 className="dashboard__title">Dashboard</h1>
          <p className="dashboard__subtitle">
            Bienvenida de vuelta — Resumen del día de hoy, {new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="dashboard__stats">
        {stats.map((s, i) => (
          <div className={`stat-card stat-card--${s.color}`} key={i}>
            <div className="stat-card__header">
              <div className="stat-card__icon">{s.icon}</div>
              <span className={`stat-card__change ${s.up ? 'stat-card__change--up' : 'stat-card__change--down'}`}>
                {s.change}
              </span>
            </div>
            <div className="stat-card__value">{s.value}</div>
            <div className="stat-card__label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard__grid">
        {/* Today's Appointments */}
        <div className="dash-card">
          <div className="dash-card__header">
            <h3><CalendarDays size={18} /> Citas de Hoy</h3>
            <span className="dash-card__count">{todayAppts.length} citas</span>
          </div>
          <div className="dash-card__body">
            <div className="appointments-list">
              {todayAppts.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  No hay citas para hoy
                </div>
              ) : (
                todayAppts.map((a) => (
                  <div className={`appointment-row appointment-row--${a.status}`} key={a.id}>
                    <div className="appointment-row__time">
                      <Clock size={14} />
                      {a.time}
                    </div>
                    <div className="appointment-row__info">
                      <strong>{a.clientName}</strong>
                      <span>{a.service}</span>
                    </div>
                    <span className="appointment-row__employee">{a.employee}</span>
                    <span className={`badge ${statusMap[a.status]?.className || 'badge--gray'}`}>
                      {statusMap[a.status]?.label || a.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="dashboard__right">
          {/* Top Services */}
          <div className="dash-card">
            <div className="dash-card__header">
              <h3><TrendingUp size={18} /> Top Servicios del Mes</h3>
            </div>
            <div className="dash-card__body">
              {topServices.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Sin datos este mes</div>
              ) : (
                topServices.map((s, i) => (
                  <div className="top-service" key={i}>
                    <div className="top-service__info">
                      <span className="top-service__rank">#{i + 1}</span>
                      <div>
                        <strong>{s.name}</strong>
                        <span>{s.count} servicios</span>
                      </div>
                    </div>
                    <div className="top-service__bar">
                      <div className="top-service__bar-fill" style={{ width: `${s.percent}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Alerts */}
          <div className="dash-card">
            <div className="dash-card__header">
              <h3><AlertTriangle size={18} /> Alertas</h3>
            </div>
            <div className="dash-card__body">
              {alerts.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Sin alertas 🎉</div>
              ) : (
                alerts.map((a, i) => (
                  <div className={`alert-item alert-item--${a.type}`} key={i}>
                    {a.icon}
                    <span>{a.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
