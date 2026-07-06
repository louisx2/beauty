import { useMemo, useEffect, useState } from 'react';
import { useBillingStore, NCF_LABELS } from '../../store/billingStore';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useServiceStore } from '../../store/serviceStore';
import { useClientStore } from '../../store/clientStore';
import { useStaffStore } from '../../store/staffStore';
import { toast } from 'react-hot-toast';
import {
  FileText, Download, DollarSign, Receipt,
  CalendarDays, Users, UserCog, Calendar, TrendingUp
} from 'lucide-react';
import './Reports.css';

function fmtPrice(p: number) { return `RD$ ${Math.round(p).toLocaleString('es-DO')}`; }

export default function Reports() {
  const { invoices, fetchAll: fetchBilling } = useBillingStore();
  const { appointments, fetchAppointments } = useAppointmentStore();
  const { clientPackages, services, fetchAll: fetchServices } = useServiceStore();
  const { clients, fetchClients } = useClientStore();
  const { staff, fetchStaff } = useStaffStore();

  const [timePeriod, setTimePeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [activeDate, setActiveDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetchBilling();
    fetchAppointments();
    fetchServices();
    fetchClients();
    fetchStaff();
  }, [fetchBilling, fetchAppointments, fetchServices, fetchClients, fetchStaff]);

  // Helper: get all dates of a week containing dateStr (Monday to Sunday)
  const getWeekRange = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(d.setDate(diff));
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
  };

  const getPeriodLabel = () => {
    if (timePeriod === 'day') {
      return new Date(activeDate + 'T12:00:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } else if (timePeriod === 'week') {
      const dates = getWeekRange(activeDate);
      const startStr = dates[0];
      const endStr = dates[6];
      return `Semana del ${new Date(startStr + 'T12:00:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })} al ${new Date(endStr + 'T12:00:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else if (timePeriod === 'month') {
      return new Date(activeDate + 'T12:00:00').toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
    } else {
      return `Año ${activeDate.slice(0, 4)}`;
    }
  };

  // Filter lists based on selected period
  const filteredAppointments = useMemo(() => {
    if (timePeriod === 'day') {
      return appointments.filter(a => a.date === activeDate);
    } else if (timePeriod === 'week') {
      const dates = getWeekRange(activeDate);
      return appointments.filter(a => dates.includes(a.date));
    } else if (timePeriod === 'month') {
      const m = activeDate.slice(0, 7);
      return appointments.filter(a => a.date.startsWith(m));
    } else {
      const y = activeDate.slice(0, 4);
      return appointments.filter(a => a.date.startsWith(y));
    }
  }, [appointments, timePeriod, activeDate]);

  const filteredInvoices = useMemo(() => {
    if (timePeriod === 'day') {
      return invoices.filter(i => i.createdAt.startsWith(activeDate));
    } else if (timePeriod === 'week') {
      const dates = getWeekRange(activeDate);
      return invoices.filter(i => dates.some(d => i.createdAt.startsWith(d)));
    } else if (timePeriod === 'month') {
      const m = activeDate.slice(0, 7);
      return invoices.filter(i => i.createdAt.startsWith(m));
    } else {
      const y = activeDate.slice(0, 4);
      return invoices.filter(i => i.createdAt.startsWith(y));
    }
  }, [invoices, timePeriod, activeDate]);

  const filteredClients = useMemo(() => {
    if (timePeriod === 'day') {
      return clients.filter(c => c.created_at?.startsWith(activeDate));
    } else if (timePeriod === 'week') {
      const dates = getWeekRange(activeDate);
      return clients.filter(c => dates.some(d => c.created_at?.startsWith(d)));
    } else if (timePeriod === 'month') {
      const m = activeDate.slice(0, 7);
      return clients.filter(c => c.created_at?.startsWith(m));
    } else {
      const y = activeDate.slice(0, 4);
      return clients.filter(c => c.created_at?.startsWith(y));
    }
  }, [clients, timePeriod, activeDate]);

  // General Metrics
  const totalCompleted = useMemo(() => filteredAppointments.filter(a => a.status === 'completed').length, [filteredAppointments]);
  const totalNoShow = useMemo(() => filteredAppointments.filter(a => a.status === 'no_show').length, [filteredAppointments]);
  const totalCancelled = useMemo(() => filteredAppointments.filter(a => a.status === 'cancelled').length, [filteredAppointments]);
  const totalNewClients = useMemo(() => filteredClients.length, [filteredClients]);

  // CALCULATION EXPLANATION: Revenue generated ONLY by completed appointments in the selected period.
  // Sum of catalog prices for appointments with status = 'completed'.
  const totalRevenue = useMemo(() => {
    return filteredAppointments
      .filter(a => a.status === 'completed')
      .reduce((acc, a) => {
        const svc = services.find(s => s.name === a.service);
        return acc + (svc ? svc.price : 0);
      }, 0);
  }, [filteredAppointments, services]);

  // Specialist Metrics
  const specialistStats = useMemo(() => {
    return staff.map(emp => {
      const specAppts = filteredAppointments.filter(a => a.employee === emp.name && a.status === 'completed');
      let generatedRevenue = 0;
      specAppts.forEach(a => {
        const svc = services.find(s => s.name === a.service);
        if (svc) {
          generatedRevenue += svc.price;
        }
      });
      const commission = generatedRevenue * (emp.commissionPct / 100);
      return {
        name: emp.name,
        completedAppts: specAppts.length,
        revenue: generatedRevenue,
        commission: commission,
        commissionPct: emp.commissionPct
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [staff, filteredAppointments, services]);

  // ── Advanced Stats Calculations ──
  
  // Category stats (Laser, Facial, Corporal, Belleza, Medicina)
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; revenue: number }> = {};
    filteredAppointments.forEach(a => {
      if (a.status !== 'completed') return;
      const svc = services.find(s => s.name === a.service);
      const category = svc ? svc.category : 'Otros';
      const price = svc ? svc.price : 0;
      if (!stats[category]) {
        stats[category] = { count: 0, revenue: 0 };
      }
      stats[category].count++;
      stats[category].revenue += price;
    });
    return Object.entries(stats).map(([category, data]) => ({
      category,
      count: data.count,
      revenue: data.revenue
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredAppointments, services]);

  const maxCategoryRevenue = useMemo(() => {
    return Math.max(...categoryStats.map(c => c.revenue), 1);
  }, [categoryStats]);

  // Top Clients (VIP)
  const topClients = useMemo(() => {
    const stats: Record<string, { name: string; count: number; spent: number }> = {};
    filteredAppointments.forEach(a => {
      if (a.status !== 'completed') return;
      const key = a.clientPhone || a.clientName;
      const svc = services.find(s => s.name === a.service);
      const price = svc ? svc.price : 0;
      if (!stats[key]) {
        stats[key] = { name: a.clientName, count: 0, spent: 0 };
      }
      stats[key].count++;
      stats[key].spent += price;
    });
    return Object.values(stats).sort((a, b) => b.spent - a.spent).slice(0, 5);
  }, [filteredAppointments, services]);

  const maxClientSpent = useMemo(() => {
    return Math.max(...topClients.map(c => c.spent), 1);
  }, [topClients]);

  // Payment Methods
  const paymentStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {};
    filteredInvoices.forEach(i => {
      if (i.status !== 'paid') return;
      const method = i.paymentMethod || 'No especificado';
      if (!stats[method]) {
        stats[method] = { count: 0, total: 0 };
      }
      stats[method].count++;
      stats[method].total += i.total;
    });
    return Object.entries(stats).map(([method, data]) => ({
      method,
      count: data.count,
      total: data.total
    })).sort((a, b) => b.total - a.total);
  }, [filteredInvoices]);

  // Peak Hours
  const peakHours = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredAppointments.forEach(a => {
      if (a.status !== 'completed') return;
      stats[a.time] = (stats[a.time] || 0) + 1;
    });
    return Object.entries(stats).map(([time, count]) => ({
      time,
      count
    })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredAppointments]);

  const maxPeakCount = useMemo(() => {
    return Math.max(...peakHours.map(p => p.count), 1);
  }, [peakHours]);

  // Booking Source Effectiveness
  const sourceStats = useMemo(() => {
    let online = 0;
    let manual = 0;
    filteredAppointments.forEach(a => {
      if (a.status !== 'completed') return;
      if (a.source === 'online') online++;
      else manual++;
    });
    const total = online + manual || 1;
    return {
      online,
      manual,
      onlinePct: Math.round((online / total) * 100),
      manualPct: Math.round((manual / total) * 100)
    };
  }, [filteredAppointments]);

  // CSV Export
  const downloadExcel = () => {
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += `REPORTE DE RENDIMIENTO - ANADSLL BEAUTY ESTHETIC\n`;
    csv += `Periodo:;${getPeriodLabel()}\n`;
    csv += `Generado el:;${new Date().toLocaleString('es-DO')}\n\n`;

    csv += `RESUMEN GENERAL\n`;
    csv += `Metrica;Cantidad / Monto\n`;
    csv += `Citas Completadas;${totalCompleted}\n`;
    csv += `Citas Perdidas (No Asistio);${totalNoShow}\n`;
    csv += `Citas Canceladas;${totalCancelled}\n`;
    csv += `Clientes Nuevos;${totalNewClients}\n`;
    csv += `Ingresos Cobrados (Citas Completadas);RD$ ${totalRevenue}\n\n`;

    csv += `RENDIMIENTO POR ESPECIALISTA\n`;
    csv += `Especialista;Citas Realizadas;Ingresos Generados;% Comision;Comision Calculada\n`;
    specialistStats.forEach(s => {
      csv += `"${s.name}";${s.completedAppts};RD$ ${s.revenue};${s.commissionPct}%;RD$ ${s.commission}\n`;
    });
    csv += `\n`;

    if (showAdvanced) {
      csv += `VISTA AVANZADA\n\n`;

      csv += `DISTRIBUCIÓN POR CATEGORÍA\n`;
      csv += `Categoria;Citas;Ingresos\n`;
      categoryStats.forEach(c => {
        csv += `"${c.category}";${c.count};RD$ ${c.revenue}\n`;
      });
      csv += `\n`;

      csv += `CLIENTES VIP (TOP SPENDERS)\n`;
      csv += `Cliente;Citas Completadas;Total Gastado\n`;
      topClients.forEach(c => {
        csv += `"${c.name}";${c.count};RD$ ${c.spent}\n`;
      });
      csv += `\n`;

      csv += `METODOS DE PAGO\n`;
      csv += `Metodo;Transacciones;Total Recibido\n`;
      paymentStats.forEach(p => {
        csv += `"${p.method}";${p.count};RD$ ${p.total}\n`;
      });
      csv += `\n`;

      csv += `ORIGEN DE CITAS\n`;
      csv += `Origen;Citas;Porcentaje\n`;
      csv += `Online;${sourceStats.online};${sourceStats.onlinePct}%\n`;
      csv += `Presencial/Manual;${sourceStats.manual};${sourceStats.manualPct}%\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_${timePeriod}_${activeDate}${showAdvanced ? '_Avanzado' : ''}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Reporte Excel descargado');
  };

  // PDF Export via native print layout
  const downloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Por favor permite ventanas emergentes para descargar el PDF');
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Reporte de Rendimiento - Anadsll Beauty Esthetic</title>
          <style>
            body { font-family: 'Outfit', sans-serif; padding: 40px; color: #1a1a1a; background: #fff; }
            h1 { font-family: 'Cormorant Garamond', serif; font-size: 2.5rem; margin-bottom: 5px; color: #4a342a; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
            .meta { font-size: 0.95rem; color: #6b7280; margin-bottom: 30px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; background: #fdfcf9; }
            .card span { display: block; font-size: 0.85rem; color: #6b7280; text-transform: uppercase; margin-bottom: 5px; }
            .card strong { font-size: 1.5rem; color: #4a342a; }
            h2 { font-size: 1.25rem; color: #4a342a; border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { text-align: left; padding: 10px; background: #f9f6f1; border-bottom: 2px solid #e5e7eb; font-size: 0.85rem; text-transform: uppercase; color: #6b7280; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 0.9rem; }
            tr:hover { background: #fdfcf9; }
            .footer { margin-top: 50px; text-align: center; font-size: 0.8rem; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 15px; }
            .adv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; }
            .bar-track { background: #f3f4f6; border-radius: 99px; height: 10px; overflow: hidden; margin-top: 8px; width: 100%; }
            .bar-fill { background: #c97d97; height: 100%; border-radius: 99px; }
            .donut-container { display: flex; align-items: center; gap: 20px; }
            @media print {
              body { padding: 20px; }
              .card { page-break-inside: avoid; }
              table { page-break-inside: avoid; }
              .adv-grid { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>Reporte de Rendimiento ${showAdvanced ? '(Avanzado)' : ''}</h1>
          <div class="meta">
            <div><strong>Establecimiento:</strong> Anadsll Beauty Esthetic</div>
            <div><strong>Periodo:</strong> ${getPeriodLabel()}</div>
            <div><strong>Generado el:</strong> ${new Date().toLocaleString('es-DO')}</div>
          </div>

          <h2>Resumen General</h2>
          <div class="grid">
            <div class="card"><span>Citas Completadas</span><strong>${totalCompleted}</strong></div>
            <div class="card"><span>Citas Perdidas (No Asistio)</span><strong>${totalNoShow}</strong></div>
            <div class="card"><span>Citas Canceladas</span><strong>${totalCancelled}</strong></div>
            <div class="card"><span>Clientes Nuevos</span><strong>${totalNewClients}</strong></div>
            <div class="card" style="grid-column: span 2"><span>Ingresos Cobrados (Citas Completadas)</span><strong>RD$ ${totalRevenue.toLocaleString('es-DO')}</strong></div>
          </div>

          <h2>Rendimiento por Especialista</h2>
          <table>
            <thead>
              <tr>
                <th>Especialista</th>
                <th>Citas Realizadas</th>
                <th>Ingresos Generados</th>
                <th>% Comisión</th>
                <th>Comisión Calculada</th>
              </tr>
            </thead>
            <tbody>
              ${specialistStats.map(s => `
                <tr>
                  <td><strong>${s.name}</strong></td>
                  <td>${s.completedAppts}</td>
                  <td>RD$ ${s.revenue.toLocaleString('es-DO')}</td>
                  <td>${s.commissionPct}%</td>
                  <td><strong>RD$ ${s.commission.toLocaleString('es-DO')}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${showAdvanced ? `
            <h2>Análisis Avanzado de Negocios</h2>
            <div class="adv-grid">
              
              <div class="card">
                <h3>Categorias de Servicio</h3>
                ${categoryStats.map(c => `
                  <div style="margin-top: 10px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
                      <span>${c.category.toUpperCase()}</span>
                      <strong>RD$ ${c.revenue.toLocaleString('es-DO')} (${c.count} citas)</strong>
                    </div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width: ${Math.round((c.revenue / maxCategoryRevenue) * 100)}%;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>

              <div class="card">
                <h3>Top Clientes VIP</h3>
                ${topClients.map(c => `
                  <div style="margin-top: 10px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.85rem;">
                      <span>${c.name}</span>
                      <strong>RD$ ${c.spent.toLocaleString('es-DO')} (${c.count} citas)</strong>
                    </div>
                    <div class="bar-track">
                      <div class="bar-fill" style="width: ${Math.round((c.spent / maxClientSpent) * 100)}%; background: #9a82cc;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>

              <div class="card">
                <h3>Origen de Citas</h3>
                <div class="donut-container">
                  <svg viewBox="0 0 36 36" style="width: 80px; height: 80px;">
                    <circle cx="18" cy="18" r="15.9154" fill="transparent" stroke="#f3f4f6" stroke-width="3" />
                    <circle cx="18" cy="18" r="15.9154" fill="transparent" stroke="#c97d97" stroke-width="3"
                            stroke-dasharray="${sourceStats.onlinePct} ${100 - sourceStats.onlinePct}"
                            stroke-dashoffset="25" />
                  </svg>
                  <div style="font-size:0.85rem;">
                    <div><span style="color:#c97d97;font-weight:bold;">■</span> Online: ${sourceStats.onlinePct}% (${sourceStats.online} citas)</div>
                    <div><span style="color:#9ca3af;font-weight:bold;">■</span> Manual: ${sourceStats.manualPct}% (${sourceStats.manual} citas)</div>
                  </div>
                </div>
              </div>

              <div class="card">
                <h3>Métodos de Pago</h3>
                ${paymentStats.map(p => `
                  <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding: 6px 0; border-bottom:1px solid #f3f4f6;">
                    <span>${p.method}</span>
                    <strong>RD$ ${p.total.toLocaleString('es-DO')} (${p.count} trans.)</strong>
                  </div>
                `).join('')}
              </div>

            </div>
          ` : ''}

          <div class="footer">
            Documento de control interno - Anadsll Beauty Esthetic
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const generate607 = () => {
    const targetMonth = activeDate.slice(0, 7);
    const paid = invoices.filter((i) => i.createdAt.startsWith(targetMonth) && i.status === 'paid');
    const rows = ['RNC/Cédula|Tipo ID|NCF|NCF Modificado|Tipo Ingreso|Fecha Comprobante|Fecha Retención|Monto Facturado|ITBIS Facturado'];
    paid.forEach((i) => {
      rows.push(`${i.clientCedula}|1|${i.ncf}||01|${i.createdAt.replace(/-/g, '')}||${i.subtotal}|${i.totalItbis}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `607_${targetMonth}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Formato DGII 607 generado');
  };

  const years = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));
  }, []);

  return (
    <div className="reports">
      <div className="clients__header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="clients__title">Reportes & Estadísticas</h1>
          <p className="clients__subtitle">Consulta el rendimiento general y comisiones del personal</p>
        </div>
      </div>

      {/* ── Period Selector & Downloads ── */}
      <div className="reports__filters">
        <div className="reports__period-tabs">
          <button 
            className={`reports__period-btn ${timePeriod === 'day' ? 'reports__period-btn--active' : ''}`}
            onClick={() => setTimePeriod('day')}
          >
            Diario
          </button>
          <button 
            className={`reports__period-btn ${timePeriod === 'week' ? 'reports__period-btn--active' : ''}`}
            onClick={() => setTimePeriod('week')}
          >
            Semanal
          </button>
          <button 
            className={`reports__period-btn ${timePeriod === 'month' ? 'reports__period-btn--active' : ''}`}
            onClick={() => setTimePeriod('month')}
          >
            Mensual
          </button>
          <button 
            className={`reports__period-btn ${timePeriod === 'year' ? 'reports__period-btn--active' : ''}`}
            onClick={() => setTimePeriod('year')}
          >
            Anual
          </button>
        </div>

        <div>
          {timePeriod === 'day' && (
            <input 
              type="date" 
              className="reports__date-input"
              value={activeDate}
              onChange={(e) => setActiveDate(e.target.value)}
            />
          )}
          {timePeriod === 'week' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="date" 
                className="reports__date-input"
                value={activeDate}
                onChange={(e) => setActiveDate(e.target.value)}
              />
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                {getPeriodLabel()}
              </span>
            </div>
          )}
          {timePeriod === 'month' && (
            <input 
              type="month" 
              className="reports__date-input"
              value={activeDate.slice(0, 7)}
              onChange={(e) => setActiveDate(e.target.value + '-01')}
            />
          )}
          {timePeriod === 'year' && (
            <select 
              className="reports__date-input"
              value={activeDate.slice(0, 4)}
              onChange={(e) => setActiveDate(e.target.value + '-01-01')}
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
        </div>

        <div className="reports__download-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            className={`reports__download-btn ${showAdvanced ? 'reports__download-btn--advanced-active' : 'reports__download-btn--advanced'}`}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <TrendingUp size={16} /> {showAdvanced ? 'Vista General' : 'Vista Avanzada'}
          </button>
          <button 
            className="reports__download-btn reports__download-btn--excel" 
            onClick={downloadExcel}
          >
            <Download size={16} /> Excel
          </button>
          <button 
            className="reports__download-btn reports__download-btn--pdf" 
            onClick={downloadPDF}
          >
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {/* ── Key Metrics Cards ── */}
      <div className="reports__section">
        <h2><CalendarDays size={20} /> Resumen de Rendimiento del Periodo</h2>
        <div className="reports__cards">
          <div className="report-card">
            <span>Citas Completadas</span>
            <strong>{totalCompleted}</strong>
          </div>
          <div className="report-card report-card--red">
            <span>Citas Perdidas (No Show)</span>
            <strong>{totalNoShow}</strong>
          </div>
          <div className="report-card report-card--amber">
            <span>Citas Canceladas</span>
            <strong>{totalCancelled}</strong>
          </div>
          <div className="report-card report-card--rose">
            <span>Clientes Nuevos</span>
            <strong>{totalNewClients}</strong>
          </div>
          <div className="report-card report-card--green" style={{ gridColumn: 'span 2' }}>
            <span>Ingresos Generados (Citas Completas)</span>
            <strong>{fmtPrice(totalRevenue)}</strong>
          </div>
        </div>
      </div>

      {/* ── Advanced Charts Grid ── */}
      {showAdvanced && (
        <div className="reports__section">
          <h2>Reportes & Gráficos Avanzados de Negocios</h2>
          <div className="reports__row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            
            {/* Chart 1: Circular SVG Donut Chart (Source Booking) */}
            <div className="report-card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600, margin: 0 }}>Distribución por Origen de Reservas</h3>
              <div className="reports__advanced-donut-wrap" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ position: 'relative', width: '90px', height: '90px' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                    <circle cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="var(--rose)" strokeWidth="4"
                            strokeDasharray={`${sourceStats.onlinePct} ${100 - sourceStats.onlinePct}`}
                            strokeDashoffset="0" />
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 'bold', color: 'white' }}>
                    {sourceStats.onlinePct}%
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><span style={{ color: 'var(--rose)', marginRight: '6px' }}>■</span><strong>Online:</strong> {sourceStats.onlinePct}% ({sourceStats.online} citas)</div>
                  <div><span style={{ color: 'rgba(255,255,255,0.3)', marginRight: '6px' }}>■</span><strong>Presencial / Manual:</strong> {sourceStats.manualPct}% ({sourceStats.manual} citas)</div>
                </div>
              </div>
            </div>

            {/* Chart 2: Horizontal Bars (Services Categories) */}
            <div className="report-card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600, margin: 0 }}>Ingresos por Categorías</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {categoryStats.map(c => (
                  <div key={c.category} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
                      <span style={{ textTransform: 'capitalize' }}>{c.category}</span>
                      <strong>{fmtPrice(c.revenue)} ({c.count})</strong>
                    </div>
                    <div className="reports__horizontal-track" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                      <div className="reports__horizontal-fill" style={{ background: 'linear-gradient(90deg, var(--rose), var(--lavender))', height: '100%', borderRadius: '99px', width: `${Math.round((c.revenue / maxCategoryRevenue) * 100)}%` }} />
                    </div>
                  </div>
                ))}
                {categoryStats.length === 0 && <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '10px 0' }}>Sin datos disponibles</div>}
              </div>
            </div>

            {/* Chart 3: Horizontal Bars (Top VIP Clients) */}
            <div className="report-card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600, margin: 0 }}>Top 5 Clientes VIP (Top Spenders)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topClients.map(c => (
                  <div key={c.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
                      <span>{c.name}</span>
                      <strong>{fmtPrice(c.spent)} ({c.count} citas)</strong>
                    </div>
                    <div className="reports__horizontal-track" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                      <div className="reports__horizontal-fill" style={{ background: 'linear-gradient(90deg, #60a5fa, #3b82f6)', height: '100%', borderRadius: '99px', width: `${Math.round((c.spent / maxClientSpent) * 100)}%` }} />
                    </div>
                  </div>
                ))}
                {topClients.length === 0 && <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '10px 0' }}>Sin datos disponibles</div>}
              </div>
            </div>

            {/* Chart 4: Vertical Columns (Peak Hours) */}
            <div className="report-card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600, margin: 0 }}>Horas Pico de Citas Realizadas</h3>
              <div className="reports__vertical-chart" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '90px', paddingTop: '10px', gap: '8px' }}>
                {peakHours.map(p => (
                  <div key={p.time} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>{p.count}</span>
                    <div style={{ background: 'rgba(255,255,255,0.04)', width: '100%', height: '50px', borderRadius: '4px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                      <div style={{ background: 'linear-gradient(to top, var(--lavender-dark), var(--lavender))', width: '100%', height: `${Math.round((p.count / maxPeakCount) * 100)}%` }} />
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{p.time}</span>
                  </div>
                ))}
                {peakHours.length === 0 && <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', width: '100%', paddingBottom: '30px' }}>Sin datos de horas</div>}
              </div>
            </div>

            {/* Chart 5: Table of Payment Methods usage */}
            <div className="report-card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600, margin: 0 }}>Métodos de Pago Utilizados (Facturación)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textTransform: 'uppercase', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 0' }}>Método</th>
                    <th>Transacciones</th>
                    <th style={{ textAlign: 'right' }}>Monto Recibido</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentStats.map(p => (
                    <tr key={p.method} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '8px 0', fontWeight: 600, color: 'white' }}>{p.method}</td>
                      <td>{p.count}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#4ade80' }}>{fmtPrice(p.total)}</td>
                    </tr>
                  ))}
                  {paymentStats.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '16px 0', color: 'rgba(255,255,255,0.4)' }}>No hay facturas pagadas registradas en este periodo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* ── Specialist Report ── */}
      <div className="reports__section">
        <h2><UserCog size={20} /> Reporte de Rendimiento y Comisiones por Especialista</h2>
        <div className="reports__table-wrap">
          <table className="reports__table">
            <thead>
              <tr>
                <th>Especialista</th>
                <th>Citas Realizadas</th>
                <th>Ingresos Generados</th>
                <th>% Comisión</th>
                <th>Comisión Calculada</th>
              </tr>
            </thead>
            <tbody>
              {specialistStats.map((s) => (
                <tr key={s.name}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.completedAppts}</td>
                  <td>{fmtPrice(s.revenue)}</td>
                  <td>{s.commissionPct}%</td>
                  <td><strong style={{ color: '#4ade80' }}>{fmtPrice(s.commission)}</strong></td>
                </tr>
              ))}
              {specialistStats.length === 0 && (
                <tr>
                  <td colSpan={5} className="reports__specialist-empty">
                    No se registraron servicios en este periodo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Packages Summary & DGII ── */}
      <div className="reports__row">
        <div className="reports__section">
          <h2><Receipt size={20} /> Control de Paquetes Activos</h2>
          <div className="reports__cards reports__cards--small">
            <div className="report-card report-card--green">
              <span>Activos</span>
              <strong>{clientPackages.filter((c) => c.usedSessions < c.totalSessions).length}</strong>
            </div>
            <div className="report-card">
              <span>Completados</span>
              <strong>{clientPackages.filter((c) => c.usedSessions >= c.totalSessions).length}</strong>
            </div>
            <div className="report-card report-card--rose">
              <span>Sesiones Usadas</span>
              <strong>{clientPackages.reduce((a, c) => a + c.usedSessions, 0)}</strong>
            </div>
          </div>
        </div>

        <div className="reports__section">
          <h2><FileText size={20} /> Reportes DGII</h2>
          <p className="reports__dgii-note">Genera los archivos de formato DGII para el periodo correspondiente.</p>
          <div className="reports__dgii-buttons">
            <button className="reports__dgii-btn" onClick={generate607} id="btn-dgii-607">
              <Download size={16} /> Formato 607 — Ingresos ({activeDate.slice(0, 7)})
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
