import { useMemo, useEffect, useState } from 'react';
import { useBillingStore, NCF_LABELS, PAYMENT_LABELS } from '../../store/billingStore';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useServiceStore } from '../../store/serviceStore';
import { useClientStore } from '../../store/clientStore';
import { useStaffStore } from '../../store/staffStore';
import {
  BarChart3, FileText, Download, DollarSign, Receipt,
  CalendarDays, TrendingUp, Users, UserCog, ChevronDown,
} from 'lucide-react';
import './Reports.css';

function fmtPrice(p: number) { return `RD$ ${p.toLocaleString('es-DO')}`; }

function getLastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-DO', { month: 'short', year: '2-digit' });
}

export default function Reports() {
  const { invoices, fetchAll: fetchBilling } = useBillingStore();
  const { appointments, fetchAppointments } = useAppointmentStore();
  const { clientPackages, fetchAll: fetchServices } = useServiceStore();
  const { clients, fetchClients } = useClientStore();
  const { staff, fetchStaff } = useStaffStore();

  useEffect(() => {
    fetchBilling();
    fetchAppointments();
    fetchServices();
    fetchClients();
    fetchStaff();
  }, [fetchBilling, fetchAppointments, fetchServices, fetchClients, fetchStaff]);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const last6 = getLastNMonths(6);

  // ── Billing summary (this month) ──────────────────────────────
  const billing = useMemo(() => {
    const m = invoices.filter((i) => i.createdAt.startsWith(thisMonth) && i.status !== 'cancelled');
    return {
      totalFacturas: m.length,
      ingresos: m.filter(i => i.status === 'paid').reduce((a, i) => a + i.total, 0),
      itbis: m.filter(i => i.status === 'paid').reduce((a, i) => a + i.totalItbis, 0),
      pendiente: m.filter(i => i.status === 'issued').reduce((a, i) => a + i.total, 0),
      byNcf: Object.fromEntries(
        Object.keys(NCF_LABELS).map((t) => [t, m.filter((i) => i.ncfType === t).length])
      ),
      byPayment: Object.fromEntries(
        Object.keys(PAYMENT_LABELS).map((p) => [p, m.filter((i) => i.paymentMethod === p).length])
      ),
    };
  }, [invoices, thisMonth]);

  // ── Ingresos por mes (last 6) ─────────────────────────────────
  const revenueByMonth = useMemo(() => {
    return last6.map((ym) => {
      const total = invoices
        .filter((i) => i.createdAt.startsWith(ym) && i.status === 'paid')
        .reduce((a, i) => a + i.total, 0);
      return { ym, label: monthLabel(ym), total };
    });
  }, [invoices, last6]);

  const maxRevenue = Math.max(...revenueByMonth.map((r) => r.total), 1);

  // ── Citas por mes (last 6) ────────────────────────────────────
  const apptsByMonth = useMemo(() => {
    return last6.map((ym) => {
      const m = appointments.filter((a) => a.date.startsWith(ym));
      return {
        ym,
        label: monthLabel(ym),
        total: m.length,
        completed: m.filter((a) => a.status === 'completed').length,
        cancelled: m.filter((a) => a.status === 'cancelled').length,
        noShow: m.filter((a) => a.status === 'no_show').length,
      };
    });
  }, [appointments, last6]);

  const maxAppts = Math.max(...apptsByMonth.map((a) => a.total), 1);

  // ── Clientes nuevos por mes (last 6) ─────────────────────────
  const clientsByMonth = useMemo(() => {
    return last6.map((ym) => {
      const count = clients.filter((c) => c.created_at?.startsWith(ym)).length;
      return { ym, label: monthLabel(ym), count };
    });
  }, [clients, last6]);

  const maxClients = Math.max(...clientsByMonth.map((c) => c.count), 1);

  // ── Servicios por especialista (this month) ───────────────────
  const servicesBySpecialist = useMemo(() => {
    const monthAppts = appointments.filter(
      (a) => a.date.startsWith(thisMonth) && a.status === 'completed'
    );
    const byEmployee: Record<string, { count: number; services: Record<string, number>; clients: Set<string> }> = {};
    monthAppts.forEach((a) => {
      if (!byEmployee[a.employee]) {
        byEmployee[a.employee] = { count: 0, services: {}, clients: new Set() };
      }
      byEmployee[a.employee].count++;
      byEmployee[a.employee].services[a.service] = (byEmployee[a.employee].services[a.service] || 0) + 1;
      byEmployee[a.employee].clients.add(a.clientPhone);
    });
    return Object.entries(byEmployee)
      .map(([name, data]) => ({
        name,
        count: data.count,
        uniqueClients: data.clients.size,
        topServices: Object.entries(data.services)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([svc, cnt]) => `${svc} (${cnt})`),
      }))
      .sort((a, b) => b.count - a.count);
  }, [appointments, thisMonth]);

  // ── Packages ──────────────────────────────────────────────────
  const pkgStats = useMemo(() => ({
    active: clientPackages.filter((c) => c.usedSessions < c.totalSessions).length,
    completed: clientPackages.filter((c) => c.usedSessions >= c.totalSessions).length,
    sessionsUsed: clientPackages.reduce((a, c) => a + c.usedSessions, 0),
  }), [clientPackages]);

  // ── DGII 607 ──────────────────────────────────────────────────
  const generate607 = () => {
    const paid = invoices.filter((i) => i.createdAt.startsWith(thisMonth) && i.status === 'paid');
    const rows = ['RNC/Cédula|Tipo ID|NCF|NCF Modificado|Tipo Ingreso|Fecha Comprobante|Fecha Retención|Monto Facturado|ITBIS Facturado'];
    paid.forEach((i) => {
      rows.push(`${i.clientCedula}|1|${i.ncf}||01|${i.createdAt.replace(/-/g, '')}||${i.subtotal}|${i.totalItbis}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `607_${thisMonth}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Specialist expand toggle ──────────────────────────────────
  const [expandedSpec, setExpandedSpec] = useState<string | null>(null);

  return (
    <div className="reports">
      <div className="clients__header">
        <div>
          <h1 className="clients__title">Reportes</h1>
          <p className="clients__subtitle">
            Resumen del mes actual · {new Date().toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ── Ingresos por mes ── */}
      <div className="reports__section">
        <h2><DollarSign size={20} /> Ingresos por Mes</h2>
        <div className="reports__bar-chart">
          {revenueByMonth.map((r) => (
            <div className="reports__bar-col" key={r.ym}>
              <div className="reports__bar-value">
                {r.total > 0 ? `RD$ ${(r.total / 1000).toFixed(0)}k` : '—'}
              </div>
              <div className="reports__bar-track">
                <div
                  className="reports__bar-fill reports__bar-fill--green"
                  style={{ height: `${Math.round((r.total / maxRevenue) * 100)}%` }}
                />
              </div>
              <div className="reports__bar-label">{r.label}</div>
            </div>
          ))}
        </div>
        <div className="reports__cards" style={{ marginTop: 16 }}>
          <div className="report-card"><span>Facturas Emitidas</span><strong>{billing.totalFacturas}</strong></div>
          <div className="report-card report-card--green"><span>Ingresos Cobrados</span><strong>{fmtPrice(billing.ingresos)}</strong></div>
          <div className="report-card report-card--amber"><span>Pendiente de Cobro</span><strong>{fmtPrice(billing.pendiente)}</strong></div>
          <div className="report-card report-card--rose"><span>ITBIS Recaudado</span><strong>{fmtPrice(billing.itbis)}</strong></div>
        </div>
      </div>

      {/* ── Citas por mes ── */}
      <div className="reports__section">
        <h2><CalendarDays size={20} /> Citas por Mes</h2>
        <div className="reports__bar-chart">
          {apptsByMonth.map((a) => (
            <div className="reports__bar-col" key={a.ym}>
              <div className="reports__bar-value">{a.total || '—'}</div>
              <div className="reports__bar-track">
                <div
                  className="reports__bar-fill reports__bar-fill--rose"
                  style={{ height: `${Math.round((a.total / maxAppts) * 100)}%` }}
                />
              </div>
              <div className="reports__bar-label">{a.label}</div>
            </div>
          ))}
        </div>
        <div className="reports__cards reports__cards--small" style={{ marginTop: 16 }}>
          <div className="report-card"><span>Total este mes</span><strong>{apptsByMonth.at(-1)?.total ?? 0}</strong></div>
          <div className="report-card report-card--green"><span>Completadas</span><strong>{apptsByMonth.at(-1)?.completed ?? 0}</strong></div>
          <div className="report-card report-card--red"><span>Canceladas</span><strong>{apptsByMonth.at(-1)?.cancelled ?? 0}</strong></div>
          <div className="report-card report-card--gray"><span>No Asistió</span><strong>{apptsByMonth.at(-1)?.noShow ?? 0}</strong></div>
        </div>
      </div>

      {/* ── Clientes nuevos por mes ── */}
      <div className="reports__section">
        <h2><Users size={20} /> Clientas Nuevas por Mes</h2>
        <div className="reports__bar-chart">
          {clientsByMonth.map((c) => (
            <div className="reports__bar-col" key={c.ym}>
              <div className="reports__bar-value">{c.count || '—'}</div>
              <div className="reports__bar-track">
                <div
                  className="reports__bar-fill reports__bar-fill--lavender"
                  style={{ height: `${Math.round((c.count / maxClients) * 100)}%` }}
                />
              </div>
              <div className="reports__bar-label">{c.label}</div>
            </div>
          ))}
        </div>
        <div className="reports__cards reports__cards--small" style={{ marginTop: 16 }}>
          <div className="report-card"><span>Total registradas</span><strong>{clients.length}</strong></div>
          <div className="report-card report-card--green"><span>Nuevas este mes</span><strong>{clientsByMonth.at(-1)?.count ?? 0}</strong></div>
        </div>
      </div>

      {/* ── Servicios por especialista ── */}
      <div className="reports__section">
        <h2><UserCog size={20} /> Servicios por Especialista — Este Mes</h2>
        {servicesBySpecialist.length === 0 ? (
          <div className="reports__specialist-empty">
            Sin servicios completados este mes
          </div>
        ) : (
          <div className="reports__specialist-list">
            {servicesBySpecialist.map((sp) => (
              <div className="reports__specialist-card" key={sp.name}>
                <button
                  className="reports__specialist-header"
                  onClick={() => setExpandedSpec(expandedSpec === sp.name ? null : sp.name)}
                >
                  <div className="reports__specialist-avatar">
                    {sp.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="reports__specialist-info">
                    <strong>{sp.name}</strong>
                    <span>{sp.count} servicio{sp.count !== 1 ? 's' : ''} · {sp.uniqueClients} clienta{sp.uniqueClients !== 1 ? 's' : ''}</span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`reports__specialist-chevron${expandedSpec === sp.name ? ' reports__specialist-chevron--open' : ''}`}
                  />
                </button>
                {expandedSpec === sp.name && (
                  <div className="reports__specialist-detail">
                    <p className="reports__spec-label">
                      Servicios realizados
                    </p>
                    {sp.topServices.map((s) => (
                      <div className="reports__specialist-service" key={s}>{s}</div>
                    ))}
                    <div className="reports__specialist-rows">
                      {appointments
                        .filter((a) => a.date.startsWith(thisMonth) && a.status === 'completed' && a.employee === sp.name)
                        .slice(0, 10)
                        .map((a) => (
                          <div className="reports__specialist-row" key={a.id}>
                            <span>{a.date} · {a.time}</span>
                            <span>{a.clientName}</span>
                            <span className="reports__specialist-svc">{a.service}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── NCF Summary ── */}
      <div className="reports__row">
        <div className="reports__section">
          <h2><Receipt size={20} /> Facturas por Tipo NCF</h2>
          <div className="reports__table-wrap">
            <table className="reports__table">
              <thead><tr><th>Tipo</th><th>Descripción</th><th>Cantidad</th></tr></thead>
              <tbody>
                {Object.entries(billing.byNcf).map(([type, count]) => (
                  <tr key={type}>
                    <td className="reports__ncf-code">{type}</td>
                    <td>{NCF_LABELS[type as keyof typeof NCF_LABELS]}</td>
                    <td><strong>{count as number}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="reports__section">
          <h2><TrendingUp size={20} /> Paquetes con Sesiones</h2>
          <div className="reports__cards reports__cards--small">
            <div className="report-card report-card--green"><span>Activos</span><strong>{pkgStats.active}</strong></div>
            <div className="report-card"><span>Completados</span><strong>{pkgStats.completed}</strong></div>
            <div className="report-card report-card--rose"><span>Sesiones Usadas</span><strong>{pkgStats.sessionsUsed}</strong></div>
          </div>
        </div>
      </div>

      {/* ── DGII ── */}
      <div className="reports__section">
        <h2><FileText size={20} /> Reportes DGII</h2>
        <p className="reports__dgii-note">Genera los archivos de formato DGII para enviar a Impuestos Internos.</p>
        <div className="reports__dgii-buttons">
          <button className="reports__dgii-btn" onClick={generate607} id="btn-dgii-607">
            <Download size={16} /> Formato 607 — Ingresos
          </button>
          <button className="reports__dgii-btn reports__dgii-btn--disabled" disabled>
            <Download size={16} /> Formato 606 — Compras<span>Próximamente</span>
          </button>
          <button className="reports__dgii-btn reports__dgii-btn--disabled" disabled>
            <Download size={16} /> Formato 608 — Anulaciones<span>Próximamente</span>
          </button>
        </div>
      </div>
    </div>
  );
}
