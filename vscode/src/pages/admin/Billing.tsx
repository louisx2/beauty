import { useState, useMemo, useEffect } from 'react';
import {
  useBillingStore,
  calcItemTotals,
  NCF_LABELS,
  PAYMENT_LABELS,
  type Invoice,
  type InvoiceItem,
  type NcfType,
  type PaymentMethod,
} from '../../store/billingStore';
import { useClientStore } from '../../store/clientStore';
import { useServiceStore } from '../../store/serviceStore';
import {
  Plus, Search, Receipt, X, DollarSign, Trash2, FileText,
  CheckCircle2, XCircle, AlertCircle, Eye, Printer, MessageCircle,
  CreditCard, Banknote, ArrowLeftRight,
} from 'lucide-react';
import './Billing.css';

function fmtPrice(p: number) { return `RD$ ${p.toLocaleString('es-DO')}`; }

const STATUS_MAP: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
  draft: { label: 'Borrador', class: 'badge--gray', icon: <FileText size={13} /> },
  issued: { label: 'Emitida', class: 'badge--blue', icon: <AlertCircle size={13} /> },
  paid: { label: 'Pagada', class: 'badge--green', icon: <CheckCircle2 size={13} /> },
  cancelled: { label: 'Anulada', class: 'badge--red', icon: <XCircle size={13} /> },
};

const PAY_ICONS: Record<PaymentMethod, React.ReactNode> = {
  cash: <Banknote size={14} />,
  card: <CreditCard size={14} />,
  transfer: <ArrowLeftRight size={14} />,
  mixed: <DollarSign size={14} />,
};

export default function Billing() {
  const { invoices, ncfSequences, fetchAll, getNextNcf, createInvoice, updateInvoiceStatus, deleteInvoice } = useBillingStore();
  const { clients, fetchClients } = useClientStore();
  const { services, fetchAll: fetchServices } = useServiceStore();

  useEffect(() => { fetchAll(); fetchClients(); fetchServices(); }, [fetchAll, fetchClients, fetchServices]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Create form state
  const [clientId, setClientId] = useState('');
  const [ncfType, setNcfType] = useState<NcfType>('B02');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [invoiceNotes, setInvoiceNotes] = useState('');

  const filtered = useMemo(() => {
    let list = invoices;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.clientName.toLowerCase().includes(q) ||
          i.ncf.toLowerCase().includes(q)
      );
    }
    if (statusFilter) list = list.filter((i) => i.status === statusFilter);
    return list;
  }, [invoices, search, statusFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const mInvoices = invoices.filter((i) => i.createdAt.startsWith(thisMonth) && i.status !== 'cancelled');
    return {
      count: mInvoices.length,
      revenue: mInvoices.filter((i) => i.status === 'paid').reduce((a, i) => a + i.total, 0),
      itbis: mInvoices.filter((i) => i.status === 'paid').reduce((a, i) => a + i.totalItbis, 0),
      pending: mInvoices.filter((i) => i.status === 'issued').reduce((a, i) => a + i.total, 0),
    };
  }, [invoices]);

  // Item management
  const addItem = () => {
    setItems([
      ...items,
      { id: `item-${Date.now()}`, invoiceId: '', description: '', quantity: 1, unitPrice: 0, taxable: true, itbis: 0, total: 0 },
    ]);
  };

  const updateItem = (idx: number, data: Partial<InvoiceItem>) => {
    setItems(
      items.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, ...data };
        const calc = calcItemTotals(updated.unitPrice, updated.quantity, updated.taxable);
        return { ...updated, itbis: calc.itbis, total: calc.total };
      })
    );
  };

  const selectService = (idx: number, serviceId: string) => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    updateItem(idx, { description: svc.name, unitPrice: svc.price, taxable: svc.taxable });
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const invoiceTotals = useMemo(() => {
    const subtotal = items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
    const totalItbis = items.reduce((a, i) => a + i.itbis, 0);
    return { subtotal, totalItbis, total: subtotal + totalItbis };
  }, [items]);

  const handleCreateInvoice = async () => {
    const client = clients.find((c) => c.id === clientId);
    if (!client || items.length === 0) return;

    const ncf = await getNextNcf(ncfType);

    await createInvoice({
      ncf,
      ncfType,
      clientId: client.id,
      clientName: client.name,
      clientCedula: client.cedula || null,
      items,
      subtotal: invoiceTotals.subtotal,
      totalItbis: invoiceTotals.totalItbis,
      total: invoiceTotals.total,
      paymentMethod,
      status: 'issued',
    });

    setShowCreateModal(false);
    setClientId('');
    setItems([]);
    setInvoiceNotes('');
  };

  const handleWhatsApp = (inv: Invoice) => {
    const client = clients.find((c) => c.id === inv.clientId);
    const phone = client?.phone.replace(/[^0-9]/g, '') || '';
    const itemsText = inv.items.map((i) => `  • ${i.description} — ${fmtPrice(i.total)}`).join('\n');
    const msg = `📄 *Factura*\nNCF: ${inv.ncf}\n\n${itemsText}\n\nSubtotal: ${fmtPrice(inv.subtotal)}\nITBIS 18%: ${fmtPrice(inv.totalItbis)}\n*Total: ${fmtPrice(inv.total)}*\n\n¡Gracias por su preferencia!\nAnadsll Beauty Esthetic`;
    window.open(`https://wa.me/1${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="billing">
      <div className="clients__header">
        <div>
          <h1 className="clients__title">Facturación</h1>
          <p className="clients__subtitle">NCF · ITBIS 18% · Cumplimiento DGII</p>
        </div>
        <button className="appts__add-btn" onClick={() => { setShowCreateModal(true); setItems([]); }} id="btn-new-invoice">
          <Plus size={18} /> Nueva Factura
        </button>
      </div>

      {/* Stats */}
      <div className="billing__stats">
        <div className="stat-card stat-card--rose" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 20 }}>
          <div className="stat-card__icon" style={{ marginBottom: 10 }}><Receipt size={22} /></div>
          <div className="stat-card__value">{stats.count}</div>
          <div className="stat-card__label">Facturas del Mes</div>
        </div>
        <div className="stat-card stat-card--green" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 20 }}>
          <div className="stat-card__icon" style={{ marginBottom: 10 }}><DollarSign size={22} /></div>
          <div className="stat-card__value">{fmtPrice(stats.revenue)}</div>
          <div className="stat-card__label">Ingresos Cobrados</div>
        </div>
        <div className="stat-card stat-card--amber" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 20 }}>
          <div className="stat-card__icon" style={{ marginBottom: 10 }}><AlertCircle size={22} /></div>
          <div className="stat-card__value">{fmtPrice(stats.pending)}</div>
          <div className="stat-card__label">Pendiente de Cobro</div>
        </div>
        <div className="stat-card stat-card--lavender" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 20 }}>
          <div className="stat-card__icon" style={{ marginBottom: 10 }}><FileText size={22} /></div>
          <div className="stat-card__value">{fmtPrice(stats.itbis)}</div>
          <div className="stat-card__label">ITBIS Recaudado</div>
        </div>
      </div>

      {/* Filters */}
      <div className="billing__filters">
        <div className="appts__search" style={{ maxWidth: 320 }}>
          <Search size={16} />
          <input placeholder="Buscar factura, NCF, clienta..." value={search} onChange={(e) => setSearch(e.target.value)} id="billing-search" />
        </div>
        <select className="billing__status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} id="billing-filter-status">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Invoice Table */}
      <div className="billing__table-wrap">
        <table className="billing__table" id="invoices-table">
          <thead>
            <tr>
              <th>Factura</th>
              <th>NCF</th>
              <th>Clienta</th>
              <th>Subtotal</th>
              <th>ITBIS</th>
              <th>Total</th>
              <th>Pago</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.25)' }}>No hay facturas</td></tr>
            ) : (
              filtered.map((inv) => (
                <tr key={inv.id} className={inv.status === 'cancelled' ? 'billing__row--cancelled' : ''}>
                  <td><strong>{inv.ncf}</strong></td>
                  <td>
                    <span className="billing__ncf-badge">{inv.ncf}</span>
                    <span className="billing__ncf-type">{NCF_LABELS[inv.ncfType]}</span>
                  </td>
                  <td>{inv.clientName}</td>
                  <td>{fmtPrice(inv.subtotal)}</td>
                  <td className="billing__itbis-col">{fmtPrice(inv.totalItbis)}</td>
                  <td><strong>{fmtPrice(inv.total)}</strong></td>
                  <td>
                    <span className="billing__pay-badge">{PAY_ICONS[inv.paymentMethod]} {PAYMENT_LABELS[inv.paymentMethod]}</span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_MAP[inv.status].class}`}>
                      {STATUS_MAP[inv.status].icon} {STATUS_MAP[inv.status].label}
                    </span>
                  </td>
                  <td className="billing__date-col">{new Date(inv.createdAt).toLocaleDateString('es-DO')}</td>
                  <td>
                    <div className="billing__row-actions">
                      <button className="appt-card__action-btn" onClick={() => setViewInvoice(inv)} title="Ver"><Eye size={14} /></button>
                      <button className="appt-card__action-btn appt-card__action-btn--wa" onClick={() => handleWhatsApp(inv)} title="Enviar por WhatsApp"><MessageCircle size={14} /></button>
                      {inv.status === 'issued' && (
                        <button className="appt-card__action-btn" onClick={() => updateInvoiceStatus(inv.id, 'paid')} title="Marcar como pagada" style={{ color: '#4ade80' }}><CheckCircle2 size={14} /></button>
                      )}
                      {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                        <button className="appt-card__action-btn" onClick={() => updateInvoiceStatus(inv.id, 'cancelled')} title="Anular" style={{ color: '#f87171' }}><XCircle size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Invoice Modal */}
      {viewInvoice && (
        <div className="modal-overlay" onClick={() => setViewInvoice(null)}>
          <div className="modal billing__invoice-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Factura {viewInvoice.ncf}</h2>
              <button className="modal__close" onClick={() => setViewInvoice(null)}><X size={20} /></button>
            </div>
            <div className="billing__invoice-view">
              <div className="billing__inv-header">
                <div>
                  <h3>Anadsll Beauty Esthetic</h3>
                  <p>C/Altagracia, #65, Pueblo Abajo</p>
                  <p>Tel: 829-322-4014</p>
                </div>
                <div className="billing__inv-meta">
                  <div><span>NCF:</span><strong>{viewInvoice.ncf}</strong></div>
                  <div><span>Tipo:</span><strong>{NCF_LABELS[viewInvoice.ncfType]}</strong></div>
                  <div><span>Fecha:</span><strong>{new Date(viewInvoice.createdAt).toLocaleDateString('es-DO')}</strong></div>
                  <div><span>Estado:</span><span className={`badge ${STATUS_MAP[viewInvoice.status].class}`}>{STATUS_MAP[viewInvoice.status].label}</span></div>
                </div>
              </div>

              <div className="billing__inv-client">
                <span>Clienta:</span> <strong>{viewInvoice.clientName}</strong> · Cédula: {viewInvoice.clientCedula || '—'}
              </div>

              <table className="billing__inv-items">
                <thead>
                  <tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>ITBIS</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {viewInvoice.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td>{item.quantity}</td>
                      <td>{fmtPrice(item.unitPrice)}</td>
                      <td>{fmtPrice(item.itbis)}</td>
                      <td><strong>{fmtPrice(item.total)}</strong></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={3}></td><td>Subtotal:</td><td>{fmtPrice(viewInvoice.subtotal)}</td></tr>
                  <tr className="billing__inv-itbis-row"><td colSpan={3}></td><td>ITBIS 18%:</td><td>{fmtPrice(viewInvoice.totalItbis)}</td></tr>
                  <tr className="billing__inv-total-row"><td colSpan={3}></td><td>TOTAL:</td><td><strong>{fmtPrice(viewInvoice.total)}</strong></td></tr>
                </tfoot>
              </table>

              <div className="billing__inv-footer">
                <button className="appts__add-btn" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', boxShadow: 'none' }} onClick={() => window.print()}>
                  <Printer size={16} /> Imprimir
                </button>
                <button className="appts__add-btn" style={{ background: 'rgba(37,211,102,0.15)', color: '#4ade80', boxShadow: 'none' }} onClick={() => handleWhatsApp(viewInvoice)}>
                  <MessageCircle size={16} /> Enviar WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal billing__create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Nueva Factura</h2>
              <button className="modal__close" onClick={() => setShowCreateModal(false)}><X size={20} /></button>
            </div>
            <div className="modal__form" style={{ padding: '20px 28px 28px' }}>
              {/* Client & NCF */}
              <div className="modal__row">
                <div className="modal__field">
                  <label>Clienta</label>
                  <select required value={clientId} onChange={(e) => setClientId(e.target.value)}>
                    <option value="">Seleccionar clienta</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.cedula || 'Sin cédula'}</option>)}
                  </select>
                </div>
                <div className="modal__field">
                  <label>Tipo de NCF</label>
                  <select value={ncfType} onChange={(e) => setNcfType(e.target.value as NcfType)}>
                    {Object.entries(NCF_LABELS).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
                  </select>
                </div>
              </div>

              {/* Items */}
              <div className="billing__items-section">
                <div className="billing__items-header">
                  <h4>Líneas de Factura</h4>
                  <button type="button" className="billing__add-item-btn" onClick={addItem}><Plus size={14} /> Agregar Línea</button>
                </div>

                {items.length === 0 ? (
                  <div className="billing__no-items" onClick={addItem}>
                    <Plus size={24} />
                    <p>Agregar servicio o producto</p>
                  </div>
                ) : (
                  <div className="billing__items-list">
                    {items.map((item, idx) => (
                      <div className="billing__item-row" key={item.id}>
                        <div className="modal__field" style={{ flex: 2 }}>
                          <select
                            value={item.description ? services.find(s => s.name === item.description)?.id || 'custom' : ''}
                            onChange={(e) => {
                              if (e.target.value === 'custom') updateItem(idx, { description: '' });
                              else selectService(idx, e.target.value);
                            }}
                          >
                            <option value="">Seleccionar...</option>
                            {services.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            <option value="custom">— Otro (escribir) —</option>
                          </select>
                          {!services.find(s => s.name === item.description) && item.description !== '' && (
                            <input
                              placeholder="Nombre del producto"
                              value={item.description}
                              onChange={(e) => updateItem(idx, { description: e.target.value })}
                              style={{ marginTop: 6 }}
                            />
                          )}
                        </div>
                        <div className="modal__field" style={{ width: 70 }}>
                          <input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} />
                        </div>
                        <div className="modal__field" style={{ width: 110 }}>
                          <input type="number" min={0} value={item.unitPrice || ''} onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })} placeholder="RD$" />
                        </div>
                        <div className="billing__item-tax">
                          <label className="toggle-switch" style={{ gap: 4 }}>
                            <input type="checkbox" checked={item.taxable} onChange={(e) => updateItem(idx, { taxable: e.target.checked })} />
                            <span className="toggle-slider" style={{ width: 32, height: 18 }} />
                          </label>
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>ITBIS</span>
                        </div>
                        <div className="billing__item-total">
                          <span>{fmtPrice(item.total)}</span>
                        </div>
                        <button type="button" className="appt-card__action-btn" onClick={() => removeItem(idx)}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals */}
              {items.length > 0 && (
                <div className="billing__totals">
                  <div><span>Subtotal:</span><span>{fmtPrice(invoiceTotals.subtotal)}</span></div>
                  <div className="billing__totals-itbis"><span>ITBIS 18%:</span><span>{fmtPrice(invoiceTotals.totalItbis)}</span></div>
                  <div className="billing__totals-grand"><span>TOTAL:</span><strong>{fmtPrice(invoiceTotals.total)}</strong></div>
                </div>
              )}

              {/* Payment Method */}
              <div className="modal__row">
                <div className="modal__field">
                  <label>Método de Pago</label>
                  <div className="billing__pay-options">
                    {(Object.entries(PAYMENT_LABELS) as [PaymentMethod, string][]).map(([k, v]) => (
                      <button
                        key={k}
                        type="button"
                        className={`billing__pay-option ${paymentMethod === k ? 'billing__pay-option--active' : ''}`}
                        onClick={() => setPaymentMethod(k)}
                      >
                        {PAY_ICONS[k]} {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal__field">
                <label>Notas</label>
                <textarea placeholder="Observaciones..." rows={2} value={invoiceNotes} onChange={(e) => setInvoiceNotes(e.target.value)} />
              </div>

              <div className="modal__actions">
                <div style={{ flex: 1 }} />
                <button type="button" className="modal__cancel-btn" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button
                  type="button"
                  className="modal__submit-btn"
                  onClick={handleCreateInvoice}
                  disabled={!clientId || items.length === 0}
                  id="invoice-submit"
                >
                  <Receipt size={16} /> Emitir Factura
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
