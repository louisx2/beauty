import { useMemo, useEffect } from 'react';
import { useBillingStore, NCF_LABELS, PAYMENT_LABELS } from '../../store/billingStore';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useServiceStore } from '../../store/serviceStore';
import { BarChart3, FileText, Download, DollarSign, Receipt, CalendarDays, TrendingUp } from 'lucide-react';
import './Reports.css';

function fmtPrice(p: number) { return `RD$ ${p.toLocaleString('es-DO')}`; }

export default function Reports() {
  const { invoices, fetchAll: fetchBilling } = useBillingStore();
  const { appointments, fetchAppointments } = useAppointmentStore();
  const { clientPackages, fetchAll: fetchServices } = useServiceStore();

  useEffect(() => { fetchBilling(); fetchAppointments(); fetchServices(); }, [fetchBilling, fetchAppointments, fetchServices]);

  const thisMonth = new Date().toISOString().slice(0, 7);

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

  const apptStats = useMemo(() => {
    const m = appointments.filter((a) => a.date.startsWith(thisMonth));
    return {
      total: m.length,
      completed: m.filter((a) => a.status === 'completed').length,
      cancelled: m.filter((a) => a.status === 'cancelled').length,
      noShow: m.filter((a) => a.status === 'no_show').length,
    };
  }, [appointments, thisMonth]);

  const pkgStats = useMemo(() => ({
    active: clientPackages.filter((c) => c.usedSessions < c.totalSessions).length,
    completed: clientPackages.filter((c) => c.usedSessions >= c.totalSessions).length,
    sessionsUsed: clientPackages.reduce((a, c) => a + c.usedSessions, 0),
  }), [clientPackages]);

  // Generate 607 data (simplified)
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

  return (
    <div className="reports">
      <div className="clients__header">
        <div>
          <h1 className="clients__title">Reportes</h1>
          <p className="clients__subtitle">Resumen del mes actual · {new Date().toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="reports__section">
        <h2><DollarSign size={20} /> Resumen Financiero</h2>
        <div className="reports__cards">
          <div className="report-card"><span>Facturas Emitidas</span><strong>{billing.totalFacturas}</strong></div>
          <div className="report-card report-card--green"><span>Ingresos Cobrados</span><strong>{fmtPrice(billing.ingresos)}</strong></div>
          <div className="report-card report-card--amber"><span>Pendiente de Cobro</span><strong>{fmtPrice(billing.pendiente)}</strong></div>
          <div className="report-card report-card--rose"><span>ITBIS Recaudado</span><strong>{fmtPrice(billing.itbis)}</strong></div>
        </div>
      </div>

      {/* NCF Summary */}
      <div className="reports__row">
        <div className="reports__section">
          <h2><Receipt size={20} /> Facturas por Tipo NCF</h2>
          <div className="reports__table-wrap">
            <table className="reports__table">
              <thead><tr><th>Tipo</th><th>Descripción</th><th>Cantidad</th></tr></thead>
              <tbody>
                {Object.entries(billing.byNcf).map(([type, count]) => (
                  <tr key={type}><td className="reports__ncf-code">{type}</td><td>{NCF_LABELS[type as keyof typeof NCF_LABELS]}</td><td><strong>{count as number}</strong></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="reports__section">
          <h2><CalendarDays size={20} /> Citas del Mes</h2>
          <div className="reports__cards reports__cards--small">
            <div className="report-card"><span>Total</span><strong>{apptStats.total}</strong></div>
            <div className="report-card report-card--green"><span>Completadas</span><strong>{apptStats.completed}</strong></div>
            <div className="report-card report-card--red"><span>Canceladas</span><strong>{apptStats.cancelled}</strong></div>
            <div className="report-card report-card--gray"><span>No Asistió</span><strong>{apptStats.noShow}</strong></div>
          </div>
        </div>
      </div>

      {/* Packages */}
      <div className="reports__section">
        <h2><TrendingUp size={20} /> Paquetes con Sesiones</h2>
        <div className="reports__cards reports__cards--small">
          <div className="report-card report-card--green"><span>Activos</span><strong>{pkgStats.active}</strong></div>
          <div className="report-card"><span>Completados</span><strong>{pkgStats.completed}</strong></div>
          <div className="report-card report-card--rose"><span>Sesiones Usadas</span><strong>{pkgStats.sessionsUsed}</strong></div>
        </div>
      </div>

      {/* DGII Downloads */}
      <div className="reports__section">
        <h2><FileText size={20} /> Reportes DGII</h2>
        <p className="reports__dgii-note">Genera los archivos de formato DGII para enviar a Impuestos Internos.</p>
        <div className="reports__dgii-buttons">
          <button className="reports__dgii-btn" onClick={generate607} id="btn-dgii-607">
            <Download size={16} /> Formato 607 — Ingresos
          </button>
          <button className="reports__dgii-btn reports__dgii-btn--disabled" disabled>
            <Download size={16} /> Formato 606 — Compras
            <span>Próximamente</span>
          </button>
          <button className="reports__dgii-btn reports__dgii-btn--disabled" disabled>
            <Download size={16} /> Formato 608 — Anulaciones
            <span>Próximamente</span>
          </button>
        </div>
      </div>
    </div>
  );
}
