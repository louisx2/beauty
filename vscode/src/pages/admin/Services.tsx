import { useState, useMemo, useEffect } from 'react';
import { useServiceStore, type Service, type ServiceCategory } from '../../store/serviceStore';
import { useAuthStore } from '../../store/authStore';
import { Plus, Search, Edit2, Trash2, X, Clock, DollarSign, Sparkles, Zap, Heart, Scissors, Package } from 'lucide-react';
import './Services.css';

const CATEGORIES: { key: ServiceCategory | 'all'; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'Todos', icon: <Sparkles size={15} /> },
  { key: 'laser', label: 'Láser', icon: <Zap size={15} /> },
  { key: 'facial', label: 'Facial', icon: <Heart size={15} /> },
  { key: 'corporal', label: 'Corporal', icon: <Sparkles size={15} /> },
  { key: 'belleza', label: 'Belleza', icon: <Scissors size={15} /> },
];

const CAT_COLORS: Record<ServiceCategory, string> = {
  laser: '#a78bfa',
  facial: '#f9a8d4',
  corporal: '#6ee7b7',
  belleza: '#fcd34d',
};

const emptyForm: Omit<Service, 'id'> = {
  name: '', category: 'facial', description: '', duration: 45, price: 0, taxable: true, hasSession: false, active: true,
};

function fmtPrice(p: number) {
  return `RD$ ${p.toLocaleString('es-DO')}`;
}

export default function Services() {
  const { services, packages, clientPackages, fetchAll, addService, updateService, deleteService } = useServiceStore();
  const { user } = useAuthStore();

  useEffect(() => { fetchAll(); }, [fetchAll]);
  const [catFilter, setCatFilter] = useState<ServiceCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [priceStr, setPriceStr] = useState('');

  const filtered = useMemo(() => {
    let list = catFilter === 'all' ? services : services.filter((s) => s.category === catFilter);
    if (search) list = list.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [services, catFilter, search]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setPriceStr(''); setShowModal(true); };
  const openEdit = (s: Service) => {
    setEditingId(s.id);
    setForm({ name: s.name, category: s.category, description: s.description, duration: s.duration, price: s.price, taxable: s.taxable, hasSession: s.hasSession, active: s.active });
    setPriceStr(String(s.price));
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalForm = { ...form, price: Number(priceStr) || 0 };
    if (editingId) {
      await updateService(editingId, finalForm);
    } else {
      await addService(finalForm);
    }
    setShowModal(false);
  };

  const priceWithTax = (price: number, taxable: boolean) =>
    taxable ? price * 1.18 : price;

  return (
    <div className="services-page">
      <div className="services-page__header">
        <div>
          <h1 className="clients__title">Catálogo de Servicios</h1>
          <p className="clients__subtitle">{services.filter(s => s.active).length} servicios activos</p>
        </div>
        {user?.role === 'admin' && (
          <button className="appts__add-btn" onClick={openCreate} id="btn-new-service">
            <Plus size={18} /> Nuevo Servicio
          </button>
        )}
      </div>

      {/* Category Tabs + Search */}
      <div className="services-page__controls">
        <div className="services-page__cats">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`services-page__cat-btn ${catFilter === c.key ? 'services-page__cat-btn--active' : ''}`}
              onClick={() => setCatFilter(c.key as ServiceCategory | 'all')}
            >
              {c.icon} {c.label}
              <span className="services-page__cat-count">
                {c.key === 'all' ? services.length : services.filter(s => s.category === c.key).length}
              </span>
            </button>
          ))}
        </div>
        <div className="appts__search" style={{ maxWidth: 280 }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar servicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="services-search"
          />
        </div>
      </div>

      {/* Services Grid */}
      <div className="services-page__grid">
        {filtered.map((s) => (
          <div className={`service-item ${!s.active ? 'service-item--inactive' : ''}`} key={s.id}>
            <div className="service-item__top">
              <span className="service-item__cat-tag" style={{ background: `${CAT_COLORS[s.category]}18`, color: CAT_COLORS[s.category] }}>
                {CATEGORIES.find(c => c.key === s.category)?.icon}
                {CATEGORIES.find(c => c.key === s.category)?.label}
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {s.hasSession && (
                  <span className="service-item__session-badge">
                    <Package size={11} /> Con Sesiones
                  </span>
                )}
                {!s.active && <span className="service-item__inactive-badge">Inactivo</span>}
              </div>
            </div>

            <h3 className="service-item__name">{s.name}</h3>
            <p className="service-item__desc">{s.description}</p>

            {/* Session tracking for this service */}
            {s.hasSession && (() => {
              const pkgs = packages.filter(p => p.serviceId === s.id);
              const activeCp = clientPackages.filter(cp => {
                const pkg = packages.find(p => p.id === cp.packageId);
                return pkg?.serviceId === s.id && cp.usedSessions < cp.totalSessions;
              });
              return pkgs.length > 0 ? (
                <div className="service-item__session-info">
                  <span><Package size={12} /> {pkgs.length} paquete{pkgs.length > 1 ? 's' : ''}</span>
                  <span className="service-item__session-active">{activeCp.length} activo{activeCp.length !== 1 ? 's' : ''}</span>
                </div>
              ) : null;
            })()}

            <div className="service-item__meta">
              <span><Clock size={13} /> {s.duration} min</span>
              <span><DollarSign size={13} /> {fmtPrice(s.price)}</span>
              {s.taxable && <span className="service-item__tax">+ITBIS 18%</span>}
            </div>

            <div className="service-item__total">
              Total con ITBIS: <strong>{fmtPrice(Math.round(priceWithTax(s.price, s.taxable)))}</strong>
            </div>

            {user?.role === 'admin' && (
              <div className="service-item__actions">
                <button onClick={() => updateService(s.id, { active: !s.active })} className={`service-item__toggle ${s.active ? 'service-item__toggle--on' : 'service-item__toggle--off'}`}>
                  {s.active ? 'Activo' : 'Inactivo'}
                </button>
                <div style={{ flex: 1 }} />
                <button className="appt-card__action-btn" onClick={() => openEdit(s)}><Edit2 size={15} /></button>
                <button className="appt-card__action-btn" onClick={() => deleteService(s.id)} style={{ '--hover-color': '#f87171' } as React.CSSProperties}><Trash2 size={15} /></button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editingId ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
              <button className="modal__close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal__form" id="service-form">
              <div className="modal__field">
                <label>Nombre del Servicio</label>
                <input required placeholder="Ej: Depilación Láser - Piernas" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="modal__row">
                <div className="modal__field">
                  <label>Categoría</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ServiceCategory })}>
                    <option value="laser">Láser</option>
                    <option value="facial">Facial</option>
                    <option value="corporal">Corporal</option>
                    <option value="belleza">Belleza</option>
                  </select>
                </div>
                <div className="modal__field">
                  <label><Clock size={14} /> Duración (min)</label>
                  <select value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}>
                    {[15, 30, 45, 60, 75, 90, 120].map(d => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
              </div>
              <div className="modal__field">
                <label>Descripción</label>
                <input placeholder="Descripción breve del servicio" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="modal__row">
                <div className="modal__field">
                  <label><DollarSign size={14} /> Precio (RD$)</label>
                  <input type="number" min={0} value={priceStr} onChange={(e) => setPriceStr(e.target.value)} placeholder="Ej: 2500" />
                </div>
                <div className="modal__field" style={{ justifyContent: 'flex-end', paddingBottom: '4px' }}>
                  <label style={{ marginBottom: 16 }}>ITBIS 18%</label>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={form.taxable} onChange={(e) => setForm({ ...form, taxable: e.target.checked })} />
                    <span className="toggle-slider" />
                    <span style={{ marginLeft: 8, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                      {form.taxable ? 'Aplica ITBIS' : 'Exento'}
                    </span>
                  </label>
                </div>
              </div>
              {Number(priceStr) > 0 && (
                <div className="service-modal__total">
                  Total con ITBIS: <strong>{fmtPrice(Math.round(form.taxable ? Number(priceStr) * 1.18 : Number(priceStr)))}</strong>
                </div>
              )}
              <div className="modal__row">
                <div className="modal__field" style={{ paddingBottom: '4px' }}>
                  <label>¿Servicio con sesiones?</label>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={form.hasSession} onChange={(e) => setForm({ ...form, hasSession: e.target.checked })} />
                    <span className="toggle-slider" />
                    <span style={{ marginLeft: 8, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                      {form.hasSession ? 'Sí (Configura la cantidad de sesiones en la pestaña Paquetes)' : 'No — Solo servicio individual'}
                    </span>
                  </label>
                </div>
              </div>
              <div className="modal__actions">
                <div style={{ flex: 1 }} />
                <button type="button" className="modal__cancel-btn" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="modal__submit-btn" id="service-submit">{editingId ? 'Guardar' : 'Crear Servicio'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
