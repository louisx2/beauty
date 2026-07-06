import { useState, useMemo, useEffect, useRef } from 'react';
import { useServiceStore, type SessionPackage, type ClientPackage } from '../../store/serviceStore';
import { useAuthStore } from '../../store/authStore';
import { useClientStore } from '../../store/clientStore';
import { useAppointmentStore } from '../../store/appointmentStore';
import { useStaffStore } from '../../store/staffStore';
import {
  Plus, X, Package, Users, CheckCircle2, AlertTriangle,
  DollarSign, Search, Edit2, AlertCircle, CalendarPlus, FileText,
  CreditCard, MoreVertical, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import ClientAutocomplete from '../../components/ClientAutocomplete';
import './SessionPackages.css';

function fmtPrice(p: number) { return `RD$ ${p.toLocaleString('es-DO')}`; }
function todayStr() { return new Date().toISOString().split('T')[0]; }

function getAvailableHours(dateStr: string): string[] {
  const allHours = Array.from({ length: 11 }, (_, i) => {
    const h = i + 8;
    return `${String(h).padStart(2, '0')}:00`;
  }).flatMap((h) => [h, h.replace(':00', ':30')]);
  const today = new Date().toISOString().split('T')[0];
  if (dateStr !== today) return allHours;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return allHours.filter((h) => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + mm > nowMin;
  });
}

export default function SessionPackages() {
  const {
    packages, clientPackages, fetchAll, addPackage, updatePackage, deletePackage,
    sellPackage, useSession, updateClientPackage, deleteClientPackage,
    addPayment, fetchPayments, payments,
  } = useServiceStore();
  const { services } = useServiceStore();
  const { clients, fetchClients } = useClientStore();
  const { user } = useAuthStore();
  const { addAppointment } = useAppointmentStore();
  const { staff, fetchStaff } = useStaffStore();

  useEffect(() => { fetchAll(); fetchClients(); fetchStaff(); }, [fetchAll, fetchClients, fetchStaff]);

  const [activeTab, setActiveTab] = useState<'packages' | 'sold'>('sold');
  const [showModalPkg, setShowModalPkg] = useState(false);
  const [showModalSell, setShowModalSell] = useState(false);
  const [showModalEdit, setShowModalEdit] = useState(false);
  const [showModalSchedule, setShowModalSchedule] = useState(false);
  const [search, setSearch] = useState('');
  
  // Menu Dropdown
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const closeMenu = () => setOpenMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  // Package type form
  const [pkgForm, setPkgForm] = useState({ name: '', serviceId: '', active: true });
  const [pkgSessionsStr, setPkgSessionsStr] = useState('5');
  const [pkgPriceStr, setPkgPriceStr] = useState('');
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [pkgErrors, setPkgErrors] = useState<{ name?: string; serviceId?: string; sessions?: string; price?: string }>({});

  // Sell form
  const [sellForm, setSellForm] = useState({ clientId: '', clientName: '', packageId: '', notes: '', amountPaid: 0 });

  // Edit client package form
  const [editingCp, setEditingCp] = useState<ClientPackage | null>(null);
  const [editCpSessions, setEditCpSessions] = useState('0');
  const [editCpNotes, setEditCpNotes] = useState('');

  // Schedule session form
  const [scheduleCp, setScheduleCp] = useState<ClientPackage | null>(null);
  const [schedForm, setSchedForm] = useState({ staffId: '', date: todayStr(), time: '09:00', notes: '' });
  const [schedSubmitting, setSchedSubmitting] = useState(false);

  // Payments form
  const [paymentCp, setPaymentCp] = useState<ClientPackage | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, paymentMethod: 'cash' as 'cash'|'card'|'transfer', notes: '' });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const activeStaff = useMemo(() => staff.filter((s) => s.active), [staff]);

  const filteredClientPkgs = useMemo(() => {
    if (!search) return clientPackages;
    const q = search.toLowerCase();
    return clientPackages.filter(
      (cp) =>
        cp.clientName.toLowerCase().includes(q) ||
        cp.packageName.toLowerCase().includes(q) ||
        cp.serviceName.toLowerCase().includes(q)
    );
  }, [clientPackages, search]);

  const getProgress = (cp: ClientPackage) => {
    const pct = (cp.usedSessions / cp.totalSessions) * 100;
    const remaining = cp.totalSessions - cp.usedSessions;
    return { pct, remaining, done: remaining === 0 };
  };

  const [submittingPkg, setSubmittingPkg] = useState(false);
  const [submittingSell, setSubmittingSell] = useState(false);

  // ── Sell package ───────────────────────────────────────────────
  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellForm.clientId) {
      toast.error('Por favor selecciona una clienta de la lista');
      return;
    }
    const pkg = packages.find((p) => p.id === sellForm.packageId);
    const client = clients.find((c) => c.id === sellForm.clientId);
    if (!pkg || !client) return;
    setSubmittingSell(true);
    try {
      await sellPackage({
        clientId: client.id, clientName: client.name,
        packageId: pkg.id, packageName: pkg.name,
        serviceName: pkg.serviceName, totalSessions: pkg.sessions,
        usedSessions: 0, purchasedAt: todayStr(), notes: sellForm.notes,
        totalPrice: pkg.price, amountPaid: sellForm.amountPaid, status: 'active',
      });
      toast.success('Venta de paquete registrada');
      setShowModalSell(false);
      setSellForm({ clientId: '', clientName: '', packageId: '', notes: '', amountPaid: 0 });
      setActiveTab('sold');
    } catch (err) {
      toast.error('Error al vender el paquete');
    } finally {
      setSubmittingSell(false);
    }
  };

  // ── Create/Edit package type ───────────────────────────────────
  const handlePkgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof pkgErrors = {};
    if (!pkgForm.name.trim()) errs.name = 'El nombre es requerido';
    if (!pkgForm.serviceId) errs.serviceId = 'Selecciona un servicio';
    const sessions = Number(pkgSessionsStr);
    if (!pkgSessionsStr || sessions < 2 || sessions > 50) errs.sessions = 'Entre 2 y 50 sesiones';
    const price = Number(pkgPriceStr);
    if (pkgPriceStr === '' || price < 0) errs.price = 'Precio inválido';
    if (Object.keys(errs).length > 0) { setPkgErrors(errs); return; }

    const svc = services.find((s) => s.id === pkgForm.serviceId);
    if (!svc) return;
    const finalPkg = { ...pkgForm, sessions, price, serviceName: svc.name };
    setSubmittingPkg(true);
    try {
      if (editingPkgId) {
        await updatePackage(editingPkgId, finalPkg);
        toast.success('Paquete actualizado');
      } else {
        await addPackage(finalPkg);
        toast.success('Nuevo tipo de paquete creado');
      }
      setShowModalPkg(false);
      setEditingPkgId(null);
      setPkgForm({ name: '', serviceId: '', active: true });
      setPkgSessionsStr('5');
      setPkgPriceStr('');
      setPkgErrors({});
    } catch {
      toast.error('Error al guardar el paquete');
    } finally {
      setSubmittingPkg(false);
    }
  };

  // ── Edit client package ────────────────────────────────────────
  const openEditCp = (cp: ClientPackage) => {
    setEditingCp(cp);
    setEditCpSessions(String(cp.usedSessions));
    setEditCpNotes(cp.notes || '');
    setShowModalEdit(true);
  };

  const handleEditCpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCp) return;
    const used = Number(editCpSessions);
    if (isNaN(used) || used < 0 || used > editingCp.totalSessions) {
      toast.error(`Sesiones usadas debe estar entre 0 y ${editingCp.totalSessions}`);
      return;
    }
    await updateClientPackage(editingCp.id, { usedSessions: used, notes: editCpNotes });
    toast.success('Paquete actualizado');
    setShowModalEdit(false);
    setEditingCp(null);
  };

  // ── Schedule next session ──────────────────────────────────────
  const openSchedule = (cp: ClientPackage) => {
    setScheduleCp(cp);
    setSchedForm({ staffId: '', date: todayStr(), time: '09:00', notes: '' });
    setShowModalSchedule(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleCp || !schedForm.staffId || !schedForm.date || !schedForm.time) return;
    const staffMember = activeStaff.find((s) => s.id === schedForm.staffId);
    if (!staffMember) return;

    setSchedSubmitting(true);
    try {
      const client = clients.find((c) => c.id === scheduleCp.clientId);
      const created = await addAppointment({
        client_id: scheduleCp.clientId,
        clientName: scheduleCp.clientName,
        clientPhone: client?.phone || '',
        service: scheduleCp.serviceName,
        employee: staffMember.name,
        date: schedForm.date,
        time: schedForm.time,
        duration: 45,
        status: 'pending',
        notes: schedForm.notes || `Sesión de paquete: ${scheduleCp.packageName}`,
        source: 'manual',
      });
      if (created) {
        toast.success(`Sesión agendada para ${scheduleCp.clientName}`);
        setShowModalSchedule(false);
        setScheduleCp(null);
      } else {
        toast.error('No se pudo crear la cita. Intenta de nuevo.');
      }
    } catch {
      toast.error('Error al agendar la sesión');
    } finally {
      setSchedSubmitting(false);
    }
  };

  // ── Payments ───────────────────────────────────────────────────
  const openPayments = (cp: ClientPackage) => {
    setPaymentCp(cp);
    setPaymentForm({ amount: 0, paymentMethod: 'cash', notes: '' });
    fetchPayments(cp.id);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCp || paymentForm.amount <= 0) return;
    
    // Balance check
    const balance = paymentCp.totalPrice - paymentCp.amountPaid;
    if (paymentForm.amount > balance) {
      toast.error(`El monto no puede ser mayor al balance (RD$ ${balance.toLocaleString()})`);
      return;
    }

    setPaymentSubmitting(true);
    try {
      await addPayment({
        clientId: paymentCp.clientId,
        packageId: paymentCp.id,
        amount: paymentForm.amount,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes,
      });
      setPaymentForm({ amount: 0, paymentMethod: 'cash', notes: '' });
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Stats
  const stats = useMemo(() => ({
    total: clientPackages.length,
    active: clientPackages.filter((cp) => cp.usedSessions < cp.totalSessions).length,
    completed: clientPackages.filter((cp) => cp.usedSessions >= cp.totalSessions).length,
    aboutToExpire: clientPackages.filter((cp) => {
      const r = cp.totalSessions - cp.usedSessions;
      return r === 1 && r > 0;
    }).length,
  }), [clientPackages]);

  return (
    <div className="spa-pkgs">
      <div className="spa-pkgs__header-wrapper">
        <div>
          <h1 className="clients__title">Gestión de Paquetes</h1>
          <p className="clients__subtitle">Administra los paquetes y sesiones de tus clientas</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {user?.role === 'admin' && (
            <>
              <button
                className="btn-secondary"
                style={{ padding: '10px 20px', fontSize: '0.85rem' }}
                onClick={() => setShowModalPkg(true)}
                id="btn-new-package"
              >
                <Package size={16} /> Nuevo Tipo
              </button>
              <button 
                className="btn-primary" 
                style={{ padding: '10px 24px', fontSize: '0.85rem' }}
                onClick={() => setShowModalSell(true)} 
                id="btn-sell-package"
              >
                <Plus size={16} /> Vender Paquete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="spa-pkgs__stats">
        <div className="spa-pkgs__stat">
          <span className="spa-pkgs__stat-val">{stats.total}</span>
          <span className="spa-pkgs__stat-lbl">Vendidos Totales</span>
        </div>
        <div className="spa-pkgs__stat spa-pkgs__stat--green">
          <span className="spa-pkgs__stat-val">{stats.active}</span>
          <span className="spa-pkgs__stat-lbl">Con Sesiones Activas</span>
        </div>
        <div className="spa-pkgs__stat spa-pkgs__stat--amber">
          <span className="spa-pkgs__stat-val">{stats.aboutToExpire}</span>
          <span className="spa-pkgs__stat-lbl">Última Sesión</span>
        </div>
        <div className="spa-pkgs__stat spa-pkgs__stat--gray">
          <span className="spa-pkgs__stat-val">{stats.completed}</span>
          <span className="spa-pkgs__stat-lbl">Completados</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="spa-pkgs__toolbar">
        <div className="spa-pkgs__tabs">
          <button className={`spa-pkgs__tab ${activeTab === 'sold' ? 'spa-pkgs__tab--active' : ''}`} onClick={() => setActiveTab('sold')}>
            <Users size={16} /> Clientas
          </button>
          <button className={`spa-pkgs__tab ${activeTab === 'packages' ? 'spa-pkgs__tab--active' : ''}`} onClick={() => setActiveTab('packages')}>
            <Package size={16} /> Catálogo
          </button>
        </div>
        {activeTab === 'sold' && (
          <div className="appts__search" style={{ minWidth: 280, margin: 0 }}>
            <Search size={16} />
            <input placeholder="Buscar clienta, servicio..." value={search} onChange={(e) => setSearch(e.target.value)} id="pkgs-search" />
          </div>
        )}
      </div>

      {/* ── Tab: Sold (Client Packages) ── */}
      {activeTab === 'sold' && (
        <div className="spa-pkgs__list">
          {filteredClientPkgs.length === 0 ? (
            <div className="appts__empty"><Package size={40} /><p>No hay paquetes vendidos aún</p></div>
          ) : (
            filteredClientPkgs.map((cp) => {
              const { pct, remaining, done } = getProgress(cp);
              const isMenuOpen = openMenu === cp.id;
              
              return (
                <div className={`client-pkg-card ${done ? 'client-pkg-card--done' : remaining === 1 ? 'client-pkg-card--alert' : ''}`} key={cp.id}>
                  
                  {/* Header */}
                  <div className="client-pkg__header">
                    <div className="client-pkg__avatar-wrap">
                      <div className="client-pkg__avatar">
                        {cp.clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                    </div>
                    <div className="client-pkg__info">
                      <h3>{cp.clientName}</h3>
                      <p>{cp.packageName}</p>
                      <span className="client-pkg__service-badge">{cp.serviceName}</span>
                    </div>
                    
                    {/* Tooltip Menu for Secondary Actions */}
                    <div className="client-pkg__menu">
                      <button 
                        className="client-pkg__btn client-pkg__btn--icon" 
                        onClick={(e) => { e.stopPropagation(); setOpenMenu(isMenuOpen ? null : cp.id); }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {isMenuOpen && (
                        <div className="client-pkg__menu-content" onClick={(e) => e.stopPropagation()}>
                          <button className="client-pkg__menu-item" onClick={() => { setOpenMenu(null); openPayments(cp); }}>
                            <DollarSign size={15} /> Pagos / Abonos
                          </button>
                          <button className="client-pkg__menu-item" onClick={() => { setOpenMenu(null); openEditCp(cp); }}>
                            <Edit2 size={15} /> Editar
                          </button>
                          {user?.role === 'admin' && (
                             <button className="client-pkg__menu-item client-pkg__menu-item--danger" onClick={() => { if (window.confirm(`¿Estás seguro de eliminar el paquete activo "${cp.packageName}" de "${cp.clientName}"?`)) { setOpenMenu(null); deleteClientPackage(cp.id); } }}>
                               <Trash2 size={15} /> Eliminar
                             </button>
                           )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Area */}
                  <div className="client-pkg__progress-area">
                    <div className="client-pkg__progress-stats">
                      <span>Sesiones Completadas</span>
                      <strong>{cp.usedSessions} / {cp.totalSessions}</strong>
                    </div>
                    <div className="client-pkg__dots">
                      {Array.from({ length: cp.totalSessions }).map((_, i) => (
                        <div
                          key={i}
                          className={`client-pkg__dot ${i < cp.usedSessions ? 'client-pkg__dot--used' : ''}`}
                        />
                      ))}
                    </div>
                    {cp.notes && (
                      <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'flex', gap: 6 }}>
                        <FileText size={12} style={{ flexShrink: 0 }} />
                        <span>{cp.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="client-pkg__footer">
                    <span className="client-pkg__date">{new Date(cp.purchasedAt + 'T12:00:00').toLocaleDateString('es-DO')}</span>
                    <div className="client-pkg__primary-actions">
                      {!done && (
                        <>
                          <button
                            className="client-pkg__btn client-pkg__btn--use"
                            onClick={() => useSession(cp.id)}
                            id={`use-session-${cp.id}`}
                            title="Descontar una sesión"
                          >
                            ✓ Usar
                          </button>
                          <button
                            className="client-pkg__btn client-pkg__btn--schedule"
                            onClick={() => openSchedule(cp)}
                            title="Agendar sesión en el calendario"
                          >
                            <CalendarPlus size={14} /> Agendar
                          </button>
                        </>
                      )}
                      {done && (
                        <span style={{ color: '#4ade80', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={16} /> Completado
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab: Package Types (VIP Cards) ── */}
      {activeTab === 'packages' && (
        <div className="spa-pkgs__types-grid">
          {packages.map((p) => (
            <div className="vip-card" key={p.id}>
              <div className="vip-card__sessions">{p.sessions}</div>
              <h3>{p.name}</h3>
              <p>{p.serviceName}</p>
              
              <div className="vip-card__price-box">
                <div className="vip-card__price">
                  <DollarSign size={20} /> {p.price.toLocaleString('es-DO')}
                </div>
                <div className="vip-card__per-session">
                  {Math.round(p.price / p.sessions).toLocaleString('es-DO')} RD$ por sesión
                </div>
              </div>

              {user?.role === 'admin' && (
                <div className="vip-card__actions">
                  <button
                    className="vip-card__btn vip-card__btn--sell"
                    onClick={() => { setSellForm({ clientId: '', clientName: '', packageId: p.id, notes: '', amountPaid: 0 }); setShowModalSell(true); }}
                  >
                    Vender
                  </button>
                  <button
                    className="vip-card__btn vip-card__btn--secondary"
                    onClick={() => {
                      setEditingPkgId(p.id);
                      setPkgForm({ name: p.name, serviceId: p.serviceId, active: p.active });
                      setPkgSessionsStr(String(p.sessions));
                      setPkgPriceStr(String(p.price));
                      setPkgErrors({});
                      setShowModalPkg(true);
                    }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    className="vip-card__btn vip-card__btn--secondary" 
                    onClick={() => { if (window.confirm(`¿Estás seguro de eliminar el paquete "${p.name}"?`)) deletePackage(p.id); }}
                    style={{ flex: '0 0 auto' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: New/Edit Package Type ── */}
      {showModalPkg && (
        <div className="modal-overlay" onClick={() => { setShowModalPkg(false); setPkgErrors({}); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingPkgId ? 'Editar Paquete' : 'Nuevo Tipo de Paquete'}</h2>
              <button className="modal__close" onClick={() => { setShowModalPkg(false); setPkgErrors({}); }}><X size={20} /></button>
            </div>
            <form onSubmit={handlePkgSubmit} className="modal__form" noValidate>
              <div className="modal__field">
                <label>Nombre del Paquete *</label>
                <input
                  placeholder="Ej: Láser Premium x5"
                  value={pkgForm.name}
                  className={pkgErrors.name ? 'input--error' : ''}
                  onChange={(e) => { setPkgForm({ ...pkgForm, name: e.target.value }); setPkgErrors({ ...pkgErrors, name: undefined }); }}
                />
                {pkgErrors.name && <span className="field-error"><AlertCircle size={12} /> {pkgErrors.name}</span>}
              </div>
              <div className="modal__field">
                <label>Servicio Incluido *</label>
                <select
                  value={pkgForm.serviceId}
                  className={pkgErrors.serviceId ? 'input--error' : ''}
                  onChange={(e) => { setPkgForm({ ...pkgForm, serviceId: e.target.value }); setPkgErrors({ ...pkgErrors, serviceId: undefined }); }}
                >
                  <option value="">Seleccionar servicio</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {pkgErrors.serviceId && <span className="field-error"><AlertCircle size={12} /> {pkgErrors.serviceId}</span>}
              </div>
              <div className="modal__row">
                <div className="modal__field">
                  <label># Sesiones *</label>
                  <input type="number" min={2} max={50} value={pkgSessionsStr} className={pkgErrors.sessions ? 'input--error' : ''} onChange={(e) => { setPkgSessionsStr(e.target.value); setPkgErrors({ ...pkgErrors, sessions: undefined }); }} />
                  {pkgErrors.sessions && <span className="field-error"><AlertCircle size={12} /> {pkgErrors.sessions}</span>}
                </div>
                <div className="modal__field">
                  <label>Precio Total (RD$) *</label>
                  <input type="number" min={0} value={pkgPriceStr} placeholder="Ej: 5000" className={pkgErrors.price ? 'input--error' : ''} onChange={(e) => { setPkgPriceStr(e.target.value); setPkgErrors({ ...pkgErrors, price: undefined }); }} />
                  {pkgErrors.price && <span className="field-error"><AlertCircle size={12} /> {pkgErrors.price}</span>}
                </div>
              </div>
              <div className="modal__actions">
                <div style={{ flex: 1 }} />
                <button type="button" className="modal__cancel-btn" onClick={() => { setShowModalPkg(false); setPkgErrors({}); }}>Cancelar</button>
                <button type="submit" className="modal__submit-btn" disabled={submittingPkg}>
                  {submittingPkg ? 'Guardando...' : editingPkgId ? 'Guardar Cambios' : 'Crear Paquete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Sell Package ── */}
      {showModalSell && (
        <div className="modal-overlay" onClick={() => setShowModalSell(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Vender Paquete</h2>
              <button className="modal__close" onClick={() => setShowModalSell(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSellSubmit} className="modal__form">
              <div className="modal__field">
                <label><Users size={14} /> Clienta</label>
                <ClientAutocomplete 
                  clients={clients}
                  value={sellForm.clientName}
                  onChange={(text) => setSellForm({ ...sellForm, clientName: text, clientId: '' })}
                  onSelect={(client) => setSellForm({ ...sellForm, clientName: client.name, clientId: client.id })}
                  required
                />
              </div>
              <div className="modal__field">
                <label><Package size={14} /> Paquete</label>
                <select required value={sellForm.packageId} onChange={(e) => setSellForm({ ...sellForm, packageId: e.target.value })}>
                  <option value="">Seleccionar paquete</option>
                  {packages.filter(p => p.active).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {fmtPrice(p.price)}</option>
                  ))}
                </select>
              </div>
              {sellForm.packageId && (() => {
                const pkg = packages.find(p => p.id === sellForm.packageId);
                if (!pkg) return null;
                return (
                  <div className="sell-modal__summary">
                    <div><span>Sesiones:</span><strong>{pkg.sessions}</strong></div>
                    <div><span>Servicio:</span><strong>{pkg.serviceName}</strong></div>
                    <div><span>Precio:</span><strong>{fmtPrice(pkg.price)}</strong></div>
                    <div><span>Por sesión:</span><strong>{fmtPrice(Math.round(pkg.price / pkg.sessions))}</strong></div>
                  </div>
                );
              })()}
              <div className="modal__field">
                <label>Abono Inicial (RD$)</label>
                <input
                  type="number"
                  min="0"
                  max={(() => {
                    const pkg = packages.find(p => p.id === sellForm.packageId);
                    return pkg ? pkg.price : undefined;
                  })()}
                  value={sellForm.amountPaid}
                  onChange={(e) => setSellForm({ ...sellForm, amountPaid: Number(e.target.value) })}
                />
              </div>
              <div className="modal__field">
                <label>Notas</label>
                <textarea placeholder="Observaciones..." rows={2} value={sellForm.notes} onChange={(e) => setSellForm({ ...sellForm, notes: e.target.value })} />
              </div>
              <div className="modal__actions">
                <div style={{ flex: 1 }} />
                <button type="button" className="modal__cancel-btn" onClick={() => setShowModalSell(false)}>Cancelar</button>
                <button type="submit" className="modal__submit-btn" disabled={submittingSell}>
                  {submittingSell ? 'Confirmando...' : 'Confirmar Venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Client Package ── */}
      {showModalEdit && editingCp && (
        <div className="modal-overlay" onClick={() => setShowModalEdit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Editar Paquete — {editingCp.clientName}</h2>
              <button className="modal__close" onClick={() => setShowModalEdit(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditCpSubmit} className="modal__form">
              <div className="modal__field">
                <label>Sesiones Usadas (de {editingCp.totalSessions})</label>
                <input
                  type="number"
                  min={0}
                  max={editingCp.totalSessions}
                  value={editCpSessions}
                  onChange={(e) => setEditCpSessions(e.target.value)}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, rgba(255,255,255,0.4))', marginTop: 4, display: 'block' }}>
                  Sesiones restantes: {editingCp.totalSessions - Number(editCpSessions)}
                </span>
              </div>

              {/* Session dots preview */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '4px 0 12px' }}>
                {Array.from({ length: editingCp.totalSessions }).map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setEditCpSessions(String(i < Number(editCpSessions) ? i : i + 1))}
                    style={{
                      width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
                      background: i < Number(editCpSessions) ? 'var(--rose)' : 'rgba(255,255,255,0.1)',
                      border: '2px solid',
                      borderColor: i < Number(editCpSessions) ? 'var(--rose)' : 'rgba(255,255,255,0.15)',
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', color: 'var(--text-muted, rgba(255,255,255,0.6))',
                    }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              <div className="modal__field">
                <label><FileText size={14} /> Notas</label>
                <textarea rows={2} placeholder="Observaciones..." value={editCpNotes} onChange={(e) => setEditCpNotes(e.target.value)} />
              </div>
              <div className="modal__actions">
                <div style={{ flex: 1 }} />
                <button type="button" className="modal__cancel-btn" onClick={() => setShowModalEdit(false)}>Cancelar</button>
                <button type="submit" className="modal__submit-btn">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Schedule Session ── */}
      {showModalSchedule && scheduleCp && (
        <div className="modal-overlay" onClick={() => setShowModalSchedule(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Agendar Sesión — {scheduleCp.clientName}</h2>
              <button className="modal__close" onClick={() => setShowModalSchedule(false)}><X size={20} /></button>
            </div>
            <div style={{ padding: '0 0 16px', margin: '0 0 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.85rem', color: 'var(--text-muted, rgba(255,255,255,0.5))' }}>
              Sesión {scheduleCp.usedSessions + 1} de {scheduleCp.totalSessions} · {scheduleCp.serviceName}
            </div>
            <form onSubmit={handleScheduleSubmit} className="modal__form">
              <div className="modal__field">
                <label>Especialista *</label>
                <select required value={schedForm.staffId} onChange={(e) => setSchedForm({ ...schedForm, staffId: e.target.value })}>
                  <option value="">Seleccionar especialista</option>
                  {activeStaff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="modal__row">
                <div className="modal__field">
                  <label>Fecha *</label>
                  <input
                    type="date"
                    required
                    min={todayStr()}
                    value={schedForm.date}
                    onChange={(e) => setSchedForm({ ...schedForm, date: e.target.value, time: '' })}
                  />
                </div>
                <div className="modal__field">
                  <label>Hora *</label>
                  <select
                    required
                    value={schedForm.time}
                    onChange={(e) => setSchedForm({ ...schedForm, time: e.target.value })}
                  >
                    {getAvailableHours(schedForm.date).map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal__field">
                <label>Notas</label>
                <textarea rows={2} placeholder="Observaciones para esta sesión..." value={schedForm.notes} onChange={(e) => setSchedForm({ ...schedForm, notes: e.target.value })} />
              </div>
              <div className="modal__actions">
                <div style={{ flex: 1 }} />
                <button type="button" className="modal__cancel-btn" onClick={() => setShowModalSchedule(false)}>Cancelar</button>
                <button type="submit" className="modal__submit-btn" disabled={schedSubmitting}>
                  {schedSubmitting ? 'Agendando...' : 'Crear Cita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Payments ── */}
      {paymentCp && (
        <div className="modal-overlay" onClick={() => setPaymentCp(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Pagos — {paymentCp.clientName}</h2>
              <button className="modal__close" onClick={() => setPaymentCp(null)}><X size={20} /></button>
            </div>
            
            <div style={{ padding: '0 0 16px', margin: '0 0 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted, rgba(255,255,255,0.6))' }}>Paquete:</span>
                <strong style={{ color: 'var(--text-main, white)' }}>{paymentCp.packageName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted, rgba(255,255,255,0.6))' }}>Precio Total:</span>
                <strong style={{ color: 'var(--text-main, white)' }}>{fmtPrice(paymentCp.totalPrice)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted, rgba(255,255,255,0.6))' }}>Pagado:</span>
                <strong style={{ color: 'var(--emerald)' }}>{fmtPrice(paymentCp.amountPaid)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                <span style={{ color: 'var(--text-muted, rgba(255,255,255,0.6))' }}>Balance Pendiente:</span>
                <strong style={{ color: 'var(--amber)' }}>{fmtPrice(paymentCp.totalPrice - paymentCp.amountPaid)}</strong>
              </div>
            </div>

            {paymentCp.totalPrice - paymentCp.amountPaid > 0 && (
              <form onSubmit={handlePaymentSubmit} className="modal__form" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 12, color: 'var(--text-main, white)' }}>Registrar Abono</h3>
                <div className="modal__row">
                  <div className="modal__field">
                    <label>Monto (RD$)</label>
                    <input
                      type="number"
                      min={1}
                      max={paymentCp.totalPrice - paymentCp.amountPaid}
                      value={paymentForm.amount || ''}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="modal__field">
                    <label>Método de Pago</label>
                    <select
                      value={paymentForm.paymentMethod}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                    >
                      <option value="cash">Efectivo</option>
                      <option value="transfer">Transferencia</option>
                      <option value="card">Tarjeta</option>
                    </select>
                  </div>
                </div>
                <div className="modal__field">
                  <label>Notas del Pago</label>
                  <input
                    type="text"
                    placeholder="Referencia de transferencia, banco..."
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  />
                </div>
                <button type="submit" className="modal__submit-btn" disabled={paymentSubmitting || paymentForm.amount <= 0}>
                  {paymentSubmitting ? 'Registrando...' : 'Registrar Pago'}
                </button>
              </form>
            )}

            <h3 style={{ fontSize: '1rem', marginBottom: 12, color: 'var(--text-main, white)' }}>Historial de Pagos</h3>
            {payments.filter(p => p.packageId === paymentCp.id).length === 0 ? (
              <p style={{ color: 'var(--text-muted, rgba(255,255,255,0.4))', fontSize: '0.9rem' }}>No hay abonos registrados.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                {payments.filter(p => p.packageId === paymentCp.id).map(p => (
                  <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-main, white)' }}>
                        {fmtPrice(p.amount)}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, rgba(255,255,255,0.5))' }}>
                        {new Date(p.createdAt).toLocaleDateString('es-DO')} · {
                          p.paymentMethod === 'cash' ? 'Efectivo' :
                          p.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'
                        }
                      </span>
                    </div>
                    {p.notes && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, rgba(255,255,255,0.4))', fontStyle: 'italic', maxWidth: '40%', textAlign: 'right' }}>
                        {p.notes}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
