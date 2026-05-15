import { useState, useMemo, useEffect } from 'react';
import { useServiceStore, type SessionPackage, type ClientPackage } from '../../store/serviceStore';
import { useAuthStore } from '../../store/authStore';
import { useClientStore } from '../../store/clientStore';
import { Plus, X, Package, Users, CheckCircle2, AlertTriangle, DollarSign, Search, Edit2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import './SessionPackages.css';

function fmtPrice(p: number) {
  return `RD$ ${p.toLocaleString('es-DO')}`;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function SessionPackages() {
  const { packages, clientPackages, fetchAll, addPackage, updatePackage, deletePackage, sellPackage, useSession, deleteClientPackage } =
    useServiceStore();
  const { services } = useServiceStore();
  const { clients, fetchClients } = useClientStore();
  const { user } = useAuthStore();

  useEffect(() => { fetchAll(); fetchClients(); }, [fetchAll, fetchClients]);

  const [activeTab, setActiveTab] = useState<'packages' | 'sold'>('sold');
  const [showModalPkg, setShowModalPkg] = useState(false);
  const [showModalSell, setShowModalSell] = useState(false);
  const [search, setSearch] = useState('');

  const [pkgForm, setPkgForm] = useState({ name: '', serviceId: '', active: true });
  const [pkgSessionsStr, setPkgSessionsStr] = useState('5');
  const [pkgPriceStr, setPkgPriceStr] = useState('');
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [sellForm, setSellForm] = useState({ clientId: '', packageId: '', notes: '' });
  const [pkgErrors, setPkgErrors] = useState<{ name?: string; serviceId?: string; sessions?: string; price?: string }>({});

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

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pkg = packages.find((p) => p.id === sellForm.packageId);
    const client = clients.find((c) => c.id === sellForm.clientId);
    if (!pkg || !client) return;

    setSubmittingSell(true);
    try {
      await sellPackage({
        clientId: client.id,
        clientName: client.name,
        packageId: pkg.id,
        packageName: pkg.name,
        serviceName: pkg.serviceName,
        totalSessions: pkg.sessions,
        usedSessions: 0,
        purchasedAt: todayStr(),
        notes: sellForm.notes,
      });
      toast.success('Venta de paquete registrada');
      setShowModalSell(false);
      setSellForm({ clientId: '', packageId: '', notes: '' });
      setActiveTab('sold');
    } catch (err) {
      console.error(err);
      toast.error('Ocurrió un error al vender el paquete');
    } finally {
      setSubmittingSell(false);
    }
  };

  const handlePkgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate
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
    const finalPkg = {
      ...pkgForm,
      sessions,
      price,
      serviceName: svc.name,
    };
    
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
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar el paquete');
    } finally {
      setSubmittingPkg(false);
    }
  };

  // Quick stats
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
      <div className="clients__header">
        <div>
          <h1 className="clients__title">Paquetes con Sesiones</h1>
          <p className="clients__subtitle">Control de sesiones por clienta</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {user?.role === 'admin' && (
            <>
              <button className="appts__add-btn" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', boxShadow: 'none' }} onClick={() => setShowModalPkg(true)} id="btn-new-package">
                <Package size={18} /> Nuevo Tipo
              </button>
              <button className="appts__add-btn" onClick={() => setShowModalSell(true)} id="btn-sell-package">
                <Plus size={18} /> Vender Paquete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="spa-pkgs__stats">
        <div className="spa-pkgs__stat">
          <span className="spa-pkgs__stat-val">{stats.total}</span>
          <span>Total Vendidos</span>
        </div>
        <div className="spa-pkgs__stat spa-pkgs__stat--green">
          <span className="spa-pkgs__stat-val">{stats.active}</span>
          <span>Con Sesiones Activas</span>
        </div>
        <div className="spa-pkgs__stat spa-pkgs__stat--amber">
          <span className="spa-pkgs__stat-val">{stats.aboutToExpire}</span>
          <span>Última Sesión</span>
        </div>
        <div className="spa-pkgs__stat spa-pkgs__stat--gray">
          <span className="spa-pkgs__stat-val">{stats.completed}</span>
          <span>Completados</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="spa-pkgs__tabs">
        <button className={`spa-pkgs__tab ${activeTab === 'sold' ? 'spa-pkgs__tab--active' : ''}`} onClick={() => setActiveTab('sold')}>
          <Users size={16} /> Paquetes de Clientas
        </button>
        <button className={`spa-pkgs__tab ${activeTab === 'packages' ? 'spa-pkgs__tab--active' : ''}`} onClick={() => setActiveTab('packages')}>
          <Package size={16} /> Tipos de Paquetes
        </button>
      </div>

      {/* Search */}
      {activeTab === 'sold' && (
        <div className="clients__search-bar">
          <div className="appts__search" style={{ maxWidth: 360 }}>
            <Search size={16} />
            <input placeholder="Buscar clienta, servicio..." value={search} onChange={(e) => setSearch(e.target.value)} id="pkgs-search" />
          </div>
        </div>
      )}

      {/* ── Tab: Sold (Client Packages) ── */}
      {activeTab === 'sold' && (
        <div className="spa-pkgs__list">
          {filteredClientPkgs.length === 0 ? (
            <div className="appts__empty"><Package size={40} /><p>No hay paquetes vendidos aún</p></div>
          ) : (
            filteredClientPkgs.map((cp) => {
              const { pct, remaining, done } = getProgress(cp);
              return (
                <div className={`client-pkg ${done ? 'client-pkg--done' : remaining === 1 ? 'client-pkg--alert' : ''}`} key={cp.id}>
                  <div className="client-pkg__left">
                    <div className="client-pkg__avatar">
                      {cp.clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="client-pkg__info">
                      <strong>{cp.clientName}</strong>
                      <span>{cp.packageName}</span>
                      <span className="client-pkg__service">{cp.serviceName}</span>
                    </div>
                  </div>

                  <div className="client-pkg__progress-col">
                    <div className="client-pkg__sessions-display">
                      {Array.from({ length: cp.totalSessions }).map((_, i) => (
                        <div
                          key={i}
                          className={`client-pkg__session-dot ${i < cp.usedSessions ? 'client-pkg__session-dot--used' : ''}`}
                        />
                      ))}
                    </div>
                    <div className="client-pkg__bar-wrap">
                      <div className="client-pkg__bar">
                        <div
                          className={`client-pkg__bar-fill ${done ? 'client-pkg__bar-fill--done' : ''}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="client-pkg__bar-label">
                        {cp.usedSessions}/{cp.totalSessions} sesiones
                      </span>
                    </div>

                    {remaining === 1 && !done && (
                      <div className="client-pkg__alert"><AlertTriangle size={13} /> ¡Última sesión!</div>
                    )}
                    {done && (
                      <div className="client-pkg__done"><CheckCircle2 size={13} /> Completado</div>
                    )}
                  </div>

                  <div className="client-pkg__actions">
                    <span className="client-pkg__date">Compra: {new Date(cp.purchasedAt).toLocaleDateString('es-DO')}</span>
                    {!done && (
                      <button
                        className="client-pkg__use-btn"
                        onClick={() => useSession(cp.id)}
                        id={`use-session-${cp.id}`}
                        title="Marcar sesión como usada"
                      >
                        ✓ Usar Sesión
                      </button>
                    )}
                    {user?.role === 'admin' && (
                      <button className="appt-card__action-btn" onClick={() => deleteClientPackage(cp.id)} title="Eliminar">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab: Package Types ── */}
      {activeTab === 'packages' && (
        <div className="spa-pkgs__types-grid">
          {packages.map((p) => (
            <div className="pkg-type-card" key={p.id}>
              <div className="pkg-type-card__sessions">
                <span className="pkg-type-card__sessions-num">{p.sessions}</span>
                <span>sesiones</span>
              </div>
              <h3>{p.name}</h3>
              <p>{p.serviceName}</p>
              <div className="pkg-type-card__price">
                <DollarSign size={15} />
                {fmtPrice(p.price)}
              </div>
              <div className="pkg-type-card__per">
                {fmtPrice(Math.round(p.price / p.sessions))} por sesión
              </div>
              {user?.role === 'admin' && (
                <div className="pkg-type-card__actions">
                  <button
                    className="appts__add-btn"
                    style={{ padding: '8px 14px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', boxShadow: 'none' }}
                    onClick={() => {
                      setEditingPkgId(p.id);
                      setPkgForm({ name: p.name, serviceId: p.serviceId, active: p.active });
                      setPkgSessionsStr(String(p.sessions));
                      setPkgPriceStr(String(p.price));
                      setPkgErrors({});
                      setShowModalPkg(true);
                    }}
                  >
                    <Edit2 size={13} /> Editar
                  </button>
                  <button className="appts__add-btn" style={{ padding: '8px 18px', fontSize: '0.8rem' }} onClick={() => { setSellForm({ clientId: '', packageId: p.id, notes: '' }); setShowModalSell(true); }}>
                    Vender
                  </button>
                  <button className="appt-card__action-btn" onClick={() => deletePackage(p.id)}><X size={14} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: New / Edit Package Type */}
      {showModalPkg && (
        <div className="modal-overlay" onClick={() => { setShowModalPkg(false); setPkgErrors({}); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingPkgId ? 'Editar Paquete' : 'Nuevo Tipo de Paquete'}</h2>
              <button className="modal__close" onClick={() => { setShowModalPkg(false); setPkgErrors({}); }}><X size={20} /></button>
            </div>
            <form onSubmit={handlePkgSubmit} className="modal__form" id="pkg-form" noValidate>
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
                  <input
                    type="number"
                    min={2} max={50}
                    value={pkgSessionsStr}
                    className={pkgErrors.sessions ? 'input--error' : ''}
                    onChange={(e) => { setPkgSessionsStr(e.target.value); setPkgErrors({ ...pkgErrors, sessions: undefined }); }}
                  />
                  {pkgErrors.sessions && <span className="field-error"><AlertCircle size={12} /> {pkgErrors.sessions}</span>}
                </div>
                <div className="modal__field">
                  <label>Precio Total (RD$) *</label>
                  <input
                    type="number"
                    min={0}
                    value={pkgPriceStr}
                    placeholder="Ej: 5000"
                    className={pkgErrors.price ? 'input--error' : ''}
                    onChange={(e) => { setPkgPriceStr(e.target.value); setPkgErrors({ ...pkgErrors, price: undefined }); }}
                  />
                  {pkgErrors.price && <span className="field-error"><AlertCircle size={12} /> {pkgErrors.price}</span>}
                </div>
              </div>
              <div className="modal__actions">
                <div style={{ flex: 1 }} />
                <button type="button" className="modal__cancel-btn" onClick={() => { setShowModalPkg(false); setPkgErrors({}); }}>Cancelar</button>
                <button type="submit" className="modal__submit-btn" id="pkg-submit" disabled={submittingPkg}>
                  {submittingPkg ? 'Guardando...' : editingPkgId ? 'Guardar Cambios' : 'Crear Paquete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sell Package to Client */}
      {showModalSell && (
        <div className="modal-overlay" onClick={() => setShowModalSell(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>Vender Paquete</h2>
              <button className="modal__close" onClick={() => setShowModalSell(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSellSubmit} className="modal__form" id="sell-form">
              <div className="modal__field">
                <label><Users size={14} /> Clienta</label>
                <select required value={sellForm.clientId} onChange={(e) => setSellForm({ ...sellForm, clientId: e.target.value })}>
                  <option value="">Seleccionar clienta</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="modal__field">
                <label><Package size={14} /> Paquete</label>
                <select required value={sellForm.packageId} onChange={(e) => setSellForm({ ...sellForm, packageId: e.target.value })}>
                  <option value="">Seleccionar paquete</option>
                  {packages.filter(p => p.active).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} - {fmtPrice(p.price)}</option>
                  ))}
                </select>
              </div>
              {sellForm.packageId && (
                <div className="sell-modal__summary">
                  {(() => {
                    const pkg = packages.find(p => p.id === sellForm.packageId);
                    if (!pkg) return null;
                    return (
                      <>
                        <div><span>Sesiones:</span><strong>{pkg.sessions}</strong></div>
                        <div><span>Servicio:</span><strong>{pkg.serviceName}</strong></div>
                        <div><span>Precio:</span><strong>{fmtPrice(pkg.price)}</strong></div>
                        <div><span>Por sesión:</span><strong>{fmtPrice(Math.round(pkg.price / pkg.sessions))}</strong></div>
                      </>
                    );
                  })()}
                </div>
              )}
              <div className="modal__field">
                <label>Notas</label>
                <textarea placeholder="Observaciones, fecha de inicio preferida..." rows={2} value={sellForm.notes} onChange={(e) => setSellForm({ ...sellForm, notes: e.target.value })} />
              </div>
              <div className="modal__actions">
                <div style={{ flex: 1 }} />
                <button type="button" className="modal__cancel-btn" onClick={() => setShowModalSell(false)}>Cancelar</button>
                <button type="submit" className="modal__submit-btn" id="sell-submit" disabled={submittingSell}>
                  {submittingSell ? 'Confirmando...' : 'Confirmar Venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
